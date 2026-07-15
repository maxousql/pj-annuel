---
title: 'Centre de compte personnel enrichi'
type: 'feature'
created: '2026-07-15'
status: 'done'
baseline_commit: '547db14'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** L’identité de la barre supérieure n’est pas interactive et affiche un rôle codé en dur. `/app/settings` se limite à quelques champs malgré les informations personnelles et d’activité déjà disponibles, sans changement de mot de passe.

**Approach:** Rendre l’identité navigable, afficher le rôle réel, puis construire un centre de compte responsive regroupant identité, sécurité, organisations et statistiques calculées depuis les données existantes.

## Boundaries & Constraints

**Always:** Diriger nom, rôle et avatar vers `/app/settings` ; afficher en français le rôle de l’organisation active et garder la déconnexion séparée ; agréger uniquement les enregistrements attribués à l’utilisateur authentifié ; distinguer idées proposées par l’IA, idées enregistrées, contenus créés, générations IA et réactions ; afficher date d’inscription, fournisseurs et appartenances actives ; vérifier le mot de passe actuel et réutiliser la politique existante ; expliquer le cas Google sans identifiants ; ne jamais exposer de donnée d’authentification sensible ; conserver design Content AI, responsive, français, clavier, focus et états complets.

**Ask First:** Modifier l’email ; ajouter une réinitialisation par email ; invalider les sessions existantes ; créer une migration uniquement pour un indicateur.

**Never:** Présenter une statistique organisationnelle comme personnelle ; estimer une attribution absente ; changer un mot de passe sans réauthentification ; contourner Google ; mêler la suppression aux actions principales.

## I/O & Edge-Case Matrix

| Scénario | Entrée / état | Résultat attendu | Gestion d’erreur |
|---|---|---|---|
| Accès | Clic identité | Navigation vers `/app/settings` | Déconnexion indépendante |
| Rôle | ADMIN, EDITOR, READER ou absent | Administrateur, Éditeur, Lecteur ou Compte personnel | Aucun libellé codé en dur |
| Activité | Historique présent ou vide | Indicateurs personnels réels ou zéro | Jamais d’estimation |
| Mot de passe | Ancien correct, nouveau conforme et confirmé | Hash remplacé, champs vidés | Ancien incorrect : aucun changement |
| Google seul | Aucun compte CREDENTIALS | Explication sans formulaire local | Aucun mot de passe implicite |
| Profil | Nom ou avatar valide | Page et barre supérieure actualisées | Anciennes valeurs conservées sur erreur |

</frozen-after-approval>

## Code Map

- `apps/web/src/components/shell/user-menu.tsx`, `app-shell.tsx` -- accès compte et rôle actif.
- `apps/web/src/components/settings/profile-settings.tsx`, `app/settings/page.tsx` -- centre de compte.
- `apps/web/src/lib/auth/client.ts`, `lib/organizations/roles.ts` -- clients et libellés partagés.
- `apps/api/src/auth/auth.controller.ts`, `auth.service.ts` -- synthèse et sécurité personnelles.
- `apps/api/src/auth/dto/change-password.dto.ts` -- validation des mots de passe.
- `packages/shared/src/index.ts` -- contrat API/web.
- `apps/api/test/auth.e2e-spec.ts`, `e2e/jury-journey.spec.ts` -- non-régression API et navigateur.

## Tasks & Acceptance

**Execution:**
- [x] `packages/shared/src/index.ts` -- définir profil, appartenances, fournisseurs et statistiques.
- [x] `apps/api/src/auth/dto/change-password.dto.ts`, `auth.controller.ts`, `auth.service.ts` -- exposer synthèse et changement réauthentifié sans migration.
- [x] `apps/api/test/auth.e2e-spec.ts` et tests ciblés -- couvrir agrégats, erreur, politique, succès et Google seul.
- [x] `apps/web/src/lib/auth/client.ts`, `lib/organizations/roles.ts` -- encapsuler les appels et centraliser les rôles.
- [x] `apps/web/src/components/shell/user-menu.tsx`, `app-shell.tsx` -- rendre l’identité navigable avec rôle réel.
- [x] `apps/web/src/components/settings/profile-settings.tsx`, `app/settings/page.tsx` -- composer résumé, KPI, identité, sécurité, organisations et suppression.
- [x] `e2e/jury-journey.spec.ts` -- vérifier navigation et états principaux.

**Acceptance Criteria:**
- Given un utilisateur dans une organisation, when il clique sur son identité dans la barre supérieure, then `/app/settings` s’ouvre et le rôle affiché correspond à son rôle réel.
- Given un utilisateur authentifié, when le centre charge, then chaque indicateur porte son identifiant et ses organisations actives listent leur rôle.
- Given un compte CREDENTIALS, when l’ancien mot de passe est correct et le nouveau conforme confirmé, then seul le nouveau permet ensuite la connexion.
- Given un compte Google seul, when la sécurité s’affiche, then aucun formulaire local n’est proposé et Google est expliqué.
- Given une erreur réseau ou de validation, when une action échoue, then la page reste exploitable, conserve les données non sensibles et présente une erreur compréhensible.

## Spec Change Log

## Design Notes

La page se lit comme un centre de compte : résumé identitaire, quatre KPI, puis identité, sécurité et organisations. Les réactions restent secondaires et la suppression, isolée en fin de page. Utiliser surfaces papier, accents rouge/bleu, rayons et ombres actuels.

## Verification

**Commands:**
- `npm run lint` -- formatage et types valides sur tous les workspaces.
- `npm run test -w @content-ai/api` -- sécurité et agrégats personnels couverts.
- `npm run test -w @content-ai/web` -- clients, rôles et états frontend couverts.
- `npm run build` -- build de production complet.
- `npm run test:e2e` avec une base locale isolée -- navigation profil et parcours de mot de passe validés.

**Manual checks:**
- Vérifier la page à 320 px, 768 px et grand écran, avec compte CREDENTIALS, compte Google et utilisateur sans activité.

## Suggested Review Order

**Expérience du compte**

- Point d’entrée principal : états, KPI, formulaires et zone sensible unifiés.
  [`profile-settings.tsx:62`](../../apps/web/src/components/settings/profile-settings.tsx#L62)

- L’identité complète devient un accès clavier vers les paramètres personnels.
  [`user-menu.tsx:17`](../../apps/web/src/components/shell/user-menu.tsx#L17)

- L’organisation d’origine reste active en quittant une route organisationnelle.
  [`app-navigation.ts:124`](../../apps/web/src/lib/navigation/app-navigation.ts#L124)

**Données et sécurité**

- La synthèse filtre les organisations actives et agrège les idées réellement produites.
  [`auth.service.ts:167`](../../apps/api/src/auth/auth.service.ts#L167)

- Le changement réauthentifié résiste aux écritures concurrentes et à la troncature bcrypt.
  [`auth.service.ts:316`](../../apps/api/src/auth/auth.service.ts#L316)

- Chaque génération mémorise le nombre d’idées validées, jamais le nombre demandé.
  [`content-generation.service.ts:307`](../../apps/api/src/ai/content-generation.service.ts#L307)

- Les routes protégées exposent synthèse et rotation du mot de passe.
  [`auth.controller.ts:90`](../../apps/api/src/auth/auth.controller.ts#L90)

**Contrats et vérification**

- Le contrat partagé formalise fournisseurs, appartenances et statistiques personnelles.
  [`index.ts:595`](../../packages/shared/src/index.ts#L595)

- Le parcours API prouve ancien mot de passe, politique et nouvelle connexion.
  [`auth.e2e-spec.ts:127`](../../apps/api/test/auth.e2e-spec.ts#L127)

- Le parcours navigateur contrôle navigation, rôle et sections principales du compte.
  [`jury-journey.spec.ts:3`](../../e2e/jury-journey.spec.ts#L3)
