# Onboarding avancé

## Objectif

Améliorer l'accompagnement des nouveaux utilisateurs avec un parcours interactif, des exemples sectoriels et une checklist de prise en main.

## Priorité

- Niveau : Could
- Justification : utile pour l'adoption, mais le MVP doit d'abord livrer un onboarding simple et fonctionnel.

## Phase

- V2

## Dépendances

- Specs prérequises : [Onboarding](../10-features-mvp/01-onboarding.md), [Contexte éditorial](../10-features-mvp/02-contexte-editorial.md), [Shell applicatif et navigation](../00-socle-prerequis/05-shell-app-navigation.md).
- Contrats partagés : état d'onboarding, presets de contexte, rôle utilisateur.

## Périmètre

- Checklist de progression.
- Tutoriel interactif.
- Exemples de configuration selon le secteur.
- Presets de contexte éditorial.
- Première action guidée : génération d'idée ou de contenu.

## Hors périmètre

- Formation vidéo complète.
- Onboarding commercial et facturation.
- Migration de données depuis un autre outil.
- Personnalisation IA avancée du parcours.

## Acteurs

- Nouvel administrateur : configure l'organisation.
- Nouveau collaborateur : découvre l'espace existant.
- Système : adapte les étapes au rôle et à l'état de l'organisation.

## Parcours / comportement attendu

1. L'utilisateur arrive après inscription ou invitation.
2. Le système affiche une checklist adaptée à son rôle.
3. L'utilisateur choisit éventuellement un preset sectoriel.
4. Les champs du contexte éditorial sont préremplis.
5. L'utilisateur lance une première génération guidée.

## Règles fonctionnelles

- L'onboarding avancé est skippable.
- La progression est sauvegardée par utilisateur et organisation.
- Les étapes varient selon le rôle et l'existence d'un contexte.
- Un preset peut préremplir le contexte mais ne doit pas l'écraser sans confirmation.
- L'utilisateur peut reprendre le parcours plus tard.

## Règles techniques

- Les étapes doivent être configurables côté application.
- Les presets doivent être versionnés ou identifiables.
- Le skip ne doit pas bloquer l'accès aux pages principales.
- Les événements de progression peuvent être journalisés pour améliorer le parcours.
- Le parcours doit rester accessible et responsive.

## Données et modèle

- `OnboardingProgress` : `userId`, `organizationId`, étape courante, étapes terminées, skippedAt, completedAt.
- `OnboardingPreset` : secteur, cible type, ton, thématiques, exemple de brief.
- `OnboardingStep` : clé, rôle cible, ordre, statut.

## Contrats d'interface

- Pages : `/app/:organizationSlug/onboarding`.
- Actions/API : `getAdvancedOnboardingState`, `updateOnboardingProgress`, `listOnboardingPresets`, `applyOnboardingPreset`.
- Événement : `onboarding.step.completed`.

## Critères d'acceptation

- Étant donné un nouvel administrateur, quand il ouvre l'application, alors une checklist adaptée est affichée.
- Étant donné un preset choisi, quand il est appliqué, alors les champs attendus sont préremplis.
- Étant donné une étape validée, quand l'utilisateur revient, alors elle reste validée.
- Étant donné un utilisateur qui skip, quand il navigue dans l'app, alors il n'est pas bloqué.

## Tests attendus

- Tests unitaires : progression, sélection d'étapes par rôle, application de preset.
- Tests d'intégration : sauvegarde/reprise, skip, état terminé.
- Tests E2E : parcours admin, parcours invité, preset puis génération.

## Questions ouvertes

- Quels secteurs doivent avoir des presets dès la V2 ?
- Faut-il différencier fortement l'onboarding administrateur et collaborateur ?
