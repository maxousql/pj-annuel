# Bibliothèque de contenus

## Objectif

Centraliser les contenus éditoriaux dans une bibliothèque filtrable, modifiable et organisée par tags, catégories et statuts.

## Priorité

- Niveau : Should
- Justification : la V1 doit structurer la production éditoriale au-delà du simple historique MVP.

## Phase

- V1

## Dépendances

- Specs prérequises : [Base de données](../00-socle-prerequis/02-base-de-donnees.md), [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md), [Historique et anti-doublon](../10-features-mvp/05-historique-anti-doublon.md).
- Contrats partagés : `ContentItem`, statuts éditoriaux, tags par organisation.

## Périmètre

- Liste paginée des contenus.
- Filtres par statut, format, tag, catégorie et date.
- Recherche dans titre et corps.
- Fiche détail et édition.
- Gestion des tags et catégories.
- Suppression logique ou archivage.

## Hors périmètre

- Génération IA.
- Calendrier éditorial.
- Synchronisation Notion.
- Publication externe.

## Acteurs

- Administrateur : gère et supprime les contenus.
- Éditeur : crée, modifie et classe les contenus.
- Lecteur : consulte les contenus.

## Parcours / comportement attendu

1. L'utilisateur ouvre la bibliothèque.
2. Il filtre les contenus par statut, format ou tag.
3. Il ouvre une fiche contenu.
4. Selon son rôle, il modifie le texte, les tags, la catégorie ou le statut.
5. La liste reflète les changements.

## Règles fonctionnelles

- Les contenus sont isolés par organisation.
- Les statuts éditoriaux V1 sont : `Idée`, `Brouillon`, `À valider`, `Planifié`, `Publié`, `Archivé`.
- Un lecteur ne peut pas modifier.
- Un éditeur peut créer, modifier, taguer et changer le statut.
- Un administrateur peut archiver ou restaurer.
- Tags et catégories sont propres à l'organisation.

## Règles techniques

- La liste doit être paginée.
- Les filtres doivent être combinables.
- Les permissions sont vérifiées côté serveur.
- Les changements critiques doivent mettre à jour `updatedAt`.
- Une suppression physique ne doit pas être le comportement par défaut.

## Données et modèle

- `ContentItem` : champs MVP + `categoryId`, `publishedAt`, `archivedAt`.
- `Tag` : `organizationId`, `name`, `color`.
- `Category` : `organizationId`, `name`.
- `ContentTag` : relation contenu/tag.
- `ContentRevision` optionnel : historique minimal des changements de corps.

## Contrats d'interface

- Pages : `/app/:organizationSlug/library`, `/app/:organizationSlug/library/:contentId`.
- Actions/API : `listContents`, `searchContents`, `updateContentMetadata`, `archiveContent`, `restoreContent`, `createTag`, `createCategory`.
- Composants : filtres, tableau/liste, fiche détail.

## Critères d'acceptation

- Étant donné plusieurs contenus, quand l'utilisateur filtre par statut et tag, alors seuls les contenus correspondants sont affichés.
- Étant donné un éditeur, quand il modifie les tags d'un contenu, alors la fiche et la liste sont mises à jour.
- Étant donné un lecteur, quand il tente une modification, alors l'action est refusée.
- Étant donné une organisation différente, quand la bibliothèque est consultée, alors aucun contenu externe n'apparaît.

## Tests attendus

- Tests unitaires : validation des statuts et filtres.
- Tests d'intégration : recherche, pagination, RBAC, tags.
- Tests E2E : filtrer, ouvrir, modifier, archiver.

## Questions ouvertes

- Faut-il versionner chaque modification de contenu ou seulement les changements majeurs ?
- Les catégories doivent-elles être hiérarchiques ou plates ?
