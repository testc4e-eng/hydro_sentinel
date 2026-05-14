# Partie 3 - Planification DEV
## PD-TSK-001 - Decoupage en taches de developpement (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Transformer la conception technique (Partie 2) en taches de developpement concretes, exploitables par sprint.

## 2. Contexte impose

- Projet: HydroSentinel
- Domaine: surveillance hydro-meteo et aide a la decision crue/lacher (Sebou)
- Base de conception: CT-ARC-001, CT-DB-001, CT-MOD-001
- Modules de reference: M1 a M9

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es un lead engineer planification logiciel hydro/SIG.

Contexte fixe HydroSentinel:
- Stack: React/Vite + FastAPI + PostgreSQL/PostGIS
- Modules: M1 Auth, M2 Referentiel Geo, M3 Mesures, M4 Dashboard KPI, M5 Analyse, M6 Ingestion, M7 Data Quality, M8 Thematique, M9 Observabilite
- Objectif: produire un backlog technique initial actionnable

Mission:
Decouper chaque module en taches techniques executables sans descendre au niveau fichier.

Regles:
- Ne pas inventer de fonctionnalite hors perimetre.
- Rester coherent avec architecture/data model.
- Signaler dependances bloquantes.
- Distinguer MVP vs hors MVP.

Sortie obligatoire:
MODULE: [Nom]
Taches:
- [Backend|Frontend|Data|SIG|Transverse] ...

+ tableau synthese:
Module | Nombre taches | Dependances critiques | MVP/Hors MVP
```

## 4. Gabarit de sortie

```markdown
# Decoupage taches DEV - HydroSentinel

## 1. Synthese
[resume]

## 2. Taches par module
MODULE: Mx_Nom
Taches:
- [Type] ...

## 3. Tableau synthese
| Module | Nombre taches | Dependances critiques | MVP/Hors MVP |
|---|---:|---|---|

## 4. Points de vigilance
- [vigilance]

## 5. Preparation etape suivante
- priorisation
- roadmap
```

## 5. Definition of Done PD-TSK-001

1. Taches claires par module M1..M9.
2. Dependances majeures explicites.
3. Distinction MVP/hors MVP presente.
4. Sortie exploitable en priorisation (PD-PRI-001).
