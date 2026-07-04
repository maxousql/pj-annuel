# Source de vérité design

## Intention

Cette source de vérité traduit les écrans Figma fournis en règles produit applicables dans l'application. Elle devient la référence pour toute refonte UI des écrans Next.js.

Le style cible est un SaaS IA premium, sombre, dense mais respirant, avec une identité "Architect AI" : fond bleu nuit, surfaces en couches, typographie forte, accents bleu pervenche et vert-lime électrique, composants arrondis, états très lisibles.

La stack UI cible est explicitement :

- **TailwindCSS** pour les tokens, le layout, les variantes responsive et les états.
- **shadcn/ui** comme base de composants React accessibles et modifiables.
- **Radix UI** via shadcn pour les primitives modales, menus, popovers, select, tabs, tooltip.
- **Icônes** via une seule librairie cohérente. Recommandation : `lucide-react`, car shadcn l'utilise naturellement.

## Écarts avec l'app actuelle

L'app actuelle est fonctionnelle mais n'est pas alignée avec le Figma.

- Le thème actuel est majoritairement clair (`#f7f8fb`, surfaces blanches), alors que le Figma est dark-first.
- Les composants sont portés par un grand `globals.css` et des classes maison (`button`, `dashboard-panel`, `field`, etc.), sans Tailwind ni shadcn.
- Les boutons actuels sont bleus sobres et rectangulaires, alors que la cible utilise des boutons plus massifs, arrondis, contrastés et parfois glow.
- Les cards actuelles utilisent `8px` de radius et une ombre légère de dashboard clair ; la cible demande des cards bleu nuit avec radius 20-24px, bordure subtile et halo.
- La navigation actuelle est horizontale, alors que le Figma privilégie un shell avec sidebar fixe à gauche, topbar de recherche et zone contenu.
- Les inputs actuels sont clairs, bordés gris ; la cible est dark, remplie, avec bordure bleu-gris et focus bleu.
- Les badges actuels sont utilitaires ; la cible utilise des pills statut avec dot colorée, fond teinté et texte uppercase/compact.
- Les tables/listes actuelles sont lisibles mais peu brandées ; la cible demande des lignes sombres, icônes contenues, scores visuels et statuts accentués.

## Couleurs

### Palette de marque

| Token                | Hex       | Usage                                                                                    |
| -------------------- | --------- | ---------------------------------------------------------------------------------------- |
| `brand.primary`      | `#4D80F0` | Accent principal, liens actifs, focus, boutons secondaires bleus, éléments graphiques IA |
| `brand.primary-soft` | `#88A8FF` | Survols, icônes sur fond sombre, badges planifiés                                        |
| `brand.lime`         | `#C3F400` | CTA principal, navigation active, chiffres clés, statut publié/planifié prioritaire      |
| `brand.lime-soft`    | `#C3F400` | Texte sur surfaces sombres, dot active, highlights                                       |
| `brand.purple`       | `#9D50FF` | Catégories créatives, IA, tags secondaires                                               |
| `brand.danger`       | `#F56C7A` | Suppression, annulation, erreurs critiques                                               |

### Neutres dark

| Token         | Hex       | Usage                                 |
| ------------- | --------- | ------------------------------------- |
| `background`  | `#050B18` | Fond global application               |
| `sidebar`     | `#071123` | Sidebar fixe                          |
| `surface`     | `#0F172A` | Cards, panels, topbar                 |
| `surface-2`   | `#121C33` | Cards élevées, inputs                 |
| `surface-3`   | `#1A2742` | Hover, composants sélectionnés        |
| `border`      | `#24314D` | Bordures cards, séparateurs           |
| `border-soft` | `#18243A` | Grille calendrier, lignes de table    |
| `text`        | `#E8EEFF` | Titres et texte fort                  |
| `text-muted`  | `#A3AEC5` | Paragraphes, labels                   |
| `text-subtle` | `#6F7B95` | Placeholders, métadonnées secondaires |

### Règles de couleur

- L'interface est **dark-first**. Le mode clair n'est pas prioritaire pour la V1 UI.
- Le lime sert aux actions fortes et états actifs. Il ne doit pas être utilisé pour de longs textes.
- Le bleu sert à structurer l'interface : focus, liens, actions secondaires, barres de progression.
- Le violet est un accent de catégorisation, pas une couleur dominante.
- Les fonds ne doivent jamais être noir pur sauf pour un panneau spécial IA ou une zone de conseil.
- Les contrastes doivent rester AA : texte normal >= 4.5:1, texte large >= 3:1.

## Typographie

### Police

Polices cibles :

- **Manrope** pour les titres, titres de section, titres de cards, intitulés forts et éléments de hiérarchie.
- **Inter** pour les textes courants, labels, formulaires, tables, menus, métadonnées et boutons.

Les polices sont chargées localement via `@fontsource-variable/manrope` et `@fontsource-variable/inter`. Ne pas charger depuis un CDN externe.

### Échelle

| Usage              | Taille    | Line-height | Poids     |
| ------------------ | --------- | ----------- | --------- |
| Page title desktop | `40-48px` | `1.05`      | `700-800` |
| Page title mobile  | `30-36px` | `1.08`      | `700-800` |
| Section title      | `24-28px` | `1.15`      | `700`     |
| Card title         | `18-22px` | `1.25`      | `700`     |
| Body               | `15-16px` | `1.55`      | `400-500` |
| Label              | `12-13px` | `1.2`       | `700`     |
| Meta               | `12-14px` | `1.35`      | `500-650` |

### Règles typo

- `font-heading` doit pointer vers Manrope.
- `font-sans` doit pointer vers Inter.
- Les titres sont compacts, sans letter-spacing négatif.
- Les labels de section peuvent être uppercase avec tracking léger (`0.08em` à `0.14em`), mais pas sur chaque bloc.
- Les paragraphes ne dépassent pas `65ch`.
- Les labels de formulaire restent au-dessus des champs. Pas de placeholder comme seul label.

## Radius

| Token         | Valeur  | Usage                                        |
| ------------- | ------- | -------------------------------------------- |
| `radius-xs`   | `8px`   | Badges, petits contrôles                     |
| `radius-sm`   | `12px`  | Inputs, petits boutons, pills rectangulaires |
| `radius-md`   | `16px`  | Boutons principaux, cards compactes          |
| `radius-lg`   | `20px`  | Panels, cards dashboard                      |
| `radius-xl`   | `24px`  | Grandes cards, blocs latéraux                |
| `radius-full` | `999px` | Avatars, dots, boutons flottants             |

Règle : les cards produit utilisent `20-24px`, les inputs `12-14px`, les boutons `14-18px`, les badges `999px` ou `8px` selon le format.

## Shadows et effets

### Shadows

| Token              | Valeur                                 | Usage              |
| ------------------ | -------------------------------------- | ------------------ |
| `shadow-card`      | `0 18px 48px rgba(0, 0, 0, 0.26)`      | Cards principales  |
| `shadow-glow-blue` | `0 0 32px rgba(77, 128, 240, 0.28)`    | Bouton/focus bleu  |
| `shadow-glow-lime` | `0 0 36px rgba(195, 244, 0, 0.32)`     | CTA principal, FAB |
| `shadow-inset`     | `inset 0 1px 0 rgba(255,255,255,0.04)` | Surfaces dark      |

### Règles d'effets

- Les shadows doivent être teintées et diffuses, jamais gris clair de thème light.
- Les cards ont toujours une bordure subtile + un léger inset highlight.
- Les glows sont réservés aux CTA et éléments actifs, pas aux cards standard.
- Les hover states déplacent peu : `translateY(-1px)` ou changement de fond/bordure.

## Spacing

Base Tailwind : échelle `4px`.

| Token      | Valeur | Usage                      |
| ---------- | ------ | -------------------------- |
| `space-1`  | `4px`  | Dots, micro-gaps           |
| `space-2`  | `8px`  | Icône + texte              |
| `space-3`  | `12px` | Champs compacts, badges    |
| `space-4`  | `16px` | Padding standard petit     |
| `space-5`  | `20px` | Padding card compact       |
| `space-6`  | `24px` | Padding panel              |
| `space-8`  | `32px` | Gaps de sections           |
| `space-10` | `40px` | Espacement vertical majeur |

Règles :

- Sidebar : largeur desktop `280-320px`.
- Topbar : hauteur `72-80px`.
- Container contenu : padding horizontal `32-48px` desktop, `16-20px` mobile.
- Gaps dashboard : `24-32px`.
- Cards internes : padding `20-28px`.

## Boutons

### Variantes shadcn à prévoir

- `primary`: fond bleu `#4D80F0`, texte dark ou blanc selon contraste, hover `#88A8FF`.
- `lime`: fond `#C3F400`, texte `#455900`, glow lime, CTA principal.
- `secondary`: fond `surface-3`, texte `text`, bordure `border`.
- `outline`: transparent, bordure `border`, hover `surface-2`.
- `ghost`: transparent, texte muted, hover `surface-2`.
- `destructive`: fond danger, texte dark/white selon contraste.
- `icon`: carré ou rond, taille stable.
- `fab`: rond fixe `64px`, lime, shadow glow.

### Dimensions

| Taille | Hauteur   | Padding |
| ------ | --------- | ------- |
| `sm`   | `36px`    | `12px`  |
| `md`   | `44px`    | `16px`  |
| `lg`   | `56px`    | `24px`  |
| `icon` | `40-48px` | carré   |
| `fab`  | `64px`    | rond    |

Règles :

- Le texte d'un bouton ne wrap jamais sur desktop.
- Les icônes sont utilisées pour clarifier les actions (`Plus`, `Download`, `Search`, `Calendar`, `Trash`, `Copy`).
- Les boutons destructifs ne doivent pas être proches visuellement des CTA lime.
- Les états `disabled`, `loading`, `focus-visible` doivent être définis dans le composant.

## Inputs et formulaires

### Inputs

- Fond : `surface-2`.
- Bordure : `border`.
- Texte : `text`.
- Placeholder : `text-subtle`.
- Focus : bordure `brand.primary`, ring `rgba(77,128,240,0.25)`.
- Radius : `12-14px`.
- Hauteur : `44-52px`.

### Form fields

Structure obligatoire :

1. Label au-dessus.
2. Champ.
3. Helper text optionnel.
4. Error text sous le champ.

### Composants shadcn à utiliser

- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `Switch`
- `Slider`
- `Form`
- `Command` pour recherche avancée/autocomplete

## Cards et panels

### Types

- `MetricCard`: KPI dashboard avec icône carrée, titre, valeur, delta.
- `ContentCard`: contenu éditorial avec statut, format, tags, métadonnées.
- `PlanningCard`: élément calendrier ou publication à venir.
- `SettingsPanel`: formulaire ou bloc configuration.
- `InsightCard`: conseil IA, fond plus contrasté, accent lime ou violet.

### Règles

- Fond principal : `surface`.
- Fond élevé : `surface-2`.
- Bordure : `1px solid border-soft`.
- Radius : `20-24px`.
- Padding : `20-28px`.
- Les cards ne doivent pas être imbriquées dans d'autres cards sauf cas modal/side panel.
- Les gradients sont autorisés seulement en overlay subtil, pas en fond dominant.

## Tables et listes

### Tables

Les tables doivent devenir des composants shadcn `Table` stylés dark.

Règles :

- Header uppercase, `12px`, `text-subtle`, tracking léger.
- Row height minimum `72px`.
- Séparateur `border-soft`.
- Hover row `surface-2`.
- Première colonne forte, dernières colonnes compactes.
- Actions en menu `DropdownMenu`, pas une série de boutons visibles.

### Listes cards

Utilisées pour contenu récent, idées, publications à venir.

- Chaque item a un statut visible.
- Métadonnées compactes avec icônes.
- Les actions secondaires sont en menu ou bouton icon-only.
- Les listes doivent avoir des états loading/empty/error.

## Badges

### Statuts

| Statut        | Fond                     | Texte/dot |
| ------------- | ------------------------ | --------- |
| Publié        | `rgba(195,244,0,0.14)`   | `#C3F400` |
| Planifié      | `rgba(77,128,240,0.16)`  | `#88A8FF` |
| Brouillon     | `rgba(163,174,197,0.12)` | `#A3AEC5` |
| Révision      | `rgba(157,80,255,0.16)`  | `#B78CFF` |
| Annulé/Erreur | `rgba(245,108,122,0.16)` | `#F56C7A` |

Règles :

- Les badges statut sont pills avec dot optionnelle.
- Les badges catégorie/tags peuvent être rectangulaires `8px`.
- Les badges ne doivent pas remplacer les labels complets quand le contexte est ambigu.

## Modals, drawers et overlays

Utiliser shadcn :

- `Dialog` pour confirmation et édition courte.
- `Sheet` pour side panel de détail ou formulaire long.
- `AlertDialog` pour suppression/annulation.
- `Popover` pour filtres rapides.
- `DropdownMenu` pour actions de card/table.
- `Tooltip` pour boutons icon-only.

Règles :

- Overlay : `rgba(2, 6, 23, 0.72)`.
- Modal : fond `surface`, radius `24px`, bordure `border`.
- Largeur standard : `480px`, large : `720px`.
- Les actions destructives demandent confirmation.
- Le focus initial et le retour focus doivent être gérés par shadcn/Radix.

## Layout

### Shell cible

Desktop :

- Sidebar gauche fixe `280-320px`.
- Logo en haut, nav principale verticale, groupe système, CTA IA en bas.
- Topbar horizontale dans la zone principale : recherche, action rapide, notifications, profil.
- Contenu principal scrollable, largeur fluide.

Mobile/tablette :

- Sidebar devient sheet/drawer.
- Topbar conserve recherche ou bouton recherche.
- Nav principale accessible via menu.
- CTA IA peut devenir bouton flottant ou action principale du drawer.

### Pages principales

- Dashboard : grille KPI en haut, chart principal, side panel "à venir", listes récentes.
- Génération : layout 3 colonnes desktop : configuration, éditeur/résultat, contexte/paramètres.
- Calendrier : grille mensuelle large + panneau latéral non planifiés / suggestions.
- Bibliothèque : header fort, barre filtres, grille cards, pagination.

## Règles responsive

Breakpoints Tailwind à utiliser :

- `sm`: `640px`
- `md`: `768px`
- `lg`: `1024px`
- `xl`: `1280px`
- `2xl`: `1536px`

Règles :

- Ne pas utiliser `h-screen`; utiliser `min-h-dvh`.
- Les layouts 3 colonnes passent à 1 colonne sous `lg`.
- La sidebar desktop disparaît sous `lg`.
- Les cards passent en grille 1 colonne sous `md`.
- Les tables larges deviennent soit scroll horizontal contrôlé, soit liste mobile.
- Les boutons d'action de card deviennent menus ou pleine largeur en mobile.
- Les textes doivent rester dans leur conteneur : pas de titre tronqué sans tooltip si l'information est critique.

## Composants globaux à créer ou modifier

### À créer avec shadcn

- `components/ui/button.tsx`
- `components/ui/input.tsx`
- `components/ui/textarea.tsx`
- `components/ui/select.tsx`
- `components/ui/card.tsx`
- `components/ui/badge.tsx`
- `components/ui/table.tsx`
- `components/ui/dialog.tsx`
- `components/ui/sheet.tsx`
- `components/ui/dropdown-menu.tsx`
- `components/ui/tabs.tsx`
- `components/ui/tooltip.tsx`
- `components/ui/skeleton.tsx`
- `components/ui/avatar.tsx`

### À refactoriser côté app

- `AppShell` : passer en shell sidebar + topbar.
- `MainNav` : navigation verticale avec icônes et état actif lime.
- `UserMenu` : avatar dark, actions en menu.
- `OrganizationSwitcher` : select ou dropdown dark.
- `MetricCard` : card KPI conforme Figma.
- `EmptyState` : dark, plus compact, action claire.
- `AccessDenied` : état système cohérent dark.
- `AuthForm` : adapter aux inputs et boutons shadcn.
- `DashboardOverview` : grille dashboard Figma.
- `ContentLibraryWorkspace` : passer de liste dense à grille cards + filtres shadcn.
- `EditorialCalendarWorkspace` : aligner la grille mensuelle et le panneau latéral.
- `IdeasWorkspace` et génération de contenu : passer en layout configuration/résultat/contexte.

### À déprécier

- Classes globales génériques `.button`, `.button-secondary`, `.button-ghost`.
- Classes globales `.dashboard-panel`, `.settings-panel`, `.metric-card` comme source principale.
- Styles de formulaires globaux `.field input/select/textarea`.
- Layout horizontal `main-nav` desktop.

Ces classes peuvent rester temporairement pendant la migration mais ne doivent plus être utilisées dans les nouveaux composants.

## Mapping Tailwind/shadcn

### CSS variables shadcn cibles

Les tokens doivent être définis dans `globals.css` au format shadcn, puis reliés dans `tailwind.config`.

```css
:root {
  --background: 222 57% 6%;
  --foreground: 224 100% 95%;
  --card: 222 46% 11%;
  --card-foreground: 224 100% 95%;
  --popover: 222 46% 11%;
  --popover-foreground: 224 100% 95%;
  --primary: 222 84% 62%;
  --primary-foreground: 222 57% 6%;
  --secondary: 75 100% 50%;
  --secondary-foreground: 74 100% 17%;
  --muted: 222 34% 18%;
  --muted-foreground: 222 18% 67%;
  --accent: 264 100% 66%;
  --accent-foreground: 224 100% 95%;
  --destructive: 354 87% 69%;
  --destructive-foreground: 224 100% 95%;
  --border: 222 33% 22%;
  --input: 222 34% 18%;
  --ring: 222 84% 62%;
  --radius: 1rem;
}
```

### Tailwind config cible

- Activer `darkMode: ["class"]`.
- Mapper les couleurs shadcn (`background`, `foreground`, `card`, `primary`, etc.).
- Ajouter les radius dérivés de `--radius`.
- Ajouter les shadows brandées (`glow-lime`, `glow-blue`, `card`).
- Ajouter `fontFamily.sans = ["var(--font-geist-sans)"]`.

## Ordre de migration recommandé

1. Installer et configurer TailwindCSS + shadcn/ui.
2. Ajouter les tokens shadcn dans `globals.css`.
3. Créer les composants `ui/*` de base.
4. Refactoriser le shell global avant les pages.
5. Refactoriser les composants transverses : boutons, inputs, cards, badges, tables, modals.
6. Refaire Dashboard, Bibliothèque, Calendrier, Génération dans cet ordre.
7. Supprimer progressivement les anciennes classes globales.

## Critères d'acceptation design

- L'application est dark-first et visuellement cohérente avec les écrans Figma.
- Tous les nouveaux composants utilisent TailwindCSS et shadcn/ui.
- Les couleurs, radius, shadows et espacements proviennent des tokens documentés.
- Les boutons, inputs, cards, tables, badges et modals sont centralisés.
- Le shell desktop utilise une sidebar et une topbar.
- Les vues restent utilisables sous `768px`.
- Les états loading, empty, error, disabled et focus sont couverts.
- Aucune nouvelle feature ne crée de CSS global ad hoc si un composant shadcn/tokens existe.
