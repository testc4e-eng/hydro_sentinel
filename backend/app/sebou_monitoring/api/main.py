from __future__ import annotations

from datetime import date, datetime, timedelta
import json
import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from ..config import SebouMonitoringSettings


def _load_settings() -> SebouMonitoringSettings:
    config_path = os.getenv(
        "SEBOU_CONFIG_PATH",
        str(Path(__file__).resolve().parents[3] / "config" / "sebou" / "config.example.yaml"),
    )
    return SebouMonitoringSettings.from_yaml(config_path)


def _build_engine(settings: SebouMonitoringSettings) -> Engine:
    return create_engine(settings.database.sqlalchemy_url(), future=True)


def create_app() -> FastAPI:
    settings = _load_settings()
    engine = _build_engine(settings)
    schema = settings.database.schema

    app = FastAPI(
        title="Sebou Monitoring API",
        description="Read-only API for Sebou monitoring outputs.",
        version="1.0.0",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def read_root():
        return {
            "name": "Sebou Monitoring API",
            "version": "1.0.0",
            "schema": schema,
            "endpoints": [
                "/health",
                "/stats/daily/{target_date}",
                "/stats/timeseries",
                "/flood/{target_date}",
                "/alerts",
            ],
        }

    @app.get("/health")
    def health_check():
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            return {"status": "healthy", "database": "connected"}
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Database error: {exc}") from exc

    @app.get("/stats/daily/{target_date}")
    def get_daily_stats(target_date: str):
        parsed_date = _parse_date(target_date)
        query = text(
            f"""
            SELECT
                date,
                snow_area_km2,
                snow_percentage,
                mean_snow_elevation,
                flood_area_km2,
                quality_score
            FROM {schema}.daily_statistics
            WHERE date = :target_date
            """
        )
        with engine.connect() as conn:
            row = conn.execute(query, {"target_date": parsed_date}).fetchone()

        if row is None:
            raise HTTPException(status_code=404, detail="No daily statistics for this date.")

        return {
            "date": str(row.date),
            "snow_area_km2": _num(row.snow_area_km2),
            "snow_percentage": _num(row.snow_percentage),
            "mean_snow_elevation": _num(row.mean_snow_elevation),
            "flood_area_km2": _num(row.flood_area_km2) or 0.0,
            "quality_score": _num(row.quality_score),
        }

    @app.get("/stats/timeseries")
    def get_timeseries(days: int = Query(90, ge=1, le=365), end_date: Optional[str] = None):
        parsed_end = _parse_date(end_date) if end_date else date.today()
        parsed_start = parsed_end - timedelta(days=days)
        query = text(
            f"""
            SELECT
                date,
                snow_area_km2,
                COALESCE(flood_area_km2, 0) AS flood_area_km2,
                quality_score
            FROM {schema}.daily_statistics
            WHERE date BETWEEN :start_date AND :end_date
            ORDER BY date
            """
        )
        with engine.connect() as conn:
            rows = conn.execute(query, {"start_date": parsed_start, "end_date": parsed_end}).fetchall()

        return {
            "dates": [str(row.date) for row in rows],
            "snow_area": [_num(row.snow_area_km2) or 0.0 for row in rows],
            "flood_area": [_num(row.flood_area_km2) or 0.0 for row in rows],
            "quality_score": [_num(row.quality_score) for row in rows],
        }

    @app.get("/flood/{target_date}")
    def get_flood_extent(target_date: str):
        parsed_date = _parse_date(target_date)
        query = text(
            f"""
            SELECT
                id,
                ST_AsGeoJSON(ST_Transform(geom, 4326)) AS geometry,
                area_km2,
                detection_confidence
            FROM {schema}.flood_extents
            WHERE date = :target_date
            ORDER BY id
            """
        )
        with engine.connect() as conn:
            rows = conn.execute(query, {"target_date": parsed_date}).fetchall()

        return {
            "type": "FeatureCollection",
            "features": [
                {
                    "type": "Feature",
                    "geometry": json.loads(row.geometry),
                    "properties": {
                        "id": row.id,
                        "area_km2": _num(row.area_km2),
                        "confidence": _num(row.detection_confidence),
                    },
                }
                for row in rows
            ],
        }

    @app.get("/alerts")
    def get_alerts(status: str = Query("active", pattern="^(active|resolved|all)$")):
        query = text(
            f"""
            SELECT
                id,
                alert_type,
                severity,
                message,
                affected_area_km2,
                status,
                created_at,
                resolved_at
            FROM {schema}.alerts
            WHERE (:status = 'all' OR status = :status)
            ORDER BY created_at DESC
            LIMIT 100
            """
        )
        with engine.connect() as conn:
            rows = conn.execute(query, {"status": status}).fetchall()

        return [
            {
                "id": row.id,
                "type": row.alert_type,
                "severity": row.severity,
                "message": row.message,
                "affected_area_km2": _num(row.affected_area_km2),
                "status": row.status,
                "created_at": row.created_at.isoformat() if row.created_at else None,
                "resolved_at": row.resolved_at.isoformat() if row.resolved_at else None,
            }
            for row in rows
        ]

    return app


def _parse_date(raw_value: Optional[str]) -> date:
    if raw_value is None:
        raise HTTPException(status_code=400, detail="Missing date parameter.")
    try:
        return datetime.strptime(raw_value, "%Y-%m-%d").date()
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.") from exc


def _num(value):
    return float(value) if value is not None else None


app = create_app()
