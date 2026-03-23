# TESTING_GUIDE.md - Hydro Sentinel

## Portee

Ce guide couvre les tests existants et la strategie recommandee pour backend, frontend et module Sebou.

## Scenarios metier prioritaires a couvrir

Reference globale: `FUSION_SYNTHESE_HYDROSENTINEL.md`.

Prioriser les tests qui securisent la decision crue:

1. Dashboard principal charge KPI + criticite sans erreur.
2. Analyse multi-source (OBS/SIM/AROME/ECMWF) sans rupture de continuite.
3. Import/analyse de fichiers et ecriture series temporelles conforme.
4. Cartes thematiques disponibles avec historique et statistiques.

## Tests backend existants

Fichiers detectes:

- `backend/tests/test_sebou_phase1_smoke.py`
- `backend/tests/test_pipeline.py`

Execution:

```powershell
cd backend
pytest -q tests/test_sebou_phase1_smoke.py tests/test_pipeline.py
```

## Tests frontend existants

- Stack: Vitest + Testing Library.
- Exemple: `hydro-sentinel/src/test/example.test.ts`.

Execution:

```powershell
cd hydro-sentinel
npm test
```

## Tests de sante manuels recommandes

1. Backend health:
   - `GET /api/v1/health`
2. Auth:
   - `POST /api/v1/login/access-token`
3. Read data:
   - `GET /api/v1/stations`
   - `GET /api/v1/variables`
4. Admin timeseries:
   - analyze + upload (fichier test minimal)
5. Frontend:
   - login, dashboard, import page.

## Jeux de donnees de test

- Utiliser petits CSV/XLSX pour tests upload.
- Utiliser UUID station valide en DB de test.
- Isoler environnements test pour eviter suppression accidentelle.

## Gaps de couverture detectes

1. Pas de tests API automatiques sur endpoints principaux (`auth`, `sites`, `measurements`, `admin`).
2. Pas de tests frontend sur hooks API critiques.
3. Pas de tests de contrat entre frontend et backend.

## Plan de test recommande

### Priorite haute

- Test backend `auth`:
  - login ok
  - login invalid
- Test backend `sites`:
  - stations/basins format reponse
- Test backend `ingest/history` et `admin/timeseries/*`.
- Test frontend `useApi` sur base URL/prefix.

### Priorite moyenne

- Test integration dashboard KPI avec DB test.
- Test upload SHP en `dry_run`.
- Test thematic maps catalogue/history/product.

### Priorite basse

- Tests charge/perf endpoints lourds.
- Tests e2e UI complets (Playwright/Cypress).

## Bonnes pratiques

- Eviter dependance reseau externe dans unit tests.
- Mock Earth Engine dans tests pipeline.
- Garder tests deterministes (dates fixes, fixtures fixes).
- Ajouter assertions sur schema JSON, pas seulement status code.

## Commandes utiles

```powershell
# Backend only
cd backend
pytest -q

# Frontend only
cd hydro-sentinel
npm test
npm run lint

# Build check
npm run build
```
