# Rapport de disponibilite des donnees - Hydro Sentinel

- Date analyse (UTC): 2026-03-06T18:03:33.241320+00:00
- Base analysee: `postgresql+asyncpg://postgres:***@localhost:5432/app_inondation_db`
- Version PostgreSQL: PostgreSQL 17.8 on x86_64-windows, compiled by msvc-19.44.35222, 64-bit
- Unite de temps des periodes: timestamps UTC

## 1) Inventaire global

- api.v_timeseries_basin: 5754 lignes
- api.v_timeseries_station: 165177 lignes
- geo.basin: 7 lignes
- geo.station: 60 lignes
- ts.basin_measurement: 5754 lignes
- ts.measurement: 165177 lignes
- Stations avec donnees: 56/60
- Bassins avec donnees: 7/7

### Repartition des stations par type

- Barrage: 16
- point resultats: 2
- Poste Pluviométrique: 5
- Station hydrologique: 37

## 2) Dictionnaire des variables et sources

### Variables

| code | label | unit | description |
|---|---|---|---|
| flow_m3s | Débit | m3/s | Débit (H/J) |
| inflow_m3s | Apports | m3/s | Apport (H/J) |
| lacher_m3s | Lâchers | m3/s |  |
| precip_mm | Pluie | mm | Pluie (H/J) |
| volume_hm3 | Volume | hm3 | Vol. (H/J) |

### Sources

| code | label | source_type | provider | description |
|---|---|---|---|---|
| ABHS_RES | RÃ©sultats ABHS (barrages/stations) | simulated | ABHS | RÃ©sultats consolidÃ©s (mÃ©tier / modÃ¨le) |
| AROME | PrÃ©visions AROME | forecast | MÃ©tÃ©o / AROME |  |
| ECMWF | PrÃ©visions ECMWF | forecast | ECMWF |  |
| OBS | Observations | observed | ABHS |  |
| SIM | SimulÃ© | simulated | INTERNAL |  |

## 3) Couples variable/source presents globalement

### Stations/Barrages/Postes (api.v_timeseries_station)

| variable | source | nb_lignes | periode_debut | periode_fin |
|---|---|---:|---|---|
| flow_m3s | OBS | 54353 | 2025-12-15T00:00:00+00:00 | 2026-02-26T08:00:00+00:00 |
| flow_m3s | SIM | 2955 | 2026-01-01T00:00:00+00:00 | 2026-03-19T23:00:00+00:00 |
| inflow_m3s | SIM | 1872 | 2026-01-01T00:00:00+00:00 | 2026-03-19T23:00:00+00:00 |
| lacher_m3s | SIM | 1872 | 2026-01-01T00:00:00+00:00 | 2026-03-19T23:00:00+00:00 |
| precip_mm | ECMWF | 1074 | 2026-02-26T01:00:00+00:00 | 2026-03-20T00:00:00+00:00 |
| precip_mm | OBS | 82237 | 2025-12-15T00:00:00+00:00 | 2026-03-05T14:00:00+00:00 |
| volume_hm3 | OBS | 18942 | 2025-12-15T00:00:00+00:00 | 2026-02-20T11:00:00+00:00 |
| volume_hm3 | SIM | 1872 | 2026-01-01T00:00:00+00:00 | 2026-03-19T23:00:00+00:00 |

### Bassins (ts.basin_measurement)

| variable | source | nb_lignes | periode_debut | periode_fin |
|---|---|---:|---|---|
| precip_mm | AROME | 2520 | 2026-02-26T01:00:00+00:00 | 2026-03-13T00:00:00+00:00 |
| precip_mm | ECMWF | 2520 | 2026-02-26T01:00:00+00:00 | 2026-03-13T00:00:00+00:00 |
| precip_mm | OBS | 714 | 2026-02-26T01:00:00+00:00 | 2026-03-02T06:00:00+00:00 |

## 4) Positions vides (entites sans donnees)

### Stations/Barrages/Postes sans aucune ligne

- BRG AIT MOULAY AHMED (code=60, type=Barrage, id=7ef56ec6-8898-4afe-9dca-806ca1e217b0)
- Confluence ouergha sebou (code=57, type=point resultats, id=85931069-f178-437a-8601-f2c80521a98a)
- Confluence Sebou aval (code=56, type=point resultats, id=95e951db-475b-485a-bd1c-2c8a13196bcb)
- Khenichet (code=33, type=Station hydrologique, id=dbc64b6b-c431-4906-908f-b9f2deb749b0)

## 5) Matrice attendue (deduite des donnees existantes)

### Type station: Barrage
- Nombre de couples variable/source observes dans ce type: 8
- flow_m3s (Débit) / OBS (Observations)
- flow_m3s (Débit) / SIM (SimulÃ©)
- inflow_m3s (Apports) / SIM (SimulÃ©)
- lacher_m3s (Lâchers) / SIM (SimulÃ©)
- precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
- precip_mm (Pluie) / OBS (Observations)
- volume_hm3 (Volume) / OBS (Observations)
- volume_hm3 (Volume) / SIM (SimulÃ©)

### Type station: Poste Pluviométrique
- Nombre de couples variable/source observes dans ce type: 2
- precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
- precip_mm (Pluie) / OBS (Observations)

### Type station: Station hydrologique
- Nombre de couples variable/source observes dans ce type: 4
- flow_m3s (Débit) / OBS (Observations)
- flow_m3s (Débit) / SIM (SimulÃ©)
- precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
- precip_mm (Pluie) / OBS (Observations)

### Type bassin (global)
- Nombre de couples variable/source observes: 3
- precip_mm (Pluie) / AROME (PrÃ©visions AROME)
- precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
- precip_mm (Pluie) / OBS (Observations)

## 6) Priorites de remplissage (manques les plus frequents)

### Barrage
- flow_m3s/OBS: manque sur 15 station(s) de ce type
- precip_mm/ECMWF: manque sur 15 station(s) de ce type
- flow_m3s/SIM: manque sur 15 station(s) de ce type
- inflow_m3s/SIM: manque sur 15 station(s) de ce type
- lacher_m3s/SIM: manque sur 15 station(s) de ce type
- volume_hm3/SIM: manque sur 15 station(s) de ce type
- volume_hm3/OBS: manque sur 4 station(s) de ce type
- precip_mm/OBS: manque sur 1 station(s) de ce type

### Poste Pluviométrique
- precip_mm/ECMWF: manque sur 4 station(s) de ce type

### Station hydrologique
- flow_m3s/SIM: manque sur 36 station(s) de ce type
- precip_mm/ECMWF: manque sur 31 station(s) de ce type
- flow_m3s/OBS: manque sur 2 station(s) de ce type
- precip_mm/OBS: manque sur 1 station(s) de ce type

## 7) Detail complet par station / barrage / poste

### Bge Al Wahda (code=10, type=Barrage)
- station_id: 05b69e8f-d0a1-4dfa-b1b3-933e3ccb714a
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 10624
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-19T23:00:00+00:00
- couverture_vs_type: 6/8 (75.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / SIM (SimulÃ©, type=simulated, provider=INTERNAL) : 1872 lignes, 2026-01-01T00:00:00+00:00 -> 2026-03-19T23:00:00+00:00
  - inflow_m3s (Apports, m3/s) / SIM (SimulÃ©, type=simulated, provider=INTERNAL) : 1872 lignes, 2026-01-01T00:00:00+00:00 -> 2026-03-19T23:00:00+00:00
  - lacher_m3s (Lâchers, m3/s) / SIM (SimulÃ©, type=simulated, provider=INTERNAL) : 1872 lignes, 2026-01-01T00:00:00+00:00 -> 2026-03-19T23:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1518 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1618 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / SIM (SimulÃ©, type=simulated, provider=INTERNAL) : 1872 lignes, 2026-01-01T00:00:00+00:00 -> 2026-03-19T23:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Bge Allal Al Fassi (code=3, type=Barrage)
- station_id: d76c48a5-4c05-44ae-a9fb-68d2a00828b9
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 1623
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1521 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - volume_hm3 (Volume) / OBS (Observations)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Asfallou (code=11, type=Barrage)
- station_id: a116487f-9815-495e-945a-d5a2af20a102
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3076
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1488 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1588 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Bab Louta (code=12, type=Barrage)
- station_id: a13e366f-5b3f-47a7-ad07-12e2bcde364f
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 2430
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1139 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1291 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Bouhouda (code=13, type=Barrage)
- station_id: 3b66e39c-331b-4db1-aad2-8f4aa2df1575
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3055
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1478 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1577 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Garde de Sebou (code=14, type=Barrage)
- station_id: d8806731-95fe-48c7-b268-d2d79390c202
- bassin: bas sebou (code=2, id=784737e1-f7bd-4823-9df6-de41df7bdc3b)
- lignes_total: 3447
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 3/8 (37.5%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 306 lignes, 2026-02-07T18:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1619 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Idriss 1er (code=15, type=Barrage)
- station_id: 673eca14-7bef-43d9-802a-ad5975024602
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 3111
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1506 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1605 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Kansera (code=16, type=Barrage)
- station_id: 2af8d8fb-766f-472f-b941-2541d0e77645
- bassin: beht (code=3, id=4c5512f7-2c9a-4d63-b88a-ad66d081a615)
- lignes_total: 3140
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1521 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1619 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### BGE Michlifen (code=55, type=Barrage)
- station_id: ea84d0c6-5711-4e6e-88d5-2ef15b7f601c
- bassin: beht (code=3, id=4c5512f7-2c9a-4d63-b88a-ad66d081a615)
- lignes_total: 1297
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- couverture_vs_type: 1/8 (12.5%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1297 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / OBS (Observations)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Ouljet Soltane (code=38, type=Barrage)
- station_id: f4e10b72-0c07-4182-9c95-8ee66cd65e5d
- bassin: beht (code=3, id=4c5512f7-2c9a-4d63-b88a-ad66d081a615)
- lignes_total: 3080
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1490 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1590 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Sahla (code=17, type=Barrage)
- station_id: 6afec03b-124d-4d79-972d-91d85558254b
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3059
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1479 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1580 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Bge Sidi Chahed (code=18, type=Barrage)
- station_id: 2f6ebe9f-e99a-400c-a020-8c2cded6d8a1
- bassin: moyen sebou (code=6, id=e32115cf-7d84-4df3-99cb-ccacbd3cc065)
- lignes_total: 3143
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### BRG AIT MOULAY AHMED (code=60, type=Barrage)
- station_id: 7ef56ec6-8898-4afe-9dca-806ca1e217b0
- bassin: beht (code=3, id=4c5512f7-2c9a-4d63-b88a-ad66d081a615)
- lignes_total: 0
- periode_globale: n/a -> n/a
- couverture_vs_type: 0/8 (0.0%)
- donnees_par_variable_source: aucune
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - precip_mm (Pluie) / OBS (Observations)
  - volume_hm3 (Volume) / OBS (Observations)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### BRG ETTINE (code=58, type=Barrage)
- station_id: be2624ff-7da2-4c63-88be-ce7b21cb0208
- bassin: bas sebou (code=2, id=784737e1-f7bd-4823-9df6-de41df7bdc3b)
- lignes_total: 3139
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1520 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1619 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### BRG MAKRACH (code=61, type=Barrage)
- station_id: 82c117ea-4186-452c-89f4-a74034238bf3
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 3133
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T08:00:00+00:00
- couverture_vs_type: 2/8 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1517 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T09:00:00+00:00
  - volume_hm3 (Volume, hm3) / OBS (Observations, type=observed, provider=ABHS) : 1616 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T08:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### BRG SEHB ELMARGA (code=59, type=Barrage)
- station_id: e194bacc-23ab-481d-bad1-2c7e5ea9072c
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 1162
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-04T23:00:00+00:00
- couverture_vs_type: 1/8 (12.5%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1162 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-04T23:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - inflow_m3s (Apports) / SIM (SimulÃ©)
  - lacher_m3s (Lâchers) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - volume_hm3 (Volume) / OBS (Observations)
  - volume_hm3 (Volume) / SIM (SimulÃ©)

### Confluence ouergha sebou (code=57, type=point resultats)
- station_id: 85931069-f178-437a-8601-f2c80521a98a
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 0
- periode_globale: n/a -> n/a
- couverture_vs_type: 0/0 (100.0%)
- donnees_par_variable_source: aucune
- manques_vs_matrice_type: aucun

### Confluence Sebou aval (code=56, type=point resultats)
- station_id: 95e951db-475b-485a-bd1c-2c8a13196bcb
- bassin: bas sebou (code=2, id=784737e1-f7bd-4823-9df6-de41df7bdc3b)
- lignes_total: 0
- periode_globale: n/a -> n/a
- couverture_vs_type: 0/0 (100.0%)
- donnees_par_variable_source: aucune
- manques_vs_matrice_type: aucun

### Aguelmam Sidi Ali (code=1, type=Poste Pluviométrique)
- station_id: 1c5153a0-445e-4f52-b355-d499a4fbeb52
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 1617
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- couverture_vs_type: 2/2 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1515 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type: aucun

### Bab Taza (code=8, type=Poste Pluviométrique)
- station_id: bea097c7-e3d2-43dc-abd2-7fd8116e83a3
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 1522
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- couverture_vs_type: 1/2 (50.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Fes(ABHS) (code=27, type=Poste Pluviométrique)
- station_id: 827cb524-d155-45cd-94fe-19c43068b5ec
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 1522
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- couverture_vs_type: 1/2 (50.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Jbel Outka (code=31, type=Poste Pluviométrique)
- station_id: bb71e0a9-7f57-476b-9338-00d5ddc86767
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 1481
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- couverture_vs_type: 1/2 (50.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1481 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### POMPAGE EST 2 (code=62, type=Poste Pluviométrique)
- station_id: 794ced18-7d9d-4777-9d98-cd9c36aa874e
- bassin: moyen sebou (code=6, id=e32115cf-7d84-4df3-99cb-ccacbd3cc065)
- lignes_total: 1523
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- couverture_vs_type: 1/2 (50.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Ain Aicha (code=54, type=Station hydrologique)
- station_id: 9a53019e-1a56-49ed-a7aa-67c14158f3f4
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3534
- periode_globale: 2026-01-01T00:00:00+00:00 -> 2026-03-20T00:00:00+00:00
- couverture_vs_type: 4/4 (100.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 564 lignes, 2026-02-02T21:00:00+00:00 -> 2026-02-26T08:00:00+00:00
  - flow_m3s (Débit, m3/s) / SIM (SimulÃ©, type=simulated, provider=INTERNAL) : 1083 lignes, 2026-02-02T21:00:00+00:00 -> 2026-03-19T23:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-03-05T01:00:00+00:00 -> 2026-03-20T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1527 lignes, 2026-01-01T00:00:00+00:00 -> 2026-03-05T14:00:00+00:00
- manques_vs_matrice_type: aucun

### Ain El Ouali (code=51, type=Station hydrologique)
- station_id: 725b507f-fa16-4e9f-83b0-4562c02f18ed
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3129
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1614 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1515 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Ain Sebou (code=50, type=Station hydrologique)
- station_id: 9135a11d-7405-484d-abe4-9d505f73c75f
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3104
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1617 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1487 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Ait Khabbach (code=2, type=Station hydrologique)
- station_id: 53c3afb0-fbf5-45c7-8307-57f195359293
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3243
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- couverture_vs_type: 3/4 (75.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1521 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)

### Azibe Soltane (code=4, type=Station hydrologique)
- station_id: 3a47613d-4093-4b15-be03-c507df06553a
- bassin: moyen sebou (code=6, id=e32115cf-7d84-4df3-99cb-ccacbd3cc065)
- lignes_total: 3245
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- couverture_vs_type: 3/4 (75.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)

### Azzaba (code=52, type=Station hydrologique)
- station_id: a53ae6d0-c5a0-4770-b81c-494bc38817b0
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3143
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Bab Chhoub (code=5, type=Station hydrologique)
- station_id: 97820f63-1c62-421d-94b5-dab234dc7f2a
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 3244
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- couverture_vs_type: 3/4 (75.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)

### Bab Merzouka (code=6, type=Station hydrologique)
- station_id: 314c4ef6-4f61-468e-a3d2-7e4edf5b5c0e
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 3229
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- couverture_vs_type: 3/4 (75.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1613 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1514 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)

### Bab Ouender (code=7, type=Station hydrologique)
- station_id: e3fd8ec9-b489-40eb-a41e-81dab24847f0
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 2594
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- couverture_vs_type: 3/4 (75.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1223 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T08:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1269 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T09:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)

### Belksiri (code=9, type=Station hydrologique)
- station_id: b74ddcc4-cd6c-447c-bfc9-5f6a9e9923bb
- bassin: bas sebou (code=2, id=784737e1-f7bd-4823-9df6-de41df7bdc3b)
- lignes_total: 3137
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1618 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1519 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Bni Haitem (code=19, type=Station hydrologique)
- station_id: b733a005-e048-40db-be0d-1c3c31f3799c
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 3143
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Boufellou (code=20, type=Station hydrologique)
- station_id: 3907b326-38b6-402d-a29d-0277f8a1b012
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 2980
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1577 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1403 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Boured (code=21, type=Station hydrologique)
- station_id: 2d5bb3a7-63cf-4d33-a081-89f1ceb9127b
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3142
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Dar El Arsa (code=49, type=Station hydrologique)
- station_id: 7bc1d9da-da25-4407-892f-ed8cfe7eeb25
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3116
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1607 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1509 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Dar El Hamra (code=22, type=Station hydrologique)
- station_id: bf80fe7c-6a10-4c39-b027-28aa2ce5d0a3
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3024
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1546 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1478 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Dar Salem (code=23, type=Station hydrologique)
- station_id: cd5473c5-ffe4-493f-8d05-a76ff3aba0fa
- bassin: bas sebou (code=2, id=784737e1-f7bd-4823-9df6-de41df7bdc3b)
- lignes_total: 3140
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1520 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### El Hammam (code=24, type=Station hydrologique)
- station_id: 73a59639-83f1-4858-a156-ed7437988770
- bassin: beht (code=3, id=4c5512f7-2c9a-4d63-b88a-ad66d081a615)
- lignes_total: 3140
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1520 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### El Malha (code=25, type=Station hydrologique)
- station_id: dc8702ed-b4f6-4c12-9963-5887891f739d
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3077
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1590 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1487 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### El Mers (code=26, type=Station hydrologique)
- station_id: 67dd82e5-5d99-4ba8-a668-241ca7db0f99
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3142
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Galaz (code=28, type=Station hydrologique)
- station_id: 92eee75d-8edc-4809-8fb4-d7952dbbb396
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 2455
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-17T16:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1355 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-17T16:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1100 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-13T12:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Had Kourt (code=29, type=Station hydrologique)
- station_id: 2863f5e1-c7db-4d93-b92b-b2d5abcb566f
- bassin: bas sebou (code=2, id=784737e1-f7bd-4823-9df6-de41df7bdc3b)
- lignes_total: 3143
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Hajria (code=30, type=Station hydrologique)
- station_id: c9868413-5bbd-4d83-9bdd-79bb738f746f
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3143
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Jorf El Malha (code=32, type=Station hydrologique)
- station_id: f099ea17-8a81-4bee-ac99-da8e33d6ee96
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3142
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Kharrouba (code=41, type=Station hydrologique)
- station_id: 1577cd6e-a3c9-417b-8e80-23963f1b67fa
- bassin: bas sebou (code=2, id=784737e1-f7bd-4823-9df6-de41df7bdc3b)
- lignes_total: 3099
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T09:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1612 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T09:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1487 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T09:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Khenichet (code=33, type=Station hydrologique)
- station_id: dbc64b6b-c431-4906-908f-b9f2deb749b0
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 0
- periode_globale: n/a -> n/a
- couverture_vs_type: 0/4 (0.0%)
- donnees_par_variable_source: aucune
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)
  - precip_mm (Pluie) / OBS (Observations)

### Lalla Mimouna (code=34, type=Station hydrologique)
- station_id: f7ee85e4-9784-4973-83a0-1a0fd9511ae4
- bassin: bassins cotiers (code=7, id=159828bc-41d7-4591-975d-08939f4b7428)
- lignes_total: 3142
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1522 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### My Ali Cherif (code=35, type=Station hydrologique)
- station_id: f6dcb133-431d-426f-a77c-c63accf80da9
- bassin: bassins cotiers (code=7, id=159828bc-41d7-4591-975d-08939f4b7428)
- lignes_total: 3143
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1523 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Oued ifrane (code=36, type=Station hydrologique)
- station_id: 0bd877a9-2291-4b12-b71a-bea858ccbb18
- bassin: beht (code=3, id=4c5512f7-2c9a-4d63-b88a-ad66d081a615)
- lignes_total: 3141
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1521 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Pont Ait Aissa (code=39, type=Station hydrologique)
- station_id: fed14462-423c-426e-b9c1-5db56c8a18b6
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3133
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1619 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1514 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Ratba (code=42, type=Station hydrologique)
- station_id: 84171a00-33ab-4be6-becc-6400e2389267
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 2033
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T09:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1068 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T09:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 965 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-03T18:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Route 26 (code=43, type=Station hydrologique)
- station_id: b6a95f76-cd6d-4139-88a3-175051dd5f04
- bassin: moyen sebou (code=6, id=e32115cf-7d84-4df3-99cb-ccacbd3cc065)
- lignes_total: 1519
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- couverture_vs_type: 1/4 (25.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1519 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / OBS (Observations)
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Souk El Had (code=44, type=Station hydrologique)
- station_id: fc19c630-a302-412a-892b-0c626e88489d
- bassin: beht (code=3, id=4c5512f7-2c9a-4d63-b88a-ad66d081a615)
- lignes_total: 3141
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1521 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Tabouda (code=45, type=Station hydrologique)
- station_id: f2a2852e-82c2-44e7-9135-60ed6bf40b10
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 2772
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1444 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T10:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1328 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Taghrout (code=53, type=Station hydrologique)
- station_id: 00512de3-cb27-495d-9c51-210838e05196
- bassin: Haut Sebou (code=4, id=45d0b242-2fe0-48ee-9570-bb012e936c28)
- lignes_total: 3130
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1620 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1510 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Taghzout (code=46, type=Station hydrologique)
- station_id: 4e154cbc-ffe1-480e-a890-2083338dbdf9
- bassin: Ouergha (code=1, id=3645c19b-971f-495f-9b17-1f1693b8340e)
- lignes_total: 3104
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1602 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1502 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Tissa (code=47, type=Station hydrologique)
- station_id: b76ecd6f-fbd1-4e04-8745-b1f2ef14f0af
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 3138
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1619 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1519 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

### Zrarda (code=48, type=Station hydrologique)
- station_id: a98eba67-6039-483a-9d08-dedce2bb9b7a
- bassin: lebene (code=5, id=1e2160e9-139b-48b9-a7e9-72cf3e96bd62)
- lignes_total: 3109
- periode_globale: 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
- couverture_vs_type: 2/4 (50.0%)
- donnees_par_variable_source:
  - flow_m3s (Débit, m3/s) / OBS (Observations, type=observed, provider=ABHS) : 1619 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-20T11:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 1490 lignes, 2025-12-15T00:00:00+00:00 -> 2026-02-16T10:00:00+00:00
- manques_vs_matrice_type:
  - flow_m3s (Débit) / SIM (SimulÃ©)
  - precip_mm (Pluie) / ECMWF (PrÃ©visions ECMWF)

## 8) Detail complet par bassin

### bas sebou (code=2, level=0)
- basin_id: 784737e1-f7bd-4823-9df6-de41df7bdc3b
- parent_basin_id: 
- lignes_total: 822
- periode_globale: 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
- couverture_vs_bassins: 3/3 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / AROME (PrÃ©visions AROME, type=forecast, provider=MÃ©tÃ©o / AROME) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- manques_vs_matrice_bassin: aucun

### bassins cotiers (code=7, level=0)
- basin_id: 159828bc-41d7-4591-975d-08939f4b7428
- parent_basin_id: 
- lignes_total: 822
- periode_globale: 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
- couverture_vs_bassins: 3/3 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / AROME (PrÃ©visions AROME, type=forecast, provider=MÃ©tÃ©o / AROME) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- manques_vs_matrice_bassin: aucun

### beht (code=3, level=0)
- basin_id: 4c5512f7-2c9a-4d63-b88a-ad66d081a615
- parent_basin_id: 
- lignes_total: 822
- periode_globale: 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
- couverture_vs_bassins: 3/3 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / AROME (PrÃ©visions AROME, type=forecast, provider=MÃ©tÃ©o / AROME) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- manques_vs_matrice_bassin: aucun

### Haut Sebou (code=4, level=0)
- basin_id: 45d0b242-2fe0-48ee-9570-bb012e936c28
- parent_basin_id: 
- lignes_total: 822
- periode_globale: 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
- couverture_vs_bassins: 3/3 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / AROME (PrÃ©visions AROME, type=forecast, provider=MÃ©tÃ©o / AROME) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- manques_vs_matrice_bassin: aucun

### lebene (code=5, level=0)
- basin_id: 1e2160e9-139b-48b9-a7e9-72cf3e96bd62
- parent_basin_id: 
- lignes_total: 822
- periode_globale: 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
- couverture_vs_bassins: 3/3 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / AROME (PrÃ©visions AROME, type=forecast, provider=MÃ©tÃ©o / AROME) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- manques_vs_matrice_bassin: aucun

### moyen sebou (code=6, level=0)
- basin_id: e32115cf-7d84-4df3-99cb-ccacbd3cc065
- parent_basin_id: 
- lignes_total: 822
- periode_globale: 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
- couverture_vs_bassins: 3/3 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / AROME (PrÃ©visions AROME, type=forecast, provider=MÃ©tÃ©o / AROME) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- manques_vs_matrice_bassin: aucun

### Ouergha (code=1, level=0)
- basin_id: 3645c19b-971f-495f-9b17-1f1693b8340e
- parent_basin_id: 
- lignes_total: 822
- periode_globale: 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
- couverture_vs_bassins: 3/3 (100.0%)
- donnees_par_variable_source:
  - precip_mm (Pluie, mm) / AROME (PrÃ©visions AROME, type=forecast, provider=MÃ©tÃ©o / AROME) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / ECMWF (PrÃ©visions ECMWF, type=forecast, provider=ECMWF) : 360 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-13T00:00:00+00:00
  - precip_mm (Pluie, mm) / OBS (Observations, type=observed, provider=ABHS) : 102 lignes, 2026-02-26T01:00:00+00:00 -> 2026-03-02T06:00:00+00:00
- manques_vs_matrice_bassin: aucun

## 9) Exemple cible (Ain Aicha)

- Entite: Ain Aicha (code=54, type=Station hydrologique)
- flow_m3s / OBS: 564 lignes (2026-02-02T21:00:00+00:00 -> 2026-02-26T08:00:00+00:00)
- flow_m3s / SIM: 1083 lignes (2026-02-02T21:00:00+00:00 -> 2026-03-19T23:00:00+00:00)
- precip_mm / ECMWF: 360 lignes (2026-03-05T01:00:00+00:00 -> 2026-03-20T00:00:00+00:00)
- precip_mm / OBS: 1527 lignes (2026-01-01T00:00:00+00:00 -> 2026-03-05T14:00:00+00:00)
- Manques vs type: aucun
