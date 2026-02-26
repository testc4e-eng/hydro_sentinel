from __future__ import annotations

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

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


@router.get("/data-availability")
async def scan_data_availability(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """
    Scan entities and variables to determine data availability.
    Uses api.v_timeseries with entity_type/entity_id layout.
    """

    total_stations = (await db.execute(text("SELECT COUNT(*) FROM geo.station"))).scalar() or 0
    total_basins = (await db.execute(text("SELECT COUNT(*) FROM geo.basin"))).scalar() or 0

    station_rows = (
        await db.execute(
            text(
                """
                SELECT
                    COALESCE(NULLIF(TRIM(s.station_type), ''), NULLIF(TRIM(t.entity_subtype), ''), 'unknown') AS station_type,
                    t.variable_code,
                    t.source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(t.time) AS first_record,
                    MAX(t.time) AS last_record
                FROM api.v_timeseries t
                LEFT JOIN geo.station s ON s.station_id = t.entity_id
                WHERE t.entity_type IN ('station', 'stations')
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """
            )
        )
    ).mappings().all()

    basin_rows = (
        await db.execute(
            text(
                """
                SELECT
                    'level_0'::text AS basin_group,
                    t.variable_code,
                    t.source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(t.time) AS first_record,
                    MAX(t.time) AS last_record
                FROM api.v_timeseries t
                WHERE t.entity_type IN ('basin', 'basins')
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """
            )
        )
    ).mappings().all()

    variable_time_stats_rows = (
        await db.execute(
            text(
                """
                WITH variable_bounds AS (
                    SELECT
                        t.variable_code,
                        COUNT(*)::bigint AS record_count,
                        (COUNT(DISTINCT t.entity_id) FILTER (
                            WHERE t.entity_type IN ('station', 'stations', 'basin', 'basins')
                        ))::bigint AS entity_count,
                        MIN(t.time) AS first_record,
                        MAX(t.time) AS last_record
                    FROM api.v_timeseries t
                    GROUP BY t.variable_code
                ),
                steps AS (
                    SELECT
                        t.variable_code,
                        EXTRACT(
                            EPOCH FROM (
                                t.time
                                - LAG(t.time) OVER (
                                    PARTITION BY t.variable_code, t.source_code, t.entity_type, t.entity_id
                                    ORDER BY t.time
                                )
                            )
                        )::bigint AS step_seconds
                    FROM api.v_timeseries t
                    WHERE t.entity_id IS NOT NULL
                ),
                step_stats AS (
                    SELECT
                        variable_code,
                        MIN(step_seconds)::bigint AS min_step_seconds,
                        PERCENTILE_DISC(0.5) WITHIN GROUP (ORDER BY step_seconds)::bigint AS median_step_seconds,
                        MAX(step_seconds)::bigint AS max_step_seconds,
                        COUNT(*)::bigint AS interval_count,
                        COUNT(DISTINCT step_seconds)::bigint AS distinct_steps
                    FROM steps
                    WHERE step_seconds IS NOT NULL
                      AND step_seconds > 0
                    GROUP BY variable_code
                )
                SELECT
                    vb.variable_code,
                    vb.record_count,
                    vb.entity_count,
                    vb.first_record,
                    vb.last_record,
                    ss.min_step_seconds,
                    ss.median_step_seconds,
                    ss.max_step_seconds,
                    ss.interval_count,
                    ss.distinct_steps
                FROM variable_bounds vb
                LEFT JOIN step_stats ss ON ss.variable_code = vb.variable_code
                ORDER BY vb.variable_code
                """
            )
        )
    ).mappings().all()

    station_entities_base = (
        await db.execute(
            text(
                """
                SELECT
                    s.station_id::text AS station_id,
                    NULLIF(TRIM(s.code::text), '') AS station_code,
                    COALESCE(NULLIF(TRIM(s.name), ''), s.station_id::text) AS station_name,
                    COALESCE(NULLIF(TRIM(s.station_type), ''), 'unknown') AS station_type,
                    s.basin_id::text AS basin_id,
                    NULLIF(TRIM(b.name), '') AS basin_name
                FROM geo.station s
                LEFT JOIN geo.basin b ON b.basin_id = s.basin_id
                ORDER BY s.name NULLS LAST, s.code NULLS LAST
                """
            )
        )
    ).mappings().all()

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

    station_entity_rows = (
        await db.execute(
            text(
                """
                SELECT
                    t.entity_id::text AS station_id,
                    t.variable_code,
                    t.source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(t.time) AS first_record,
                    MAX(t.time) AS last_record
                FROM api.v_timeseries t
                WHERE t.entity_type IN ('station', 'stations')
                  AND t.entity_id IS NOT NULL
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """
            )
        )
    ).mappings().all()

    for row in station_entity_rows:
        station_id = row["station_id"]
        if station_id not in station_entities:
            station_entities[station_id] = {
                "station_id": station_id,
                "station_code": None,
                "station_name": station_id,
                "station_type": "unknown",
                "basin_id": None,
                "basin_name": None,
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

    basin_entities_base = (
        await db.execute(
            text(
                """
                SELECT
                    b.basin_id::text AS basin_id,
                    NULLIF(TRIM(b.code::text), '') AS basin_code,
                    COALESCE(NULLIF(TRIM(b.name), ''), b.basin_id::text) AS basin_name,
                    b.level
                FROM geo.basin b
                ORDER BY b.level NULLS LAST, b.name NULLS LAST
                """
            )
        )
    ).mappings().all()

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

    basin_entity_rows = (
        await db.execute(
            text(
                """
                SELECT
                    t.entity_id::text AS basin_id,
                    t.variable_code,
                    t.source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(t.time) AS first_record,
                    MAX(t.time) AS last_record
                FROM api.v_timeseries t
                WHERE t.entity_type IN ('basin', 'basins')
                  AND t.entity_id IS NOT NULL
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """
            )
        )
    ).mappings().all()

    for row in basin_entity_rows:
        basin_id = row["basin_id"]
        if basin_id not in basin_entities:
            basin_entities[basin_id] = {
                "basin_id": basin_id,
                "basin_code": None,
                "basin_name": basin_id,
                "level": None,
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

    stations: Dict[str, Any] = {}
    counts = (
        await db.execute(
            text(
                """
                SELECT COALESCE(station_type, 'unknown') AS station_type, COUNT(*)::int AS c
                FROM geo.station
                GROUP BY 1
                ORDER BY 1
                """
            )
        )
    ).mappings().all()

    for row in counts:
        stations[row["station_type"]] = {"count": int(row["c"]), "variables": {}}

    for row in station_rows:
        station_type = row["station_type"]
        variable_code = row["variable_code"]
        source_code = row["source_code"]

        stations.setdefault(station_type, {"count": 0, "variables": {}})
        stations[station_type]["variables"].setdefault(variable_code, {"sources": {}})
        stations[station_type]["variables"][variable_code]["sources"][source_code] = {
            "record_count": int(row["record_count"]),
            "first_record": _iso(row["first_record"]),
            "last_record": _iso(row["last_record"]),
        }

    basins: Dict[str, Any] = {"level_0": {"count": int(total_basins), "variables": {}}}
    for row in basin_rows:
        variable_code = row["variable_code"]
        source_code = row["source_code"]
        basins["level_0"]["variables"].setdefault(variable_code, {"sources": {}})
        basins["level_0"]["variables"][variable_code]["sources"][source_code] = {
            "record_count": int(row["record_count"]),
            "first_record": _iso(row["first_record"]),
            "last_record": _iso(row["last_record"]),
        }

    total_records = sum(int(row["record_count"]) for row in station_rows) + sum(
        int(row["record_count"]) for row in basin_rows
    )

    variables = set()
    sources = set()
    for row in station_rows:
        variables.add(row["variable_code"])
        sources.add(row["source_code"])
    for row in basin_rows:
        variables.add(row["variable_code"])
        sources.add(row["source_code"])

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
        "variable_time_stats": [
            {
                "variable_code": row["variable_code"],
                "record_count": int(row["record_count"]),
                "entity_count": int(row["entity_count"] or 0),
                "first_record": _iso(row["first_record"]),
                "last_record": _iso(row["last_record"]),
                "min_step_seconds": int(row["min_step_seconds"]) if row["min_step_seconds"] is not None else None,
                "median_step_seconds": int(row["median_step_seconds"]) if row["median_step_seconds"] is not None else None,
                "max_step_seconds": int(row["max_step_seconds"]) if row["max_step_seconds"] is not None else None,
                "interval_count": int(row["interval_count"]) if row["interval_count"] is not None else 0,
                "distinct_steps": int(row["distinct_steps"]) if row["distinct_steps"] is not None else 0,
            }
            for row in variable_time_stats_rows
        ],
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


@router.get("/stations-with-data")
async def get_stations_with_data(
    variable_code: Optional[str] = None,
    source_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get stations having data in api.v_timeseries for variable/source filters.
    """

    conditions = ["t.entity_type IN ('station', 'stations')"]
    params: Dict[str, Any] = {}

    if variable_code:
        conditions.append("t.variable_code = :variable_code")
        params["variable_code"] = variable_code

    if source_code:
        conditions.append("t.source_code = :source_code")
        params["source_code"] = source_code

    where_clause = " AND ".join(conditions)

    query = text(
        f"""
        SELECT DISTINCT
            s.station_id,
            s.code,
            s.name,
            s.station_type
        FROM geo.station s
        JOIN api.v_timeseries t ON t.entity_id = s.station_id
        WHERE {where_clause}
        ORDER BY s.name
        """
    )

    rows = (await db.execute(query, params)).fetchall()

    return [
        {
            "id": row[0],
            "code": row[1],
            "name": row[2],
            "type": row[3],
        }
        for row in rows
    ]
