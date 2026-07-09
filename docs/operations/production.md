# Mise en production

## Topologie

- `Dockerfile.web` construit le frontend Next.js autonome sur le port 3000.
- `Dockerfile.api` construit l'API NestJS et embarque les migrations Prisma sur le port 4000.
- PostgreSQL est un service gere externe. Aucun conteneur de production ne lance de base locale.
- `docker-compose.production.yml` documente l'ordre migration → API → web.

## Configuration obligatoire

Copier `.env.example` vers un gestionnaire de secrets, jamais vers Git. En production :

- `DATABASE_URL` : connexion PostgreSQL TLS avec un role limite a l'application ;
- `FRONTEND_URL`, `API_PUBLIC_URL`, `NEXT_PUBLIC_API_URL` : URLs HTTPS publiques ;
- `AUTH_SECRET` : au moins 32 caracteres aleatoires ;
- `INTEGRATION_ENCRYPTION_KEY` : exactement 32 octets, encodee en base64 ;
- `AI_PROVIDER=gemini` et `GEMINI_API_KEY` ;
- `AUTH_COOKIE_SAME_SITE=lax` si les deux services partagent le meme site, `none` sinon ;
- `TRUST_PROXY_HOPS=1` uniquement derriere un proxy maitrise ;
- `APP_REPLICA_COUNT=1` et `RATE_LIMIT_MODE=local` pour une instance unique ; pour plusieurs replicas, `RATE_LIMIT_MODE=proxy` et `TRUST_PROXY_HOPS` sont obligatoires, avec une limite partagee configuree sur le reverse proxy/API gateway ;
- `INVITATION_EMAIL_PROVIDER=resend`, `RESEND_API_KEY` et un `INVITATION_EMAIL_FROM` verifie ;
- identifiants Notion et `NOTION_OAUTH_STATE_SECRET` d'au moins 32 caracteres si l'integration est activee ;
- `EXPECTED_DATABASE_MIGRATION=20260710120000_review_hardening` jusqu'a la prochaine migration attendue.

Le validateur de demarrage refuse le provider IA mock, les URLs non HTTPS et les secrets incomplets en production.

## Sequence de livraison

1. Faire passer `npm run lint`, `npm run test`, `npm run test:e2e` et `npm run build`.
2. Construire les deux images avec un tag immuable (SHA Git).
3. Creer une sauvegarde de base et verifier sa taille.
4. Executer l'image API avec `npm run db:migrate -w @content-ai/api` comme tache unique.
5. Demarrer l'API et attendre `GET /health/ready` en HTTP 200.
6. Demarrer le web, puis executer `SMOKE_WEB_URL=... SMOKE_API_URL=... npm run smoke`.
7. Verifier inscription, organisation, generation mock interdite, calendrier, invitation et callback Notion.

Le workflow `release-images.yml` publie uniquement des images sur declenchement manuel. Le workflow `production-migrate.yml` est separe et doit etre protege par l'environnement GitHub `production` avec approbation.

## Arret et maintenance

La route `/health` est une liveness sans dependance. `/health/ready` verifie PostgreSQL, applique un `statement_timeout` et exige la migration attendue ; elle doit piloter le retrait du trafic. Les jobs utilisent une lease renouvelee et un index actif unique en base afin qu'une seule replique traite chaque execution, meme entre deux buckets.
