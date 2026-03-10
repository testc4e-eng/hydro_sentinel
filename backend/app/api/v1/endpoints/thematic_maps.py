from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.thematic_map import (
    MapType,
    ThematicMapCatalog,
    ThematicMapDataFile,
    ThematicMapProduct,
    ThematicMapProductSummary,
)

router = APIRouter()

DATA_DIR = Path(__file__).resolve().parents[4] / "data" / "thematic_maps"
ASSETS_DIR = DATA_DIR / "assets"
DATA_FILES = {
    "flood": DATA_DIR / "flood_products.json",
    "snow": DATA_DIR / "snow_products.json",
}

DEFAULT_BBOX: Dict[MapType, Tuple[float, float, float, float]] = {
    "flood": (-6.2, 33.9, -4.2, 35.2),
    "snow": (-5.8, 33.4, -4.1, 34.4),
}

POSITIVE_LABEL: Dict[MapType, str] = {
    "flood": "Eau",
    "snow": "Neige",
}

NEGATIVE_LABEL: Dict[MapType, str] = {
    "flood": "Non eau",
    "snow": "Non neige",
}

MASK_STYLE: Dict[MapType, Dict[str, str]] = {
    "flood": {"fillColor": "#1d4ed8", "outlineColor": "#1e3a8a"},
    "snow": {"fillColor": "#f8fafc", "outlineColor": "#94a3b8"},
}


def _load_static_map_data(map_type: MapType) -> ThematicMapDataFile:
    target = DATA_FILES.get(map_type)
    if target is None:
        raise HTTPException(status_code=404, detail=f"Unknown map type: {map_type}")
    if not target.exists():
        raise HTTPException(
            status_code=500,
            detail=f"Thematic map dataset is missing: {target.name}",
        )

    payload = json.loads(target.read_text(encoding="utf-8"))
    return ThematicMapDataFile.model_validate(payload)


def _filter_products(
    products: List[ThematicMapProduct],
    event: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> List[ThematicMapProduct]:
    filtered = products
    if event:
        event_lower = event.strip().lower()
        filtered = [p for p in filtered if event_lower in p.event_name.lower()]
    if date_from:
        filtered = [p for p in filtered if p.acquisition_end >= date_from]
    if date_to:
        filtered = [p for p in filtered if p.acquisition_start <= date_to]
    return sorted(filtered, key=lambda product: product.acquisition_end, reverse=True)


def _safe_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except Exception:
        return None


def _surface_stat(area_km2: float, total_km2: float) -> Dict[str, float]:
    area_km2 = max(0.0, area_km2)
    total_km2 = max(area_km2, total_km2)
    percentage = (area_km2 / total_km2 * 100.0) if total_km2 > 0 else 0.0
    return {
        "m2": area_km2 * 1_000_000.0,
        "km2": area_km2,
        "hectares": area_km2 * 100.0,
        "percentage": percentage,
    }


def _infer_total_km2(
    map_type: MapType,
    positive_km2: float,
    snow_area_km2: Optional[float],
    snow_percentage: Optional[float],
) -> float:
    if snow_area_km2 is not None and snow_percentage is not None and 0 < snow_percentage <= 100:
        inferred = snow_area_km2 / (snow_percentage / 100.0)
        if inferred > 0:
            return inferred

    if map_type == "snow":
        return max(positive_km2 * 1.25, positive_km2 + 1.0)
    return max(positive_km2 * 4.0, positive_km2 + 5.0)


def _build_statistics(
    map_type: MapType,
    positive_km2: float,
    snow_area_km2: Optional[float],
    snow_percentage: Optional[float],
) -> Dict[str, Any]:
    total_km2 = _infer_total_km2(
        map_type=map_type,
        positive_km2=positive_km2,
        snow_area_km2=snow_area_km2,
        snow_percentage=snow_percentage,
    )
    negative_km2 = max(0.0, total_km2 - positive_km2)
    return {
        "positive_class_label": POSITIVE_LABEL[map_type],
        "negative_class_label": NEGATIVE_LABEL[map_type],
        "positive_class": _surface_stat(positive_km2, total_km2),
        "negative_class": _surface_stat(negative_km2, total_km2),
        "total_area_m2": total_km2 * 1_000_000.0,
    }


def _rectangle_geojson(min_lon: float, min_lat: float, max_lon: float, max_lat: float) -> Dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": {"class": "aoi"},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [
                            [min_lon, min_lat],
                            [max_lon, min_lat],
                            [max_lon, max_lat],
                            [min_lon, max_lat],
                            [min_lon, min_lat],
                        ]
                    ],
                },
            }
        ],
    }


def _ingest_coordinates(coordinates: Any, bounds: Dict[str, float]) -> None:
    if not isinstance(coordinates, list):
        return

    if len(coordinates) >= 2 and isinstance(coordinates[0], (int, float)) and isinstance(coordinates[1], (int, float)):
        lon = float(coordinates[0])
        lat = float(coordinates[1])
        bounds["min_lon"] = min(bounds["min_lon"], lon)
        bounds["min_lat"] = min(bounds["min_lat"], lat)
        bounds["max_lon"] = max(bounds["max_lon"], lon)
        bounds["max_lat"] = max(bounds["max_lat"], lat)
        return

    for child in coordinates:
        _ingest_coordinates(child, bounds)


def _geojson_bbox(geojson_data: Dict[str, Any]) -> Optional[Tuple[float, float, float, float]]:
    features = geojson_data.get("features", [])
    if not isinstance(features, list):
        return None

    bounds = {
        "min_lon": float("inf"),
        "min_lat": float("inf"),
        "max_lon": float("-inf"),
        "max_lat": float("-inf"),
    }
    for feature in features:
        geometry = feature.get("geometry", {}) if isinstance(feature, dict) else {}
        _ingest_coordinates(geometry.get("coordinates"), bounds)

    if not all(
        value != float("inf") and value != float("-inf")
        for value in (bounds["min_lon"], bounds["min_lat"], bounds["max_lon"], bounds["max_lat"])
    ):
        return None
    return (bounds["min_lon"], bounds["min_lat"], bounds["max_lon"], bounds["max_lat"])


async def _table_exists(db: AsyncSession, qualified_name: str) -> bool:
    result = await db.execute(text("SELECT to_regclass(:table_name)"), {"table_name": qualified_name})
    return result.scalar_one_or_none() is not None


async def _load_sensor_for_date(db: AsyncSession, target_date: date, default_sensor: str) -> str:
    if not await _table_exists(db, "sebou.quality_reports"):
        return default_sensor

    query = text(
        """
        SELECT sensor
        FROM sebou.quality_reports
        WHERE processing_date = :target_date
          AND sensor IS NOT NULL
          AND sensor <> ''
        ORDER BY created_at DESC
        LIMIT 1
        """
    )
    result = await db.execute(query, {"target_date": target_date})
    value = result.scalar_one_or_none()
    return str(value) if value else default_sensor


async def _load_extent_geojson(db: AsyncSession, map_type: MapType, target_date: date) -> Optional[Dict[str, Any]]:
    table_name = "snow_extents" if map_type == "snow" else "flood_extents"
    class_name = "snow" if map_type == "snow" else "water"

    if not await _table_exists(db, f"sebou.{table_name}"):
        return None

    query = text(
        f"""
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(
                json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'properties', json_build_object(
                            'class', '{class_name}',
                            'area_km2', area_km2,
                            'confidence', detection_confidence
                        ),
                        'geometry', ST_AsGeoJSON(ST_Transform(geom, 4326))::json
                    )
                ) FILTER (WHERE geom IS NOT NULL),
                '[]'::json
            )
        ) AS geojson
        FROM sebou.{table_name}
        WHERE date = :target_date
        """
    )
    result = await db.execute(query, {"target_date": target_date})
    payload = result.scalar_one_or_none()
    if payload is None:
        return None
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            return None
    if not isinstance(payload, dict):
        return None

    features = payload.get("features")
    if not isinstance(features, list) or len(features) == 0:
        return None
    return payload


async def _load_live_products(map_type: MapType, db: AsyncSession) -> List[ThematicMapProduct]:
    if not await _table_exists(db, "sebou.daily_statistics"):
        return []

    if map_type == "flood":
        query = text(
            """
            SELECT
                date,
                flood_area_km2,
                snow_area_km2,
                snow_percentage
            FROM sebou.daily_statistics
            WHERE flood_area_km2 IS NOT NULL
              AND flood_area_km2 > 0
            ORDER BY date DESC
            LIMIT 180
            """
        )
        default_sensor = "Sentinel-1"
    else:
        query = text(
            """
            SELECT
                date,
                snow_area_km2,
                snow_percentage
            FROM sebou.daily_statistics
            WHERE snow_area_km2 IS NOT NULL
              AND snow_area_km2 > 0
            ORDER BY date DESC
            LIMIT 180
            """
        )
        default_sensor = "MODIS"

    rows = (await db.execute(query)).fetchall()
    products: List[ThematicMapProduct] = []

    for row in rows:
        record_date: date = row.date

        if map_type == "flood":
            positive_km2 = _safe_float(row.flood_area_km2) or 0.0
            snow_area_km2 = _safe_float(row.snow_area_km2)
            snow_percentage = _safe_float(row.snow_percentage)
        else:
            positive_km2 = _safe_float(row.snow_area_km2) or 0.0
            snow_area_km2 = _safe_float(row.snow_area_km2)
            snow_percentage = _safe_float(row.snow_percentage)

        if positive_km2 <= 0:
            continue

        extent_geojson = await _load_extent_geojson(db, map_type, record_date)
        if extent_geojson is None:
            continue

        bbox = _geojson_bbox(extent_geojson) or DEFAULT_BBOX[map_type]
        min_lon, min_lat, max_lon, max_lat = bbox
        aoi_geojson = _rectangle_geojson(min_lon, min_lat, max_lon, max_lat)
        statistics = _build_statistics(map_type, positive_km2, snow_area_km2, snow_percentage)
        sensor = await _load_sensor_for_date(db, record_date, default_sensor=default_sensor)

        date_token = record_date.strftime("%Y%m%d")
        acquisition_end = datetime.combine(record_date, time(hour=2, minute=12))
        acquisition_start = acquisition_end - timedelta(days=1)
        published_at = datetime.combine(record_date, time(hour=12, minute=0))

        event_name = (
            f"Inondation detectee {record_date.strftime('%d/%m/%Y')}"
            if map_type == "flood"
            else f"Couverture neigeuse {record_date.strftime('%d/%m/%Y')}"
        )

        layers = [
            {
                "id": f"{map_type}-mask-{date_token}",
                "name": "Masque eau" if map_type == "flood" else "Masque neige",
                "kind": "binary_mask",
                "source_type": "geojson",
                "visible": True,
                "opacity": 0.7,
                "paint": MASK_STYLE[map_type],
                "legend": [
                    {
                        "label": "Zones inondees" if map_type == "flood" else "Zones enneigees",
                        "color": MASK_STYLE[map_type]["fillColor"],
                    }
                ],
                "geojson": extent_geojson,
            },
            {
                "id": f"{map_type}-aoi-{date_token}",
                "name": "Zone d'analyse (AOI)",
                "kind": "reference",
                "source_type": "geojson",
                "visible": True,
                "opacity": 0.0,
                "paint": {"fillColor": "#000000", "outlineColor": "#ef4444"},
                "legend": [{"label": "Cadre AOI", "color": "#ef4444"}],
                "geojson": aoi_geojson,
            },
        ]

        products.append(
            ThematicMapProduct.model_validate(
                {
                    "id": f"{map_type}-{date_token}-sebou-live",
                    "event_name": event_name,
                    "acquisition_start": acquisition_start,
                    "acquisition_end": acquisition_end,
                    "published_at": published_at,
                    "satellite": sensor,
                    "status": "ready",
                    "bbox": [min_lon, min_lat, max_lon, max_lat],
                    "statistics": statistics,
                    "layers": layers,
                }
            )
        )

    return products


async def _load_map_data(map_type: MapType, db: AsyncSession) -> ThematicMapDataFile:
    static_data = _load_static_map_data(map_type)
    live_products = await _load_live_products(map_type, db)
    if not live_products:
        return static_data

    return ThematicMapDataFile(
        map_type=static_data.map_type,
        title=static_data.title,
        description=static_data.description,
        processing_chain=static_data.processing_chain,
        products=live_products,
    )


@router.get("/thematic-maps/{map_type}", response_model=ThematicMapCatalog)
async def get_thematic_map_catalog(
    map_type: MapType,
    event: Optional[str] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    data = await _load_map_data(map_type, db)
    filtered = _filter_products(data.products, event=event, date_from=date_from, date_to=date_to)
    summaries = [ThematicMapProductSummary.model_validate(product.model_dump()) for product in filtered]
    latest_product_id = summaries[0].id if summaries else None

    return ThematicMapCatalog(
        map_type=data.map_type,
        title=data.title,
        description=data.description,
        processing_chain=data.processing_chain,
        latest_product_id=latest_product_id,
        products=summaries,
    )


@router.get("/thematic-maps/{map_type}/history", response_model=List[ThematicMapProductSummary])
async def get_thematic_map_history(
    map_type: MapType,
    event: Optional[str] = Query(default=None),
    date_from: Optional[datetime] = Query(default=None),
    date_to: Optional[datetime] = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    data = await _load_map_data(map_type, db)
    filtered = _filter_products(data.products, event=event, date_from=date_from, date_to=date_to)
    return [ThematicMapProductSummary.model_validate(product.model_dump()) for product in filtered]


@router.get("/thematic-maps/{map_type}/products/{product_id}", response_model=ThematicMapProduct)
async def get_thematic_map_product(
    map_type: MapType,
    product_id: str,
    db: AsyncSession = Depends(get_db),
):
    data = await _load_map_data(map_type, db)
    for product in data.products:
        if product.id == product_id:
            return product
    raise HTTPException(
        status_code=404,
        detail=f"Product '{product_id}' not found for map type '{map_type}'",
    )


@router.get("/thematic-maps/assets/{map_type}/{product_id}/{file_path:path}")
async def get_thematic_map_asset(map_type: MapType, product_id: str, file_path: str):
    base_path = (ASSETS_DIR / map_type / product_id).resolve()
    target = (base_path / file_path).resolve()

    if not str(target).startswith(str(base_path)):
        raise HTTPException(status_code=400, detail="Invalid asset path.")
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Asset file not found.")

    return FileResponse(path=target)
