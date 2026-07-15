---
title: 'Provisionnement automatique et résilient de la base Notion'
type: 'feature'
created: '2026-07-15'
status: 'done'
baseline_commit: 'add52718349c0da92e1cbe9ade132fd68cc5def2'
context:
  - '{project-root}/docs/specs/20-features-v1/03-integration-notion.md'
  - '{project-root}/docs/operations/integrations.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La connexion Notion exige aujourd'hui que l'administrateur crée lui-même une base et six propriétés, tandis que l'adaptateur utilise encore le contrat 2022 et des noms de propriétés fragiles. Une relance ambiguë peut aussi créer des doublons et une modification du schéma n'est détectée qu'au moment où la synchronisation échoue.

**Approach:** Faire du provisionnement d'une base « Planif » sous une page autorisée le parcours par défaut, avec confirmation explicite, identifiants Notion stables, reprise idempotente, diagnostic/réparation et statuts français. Conserver l'association d'une base existante comme option avancée.

## Boundaries & Constraints

**Always:** Utiliser `Notion-Version: 2026-03-11`, distinguer conteneur `databaseId` et table `dataSourceId`, écrire/lire les pages avec les IDs de propriétés, isoler chaque organisation et journaliser les actions d'administration. Préserver les mappings existants par un rattrapage applicatif et accepter temporairement les anciennes valeurs de statut anglaises en lecture. Demander une confirmation UI avant toute création ou réparation distante.

**Ask First:** Appliquer la migration sur Supabase distant, modifier les capacités de l'intégration publique Notion ou tester contre le workspace réel d'un utilisateur.

**Never:** Créer une base directement au retour OAuth, réessayer aveuglément un POST de création, exposer un jeton, supprimer une propriété ou convertir silencieusement une colonne d'une base existante. Ne pas retirer le mapping manuel avancé.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Première configuration | Admin connecté, page parent accessible, confirmation | Base et source créées avec six propriétés, IDs persistés, santé prête | Message français sans secret si permission insuffisante |
| Relance/concurrence | Deux confirmations ou réponse Notion ambiguë | Une seule base est retenue grâce au bail et à la redécouverte du marqueur | Reprise après expiration du bail, sans POST aveugle |
| Mapping existant | Base/source accessible avec six champs compatibles | Noms, types et IDs stables sont persistés; états invalidés si la source change | Refus précis si une propriété manque ou est incompatible |
| Dérive de schéma | Propriété renommée, supprimée, mauvais type ou option de statut absente | Diagnostic par ID; renommage absorbé; réparation explicite proposée | Base gérée réparée; base existante reçoit une nouvelle colonne non destructive si nécessaire |
| Statut bidirectionnel | Enum local ou libellé français/anglais historique | Valeur française envoyée et reconvertie vers l'enum local | Valeur inconnue ignorée sans corrompre l'entité |

</frozen-after-approval>

## Code Map

- `apps/api/src/integrations/notion/` -- contrat REST Notion, schéma géré, identifiants de propriétés et traduction des statuts.
- `apps/api/src/integrations/integrations.service.ts` -- orchestration OAuth, provisionnement avec bail, diagnostic, réparation et synchronisation.
- `apps/api/prisma/schema.prisma` et `apps/api/prisma/migrations/` -- cible Notion enrichie et état de reprise du provisionnement.
- `packages/shared/src/index.ts` -- contrats page parent, source, mapping, santé et réparation.
- `apps/web/src/components/integrations/notion-integration-panel.tsx` -- parcours automatique confirmé, option avancée et état de santé.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/integrations/notion/*`, `.env.example`, validation d'environnement -- migrer entièrement l'adaptateur et les fixtures vers 2026-03-11.
- [x] `apps/api/prisma/schema.prisma`, nouvelle migration -- ajouter source, parent, URL, mode géré, version, IDs de propriétés, santé et bail de provisionnement avec contraintes rejouables.
- [x] `packages/shared/src/index.ts`, DTO, contrôleur et client web -- exposer liste des pages, provisionnement, diagnostic et réparation avec RBAC ADMIN.
- [x] `apps/api/src/integrations/integrations.service.ts` -- implémenter association avancée, reprise anti-doublon, validation par ID, réparation non destructive et invalidation des états lors d'un changement de source.
- [x] `apps/api/src/integrations/notion/notion-mapping.ts` -- localiser les statuts aller/retour et utiliser les IDs stables pour chaque valeur de page.
- [x] `apps/web/src/components/integrations/notion-integration-panel.tsx` -- composer le parcours avec `Tabs`, `Select`, `Dialog`, `Alert`, badges et actions françaises accessibles.
- [x] Tests Notion API/service/web et documentation d'exploitation -- couvrir chaque ligne de la matrice et le rattrapage d'un ancien mapping.

**Acceptance Criteria:**
- Given un administrateur ayant autorisé une page, when il confirme la configuration gérée, then la base Planif devient synchronisable sans création ni mapping manuel.
- Given un mapping dont une propriété a dérivé, when la santé est contrôlée puis la réparation confirmée, then la synchronisation redevient possible sans supprimer les données utilisateur.
- Given une synchronisation dans les deux sens, when un statut change, then Notion affiche un libellé français et Planif conserve son enum interne.

## Spec Change Log

## Design Notes

Le marqueur de description `planif-managed:<organizationId>` sert uniquement à redécouvrir une création distante après une panne ambiguë. Un bail persistant sérialise les requêtes sans conserver une transaction PostgreSQL pendant l'appel HTTP. Le schéma géré emploie un statut Notion natif avec l'union des états de contenus et ressources; le mode avancé accepte aussi un champ `select`.

## Verification

**Commands:**
- `npm run db:generate && npm run db:validate && npm run db:verify-upgrade` -- schéma et migration valides depuis une base existante.
- `npm run test -w @content-ai/api` -- adaptateur, mapping, idempotence, santé et réparation verts.
- `npm run test -w @content-ai/web && npm run typecheck && npm run format:check` -- contrats et interface verts.

**Manual checks (if no CLI):**
- Sur un workspace de test uniquement, vérifier création confirmée, double clic, renommage/suppression d'une propriété, réparation et synchronisation des statuts français.

## Suggested Review Order

**Parcours principal**

- Orchestre confirmation, redécouverte, création unique et persistance saine.
  [`integrations.service.ts:338`](../../apps/api/src/integrations/integrations.service.ts#L338)

- Présente le mode automatique recommandé tout en conservant le mapping avancé.
  [`notion-integration-panel.tsx:92`](../../apps/web/src/components/integrations/notion-integration-panel.tsx#L92)

**Résilience et idempotence**

- Rend le POST ambigu non rejouable et sélectionne une source déterministe.
  [`notion.adapter.ts:146`](../../apps/api/src/integrations/notion/notion.adapter.ts#L146)

- Redécouvre exactement le marqueur ou refuse les bases concurrentes ambiguës.
  [`notion.adapter.ts:197`](../../apps/api/src/integrations/notion/notion.adapter.ts#L197)

- Vérifie le bail puis persiste mapping et audit dans une transaction atomique.
  [`integrations.service.ts:1517`](../../apps/api/src/integrations/integrations.service.ts#L1517)

- Sérialise les essais multi-instance avec expiration calculée par PostgreSQL.
  [`integrations.service.ts:1668`](../../apps/api/src/integrations/integrations.service.ts#L1668)

**Schéma stable et réparation**

- Stocke source, parent, IDs stables, santé persistée et bail de reprise.
  [`schema.prisma:702`](../../apps/api/prisma/schema.prisma#L702)

- Migre les mappings existants sans imposer immédiatement un nouveau mapping.
  [`migration.sql:1`](../../apps/api/prisma/migrations/20260715160000_managed_notion_database/migration.sql#L1)

- Détecte suppressions, types incompatibles et options de statut absentes par ID.
  [`integrations.service.ts:2141`](../../apps/api/src/integrations/integrations.service.ts#L2141)

- Répare sans suppression, réutilise les colonnes compatibles et préserve les options.
  [`integrations.service.ts:2214`](../../apps/api/src/integrations/integrations.service.ts#L2214)

**Contrat Notion et statuts**

- Écrit les pages avec IDs de propriétés et libellés français.
  [`notion-mapping.ts:104`](../../apps/api/src/integrations/notion/notion-mapping.ts#L104)

- Accepte aussi les anciennes valeurs anglaises lors des synchronisations entrantes.
  [`notion-mapping.ts:189`](../../apps/api/src/integrations/notion/notion-mapping.ts#L189)

- Expose provisionnement, diagnostic et réparation uniquement aux administrateurs.
  [`integrations.controller.ts:86`](../../apps/api/src/integrations/integrations.controller.ts#L86)

- Formalise database, data source, santé et résultat de provisionnement partagés.
  [`index.ts:760`](../../packages/shared/src/index.ts#L760)

**Tests et exploitation**

- Prouve redécouverte anti-doublon, bail perdu et réparation non destructive.
  [`integrations.service.spec.ts:364`](../../apps/api/src/integrations/integrations.service.spec.ts#L364)

- Vérifie marqueur exact, ambiguïtés et absence de rejeu après création.
  [`notion.adapter.spec.ts:165`](../../apps/api/src/integrations/notion/notion.adapter.spec.ts#L165)

- Documente capacités Notion, migration et procédure de contrôle opérationnelle.
  [`integrations.md:1`](../operations/integrations.md#L1)
