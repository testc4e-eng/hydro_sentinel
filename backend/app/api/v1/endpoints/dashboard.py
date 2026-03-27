from typing import List, Any
import math
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from app.api import deps
from app.db.session import get_db
from app.models.view_models import MapKPIView, TopCriticalView
from app.schemas.measurement import MapKPIItem, TopCriticalItem

router = APIRouter()


def _finite_or_none(value: Any) -> Any:
    """Convert NaN/Inf to None so FastAPI JSON serialization never fails."""
    if value is None:
        return None
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    try:
        num = float(value)
    except (TypeError, ValueError):
        return value
    return value if math.isfinite(num) else None

@router.get("/map/points-kpi", response_model=List[MapKPIItem])
async def read_map_points_kpi(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get all stations with KPI for map display (api.v_map_points_kpi).
    """
    # Using raw SQL to ensure correct column mapping and geometry extraction
    from sqlalchemy import text
    import json
    
    query = text("""
        WITH latest_precip AS (
            SELECT
                m.station_id,
                MAX(m.time) AS tmax
            FROM ts.measurement m
            JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'precip_mm'
            JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code = 'OBS'
            GROUP BY m.station_id
        ),
        precip_24h AS (
            SELECT
                l.station_id,
                SUM(m.value)::double precision AS precip_cum_24h_mm
            FROM latest_precip l
            JOIN ts.measurement m
              ON m.station_id = l.station_id
             AND m.time > l.tmax - INTERVAL '24 hours'
             AND m.time <= l.tmax
            JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'precip_mm'
            JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code = 'OBS'
            GROUP BY l.station_id
        ),
        latest_basin_precip AS (
            SELECT
                q.basin_id,
                MAX(q.value) FILTER (WHERE q.source_code = 'OBS')::double precision AS basin_precip_obs_mm,
                MAX(q.time) FILTER (WHERE q.source_code = 'OBS') AS basin_precip_obs_time,
                MAX(q.value) FILTER (WHERE q.source_code = 'AROME')::double precision AS basin_precip_arome_mm,
                MAX(q.time) FILTER (WHERE q.source_code = 'AROME') AS basin_precip_arome_time,
                MAX(q.value) FILTER (WHERE q.source_code = 'ECMWF')::double precision AS basin_precip_ecmwf_mm,
                MAX(q.time) FILTER (WHERE q.source_code = 'ECMWF') AS basin_precip_ecmwf_time
            FROM (
                SELECT
                    m.basin_id,
                    rs.code AS source_code,
                    m.value,
                    m.time,
                    ROW_NUMBER() OVER (PARTITION BY m.basin_id, rs.code ORDER BY m.time DESC) AS rn
                FROM ts.basin_measurement m
                JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'precip_mm'
                JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code IN ('OBS', 'AROME', 'ECMWF')
            ) q
            WHERE q.rn = 1
            GROUP BY q.basin_id
        ),
        latest_basin_obs AS (
            SELECT
                m.basin_id,
                MAX(m.time) AS tmax
            FROM ts.basin_measurement m
            JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'precip_mm'
            JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code = 'OBS'
            GROUP BY m.basin_id
        ),
        basin_precip_24h AS (
            SELECT
                l.basin_id,
                SUM(m.value)::double precision AS basin_precip_cum_24h_mm
            FROM latest_basin_obs l
            JOIN ts.basin_measurement m
              ON m.basin_id = l.basin_id
             AND m.time > l.tmax - INTERVAL '24 hours'
             AND m.time <= l.tmax
            JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'precip_mm'
            JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code = 'OBS'
            GROUP BY l.basin_id
        ),
        latest_station_precip_forecast AS (
            SELECT
                q.station_id,
                MAX(q.value) FILTER (WHERE q.source_code = 'AROME')::double precision AS station_precip_arome_mm,
                MAX(q.time) FILTER (WHERE q.source_code = 'AROME') AS station_precip_arome_time,
                MAX(q.value) FILTER (WHERE q.source_code = 'ECMWF')::double precision AS station_precip_ecmwf_mm,
                MAX(q.time) FILTER (WHERE q.source_code = 'ECMWF') AS station_precip_ecmwf_time
            FROM (
                SELECT
                    m.station_id,
                    rs.code AS source_code,
                    m.value,
                    m.time,
                    ROW_NUMBER() OVER (PARTITION BY m.station_id, rs.code ORDER BY m.time DESC) AS rn
                FROM ts.measurement m
                JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'precip_mm'
                JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code IN ('AROME', 'ECMWF')
            ) q
            WHERE q.rn = 1
            GROUP BY q.station_id
        ),
        latest_flow AS (
            SELECT
                q.station_id,
                q.value::double precision AS debit_obs_m3s,
                q.time AS debit_obs_time
            FROM (
                SELECT
                    m.station_id,
                    m.value,
                    m.time,
                    ROW_NUMBER() OVER (PARTITION BY m.station_id ORDER BY m.time DESC) AS rn
                FROM ts.measurement m
                JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'flow_m3s'
                JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code = 'OBS'
            ) q
            WHERE q.rn = 1
        ),
        flow_24h AS (
            SELECT
                l.station_id,
                MAX(m.value)::double precision AS debit_max_24h_m3s
            FROM latest_flow l
            JOIN ts.measurement m
              ON m.station_id = l.station_id
             AND m.time > l.debit_obs_time - INTERVAL '24 hours'
             AND m.time <= l.debit_obs_time
            JOIN ref.variable rv ON rv.variable_id = m.variable_id AND rv.code = 'flow_m3s'
            JOIN ref.source rs ON rs.source_id = m.source_id AND rs.code = 'OBS'
            GROUP BY l.station_id
        )
        SELECT 
            v.station_id,
            v.station_code,
            v.station_name,
            v.station_type,
            v.basin_id,
            v.basin_code,
            v.basin_name,
            v.is_active,
            v.geometry,
            v.severity,
            v.score,
            v.kpi_source,
            v.kpi_run_time,
            COALESCE(v.precip_obs_mm, bp.basin_precip_obs_mm) AS precip_obs_mm,
            COALESCE(v.precip_obs_time, bp.basin_precip_obs_time) AS precip_obs_time,
            COALESCE(v.precip_arome_mm, sf.station_precip_arome_mm, bp.basin_precip_arome_mm) AS precip_arome_mm,
            COALESCE(sf.station_precip_ecmwf_mm, bp.basin_precip_ecmwf_mm) AS precip_ecmwf_mm,
            COALESCE(sf.station_precip_ecmwf_time, bp.basin_precip_ecmwf_time) AS precip_ecmwf_time,
            COALESCE(v.debit_obs_m3s, lf.debit_obs_m3s) AS debit_obs_m3s,
            v.debit_sim_m3s,
            COALESCE(v.debit_obs_time, lf.debit_obs_time) AS debit_obs_time,
            v.lacher_m3s_latest,
            v.lacher_m3s_time,
            v.volume_hm3_latest,
            v.volume_obs_hm3,
            v.volume_sim_hm3,
            v.volume_hm3_time,
            COALESCE(
                v.precip_cum_24h_mm,
                p24.precip_cum_24h_mm,
                b24.basin_precip_cum_24h_mm,
                COALESCE(v.precip_obs_mm, bp.basin_precip_obs_mm)
            ) AS precip_cum_24h_mm,
            COALESCE(v.debit_max_24h_m3s, f24.debit_max_24h_m3s) AS debit_max_24h_m3s,
            v.lacher_max_24h_m3s,
            v.apport_max_24h_m3s
        FROM api.v_map_points_kpi v
        LEFT JOIN latest_station_precip_forecast sf ON sf.station_id = v.station_id
        LEFT JOIN latest_basin_precip bp ON bp.basin_id = v.basin_id
        LEFT JOIN basin_precip_24h b24 ON b24.basin_id = v.basin_id
        LEFT JOIN precip_24h p24 ON p24.station_id = v.station_id
        LEFT JOIN latest_flow lf ON lf.station_id = v.station_id
        LEFT JOIN flow_24h f24 ON f24.station_id = v.station_id
    """)
    
    result = await db.execute(query)
    rows = result.fetchall()
    
    items = []
    for row in rows:
        lat = None
        lon = None
        geo = None
        
        if row.geometry:
            try:
                # If it's already a dict (AsyncPG native JSON decoding)
                if isinstance(row.geometry, dict):
                    geo = row.geometry
                # If it's a string (Text column or JSON string)
                elif isinstance(row.geometry, str):
                    # Check if it looks like GeoJSON
                    if row.geometry.strip().startswith('{'):
                        geo = json.loads(row.geometry)
                    else:
                        # Might be a WKB/WKT string? (not handled here, but logging it)
                        print(f"DEBUG: Found non-JSON geometry string for station {row.station_id}: {row.geometry[:50]}...")
                    
                if isinstance(geo, dict):
                    # Check for Point geometry
                    if geo.get("type") == "Point":
                        coords = geo.get("coordinates")
                        if coords and isinstance(coords, list) and len(coords) >= 2:
                            lon = float(coords[0])
                            lat = float(coords[1])
                    # Also check for direct coords if not standard GeoJSON
                    elif "coordinates" in geo:
                        coords = geo["coordinates"]
                        if coords and isinstance(coords, list) and len(coords) >= 2:
                            lon = float(coords[0])
                            lat = float(coords[1])
                            
            except Exception as e:
                print(f"DEBUG: Error parsing geometry for station {row.station_id}: {e}")
                pass
                
        time_candidates = [
            row.precip_obs_time,
            row.precip_ecmwf_time,
            row.debit_obs_time,
            row.lacher_m3s_time,
            row.volume_hm3_time,
            row.kpi_run_time,
        ]
        last_data_time = max((t for t in time_candidates if t is not None), default=None)

        items.append(MapKPIItem(
            station_id=row.station_id,
            station_code=row.station_code,
            station_name=row.station_name,
            station_type=row.station_type,
            basin_id=row.basin_id,
            basin_code=row.basin_code,
            basin_name=row.basin_name,
            is_active=row.is_active,
            severity=row.severity,
            score=_finite_or_none(row.score),
            lat=_finite_or_none(lat),
            lon=_finite_or_none(lon),
            kpi_source=row.kpi_source,
            kpi_run_time=row.kpi_run_time,
            last_data_time=last_data_time,
            precip_obs_mm=_finite_or_none(row.precip_obs_mm),
            precip_obs_time=row.precip_obs_time,
            precip_arome_mm=_finite_or_none(row.precip_arome_mm),
            precip_ecmwf_mm=_finite_or_none(row.precip_ecmwf_mm),
            precip_ecmwf_time=row.precip_ecmwf_time,
            debit_obs_m3s=_finite_or_none(row.debit_obs_m3s),
            debit_sim_m3s=_finite_or_none(row.debit_sim_m3s),
            debit_obs_time=row.debit_obs_time,
            lacher_m3s_latest=_finite_or_none(row.lacher_m3s_latest),
            lacher_m3s_time=row.lacher_m3s_time,
            volume_hm3_latest=_finite_or_none(row.volume_hm3_latest),
            volume_obs_hm3=_finite_or_none(row.volume_obs_hm3),
            volume_sim_hm3=_finite_or_none(row.volume_sim_hm3),
            volume_hm3_time=row.volume_hm3_time,
            precip_cum_24h_mm=_finite_or_none(row.precip_cum_24h_mm),
            debit_max_24h_m3s=_finite_or_none(row.debit_max_24h_m3s),
            lacher_max_24h_m3s=_finite_or_none(row.lacher_max_24h_m3s),
            apport_max_24h_m3s=_finite_or_none(row.apport_max_24h_m3s),
        ))
        
    return items

@router.get("/dashboard/top-critical", response_model=List[TopCriticalItem])
async def read_top_critical(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """
    Get top critical stations sorted by score (api.v_top_critical_24h).
    """
    from sqlalchemy import text
    
    query = text("""
        SELECT 
            station_id,
            station_name,
            basin_name,
            precip_cum_24h_mm,
            debit_max_24h_m3s,
            lacher_max_24h_m3s,
            severity,
            score
        FROM api.v_top_critical_24h
        ORDER BY score DESC NULLS LAST
        LIMIT 20
    """)
    
    result = await db.execute(query)
    rows = result.fetchall()

    # Fallback: if v_top_critical_24h is empty, use map KPI view to avoid an empty dashboard panel.
    if not rows:
        fallback_query = text("""
            SELECT
                station_id,
                station_name,
                basin_name,
                precip_cum_24h_mm,
                COALESCE(debit_max_24h_m3s, debit_obs_m3s) AS debit_max_24h_m3s,
                COALESCE(lacher_max_24h_m3s, lacher_m3s_latest) AS lacher_max_24h_m3s,
                COALESCE(severity, 'OK') AS severity,
                COALESCE(score, 0)::double precision AS score
            FROM api.v_map_points_kpi
            ORDER BY COALESCE(score, 0) DESC, station_name
            LIMIT 20
        """)
        fallback_result = await db.execute(fallback_query)
        rows = fallback_result.fetchall()
    
    return [
        TopCriticalItem(
            station_id=row.station_id,
            station_name=row.station_name,
            basin_name=row.basin_name,
            precip_cum_24h_mm=_finite_or_none(row.precip_cum_24h_mm),
            debit_max_24h_m3s=_finite_or_none(row.debit_max_24h_m3s),
            lacher_max_24h_m3s=_finite_or_none(row.lacher_max_24h_m3s),
            severity=row.severity,
            score=_finite_or_none(row.score) or 0.0
        )
        for row in rows
    ]
