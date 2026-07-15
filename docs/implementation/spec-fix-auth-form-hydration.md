---
title: 'Réparer l’hydratation des formulaires d’authentification'
type: 'bugfix'
created: '2026-07-10'
status: 'done'
baseline_commit: 'b9cb45946ff0d5d82a35ed540c52b6dc3a84930a'
context:
  - '{project-root}/docs/specs/00-socle-prerequis/03-authentification-comptes.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En développement, la Content Security Policy bloque `eval` utilisé par le runtime de diagnostic Next/React. Le HTML des écrans `/login` et `/register` s’affiche, mais React ne s’hydrate pas : le navigateur ignore `preventDefault()`, soumet le formulaire nativement en `GET` et expose email et mot de passe dans l’URL et les logs sans appeler l’API.

**Approach:** Autoriser `unsafe-eval` uniquement lorsque Next exécute son serveur de développement, conserver une CSP de production stricte, faire échouer le formulaire de manière sûre en l’absence de JavaScript, et ajouter une recette navigateur qui soumet réellement le formulaire.

## Boundaries & Constraints

**Always:** Couvrir connexion et inscription ; préserver les appels JSON `POST` actuels et les messages d’erreur existants ; garder `unsafe-eval` absent des builds et serveurs de production ; empêcher qu’un secret de formulaire apparaisse dans une URL ; conserver les changements de migration déjà présents ; vérifier la console navigateur, la méthode HTTP et l’URL après soumission.

**Ask First:** Modifier le protocole d’authentification, les endpoints backend, la stratégie de session/cookie ou la CSP de production au-delà du strict nécessaire.

**Never:** Ajouter `unsafe-eval` globalement ; désactiver la CSP ; accepter une soumission native en `GET` ; journaliser ou réutiliser les identifiants fournis par l’utilisateur ; affaiblir CORS ou les cookies pour masquer une panne d’hydratation.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Next en développement | JavaScript et React Refresh chargés | Le formulaire est hydraté et appelle `/api/auth/login` ou `/api/auth/register` en `POST` JSON | Une erreur API reste affichée dans le formulaire sans navigation `GET` |
| JavaScript indisponible | Handler React absent | Le mot de passe n’est jamais placé dans l’URL | La soumission HTML échoue fermée en `POST` sur une cible autorisée par la CSP |
| Build production | Serveur de production | La CSP ne contient pas `unsafe-eval` | Le build reste vert et la politique ne régresse pas |
| API indisponible ou identifiants invalides | Requête rejetée | L’utilisateur reste sur la page et voit une erreur | Aucun email ou mot de passe n’apparaît dans l’URL |

</frozen-after-approval>

## Code Map

- `apps/web/next.config.mjs` -- génération des headers et CSP responsable du blocage.
- `apps/web/src/components/auth-form.tsx` -- gestionnaire client et fallback HTML des deux formulaires.
- `e2e/responsive.spec.ts` -- smoke navigateur actuellement limité à la visibilité des champs.
- `playwright.config.ts` -- exécution de Next en mode développement pour le smoke desktop/mobile.
- `apps/web/next.config.test.mjs` -- future régression unitaire des variantes CSP développement/production.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/next.config.mjs` -- construire la CSP selon la phase Next, ajouter `unsafe-eval` uniquement au serveur de développement et restreindre les soumissions avec `form-action 'self'`.
- [x] `apps/web/src/components/auth-form.tsx` -- déclarer une méthode HTML `POST` afin qu’une panne future d’hydratation ne puisse plus encoder les champs dans l’URL.
- [x] `apps/web/next.config.test.mjs`, `apps/web/package.json` -- vérifier que la CSP de développement autorise React Refresh et que la production exclut `unsafe-eval`.
- [x] `e2e/responsive.spec.ts` -- intercepter l’API, soumettre un identifiant factice, exiger un `POST`, un message d’erreur, une URL sans données et aucune violation CSP.
- [x] Navigateur local -- reproduire avant correction, recharger après correction et vérifier connexion et inscription sans utiliser de credential réel.

**Acceptance Criteria:**
- Given le serveur Next de développement, when un utilisateur soumet connexion ou inscription, then l’API reçoit une requête `POST` et l’URL de la page ne contient aucun champ du formulaire.
- Given un build de production, when ses headers sont générés, then `script-src` ne contient jamais `unsafe-eval`.
- Given une réponse API invalide, when le formulaire est soumis, then un message visible est rendu et le bouton redevient utilisable.

## Spec Change Log

## Design Notes

La phase `PHASE_DEVELOPMENT_SERVER` est une frontière plus fiable que la seule variable `NODE_ENV`, car les tests Playwright démarrent `next dev` avec un environnement de test. La défense `method="post"` reste nécessaire même après réparation de la CSP : elle empêche une régression de confidentialité si un autre incident bloque un jour l’hydratation.

## Verification

**Commands:**
- `npm run test -w @content-ai/web` -- variantes CSP et tests web verts.
- `npm run test:e2e:smoke` -- soumission hydratée sur Chromium desktop et mobile, sans credential dans l'URL.
- `npm run lint` -- format et typage verts.
- `npm run build:web` -- build production vert et CSP sans `unsafe-eval`.

**Results (2026-07-10):**
- Chromium desktop et mobile -- connexion et inscription interceptées en `POST` JSON, erreurs visibles, boutons réactivés, URL sans données de formulaire et aucune erreur CSP d'exécution ou de console.
- Navigateur local intégré -- `/login` et `/register` hydratés avec un formulaire `method="post"`; soumission de connexion avec des valeurs factices maintenue sur `/login`, erreur visible et aucune erreur ou alerte dans la console.
- Logs Next locaux -- aucune requête `/login?...password=...` ou `/register?...password=...` après correction.

**Manual checks (if no CLI):**
- Vérifier dans la console navigateur l’absence d’`EvalError` CSP et dans les logs Next l’absence de requête `/login?...password=...` ou `/register?...password=...`.

## Suggested Review Order

**Hydratation et confidentialité**

- La CSP varie par phase Next sans affaiblir la production.
  [`next.config.mjs:5`](../../apps/web/next.config.mjs#L5)

- Le fallback HTML conserve les secrets hors de l’URL.
  [`auth-form.tsx:103`](../../apps/web/src/components/auth-form.tsx#L103)

**Préflight de schéma local**

- Le démarrage s’arrête avant les serveurs si la base est en retard.
  [`package.json:12`](../../package.json#L12)

- Prisma fournit l’unique contrôle de statut du schéma.
  [`package.json:14`](../../apps/api/package.json#L14)

- Le dépannage garde l’application des migrations volontaire et explicite.
  [`README.md:27`](../../README.md#L27)

- La spécification séparée conserve les limites de sécurité des migrations.
  [`spec-fix-local-migration-startup.md:12`](spec-fix-local-migration-startup.md#L12)

**Preuves de non-régression**

- Les parcours navigateur couvrent POST, erreurs, URL et console CSP.
  [`responsive.spec.ts:5`](../../e2e/responsive.spec.ts#L5)

- Les variantes développement et production verrouillent la politique CSP.
  [`next.config.test.mjs:12`](../../apps/web/next.config.test.mjs#L12)

- La suite web exécute les tests CSP avec les tests existants.
  [`package.json:11`](../../apps/web/package.json#L11)

- La CI confirme que l’historique Prisma reste entièrement appliqué.
  [`ci.yml:75`](../../.github/workflows/ci.yml#L75)
