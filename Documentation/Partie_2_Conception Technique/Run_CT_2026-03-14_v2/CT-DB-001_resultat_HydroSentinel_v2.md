# Resultat Prompt CT-DB-001 - HydroSentinel (v2)

## 1. Synthese du modele propose
Modele logique structure autour des domaines geo/ref/ts/auth/api/sebou, cible sur les besoins decisionnels de crue et pilotage barrage.

## 2. Principes de modelisation
Separation des responsabilites data, source explicite obligatoire, historisation temporelle prioritaire, coherence geospatiale.

## 3. Entites principales
| Entite | Type | Role metier | Attributs cles | Identifiant principal |
|---|---|---|---|---|
| Station | spatial | point mesure | code, type, geom, basin_id | station_id |
| Basin | spatial | unite hydro | code, level, geom | basin_id |
| Variable | reference | dictionnaire variable | code, unit | variable_id |
| Source | reference | dictionnaire source | code, label | source_id |
| Measurement | temporel | mesure station | station, variable, source, time, value | cle composite |
| BasinMeasurement | temporel | mesure bassin | basin, variable, source, time, value | cle composite |
| User | technique | auth | email, actif | user_id |
| SebouFloodExtent | thematique | inondation | date, area, geom | id |
| SebouSnowExtent | thematique | neige | date, area, geom | id |

## 4. Relations principales
| Entite source | Relation | Entite cible | Cardinalite | Description |
|---|---|---|---|---|
| Basin | contient | Station | 1-N | stations d un bassin |
| Station | produit | Measurement | 1-N | points temporels |
| Variable | qualifie | Measurement | 1-N | variable mesuree |
| Source | origine_de | Measurement | 1-N | provenance data |

## 5. Contraintes de donnees
Integrite, unicite temporelle, regles qualite, tracabilite source, coherence spatiale.

## 6. Structures de donnees specifiques
PostGIS geometrique, timeseries, staging import, historique operations, metadonnees thematiques.

## 7. Alignement avec le besoin metier
Bon alignement pour parcours dashboard/analyses/import/thematique.

## 8. Points forts du modele
Separation logique claire, adaptation native geospatial + timeseries.

## 9. Points faibles et risques
Dependance vues SQL, gouvernance schema incomplète, risques de perf futurs.

## 10. Modele MVP vs modele cible
MVP: entites critiques pour exploitation immediate.
Cible: versioning schema, qualite automatisee, optimisation analytique.

## 11. Bonnes pratiques
Schemas qualifies, index temporels/spatiaux, dictionnaires de reference rigoureux.

## 12. Recommandations finales
Verrouiller DDL de reference et politique qualite/source avant industrialisation large.
