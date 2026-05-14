from __future__ import annotations

from datetime import datetime, timedelta
import json
import logging
from pathlib import Path
from typing import Dict, List, Optional

try:
    import geopandas as gpd  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    gpd = None

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from ..config import SebouMonitoringSettings
from ..gee_client import require_ee


class DataExporter:
    """Export Sebou monitoring outputs to files and PostgreSQL/PostGIS."""

    def __init__(self, settings: SebouMonitoringSettings) -> None:
        self.settings = settings
        self.logger = logging.getLogger(__name__)
        self._ee = None
        self._engine: Optional[Engine] = None

    @property
    def engine(self) -> Engine:
        if self._engine is None:
            self._engine = create_engine(self.settings.database.sqlalchemy_url(), future=True)
        return self._engine

    @property
    def ee(self):
        if self._ee is None:
            self._ee = require_ee()
        return self._ee

    def export_raster_cog(self, image, filename: str, scale_m: int = 500, region=None) -> Path:
        """
        Start an Earth Engine GeoTIFF export and persist a local manifest next to the expected output path.
        The actual raster delivery remains asynchronous in GEE/Drive.
        """
        output_dir = Path(self.settings.paths.products) / "cog"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{filename}.tif"
        manifest_path = output_dir / f"{filename}.export.json"

        if region is None:
            region = getattr(image, "geometry", lambda: None)() or None

        task = self.ee.batch.Export.image.toDrive(
            image=image.toFloat(),
            description=filename,
            folder="Sebou_Monitoring",
            fileNamePrefix=filename,
            region=region,
            scale=scale_m,
            crs="EPSG:32629",
            fileFormat="GeoTIFF",
            formatOptions={"cloudOptimized": True},
            maxPixels=1e10,
        )
        task.start()

        manifest = {
            "filename": filename,
            "target_path": str(output_path),
            "task_id": task.id,
            "started_at": datetime.utcnow().isoformat() + "Z",
            "status": "started",
        }
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        return output_path

    def export_vector_geojson(self, feature_collection, filename: str) -> Path:
        output_dir = Path(self.settings.paths.products) / "vectors"
        output_dir.mkdir(parents=True, exist_ok=True)
        output_path = output_dir / f"{filename}.geojson"

        geojson_data = feature_collection.getInfo()
        output_path.write_text(json.dumps(geojson_data, indent=2), encoding="utf-8")
        return output_path

    def save_statistics_to_db(
        self,
        date: datetime,
        snow_metrics: Dict[str, object],
        flood_metrics: Optional[Dict[str, object]],
        quality_report: Dict[str, object],
        processing_time_seconds: Optional[int] = None,
    ) -> None:
        schema = self.settings.database.schema
        query = text(
            f"""
            INSERT INTO {schema}.daily_statistics (
                date,
                snow_area_km2,
                snow_percentage,
                mean_snow_elevation,
                flood_area_km2,
                quality_score,
                data_sources,
                processing_time_seconds
            )
            VALUES (
                :date,
                :snow_area_km2,
                :snow_percentage,
                :mean_snow_elevation,
                :flood_area_km2,
                :quality_score,
                :data_sources,
                :processing_time_seconds
            )
            ON CONFLICT (date) DO UPDATE SET
                snow_area_km2 = EXCLUDED.snow_area_km2,
                snow_percentage = EXCLUDED.snow_percentage,
                mean_snow_elevation = EXCLUDED.mean_snow_elevation,
                flood_area_km2 = EXCLUDED.flood_area_km2,
                quality_score = EXCLUDED.quality_score,
                data_sources = EXCLUDED.data_sources,
                processing_time_seconds = EXCLUDED.processing_time_seconds
            """
        )

        payload = {
            "date": date.date(),
            "snow_area_km2": _ee_number_to_float(snow_metrics.get("snow_area_km2")),
            "snow_percentage": _ee_number_to_float(snow_metrics.get("snow_percentage")),
            "mean_snow_elevation": _ee_number_to_float(snow_metrics.get("mean_snow_elevation")),
            "flood_area_km2": _ee_number_to_float(flood_metrics.get("flood_area_km2")) if flood_metrics else None,
            "quality_score": quality_report.get("quality_score"),
            "data_sources": [str(quality_report.get("sensor", "unknown"))],
            "processing_time_seconds": processing_time_seconds,
        }

        with self.engine.begin() as conn:
            conn.execute(query, payload)

    def save_quality_report_to_db(self, quality_report: Dict[str, object]) -> None:
        if not quality_report or not quality_report.get("date"):
            self.logger.warning("Skipping empty quality report persistence.")
            return

        schema = self.settings.database.schema
        query = text(
            f"""
            INSERT INTO {schema}.quality_reports (
                processing_date,
                sensor,
                cloud_cover_percentage,
                spatial_coverage_percentage,
                quality_flags,
                validation_score
            )
            VALUES (
                :processing_date,
                :sensor,
                :cloud_cover_percentage,
                :spatial_coverage_percentage,
                :quality_flags,
                :validation_score
            )
            """
        )

        with self.engine.begin() as conn:
            conn.execute(
                query,
                {
                    "processing_date": quality_report.get("date"),
                    "sensor": quality_report.get("sensor"),
                    "cloud_cover_percentage": quality_report.get("cloud_cover_percentage"),
                    "spatial_coverage_percentage": quality_report.get("spatial_coverage_percentage"),
                    "quality_flags": list(quality_report.get("quality_flags", [])),
                    "validation_score": quality_report.get("quality_score"),
                },
            )

    def get_recent_snow_areas(self, end_date: datetime, days: int = 90) -> List[float]:
        schema = self.settings.database.schema
        query = text(
            f"""
            SELECT snow_area_km2
            FROM {schema}.daily_statistics
            WHERE date BETWEEN :start_date AND :end_date
              AND snow_area_km2 IS NOT NULL
            ORDER BY date
            """
        )
        start_date = end_date.date() - timedelta(days=days)
        try:
            with self.engine.connect() as conn:
                rows = conn.execute(
                    query,
                    {"start_date": start_date, "end_date": end_date.date()},
                ).fetchall()
            return [float(row.snow_area_km2) for row in rows]
        except Exception as exc:
            self.logger.warning("Unable to load snow history for anomaly detection: %s", exc)
            return []

    def cleanup_old_data(self, retention_days: int = 730) -> None:
        schema = self.settings.database.schema
        cutoff_date = (datetime.utcnow() - timedelta(days=retention_days)).date()
        statements = [
            text(f"DELETE FROM {schema}.quality_reports WHERE processing_date < :cutoff"),
            text(f"DELETE FROM {schema}.flood_extents WHERE date < :cutoff"),
            text(f"DELETE FROM {schema}.daily_statistics WHERE date < :cutoff"),
            text(f"DELETE FROM {schema}.alerts WHERE created_at::date < :cutoff AND status = 'resolved'"),
        ]
        with self.engine.begin() as conn:
            for statement in statements:
                conn.execute(statement, {"cutoff": cutoff_date})

    def save_flood_vectors_to_db(
        self,
        flood_vectors,
        date: datetime,
        sensor: str,
        detection_confidence: float = 0.85,
    ) -> None:
        if gpd is None:
            raise RuntimeError("geopandas is required for PostGIS vector export.")

        geojson_data = flood_vectors.getInfo()
        features = geojson_data.get("features", [])
        if not features:
            return

        gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
        gdf = gdf.to_crs("EPSG:32629")

        if "area_km2" not in gdf.columns:
            gdf["area_km2"] = gdf.geometry.area / 1_000_000.0

        gdf["date"] = date.date()
        gdf["sensor"] = sensor
        gdf["detection_confidence"] = detection_confidence

        keep_columns = ["date", "area_km2", "detection_confidence", "sensor", "geometry"]
        gdf = gdf[keep_columns]
        gdf.to_postgis(
            name="flood_extents",
            con=self.engine,
            schema=self.settings.database.schema,
            if_exists="append",
            index=False,
        )

    def save_snow_vectors_to_db(
        self,
        snow_vectors,
        date: datetime,
        sensor: str,
        detection_confidence: float = 0.8,
    ) -> None:
        if gpd is None:
            raise RuntimeError("geopandas is required for PostGIS vector export.")

        geojson_data = snow_vectors.getInfo()
        features = geojson_data.get("features", [])
        if not features:
            return

        gdf = gpd.GeoDataFrame.from_features(features, crs="EPSG:4326")
        gdf = gdf.to_crs("EPSG:32629")

        if "area_km2" not in gdf.columns:
            gdf["area_km2"] = gdf.geometry.area / 1_000_000.0

        gdf["date"] = date.date()
        gdf["sensor"] = sensor
        gdf["detection_confidence"] = detection_confidence

        keep_columns = ["date", "area_km2", "detection_confidence", "sensor", "geometry"]
        gdf = gdf[keep_columns]
        gdf.to_postgis(
            name="snow_extents",
            con=self.engine,
            schema=self.settings.database.schema,
            if_exists="append",
            index=False,
        )

    def save_alert_to_db(
        self,
        alert_type: str,
        severity: str,
        message: str,
        affected_area_km2: Optional[float] = None,
        status: str = "active",
    ) -> None:
        schema = self.settings.database.schema
        query = text(
            f"""
            INSERT INTO {schema}.alerts (
                alert_type,
                severity,
                message,
                affected_area_km2,
                status
            )
            VALUES (
                :alert_type,
                :severity,
                :message,
                :affected_area_km2,
                :status
            )
            """
        )

        with self.engine.begin() as conn:
            conn.execute(
                query,
                {
                    "alert_type": alert_type,
                    "severity": severity,
                    "message": message,
                    "affected_area_km2": affected_area_km2,
                    "status": status,
                },
            )


def _ee_number_to_float(value) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if hasattr(value, "getInfo"):
        return float(value.getInfo())
    return float(value)
