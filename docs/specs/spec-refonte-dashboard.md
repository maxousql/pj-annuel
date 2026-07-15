---
title: "Refonte visuelle du dashboard"
type: "refactor"
created: "2026-07-15"
status: "done"
route: "one-shot"
---

# Refonte visuelle du dashboard

## Intent

**Problem:** Le dashboard reposait sur une palette bleue et violette très présente, des cartes massives et des indicateurs de performance reconstruits sans données analytiques réelles.

**Approach:** Recomposer la page autour d'une palette papier, encre et sauge, avec une hiérarchie plus compacte et uniquement des indicateurs issus du résumé API existant.

## Suggested Review Order

**Structure et données**

- La composition principale regroupe priorités, pipeline, activité et sujets sans métriques inventées.
  [`dashboard-overview.tsx:109`](../../apps/web/src/components/dashboard/dashboard-overview.tsx#L109)

- Le pipeline distingue explicitement les compteurs disponibles sans assimiler tous les statuts à du publié.
  [`dashboard-overview.tsx:210`](../../apps/web/src/components/dashboard/dashboard-overview.tsx#L210)

- L'activité récente conserve les liens, statuts et libellés mobiles accessibles.
  [`dashboard-overview.tsx:465`](../../apps/web/src/components/dashboard/dashboard-overview.tsx#L465)

**États et composants**

- Le chargement utilise des squelettes fidèles à la structure finale avec une annonce accessible.
  [`dashboard-overview.tsx:553`](../../apps/web/src/components/dashboard/dashboard-overview.tsx#L553)

- La variante sauge centralise le traitement du CTA principal.
  [`button.tsx:13`](../../apps/web/src/components/ui/button.tsx#L13)

- La variante de badge sauge réserve le signal positif aux contenus publiés ou utilisés.
  [`badge.tsx:14`](../../apps/web/src/components/ui/badge.tsx#L14)
