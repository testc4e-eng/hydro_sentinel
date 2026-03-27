from typing import List, Any, Optional
from datetime import datetime, timedelta, timezone
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.exc import DataError, SQLAlchemyError

from app.api import deps
from app.db.session import get_db
from app.models.view_models import TimeseriesView
from app.schemas.measurement import TimeseriesPoint

router = APIRouter()

VARIABLE_CODE_ALIASES = {
    "flow_m3s": ["flow_m3s", "debit_m3s"],
    "debit_m3s": ["debit_m3s", "flow_m3s"],
    # Business fallback:
    # some SIM datasets have inflow_m3s fully NaN while flow_m3s is populated.
    # Keep inflow/apport priority but transparently fall back to flow/debit for charts.
    "inflow_m3s": ["inflow_m3s", "apport_m3s", "flow_m3s", "debit_m3s"],
    "apport_m3s": ["apport_m3s", "inflow_m3s", "flow_m3s", "debit_m3s"],
}


def _normalize_query_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def _is_timescale_missing_chunk_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "_timescaledb_internal" in msg and "not found" in msg


def _expand_variable_aliases(raw_codes: List[str]) -> List[str]:
    expanded: List[str] = []
    seen = set()
    for code in raw_codes:
        normalized = (code or "").strip()
        if not normalized:
            continue
        candidates = VARIABLE_CODE_ALIASES.get(normalized, [normalized])
        for candidate in candidates:
            if candidate not in seen:
                seen.add(candidate)
                expanded.append(candidate)
    return expanded


def _parse_csv_values(value: Optional[str]) -> List[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _normalize_aggregation_mode(value: Optional[str]) -> str:
    mode = (value or "raw").strip().lower()
    if mode in {"raw", "hour", "hourly", "none"}:
        return "raw"
    if mode in {"day", "daily", "journalier", "1d"}:
        return "day"
    raise HTTPException(
        status_code=400,
        detail="Invalid aggregation mode. Allowed values: raw, day",
    )


@router.get("/availability-window")
async def read_availability_window(
    station_id: Optional[str] = None,
    variable_code: Optional[str] = None,
    source_code: Optional[str] = None,
    entity_type: Optional[str] = "stations",
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Return availability bounds (min/max/count) for one entity + variable + source.
    Used by frontend to align displayed period with real available data.
    """
    if not station_id:
        raise HTTPException(status_code=400, detail="station_id is required")
    if not variable_code:
        raise HTTPException(status_code=400, detail="variable_code is required")
    if not source_code:
        raise HTTPException(status_code=400, detail="source_code is required")

    entity_kind = (entity_type or "stations").lower()
    is_basin = entity_kind in {"basin", "basins", "bassin", "bassins"}
    var_list = _expand_variable_aliases([variable_code])

    params: dict[str, Any] = {
        "station_id": station_id,
        "source_code": source_code,
    }

    if is_basin:
        var_placeholders = ",".join([f":var{i}" for i in range(len(var_list))])
        for i, var in enumerate(var_list):
            params[f"var{i}"] = var
        query = text(
            f"""
            SELECT
                COUNT(*)::bigint AS record_count,
                MIN(m.time) AS first_record,
                MAX(m.time) AS last_record
            FROM ts.basin_measurement m
            JOIN ref.variable v ON v.variable_id = m.variable_id
            JOIN ref.source s ON s.source_id = m.source_id
            WHERE m.basin_id = CAST(:station_id AS UUID)
              AND v.code IN ({var_placeholders})
              AND s.code = :source_code
              AND m.value IS NOT NULL
              AND m.value::double precision::text NOT IN ('NaN', 'Infinity', '-Infinity')
            """
        )
    else:
        var_placeholders = ",".join([f":var{i}" for i in range(len(var_list))])
        for i, var in enumerate(var_list):
            params[f"var{i}"] = var
        query = text(
            f"""
            SELECT
                COUNT(*)::bigint AS record_count,
                MIN(time) AS first_record,
                MAX(time) AS last_record
            FROM api.v_timeseries_station
            WHERE station_id = CAST(:station_id AS UUID)
              AND variable_code IN ({var_placeholders})
              AND source_code = :source_code
              AND value IS NOT NULL
              AND value::double precision::text NOT IN ('NaN', 'Infinity', '-Infinity')
            """
        )

    row = (await db.execute(query, params)).mappings().first()
    count = int(row["record_count"]) if row and row["record_count"] is not None else 0
    first_record = row["first_record"] if row else None
    last_record = row["last_record"] if row else None

    return {
        "station_id": station_id,
        "entity_type": "bassins" if is_basin else "stations",
        "variable_code": variable_code,
        "source_code": source_code,
        "count": count,
        "first_record": first_record.isoformat() if first_record else None,
        "last_record": last_record.isoformat() if last_record else None,
    }

@router.get("/timeseries", response_model=List[TimeseriesPoint])
async def read_timeseries(
    station_id: Optional[str] = None,
    station_ids: Optional[str] = None,  # Comma-separated station ids (multi-station mode)
    variables: Optional[str] = None,  # Comma-separated variable codes
    variable_code: Optional[str] = None,  # Single variable (backward compat)
    source_code: Optional[str] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    entity_type: Optional[str] = "stations",
    aggregation: Optional[str] = "raw",
    cumulative: bool = False,
    limit: int = 5000,
    db: AsyncSession = Depends(get_db),
    # current_user = Depends(deps.get_current_user)
) -> Any:
    """
    Retrieve timeseries data.
    Supports stations (api.v_timeseries_station) and basins (ts.basin_measurement).
    Supports multiple variables via 'variables' parameter (comma-separated).
    Supports daily aggregation and cumulative series generation.
    """

    entity_kind = (entity_type or "stations").lower()
    is_basin = entity_kind in {"basin", "basins", "bassin", "bassins"}
    aggregation_mode = _normalize_aggregation_mode(aggregation)
    normalized_start = _normalize_query_datetime(start)
    normalized_end = _normalize_query_datetime(end)
    normalized_limit = max(1, min(int(limit or 5000), 20000))
    selected_ids = _parse_csv_values(station_ids)
    if station_id and station_id not in selected_ids:
        selected_ids.append(station_id)

    params: dict[str, Any] = {}
    conditions: List[str] = []

    if is_basin:
        if selected_ids:
            id_placeholders = ",".join([f"CAST(:sid{i} AS UUID)" for i in range(len(selected_ids))])
            conditions.append(f"m.basin_id IN ({id_placeholders})")
            for i, sid in enumerate(selected_ids):
                params[f"sid{i}"] = sid

        if variables:
            var_list = _expand_variable_aliases([v.strip() for v in variables.split(",") if v.strip()])
            placeholders = ",".join([f":var{i}" for i in range(len(var_list))])
            if var_list:
                conditions.append(f"v.code IN ({placeholders})")
                for i, var in enumerate(var_list):
                    params[f"var{i}"] = var
        elif variable_code:
            var_list = _expand_variable_aliases([variable_code])
            placeholders = ",".join([f":var{i}" for i in range(len(var_list))])
            if var_list:
                conditions.append(f"v.code IN ({placeholders})")
                for i, var in enumerate(var_list):
                    params[f"var{i}"] = var

        if source_code:
            conditions.append("s.code = :source_code")
            params["source_code"] = source_code

        if normalized_start:
            conditions.append("m.time >= :start")
            params["start"] = normalized_start

        if normalized_end:
            conditions.append("m.time <= :end")
            params["end"] = normalized_end

        conditions.append("m.value IS NOT NULL")
        conditions.append("m.value::double precision::text NOT IN ('NaN', 'Infinity', '-Infinity')")
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        base_select_sql = f"""
            SELECT
                m.basin_id::text AS station_id,
                v.code AS variable_code,
                s.code AS source_code,
                m.time AS time,
                m.value::double precision AS value
            FROM ts.basin_measurement m
            JOIN ref.variable v ON m.variable_id = v.variable_id
            JOIN ref.source s ON m.source_id = s.source_id
            WHERE {where_clause}
        """
    else:
        if selected_ids:
            id_placeholders = ",".join([f":sid{i}" for i in range(len(selected_ids))])
            conditions.append(f"station_id IN ({id_placeholders})")
            for i, sid in enumerate(selected_ids):
                params[f"sid{i}"] = sid

        if variables:
            var_list = _expand_variable_aliases([v.strip() for v in variables.split(",") if v.strip()])
            placeholders = ",".join([f":var{i}" for i in range(len(var_list))])
            if var_list:
                conditions.append(f"variable_code IN ({placeholders})")
                for i, var in enumerate(var_list):
                    params[f"var{i}"] = var
        elif variable_code:
            var_list = _expand_variable_aliases([variable_code])
            placeholders = ",".join([f":var{i}" for i in range(len(var_list))])
            if var_list:
                conditions.append(f"variable_code IN ({placeholders})")
                for i, var in enumerate(var_list):
                    params[f"var{i}"] = var

        if source_code:
            conditions.append("source_code = :source_code")
            params["source_code"] = source_code

        if normalized_start:
            conditions.append("time >= :start")
            params["start"] = normalized_start

        if normalized_end:
            conditions.append("time <= :end")
            params["end"] = normalized_end

        conditions.append("value IS NOT NULL")
        conditions.append("value::double precision::text NOT IN ('NaN', 'Infinity', '-Infinity')")
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        base_select_sql = f"""
            SELECT
                station_id::text AS station_id,
                variable_code,
                source_code,
                time,
                value::double precision AS value
            FROM api.v_timeseries_station
            WHERE {where_clause}
        """

    params["limit"] = normalized_limit

    if aggregation_mode == "day":
        aggregated_sql = """
        aggregated AS (
            SELECT
                station_id,
                variable_code,
                source_code,
                date_trunc('day', time) AS time,
                SUM(value)::double precision AS value
            FROM base
            GROUP BY station_id, variable_code, source_code, date_trunc('day', time)
        )
        """
    else:
        aggregated_sql = """
        aggregated AS (
            SELECT
                station_id,
                variable_code,
                source_code,
                time,
                value::double precision AS value
            FROM base
        )
        """

    value_expr = (
        "SUM(value) OVER (PARTITION BY station_id, variable_code, source_code ORDER BY time ASC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)"
        if cumulative
        else "value"
    )
    query = text(
        f"""
        WITH base AS (
            {base_select_sql}
        ),
        {aggregated_sql},
        computed AS (
            SELECT
                station_id,
                variable_code,
                source_code,
                time,
                {value_expr} AS value
            FROM aggregated
        ),
        limited AS (
            SELECT
                station_id,
                variable_code,
                source_code,
                time,
                value
            FROM computed
            ORDER BY time DESC
            LIMIT :limit
        )
        SELECT
            station_id,
            variable_code,
            source_code,
            time,
            value
        FROM limited
        ORDER BY time ASC
        """
    )

    try:
        result = await db.execute(query, params)
    except DataError as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid date range format for this dataset. Use ISO timestamps without timezone offset.",
        ) from exc
    except SQLAlchemyError as exc:
        if _is_timescale_missing_chunk_error(exc):
            # Degrade gracefully when Timescale metadata is inconsistent.
            return []
        raise HTTPException(status_code=500, detail=f"Failed to fetch timeseries: {exc}") from exc
    rows = result.fetchall()
    
    points: List[TimeseriesPoint] = []
    for row in rows:
        raw_value = row[4]
        if raw_value is None:
            continue
        try:
            value = float(raw_value)
        except (TypeError, ValueError):
            continue
        if not math.isfinite(value):
            continue
        points.append(
            TimeseriesPoint(
                station_id=row[0],
                variable_code=row[1],
                source_code=row[2],
                time=row[3],
                value=value,
                unit=None,  # unit not available in view
            )
        )
    return points

@router.get("/window/24h", response_model=List[TimeseriesPoint])
async def read_window_24h(
    station_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Retrieve optimized 24h window (mocking api.v_window_station_24h_fast).
    For prototype, we just query TimeseriesView with a 24h filter or similar logic.
    """
    # In real Prod, this would query a dedicated materialized view
    # Here we simulate by querying the standard view for last 24h
    now = datetime.now()
    start_24h = now - timedelta(hours=24)
    
    query = select(TimeseriesView).where(TimeseriesView.time >= start_24h)
    
    if station_id:
        query = query.where(TimeseriesView.station_id == station_id)
        
    result = await db.execute(query.limit(1000))
    return result.scalars().all()
@router.get("/compare")
async def get_compare(
    station_id: str,
    variable_code: Optional[str] = None,
    sources: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get timeseries data grouped by source for the comparison chart.
    """
    from sqlalchemy import text
    
    source_list = [s.strip() for s in sources.split(',')] if sources else ["OBS", "AROME"]
    variable_list = _expand_variable_aliases([variable_code or "precip_mm"])
    
    # Build query
    source_placeholders = ','.join([f":source{i}" for i in range(len(source_list))])
    variable_placeholders = ','.join([f":variable{i}" for i in range(len(variable_list))])
    params = {"station_id": station_id}
    for i, src in enumerate(source_list):
        params[f"source{i}"] = src
    for i, var_code in enumerate(variable_list):
        params[f"variable{i}"] = var_code
        
    query = text(f"""
        SELECT 
            source_code,
            time as t,
            value as y
        FROM api.v_timeseries_station
        WHERE station_id = :station_id 
          AND variable_code IN ({variable_placeholders})
          AND source_code IN ({source_placeholders})
        ORDER BY time ASC
    """)
    
    result = await db.execute(query, params)
    rows = result.fetchall()
    
    # Group by source
    grouped = {}
    for row in rows:
        source = row[0]  # source_code
        time_val = row[1]  # time as t
        y_val = row[2]  # value as y
        
        if source not in grouped:
            grouped[source] = []
        
        # Convert datetime to ISO format string
        time_str = time_val.isoformat() if hasattr(time_val, 'isoformat') else str(time_val)
        grouped[source].append({"t": time_str, "y": float(y_val) if y_val is not None else None})
        
    return {
        "station_id": station_id,
        "variable": variable_code,
        "sources": grouped
    }

@router.get("/runs")
async def get_runs(
    source_code: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get available runs for a source.
    """
    from sqlalchemy import text
    
    query_str = "SELECT DISTINCT run_time as id, run_time as label FROM api.v_timeseries_station"
    params = {}
    if source_code:
        query_str += " WHERE source_code = :source"
        params["source"] = source_code
    query_str += " ORDER BY run_time DESC LIMIT 50"
    
    result = await db.execute(text(query_str), params)
    rows = result.fetchall()
    
    return [
        {"id": str(row.id), "label": row.label.isoformat() if row.label else "N/A"}
        for row in rows if row.id
    ]
