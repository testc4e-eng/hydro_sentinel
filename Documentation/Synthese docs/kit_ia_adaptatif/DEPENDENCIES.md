# DEPENDENCIES.md - Hydro Sentinel

## Objectif

Lister les dependances runtime/build/tests detectees dans ce repo, avec leur role et leur criticite.

## Lecture metier des dependances

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

Dependances critiques pour la vision globale:

- FastAPI/SQLAlchemy: exposition fiable des indicateurs et services de decision.
- React/Query/Axios: cockpit dashboard reponse rapide (carte, KPI, analyses).
- Geo stack (PostGIS, GeoPandas, Rasterio): contexte spatial bassin + cartes thematiques.
- Earth Engine (module Sebou): production flood/snow pour anticipation evenementielle.

## Backend principal (`backend/requirements.txt`)

Dependances coeur:

- `fastapi==0.109.2`
- `uvicorn==0.27.1`
- `sqlalchemy==2.0.27`
- `alembic==1.13.1`
- `pydantic==2.6.1`
- `pydantic-settings==2.2.1`

DB et async:

- `asyncpg==0.29.0`
- `aiosqlite==0.19.0`
- `geoalchemy2==0.17.1`

Securite/auth:

- `python-jose[cryptography]==3.3.0`
- `passlib[bcrypt]==1.7.4` (code utilise PBKDF2)
- `python-multipart==0.0.9`

Geo et data:

- `shapely==2.0.7`
- `openpyxl==3.1.5`
- `numpy==1.26.4`
- `rasterio==1.4.4`

Test:

- `pytest==8.0.0`
- `httpx==0.26.0`

## Module Sebou (`backend/requirements-sebou.txt`)

- `earthengine-api==0.1.384`
- `geopandas==0.14.1`
- `rasterio==1.3.9`
- `GDAL==3.8.0`
- `GeoAlchemy2==0.14.2`
- `pandas==2.1.4`
- `scikit-learn==1.3.2`
- `pyyaml==6.0.1`
- `schedule==1.2.0`

Note:

- `rasterio` et `GeoAlchemy2` existent deja dans requirements principal, versions differentes.
- En production il faut fixer une strategie de resolution de versions (lock unique).

## Frontend (`hydro-sentinel/package.json`)

Core:

- `react`, `react-dom`, `typescript`, `vite`
- `react-router-dom`
- `@tanstack/react-query`
- `axios`
- `zustand`

UI/visualisation:

- Tailwind + Radix UI + shadcn stack
- `leaflet`, `react-leaflet`, `maplibre-gl`
- `recharts`, `echarts`

Validation/forms:

- `zod`, `react-hook-form`, `@hookform/resolvers`

Tests/lint:

- `vitest`, `@testing-library/*`, `eslint`, `typescript-eslint`

## Outils runtime externes

- PostgreSQL + PostGIS
- Optionnel TimescaleDB
- Earth Engine (module Sebou)
- Node/npm

## Incompatibilites ou risques detectes

1. Double definitions de versions geo entre `requirements.txt` et `requirements-sebou.txt`.
2. GDAL/GeoPandas peuvent casser en environnement Windows sans prerequis natifs.
3. Pas de lockfile Python global (`requirements` pin mais pas compile unique).

## Recommandations

1. Creer un fichier `requirements-all.txt` compile (`pip-tools`) pour environnements complets.
2. Separer profils install:
   - `core-api`
   - `sebou-pipeline`
3. Ajouter une note d install GDAL par OS dans doc de deploiement.
