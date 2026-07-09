# Exploitation

Ces runbooks couvrent la mise en production sans effectuer d'action distante automatiquement.

- [production.md](production.md) : configuration, images et ordre de deploiement.
- [migrations-and-rollback.md](migrations-and-rollback.md) : migrations, verification et retour arriere.
- [backup-and-restore.md](backup-and-restore.md) : sauvegarde et restauration PostgreSQL.
- [incident-response.md](incident-response.md) : diagnostic, journaux et rotation de secrets.
- [integrations.md](integrations.md) : Notion OAuth et email d'invitation.
- [demo.md](demo.md) : donnees et parcours de demonstration.

Toutes les commandes doivent etre executees d'abord sur un environnement de preview. Les migrations distantes, l'envoi d'emails et le deploiement cloud requierent une validation humaine explicite.
