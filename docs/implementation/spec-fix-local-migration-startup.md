---
title: 'Bloquer le démarrage sur une base non migrée'
type: 'bugfix'
created: '2026-07-10'
status: 'in-progress'
baseline_commit: 'b9cb45946ff0d5d82a35ed540c52b6dc3a84930a'
context:
  - '{project-root}/docs/implementation/spec-production-roadmap-completion.md'
  - '{project-root}/docs/operations/migrations-and-rollback.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** `npm run dev` démarre actuellement le web et l'API même lorsque la base configurée n'a pas reçu les migrations du code courant. Les schedulers s'exécutent aussitôt, touchent `scheduled_job_runs` et produisent plusieurs erreurs Prisma `P2021` au lieu d'expliquer une seule fois que le schéma est obsolète.

**Approach:** Ajouter un préflight Prisma strict et non-mutant avant tout démarrage local, appliquer volontairement les deux migrations déjà versionnées à la base Supabase actuellement configurée après accord humain, puis vérifier la readiness et les jobs.

## Boundaries & Constraints

**Always:** Utiliser `.env.local` comme l'API ; afficher la cible sans secret ; faire de `prisma migrate status` un contrôle en lecture seule ; arrêter le démarrage avant `concurrently` si la base est inaccessible ou en retard ; conserver `prisma migrate deploy` comme action séparée et explicite ; vérifier l'état des migrations et `/health/ready` après application.

**Ask First:** Appliquer `20260709120000_production_roadmap_completion` et `20260710120000_review_hardening` à la base distante `db.bompwwdnqtexdqrjoyqy.supabase.co`; réparer l'historique Prisma, réinitialiser une base, modifier une migration déjà versionnée ou continuer si le préflight révèle des données à supprimer.

**Never:** Exécuter automatiquement une migration dans `npm run dev` ; masquer le décalage avec `DISABLE_SCHEDULED_JOBS=true` ou en absorbant `P2021` ; créer `scheduled_job_runs` manuellement ; utiliser `db push`, `migrate reset` ou `migrate resolve` comme raccourci ; journaliser l'URL de connexion complète.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Base à jour | Toutes les migrations versionnées sont appliquées | Le préflight sort avec succès puis web et API démarrent | N/A |
| Migrations en attente | Une ou plusieurs migrations manquent | Le démarrage s'arrête avant les schedulers et liste les migrations | Indiquer de vérifier la cible puis d'exécuter explicitement `npm run db:migrate` |
| Base inaccessible | DNS, réseau ou credentials invalides | Aucun serveur ne démarre | Conserver l'erreur Prisma sans lancer un processus partiel |
| Base actuelle | Deux migrations en attente, tables concernées vides | Les migrations s'appliquent dans l'ordre et la readiness devient verte | Arrêter et inspecter sans réparation automatique au premier échec |

</frozen-after-approval>

## Code Map

- `package.json` -- orchestration racine du préflight et du démarrage.
- `apps/api/package.json` -- commandes Prisma exécutées avec la configuration effective de l'API.
- `apps/api/prisma/migrations/20260709120000_production_roadmap_completion/migration.sql` -- création de `scheduled_job_runs` et des nouvelles tables.
- `apps/api/prisma/migrations/20260710120000_review_hardening/migration.sql` -- ajout et contrainte de la lease des jobs.
- `.github/workflows/ci.yml` -- validation du contrat de schéma sur PostgreSQL éphémère.
- `README.md` -- installation et dépannage local.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/package.json`, `package.json` -- ajouter `db:status` et l'exécuter entre `env:check:local` et `concurrently` afin d'interdire un démarrage partiel sans muter la base.
- [x] `.github/workflows/ci.yml` -- contrôler le statut Prisma après l'application et le test d'upgrade des migrations.
- [x] `README.md` -- documenter le préflight, la vérification de la cible et la commande volontaire de migration.
- [x] Base Supabase configurée -- confirmer l'impact en lecture seule, appliquer les deux migrations après approbation, puis relire leur statut.
- [ ] Démarrage local -- lancer l'application, vérifier `/health/ready` et confirmer l'absence de `P2021` pour les trois jobs.

**Acceptance Criteria:**
- Given une base en retard ou inaccessible, when `npm run dev` est lancé, then aucun serveur ni scheduler ne démarre et le processus échoue une seule fois.
- Given une base à jour, when `npm run dev` est lancé, then le web et l'API démarrent normalement sans erreur de table manquante.
- Given la base Supabase actuelle sans doublons ni lignes dans les tables nettoyées, when les migrations sont explicitement approuvées et appliquées, then elles sont enregistrées comme terminées sans suppression de donnée métier.

## Spec Change Log

## Design Notes

Le préflight reste volontairement une commande Prisma standard : elle compare les fichiers à `_prisma_migrations`, utilise exactement la même résolution d'environnement que l'API et évite d'introduire un second mécanisme de détection du schéma.

## Verification

**Commands:**
- `npm run db:status` -- échec avant migration, succès après migration.
- `npm run dev` -- aucun démarrage partiel ; API et web disponibles lorsque le schéma est à jour.
- `curl --fail http://127.0.0.1:4000/health/ready` -- PostgreSQL joignable et migration attendue appliquée.
- `npm run lint && npm run test` -- format, typage et suites existantes verts.

**Manual checks (if no CLI):**
- Vérifier dans les logs qu'aucun token ou mot de passe n'est affiché et qu'aucune erreur `scheduled_job_runs` ne réapparaît.
