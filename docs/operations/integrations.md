# Configuration des integrations

## Notion

1. Creer une integration publique Notion et enregistrer exactement `NOTION_REDIRECT_URI`.
2. Configurer `NOTION_CLIENT_ID`, `NOTION_CLIENT_SECRET`, `NOTION_OAUTH_STATE_SECRET` et `INTEGRATION_ENCRYPTION_KEY` dans le gestionnaire de secrets.
3. Partager la base cible avec l'integration.
4. Creer les proprietes titre, statut, date, canal, type et URL puis les mapper dans l'application.
5. Tester connexion, export, modification distante et synchronisation sur une organisation de preview.

Les tokens sont chiffres en AES-256-GCM. La deconnexion supprime credential, mapping et etats de pages, mais conserve les journaux de synchronisation depourvus de secrets.

## Invitations

En developpement, `INVITATION_EMAIL_PROVIDER=console` n'envoie rien et ne journalise jamais le lien. En production, configurer `resend`, `RESEND_API_KEY` et `INVITATION_EMAIL_FROM` sur un domaine verifie. Realiser le premier envoi uniquement vers une adresse de test autorisee.
