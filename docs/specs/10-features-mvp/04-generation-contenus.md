# Génération de contenus

## Objectif

Générer un contenu marketing exploitable à partir d'une idée, d'un brief utilisateur ou du contexte éditorial.

## Priorité

- Niveau : Must
- Justification : la génération de contenus est la deuxième priorité stratégique et matérialise la valeur du SaaS.

## Phase

- MVP

## Dépendances

- Specs prérequises : [Contexte éditorial](02-contexte-editorial.md), [Génération d'idées](03-generation-idees.md), [Infrastructure IA](../00-socle-prerequis/06-infrastructure-ia.md), [Historique et anti-doublon](05-historique-anti-doublon.md).
- Contrats partagés : `ContentItem`, formats de contenu, service IA.

## Périmètre

- Générer un contenu depuis un brief libre.
- Générer un contenu depuis une idée sauvegardée.
- Supporter les formats MVP : article de blog, post LinkedIn, post court réseau social, email marketing, accroche marketing.
- Permettre l'édition simple avant sauvegarde.
- Sauvegarder le contenu dans l'historique.

## Hors périmètre

- Publication automatique.
- Éditeur riche collaboratif.
- Export Notion.
- Optimisation SEO avancée.

## Acteurs

- Éditeur : génère, édite et sauvegarde.
- Administrateur : mêmes droits que l'éditeur.
- Lecteur : consulte uniquement les contenus sauvegardés.
- Système IA : produit le brouillon.

## Parcours / comportement attendu

1. L'utilisateur choisit un format de contenu.
2. Il saisit un brief ou sélectionne une idée.
3. Le système génère un brouillon.
4. L'utilisateur modifie le texte si besoin.
5. Il sauvegarde le contenu avec un statut.

## Règles fonctionnelles

- Le contenu peut être généré sans idée existante via brief libre.
- Le format choisi influence la structure de sortie.
- Le contexte éditorial est injecté dans chaque génération.
- Un contenu sauvegardé conserve son format, son origine et son statut.
- Les doublons potentiels sont signalés avant ou au moment de la sauvegarde.

## Règles techniques

- Chaque format dispose d'un template de prompt dédié.
- Les sorties IA sont validées avant d'être proposées.
- Les contenus longs doivent avoir une limite de taille par format.
- Les brouillons non sauvegardés ne doivent pas polluer l'historique.
- Les erreurs IA doivent préserver le brief utilisateur côté interface.

## Données et modèle

- `ContentItem` : `organizationId`, `ideaId`, `title`, `body`, `format`, `brief`, `status`, `topic`, `sourceType`, `duplicateScore`, `createdById`.
- Formats : `BLOG_ARTICLE`, `LINKEDIN_POST`, `SHORT_SOCIAL_POST`, `MARKETING_EMAIL`, `MARKETING_HOOK`.
- Statuts MVP : `DRAFT`, `TO_REVIEW`, `ARCHIVED`.

## Contrats d'interface

- Pages : `/app/:organizationSlug/contents/generate`, `/app/:organizationSlug/contents/:contentId`.
- Actions/API : `generateContent`, `saveContent`, `updateContent`, `getContent`.
- Sortie IA attendue : titre, corps, format, suggestions optionnelles.

## Critères d'acceptation

- Étant donné un brief, quand l'utilisateur génère un post LinkedIn, alors un brouillon adapté au format est affiché.
- Étant donné une idée sauvegardée, quand l'utilisateur génère un contenu depuis cette idée, alors le contenu conserve le lien avec l'idée.
- Étant donné un brouillon modifié, quand l'utilisateur sauvegarde, alors la version sauvegardée apparaît dans l'historique.
- Étant donné une erreur IA, quand elle survient, alors le brief reste disponible.

## Tests attendus

- Tests unitaires : validation des formats, construction de prompt.
- Tests d'intégration : génération mockée, sauvegarde, modification.
- Tests E2E : brief -> génération -> édition -> historique.

## Questions ouvertes

- Faut-il sauvegarder automatiquement les brouillons générés ?
- Faut-il versionner les révisions de contenu dès le MVP ou attendre la V1 ?
