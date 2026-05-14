# DEPLOYMENT.md - Hydro Sentinel

## Objectif

Decrire une strategie de deploiement realiste pour:

- API principale FastAPI
- Frontend React/Vite
- module Sebou (optionnel)

## Objectif operationnel metier

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

Le deploiement doit prioriser la continuite du service en periode sensible (pluie/crue):

- disponibilite du dashboard principal (carte + KPI + top vigilance),
- disponibilite des parcours d analyse et de pilotage barrage,
- disponibilite des parcours import/admin pour corriger rapidement les donnees,
- disponibilite des cartes thematiques pour lecture spatiale evenementielle.

## Prerequis

- PostgreSQL avec schemas requis (`api`, `geo`, `ts`, `ref`, `auth`, `sebou`).
- Extensions geospatial (PostGIS au minimum).
- Secrets geres en variables d environnement.
- Build frontend passe (`npm run build`).

## Option A (recommandee) - Deploiement classique

### Backend

1. Provisionner VM/Container Python.
2. Installer dependencies:
   - `requirements.txt`
   - `requirements-sebou.txt` si module actif.
3. Configurer `backend/.env`:
   - `DATABASE_URL`
   - `SECRET_KEY`
   - CORS.
4. Lancer avec process manager (gunicorn/uvicorn workers).

Exemple:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend

1. Build static:
   - `npm run build`
2. Publier `dist/` via Nginx ou plateforme statique.
3. Injecter variables `VITE_API_BASE_URL` et `VITE_API_PREFIX` au build.

## Option B - Vercel backend (partielle)

Le repo contient:

- `backend/vercel.json`
- `backend/api/index.py` -> `from app.main import app`

Utilisable pour exposition serverless, mais a valider avec besoins geospatial/long running.

## Module Sebou (optionnel)

Si pipeline actif:

1. Configurer `config/sebou/config.yaml`.
2. Planifier execution quotidienne (cron/ordonnanceur).
3. Verifier acces Earth Engine et ecriture DB schema `sebou`.

Commande type:

```bash
python -m app.sebou_monitoring.pipeline.main_pipeline --config config/sebou/config.yaml
```

## Checklist pre-deploiement

1. Tests backend passes.
2. Tests frontend passes.
3. `GET /api/v1/health` ok en env cible.
4. Endpoints critiques verifies:
   - auth
   - stations/basins
   - timeseries admin
   - thematic maps
5. Logs et monitoring actives.

## Monitoring minimum

- health probe toutes les 60s.
- logs erreurs centralises.
- alerte sur taux 5xx.
- alerte sur latence endpoint critiques.

## Rollback

1. Garder version n-1 deployable.
2. Si regression:
   - revenir image/artifact precedent
   - restaurer variable env precedentes
   - verifier health + endpoints critiques

## Gaps actuels

- Pas de pipeline CI/CD versionne dans `.github/workflows`.
- Pas de manifest docker officiel detecte a la racine.
- Pas de migration SQL centralisee pour schemas `api/geo/ts/ref/auth` dans ce repo.

## Recommandations court terme

1. Ajouter pipeline CI (lint + tests backend/frontend).
2. Ajouter migration versionnee pour schemas SQL manquants.
3. Standardiser environnement API (ports, prefix, CORS, secrets).
