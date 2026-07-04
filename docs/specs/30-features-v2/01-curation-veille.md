# Curation et veille

## Objectif

Collecter, organiser et résumer des ressources externes pour enrichir les idées et contenus générés par l'IA.

## Priorité

- Niveau : Could
- Justification : la curation améliore la qualité éditoriale mais peut être livrée après le coeur MVP/V1.

## Phase

- V2

## Dépendances

- Specs prérequises : [Base de données](../00-socle-prerequis/02-base-de-donnees.md), [Infrastructure IA](../00-socle-prerequis/06-infrastructure-ia.md), [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md).
- Contrats partagés : `CuratedResource`, service IA de résumé, organisation active.

## Périmètre

- Ajouter une URL utile.
- Importer des contenus depuis un flux RSS.
- Extraire métadonnées et contenu exploitable.
- Générer un résumé IA.
- Relier une ressource à une thématique.
- Utiliser une ressource comme inspiration pour générer un contenu.

## Hors périmètre

- Crawling massif.
- Scraping de contenus protégés ou non autorisés.
- Veille concurrentielle avancée.
- Publication automatique.

## Acteurs

- Éditeur : ajoute et exploite les ressources.
- Administrateur : configure les sources.
- Lecteur : consulte la veille.
- Système : importe, résume et classe.

## Parcours / comportement attendu

1. L'utilisateur ajoute une URL ou un flux RSS.
2. Le système récupère les métadonnées et détecte les doublons.
3. L'utilisateur ou le système lance un résumé IA.
4. La ressource est associée à une thématique.
5. Une génération de contenu peut utiliser cette ressource comme entrée.

## Règles fonctionnelles

- Une ressource appartient à une organisation.
- Une URL déjà présente dans l'organisation est signalée.
- Une ressource peut être reliée à une ou plusieurs thématiques.
- Le résumé doit conserver un lien clair vers la source.
- Les lecteurs ne peuvent pas ajouter ou modifier des ressources.

## Règles techniques

- L'import RSS doit être exécutable par job planifié.
- L'extraction URL doit avoir timeout, limite de taille et gestion d'erreurs.
- Le résumé IA est stocké séparément du contenu source.
- Les erreurs d'accès, format et quota doivent être journalisées.
- La conformité d'usage des contenus externes doit être prise en compte.

## Données et modèle

- `SourceFeed` : `organizationId`, `url`, `title`, `status`, `lastFetchedAt`.
- `CuratedResource` : `organizationId`, `url`, `title`, `description`, `sourceName`, `publishedAt`, `topic`.
- `ResourceSummary` : `resourceId`, `summary`, `keyPoints`, `generatedAt`.
- `ResourceTag` : relation ressource/tag.

## Contrats d'interface

- Pages : `/app/:organizationSlug/curation`, `/app/:organizationSlug/curation/:resourceId`.
- Actions/API : `addResourceUrl`, `addRssFeed`, `listCuratedResources`, `summarizeResource`, `useResourceForGeneration`.
- Job : `importRssFeeds`.

## Critères d'acceptation

- Étant donné une URL valide, quand elle est ajoutée, alors une ressource est créée avec ses métadonnées.
- Étant donné un flux RSS valide, quand l'import s'exécute, alors plusieurs ressources sont créées sans doublons.
- Étant donné une ressource, quand le résumé est généré, alors il est sauvegardé et relié à la source.
- Étant donné un lecteur, quand il tente d'ajouter une URL, alors l'action est refusée.

## Tests attendus

- Tests unitaires : parsing RSS, détection doublon URL, validation URL.
- Tests d'intégration : extraction mockée, résumé IA mocké, permissions.
- Tests E2E : ajouter URL, résumer, utiliser comme inspiration.

## Questions ouvertes

- Quels types de contenus externes sont autorisés juridiquement dans le cadre du projet ?
- La fréquence d'import RSS doit-elle être configurable par flux ?
