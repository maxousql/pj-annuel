---
title: 'Réparer le contrôle CI de formatage et de types'
type: 'bugfix'
created: '2026-07-15'
status: 'done'
route: 'one-shot'
---

# Réparer le contrôle CI de formatage et de types

## Intent

**Problem:** La CI s'arrête pendant `npm run lint` parce que dix composants ne respectent plus le formatage Prettier. Une fois ce blocage levé, deux erreurs TypeScript du même lot empêchent encore le contrôle de réussir.

**Approach:** Reformater uniquement les composants signalés, restaurer l'import `EmptyState` manquant et accepter explicitement la valeur nullable du composant `Select`, puis vérifier la commande CI complète et les tests web.

## Suggested Review Order

**Corrections TypeScript**

- Restaure le composant réellement rendu par l'état vide de l'historique.
  [`history-workspace.tsx:20`](../../apps/web/src/components/history/history-workspace.tsx#L20)

- Ignore proprement l'absence de sélection autorisée par le contrat UI.
  [`organization-switcher.tsx:34`](../../apps/web/src/components/shell/organization-switcher.tsx#L34)

**Formatage CI**

- Normalise les imports et le JSX du formulaire d'authentification.
  [`auth-form.tsx:3`](../../apps/web/src/components/auth-form.tsx#L3)

- Normalise les expressions multilignes de suppression de compte.
  [`profile-settings.tsx:115`](../../apps/web/src/components/settings/profile-settings.tsx#L115)
