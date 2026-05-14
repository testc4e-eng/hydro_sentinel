# Hydro Sentinel

Base de code monorepo pour l'application Hydro Sentinel.

## Structure active

- `backend/` : API FastAPI, couche métier, base de données et services Python actifs.
- `hydro-sentinel/` : frontend React + Vite.
- `archive/` : anciens composants, pages, scripts, exports et versions de travail conservés pour historique.

## Frontend

L'application web active vit dans `hydro-sentinel/`.

Commandes principales:

```powershell
cd hydro-sentinel
npm install
npm run dev
npm run build
```

## Backend

L'API active vit dans `backend/`.

Commande de démarrage locale:

```powershell
cd backend
uvicorn app.main:app --reload --port 8000
```

## Archive

Les fichiers obsolètes ou non utilisés ont été déplacés dans:

- `archive/old_components`
- `archive/old_pages`
- `archive/old_dashboards`
- `archive/old_services`
- `archive/old_routes`
- `archive/old_scripts`
- `archive/unused_files`
- `archive/deprecated`
- `archive/backup_versions`
- `archive/legacy`

Chaque sous-dossier contient un `README.md` expliquant le motif de l'archivage.

## Notes

- Les fichiers archivés ne sont pas supprimés, uniquement déplacés.
- Les routes et composants actifs du frontend n'ont pas été modifiés dans leur logique métier.
- Le dépôt reste organisé pour pouvoir continuer à faire évoluer l'architecture progressivement.

## Documentation

La documentation technique et fonctionnelle générée se trouve dans `PROJECT_DOCUMENTATION/`.

- Point d'entrée: `PROJECT_DOCUMENTATION/README.md`
- Générateur: `scripts/generate_project_documentation.py`