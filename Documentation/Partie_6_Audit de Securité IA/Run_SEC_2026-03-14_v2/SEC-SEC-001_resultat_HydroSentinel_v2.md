# SEC-SEC-001 - Resultat run HydroSentinel v2

Date: 2026-03-14
Scope: gestion secrets/config/auth client

## A. Resume global
- Niveau de risque secrets: eleve
- Risque principal: secret management permissif (fallback statique + creds locales visibles + logs sensibles)
- Decision: GO_CONDITIONNEL

## B. Faiblesses identifiees
| ID | Criticite | Certitude | Preuve | Description | Impact | Remediation |
|---|---|---|---|---|---|---|
| SEC-01 | elevee | constat_probable | `backend/app/core/config.py:88` | `SECRET_KEY` par defaut statique. | Signature JWT faible si defaut conserve. | Refuser demarrage si valeur par defaut detectee. |
| SEC-02 | elevee | constat_probable | `backend/.env:1` | Fichier local `.env` contient URL DB avec credentials en clair. | Risque fuite credentials via mauvais partage/sauvegarde locale. | Secret manager/env securise; ne jamais partager `.env` brut. |
| SEC-03 | moyenne | constat_probable | `hydro-sentinel/src/pages/Login.tsx:14-15`, `:29`, `:46` | Creds demo pre-remplies et logs console avec infos auth/token. | Exposition operationnelle et hygiene faible cote client. | Supprimer defaults et logs sensibles hors dev. |
| SEC-04 | moyenne | constat_probable | `hydro-sentinel/src/store/authStore.ts:1-30` | Token persiste via middleware `persist` (local storage). | En cas XSS, extraction token facilitee. | Diminuer surface XSS + considerer cookie httpOnly selon architecture. |

## C. Plan remediation
### P1 (immediat)
- SECRET_KEY obligatoire via env, sans fallback fixe.
- Purger/rotater credentials exposes localement si reutilises.
- Retirer logs token/login et valeurs demo front.

### P2 (court terme)
- Definir politique rotation secrets (DB/JWT/API).
- Renforcer separation dev/test/prod des secrets.

### P3 (moyen terme)
- Evaluer migration token vers cookie httpOnly + CSRF strategy.
- Audit automatise de fuite secrets en CI.

## D. Conclusion
La gestion des secrets est fonctionnelle mais pas assez stricte pour une exposition etendue. Passage possible uniquement avec correction P1.
