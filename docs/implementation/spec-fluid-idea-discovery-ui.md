---
title: 'Découverte d’idées fluide et onglets adaptatifs'
type: 'bugfix'
created: '2026-07-15'
status: 'done'
baseline_commit: '22808fc'
context:
  - '{project-root}/docs/implementation/spec-idea-discovery.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les déclencheurs d’onglets dépassent actuellement de leur piste sur Notifications et Idées. Dans Découvrir, chaque réaction attend la réponse réseau avant de retirer la carte, ce qui casse le rythme, et aucune interaction gestuelle ne matérialise le choix.

**Approach:** Corriger d’abord les onglets de Notifications avec un composant segmenté adaptatif, puis réutiliser ce motif dans Idées. Transformer la pile Découvrir en cartes déplaçables horizontalement avec sortie animée et traitement optimiste : la carte suivante apparaît immédiatement, tandis que l’enregistrement continue en arrière-plan avec restauration en cas d’échec.

## Boundaries & Constraints

**Always:** Conserver les couleurs, rayons et composants Content AI ; garantir que chaque piste d’onglets grandit avec ses déclencheurs et se replie proprement sur petit écran ; associer le glissement à droite à « À garder » et celui à gauche à un refus sans motif ; garder « Passer » accessible par bouton et clavier ; faire sortir la carte après les actions visibles, y compris après confirmation d’un refus qualifié ; empêcher le double envoi d’un même candidat ; permettre plusieurs réactions successives sans verrouiller la pile ; afficher discrètement les enregistrements en cours ; restaurer une carte si sa requête échoue ; ignorer les réponses d’une organisation devenue inactive ; respecter `prefers-reduced-motion`, le focus et les annonces accessibles.

**Ask First:** Ajouter la dépendance frontend `motion` pour les valeurs de déplacement, le glisser-déposer et les transitions physiques ; modifier le contrat API ou le calcul serveur des préférences.

**Never:** Afficher la marque ou le vocabulaire Tinder dans le produit ; masquer un échec d’enregistrement ; apprendre à partir de « Passer » ; supprimer les motifs de refus existants ; bloquer toute la pile pendant une requête ; animer des propriétés autres que transformation et opacité.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Résultat attendu | Gestion d’erreur |
|---|---|---|---|
| Onglets étroits | Deux ou trois libellés, petit écran | Piste assez haute, déclencheurs lisibles sans chevauchement | Repli sur plusieurs lignes sans recouvrir le contenu |
| Geste incomplet | Déplacement sous le seuil | La carte revient à sa position | Aucun feedback envoyé |
| Choix rapide | Clic ou geste dépassant le seuil | Sortie directionnelle et carte suivante immédiate | Enregistrement signalé en arrière-plan |
| Refus qualifié | Motif choisi puis confirmé | Sortie à gauche et motif conservé | Le sélecteur reste utilisable si l’appel échoue |
| Réseau lent | Plusieurs choix successifs | Pile toujours interactive, envois indépendants | Une seule carte fautive est restaurée |
| Fin de pile | Dernière carte retirée, appels en cours | Finalisation visible avant un nouveau lot | Une carte en échec réapparaît |
| Mouvement réduit | Préférence système active | Transitions instantanées ou fondues, boutons complets | Aucun geste requis pour agir |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/ui/tabs.tsx` -- hauteur primitive responsable du débordement actuel.
- `apps/web/src/components/ui/workspace-tabs.tsx` -- motif segmenté partagé entre Notifications et Idées.
- `apps/web/src/components/notifications/notifications-workspace.tsx` -- première intégration et référence visuelle.
- `apps/web/src/components/ideas/ideas-module-workspace.tsx` -- réutilisation des onglets corrigés.
- `apps/web/src/components/ideas/idea-discovery-workspace.tsx` -- pile, gestes, transitions et traitement optimiste.
- `apps/web/src/lib/ideas/discovery-optimistic.ts` -- mises à jour déterministes, restauration et profil canonique.
- `e2e/jury-journey.spec.ts` -- parcours réel des onglets et du glissement.

## Tasks & Acceptance

**Execution:**
- [x] `apps/web/package.json`, `package-lock.json` -- ajouter `motion` après approbation pour une interaction performante fondée sur des valeurs animées.
- [x] `apps/web/src/components/ui/tabs.tsx`, `workspace-tabs.tsx` -- supprimer la hauteur fixe conflictuelle et fournir un motif adaptatif partagé.
- [x] `apps/web/src/components/notifications/notifications-workspace.tsx` -- corriger le chevauchement avant de stabiliser la référence visuelle.
- [x] `apps/web/src/components/ideas/ideas-module-workspace.tsx` -- appliquer exactement le même système d’onglets à Idées.
- [x] `apps/web/src/components/ideas/idea-discovery-workspace.tsx` -- ajouter drag, seuil, direction, boutons animés, file optimiste, restauration et états de finalisation.
- [x] `apps/web/src/lib/ideas/discovery-optimistic.ts` et tests -- couvrir retrait, restauration, réponses désordonnées et changement d’organisation.
- [x] `e2e/jury-journey.spec.ts` -- vérifier absence de chevauchement, swipe et continuité vers l’idée sauvegardée.

**Acceptance Criteria:**
- Given les pages Notifications ou Idées sur mobile et desktop, when les onglets s’affichent, then aucun déclencheur ne dépasse de la piste ni ne recouvre le panneau suivant.
- Given une carte active, when l’utilisateur la glisse à droite ou à gauche au-delà du seuil, then elle sort dans cette direction et la suivante devient immédiatement interactive.
- Given une réponse réseau lente ou en échec, when plusieurs choix sont effectués, then la pile ne se bloque pas et seule l’action échouée est restaurée avec un message clair.
- Given une navigation clavier ou une préférence de mouvement réduit, when l’utilisateur agit, then toutes les décisions restent disponibles sans dépendre du geste.

## Spec Change Log

## Design Notes

Le mouvement communique uniquement la décision et le changement d’état. La carte de tête suit le pointeur avec une légère rotation ; les cartes suivantes restent stables pour éviter un effet décoratif permanent. Les libellés directionnels apparaissent pendant le geste, puis la sortie utilise un ressort court. Le refus par bouton conserve le sélecteur de motif ; un glissement à gauche envoie un refus non qualifié, déjà autorisé par le contrat.

## Verification

**Commands:**
- `npm run lint` -- formatage et types valides.
- `npm run test -w @content-ai/web` -- logique optimiste et clients verts.
- `npm run build` -- build de production complet.
- `npm run test:e2e:smoke` -- pages publiques inchangées.
- `npm run test:e2e` avec `E2E_DATABASE_URL` -- parcours authentifié, swipe et conservation verts.

**Manual checks:**
- Vérifier le seuil de geste, le retour élastique, le contraste, le focus, le mode mouvement réduit et les onglets à 320 px, 768 px et grand écran.

## Suggested Review Order

**Interaction de découverte**

- Le traitement optimiste libère immédiatement la pile et restaure précisément les échecs.
  [`idea-discovery-workspace.tsx:234`](../../apps/web/src/components/ideas/idea-discovery-workspace.tsx#L234)

- La carte traduit gestes et boutons en sorties directionnelles accessibles.
  [`idea-discovery-workspace.tsx:570`](../../apps/web/src/components/ideas/idea-discovery-workspace.tsx#L570)

- Le sélecteur conserve les motifs de refus sans imposer le geste.
  [`idea-discovery-workspace.tsx:731`](../../apps/web/src/components/ideas/idea-discovery-workspace.tsx#L731)

**Onglets adaptatifs**

- Le motif partagé harmonise hauteur, repli mobile et états actifs.
  [`workspace-tabs.tsx:6`](../../apps/web/src/components/ui/workspace-tabs.tsx#L6)

- Notifications stabilise d’abord la référence visuelle demandée.
  [`notifications-workspace.tsx:217`](../../apps/web/src/components/notifications/notifications-workspace.tsx#L217)

- Idées réutilise le même motif et charge Découvrir à la demande.
  [`ideas-module-workspace.tsx:18`](../../apps/web/src/components/ideas/ideas-module-workspace.tsx#L18)

- La primitive accepte désormais les déclencheurs plus hauts sans débordement.
  [`tabs.tsx:26`](../../apps/web/src/components/ui/tabs.tsx#L26)

**Cohérence asynchrone et vérification**

- Les helpers isolent retrait, restauration et réponses de profil désordonnées.
  [`discovery-optimistic.ts:7`](../../apps/web/src/lib/ideas/discovery-optimistic.ts#L7)

- Le parcours navigateur vérifie onglets, seuil incomplet et glissements bilatéraux.
  [`jury-journey.spec.ts:3`](../../e2e/jury-journey.spec.ts#L3)
