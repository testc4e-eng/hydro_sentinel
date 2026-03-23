# Partie 2 - Conception Technique
## CT-MOD-001 - Definition des modules applicatifs (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Definir un decoupage modulaire clair et priorise, directement utilisable pour planification implementation.

## 2. Contexte projet impose

- HydroSentinel couvre: dashboard KPI/carte, analyses multi-source, import/admin, scan qualite, thematique flood/snow.
- Contrainte cle: minimiser couplage et conserver logique metier lisible.

## 3. Prompt operationnel (copier-coller)

```text
Tu es architecte logiciel senior hydro/SIG.

Contexte fixe HydroSentinel:
- Parcours critiques: Dashboard, analyses, import/admin, thematique
- Stack: React/Vite + FastAPI + PostgreSQL/PostGIS

Mission:
Produire un decoupage modulaire executable pour implementation.

Contraintes:
- Pas de module vague.
- Responsabilites exclusives par module.
- Marquer risques de couplage et chevauchement.

Sortie obligatoire en 6 sections:
1) Resume logique de decoupage
2) Liste des modules proposes (fiche detaillee par module)
3) Matrice synthetique des modules
4) Interactions entre modules
5) Recommandations architecture modulaires
6) Preparation de la suite (ordre implementation)

Fiche module imposee:
- Nom
- Type (metier/technique/transverse)
- Objectif
- Perimetre
- Responsabilites
- Entrees/Sorties
- Dependances
- Risques
- Priorite (critique/important/secondaire)
- MVP/Hors MVP
```

## 4. Sortie minimale attendue

- Modules minimaux couverts: Auth, Referentiel Geo, Mesures/Timeseries, Dashboard KPI, Analyse Multi-source, Ingestion Import, Data Quality Scan, Thematique, Observabilite.
- Ordre implementation par sprint.

## 5. Checklist qualite

- Couverture complete des parcours critiques.
- Couplage limite et frontieres claires.
- Priorisation realiste MVP vs hors MVP.
- Preparation directe backlog implementation.

## 6. Definition of Done CT-MOD-001

1. 6 sections completes.
2. Matrice modules exploitable sprint planning.
3. Risques de couplage documentes.
4. Sequence implementation recommandee explicite.
