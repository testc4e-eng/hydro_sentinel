# Sebou Monitoring - Phase 1 (implementation isolatee)

Ce module ajoute une base technique pour le monitoring neige/inondation du bassin du Sebou,
sans modifier les APIs metier existantes.

## 1) Fichiers ajoutes

- `app/sebou_monitoring/config.py`
- `app/sebou_monitoring/gee_client.py`
- `app/sebou_monitoring/acquisition/data_acquirer.py`
- `app/sebou_monitoring/preprocessing/preprocessor.py`
- `app/sebou_monitoring/detection/snow_detector.py`
- `app/sebou_monitoring/setup_paths.py`
- `app/sebou_monitoring/smoke_test.py`
- `app/db/sebou_monitoring_schema.sql`
- `config/sebou/config.example.yaml`
- `requirements-sebou.txt`
- `tests/test_sebou_phase1_smoke.py`

## 2) Installation dependances Sebou

Depuis `backend/`:

```powershell
pip install -r requirements-sebou.txt
```

## 3) Initialiser la base Sebou (PostGIS)

Depuis PostgreSQL:

```sql
\i backend/app/db/sebou_monitoring_schema.sql
```

Le script cree un schema dedie `sebou` pour eviter tout conflit avec les schemas existants.

## 4) Configurer le module

Copier:

- `config/sebou/config.example.yaml` -> `config/sebou/config.yaml`

Puis renseigner:

- `basin.asset_id` (ou conserver bbox fallback)
- `gee.project`, `gee.service_account`, `gee.key_file`
- variables d'env (`DB_PASSWORD`, `GEE_PROJECT`, etc.)

## 5) Creer l'arborescence data

```powershell
python -c "from app.sebou_monitoring.setup_paths import ensure_data_directories; ensure_data_directories('config/sebou/config.yaml')"
```

## 6) Smoke tests

Sans GEE (offline):

```powershell
pytest tests/test_sebou_phase1_smoke.py
python -m app.sebou_monitoring.smoke_test --config config/sebou/config.example.yaml
```

Avec GEE:

```powershell
python -m app.sebou_monitoring.smoke_test --config config/sebou/config.yaml --with-gee
```

## 7) Scope volontairement limite

Cette phase couvre:

- Configuration module Sebou
- Acquisition multi-sources (MODIS/S1/S2)
- Pretraitement (qualite, nuages, speckle, correction topo)
- Detection neige (NDSI adaptatif + post-traitement + metriques)
- Schema SQL dedie Sebou

Cette phase ne branche pas encore:

- orchestration quotidienne 06:00 UTC
- detection inondation evenementielle
- endpoints API publics relies aux sorties pipeline
- publication COG/GeoJSON automatique
