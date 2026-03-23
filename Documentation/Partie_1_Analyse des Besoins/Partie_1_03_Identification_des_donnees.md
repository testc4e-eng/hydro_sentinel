# Partie 1 - Analyse des besoins
## Phase 3: Identification des donnees (HydroSentinel) - Version renforcee v2

Date de reference: 14 mars 2026
Objectif: produire un kit AB-ID complet, exploitable sans ambiguite pour la conception et l implementation.

---

## 1. Cible de la phase

Transformer la vision metier en contrat data executable:

1. Quelles donnees sont strictement necessaires a la decision crue/lacher.
2. D ou viennent ces donnees et qui en est responsable.
3. Comment ces donnees circulent jusqu aux ecrans de decision.
4. Quel niveau de qualite minimum est obligatoire.
5. Quelle charge (volumes/frequences) doit etre supportee.
6. Quelles contraintes techniques peuvent bloquer la fiabilite.
7. Quelle synthese GO/NO-GO data permet de passer en phase suivante.

---

## 2. Alignement AB-ID-001 a AB-ID-007 (obligatoire)

| Prompt | Question a trancher | Sortie obligatoire |
|---|---|---|
| AB-ID-001 | Quelles donnees critiques? | Catalogue data cible priorise |
| AB-ID-002 | Quelles sources reelles? | Registre des sources + proprietaires + acces |
| AB-ID-003 | Quels flux? | Cartographie Source -> Transform -> DB -> API -> UI |
| AB-ID-004 | Quelle qualite minimale? | Regles + score + anomalies + actions |
| AB-ID-005 | Quels volumes/frequences? | Estimation charge + SLA + retention |
| AB-ID-006 | Quelles contraintes techniques? | Registre contraintes + impact + mitigation |
| AB-ID-007 | Passage possible? | Synthese data GO/NO-GO argumentee |

---

## 3. AB-ID-001 - Catalogue des donnees critiques

### 3.1 Jeu minimal critique pour HydroSentinel

| Domaine | Donnee | Grain | Sources candidates | Usage decisionnel | Criticite |
|---|---|---|---|---|---|
| Pluie | `precip_mm` | station, bassin, temps | OBS, AROME, ECMWF | anticipation crue/apports | Critique |
| Debit | `flow_m3s` | station, temps | OBS, SIM | vigilance hydrologique | Critique |
| Apport | `inflow_m3s` | barrage, temps | OBS, SIM | bilan entree barrage | Critique |
| Volume | `volume_hm3` | barrage, temps | OBS, SIM | marge stockage | Critique |
| Lacher | `lacher_m3s` | barrage, temps | OBS, ABHS_RES | pilotage aval | Critique |
| Criticite | `severity`, `score` | entite, temps | vues KPI | priorisation action | Haute |
| Geometrie | stations/bassins/barrages | entite | geo.*, SHP | carte decisionnelle | Haute |
| Thematique | flood/snow products | produit, date | thematic-maps, sebou | contexte spatial evenementiel | Moyenne a Haute |

### 3.2 Prompt AB-ID-001 (renforce)
```text
Tu es data architect hydro.

Contexte fixe:
- Produit: HydroSentinel (Sebou)
- Mission: anticipation crue + aide decision lachers
- Modules consomateurs: Dashboard, analyses, recap barrage, cartes thematiques, import/admin

Mission:
Construire le catalogue minimal de donnees critiques.

Pour chaque donnee, imposer:
- data_id
- nom_technique
- definition_metier
- unite
- grain_spatial
- grain_temporel
- criticite (Critique/Haute/Moyenne)
- module_consommateur
- risque_si_absente

Regles:
- Pas d invention de source non plausible.
- Marquer explicitement "A valider" si incertain.
```
---
## 4. AB-ID-002 - Registre des sources de donnees
### 4.1 Matrice source
| Donnee | Source | Type | Proprietaire | Mode acces | Frequence attendue | Risque source |
|---|---|---|---|---|---|---|
| precip_mm | OBS | mesure | ABHS/terrain | DB/API/import | infra-journalier a journalier | Moyen |
| precip_mm | AROME, ECMWF | prevision | provider meteo | DB/API | journalier (runs) | Moyen |
| flow_m3s | OBS | mesure | ABHS | DB/API/import | infra-journalier | Eleve |
| flow_m3s | SIM | simulation | modele interne/externe | DB/import | selon run | Moyen |
| volume_hm3, inflow_m3s, lacher_m3s | OBS/SIM/ABHS_RES | mixte | exploitation + data | DB/import | journalier ou plus | Eleve |
| thematique flood/snow | produits thematiques | geospatial | module Sebou | API fichiers/DB | evenementiel | Moyen |

### 4.2 Prompt AB-ID-002 (renforce)
```text
Pour chaque donnee critique, mappe les sources reelles.

Sortie imposee:
- source_id
- data_id
- nature_source (mesure/prevision/simulation/referentiel)
- proprietaire
- mode_acces (API, DB, fichier, manuel)
- frequence
- fraicheur_cible
- risque_source
- plan_fallback
```

---
## 5. AB-ID-003 - Flux de donnees (section dediee complete)

### 5.1 Flux critiques

1. **Flux Ingestion brute**
   - Fichiers/API -> `ingest/analyze` -> `ingest/execute` -> tables `ts.*`
2. **Flux Admin correction**
   - `admin/timeseries/analyze/upload` -> correction ponctuelle/serie -> `ts.*`
3. **Flux Dashboard decision**
   - `ts/ref/geo/api.v_*` -> `/map/points-kpi` + `/dashboard/top-critical` -> UI
4. **Flux Analyse detaillee**
   - `/measurements/timeseries` + `/measurements/compare` -> pages analyses
5. **Flux Thematique**
   - produits flood/snow -> `/thematic-maps/*` -> module cartographique
6. **Flux Audit qualite**
   - `/admin/data-availability` -> diagnostic + suppression ciblee

### 5.2 Prompt AB-ID-003 (renforce)

```text
Construis une cartographie de flux data avec ces colonnes:
source -> validation -> transformation -> stockage -> endpoint -> ecran -> decision impactee

Ajoute:
- point_de_rupture_possible
- detection_rupture
- action_de_contournement
```

---

## 6. AB-ID-004 - Qualite des donnees (section dediee complete)

### 6.1 Dimensions qualite obligatoires

| Dimension | Definition | Regle minimale |
|---|---|---|
| Completude | Presence des champs et series attendues | >= 99% champs obligatoires |
| Coherence | Valeurs plausibles et unite coherente | 0 valeur hors domaine critique |
| Fraicheur | Delai entre mesure/source et disponibilite | seuil par donnee critique |
| Tracabilite | Source explicite conservee | 100% |
| Continuit | Trous temporels sur fenetre decisionnelle | >= 90% series sans trou bloquant |
| Integrite referentielle | station/bassin/variable/source resolus | >= 99% |

### 6.2 Prompt AB-ID-004 (renforce)

```text
Evalue la qualite des donnees critiques par dimension.

Sortie imposee par data_id:
- score_global (0..1)
- score_completude
- score_coherence
- score_fraicheur
- score_continuite
- anomalies_detectees[]
- impact_metier
- action_corrective
- priorite_action (P1/P2/P3)
```

---

## 7. AB-ID-005 - Volumes et frequences (section dediee complete)

### 7.1 Modele d estimation

Ne pas inventer des chiffres non observes. Utiliser:

`volume_journalier_estime = nb_entites * nb_variables * points_par_jour * nb_sources`

### 7.2 Gabarit d estimation a remplir

| Domaine | nb_entites | nb_variables | points_par_jour | nb_sources | volume_journalier_estime | SLA lecture cible |
|---|---:|---:|---:|---:|---:|---|
| Stations hydro | A mesurer | A mesurer | A mesurer | A mesurer | Formule | < 3 s ecran critique |
| Barrages | A mesurer | A mesurer | A mesurer | A mesurer | Formule | < 3 s ecran critique |
| Bassins | A mesurer | A mesurer | A mesurer | A mesurer | Formule | < 3 s ecran critique |
| Thematique produits | A mesurer | n/a | evenementiel | n/a | A mesurer | < 5 s metadata + chargement progressif |

### 7.3 Prompt AB-ID-005 (renforce)

```text
Produit une estimation volumes/frequences sans inventer.

Si valeur inconnue:
- marquer A_MESURER
- proposer methode de mesure

Sortie imposee:
- estimation_par_domaine[]
- hypothese_calcul[]
- points_de_mesure_a_instrumenter[]
- risque_performance
```

---

## 8. AB-ID-006 - Contraintes techniques data (section dediee complete)

### 8.1 Registre initial des contraintes

| Contrainte | Impact | Probabilite | Mitigation proposee |
|---|---|---|---|
| Dependance aux vues SQL metier | Eleve | Moyenne | versioning + DDL de reference |
| Ecarts endpoints legacy frontend/backend | Moyen | Moyenne | alignement et deprecation explicite |
| Heterogeneite fichiers import | Eleve | Elevee | gabarits stricts + validation renforcee |
| Qualite geometrique SHP variable | Moyen | Moyenne | controles CRS/schema + dry_run obligatoire |
| Disponibilite source exogene | Moyen | Moyenne | fallback multi-source + alerting |

### 8.2 Prompt AB-ID-006 (renforce)

```text
Construit un registre de contraintes techniques data.

Sortie imposee:
- contrainte_id
- type (schema, API, format, performance, securite, gouvernance)
- description
- impact
- probabilite
- mitigation
- proprietaire
- echeance
```

---

## 9. AB-ID-007 - Synthese finale data

### 9.1 Regle de decision

- **GO data**: aucune contrainte critique non traitee + seuils qualite minimum definis.
- **GO conditionnel**: contraintes critiques restantes avec plan/echeance/proprietaire valides.
- **NO-GO**: impossibilite de garantir donnees critiques pour decision metier.

### 9.2 Prompt AB-ID-007 (renforce)

```text
Consolide AB-ID-001..006 et rends un verdict GO/GO_CONDITIONNEL/NO_GO.

Sortie imposee:
1) resume executif
2) checklist des criteres remplis/non remplis
3) verdict
4) conditions de passage datees
5) plan d action priorise (P1/P2/P3)
```

---

## 10. Matrice de controle qualite des prompts AB-ID

| Critere | AB-ID cible | Statut attendu |
|---|---|---|
| Catalogue donnees critiques complet | 001 | Complet |
| Sources et proprietaires traces | 002 | Complet |
| Flux de donnees cartographies de bout en bout | 003 | Complet |
| Qualite data objectivee par scores/regles | 004 | Complet |
| Volumes/frequences estimes et instrumentes | 005 | Complet |
| Contraintes techniques data formalisees | 006 | Complet |
| Synthese finale + verdict explicite | 007 | Complet |

---

## 11. Definition of Done (renforcee)

La phase Identification des donnees est acceptee uniquement si:

1. AB-ID-001 a AB-ID-007 sont executes avec sorties structurees.
2. Les sections flux, qualite, volumes/frequences, contraintes sont completes.
3. Chaque inconnue est marquee `A_MESURER` avec methode de mesure.
4. Une synthese finale AB-ID-007 tranche GO/GO conditionnel/NO-GO avec conditions datees.
