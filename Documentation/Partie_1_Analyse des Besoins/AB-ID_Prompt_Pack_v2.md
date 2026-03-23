# AB-ID Prompt Pack v2 - HydroSentinel

Date: 2026-03-14
Portee: Partie 1 - Identification des donnees

Usage: copier-coller chaque prompt dans l ordre AB-ID-001 -> AB-ID-007.

---

## Prompt AB-ID-001 - Catalogue des donnees critiques

```text
Role: Data architect hydro senior.

Contexte fixe:
- Projet: HydroSentinel
- Zone: Bassin du Sebou
- Mission: anticipation crue + aide decision lachers barrage
- Modules consommateurs: Dashboard, analyses, recap barrage, thematique, import/admin

Tache:
Produire le catalogue minimal des donnees critiques necessaires au fonctionnement decisionnel.

Contraintes:
- Ne pas inventer de source non plausible.
- Marquer explicitement A_VALIDER pour toute inconnue.

Sortie JSON obligatoire:
{
  "donnees_critiques": [
    {
      "data_id": "D-...",
      "nom_technique": "...",
      "definition_metier": "...",
      "unite": "...",
      "grain_spatial": "...",
      "grain_temporel": "...",
      "criticite": "Critique|Haute|Moyenne",
      "modules_consommateurs": ["..."],
      "risque_si_absente": "...",
      "statut_confiance": "Confirme|A_VALIDER"
    }
  ]
}
```

---

## Prompt AB-ID-002 - Registre des sources

```text
Role: Data engineer hydro.

Tache:
Mapper les sources reelles pour chaque donnee critique.

Sortie JSON obligatoire:
{
  "sources": [
    {
      "source_id": "S-...",
      "data_id": "D-...",
      "nature_source": "mesure|prevision|simulation|referentiel",
      "source_code": "OBS|SIM|AROME|ECMWF|...",
      "proprietaire": "...",
      "mode_acces": "API|DB|fichier|manuel",
      "frequence": "...",
      "fraicheur_cible": "...",
      "risque_source": "Faible|Moyen|Eleve",
      "plan_fallback": "..."
    }
  ]
}
```

---

## Prompt AB-ID-003 - Cartographie des flux

```text
Role: Architecte integration data.

Tache:
Cartographier les flux de bout en bout:
Source -> Validation -> Transformation -> Stockage -> Endpoint -> Ecran -> Decision impactee

Sortie JSON obligatoire:
{
  "flux": [
    {
      "flux_id": "F-...",
      "source": "...",
      "validation": "...",
      "transformation": "...",
      "stockage": "...",
      "endpoint": "...",
      "ecran": "...",
      "decision_impactee": "...",
      "point_de_rupture": "...",
      "detection_rupture": "...",
      "contournement": "..."
    }
  ]
}
```

---

## Prompt AB-ID-004 - Evaluation qualite des donnees

```text
Role: Data quality lead.

Tache:
Evaluer la qualite par donnee critique sur: completude, coherence, fraicheur, continuite, tracabilite, integrite referentielle.

Sortie JSON obligatoire:
{
  "evaluation_qualite": [
    {
      "data_id": "D-...",
      "score_global": 0.0,
      "score_completude": 0.0,
      "score_coherence": 0.0,
      "score_fraicheur": 0.0,
      "score_continuite": 0.0,
      "score_tracabilite": 0.0,
      "score_integrite_ref": 0.0,
      "anomalies": ["..."],
      "impact_metier": "...",
      "action_corrective": "...",
      "priorite_action": "P1|P2|P3"
    }
  ]
}
```

---

## Prompt AB-ID-005 - Volumes et frequences

```text
Role: Data platform engineer.

Tache:
Estimer la charge data sans inventer.
Utiliser la formule:
volume_journalier_estime = nb_entites * nb_variables * points_par_jour * nb_sources

Regle:
- Si inconnu: A_MESURER + methode_de_mesure

Sortie JSON obligatoire:
{
  "volumes_frequences": [
    {
      "domaine": "...",
      "nb_entites": "A_MESURER|...",
      "nb_variables": "A_MESURER|...",
      "points_par_jour": "A_MESURER|...",
      "nb_sources": "A_MESURER|...",
      "volume_journalier_estime": "...",
      "sla_lecture_cible": "...",
      "methode_de_mesure": "...",
      "risque_performance": "Faible|Moyen|Eleve"
    }
  ]
}
```

---

## Prompt AB-ID-006 - Contraintes techniques data

```text
Role: Architecte technique data.

Tache:
Construire le registre des contraintes techniques pouvant impacter la fiabilite decisionnelle.

Sortie JSON obligatoire:
{
  "contraintes": [
    {
      "contrainte_id": "C-...",
      "type": "schema|API|format|performance|securite|gouvernance",
      "description": "...",
      "impact": "Faible|Moyen|Eleve",
      "probabilite": "Faible|Moyenne|Elevee",
      "mitigation": "...",
      "proprietaire": "...",
      "echeance": "YYYY-MM-DD"
    }
  ]
}
```

---

## Prompt AB-ID-007 - Synthese data GO/NO-GO

```text
Role: Responsable cadrage data.

Tache:
Consolider AB-ID-001..006 et donner un verdict net: GO | GO_CONDITIONNEL | NO_GO.

Sortie JSON obligatoire:
{
  "synthese_data": {
    "resume_executif": "...",
    "criteres_remplis": ["..."],
    "criteres_non_remplis": ["..."],
    "verdict": "GO|GO_CONDITIONNEL|NO_GO",
    "conditions_de_passage": [
      {"condition": "...", "echeance": "YYYY-MM-DD", "proprietaire": "..."}
    ],
    "plan_action_priorise": [
      {"priorite": "P1|P2|P3", "action": "...", "owner": "...", "echeance": "YYYY-MM-DD"}
    ]
  }
}
```

---

## Checklist d acceptation AB-ID (audit)

- Flux de donnees: complet de bout en bout
- Qualite des donnees: section dediee + scores + actions
- Volumes/frequences: estimation + methode de mesure
- Contraintes techniques: registre dedie complet
- Synthese finale data: verdict + conditions datees
- Alignement AB-ID-001 a 007: complet
