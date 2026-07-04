# Architecture Next.js + NestJS

## Objectif

Mettre en place l'architecture applicative commune avec un frontend Next.js, un backend NestJS, une base PostgreSQL et des intégrations externes encapsulées côté backend.

## Priorité

- Niveau : Must
- Justification : toutes les autres specs dépendent d'une base projet cohérente, typée et maintenable.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : aucune.
- Contrats partagés : séparation frontend/backend, conventions de modules NestJS, conventions de routage Next.js, contrat API, gestion des variables d'environnement.

## Périmètre

- Initialiser un frontend Next.js avec TypeScript.
- Initialiser un backend NestJS avec TypeScript.
- Structurer les routes publiques, les routes d'authentification et l'espace applicatif protégé côté frontend.
- Structurer l'API, les modules métier, les services, les guards et les providers côté backend.
- Définir le contrat de communication entre Next.js et NestJS.
- Préparer l'injection des services transverses côté backend : base de données, auth, IA, Notion.

## Hors périmètre

- Implémenter les fonctionnalités métier.
- Finaliser le design system complet.
- Choisir une stratégie avancée de microservices.

## Acteurs

- Frontend developer : développe les pages, composants et parcours dans Next.js.
- Backend developer : développe l'API, les règles métier, la base, l'IA et les intégrations dans NestJS.
- Lead developer / architecte : garantit la cohérence des contrats entre frontend et backend.
- Utilisateur final : accède à une application web responsive.
- Système : exécute le frontend Next.js, l'API NestJS, les jobs backend et les services externes.

## Parcours / comportement attendu

1. Un développeur clone le projet et installe les dépendances.
2. Il lance le frontend Next.js et le backend NestJS localement.
3. Le frontend consomme une route de santé exposée par le backend.
4. Il ajoute une feature dans un module ou dossier isolé sans modifier les fondations.
5. Les pages publiques, pages protégées et endpoints API sont clairement séparés.

## Règles fonctionnelles

- Le frontend Next.js porte l'interface SaaS, le dashboard, les formulaires et les vues responsive.
- Le backend NestJS porte l'API, la logique métier, l'accès base de données, les intégrations et les appels IA.
- L'application doit exposer une page d'accueil ou de redirection, des pages d'authentification et un espace SaaS protégé.
- L'espace protégé doit être organisé autour d'une organisation active.
- Les modules métier doivent pouvoir être développés indépendamment après le socle.
- Les erreurs applicatives doivent être affichées de manière exploitable pour l'utilisateur.

## Règles techniques

- Le projet utilise Next.js App Router côté frontend et NestJS côté backend.
- TypeScript strict est activé sur les deux applications.
- Les composants serveur Next.js sont autorisés, mais ne doivent pas remplacer l'API métier NestJS.
- Les secrets ne doivent jamais être exposés dans le code client.
- Les accès base de données passent par des services ou repositories NestJS.
- Les validations d'entrée API sont centralisées dans les DTO NestJS et schémas partagés si nécessaire.
- Le frontend ne doit pas appeler directement la base de données ni les providers IA/Notion.
- Les appels entre Next.js et NestJS doivent suivre un contrat stable : format de réponse, erreurs normalisées, authentification.
- Les routes applicatives et endpoints API doivent rester stables pour permettre les tests E2E.

## Données et modèle

- Aucune donnée métier n'est créée par cette spec.
- Les modèles partagés seront définis dans la spec [Base de données](02-base-de-donnees.md).
- Les DTO exposés par le backend doivent être typés et documentés pour le frontend.

## Contrats d'interface

- Pages publiques Next.js : `/`, `/login`, `/register`.
- Pages protégées Next.js : `/app`, `/app/settings`, `/app/:organizationSlug/...`.
- Groupes de routes recommandés côté Next.js : `(public)`, `(auth)`, `(app)`.
- API backend NestJS : préfixe `/api`, route de santé `/health`.
- Format de réponse API recommandé : `data` en succès, `error` en échec, métadonnées de pagination si nécessaire.
- Structure recommandée : `apps/web` pour Next.js, `apps/api` pour NestJS, `packages/shared` pour les types partagés si un monorepo est retenu.

## Critères d'acceptation

- Étant donné un environnement local configuré, quand un développeur lance le projet, alors le frontend Next.js et le backend NestJS démarrent sans erreur.
- Étant donné le backend lancé, quand `/health` est appelé, alors l'API retourne un statut exploitable.
- Étant donné le frontend lancé, quand la page de smoke test s'affiche, alors elle peut consommer le backend.
- Étant donné une route protégée, quand un utilisateur non connecté y accède, alors il est redirigé vers la connexion.
- Étant donné une nouvelle feature, quand elle est ajoutée, alors elle dispose d'un emplacement clair pour ses pages frontend, modules backend, DTO, services et tests.

## Tests attendus

- Tests unitaires : helpers de configuration, validations d'environnement, services backend simples.
- Tests d'intégration : route `/health`, contrat API, chargement des layouts publics et protégés.
- Tests E2E : accès page publique, redirection route protégée, appel backend depuis le frontend.

## Questions ouvertes

- Le design system sera-t-il construit en interne ou basé sur une librairie de composants ?
- Le projet doit-il être organisé en monorepo `apps/web` + `apps/api` ou en deux applications séparées dans le même dépôt ?
