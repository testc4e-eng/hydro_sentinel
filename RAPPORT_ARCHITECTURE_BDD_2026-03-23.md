# Rapport d'architecture de la base de donnees

Date du scan: 2026-03-23 15:58:14
Base analysee: `app_inondation_db` (utilisateur: `postgres`)
Moteur: `PostgreSQL 17.8 on x86_64-windows, compiled by msvc-19.44.35222, 64-bit`

## Resume executif

- SGBD: PostgreSQL avec extensions PostGIS et TimescaleDB.
- Structure metier organisee en 10 schemas metier (hors schemas systeme).
- Separation claire: referentiels (`ref`/`geo`), timeseries (`ts`), exposition API (`api`), ingestion (`staging`/`files`).
- Les vues `api.*` forment la couche de consommation principale (22 vues).

## Extensions detectees

- `pgcrypto` `1.3`
- `plpgsql` `1.0`
- `postgis` `3.5.3`
- `postgis_raster` `3.5.3`
- `timescaledb` `2.24.0`

## Vue d'ensemble des schemas metier

| Schema | Tables | Vues | Role principal |
|---|---:|---:|---|
| `api` | 0 | 22 | Couche de vues d'exposition pour l'API (normalisation, pivot, KPI, fenetres temporelles) |
| `audit` | 1 | 0 | Journalisation controle qualite |
| `auth` | 1 | 0 | Comptes utilisateurs |
| `files` | 3 | 0 | Tracabilite des fichiers ingeres et objets associes |
| `geo` | 3 | 0 | Referentiel geospatial (bassins, stations, troncons) |
| `public` | 1 | 4 | Objets techniques PostGIS standards |
| `ref` | 6 | 6 | Referentiels metier (variables, sources, runs, mapping DSS) |
| `sebou` | 8 | 1 | Donnees thematiques Sebou (neige, inondation, alertes, qualite) |
| `staging` | 6 | 0 | Tables de transit/import avant integration |
| `ts` | 2 | 6 | Mesures temporelles et vues analytiques (timeseries/hydrologie) |

## Architecture logique (couches)

1. Collecte/Ingestion: `staging`, `files`.
2. Referentiels: `geo`, `ref`, `auth`, `audit`.
3. Donnees metier et temporelles: `ts`, `sebou`.
4. Exposition/consommation: `api` (vues de consolidation/KPI/carto).

## Tables par schema

### audit

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `qc_event` | 0 | 0.02 MB | 11 | `qc_event_id` | 0 |

### auth

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `user` | 3 | 0.08 MB | 7 | `id` | 0 |

### files

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `ingestion` | 6 | 0.03 MB | 9 | `ingestion_id` | 1 |
| `ingestion_object` | 6 | 0.03 MB | 3 | `ingestion_id, file_id, role` | 2 |
| `object` | 4 | 0.06 MB | 13 | `file_id` | 0 |

### geo

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `basin` | 7 | 1.73 MB | 7 | `basin_id` | 1 |
| `reach` | 0 | 0.03 MB | 6 | `reach_id` | 1 |
| `station` | 60 | 0.09 MB | 9 | `station_id` | 1 |

### public

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `spatial_ref_sys` | 8500 | 6.98 MB | 5 | `srid` | 0 |

### ref

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `basin_alias` | 0 | 0.02 MB | 4 | `alias_text` | 0 |
| `dss_mapping` | 0 | 0.03 MB | 19 | `dss_mapping_id` | 2 |
| `run` | 14 | 0.08 MB | 11 | `run_id` | 1 |
| `source` | 5 | 0.05 MB | 7 | `source_id` | 0 |
| `station_alias` | 0 | 0.02 MB | 4 | `alias_text` | 0 |
| `variable` | 5 | 0.05 MB | 6 | `variable_id` | 0 |

### sebou

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `alerts` | 0 | 0.02 MB | 8 | `id` | 0 |
| `basin_boundary` | 0 | 0.02 MB | 4 | `id` | 0 |
| `daily_statistics` | 114 | 0.11 MB | 10 | `id` | 0 |
| `field_observations` | 0 | 0.02 MB | 8 | `id` | 1 |
| `flood_extents` | 4 | 18.59 MB | 7 | `id` | 0 |
| `quality_reports` | 120 | 0.07 MB | 8 | `id` | 0 |
| `snow_extents` | 109 | 1.79 MB | 7 | `id` | 0 |
| `validation_stations` | 0 | 0.03 MB | 7 | `id` | 0 |

### staging

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `abhs_sheet_import` | 10 | 0.02 MB | 6 | `-` | 0 |
| `alias_import` | 15 | 0.02 MB | 9 | `-` | 0 |
| `basin_raw` | 17 | 1.51 MB | 8 | `gid` | 0 |
| `dss_mapping_import` | 0 | 0.01 MB | 21 | `-` | 0 |
| `dss_mapping_import_v2` | 49 | 0.05 MB | 16 | `-` | 0 |
| `station_raw` | 53 | 0.07 MB | 17 | `gid` | 0 |

### ts

| Table | Lignes (est.) | Taille | Colonnes | PK | FK sortantes |
|---|---:|---:|---:|---|---:|
| `basin_measurement` | 0 | 0.05 MB | 8 | `-` | 0 |
| `measurement` | 0 | 0.05 MB | 11 | `-` | 0 |

## Relations (Foreign Keys)

- `files.ingestion.log_file_id` -> `files.object.file_id` (`ingestion_log_file_id_fkey`)
- `files.ingestion_object.file_id` -> `files.object.file_id` (`ingestion_object_file_id_fkey`)
- `files.ingestion_object.ingestion_id` -> `files.ingestion.ingestion_id` (`ingestion_object_ingestion_id_fkey`)
- `geo.basin.parent_basin_id` -> `geo.basin.basin_id` (`basin_parent_basin_id_fkey`)
- `geo.reach.basin_id` -> `geo.basin.basin_id` (`reach_basin_id_fkey`)
- `geo.station.basin_id` -> `geo.basin.basin_id` (`station_basin_id_fkey`)
- `ref.dss_mapping.source_id` -> `ref.source.source_id` (`dss_mapping_source_id_fkey`)
- `ref.dss_mapping.variable_id` -> `ref.variable.variable_id` (`dss_mapping_variable_id_fkey`)
- `ref.run.source_id` -> `ref.source.source_id` (`run_source_id_fkey`)
- `sebou.field_observations.station_id` -> `sebou.validation_stations.id` (`field_observations_station_id_fkey`)

## Inventaire des vues

### api

| Vue | Colonnes | Dependances directes |
|---|---:|---|
| `cagg_station_1h` | 7 | `_timescaledb_internal._materialized_hypertable_3` |
| `v_basin` | 9 | `geo.basin` |
| `v_kpi_precip_cum_24h` | 10 | `api.v_timeseries` |
| `v_latest` | 20 | `api.v_timeseries` |
| `v_latest_station_pivot` | 36 | `api.v_latest`, `api.v_station` |
| `v_map_basins` | 6 | `api.v_basin` |
| `v_map_points_kpi` | 29 | `api.v_latest_station_pivot`, `api.v_station`, `api.v_top_critical_24h` |
| `v_map_station_points` | 15 | `api.v_latest`, `api.v_station` |
| `v_reach` | 8 | `geo.basin`, `geo.reach` |
| `v_ref_run` | 9 | `ref.run` |
| `v_ref_source` | 6 | `ref.source` |
| `v_ref_variable` | 5 | `ref.variable` |
| `v_ref_variable_id_code` | 2 | `ref.variable` |
| `v_station` | 11 | `geo.basin`, `geo.station` |
| `v_timeseries` | 20 | `api.v_timeseries_basin`, `api.v_timeseries_station` |
| `v_timeseries_basin` | 25 | `api.v_basin`, `api.v_ref_run`, `api.v_ref_source`, `api.v_ref_variable`, `ts.basin_measurement` |
| `v_timeseries_station` | 29 | `api.v_ref_run`, `api.v_ref_source`, `api.v_ref_variable`, `api.v_station`, `ts.measurement` |
| `v_top_critical_24h` | 14 | `api.v_window_station_24h_fast` |
| `v_window_station_24h` | 13 | `api.v_timeseries_station` |
| `v_window_station_24h_fast` | 13 | `api.cagg_station_1h`, `api.v_ref_variable_id_code`, `api.v_station`, `ref.run`, `ref.source` |
| `v_window_station_6h` | 13 | `api.v_timeseries_station` |
| `v_window_station_72h` | 13 | `api.v_timeseries_station` |

### public

| Vue | Colonnes | Dependances directes |
|---|---:|---|
| `geography_columns` | 7 | - |
| `geometry_columns` | 7 | - |
| `raster_columns` | 17 | - |
| `raster_overviews` | 9 | - |

### ref

| Vue | Colonnes | Dependances directes |
|---|---:|---|
| `bassin` | 7 | `geo.basin` |
| `station` | 9 | `geo.station` |
| `v_dss_mapping_active` | 12 | `geo.station`, `ref.dss_mapping`, `ref.source`, `ref.variable` |
| `v_dss_mapping_status` | 11 | `geo.station`, `ref.dss_mapping`, `ref.source`, `ref.variable` |
| `v_ids` | 2 | `ref.source`, `ref.variable` |
| `v_station_key` | 5 | `geo.station` |

### sebou

| Vue | Colonnes | Dependances directes |
|---|---:|---|
| `v_latest_status` | 7 | `sebou.alerts`, `sebou.daily_statistics` |

### ts

| Vue | Colonnes | Dependances directes |
|---|---:|---|
| `v_basin_precip_compare` | 8 | `ts.v_basin_precip_cum_24h` |
| `v_basin_precip_compare_common_24h` | 8 | `geo.basin`, `ref.source`, `ref.variable`, `ts.basin_measurement` |
| `v_basin_precip_cum_24h` | 6 | `geo.basin`, `ref.source`, `ref.variable`, `ts.basin_measurement` |
| `v_basin_precip_last_run` | 7 | `geo.basin`, `ref.run`, `ref.source`, `ts.basin_measurement` |
| `v_dss_mapping_active` | 19 | `geo.station`, `ref.dss_mapping`, `ref.source`, `ref.variable` |
| `v_dss_mapping_health` | 7 | `geo.station`, `ref.dss_mapping`, `ref.source`, `ref.variable` |

## Vues API critiques (lecture metier)

### api.v_station

- Colonnes (11): `station_id, station_code, station_name, station_type, basin_id, basin_code, basin_name, elevation_m, is_active, geom, created_at`
- Dependances: `geo.basin`, `geo.station`
- SQL (extrait): `SELECT st.station_id, st.code AS station_code, st.name AS station_name, st.station_type, st.basin_id, b.code AS basin_code, b.name AS basin_name, st.elevation_m, st.is_active, st.geom, st.created_at FROM (geo.station st LEFT JOIN geo.basin b ON ((b.basin_id = st.basin_id)));`

### api.v_basin

- Colonnes (9): `basin_id, basin_code, basin_name, level, parent_basin_id, parent_basin_code, parent_basin_name, geom, created_at`
- Dependances: `geo.basin`
- SQL (extrait): `SELECT b.basin_id, b.code AS basin_code, b.name AS basin_name, b.level, b.parent_basin_id, bp.code AS parent_basin_code, bp.name AS parent_basin_name, b.geom, b.created_at FROM (geo.basin b LEFT JOIN geo.basin bp ON ((bp.basin_id = b.parent_basin_id)));`

### api.v_timeseries_station

- Colonnes (29): `time, station_id, station_code, station_name, station_type, basin_id, basin_code, basin_name, variable_id, variable_code, variable_label, variable_unit, source_id, source_code, source_label, source_type, provider, run_id, run_time, model_name, horizon_hours, grid_name, version, run_label, value, qc_flag, ingestion_id, file_id, inserted_at`
- Dependances: `api.v_ref_run`, `api.v_ref_source`, `api.v_ref_variable`, `api.v_station`, `ts.measurement`
- SQL (extrait): `SELECT m."time", m.station_id, st.station_code, st.station_name, st.station_type, st.basin_id, st.basin_code, st.basin_name, m.variable_id, v.variable_code, v.variable_label, v.variable_unit, m.source_id, s.source_code, s.source_label, s.source_type, s.provider, m.run_id_norm AS run_id, r.run_time, r.model_name, r.horizon_hours, r.grid_name, r.version, r.label AS run_label, m.value, m.qc_flag, m.ingestion_id, m.file_...`

### api.v_timeseries_basin

- Colonnes (25): `time, basin_id, basin_code, basin_name, level, parent_basin_id, variable_id, variable_code, variable_label, variable_unit, source_id, source_code, source_label, source_type, provider, run_id, run_time, model_name, horizon_hours, grid_name, version, run_label, value, quality, created_at`
- Dependances: `api.v_basin`, `api.v_ref_run`, `api.v_ref_source`, `api.v_ref_variable`, `ts.basin_measurement`
- SQL (extrait): `SELECT bm."time", bm.basin_id, b.basin_code, b.basin_name, b.level, b.parent_basin_id, bm.variable_id, v.variable_code, v.variable_label, v.variable_unit, bm.source_id, s.source_code, s.source_label, s.source_type, s.provider, bm.run_id, r.run_time, r.model_name, r.horizon_hours, r.grid_name, r.version, r.label AS run_label, bm.value, bm.quality, bm.created_at FROM ((((ts.basin_measurement bm JOIN api.v_basin b ON ((...`

### api.v_timeseries

- Colonnes (20): `entity_type, entity_id, entity_code, entity_name, entity_subtype, basin_id, basin_code, basin_name, time, variable_code, variable_label, variable_unit, source_code, source_label, run_id, run_time, model_name, horizon_hours, value, qc_flag`
- Dependances: `api.v_timeseries_basin`, `api.v_timeseries_station`
- SQL (extrait): `SELECT 'station'::text AS entity_type, ts.station_id AS entity_id, ts.station_code AS entity_code, ts.station_name AS entity_name, ts.station_type AS entity_subtype, ts.basin_id, ts.basin_code, ts.basin_name, ts."time", ts.variable_code, ts.variable_label, ts.variable_unit, ts.source_code, ts.source_label, ts.run_id, ts.run_time, ts.model_name, ts.horizon_hours, ts.value, ts.qc_flag FROM api.v_timeseries_station ts U...`

### api.v_latest

- Colonnes (20): `entity_type, entity_id, entity_code, entity_name, entity_subtype, basin_id, basin_code, basin_name, variable_code, variable_label, variable_unit, source_code, source_label, run_id, run_time, model_name, horizon_hours, value_time, value, qc_flag`
- Dependances: `api.v_timeseries`
- SQL (extrait): `SELECT DISTINCT ON (entity_type, entity_id, variable_code, source_code, COALESCE(run_time, '1969-12-31 16:00:00-08'::timestamp with time zone)) entity_type, entity_id, entity_code, entity_name, entity_subtype, basin_id, basin_code, basin_name, variable_code, variable_label, variable_unit, source_code, source_label, run_id, run_time, model_name, horizon_hours, "time" AS value_time, value, qc_flag FROM api.v_timeseries...`

### api.v_latest_station_pivot

- Colonnes (36): `station_id, station_code, station_name, station_type, basin_id, basin_code, basin_name, precip_obs_mm, precip_obs_time, precip_arome_mm, precip_arome_time, precip_arome_run_time, precip_ecmwf_mm, precip_ecmwf_time, precip_ecmwf_run_time, debit_obs_m3s, debit_obs_time, debit_sim_m3s, debit_sim_time, debit_res_m3s, debit_res_time, debit_res_run_time, apport_m3s_latest, apport_m3s_time, lacher_m3s_latest, lacher_m3s_time, volume_obs_hm3, volume_sim_hm3, volume_hm3_latest, volume_hm3_time, volume_mm3_latest, volume_mm3_time, volume_abhs_hm3_latest, volume_abhs_hm3_time, volume_alt_hm3_latest, volume_alt_hm3_time`
- Dependances: `api.v_latest`, `api.v_station`
- SQL (extrait): `WITH l AS ( SELECT v_latest.entity_type, v_latest.entity_id, v_latest.entity_code, v_latest.entity_name, v_latest.entity_subtype, v_latest.basin_id, v_latest.basin_code, v_latest.basin_name, v_latest.variable_code, v_latest.variable_label, v_latest.variable_unit, v_latest.source_code, v_latest.source_label, v_latest.run_id, v_latest.run_time, v_latest.model_name, v_latest.horizon_hours, v_latest.value_time, v_latest....`

### api.v_map_points_kpi

- Colonnes (29): `station_id, station_code, station_name, station_type, basin_id, basin_code, basin_name, is_active, geometry, precip_obs_mm, precip_obs_time, precip_arome_mm, debit_obs_m3s, debit_sim_m3s, debit_obs_time, lacher_m3s_latest, lacher_m3s_time, volume_hm3_latest, volume_obs_hm3, volume_sim_hm3, volume_hm3_time, kpi_source, kpi_run_time, precip_cum_24h_mm, debit_max_24h_m3s, lacher_max_24h_m3s, apport_max_24h_m3s, severity, score`
- Dependances: `api.v_latest_station_pivot`, `api.v_station`, `api.v_top_critical_24h`
- SQL (extrait): `SELECT st.station_id, st.station_code, st.station_name, st.station_type, st.basin_id, st.basin_code, st.basin_name, st.is_active, (st_asgeojson(st.geom))::json AS geometry, p.precip_obs_mm, p.precip_obs_time, p.precip_arome_mm, p.debit_obs_m3s, p.debit_sim_m3s, p.debit_obs_time, p.lacher_m3s_latest, p.lacher_m3s_time, p.volume_hm3_latest, p.volume_obs_hm3, p.volume_sim_hm3, p.volume_hm3_time, tc.source_code AS kpi_so...`

### api.v_top_critical_24h

- Colonnes (14): `station_id, station_code, station_name, station_type, basin_code, basin_name, source_code, run_time, precip_cum_24h_mm, debit_max_24h_m3s, lacher_max_24h_m3s, apport_max_24h_m3s, severity, score`
- Dependances: `api.v_window_station_24h_fast`
- SQL (extrait): `SELECT station_id, station_code, station_name, station_type, basin_code, basin_name, source_code, run_time, precip_cum_24h_mm, debit_max_24h_m3s, lacher_max_24h_m3s, apport_max_24h_m3s, CASE WHEN (COALESCE(lacher_max_24h_m3s, (0)::double precision) >= (500)::double precision) THEN 'ALERTE_LACHER'::text WHEN (COALESCE(debit_max_24h_m3s, (0)::double precision) >= (500)::double precision) THEN 'ALERTE_DEBIT'::text WHEN ...`

## Observations techniques

- Le schema `api` est exclusivement compose de vues; aucune table physique detectee.
- Presence de TimescaleDB (`timescaledb`) et d'une vue `api.cagg_station_1h` alimentee par un objet materialise interne Timescale (`_timescaledb_internal._materialized_hypertable_3`).
- La volumetrie la plus importante cote metier est dans `sebou.flood_extents` (~18.59 MB) et les couches geospatiales `geo`/`sebou`.
- Les tables `ts.measurement` et `ts.basin_measurement` sont le noyau des series temporelles, exposees via `api.v_timeseries*`.

## Portee et limites

- Les volumes affiches sont des estimations PostgreSQL (`pg_stat_user_tables.n_live_tup`).
- Les schemas systeme (`pg_*`, `_timescaledb*`, `timescaledb_*`) ont ete exclus de l'analyse fonctionnelle.
- Le rapport decrit l'etat observe au moment du scan.
