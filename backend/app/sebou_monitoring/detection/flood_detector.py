from __future__ import annotations

from datetime import datetime
import logging
from typing import Dict, Optional

from ..config import FloodDetectionConfig
from ..gee_client import require_ee


class FloodDetector:
    """Flood detection using SAR first and optical fallback."""

    def __init__(self, config: FloodDetectionConfig) -> None:
        self.config = config
        self.logger = logging.getLogger(__name__)
        self._ee = require_ee()

    def detect_flood_sar_difference(self, before_image, during_image, permanent_water, dem):
        """Detect flood from Sentinel-1 before/after backscatter decrease."""
        difference = during_image.subtract(before_image).rename("diff")
        water_decrease = difference.lt(self.config.sar_difference_threshold_db)
        absolute_water = during_image.select("VV").lt(self.config.sar_absolute_threshold_db)

        potential_flood = water_decrease.And(absolute_water)
        flood_mask = potential_flood.And(permanent_water.Not())

        slope = self._ee.Terrain.slope(dem)
        flat_areas = slope.lt(self.config.max_slope_deg)
        constrained = flood_mask.And(flat_areas)

        return self._post_process_flood(constrained).rename("flood_mask").selfMask()

    def detect_flood_sar_threshold(self, sar_image, permanent_water, dem, reference_composite=None):
        """
        Detect flood from a single SAR image when no before-event image exists.
        If a reference composite is provided, it is used as an additional temporal filter.
        """
        water = sar_image.select("VV").lt(self.config.sar_absolute_threshold_db)

        if reference_composite is not None:
            reference_change = sar_image.select("VV").subtract(reference_composite.select("VV"))
            water = water.And(reference_change.lt(self.config.sar_difference_threshold_db))

        flood = water.And(permanent_water.Not())

        slope = self._ee.Terrain.slope(dem)
        flat_areas = slope.lt(self.config.max_slope_deg)
        low_elevation = dem.select("elevation").lt(self.config.low_elevation_max_m)

        constrained = flood.And(flat_areas).And(low_elevation)
        return self._post_process_flood(constrained).rename("flood_mask").selfMask()

    def detect_flood_optical(self, image, permanent_water, reference_image=None):
        """Detect flood from MNDWI, optionally constrained by change against a reference image."""
        mndwi = self._calculate_mndwi(image)
        water = mndwi.gt(self.config.optical_mndwi_threshold)

        if reference_image is not None:
            ref_mndwi = self._calculate_mndwi(reference_image)
            significant_change = mndwi.subtract(ref_mndwi).gt(self.config.optical_change_threshold)
            water = water.And(significant_change)

        flood = water.And(permanent_water.Not())
        return self._post_process_flood(flood).rename("flood_mask").selfMask()

    def _calculate_mndwi(self, image):
        band_names = image.bandNames()

        return self._ee.Image(
            self._ee.Algorithms.If(
                band_names.contains("B3"),
                image.select("B3").subtract(image.select("B11")).divide(image.select("B3").add(image.select("B11"))),
                image.select("sur_refl_b04")
                .subtract(image.select("sur_refl_b06"))
                .divide(image.select("sur_refl_b04").add(image.select("sur_refl_b06"))),
            )
        ).rename("MNDWI")

    def _post_process_flood(self, flood_mask):
        connected = flood_mask.connectedPixelCount(max_size=256)
        cleaned = flood_mask.updateMask(connected.gte(self.config.min_area_pixels))
        return cleaned.focal_median(radius=1, kernelType="square")

    def calculate_flood_metrics(
        self,
        flood_mask,
        basin_boundary,
        admin_boundaries=None,
        scale_m: int = 10,
    ) -> Dict[str, object]:
        flood_area = flood_mask.multiply(self._ee.Image.pixelArea()).reduceRegion(
            reducer=self._ee.Reducer.sum(),
            geometry=basin_boundary,
            scale=scale_m,
            maxPixels=1e10,
        )
        flood_area_km2 = self._ee.Number(flood_area.get("flood_mask")).divide(1e6)

        metrics: Dict[str, object] = {
            "flood_area_km2": flood_area_km2,
            "flood_pixel_area_m2": flood_area.get("flood_mask"),
        }

        if admin_boundaries is not None:
            metrics["flood_by_admin"] = (
                flood_mask.multiply(self._ee.Image.pixelArea())
                .divide(1e6)
                .reduceRegions(
                    collection=admin_boundaries,
                    reducer=self._ee.Reducer.sum(),
                    scale=scale_m,
                )
            )

        return metrics

    def create_reference_composite(self, collection, start_date: datetime, end_date: datetime, method: str = "median"):
        filtered = collection.filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
        if method == "median":
            return filtered.median()
        if method == "mean":
            return filtered.mean()
        raise ValueError(f"Unsupported reference composite method: {method}")

    def vectorize_flood_extent(self, flood_mask, basin_boundary, scale_m: int = 10):
        vectors = flood_mask.reduceToVectors(
            geometry=basin_boundary,
            scale=scale_m,
            geometryType="polygon",
            eightConnected=False,
            labelProperty="flood",
            maxPixels=1e10,
        )

        def add_attributes(feature):
            area_km2 = feature.geometry().area().divide(1e6)
            detection_date = self._ee.Date(flood_mask.get("system:time_start")).format("YYYY-MM-dd")
            return feature.set({"area_km2": area_km2, "detection_date": detection_date})

        return vectors.map(add_attributes)
