# DATA MAPPING VISUAL — Hydro-Meteo Sebou
> Généré le : 2026-03-26 17:02:00
> Principe : 1 ligne = 1 valeur affichée à l'écran

---

## LÉGENDE
- 🟢 Lu directement en base (table.colonne)  
- 🟡 Calculé dans une VIEW SQL  
- 🔵 Calculé côté backend (code)  
- 🔴 Données manquantes / non trouvées

---

## PAGE : Précipitations — Par Bassin

| Valeur affichée | Endpoint appelé | VIEW ou TABLE | Colonne exacte | Formule (si calculé) | Source données brutes |
|---|---|---|---|---|---|
| Graphique précipitations (mm) | GET /measurements/timeseries | ts.basin_measurement (via backend `measurements.py`) | `bm.value -> value` | 🟢 direct (`entity_type='bassins'`) | `ts.basin_measurement.value` + `ref.variable.code='precip_mm'` + `ref.source.code` |
| Cumul précipitations tableau | GET /measurements/timeseries | Frontend (`Precipitations.tsx`) | `point.value` | 🔵 `const cumul = values.reduce((acc, v) => acc + v, 0);` ([Precipitations.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\pages\Precipitations.tsx:330), [Precipitations.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\pages\Precipitations.tsx:357)) | `ts.basin_measurement.value` |
| Période affichée (début/fin) | GET /measurements/timeseries | Frontend (`Precipitations.tsx`) | `dateRange.start / dateRange.end` | 🔵 calcul local période + filtrage API (`params.start/end`) | `ts.basin_measurement.time` |

---

## PAGE : Débits — Par Station

| Valeur affichée | Endpoint appelé | VIEW ou TABLE | Colonne exacte | Formule (si calculé) | Source données brutes |
|---|---|---|---|---|---|
| Graphique débit (m³/s) Obs | GET /measurements/timeseries | api.v_timeseries_station | `value` | 🟢 direct (`source_code='OBS'`) | `ts.measurement.value` + `ref.variable.code='flow_m3s'` |
| Graphique débit (m³/s) Simulé | GET /measurements/timeseries | api.v_timeseries_station | `value` | 🟢 direct (`source_code='SIM'`) | `ts.measurement.value` + `ref.variable.code='flow_m3s'` |
| Message "Période sans données" | Frontend | `EnhancedMultiSourceChart.tsx` | — | 🔵 `if (chartData.length === 0) ... "Aucune donnée disponible pour cette sélection"` ([EnhancedMultiSourceChart.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\components\analysis\EnhancedMultiSourceChart.tsx:533)) | — |

---

## PAGE : Apports — Par Barrage

| Valeur affichée | Endpoint appelé | VIEW ou TABLE | Colonne exacte | Formule (si calculé) | Source données brutes |
|---|---|---|---|---|---|
| Graphique apport (m³/s) | GET /measurements/timeseries | api.v_timeseries_station | `value` | 🟢 direct si `inflow_m3s` existe ; 🔴 vide sinon | `ts.measurement.value` WHERE `ref.variable.code='inflow_m3s'` |
| "Aucune donnée disponible" | Frontend | `EnhancedMultiSourceChart.tsx` | — | 🔴 affiché si `chartData.length===0` | — |

---

## PAGE : Volume — Par Barrage

| Valeur affichée | Endpoint appelé | VIEW ou TABLE | Colonne exacte | Formule (si calculé) | Source données brutes |
|---|---|---|---|---|---|
| Graphique volume (Mm³) | GET /measurements/timeseries | api.v_timeseries_station | `value` | 🟢 direct | `ts.measurement.value` WHERE `ref.variable.code='volume_hm3'` |
| Pic vertical anormal (19/02) | GET /measurements/timeseries | api.v_timeseries_station | `value` | 🔴 valeur aberrante confirmée en base (`2026-02-19 06:00:00-08`, `Bge Al Wahda`, `OBS`, `4359.83025`) | `ts.measurement` |
| Badge "sans données OBS" | GET /map/points-kpi | Frontend (`Volume.tsx`) | — | 🔵 `!stationsWithObsVolume.has(String(d.id))` mais la liste est alimentée via `volume_hm3_latest` (pas strictement OBS) ([Volume.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\pages\Volume.tsx:77), [Volume.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\pages\Volume.tsx:211)) | `api.v_map_points_kpi.volume_hm3_latest` |

---

## PAGE : Recapitulatif Barrage

| Colonne tableau | Endpoint appelé | VIEW source | Colonne SQL exacte | Formule SQL complète | Tables brutes impliquées |
|---|---|---|---|---|---|
| Jour | GET /recap/barrage | api.v_recap_barrage_journalier | `jour` | 🟢 `date_trunc('day', m.time)::date` | `ts.measurement.time` |
| Pluie (Moy) DGM (mm) | GET /recap/barrage | api.v_recap_pluie_bv_journalier | `pluie_moy_mm` | 🟡 `AVG(...precip_mm...)` avec priorisation source `SIM>AROME>ECMWF>OBS` | `ts.basin_measurement`, `ts.measurement`, `geo.station`, `geo.basin`, `ref.variable`, `ref.source` |
| Retenue actuelle (Mm³) à 8h | GET /recap/barrage | api.v_recap_barrage_journalier | `retenue_sim_8h_mm3` | 🟡 valeur `volume_hm3` SIM la plus proche de 08:00 (`row_number` + tri sur distance à 8h) | `ts.measurement`, `ref.variable`, `ref.source` |
| Apports (Mm³) | GET /recap/barrage | api.v_recap_barrage_journalier | `apports_mm3` | 🟡 `COALESCE(SUM(inflow_m3s*3600/1e6), SUM(flow_m3s*3600/1e6))` | `ts.measurement` |
| Creux actuel (Mm³) | GET /recap/barrage | api.v_recap_barrage_journalier | `creux_mm3` | 🟡 `capacite_mm3 - volume_sim_8h_mm3` | capacité calculée en `CASE` sur `geo.station.name` + volume SIM |
| Restitutions/Lacher (Mm³) | GET /recap/barrage | api.v_recap_barrage_journalier | `lacher_mm3` | 🟡 `SUM(lacher_m3s*3600/1e6)` | `ts.measurement` |
| Débit maximal (m³/s) | GET /recap/barrage | api.v_recap_barrage_journalier | `debit_max_m3s` | 🟡 `MAX(flow_m3s)` (SIM) | `ts.measurement` |
| Débit moyen journalier (m³/s) | GET /recap/barrage | api.v_recap_barrage_journalier | `debit_moy_m3s` | 🟡 `AVG(flow_m3s)` (SIM) | `ts.measurement` |
| Total ligne (bas tableau) | Frontend | — | — | 🔵 `tableRows.reduce(...)` sur `pluieMm`, `apportsMm3`, `restitutionMm3` ([RecapTable.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\components\analysis\RecapTable.tsx:144)) | — |

---

## SCAN DE DONNÉES ADMIN

| Valeur affichée | Endpoint appelé | VIEW ou TABLE | Colonne exacte | Formule | Source brute |
|---|---|---|---|---|---|
| Nb points (ex: 1284) | GET /admin/data-availability | Backend SQL direct | `summary.total_records` | 🔵 `sum(station_rows.record_count)+sum(basin_rows.record_count)` ([data_availability.py](c:\dev\hydro-sentinel-app\backend\app\api\v1\endpoints\data_availability.py:616)) | `api.v_timeseries_station`, `ts.basin_measurement` |
| Nb vars (ex: 1 vars) | GET /admin/data-availability | Backend SQL direct | `summary.total_variables` | 🔵 `len(set(variable_code))` | `api.v_timeseries_station.variable_code`, `ref.variable.code` |
| Nb sources (ex: 3 sources) | GET /admin/data-availability | Backend SQL direct | `summary.total_sources` | 🔵 `len(set(source_code))` | `api.v_timeseries_station.source_code`, `ref.source.code` |
| Période (début → fin) | GET /admin/data-availability | Backend SQL direct | `first_record / last_record` par série | 🟢 `MIN/MAX(time)` | `api.v_timeseries_station.time`, `ts.basin_measurement.time` |
| Source OBS inattendue | GET /admin/data-availability | ⚠️ À CONFIRMER | ⚠️ À CONFIRMER | ⚠️ À CONFIRMER (pas de colonne `shape` dans `geo.basin`) | Exécuter la requête de vérification ci-dessous adaptée au schéma réel |

---

## ANOMALIES CONFIRMÉES

| Page | Valeur concernée | Problème | Requête de vérification |
|---|---|---|---|
| Apports/Barrage | Graphique vide | Certains barrages n'ont pas de série `inflow_m3s` (ex: `Bge Asfallou`, `Bge Sahla`) | `SELECT s.name, COUNT(*) FILTER (WHERE v.code='inflow_m3s') AS n_inflow FROM ts.measurement m JOIN ref.variable v ON v.variable_id=m.variable_id JOIN geo.station s ON s.station_id=m.station_id WHERE lower(coalesce(s.station_type,'')) LIKE '%barrage%' GROUP BY s.name ORDER BY s.name;` |
| Volume/Barrage | Pic vertical 19/02 | Valeur `volume_hm3` OBS élevée détectée (`4359.83025`) le 2026-02-19 | `SELECT m.time, st.name, src.code, m.value FROM ts.measurement m JOIN ref.variable v ON v.variable_id=m.variable_id JOIN ref.source src ON src.source_id=m.source_id JOIN geo.station st ON st.station_id=m.station_id WHERE v.code='volume_hm3' AND m.time::date='2026-02-19' AND m.value > 4000 ORDER BY m.time;` |
| Scan Admin | Source OBS inattendue | ⚠️ À CONFIRMER: le modèle de données réel n'a pas `geo.basin.shape`; filtrage DGM se fait par `geo.basin.code ~ '^dgm'` dans le backend | `SELECT b.code, b.name, s.code AS source, COUNT(*) FROM ts.basin_measurement bm JOIN geo.basin b ON b.basin_id=bm.basin_id JOIN ref.source s ON s.source_id=bm.source_id GROUP BY b.code,b.name,s.code ORDER BY b.code,s.code;` |
| Précipitations DGM | Graphique vide (ECMWF coché) | ⚠️ À CONFIRMER côté UI: fallback/auto-fallback actif dans le chart; fenêtre par défaut 14j est codée `start = now-7j`, `end = now+7j` | Vérifier [Precipitations.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\pages\Precipitations.tsx:668) + [EnhancedMultiSourceChart.tsx](c:\dev\hydro-sentinel-app\hydro-sentinel\src\components\analysis\EnhancedMultiSourceChart.tsx:218) |

---

## ANNEXE — SELECT COMPLETS (VUES COMPLEXES)

### 1) `api.v_recap_barrage_journalier` (source : `backend/app/api/v1/endpoints/recapitulatif.py`, `RECAP_VIEWS_SQL`)
```sql
SELECT
    d.jour,
    d.barrage_id,
    d.barrage,
    d.bassin,
    p.pluie_moy_mm,
    rv.retenue_sim_8h_mm3,
    d.apports_mm3,
    sv.volume_sim_8h_mm3,
    CASE
        WHEN d.capacite_mm3 IS NULL OR sv.volume_sim_8h_mm3 IS NULL THEN NULL
        ELSE d.capacite_mm3 - sv.volume_sim_8h_mm3
    END AS creux_mm3,
    d.lacher_mm3,
    d.debit_max_m3s,
    d.debit_moy_m3s,
    d.capacite_mm3
FROM daily_agg d
LEFT JOIN api.v_recap_pluie_bv_journalier p
  ON p.barrage_id = d.barrage_id
 AND p.jour = d.jour
LEFT JOIN sim_retenue_8h rv
  ON rv.barrage_id = d.barrage_id
 AND rv.jour = d.jour
LEFT JOIN sim_volume_8h sv
  ON sv.barrage_id = d.barrage_id
 AND sv.jour = d.jour;
```

### 2) `api.v_recap_pluie_bv_journalier` (source : `backend/app/api/v1/endpoints/recapitulatif.py`, `RECAP_VIEWS_SQL`)
```sql
SELECT
    COALESCE(d.jour, s.jour) AS jour,
    COALESCE(d.barrage_id, s.barrage_id) AS barrage_id,
    COALESCE(d.pluie_moy_mm, s.pluie_moy_mm) AS pluie_moy_mm
FROM pluie_dgm d
FULL OUTER JOIN pluie_station s
  ON s.jour = d.jour
 AND s.barrage_id = d.barrage_id;
```

### 3) `api.v_timeseries_station` (confirmé par `pg_get_viewdef`)
```sql
SELECT
    m.time,
    m.station_id,
    st.station_code,
    st.station_name,
    st.station_type,
    st.basin_id,
    st.basin_code,
    st.basin_name,
    m.variable_id,
    v.variable_code,
    v.variable_label,
    v.variable_unit,
    m.source_id,
    s.source_code,
    s.source_label,
    s.source_type,
    s.provider,
    m.run_id_norm AS run_id,
    r.run_time,
    r.model_name,
    r.horizon_hours,
    r.grid_name,
    r.version,
    r.label AS run_label,
    m.value,
    m.qc_flag,
    m.ingestion_id,
    m.file_id,
    m.inserted_at
FROM ts.measurement m
JOIN api.v_station st ON st.station_id = m.station_id
JOIN api.v_ref_variable v ON v.variable_id = m.variable_id
JOIN api.v_ref_source s ON s.source_id = m.source_id
LEFT JOIN api.v_ref_run r ON r.run_id = m.run_id_norm;
```

### 4) `api.v_map_points_kpi` (confirmé par `pg_get_viewdef`)
```sql
SELECT st.station_id,
       st.station_code,
       st.station_name,
       st.station_type,
       st.basin_id,
       st.basin_code,
       st.basin_name,
       st.is_active,
       st_asgeojson(st.geom)::json AS geometry,
       p.precip_obs_mm,
       p.precip_obs_time,
       p.precip_arome_mm,
       p.debit_obs_m3s,
       p.debit_sim_m3s,
       p.debit_obs_time,
       p.lacher_m3s_latest,
       p.lacher_m3s_time,
       p.volume_hm3_latest,
       p.volume_obs_hm3,
       p.volume_sim_hm3,
       p.volume_hm3_time,
       tc.source_code AS kpi_source,
       tc.run_time AS kpi_run_time,
       tc.precip_cum_24h_mm,
       tc.debit_max_24h_m3s,
       tc.lacher_max_24h_m3s,
       tc.apport_max_24h_m3s,
       tc.severity,
       tc.score
FROM api.v_station st
LEFT JOIN api.v_latest_station_pivot p ON p.station_id = st.station_id
LEFT JOIN api.v_top_critical_24h tc ON tc.station_id = st.station_id;
```
