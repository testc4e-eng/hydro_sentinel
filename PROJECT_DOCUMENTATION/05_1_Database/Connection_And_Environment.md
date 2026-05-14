# Connection And Environment

Cette page documente connection and environment dans le cadre de la section Database.

## Connexion réelle

| Élément | Valeur observée | Rôle |
| --- | --- | --- |
| DATABASE_URL | postgresql+asyncpg://postgres:c4e%40test%402025@localhost:5432/app_inondation_db | chaîne de connexion |
| Utilisateur | postgres | compte local |
| Hôte | localhost:5432 | serveur PostgreSQL local |
| Base | app_inondation_db | base applicative |
| Driver | asyncpg | accès async depuis SQLAlchemy |


## Décodage

- le mot de passe contient `@` encodé en `%40`
- la chaîne est utilisée telle quelle par les modules backend
- la configuration de base peut retomber sur SQLite si la variable est absente, mais la production visée ici est PostgreSQL


## Fichiers liés

| Fichier | Fonction |
| --- | --- |
| backend/app/core/config.py | normalise DATABASE_URL et prépare les paramètres |
| backend/app/db/session.py | crée l'engine async et la session |
| backend/app/db/init_db_final.py | exige PostgreSQL pour initialiser auth.user |


## Lecture exécutive

Cette page de la section Database approfondit connection and environment à partir du code réel.


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
