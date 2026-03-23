# WORKFLOWS.md - Hydro Sentinel

## Vision globale des workflows

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

Les workflows documentes ci-dessous servent un meme objectif:

- transformer donnees hydro-meteo brutes en signaux de decision exploitables,
- soutenir la prevention crue et le pilotage barrage,
- garantir une boucle continue: observer -> analyser -> agir -> verifier.

## Workflow 1 - Login et session

1. UI appelle `POST /api/v1/login/access-token` avec `username/password`.
2. Backend verifie utilisateur (`auth.user`) et hash mot de passe.
3. Backend retourne JWT.
4. Frontend stocke token (Zustand persist).
5. Interceptor Axios ajoute `Authorization: Bearer <token>`.

## Workflow 2 - Chargement dashboard KPI

1. Page dashboard declenche hooks:
   - `useKpis()`
   - `useAlerts()` (appel actuel potentiellement invalide)
   - top critical
2. Frontend appelle endpoints KPI.
3. Backend agrege mesures recentes depuis `ts.*`, `ref.*`, `geo.*`, `api.v_*`.
4. UI affiche severite/score/cartes/graphes.

## Workflow 3 - Import timeseries (admin)

1. Utilisateur envoie fichier vers `/api/v1/admin/timeseries/analyze`.
2. Backend detecte:
   - colonnes
   - timestamp
   - hints source (`OBS/SIM/AROME/ECMWF`)
3. Utilisateur confirme mode import.
4. Upload final via `/api/v1/admin/timeseries/upload`.
5. Backend ecrit dans `ts.measurement`.
6. UI recharge disponibilite et series.

## Workflow 4 - CRUD entites geo (admin)

1. Liste via `GET /api/v1/admin/entities/{entity_type}`.
2. Creation via `POST`.
3. Mise a jour via `PUT`.
4. Suppression via `DELETE` (avec cleanup mesures pour stations).

## Workflow 5 - Templates import

1. UI appelle `/api/v1/admin/templates/*`.
2. Backend genere fichier Excel avec colonnes adaptees (source suffixee).
3. Frontend telecharge blob.
4. Utilisateur remplit template puis re-upload via endpoints timeseries.

## Workflow 6 - SHP upload

1. Upload `.zip` ou `.shp` vers `/api/v1/admin/shp/upload`.
2. Backend lit shapefile (GeoPandas), normalise CRS en EPSG:4326.
3. `dry_run=true`: retour preview GeoJSON.
4. `dry_run=false`: insertion/mise a jour `geo.station` ou `geo.basin`.

## Workflow 7 - Cartes thematiques

1. UI appelle:
   - `/api/v1/thematic-maps/{map_type}`
   - `/history`
   - `/products/{product_id}`
2. Backend lit catalogues JSON statiques.
3. Backend enrichit eventuellement avec donnees live schema `sebou`.
4. UI affiche masque, stats, historique.

## Workflow 8 - Pipeline Sebou (hors API principale)

1. Operateur lance `python -m app.sebou_monitoring.pipeline.main_pipeline`.
2. Pipeline:
   - acquisition satellites
   - preprocessing
   - detection neige/inondation
   - validation qualite/anomalies
   - export DB + fichiers
3. API Sebou read-only peut exposer resultats via app separee.

## Workflow 9 - Data availability scan

1. UI admin appelle `/api/v1/admin/data-availability`.
2. Backend scanne presence donnees station/basin/variable/source avec timeouts defensifs.
3. UI affiche couverture et trous de donnees.
4. Suppression cible possible via endpoint `DELETE .../data-availability/stations/...`.

## Workflow 10 - Incident handling (recommande)

1. Verifier `/api/v1/health`.
2. Identifier endpoint casse.
3. Verifier existence vues/tables SQL requises.
4. Corriger route/hook incoherent.
5. Valider par test manuel + test automatise minimal.

## Workflow 11 - Carte et synthese (dashboard principal)

1. Chargement page `/` -> appels `/api/v1/map/points-kpi` et `/api/v1/dashboard/top-critical`.
2. UI calcule KPI globaux (stations, alertes, pluie 24h, debit max).
3. Carte affiche bassins + points (stations/barrages) avec filtres type et mode affichage.
4. Utilisateur bascule `Observe/Simule` puis `vigilance/precip/debit/volume`.
5. Clic station -> popup detaille + selection entite pour graphique detaille.

## Workflow 12 - Analyse metier multi-source (precip/debit/apport/volume)

1. Utilisateur choisit entite (station/bassin/barrage) et periode.
2. UI charge series via `/api/v1/measurements/timeseries`.
3. Si plusieurs sources, mode continuite applique une priorite (ex: OBS > SIM ou OBS > AROME > ECMWF).
4. Affichage graphe (courbe/barres) ou table.
5. Export CSV possible depuis la vue analyse.

## Workflow 13 - Recapitulatif barrage multi-series

1. Utilisateur configure jusqu a 4 series (variable, source, type, axe).
2. UI recupere les points par serie et construit une couverture temporelle consolidee.
3. Mode continuite optionnel pour gerer les trous de donnees source.
4. Graphique unique superpose lacher/apport/volume/debit.
5. UI affiche diagnostics de couverture et source effectivement utilisee.

## Workflow 14 - Cartes thematiques flood/snow

1. UI charge catalogue `/api/v1/thematic-maps/{map_type}`.
2. Selection produit courant (dernier ou choisi via historique/slider).
3. UI charge produit detaille `/products/{product_id}`.
4. Carte affiche couche raster/vector + stats surface + metadonnees acquisition.
5. Historique temporel permet navigation evenementielle et comparaison visuelle.
