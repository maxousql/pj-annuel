# Synthèse des fonctionnalités – Plateforme SaaS de Content Marketing assistée par IA

**GROUPE 11 : RIVAUX Hugo, BORRONI Louis, LAI YIO LAI TONG Maxime, LIMOUSIN Léo**

---

## 1. Contexte du projet

Le projet consiste à développer une application SaaS dédiée à la stratégie de content marketing. Elle s’adresse aux entreprises, agences et freelances qui souhaitent produire, organiser et planifier leurs contenus marketing plus efficacement grâce à l’intelligence artificielle.

Aujourd’hui, les équipes marketing doivent publier régulièrement, trouver des idées pertinentes, adapter leur ton de communication et suivre leur calendrier éditorial. Ce travail demande du temps, de la méthode et une bonne organisation. La plateforme proposée vise donc à centraliser ces besoins dans un outil simple, accessible en ligne et pensé pour un usage professionnel.

### Ce que la plateforme doit permettre

- générer des idées adaptées au secteur, aux thématiques et au positionnement éditorial ;
- produire des contenus marketing à partir d’une idée ou d’un brief utilisateur ;
- centraliser la veille et les ressources utiles ;
- organiser les contenus grâce à des tags, catégories et statuts ;
- structurer un calendrier éditorial ;
- collaborer au sein d’une même organisation ou agence ;
- synchroniser certains contenus avec Notion.

La solution est pensée comme un produit SaaS commercialisable, accessible en ligne et utilisable par plusieurs organisations indépendantes.

---

## 2. Liste des fonctionnalités

L’application s’articule autour de plusieurs modules fonctionnels couvrant l’ensemble du cycle de production de contenu marketing : configuration, génération d’idées, rédaction, organisation, planification, curation et synchronisation externe.

---

### 2.1 Gestion des comptes utilisateurs

La plateforme devra permettre la création et la gestion de comptes utilisateurs afin d’accéder aux fonctionnalités de l’application.

Les utilisateurs pourront :

- créer un compte via email et mot de passe ;
- se connecter via une authentification externe, en priorité Google pour le MVP pédagogique ;
- gérer leurs informations personnelles ;
- accéder à leur espace de travail selon leur rôle.

Dans une logique SaaS, un utilisateur principal pourra créer une organisation, inviter des collaborateurs et gérer les accès de son équipe.

Cette fonctionnalité est essentielle pour permettre une utilisation collaborative de la plateforme au sein d’une agence, d’une équipe marketing ou d’une entreprise.

---

### 2.2 Gestion des organisations

La plateforme devra intégrer une logique multi-organisation afin que chaque agence ou entreprise puisse disposer de son propre espace.

Une organisation pourra :

- être créée par un utilisateur administrateur ;
- regrouper plusieurs collaborateurs ;
- gérer les invitations ;
- attribuer des rôles simples ;
- séparer les contenus, idées, sources et paramètres éditoriaux de chaque client ou agence.

Les rôles prévus pour la première version sont :

| Rôle           | Droits principaux                                                          |
| -------------- | -------------------------------------------------------------------------- |
| Administrateur | Gestion de l’organisation, des membres, des paramètres et des intégrations |
| Éditeur        | Création et modification des idées, contenus et ressources                 |
| Lecteur        | Consultation des contenus et du calendrier éditorial                       |

Cette gestion des organisations permet de rendre le produit cohérent avec une logique SaaS B2B.

---

### 2.3 Configuration du contexte éditorial

Afin d’améliorer la pertinence des contenus générés, l’application devra permettre aux utilisateurs de définir leur contexte marketing dès l’onboarding ou depuis un espace de configuration.

Les utilisateurs pourront renseigner :

- leur secteur d’activité ;
- leurs thématiques principales ;
- leur cible ;
- leur ton de marque ;
- leur positionnement éditorial ;
- des ressources contextuelles : notes, documents, exemples de contenus, informations métier.

Ces éléments permettront à l’intelligence artificielle de mieux comprendre l’environnement professionnel de l’utilisateur et d’adapter les propositions de contenu.

Exemple : une agence immobilière, un cabinet de conseil ou une marque e-commerce n’auront pas les mêmes angles de communication, ni les mêmes formats prioritaires.

---

### 2.4 Génération d’idées de contenu

L’application intégrera un module permettant de générer automatiquement des idées de contenus marketing.

À partir des thématiques définies par l’utilisateur, l’outil proposera des sujets pertinents et directement exploitables.

Les idées générées devront contenir :

- un titre ou sujet principal ;
- un angle éditorial ;
- le format recommandé ;
- une courte justification ;
- une catégorie ou thématique associée.

La fonctionnalité devra aussi analyser l’historique des contenus déjà générés afin d’éviter les répétitions et de maintenir une diversité éditoriale.

Ce module aidera les équipes marketing à maintenir une production régulière et à réduire le temps passé à chercher de nouvelles idées.

---

### 2.5 Génération de contenus marketing

La plateforme permettra de générer automatiquement des contenus textuels à partir :

- d’une idée générée par l’application ;
- d’un brief saisi par l’utilisateur ;
- d’une ressource de veille sélectionnée ;
- d’un contexte éditorial déjà configuré.

Les formats générés seront clairement distingués afin d’éviter les doublons ou les formulations trop génériques.

| Format                   | Description                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Article de blog          | Contenu long structuré avec titre, introduction, sous-parties et conclusion             |
| Post LinkedIn            | Publication professionnelle courte ou moyenne, adaptée à un ton B2B                     |
| Post réseau social court | Texte plus synthétique pour Instagram, Facebook ou X, avec accroche et appel à l’action |
| Email marketing          | Message court destiné à une campagne ou une newsletter                                  |
| Accroche marketing       | Phrase d’introduction, slogan ou texte court pour landing page                          |

L’utilisateur pourra modifier le contenu généré avant de l’enregistrer dans son historique éditorial.

L’objectif n’est pas seulement de produire du texte, mais de proposer des contenus adaptés au secteur, au ton et au calendrier éditorial de l’utilisateur.

---

### 2.6 Curation et veille de contenu

L’application devra intégrer un système de curation de contenu afin d’identifier, collecter et organiser des ressources externes utiles.

Cette fonctionnalité permettra notamment :

- d’importer des contenus depuis des flux RSS ;
- d’enregistrer une URL utile ;
- de résumer une ressource externe ;
- de relier une ressource à une thématique ;
- d’utiliser une ressource comme inspiration pour générer un contenu ;
- de synchroniser certaines ressources avec Notion.

La curation servira à enrichir les contenus générés par l’IA et à éviter que la plateforme fonctionne uniquement à partir de prompts génériques.

---

### 2.7 Gestion et organisation des contenus

L’application devra permettre aux utilisateurs de gérer les contenus générés au sein d’une bibliothèque interne.

Les utilisateurs pourront :

- consulter les contenus générés ;
- modifier un contenu ;
- classer les contenus par tags ou catégories ;
- attribuer un statut ;
- rechercher dans l’historique ;
- éviter les doublons grâce à une comparaison avec les contenus existants.

Les statuts proposés pourront être :

| Statut    | Utilité                                   |
| --------- | ----------------------------------------- |
| Idée      | Sujet identifié mais non rédigé           |
| Brouillon | Contenu généré ou commencé                |
| À valider | Contenu prêt à être relu                  |
| Planifié  | Contenu associé à une date de publication |
| Publié    | Contenu terminé ou exporté                |

Ce module permettra de structurer la production éditoriale et de conserver une trace claire du travail réalisé.

---

### 2.8 Historique éditorial et système anti-doublon

Tous les contenus générés devront être conservés dans un historique éditorial.

L’historique permettra :

- de retrouver les contenus précédents ;
- d’éviter de régénérer plusieurs fois le même sujet ;
- de suivre les thématiques déjà traitées ;
- d’identifier les formats les plus utilisés ;
- de réutiliser ou améliorer un ancien contenu.

Le système anti-doublon devra comparer une nouvelle idée ou un nouveau contenu avec l’existant afin d’alerter l’utilisateur en cas de sujet trop similaire.

Pour le MVP, l’anti-doublon peut être simple : comparaison des titres, thématiques et mots-clés principaux. Une version plus avancée pourra utiliser des embeddings ou une recherche sémantique.

---

### 2.9 Dashboard utilisateur

Le dashboard devra donner une vision rapide de l’activité éditoriale.

Il pourra afficher :

- le nombre d’idées générées ;
- le nombre de contenus créés ;
- les contenus en brouillon ;
- les contenus planifiés ;
- les prochaines dates de publication ;
- les thématiques les plus utilisées ;
- les dernières ressources de curation ajoutées ;
- l’état de synchronisation avec Notion.

L’objectif du dashboard est de permettre à l’utilisateur de comprendre rapidement où en est sa production éditoriale et quelles actions sont prioritaires.

---

### 2.10 Intégration avec Notion

L’application devra proposer une intégration avec Notion, largement utilisé pour la gestion de contenu et la planification éditoriale.

Cette intégration permettra :

- d’exporter les contenus générés vers une base de données Notion ;
- d’exporter les ressources de curation ;
- d’organiser les contenus dans un calendrier éditorial ;
- de synchroniser les statuts et dates de publication ;
- de permettre une synchronisation bidirectionnelle.

Exemple de synchronisation bidirectionnelle :

- un contenu modifié dans l’application est mis à jour dans Notion ;
- un statut modifié dans Notion peut être récupéré dans l’application ;
- une date de publication changée dans Notion est reflétée dans le calendrier de l’application.

Cette fonctionnalité permet à l’utilisateur de continuer à travailler dans Notion tout en profitant de la génération et de l’organisation proposées par l’application.

---

### 2.11 Planification éditoriale

La plateforme permettra d’associer une date de publication aux contenus générés.

Les contenus pourront être intégrés dans un calendrier éditorial afin d’aider les équipes marketing à organiser leur stratégie de publication.

La planification devra permettre :

- d’attribuer une date ;
- d’associer un canal de publication ;
- de définir un statut ;
- de visualiser les publications à venir ;
- de synchroniser les dates avec Notion.

Cette fonctionnalité offrira une vision globale de la production de contenu dans le temps.

---

### 2.12 Onboarding utilisateur

Un onboarding clair est nécessaire pour permettre au jury et aux futurs utilisateurs de tester rapidement l’outil.

L’onboarding devra guider l’utilisateur dans :

- la création de son compte ;
- la création ou le choix de son organisation ;
- la définition de ses thématiques ;
- la configuration du contexte éditorial ;
- la connexion éventuelle à Notion ;
- la première génération d’idée ou de contenu.

L’objectif est que l’utilisateur puisse comprendre la valeur de la plateforme dès les premières minutes.

---

### 2.13 Expérience utilisateur et accessibilité

L’application devra être accessible via une interface web en ligne, sans installation locale.

L’interface devra être :

- responsive, compatible mobile et desktop ;
- intuitive et simple d’utilisation ;
- adaptée à un usage professionnel ;
- déployée en ligne pour être testable par le jury.

Le jury devra pouvoir créer un compte, configurer un premier contexte éditorial, générer une idée, générer un contenu et visualiser le résultat dans le dashboard.

---

## 3. Tableau synthétique des fonctionnalités

| Module                    | Fonctionnalités principales                                                         |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Gestion des comptes       | Création de compte, connexion email / mot de passe, authentification externe        |
| Gestion des organisations | Création d’agence, collaborateurs, rôles, invitations                               |
| Configuration éditoriale  | Définition des thématiques, ressources, cible, ton et contexte métier               |
| Génération d’idées        | Suggestions de sujets, angles éditoriaux, formats recommandés                       |
| Génération de contenu     | Article de blog, post LinkedIn, post court réseau social, email marketing, accroche |
| Curation de contenu       | Veille via flux RSS, URL, résumé de ressources et synchronisation Notion            |
| Gestion des contenus      | Historique, classification, tags, statuts et recherche                              |
| Anti-doublon              | Détection des idées ou contenus similaires dans l’historique                        |
| Dashboard                 | Vue synthétique de l’activité éditoriale et des prochaines actions                  |
| Planification éditoriale  | Calendrier, dates de publication, statuts et canaux                                 |
| Intégration Notion        | Export des contenus, export de la curation, synchronisation bidirectionnelle        |
| Onboarding                | Configuration initiale guidée de l’utilisateur                                      |
| Expérience utilisateur    | Interface web responsive, simple et déployée en ligne                               |

---

## 4. Conclusion fonctionnelle

Cette application vise à offrir une solution complète de stratégie de content marketing assistée par intelligence artificielle.

En centralisant la génération d’idées, la production de contenu, la veille informationnelle, l’organisation et la planification éditoriale, la plateforme permettra aux professionnels du marketing de gagner du temps et de mieux structurer leur communication digitale.

Le positionnement SaaS du produit permettra d’adresser un marché large : agences marketing, freelances, entreprises et équipes communication souhaitant optimiser leur production de contenu.

---

## 5. Roadmap Produit – Plateforme SaaS de Content Marketing

### 5.1 Vision Produit

L’objectif est de développer une plateforme SaaS permettant aux professionnels du marketing de générer, organiser et planifier leur contenu grâce à l’intelligence artificielle.

Le développement sera réalisé par itérations successives afin de livrer rapidement une version fonctionnelle, puis d’enrichir progressivement les fonctionnalités.

---

### 5.2 Phase 1 — MVP

**Durée estimée : 3 semaines**  
**Objectif : proposer une première version utilisable**

Le MVP doit permettre à un utilisateur de créer son compte, configurer son contexte éditorial, générer des idées, générer des contenus et consulter son historique depuis un dashboard simple.

#### Fonctionnalités incluses

**Gestion des utilisateurs**

- création de compte ;
- connexion email / mot de passe ;
- authentification externe Google ;
- gestion du profil utilisateur.

**Configuration du contexte éditorial**

- définition du secteur d’activité ;
- définition des thématiques principales ;
- définition du ton et de la cible ;
- configuration des paramètres de génération.

**Génération d’idées de contenu**

- génération automatique de sujets ;
- prise en compte des thématiques définies ;
- affichage des suggestions ;
- stockage des idées.

**Génération de contenu**

- rédaction à partir d’une idée ;
- rédaction à partir d’un brief utilisateur ;
- génération d’articles de blog ;
- génération de posts LinkedIn ;
- génération de posts courts pour réseaux sociaux ;
- édition simple du contenu généré.

**Historique des contenus**

- stockage des contenus générés ;
- consultation des contenus précédents ;
- première logique anti-doublon.

**Interface utilisateur**

- dashboard principal ;
- interface responsive ;
- navigation simple ;
- onboarding initial.

---

### 5.3 Phase 2 — Version 1

**Durée estimée : 2 à 3 semaines supplémentaires**  
**Objectif : structurer la collaboration et l’organisation éditoriale**

#### Fonctionnalités ajoutées

**Gestion des organisations**

- création d’organisation ou d’agence ;
- invitation de collaborateurs ;
- gestion des rôles ;
- gestion des accès utilisateurs.

**Gestion des contenus**

- tags et catégories ;
- classement des contenus ;
- recherche dans l’historique ;
- statuts éditoriaux.

**Planification éditoriale**

- calendrier de publication ;
- association d’une date à un contenu ;
- suivi du planning éditorial ;
- visualisation des contenus à venir.

**Intégration Notion**

- export des contenus vers Notion ;
- export des ressources de curation ;
- synchronisation avec une base de données Notion ;
- ajout automatique au calendrier éditorial ;
- première synchronisation bidirectionnelle.

---

### 5.4 Phase 3 — Version 2

**Phase post-MVP : évolution produit**  
**Objectif : enrichir la plateforme pour en faire un produit SaaS plus complet**

#### Fonctionnalités avancées

**Curation de contenu**

- import de flux RSS ;
- enregistrement d’URL ;
- analyse de contenu externe ;
- suggestions de contenu à partir de sources externes ;
- synchronisation de la curation avec Notion.

**Amélioration de la génération IA**

- amélioration des prompts ;
- adaptation plus fine au ton de marque ;
- génération multilingue si besoin ;
- amélioration du système anti-doublon.

**Onboarding avancé**

- tutoriel interactif ;
- guide de prise en main ;
- exemples de configuration selon le type d’activité.

**Automatisation marketing**

- rappels de publication ;
- suggestions de planning éditorial ;
- recommandations de prochaines actions.

---

### 5.5 Représentation simplifiée de la roadmap

| Phase         | Objectif                           | Fonctionnalités principales                                                                         |
| ------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Phase 1 — MVP | Première version utilisable        | comptes, configuration éditoriale, génération d’idées, génération de contenu, historique, dashboard |
| Phase 2 — V1  | Structurer la stratégie éditoriale | organisations, rôles, calendrier, tags, catégories, intégration Notion                              |
| Phase 3 — V2  | Amélioration produit               | curation, synchronisation Notion avancée, onboarding avancé, automatisation                         |

---

### 5.6 Priorisation stratégique

Dans le cadre du budget limité, la priorité est donnée aux fonctionnalités suivantes :

1. génération d’idées ;
2. génération de contenu ;
3. gestion des utilisateurs ;
4. configuration éditoriale ;
5. historique des contenus et anti-doublon ;
6. dashboard ;
7. organisations et rôles ;
8. calendrier éditorial ;
9. intégration Notion ;
10. curation de contenu.

Ces fonctionnalités constituent le cœur de valeur de l’application et doivent être intégrées dans la trajectoire MVP / V1 afin de répondre au cahier des charges.

---

### 5.7 Conclusion de la roadmap

Cette roadmap permet de livrer rapidement une première version fonctionnelle tout en gardant la possibilité d’enrichir progressivement la plateforme.

Cette approche itérative est adaptée à un produit SaaS car elle permet :

- de tester rapidement l’usage du produit ;
- d’améliorer la plateforme en fonction des retours utilisateurs ;
- de maîtriser le budget de développement ;
- de prioriser les fonctionnalités qui apportent le plus de valeur au client.

---

## 6. Budget et planification du projet

### 6.1 Hypothèses de départ

Le projet dispose d’un budget total de **50 000 €**.

L’équipe est composée de **4 développeurs** avec un **TJM de 600 €** par jour.

### Calcul de la capacité de développement

| Élément                                 |                                                       Valeur |
| --------------------------------------- | -----------------------------------------------------------: |
| Budget disponible                       |                                                     50 000 € |
| TJM                                     |                                                 600 € / jour |
| Nombre total de jours homme disponibles |                        50 000 / 600 = environ 83 jours homme |
| Répartition par développeur             | 83 jours / 4 développeurs = environ 21 jours par développeur |

Cela correspond à environ un mois de développement pour une équipe de 4 personnes.

Le projet doit donc être structuré avec une priorisation forte des fonctionnalités afin de livrer un produit fonctionnel dans ce délai.

---

### 6.2 Répartition des rôles dans l’équipe

Afin d’optimiser le développement et la livraison du produit, les responsabilités sont réparties comme suit :

| Rôle                        | Responsabilités                                                      |
| --------------------------- | -------------------------------------------------------------------- |
| Lead developer / Architecte | Architecture technique, choix technologiques, coordination technique |
| Backend developer           | API, base de données, logique métier, intégration IA                 |
| Frontend developer          | Interface utilisateur, dashboard, UX, responsive                     |
| Product / intégration       | Gestion produit, intégrations Notion/API, tests et déploiement       |

Cette organisation permet de travailler en parallèle sur plusieurs modules du produit.

---

### 6.3 Répartition du budget par phase

| Phase               | Objectif                                 | Jours homme estimés | Budget estimé |
| ------------------- | ---------------------------------------- | ------------------: | ------------: |
| Phase 1 – MVP       | Fonctionnalités principales              |               50 JH |      30 000 € |
| Phase 2 – Version 1 | Organisation du contenu et collaboration |               25 JH |      15 000 € |
| Phase 3 – Version 2 | Fonctionnalités avancées                 |                8 JH |       4 800 € |
| **Total**           |                                          |           **83 JH** |  **49 800 €** |

Le budget restant, soit environ **200 €**, peut servir de marge pour des frais techniques mineurs : domaine, tests d’API, stockage ou dépassement ponctuel d’usage IA.

Cette répartition permet de sécuriser le développement du cœur du produit avant d’ajouter des fonctionnalités complémentaires.

---

### 6.4 Estimation du temps par fonctionnalité

L’estimation ci-dessous permet d’expliquer la logique du budget et de justifier les fonctionnalités incluses.

| Fonctionnalité                                            | Phase    | Jours homme | Budget estimé | Pourquoi cette estimation ?                                                       |
| --------------------------------------------------------- | -------- | ----------: | ------------: | --------------------------------------------------------------------------------- |
| Cadrage fonctionnel, UX et setup projet                   | MVP      |        4 JH |       2 400 € | Nécessaire pour cadrer les parcours, la base UI et l’organisation du projet       |
| Architecture technique, base de données et déploiement    | MVP      |        5 JH |       3 000 € | Mise en place Next.js, Nest.js, PostgreSQL, environnement et déploiement          |
| Gestion des comptes utilisateurs                          | MVP      |        6 JH |       3 600 € | Authentification email/mot de passe, OAuth Google et gestion de profil            |
| Gestion des organisations, rôles et invitations           | V1       |        8 JH |       4 800 € | Module important pour la logique SaaS B2B et la collaboration                     |
| Configuration du contexte éditorial et onboarding initial | MVP      |        6 JH |       3 600 € | Collecte des informations nécessaires pour personnaliser les générations IA       |
| Dashboard utilisateur                                     | MVP      |        5 JH |       3 000 € | Vue synthétique des idées, contenus, statuts et prochaines publications           |
| Génération d’idées et stockage                            | MVP      |        8 JH |       4 800 € | Connexion IA, prompts, sauvegarde des idées et première logique anti-doublon      |
| Génération de contenu à partir d’une idée ou d’un brief   | MVP      |       10 JH |       6 000 € | Fonctionnalité cœur du produit, avec plusieurs formats éditoriaux                 |
| Historique, bibliothèque, tags, catégories et recherche   | V1       |        7 JH |       4 200 € | Organisation des contenus et exploitation de l’historique                         |
| Calendrier éditorial et planification                     | V1       |        6 JH |       3 600 € | Association des contenus à des dates, statuts et canaux                           |
| Curation RSS / URL et enrichissement IA                   | V2       |        6 JH |       3 600 € | Collecte de ressources externes et utilisation comme source d’inspiration         |
| Intégration Notion et synchronisation bidirectionnelle    | V1       |        8 JH |       4 800 € | Export des contenus, curation, calendrier et récupération de modifications Notion |
| Tests, corrections, responsive et préparation jury        | MVP / V1 |        4 JH |       2 400 € | Stabilisation, correction des bugs et vérification du parcours de test            |
| **Total**                                                 |          |   **83 JH** |  **49 800 €** |                                                                                   |

---

### 6.5 Fonctionnalités incluses dans le budget de 50 000 €

Les fonctionnalités suivantes sont incluses dans le budget initial.

| Fonctionnalité                                    | Phase    | Incluse |
| ------------------------------------------------- | -------- | ------- |
| Gestion des comptes utilisateurs                  | MVP      | ✅      |
| Authentification externe Google                   | MVP      | ✅      |
| Configuration du contexte éditorial               | MVP      | ✅      |
| Génération d’idées                                | MVP      | ✅      |
| Stockage des idées                                | MVP      | ✅      |
| Génération de contenu depuis une idée             | MVP      | ✅      |
| Génération de contenu depuis un brief utilisateur | MVP      | ✅      |
| Historique des contenus                           | MVP      | ✅      |
| Première logique anti-doublon                     | MVP      | ✅      |
| Dashboard utilisateur                             | MVP      | ✅      |
| Onboarding initial                                | MVP      | ✅      |
| Gestion des organisations                         | V1       | ✅      |
| Gestion des collaborateurs                        | V1       | ✅      |
| Gestion des rôles                                 | V1       | ✅      |
| Gestion des invitations                           | V1       | ✅      |
| Tags et catégories                                | V1       | ✅      |
| Calendrier éditorial                              | V1       | ✅      |
| Planification des publications                    | V1       | ✅      |
| Intégration Notion                                | V1       | ✅      |
| Export des contenus vers Notion                   | V1       | ✅      |
| Synchronisation bidirectionnelle Notion           | V1       | ✅      |
| Curation RSS / URL                                | V2       | ✅      |
| Export de la curation vers Notion                 | V2       | ✅      |
| Interface responsive                              | MVP / V1 | ✅      |
| Déploiement en ligne                              | MVP      | ✅      |

---

### 6.6 Fonctionnalités non incluses dans le budget initial

Certaines fonctionnalités sont pertinentes pour l’évolution du produit, mais elles ne sont pas prioritaires dans le budget initial de 50 000 €.

| Fonctionnalité                                  | Description                                               | Jours homme estimés |   Estimation |
| ----------------------------------------------- | --------------------------------------------------------- | ------------------: | -----------: |
| Publication automatique sur les réseaux sociaux | Publication directe sur LinkedIn, X ou autres plateformes |               13 JH |      7 800 € |
| Analyse SEO automatisée                         | Recommandations SEO avancées pour les articles            |               16 JH |      9 600 € |
| Analyse des performances des contenus           | Statistiques d’engagement et suivi des résultats          |               12 JH |      7 200 € |
| Connecteurs CMS WordPress / Webflow             | Envoi direct de contenus vers un CMS externe              |               15 JH |      9 000 € |
| Templates marketing personnalisables            | Bibliothèque de templates et personnalisation avancée     |               10 JH |      6 000 € |
| **Total estimé**                                |                                                           |           **66 JH** | **39 600 €** |

Total estimé pour ces évolutions : **environ 40 000 € supplémentaires**.

---

## 7. Architecture technique recommandée

Pour un projet SaaS moderne, l’architecture suivante est pertinente :

| Couche           | Choix recommandé                                                             |
| ---------------- | ---------------------------------------------------------------------------- |
| Frontend         | Next.js                                                                      |
| Backend          | Nest.js                                                                      |
| Base de données  | PostgreSQL                                                                   |
| Authentification | Supabase Auth ou Auth.js                                                     |
| IA               | Provider IA interchangeable, avec Gemini en priorité pour le MVP pédagogique |
| Intégrations     | Notion API                                                                   |
| Hébergement      | Vercel / cloud                                                               |
| Stockage         | Base PostgreSQL et stockage objet si documents ajoutés                       |
| Déploiement      | Application en ligne accessible au jury                                      |

Cette architecture permet de développer rapidement un produit moderne, maintenable et évolutif.

Le choix **Next.js + Nest.js** est cohérent avec le type de projet : Next.js pour l’interface SaaS et Nest.js pour structurer proprement l’API, les services métier, les intégrations et les appels IA.

---

### 7.1 Architecture fonctionnelle simplifiée

```text
Utilisateur
   |
   v
Frontend Next.js
   |
   v
API Backend Nest.js
   |
   |-- Authentification
   |-- Organisations / rôles
   |-- Génération IA
   |-- Historique éditorial
   |-- Curation RSS / URL
   |-- Synchronisation Notion
   |
   v
Base de données PostgreSQL
   |
   v
Services externes : IA + Notion
```

---

### 7.2 Comparatif des solutions d’intelligence artificielle

Le choix de l’IA doit être justifié, car il influence directement le coût, la qualité des contenus et la facilité d’intégration.

Les tarifs des API évoluent régulièrement. Le tableau ci-dessous doit donc être considéré comme une base de comparaison à vérifier avant une mise en production.

| Solution IA                   | Coût estimatif                                                             | Avantages                                                                                      | Limites                                                                  | Pertinence pour le projet                                                    |
| ----------------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Gemini 2.5 Flash / Flash-Lite | Très faible coût, avec accès gratuit ou peu coûteux selon quotas et modèle | Bon compromis pour un MVP, rapide, simple à tester, adapté au projet pédagogique               | Quotas à surveiller, qualité à tester sur les contenus longs             | Très pertinent pour le MVP pédagogique                                       |
| OpenAI GPT                    | Payant à l’usage, avec modèles économiques et modèles plus avancés         | Très bonne qualité de rédaction, API mature, bons résultats sur contenus marketing             | Coût pouvant augmenter selon volume, dépendance à un fournisseur externe | Pertinent pour une version production                                        |
| Claude Haiku / Sonnet         | Coût modéré à plus élevé selon modèle                                      | Très bon niveau rédactionnel, bon respect du ton, utile pour contenus longs                    | Peut être plus coûteux qu’une solution low-cost                          | Pertinent si la qualité éditoriale devient prioritaire                       |
| Mistral                       | Coût variable selon API ou hébergement                                     | Acteur européen, possibilité de modèles plus maîtrisables, intéressant pour la confidentialité | Qualité et coût à tester selon modèle, auto-hébergement plus complexe    | Intéressant si la souveraineté ou la maîtrise des données devient importante |

---

### 7.3 Recommandation IA

Pour le projet pédagogique, la recommandation est d’utiliser **Gemini 2.5 Flash-Lite ou Gemini 2.5 Flash** en priorité, car l’objectif est de tester la valeur fonctionnelle de l’application avec une solution gratuite ou peu coûteuse.

Cependant, l’architecture doit éviter de rendre l’application dépendante d’un seul fournisseur. Il est donc recommandé de créer une couche d’abstraction côté backend :

```text
ContentGenerationService
   |
   |-- GeminiProvider
   |-- OpenAIProvider
   |-- ClaudeProvider
   |-- MistralProvider
```

Ainsi, le MVP peut démarrer avec une IA peu coûteuse, tout en gardant la possibilité de basculer vers OpenAI, Claude ou Mistral si le besoin client évolue.

---

## 8. Contraintes de livraison et recette jury

L’application devra respecter les contraintes suivantes :

- être responsive ;
- proposer une UX simple ;
- être déployée en ligne ;
- permettre au jury de créer un compte ;
- permettre au jury de tester l’outil sans configuration complexe.

### Parcours de test attendu pour le jury

1. création d’un compte ;
2. création ou sélection d’une organisation ;
3. configuration rapide du contexte éditorial ;
4. génération d’une idée ;
5. génération d’un contenu à partir de cette idée ;
6. consultation du contenu dans l’historique ;
7. planification du contenu dans le calendrier ;
8. export ou synchronisation avec Notion si l’intégration est activée.

Ce parcours doit être prioritaire lors de la préparation de la démonstration.

---

## 9. Conclusion générale

Avec un budget de **50 000 €** et une équipe de **4 développeurs**, le projet peut livrer une première version fonctionnelle en environ un mois, puis évoluer vers une solution plus complète.

La stratégie adoptée repose sur :

- une priorisation des fonctionnalités essentielles ;
- une estimation claire du temps par fonctionnalité ;
- un développement itératif ;
- une architecture technique cohérente avec Next.js et Nest.js ;
- un choix d’IA justifié par un comparatif ;
- une vision produit évolutive.

Cette approche permet de maximiser la valeur du produit tout en respectant les contraintes budgétaires, techniques et temporelles.
