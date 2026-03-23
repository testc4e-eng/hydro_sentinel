# Partie 1 - Analyse des besoins
## Phase: Clarification des objectifs (adapte HydroSentinel)

Date de reference: 14 mars 2026

## 1. Objectif de la phase

Transformer la vision metier HydroSentinel en objectifs mesurables, priorises et directement exploitables pour la conception.

## 2. Objectifs SMART projet

| ID | Objectif SMART | Mesure | Cible | Echeance | Priorite |
|---|---|---|---|---|---|
| OBJ-01 | Reduire le temps de lecture de situation crue sur dashboard | Temps pour obtenir une vue fiable (carte + KPI + criticite) | <= 5 min | T0+3 mois | Haute |
| OBJ-02 | Fiabiliser l aide a la decision lachers barrage | Taux de dossiers decision avec donnees completes (pluie/debit/volume/lacher) | >= 95% | T0+4 mois | Haute |
| OBJ-03 | Ameliorer continuite des series critiques | % de series sans trou bloquant sur fenetre decisionnelle | >= 90% | T0+4 mois | Haute |
| OBJ-04 | Stabiliser parcours ingestion/admin | Taux de succes analyse+import sans reprise manuelle | >= 90% | T0+3 mois | Moyenne |
| OBJ-05 | Consolider exploitation thematique flood/snow | Delai de mise a dispo produit thematique exploitable | <= 2h apres publication | T0+6 mois | Moyenne |

## 3. KPI de pilotage

| KPI | Definition | Source principale | Frequence |
|---|---|---|---|
| KPI-01 Temps de comprehension situation | Duree entre ouverture dashboard et validation etat critique | Frontend logs + usage metier | Hebdomadaire |
| KPI-02 Couverture decision barrage | % barrages avec jeu complet indicateurs sur periode | `map/points-kpi` + mesures | Quotidienne |
| KPI-03 Qualite series critiques | % stations/bassins avec donnees exploitables sur fenetre active | `admin/data-availability` | Quotidienne |
| KPI-04 Fiabilite import | % imports valides sans correction manuelle lourde | `ingest/history` + logs admin | Hebdomadaire |
| KPI-05 Disponibilite thematique | % produits flood/snow disponibles selon SLA | `thematic-maps/*` | Hebdomadaire |

## 4. Parties prenantes et responsabilites

| Acteur | Role | Decision principale |
|---|---|---|
| Equipe hydrologique ABHS | Owner metier | Arbitrage vigilance et lachers |
| Equipe exploitation barrage | Utilisateur operationnel | Execution/ajustement des lachers |
| Equipe data/admin | Garant qualite data | Correction/import/reconciliation |
| Equipe technique app | Garant plateforme | Disponibilite API/UI et qualite logicielle |
| Tutelles institutionnelles | Gouvernance | Priorites et cadres d action |

## 5. Perimetre V1 (in scope / out of scope)

### In scope V1
- Carte synthese + KPI + top vigilance.
- Analyses precip/debit/apport/volume.
- Recap barrage multi-series.
- Import/admin/scan donnees.
- Cartes thematiques flood/snow avec historique.

### Out of scope V1
- Extension nationale multi-bassins hors Sebou.
- Automatisation complete de decision sans validation humaine.
- Refonte complete architecture de stockage hors besoins critiques.

## 6. Contraintes et hypotheses

| Type | Enonce | Impact | Statut |
|---|---|---|---|
| Contrainte | Qualite des donnees heterogene selon sources/periodes | Fort | Confirme |
| Contrainte | Delai de reaction operationnelle court en periode evenementielle | Fort | Confirme |
| Hypothese | Les sources OBS/SIM/AROME/ECMWF restent disponibles selon contrats actuels | Moyen | A valider periodiquement |
| Hypothese | Les utilisateurs adoptent le parcours dashboard unique en situation reelle | Moyen | A mesurer |

## 7. Prompt pack adapte - Clarification objectifs

### AB-CO-001 Reformuler le besoin
```text
A partir du contexte HydroSentinel (Sebou, crue, pilotage barrage), reformule le besoin en 5 lignes max.
Sortie: probleme principal, valeur metier, limites actuelles, questions ouvertes.
```

### AB-CO-002 Definir objectifs SMART
```text
Construis max 5 objectifs SMART relies au role HydroSentinel.
Impose pour chaque objectif: mesure, cible, echeance, priorite.
```

### AB-CO-003 Definir KPI
```text
Pour chaque objectif SMART, propose 1 a 2 KPI auditables.
Impose: formule, source de donnees, frequence, seuil d acceptation.
```

### AB-CO-004 Cartographier parties prenantes
```text
Construit une matrice Acteur -> Role -> Decision -> Risque si non engage.
```

### AB-CO-005 Delimiter perimetre
```text
Separe clairement in-scope V1 et out-of-scope.
Ajoute dependances critiques et points d arbitrage.
```

### AB-CO-006 Contraintes et hypotheses
```text
Liste contraintes certaines et hypotheses.
Impose impact, probabilite, mitigation et proprietaire.
```

### AB-CO-007 Synthese de cadrage
```text
Produit une note executive unique pour go/no-go phase data.
Sortie obligatoire: resume, objectifs, KPI, perimetre, risques, decisions.
```

## 8. Sortie structuree cible (JSON)

```json
{
  "resume_cadrage": "...",
  "objectifs_smart": [
    {"id": "OBJ-01", "objectif": "...", "mesure": "...", "cible": "...", "echeance": "...", "priorite": "Haute"}
  ],
  "kpis": [
    {"id": "KPI-01", "definition": "...", "formule": "...", "source": "...", "frequence": "...", "seuil": "..."}
  ],
  "perimetre": {
    "in_scope_v1": ["..."],
    "out_of_scope_v1": ["..."]
  },
  "risques_majeurs": ["..."],
  "decisions_requises": ["..."]
}
```

## 9. Definition of Done - Clarification des objectifs

- Objectifs SMART validables et non ambigus.
- KPI relies a des sources reelles du projet.
- Perimetre V1 explicite et accepte.
- Passage autorise vers phase `Identification des donnees`.
