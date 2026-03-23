# CODE_STANDARDS.md - Hydro Sentinel

## Objectif

Definir des standards simples et executables pour maintenir la qualite du code backend/frontend.

## Principes metier transverses

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

Tout changement doit preserver:

- la lisibilite des indicateurs utiles a la decision barrage/crue,
- la tracabilite des sources de donnees (OBS, SIM, AROME, ECMWF),
- la robustesse des parcours dashboard critiques (carte, top vigilance, analyses, import),
- la fiabilite des horodatages (fenetres 24h, periodes de prevision, historique).

## Standards backend (Python/FastAPI)

- Typage explicite sur signatures publiques.
- Reponses API structurees (codes HTTP coherents).
- Validation des entrees via Pydantic/FastAPI.
- SQL parametree prioritaire (`text(...), params`) au lieu d interpolation brute.
- Gestion claire des transactions:
  - `commit` en succes
  - `rollback` sur erreur
- Ne pas melanger logique SQL lourde et logique HTTP quand un service dedie est possible.

## Standards frontend (TypeScript/React)

- Centraliser appels API dans `src/lib/api.ts`.
- Eviter duplications d endpoints dans composants.
- Hooks `useQuery` avec `queryKey` stable.
- Composants presentionnels separes de logique data.
- Types explicites pour payloads API.

## Standards SQL et donnees

- Toujours qualifier schema (`api.`, `geo.`, `ts.`, `ref.`, `sebou.`).
- Indexer les colonnes de filtrage frequentes (temps, station, variable, source).
- Eviter `SELECT *` hors debug.
- Limiter les requetes non bornees.

## Standards securite

- Token JWT requis sur routes non publiques.
- Secret key hors code en production.
- CORS restreint en env non local.
- Upload fichiers:
  - valider type, taille, structure
  - sanitiser noms de fichiers

## Standards logging

- Logs structurables (niveau + contexte endpoint/action).
- Pas de secret dans logs.
- Conserver messages actionnables (cause + action).

## Standards tests

- Chaque correctif bug doit avoir au moins un test cible.
- Tests backend: `pytest`.
- Tests frontend: `vitest`.
- Ajouter tests de contrat pour endpoints critiques:
  - auth
  - timeseries upload/analyze
  - dashboard KPI

## Conventions nommage

- Python: `snake_case`.
- TypeScript: `camelCase` (variables/fonctions), `PascalCase` (composants/types).
- Endpoints REST: noms explicites et consistants.

## Interdits

- Hardcode URL backend dans composants.
- Interpolation SQL non necessaire.
- Suppression massive sans garde.
- Introduction de breaking change API sans migration frontend.

## Checklist PR interne

1. Le comportement est reproductible.
2. Le fix est minimal.
3. Les tests passes.
4. La doc impactee est mise a jour.
5. Aucun secret ou debug temporaire laisse en place.
