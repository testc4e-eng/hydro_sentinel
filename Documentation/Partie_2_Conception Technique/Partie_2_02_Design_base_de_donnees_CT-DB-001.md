# Partie 2 - Conception Technique
## CT-DB-001 - Design base de donnees (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Produire un design logique de base de donnees coherent avec les parcours decisionnels HydroSentinel.

## 2. Contexte projet impose

- Domaines data: geo/ref/ts/auth/api/sebou
- Donnees critiques: precip, debit, apport, volume, lacher, criticite
- Usages: KPI carte, top vigilance, analyses multi-source, import/admin, thematique

## 3. Prompt operationnel (copier-coller)

```text
Tu es architecte data senior PostgreSQL/PostGIS.

Contexte fixe HydroSentinel:
- Decision crue/lacher sur Sebou
- Stack data: PostgreSQL/PostGIS + schemas geo/ref/ts/auth/api/sebou

Mission:
Concevoir le modele logique de donnees pour implementation progressive.

Contraintes:
- Ne pas generer SQL complet.
- Ne pas inventer d entites non utiles.
- Signaler explicitement les hypotheses.

Sortie obligatoire en 12 sections:
1) Synthese du modele propose
2) Principes de modelisation
3) Entites principales (tableau)
4) Relations principales (tableau)
5) Contraintes de donnees
6) Structures specifiques (spatial, timeseries, staging, historique)
7) Alignement besoin metier
8) Points forts
9) Points faibles/risques
10) Modele MVP vs cible
11) Bonnes pratiques
12) Recommandations finales

Tableau entites impose:
Entite | Type | Role metier | Attributs cles | Identifiant principal

Tableau relations impose:
Entite source | Relation | Entite cible | Cardinalite | Description
```

## 4. Sortie minimale attendue

- Entites majeures explicites: Station, Basin, Variable, Source, Measurement, BasinMeasurement, User, tables thematiques Sebou.
- Contraintes qualite et integrite explicites.
- Trajectoire MVP -> cible data.

## 5. Checklist qualite

- Entites/relations sans ambiguite.
- Contraintes data exploitables implementation.
- Risques de modelisation identifies.
- Alignement avec CT-ARC-001 et CT-MOD-001.

## 6. Definition of Done CT-DB-001

1. Sortie 12 sections complete.
2. Tables logiques critiques couvertes.
3. MVP/cible et risques documentes.
4. Recommandations directes pour implementation backend.
