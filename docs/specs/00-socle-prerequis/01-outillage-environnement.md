# Outillage et environnement

## Objectif

Définir les outils, scripts et conventions nécessaires pour développer, tester et livrer le projet de manière reproductible.

## Priorité

- Niveau : Must
- Justification : l'équipe dispose d'un budget et d'un délai limités ; l'environnement doit réduire les frictions dès le départ.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : [Architecture Next.js + NestJS](00-architecture-nextjs-nestjs.md).
- Contrats partagés : variables d'environnement, scripts de qualité, stratégie de tests.

## Périmètre

- Définir les scripts de développement, build, lint, format, test et migration.
- Documenter les variables d'environnement obligatoires.
- Préparer la configuration de la base PostgreSQL hébergée sur Supabase.
- Mettre en place les règles de qualité automatisées.
- Préparer les fixtures et données de seed utiles aux démonstrations.

## Hors périmètre

- Installer les services cloud de production.
- Implémenter les features métier.
- Mettre en place une observabilité avancée.

## Acteurs

- Développeurs : lancent et testent le projet localement.
- Jury : teste une version déployée et stable.
- Système CI : vérifie la qualité avant livraison.

## Parcours / comportement attendu

1. Un développeur copie `.env.example` vers `.env.local`.
2. Il renseigne les variables Supabase du projet `bompwwdnqtexdqrjoyqy`.
3. Il exécute les migrations et les seeds.
4. Il lance les tests, le frontend Next.js et le backend NestJS.

## Règles fonctionnelles

- Le frontend Next.js et le backend NestJS doivent être exécutables localement avec une procédure documentée.
- Les variables manquantes doivent provoquer une erreur claire au démarrage.
- Les données de démonstration doivent permettre de tester le MVP rapidement.
- Les scripts doivent être homogènes pour toute l'équipe et distinguer clairement web, API et commandes globales.

## Règles techniques

- Les secrets réels restent exclus du git.
- `.env.example` doit lister toutes les variables nécessaires sans valeur sensible.
- Les scripts doivent échouer avec un code non nul en cas d'erreur.
- Les migrations doivent être versionnées.
- Les tests doivent pouvoir tourner sans service externe payant.

## Données et modèle

- Variables minimales : `SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `OPENAI_API_KEY` ou clé Gemini, URL frontend, URL backend, secrets d'authentification, identifiants OAuth Google, identifiants Notion.
- Données de seed : utilisateur de démonstration, organisation de démonstration, contexte éditorial, quelques idées et contenus.

## Contrats d'interface

- Scripts attendus : `dev`, `dev:web`, `dev:api`, `build`, `build:web`, `build:api`, `start`, `lint`, `format`, `test`, `test:e2e`, `db:migrate`, `db:seed`.
- Fichiers attendus : `.env.example`, documentation de setup, configuration lint/format/test.

## Critères d'acceptation

- Étant donné un poste vierge, quand la procédure de setup est suivie, alors le frontend et le backend démarrent localement.
- Étant donné une variable obligatoire absente, quand le serveur démarre, alors une erreur explicite indique la variable manquante.
- Étant donné une pull request, quand la CI s'exécute, alors lint, typage et tests bloquent les régressions.

## Tests attendus

- Tests unitaires : validation du schéma d'environnement.
- Tests d'intégration : connexion à la base locale de test.
- Tests E2E : démarrage app + parcours de smoke test.

## Questions ouvertes

- Quel package manager doit être standardisé pour l'équipe ?
- L'accès MCP au projet Supabase `bompwwdnqtexdqrjoyqy` doit-il être configuré par chaque développeur ou centralisé via un compte d'équipe ?
