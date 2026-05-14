from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os
from typing import Any, Dict, List, Optional, Tuple

try:
    import yaml  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    yaml = None


@dataclass(frozen=True)
class BasinConfig:
    asset_id: Optional[str]
    bbox_wgs84: Tuple[float, float, float, float]
    allow_fallback_bbox: bool = True


@dataclass(frozen=True)
class GeeConfig:
    project: Optional[str]
    service_account: Optional[str]
    key_file: Optional[str]


@dataclass(frozen=True)
class PathConfig:
    data_root: str
    raw_data: str
    processed_data: str
    products: str
    logs: str


@dataclass(frozen=True)
class DatabaseConfig:
    host: str
    port: int
    database: str
    user: str
    password: Optional[str]
    schema: str = "sebou"

    def sqlalchemy_url(self) -> str:
        password = self.password or ""
        auth = self.user if not password else f"{self.user}:{password}"
        return f"postgresql+psycopg://{auth}@{self.host}:{self.port}/{self.database}"


@dataclass(frozen=True)
class SensorConfig:
    modis_collection: str
    sentinel1_collection: str
    sentinel2_collection: str
    modis_scale_m: int
    sentinel1_scale_m: int
    sentinel2_scale_m: int


@dataclass(frozen=True)
class SnowDetectionConfig:
    ndsi_threshold_high_elev: float = 0.4
    ndsi_threshold_mid_elev: float = 0.5
    ndsi_threshold_low_elev: float = 0.6
    nir_threshold_modis: float = 0.11
    nir_threshold_s2: float = 0.15
    min_area_pixels: int = 9


@dataclass(frozen=True)
class FloodDetectionConfig:
    sar_difference_threshold_db: float = -4.0
    sar_absolute_threshold_db: float = -15.0
    max_slope_deg: float = 5.0
    min_area_pixels: int = 25
    optical_mndwi_threshold: float = 0.3
    optical_change_threshold: float = 0.1
    low_elevation_max_m: float = 500.0


@dataclass(frozen=True)
class AlertThresholds:
    flood_area_critical_km2: float = 10.0
    snow_anomaly_zscore: float = 2.5
    quality_score_minimum: float = 70.0


@dataclass(frozen=True)
class AlertsConfig:
    email_enabled: bool
    recipients: List[str]
    thresholds: AlertThresholds


@dataclass(frozen=True)
class ScheduleConfig:
    daily_processing_cron: str = "0 6 * * *"
    validation_check_cron: str = "0 8 * * *"
    cleanup_old_data_cron: str = "0 2 * * 0"


@dataclass(frozen=True)
class SebouMonitoringSettings:
    basin: BasinConfig
    gee: GeeConfig
    paths: PathConfig
    database: DatabaseConfig
    sensors: SensorConfig
    snow_detection: SnowDetectionConfig
    flood_detection: FloodDetectionConfig
    alerts: AlertsConfig
    schedule: ScheduleConfig
    raw: Dict[str, Any]

    @classmethod
    def from_yaml(cls, config_path: str | Path) -> "SebouMonitoringSettings":
        if yaml is None:
            raise RuntimeError(
                "PyYAML is required to load Sebou settings. "
                "Install backend/requirements-sebou.txt."
            )

        path = Path(config_path)
        if not path.exists():
            raise FileNotFoundError(f"Sebou config file not found: {path}")

        data = yaml.safe_load(path.read_text(encoding="utf-8")) or {}

        basin_data = data.get("basin", {})
        bbox = basin_data.get("bbox_wgs84", [-5.5, 33.5, -4.0, 34.8])
        if len(bbox) != 4:
            raise ValueError("basin.bbox_wgs84 must contain 4 coordinates [xmin, ymin, xmax, ymax].")

        gee_data = data.get("gee", {})
        paths_data = data.get("paths", {})
        database_data = data.get("database", {})
        sensors_data = data.get("sensors", {})
        processing = data.get("processing", {})
        snow_data = processing.get("snow_detection", {})
        flood_data = processing.get("flood_detection", {})
        alerts_data = data.get("alerts", {})
        thresholds_data = alerts_data.get("thresholds", {})
        schedule_data = data.get("schedule", {})

        return cls(
            basin=BasinConfig(
                asset_id=basin_data.get("asset_id"),
                bbox_wgs84=(float(bbox[0]), float(bbox[1]), float(bbox[2]), float(bbox[3])),
                allow_fallback_bbox=bool(basin_data.get("allow_fallback_bbox", True)),
            ),
            gee=GeeConfig(
                project=_resolve_env_value(gee_data.get("project")),
                service_account=_resolve_env_value(gee_data.get("service_account")),
                key_file=_resolve_env_value(gee_data.get("key_file")),
            ),
            paths=PathConfig(
                data_root=str(paths_data.get("data_root", "./data/sebou_monitoring")),
                raw_data=str(paths_data.get("raw_data", "./data/sebou_monitoring/raw")),
                processed_data=str(paths_data.get("processed_data", "./data/sebou_monitoring/processed")),
                products=str(paths_data.get("products", "./data/sebou_monitoring/products")),
                logs=str(paths_data.get("logs", "./data/sebou_monitoring/logs")),
            ),
            database=DatabaseConfig(
                host=str(database_data.get("host", "localhost")),
                port=int(database_data.get("port", 5432)),
                database=str(database_data.get("database", "sebou_monitoring")),
                user=str(database_data.get("user", "sebou_user")),
                password=_resolve_env_value(database_data.get("password")),
                schema=str(database_data.get("schema", "sebou")),
            ),
            sensors=SensorConfig(
                modis_collection=sensors_data.get("modis", {}).get("collection", "MODIS/006/MOD10A1"),
                sentinel1_collection=sensors_data.get("sentinel1", {}).get("collection", "COPERNICUS/S1_GRD"),
                sentinel2_collection=sensors_data.get("sentinel2", {}).get("collection", "COPERNICUS/S2_SR_HARMONIZED"),
                modis_scale_m=int(sensors_data.get("modis", {}).get("scale", 500)),
                sentinel1_scale_m=int(sensors_data.get("sentinel1", {}).get("scale", 10)),
                sentinel2_scale_m=int(sensors_data.get("sentinel2", {}).get("scale", 10)),
            ),
            snow_detection=SnowDetectionConfig(
                ndsi_threshold_high_elev=float(snow_data.get("ndsi_threshold_high_elev", 0.4)),
                ndsi_threshold_mid_elev=float(snow_data.get("ndsi_threshold_mid_elev", 0.5)),
                ndsi_threshold_low_elev=float(snow_data.get("ndsi_threshold_low_elev", 0.6)),
                nir_threshold_modis=float(snow_data.get("nir_threshold_modis", snow_data.get("nir_threshold", 0.11))),
                nir_threshold_s2=float(snow_data.get("nir_threshold_s2", 0.15)),
                min_area_pixels=int(snow_data.get("min_area_pixels", 9)),
            ),
            flood_detection=FloodDetectionConfig(
                sar_difference_threshold_db=float(flood_data.get("sar_difference_threshold", -4.0)),
                sar_absolute_threshold_db=float(flood_data.get("sar_absolute_threshold", -15.0)),
                max_slope_deg=float(flood_data.get("max_slope", 5.0)),
                min_area_pixels=int(flood_data.get("min_area_pixels", 25)),
                optical_mndwi_threshold=float(flood_data.get("optical_mndwi_threshold", 0.3)),
                optical_change_threshold=float(flood_data.get("optical_change_threshold", 0.1)),
                low_elevation_max_m=float(flood_data.get("low_elevation_max_m", 500.0)),
            ),
            alerts=AlertsConfig(
                email_enabled=bool(alerts_data.get("email", {}).get("enabled", False)),
                recipients=list(alerts_data.get("email", {}).get("recipients", [])),
                thresholds=AlertThresholds(
                    flood_area_critical_km2=float(thresholds_data.get("flood_area_critical", 10.0)),
                    snow_anomaly_zscore=float(thresholds_data.get("snow_anomaly_zscore", 2.5)),
                    quality_score_minimum=float(thresholds_data.get("quality_score_minimum", 70.0)),
                ),
            ),
            schedule=ScheduleConfig(
                daily_processing_cron=str(schedule_data.get("daily_processing", "0 6 * * *")),
                validation_check_cron=str(schedule_data.get("validation_check", "0 8 * * *")),
                cleanup_old_data_cron=str(schedule_data.get("cleanup_old_data", "0 2 * * 0")),
            ),
            raw=data,
        )


def _resolve_env_value(value: Any) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str):
        return str(value)

    text = value.strip()
    if text.startswith("${") and text.endswith("}") and len(text) > 3:
        env_name = text[2:-1]
        return os.getenv(env_name)
    return text
