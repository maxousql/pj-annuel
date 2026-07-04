# Historique et anti-doublon

## Objectif

Centraliser les idées et contenus sauvegardés, permettre leur consultation et signaler les sujets trop similaires dans une première version simple.

## Priorité

- Niveau : Must
- Justification : l'historique structure le travail éditorial et l'anti-doublon répond à un besoin explicite du cahier des charges.

## Phase

- MVP

## Dépendances

- Specs prérequises : [Base de données](../00-socle-prerequis/02-base-de-donnees.md), [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md).
- Contrats partagés : `ContentIdea`, `ContentItem`, organisation active.

## Périmètre

- Afficher un historique des idées et contenus sauvegardés.
- Rechercher simplement dans l'historique.
- Ouvrir le détail d'un élément.
- Comparer une nouvelle idée ou un nouveau contenu avec l'existant.
- Afficher une alerte non bloquante en cas de similarité.

## Hors périmètre

- Recherche sémantique par embeddings.
- Bibliothèque avancée avec tags complets.
- Analytics éditoriaux détaillés.
- Fusion automatique de doublons.

## Acteurs

- Éditeur : consulte et réutilise les éléments.
- Administrateur : consulte toute l'organisation.
- Lecteur : consulte selon ses droits.
- Système : compare les nouveaux éléments avec l'existant.

## Parcours / comportement attendu

1. L'utilisateur ouvre l'historique.
2. Il filtre ou recherche par titre, thématique, format ou statut.
3. Il ouvre une idée ou un contenu.
4. Lors d'une génération, le système compare le résultat avec l'historique.
5. L'utilisateur choisit de continuer malgré l'alerte ou de modifier sa demande.

## Règles fonctionnelles

- Tous les contenus sauvegardés apparaissent dans l'historique.
- Les idées sauvegardées apparaissent aussi dans l'historique ou dans un onglet dédié.
- La recherche MVP porte sur titre, thématique, format et mots-clés simples.
- L'anti-doublon compare titre, thématiques et mots significatifs.
- Un doublon potentiel ne bloque pas la sauvegarde.

## Règles techniques

- La comparaison MVP utilise normalisation texte, tokenisation simple et score configurable.
- Les comparaisons sont limitées à l'organisation active.
- Le seuil d'alerte doit être paramétrable.
- Les listes doivent être paginées.
- Les requêtes doivent rester performantes sur un volume raisonnable de MVP.

## Données et modèle

- `ContentIdea` : titre, angle, thématique, format recommandé.
- `ContentItem` : titre, corps, format, thématique, statut.
- `DuplicateCheck` optionnel : source, cible, score, date.
- Champs calculés possibles : `normalizedTitle`, `keywords`.

## Contrats d'interface

- Pages : `/app/:organizationSlug/history`, `/app/:organizationSlug/history/:type/:id`.
- Actions/API : `listHistory`, `searchHistory`, `checkDuplicate`, `getHistoryItem`.
- Consommateurs : génération d'idées, génération de contenus.

## Critères d'acceptation

- Étant donné un historique vide, quand l'utilisateur ouvre la page, alors un état vide utile est affiché.
- Étant donné des idées et contenus sauvegardés, quand l'utilisateur recherche un terme, alors les résultats pertinents sont affichés.
- Étant donné une nouvelle idée proche d'une ancienne, quand l'anti-doublon s'exécute, alors une alerte affiche l'élément similaire.
- Étant donné deux organisations, quand une comparaison est lancée, alors seules les données de l'organisation active sont utilisées.

## Tests attendus

- Tests unitaires : normalisation texte, score de similarité, seuil.
- Tests d'intégration : listing, recherche, isolation organisation.
- Tests E2E : historique vide, historique rempli, alerte doublon.

## Questions ouvertes

- L'historique doit-il afficher idées et contenus dans une timeline unique ou dans deux onglets ?
- Quel seuil de similarité doit déclencher l'alerte par défaut ?
