# Partie 3 - Planification DEV
## PD-PRI-001 - Priorisation technique (adaptee HydroSentinel)

Date de reference: 2026-03-14

## 1. Objectif

Prioriser modules et taches en P1-P4 pour sequencer implementation et reduire risque projet.

## 2. Contexte impose

- Entrees: decoupage taches PD-TSK-001
- Contrainte metier: robustesse parcours critiques (dashboard + data)
- Contraintes techniques: qualite data, endpoints critiques, gouvernance schema, observabilite

## 3. Prompt operationnel (copier-coller)

```text
Role:
Tu es architecte logiciel + chef de projet technique.

Contexte fixe HydroSentinel:
- Mission decision crue/lacher
- Modules M1..M9
- Besoin d ordre implementation realiste et defendable

Mission:
Classer chaque element en P1/P2/P3/P4.

Critere impose:
- criticite metier
- dependances techniques
- impact sur stabilite systeme
- impact sur MVP
- risque si reporte

Sortie obligatoire:
1) Synthese globale
2) Tableau detaille:
Element | Type | Role | Dependances | Priorite | Justification | Risque si reporte | Moment recommande
3) Classement final
4) Socle technique
5) Perimetre MVP (indispensable/recommande/reportable)
6) Dependances critiques
7) Recommandations roadmap/sprints
```

## 4. Regle de priorite recommandee

- P1: socle indispensable et debloquant
- P2: important pour valeur metier ou stabilite
- P3: secondaire non bloquant
- P4: evolution optionnelle

## 5. Definition of Done PD-PRI-001

1. Chaque element classe P1-P4 avec justification.
2. Dependances critiques explicites.
3. Socle technique et MVP clairement delimites.
4. Sortie directement utilisable pour PD-RDM-001.
