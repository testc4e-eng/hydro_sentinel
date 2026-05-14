# Partie 2 - Conception Technique
## CT-ARC-001 - Architecture applicative (adaptee HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Definir une architecture applicative cible realiste pour HydroSentinel, directement exploitable pour implementation.

## 2. Contexte projet impose

- Produit: HydroSentinel
- Zone: Bassin du Sebou
- Mission: surveillance hydro-meteo, anticipation crue, aide a la decision de pilotage barrage
- Stack actuelle: Frontend React/Vite, Backend FastAPI, PostgreSQL/PostGIS, module thematique Sebou
- Parcours critiques: dashboard carte/KPI, analyses multi-source, import/admin, data scan, thematique flood/snow

## 3. Prompt operationnel (copier-coller)

```text
Tu es architecte logiciel senior hydro/SIG.

Contexte fixe:
- Projet: HydroSentinel (Sebou)
- Mission: decision crue/lacher via dashboard unique
- Stack: React/Vite + FastAPI + PostgreSQL/PostGIS + module thematique Sebou

Mission:
Produire une architecture applicative cible pragmatique, maintenable et evolutive.

Contraintes:
- Pas de sur-architecture.
- Signaler explicitement hypotheses et risques.
- Rester coherent avec l existant implemente.

Sortie obligatoire en 12 sections:
1) Synthese rapide
2) Reformulation technique du besoin
3) Style architectural retenu + alternatives ecartees
4) Architecture cible
5) Composants principaux (tableau)
6) Flux applicatifs
7) Exigences non fonctionnelles et impact
8) Alignement avec besoin metier
9) Points forts
10) Points faibles/compromis/risques
11) Trajectoire d evolution MVP->cible
12) Recommandations finales (dont prochaine etape)

Tableau composant impose:
Composant | Type | Role principal | Responsabilites | Dependances principales | MVP/Hors MVP
```

## 4. Sortie minimale attendue

- Architecture recommandee: monolithe modulaire web + jobs batch.
- Frontieres claires entre domaines: auth, referentiel, mesures, KPI, analyses, import/admin, thematique, observabilite.
- Conditions de passage implementation explicites (API/data/performance).

## 5. Checklist qualite

- Style architectural justifie et proportionne.
- Composants et flux de bout en bout explicites.
- Exigences non fonctionnelles traitees.
- MVP vs cible separes.
- Risques et mitigations documentes.

## 6. Definition of Done CT-ARC-001

1. Sortie en 12 sections complete.
2. Pas de proposition contradictoire avec stack existante.
3. Recommandations actionnables pour CT-DB-001 et CT-MOD-001.
