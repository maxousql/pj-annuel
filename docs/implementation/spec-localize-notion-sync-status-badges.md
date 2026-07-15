---
title: 'Localiser les badges de synchronisation Notion'
type: 'feature'
created: '2026-07-15'
status: 'done'
route: 'one-shot'
---

# Localiser les badges de synchronisation Notion

## Intent

**Problem:** Les journaux de synchronisation exposaient des statuts et opérations techniques en anglais, avec des couleurs inversant la perception du succès et de l'échec.

**Approach:** Présenter tous les statuts et compteurs en français, puis appliquer des variantes de badge sémantiques vertes, orange et rouges avec un contraste accessible.

## Suggested Review Order

**Présentation des journaux**

- Branche les libellés français et les variantes sémantiques dans chaque journal Notion.
  [`notion-integration-panel.tsx:369`](../../apps/web/src/components/integrations/notion-integration-panel.tsx#L369)

- Centralise statuts, opérations, pluriels et repli défensif dans une couche testable.
  [`notion-status.ts:8`](../../apps/web/src/lib/integrations/notion-status.ts#L8)

**Sémantique visuelle**

- Ajoute des variantes succès et avertissement contrastées au composant Badge partagé.
  [`badge.tsx:16`](../../apps/web/src/components/ui/badge.tsx#L16)

- Expose les couleurs sémantiques et leurs premiers plans accessibles à Tailwind.
  [`globals.css:52`](../../apps/web/src/app/globals.css#L52)

**Non-régression**

- Vérifie les traductions, le repli inconnu et les accords singulier-pluriel.
  [`notion-status.test.ts:1`](../../apps/web/src/lib/integrations/notion-status.test.ts#L1)
