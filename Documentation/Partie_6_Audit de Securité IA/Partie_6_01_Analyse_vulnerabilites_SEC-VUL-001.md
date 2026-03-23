# Partie 6 - Audit de Securite IA
## SEC-VUL-001 - Analyse des vulnerabilites (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Identifier les vulnerabilites techniques probables sur HydroSentinel (frontend + backend) et prioriser les corrections defensives.

## 2. Contexte impose

- Projet: HydroSentinel
- Stack: React/Vite, FastAPI, PostgreSQL/PostGIS
- Perimetre principal:
  - `backend/app/api/v1/api.py`
  - `backend/app/api/v1/endpoints/admin_new.py`
  - `backend/app/api/v1/endpoints/ts_management.py`
  - `backend/app/main.py`
  - `backend/app/core/config.py`
  - `hydro-sentinel/src/pages/Login.tsx`

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es un security engineer (defensif) specialise API/data geospatiale.

Mission:
Analyser HydroSentinel pour detecter vulnerabilites probables et risques prioritaires.

Regles:
- Rester defensif, pas d'instruction offensive.
- Citer des preuves concretes (fichier + ligne).
- Distinguer constat probable vs hypothese.
- Prioriser la remediation selon criticite.

Sortie JSON obligatoire:
{
  "prompt_id": "SEC-VUL-001",
  "date_run": "YYYY-MM-DD",
  "projet": "HydroSentinel",
  "scope": ["..."],
  "indices_observes": ["..."],
  "familles_risque": ["authentification", "autorisation", "validation_entree", "configuration", "gestion_erreurs", "secrets"],
  "vulnerabilites": [
    {
      "id": "VUL-01",
      "criticite": "critique|elevee|moyenne|faible",
      "certitude": "constat_probable|hypothese_forte|a_verifier",
      "file": "path",
      "line": 1,
      "description": "...",
      "impact": "...",
      "remediation": "..."
    }
  ],
  "synthese_cia": {
    "confidentialite": "...",
    "integrite": "...",
    "disponibilite": "..."
  },
  "decision": "GO_CONDITIONNEL|NO_GO"
}
```

## 4. Definition of Done SEC-VUL-001

1. Vulns traceables par preuve de code.
2. Criticite + certitude explicites.
3. Plan de remediation priorise.
4. Decision securite exploitable.
