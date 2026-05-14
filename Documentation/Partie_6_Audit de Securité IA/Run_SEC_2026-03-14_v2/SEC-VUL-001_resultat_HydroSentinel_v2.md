# SEC-VUL-001 - Resultat run HydroSentinel v2

Date: 2026-03-14
Scope: backend API + frontend auth

## A. Resume global
- Niveau de risque estime: eleve
- Risque principal: exposition de routes admin sans controle d'acces explicite
- Decision: GO_CONDITIONNEL (actions P1 obligatoires)

## B. Indices techniques observes
- Inclusion des routeurs admin dans `/api/v1/admin` sans dependance auth visible dans `api.py`.
- `router = APIRouter()` sans garde superuser dans `admin_new.py` et `ts_management.py`.
- Handler global renvoie `debug_error` au client sur erreur 500.
- Upload ZIP via `extractall` sans validation de chemin.
- Cle JWT de fallback statique dans la config.

## C. Vulnerabilites identifiees
| ID | Criticite | Certitude | Preuve | Description | Impact | Remediation |
|---|---|---|---|---|---|---|
| VUL-01 | critique | constat_probable | `backend/app/api/v1/api.py:24`, `:35`, `backend/app/api/v1/endpoints/admin_new.py:22`, `backend/app/api/v1/endpoints/ts_management.py:20` | Routes admin exposees sans garde auth/role explicite dans les routeurs concernes. | Acces non autorise a des operations critiques admin. | Ajouter `Depends(get_current_active_superuser)` au niveau routeur ou endpoint admin. |
| VUL-02 | elevee | constat_probable | `backend/app/main.py:39` | Le handler global retourne `debug_error` au client. | Fuite d'information interne (stack/context) facilitant reconnaissance d'attaque. | Retourner message generique en prod, log interne detaille uniquement. |
| VUL-03 | elevee | constat_probable | `backend/app/api/v1/endpoints/admin_new.py:944-945` | Extraction ZIP via `extractall` sans controle des chemins. | Risque path traversal lors upload archive malicieuse. | Valider chaque membre ZIP (pas de `..`, pas de chemin absolu) avant extraction. |
| VUL-04 | moyenne | constat_probable | `backend/app/api/v1/endpoints/admin_new.py:940-941` | Lecture fichier complet en memoire (`await file.read()`). | Degradation disponibilite (RAM/latence) sur gros fichiers. | Streaming/chunk + limite taille + timeout strict. |
| VUL-05 | elevee | constat_probable | `backend/app/core/config.py:88` | Valeur de `SECRET_KEY` de fallback statique. | Tokens JWT potentiellement predictibles si non surcharge env. | Exiger secret runtime (startup fail si valeur defaut). |
| VUL-06 | moyenne | constat_probable | `hydro-sentinel/src/pages/Login.tsx:14-15`, `:29`, `:46` | Creds demo pre-remplies + logs login/token en console. | Exposition operationnelle et hygiene securite faible cote client. | Retirer valeurs par defaut et logs sensibles hors mode dev. |

## D. Impacts CIA
- Confidentialite: risque d'acces et fuite infos techniques.
- Integrite: operations admin potentiellement executables hors role attendu.
- Disponibilite: upload non borne peut surcharger le service.

## E. Recommandations prioritaires
### Priorite 1
- Verrouiller toutes routes `/admin` avec authentification + autorisation role.
- Retirer `debug_error` des reponses 500 en environnement non-dev.
- Corriger extraction ZIP securisee.

### Priorite 2
- Imposer `SECRET_KEY` non-defaut au demarrage.
- Poser limites taille/timeout sur uploads.

### Priorite 3
- Nettoyer logs front sensibles et creds pre-remplies.

## F. Conclusion
Le socle est exploitable mais la posture securite est insuffisante pour un contexte expose. Passage possible uniquement avec fermeture des points P1.
