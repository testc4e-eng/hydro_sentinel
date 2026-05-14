from __future__ import annotations

from datetime import datetime
import logging
from typing import Dict, Optional

from ..config import SebouMonitoringSettings
from ..gee_client import GeeAuthConfig, initialize_gee, require_ee


class SebouDataAcquirer:
    """
    Multi-source data acquisition for Sebou basin monitoring.

    This class is isolated from existing API logic and can be used by dedicated
    pipeline scripts only.
    """

    def __init__(
        self,
        settings: SebouMonitoringSettings,
        auto_initialize_gee: bool = False,
    ) -> None:
        self.logger = logging.getLogger(__name__)
        self.settings = settings
        self._ee = require_ee()

        if auto_initialize_gee:
            auth = GeeAuthConfig(
                project=settings.gee.project,
                service_account=settings.gee.service_account,
                key_file=settings.gee.key_file,
            )
            initialize_gee(auth=auth, interactive=False)

        self.basin = self._load_basin_boundary()

    def _load_basin_boundary(self):
        """Load basin geometry from GEE asset, fallback to configured bbox."""
        if self.settings.basin.asset_id:
            try:
                basin_fc = self._ee.FeatureCollection(self.settings.basin.asset_id)
                return basin_fc.geometry()
            except Exception as exc:
                if not self.settings.basin.allow_fallback_bbox:
                    raise RuntimeError(
                        f"Unable to load basin asset '{self.settings.basin.asset_id}' and fallback disabled."
                    ) from exc
                self.logger.warning(
                    "Failed to load basin asset '%s'. Falling back to bbox. Error: %s",
                    self.settings.basin.asset_id,
                    str(exc),
                )

        xmin, ymin, xmax, ymax = self.settings.basin.bbox_wgs84
        return self._ee.Geometry.Rectangle([xmin, ymin, xmax, ymax])

    def acquire_modis_snow(
        self,
        start_date: datetime,
        end_date: datetime,
    ):
        """Acquire MODIS daily snow collection with quality mask."""
        collection = (
            self._ee.ImageCollection(self.settings.sensors.modis_collection)
            .filterBounds(self.basin)
            .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
        )

        def mask_quality(image):
            qa = image.select("NDSI_Snow_Cover_Basic_QA")
            quality_mask = qa.lte(1)  # 0=best, 1=good
            return image.updateMask(quality_mask)

        return collection.map(mask_quality)

    def acquire_sentinel1_sar(
        self,
        start_date: datetime,
        end_date: datetime,
        orbit_direction: str = "DESCENDING",
    ):
        """Acquire Sentinel-1 SAR collection (VV, IW mode)."""
        return (
            self._ee.ImageCollection(self.settings.sensors.sentinel1_collection)
            .filterBounds(self.basin)
            .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
            .filter(self._ee.Filter.listContains("transmitterReceiverPolarisation", "VV"))
            .filter(self._ee.Filter.eq("instrumentMode", "IW"))
            .filter(self._ee.Filter.eq("orbitProperties_pass", orbit_direction))
            .select("VV")
        )

    def acquire_sentinel2_optical(
        self,
        start_date: datetime,
        end_date: datetime,
        max_cloud_cover: float = 30.0,
    ):
        """Acquire Sentinel-2 L2A with SCL cloud/shadow/snow-safe mask."""
        collection = (
            self._ee.ImageCollection(self.settings.sensors.sentinel2_collection)
            .filterBounds(self.basin)
            .filterDate(start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
            .filter(self._ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", max_cloud_cover))
        )

        def mask_clouds(image):
            scl = image.select("SCL")
            clear = scl.eq(4).Or(scl.eq(5)).Or(scl.eq(6)).Or(scl.eq(11))
            return image.updateMask(clear)

        return collection.map(mask_clouds)

    def get_auxiliary_data(self) -> Dict[str, object]:
        """Load DEM, slope and permanent-water mask."""
        dem = self._ee.Image("USGS/SRTMGL1_003").clip(self.basin)
        slope = self._ee.Terrain.slope(dem)

        gsw = self._ee.Image("JRC/GSW1_4/GlobalSurfaceWater")
        permanent_water = gsw.select("max_extent").eq(1).clip(self.basin)

        return {
            "dem": dem,
            "elevation": dem.select("elevation"),
            "slope": slope,
            "permanent_water": permanent_water,
        }

    def start_export_to_drive(
        self,
        image,
        description: str,
        folder: str = "Sebou_Monitoring",
        scale: Optional[int] = None,
        region=None,
        crs: str = "EPSG:32629",
    ):
        """Start a GEE export task to Google Drive (COG-ready GeoTIFF)."""
        if scale is None:
            scale = self.settings.sensors.modis_scale_m
        if region is None:
            region = self.basin

        task = self._ee.batch.Export.image.toDrive(
            image=image.toFloat(),
            description=description,
            folder=folder,
            region=region,
            scale=scale,
            crs=crs,
            fileFormat="GeoTIFF",
            formatOptions={"cloudOptimized": True},
            maxPixels=1e10,
        )
        task.start()
        return task
