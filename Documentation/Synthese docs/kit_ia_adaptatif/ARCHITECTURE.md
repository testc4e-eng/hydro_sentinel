# ARCHITECTURE.md - Hydro Sentinel

## Vue d ensemble

Hydro Sentinel est un monorepo compose de deux blocs actifs:

- `backend/`: API FastAPI + acces DB + import data + endpoints admin.
- `hydro-sentinel/`: UI React/Vite pour dashboard, cartes, analyses, imports.

Un troisieme bloc existe pour la detection satellite Sebou:

- `backend/app/sebou_monitoring/`: pipeline acquisition/detection/export + API read-only separee.

## Ancrage metier (vision globale)

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

L architecture doit rester orientee "centre de controle hydrologique":

- bloc dashboard pour visualiser l etat courant (KPI, criticite, cartographie),
- bloc analytique pour comparer OBS/PREV/SIM et suivre tendances,
- bloc admin/import pour maintenir la qualite et la continuite des donnees,
- bloc thematique satellite pour completer la decision crue (flood/snow).

## Diagramme haut niveau

```text
[Browser]
   |
   v
[React/Vite Frontend]
   |
   v  HTTP JSON
[FastAPI Main API /api/v1]
   |
   +--> [Schemas SQL: api, geo, ts, ref, auth]
   |
   +--> [Schema sebou] (thematic maps + stats)
   |
   +--> [File processing: csv/xlsx/shp]

[Sebou Pipeline] --(Earth Engine + PostGIS exports)--> [schema sebou + fichiers]
```

## Structure projet

- `backend/app/main.py`: app FastAPI principale, CORS, exception handler global.
- `backend/app/api/v1/api.py`: routeur v1 et agrégation des endpoints.
- `backend/app/api/v1/endpoints/`: modules de routes metier.
- `backend/app/db/`: engine/session/init SQL.
- `backend/app/models/` + `backend/app/schemas/`: modeles ORM et contrats.
- `backend/app/sebou_monitoring/`: module pipeline geospatial.
- `hydro-sentinel/src/lib/api.ts`: client HTTP central frontend.
- `hydro-sentinel/src/hooks/useApi.ts`: hooks React Query.

## Composants principaux

### Backend API (FastAPI)

- Prefix global: `/api/v1`.
- Auth JWT: `/login/access-token`, `/me`.
- Data read: `/stations`, `/basins`, `/variables`, `/measurements/*`.
- Admin: `/admin/entities/*`, `/admin/templates/*`, `/admin/shp/upload`, `/admin/timeseries/*`.
- Ingestion: `/ingest/analyze`, `/ingest/execute`, `/ingest/history`.
- Thematic maps: `/thematic-maps/*`.

### Frontend (React/Vite)

- Routing applicatif et pages metier (dashboard, stations, barrages, import, thematic maps).
- Data fetching via TanStack Query.
- Auth state via Zustand persistant.
- Axios interceptors pour token Bearer + logout sur 401.

### Base de donnees

- Backend principal: forte dependance aux vues `api.v_*` et tables `geo.*`, `ts.*`, `ref.*`, `auth.*`.
- Schema `sebou`: definit dans `backend/app/db/sebou_monitoring_schema.sql`.
- SQLite disponible en fallback local via `DATABASE_URL` par defaut.

### Moteur geospatial Sebou

- Pipeline:
  - acquisition: MODIS/Sentinel-1/Sentinel-2.
  - preprocessing image.
  - detection neige/inondation.
  - export geojson/raster + insertion DB schema `sebou`.
- API read-only separee dans `app/sebou_monitoring/api/main.py`.

## Flux de donnees

### Flux 1: Authentification

1. Frontend envoie credentials a `/api/v1/login/access-token`.
2. Backend verifie utilisateur `auth.user`.
3. Backend retourne JWT.
4. Frontend stocke token et l injecte sur appels suivants.

### Flux 2: Dashboard KPI

1. Hooks frontend appellent `/api/v1/map/points-kpi` et `/api/v1/dashboard/top-critical`.
2. Backend execute SQL enrichi sur vues/tables `api`, `ts`, `ref`, `geo`.
3. Frontend affiche cartes, severite, scores, courbes.

### Flux 3: Import timeseries

1. Upload fichier via `/api/v1/admin/timeseries/analyze`.
2. Validation structure colonnes/timestamp/sources.
3. Import effectif via `/api/v1/admin/timeseries/upload`.
4. Ecriture dans `ts.measurement`.

### Flux 4: Cartes thematiques

1. Frontend appelle `/api/v1/thematic-maps/{map_type}`.
2. Backend lit JSON statique `backend/data/thematic_maps/*.json`.
3. Si disponible, backend enrichit depuis schema `sebou`.
4. Frontend charge catalogue/historique/produit.

## Patterns et conventions

- Endpoint -> SQL/ORM -> schema Pydantic -> JSON.
- SQL explicite frequente pour controler geometrie/postgis.
- Multi-sources normalisees sur codes (`OBS`, `SIM`, `AROME`, `ECMWF`).
- UI basee sur hooks `useApi` pour centraliser revalidation/cache.

## Scalabilite

- Limites actuelles: queries SQL lourdes inline dans endpoints, pas de cache API explicite.
- Opportunites:
  - materialized views pour KPI lourds.
  - cache HTTP ou redis pour endpoints dashboard.
  - extraction service layer pour requetes critiques.

## Securite

- JWT HS256, hash password via PBKDF2.
- CORS configurable (`BACKEND_CORS_ORIGINS` + regex).
- Risque present: certaines requetes SQL utilisent interpolation f-string avec UUID cast.
- Priorite: uniformiser parametres SQL bindes partout.

## Dette et ecarts detectes

- Frontend expose des appels `/alerts` et `/ingestions` qui ne correspondent pas aux routes backend principales.
- Route de test exposee en double prefix (`/api/v1/test/test/...`).
- Endpoints Sebou API et API principale ont des domaines proches mais execution separee.
