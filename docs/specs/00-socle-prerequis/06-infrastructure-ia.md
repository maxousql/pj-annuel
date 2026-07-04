# Infrastructure IA

## Objectif

Préparer une couche commune de génération IA utilisée par les idées, les contenus, les résumés de curation et les futures améliorations de prompts.

## Priorité

- Niveau : Must
- Justification : la génération IA est le coeur de valeur du produit et doit être mutualisée pour éviter des prompts dispersés.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : [Base de données](02-base-de-donnees.md), [Organisations et RBAC](04-organisations-rbac.md).
- Contrats partagés : contexte éditorial, journal de génération, fournisseur IA.

## Périmètre

- Définir un service NestJS unique pour appeler le fournisseur IA.
- Préparer les templates de prompts par cas d'usage.
- Injecter le contexte éditorial dans les générations.
- Journaliser les générations utiles au diagnostic et à l'anti-doublon.
- Gérer les erreurs, timeouts et réponses invalides.

## Hors périmètre

- Fine-tuning.
- Entraînement de modèle propriétaire.
- Optimisation sémantique avancée par embeddings pour le MVP.
- Génération d'images.

## Acteurs

- Utilisateur : demande une génération d'idée, contenu ou résumé.
- Système : construit le prompt, appelle le fournisseur, valide la réponse.
- Administrateur : configure le contexte utilisé indirectement par l'IA.

## Parcours / comportement attendu

1. Une feature appelle le service IA avec un type de génération et des entrées validées.
2. Le service enrichit la demande avec le contexte éditorial de l'organisation.
3. Le fournisseur IA retourne une réponse structurée.
4. Le système valide et journalise le résultat avant de le transmettre à la feature.

## Règles fonctionnelles

- Les générations doivent tenir compte du secteur, de la cible, du ton et des thématiques quand ils existent.
- Les réponses doivent être structurées selon le format attendu par la feature appelante.
- Les erreurs IA doivent être compréhensibles et ne pas bloquer l'application entière.
- Les générations doivent pouvoir être reliées à une idée, un contenu ou une ressource.

## Règles techniques

- La clé IA reste côté backend NestJS.
- Les prompts doivent être versionnés ou identifiables.
- Les sorties IA doivent être validées avant persistance.
- Les appels doivent prévoir timeout, retry limité et gestion du quota.
- Les logs ne doivent pas stocker de secret.
- Le fournisseur doit être encapsulé pour pouvoir être remplacé.

## Données et modèle

- `AiGenerationLog` : `organizationId`, `userId`, `type`, `promptVersion`, `inputHash`, `model`, `status`, `errorCode`, `resultId`, `createdAt`.
- Types de génération initiaux : `CONTENT_IDEA`, `CONTENT_DRAFT`, `RESOURCE_SUMMARY`.
- Entrées communes : contexte éditorial, format cible, brief utilisateur, historique pertinent.

## Contrats d'interface

- Service NestJS : `ContentGenerationService` avec méthodes `generateContentIdeas`, `generateMarketingContent`, `summarizeResource`.
- Sorties structurées : JSON validé par schéma.
- Erreurs standard : `AI_TIMEOUT`, `AI_INVALID_OUTPUT`, `AI_PROVIDER_ERROR`, `AI_QUOTA_EXCEEDED`.

## Critères d'acceptation

- Étant donné un contexte éditorial complet, quand une feature appelle l'IA, alors le prompt inclut les éléments de contexte.
- Étant donné une réponse IA invalide, quand elle est reçue, alors elle n'est pas persistée et une erreur exploitable est retournée.
- Étant donné une génération réussie, quand elle est terminée, alors un log de génération est créé.

## Tests attendus

- Tests unitaires : construction de prompt et validation de sortie.
- Tests d'intégration : appel fournisseur mocké et journalisation.
- Tests E2E : génération mockée dans un parcours utilisateur.

## Questions ouvertes

- Quel modèle IA doit être utilisé en priorité pour le MVP ?
- Faut-il afficher le coût estimé des générations aux administrateurs ?
