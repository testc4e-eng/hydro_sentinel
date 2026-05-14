# Context And Objectives



Cette page documente context and objectives dans le cadre de la section 00 Introduction.



## Contexte réel

Hydro Sentinel combine surveillance hydrométéo, SIG, raster et aide à la décision pour le bassin du Sebou.


## Points clés

- frontend React/Vite dans `hydro-sentinel/`
- backend FastAPI dans `backend/`
- cartographie et produits thématiques
- pipelines Sebou, validation et export


## Lecture exécutive

Cette page de la section 00 Introduction approfondit context and objectives à partir du code réel.


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


## Objectifs

- centraliser
- analyser
- rendre visible
- sécuriser
