# DATA MAPPING REPORT - Hydro-Meteo Sebou
> Genere le : 2026-03-26 16:26:58

---

## 1. INVENTAIRE BASE DE DONNEES

### 1.1 Tables
| Table | Type | Nb colonnes | Cle primaire | Nb lignes |
|---|---|---|---|---|
| spatial_ref_sys | BASE TABLE | 5 | srid | 8500 |

### 1.2 Vues
| Vue | Type (VIEW/MAT.VIEW) | Tables sources | Colonnes calculees |
|---|---|---|---|
| geography_columns | VIEW |  |  |
| geometry_columns | VIEW |  |  |
| raster_columns | VIEW |  |  |
| raster_overviews | VIEW |  |  |

### 1.3 Relations (Foreign Keys)
| table_source | colonne_fk | table_cible | colonne_pk |
|---|---|---|---|
|  |  |  |  |

---

## 2. MODULE PRECIPITATIONS

### Source des donnees
| Bassin | Shape | Source | Variable | Nb mesures | Periode |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | Erreur: relation "bassins" does not exist LINE 1: ....date) AS date_debut,MAX(m.date) AS date_fin FROM bassins b ...                                                              ^  |

### Consommation
| Fichier frontend | Endpoint API | View/Table utilisee | Colonnes lues |
|---|---|---|---|
| src/pages/Precipitations.tsx | GET /api/v1/measurements/timeseries | api.v_timeseries_station (stations) / ts.basin_measurement + ref.variable + ref.source (bassins) | station_id, variable_code=precip_mm, source_code, time, value |

## 3. MODULE DEBITS

### Source des donnees
| Station | Code | Source | Variable | Nb mesures | Periode |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | Erreur: relation "stations" does not exist LINE 1: ....date) AS date_debut,MAX(m.date) AS date_fin FROM stations s...                                                              ^  |

### Consommation
| Fichier frontend | Endpoint API | View/Table utilisee | Colonnes lues |
|---|---|---|---|
| src/pages/Debits.tsx | GET /api/v1/measurements/timeseries | api.v_timeseries_station | station_id, variable_code=flow_m3s, source_code, time, value |
| src/components/HydroMap.tsx | GET /api/v1/map/points-kpi | api.v_map_points_kpi + ts.measurement + ts.basin_measurement | debit_obs_m3s, debit_sim_m3s, debit_max_24h_m3s |

## 4. MODULE APPORTS

### Source des donnees
| Barrage | Source | Variable | Nb mesures | Periode | Calcule ou observe ? |
|---|---|---|---|---|---|
| N/A | N/A | N/A | N/A | N/A | Erreur: relation "barrages" does not exist LINE 1: ....date) AS date_debut,MAX(m.date) AS date_fin FROM barrages b...                                                              ^  |

### Formule de calcul (si calcule)
```
apport_h (Mm3) = debit * 3600 / 1_000_000
apport_j (Mm3) = SUM(apport_h sur 24h)
```

### Consommation
| Fichier frontend | Endpoint API | View/Table utilisee | Colonnes lues |
|---|---|---|---|
| src/pages/Apports.tsx | GET /api/v1/measurements/timeseries | api.v_timeseries_station | station_id, variable_code=inflow_m3s, source_code, time, value |
| src/components/admin/DataAvailabilityScanner.tsx | GET /api/v1/data-availability/basins/apports-recap | ts.basin_measurement + geo.basin + ref.variable + ref.source | apport_journalier_mm3, cumul_apport_mm3, dernier_apport_horaire_mm3 |

## 5. MODULE VOLUME

### Source des donnees
| Barrage | Source | Variable | Nb mesures | Periode |
|---|---|---|---|---|
| N/A | N/A | N/A | N/A | Erreur: relation "barrages" does not exist LINE 1: ....date) AS date_debut,MAX(m.date) AS date_fin FROM barrages b...                                                              ^  |

### Consommation
| Fichier frontend | Endpoint API | View/Table utilisee | Colonnes lues |
|---|---|---|---|
| src/pages/Volume.tsx | GET /api/v1/measurements/timeseries | api.v_timeseries_station | station_id, variable_code=volume_hm3, source_code, time, value |
| src/pages/Volume.tsx | GET /api/v1/map/points-kpi | api.v_map_points_kpi | volume_hm3_latest, volume_obs_hm3, volume_sim_hm3 |

## 6. MODULE RECAPITULATIF

### Colonnes du tableau recap et leur origine
| Colonne affichee | Source (table/view/calcul) | Formule si calculee |
|---|---|---|
| Pluie (Moy) DGM | api.v_recap_pluie_bv_journalier.pluie_moy_mm | AVG precip_mm (station/bassin) |
| Retenue actuelle (Mm3) | api.v_recap_barrage_journalier.retenue_sim_8h_mm3 | valeur volume_hm3 SIM la plus proche de 08:00 |
| Apports (Mm3) | api.v_recap_barrage_journalier.apports_mm3 | apport = debit * 3600 / 1_000_000 (SUM journaliere) |
| Creux actuel (Mm3) | api.v_recap_barrage_journalier.creux_mm3 | creux = capacite_mm3 - volume_sim_8h_mm3 |
| Restitutions - Lacher (Mm3) | api.v_recap_barrage_journalier.lacher_mm3 | SUM(lacher_m3s * 3600 / 1_000_000) |
| Debit maximal (m3/s) | api.v_recap_barrage_journalier.debit_max_m3s | MAX(flow_m3s) |
| Debit moyen journalier (m3/s) | api.v_recap_barrage_journalier.debit_moy_m3s | AVG(flow_m3s) |

### Views consommees par le recap
| View/Table | Colonnes utilisees | Jointures |
|---|---|---|
| api.v_recap_barrage_journalier | jour,barrage_id,barrage,bassin,pluie_moy_mm,retenue_sim_8h_mm3,apports_mm3,creux_mm3,lacher_mm3,debit_max_m3s,debit_moy_m3s,capacite_mm3 | LEFT JOIN api.v_recap_pluie_bv_journalier + CTEs ts.measurement/ref/geo |
| api.v_recap_pluie_bv_journalier | jour,barrage_id,pluie_moy_mm | geo.station + geo.basin + ts.measurement + ts.basin_measurement + ref.variable + ref.source |
| api.v_recap_alerte_prevision | jour,barrage_id,barrage,bassin,capacite_mm3,volume_prevu_mm3,creux_prevu_mm3 | geo.station + geo.basin + ts.measurement + ref.variable + ref.source |

## 7. ANOMALIES DETECTEES

| Module | Anomalie | Impact | Correction recommandee |
|---|---|---|---|
| Precipitations | Requete SQL fournie echoue sur schema public | Mapping incomplet si on reste strictement sur public.* | Utiliser les schemas reels (api, ts, geo, ref) ou creer des vues de compatibilite public. |
| Debits | Requete SQL fournie echoue sur schema public | Mapping incomplet si on reste strictement sur public.* | Utiliser les schemas reels (api, ts, geo, ref) ou creer des vues de compatibilite public. |
| Apports | Requete SQL fournie echoue sur schema public | Mapping incomplet si on reste strictement sur public.* | Utiliser les schemas reels (api, ts, geo, ref) ou creer des vues de compatibilite public. |
| Volume | Requete SQL fournie echoue sur schema public | Mapping incomplet si on reste strictement sur public.* | Utiliser les schemas reels (api, ts, geo, ref) ou creer des vues de compatibilite public. |

## 8. SCHEMA DES DEPENDANCES
```
[Tables brutes] -> [Views calculees] -> [API Resolvers] -> [Frontend Components]

geo.basin + ts.basin_measurement + ref.* -> api.v_recap_pluie_bv_journalier -> GET /recap/barrage -> RecapTable.tsx
ts.measurement + ref.* + geo.station -> api.v_recap_barrage_journalier -> GET /recap/barrage -> RecapBarrage.tsx
api.v_timeseries_station / ts.basin_measurement -> GET /measurements/timeseries -> Precipitations.tsx / Debits.tsx / Apports.tsx / Volume.tsx
api.v_map_points_kpi + ts.measurement -> GET /map/points-kpi -> HydroMap.tsx / Volume.tsx
ts.basin_measurement(flow_m3s) -> GET /data-availability/basins/apports-recap -> DataAvailabilityScanner.tsx
```

## 9. REPONSES AUX QUESTIONS CLES
| Question | Reponse |
|---|---|
| D ou viennent les precipitations DGM ? | De ts.basin_measurement (precip_mm, sources SIM/AROME/ECMWF/OBS), agregees dans api.v_recap_pluie_bv_journalier. |
| Pourquoi les apports barrage sont vides ? | Les requetes public.* fournies ne matchent pas le schema reel; cote API recap les apports sont calcules depuis flow_m3s si inflow_m3s est absent. |
| Le volume est il OBS ou calcule ? | Le recap exploite majoritairement volume_hm3 source SIM (valeur proche de 8h); le module carte expose OBS et SIM selon disponibilite. |
| Le recap consomme t il des views ou des tables directes ? | Le endpoint /recap/barrage lit api.v_recap_barrage_journalier (vue), qui assemble plusieurs tables/views. |
| Quelles views existent et que calculent elles ? | En public: vues PostGIS systeme; les vues metier sont en schema api (v_recap_*, v_map_points_kpi, v_timeseries_station). |
| Quels endpoints API servent chaque module ? | Precip/Debit/Apport/Volume: /measurements/timeseries; Volume/HydroMap: /map/points-kpi; Recap: /recap/barrage. |

## Annexes (scan code)
### Endpoints detectes (fichiers principaux)
| file | endpoint |
|---|---|
| hydro-sentinel/src/pages/Precipitations.tsx | /measurements/timeseries |
| hydro-sentinel/src/pages/Debits.tsx | /measurements/timeseries |
| hydro-sentinel/src/pages/Apports.tsx | /measurements/timeseries |
| hydro-sentinel/src/pages/Volume.tsx | /measurements/timeseries |
| hydro-sentinel/src/pages/Volume.tsx | /map/points-kpi |
| hydro-sentinel/src/pages/RecapBarrage.tsx | /measurements/timeseries |
| hydro-sentinel/src/components/analysis/RecapTable.tsx | /recap/barrage |
| hydro-sentinel/src/components/admin/DataAvailabilityScanner.tsx | /data-availability/basins/apports-recap |

### Fichiers frontend detectes par module
- Precipitations: 22 fichiers
- Debits: 19 fichiers
- Apports: 14 fichiers
- Volume: 20 fichiers
- Recapitulatif: 7 fichiers