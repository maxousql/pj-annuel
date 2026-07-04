# Contexte éditorial

## Objectif

Permettre à une organisation de définir les informations marketing utilisées par l'IA pour personnaliser les idées et contenus.

## Priorité

- Niveau : Must
- Justification : sans contexte éditorial, les générations risquent d'être génériques et peu différenciantes.

## Phase

- MVP

## Dépendances

- Specs prérequises : [Base de données](../00-socle-prerequis/02-base-de-donnees.md), [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md), [Infrastructure IA](../00-socle-prerequis/06-infrastructure-ia.md).
- Contrats partagés : `EditorialContext`, organisation active, permissions éditeur/admin.

## Périmètre

- Créer, consulter et modifier le contexte éditorial principal d'une organisation.
- Gérer secteur, cible, ton, positionnement, thématiques et ressources textuelles simples.
- Exposer un résumé structuré consommable par les prompts IA.

## Hors périmètre

- Import de documents.
- Gestion multi-contextes par client.
- Analyse automatique de ressources externes.
- Profil de ton de marque avancé.

## Acteurs

- Administrateur : configure le contexte.
- Éditeur : modifie le contexte si autorisé.
- Lecteur : consulte le contexte si utile.
- Système IA : consomme le résumé de contexte.

## Parcours / comportement attendu

1. L'utilisateur ouvre les paramètres de contexte éditorial.
2. Il renseigne secteur, cible, ton, thématiques et positionnement.
3. Le système sauvegarde le contexte pour l'organisation active.
4. Les générations suivantes utilisent la dernière version sauvegardée.

## Règles fonctionnelles

- Une organisation dispose d'un contexte éditorial principal dans le MVP.
- Les thématiques peuvent être multiples.
- Le ton peut être choisi dans une liste ou saisi librement.
- Le contexte est modifiable après l'onboarding.
- Les générations doivent utiliser la dernière version persistée.

## Règles techniques

- Les champs texte doivent avoir des limites de longueur.
- Les thématiques doivent être normalisées avant injection dans les prompts.
- Les modifications doivent mettre à jour `updatedAt`.
- Les accès écriture sont réservés aux administrateurs et éditeurs.
- Le résumé IA ne doit pas inclure de champ vide inutile.

## Données et modèle

- `EditorialContext` : `organizationId`, `industry`, `targetAudience`, `tone`, `positioning`, `topics`, `notes`, `generationPreferences`.
- `topics` : liste normalisée de chaînes ou entité dédiée selon choix DB.

## Contrats d'interface

- Pages : `/app/:organizationSlug/settings/editorial-context`.
- Actions/API : `getEditorialContext`, `upsertEditorialContext`, `getEditorialContextSummary`.
- Consommateur : service IA du socle.

## Critères d'acceptation

- Étant donné une organisation sans contexte, quand un éditeur remplit le formulaire, alors le contexte est créé.
- Étant donné un contexte existant, quand il est modifié, alors les nouvelles valeurs sont utilisées par la génération suivante.
- Étant donné un lecteur, quand il tente de modifier le contexte, alors l'action est refusée.
- Étant donné deux organisations, quand chacune configure son contexte, alors les données restent isolées.

## Tests attendus

- Tests unitaires : validation des champs et résumé de contexte.
- Tests d'intégration : création, modification, isolation organisation.
- Tests E2E : configuration depuis onboarding et depuis paramètres.

## Questions ouvertes

- Les thématiques doivent-elles être stockées comme simples champs JSON ou comme table dédiée dès le MVP ?
- Faut-il autoriser plusieurs contextes éditoriaux par organisation en V1 ?
