# Indexes And Performance



Cette page documente indexes and performance dans le cadre de la section Database.



## Indexation observée

- index GIST sur les colonnes géométriques du schéma sebou
- index sur les dates des tables journalières et des emprises
- vues lues en lecture seule côté application


## Pourquoi c'est important

Les requêtes cartographiques et les agrégations 24h doivent rester rapides pour les dashboards et les cartes de synthèse.


## Améliorations recommandées

- conserver les index spatiaux après toute migration
- surveiller les vues les plus sollicitées
- ajouter des index composés si des filtres deviennent récurrents


## Lecture exécutive

Cette page de la section Database approfondit indexes and performance à partir du code réel.


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
