# README



Cette page documente readme dans le cadre de la section Database.



## Périmètre

Cette section est dédiée exclusivement à la base de données Hydro Sentinel: connexion PostgreSQL, schémas `auth` / `api` / `sebou`, vues métiers, index spatiaux et scripts d'initialisation.


## Sous-pages

- Connection_And_Environment.md
- Schemas_Tables_Views.md
- Indexes_And_Performance.md
- Initialization_And_Migrations.md
- ERD.md


## Référence rapide

| Élément | Valeur |
| --- | --- |
| DATABASE_URL | postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db |
| Driver | asyncpg |
| Base cible | app_inondation_db |
| Schéma auth | utilisateurs et rôles |
| Schéma api | vues de lecture pour l'application |
| Schéma sebou | tables d'analyse et de traitement |


## Lecture recommandée

- commencer par la connexion et l'environnement
- poursuivre avec les schémas, tables et vues
- consulter ensuite les index et la performance
- terminer par les migrations et l'ERD


## Lecture exécutive

Cette page de la section Database approfondit readme à partir du code réel.


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
