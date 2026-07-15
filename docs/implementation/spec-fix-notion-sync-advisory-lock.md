---
title: 'Corriger le verrou de synchronisation Notion'
type: 'bugfix'
created: '2026-07-15'
status: 'done'
route: 'one-shot'
---

# Corriger le verrou de synchronisation Notion

## Intent

**Problem:** Prisma 7 échoue avec `P2010` lorsqu'il désérialise le résultat `void` de `pg_advisory_xact_lock`, empêchant chaque élément d'atteindre la synchronisation Notion.

**Approach:** Convertir explicitement le résultat du verrou en texte, puis verrouiller ce contrat avec un test ciblé et une validation réelle sur PostgreSQL.

## Suggested Review Order

**Correction du verrou**

- Rend le résultat PostgreSQL compatible avec la désérialisation Prisma sans changer le verrouillage.
  [`integrations.service.ts:891`](../../apps/api/src/integrations/integrations.service.ts#L891)

**Non-régression**

- Aligne le faux résultat du test sur le contrat réel de la requête.
  [`integrations.service.spec.ts:57`](../../apps/api/src/integrations/integrations.service.spec.ts#L57)

- Vérifie la requête corrigée et un verrou acquis pour chacun des deux exports.
  [`integrations.service.spec.ts:85`](../../apps/api/src/integrations/integrations.service.spec.ts#L85)

**Suivi**

- Consigne les améliorations structurelles hors périmètre relevées pendant la revue.
  [`deferred-work.md:5`](./deferred-work.md#L5)
