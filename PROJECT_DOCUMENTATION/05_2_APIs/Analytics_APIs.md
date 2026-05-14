# Analytics APIs



Cette page documente analytics apis dans le cadre de la section 05 APIs.



## Catalogue API

| Module | Méthode | URL finale |
| --- | --- | --- |
| admin_data_availability | GET | /api/v1/admin/data-availability |
| admin_new | DELETE | /api/v1/admin/entities/{entity_type}/{entity_id} |
| admin_new | GET | /api/v1/admin/entities/{entity_type} |
| admin_new | GET | /api/v1/admin/templates/multi-bassin |
| admin_new | GET | /api/v1/admin/templates/multi-station |
| admin_new | GET | /api/v1/admin/templates/multi-variable |
| admin_new | GET | /api/v1/admin/templates/multi-variable-multi-source |
| admin_new | GET | /api/v1/admin/templates/simple |
| admin_new | GET | /api/v1/admin/templates/simple-multi-source |
| admin_new | POST | /api/v1/admin/entities/{entity_type} |
| admin_new | POST | /api/v1/admin/shp/upload |
| admin_new | PUT | /api/v1/admin/entities/{entity_type}/{entity_id} |
| alertes | GET | /api/v1/alertes/prevision |
| auth | GET | /api/v1/me |
| auth | POST | /api/v1/login/access-token |
| dashboard | GET | /api/v1/dashboard/top-critical |
| dashboard | GET | /api/v1/map/points-kpi |
| data_availability | DELETE | /api/v1/admin/data-availability/basins/{basin_id}/variables/{variable_code}/sources/{source_code} |
| data_availability | DELETE | /api/v1/admin/data-availability/stations/{station_id}/variables/{variable_code}/sources/{source_code} |
| data_availability | GET | /api/v1/admin/data-availability |
| data_availability | GET | /api/v1/admin/data-availability/basins/apports-recap |
| data_availability | GET | /api/v1/admin/stations-with-data |
| data_availability | POST | /api/v1/admin/test-connection |
| health | GET | /api/v1/health |
| import_spatial | POST | /api/v1/import/spatial |
| ingest | GET | /api/v1/ingest/history |
| ingest | POST | /api/v1/ingest/analyze |
| ingest | POST | /api/v1/ingest/execute |
| measurements | GET | /api/v1/measurements/availability-window |
| measurements | GET | /api/v1/measurements/compare |
| measurements | GET | /api/v1/measurements/runs |
| measurements | GET | /api/v1/measurements/timeseries |
| measurements | GET | /api/v1/measurements/window/24h |
| recapitulatif | GET | /api/v1/recap/alertes/prevision |
| recapitulatif | GET | /api/v1/recap/barrage |
| sites | GET | /api/v1/basins |
| sites | GET | /api/v1/stations |
| test_geo | GET | /api/v1/test/test/geo-basins |
| test_geo | GET | /api/v1/test/test/geo-stations |
| thematic_maps | GET | /api/v1/thematic-maps/assets/{map_type}/{product_id}/{file_path:path} |
| thematic_maps | GET | /api/v1/thematic-maps/{map_type} |
| thematic_maps | GET | /api/v1/thematic-maps/{map_type}/history |
| thematic_maps | GET | /api/v1/thematic-maps/{map_type}/products/{product_id} |
| ts_management | DELETE | /api/v1/admin/timeseries/{variable_code}/{station_id} |
| ts_management | DELETE | /api/v1/admin/timeseries/{variable_code}/{station_id}/{timestamp} |
| ts_management | GET | /api/v1/admin/timeseries/sources |
| ts_management | GET | /api/v1/admin/timeseries/{variable_code} |
| ts_management | GET | /api/v1/admin/timeseries/{variable_code}/{station_id} |
| ts_management | POST | /api/v1/admin/timeseries/analyze |
| ts_management | POST | /api/v1/admin/timeseries/upload |
| ts_management | POST | /api/v1/admin/timeseries/{variable_code}/{station_id} |
| variables | GET | /api/v1/variables |


## Lecture exécutive

Cette page de la section 05 APIs approfondit analytics apis à partir du code réel.


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
