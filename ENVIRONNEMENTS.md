# ENVIRONNEMENTS.md - Hydro Sentinel

Ce document decrit l'etat reel des environnements techniques du repo et les commandes minimales pour demarrer en local.

## 1) Perimetre reel observe
- `backend/`: API FastAPI + SQLAlchemy async
- `hydro-sentinel/`: frontend React + Vite + TypeScript
- `Data/`: absent dans ce checkout (ne pas le considerer comme perimetre actif ici)

## 2) Prerequis machine
- Python: `3.11+` recommande
- Node.js: version LTS recente (18+ minimum recommande)
- npm: fourni avec Node.js
- Windows PowerShell (commandes ci-dessous en syntaxe PowerShell)

## 3) Backend (FastAPI)

### Stack (confirmee)
Dependances cles detectees dans `backend/requirements.txt`:
- `fastapi`, `uvicorn`
- `sqlalchemy`, `alembic`
- `asyncpg`, `aiosqlite`, `geoalchemy2`
- `pydantic`, `pydantic-settings`
- `python-jose`, `passlib`, `python-multipart`

### Variables backend (source de verite)
Le backend charge les variables depuis `backend/.env` via `backend/app/core/config.py` avec:
- `env_file=".env"`
- defaults importants:
  - `API_V1_STR=/api/v1`
  - `DATABASE_URL=sqlite+aiosqlite:///./sql_app.db`
  - `ALGORITHM=HS256`
  - `ACCESS_TOKEN_EXPIRE_MINUTES=43200`

Variables a surveiller en priorite:
- `DATABASE_URL`
- `BACKEND_CORS_ORIGINS`
- `SECRET_KEY`

### Installation backend
Option simple (venv):
```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install -r requirements.txt
```

### Lancement backend
```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

### Verification backend
- Health: `http://localhost:8000/api/v1/health`
- Ping global: `http://localhost:8000/ping_global`
- Swagger: `http://localhost:8000/docs`

## 4) Frontend (React/Vite)

### Stack (confirmee)
Dependances cles detectees dans `hydro-sentinel/package.json`:
- `react`, `react-dom`, `vite`, `typescript`
- `@tanstack/react-query`, `axios`, `zustand`
- `tailwindcss`, `vitest`, `eslint`

### Variables frontend attendues
Dans l'UI, la page environnement lit:
- `VITE_API_BASE_URL` (defaut visuel: `http://localhost:8000`)
- `VITE_API_PREFIX` (defaut visuel: `/api/v1`)

Exemple de fichier `hydro-sentinel/.env`:
```env
VITE_API_BASE_URL=http://127.0.0.1:8003
VITE_API_PREFIX=/api/v1
```

### Point critique actuel (a connaitre)
Le client API central `hydro-sentinel/src/lib/api.ts` est actuellement hardcode sur:
- `http://localhost:8003/api/v1`

Impact:
- modifier `VITE_API_BASE_URL`/`VITE_API_PREFIX` ne suffit pas tant que `api.ts` reste hardcode.

### Installation frontend
```powershell
cd hydro-sentinel
npm install
```

### Lancement frontend
```powershell
cd hydro-sentinel
npm run dev
```

### Verification frontend
- App locale: `http://localhost:5173`
- Scripts utiles:
  - `npm run build`
  - `npm run lint`
  - `npm test`

## 5) Matrice des ports
Configuration recommandee pour eviter les ecarts:
- Frontend Vite: `5173`
- Backend API: `8000`
- Prefix API: `/api/v1`

Etat observe actuellement:
- `api.ts` pointe sur `8003`
- la page environnement affiche des valeurs basees sur `VITE_*`

Conclusion:
- soit standardiser tout en `8000`
- soit assumer `8003` et documenter ce choix dans tous les points d'entree

## 6) Demarrage local rapide (2 terminaux)
Terminal 1:
```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

Terminal 2:
```powershell
cd hydro-sentinel
npm run dev
```

Checks:
- `http://localhost:8000/api/v1/health` repond
- `http://localhost:5173` charge l'app
- les appels API frontend ciblent le bon port backend

## 7) Depannage rapide
- Erreur CORS:
  - verifier `BACKEND_CORS_ORIGINS` dans `backend/.env`
  - verifier le port frontend reel (`5173` en general)

- Frontend "connecte" mais API KO:
  - verifier `hydro-sentinel/src/lib/api.ts` (hardcode `8003`)
  - verifier que le backend ecoute bien sur le meme port

- Erreur DB:
  - confirmer le `DATABASE_URL` actif
  - valider que le SGBD cible est demarre (SQLite fichier local ou PostgreSQL local)

## 8) Hygiene configuration
- Ne jamais commiter de secrets reels dans `.env`.
- Maintenir des fichiers exemple:
  - `backend/.env.example`
  - `hydro-sentinel/.env.example`
- Si ports, variables ou flux changent, mettre a jour aussi:
  - `AGENT_RULES.md`
  - `ARCHITECTURE.md`