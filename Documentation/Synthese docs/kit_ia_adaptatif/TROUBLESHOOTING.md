# TROUBLESHOOTING.md - Hydro Sentinel

## Methode de diagnostic rapide

1. Verifier backend:
   - `http://localhost:8000/api/v1/health`
2. Verifier frontend:
   - `http://localhost:5173`
3. Verifier DB cible:
   - controle de `DATABASE_URL`
4. Verifier routes attendues:
   - comparer `src/lib/api.ts` et endpoints backend reels.

## Priorite de diagnostic metier

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

En cas d incident, traiter d abord les parcours a impact operationnel:

1. Carte & Synthese (`/map/points-kpi`, `/dashboard/top-critical`)
2. Analyses temporelles (`/measurements/timeseries`)
3. Import et correction de donnees (`/ingest/*`, `/admin/timeseries/*`)
4. Cartes thematiques (`/thematic-maps/*`)

## Erreurs backend (FastAPI)

### Erreur 500 sur endpoint data

Causes frequentes:

- Vue SQL `api.v_*` absente.
- Table `geo/ts/ref` absente.
- Incoherence type UUID.

Verification:

```sql
SELECT to_regclass('api.v_station');
SELECT to_regclass('ts.measurement');
SELECT to_regclass('ref.variable');
```

### Erreur auth login

Symptomes:

- `Incorrect email or password`
- `Inactive user`

Verification:

```sql
SELECT email, is_active FROM auth."user" WHERE email = :email;
```

### Erreur CORS

Verifier:

- `BACKEND_CORS_ORIGINS`
- `BACKEND_CORS_ORIGIN_REGEX`
- port frontend reel (`5173`).

## Erreurs frontend (React/Vite)

### API KO malgre backend OK

Verifier:

- `VITE_API_BASE_URL`
- `VITE_API_PREFIX`
- valeur finale de `apiRoot` dans `src/lib/api.ts`

### Page import sans historique

Cause possible:

- hook utilise endpoint `/ingestions` inexistant cote backend principal.

Fix:

- utiliser `GET /ingest/history` deja implemente.

### Alerts vides/inaccessibles

Cause possible:

- frontend appelle `/alerts` non expose dans API principale.

Fix:

- exposer route dans API principale ou retirer l appel frontend.

## Erreurs DB geospatial

### Fonctions ST_* indisponibles

Cause: extension PostGIS absente.

Fix:

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_raster;
```

### Erreurs sur series temporelles

Verifier index et volume:

```sql
SELECT COUNT(*) FROM ts.measurement;
EXPLAIN ANALYZE
SELECT * FROM ts.measurement
WHERE station_id = :id
ORDER BY time DESC
LIMIT 1000;
```

## Erreurs import fichiers

### Analyze/upload timeseries echoue

Causes:

- colonne timestamp introuvable.
- format date non parseable.
- source/variable non resolue.

Actions:

1. Tester `POST /api/v1/admin/timeseries/analyze` avant upload.
2. Verifier `source_code` (`OBS`, `SIM`, `AROME`, `ECMWF`, `AUTO`).
3. Verifier format ISO datetime.

### Upload SHP echoue

Causes:

- zip sans `.shp`.
- CRS non reconnu.
- mapping colonnes incomplet.

Actions:

1. envoyer ZIP complet (`.shp`, `.shx`, `.dbf`, `.prj`).
2. utiliser `dry_run=true`.
3. verifier `entity_type` (`stations`/`bassins`).

## Erreurs module Sebou

### Earth Engine non initialise

Verifier variables:

- `GEE_PROJECT`
- `GEE_SERVICE_ACCOUNT`
- `GEE_KEY_FILE`

### Pipeline Sebou ne produit rien

Verifier:

- config YAML valide.
- acces DB schema `sebou`.
- capteurs disponibles sur la fenetre temporelle.

## Commandes utiles

```powershell
# Backend logs runtime
cd backend
uvicorn app.main:app --reload --port 8000

# Tests backend
pytest -q tests/test_sebou_phase1_smoke.py tests/test_pipeline.py

# Frontend checks
cd ..\hydro-sentinel
npm run lint
npm test
```

## FAQ courte

- Q: Pourquoi `/api/v1/health` dit `db_status=disconnected` ?
  - R: `DATABASE_URL` pointe vers DB indisponible ou credentials invalides.

- Q: Pourquoi le dashboard est vide ?
  - R: vues `api.v_map_points_kpi`/`api.v_top_critical_24h` absentes ou sans donnees.

- Q: Pourquoi les templates ne se telechargent pas ?
  - R: verifier routes `/api/v1/admin/templates/*` et droits CORS/auth.
