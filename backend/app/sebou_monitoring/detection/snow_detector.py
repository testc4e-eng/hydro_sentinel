from __future__ import annotations

import logging
from typing import Dict, Literal

from ..config import SnowDetectionConfig
from ..gee_client import require_ee

SensorName = Literal["modis", "sentinel2"]


class SnowDetector:
    """Snow detection with adaptive NDSI thresholds and optional NIR constraint."""

    def __init__(self, config: SnowDetectionConfig) -> None:
        self.config = config
        self.logger = logging.getLogger(__name__)
        self._ee = require_ee()

    def calculate_ndsi_modis(self, image):
        """
        MODIS NDSI = (B4 green - B6 swir) / (B4 + B6)
        Expects surface reflectance-like inputs.
        """
        green = image.select("sur_refl_b04")
        swir = image.select("sur_refl_b06")
        ndsi = green.subtract(swir).divide(green.add(swir)).rename("NDSI")
        return image.addBands(ndsi)

    def calculate_ndsi_sentinel2(self, image):
        """
        Sentinel-2 NDSI = (B3 green - B11 swir) / (B3 + B11)
        """
        green = image.select("B3")
        swir = image.select("B11")
        ndsi = green.subtract(swir).divide(green.add(swir)).rename("NDSI")
        return image.addBands(ndsi)

    def detect_snow_adaptive(self, image_with_ndsi, dem, sensor: SensorName = "modis"):
        """
        Adaptive snow detection:
        - Elevation-dependent NDSI threshold
        - Optional NIR threshold by sensor
        """
        ndsi = image_with_ndsi.select("NDSI")
        elevation = dem.select("elevation")

        ndsi_threshold = elevation.expression(
            "(elev > 2000) ? t_high : ((elev > 1000) ? t_mid : t_low)",
            {
                "elev": elevation,
                "t_high": self.config.ndsi_threshold_high_elev,
                "t_mid": self.config.ndsi_threshold_mid_elev,
                "t_low": self.config.ndsi_threshold_low_elev,
            },
        )

        ndsi_snow = ndsi.gt(ndsi_threshold)
        nir_snow = self._nir_mask(image_with_ndsi, sensor=sensor)
        return ndsi_snow.And(nir_snow).rename("snow_mask").selfMask()

    def _nir_mask(self, image, sensor: SensorName):
        if sensor == "modis":
            has_nir = image.bandNames().contains("sur_refl_b02")
            return self._ee.Image(
                self._ee.Algorithms.If(
                    has_nir,
                    image.select("sur_refl_b02").gt(self.config.nir_threshold_modis),
                    self._ee.Image.constant(1),
                )
            )

        has_nir = image.bandNames().contains("B8")
        return self._ee.Image(
            self._ee.Algorithms.If(
                has_nir,
                image.select("B8").gt(self.config.nir_threshold_s2),
                self._ee.Image.constant(1),
            )
        )

    def post_process_snow_mask(self, snow_mask):
        """
        Post-process binary snow mask:
        - Remove small connected components
        - Morphological closing
        """
        connected = snow_mask.connectedPixelCount(max_size=256)
        cleaned = snow_mask.updateMask(connected.gte(self.config.min_area_pixels))
        smoothed = cleaned.focal_max(radius=1, kernelType="square").focal_min(radius=1, kernelType="square")
        return smoothed.rename("snow_mask").selfMask()

    def calculate_snow_metrics(self, snow_mask, basin_boundary, dem, scale_m: int = 500) -> Dict[str, object]:
        """
        Returns EE objects (server-side): snow area, percentage, mean elevation and zonal stats.
        """
        basin_area_km2 = basin_boundary.area().divide(1e6)

        snow_area = snow_mask.multiply(self._ee.Image.pixelArea()).reduceRegion(
            reducer=self._ee.Reducer.sum(),
            geometry=basin_boundary,
            scale=scale_m,
            maxPixels=1e10,
        )
        snow_area_km2 = self._ee.Number(snow_area.get("snow_mask")).divide(1e6)
        snow_percentage = snow_area_km2.divide(basin_area_km2).multiply(100)

        snow_elevation = snow_mask.multiply(dem.select("elevation"))
        mean_elev = snow_elevation.reduceRegion(
            reducer=self._ee.Reducer.mean(),
            geometry=basin_boundary,
            scale=scale_m,
            maxPixels=1e10,
        )

        elevation_zones = dem.select("elevation").expression(
            "(elev < 1000) ? 1 : ((elev < 2000) ? 2 : ((elev < 3000) ? 3 : 4))",
            {"elev": dem.select("elevation")},
        ).rename("zone")
        snow_by_zone = snow_mask.addBands(elevation_zones).reduceRegion(
            reducer=self._ee.Reducer.sum().group(groupField=1, groupName="zone"),
            geometry=basin_boundary,
            scale=scale_m,
            maxPixels=1e10,
        )

        return {
            "snow_area_km2": snow_area_km2,
            "snow_percentage": snow_percentage,
            "mean_snow_elevation": self._ee.Number(mean_elev.get("elevation")),
            "basin_area_km2": basin_area_km2,
            "snow_by_elevation_zone": snow_by_zone,
        }

    def vectorize_snow_extent(self, snow_mask, basin_boundary, scale_m: int = 500):
        vectors = snow_mask.reduceToVectors(
            geometry=basin_boundary,
            scale=scale_m,
            geometryType="polygon",
            eightConnected=False,
            labelProperty="snow",
            maxPixels=1e10,
        )

        def add_attributes(feature):
            area_km2 = feature.geometry().area().divide(1e6)
            detection_date = self._ee.Date(snow_mask.get("system:time_start")).format("YYYY-MM-dd")
            return feature.set({"area_km2": area_km2, "detection_date": detection_date})

        return vectors.map(add_attributes)
