---
title: 'Liste collaborative et paginée des idées sauvegardées'
type: 'feature'
created: '2026-07-16'
status: 'done'
baseline_commit: '8f1eb108a3f2f05290ea730bc5a4a219a9fdc1bc'
context:
  - '{project-root}/docs/implementation/spec-idea-discovery.md'
  - '{project-root}/docs/implementation/spec-fluid-idea-discovery-ui.md'
---

<frozen-after-approval reason="human-owned intent - do not modify unless human renegotiates">

## Intent

**Problem:** La section des idées sauvegardées affiche toute la collection dans une seule longue liste, utilise plusieurs libellés français sans accents et empile trois actions dans une colonne peu lisible. Elle ne permet pas non plus d'identifier le membre ayant sauvegardé chaque idée.

**Approach:** Paginer localement la collection existante par groupes de six afin de préserver la recherche globale et la détection des idées déjà sauvegardées, exposer l'auteur déjà enregistré par `createdById`, puis recomposer chaque carte avec un pied d'actions horizontal et une métadonnée d'auteur explicite.

## Boundaries & Constraints

**Always:** Conserver la route et le chargement actuels des idées ; afficher six cartes maximum par page avec total, page courante, précédent et suivant ; revenir à la première page après une sauvegarde et borner la page après un archivage ; corriger les accents de tous les textes visibles dans l'espace « Créer et gérer » ; afficher le nom du créateur et un état compréhensible si le compte n'existe plus ; garder « Transformer » comme action primaire bleue avec texte blanc conforme AA ; placer la métadonnée auteur/date à gauche et les trois actions à droite sur le même axe vertical lorsque la largeur de la carte le permet, avec un repli compact sans chevauchement sinon ; préserver le clavier, le focus, les états désactivés et les permissions existantes.

**Ask First:** Remplacer la pagination locale par une pagination serveur ; modifier le schéma Prisma ; masquer une action existante dans un menu ; changer les statuts ou les permissions métier.

**Never:** Charger une seconde fois les idées pour paginer ; casser la recherche globale de la barre de navigation ; attribuer une sauvegarde à un autre utilisateur ; afficher une adresse email ; rendre les actions illisibles ou débordantes sur mobile ; toucher à `outputs/`.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Résultat attendu | Gestion d'erreur |
|---|---|---|---|
| Collection longue | 21 idées actives | 6 cartes au plus et 4 pages, avec total inchangé | Les contrôles restent bornés entre 1 et 4 |
| Nouvelle sauvegarde | Utilisateur situé sur une page ultérieure | Nouvelle idée ajoutée et retour page 1 | L'échec conserve la page et affiche le message existant |
| Archivage en fin de liste | Dernière carte de la dernière page | Retour automatique à la dernière page encore valide | L'échec conserve la carte et la page |
| Auteur disponible | Relation `createdBy` présente | Nom du membre affiché avec la date | Aucun email exposé |
| Auteur supprimé | Relation `createdBy` nulle | Libellé « Membre indisponible » | La carte et ses actions restent utilisables |

</frozen-after-approval>

## Code Map

- `packages/shared/src/index.ts` -- contrat de l'auteur d'une idée sauvegardée.
- `apps/api/src/ideas/ideas.service.ts` -- projection Prisma et sérialisation de `createdBy`.
- `apps/web/src/components/contents/content-labels.ts` -- libellés de statuts français centralisés.
- `apps/web/src/lib/ideas/saved-ideas-pagination.ts` -- pagination pure et bornage après mutation.
- `apps/web/src/components/ideas/ideas-workspace.tsx` -- textes, pagination, auteur et composition des actions.
- `apps/api/src/ideas/ideas.service.spec.ts`, `apps/web/src/lib/ideas/saved-ideas-pagination.test.ts` -- garanties de sérialisation et de pagination.

## Tasks & Acceptance

**Execution:**
- [x] `packages/shared/src/index.ts`, `apps/api/src/ideas/ideas.service.ts` -- ajouter un auteur minimal nullable (`id`, `name`) au payload sans migration ni donnée personnelle superflue.
- [x] `apps/web/src/components/contents/content-labels.ts`, `apps/web/src/components/ideas/ideas-workspace.tsx` -- corriger les accents, afficher auteur et date, rendre le CTA blanc sur bleu et placer les actions dans un pied responsive.
- [x] `apps/web/src/lib/ideas/saved-ideas-pagination.ts` -- calculer une page de six éléments et borner les pages devenues invalides.
- [x] Tests ciblés API/web -- couvrir auteur présent ou supprimé, 21 éléments, première/dernière page et suppression du dernier élément.

**Acceptance Criteria:**
- Given plus de six idées sauvegardées, when l'utilisateur ouvre « Créer et gérer », then il voit au plus six cartes et peut parcourir toutes les pages sans défilement continu.
- Given une idée sauvegardée par un membre actif, when sa carte est affichée, then le nom de ce membre et la date de sauvegarde sont visibles.
- Given un écran desktop ou mobile, when les actions sont affichées, then « Transformer » reste clairement primaire, son texte est blanc, aucune action ne déborde et, sur une carte suffisamment large, la métadonnée à gauche partage le même axe vertical que les actions à droite.

## Spec Change Log

## Design Notes

Le langage papier-encre et les rayons existants sont conservés. La carte reste un bloc éditorial plein format ; son pied sépare nettement la lecture des actions. Sur mobile, « Transformer » occupe la largeur disponible et les deux actions secondaires partagent la ligne suivante ; dès que la largeur le permet, la métadonnée reste à gauche et les trois actions s'alignent à droite sur le même axe vertical. Le pied peut se replier avant tout chevauchement. Après un archivage, le focus revient au titre stable de la section. La pagination reprend le motif compact de la Bibliothèque sans ajouter de dépendance.

## Verification

**Commands:**
- `npm run test -w @content-ai/api -- --runTestsByPath src/ideas/ideas.service.spec.ts` -- sérialisation de l'auteur valide.
- `cd apps/web && npx vitest run src/lib/ideas/saved-ideas-pagination.test.ts` -- pagination et bornage valides.
- `npm run lint` -- formatage et types valides.
- `npm run test` -- absence de régression API/web.
- `npm run build` -- build de production complet.

**Manual checks:**
- Vérifier la section à 320 px, 768 px et grand écran avec 1, 6, 7 et 21 idées ; contrôler les accents, le focus, le contraste du CTA et l'auteur nullable.

## Suggested Review Order

**Expérience des idées sauvegardées**

- Centralise la liste, la pagination et le pied de carte responsive.
  [`ideas-workspace.tsx:521`](../../apps/web/src/components/ideas/ideas-workspace.tsx#L521)

- Aligne les métadonnées à gauche et les actions à droite sans chevauchement.
  [`ideas-workspace.tsx:781`](../../apps/web/src/components/ideas/ideas-workspace.tsx#L781)

- Affiche l'auteur, la date et un repli explicite si le membre manque.
  [`ideas-workspace.tsx:634`](../../apps/web/src/components/ideas/ideas-workspace.tsx#L634)

- Maintient le focus après archivage pour préserver la navigation clavier.
  [`ideas-workspace.tsx:206`](../../apps/web/src/components/ideas/ideas-workspace.tsx#L206)

**Pagination robuste**

- Isole le découpage par six et borne toutes les entrées numériques.
  [`saved-ideas-pagination.ts:1`](../../apps/web/src/lib/ideas/saved-ideas-pagination.ts#L1)

- Rend les contrôles visibles et compréhensibles sur chaque collection non vide.
  [`ideas-workspace.tsx:652`](../../apps/web/src/components/ideas/ideas-workspace.tsx#L652)

**Contrat collaboratif**

- Limite l'auteur exposé à son identifiant et son nom.
  [`index.ts:331`](../../packages/shared/src/index.ts#L331)

- Charge et sérialise explicitement l'auteur nullable côté API.
  [`ideas.service.ts:683`](../../apps/api/src/ideas/ideas.service.ts#L683)

- Centralise les statuts féminisés et accentués des idées.
  [`content-labels.ts:28`](../../apps/web/src/components/contents/content-labels.ts#L28)

**Garanties automatisées**

- Vérifie l'auteur présent, supprimé et la projection minimale Prisma.
  [`ideas.service.spec.ts:10`](../../apps/api/src/ideas/ideas.service.spec.ts#L10)

- Couvre 21 idées, les bornes et le recul après archivage.
  [`saved-ideas-pagination.test.ts:9`](../../apps/web/src/lib/ideas/saved-ideas-pagination.test.ts#L9)
