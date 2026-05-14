# API_ENDPOINTS.md - Hydro Sentinel

## Configuration

- Base URL locale recommandee: `http://localhost:8000`
- Prefix API principal: `/api/v1`
- Format: JSON (sauf telechargement template xlsx et assets)
- Auth: JWT Bearer pour routes protegees
- Docs OpenAPI: `/docs`

## Priorite metier des APIs

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

Les endpoints les plus critiques pour la mission de decision crue sont:

1. Situation en temps quasi reel:
   - `/map/points-kpi`
   - `/dashboard/top-critical`
2. Analyse hydro-meteo multi-source:
   - `/measurements/timeseries`
   - `/measurements/compare`
3. Gouvernance de la donnee:
   - `/ingest/*`
   - `/admin/timeseries/*`
   - `/admin/entities/*`
4. Vision spatiale evenementielle:
   - `/thematic-maps/*`

## Detection des endpoints

Les endpoints ci-dessous sont extraits du code `backend/app/api/v1/endpoints/*.py`.

## Groupes d endpoints

### Authentification

- `POST /api/v1/login/access-token`
  - Login OAuth2 form, retourne token JWT.
- `GET /api/v1/me`
  - Retourne utilisateur courant (token requis).

### Sante

- `GET /api/v1/health`
  - Verifie backend + connexion DB (`SELECT 1`).

### Sites et referentiels

- `GET /api/v1/stations`
- `GET /api/v1/basins`
- `GET /api/v1/variables`

### Measurements

- `GET /api/v1/measurements/timeseries`
- `GET /api/v1/measurements/window/24h`
- `GET /api/v1/measurements/compare`
- `GET /api/v1/measurements/runs`

### Dashboard

- `GET /api/v1/map/points-kpi`
- `GET /api/v1/dashboard/top-critical`

### Ingestion fichiers

- `GET /api/v1/ingest/history`
- `POST /api/v1/ingest/analyze`
- `POST /api/v1/ingest/execute`

### Admin entites et templates

- `GET /api/v1/admin/entities/{entity_type}`
- `POST /api/v1/admin/entities/{entity_type}`
- `PUT /api/v1/admin/entities/{entity_type}/{entity_id}`
- `DELETE /api/v1/admin/entities/{entity_type}/{entity_id}`

- `GET /api/v1/admin/templates/simple`
- `GET /api/v1/admin/templates/simple-multi-source`
- `GET /api/v1/admin/templates/multi-variable`
- `GET /api/v1/admin/templates/multi-variable-multi-source`
- `GET /api/v1/admin/templates/multi-station`
- `GET /api/v1/admin/templates/multi-bassin`
- `HEAD /api/v1/admin/templates/multi-bassin`

- `POST /api/v1/admin/shp/upload`

### Admin data availability

Le routeur `data_availability` est monte avec prefix `/admin`:

- `POST /api/v1/admin/test-connection`
- `GET /api/v1/admin/data-availability`
- `GET /api/v1/admin/stations-with-data`
- `DELETE /api/v1/admin/data-availability/stations/{station_id}/variables/{variable_code}/sources/{source_code}`

### Admin timeseries

Le routeur `ts_management` est monte avec prefix `/admin`:

- `GET /api/v1/admin/timeseries/sources`
- `POST /api/v1/admin/timeseries/analyze`
- `POST /api/v1/admin/timeseries/upload`
- `GET /api/v1/admin/timeseries/{variable_code}`
- `GET /api/v1/admin/timeseries/{variable_code}/{station_id}`
- `POST /api/v1/admin/timeseries/{variable_code}/{station_id}`
- `DELETE /api/v1/admin/timeseries/{variable_code}/{station_id}/{timestamp}`
- `DELETE /api/v1/admin/timeseries/{variable_code}/{station_id}`

### Cartes thematiques

- `GET /api/v1/thematic-maps/{map_type}`
- `GET /api/v1/thematic-maps/{map_type}/history`
- `GET /api/v1/thematic-maps/{map_type}/products/{product_id}`
- `GET /api/v1/thematic-maps/assets/{map_type}/{product_id}/{file_path}`

### Routes de test

- `GET /api/v1/test/test/geo-stations`
- `GET /api/v1/test/test/geo-basins`

## Codes HTTP utilises

- `200` succes lecture/suppression.
- `201` non standardise globalement.
- `400` erreur validation/metier.
- `401` token absent/invalide (selon route).
- `403` credentials non valides (`get_current_user`).
- `404` ressource absente.
- `422` validation FastAPI.
- `500` erreur interne.

## Pagination et limites

- Plusieurs routes utilisent `skip/limit` (ex: `/stations`, `/basins`).
- Plusieurs routes imposent `LIMIT` SQL interne.
- Pas de contrat global de pagination unifie dans le code actuel.

## Rate limiting

- Aucun middleware rate-limit detecte dans le code actuel.
- Recommendation:
  - 60 req/min token standard.
  - 300 req/min admin.
  - 10 req/min endpoints upload.

## Ecarts backend/frontend detectes

- Frontend appelle `GET /alerts` via `api.getAlerts`, mais route absente de l API principale.
- Frontend appelle `GET /ingestions` via `api.getIngestions`, mais route principale disponible est `GET /ingest/history`.
- Un endpoint alert existe dans l app Sebou separee (`app/sebou_monitoring/api/main.py`), pas dans `app.main`.

## Recommandations API immediates

1. Soit exposer `GET /api/v1/alerts`, soit supprimer l appel frontend.
2. Remplacer `api.getIngestions()` par `api.getIngestionsHistory()` dans hooks frontend.
3. Corriger prefix route test pour eviter `.../test/test/...`.
