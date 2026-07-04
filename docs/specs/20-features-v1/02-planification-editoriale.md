# Planification éditoriale

## Objectif

Permettre aux équipes d'associer les contenus à des dates, canaux et statuts dans un calendrier éditorial.

## Priorité

- Niveau : Should
- Justification : la planification est nécessaire pour transformer la génération de contenus en stratégie éditoriale organisée.

## Phase

- V1

## Dépendances

- Specs prérequises : [Base de données](../00-socle-prerequis/02-base-de-donnees.md), [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md), [Bibliothèque de contenus](01-bibliotheque-contenus.md).
- Contrats partagés : `ContentItem`, `PublicationPlan`, statuts éditoriaux.

## Périmètre

- Associer un contenu à une date de publication.
- Définir un canal de publication.
- Visualiser les publications à venir.
- Modifier ou supprimer une planification.
- Afficher une vue liste et une vue calendrier mensuelle.

## Hors périmètre

- Publication automatique sur les réseaux sociaux.
- Rappels automatisés.
- Synchronisation Notion.
- Analytics de performance post-publication.

## Acteurs

- Administrateur : gère toutes les planifications.
- Éditeur : planifie et modifie les contenus.
- Lecteur : consulte le calendrier.

## Parcours / comportement attendu

1. L'utilisateur ouvre le calendrier.
2. Il crée une planification depuis un contenu existant ou depuis le calendrier.
3. Il choisit une date, un canal et un statut.
4. Le contenu apparaît au bon endroit dans la vue calendrier.
5. Le statut du contenu peut passer à `Planifié`.

## Règles fonctionnelles

- Un contenu peut avoir zéro, une ou plusieurs planifications.
- Une planification contient au minimum : contenu, date, canal, statut.
- Les dates passées restent consultables.
- Les conflits de dates ne bloquent pas mais peuvent être signalés.
- Les lecteurs ne peuvent pas créer ou déplacer une planification.

## Règles techniques

- Les dates sont stockées en UTC.
- L'affichage respecte le fuseau de l'utilisateur ou de l'organisation.
- Les vues doivent charger uniquement la période demandée.
- Les modifications sont validées côté serveur.
- Les canaux doivent être normalisés par enum ou table configurable.

## Données et modèle

- `PublicationPlan` : `organizationId`, `contentId`, `channel`, `scheduledAt`, `status`, `notes`.
- `PublicationChannel` : `LINKEDIN`, `BLOG`, `INSTAGRAM`, `FACEBOOK`, `X`, `EMAIL`, `OTHER`.
- `PublicationStatus` : `PLANNED`, `PUBLISHED`, `CANCELLED`.

## Contrats d'interface

- Pages : `/app/:organizationSlug/calendar`.
- Actions/API : `listPublicationPlans`, `createPublicationPlan`, `updatePublicationPlan`, `deletePublicationPlan`.
- Paramètres de liste : `from`, `to`, `channel`, `status`.

## Critères d'acceptation

- Étant donné un contenu, quand un éditeur lui associe une date et un canal, alors il apparaît dans le calendrier.
- Étant donné une planification existante, quand la date est modifiée, alors elle apparaît au nouveau jour.
- Étant donné un lecteur, quand il ouvre le calendrier, alors il peut consulter mais pas modifier.
- Étant donné une période filtrée, quand le calendrier charge, alors seules les planifications de cette période sont récupérées.

## Tests attendus

- Tests unitaires : conversion dates/fuseaux, validation canal/statut.
- Tests d'intégration : CRUD planification, RBAC, filtres période.
- Tests E2E : créer, déplacer, supprimer une planification.

## Questions ouvertes

- Faut-il une vue semaine dès la V1 ou seulement mois + liste ?
- Les canaux doivent-ils être personnalisables par organisation ?
