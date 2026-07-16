---
title: "Empêcher le débordement des cartes de veille"
type: "bugfix"
created: "2026-07-16"
status: "done"
baseline_commit: "21f9a9e36327f19bc40ca24600bf9aa5e363082f"
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Sur la page de veille, une ressource contenant une URL ou un résumé long impose sa largeur intrinsèque à la carte. La colonne d'actions est alors repoussée hors du conteneur et devient partiellement inaccessible.

**Approach:** Rendre chaque niveau de la grille compressible, réserver explicitement la colonne d'actions sur grand écran et autoriser les textes longs à se tronquer ou à revenir à la ligne sans agrandir leur parent.

## Boundaries & Constraints

**Always:** Conserver les actions visibles ; préserver la structure fonctionnelle de la page ; supporter les URL et textes sans espaces ; maintenir une disposition lisible du mobile au bureau.

**Ask First:** Toute refonte visuelle de la carte ou modification du comportement des actions.

**Never:** Masquer la carte avec un défilement horizontal global ; couper les boutons ; modifier les données ou les appels API.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Ressource standard | Titre, URL et résumé courts | Contenu et actions restent alignés dans la carte | N/A |
| Texte sans coupure | URL, titre, description ou point clé très long | Le texte se tronque ou revient à la ligne sans élargir la grille | Aucun débordement horizontal |
| Écran étroit | Largeur mobile ou intermédiaire | Les colonnes se replient et les actions occupent la largeur disponible | Les actions restent visibles et utilisables |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/curation/curation-workspace.tsx` -- grille de la page et présentation responsive des ressources collectées.
- `e2e/responsive.spec.ts` -- non-régression des limites visuelles sur bureau et mobile.

## Tasks & Acceptance

**Execution:**

- [x] `apps/web/src/components/curation/curation-workspace.tsx` -- neutraliser les largeurs intrinsèques et rendre la zone de contenu/actions responsive.
- [x] `e2e/responsive.spec.ts` -- vérifier les limites de la carte, des badges, des liens et des boutons avec des textes pathologiques.

**Acceptance Criteria:**

- Given une ressource avec une URL ou un résumé long, when la page de veille est affichée, then la carte reste dans la largeur disponible et les deux boutons restent visibles.
- Given une largeur inférieure au point de rupture bureau, when la carte est affichée, then le contenu et les actions se réorganisent sans défilement horizontal.

## Spec Change Log

## Verification

**Commands:**

- `npm run lint` -- formatage et types valides.
- `npm run test -w @content-ai/web -- --runInBand` -- tests web valides.
- `npm run build -w @content-ai/web` -- build de production valide.
- `npm run test:e2e:smoke` -- les éléments interactifs et métadonnées restent dans les limites de la carte sur bureau et mobile.

## Suggested Review Order

- La grille principale accepte de rétrécir sans transmettre une largeur intrinsèque excessive.
  [`curation-workspace.tsx:302`](../../apps/web/src/components/curation/curation-workspace.tsx#L302)

- La carte réserve les actions tout en laissant le contenu long se compresser.
  [`curation-workspace.tsx:548`](../../apps/web/src/components/curation/curation-workspace.tsx#L548)

- Les textes longs reviennent à la ligne sans repousser les limites de la carte.
  [`curation-workspace.tsx:560`](../../apps/web/src/components/curation/curation-workspace.tsx#L560)

- Le test compare chaque élément sensible aux limites réelles de la carte.
  [`responsive.spec.ts:117`](../../e2e/responsive.spec.ts#L117)
