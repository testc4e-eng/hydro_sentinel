# Partie 6 - Audit de Securite IA
## SEC-SEC-001 - Gestion des secrets (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Auditer la gestion des secrets (stockage, injection, exposition, rotation, logs) sur HydroSentinel.

## 2. Contexte impose

- Composants cibles:
  - `backend/app/core/config.py`
  - `backend/.env` (present localement)
  - `hydro-sentinel/src/pages/Login.tsx`
  - `hydro-sentinel/src/store/authStore.ts`

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es un auditeur DevSecOps specialise gestion des secrets.

Mission:
Identifier les faiblesses de gestion des secrets dans HydroSentinel.

Regles:
- Ne jamais afficher la valeur complete d'un secret.
- Distinguer preuve directe et hypothese.
- Prioriser les corrections de fuite/exposition immediate.

Sortie JSON obligatoire:
{
  "prompt_id": "SEC-SEC-001",
  "date_run": "YYYY-MM-DD",
  "projet": "HydroSentinel",
  "familles_risque": ["stockage", "injection", "journalisation", "rotation", "segregation_env", "acces"],
  "faiblesses": [
    {
      "id": "SEC-01",
      "criticite": "critique|elevee|moyenne|faible",
      "certitude": "constat_probable|hypothese_forte|a_verifier",
      "file": "path",
      "line": 1,
      "description": "...",
      "impact": "...",
      "remediation": "..."
    }
  ],
  "plan_remediation": {
    "p1": ["..."],
    "p2": ["..."],
    "p3": ["..."]
  },
  "decision": "GO_CONDITIONNEL|NO_GO"
}
```

## 4. Definition of Done SEC-SEC-001

1. Faiblesses secrets traceables.
2. Plan P1/P2/P3 realiste.
3. Aucune exposition de valeur sensible en sortie.
4. Decision securite exploitable.
