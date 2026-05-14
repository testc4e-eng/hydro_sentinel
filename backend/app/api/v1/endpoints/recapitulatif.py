from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()


def _normalize_barrage_name(value: str) -> str:
    return " ".join(
        value.lower()
        .replace("barrage", " ")
        .replace("bge", " ")
        .replace("brg", " ")
        .split()
    )


RECAP_VIEWS_SQL = """
CREATE OR REPLACE VIEW api.v_recap_pluie_bv_journalier AS
WITH barrage_ref AS (
    SELECT
        s.station_id,
        s.name AS barrage
    FROM geo.station s
    WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
),
barrage_basin_map AS (
    SELECT 'wahda'::text AS barrage_key, 'al wahda 1'::text AS dgm_basin_name
    UNION ALL SELECT 'wahda', 'al wahda 2'
    UNION ALL SELECT 'wahda', 'al wahda 3'
    UNION ALL SELECT 'idriss', 'idriss 1er'
    UNION ALL SELECT 'ouljet', 'ouljet soltane'
),
target_barrages AS (
    SELECT
        r.station_id::text AS barrage_id,
        r.barrage,
        CASE
            WHEN lower(r.barrage) LIKE '%wahda%' THEN 'wahda'
            WHEN lower(r.barrage) LIKE '%idriss%' THEN 'idriss'
            WHEN lower(r.barrage) LIKE '%ouljet%' OR lower(r.barrage) LIKE '%soltan%' OR lower(r.barrage) LIKE '%soulta%' THEN 'ouljet'
            ELSE NULL
        END AS barrage_key
    FROM barrage_ref r
),
resolved_basin_map AS (
    SELECT
        m.barrage_key,
        m.dgm_basin_name,
        COALESCE(b_by_name.basin_id, b_by_station.basin_id) AS basin_id
    FROM barrage_basin_map m
    LEFT JOIN LATERAL (
        SELECT b.basin_id
        FROM geo.basin b
        WHERE lower(b.name) = lower(m.dgm_basin_name)
        LIMIT 1
    ) b_by_name ON TRUE
    LEFT JOIN LATERAL (
        SELECT s.basin_id
        FROM geo.station s
        WHERE s.basin_id IS NOT NULL
          AND (
              lower(s.name) = lower(m.dgm_basin_name)
              OR lower(s.name) LIKE '%' || lower(m.dgm_basin_name) || '%'
              OR lower(m.dgm_basin_name) LIKE '%' || lower(s.name) || '%'
              OR (m.barrage_key = 'wahda' AND lower(s.name) LIKE '%wahda%')
              OR (m.barrage_key = 'idriss' AND lower(s.name) LIKE '%idriss%')
              OR (m.barrage_key = 'ouljet' AND (lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltan%' OR lower(s.name) LIKE '%soultan%'))
          )
        ORDER BY
            CASE
                WHEN lower(s.name) = lower(m.dgm_basin_name) THEN 1
                WHEN lower(s.name) LIKE '%' || lower(m.dgm_basin_name) || '%' THEN 2
                WHEN m.barrage_key = 'wahda' AND lower(s.name) LIKE '%wahda%' THEN 3
                WHEN m.barrage_key = 'idriss' AND lower(s.name) LIKE '%idriss%' THEN 3
                WHEN m.barrage_key = 'ouljet' AND (lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltan%' OR lower(s.name) LIKE '%soultan%') THEN 3
                ELSE 4
            END,
            s.station_id
        LIMIT 1
    ) b_by_station ON TRUE
),
mapped_barrage_basins AS (
    SELECT DISTINCT
        t.barrage_id,
        t.barrage,
        r.basin_id
    FROM target_barrages t
    JOIN resolved_basin_map r ON r.barrage_key = t.barrage_key
    WHERE t.barrage_key IS NOT NULL
      AND r.basin_id IS NOT NULL
),
daily_basin AS (
    SELECT
        date_trunc('day', (bm.time AT TIME ZONE 'UTC'))::date AS jour,
        bm.basin_id,
        SUM(bm.value::double precision) AS basin_daily_cumul_mm
    FROM ts.basin_measurement bm
    JOIN ref.variable v ON v.variable_id = bm.variable_id
    JOIN ref.source s ON s.source_id = bm.source_id
    WHERE v.code = 'precip_mm'
      AND s.code = 'ECMWF'
    GROUP BY date_trunc('day', (bm.time AT TIME ZONE 'UTC'))::date, bm.basin_id
)
SELECT
    d.jour,
    m.barrage_id,
    SUM(d.basin_daily_cumul_mm)::double precision AS pluie_moy_mm,
    m.barrage
FROM mapped_barrage_basins m
JOIN daily_basin d ON d.basin_id = m.basin_id
GROUP BY d.jour, m.barrage_id, m.barrage;

CREATE OR REPLACE VIEW api.v_recap_barrage_journalier AS
WITH barrage_ref AS (
    SELECT
        s.station_id,
        s.name AS barrage,
        COALESCE(b.name, '-') AS bassin,
        CASE
            WHEN lower(s.name) LIKE '%idriss%' THEN 1125::double precision
            WHEN lower(s.name) LIKE '%wahda%' THEN 3523::double precision
            WHEN lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltane%' OR lower(s.name) LIKE '%soultane%' THEN 508::double precision
            ELSE NULL::double precision
        END AS capacite_mm3
    FROM geo.station s
    LEFT JOIN geo.basin b ON b.basin_id = s.basin_id
    WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
),
sim_retenue_8h AS (
    SELECT
        sub.barrage_id,
        sub.jour,
        sub.value AS retenue_sim_8h_mm3
    FROM (
        SELECT
            m.station_id::text AS barrage_id,
            date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
            m.value::double precision AS value,
            row_number() OVER (
                PARTITION BY m.station_id::text, date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date
                ORDER BY
                    abs(
                        extract(
                            epoch
                            FROM (
                                (m.time AT TIME ZONE 'UTC') - (date_trunc('day', (m.time AT TIME ZONE 'UTC')) + interval '8 hour')
                            )
                        )
                    ),
                    m.time DESC
            ) AS rn
        FROM ts.measurement m
        JOIN ref.variable v ON v.variable_id = m.variable_id
        JOIN ref.source src ON src.source_id = m.source_id
        JOIN barrage_ref r ON r.station_id = m.station_id
        WHERE v.code = 'volume_hm3'
          AND src.code = 'SIM'
    ) sub
    WHERE sub.rn = 1
),
sim_volume_8h AS (
    SELECT
        sub.barrage_id,
        sub.jour,
        sub.value AS volume_sim_8h_mm3
    FROM (
        SELECT
            m.station_id::text AS barrage_id,
            date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
            m.value::double precision AS value,
            row_number() OVER (
                PARTITION BY m.station_id::text, date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date
                ORDER BY
                    abs(
                        extract(
                            epoch
                            FROM (
                                (m.time AT TIME ZONE 'UTC') - (date_trunc('day', (m.time AT TIME ZONE 'UTC')) + interval '8 hour')
                            )
                        )
                    ),
                    m.time DESC
            ) AS rn
        FROM ts.measurement m
        JOIN ref.variable v ON v.variable_id = m.variable_id
        JOIN ref.source src ON src.source_id = m.source_id
        JOIN barrage_ref r ON r.station_id = m.station_id
        WHERE v.code = 'volume_hm3'
          AND src.code = 'SIM'
    ) sub
    WHERE sub.rn = 1
),
daily_agg AS (
    SELECT
        date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
        r.station_id::text AS barrage_id,
        r.barrage,
        r.bassin,
        r.capacite_mm3,
        -- Apports: inflow prioritaire, fallback flow si inflow absent / NaN
        COALESCE(
            NULLIF(
                SUM(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM'
                          AND m.value::double precision = m.value::double precision
                    THEN m.value::double precision * 3600 / 1000000 END),
                'NaN'::double precision
            ),
            NULLIF(
                SUM(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM'
                          AND m.value::double precision = m.value::double precision
                    THEN m.value::double precision * 3600 / 1000000 END),
                'NaN'::double precision
            )
        ) AS apports_mm3,
        SUM(CASE WHEN v.code = 'lacher_m3s' AND src.code = 'SIM'
                  AND m.value::double precision = m.value::double precision
            THEN m.value::double precision * 3600 / 1000000 END) AS lacher_mm3,
        MAX(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM'
            THEN m.value::double precision END) AS debit_max_m3s,
        AVG(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM'
            THEN m.value::double precision END) AS debit_moy_m3s
    FROM barrage_ref r
    LEFT JOIN ts.measurement m ON m.station_id = r.station_id
    LEFT JOIN ref.variable v ON v.variable_id = m.variable_id
    LEFT JOIN ref.source src ON src.source_id = m.source_id
    GROUP BY date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date, r.station_id::text, r.barrage, r.bassin, r.capacite_mm3
)
SELECT
    d.jour,
    d.barrage_id,
    d.barrage,
    d.bassin,
    p.pluie_moy_mm,
    rv.retenue_sim_8h_mm3,
    d.apports_mm3,
    sv.volume_sim_8h_mm3,
    CASE
        WHEN d.capacite_mm3 IS NULL OR sv.volume_sim_8h_mm3 IS NULL THEN NULL
        ELSE d.capacite_mm3 - sv.volume_sim_8h_mm3
    END AS creux_mm3,
    d.lacher_mm3,
    d.debit_max_m3s,
    d.debit_moy_m3s,
    d.capacite_mm3
FROM daily_agg d
LEFT JOIN api.v_recap_pluie_bv_journalier p
  ON p.barrage_id = d.barrage_id
 AND p.jour = d.jour
LEFT JOIN sim_retenue_8h rv
  ON rv.barrage_id = d.barrage_id
 AND rv.jour = d.jour
LEFT JOIN sim_volume_8h sv
  ON sv.barrage_id = d.barrage_id
 AND sv.jour = d.jour;

CREATE OR REPLACE VIEW api.v_recap_alerte_prevision AS
WITH barrage_ref AS (
    SELECT
        s.station_id,
        s.name AS barrage,
        COALESCE(b.name, '-') AS bassin,
        CASE
            WHEN lower(s.name) LIKE '%idriss%' THEN 1125::double precision
            WHEN lower(s.name) LIKE '%wahda%' THEN 3523::double precision
            WHEN lower(s.name) LIKE '%ouljet%' OR lower(s.name) LIKE '%soltane%' OR lower(s.name) LIKE '%soultane%' THEN 508::double precision
            ELSE NULL::double precision
        END AS capacite_mm3
    FROM geo.station s
    LEFT JOIN geo.basin b ON b.basin_id = s.basin_id
    WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
)
SELECT
    date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date AS jour,
    r.station_id::text AS barrage_id,
    r.barrage,
    r.bassin,
    r.capacite_mm3,
    MAX(m.value::double precision) AS volume_prevu_mm3,
    CASE
        WHEN r.capacite_mm3 IS NULL THEN NULL
        ELSE r.capacite_mm3 - MAX(m.value::double precision)
    END AS creux_prevu_mm3
FROM barrage_ref r
JOIN ts.measurement m ON m.station_id = r.station_id
JOIN ref.variable v ON v.variable_id = m.variable_id
JOIN ref.source src ON src.source_id = m.source_id
WHERE v.code = 'volume_hm3'
  AND src.code = 'SIM'
GROUP BY date_trunc('day', (m.time AT TIME ZONE 'UTC'))::date, r.station_id::text, r.barrage, r.bassin, r.capacite_mm3;
"""


def _parse_days(value: int | str | None) -> int:
    normalized = str(value or "").strip().lower()
    if normalized == "24h":
        return 1
    if normalized == "72h":
        return 3
    if normalized.endswith("d") and normalized[:-1].isdigit():
        return max(1, int(normalized[:-1]))
    if normalized.isdigit():
        return max(1, int(normalized))
    return 14


async def _ensure_recap_views(db: AsyncSession) -> None:
    for statement in [stmt.strip() for stmt in RECAP_VIEWS_SQL.split(";") if stmt.strip()]:
        await db.execute(text(statement))


def _resolve_period(
    date_debut: Optional[date],
    date_fin: Optional[date],
    nb_jours: int,
) -> tuple[date, date]:
    end_day = date_fin or datetime.utcnow().date()
    start_day = date_debut or (end_day - timedelta(days=nb_jours - 1))
    if start_day > end_day:
        raise HTTPException(status_code=400, detail="dateDebut must be <= dateFin")
    return start_day, end_day


async def _resolve_full_retenue_period(
    db: AsyncSession,
    barrage_id: Optional[str],
    barrage: Optional[str],
) -> tuple[Optional[date], Optional[date]]:
    where_parts = ["retenue_sim_8h_mm3 IS NOT NULL"]
    params: Dict[str, Any] = {}
    if barrage_id:
        where_parts.append("barrage_id = :barrage_id")
        params["barrage_id"] = barrage_id
    if barrage:
        barrage_raw = " ".join(barrage.lower().split())
        barrage_norm = _normalize_barrage_name(barrage)
        where_parts.append(
            "("
            "lower(barrage) LIKE :barrage_name_raw "
            "OR regexp_replace(lower(barrage), '\\m(barrage|bge|brg)\\M', ' ', 'g') LIKE :barrage_name_norm"
            ")"
        )
        params["barrage_name_raw"] = f"%{barrage_raw}%"
        params["barrage_name_norm"] = f"%{barrage_norm}%"

    period_q = text(
        f"""
        SELECT MIN(jour)::date AS min_jour, MAX(jour)::date AS max_jour
        FROM api.v_recap_barrage_journalier
        WHERE {' AND '.join(where_parts)}
        """
    )
    row = (await db.execute(period_q, params)).mappings().first()
    if not row:
        return None, None
    return row["min_jour"], row["max_jour"]


@router.get("/barrage")
async def get_recap_barrage(
    barrage_id: Optional[str] = Query(None, description="Station ID du barrage"),
    barrage: Optional[str] = Query(None, description="Nom du barrage"),
    date_debut: Optional[date] = Query(None, alias="dateDebut"),
    date_fin: Optional[date] = Query(None, alias="dateFin"),
    date_fin_legacy: Optional[date] = Query(None, alias="date_fin"),
    nb_jours: int | str = Query(14),
    full_period: bool = Query(False, alias="full_period"),
    source: str = Query("SIM"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    await _ensure_recap_views(db)

    if not barrage_id and not barrage:
        raise HTTPException(status_code=400, detail="barrage_id or barrage is required")

    requested_end = date_fin or date_fin_legacy
    if full_period and date_debut is None and requested_end is None:
        start_day, end_day = await _resolve_full_retenue_period(db, barrage_id, barrage)
        if start_day is None or end_day is None:
            days = _parse_days(nb_jours)
            start_day, end_day = _resolve_period(date_debut, requested_end, days)
    else:
        days = _parse_days(nb_jours)
        start_day, end_day = _resolve_period(date_debut, requested_end, days)

    where_parts = ["jour BETWEEN :date_debut AND :date_fin"]
    params: Dict[str, Any] = {
        "date_debut": start_day,
        "date_fin": end_day,
    }

    if barrage_id:
        where_parts.append("barrage_id = :barrage_id")
        params["barrage_id"] = barrage_id
    if barrage:
        where_parts.append("lower(barrage) LIKE :barrage_name")
        params["barrage_name"] = f"%{barrage.lower()}%"

    query = text(
        f"""
        SELECT
            barrage_id,
            barrage,
            bassin,
            jour,
            pluie_moy_mm,
            retenue_sim_8h_mm3,
            apports_mm3,
            creux_mm3,
            lacher_mm3,
            debit_max_m3s,
            debit_moy_m3s,
            capacite_mm3
        FROM api.v_recap_barrage_journalier
        WHERE {' AND '.join(where_parts)}
        ORDER BY jour ASC
        """
    )

    rows = (await db.execute(query, params)).mappings().all()

    barrage_name = rows[0]["barrage"] if rows else (barrage or "-")

    payload_rows: List[Dict[str, Any]] = []
    for row in rows:
        payload_rows.append(
            {
                "jour": row["jour"].isoformat() if row["jour"] else None,
                "pluie_moy_mm": row["pluie_moy_mm"],
                "retenue_mm3": row["retenue_sim_8h_mm3"],
                "apports_mm3": row["apports_mm3"],
                "creux_mm3": row["creux_mm3"],
                "lacher_mm3": row["lacher_mm3"],
                "debit_max_m3s": row["debit_max_m3s"],
                "debit_moy_m3s": row["debit_moy_m3s"],
            }
        )

    return {
        "barrage": barrage_name,
        "capacite": rows[0]["capacite_mm3"] if rows else None,
        "source": source,
        "periode": {"debut": start_day.isoformat(), "fin": end_day.isoformat()},
        "donnees": payload_rows,
    }


@router.get("/alertes/prevision")
async def get_alertes_prevision(
    barrage_id: Optional[str] = Query(None),
    barrage: Optional[str] = Query(None),
    t0: Optional[date] = Query(None),
    nbJours: int = Query(14),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    if not barrage_id and not barrage:
        raise HTTPException(status_code=400, detail="barrage_id or barrage is required")

    await _ensure_recap_views(db)

    where_parts = ["1=1"]
    params: Dict[str, Any] = {}
    if barrage_id:
        where_parts.append("barrage_id = :barrage_id")
        params["barrage_id"] = barrage_id
    if barrage:
        where_parts.append("lower(barrage) LIKE :barrage_name")
        params["barrage_name"] = f"%{barrage.lower()}%"

    latest_q = text(
        f"""
        SELECT MAX(jour)::date AS max_jour
        FROM api.v_recap_alerte_prevision
        WHERE {' AND '.join(where_parts)}
        """
    )
    latest_row = (await db.execute(latest_q, params)).mappings().first()
    latest_day = latest_row["max_jour"] if latest_row else None

    if not latest_day:
        return {
            "barrage": barrage or "-",
            "t0": None,
            "tn": None,
            "previsions": [],
            "avertissement": "Aucune donnee SIM disponible pour ce barrage.",
        }

    horizon_days = max(1, nbJours)
    if t0:
        start_day = t0
        horizon_end = start_day + timedelta(days=horizon_days)
        end_day = min(horizon_end, latest_day)
    else:
        # Default behavior: return the latest available window so charts have a real series.
        end_day = latest_day
        start_day = latest_day - timedelta(days=horizon_days - 1)

    warning: Optional[str] = None
    if t0 and end_day < horizon_end:
        warning = (
            f"Donnees SIM disponibles jusqu'au {latest_day.strftime('%d/%m/%Y')} seulement. "
            "Importer une nouvelle simulation pour etendre l'horizon."
        )

    previsions: List[Dict[str, Any]] = []
    if end_day >= start_day:
        q = text(
            f"""
            SELECT barrage, bassin, jour, creux_prevu_mm3, volume_prevu_mm3, capacite_mm3
            FROM api.v_recap_alerte_prevision
            WHERE {' AND '.join(where_parts)}
              AND jour BETWEEN :start_day AND :end_day
            ORDER BY jour ASC
            """
        )
        rows = (await db.execute(q, {**params, "start_day": start_day, "end_day": end_day})).mappings().all()
        for row in rows:
            previsions.append(
                {
                    "jour": row["jour"].isoformat() if row["jour"] else None,
                    "creux_prevu_mm3": row["creux_prevu_mm3"],
                    "volume_prevu_mm3": row["volume_prevu_mm3"],
                    "capacite_mm3": row["capacite_mm3"],
                }
            )
        barrage_name = rows[0]["barrage"] if rows else (barrage or "-")
    else:
        barrage_name = barrage or "-"
        warning = (
            f"Donnees SIM disponibles jusqu'au {latest_day.strftime('%d/%m/%Y')} seulement. "
            "Importer une nouvelle simulation pour etendre l'horizon."
        )

    return {
        "barrage": barrage_name,
        "t0": start_day.isoformat(),
        "tn": end_day.isoformat(),
        "previsions": previsions,
        "avertissement": warning,
    }
