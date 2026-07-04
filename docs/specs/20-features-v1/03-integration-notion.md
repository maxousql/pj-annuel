# Intégration Notion

## Objectif

Permettre à une organisation de synchroniser ses contenus, ressources et dates éditoriales avec une base Notion.

## Priorité

- Niveau : Should
- Justification : Notion est explicitement attendu par le cahier des charges et renforce l'usage professionnel du SaaS.

## Phase

- V1

## Dépendances

- Specs prérequises : [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md), [Déploiement, CI et observabilité](../00-socle-prerequis/07-deploiement-ci-observabilite.md), [Planification éditoriale](02-planification-editoriale.md).
- Contrats partagés : stockage sécurisé des tokens, contenus exportables, planifications.

## Périmètre

- Connecter une organisation à Notion.
- Sélectionner une base de données Notion.
- Mapper les propriétés nécessaires.
- Exporter des contenus et ressources.
- Synchroniser statuts et dates de publication.
- Journaliser les erreurs et derniers états.

## Hors périmètre

- Édition complète d'une page Notion depuis l'application.
- Multi-workspaces Notion avancé.
- Résolution automatique complexe des conflits.
- Publication automatique externe.

## Acteurs

- Administrateur : configure l'intégration.
- Éditeur : exporte ou synchronise si l'intégration est active.
- Système : appelle l'API Notion et journalise les résultats.

## Parcours / comportement attendu

1. Un administrateur ouvre les paramètres d'intégration.
2. Il connecte Notion et choisit une base cible.
3. Il mappe les champs titre, statut, date, canal et URL.
4. Un éditeur exporte un contenu ou déclenche une synchronisation.
5. Les changements de statut/date sont reflétés selon la règle de sync retenue.

## Règles fonctionnelles

- La connexion Notion est liée à une organisation.
- Seuls les administrateurs configurent ou déconnectent Notion.
- Les champs minimum synchronisés sont titre, statut, date, canal, type, URL source.
- Une erreur Notion doit être visible sans bloquer les autres contenus.
- La synchronisation bidirectionnelle doit protéger contre les conflits non résolus.

## Règles techniques

- Les tokens Notion sont chiffrés au repos.
- L'adapter Notion est isolé du domaine métier.
- Les appels API doivent gérer rate limit, expiration d'autorisation et erreurs réseau.
- Les synchronisations longues doivent pouvoir être exécutées en tâche asynchrone.
- Les logs ne doivent pas exposer les tokens.

## Données et modèle

- `IntegrationCredential` : `organizationId`, `provider`, token chiffré, statut.
- `NotionDatabaseMapping` : base ID, propriétés mappées, organisation.
- `NotionSyncState` : local entity, notion page ID, dernier hash, dernière date de sync.
- `NotionSyncLog` : statut, erreur, durée, nombre d'éléments.

## Contrats d'interface

- Pages : `/app/:organizationSlug/settings/integrations/notion`.
- Actions/API : `connectNotion`, `disconnectNotion`, `listNotionDatabases`, `saveNotionMapping`, `syncNotion`, `exportContentToNotion`.
- Événement interne : `notion.sync.completed`.

## Critères d'acceptation

- Étant donné une organisation, quand un administrateur connecte Notion, alors la connexion est persistée de manière sécurisée.
- Étant donné une base mappée, quand un contenu est exporté, alors une page Notion est créée ou mise à jour.
- Étant donné une modification de statut dans Notion, quand la synchronisation bidirectionnelle s'exécute, alors le statut local est mis à jour selon la règle définie.
- Étant donné une erreur API, quand elle survient, alors elle est journalisée et affichée clairement.

## Tests attendus

- Tests unitaires : mapping propriétés, résolution de conflit simple.
- Tests d'intégration : adapter Notion mocké, stockage token chiffré, logs.
- Tests E2E : connecter mock, mapper, exporter, synchroniser.

## Questions ouvertes

- La synchronisation bidirectionnelle doit-elle être automatique ou uniquement manuelle en V1 ?
- En cas de conflit, la source prioritaire est-elle l'application ou Notion ?
