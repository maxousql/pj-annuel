---
title: 'Emails transactionnels aux couleurs de Content AI'
type: 'feature'
created: '2026-07-15'
status: 'done'
baseline_commit: '29d6752cbb1c010088005b89e6d4818e6a6dd1a4'
context:
  - 'docs/specs/20-features-v1/04-collaboration-invitations.md'
  - 'docs/operations/integrations.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Les emails envoyés par Content AI sont de simples fragments HTML sans identité visuelle, sans version texte et avec des données techniques peu lisibles. Le seul email réellement expédié aujourd’hui est l’invitation à rejoindre une organisation, mais sa construction doit devenir réutilisable pour les futurs messages.

**Approach:** Introduire un gabarit transactionnel commun « papier et encre », puis l’utiliser pour une invitation personnalisée, responsive et accessible. Resend recevra systématiquement un sujet, un corps HTML robuste et une alternative texte équivalente.

## Boundaries & Constraints

**Always:** Reprendre la marque active — papier `#F6F1E7`, carte `#FFFDF7`, encre `#17130F`, vermillon `#D8401F` — avec le wordmark texte `Content AI.` ; utiliser tableaux de présentation, styles inline, couleurs littérales et polices système pour Gmail, Outlook et mobile ; conserver une lecture correcte quand les styles sont retirés ; personnaliser l’invitant, l’organisation, le rôle français, l’expiration lisible et le CTA ; fournir le lien complet dans le texte et en secours dans le HTML ; échapper toute valeur dynamique ; garder le mode console sans réseau ni fuite du lien ; normaliser les erreurs réseau/provider sans exposer leur corps au destinataire.

**Ask First:** Ajouter de nouveaux types d’emails, changer le domaine ou l’expéditeur, intégrer un service de templates externe, ajouter suivi d’ouverture/clic, image distante, pièce jointe ou mécanisme d’outbox.

**Never:** Déclencher un email réel pendant les tests ; utiliser JavaScript, SVG inline, police distante, variable CSS, image de fond, animation ou dépendance fragile ; transformer cette évolution visuelle en refonte de la cohérence transactionnelle des tokens ; inclure une donnée non échappée ou un lien d’invitation dans les logs.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Résultat attendu | Gestion d’erreur |
|---|---|---|---|
| Invitation Resend | Inviteur, organisation, rôle, URL et expiration valides | Sujet personnalisé, HTML Content AI et texte brut équivalent | Timeout de 10 s conservé |
| Valeurs hostiles | Balises, guillemets, esperluettes dans les champs | Aucun HTML injecté, contenu lisible dans les deux versions | Échappement centralisé |
| Rôle et date | ADMIN, EDITOR ou READER ; date UTC | Libellé français et date longue avec fuseau explicite | Rôle inconnu présenté sans casser le message |
| Provider console | Développement sans envoi | Adresse masquée et organisation seulement | Aucun appel réseau, aucun token journalisé |
| Échec Resend | Réponse non-2xx, réseau ou timeout | Exception publique générique | Journal technique borné, sans corps distant brut |

</frozen-after-approval>

## Code Map

- `apps/api/src/invitations/invitation-email.service.ts` -- provider Resend/console et payload actuellement envoyé.
- `apps/api/src/invitations/invitations.service.ts` -- personnalisation, URL et expiration transmises au mail.
- `apps/api/src/invitations/invitations.module.ts` -- enregistrement du service d’envoi.
- `apps/web/src/app/globals.css`, `apps/web/src/components/brand/logo.tsx` -- palette et marque actives à traduire sans dépendance web.
- `apps/api/src/invitations/invitations.service.spec.ts` -- conventions et garanties transactionnelles déjà couvertes.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/common/email/transactional-email.ts` -- créer le renderer partagé HTML/texte, l’échappement et les primitives structurées sûres.
- [x] `apps/api/src/invitations/invitation-email.template.ts` -- composer le contenu personnalisé, localiser rôle/date et définir sujet/préheader.
- [x] `apps/api/src/invitations/invitation-email.service.ts` -- envoyer `html` et `text`, conserver console/timeout et normaliser les pannes sans journaliser le corps distant.
- [x] `apps/api/src/invitations/invitation-email.service.spec.ts` -- couvrir marque, personnalisation, XSS, texte, console, configuration et erreurs avec `fetch` mocké.
- [x] `docs/operations/integrations.md` -- documenter le contrat HTML/texte et la recette sur une adresse autorisée.

**Acceptance Criteria:**
- Given une invitation valide, when Resend est appelé, then son payload contient un sujet contextualisé, un HTML Content AI et un texte brut avec les mêmes informations et le même lien.
- Given un champ dynamique hostile, when le message est rendu, then aucune balise injectée ni attribut exécutable n’apparaît dans le HTML.
- Given un client mail étroit ou sans CSS, when l’email est affiché, then marque, hiérarchie, CTA, URL de secours et expiration restent compréhensibles.
- Given un provider console ou une panne Resend, when l’envoi est tenté, then aucun appel réel non autorisé ni secret/lien n’est journalisé et l’erreur applicative reste générique.

## Spec Change Log

## Design Notes

Le mail reprend l’esthétique éditoriale actuelle plutôt que l’ancien thème sombre : fond papier, en-tête typographique, filet d’encre, rubrique vermillon, carte ivoire et CTA encre avec accent vermillon. Le cachet SVG de l’application est remplacé par un astérisque texte cerclé, plus fiable dans Outlook. Largeur maximale 620 px, corps 16 px, CTA d’au moins 44 px et aucun élément indispensable uniquement coloré.

## Verification

**Commands:**
- `npm run lint` -- formatage et types valides.
- `npm run test -w @content-ai/api` -- renderer et provider couverts sans réseau réel.
- `npm run build` -- compilation de production complète.

**Manual checks:**
- Ouvrir le HTML de test à 320 px et 620 px, puis sans styles, et vérifier hiérarchie, URL de secours et absence de débordement.

## Suggested Review Order

**Flux d’envoi**

- L’entrée principale assemble le message puis transmet HTML et texte à Resend.
  [`invitation-email.service.ts:33`](../../apps/api/src/invitations/invitation-email.service.ts#L33)

- Le template localise et personnalise toutes les informations propres à l’invitation.
  [`invitation-email.template.ts:21`](../../apps/api/src/invitations/invitation-email.template.ts#L21)

**Gabarit de marque**

- Le contrat partagé produit systématiquement sujet, HTML robuste et alternative texte.
  [`transactional-email.ts:34`](../../apps/api/src/common/email/transactional-email.ts#L34)

- Le HTML traduit l’identité papier-encre en tableaux et styles compatibles email.
  [`transactional-email.ts:78`](../../apps/api/src/common/email/transactional-email.ts#L78)

- La version texte conserve la hiérarchie et neutralise les caractères de contrôle.
  [`transactional-email.ts:151`](../../apps/api/src/common/email/transactional-email.ts#L151)

**Sécurité et résilience**

- Les pannes fournisseur sont normalisées sans exposer corps distant, lien ou secret.
  [`invitation-email.service.ts:64`](../../apps/api/src/invitations/invitation-email.service.ts#L64)

- Les sujets et liens sont normalisés avant toute représentation du message.
  [`transactional-email.ts:177`](../../apps/api/src/common/email/transactional-email.ts#L177)

**Preuves et exploitation**

- Les tests valident marque, accessibilité, XSS, mobile, console et erreurs provider.
  [`invitation-email.service.spec.ts:15`](../../apps/api/src/invitations/invitation-email.service.spec.ts#L15)

- La recette documente les deux représentations et interdit tout envoi réel automatisé.
  [`integrations.md:22`](../operations/integrations.md#L22)
