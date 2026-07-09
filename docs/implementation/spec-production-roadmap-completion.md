---
title: 'Finalisation de la roadmap et préparation production'
type: 'feature'
created: '2026-07-09'
status: 'done'
baseline_commit: '47e15d8ac2faa80411f8254e50f6e23e9f54b57f'
context:
  - '{project-root}/docs/specs/README.md'
  - '{project-root}/docs/cahier_des_charges.md'
  - '{project-root}/README.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le cœur MVP, la bibliothèque, le calendrier et plusieurs briques V2 existent, mais l'application n'est pas finale : Notion et les invitations manquent, des comportements V2 sont partiels, et les garanties de sécurité, recette, observabilité et déploiement ne suffisent pas pour la production.

**Approach:** Compléter toute la roadmap documentée, fermer les risques de production identifiés, automatiser la recette jury et livrer une configuration de déploiement reproductible sans réécrire les fonctionnalités déjà stables.

## Boundaries & Constraints

**Always:** Préserver l'isolation multi-organisation et le RBAC backend ; conserver la modification existante de `package-lock.json` ; suivre l'architecture Next.js/NestJS/Prisma actuelle ; utiliser l'interface existante comme seule référence visuelle ; ajouter migrations, tests et documentation pour chaque nouveau flux ; chiffrer les secrets d'intégration et ne jamais les renvoyer au client ou aux logs.

**Ask First:** Déployer vers un compte cloud réel ; appliquer une migration à la base distante ; envoyer des emails à de vrais destinataires ; choisir ou créer des identifiants OAuth/Notion, domaines, clés de chiffrement ou secrets de production ; remplacer l'authentification JWT actuelle par Supabase Auth/Auth.js.

**Never:** Utiliser `docs/design-system.md` comme référence ; supprimer ou écraser des changements utilisateur ; affaiblir les contrôles d'accès pour faire passer les tests ; stocker un token Notion en clair ; autoriser la curation à joindre des réseaux privés ; présenter un mock comme une intégration de production.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|---|---|---|---|
| Connexion Notion | Admin, OAuth valide, base sélectionnée | Credential chiffré, mapping persisté, export/sync traçables | OAuth expiré, rate limit et conflit visibles sans fuite de token |
| Invitation | Admin, email et rôle valides | Token hashé, acceptation transactionnelle, membership unique | Refuser token expiré/révoqué et suppression du dernier admin |
| Curation URL | URL publique HTTP(S) | Métadonnées récupérées sous limites strictes | Bloquer loopback, IP privée, DNS rebinding, redirection privée et corps excessif |
| Production | Configuration complète | API/web démarrent, migrations contrôlées, readiness verte | Échec immédiat et explicite sur env invalide ou dépendance indisponible |

</frozen-after-approval>

## Code Map

- `apps/api/src/app.module.ts` -- composition des modules backend.
- `apps/api/prisma/schema.prisma` et `apps/api/prisma/migrations/` -- modèles et évolution de schéma.
- `apps/api/src/organizations/` -- RBAC, membres et contexte multi-tenant.
- `apps/api/src/curation/curation.service.ts` -- frontière réseau à sécuriser.
- `apps/api/src/automations/` et `apps/api/src/onboarding/` -- écarts V2 à fermer.
- `apps/web/src/app/(app)/app/[organizationSlug]/` -- surfaces produit à compléter.
- `.github/workflows/ci.yml`, `.env.example`, `tools/` -- gates et exploitation.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/integrations/`, `apps/web/.../integrations/`, Prisma -- implémenter OAuth Notion, chiffrement, mapping, export, sync bidirectionnelle, journal et tests.
- [x] `apps/api/src/invitations/`, `apps/web/src/components/organizations/`, `apps/web/src/app/invite/` -- implémenter invitation, email interchangeable, acceptation, rôles, révocation, dernier admin et tests.
- [x] `apps/api/src/curation/` -- fermer la SSRF et ajouter import RSS planifié, détail ressource et tests.
- [x] `apps/api/src/automations/`, `apps/api/src/onboarding/`, `apps/api/src/ai/` -- finaliser fuseaux/idempotence, progression par rôle, similarité/qualité et couverture V2.
- [x] `apps/api/src/config/`, `apps/api/src/common/`, `apps/web/src/app/error.tsx`, `apps/api/src/health/` -- ajouter validation env, headers/throttling, sessions expirées, logs, readiness et fallbacks.
- [x] `apps/api/prisma/seed.ts`, `.env.example`, `README.md`, `docs/operations/` -- fournir démo utilisable, runbooks, migrations, rollback et configuration production.
- [x] `.github/workflows/`, fichiers de déploiement, polices locales -- rendre CI/CD reproductible et indépendant des polices réseau.
- [x] `apps/api/**/*.spec.ts`, `apps/web/**/*.test.tsx`, `e2e/` -- couvrir les nouveaux flux et le parcours jury navigateur complet.

**Acceptance Criteria:**
- Given un nouveau jury, when il suit inscription → organisation → contexte → idée → contenu → historique → calendrier, then le parcours réussit sans intervention technique.
- Given une V1 configurée, when un admin invite un membre ou connecte Notion, then les flux complets fonctionnent avec RBAC, audit et erreurs sûres.
- Given une URL de réseau privé, when elle est soumise à la curation, then aucune connexion sortante n'est effectuée.
- Given un environnement vierge, when CI et déploiement s'exécutent, then format, typage, migrations, tests, build, smoke et readiness sont verts.
- Given une instance répliquée, when les jobs sont rejoués, then aucun rappel, import ou recommandation en double n'est créé.
- Given la configuration de production, when un secret manque ou qu'un mock est sélectionné, then le démarrage échoue explicitement.

## Spec Change Log

## Design Notes

Le design visuel est volontairement non prescriptif : chaque nouvel écran doit réutiliser les composants, classes, tokens CSS, densités et motifs d'interaction déjà présents dans l'application. `docs/design-system.md` est obsolète et exclu.

## Verification

**Commands:**
- `npm run env:check` -- modèle d'environnement valide.
- `npm run db:generate && npm run db:validate` -- client et schéma Prisma valides.
- `npm run lint` -- format et typage verts.
- `npm run test` -- suites unitaires et intégration vertes.
- `npm run test:e2e` -- parcours navigateur réellement exécuté et vert.
- `npm run build` -- build production web/API/shared vert.
- `npm audit --omit=dev` -- aucune vulnérabilité critique ou haute non justifiée.

**Manual checks (if no CLI):**
- Vérifier sur preview les parcours mobile/desktop, OAuth Google/Notion réel, email d'invitation, logs/alertes, rollback et restauration de sauvegarde.

## Suggested Review Order

1. **Point d'entrée — composition et configuration :** commencer par [`AppModule`](../../apps/api/src/app.module.ts#L25), qui relie validation d'environnement, jobs, intégrations et invitations.
2. **Persistance — schéma et compatibilité ascendante :** examiner les nouveaux modèles dans [`schema.prisma`](../../apps/api/prisma/schema.prisma#L331), puis la [migration de roadmap](../../apps/api/prisma/migrations/20260709120000_production_roadmap_completion/migration.sql#L1) et son [durcissement post-revue](../../apps/api/prisma/migrations/20260710120000_review_hardening/migration.sql#L1). Arrêt conseillé après validation des contraintes d'idempotence et des baux de jobs.
3. **Intégration Notion — hub principal :** suivre l'orchestration dans [`IntegrationsService`](../../apps/api/src/integrations/integrations.service.ts#L69), les appels externes dans [`NotionAdapter`](../../apps/api/src/integrations/notion/notion.adapter.ts#L17), puis le [panneau web](../../apps/web/src/components/integrations/notion-integration-panel.tsx#L49).
4. **Invitations et membres — transactions et RBAC :** revoir [`InvitationsService`](../../apps/api/src/invitations/invitations.service.ts#L26), notamment création, acceptation et protection du dernier administrateur, puis l'[acceptation côté web](../../apps/web/src/components/invitations/invitation-acceptance.tsx#L18).
5. **Sécurité des frontières :** contrôler la protection SSRF dans [`safe-fetch.ts`](../../apps/api/src/curation/safe-fetch.ts#L37), la [validation production](../../apps/api/src/config/environment.validation.ts#L10) et les [middlewares de sécurité](../../apps/api/src/config/security.middleware.ts#L12).
6. **V2 et exécution distribuée :** vérifier les [baux de jobs](../../apps/api/src/common/jobs/scheduled-jobs.service.ts#L8), les [presets d'onboarding](../../apps/api/src/onboarding/onboarding.service.ts#L33) et la [similarité hybride](../../apps/api/src/history/history-similarity.ts#L109).
7. **Livraison et périphériques :** terminer par la [CI avec PostgreSQL éphémère](../../.github/workflows/ci.yml#L9), la [topologie Docker](../../docker-compose.production.yml#L1), la [readiness](../../apps/api/src/health/health.service.ts#L12), le [parcours jury](../../e2e/jury-journey.spec.ts#L3) et le [runbook production](../operations/production.md#L1).
