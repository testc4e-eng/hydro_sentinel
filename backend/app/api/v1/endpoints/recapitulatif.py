from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()


RECAP_VIEWS_SQL = """
CREATE OR REPLACE VIEW api.v_recap_debit_journalier AS
SELECT
    date_trunc('day', m.time)::date AS jour,
    s.station_id::text              AS barrage_id,
    s.name                          AS barrage,
    COALESCE(
      MAX(CASE WHEN v.code = 'flow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM' THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM' THEN m.value::double precision END)
    ) AS debit_max_j,
    COALESCE(
      AVG(CASE WHEN v.code = 'flow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      AVG(CASE WHEN v.code = 'flow_m3s' AND src.code = 'SIM' THEN m.value::double precision END),
      AVG(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'OBS' THEN m.value::double precision END),
      AVG(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM' THEN m.value::double precision END)
    ) AS debit_moy_j,
    COALESCE(
      SUM(CASE WHEN v.code = 'lacher_m3s' AND src.code = 'OBS' THEN m.value::double precision * 3600 / 1000000 END),
      SUM(CASE WHEN v.code = 'lacher_m3s' AND src.code = 'SIM' THEN m.value::double precision * 3600 / 1000000 END)
    ) AS restitutions_mm3,
    COALESCE(
      MAX(CASE WHEN v.code = 'volume_hm3' AND src.code = 'OBS' AND EXTRACT(HOUR FROM m.time) = 8 THEN m.value::double precision END),
      MAX(CASE WHEN v.code = 'volume_hm3' AND src.code = 'SIM' AND EXTRACT(HOUR FROM m.time) = 8 THEN m.value::double precision END)
    ) AS retenue_8h_mm3,
    COALESCE(
      SUM(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'OBS' THEN m.value::double precision * 3600 / 1000000 END),
      SUM(CASE WHEN v.code = 'inflow_m3s' AND src.code = 'SIM' THEN m.value::double precision * 3600 / 1000000 END)
    ) AS apports_mm3
FROM ts.measurement m
JOIN ref.variable v ON v.variable_id = m.variable_id
JOIN ref.source src ON src.source_id = m.source_id
JOIN geo.station s ON s.station_id = m.station_id
WHERE lower(coalesce(s.station_type, '')) LIKE '%barrage%'
  AND src.code IN ('OBS', 'SIM')
  AND v.code IN ('flow_m3s', 'inflow_m3s', 'lacher_m3s', 'volume_hm3')
GROUP BY date_trunc('day', m.time)::date, s.station_id::text, s.name;

CREATE OR REPLACE VIEW api.v_recap_apports_journalier AS
SELECT
    d.jour,
    d.barrage_id,
    d.barrage,
    d.retenue_8h_mm3,
    d.debit_max_j,
    d.debit_moy_j,
    d.restitutions_mm3,
    d.apports_mm3,
    GREATEST(
      (
          CASE
              WHEN lower(d.barrage) LIKE '%idriss%' THEN 1125::double precision
              WHEN lower(d.barrage) LIKE '%wahda%' THEN 3523::double precision
              WHEN lower(d.barrage) LIKE '%ouljet%' THEN 508::double precision
              ELSE NULL
          END
      ) - d.retenue_8h_mm3,
      0::double precision
    ) AS creux_mm3
FROM api.v_recap_debit_journalier d;

CREATE OR REPLACE VIEW api.v_recap_pluie_journalier AS
SELECT
    date_trunc('day', m.time)::date AS jour,
    b.station_id::text              AS barrage_id,
    AVG(m.value::double precision)  AS pluie_moy_dgm
FROM geo.station b
JOIN geo.station p
  ON p.basin_id = b.basin_id
 AND lower(coalesce(p.station_type, '')) NOT LIKE '%barrage%'
JOIN ts.measurement m ON m.station_id = p.station_id
JOIN ref.variable v ON v.variable_id = m.variable_id
JOIN ref.source src ON src.source_id = m.source_id
WHERE lower(coalesce(b.station_type, '')) LIKE '%barrage%'
  AND src.code = 'OBS'
  AND v.code = 'precip_mm'
GROUP BY date_trunc('day', m.time)::date, b.station_id::text;
"""


def _parse_days(value: str) -> int:
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


@router.get("/barrage")
async def get_recap_barrage(
    barrage_id: str = Query(..., description="Station ID du barrage"),
    date_fin: date = Query(..., description="Date de fin ISO (YYYY-MM-DD)"),
    nb_jours: int | str = Query(14),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    days = _parse_days(str(nb_jours))
    requested_date_fin = date_fin
    date_debut = requested_date_fin - timedelta(days=days - 1)

    await _ensure_recap_views(db)

    query = text(
        """
        SELECT
            d.jour::date AS jour,
            p.pluie_moy_dgm::double precision AS pluie_moy,
            d.retenue_8h_mm3::double precision AS retenue_actuelle,
            d.apports_mm3::double precision AS apports,
            d.creux_mm3::double precision AS creux_actuel,
            d.restitutions_mm3::double precision AS restitutions,
            d.debit_max_j::double precision AS debit_max,
            d.debit_moy_j::double precision AS debit_moy_j
        FROM api.v_recap_apports_journalier d
        LEFT JOIN api.v_recap_pluie_journalier p
          ON p.barrage_id = d.barrage_id
         AND p.jour = d.jour
        WHERE d.barrage_id = :barrage_id
          AND d.jour BETWEEN :date_debut AND :date_fin
        ORDER BY d.jour ASC
        """
    )

    print(
        f"[recap] query barrage_id={barrage_id} "
        f"requested_date_debut={date_debut} requested_date_fin={requested_date_fin}"
    )
    result = await db.execute(
        query,
        {"barrage_id": barrage_id, "date_debut": date_debut, "date_fin": requested_date_fin},
    )
    rows = result.mappings().all()

    # Fallback: if the requested window has no rows, anchor on the latest available day.
    if len(rows) == 0:
        latest_q = text(
            """
            SELECT MAX(jour)::date AS max_jour
            FROM api.v_recap_apports_journalier
            WHERE barrage_id = :barrage_id
            """
        )
        latest_res = await db.execute(latest_q, {"barrage_id": barrage_id})
        latest_row = latest_res.mappings().first()
        latest_day = latest_row["max_jour"] if latest_row else None

        if latest_day:
            fallback_end = latest_day
            fallback_start = fallback_end - timedelta(days=days - 1)
            print(
                f"[recap] fallback barrage_id={barrage_id} "
                f"fallback_date_debut={fallback_start} fallback_date_fin={fallback_end}"
            )
            result = await db.execute(
                query,
                {
                    "barrage_id": barrage_id,
                    "date_debut": fallback_start,
                    "date_fin": fallback_end,
                },
            )
            rows = result.mappings().all()

    print(f"[recap] rows={len(rows)}")

    payload: List[Dict[str, Any]] = []
    for row in rows:
        payload.append(
            {
                "jour": row["jour"].isoformat() if row["jour"] else None,
                "pluie_moy": row["pluie_moy"],
                "retenue_actuelle": row["retenue_actuelle"],
                "apports": row["apports"],
                "creux_actuel": row["creux_actuel"],
                "restitutions": row["restitutions"],
                "debit_max": row["debit_max"],
                "debit_moy_j": row["debit_moy_j"],
            }
        )

    return payload
