# Déploiement, CI et observabilité

## Objectif

Préparer une chaîne de livraison permettant de tester, déployer et surveiller l'application en ligne pour le jury et les itérations produit.

## Priorité

- Niveau : Must
- Justification : le cahier des charges demande une interface web déployée en ligne et testable.

## Phase

- Socle prérequis

## Dépendances

- Specs prérequises : [Architecture Next.js + NestJS](00-architecture-nextjs-nestjs.md), [Outillage et environnement](01-outillage-environnement.md), [Base de données](02-base-de-donnees.md), [Authentification et comptes](03-authentification-comptes.md).
- Contrats partagés : variables d'environnement, migrations, scripts CI.

## Périmètre

- Définir le pipeline CI.
- Définir les environnements : local, preview, production.
- Déployer le frontend Next.js, le backend NestJS et la base de données.
- Exécuter les migrations de manière contrôlée.
- Mettre en place logs applicatifs et suivi d'erreurs minimal.

## Hors périmètre

- Haute disponibilité multi-région.
- Monitoring business avancé.
- Facturation SaaS.
- Plan de reprise d'activité complet.

## Acteurs

- Développeurs : ouvrent des PR vérifiées automatiquement.
- Jury : accède à une URL stable.
- Système : collecte les erreurs et logs utiles au diagnostic.

## Parcours / comportement attendu

1. Une PR déclenche lint, typage, tests et build.
2. Un merge déclenche un déploiement sur l'environnement cible.
3. Les migrations sont appliquées sans perte de données.
4. Les erreurs runtime sont consultables par l'équipe.

## Règles fonctionnelles

- Une URL de démonstration doit être disponible pour le jury.
- Les erreurs critiques doivent pouvoir être diagnostiquées après coup.
- Les déploiements ne doivent pas nécessiter de manipulation manuelle risquée.
- Les données de production ne doivent pas être écrasées par les seeds.

## Règles techniques

- La CI doit exécuter au minimum lint, typage, tests et build pour le frontend et le backend.
- Les variables d'environnement sont configurées par environnement.
- Les migrations sont lancées explicitement ou via une étape contrôlée.
- Les logs ne doivent pas contenir de secrets ni de prompts sensibles complets si cela expose des données utilisateur.
- Les pages critiques doivent avoir un mécanisme de fallback d'erreur.

## Données et modèle

- Aucun modèle métier dédié.
- Données de configuration : URL application, URL base, secrets auth, clés OAuth, clé IA, clé Notion.

## Contrats d'interface

- Branches recommandées : `main` pour production, branches PR pour preview.
- Checks CI : `lint`, `typecheck`, `test`, `build`.
- Healthcheck : route NestJS `/health` permettant de vérifier que l'API répond.

## Critères d'acceptation

- Étant donné une PR valide, quand la CI s'exécute, alors tous les checks passent.
- Étant donné un déploiement, quand les URLs publiques sont ouvertes, alors la page de connexion Next.js et le healthcheck NestJS sont accessibles.
- Étant donné une erreur serveur, quand elle survient, alors elle est loggée sans exposer de secret.

## Tests attendus

- Tests CI : lint, typage, tests unitaires/intégration, build.
- Tests E2E : smoke test sur l'environnement de preview ou staging.
- Vérification manuelle : URL jury, inscription, génération mockée ou réelle selon budget.

## Questions ouvertes

- La cible de déploiement sera-t-elle Vercel, un VPS, ou une autre plateforme ?
- Faut-il prévoir un environnement staging séparé de la preview PR ?
