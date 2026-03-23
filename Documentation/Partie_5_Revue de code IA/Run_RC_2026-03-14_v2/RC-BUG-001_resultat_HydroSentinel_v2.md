# RC-BUG-001 - Resultat run HydroSentinel v2

Date: 2026-03-14
Scope: `DataManagement.tsx`, `api.ts`, `admin_new.py`

## A. Synthese generale
- Niveau global de risque bug: modere
- Bugs probables identifies: 5
- Bugs possibles / vigilance: 2
- Zones sensibles: import timeseries frontend et upload SHP backend

## B. Tableau detaille des anomalies
| ID | Type | Certitude | Gravite | Description | Scenario | Impact | Correctif |
|---|---|---|---|---|---|---|---|
| BUG-01 | logique | probable | moyenne | Cle `message` dupliquee dans la reponse dry_run SHP | retour JSON construit | premiere valeur ecrasee, confusion | garder une seule cle |
| BUG-02 | concurrence | probable | elevee | Multiples appels `analyzeFile` sans annulation | utilisateur change mode/station/variable rapidement | etat d'analyse obsolescent | debounce + annulation |
| BUG-03 | render | probable | moyenne | `Math.random()` utilise comme key React | chaque rerender regenere des cles | remount inutile, UX instable | key stable par id |
| BUG-04 | io/securite | possible | elevee | `extractall()` ZIP sans controle de chemins | archive malicieuse avec chemins sortants | ecriture hors dossier temporaire | valider membres ZIP avant extraction |
| BUG-05 | memoire | probable | moyenne | `await file.read()` charge fichier complet | upload volumineux SHP/ZIP | pic RAM backend + timeout | stream/chunk + limite taille |
| BUG-06 | logique | probable | faible | suppression `dss_mapping` executee 2 fois | suppression station | surcout DB + code ambigu | supprimer doublon |
| BUG-07 | exception | possible | moyenne | plusieurs `except: pass` | erreur DB/lib lors templates ou nettoyage | erreur silencieuse, debug difficile | except cible + log |

## C. Bugs probables
- BUG-01, BUG-02, BUG-03, BUG-05, BUG-06.

## D. Points de vigilance
- BUG-04 (risque securite via archive ZIP).
- BUG-07 (stabilite depend de qualite de logs/monitoring).

## E. Recommandations priorisees
### Priorite 1 - A corriger/verifier immediatement
- Corriger anti-race `analyzeFile`.
- Remplacer keys React instables.
- Dedupliquer suppression `dss_mapping`.

### Priorite 2 - A securiser rapidement
- Durcir extraction ZIP.
- Eviter `file.read()` complet (stream + limite).

### Priorite 3 - A surveiller
- Remplacer `except: pass` par gestion explicite.

## F. Score robustesse
- Cas limites: 5/10
- Validation des entrees: 6/10
- Gestion des erreurs: 5/10
- Fiabilite logique: 6/10
- Stabilite des flux: 5/10
- Risque global de bugs: 5.4/10

## G. Conclusion
Le code est fonctionnel mais presentant des points de fragilite concrets. Verdict: **RISQUE_MODERE** avec correctifs priorite 1 a traiter avant extension importante.
