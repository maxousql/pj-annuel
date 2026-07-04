# Content AI SaaS

Plateforme SaaS de content marketing assistée par IA.

## Stack

- Frontend : Next.js App Router
- Backend : NestJS
- Base de données cible : PostgreSQL hébergé sur Supabase
- Monorepo : npm workspaces

## Structure

```text
apps/
  web/       Frontend Next.js
  api/       Backend NestJS
packages/
  shared/    Types et helpers partagés
docs/specs/  Specs fonctionnelles et techniques
```

## Installation

```bash
npm install
cp .env.example .env.local
npm run env:check:local
```

Remplir au minimum les URLs, ports et secrets requis dans `.env.local`.

## Base de données Supabase

Projet Supabase : `bompwwdnqtexdqrjoyqy`

La base PostgreSQL n'est pas lancée en local. Renseigner `DATABASE_URL`, `SUPABASE_URL` et les clés Supabase dans `.env.local`.

```bash
npm run db:migrate
npm run db:seed
```

Les migrations Prisma sont versionnées dans `apps/api/prisma/migrations`.
La migration initiale est aussi appliquée sur le projet Supabase via MCP.

## Authentification

Le backend NestJS expose les endpoints sous `/api/auth` :

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `PATCH /api/auth/me`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

Les sessions applicatives utilisent un JWT signé dans un cookie HTTP-only
`app_session`. Renseigner un `AUTH_SECRET` long dans `.env.local`.

Pour Google OAuth, configurer `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET`.
Le callback par défaut est calculé depuis `NEXT_PUBLIC_API_URL` :
`/api/auth/google/callback`.

## Organisations et RBAC

Le backend NestJS expose les endpoints sous `/api/organizations` :

- `GET /api/organizations`
- `POST /api/organizations`
- `GET /api/organizations/:organizationSlug`
- `POST /api/organizations/:organizationSlug/switch`
- `GET /api/organizations/:organizationSlug/members`

La création d'organisation ajoute automatiquement le créateur comme membre
`ADMIN`. Les accès par organisation sont résolus côté backend depuis la session
et le membership actif. Les rôles disponibles sont `ADMIN`, `EDITOR`, `READER`.

Pages disponibles côté Next.js :

- `/app`
- `/app/organizations/new`
- `/app/:organizationSlug/dashboard`
- `/app/:organizationSlug/settings/members`
- `/app/settings`

## Développement

```bash
npm run dev
```

Commandes ciblées :

```bash
npm run dev:web
npm run dev:api
```

Par défaut :

- Frontend : `http://localhost:3000`
- Backend : `http://localhost:4000`
- Healthcheck API : `http://localhost:4000/health`

## Vérification

```bash
npm run typecheck
npm run lint
npm run build
npm run test
```
