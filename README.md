# Hydro Sentinel Monorepo

Structure du projet:

- `backend/` : API FastAPI, logique metier et acces donnees.
- `hydro-sentinel/` : frontend React + Vite.
- `ARCHITECTURE.md` : vue technique globale.
- `ENVIRONNEMENTS.md` : configuration des environnements.

## Demarrage rapide

Backend:

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd hydro-sentinel
npm install
npm run dev
```

## Git

Le depot Git est desormais a la racine pour versionner backend + frontend dans un seul historique.
