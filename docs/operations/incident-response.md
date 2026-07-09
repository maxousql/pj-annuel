# Reponse aux incidents

## Triage initial

1. Verifier `/health` puis `/health/ready`.
2. Relever l'heure UTC, la version et le `x-request-id` retourne au client.
3. Rechercher ce request ID dans les logs JSON de l'API.
4. Determiner si l'incident touche une organisation, un provider externe ou PostgreSQL.

Les logs d'exception contiennent methode, route, statut, utilisateur et organisation, jamais les corps de requete, tokens OAuth ou prompts complets.

## Integrations

- `NOTION_AUTH_EXPIRED` : reconnecter l'organisation ; le credential passe en statut erreur sans exposer le token.
- `NOTION_RATE_LIMITED` : attendre le delai fournisseur puis relancer la synchronisation.
- email indisponible : l'invitation reste en base et peut etre relancee apres retablissement.
- job en echec : consulter `scheduled_job_runs`, corriger la cause puis attendre le bucket suivant.

## Secret compromis

1. Revoquer le secret chez le fournisseur.
2. Remplacer le secret dans le gestionnaire et redeployer.
3. Pour `AUTH_SECRET`, deconnecter toutes les sessions est attendu.
4. Pour `INTEGRATION_ENCRYPTION_KEY`, conserver temporairement l'ancienne version afin de dechiffrer puis rechiffrer les credentials avant retrait. La rotation doit faire l'objet d'un script controle ; ne pas modifier la cle seule.
5. Documenter l'etendue, les utilisateurs touches et les mesures prises.
