# DATABASE_SCHEMA.md - Hydro Sentinel

## Vue d ensemble

Le code backend depend de deux familles de structures SQL:

1. Structures explicitement definies dans le repo.
2. Structures supposees existantes en base (vues/tables referencees par SQL).

## Priorite metier du schema

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

Le schema doit soutenir les decisions operationnelles sur:

- pluie (observee + prevision AROME/ECMWF),
- debit, apport, volume, lacher,
- criticite et indicateurs 24h,
- historisation exploitable pour comparaison temporelle.

La disponibilite et la coherence des tables/vues liees a ces variables sont prioritaires sur tout autre besoin.

## Detection du schema

### Elements definis dans le repo

- `sebou.*` via `backend/app/db/sebou_monitoring_schema.sql`
  - `basin_boundary`
  - `daily_statistics`
  - `flood_extents`
  - `snow_extents`
  - `alerts`
  - `validation_stations`
  - `field_observations`
  - `quality_reports`
  - vue `v_latest_status`
- `auth.user` via modele SQLAlchemy `backend/app/models/user.py`.

### Elements references par endpoints (non crees ici)

- Schema `api`:
  - vues `v_station`, `v_basin`, `v_timeseries_station`, `v_map_points_kpi`, `v_top_critical_24h`, `v_ref_variable`.
- Schema `geo`:
  - `station`, `basin`, `barrage`.
- Schema `ts`:
  - `measurement`, `basin_measurement`.
- Schema `ref`:
  - `variable`, `source`, `station_alias`, `basin_alias`.

## Relations cles (observees)

- `ts.measurement.station_id -> geo.station.station_id`
- `ts.measurement.variable_id -> ref.variable.variable_id`
- `ts.measurement.source_id -> ref.source.source_id`
- `ts.basin_measurement.basin_id -> geo.basin.basin_id`
- `auth.user` utilise pour auth JWT.

## Index critiques

### Sebou (deja definis)

- GIST sur geometries `sebou.*_extents`, `sebou.basin_boundary`, `sebou.validation_stations`.
- Index date sur `daily_statistics`, `flood_extents`, `snow_extents`, `field_observations`.
- Index statut sur `sebou.alerts`.

### Recommandes pour schemas metier

```sql
CREATE INDEX IF NOT EXISTS idx_ts_measurement_station_time
ON ts.measurement (station_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_ts_measurement_variable_source_time
ON ts.measurement (variable_id, source_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_geo_station_geom
ON geo.station USING GIST (geom);

CREATE INDEX IF NOT EXISTS idx_geo_basin_geom
ON geo.basin USING GIST (geom);
```

## Migrations et initialisation

- Sebou: appliquer `backend/app/db/sebou_monitoring_schema.sql`.
- Core schemas (`api`, `geo`, `ts`, `ref`): non fournis dans ce repo, doivent etre provisionnes par scripts externes ou dump DB.

## Seed data minimal recommande

- `ref.source`: `OBS`, `SIM`, `AROME`, `ECMWF`.
- `ref.variable`: codes utilises dans le code (`precip_mm`, `flow_m3s`, `inflow_m3s`, `lacher_m3s`, `volume_hm3`, etc).
- `geo.station` + `geo.basin`: entites geographiques de base.
- `auth.user`: au moins un utilisateur actif admin.

## Requetes frequentes optimisees

### Disponibilite station/variable/source

```sql
SELECT station_id, variable_id, source_id, MIN(time), MAX(time), COUNT(*)
FROM ts.measurement
GROUP BY station_id, variable_id, source_id;
```

### Lecture rapide timeseries station

```sql
SELECT m.time, v.code AS variable_code, s.code AS source_code, m.value
FROM ts.measurement m
JOIN ref.variable v ON v.variable_id = m.variable_id
JOIN ref.source s ON s.source_id = m.source_id
WHERE m.station_id = :station_id
ORDER BY m.time DESC
LIMIT 1000;
```

## Gaps detectes et propositions

| Aspect | Statut | Action requise |
|---|---|---|
| Schema Sebou | Decrit | Utilisable apres execution SQL |
| Schema auth.user | Partiel | Verifier migration/table reellement presente |
| Schema api.v_* | Manquant dans repo | Exporter DDL des vues depuis DB cible |
| Schema geo.* | Manquant dans repo | Ajouter migration initiale geo |
| Schema ts.* | Manquant dans repo | Ajouter migration initiale timeseries |
| Schema ref.* | Manquant dans repo | Ajouter migration initiale referentiel |

## Contrainte de coherence

Tant que les schemas `api/geo/ts/ref` ne sont pas versionnes dans ce repo, la portabilite locale reste limitee.
Priorite recommandee: ajouter un package de migrations SQL versionne pour ces schemas.
