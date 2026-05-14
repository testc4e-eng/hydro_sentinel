from __future__ import annotations

import argparse
from datetime import datetime, timedelta
import logging
from pathlib import Path
import traceback
from typing import Dict, Optional

from ..acquisition import SebouDataAcquirer
from ..config import SebouMonitoringSettings
from ..detection import FloodDetector, SnowDetector
from ..export import DataExporter
from ..gee_client import GeeAuthConfig, initialize_gee
from ..preprocessing import ImagePreprocessor
from ..validation import DataValidator


class SebouMonitoringPipeline:
    """End-to-end Sebou pipeline, isolated from the main Hydro Sentinel API."""

    def __init__(self, config_path: str, initialize_earth_engine: bool = True) -> None:
        self.config_path = Path(config_path)
        self.settings = SebouMonitoringSettings.from_yaml(self.config_path)
        self.logger = self._setup_logging()

        if initialize_earth_engine:
            initialize_gee(
                GeeAuthConfig(
                    project=self.settings.gee.project,
                    service_account=self.settings.gee.service_account,
                    key_file=self.settings.gee.key_file,
                )
            )

        self.acquirer = SebouDataAcquirer(self.settings, auto_initialize_gee=False)
        self.preprocessor = ImagePreprocessor()
        self.snow_detector = SnowDetector(self.settings.snow_detection)
        self.flood_detector = FloodDetector(self.settings.flood_detection)
        self.validator = DataValidator()
        self.exporter = DataExporter(self.settings)

    def _setup_logging(self) -> logging.Logger:
        log_dir = Path(self.settings.paths.logs if hasattr(self, "settings") else "./data/sebou_monitoring/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"pipeline_{datetime.utcnow().strftime('%Y%m%d')}.log"

        logger = logging.getLogger(f"{__name__}.{id(self)}")
        logger.setLevel(logging.INFO)
        logger.handlers.clear()

        formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
        file_handler = logging.FileHandler(log_file, encoding="utf-8")
        file_handler.setFormatter(formatter)
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)

        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)
        return logger

    def run_daily_processing(self, target_date: Optional[datetime] = None) -> Dict[str, object]:
        target_date = target_date or (datetime.utcnow() - timedelta(days=1))
        started_at = datetime.utcnow()

        self.logger.info("Starting Sebou pipeline for %s", target_date.strftime("%Y-%m-%d"))

        try:
            acquired = self._step_acquisition(target_date)
            processed = self._step_preprocessing(acquired)
            snow_results = self._step_snow_detection(processed)
            flood_results = self._step_flood_detection(processed, target_date)
            validation_results = self._step_validation(processed, snow_results, flood_results, target_date)
            self._step_export(snow_results, flood_results, validation_results, target_date, started_at)
            self._step_notifications(snow_results, flood_results, validation_results)
            return {
                "date": target_date.strftime("%Y-%m-%d"),
                "snow": snow_results,
                "flood": flood_results,
                "validation": validation_results,
            }
        except Exception:
            self.logger.error("Pipeline failed:\n%s", traceback.format_exc())
            raise

    def _step_acquisition(self, target_date: datetime) -> Dict[str, object]:
        modis_collection = self.acquirer.acquire_modis_snow(target_date, target_date + timedelta(days=1))
        sentinel1_collection = self.acquirer.acquire_sentinel1_sar(target_date - timedelta(days=3), target_date + timedelta(days=1))
        sentinel2_collection = self.acquirer.acquire_sentinel2_optical(target_date - timedelta(days=3), target_date + timedelta(days=1))

        return {
            "modis_collection": modis_collection,
            "sentinel1_collection": sentinel1_collection,
            "sentinel2_collection": sentinel2_collection,
            "modis": modis_collection.first(),
            "sentinel1": sentinel1_collection.first(),
            "sentinel2": sentinel2_collection.first(),
            "auxiliary": self.acquirer.get_auxiliary_data(),
        }

    def _step_preprocessing(self, acquired: Dict[str, object]) -> Dict[str, object]:
        processed: Dict[str, object] = {"auxiliary": acquired["auxiliary"]}

        if acquired.get("modis") is not None:
            processed["modis"] = self.preprocessor.preprocess_modis(acquired["modis"])
        if acquired.get("sentinel1") is not None:
            processed["sentinel1"] = self.preprocessor.preprocess_sentinel1(acquired["sentinel1"])
        if acquired.get("sentinel2") is not None:
            processed["sentinel2"] = self.preprocessor.preprocess_sentinel2(acquired["sentinel2"])

        processed["sentinel1_collection"] = acquired.get("sentinel1_collection")
        processed["sentinel2_collection"] = acquired.get("sentinel2_collection")
        return processed

    def _step_snow_detection(self, processed: Dict[str, object]) -> Optional[Dict[str, object]]:
        modis_image = processed.get("modis")
        if modis_image is None:
            self.logger.warning("Skipping snow detection: no MODIS image.")
            return None

        dem = processed["auxiliary"]["dem"]
        snow_mask = self.snow_detector.detect_snow_adaptive(modis_image, dem, sensor="modis")
        snow_mask = self.snow_detector.post_process_snow_mask(snow_mask)
        metrics = self.snow_detector.calculate_snow_metrics(
            snow_mask=snow_mask,
            basin_boundary=self.acquirer.basin,
            dem=dem,
            scale_m=self.settings.sensors.modis_scale_m,
        )
        vectors = self.snow_detector.vectorize_snow_extent(
            snow_mask=snow_mask,
            basin_boundary=self.acquirer.basin,
            scale_m=self.settings.sensors.modis_scale_m,
        )
        return {"mask": snow_mask, "metrics": metrics, "vectors": vectors, "sensor": "MODIS"}

    def _step_flood_detection(self, processed: Dict[str, object], target_date: datetime) -> Optional[Dict[str, object]]:
        if not self._check_flood_trigger(target_date):
            return None

        sentinel1_image = processed.get("sentinel1")
        sentinel2_image = processed.get("sentinel2")
        aux = processed["auxiliary"]

        if sentinel1_image is not None:
            sensor = "Sentinel-1"
            scale_m = self.settings.sensors.sentinel1_scale_m
            reference_collection = self.acquirer.acquire_sentinel1_sar(target_date - timedelta(days=30), target_date - timedelta(days=20))

            if reference_collection.size().getInfo() > 0:
                before_image = self.preprocessor.preprocess_sentinel1(reference_collection.first())
                flood_mask = self.flood_detector.detect_flood_sar_difference(
                    before_image=before_image,
                    during_image=sentinel1_image,
                    permanent_water=aux["permanent_water"],
                    dem=aux["dem"],
                )
            else:
                flood_mask = self.flood_detector.detect_flood_sar_threshold(
                    sar_image=sentinel1_image,
                    permanent_water=aux["permanent_water"],
                    dem=aux["dem"],
                )
        elif sentinel2_image is not None:
            self.logger.warning("Sentinel-1 unavailable, using optical flood fallback (Sentinel-2).")
            sensor = "Sentinel-2"
            scale_m = self.settings.sensors.sentinel2_scale_m
            flood_mask = self.flood_detector.detect_flood_optical(
                image=sentinel2_image,
                permanent_water=aux["permanent_water"],
                reference_image=None,
            )
        else:
            self.logger.warning("Skipping flood detection: no Sentinel-1 or Sentinel-2 image.")
            return None

        metrics = self.flood_detector.calculate_flood_metrics(
            flood_mask=flood_mask,
            basin_boundary=self.acquirer.basin,
            scale_m=scale_m,
        )
        vectors = self.flood_detector.vectorize_flood_extent(
            flood_mask=flood_mask,
            basin_boundary=self.acquirer.basin,
            scale_m=scale_m,
        )
        return {"mask": flood_mask, "metrics": metrics, "vectors": vectors, "sensor": sensor}

    def _step_validation(
        self,
        processed: Dict[str, object],
        snow_results: Optional[Dict[str, object]],
        flood_results: Optional[Dict[str, object]],
        target_date: datetime,
    ) -> Dict[str, object]:
        validation: Dict[str, object] = {}

        if snow_results is not None:
            validation["snow_quality"] = self.validator.generate_quality_report(
                image=processed.get("modis") or snow_results["mask"],
                mask=snow_results["mask"],
                basin=self.acquirer.basin,
                sensor="MODIS",
                date=target_date,
                scale_m=self.settings.sensors.modis_scale_m,
            )

        if flood_results is not None:
            flood_sensor = str(flood_results.get("sensor", "Sentinel-1"))
            validation["flood_quality"] = self.validator.generate_quality_report(
                image=(
                    processed.get("sentinel1")
                    if flood_sensor == "Sentinel-1"
                    else processed.get("sentinel2")
                )
                or flood_results["mask"],
                mask=flood_results["mask"],
                basin=self.acquirer.basin,
                sensor=flood_sensor,
                date=target_date,
                scale_m=(
                    self.settings.sensors.sentinel1_scale_m
                    if flood_sensor == "Sentinel-1"
                    else self.settings.sensors.sentinel2_scale_m
                ),
            )

        if snow_results is not None:
            history = self.exporter.get_recent_snow_areas(
                end_date=target_date,
                days=90,
            )
            validation["snow_anomaly"] = self.validator.detect_anomalies(
                current_value=float(snow_results["metrics"]["snow_area_km2"].getInfo()),
                historical_data=history,
                threshold_zscore=self.settings.alerts.thresholds.snow_anomaly_zscore,
            )

        return validation

    def _step_export(
        self,
        snow_results: Optional[Dict[str, object]],
        flood_results: Optional[Dict[str, object]],
        validation: Dict[str, object],
        target_date: datetime,
        started_at: datetime,
    ) -> None:
        processing_seconds = int((datetime.utcnow() - started_at).total_seconds())
        date_token = target_date.strftime("%Y%m%d")

        if snow_results is not None:
            self.exporter.export_raster_cog(
                image=snow_results["mask"],
                filename=f"snow_mask_{date_token}",
                scale_m=self.settings.sensors.modis_scale_m,
                region=self.acquirer.basin,
            )
            self.exporter.export_vector_geojson(
                feature_collection=snow_results["vectors"],
                filename=f"snow_extent_{date_token}",
            )
            self.exporter.save_snow_vectors_to_db(
                snow_vectors=snow_results["vectors"],
                date=target_date,
                sensor=str(snow_results.get("sensor", "MODIS")),
            )

            self.exporter.save_statistics_to_db(
                date=target_date,
                snow_metrics=snow_results["metrics"],
                flood_metrics=flood_results["metrics"] if flood_results else None,
                quality_report=validation.get("snow_quality", {}),
                processing_time_seconds=processing_seconds,
            )
            if validation.get("snow_quality"):
                self.exporter.save_quality_report_to_db(validation["snow_quality"])

        if flood_results is not None:
            self.exporter.export_vector_geojson(
                feature_collection=flood_results["vectors"],
                filename=f"flood_extent_{date_token}",
            )
            self.exporter.save_flood_vectors_to_db(
                flood_vectors=flood_results["vectors"],
                date=target_date,
                sensor=str(flood_results.get("sensor", "Sentinel-1")),
            )
            if validation.get("flood_quality"):
                self.exporter.save_quality_report_to_db(validation["flood_quality"])

    def _step_notifications(
        self,
        snow_results: Optional[Dict[str, object]],
        flood_results: Optional[Dict[str, object]],
        validation: Dict[str, object],
    ) -> None:
        if snow_results is not None:
            snow_quality = validation.get("snow_quality", {})
            if snow_quality.get("quality_score", 100) < self.settings.alerts.thresholds.quality_score_minimum:
                self.exporter.save_alert_to_db(
                    alert_type="quality_issue",
                    severity="medium",
                    message="Snow product quality score below threshold.",
                )

        if flood_results is not None:
            flood_area = float(flood_results["metrics"]["flood_area_km2"].getInfo())
            if flood_area >= self.settings.alerts.thresholds.flood_area_critical_km2:
                self.exporter.save_alert_to_db(
                    alert_type="flood",
                    severity="critical",
                    message=f"Flood extent reached {flood_area:.2f} km2.",
                    affected_area_km2=flood_area,
                )

    def _check_flood_trigger(self, target_date: datetime) -> bool:
        # Placeholder until precipitation-trigger data is wired in.
        self.logger.info("Flood trigger check for %s defaults to enabled.", target_date.strftime("%Y-%m-%d"))
        return True

    def cleanup_old_data(self, retention_days: int = 730) -> None:
        self.logger.info("Running data cleanup with retention=%s days", retention_days)
        self.exporter.cleanup_old_data(retention_days=retention_days)


def main() -> None:
    parser = argparse.ArgumentParser(description="Sebou monitoring pipeline")
    parser.add_argument(
        "--config",
        default=str(Path(__file__).resolve().parents[3] / "config" / "sebou" / "config.example.yaml"),
        help="Path to Sebou YAML config",
    )
    parser.add_argument("--date", help="Target date as YYYY-MM-DD. Defaults to yesterday UTC.")
    args = parser.parse_args()

    target_date = datetime.strptime(args.date, "%Y-%m-%d") if args.date else None
    pipeline = SebouMonitoringPipeline(args.config)
    pipeline.run_daily_processing(target_date)


if __name__ == "__main__":
    main()
