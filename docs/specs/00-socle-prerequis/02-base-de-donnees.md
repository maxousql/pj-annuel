# Base de données

## Objectif

Mettre en place une base relationnelle PostgreSQL hébergée sur Supabase permettant de stocker utilisateurs, organisations, contextes éditoriaux, idées, contenus, ressources, planifications et intégrations.

## Priorité

- Niveau : Must
- Justification : la plateforme SaaS repose sur la persistance, l'historique éditorial et l'isolation des données par organisation.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : [Architecture Next.js + NestJS](00-architecture-nextjs-nestjs.md), [Outillage et environnement](01-outillage-environnement.md).
- Contrats partagés : accès données NestJS, migrations, isolation par organisation.

## Périmètre

- Configurer l'accès au PostgreSQL Supabase du projet `bompwwdnqtexdqrjoyqy` et l'ORM choisi côté backend NestJS.
- Créer les migrations initiales.
- Définir les entités communes du SaaS.
- Préparer les contraintes d'unicité, index et relations.
- Définir la règle d'isolation multi-organisation.

## Hors périmètre

- Optimisation avancée de recherche sémantique.
- Data warehouse ou analytics produit avancés.
- Synchronisation externe avec Notion.

## Acteurs

- Système : lit et écrit les données applicatives.
- Développeurs : ajoutent des modèles sans casser les contrats existants.
- Administrateur : possède les données de son organisation.

## Parcours / comportement attendu

1. Une migration initialise les tables communes.
2. Une organisation est créée avec son propriétaire.
3. Les features ajoutent ou consomment des données en utilisant `organizationId`.
4. Les requêtes ne retournent jamais des données d'une autre organisation.

## Règles fonctionnelles

- Toutes les données métier doivent être rattachées à une organisation.
- Un utilisateur peut appartenir à plusieurs organisations.
- Les contenus, idées, ressources et planifications doivent conserver leurs dates de création et modification.
- Les suppressions destructives doivent être limitées ; privilégier les statuts ou suppressions logiques quand utile.

## Règles techniques

- PostgreSQL Supabase est la base cible.
- Les migrations sont versionnées et rejouables.
- Les identifiants sont stables et non devinables.
- Les requêtes métier doivent filtrer par organisation active côté backend NestJS.
- Les champs fréquemment filtrés doivent être indexés : `organizationId`, `status`, `createdAt`, `publicationDate`, `type`.
- Les enums métier doivent être centralisés.

## Données et modèle

- `User` : email, nom, avatar, préférences.
- `AuthAccount` : fournisseur, identifiant fournisseur, user lié.
- `Organization` : nom, slug, propriétaire, dates.
- `Membership` : user, organization, rôle, statut.
- `Invitation` : email, organization, rôle, token, expiration, statut.
- `EditorialContext` : organization, secteur, cible, ton, positionnement, thématiques.
- `ContentIdea` : organization, titre, angle, format recommandé, justification, catégorie, statut.
- `ContentItem` : organization, titre, corps, format, statut, source, dates.
- `Tag` et `ContentTag` : classification par organisation.
- `CuratedResource` : URL, titre, résumé, source, thématique.
- `PublicationPlan` : content, canal, date, statut.
- `IntegrationCredential` : organization, provider, métadonnées chiffrées.
- `AiGenerationLog` : organization, type, prompt metadata, modèle, coût estimé, résultat lié.

## Contrats d'interface

- Modules NestJS de lecture/écriture par entité.
- Fonction commune de résolution de l'organisation active.
- Migrations initiales et seed de démonstration.

## Critères d'acceptation

- Étant donné deux organisations, quand chacune crée des contenus, alors aucune requête standard ne mélange leurs données.
- Étant donné une migration vierge, quand elle est appliquée, alors toutes les tables communes sont créées.
- Étant donné un contenu supprimé logiquement, quand l'historique est consulté, alors le comportement respecte le statut prévu.

## Tests attendus

- Tests unitaires : mapping enums et validation des statuts.
- Tests d'intégration : création user, organisation, membership, contenu.
- Tests d'intégration sécurité : requêtes filtrées par organisation.

## Questions ouvertes

- Faut-il chiffrer certains champs métier en plus des tokens d'intégration ?
- La recherche plein texte doit-elle être disponible dès le MVP ou seulement en V1 ?
