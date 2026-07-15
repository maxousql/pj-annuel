# Travaux différés

## Synchronisation Notion

- Ajouter un test d'intégration PostgreSQL multi-instance pour valider le comportement concurrent réel des verrous consultatifs, notamment l'attente et la propagation d'un échec d'acquisition.
- Remplacer à terme `$queryRawUnsafe` par une requête Prisma typée lorsque le passage du paramètre de verrou reste compatible avec l'adaptateur PostgreSQL utilisé.
- Exécuter la synchronisation Notion globale dans une file de travaux asynchrone avec identifiant de job et suivi d'état; le flux HTTP synchrone existait avant le provisionnement automatique et nécessite une évolution dédiée du contrat produit.
