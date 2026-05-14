from __future__ import annotations

from datetime import datetime
import json
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

from sqlalchemy import create_engine, text


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
SCHEMA_SQL = ROOT / "app" / "db" / "sebou_monitoring_schema.sql"
THEMATIC_DIR = ROOT / "data" / "thematic_maps"


def _read_env_file(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def _sync_db_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url


def _load_json(path: Path) -> Dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _parse_date(value: str) -> datetime.date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def _iter_binary_mask_features(product: Dict[str, Any], map_type: str) -> Iterable[Dict[str, Any]]:
    expected_class = "water" if map_type == "flood" else "snow"
    layers: List[Dict[str, Any]] = product.get("layers", [])
    for layer in layers:
        if layer.get("kind") != "binary_mask":
            continue
        layer_name = str(layer.get("name", "")).lower()
        if "non " in layer_name or "non-" in layer_name or "no " in layer_name:
            continue

        geojson = layer.get("geojson", {})
        features = geojson.get("features", []) if isinstance(geojson, dict) else []
        for feature in features:
            properties = feature.get("properties", {}) if isinstance(feature, dict) else {}
            cls = str(properties.get("class", "")).lower()
            if cls and cls != expected_class:
                continue
            yield feature


def _upsert_daily_statistics(conn, target_date, snow_area_km2, snow_percentage, flood_area_km2):
    conn.execute(
        text(
            """
            INSERT INTO sebou.daily_statistics (
                date,
                snow_area_km2,
                snow_percentage,
                flood_area_km2,
                quality_score,
                data_sources,
                processing_time_seconds
            )
            VALUES (
                :date,
                :snow_area_km2,
                :snow_percentage,
                :flood_area_km2,
                :quality_score,
                :data_sources,
                :processing_time_seconds
            )
            ON CONFLICT (date) DO UPDATE SET
                snow_area_km2 = COALESCE(EXCLUDED.snow_area_km2, sebou.daily_statistics.snow_area_km2),
                snow_percentage = COALESCE(EXCLUDED.snow_percentage, sebou.daily_statistics.snow_percentage),
                flood_area_km2 = COALESCE(EXCLUDED.flood_area_km2, sebou.daily_statistics.flood_area_km2),
                quality_score = EXCLUDED.quality_score,
                data_sources = EXCLUDED.data_sources,
                processing_time_seconds = EXCLUDED.processing_time_seconds
            """
        ),
        {
            "date": target_date,
            "snow_area_km2": snow_area_km2,
            "snow_percentage": snow_percentage,
            "flood_area_km2": flood_area_km2,
            "quality_score": 85,
            "data_sources": ["seeded_thematic_json"],
            "processing_time_seconds": 60,
        },
    )


def _insert_extent_features(conn, table_name: str, target_date, sensor: str, confidence: float, features: Iterable[Dict[str, Any]]):
    conn.execute(text(f"DELETE FROM sebou.{table_name} WHERE date = :target_date"), {"target_date": target_date})

    for feature in features:
        geometry = feature.get("geometry")
        if not geometry:
            continue
        geometry_json = json.dumps(geometry)
        conn.execute(
            text(
                f"""
                INSERT INTO sebou.{table_name} (
                    date,
                    area_km2,
                    detection_confidence,
                    sensor,
                    geom
                )
                VALUES (
                    :target_date,
                    ST_Area(
                        ST_Multi(
                            ST_Transform(
                                ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326),
                                32629
                            )
                        )
                    ) / 1000000.0,
                    :confidence,
                    :sensor,
                    ST_Multi(
                        ST_Transform(
                            ST_SetSRID(ST_GeomFromGeoJSON(:geometry), 4326),
                            32629
                        )
                    )
                )
                """
            ),
            {
                "target_date": target_date,
                "geometry": geometry_json,
                "confidence": confidence,
                "sensor": sensor,
            },
        )


def main() -> None:
    env = _read_env_file(ENV_PATH)
    db_url = env.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL introuvable dans backend/.env")

    engine = create_engine(_sync_db_url(db_url), future=True)

    flood_data = _load_json(THEMATIC_DIR / "flood_products.json")
    snow_data = _load_json(THEMATIC_DIR / "snow_products.json")

    with engine.begin() as conn:
        conn.execute(text(SCHEMA_SQL.read_text(encoding="utf-8")))

        for product in flood_data.get("products", []):
            target_date = _parse_date(product["acquisition_end"])
            flood_area = product.get("statistics", {}).get("positive_class", {}).get("km2")
            _upsert_daily_statistics(
                conn,
                target_date=target_date,
                snow_area_km2=None,
                snow_percentage=None,
                flood_area_km2=float(flood_area) if flood_area is not None else None,
            )
            _insert_extent_features(
                conn,
                table_name="flood_extents",
                target_date=target_date,
                sensor=product.get("satellite", "Sentinel-1"),
                confidence=0.85,
                features=_iter_binary_mask_features(product, "flood"),
            )

        for product in snow_data.get("products", []):
            target_date = _parse_date(product["acquisition_end"])
            snow_area = product.get("statistics", {}).get("positive_class", {}).get("km2")
            snow_percentage = product.get("statistics", {}).get("positive_class", {}).get("percentage")
            _upsert_daily_statistics(
                conn,
                target_date=target_date,
                snow_area_km2=float(snow_area) if snow_area is not None else None,
                snow_percentage=float(snow_percentage) if snow_percentage is not None else None,
                flood_area_km2=None,
            )
            _insert_extent_features(
                conn,
                table_name="snow_extents",
                target_date=target_date,
                sensor=product.get("satellite", "MODIS"),
                confidence=0.8,
                features=_iter_binary_mask_features(product, "snow"),
            )

        conn.execute(text("DELETE FROM sebou.quality_reports"))
        conn.execute(
            text(
                """
                INSERT INTO sebou.quality_reports (processing_date, sensor, quality_flags, validation_score)
                SELECT date, 'Sentinel-1', ARRAY[]::text[], quality_score
                FROM sebou.daily_statistics
                WHERE flood_area_km2 IS NOT NULL
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO sebou.quality_reports (processing_date, sensor, quality_flags, validation_score)
                SELECT date, 'MODIS', ARRAY[]::text[], quality_score
                FROM sebou.daily_statistics
                WHERE snow_area_km2 IS NOT NULL
                """
            )
        )

    print("Schema sebou cree et donnees thematiques injectees.")


if __name__ == "__main__":
    main()
