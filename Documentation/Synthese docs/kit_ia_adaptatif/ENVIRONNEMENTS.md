# ENVIRONNEMENTS.md - Hydro Sentinel

## Vue rapide

Ce projet fonctionne avec 2 apps principales:

- Backend FastAPI (`backend/`)
- Frontend React/Vite (`hydro-sentinel/`)

Un module satellite Sebou ajoute des besoins supplementaires (`backend/requirements-sebou.txt`).

## Vision globale en execution

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

En environnement cible, la chaine complete doit permettre:

1. ingestion et qualite de donnees hydro-meteo,
2. visualisation decisionnelle sur dashboard (carte/KPI/criticite),
3. analyse multi-source pour arbitrage operationnel,
4. consultation cartes thematiques flood/snow.

## Prerequis machine

- Python 3.11+ recommande.
- Node.js 18+ recommande.
- PostgreSQL + PostGIS pour environnement complet.
- Optionnel: Earth Engine + GDAL stack pour pipeline Sebou.

## Configuration par composant

### Backend (FastAPI)

#### Stack

- `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`.
- `asyncpg`, `aiosqlite`, `geoalchemy2`.
- `python-jose`, `passlib`, `python-multipart`.

#### Variables d environnement

Source: `backend/app/core/config.py` + `backend/.env`.

Variables critiques:

- `API_V1_STR` (defaut `/api/v1`)
- `DATABASE_URL` (defaut sqlite async)
- `BACKEND_CORS_ORIGINS`
- `BACKEND_CORS_ORIGIN_REGEX`
- `SECRET_KEY`
- `ACCESS_TOKEN_EXPIRE_MINUTES`

#### Installation

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

#### Lancement

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

### Frontend (React/Vite)

Variables attendues:

- `VITE_API_BASE_URL`
- `VITE_API_PREFIX`
- `VITE_THEMATIC_DEMO_ONLY` (optionnel)

Installation et run:

```powershell
cd hydro-sentinel
npm install
npm run dev
```

### Base de donnees

- Mode local simple: SQLite via `sqlite+aiosqlite:///./sql_app.db`.
- Mode cible recommande: PostgreSQL + PostGIS (+ Timescale selon schema metier).
- Schema Sebou fourni: `backend/app/db/sebou_monitoring_schema.sql`.

### Module Sebou (optionnel)

Dependances:

```powershell
cd backend
pip install -r requirements-sebou.txt
```

Configuration:

```powershell
copy config\sebou\config.example.yaml config\sebou\config.yaml
```

Variables usuelles:

- `DB_PASSWORD`
- `GEE_PROJECT`
- `GEE_SERVICE_ACCOUNT`
- `GEE_KEY_FILE`

## Ports et URLs

Recommande local:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/v1/health`

## Checklist de demarrage

1. Backend demarre sans erreur.
2. Frontend charge sur `5173`.
3. `GET /api/v1/health` retourne `status=ok`.
4. Login fonctionne et token est stocke.
5. Un endpoint metier (`/stations` ou `/variables`) repond.

## Points d attention

- Les vues SQL `api.v_*` doivent exister pour une grande partie des endpoints.
- Certains appels frontend attendent des routes non exposees par l API principale (`/alerts`, `/ingestions`).
- Le module Sebou API (`app/sebou_monitoring/api/main.py`) est une app distincte de `app.main`.
