# FUSION_SYNTHESE_HYDROSENTINEL.md - Synthese metier + technique + dashboard

## Objectif

Ce document fusionne:

- la synthese metier ajoutee dans `docs/synthese HydroSentinel.docx`,
- la documentation technique existante dans `docs/kit_ia_adaptatif/`,
- et les fonctionnalites effectivement implementees dans le code frontend/backend.

But: disposer d'une vue unique, exploitable par une equipe produit/technique sans perdre les details deja documentes.

## Sources fusionnees

- Contexte metier: `docs/synthese HydroSentinel.docx`
- Architecture/API/DB/workflows: fichiers du dossier `docs/kit_ia_adaptatif`
- Verification implementation:
  - `hydro-sentinel/src/App.tsx`
  - `hydro-sentinel/src/components/AppSidebar.tsx`
  - `hydro-sentinel/src/pages/*.tsx`
  - `hydro-sentinel/src/components/HydroMap.tsx`
  - `backend/app/api/v1/endpoints/dashboard.py`
  - `backend/app/api/v1/endpoints/admin_new.py`
  - `backend/app/api/v1/endpoints/ts_management.py`
  - `backend/app/api/v1/endpoints/data_availability.py`

## Contexte metier consolide

### Contexte institutionnel

- Suite a des episodes d'inondation sur le bassin du Sebou (Gharb), les autorites demandent un pilotage anticipe des crues.
- Les ABH (dont ABHS) doivent renforcer:
  - la surveillance hydro-meteo,
  - l'anticipation des risques,
  - l'aide a la decision pour les barrages.

### Probleme operationnel

- Les pluies intenses peuvent faire converger rapidement les volumes vers rivieres/barrages.
- Une decision tardive de lachers ou de regulation augmente le risque:
  - debordement barrage,
  - crue en aval,
  - gestion en urgence.

### Finalite HydroSentinel

HydroSentinel est un centre de pilotage numerique qui vise a:

1. Centraliser les donnees hydro-meteo.
2. Suivre l'etat courant du systeme hydraulique.
3. Anticiper l'evolution a court terme (observations + previsions + simulations).
4. Aider la decision sur les lachers (quand, combien, impact aval).

## Donnees et logique decisionnelle

### Donnees mobilisees

- Observations:
  - precipitation stations (OBS),
  - debits, niveaux, volumes, lachers.
- Previsions:
  - AROME,
  - ECMWF.
- Donnees hydrauliques:
  - stations hydro/pluvio,
  - barrages,
  - bassins/sous-bassins.

### Logique de modelisation

- Les vues KPI et series temporelles combinent observations et simulations.
- Les indicateurs critiques (24h, max, cumul, score, severite) servent de base de priorisation.
- Les cartes thematiques (inondation/neige) completent la vision avec composante spatiale satellitaire.

### Question metier centrale

`Faut-il lacher de l'eau, quand, et en quelle quantite, avec quel impact aval ?`

HydroSentinel repond via:

- score/severite par station ou barrage,
- evolution temporelle multi-sources,
- contexte spatial bassin + cartes thematiques.

## Fonctionnalites cles du dashboard (etat implemente)

### 1) Cockpit principal "Carte & Synthese" (`/`)

- KPI de tete:
  - nombre de stations,
  - nombre d'alertes actives,
  - pluie moyenne 24h,
  - debit max.
- Carte interactive Sebou:
  - points stations/barrages + bassins,
  - filtre par type de point,
  - mode d'affichage `vigilance | precip | debit | volume`,
  - bascule source `Observe | Simule` selon disponibilite,
  - popup detaille (pluie/debit/lacher/volume + timestamps).
- Tableau `Top Vigilance (24h)`:
  - classement critique/severite.
- Zoom analytique:
  - selection station depuis la carte,
  - graphique detaille multi-variables (jusqu'a 3 selections),
  - filtres temporels.

### 2) Ecrans d'analyse metier

- `Precipitations` (station ou bassin):
  - OBS/AROME/ECMWF,
  - mode continuite multi-source,
  - vue graphe ou table + export CSV.
- `Debits` (station):
  - OBS/SIM,
  - mode continuite + priorite source.
- `Apports` (barrage) et `Volume` (barrage):
  - OBS/SIM,
  - vue graphe/table,
  - export CSV.
- `Recapitulatif barrage`:
  - jusqu'a 4 series configurables,
  - axes gauche/droite, courbe/barres,
  - mode continuite et diagnostic couverture de donnees.

### 3) Cartes thematiques (`/carte-synthese`)

- Module flood/snow unifie.
- Historique produits + selection temporelle glissante (slider).
- Statistiques de surface (pourcentage, km2, hectares).
- Metadonnees acquisition (satellite, periode, statut).
- Vue "chaine de traitement" des produits.

### 4) Import et administration des donnees

- `Import`:
  - analyse (dry-run) puis execution (write DB),
  - historique des ingestions.
- `Gestion Donnees`:
  - CRUD stations/bassins,
  - upload SHP (`dry_run` preview puis commit),
  - gestion series temporelles:
    - lecture,
    - ajout point,
    - suppression point,
    - suppression serie complete,
    - analyse/import de fichier.
  - telechargement templates intelligents:
    - simple,
    - simple multi-source,
    - multi-variable,
    - multi-variable multi-source,
    - multi-station,
    - multi-bassin.
- `Scan de donnees`:
  - diagnostic couverture station/bassin/variable/source,
  - suppression ciblee de jeux de donnees.

### 5) Exploitation et diagnostic

- `Parametres`:
  - test connexion DB,
  - diagnostics endpoints API critiques.
- `Environnement`:
  - visibilite config `VITE_API_BASE_URL` et `VITE_API_PREFIX`.

## Mapping rapide pages -> APIs backend

| Domaine | APIs principales |
|---|---|
| Carte/KPI | `GET /api/v1/map/points-kpi`, `GET /api/v1/dashboard/top-critical`, `GET /api/v1/basins` |
| Analyse series | `GET /api/v1/measurements/timeseries`, `GET /api/v1/measurements/compare`, `GET /api/v1/measurements/runs` |
| Import pipeline | `POST /api/v1/ingest/analyze`, `POST /api/v1/ingest/execute`, `GET /api/v1/ingest/history` |
| Admin entites | `GET/POST/PUT/DELETE /api/v1/admin/entities/{entity_type}` |
| Timeseries admin | `GET/POST/DELETE /api/v1/admin/timeseries/*`, `POST /api/v1/admin/timeseries/analyze`, `POST /api/v1/admin/timeseries/upload` |
| Templates | `GET /api/v1/admin/templates/*` |
| SHP | `POST /api/v1/admin/shp/upload` |
| Scan disponibilite | `GET /api/v1/admin/data-availability`, `DELETE /api/v1/admin/data-availability/stations/...` |
| Cartes thematiques | `GET /api/v1/thematic-maps/{map_type}`, `/history`, `/products/{product_id}` |

## Ecarts connus a conserver en vigilance

- Frontend expose encore des appels historiques:
  - `/alerts` (non expose par l'API principale),
  - `/ingestions` (route principale effective: `/ingest/history`).
- Les schemas SQL `api/geo/ts/ref/auth` ne sont pas completement versionnes dans ce repo.

## Definition de done (doc fusionnee)

Cette fusion est consideree complete si:

1. Le contexte metier (Sebou, crues, aide a la decision barrages) est explicite.
2. Les fonctionnalites dashboard implementees sont listees page par page.
3. Les APIs backend reliees sont identifiees.
4. Aucun fichier documentation existant n'est supprime.

