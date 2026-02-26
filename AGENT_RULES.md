# AGENT_RULES.md - Hydro Sentinel

## 1) But du document
Definir un cadre clair pour les agents IA qui modifient ce repo:
- rapide a executer
- sur techniquement
- verifiable avant livraison

Ce document s'applique aux interventions d'audit, correction, refactorisation et documentation.

## 2) Perimetre du monorepo
Composants principaux observes:
- `backend/`: FastAPI, Pydantic v2, SQLAlchemy async, Python 3.11+
- `hydro-sentinel/`: React 18, TypeScript, Vite, Tailwind, TanStack Query, Zustand
- fichiers racine de doc/exploitation: `ARCHITECTURE.md`, `ENVIRONNEMENTS.md`, `requirements.txt`, scripts SQL

Composants eventuels (selon branche/projet local):
- `Data/`: ingestion/preparation de donnees et artefacts de pipeline

## 3) Principes non negociables
1. Appliquer le patch le plus petit possible qui corrige vraiment le probleme.
2. Ne pas casser les contrats existants (API `/api/v1`, formats attendus, env vars deja utilisees).
3. Toujours fournir une verification minimale (test, commande, ou scenario de repro).
4. Citer explicitement les fichiers modifies et la raison de chaque modification.
5. Ne jamais inventer des resultats de tests/commandes non executes.

## 4) Zones prioritaires de modification
Priorite 1:
- `backend/app/**`
- `hydro-sentinel/src/**`

Priorite 2 (si necessaire):
- scripts Python d'appui (ex: `Data/*.py` si presents)
- docs (`ARCHITECTURE.md`, `ENVIRONNEMENTS.md`, README, runbooks)

Eviter par defaut:
- `hydro-sentinel/node_modules/`
- `**/__pycache__/`
- gros fichiers binaires et geospatiaux (`*.shp`, `*.dbf`, `*.shx`, `*.zip`)
- donnees brutes ou artefacts generes (`Data/data_raw/`, `Data/outputs/`) sauf demande explicite

## 5) Regles de qualite par stack
Python / Backend:
- type hints obligatoires sur le code modifie
- validations via Pydantic quand donnees externes (API/fichiers) sont impliquees
- respecter la separation route/service/repository deja en place

TypeScript / Frontend:
- eviter `any` sauf exception transitoire justifiee dans le code
- conserver les appels API centralises dans `hydro-sentinel/src/lib/api.ts`
- ne pas hardcoder l'URL API: utiliser `VITE_API_BASE_URL` et `VITE_API_PREFIX`

API et contrats:
- conserver les routes existantes (notamment `/api/v1`)
- si changement de contrat inevitable: documenter impact + migration + compatibilite

## 6) Workflow standard d'intervention
1. Audit cible:
- lire uniquement les fichiers utiles au bug/feature
- confirmer le perimetre reelement impacte

2. Plan d'action:
- definir les fichiers a modifier
- decrire risque principal (regression, schema, perf, UI)

3. Patch:
- appliquer les changements minimaux
- eviter les refactors hors sujet

4. Verification:
- executer au moins une verification concrete (test, linter, lancement local, endpoint)
- noter clairement ce qui n'a pas pu etre teste

5. Restitution:
- resume fonctionnel
- liste des fichiers modifies
- commandes/tests executes et resultat
- risques restants et next steps optionnels

## 7) Verification minimale attendue
Backend (selon dispo):
- demarrage: `cd backend && uvicorn app.main:app --reload --port 8000`
- healthcheck: `GET /api/v1/health`
- tests/lint si presents: `pytest`, `ruff`, etc.

Frontend (selon dispo):
- demarrage: `cd hydro-sentinel && npm run dev`
- build/test/lint si scripts disponibles: `npm run build`, `npm run test`, `npm run lint`

Base de donnees:
- confirmer le mode actif si le sujet touche schema/ingestion/admin:
  - SQLite local (`sql_app.db`)
  - PostgreSQL/Timescale

## 8) Cas sensibles et precautions
- Les fichiers Excel/GIS peuvent etre verrouilles par des applis Windows (Excel, ArcGIS).
- `backend/` peut contenir des scripts `debug_*`, `inspect_*`, `check_*`, `verify_*`:
  - utiles pour diagnostiquer
  - ne pas les modifier sans demande explicite
- Ne jamais exposer de secret reel dans code, docs, logs ou commits.
- Documenter les variables dans `.env.example` (pas dans `.env` versionne).

## 9) Format de demande recommande a l'agent
Pour accelerer la resolution, fournir si possible:
- perimetre autorise (fichiers/dossiers)
- environnement (`SQLite` ou `PostgreSQL/Timescale`)
- ports actifs (backend, frontend)
- erreur exacte (stacktrace, endpoint, payload, etape de repro)
- contrainte d'intervention (`audit only` vs `patch + verification`)
- exclusions explicites

## 10) Definition de "termine"
Une tache est consideree terminee quand:
1. le probleme cible est corrige ou le diagnostic est prouve,
2. les changements sont minimaux et coherents,
3. au moins une verification concrete a ete faite,
4. les impacts sont documentes (fichiers, comportement, limites),
5. la doc d'env/architecture est mise a jour si necessaire.
