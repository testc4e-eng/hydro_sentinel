# Schemas Tables Views



Cette page documente schemas tables views dans le cadre de la section Database.



## Schémas réels

| Schéma | Objet | Nature | Usage |
| --- | --- | --- | --- |
| auth | user | table | authentification et rôles |
| api | v_basin | vue | bassins versants |
| api | v_station | vue | stations |
| api | v_timeseries_station | vue | séries temporelles |
| api | v_latest_station_pivot | vue | indicateurs récents |
| api | v_top_critical_24h | vue | vigilance 24h |
| api | v_map_points_kpi | vue | carte KPI du dashboard |
| sebou | basin_boundary | table | limites spatiales |
| sebou | daily_statistics | table | statistiques journalières |
| sebou | flood_extents | table | emprises inondation |
| sebou | snow_extents | table | emprises neige |
| sebou | alerts | table | alertes de traitement |
| sebou | validation_stations | table | stations de validation |
| sebou | field_observations | table | observations terrain |
| sebou | quality_reports | table | rapports qualité |


## Modèles ORM

| Fichier | Contenu |
| --- | --- |
| backend/app/models/user.py | modèle auth.user |
| backend/app/models/view_models.py | mappage readonly des vues api.* |


## Impact métier

Ces objets servent aux pages stations, bassins, séries temporelles, top critical, carte KPI et aux traitements Sebou.


## Lecture exécutive

Cette page de la section Database approfondit schemas tables views à partir du code réel.


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
