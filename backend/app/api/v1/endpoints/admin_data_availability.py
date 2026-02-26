from __future__ import annotations

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db  # adapte si ton projet a un autre import

router = APIRouter()


def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt is not None else None


def _earliest(current: Optional[str], candidate: Optional[str]) -> Optional[str]:
    if candidate is None:
        return current
    if current is None:
        return candidate
    return candidate if candidate < current else current


def _latest(current: Optional[str], candidate: Optional[str]) -> Optional[str]:
    if candidate is None:
        return current
    if current is None:
        return candidate
    return candidate if candidate > current else current


@router.get("/admin/data-availability")
async def data_availability(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Build availability report using api.v_timeseries (the same source used by /measurements/timeseries).
    """

    # Entities counts (always available)
    total_stations = (await db.execute(text("SELECT COUNT(*) FROM geo.station"))).scalar() or 0
    total_basins = (await db.execute(text("SELECT COUNT(*) FROM geo.basin"))).scalar() or 0

    # ---- Stations availability from api.v_timeseries ----
    # Expected columns in api.v_timeseries:
    # entity_type, station_id, basin_id, variable_code, source_code, time, value
    station_rows = (await db.execute(text("""
        SELECT
            COALESCE(s.station_type, 'unknown') AS station_type,
            t.variable_code,
            t.source_code,
            COUNT(*)::bigint AS record_count,
            MIN(t.time) AS first_record,
            MAX(t.time) AS last_record
        FROM api.v_timeseries t
        JOIN geo.station s ON s.station_id = t.station_id
        WHERE t.entity_type = 'stations'
        GROUP BY 1,2,3
        ORDER BY 1,2,3
    """))).mappings().all()

    # ---- Basins availability from api.v_timeseries ----
    basin_rows = (await db.execute(text("""
        SELECT
            'level_0'::text AS basin_group,
            t.variable_code,
            t.source_code,
            COUNT(*)::bigint AS record_count,
            MIN(t.time) AS first_record,
            MAX(t.time) AS last_record
        FROM api.v_timeseries t
        WHERE t.entity_type = 'basins'
        GROUP BY 1,2,3
        ORDER BY 1,2,3
    """))).mappings().all()

    # ---- Station entities detailed availability ----
    station_entities_base = (await db.execute(text("""
        SELECT
            s.station_id::text AS station_id,
            NULLIF(TRIM(s.station_code), '') AS station_code,
            COALESCE(NULLIF(TRIM(s.station_name), ''), s.station_id::text) AS station_name,
            COALESCE(NULLIF(TRIM(s.station_type), ''), 'unknown') AS station_type,
            s.basin_id::text AS basin_id,
            NULLIF(TRIM(b.basin_name), '') AS basin_name
        FROM api.v_station s
        LEFT JOIN api.v_basin b ON b.basin_id = s.basin_id
        ORDER BY s.station_name NULLS LAST, s.station_code NULLS LAST
    """))).mappings().all()

    station_entities: Dict[str, Any] = {}
    for row in station_entities_base:
        station_entities[row["station_id"]] = {
            "station_id": row["station_id"],
            "station_code": row["station_code"],
            "station_name": row["station_name"],
            "station_type": row["station_type"],
            "basin_id": row["basin_id"],
            "basin_name": row["basin_name"],
            "total_records": 0,
            "variable_count": 0,
            "source_count": 0,
            "first_record": None,
            "last_record": None,
            "variables": {},
        }

    station_entity_rows = (await db.execute(text("""
        SELECT
            t.station_id::text AS station_id,
            NULLIF(TRIM(s.station_code), '') AS station_code,
            COALESCE(NULLIF(TRIM(s.station_name), ''), t.station_id::text) AS station_name,
            COALESCE(NULLIF(TRIM(s.station_type), ''), 'unknown') AS station_type,
            s.basin_id::text AS basin_id,
            NULLIF(TRIM(b.basin_name), '') AS basin_name,
            t.variable_code,
            t.source_code,
            COUNT(*)::bigint AS record_count,
            MIN(t.time) AS first_record,
            MAX(t.time) AS last_record
        FROM api.v_timeseries t
        LEFT JOIN api.v_station s ON s.station_id = t.station_id
        LEFT JOIN api.v_basin b ON b.basin_id = s.basin_id
        WHERE t.entity_type = 'stations' AND t.station_id IS NOT NULL
        GROUP BY 1,2,3,4,5,6,7,8
        ORDER BY 3,7,8
    """))).mappings().all()

    for row in station_entity_rows:
        station_id = row["station_id"]
        if station_id not in station_entities:
            station_entities[station_id] = {
                "station_id": station_id,
                "station_code": row["station_code"],
                "station_name": row["station_name"],
                "station_type": row["station_type"],
                "basin_id": row["basin_id"],
                "basin_name": row["basin_name"],
                "total_records": 0,
                "variable_count": 0,
                "source_count": 0,
                "first_record": None,
                "last_record": None,
                "variables": {},
            }

        entity = station_entities[station_id]
        variable_code = row["variable_code"]
        source_code = row["source_code"]
        record_count = int(row["record_count"])
        first_record = _iso(row["first_record"])
        last_record = _iso(row["last_record"])

        entity["variables"].setdefault(variable_code, {"total_records": 0, "sources": {}})
        entity["variables"][variable_code]["total_records"] += record_count
        entity["variables"][variable_code]["sources"][source_code] = {
            "record_count": record_count,
            "first_record": first_record,
            "last_record": last_record,
        }

        entity["total_records"] += record_count
        entity["first_record"] = _earliest(entity["first_record"], first_record)
        entity["last_record"] = _latest(entity["last_record"], last_record)

    for entity in station_entities.values():
        entity["variable_count"] = len(entity["variables"])
        source_codes = set()
        for variable_data in entity["variables"].values():
            source_codes.update(variable_data["sources"].keys())
        entity["source_count"] = len(source_codes)

    # ---- Basin entities detailed availability ----
    basin_entities_base = (await db.execute(text("""
        SELECT
            b.basin_id::text AS basin_id,
            NULLIF(TRIM(b.basin_code), '') AS basin_code,
            COALESCE(NULLIF(TRIM(b.basin_name), ''), b.basin_id::text) AS basin_name,
            b.level
        FROM api.v_basin b
        ORDER BY b.level NULLS LAST, b.basin_name NULLS LAST
    """))).mappings().all()

    basin_entities: Dict[str, Any] = {}
    for row in basin_entities_base:
        basin_entities[row["basin_id"]] = {
            "basin_id": row["basin_id"],
            "basin_code": row["basin_code"],
            "basin_name": row["basin_name"],
            "level": row["level"],
            "total_records": 0,
            "variable_count": 0,
            "source_count": 0,
            "first_record": None,
            "last_record": None,
            "variables": {},
        }

    basin_entity_rows = (await db.execute(text("""
        SELECT
            t.basin_id::text AS basin_id,
            NULLIF(TRIM(b.basin_code), '') AS basin_code,
            COALESCE(NULLIF(TRIM(b.basin_name), ''), t.basin_id::text) AS basin_name,
            b.level,
            t.variable_code,
            t.source_code,
            COUNT(*)::bigint AS record_count,
            MIN(t.time) AS first_record,
            MAX(t.time) AS last_record
        FROM api.v_timeseries t
        LEFT JOIN api.v_basin b ON b.basin_id = t.basin_id
        WHERE t.entity_type = 'basins' AND t.basin_id IS NOT NULL
        GROUP BY 1,2,3,4,5,6
        ORDER BY 3,5,6
    """))).mappings().all()

    for row in basin_entity_rows:
        basin_id = row["basin_id"]
        if basin_id not in basin_entities:
            basin_entities[basin_id] = {
                "basin_id": basin_id,
                "basin_code": row["basin_code"],
                "basin_name": row["basin_name"],
                "level": row["level"],
                "total_records": 0,
                "variable_count": 0,
                "source_count": 0,
                "first_record": None,
                "last_record": None,
                "variables": {},
            }

        entity = basin_entities[basin_id]
        variable_code = row["variable_code"]
        source_code = row["source_code"]
        record_count = int(row["record_count"])
        first_record = _iso(row["first_record"])
        last_record = _iso(row["last_record"])

        entity["variables"].setdefault(variable_code, {"total_records": 0, "sources": {}})
        entity["variables"][variable_code]["total_records"] += record_count
        entity["variables"][variable_code]["sources"][source_code] = {
            "record_count": record_count,
            "first_record": first_record,
            "last_record": last_record,
        }

        entity["total_records"] += record_count
        entity["first_record"] = _earliest(entity["first_record"], first_record)
        entity["last_record"] = _latest(entity["last_record"], last_record)

    for entity in basin_entities.values():
        entity["variable_count"] = len(entity["variables"])
        source_codes = set()
        for variable_data in entity["variables"].values():
            source_codes.update(variable_data["sources"].keys())
        entity["source_count"] = len(source_codes)

    # Build stations structure
    stations: Dict[str, Any] = {}

    # Counts per type from geo.station (to show 60, 16, 37 etc even if no data)
    counts = (await db.execute(text("""
        SELECT COALESCE(station_type, 'unknown') AS station_type, COUNT(*)::int AS c
        FROM geo.station
        GROUP BY 1
        ORDER BY 1
    """))).mappings().all()

    for r in counts:
        stations[r["station_type"]] = {"count": int(r["c"]), "variables": {}}

    for r in station_rows:
        stype = r["station_type"]
        var = r["variable_code"]
        src = r["source_code"]

        stations.setdefault(stype, {"count": 0, "variables": {}})
        stations[stype]["variables"].setdefault(var, {"sources": {}})
        stations[stype]["variables"][var]["sources"][src] = {
            "record_count": int(r["record_count"]),
            "first_record": _iso(r["first_record"]),
            "last_record": _iso(r["last_record"]),
        }

    # Build basins structure
    basins: Dict[str, Any] = {
        "level_0": {"count": int(total_basins), "variables": {}}
    }

    for r in basin_rows:
        var = r["variable_code"]
        src = r["source_code"]
        basins["level_0"]["variables"].setdefault(var, {"sources": {}})
        basins["level_0"]["variables"][var]["sources"][src] = {
            "record_count": int(r["record_count"]),
            "first_record": _iso(r["first_record"]),
            "last_record": _iso(r["last_record"]),
        }

    # Summary
    total_records = sum(int(r["record_count"]) for r in station_rows) + sum(int(r["record_count"]) for r in basin_rows)

    variables = set()
    sources = set()
    for r in station_rows:
        variables.add(r["variable_code"])
        sources.add(r["source_code"])
    for r in basin_rows:
        variables.add(r["variable_code"])
        sources.add(r["source_code"])

    summary = {
        "total_stations": int(total_stations),
        "total_basins": int(total_basins),
        "total_variables": len(variables),
        "total_sources": len(sources),
        "total_records": int(total_records),
        "stations_with_data": sum(1 for e in station_entities.values() if e["total_records"] > 0),
        "basins_with_data": sum(1 for e in basin_entities.values() if e["total_records"] > 0),
        "available_variables": sorted(list(variables)),
        "available_sources": sorted(list(sources)),
    }

    sorted_station_entities = sorted(
        station_entities.values(),
        key=lambda e: ((e["station_name"] or "").lower(), (e["station_code"] or "").lower()),
    )
    sorted_basin_entities = sorted(
        basin_entities.values(),
        key=lambda e: (
            e["level"] if e["level"] is not None else 999,
            (e["basin_name"] or "").lower(),
            (e["basin_code"] or "").lower(),
        ),
    )

    return {
        "stations": stations,
        "basins": basins,
        "station_entities": sorted_station_entities,
        "basin_entities": sorted_basin_entities,
        "summary": summary,
    }
