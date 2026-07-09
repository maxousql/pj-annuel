# Sauvegarde et restauration

Utiliser en priorite les sauvegardes PITR du fournisseur PostgreSQL. Pour une verification ponctuelle, employer des identifiants temporaires et ne jamais ecrire le mot de passe dans l'historique du shell.

## Sauvegarde logique

```bash
pg_dump --format=custom --no-owner --no-acl --dbname "$DATABASE_URL" --file content-ai.dump
pg_restore --list content-ai.dump
```

Chiffrer le fichier, le stocker hors de l'instance et documenter sa date, sa taille et la version de schema.

## Test de restauration

1. Creer une base isolee vide.
2. Restaurer avec `pg_restore --clean --if-exists --no-owner`.
3. Lancer `npm run db:migrate` contre cette base.
4. Demarrer l'API, verifier `/health/ready` et le parcours de smoke.
5. Supprimer de maniere controlee l'environnement temporaire.

Une restauration de production exige l'approbation du responsable de donnees, l'arret des ecritures et un controle d'integrite post-restauration.
