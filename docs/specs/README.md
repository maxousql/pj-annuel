# Specs fonctionnelles et techniques

Ce dossier transforme le cahier des charges en specs actionnables pour une équipe de développement. Les specs sont volontairement découpées pour permettre un travail collaboratif : le socle est ordonné, puis chaque feature peut être prise indépendamment dès que ses dépendances de socle sont disponibles.

Source principale : [../cahier_des_charges.md](../cahier_des_charges.md)

## Organisation

```text
docs/specs/
  _template.spec.md
  00-socle-prerequis/
  10-features-mvp/
  20-features-v1/
  30-features-v2/
```

## Ordre d'implémentation recommandé

### 00 - Socle prérequis

Ces specs doivent être traitées dans l'ordre. Elles posent les contrats communs utilisés par les features.

1. [Architecture Next.js + NestJS](00-socle-prerequis/00-architecture-nextjs-nestjs.md)
2. [Outillage et environnement](00-socle-prerequis/01-outillage-environnement.md)
3. [Base de données](00-socle-prerequis/02-base-de-donnees.md)
4. [Authentification et comptes](00-socle-prerequis/03-authentification-comptes.md)
5. [Organisations et RBAC](00-socle-prerequis/04-organisations-rbac.md)
6. [Shell applicatif et navigation](00-socle-prerequis/05-shell-app-navigation.md)
7. [Infrastructure IA](00-socle-prerequis/06-infrastructure-ia.md)
8. [Déploiement, CI et observabilité](00-socle-prerequis/07-deploiement-ci-observabilite.md)

### 10 - Features MVP

Ces specs livrent la première version testable par le jury.

1. [Onboarding](10-features-mvp/01-onboarding.md)
2. [Contexte éditorial](10-features-mvp/02-contexte-editorial.md)
3. [Génération d'idées](10-features-mvp/03-generation-idees.md)
4. [Génération de contenus](10-features-mvp/04-generation-contenus.md)
5. [Historique et anti-doublon](10-features-mvp/05-historique-anti-doublon.md)
6. [Dashboard](10-features-mvp/06-dashboard.md)

### 20 - Features V1

Ces specs structurent la collaboration et l'organisation éditoriale.

1. [Bibliothèque de contenus](20-features-v1/01-bibliotheque-contenus.md)
2. [Planification éditoriale](20-features-v1/02-planification-editoriale.md)
3. [Intégration Notion](20-features-v1/03-integration-notion.md)
4. [Collaboration et invitations](20-features-v1/04-collaboration-invitations.md)

### 30 - Features V2

Ces specs enrichissent le produit après le MVP et la V1.

1. [Curation et veille](30-features-v2/01-curation-veille.md)
2. [Amélioration de la génération IA](30-features-v2/02-amelioration-generation-ia.md)
3. [Onboarding avancé](30-features-v2/03-onboarding-avance.md)
4. [Automatisation marketing](30-features-v2/04-automatisation-marketing.md)

## Règles de découpage

- Une spec de feature ne doit pas dépendre d'une autre feature pour être développée.
- Les dépendances transverses doivent être placées dans `00-socle-prerequis`.
- Une spec doit contenir ses critères d'acceptation et ses tests attendus.
- Les questions ouvertes doivent rester explicites au lieu d'être résolues implicitement.
- Le MVP doit permettre au jury de créer un compte, configurer un contexte, générer une idée, générer un contenu, consulter l'historique et voir le dashboard.

## Couverture du cahier des charges

| Besoin du cahier des charges         | Specs concernées                                             |
| ------------------------------------ | ------------------------------------------------------------ |
| Gestion des comptes utilisateurs     | `03-authentification-comptes`, `01-onboarding`               |
| Gestion des organisations            | `04-organisations-rbac`, `04-collaboration-invitations`      |
| Configuration du contexte éditorial  | `02-contexte-editorial`, `01-onboarding`                     |
| Génération d'idées                   | `03-generation-idees`                                        |
| Génération de contenus marketing     | `04-generation-contenus`                                     |
| Curation et veille                   | `01-curation-veille`                                         |
| Gestion et organisation des contenus | `01-bibliotheque-contenus`, `05-historique-anti-doublon`     |
| Historique et anti-doublon           | `05-historique-anti-doublon`                                 |
| Dashboard utilisateur                | `06-dashboard`                                               |
| Intégration Notion                   | `03-integration-notion`                                      |
| Planification éditoriale             | `02-planification-editoriale`                                |
| Onboarding utilisateur               | `01-onboarding`, `03-onboarding-avance`                      |
| UX, accessibilité et déploiement     | `05-shell-app-navigation`, `07-deploiement-ci-observabilite` |

## Stack technique imposée par le cahier des charges

| Couche           | Choix                                                                |
| ---------------- | -------------------------------------------------------------------- |
| Frontend         | Next.js                                                              |
| Backend          | NestJS                                                               |
| Base de données  | PostgreSQL                                                           |
| Authentification | Supabase Auth ou Auth.js                                             |
| IA               | Provider interchangeable, Gemini prioritaire pour le MVP pédagogique |
| Intégrations     | Notion API                                                           |

Le frontend Next.js porte l'expérience SaaS. Le backend NestJS porte l'API, la logique métier, l'accès base de données, les intégrations et les appels IA.
