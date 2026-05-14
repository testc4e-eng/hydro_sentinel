# Documentation HydroSentinel - Index Global

Date de mise a jour: 2026-03-25

## Objectif

Fournir une documentation claire, orientee objectifs, pour piloter les prompts IA et les livrables sans toucher la logique applicative.

## Structure retenue

- `Partie_1_Analyse des Besoins/`
- `Partie_2_Conception Technique/`
- `Partie_3_Planification DEV/`
- `Partie_5_Revue de code IA/`
- `Partie_6_Audit de Securite IA/`
- `Synthese docs/`

Note: la Partie 4 n'est pas materialisee dans l'arborescence actuelle.

## Regle par partie

Chaque dossier de partie contient:
- les prompts actifs
- un run actif (resultats md/json)
- un livrable final GO/NO-GO
- une synthese detaillee nommee `Synthese_Partie_X_HydroSentinel_Detaillee.md`

## Nettoyage des doublons

Les doublons/legacy sont deplaces (pas perdus) dans le dossier racine:
- `../ignorÃ©s/`

## Ordre de lecture recommande

1. Partie 1
2. Partie 2
3. Partie 3
4. Partie 5
5. Partie 6
6. Synthese docs

## Addendum recent (implementation)

- `Partie_2_Conception Technique/Addendum_Implementation_2026-03-25.md`
  - Journal des updates fonctionnelles/UI/API/SQL implementees entre le 2026-03-23 et le 2026-03-25.
  - Couvre notamment ABH/DGM (shapes), Precipitations, Scan de donnees, Gestion des Donnees, Recapitulatif barrage.

