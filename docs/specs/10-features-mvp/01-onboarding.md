# Onboarding

## Objectif

Guider un nouvel utilisateur jusqu'à une première valeur visible : compte créé, organisation prête, contexte éditorial minimal configuré et première génération accessible.

## Priorité

- Niveau : Must
- Justification : le jury doit comprendre la valeur de la plateforme dès les premières minutes.

## Phase

- MVP

## Dépendances

- Specs prérequises : [Authentification et comptes](../00-socle-prerequis/03-authentification-comptes.md), [Organisations et RBAC](../00-socle-prerequis/04-organisations-rbac.md), [Shell applicatif et navigation](../00-socle-prerequis/05-shell-app-navigation.md).
- Contrats partagés : utilisateur connecté, organisation active, contexte éditorial.

## Périmètre

- Détecter qu'un utilisateur doit compléter son onboarding.
- Créer ou sélectionner l'organisation initiale.
- Collecter secteur, cible, ton et thématiques.
- Sauvegarder progressivement la progression.
- Rediriger vers le dashboard ou la génération d'idées.

## Hors périmètre

- Tutoriel interactif avancé.
- Presets sectoriels détaillés.
- Connexion Notion obligatoire.
- Invitations d'équipe.

## Acteurs

- Nouvel utilisateur : complète son setup initial.
- Administrateur initial : crée l'organisation.
- Système : contrôle l'état d'onboarding et les redirections.

## Parcours / comportement attendu

1. Après inscription, l'utilisateur est redirigé vers `/app/onboarding`.
2. Il renseigne son organisation ou confirme une organisation existante.
3. Il saisit son contexte éditorial minimal.
4. Le système marque l'onboarding comme terminé.
5. L'utilisateur arrive sur le dashboard avec une action rapide de génération.

## Règles fonctionnelles

- L'onboarding est obligatoire tant que l'utilisateur n'a pas d'organisation active et de contexte minimal.
- L'utilisateur peut quitter puis reprendre sans perdre les étapes déjà sauvegardées.
- Les champs minimaux sont : nom d'organisation, secteur, cible, ton, thématiques principales.
- Les champs optionnels ne doivent pas bloquer la fin du parcours.
- Un utilisateur déjà onboardé ne doit pas repasser par ce parcours à chaque connexion.

## Règles techniques

- Le guard applicatif redirige vers l'onboarding si l'état minimal est incomplet.
- Les validations sont faites côté client et côté serveur.
- La progression est persistée par utilisateur et organisation.
- Le parcours doit être responsive et utilisable au clavier.
- Les actions d'onboarding doivent respecter les rôles et l'organisation active.

## Données et modèle

- `User.onboardingCompletedAt` : date de fin.
- `Organization` : nom et slug.
- `EditorialContext` : secteur, cible, ton, thématiques, positionnement optionnel.
- `OnboardingState` optionnel : étape courante, données partielles.

## Contrats d'interface

- Pages : `/app/onboarding`, `/app/:organizationSlug/dashboard`.
- Actions/API : `getOnboardingState`, `saveOnboardingStep`, `completeOnboarding`.
- Événement interne : `onboarding.completed`.

## Critères d'acceptation

- Étant donné un nouvel utilisateur, quand il se connecte, alors il est dirigé vers l'onboarding.
- Étant donné un onboarding interrompu, quand l'utilisateur revient, alors il reprend à l'étape pertinente.
- Étant donné les champs minimaux remplis, quand il termine, alors son organisation et son contexte sont persistés.
- Étant donné un onboarding terminé, quand il revient sur `/app`, alors il accède au dashboard.

## Tests attendus

- Tests unitaires : validation des champs minimaux.
- Tests d'intégration : sauvegarde partielle, finalisation, redirection.
- Tests E2E : inscription -> onboarding -> dashboard.

## Questions ouvertes

- L'organisation doit-elle toujours être créée pendant le MVP ou peut-on créer un espace personnel implicite ?
- Faut-il proposer des exemples préremplis pour accélérer la démonstration jury ?
