# Addendum Implementation - 2026-03-25

## Objet

Tracer les updates appliquees dans le code (UI/API/SQL) depuis les livrables initiaux, sans modifier la logique metier de reference.

## Perimetre des updates

### 1) Carte & Synthese - Shapes ABH/DGM

- Ajout/usage explicite des couches `Bassins ABH` et `Bassins DGM`.
- Priorite de chargement DGM depuis GeoJSON local derive du shapefile:
  - `hydro-sentinel/public/data/basins_dgm.geojson`
- Fallback maintenu sur API existante si necessaire.

### 2) Gestion des Donnees - Separation ABH/DGM

- Ajout d'un toggle `ABH / DGM` dans les vues `Stations` et `Bassins`.
- Regles d'affichage:
  - `Stations`:
    - ABH: barrages
    - DGM: autres stations
  - `Bassins`:
    - ABH: referentiel base
    - DGM: referentiel GeoJSON local
- Bassins DGM en lecture seule dans le CRUD (pas de suppression/edition locale).

### 3) Precipitations

- `Par bassin`: ajout du selecteur `Shape (ABH/DGM)` avant le choix du bassin.
- `Par station`: retrait de ce selecteur (retour au comportement attendu).
- Filtrage des listes selon shape avec conservation du comportement des graphes/cumuls.

### 4) Scan de donnees

- Ajout du bouton `Supprimer` sur lignes variable/source.
- Suppression effective:
  - stations: suppression deja presente et conservee
  - bassins: ajout endpoint backend dedie
- Ajout du toggle `Shape (ABH/DGM)` dans l'onglet `Bassins`.
  - ABH: donnees scanner DB
  - DGM: bassins charges depuis `basins_dgm.geojson` avec tentative d'appariement nom/code pour reutiliser les stats.

### 5) API admin - suppression bassin

- Nouvel endpoint:
  - `DELETE /api/v1/admin/data-availability/basins/{basin_id}/variables/{variable_code}/sources/{source_code}`
- Suppression dans `ts.basin_measurement`.
- Ajustements SQL pour fiabiliser l'execution des suppressions.

### 6) Recapitulatif barrage / SQL recap

- Ajustements des vues recap pour aligner les variables disponibles:
  - `flow_m3s`, `inflow_m3s`, `lacher_m3s`, `volume_hm3`, `precip_mm`
- Correction principale sur le calcul des apports via `inflow_m3s`.
- Stabilisations associees cote affichage recap.

## Fichiers techniques principalement impactes

- Frontend:
  - `hydro-sentinel/src/components/HydroMap.tsx`
  - `hydro-sentinel/src/pages/DataManagement.tsx`
  - `hydro-sentinel/src/pages/Precipitations.tsx`
  - `hydro-sentinel/src/components/admin/DataAvailabilityScanner.tsx`
- Backend:
  - `backend/app/api/v1/endpoints/data_availability.py`
  - `backend/sql/recap_views.sql`
- Donnees geographiques:
  - `SHP DGM/` (source)
  - `hydro-sentinel/public/data/basins_dgm.geojson` (artefact runtime frontend)

## Note

Cet addendum documente les evolutions implementatives. Les objectifs metier, l'architecture cible et les decisions GO/NO-GO restent portes par les livrables officiels existants.
