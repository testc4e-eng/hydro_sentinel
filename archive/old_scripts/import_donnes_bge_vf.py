from __future__ import annotations

import argparse
import os
import re
from datetime import datetime
from typing import Dict, List, Tuple

import pandas as pd
from sqlalchemy import create_engine, text


SHEET_VARIABLE_MAP = {
    "debit": "flow_m3s",
    "lacher": "lacher_m3s",
    "volume - retenue": "volume_hm3",
}

DAM_ALIASES = {
    "al wahda": "Bge Al Wahda",
    "wahda": "Bge Al Wahda",
    "idriss 1er": "Bge Idriss 1er",
    "idriss": "Bge Idriss 1er",
    "ouljet soltane": "Bge Ouljet Soultane",
    "ouljet soultane": "Bge Ouljet Soultane",
    "ouljet": "Bge Ouljet Soultane",
}


def normalize_text(value: str) -> str:
    lowered = (value or "").strip().lower()
    lowered = lowered.replace("é", "e").replace("è", "e").replace("ê", "e")
    lowered = lowered.replace("â", "a").replace("à", "a")
    lowered = re.sub(r"[^a-z0-9]+", " ", lowered)
    return re.sub(r"\s+", " ", lowered).strip()


def resolve_dam_name(raw_column: str) -> str | None:
    normalized = normalize_text(raw_column)
    for alias, canonical in DAM_ALIASES.items():
        if alias in normalized:
            return canonical
    return None


def normalize_db_url(raw_url: str) -> str:
    if raw_url.startswith("postgresql+asyncpg://"):
        return raw_url.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    return raw_url


def load_station_lookup(conn) -> Dict[str, str]:
    rows = conn.execute(
        text(
            """
            SELECT station_id::text AS station_id, name
            FROM geo.station
            WHERE lower(coalesce(station_type, '')) LIKE '%barrage%'
            """
        )
    ).mappings()

    lookup: Dict[str, str] = {}
    for row in rows:
        name = str(row["name"])
        lookup[normalize_text(name)] = str(row["station_id"])
    return lookup


def pick_station_id(station_lookup: Dict[str, str], canonical_name: str) -> str:
    target = normalize_text(canonical_name)
    if target in station_lookup:
        return station_lookup[target]

    for station_name, station_id in station_lookup.items():
        if target in station_name or station_name in target:
            return station_id
    raise RuntimeError(f"Barrage introuvable en BD pour '{canonical_name}'")


def get_id(conn, table: str, code: str) -> str:
    row = conn.execute(text(f"SELECT {table}_id::text AS id FROM ref.{table} WHERE code = :code"), {"code": code}).mappings().first()
    if not row:
        raise RuntimeError(f"{table} code '{code}' introuvable")
    return str(row["id"])


def parse_timestamp(value) -> datetime | None:
    if pd.isna(value):
        return None
    ts = pd.to_datetime(value, errors="coerce", utc=False)
    if pd.isna(ts):
        return None
    if hasattr(ts, "to_pydatetime"):
        return ts.to_pydatetime()
    return ts


def collect_rows_from_sheet(sheet_name: str, df: pd.DataFrame, station_lookup: Dict[str, str]) -> List[Tuple[str, datetime, float]]:
    variable_code = SHEET_VARIABLE_MAP[sheet_name]
    ts_col = df.columns[0]
    rows: List[Tuple[str, datetime, float]] = []

    for col in df.columns[1:]:
        canonical_dam = resolve_dam_name(str(col))
        if not canonical_dam:
            continue
        station_id = pick_station_id(station_lookup, canonical_dam)

        for _, record in df[[ts_col, col]].iterrows():
            ts = parse_timestamp(record[ts_col])
            if ts is None:
                continue
            value = pd.to_numeric(record[col], errors="coerce")
            if pd.isna(value):
                continue

            if variable_code == "volume_hm3":
                # Regle metier: retenue journaliere a 8h.
                if ts.hour != 8:
                    continue
                ts = ts.replace(minute=0, second=0, microsecond=0)

            rows.append((station_id, ts, float(value)))

    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Importe donnes bge_VF.xlsx vers ts.measurement")
    parser.add_argument("--file", default="donnes bge_VF.xlsx", help="Chemin du fichier Excel")
    parser.add_argument(
        "--db-url",
        default=os.getenv("DATABASE_URL", ""),
        help="URL DB (sinon DATABASE_URL env)",
    )
    parser.add_argument("--source", default="OBS", help="Code source ref.source (default OBS)")
    args = parser.parse_args()

    if not args.db_url:
        raise RuntimeError("DATABASE_URL manquante. Passez --db-url ou variable d'environnement.")

    db_url = normalize_db_url(args.db_url)
    engine = create_engine(db_url, future=True)

    workbook = pd.read_excel(args.file, sheet_name=None)
    with engine.begin() as conn:
        station_lookup = load_station_lookup(conn)
        source_id = get_id(conn, "source", args.source)
        variable_id_map = {
            "flow_m3s": get_id(conn, "variable", "flow_m3s"),
            "lacher_m3s": get_id(conn, "variable", "lacher_m3s"),
            "volume_hm3": get_id(conn, "variable", "volume_hm3"),
        }

        insert_sql = text(
            """
            INSERT INTO ts.measurement (station_id, variable_id, time, value, qc_flag, source_id, run_id)
            VALUES (
              CAST(:station_id AS UUID),
              CAST(:variable_id AS UUID),
              :time,
              :value,
              0,
              CAST(:source_id AS UUID),
              NULL
            )
            ON CONFLICT (
              time,
              station_id,
              variable_id,
              source_id,
              COALESCE(run_id, '00000000-0000-0000-0000-000000000000'::uuid)
            ) DO UPDATE SET value = EXCLUDED.value
            """
        )

        counters: Dict[str, int] = {"flow_m3s": 0, "lacher_m3s": 0, "volume_hm3": 0}
        for sheet_name, variable_code in SHEET_VARIABLE_MAP.items():
            if sheet_name not in workbook:
                print(f"[WARN] Feuille absente: {sheet_name}")
                continue

            df = workbook[sheet_name]
            batch = collect_rows_from_sheet(sheet_name, df, station_lookup)
            for station_id, ts, value in batch:
                conn.execute(
                    insert_sql,
                    {
                        "station_id": station_id,
                        "variable_id": variable_id_map[variable_code],
                        "time": ts,
                        "value": value,
                        "source_id": source_id,
                    },
                )
                counters[variable_code] += 1

        print("[OK] Import termine")
        for k, v in counters.items():
            print(f"  - {k}: {v} lignes")


if __name__ == "__main__":
    main()
