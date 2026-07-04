# Organisations et RBAC

## Objectif

Mettre en place la logique multi-organisation et les rôles qui isolent les espaces de travail et conditionnent les permissions.

## Priorité

- Niveau : Must
- Justification : le produit est positionné SaaS B2B et doit séparer les données par agence, entreprise ou client.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : [Authentification et comptes](03-authentification-comptes.md), [Base de données](02-base-de-donnees.md).
- Contrats partagés : `Organization`, `Membership`, `Role`, organisation active.

## Périmètre

- Création d'organisation.
- Appartenance utilisateur / organisation.
- Rôles `Administrateur`, `Éditeur`, `Lecteur`.
- Résolution de l'organisation active.
- Garde d'accès par rôle.
- Isolation backend NestJS des données métier.

## Hors périmètre

- Invitations collaborateur détaillées, traitées dans [Collaboration et invitations](../20-features-v1/04-collaboration-invitations.md).
- Permissions personnalisables par organisation.
- Hiérarchie complexe d'équipes.

## Acteurs

- Administrateur : gère l'organisation, les membres, les paramètres et les intégrations.
- Éditeur : crée et modifie idées, contenus et ressources.
- Lecteur : consulte contenus et calendrier.
- Système : applique les permissions côté backend NestJS.

## Parcours / comportement attendu

1. Un utilisateur connecté crée une organisation.
2. Il devient administrateur de cette organisation.
3. Il accède aux données de l'organisation active.
4. Le système bloque les actions interdites par son rôle.

## Règles fonctionnelles

- Un utilisateur peut appartenir à plusieurs organisations.
- Une organisation doit avoir au moins un administrateur.
- Les rôles disponibles au MVP sont limités à `ADMIN`, `EDITOR`, `READER`.
- Les données métier doivent être créées dans le contexte d'une organisation active.
- Le rôle lecteur ne peut pas créer, modifier ou supprimer des données métier.

## Règles techniques

- Les permissions sont vérifiées côté backend NestJS, pas seulement dans l'interface.
- Le slug d'organisation doit être unique.
- Le changement d'organisation active ne doit pas permettre d'accéder à une organisation sans membership.
- Les services NestJS d'accès données doivent recevoir ou résoudre `organizationId` depuis la session et le membership.
- Les checks de permission doivent être centralisés.

## Données et modèle

- `Organization` : `id`, `name`, `slug`, `ownerId`.
- `Membership` : `userId`, `organizationId`, `role`, `status`.
- Enum `Role` : `ADMIN`, `EDITOR`, `READER`.
- Enum `MembershipStatus` : `ACTIVE`, `PENDING`, `DISABLED`.

## Contrats d'interface

- Pages : `/app/organizations/new`, `/app/:organizationSlug/settings/members`.
- Actions/API : `createOrganization`, `switchOrganization`, `assertMembership`, `assertRole`.
- Helpers : `getActiveOrganization`, `canManageOrganization`, `canEditContent`, `canReadContent`.

## Critères d'acceptation

- Étant donné un utilisateur connecté sans organisation, quand il crée une organisation, alors il devient administrateur.
- Étant donné un lecteur, quand il tente de créer un contenu, alors l'action est refusée côté backend NestJS.
- Étant donné deux organisations, quand un membre de la première demande les contenus de la seconde, alors aucun contenu n'est retourné.

## Tests attendus

- Tests unitaires : matrice de permissions.
- Tests d'intégration : création organisation, changement d'organisation, refus d'accès.
- Tests E2E : accès admin, accès éditeur, accès lecteur.

## Questions ouvertes

- L'onboarding doit-il créer automatiquement une organisation personnelle si l'utilisateur n'en crée pas ?
- Faut-il permettre à un administrateur de quitter une organisation s'il est le seul admin ?
