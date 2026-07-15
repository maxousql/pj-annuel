---
title: 'Sécuriser le contexte d’animation de la découverte'
type: 'bugfix'
created: '2026-07-15'
status: 'done'
route: 'one-shot'
---

# Sécuriser le contexte d’animation de la découverte

## Intent

**Problem:** Le remplacement d’une carte appelait sa variante d’entrée sans contexte personnalisé, provoquant une erreur de déstructuration après « Pas pour nous », « Passer » ou « À garder ».

**Approach:** Fournir directement l’état d’entrée selon la préférence de mouvement et rendre les sorties tolérantes à un contexte Motion absent.

## Suggested Review Order

**Résolution des animations**

- Les résolveurs centralisés acceptent explicitement l’absence de contexte Motion.
  [`discovery-motion.ts:10`](../../apps/web/src/lib/ideas/discovery-motion.ts#L10)

- La carte fournit son état d’entrée sans dépendre du contexte personnalisé.
  [`idea-discovery-workspace.tsx:574`](../../apps/web/src/components/ideas/idea-discovery-workspace.tsx#L574)

**Non-régression**

- Les tests couvrent contexte absent, mouvement réduit et sorties gauche-droite.
  [`discovery-motion.test.ts:8`](../../apps/web/src/lib/ideas/discovery-motion.test.ts#L8)
