# Partie 3 - Planification DEV
## PD-RDM-001 - Roadmap technique (adaptee HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Construire une roadmap technique phasée, coherente avec dependances et MVP, sans entrer en planning sprint detaille.

## 2. Contexte impose

- Entrees: decoupage PD-TSK-001 + priorisation PD-PRI-001
- Cadre: HydroSentinel Sebou
- Focus: sequence de livraison robuste et progressive

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es expert roadmap technique logiciel.

Contexte fixe HydroSentinel:
- Modules M1..M9
- Priorites P1..P4 deja definies
- Besoin d une sequence implementation lisible pour equipe multi-profils

Mission:
Regrouper les taches en phases logiques (3 a 6 phases en general).

Regles:
- Ne pas inventer de nouvelles fonctionnalites.
- Ne pas faire planning sprint detaille.
- Respecter dependances bloquantes.
- Faire apparaitre MVP dans les premieres phases.

Sortie obligatoire:
1) Synthese roadmap
2) Tableau phases:
Phase | Objectif | Modules | Taches incluses | Dependances | Lien MVP | Justification
3) Ordre recommande
4) Alertes de sequencement
5) Recommandations suite (priorisation/sprints)
```

## 4. Structure de phases recommandee

- Phase 1: Socle technique et securite
- Phase 2: Donnees et services coeur
- Phase 3: Valeur metier MVP
- Phase 4: Integration, qualite, stabilisation
- Phase 5: Evolutions et observabilite avancee

## 5. Definition of Done PD-RDM-001

1. Roadmap lisible en phases.
2. Dependances critiques documentees.
3. Lien avec MVP explicite.
4. Sortie prete pour pilotage de sprints.
