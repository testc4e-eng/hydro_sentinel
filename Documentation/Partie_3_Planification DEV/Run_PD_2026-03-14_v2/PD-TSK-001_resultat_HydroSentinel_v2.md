# Resultat Prompt PD-TSK-001 - HydroSentinel (v2)

## 1. Synthese
Le decoupage retenu couvre les 9 modules HydroSentinel et traduit la conception en blocs de travail implementables. Le coeur MVP est centre sur securite, donnees critiques, dashboard KPI et import/qualite.

## 2. Taches par module
MODULE: M1_Auth_Acces
Taches:
- [Backend] fiabiliser auth JWT et verification token
- [Backend] durcir protection routes admin
- [Frontend] gerer expiration/session deconnexion

MODULE: M2_Referentiel_Geo
Taches:
- [Backend] stabiliser CRUD stations/bassins
- [SIG] verifier pipeline SHP dry_run/commit
- [Data] controler coherences code/nom/type/geom

MODULE: M3_Mesures_Timeseries
Taches:
- [Backend] normaliser endpoints lecture series
- [Data] imposer regles source/variable/time
- [Backend] fiabiliser suppression point/serie

MODULE: M4_Dashboard_KPI
Taches:
- [Backend] stabiliser calcul map/points-kpi
- [Backend] stabiliser top-critical avec fallback
- [Frontend] gerer affichage data partielle sans blocage

MODULE: M5_Analyse_MultiSource
Taches:
- [Frontend] uniformiser filtres/periodes
- [Backend] coherencer compare/timeseries/runs
- [Frontend] consolider export CSV/table

MODULE: M6_Ingestion_Import
Taches:
- [Backend] fiabiliser cycle analyze -> execute
- [Data] renforcer templates multi-source
- [Transverse] tracer historique d import et erreurs

MODULE: M7_Data_Quality_Scan
Taches:
- [Backend] optimiser scan disponibilite
- [Data] definir seuils qualite minimum
- [Frontend] exposer anomalies/actionnable admin

MODULE: M8_Thematique_Flood_Snow
Taches:
- [Backend] stabiliser catalogue/historique/produit
- [Frontend] robustifier navigation temporelle produit
- [Transverse] gerer statut indisponible/partiel

MODULE: M9_Observabilite_Audit
Taches:
- [Transverse] standardiser logs backend/frontend
- [Transverse] monitorer latence endpoints critiques
- [Transverse] mettre alertes techniques minimales

## 3. Tableau synthese
| Module | Nombre taches | Dependances critiques | MVP/Hors MVP |
|---|---:|---|---|
| M1 | 3 | API auth + store frontend | MVP |
| M2 | 3 | DB geo + upload SHP | MVP |
| M3 | 3 | DB ts/ref + contrats API | MVP |
| M4 | 3 | M3 + vues KPI | MVP |
| M5 | 3 | M3 + M4 | MVP |
| M6 | 3 | formats fichiers + DB | MVP |
| M7 | 3 | M6 + DB | MVP |
| M8 | 3 | module thematique | MVP |
| M9 | 3 | infra + logs | Hors MVP |

## 4. Points de vigilance
- M4 ne doit pas demarrer sans base stabilisee M3.
- M6 doit rester strictement compatible avec regles qualite M7.
- M9, bien que hors MVP, doit avoir un minimum operationnel avant mise en production large.

## 5. Preparation etape suivante
Sortie prete pour priorisation PD-PRI-001 puis roadmap PD-RDM-001.
