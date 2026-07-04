# Automatisation marketing

## Objectif

Proposer des rappels, recommandations et prochaines actions pour aider les équipes à maintenir une production éditoriale régulière.

## Priorité

- Niveau : Could
- Justification : l'automatisation enrichit la plateforme mais dépend du calendrier, des contenus et de l'usage réel.

## Phase

- V2

## Dépendances

- Specs prérequises : [Planification éditoriale](../20-features-v1/02-planification-editoriale.md), [Bibliothèque de contenus](../20-features-v1/01-bibliotheque-contenus.md), [Déploiement, CI et observabilité](../00-socle-prerequis/07-deploiement-ci-observabilite.md).
- Contrats partagés : jobs planifiés, notifications, préférences utilisateur.

## Périmètre

- Rappels de publication.
- Suggestions de planning éditorial.
- Recommandations de prochaines actions.
- Notifications internes.
- Préférences d'activation ou désactivation.

## Hors périmètre

- Publication automatique sur réseaux sociaux.
- Campagnes publicitaires.
- Marketing automation complexe.
- Envoi email obligatoire si le service email n'est pas disponible.

## Acteurs

- Administrateur : configure les automatisations de l'organisation.
- Éditeur : reçoit rappels et recommandations.
- Système : exécute les règles et crée les notifications.

## Parcours / comportement attendu

1. Un administrateur active les rappels.
2. Le système détecte une publication proche ou un contenu non planifié.
3. Une notification est créée pour les utilisateurs concernés.
4. L'utilisateur consulte la recommandation.
5. Il décide manuellement de modifier le planning ou le contenu.

## Règles fonctionnelles

- Les automatisations sont opt-in.
- Une recommandation ne modifie jamais un contenu sans validation utilisateur.
- Les rappels tiennent compte du fuseau horaire configuré.
- Les notifications peuvent être marquées comme lues.
- Les doublons de rappels doivent être évités.

## Règles techniques

- Les jobs doivent être idempotents.
- Le moteur initial peut être basé sur des règles déterministes.
- Les notifications sont stockées en base.
- Les préférences sont vérifiées avant création ou envoi.
- Les erreurs de job sont journalisées.

## Données et modèle

- `AutomationRule` : organisation, type, statut, paramètres.
- `Reminder` : planification liée, date de déclenchement, statut.
- `Recommendation` : type, message, cible, statut.
- `Notification` : utilisateur, organisation, titre, corps, lu/non lu.
- `NotificationPreference` : utilisateur, canaux, opt-in.

## Contrats d'interface

- Pages : `/app/:organizationSlug/automation`, `/app/:organizationSlug/notifications`.
- Actions/API : `listRecommendations`, `createAutomationRule`, `updateAutomationRule`, `markNotificationAsRead`.
- Jobs : `processPublicationReminders`, `generateEditorialRecommendations`.
- Événement : `reminder.due`.

## Critères d'acceptation

- Étant donné une règle active, quand une publication approche, alors un rappel unique est créé.
- Étant donné une recommandation, quand elle s'affiche, alors elle ne modifie aucune donnée sans action utilisateur.
- Étant donné un utilisateur opt-out, quand le job s'exécute, alors aucune notification utilisateur n'est créée pour lui.
- Étant donné un job rejoué, quand il s'exécute, alors il ne crée pas de doublons.

## Tests attendus

- Tests unitaires : règles, idempotence, préférences.
- Tests d'intégration : jobs planifiés, notifications, recommandations.
- Tests E2E : activer rappel, recevoir notification, marquer comme lu.

## Questions ouvertes

- Les rappels doivent-ils être envoyés par email dès la V2 ?
- Les recommandations doivent-elles rester déterministes ou utiliser l'IA ?
