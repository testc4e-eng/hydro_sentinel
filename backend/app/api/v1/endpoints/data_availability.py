from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.engine.url import make_url
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.exc import SQLAlchemyError
from uuid import UUID

from app.db.session import get_db

router = APIRouter()

DEFAULT_QUERY_TIMEOUT_SECONDS = 8.0


class ConnectionTestRequest(BaseModel):
    database_url: str


def _normalize_postgres_async_url(raw_url: str) -> str:
    value = (raw_url or "").strip().strip("'\"")
    if value.startswith("psql "):
        value = value[5:].strip()
    if value.startswith("postgresql+asyncpg://"):
        return value
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+asyncpg://", 1)
    return value


@router.post("/test-connection")
async def test_connection(payload: ConnectionTestRequest) -> Dict[str, Any]:
    """
    Test a PostgreSQL connection URL without changing runtime settings.
    Returns a compact diagnostic payload for the Settings page.
    """
    db_url = _normalize_postgres_async_url(payload.database_url)
    if not db_url:
        return {"success": False, "message": "URL de connexion vide."}

    try:
        parsed = make_url(db_url)
        if not (parsed.drivername or "").startswith("postgresql"):
            return {
                "success": False,
                "message": "URL invalide: seul PostgreSQL est supporté ici.",
            }
    except Exception:
        return {"success": False, "message": "Format d'URL invalide."}

    engine = create_async_engine(
        db_url,
        echo=False,
        pool_pre_ping=True,
        connect_args={"timeout": 5, "command_timeout": 10},
    )

    try:
        async with engine.connect() as conn:
            version_res = await asyncio.wait_for(
                conn.execute(text("SELECT version()")),
                timeout=8,
            )
            db_version = version_res.scalar() or "unknown"

            schemas_res = await asyncio.wait_for(
                conn.execute(
                    text(
                        """
                        SELECT schema_name
                        FROM information_schema.schemata
                        ORDER BY schema_name
                        LIMIT 30
                        """
                    )
                ),
                timeout=8,
            )
            schemas = [row[0] for row in schemas_res.fetchall()]

            views_res = await asyncio.wait_for(
                conn.execute(
                    text(
                        """
                        SELECT schemaname || '.' || viewname AS full_view
                        FROM pg_views
                        WHERE schemaname IN ('api', 'geo', 'ref', 'ts')
                        ORDER BY schemaname, viewname
                        LIMIT 10
                        """
                    )
                ),
                timeout=8,
            )
            sample_views = [row[0] for row in views_res.fetchall()]

        return {
            "success": True,
            "message": "Connexion PostgreSQL réussie.",
            "details": {
                "database_version": db_version,
                "schemas_found": schemas,
                "sample_views": sample_views,
            },
        }
    except asyncio.TimeoutError:
        return {
            "success": False,
            "message": "Timeout: le serveur PostgreSQL ne répond pas à temps.",
        }
    except Exception as exc:
        return {
            "success": False,
            "message": f"{type(exc).__name__}: {str(exc)}",
        }
    finally:
        await engine.dispose()


def _is_timescale_missing_chunk_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "_timescaledb_internal" in msg and "not found" in msg


async def _safe_query_mappings(
    db: AsyncSession,
    query: str,
    params: Optional[Dict[str, Any]] = None,
    *,
    timeout_seconds: float = DEFAULT_QUERY_TIMEOUT_SECONDS,
    warnings: Optional[list[str]] = None,
    label: str = "query",
) -> list[Dict[str, Any]]:
    try:
        result = await asyncio.wait_for(
            db.execute(text(query), params or {}),
            timeout=timeout_seconds,
        )
        return result.mappings().all()
    except asyncio.TimeoutError:
        if warnings is not None:
            warnings.append(f"{label}: timeout")
        await db.rollback()
        return []
    except SQLAlchemyError as exc:
        if _is_timescale_missing_chunk_error(exc):
            if warnings is not None:
                warnings.append(f"{label}: timescale_missing_chunk")
            await db.rollback()
            return []
        if warnings is not None:
            warnings.append(f"{label}: {type(exc).__name__}")
            await db.rollback()
            return []
        raise


async def _safe_query_scalar(
    db: AsyncSession,
    query: str,
    params: Optional[Dict[str, Any]] = None,
    *,
    timeout_seconds: float = DEFAULT_QUERY_TIMEOUT_SECONDS,
    default: int = 0,
    warnings: Optional[list[str]] = None,
    label: str = "scalar_query",
) -> int:
    try:
        result = await asyncio.wait_for(
            db.execute(text(query), params or {}),
            timeout=timeout_seconds,
        )
        return int(result.scalar() or default)
    except asyncio.TimeoutError:
        if warnings is not None:
            warnings.append(f"{label}: timeout")
        await db.rollback()
        return default
    except SQLAlchemyError as exc:
        if _is_timescale_missing_chunk_error(exc):
            if warnings is not None:
                warnings.append(f"{label}: timescale_missing_chunk")
            await db.rollback()
            return default
        if warnings is not None:
            warnings.append(f"{label}: {type(exc).__name__}")
            await db.rollback()
            return default
        raise


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
async def scan_data_availability(
    include_time_stats: bool = False,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Scan entities and variables to determine data availability.
    Uses api.v_timeseries_station (stations) and ts.basin_measurement (basins).
    """

    scan_warnings: list[str] = []

    total_stations = await _safe_query_scalar(
        db,
        "SELECT COUNT(*) FROM geo.station",
        warnings=scan_warnings,
        label="total_stations",
    )
    total_basins = await _safe_query_scalar(
        db,
        "SELECT COUNT(*) FROM geo.basin",
        warnings=scan_warnings,
        label="total_basins",
    )
    stations_with_data_count = await _safe_query_scalar(
        db,
        "SELECT COUNT(DISTINCT station_id) FROM api.v_timeseries_station",
        warnings=scan_warnings,
        label="stations_with_data",
    )
    basins_with_data_count = await _safe_query_scalar(
        db,
        "SELECT COUNT(DISTINCT basin_id) FROM ts.basin_measurement",
        warnings=scan_warnings,
        label="basins_with_data",
    )

    station_rows = await _safe_query_mappings(
        db,
        """
                SELECT
                    COALESCE(NULLIF(TRIM(s.station_type), ''), 'unknown') AS station_type,
                    t.variable_code,
                    t.source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(t.time) AS first_record,
                    MAX(t.time) AS last_record
                FROM api.v_timeseries_station t
                LEFT JOIN geo.station s ON s.station_id = t.station_id
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """,
        warnings=scan_warnings,
        label="station_rows",
    )

    basin_rows = await _safe_query_mappings(
        db,
        """
                SELECT
                    'level_0'::text AS basin_group,
                    v.code AS variable_code,
                    s.code AS source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(m.time) AS first_record,
                    MAX(m.time) AS last_record
                FROM ts.basin_measurement m
                JOIN ref.variable v ON v.variable_id = m.variable_id
                JOIN ref.source s ON s.source_id = m.source_id
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """,
        warnings=scan_warnings,
        label="basin_rows",
    )

    variable_time_stats_rows: list[Dict[str, Any]] = []
    if include_time_stats:
        variable_time_stats_rows = await _safe_query_mappings(
            db,
            """
                WITH all_timeseries AS (
                    SELECT
                        'stations'::text AS entity_type,
                        t.station_id::text AS entity_id,
                        t.variable_code,
                        t.source_code,
                        t.time
                    FROM api.v_timeseries_station t
                    WHERE t.station_id IS NOT NULL

                    UNION ALL

                    SELECT
                        'basins'::text AS entity_type,
                        m.basin_id::text AS entity_id,
                        v.code AS variable_code,
                        s.code AS source_code,
                        m.time
                    FROM ts.basin_measurement m
                    JOIN ref.variable v ON v.variable_id = m.variable_id
                    JOIN ref.source s ON s.source_id = m.source_id
                    WHERE m.basin_id IS NOT NULL
                ),
                variable_bounds AS (
                    SELECT
                        t.variable_code,
                        COUNT(*)::bigint AS record_count,
                        COUNT(DISTINCT t.entity_type || ':' || t.entity_id)::bigint AS entity_count,
                        MIN(t.time) AS first_record,
                        MAX(t.time) AS last_record
                    FROM all_timeseries t
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
                    FROM all_timeseries t
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
                """,
            timeout_seconds=12.0,
            warnings=scan_warnings,
            label="variable_time_stats",
        )

    station_entities_base = await _safe_query_mappings(
        db,
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
        ,
        warnings=scan_warnings,
        label="station_entities_base",
    )

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

    station_entity_rows = await _safe_query_mappings(
        db,
        """
                SELECT
                    t.station_id::text AS station_id,
                    t.variable_code,
                    t.source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(t.time) AS first_record,
                    MAX(t.time) AS last_record
                FROM api.v_timeseries_station t
                WHERE t.station_id IS NOT NULL
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """,
        warnings=scan_warnings,
        label="station_entity_rows",
    )

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

    basin_entities_base = await _safe_query_mappings(
        db,
        """
                SELECT
                    b.basin_id::text AS basin_id,
                    NULLIF(TRIM(b.code::text), '') AS basin_code,
                    COALESCE(NULLIF(TRIM(b.name), ''), b.basin_id::text) AS basin_name,
                    b.level
                FROM geo.basin b
                ORDER BY b.level NULLS LAST, b.name NULLS LAST
                """
        ,
        warnings=scan_warnings,
        label="basin_entities_base",
    )

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

    basin_entity_rows = await _safe_query_mappings(
        db,
        """
                SELECT
                    m.basin_id::text AS basin_id,
                    v.code AS variable_code,
                    s.code AS source_code,
                    COUNT(*)::bigint AS record_count,
                    MIN(m.time) AS first_record,
                    MAX(m.time) AS last_record
                FROM ts.basin_measurement m
                JOIN ref.variable v ON v.variable_id = m.variable_id
                JOIN ref.source s ON s.source_id = m.source_id
                WHERE m.basin_id IS NOT NULL
                GROUP BY 1,2,3
                ORDER BY 1,2,3
                """,
        warnings=scan_warnings,
        label="basin_entity_rows",
    )

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
    counts = await _safe_query_mappings(
        db,
        """
                SELECT COALESCE(station_type, 'unknown') AS station_type, COUNT(*)::int AS c
                FROM geo.station
                GROUP BY 1
                ORDER BY 1
                """
        ,
        warnings=scan_warnings,
        label="station_type_counts",
    )

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
        "stations_with_data": int(stations_with_data_count),
        "basins_with_data": int(basins_with_data_count),
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
        "partial_scan": len(scan_warnings) > 0,
        "scan_warnings": scan_warnings,
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


@router.get("/data-availability/basins/apports-recap")
async def basins_apports_recap(
    shape: str = "ABH",
    source: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Recap des apports base sur flow_m3s:
    - apport_horaire_mm3 = flow_m3s * 3600 / 1_000_000
    - apport_journalier_mm3 = somme des apports horaires du dernier jour disponible
    - cumul_apport_mm3 = somme cumulative sur toute la serie disponible
    """
    normalized_shape = (shape or "ABH").strip().upper()
    if normalized_shape not in {"ABH", "DGM"}:
        raise HTTPException(status_code=400, detail="shape must be ABH or DGM")

    normalized_source = (source or "").strip().upper() or None

    shape_condition = (
        "COALESCE(b.code, '') ~* '^dgm[-_ ]*'"
        if normalized_shape == "DGM"
        else "COALESCE(b.code, '') !~* '^dgm[-_ ]*'"
    )

    source_filter_sql = ""
    params: Dict[str, Any] = {}
    if normalized_source:
        source_filter_sql = "AND src.code = :source_code"
        params["source_code"] = normalized_source

    query = text(
        f"""
        WITH flow_raw AS (
            SELECT
                bm.basin_id::text AS basin_id,
                COALESCE(NULLIF(TRIM(b.name), ''), bm.basin_id::text) AS basin_name,
                NULLIF(TRIM(b.code::text), '') AS basin_code,
                bm.time AS time,
                src.code AS source_code,
                bm.value::double precision AS flow_m3s,
                CASE
                    WHEN src.code = 'SIM' THEN 1
                    WHEN src.code = 'AROME' THEN 2
                    WHEN src.code = 'ECMWF' THEN 3
                    WHEN src.code = 'OBS' THEN 4
                    ELSE 99
                END AS source_rank
            FROM ts.basin_measurement bm
            JOIN geo.basin b ON b.basin_id = bm.basin_id
            JOIN ref.variable v ON v.variable_id = bm.variable_id
            JOIN ref.source src ON src.source_id = bm.source_id
            WHERE v.code = 'flow_m3s'
              AND {shape_condition}
              {source_filter_sql}
        ),
        flow_dedup AS (
            SELECT basin_id, basin_name, basin_code, time, flow_m3s
            FROM (
                SELECT
                    fr.*,
                    row_number() OVER (
                        PARTITION BY fr.basin_id, fr.time
                        ORDER BY fr.source_rank
                    ) AS rn
                FROM flow_raw fr
            ) ranked
            WHERE ranked.rn = 1
        ),
        per_row AS (
            SELECT
                fd.basin_id,
                fd.basin_name,
                fd.basin_code,
                fd.time,
                date_trunc('day', fd.time)::date AS jour,
                (fd.flow_m3s * 3600.0 / 1000000.0) AS apport_horaire_mm3
            FROM flow_dedup fd
        ),
        latest_day AS (
            SELECT basin_id, MAX(jour) AS latest_jour
            FROM per_row
            GROUP BY basin_id
        ),
        latest_point AS (
            SELECT DISTINCT ON (pr.basin_id)
                pr.basin_id,
                pr.apport_horaire_mm3 AS dernier_apport_horaire_mm3,
                pr.time AS dernier_timestamp
            FROM per_row pr
            ORDER BY pr.basin_id, pr.time DESC
        ),
        cumuls AS (
            SELECT
                pr.basin_id,
                SUM(pr.apport_horaire_mm3) AS cumul_apport_mm3
            FROM per_row pr
            GROUP BY pr.basin_id
        ),
        journaliers AS (
            SELECT
                pr.basin_id,
                SUM(pr.apport_horaire_mm3) AS apport_journalier_mm3
            FROM per_row pr
            JOIN latest_day ld
              ON ld.basin_id = pr.basin_id
             AND ld.latest_jour = pr.jour
            GROUP BY pr.basin_id
        )
        SELECT
            p.basin_id,
            MIN(p.basin_name) AS basin_name,
            MIN(p.basin_code) AS basin_code,
            j.apport_journalier_mm3,
            c.cumul_apport_mm3,
            lp.dernier_apport_horaire_mm3,
            lp.dernier_timestamp
        FROM per_row p
        JOIN journaliers j ON j.basin_id = p.basin_id
        JOIN cumuls c ON c.basin_id = p.basin_id
        JOIN latest_point lp ON lp.basin_id = p.basin_id
        GROUP BY p.basin_id, j.apport_journalier_mm3, c.cumul_apport_mm3, lp.dernier_apport_horaire_mm3, lp.dernier_timestamp
        ORDER BY MIN(p.basin_name) ASC
        """
    )

    try:
        rows = (await db.execute(query, params)).mappings().all()
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=500, detail=f"Erreur SQL: {type(exc).__name__} - {str(exc)}") from exc

    return {
        "shape": normalized_shape,
        "source": normalized_source or "AUTO",
        "rows": [
            {
                "basin_id": row["basin_id"],
                "basin_name": row["basin_name"],
                "basin_code": row["basin_code"],
                "apport_journalier_mm3": row["apport_journalier_mm3"],
                "cumul_apport_mm3": row["cumul_apport_mm3"],
                "dernier_apport_horaire_mm3": row["dernier_apport_horaire_mm3"],
                "dernier_timestamp": row["dernier_timestamp"].isoformat() if row["dernier_timestamp"] else None,
            }
            for row in rows
        ],
    }


@router.get("/stations-with-data")
async def get_stations_with_data(
    variable_code: Optional[str] = None,
    source_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get stations having data in api.v_timeseries_station for variable/source filters.
    """

    conditions = ["1=1"]
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
        JOIN api.v_timeseries_station t ON t.station_id = s.station_id
        WHERE {where_clause}
        ORDER BY s.name
        """
    )

    try:
        rows = (await db.execute(query, params)).fetchall()
    except SQLAlchemyError as exc:
        if _is_timescale_missing_chunk_error(exc):
            return []
        raise

    return [
        {
            "id": row[0],
            "code": row[1],
            "name": row[2],
            "type": row[3],
        }
        for row in rows
    ]


@router.delete("/data-availability/stations/{station_id}/variables/{variable_code}/sources/{source_code}")
async def delete_station_source_series(
    station_id: str,
    variable_code: str,
    source_code: str,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Delete all station measurements for one variable/source pair.
    Used by the data availability scanner detail table.
    """
    try:
        safe_station_id = str(UUID(station_id))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="station_id invalide (UUID attendu).") from exc

    normalized_variable = (variable_code or "").strip()
    normalized_source = (source_code or "").strip().upper()

    if not normalized_variable:
        raise HTTPException(status_code=400, detail="variable_code est obligatoire.")
    if not normalized_source:
        raise HTTPException(status_code=400, detail="source_code est obligatoire.")

    try:
        variable_res = await db.execute(
            text("SELECT variable_id FROM ref.variable WHERE code = :code"),
            {"code": normalized_variable},
        )
        variable_row = variable_res.first()
        if not variable_row:
            raise HTTPException(status_code=404, detail=f"Variable '{normalized_variable}' introuvable.")

        source_res = await db.execute(
            text("SELECT source_id FROM ref.source WHERE UPPER(code) = :code"),
            {"code": normalized_source},
        )
        source_row = source_res.first()
        if not source_row:
            raise HTTPException(status_code=404, detail=f"Source '{normalized_source}' introuvable.")

        delete_result = await db.execute(
            text(
                """
                DELETE FROM ts.measurement
                WHERE station_id = CAST(:station_id AS UUID)
                  AND variable_id = :variable_id
                  AND source_id = :source_id
                """
            ),
            {
                "station_id": safe_station_id,
                "variable_id": variable_row[0],
                "source_id": source_row[0],
            },
        )
        deleted_count = int(delete_result.rowcount or 0)

        if deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail=(
                    "Aucune donnée trouvée pour cette combinaison station/variable/source."
                ),
            )

        await db.commit()
        return {
            "status": "success",
            "station_id": safe_station_id,
            "variable_code": normalized_variable,
            "source_code": normalized_source,
            "deleted_count": deleted_count,
        }
    except HTTPException:
        await db.rollback()
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur SQL: {type(exc).__name__}") from exc


@router.delete("/data-availability/basins/{basin_id}/variables/{variable_code}/sources/{source_code}")
async def delete_basin_source_series(
    basin_id: str,
    variable_code: str,
    source_code: str,
    start_time: Optional[str] = None,
    end_time: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Delete basin measurements for one variable/source pair.
    Optional start_time/end_time can narrow deletion to the exact period shown in scanner.
    """
    normalized_basin_id = (basin_id or "").strip()
    normalized_variable = (variable_code or "").strip()
    normalized_source = (source_code or "").strip().upper()

    if not normalized_basin_id:
        raise HTTPException(status_code=400, detail="basin_id est obligatoire.")
    if not normalized_variable:
        raise HTTPException(status_code=400, detail="variable_code est obligatoire.")
    if not normalized_source:
        raise HTTPException(status_code=400, detail="source_code est obligatoire.")

    try:
        variable_res = await db.execute(
            text("SELECT variable_id FROM ref.variable WHERE code = :code"),
            {"code": normalized_variable},
        )
        variable_row = variable_res.first()
        if not variable_row:
            raise HTTPException(status_code=404, detail=f"Variable '{normalized_variable}' introuvable.")

        source_res = await db.execute(
            text("SELECT source_id FROM ref.source WHERE UPPER(code) = :code"),
            {"code": normalized_source},
        )
        source_row = source_res.first()
        if not source_row:
            raise HTTPException(status_code=404, detail=f"Source '{normalized_source}' introuvable.")

        where_clauses = [
            "basin_id::text = :basin_id",
            "variable_id = :variable_id",
            "source_id = :source_id",
        ]
        params: Dict[str, Any] = {
            "basin_id": normalized_basin_id,
            "variable_id": variable_row[0],
            "source_id": source_row[0],
        }
        if start_time:
            where_clauses.append("time::timestamptz >= CAST(:start_time AS timestamptz)")
            params["start_time"] = start_time
        if end_time:
            where_clauses.append("time::timestamptz <= CAST(:end_time AS timestamptz)")
            params["end_time"] = end_time

        delete_sql = f"""
                DELETE FROM ts.basin_measurement
                WHERE {' AND '.join(where_clauses)}
                """
        delete_result = await db.execute(text(delete_sql), params)
        deleted_count = int(delete_result.rowcount or 0)

        if deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="Aucune donnee trouvee pour cette combinaison bassin/variable/source/periode.",
            )

        await db.commit()
        return {
            "status": "success",
            "basin_id": normalized_basin_id,
            "variable_code": normalized_variable,
            "source_code": normalized_source,
            "start_time": start_time,
            "end_time": end_time,
            "deleted_count": deleted_count,
        }
    except HTTPException:
        await db.rollback()
        raise
    except SQLAlchemyError as exc:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Erreur SQL: {type(exc).__name__} - {str(exc)}") from exc
