# Migrations et retour arriere

## Avant migration

1. Lire le SQL versionne sous `apps/api/prisma/migrations`.
2. Rechercher toute suppression, conversion ou colonne obligatoire sans valeur par defaut.
3. Tester sur une copie recente et mesurer la duree/verrouillage.
4. Creer une sauvegarde et noter le tag des images actuellement actives.

Commande de verification locale :

```bash
npm run db:generate
npm run db:validate
npm run db:migrate
```

`prisma migrate deploy` applique uniquement les fichiers versionnes. Ne jamais utiliser `migrate reset`, `db push` ou un seed de demonstration sur la production.

## Strategie de rollback

- Une regression applicative sans incompatibilite de schema se traite en redeployant le tag d'image precedent.
- Une migration additive reste en place pendant le rollback applicatif.
- Une transformation de donnees se corrige par une nouvelle migration compensatoire, testee en preview.
- Une restauration complete n'est envisagee qu'en cas de corruption et implique une fenetre d'indisponibilite validee.

Les changements destructifs suivent expand/contract : ajout compatible, backfill, bascule applicative, puis suppression dans une livraison distincte.
