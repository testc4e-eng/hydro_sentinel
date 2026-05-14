# Partie 1 - Analyse des besoins
## 01 - Analyse du probleme (adapte HydroSentinel)

Date de reference: 14 mars 2026

## 1. Synthese rapide

HydroSentinel traite un probleme operationnel critique: des decisions hydrauliques (notamment lachers barrage) prises trop tard face a des episodes pluvieux rapides dans le bassin du Sebou.

Le besoin n est pas seulement de visualiser des donnees: il faut transformer des signaux hydro-meteo heterogenes en decisions actionnables, rapides et tracables.

Niveau de maturite du besoin: **Bon**
- Le role metier est clair.
- Les modules fonctionnels sont deja en place.
- Le risque principal se situe sur la qualite/continuite des donnees et l alignement complet frontend/backend.

## 2. Reformulation du probleme

Probleme reformule:

> Comment garantir une decision anticipee et fiable de gestion crue sur Sebou, en integrant observations, previsions et simulations dans un dashboard unique, avec des donnees suffisamment robustes pour piloter les lachers et reduire le risque aval?

## 3. Nature du probleme

### 3.1 Probleme metier
- Protection des populations/infrastructures face au risque crue.
- Pilotage barrage sous contrainte de temps et d incertitude.

### 3.2 Probleme operationnel
- Multiples sources de donnees et rythmes differents.
- Besoin de lecture synthetique immediate (carte, KPI, top vigilance, analyses).

### 3.3 Probleme technique
- Dependance forte aux vues/tables SQL metier.
- Parcours dashboard temps reel et administration de donnees a fiabiliser en continu.

### 3.4 Probleme de donnees
- Disponibilite variable selon station/bassin/source.
- Heterogeneite de formats (series, fichiers, geodata, thematique).
- Traite de la continuite temporelle (trous de donnees) indispensable.

## 4. Symptomes observes

- Risque de tableau de bord partiellement vide si jeux de donnees absents ou incoherents.
- Besoin frequent de correction/import admin pour restaurer la qualite.
- Ecarts d endpoints historiques identifies entre frontend et backend.
- Forte sensibilite des indicateurs critiques a la qualite de la base.

## 5. Causes racines probables

1. Gouvernance data encore en consolidation (schemas core partiellement non versionnes dans le repo).
2. Heterogeneite des parcours ingestion/import selon source et format.
3. Contrats API historiquement evolutifs (routes legacy encore referencees).
4. Qualite de series temporelles non uniforme selon entite et periode.

## 6. Impacts du probleme

- Impact operationnel: decisions plus lentes ou prudentes en situation critique.
- Impact analytique: baisse de confiance dans les comparaisons OBS/SIM/PREV.
- Impact decisionnel: arbitrage lacher plus complexe en horizon court.
- Impact maintenance: charges recurrentes de correction data et diagnostic.

## 7. Points forts actuels

- Vision produit claire: surveillance + anticipation + aide decision.
- Dashboard riche deja implemente:
  - carte + KPI + criticite,
  - modules precip/debit/apport/volume,
  - recap barrage multi-series,
  - cartes thematiques flood/snow,
  - import et administration data.
- API metier large et exploitable.

## 8. Points faibles et risques

- Dependance forte a la qualite des donnees source.
- Non alignement complet de certains appels legacy.
- Complexite multi-source qui peut masquer des incoherences sans garde-fous.

## 9. Priorites immediates de cadrage

1. Verrouiller les objectifs metier mesurables (KPI + seuils d acceptation).
2. Verrouiller le dictionnaire des donnees critiques (variables/sources/periodes).
3. Verrouiller les criteres minimum de qualite avant exploitation decisionnelle.

## 10. Prompt adapte - Analyse probleme (AB-AP-001)

```text
Tu es un expert senior hydro-meteo/SIG et aide a la decision barrage.

Contexte fixe du projet:
- Produit: HydroSentinel
- Zone: Bassin du Sebou
- Mission: surveillance + anticipation crue + aide au pilotage des lachers
- Modules disponibles: carte synthese, KPI, top vigilance, analyses multi-source, thematique flood/snow, import/admin

Ta mission:
Analyser le probleme sans proposer de solution detaillee.

Entrees:
- symptomes observes
- contraintes
- incertitudes
- impacts operationnels constates

Sortie obligatoire:
1) Reformulation du probleme (5 lignes max)
2) Causes racines probables (classees)
3) Impacts metier/operationnel/technique/data
4) Risques majeurs (probabilite x impact)
5) 3 priorites de cadrage immediates
6) Questions ouvertes (max 10)

Regles:
- Ne rien inventer.
- Distinguer Fait / Hypothese / A valider.
- Rester exploitable pour la suite de la Partie 1.
```

## 11. Format de sortie recommande

```json
{
  "reformulation": "...",
  "maturite_besoin": "faible|moyenne|bonne",
  "causes_racines": [
    {"cause": "...", "type": "metier|operationnel|technique|data", "niveau_confiance": "faible|moyen|eleve"}
  ],
  "impacts": {
    "metier": ["..."],
    "operationnel": ["..."],
    "technique": ["..."],
    "data": ["..."]
  },
  "priorites_immediates": ["...", "...", "..."],
  "questions_ouvertes": ["..."]
}
```
