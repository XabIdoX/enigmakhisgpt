# Commandes Discord — 16 novembre 2026

## Périmètre

Commandes `:OK`, `:annuler`, `:liste`, `:modifier` et `:aide`, uniquement dans le salon des idées et uniquement pour l’identifiant `DISCORD_APPROVER_USER_ID`. Les majuscules/minuscules sont indifférentes. Les commandes des autres comptes sont ignorées, sans devenir des propositions. Les messages ordinaires des créateurs continuent à constituer les idées.

`:modifier 3 Nouveau texte` remplace le texte courant de l’idée n° 3. Un identifiant Discord, un lien de message ou une réponse au message original sont également acceptés. La correction conserve l’auteur, les pièces jointes, le lot et son statut. Les synthèses existantes sont actualisées et le relais fournit le texte complet corrigé, même au-delà des six extraits affichés dans une synthèse Discord.

`:annuler` annule le dernier lot, sans revenir automatiquement au lot précédent en cas de répétition. Ce lot reste visible dans `:liste` et conserve sa place de borne chronologique. Modifier une idée annulée ne la revalide pas. Un travail déjà engagé ou livré n’est pas annulé ou modifié automatiquement.

## Persistance et reprise

Discord sert de journal durable : le bot et le relais lisent toutes les pages d’historique et reconstruisent les mêmes idées, corrections et lots. Aucun fichier local persistant n’est nécessaire sur Render Free. Les commandes en attente sont rattrapées au démarrage, dans l’ordre chronologique. Les réponses du bot portent un repère par commande/page ; les reprises ne republient pas les réponses déjà présentes et complètent une liste interrompue. Les envois utilisent aussi les nonces Discord pour limiter les doublons lors des reprises immédiates.

Les anciennes commandes `OK` sont interprétées uniquement si une synthèse de ce bot les confirme déjà. Les anciennes annulations confirmées restent prises en compte. Les nouveaux messages sans préfixe ne déclenchent aucune commande.

Les identifiants de messages sont les références durables. Les numéros sont ceux de la liste chronologique actuelle : si un message original est supprimé, relancer `:liste` avant d’utiliser un numéro, ou préférer une réponse, un lien ou un identifiant. Une correction déjà confirmée mémorise sa cible pour ne pas être réaffectée après une suppression.

## Limites conservées

- Ne pas supprimer les messages du journal (idées, commandes, réponses du bot) : sans base indépendante, une suppression peut retirer une idée, une décision ou son repère de traitement. Utiliser les nouvelles commandes pour corriger ou annuler.
- Les corrections se font via `:modifier`. Le bot ne surveille pas les éditions natives des messages ; elles peuvent changer le journal lors d’une prochaine relecture.
- Les listes sont des instantanés au moment de `:liste` : en redemander une après une correction. Les extraits longs sont raccourcis dans Discord ; le relais conserve le texte complet et le lien de correction.
- La lecture complète de l’historique peut devenir lente si le salon devient très volumineux. Aucun intervalle de polling, nouvelle base, ni suivi « Traité » n’est ajouté dans ce chantier.
- Un bot hébergé sur Render Free ne peut répondre pendant la veille ; le rattrapage intervient au réveil du service.

## Fichiers et vérification

- `discord-ideas.mjs` : commandes, journal commun, pagination et données du relais.
- `discord-approvals.mjs` : connexion Discord, synthèses et réponses paginées.
- `server.mjs` : lectures MCP complètes ; version du relais 1.2.0.
- `tests/discord-commands.test.mjs` : autorisations, corrections, annulation, migration, pagination, pièces jointes, redémarrage et reprise après échec partiel.

Tests isolés sous Node 24 : `node --test tests/*.test.mjs`. Aucun message de test n’est envoyé sur le vrai serveur Discord.
