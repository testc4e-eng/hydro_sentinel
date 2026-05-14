# Resultat Prompt CT-MOD-001 - HydroSentinel (v2)

## 1) Resume de la logique de decoupage
Decoupage aligne sur la chaine valeur metier: securiser -> collecter -> qualifier -> exposer -> analyser -> decider -> auditer.

## 2) Liste des modules proposes
Modules retenus: M1 a M9 (Auth, Referentiel, Mesures, Dashboard, Analyse, Ingestion, Quality Scan, Thematique, Observabilite).

## 3) Matrice synthetique des modules
| Module | Type | Role | Dependances principales | Priorite | MVP / hors MVP |
|---|---|---|---|---|---|
| M1 | transverse | auth/acces | auth endpoints | critique | MVP |
| M2 | metier | referentiel geo | geo.* | critique | MVP |
| M3 | metier | timeseries | ts.* ref.* | critique | MVP |
| M4 | metier | KPI criticite | api.v_* | critique | MVP |
| M5 | metier | analyse multi-source | measurements API | important | MVP |
| M6 | technique | ingestion/import | ingest/admin APIs | critique | MVP |
| M7 | transverse | scan qualite | admin data-availability | important | MVP |
| M8 | metier | thematique | thematic endpoints | important | MVP |
| M9 | transverse | observabilite | logs/infra | important | Hors MVP |

## 4) Interactions entre modules
Interactions principales: M6 nourrit M3/M4, M7 controle M3/M6, M8 enrichit M4/M5, M9 supervise transversalement.

## 5) Recommandations d'architecture
Imposer frontieres strictes module par module et contrats de donnees partages.

## 6) Preparation pour la suite
Ordre implementation recommande:
- Sprint A: M4 + M3 + M6
- Sprint B: M2 + M7
- Sprint C: M8 + M9
