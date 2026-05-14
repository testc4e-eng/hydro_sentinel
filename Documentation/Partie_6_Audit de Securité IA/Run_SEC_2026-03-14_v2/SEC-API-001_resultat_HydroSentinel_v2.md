# SEC-API-001 - Resultat run HydroSentinel v2

Date: 2026-03-14
Scope: surface API `/api/v1`

## A. Resume global
- Niveau de risque API: eleve
- Point critique: absence de garde securite explicite sur routeurs admin
- Decision API: GO_CONDITIONNEL

## B. Tableau risques API
| ID | Famille | Criticite | Certitude | Preuve | Description | Recommandation |
|---|---|---|---|---|---|---|
| API-01 | authorization | critique | constat_probable | `backend/app/api/v1/api.py:24,35`, `admin_new.py:22`, `ts_management.py:20` | Endpoints admin relies sans dependances auth/role explicites. | Bloquer via `get_current_active_superuser` + tests d'acces negatif. |
| API-02 | error_handling | elevee | constat_probable | `backend/app/main.py:39` | Reponse 500 renvoie `debug_error`. | Retourner detail neutre au client; logs details cote serveur. |
| API-03 | upload | elevee | constat_probable | `admin_new.py:944-945` | `extractall` non securise sur archives utilisateur. | Validation stricte contenu archive avant extraction. |
| API-04 | upload | moyenne | constat_probable | `admin_new.py:940-941` | Upload charge en memoire complete. | Limiter taille upload, streaming et quotas. |
| API-05 | rate_limit | moyenne | hypothese_forte | absence de mecanisme evident dans routes inspectees | Pas d'indice de rate limiting sur endpoints sensibles. | Ajouter throttling API (IP/user/key) sur auth/upload/admin. |

## C. Score API
- Authn/Authz: 4/10
- Validation entree: 6/10
- Gestion erreurs: 4/10
- Resilience: 5/10
- Score global: 4.8/10

## D. Actions prioritaires
1. Proteger tous endpoints `/admin` par role.
2. Enlever toute fuite `debug_error` en prod.
3. Securiser upload (zip validation + limites + timeouts).
4. Ajouter rate limiting minimal.

## E. Conclusion
L'API peut continuer en environnement controle, mais ne doit pas etre exposee sans fermeture des actions P1.
