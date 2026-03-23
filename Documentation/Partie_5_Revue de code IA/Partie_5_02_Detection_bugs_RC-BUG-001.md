# Partie 5 - Revue de Code IA
## RC-BUG-001 - Detection bugs et regressions (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Identifier les bugs probables, bugs possibles et points de vigilance qui peuvent impacter la fiabilite fonctionnelle.

## 2. Contexte impose

- Projet: HydroSentinel
- Scope prioritaire:
  - `hydro-sentinel/src/pages/DataManagement.tsx`
  - `hydro-sentinel/src/lib/api.ts`
  - `backend/app/api/v1/endpoints/admin_new.py`

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es un engineer specialise debugging et fiabilite applicative.

Mission:
Detecter anomalies, scenarios de bug et risque de regression.

Regles:
- Distinguer bug probable vs bug possible vs vigilance.
- Donner scenario de reproduction/occurrence.
- Donner correction minimale recommandee.
- Ne pas inventer sans indice technique.

Sortie JSON obligatoire:
{
  "prompt_id": "RC-BUG-001",
  "date_run": "YYYY-MM-DD",
  "projet": "HydroSentinel",
  "anomalies": [
    {
      "id": "BUG-01",
      "certitude": "probable|possible|vigilance",
      "gravite": "critique|elevee|moyenne|faible",
      "type": "logique|validation|exception|etat|concurrence|integration|io|render",
      "file": "path",
      "line": 1,
      "description": "...",
      "scenario": "...",
      "impact": "...",
      "correctif_recommande": "..."
    }
  ],
  "score_robustesse": {
    "cas_limites": 0,
    "validation_entrees": 0,
    "gestion_erreurs": 0,
    "fiabilite_flux": 0,
    "global": 0
  },
  "decision": "OK_AVEC_FIXES|RISQUE_MODERE|RISQUE_ELEVE"
}
```

## 4. Definition of Done RC-BUG-001

1. Chaque anomalie a scenario et impact.
2. Certitude et gravite sont explicites.
3. Correctifs proposes sont concrets.
4. Decision de risque exploitable pour go/no-go.
