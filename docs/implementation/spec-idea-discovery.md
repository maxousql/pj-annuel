---
title: 'Découverte personnalisée d’idées éditoriales'
type: 'feature'
created: '2026-07-15'
status: 'done'
baseline_commit: '932804d'
context:
  - '{project-root}/docs/specs/10-features-mvp/03-generation-idees.md'
  - '{project-root}/docs/specs/10-features-mvp/02-contexte-editorial.md'
  - '{project-root}/docs/specs/10-features-mvp/05-historique-anti-doublon.md'
  - '{project-root}/docs/implementation/spec-production-roadmap-completion.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** La génération actuelle demande un brief puis affiche une liste statique ; elle ne permet pas d’évaluer rapidement des propositions ni d’apprendre les préférences éditoriales réelles de l’organisation.

**Approach:** Ajouter « Découvrir » dans le module Idées : une pile de candidats générés à partir du contexte éditorial, évaluables par « À garder », « Pas pour nous » ou « Passer ». Les réactions qualifiées alimentent un profil organisationnel explicable, utilisé pour les générations suivantes tout en conservant une part d’exploration.

## Boundaries & Constraints

**Always:** Isoler toutes les données par organisation et réserver génération/réaction aux éditeurs et administrateurs ; enregistrer l’utilisateur source sans créer de profil personnel ; séparer les candidats temporaires des idées sauvegardées ; traiter « Passer » comme neutre ; rendre la conservation et les réactions idempotentes ; empêcher la reproposition d’un même candidat ; conserver environ 20 % de propositions exploratoires ; afficher et permettre de réinitialiser les préférences apprises ; utiliser le contexte d’onboarding comme contrainte forte et les préférences comme signal souple ; réutiliser l’interface et les composants actuels comme référence visuelle.

**Ask First:** Appliquer la migration à une base distante ; ajouter un service externe, des embeddings ou un modèle entraîné ; passer d’un profil organisationnel à une personnalisation individuelle ; supprimer l’historique de réactions plutôt que réinitialiser seulement l’apprentissage.

**Never:** Employer la marque ou le vocabulaire Tinder dans le produit ; modifier automatiquement le contexte éditorial déclaré ; sauvegarder un candidat dans `ContentIdea` avant « À garder » ; apprendre à partir d’un simple affichage ou d’un passage neutre ; masquer une alerte de doublon ; utiliser le nombre de cartes parcourues comme métrique de succès.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Résultat attendu | Gestion d’erreur |
|---|---|---|---|
| Premier usage | Contexte éditorial, aucun candidat | Génération d’un lot structuré avec 1 candidat exploratoire sur 5 | Échec IA visible, aucun candidat partiel persisté |
| Conservation | Candidat actif, clic « À garder » | Réaction positive et une seule idée `SAVED` créée | Rejeu/concurrence retourne la même idée |
| Refus qualifié | Candidat actif, motif facultatif | Réaction négative et profil recalculé | Motif invalide refusé sans perdre la carte |
| Passage | Candidat actif | Carte retirée pour l’utilisateur, profil inchangé | Rejeu idempotent |
| Nouveau lot | Réactions positives/négatives existantes | Prompt influencé par thèmes/formats appréciés ou évités | Profil absent revient au contexte seul |
| Réinitialisation | Profil appris existant | Compteurs remis à zéro, réactions historiques conservées | Le flux reste utilisable immédiatement |
| Doublon | Candidat proche de l’historique ou déjà généré | Alerte affichée ; empreinte identique non recréée | Les autres candidats du lot restent disponibles |

</frozen-after-approval>

## Code Map

- `apps/api/prisma/schema.prisma` et `apps/api/prisma/migrations/` -- candidats, réactions et profil organisationnel.
- `apps/api/src/ideas/` -- génération du flux, idempotence, feedback, agrégation et RBAC.
- `apps/api/src/ai/ai.types.ts`, `apps/api/src/ai/prompt-templates.ts` -- injection contrôlée des préférences et exploration.
- `packages/shared/src/index.ts` -- contrats partagés du flux Découvrir.
- `apps/web/src/lib/ideas/client.ts` -- appels du nouveau contrat API.
- `apps/web/src/components/ideas/` -- pile de cartes, motifs de refus et panneau de préférences.
- `apps/web/src/app/(app)/app/[organizationSlug]/ideas/page.tsx` -- intégration de l’onglet Découvrir.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/prisma/schema.prisma`, nouvelle migration -- ajouter `IdeaDiscoveryCandidate`, `IdeaDiscoveryFeedback`, `IdeaPreferenceProfile`, enums, relations, index et contraintes d’unicité.
- [x] `packages/shared/src/index.ts`, `apps/api/src/ideas/dto/` -- définir les signaux, motifs, candidats, profil et entrées validées.
- [x] `apps/api/src/ideas/ideas.service.ts`, `ideas.controller.ts` -- exposer lecture/génération/réaction/réinitialisation et recalculer un profil explicable sans contamination inter-organisation.
- [x] `apps/api/src/ai/ai.types.ts`, `prompt-templates.ts` -- intégrer le résumé de préférences, la diversité et versionner le prompt.
- [x] `apps/web/src/lib/ideas/client.ts`, `apps/web/src/components/ideas/` -- livrer une pile accessible, les trois actions, les motifs, les états de chargement/erreur et le résumé réinitialisable.
- [x] `apps/web/src/app/(app)/app/[organizationSlug]/ideas/page.tsx` -- proposer « Découvrir » au sein d’Idées tout en conservant la génération manuelle existante.
- [x] Tests API/web/E2E ciblés -- couvrir la matrice, le RBAC, l’isolation, l’idempotence et la neutralité de « Passer ».

**Acceptance Criteria:**
- Given une organisation configurée, when un éditeur ouvre « Découvrir », then il obtient des cartes pertinentes sans saisir de brief.
- Given plusieurs réactions qualifiées, when un nouveau lot est généré, then les préférences agrégées apparaissent dans le prompt et le profil affiché.
- Given une idée conservée, when l’utilisateur la retrouve dans les idées sauvegardées, then elle peut être transformée en contenu comme toute autre idée.
- Given deux organisations ou un lecteur, when le flux est appelé, then aucune donnée ne fuit et les mutations interdites sont refusées.

## Spec Change Log

## Design Notes

Le premier niveau reste volontairement interprétable : pondérations par thématique et format, décroissance par réinitialisation, puis injection textuelle dans le prompt. Aucun entraînement n’est nécessaire. La carte explique sa pertinence via la justification existante ; une proposition exploratoire est signalée discrètement. Le profil est organisationnel, mais chaque réaction conserve son auteur afin de permettre une évolution ultérieure sans migration destructive.

## Verification

**Commands:**
- `npm run db:generate && npm run db:validate` -- schéma et client Prisma valides.
- `npm run lint` -- formatage et types verts.
- `npm run test` -- suites API et web vertes.
- `npm run test:e2e:smoke` -- contrôles navigateur publics desktop/mobile verts.
- `npm run test:e2e` -- parcours Idées/Découvrir mis à jour ; exécution locale conditionnée à `E2E_DATABASE_URL`.
- `npm run build` -- build production complet vert.

**Manual checks:**
- Vérifier sur mobile et desktop la navigation au clavier, le focus, les motifs de refus, l’alerte doublon et la réinitialisation du profil.

## Suggested Review Order

**Flux métier et garanties**

- Point d’entrée central : lots, idempotence, isolation et apprentissage explicable.
  [`ideas.service.ts:108`](../../apps/api/src/ideas/ideas.service.ts#L108)

- Les routes bornent chaque action aux rôles éditeur et administrateur.
  [`ideas.controller.ts:55`](../../apps/api/src/ideas/ideas.controller.ts#L55)

- La transaction transforme un « À garder » en une seule idée sauvegardée.
  [`ideas.service.ts:264`](../../apps/api/src/ideas/ideas.service.ts#L264)

- Le recalcul distingue préférences de thème, format et passages neutres.
  [`ideas.service.ts:549`](../../apps/api/src/ideas/ideas.service.ts#L549)

**Persistance et génération**

- Trois modèles séparent candidats temporaires, réactions et profil organisationnel.
  [`schema.prisma:422`](../../apps/api/prisma/schema.prisma#L422)

- La migration ajoute contraintes d’unicité, cohérence locataire et sécurité SQL.
  [`migration.sql:1`](../../apps/api/prisma/migrations/20260715170000_idea_discovery/migration.sql#L1)

- Le prompt applique les préférences comme signaux souples avec 20 % d’exploration.
  [`prompt-templates.ts:59`](../../apps/api/src/ai/prompt-templates.ts#L59)

**Expérience utilisateur**

- Les onglets préservent l’espace existant et ouvrent la nouvelle découverte.
  [`ideas-module-workspace.tsx:14`](../../apps/web/src/components/ideas/ideas-module-workspace.tsx#L14)

- La pile gère chargement, réactions, motifs, erreurs et changement d’organisation.
  [`idea-discovery-workspace.tsx:92`](../../apps/web/src/components/ideas/idea-discovery-workspace.tsx#L92)

- La carte rend doublons, exploration et actions accessibles sans geste caché.
  [`idea-discovery-workspace.tsx:432`](../../apps/web/src/components/ideas/idea-discovery-workspace.tsx#L432)

**Contrats et vérifications**

- Les contrats partagés stabilisent candidats, profil et résultat des réactions.
  [`index.ts:120`](../../packages/shared/src/index.ts#L120)

- Les tests métier couvrent lot atomique, rejouabilité et conflits concurrents.
  [`ideas.service.spec.ts:11`](../../apps/api/src/ideas/ideas.service.spec.ts#L11)

- Le parcours navigateur valide découverte, conservation puis génération de contenu.
  [`jury-journey.spec.ts:40`](../../e2e/jury-journey.spec.ts#L40)
