# Proposition technique - modules cartographiques inondation et neige

Date: 2026-03-07

## 1) Sidebar / navigation frontend

Nouvelles routes ajoutees:

- `/carte-inondation`
- `/carte-couverture-neige`

Nouvelles entrees sidebar:

- `Carte inondation`
- `Carte couverture de neige`

## 2) Pages React et composants

Pages:

- `src/pages/FloodMap.tsx`
- `src/pages/SnowCoverageMap.tsx`
- `src/pages/ThematicMapModule.tsx` (page generique reutilisable)

Composants:

- `src/components/thematic/ThematicMapViewer.tsx`:
  - carte interactive MapLibre
  - couches superposables
  - opacite par couche
  - affichage raster + masque binaire (via couches API)
- `src/components/thematic/ThematicStatsCards.tsx`:
  - surfaces positive/negative en m2, km2, ha
  - pourcentages
- `src/components/thematic/ThematicHistoryPanel.tsx`:
  - historique par date/evenement
  - selection d'un produit cartographique
- `src/components/thematic/ProcessingChainCard.tsx`:
  - affichage de la chaine de traitement complete

## 3) Backend / API

Nouveau endpoint:

- `backend/app/api/v1/endpoints/thematic_maps.py`

Routes exposees:

- `GET /api/v1/thematic-maps/{map_type}`
  - catalogue (flood/snow), chaine de traitement, historique filtre
- `GET /api/v1/thematic-maps/{map_type}/history`
  - historique (date/evenement)
- `GET /api/v1/thematic-maps/{map_type}/products/{product_id}`
  - detail produit, couches et stats
- `GET /api/v1/thematic-maps/assets/{map_type}/{product_id}/{file_path}`
  - service de fichiers raster/masques stockes localement

Schemas:

- `backend/app/schemas/thematic_map.py`

## 4) Stockage des resultats

Metadonnees/couches/statistiques (JSON):

- `backend/data/thematic_maps/flood_products.json`
- `backend/data/thematic_maps/snow_products.json`

Structure fichiers raster/masques recommandee:

- `backend/data/thematic_maps/assets/flood/<product_id>/`
- `backend/data/thematic_maps/assets/snow/<product_id>/`

Fichiers attendus par produit:

- `classification.tif`
- `mask_positive.tif` (eau ou neige)
- `mask_negative.tif` (non eau ou non neige)
- `stats.json`
- `metadata.json`

## 5) Chaine traitement -> resultats -> affichage

1. Acquisition satellite
2. Pretraitement
3. Extraction information (classification binaire)
4. Generation raster
5. Generation masques binaires
6. Publication cartographique (API)
7. Calcul statistiques surfaces
8. Consultation frontend (carte + historique + stats)

## 6) Extensibilite

La page `ThematicMapModule` et les schemas API sont generiques.
Pour ajouter un nouveau theme (ex: vegetation, secheresse), il suffit de:

- ajouter un `map_type` + fichier JSON de produits
- exposer les couches/statistiques avec le meme contrat API
- ajouter une route frontend et une entree sidebar
