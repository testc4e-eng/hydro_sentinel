from __future__ import annotations

import json
import os
import tempfile
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db

router = APIRouter()


def _normalize(text_value: Any) -> str:
    raw = str(text_value or "").strip().lower()
    return "".join(ch for ch in raw if ch.isalnum() or ch in {" ", "_", "-"})


def _ensure_geopandas():
    try:
        import geopandas as gpd  # noqa: F401
        return
    except ModuleNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail="geopandas est requis pour l'import spatial. Installer: pip install geopandas shapely pyproj fiona",
        ) from exc


def _guess_name_column(columns: List[str]) -> Optional[str]:
    priorities = ["nom_bassin", "bassin", "name", "nom", "id_bv", "code"]
    lowered = {c.lower(): c for c in columns}
    for key in priorities:
        if key in lowered:
            return lowered[key]
    return columns[0] if columns else None


async def _ensure_geometries_table(db: AsyncSession) -> None:
    await db.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS geometries_bassins (
              id SERIAL PRIMARY KEY,
              bassin_id UUID REFERENCES geo.basin(basin_id),
              type_geo VARCHAR(50),
              geom GEOMETRY(Geometry, 4326),
              source VARCHAR(50),
              date_import TIMESTAMP DEFAULT NOW(),
              fichier_origine VARCHAR(255),
              superficie_km2 DOUBLE PRECISION,
              crs_original VARCHAR(50)
            )
            """
        )
    )
    await db.execute(text("CREATE INDEX IF NOT EXISTS idx_geom_bassins ON geometries_bassins USING GIST(geom)"))


async def _load_basin_reference(db: AsyncSession) -> List[Dict[str, Any]]:
    res = await db.execute(text("SELECT basin_id::text AS basin_id, name FROM geo.basin"))
    return [dict(r) for r in res.mappings().all()]


@router.post("/import/spatial")
async def import_spatial(
    format: str = Form(...),
    crs_source: str = Form("EPSG:4326"),
    crs_cible: str = Form("EPSG:4326"),
    colonne_nom: Optional[str] = Form(None),
    type_geo: str = Form("bassin_versant"),
    remplacer: bool = Form(False),
    analyze_only: bool = Form(True),
    fichiers: List[UploadFile] = File(...),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    _ensure_geopandas()
    import geopandas as gpd

    normalized_format = (format or "").strip().lower()
    if normalized_format not in {"shapefile", "geojson", "gpkg"}:
        raise HTTPException(status_code=400, detail="format invalide. Utiliser shapefile, geojson ou gpkg")
    if not fichiers:
        raise HTTPException(status_code=400, detail="Aucun fichier recu")

    with tempfile.TemporaryDirectory() as tmpdir:
        saved_paths: List[Path] = []
        for up in fichiers:
            filename = Path(up.filename or "").name
            if not filename:
                continue
            dest = Path(tmpdir) / filename
            content = await up.read()
            dest.write_bytes(content)
            saved_paths.append(dest)

        if not saved_paths:
            raise HTTPException(status_code=400, detail="Fichiers invalides")

        shp_path: Optional[Path] = None
        if normalized_format == "shapefile":
            required_ext = {".shp", ".dbf", ".prj"}
            found_ext = {p.suffix.lower() for p in saved_paths}
            missing = sorted(list(required_ext - found_ext))
            if missing:
                raise HTTPException(status_code=400, detail=f"Fichiers shapefile manquants: {', '.join(missing)}")
            shp_candidates = [p for p in saved_paths if p.suffix.lower() == ".shp"]
            if not shp_candidates:
                raise HTTPException(status_code=400, detail="Fichier .shp manquant")
            shp_path = shp_candidates[0]
            gdf = gpd.read_file(shp_path)
            source_file_name = shp_path.name
        elif normalized_format == "geojson":
            gj = next((p for p in saved_paths if p.suffix.lower() in {".geojson", ".json"}), None)
            if gj is None:
                raise HTTPException(status_code=400, detail="Fichier GeoJSON manquant")
            gdf = gpd.read_file(gj)
            source_file_name = gj.name
        else:
            gpkg = next((p for p in saved_paths if p.suffix.lower() == ".gpkg"), None)
            if gpkg is None:
                raise HTTPException(status_code=400, detail="Fichier GPKG manquant")
            gdf = gpd.read_file(gpkg)
            source_file_name = gpkg.name

        if gdf.empty:
            raise HTTPException(status_code=400, detail="Le fichier ne contient aucune entite geographique")

        detected_crs = str(gdf.crs) if gdf.crs else None
        if gdf.crs is None:
            gdf = gdf.set_crs(crs_source or "EPSG:4326")
            detected_crs = crs_source or "EPSG:4326"

        try:
            gdf = gdf.to_crs(crs_cible or "EPSG:4326")
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Impossible de reprojeter vers {crs_cible}: {exc}") from exc

        attribute_columns = [c for c in gdf.columns if c != gdf.geometry.name]
        chosen_col = colonne_nom or _guess_name_column(attribute_columns)
        if not chosen_col or chosen_col not in gdf.columns:
            raise HTTPException(status_code=400, detail="colonne_nom invalide ou introuvable dans le fichier")

        gdf["__bassin_name__"] = gdf[chosen_col].astype(str).str.strip()
        basin_names_detected = sorted({n for n in gdf["__bassin_name__"].tolist() if n and n != "nan"})

        db_basins = await _load_basin_reference(db)
        db_lookup = {_normalize(b["name"]): b for b in db_basins}
        matched: Dict[str, str] = {}
        non_matched: List[str] = []
        for basin_name in basin_names_detected:
            key = _normalize(basin_name)
            if key in db_lookup:
                matched[basin_name] = db_lookup[key]["basin_id"]
            else:
                non_matched.append(basin_name)

        gdf_area = gdf.to_crs("EPSG:3857")
        gdf["__area_km2__"] = gdf_area.geometry.area / 1_000_000.0
        area_by_name: Dict[str, float] = {}
        for basin_name, area in zip(gdf["__bassin_name__"], gdf["__area_km2__"]):
            if not basin_name or basin_name == "nan":
                continue
            area_by_name[basin_name] = area_by_name.get(basin_name, 0.0) + float(area or 0.0)

        report = {
            "status": "success",
            "mode": "spatial_dgm",
            "format": normalized_format,
            "rows_count": int(len(gdf)),
            "entites_detectees": int(len(gdf)),
            "projection_detectee": detected_crs,
            "crs_source": crs_source,
            "crs_cible": crs_cible,
            "columns": attribute_columns,
            "colonne_nom_utilisee": chosen_col,
            "bassins_detectes": basin_names_detected,
            "match_count": len(matched),
            "non_matches": non_matched,
            "superficie": {k: round(v, 3) for k, v in area_by_name.items()},
            "avertissements": [
                f"{name} non trouve dans la base - creer d'abord le bassin" for name in non_matched
            ],
            "preview": gdf.head(5).drop(columns=[gdf.geometry.name]).fillna("").to_dict(orient="records"),
        }

        if analyze_only:
            return report

        await _ensure_geometries_table(db)

        imported = 0
        for _, row in gdf.iterrows():
            basin_name = str(row["__bassin_name__"]).strip()
            if not basin_name or basin_name == "nan":
                continue
            basin_id = matched.get(basin_name)
            if not basin_id:
                continue

            geom = row.geometry
            if geom is None or geom.is_empty:
                continue

            if remplacer:
                await db.execute(
                    text(
                        """
                        DELETE FROM geometries_bassins
                        WHERE bassin_id = CAST(:bassin_id AS UUID)
                          AND type_geo = :type_geo
                          AND source = 'DGM'
                        """
                    ),
                    {"bassin_id": basin_id, "type_geo": type_geo},
                )

            await db.execute(
                text(
                    """
                    INSERT INTO geometries_bassins
                    (bassin_id, type_geo, geom, source, date_import, fichier_origine, superficie_km2, crs_original)
                    VALUES
                    (CAST(:bassin_id AS UUID), :type_geo, ST_GeomFromText(:wkt, 4326), 'DGM', :date_import, :fichier_origine, :superficie_km2, :crs_original)
                    """
                ),
                {
                    "bassin_id": basin_id,
                    "type_geo": type_geo,
                    "wkt": geom.wkt,
                    "date_import": datetime.utcnow(),
                    "fichier_origine": source_file_name,
                    "superficie_km2": float(row.get("__area_km2__", 0.0) or 0.0),
                    "crs_original": detected_crs,
                },
            )
            imported += 1

        await db.commit()

        return {
            **report,
            "importes": imported,
            "non_matches": non_matched,
        }
