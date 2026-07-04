# Amélioration de la génération IA

## Objectif

Améliorer la qualité, la personnalisation et la fiabilité des générations IA après validation du coeur MVP.

## Priorité

- Niveau : Could
- Justification : l'amélioration IA augmente la valeur produit mais dépend des premiers retours d'usage.

## Phase

- V2

## Dépendances

- Specs prérequises : [Infrastructure IA](../00-socle-prerequis/06-infrastructure-ia.md), [Contexte éditorial](../10-features-mvp/02-contexte-editorial.md), [Historique et anti-doublon](../10-features-mvp/05-historique-anti-doublon.md).
- Contrats partagés : prompts versionnés, logs IA, similarité.

## Périmètre

- Versionner les prompts par cas d'usage.
- Affiner le ton de marque.
- Ajouter une génération multilingue si priorisée.
- Améliorer l'anti-doublon par stratégie sémantique.
- Suivre la qualité des sorties par format.

## Hors périmètre

- Entraînement de modèle propriétaire.
- Génération image ou vidéo.
- Garantie SEO automatique.
- A/B testing avancé de prompts.

## Acteurs

- Éditeur : génère avec plus de contrôle.
- Administrateur : configure le ton et les préférences.
- Système IA : applique prompts, langue, format et anti-doublon.

## Parcours / comportement attendu

1. L'utilisateur choisit un format, une langue et un niveau de ton.
2. Le système sélectionne la version de prompt adaptée.
3. Le contenu généré respecte la structure attendue.
4. Le système signale les similarités fortes avec l'historique.
5. Les logs permettent de savoir quel prompt a été utilisé.

## Règles fonctionnelles

- La langue de génération doit être explicite.
- Le ton de marque doit pouvoir affiner les prompts.
- Chaque sortie respecte le format choisi.
- Une alerte de similarité forte reste non bloquante par défaut.
- Le prompt actif doit être traçable par version.

## Règles techniques

- Les templates de prompts sont versionnés.
- Le provider IA reste interchangeable.
- Les embeddings ou une stratégie sémantique peuvent être activés sans casser le contrat MVP.
- Les logs ne doivent pas stocker de secrets.
- Les évaluations qualité doivent être stockées séparément des contenus utilisateur.

## Données et modèle

- `PromptTemplate` : type, version, langue, contenu, statut.
- `BrandVoiceProfile` : organisation, règles de ton, exemples, interdits.
- `GenerationSettings` : langue, niveau de créativité, longueur cible.
- `SimilarityCheck` : source, cible, score, méthode.

## Contrats d'interface

- Actions/API : `generateWithSettings`, `checkSemanticSimilarity`, `listPromptVersions`, `updateBrandVoiceProfile`.
- Événements : `ai.generation.completed`, `ai.similarity.detected`.
- Consommateurs : génération d'idées, génération de contenus, curation.

## Critères d'acceptation

- Étant donné une langue choisie, quand un contenu est généré, alors la sortie respecte cette langue.
- Étant donné un profil de ton, quand la génération s'exécute, alors les consignes sont injectées dans le prompt.
- Étant donné une similarité forte, quand le contenu est généré, alors une alerte affiche les éléments proches.
- Étant donné un changement de provider, quand le contrat IA est respecté, alors les features consommatrices ne changent pas.

## Tests attendus

- Tests unitaires : sélection de prompt, validation settings, score similarité.
- Tests d'intégration : génération mockée par langue, logs versionnés.
- Tests de non-régression : structure de sortie par format.

## Questions ouvertes

- Quelles langues doivent être supportées en priorité ?
- Quel seuil de similarité doit devenir bloquant, si un blocage est souhaité ?
