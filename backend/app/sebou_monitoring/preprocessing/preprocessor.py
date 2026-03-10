from __future__ import annotations

import logging
import math
from typing import Optional

from ..gee_client import require_ee


class ImagePreprocessor:
    """Satellite image preprocessing for Sebou monitoring workflows."""

    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)
        self._ee = require_ee()

    def preprocess_modis(self, image, apply_quality_mask: bool = True):
        """
        Preprocess MODIS MOD10A1.
        Outputs:
        - snow_cover in [0..100]
        - NDSI in [0..1] (scaled)
        """
        snow_cover = image.select("NDSI_Snow_Cover")
        ndsi = image.select("NDSI").multiply(0.0001)

        if apply_quality_mask:
            qa = image.select("NDSI_Snow_Cover_Basic_QA")
            quality_mask = qa.lte(1)
            snow_cover = snow_cover.updateMask(quality_mask)
            ndsi = ndsi.updateMask(quality_mask)

        return self._ee.Image.cat(
            [
                snow_cover.rename("snow_cover"),
                ndsi.rename("NDSI"),
            ]
        ).copyProperties(image, ["system:time_start", "system:index"])

    def preprocess_sentinel1(self, image, apply_speckle_filter: bool = True):
        """
        Preprocess Sentinel-1 VV image.
        Earth Engine S1_GRD is already in dB; filtering is applied directly.
        """
        processed = image
        if apply_speckle_filter:
            processed = self._lee_sigma_filter(processed)
        return processed.copyProperties(image, ["system:time_start", "system:index"])

    def _lee_sigma_filter(self, image, kernel_size: int = 7):
        """
        Lightweight Lee-like adaptive smoothing for SAR speckle reduction.
        """
        tk = self._ee.Image.constant(7)
        kernel = self._ee.Kernel.square(kernel_size / 2, "pixels")

        mean = image.reduceNeighborhood(
            reducer=self._ee.Reducer.mean(),
            kernel=kernel,
        )
        variance = image.reduceNeighborhood(
            reducer=self._ee.Reducer.variance(),
            kernel=kernel,
        )

        safe_mean = mean.where(mean.eq(0), 1e-6)
        cv = variance.sqrt().divide(safe_mean)
        weight = cv.multiply(cv).multiply(tk.add(1)).divide(cv.multiply(cv).multiply(tk).add(1))
        filtered = mean.multiply(weight).add(image.multiply(self._ee.Image.constant(1).subtract(weight)))

        return filtered.rename(image.bandNames())

    def preprocess_sentinel2(self, image, apply_cloud_mask: bool = True):
        """
        Preprocess Sentinel-2 L2A.
        Output reflectance bands in [0..1].
        """
        reflectance = image.select(["B2", "B3", "B4", "B8", "B11", "B12"]).divide(10000)
        if apply_cloud_mask:
            scl = image.select("SCL")
            clear = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6)).Or(scl.eq(11))
            reflectance = reflectance.updateMask(clear)

        return reflectance.copyProperties(image, ["system:time_start", "system:index"])

    def apply_terrain_correction(
        self,
        image,
        dem,
        solar_azimuth_deg: Optional[float] = None,
        solar_zenith_deg: Optional[float] = None,
    ):
        """
        Apply C-correction style topographic normalization.
        """
        if solar_azimuth_deg is None:
            solar_azimuth = self._ee.Number(image.get("MEAN_SOLAR_AZIMUTH_ANGLE"))
        else:
            solar_azimuth = self._ee.Number(solar_azimuth_deg)

        if solar_zenith_deg is None:
            solar_zenith = self._ee.Number(image.get("MEAN_SOLAR_ZENITH_ANGLE"))
        else:
            solar_zenith = self._ee.Number(solar_zenith_deg)

        terrain = self._ee.Terrain.products(dem)
        slope = terrain.select("slope")
        aspect = terrain.select("aspect")

        deg2rad = math.pi / 180.0
        cos_i = (
            solar_zenith.multiply(deg2rad)
            .cos()
            .multiply(slope.multiply(deg2rad).cos())
            .add(
                solar_zenith.multiply(deg2rad)
                .sin()
                .multiply(slope.multiply(deg2rad).sin())
                .multiply(aspect.subtract(solar_azimuth).multiply(deg2rad).cos())
            )
        )

        corrected = image.divide(cos_i.max(0.05))
        return corrected.copyProperties(image, ["system:time_start", "system:index"])

    def create_composite(self, collection, method: str = "median"):
        if method == "median":
            composite = collection.median()
        elif method == "mean":
            composite = collection.mean()
        elif method == "max":
            composite = collection.max()
        elif method == "min":
            composite = collection.min()
        else:
            raise ValueError(f"Unsupported composite method: {method}")

        mean_date = self._ee.Number(collection.aggregate_mean("system:time_start"))
        return composite.set("system:time_start", mean_date)
