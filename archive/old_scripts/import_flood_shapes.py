from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
import os
from pathlib import Path
import subprocess
from typing import Dict, Iterable, List, Tuple
from urllib.parse import unquote, urlparse

from sqlalchemy import create_engine, text


ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = ROOT / ".env"
DEFAULT_SHAPES_DIR = ROOT.parent / "Inondations_Sebou"
SHP2PGSQL = Path(r"C:\Program Files\PostgreSQL\17\bin\shp2pgsql.exe")
PSQL = Path(r"C:\Program Files\PostgreSQL\17\bin\psql.exe")

# Requested user dates (dd/mm/yyyy):
# - 01/02/2026
# - 14/02/2026
# - 16/02/2026
# - 24/02/2026
TARGET_SHAPES: List[Tuple[str, str]] = [
    ("2026_02_01", "2026-02-01"),
    ("2026_02_14", "2026-02-14"),
    ("2026_02_16", "2026-02-16"),
    ("2026_02_24", "2026-02-24"),
]


@dataclass(frozen=True)
class DbConn:
    host: str
    port: int
    user: str
    password: str
    database: str


def _read_env_file(path: Path) -> Dict[str, str]:
    values: Dict[str, str] = {}
    if not path.exists():
        return values
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip().strip("\"'")
    return values


def _sync_db_url(url: str) -> str:
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("postgresql+psycopg://"):
        return url.replace("postgresql+psycopg://", "postgresql://", 1)
    return url


def _parse_db_url(url: str) -> DbConn:
    parsed = urlparse(_sync_db_url(url))
    if parsed.scheme not in {"postgresql", "postgres"}:
        raise RuntimeError(f"Unsupported DATABASE_URL scheme: {parsed.scheme}")
    if not parsed.hostname or not parsed.username or parsed.password is None or not parsed.path:
        raise RuntimeError("DATABASE_URL is incomplete (host/user/password/database required).")

    return DbConn(
        host=parsed.hostname,
        port=parsed.port or 5432,
        user=unquote(parsed.username),
        password=unquote(parsed.password),
        database=parsed.path.lstrip("/"),
    )


def _run_pipe(cmd_left: List[str], cmd_right: List[str], env: Dict[str, str]) -> None:
    with subprocess.Popen(cmd_left, stdout=subprocess.PIPE, stderr=subprocess.PIPE) as left:
        assert left.stdout is not None
        right = subprocess.run(cmd_right, stdin=left.stdout, capture_output=True, env=env, check=False)
        left.stdout.close()
        left_stderr = left.stderr.read().decode("utf-8", errors="replace") if left.stderr else ""
        left_returncode = left.wait()

    if left_returncode != 0:
        raise RuntimeError(f"shp2pgsql failed ({left_returncode}): {left_stderr.strip()}")
    if right.returncode != 0:
        raise RuntimeError(
            "psql failed "
            f"({right.returncode}): {right.stderr.decode('utf-8', errors='replace').strip()}"
        )


def _run_psql_sql(sql: str, conn: DbConn) -> None:
    env = dict(os.environ)
    env["PGPASSWORD"] = conn.password
    result = subprocess.run(
        [
            str(PSQL),
            "-h",
            conn.host,
            "-p",
            str(conn.port),
            "-U",
            conn.user,
            "-d",
            conn.database,
            "-v",
            "ON_ERROR_STOP=1",
            "-c",
            sql,
        ],
        capture_output=True,
        env=env,
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError(
            "psql SQL failed "
            f"({result.returncode}): {result.stderr.decode('utf-8', errors='replace').strip()}"
        )


def _import_shapefile_to_temp(
    shp_path: Path,
    temp_table: str,
    conn: DbConn,
) -> None:
    if not shp_path.exists():
        raise FileNotFoundError(f"Shapefile missing: {shp_path}")
    if not SHP2PGSQL.exists():
        raise FileNotFoundError(f"shp2pgsql not found: {SHP2PGSQL}")
    if not PSQL.exists():
        raise FileNotFoundError(f"psql not found: {PSQL}")

    _run_psql_sql(f"DROP TABLE IF EXISTS {temp_table};", conn=conn)

    cmd_left = [
        str(SHP2PGSQL),
        "-c",  # create table
        "-D",  # dump format
        "-s",
        "4326:32629",
        str(shp_path),
        temp_table,
    ]
    cmd_right = [
        str(PSQL),
        "-h",
        conn.host,
        "-p",
        str(conn.port),
        "-U",
        conn.user,
        "-d",
        conn.database,
        "-v",
        "ON_ERROR_STOP=1",
    ]
    env = dict(os.environ)
    env["PGPASSWORD"] = conn.password
    _run_pipe(cmd_left, cmd_right, env)


def _discover_shape_files(shapes_root: Path) -> Iterable[Tuple[str, Path]]:
    for folder_name, iso_date in TARGET_SHAPES:
        folder = shapes_root / folder_name
        if not folder.exists():
            raise FileNotFoundError(f"Missing folder: {folder}")
        shape_files = list(folder.glob("*.shp"))
        if not shape_files:
            raise FileNotFoundError(f"No .shp found in: {folder}")
        if len(shape_files) > 1:
            raise RuntimeError(f"Multiple .shp found in {folder}; expected exactly one.")
        yield iso_date, shape_files[0]


def main() -> None:
    env = _read_env_file(ENV_PATH)
    db_url = env.get("DATABASE_URL")
    if not db_url:
        raise RuntimeError("DATABASE_URL introuvable dans backend/.env")

    conn_info = _parse_db_url(db_url)
    engine = create_engine(db_url.replace("postgresql+asyncpg://", "postgresql+psycopg://"), future=True)

    shape_inputs = list(_discover_shape_files(DEFAULT_SHAPES_DIR))
    temp_tables: List[Tuple[str, str]] = []

    # 1) Import raw shapefiles into temporary PostGIS tables.
    for iso_date, shp_path in shape_inputs:
        date_token = iso_date.replace("-", "")
        temp_table = f"sebou.tmp_flood_{date_token}"
        print(f"[IMPORT] {iso_date} <- {shp_path}")
        _import_shapefile_to_temp(shp_path=shp_path, temp_table=temp_table, conn=conn_info)
        temp_tables.append((iso_date, temp_table))

    # 2) Replace synthetic flood rows by user-provided shapes and update stats.
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM sebou.flood_extents"))
        conn.execute(text("UPDATE sebou.daily_statistics SET flood_area_km2 = NULL WHERE flood_area_km2 IS NOT NULL"))

        for iso_date, temp_table in temp_tables:
            date_value = datetime.strptime(iso_date, "%Y-%m-%d").date()
            # Dissolve all polygons from this shapefile into one multipolygon layer for cleaner rendering.
            conn.execute(
                text(
                    f"""
                    INSERT INTO sebou.flood_extents (
                        date,
                        area_km2,
                        detection_confidence,
                        sensor,
                        geom
                    )
                    SELECT
                        :target_date,
                        ST_Area(geom_union) / 1000000.0,
                        :confidence,
                        :sensor,
                        geom_union
                    FROM (
                        SELECT
                            ST_Multi(
                                ST_CollectionExtract(
                                    ST_MakeValid(
                                        ST_UnaryUnion(ST_Collect(ST_MakeValid(geom)))
                                    ),
                                    3
                                )
                            ) AS geom_union
                        FROM {temp_table}
                    ) AS dissolved
                    WHERE geom_union IS NOT NULL
                    """
                ),
                {
                    "target_date": date_value,
                    "confidence": 0.9,
                    "sensor": "Sentinel-1",
                },
            )

            flood_area = conn.execute(
                text(
                    """
                    SELECT area_km2
                    FROM sebou.flood_extents
                    WHERE date = :target_date
                    ORDER BY id DESC
                    LIMIT 1
                    """
                ),
                {"target_date": date_value},
            ).scalar_one_or_none()

            conn.execute(
                text(
                    """
                    INSERT INTO sebou.daily_statistics (
                        date,
                        flood_area_km2,
                        quality_score,
                        data_sources,
                        processing_time_seconds
                    )
                    VALUES (
                        :target_date,
                        :flood_area_km2,
                        :quality_score,
                        :data_sources,
                        :processing_time_seconds
                    )
                    ON CONFLICT (date) DO UPDATE SET
                        flood_area_km2 = EXCLUDED.flood_area_km2,
                        quality_score = EXCLUDED.quality_score,
                        data_sources = EXCLUDED.data_sources,
                        processing_time_seconds = EXCLUDED.processing_time_seconds
                    """
                ),
                {
                    "target_date": date_value,
                    "flood_area_km2": flood_area,
                    "quality_score": 90,
                    "data_sources": ["synthetic_shape_inondations_sebou"],
                    "processing_time_seconds": 45,
                },
            )

            conn.execute(
                text(
                    """
                    DELETE FROM sebou.quality_reports
                    WHERE processing_date = :target_date
                      AND sensor = 'Sentinel-1'
                    """
                ),
                {"target_date": date_value},
            )
            conn.execute(
                text(
                    """
                    INSERT INTO sebou.quality_reports (
                        processing_date,
                        sensor,
                        quality_flags,
                        validation_score
                    )
                    VALUES (
                        :target_date,
                        'Sentinel-1',
                        ARRAY[]::text[],
                        :validation_score
                    )
                    """
                ),
                {
                    "target_date": date_value,
                    "validation_score": 90,
                },
            )

        for _, temp_table in temp_tables:
            conn.execute(text(f"DROP TABLE IF EXISTS {temp_table}"))

    print("[DONE] Flood shapefiles imported and thematic flood data replaced.")


if __name__ == "__main__":
    main()
