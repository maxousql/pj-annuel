# Collaboration et invitations

## Objectif

Permettre à une organisation d'inviter des collaborateurs, d'attribuer des rôles et de gérer les accès.

## Priorité

- Niveau : Should
- Justification : la collaboration est centrale pour les agences, équipes marketing et entreprises visées.

## Phase

- V1

## Dépendances

- Specs prérequises : [Authentification et comptes](../00-socle-prerequis/03-authentification-comptes.md), [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md).
- Contrats partagés : `Invitation`, `Membership`, rôles, service email.

## Périmètre

- Inviter un collaborateur par email.
- Définir un rôle initial.
- Accepter une invitation.
- Révoquer ou relancer une invitation.
- Modifier le rôle d'un membre.
- Retirer un membre.

## Hors périmètre

- Commentaires collaboratifs.
- Édition temps réel.
- Facturation par siège.
- SSO entreprise.

## Acteurs

- Administrateur : invite et gère les membres.
- Invité : accepte l'invitation.
- Éditeur : collabore après acceptation.
- Lecteur : consulte après acceptation.

## Parcours / comportement attendu

1. Un administrateur invite une adresse email avec un rôle.
2. Le système crée un token d'invitation et envoie un email.
3. L'invité ouvre le lien.
4. Il se connecte ou crée un compte.
5. Le système crée son membership avec le rôle prévu.

## Règles fonctionnelles

- Seuls les administrateurs peuvent inviter, révoquer ou modifier les rôles.
- Une invitation expirée ne peut pas être acceptée.
- Un utilisateur ne peut pas avoir deux memberships actifs dans la même organisation.
- Le dernier administrateur ne peut pas être rétrogradé ou retiré sans remplaçant.
- Les changements de rôle doivent être appliqués immédiatement aux permissions.

## Règles techniques

- Les tokens d'invitation sont opaques et hashés en base.
- L'expiration est configurable.
- L'envoi email doit être isolé pour pouvoir être mocké.
- L'acceptation doit être transactionnelle entre invitation et membership.
- Les erreurs ne doivent pas révéler inutilement l'existence d'un compte.

## Données et modèle

- `Invitation` : `organizationId`, `email`, `role`, `tokenHash`, `expiresAt`, `status`, `invitedById`.
- `Membership` : `userId`, `organizationId`, `role`, `status`.
- Statuts invitation : `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`.

## Contrats d'interface

- Pages : `/app/:organizationSlug/settings/members`, `/invite/:token`.
- Actions/API : `createInvitation`, `resendInvitation`, `revokeInvitation`, `acceptInvitation`, `updateMemberRole`, `removeMember`.
- Événement interne : `member.invited`, `member.joined`.

## Critères d'acceptation

- Étant donné un administrateur, quand il invite un email, alors une invitation en attente est créée.
- Étant donné un invité avec token valide, quand il accepte, alors il rejoint l'organisation avec le bon rôle.
- Étant donné un token expiré, quand il est ouvert, alors l'utilisateur voit un message clair.
- Étant donné le dernier administrateur, quand une suppression est demandée, alors elle est refusée.

## Tests attendus

- Tests unitaires : génération token, expiration, règle dernier admin.
- Tests d'intégration : invitation, acceptation, révocation, changement rôle.
- Tests E2E : invitation complète avec création de compte.

## Questions ouvertes

- Faut-il restreindre les invitations à certains domaines email ?
- Faut-il prévoir une relance automatique des invitations ?
