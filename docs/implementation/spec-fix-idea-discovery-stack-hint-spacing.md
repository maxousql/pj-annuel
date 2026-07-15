---
title: 'Harmoniser l’espacement des indications de glissement'
type: 'bugfix'
created: '2026-07-15'
status: 'done'
route: 'one-shot'
---

# Harmoniser l’espacement des indications de glissement

## Intent

**Problem:** Les cartes d’arrière-plan occupaient l’espace inférieur de la pile et collaient les indications de glissement à son bord, alors que l’espacement était correct avec une seule carte.

**Approach:** Ajouter un retrait uniquement lorsque la pile contient plusieurs propositions, puis contrôler géométriquement cet espace dans le parcours navigateur.

## Suggested Review Order

**Espacement de la pile**

- Le retrait conditionnel compense uniquement la profondeur des cartes empilées.
  [`idea-discovery-workspace.tsx:417`](../../apps/web/src/components/ideas/idea-discovery-workspace.tsx#L417)

**Non-régression visuelle**

- Le parcours vérifie un espace minimal sous la pile avant toute interaction.
  [`jury-journey.spec.ts:51`](../../e2e/jury-journey.spec.ts#L51)

- Le contrôle géométrique reste réutilisable et indépendant du contenu.
  [`jury-journey.spec.ts:132`](../../e2e/jury-journey.spec.ts#L132)
