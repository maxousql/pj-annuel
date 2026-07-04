# Dashboard

## Objectif

Donner une vision rapide de l'activité éditoriale et guider l'utilisateur vers les prochaines actions utiles.

## Priorité

- Niveau : Must
- Justification : le dashboard est nécessaire pour démontrer l'état de la production éditoriale dans le MVP.

## Phase

- MVP

## Dépendances

- Specs prérequises : [Shell applicatif et navigation](../00-socle-prerequis/05-shell-app-navigation.md), [Génération d'idées](03-generation-idees.md), [Génération de contenus](04-generation-contenus.md), [Historique et anti-doublon](05-historique-anti-doublon.md).
- Contrats partagés : agrégats d'idées, contenus, statuts et dernières activités.

## Périmètre

- Afficher les compteurs principaux.
- Afficher les derniers contenus et idées.
- Afficher les brouillons et contenus à relire si disponibles.
- Afficher les thématiques les plus utilisées.
- Proposer des actions rapides vers génération d'idées et génération de contenus.

## Hors périmètre

- Analytics marketing avancées.
- Vue calendrier complète.
- Synchronisation Notion.
- Recommandations automatisées avancées.

## Acteurs

- Administrateur : suit l'activité globale de l'organisation.
- Éditeur : reprend les travaux récents.
- Lecteur : consulte l'état éditorial.

## Parcours / comportement attendu

1. Après onboarding ou connexion, l'utilisateur arrive sur le dashboard.
2. Il voit les indicateurs clés de son organisation.
3. Il accède aux derniers éléments générés.
4. Il lance rapidement une nouvelle idée ou un nouveau contenu.

## Règles fonctionnelles

- Le dashboard doit fonctionner avec un historique vide.
- Les compteurs sont limités à l'organisation active.
- Les dernières idées et contenus affichent titre, type, statut et date.
- Les actions rapides respectent le rôle utilisateur.
- Les données indisponibles sont remplacées par des états vides utiles.

## Règles techniques

- Les agrégations sont calculées côté serveur.
- Les blocs doivent pouvoir charger ou échouer indépendamment si possible.
- Les requêtes doivent être limitées aux données nécessaires.
- L'interface doit être responsive.
- Les compteurs ne doivent pas exposer de données d'autres organisations.

## Données et modèle

- Agrégats : `ideasCount`, `contentsCount`, `draftsCount`, `toReviewCount`, `topTopics`, `latestItems`.
- Sources : `ContentIdea`, `ContentItem`, `EditorialContext`, `AiGenerationLog`.

## Contrats d'interface

- Page : `/app/:organizationSlug/dashboard`.
- Actions/API : `getDashboardSummary`, `getLatestEditorialItems`, `getTopTopics`.
- Composants : cartes de compteur, liste d'activité récente, actions rapides.

## Critères d'acceptation

- Étant donné une organisation vide, quand le dashboard s'affiche, alors les compteurs sont à zéro et les actions rapides sont visibles.
- Étant donné des contenus sauvegardés, quand le dashboard s'affiche, alors les compteurs correspondent aux données.
- Étant donné un lecteur, quand le dashboard s'affiche, alors les actions d'édition ne sont pas proposées.
- Étant donné un mobile, quand le dashboard s'affiche, alors les informations restent lisibles.

## Tests attendus

- Tests unitaires : calcul des agrégats.
- Tests d'intégration : isolation organisation et rôles.
- Tests E2E : dashboard vide, dashboard avec données, actions rapides.

## Questions ouvertes

- Le dashboard doit-il être la page d'accueil systématique après connexion ?
- Faut-il afficher les prochaines publications dès le MVP ou seulement après la V1 calendrier ?
