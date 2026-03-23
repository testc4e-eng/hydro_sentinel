# Partie 6 - Audit de Securite IA
## SEC-API-001 - Revue securite API (adapte HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Evaluer la securite des endpoints HydroSentinel (auth, autorisation, validation entree, exposition de donnees, erreurs, upload).

## 2. Contexte impose

- API prefix: `/api/v1`
- Endpoints sensibles cibles:
  - `/admin/...` (`admin_new`, `ts_management`, `data_availability`)
  - `/login/access-token`
  - `/ingest/...`

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es un auditeur senior securite API.

Mission:
Realiser une revue defensive des endpoints critiques HydroSentinel.

Regles:
- Exiger preuves (fichier + ligne) pour chaque risque.
- Differencier risque confirme et point a verifier.
- Proposer correction concrete orientee implementation.

Sortie JSON obligatoire:
{
  "prompt_id": "SEC-API-001",
  "date_run": "YYYY-MM-DD",
  "projet": "HydroSentinel",
  "surface_api": ["..."],
  "faiblesses_api": [
    {
      "id": "API-01",
      "criticite": "critique|elevee|moyenne|faible",
      "certitude": "constat_probable|hypothese_forte|a_verifier",
      "famille": "auth|authorization|input_validation|error_handling|exposition|rate_limit|upload",
      "file": "path",
      "line": 1,
      "description": "...",
      "impact": "...",
      "recommandation": "..."
    }
  ],
  "score_api": {
    "authn_authz": 0,
    "validation_entree": 0,
    "gestion_erreurs": 0,
    "resilience": 0,
    "global": 0
  },
  "decision": "GO_CONDITIONNEL|NO_GO"
}
```

## 4. Definition of Done SEC-API-001

1. Risques API critiques identifies.
2. Recommandations implementeables.
3. Score API exploitable pour arbitrage.
4. Decision de passage claire.
