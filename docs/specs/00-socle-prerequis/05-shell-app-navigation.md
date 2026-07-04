# Shell applicatif et navigation

## Objectif

Créer l'ossature d'interface commune de l'application protégée : navigation, layout responsive, états vides, feedback utilisateur et accès aux modules.

## Priorité

- Niveau : Must
- Justification : le jury doit pouvoir tester rapidement les parcours principaux sans friction de navigation.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : [Organisations et RBAC](04-organisations-rbac.md).
- Contrats partagés : session utilisateur, organisation active, routes applicatives.

## Périmètre

- Layout authentifié.
- Navigation principale desktop et mobile.
- Sélecteur d'organisation.
- Accès dashboard, idées, contenus, calendrier, curation, paramètres.
- États de chargement, erreur, vide et accès refusé.
- Base responsive et accessible.

## Hors périmètre

- Design system complet de composants complexes.
- Éditeur riche de contenu.
- Calendrier détaillé.

## Acteurs

- Utilisateur connecté : navigue entre les modules.
- Administrateur : accède aux paramètres d'organisation.
- Lecteur : voit uniquement les sections consultables.

## Parcours / comportement attendu

1. Un utilisateur connecté arrive sur `/app`.
2. Le système résout son organisation active.
3. Le layout affiche la navigation et les actions disponibles selon son rôle.
4. L'utilisateur passe d'un module à l'autre sans perdre le contexte d'organisation.

## Règles fonctionnelles

- La navigation doit afficher les modules disponibles selon la phase livrée.
- Les actions interdites par rôle doivent être masquées ou désactivées, tout en restant protégées côté backend NestJS.
- Les pages doivent afficher un état vide utile quand aucune donnée n'existe.
- Les erreurs doivent proposer une action de récupération quand c'est possible.
- L'interface doit être utilisable sur mobile et desktop.

## Règles techniques

- Les layouts partagés ne doivent pas importer de logique métier backend spécifique aux features.
- La navigation doit être définie dans une configuration centralisée.
- Les routes protégées doivent être compatibles avec les tests E2E.
- Les composants interactifs doivent respecter les attributs d'accessibilité de base.
- Les textes visibles doivent être en français.

## Données et modèle

- Données consommées : session utilisateur, organisations accessibles, rôle courant.
- Aucune table spécifique.

## Contrats d'interface

- Pages : `/app`, `/app/:organizationSlug/dashboard`, `/app/:organizationSlug/settings`.
- Composants : `AppShell`, `MainNav`, `OrganizationSwitcher`, `UserMenu`, `EmptyState`, `AccessDenied`.
- Navigation cible MVP : Dashboard, Idées, Contenus, Paramètres.
- Navigation cible V1/V2 : Calendrier, Curation, Intégrations.

## Critères d'acceptation

- Étant donné un utilisateur connecté, quand il ouvre `/app`, alors il voit une navigation cohérente avec son organisation active.
- Étant donné un mobile, quand l'utilisateur ouvre la navigation, alors les modules restent accessibles sans chevauchement.
- Étant donné un rôle lecteur, quand l'interface s'affiche, alors les actions d'édition ne sont pas proposées.

## Tests attendus

- Tests unitaires : configuration de navigation par rôle.
- Tests d'intégration : rendu du layout avec session et organisation.
- Tests E2E : navigation desktop/mobile et accès refusé.

## Questions ouvertes

- Les modules V1/V2 doivent-ils être cachés tant qu'ils ne sont pas implémentés ou affichés comme indisponibles ?
- Faut-il prévoir un mode démonstration spécifique pour le jury ?
