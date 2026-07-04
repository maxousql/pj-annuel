# Authentification et comptes

## Objectif

Permettre aux utilisateurs de créer un compte, se connecter, utiliser Google OAuth et gérer leur profil de base.

## Priorité

- Niveau : Must
- Justification : le cahier des charges impose un accès authentifié et un espace de travail lié aux rôles.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : [Base de données](02-base-de-donnees.md).
- Contrats partagés : modèle `User`, modèle `AuthAccount`, middleware de session.

## Périmètre

- Inscription email / mot de passe.
- Connexion email / mot de passe.
- Authentification externe Google.
- Déconnexion.
- Session ou token vérifiable par le backend NestJS pour protéger les pages applicatives et endpoints API.
- Gestion simple du profil utilisateur.

## Hors périmètre

- SSO entreprise.
- Authentification multi-facteur.
- Gestion avancée des appareils connectés.
- Facturation par utilisateur.

## Acteurs

- Visiteur : crée un compte ou se connecte.
- Utilisateur connecté : accède à son espace.
- Système : valide les identifiants et maintient la session.

## Parcours / comportement attendu

1. Un visiteur ouvre `/register`.
2. Il crée un compte avec email et mot de passe ou choisit Google.
3. Le système crée le profil utilisateur.
4. L'utilisateur est redirigé vers l'onboarding ou son espace applicatif.

## Règles fonctionnelles

- Un email ne peut correspondre qu'à un seul utilisateur.
- Les mots de passe doivent respecter une complexité minimale.
- Un utilisateur connecté ne peut pas accéder aux pages de login/register sans redirection adaptée.
- Un utilisateur non connecté ne peut pas accéder aux pages `/app`.
- Le profil doit permettre de modifier au minimum le nom affiché.

## Règles techniques

- Les mots de passe sont hachés avec un algorithme adapté.
- Les sessions ou tokens sont vérifiés côté backend NestJS pour les endpoints protégés.
- Les callbacks OAuth ne doivent pas exposer de secret côté client.
- Les erreurs d'authentification doivent rester génériques pour éviter l'énumération d'emails.
- Les routes frontend et endpoints NestJS protégés doivent utiliser un garde commun.

## Données et modèle

- `User.email` : unique, normalisé.
- `User.name` : modifiable.
- `User.avatarUrl` : optionnel.
- `AuthAccount.provider` : `credentials`, `google`.
- `AuthAccount.providerAccountId` : identifiant externe.

## Contrats d'interface

- Pages : `/login`, `/register`, `/app/settings/profile`.
- Actions/API : `register`, `login`, `logout`, `loginWithGoogle`, `updateProfile`.
- Middleware : redirection des utilisateurs non authentifiés vers `/login`.

## Critères d'acceptation

- Étant donné un email non utilisé, quand un visiteur s'inscrit, alors un utilisateur est créé et connecté.
- Étant donné un compte existant, quand l'utilisateur saisit de bons identifiants, alors il accède à `/app`.
- Étant donné un utilisateur non connecté, quand il ouvre `/app`, alors il est redirigé vers `/login`.
- Étant donné Google OAuth configuré, quand l'utilisateur termine le flux, alors il est connecté.

## Tests attendus

- Tests unitaires : validation email, validation mot de passe.
- Tests d'intégration : création compte, connexion, déconnexion, profil.
- Tests E2E : inscription, connexion, protection de route.

## Questions ouvertes

- Faut-il imposer une vérification email pour le MVP pédagogique ?
- Faut-il autoriser la liaison d'un compte Google à un compte créé par mot de passe avec le même email ?
