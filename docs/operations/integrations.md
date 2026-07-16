# Configuration des integrations

## Notion

1. Créer une intégration publique Notion avec les capacités de lecture, insertion et mise à jour de contenu, puis enregistrer exactement `NOTION_REDIRECT_URI`.
2. Configurer `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, `NOTION_OAUTH_STATE_SECRET`, `INTEGRATION_ENCRYPTION_KEY` et `NOTION_API_VERSION=2026-03-11` dans le gestionnaire de secrets.
3. Autoriser au moins une page parent à l'intégration. L'administrateur choisit cette page et confirme ensuite la création; aucune base n'est créée au retour OAuth.
4. Utiliser de préférence la configuration automatique. Elle crée une base « Planif », sa source de données et les six propriétés attendues, puis conserve les identifiants stables de la source et des propriétés.
5. Pour une base existante, ouvrir « Mapping avancé », choisir explicitement la source de données et mapper les six propriétés compatibles.
6. Tester connexion, configuration, export, modification distante, diagnostic de schéma, réparation confirmée et synchronisation sur une organisation de preview.

Le marqueur `planif-managed:<organizationId>` dans la description permet de redécouvrir une création après une coupure réseau. Un bail de cinq minutes empêche deux instances de créer simultanément une base; ne supprimez pas ce marqueur pendant une reprise. Un échec réseau sur la création n'est jamais rejoué automatiquement: attendre l'expiration du bail, puis relancer afin que la redécouverte précède toute nouvelle création.

Le diagnostic compare les propriétés par identifiant, pas par nom. Une propriété renommée reste saine. La réparation ne supprime et ne convertit aucune colonne: elle ajoute une colonne dédiée en cas de suppression ou de type incompatible, et complète les options de statut françaises en conservant les options existantes.

Les tokens sont chiffrés en AES-256-GCM. La déconnexion supprime credential, mapping et états de pages, mais conserve les journaux de synchronisation dépourvus de secrets.

## Invitations

En developpement, `INVITATION_EMAIL_PROVIDER=console` n'envoie rien et ne journalise jamais le lien. En production, configurer `resend`, `RESEND_API_KEY` et `INVITATION_EMAIL_FROM` sur un domaine verifie. Realiser le premier envoi uniquement vers une adresse de test autorisee.

Chaque invitation envoyee a Resend contient un sujet contextualise, un document HTML responsive aux couleurs de Content AI et une version texte equivalente. Le HTML utilise uniquement des tableaux de presentation, des styles inline, des couleurs litterales et des polices systeme afin de rester lisible dans Gmail, Outlook et sur mobile. Il conserve aussi l'URL complete sous le bouton; la version texte fournit la meme URL, le role en francais et l'expiration en UTC.

Pour la recette, utiliser une organisation de preview et une adresse explicitement autorisee, puis verifier les deux representations HTML et texte dans le message recu. Tester au minimum une largeur mobile, l'affichage sans images et la copie de l'URL de secours. Ne jamais utiliser la suite Jest ou Playwright avec un provider Resend actif : les tests mockent le transport et le mode `console` reste obligatoire pour les parcours locaux.

En cas de refus, de panne reseau ou de timeout du provider, l'API retourne une erreur generique. Les logs indiquent uniquement la categorie technique ou le statut HTTP; ils ne contiennent ni le corps de reponse distant, ni la cle Resend, ni le lien d'invitation.
