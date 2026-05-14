# Spatial Indexes



Cette page documente spatial indexes dans le cadre de la section 06 Geospatial Data.



## Actifs géospatiaux

| Élément |
| --- |
| Documentation |
| Inondations_Sebou |
| Neige_Sebou_12-11-25_04-03-26 |
| PROJECT_DOCUMENTATION |
| SHP DGM |
| tiff_pcp_2603 |
| backend/data/thematic_maps |
| backend/config/sebou |
| backend/sql |


## Lecture exécutive

Cette page de la section 06 Geospatial Data approfondit spatial indexes à partir du code réel.


## Ce que la page couvre

- les éléments observés dans le dépôt
- les routes, composants, services ou données réellement présents
- les usages métier et techniques sans invention de workflow


## Références internes

| Catégorie | Référence réelle | Intérêt |
| --- | --- | --- |
| Frontend | hydro-sentinel/src/App.tsx | navigation, lazy loading et routes protégées |
| Backend | backend/app/api/v1/api.py | routeurs exposés à l'API |
| Données | backend/data/thematic_maps | produits thématiques et assets spatiaux |
| Pipeline | backend/app/sebou_monitoring | préparation, détection et export |


## Lecture opérationnelle

- la page doit servir la lecture rapide des équipes métier
- les détails techniques doivent rester reliés à des fichiers du projet
- les points d'intégration doivent être clairs pour l'équipe IT


## Points de maintenance

- réexécuter le générateur après une modification du code
- garder les liens et exemples alignés avec les routes réelles
- actualiser les chapitres lorsqu'un composant ou un endpoint évolue
