# Génération d'idées

## Objectif

Générer des idées de contenus marketing pertinentes à partir du contexte éditorial et les sauvegarder pour alimenter la production.

## Priorité

- Niveau : Must
- Justification : la génération d'idées est la priorité stratégique numéro 1 du cahier des charges.

## Phase

- MVP

## Dépendances

- Specs prérequises : [Contexte éditorial](02-contexte-editorial.md), [Infrastructure IA](../00-socle-prerequis/06-infrastructure-ia.md), [Historique et anti-doublon](05-historique-anti-doublon.md).
- Contrats partagés : `ContentIdea`, service IA, organisation active.

## Périmètre

- Générer une liste d'idées.
- Afficher titre, angle éditorial, format recommandé, justification et thématique.
- Permettre la sauvegarde d'une ou plusieurs idées.
- Signaler les idées proches de l'historique.

## Hors périmètre

- Scoring SEO.
- Curation externe.
- Recherche sémantique avancée.
- Planification automatique des idées.

## Acteurs

- Éditeur : génère et sauvegarde des idées.
- Administrateur : peut aussi générer des idées.
- Lecteur : consulte les idées sauvegardées si la page est accessible.
- Système IA : produit les suggestions structurées.

## Parcours / comportement attendu

1. L'utilisateur ouvre la page de génération d'idées.
2. Il choisit éventuellement une thématique ou saisit un brief court.
3. Le système génère plusieurs idées structurées.
4. L'utilisateur sauvegarde les idées utiles.
5. Les idées sauvegardées deviennent disponibles dans l'historique et la génération de contenus.

## Règles fonctionnelles

- La génération utilise le contexte éditorial courant.
- Une idée générée contient au minimum : titre, angle, format recommandé, justification, thématique.
- Une idée peut être sauvegardée, ignorée ou régénérée via une nouvelle demande.
- Le système alerte si une idée ressemble fortement à une idée ou un contenu existant.
- Un échec IA ne doit pas supprimer le brief saisi par l'utilisateur.

## Règles techniques

- Les appels passent par le service IA commun.
- La réponse IA doit être validée avant affichage et persistance.
- Les prompts sont centralisés et identifiés par version.
- Les générations sont journalisées dans `AiGenerationLog`.
- Les sauvegardes sont filtrées par rôle et organisation.

## Données et modèle

- `ContentIdea` : `organizationId`, `title`, `angle`, `recommendedFormat`, `justification`, `topic`, `status`, `duplicateScore`, `createdById`.
- Statuts initiaux : `DRAFT`, `SAVED`, `USED`, `ARCHIVED`.
- Source de génération : thématique, brief, contexte.

## Contrats d'interface

- Pages : `/app/:organizationSlug/ideas`, `/app/:organizationSlug/ideas/generate`.
- Actions/API : `generateIdeas`, `saveIdea`, `listIdeas`, `updateIdeaStatus`, `checkDuplicate`.
- Sortie IA attendue : tableau d'idées structurées.

## Critères d'acceptation

- Étant donné un contexte éditorial complet, quand l'utilisateur génère des idées, alors plusieurs suggestions structurées sont affichées.
- Étant donné une idée affichée, quand l'utilisateur la sauvegarde, alors elle apparaît dans l'historique.
- Étant donné une idée proche d'un contenu existant, quand elle est générée, alors une alerte non bloquante est affichée.
- Étant donné un lecteur, quand il tente de générer une idée, alors l'action est refusée.

## Tests attendus

- Tests unitaires : validation de sortie IA, calcul simple de similarité.
- Tests d'intégration : génération IA mockée, sauvegarde, permissions.
- Tests E2E : générer des idées, sauvegarder une idée, voir l'historique.

## Questions ouvertes

- Combien d'idées générer par défaut : 3, 5 ou 10 ?
- Quels formats doivent être proposés par défaut dans le MVP ?
