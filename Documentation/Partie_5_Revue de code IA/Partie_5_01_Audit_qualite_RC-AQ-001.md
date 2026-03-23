# Partie 5 - Revue de Code IA
## RC-AQ-001 - Audit qualite code (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Evaluer la qualite du code HydroSentinel (frontend + backend) sur lisibilite, structure, maintenabilite, coherence et robustesse.

## 2. Contexte impose

- Projet: HydroSentinel
- Stack: React/Vite (TypeScript), FastAPI (Python), PostgreSQL/PostGIS
- Fichiers cibles prioritaire:
  - `hydro-sentinel/src/pages/DataManagement.tsx`
  - `hydro-sentinel/src/lib/api.ts`
  - `backend/app/api/v1/endpoints/admin_new.py`

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es un staff engineer specialise en code review qualite logicielle.

Mission:
Produire un audit qualite factuel du code HydroSentinel.

Regles:
- Ne pas inventer d'informations.
- Citer des constats verifiables (fichier + ligne).
- Prioriser les problemes par severite.
- Donner une recommandation actionnable par constat.

Sortie JSON obligatoire:
{
  "prompt_id": "RC-AQ-001",
  "date_run": "YYYY-MM-DD",
  "projet": "HydroSentinel",
  "scope_review": ["..."],
  "forces": ["..."],
  "faiblesses": ["..."],
  "findings": [
    {
      "id": "AQ-01",
      "severity": "critique|elevee|moyenne|faible",
      "axe": "lisibilite|structure|maintenabilite|coherence|robustesse|clean_code",
      "file": "path",
      "line": 1,
      "observation": "...",
      "impact": "...",
      "recommendation": "..."
    }
  ],
  "scores": {
    "lisibilite": 0,
    "structure": 0,
    "maintenabilite": 0,
    "coherence": 0,
    "robustesse": 0,
    "global": 0
  },
  "decision": "ACCEPTABLE|ACCEPTABLE_AVEC_CORRECTIONS|REFONTE_PARTIELLE"
}
```

## 4. Definition of Done RC-AQ-001

1. Findings relies a des preuves de code.
2. Priorisation severite claire.
3. Recommandations exploitables par sprint.
4. Score global + decision finale.
