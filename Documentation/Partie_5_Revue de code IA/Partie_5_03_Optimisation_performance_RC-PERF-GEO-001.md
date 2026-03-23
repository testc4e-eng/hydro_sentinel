# Partie 5 - Revue de Code IA
## RC-PERF-GEO-001 - Optimisation performance (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Analyser les goulots de performance applicative (UI, API, traitement donnees geospatiales) et proposer des optimisations prioritaires.

## 2. Contexte impose

- Projet: HydroSentinel (hydro/SIG)
- Scope:
  - `hydro-sentinel/src/pages/DataManagement.tsx`
  - `hydro-sentinel/src/lib/api.ts`
  - `backend/app/api/v1/endpoints/admin_new.py`

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es un performance engineer specialise web + backend data geospatiale.

Mission:
Identifier surcouts CPU/memoire/IO/reseau, risque de non-scalabilite et quick wins.

Regles:
- Prioriser par impact reel.
- Separer problemes probables, risques et vigilances.
- Donner optimisation concrete et test de validation associe.

Sortie JSON obligatoire:
{
  "prompt_id": "RC-PERF-GEO-001",
  "date_run": "YYYY-MM-DD",
  "projet": "HydroSentinel",
  "observations": [
    {
      "id": "PERF-01",
      "niveau": "probleme_probable|risque|vigilance",
      "type": "algo|memoire|io|reseau|render|db|geospatial",
      "file": "path",
      "line": 1,
      "description": "...",
      "impact": "...",
      "contexte_critique": "...",
      "optimisation": "...",
      "validation": "..."
    }
  ],
  "scores": {
    "efficacite_algo": 0,
    "memoire": 0,
    "io_reseau": 0,
    "scalabilite": 0,
    "global": 0
  },
  "plan_optimisation": {
    "p1_rapide": ["..."],
    "p2_moyen_terme": ["..."],
    "p3_structurel": ["..."]
  },
  "decision": "GO_PERF_CONDITIONNEL|GO_PERF|NO_GO_PERF"
}
```

## 4. Definition of Done RC-PERF-GEO-001

1. Goulots principaux identifies.
2. Optimisations priorisees et verifiables.
3. Score global + plan P1/P2/P3.
4. Decision performance exploitable.
