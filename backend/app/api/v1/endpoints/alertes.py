from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.endpoints.recapitulatif import _ensure_recap_views
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

    previsions = []
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
