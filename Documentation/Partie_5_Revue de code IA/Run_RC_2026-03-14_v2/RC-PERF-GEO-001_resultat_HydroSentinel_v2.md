# RC-PERF-GEO-001 - Resultat run HydroSentinel v2

Date: 2026-03-14
Scope: `DataManagement.tsx`, `api.ts`, `admin_new.py`

## A. Synthese generale
- Risque global de lenteur: modere
- Goulots probables: interactions UI import + traitement upload SHP
- Risque principal a l'echelle: gros volumes fichiers et longues listes UI

## B. Contexte interprete
- Frontend React centralise de nombreuses vues/etats dans un seul composant.
- Backend admin combine CRUD, templates Excel et upload SHP.
- Cas critique Hydro/SIG: import frequents + fichiers geospatiaux lourds.

## C. Tableau detaille des observations
| ID | Type | Niveau | Description | Impact | Contexte critique | Recommandation |
|---|---|---|---|---|---|---|
| PERF-01 | render | probleme_probable | Composant UI de 1837 lignes avec etat large | rerenders frequents | sessions admin longues | split composant + memoisation locale |
| PERF-02 | algo/render | risque | tris (`sort`) recalcules a chaque rendu | CPU UI inutile | listes longues stations/mesures | useMemo pour derives tries |
| PERF-03 | reseau | probleme_probable | `analyzeFile` reappele sur plusieurs changements formulaire | surcharge API | utilisateur ajuste filtres import | debounce + trigger explicite |
| PERF-04 | render | risque | pas de virtualisation pour tableaux long format | ralentissement UI | grand nombre de lignes TS | virtual list/pagination |
| PERF-05 | memoire/io | probleme_probable | `file.read()` charge fichier entier en RAM | pic memoire backend | ZIP/SHP volumineux | streaming, seuil max taille |
| PERF-06 | io/reseau | risque | `gdf.to_json()` + retour `preview` complet en dry-run | payload lourd | geodata dense | limiter preview (N features) |
| PERF-07 | db | vigilance | suppression `dss_mapping` dupliquee | surcout DB marginal | suppressions massives | dedupliquer requete |

## D. Goulots probables
- Reanalyse automatique repetee pendant preparation import.
- Parsing/serialisation geodata complet en dry-run SHP.

## E. Points de vigilance
- Temps de rendu sur listes > 5k elements.
- Montee en charge backend upload sans garde memoire.

## F. Recommandations priorisees
### Priorite 1 - A optimiser rapidement
- Debounce + annulation des appels analyze.
- Stream upload fichier et limite de taille.
- Limiter preview SHP a un echantillon.

### Priorite 2 - A securiser avant montee en charge
- Decouper `DataManagement.tsx` et memoiser derives lourds.
- Ajouter pagination/virtualisation tables.

### Priorite 3 - A surveiller/profiler
- Profiling React render sur onglet timeseries.
- Metrics API upload/analyze (latence p95, taille payload).

## G. Score performance/scalabilite
- Efficacite algorithmique: 6/10
- Gestion memoire: 5/10
- IO/reseau: 5/10
- Scalabilite: 5/10
- Performance globale: 5.3/10

## H. Conclusion
Performance acceptable pour volume modere, mais fragile en charge. Verdict: **GO_PERF_CONDITIONNEL** avec actions P1 avant extension des volumes.
