# PROJECT_STRUCTURE.md - Hydro Sentinel

## Arborescence principale

```text
hydro-sentinel-app/
|- backend/
|  |- app/
|  |  |- api/
|  |  |  |- v1/
|  |  |  |  |- endpoints/
|  |  |- core/
|  |  |- db/
|  |  |- models/
|  |  |- schemas/
|  |  |- services/
|  |  |- sebou_monitoring/
|  |- tests/
|  |- docs/
|  |- config/sebou/
|  |- requirements.txt
|  |- requirements-sebou.txt
|  |- vercel.json
|
|- hydro-sentinel/
|  |- src/
|  |  |- components/
|  |  |- hooks/
|  |  |- lib/
|  |  |- pages/
|  |  |- store/
|  |  |- test/
|  |  |- types/
|  |- public/
|  |- package.json
|
|- docs/
|  |- kit_ia_adaptatif/
|
|- ARCHITECTURE.md
|- ENVIRONNEMENTS.md
|- README.md
```

## Lecture metier de la structure

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

La structure projet est organisee autour de 4 blocs metier:

1. `dashboard & analyse` (frontend pages/components),
2. `api decisionnelle` (endpoints KPI/mesures/admin),
3. `gouvernance donnee` (ingestion, templates, CRUD geo, scan),
4. `intelligence spatiale` (module Sebou thematique flood/snow).

## Backend detail

- `app/main.py`: creation app FastAPI.
- `app/api/v1/api.py`: inclusion des routeurs.
- `app/api/v1/endpoints/`: logique endpoint par domaine:
  - auth, health, sites, variables, measurements
  - dashboard, ingest, thematic_maps
  - admin_new, data_availability, ts_management
- `app/db/session.py`: engine/session async.
- `app/core/config.py`: settings env.
- `app/core/security.py`: hash+JWT.
- `app/sebou_monitoring/`: pipeline satellite complet.

## Frontend detail

- `src/lib/api.ts`: client axios central.
- `src/hooks/useApi.ts`: hooks React Query.
- `src/store/authStore.ts`: token/user state.
- `src/pages/`: ecrans fonctionnels.
- `src/components/`: composants UI + metier.

## Fichiers SQL et data

- `backend/app/db/sebou_monitoring_schema.sql`: schema dedie Sebou.
- `backend/data/thematic_maps/*.json`: catalogues cartes thematiques.

## Scripts utilitaires

Le dossier `backend/` contient de nombreux scripts debug/inspection/import.
Convention recommande:

- distinguer scripts production vs scripts debug.
- documenter scripts supportes officiellement.

## Docs existantes detectees

- `README.md`
- `ARCHITECTURE.md`
- `ENVIRONNEMENTS.md`
- `backend/docs/USER_GUIDE.md`
- `backend/docs/DEPLOYMENT_CHECKLIST.md`
- `backend/SEBOU_MONITORING_PHASE1.md`

## Zones a clarifier

1. Source de verite DDL pour schemas `api/geo/ts/ref/auth`.
2. Frontiere entre API principale et API Sebou read-only.
3. Liste officielle des scripts backend a conserver.
