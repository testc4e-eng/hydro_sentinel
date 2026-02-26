# ARCHITECTURE.md - Hydro Sentinel

Ce document decrit l'architecture technique reelle du projet dans ce checkout et sert de reference pour les evolutions backend/frontend.

## 1) Perimetre actif
Composants actifs observes a la racine:
- `backend/`: API FastAPI + acces base de donnees async
- `hydro-sentinel/`: application web React/Vite/TypeScript

Composants non actifs dans ce checkout:
- `Data/`: absent. Le pipeline data peut exister dans d'autres branches ou repos, mais il n'est pas un bloc executable ici.

## 2) Carte du repo (niveau racine)
- `backend/`: code API, config, acces DB, endpoints
- `hydro-sentinel/`: client web, routing, composants UI, store et hooks
- `AGENT_RULES.md`: regles d'intervention agent
- `ENVIRONNEMENTS.md`: prerequis, runbook local, variables
- `ARCHITECTURE.md`: ce document

## 3) Architecture systeme (vue macro)
Flux principal:
1. Le navigateur charge le frontend Vite/React.
2. Le frontend appelle l'API backend (Axios).
3. Le backend sert les routes `/api/v1/*` via FastAPI.
4. Le backend lit/ecrit en base via SQLAlchemy async.

Topologie logique:
- Presentation: `hydro-sentinel/src/**`
- API metier: `backend/app/api/v1/endpoints/**`
- Services metier: `backend/app/services/**`
- Persistance: `backend/app/db/**` + `backend/app/models/**`

## 4) Backend (FastAPI)

### 4.1 Point d'entree et composition
- Entree application: `backend/app/main.py`
- Routeur principal: `backend/app/api/v1/api.py`
- Prefix global: `settings.API_V1_STR` (defaut: `/api/v1`)

`main.py` configure:
- instance FastAPI
- middleware CORS
- handler global d'exception
- routes de debug (`/ping_global`, `/ping_error`)
- inclusion du routeur v1

### 4.2 Modules API
Le routeur v1 agrege les domaines suivants:
- Auth: `/login/access-token`, `/me`
- Health: `/health`
- Sites: `/stations`, `/basins`
- Variables: `/variables`
- Measurements: `/measurements/*`
- Dashboard: `/map/points-kpi`, `/dashboard/top-critical`
- Ingestion: `/ingest/history`, `/ingest/analyze`, `/ingest/execute`
- Admin entities/templates/SHP: `/admin/entities/*`, `/admin/templates/*`, `/admin/shp/upload`
- Data availability: `/data-availability`, `/stations-with-data`, `/admin/data-availability`
- Time series admin: `/admin/timeseries/*`
- Tests geo (dev): `/test/test/geo-stations`, `/test/test/geo-basins`

Note:
- Le prefix `/test` est ajoute au routeur `test_geo` alors que les handlers definissent deja `/test/...`, ce qui produit des chemins doubles `/test/test/...`.

### 4.3 Couches internes
- `backend/app/core/`: settings, securite, utilitaires transverses
- `backend/app/db/`: engine async, session, init/update SQL
- `backend/app/models/`: modeles SQLAlchemy
- `backend/app/schemas/`: schemas Pydantic
- `backend/app/services/`: logique applicative (ex: analyse d'ingestion)

Pattern dominant:
- endpoint -> service(s) -> DB/session -> reponse schema

### 4.4 Donnees et persistence
- Session async: `backend/app/db/session.py`
- DB supportee:
  - SQLite local (fallback): `sqlite+aiosqlite:///./sql_app.db`
  - PostgreSQL async (`asyncpg`) via `DATABASE_URL`

Source de config:
- `backend/app/core/config.py`
- fichier `.env` lu depuis le repertoire d'execution backend

## 5) Frontend (React/Vite/TypeScript)

### 5.1 Point d'entree et providers
- Bootstrap: `hydro-sentinel/src/main.tsx`
- App racine: `hydro-sentinel/src/App.tsx`

Providers globaux:
- `QueryClientProvider` (TanStack Query)
- `TooltipProvider`
- Toasters UI
- `BrowserRouter`

### 5.2 Routing et controle d'acces
- Route publique: `/login`
- Routes protegees via `ProtectedRoute` (presence token dans store)
- Pages metier: dashboard, precipitations, debits, apports, volume, recap barrage, stations, barrages, import, data-management, data-scan, settings, environment

### 5.3 Etat et data fetching
- Store auth persiste: `hydro-sentinel/src/store/authStore.ts`
- Store dashboard: `hydro-sentinel/src/store/dashboardStore.ts`
- Hooks data: `hydro-sentinel/src/hooks/useApi.ts`
- Client HTTP central: `hydro-sentinel/src/lib/api.ts`

Comportements API:
- Injection automatique du bearer token dans les requetes
- Logout automatique sur HTTP 401

### 5.4 UI et composants
- `hydro-sentinel/src/components/ui/`: primitives UI
- `hydro-sentinel/src/components/`: composants metier (map, KPI, tableaux, charts)
- `hydro-sentinel/src/pages/`: ecrans par domaine

## 6) Contrats d'integration backend/frontend

Contrat nominal:
- API base URL issue des variables Vite (`VITE_API_BASE_URL`)
- API prefix issu de `VITE_API_PREFIX` (ex: `/api/v1`)

Etat actuel observe:
- `hydro-sentinel/src/lib/api.ts` est hardcode sur `http://localhost:8003/api/v1`
- la page frontend `Environment` lit bien `VITE_API_BASE_URL` et `VITE_API_PREFIX`

Consequence:
- la configuration d'environnement frontend peut etre visible mais non appliquee a tous les appels tant que `api.ts` reste hardcode.

## 7) Profils d'execution

### Profil local recommande
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- API prefix: `/api/v1`

### Profil local alternatif observe
- Backend: `http://127.0.0.1:8003` (present dans `hydro-sentinel/.env` et `api.ts`)

Regle:
- choisir un profil unique par session de dev et aligner `.env`, client API et commande de lancement.

## 8) Flux applicatifs clefs

### 8.1 Authentification
1. Frontend envoie credentials a `/api/v1/login/access-token`
2. Backend retourne un token
3. Token stocke dans `authStore`
4. Intercepteur Axios ajoute `Authorization: Bearer ...`

### 8.2 Consultation dashboard
1. UI declenche hooks React Query (`useKpis`, `useAlerts`, etc.)
2. Hooks appellent `api.ts`
3. Backend calcule/retourne les indicateurs
4. Composants dashboard affichent cartes, tableaux et graphiques

### 8.3 Ingestion et gestion timeseries
1. Upload fichier via frontend (`multipart/form-data`)
2. Endpoints `/ingest/*` ou `/admin/timeseries/*`
3. Validation/analyse backend
4. Ecriture DB + retour resultats a l'UI

## 9) Risques et dette technique (priorises)
1. Couplage fort URL backend dans `api.ts` (hardcode `8003`).
2. `main.py` contient prints de debug et un chemin absolu de log non portable (`c:/dev/detection_inondation/...`).
3. Endpoints de test exposes (`/test/test/*`) a cadrer selon environnement.
4. Multiplicite de scripts debug/check a la racine backend, utiles mais source de confusion sans convention stricte.

## 10) Regles de mise a jour doc
Mettre a jour ce fichier a chaque changement sur:
- composition des modules API
- contrats de routes/prefix
- strategie de connexion frontend/backend
- mode principal de base de donnees
- points critiques d'exploitation (logging, endpoints de test, securite)

Cross-update obligatoire avec:
- `ENVIRONNEMENTS.md` pour variables/ports/commandes
- `AGENT_RULES.md` pour contraintes d'intervention