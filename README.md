# Content AI SaaS

Plateforme multi-organisation de content marketing assistee par IA : ideation, redaction, bibliotheque, calendrier, curation, automatisations, invitations et synchronisation Notion.

## Stack

- Next.js App Router (`apps/web`)
- NestJS (`apps/api`)
- PostgreSQL et Prisma
- npm workspaces (`packages/shared` pour les contrats)

## Installation locale

Prérequis : Node.js 22+, npm 10+ et une base PostgreSQL.

```bash
npm ci
cp .env.example .env.local
npm run env:check:local
npm run db:generate
npm run db:migrate
npm run dev
```

Par defaut, le web ecoute sur `http://localhost:3000`, l'API sur `http://localhost:4000`, la liveness sur `/health` et la readiness PostgreSQL sur `/health/ready`.

## Authentification et organisations

Les sessions sont des JWT signes dans le cookie HTTP-only `app_session`. Les controles multi-tenant et RBAC `ADMIN`, `EDITOR`, `READER` sont appliques par l'API. Google OAuth est active uniquement lorsque ses identifiants sont fournis.

Un administrateur peut inviter, relancer et revoquer une invitation, modifier les roles et retirer un membre. Les tokens d'invitation sont opaques et uniquement hashes en base ; le dernier administrateur est protege.

## Notion

L'ecran `/app/:organizationSlug/integrations` permet la connexion OAuth, le choix de base, le mapping des proprietes, l'export et la synchronisation bidirectionnelle. Les credentials sont chiffres ; voir [le runbook integrations](docs/operations/integrations.md).

## Mode demonstration

```bash
SEED_DEMO_DATA=true ALLOW_DEMO_SEED=true npm run db:seed
```

Le compte local par defaut est documente dans [docs/operations/demo.md](docs/operations/demo.md). Le seed exige deux opt-ins et accepte uniquement une base loopback dont le nom contient `demo`, `dev`, `test` ou `local`.

## Verification

```bash
npm run env:check
npm run db:generate
npm run db:validate
npm run lint
npm run test
npm run test:e2e
npm run build
npm audit --omit=dev
```

Playwright demarre toujours ses propres serveurs web/API et refuse les cibles distantes. `npm run test:e2e` exige `E2E_DATABASE_URL` vers une base loopback explicitement nommee `test` ou `e2e`. `npm run test:e2e:smoke` reste disponible sans base pour la verification responsive permissive. La CI fournit PostgreSQL et execute les parcours jury et invitation complets.

## Production

Les images sont definies par `Dockerfile.api` et `Dockerfile.web`. `docker-compose.production.yml` sert de reference reproductible ; il n'embarque pas PostgreSQL. Les workflows de publication d'images et de migration sont manuels et separes.

Lire [docs/operations/README.md](docs/operations/README.md) avant toute migration, configuration de secrets ou mise en ligne.
