# Guide Utilisateur - Sebou Monitoring

## Prerequis
- Python 3.10+
- PostgreSQL 14+ avec PostGIS
- Compte Google Earth Engine (service account recommande)

## Installation rapide
```bash
cd backend
python -m venv .venv
. .venv/Scripts/Activate.ps1
pip install -r requirements.txt
pip install -r requirements-sebou.txt
```

## Configuration
1. Copier le fichier exemple:
```bash
copy config\sebou\config.example.yaml config\sebou\config.yaml
```
2. Renseigner les variables d'environnement:
- `DB_PASSWORD`
- `GEE_PROJECT`
- `GEE_SERVICE_ACCOUNT`
- `GEE_KEY_FILE`

## Lancer le pipeline
Traitement de la veille (UTC):
```bash
python -m app.sebou_monitoring.pipeline.main_pipeline --config config/sebou/config.yaml
```

Traitement d'une date specifique:
```bash
python -m app.sebou_monitoring.pipeline.main_pipeline --config config/sebou/config.yaml --date 2026-03-06
```

## Lancer l'API Sebou
```bash
uvicorn app.sebou_monitoring.api.main:app --host 0.0.0.0 --port 8000
```

## Endpoints principaux
- `GET /health`
- `GET /stats/daily/{target_date}`
- `GET /stats/timeseries?days=90`
- `GET /flood/{target_date}`
- `GET /alerts?status=active`

## Tests
```bash
pytest -q tests/test_sebou_phase1_smoke.py tests/test_pipeline.py
```

## Logs et artefacts
- Logs pipeline: `data/sebou_monitoring/logs/`
- Exports raster/vecteur: `data/sebou_monitoring/products/`

