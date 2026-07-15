# Mode demonstration

Le seed est desactive par defaut et idempotent.

```bash
SEED_DEMO_DATA=true ALLOW_DEMO_SEED=true npm run db:seed
```

Valeurs locales par defaut :

- email : `demo@example.com` ;
- mot de passe : `DemoContent2026!` ;
- organisation : `acme`.

Definir `DEMO_USER_EMAIL` et `DEMO_USER_PASSWORD` pour les remplacer. Le seed cree un mot de passe bcrypt utilisable, un contexte editorial, des idees, des contenus, une planification et une ressource de veille.

Le seed refuse toujours `NODE_ENV=production`, tout hote PostgreSQL non loopback et toute base dont le nom ne contient pas explicitement `demo`, `dev`, `test` ou `local`. Il n'existe aucune option permettant de contourner cette protection.

Parcours de recette : inscription ou connexion → contexte → idee → contenu → historique → calendrier, puis invitation → inscription invitee → acceptation. `npm run test:e2e` automatise ces parcours dans Chromium avec une base `E2E_DATABASE_URL` locale et isolee.
