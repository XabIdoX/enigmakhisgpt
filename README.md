# EnigmAkhi — prototype web

Prototype jouable de la salle bleue d’EnigmAkhi, adapté depuis le bot Discord et ses ressources.

## Lancer en local

Prérequis : Node.js 20 ou plus récent. Installer les dépendances avec `npm install` (le relais Discord utilise `discord.js`).

```sh
npm start
```

Puis ouvrir `http://localhost:3000` dans un navigateur. Pour jouer à plusieurs sur le même réseau, les joueurs ouvrent l’adresse réseau de l’ordinateur qui exécute le serveur, sur le port 3000.

## Héberger sur Render

Créer un **Web Service** relié au dépôt contenant ce dossier, choisir l’environnement **Node**, puis définir :

- Build command : `npm install`
- Start command : `npm start`

Render fournit automatiquement le port via `PORT`.

## Relais Discord ↔ ChatGPT

Le serveur expose un endpoint MCP sur `/mcp/<MCP_ACCESS_PATH>`. Il propose trois outils : lire les idées et leur statut, lire les lots validés avec leurs corrections, et publier un compte rendu dans le salon updates. La lecture parcourt tout l’historique du salon. Le bot n’utilise aucun modèle d’IA et n’applique jamais de changement au site.

### Commandes dans le salon des idées

Les commandes commencent par un point d’exclamation et leur casse est indifférente. Seules `!valider` et `!annuler` sont réservées à DoX. Tous les membres du salon peuvent lister et corriger les idées et consulter l’aide.

| Commande | Effet |
| --- | --- |
| `!valider` | Valide les nouvelles idées depuis la dernière validation. |
| `!annuler` | Annule la dernière validation, sans effacer ses idées. |
| `!liste` | Affiche toutes les idées numérotées, par pages, avec leur statut et leur lien. |
| `!modifier 3 Nouveau texte` | Remplace le texte de l’idée n° 3, même après validation. |
| `!supprimer 3` | Retire l’idée n° 3 de la liste et de son lot, en gardant le message original. |
| `!clear` | Retire toutes les idées de la liste et de leurs lots, en gardant les messages d’origine. |
| `!aide` | Rappelle les commandes. |

Pour corriger une idée, tu peux aussi donner son identifiant Discord ou son lien, ou répondre **au message original** avec `!modifier Nouveau texte`. Les pièces jointes d’origine sont conservées. Le message du créateur reste intact ; la correction apparaît dans les listes, la synthèse et le relais Codex. Une idée annulée reste annulée après correction. Les changements ne modifient pas automatiquement un travail déjà engagé ou livré.

Les commandes sans `!` ne déclenchent plus d’action. Les anciennes validations déjà confirmées par le bot sont conservées. Voir [la documentation du bot](docs/bot-discord.md) pour la reprise après veille et les limites.

### Variables Render à configurer

- `DISCORD_BOT_TOKEN` : jeton du bot obtenu dans le Discord Developer Portal. À garder dans les variables secrètes de Render, jamais dans Git ni dans un message.
- `DISCORD_IDEAS_CHANNEL_ID` : identifiant du salon où sont postées les propositions.
- `DISCORD_APPROVER_USER_ID` : identifiant Discord du seul compte autorisé à utiliser les commandes (DoX). Aucune commande ne fonctionne sans cette configuration.
- `DISCORD_UPDATES_CHANNEL_ID` : identifiant du salon où le relais publiera les comptes rendus.
- `MCP_ACCESS_PATH` : clé aléatoire de 32 à 128 caractères composée de lettres, chiffres et caractères URL sûrs (`.`, `_`, `~`, `-`). Elle fait partie de l’URL privée du relais. La valeur **Generate** de Render convient.

Dans ChatGPT, ajouter un serveur MCP personnalisé avec l’URL `https://enigmakhi-preview.onrender.com/mcp/<MCP_ACCESS_PATH>` et l’option d’authentification **Aucune**. L’URL complète doit rester privée : toute personne qui la connaît pourrait lire les propositions ou publier dans le salon updates. Si elle fuit, remplacer `MCP_ACCESS_PATH` dans Render et mettre à jour l’URL du plugin.

### Créer et inviter le bot Discord

1. Dans le Discord Developer Portal, créer une application, ouvrir l’onglet **Bot**, puis ajouter le bot.
2. Activer **Message Content Intent** pour que le relais puisse lire le texte des propositions via l’API Discord.
3. Copier le jeton du bot directement dans la variable secrète `DISCORD_BOT_TOKEN` sur Render. Ne pas le coller dans ChatGPT ni dans GitHub.
4. Dans **OAuth2 → URL Generator**, sélectionner le scope `bot` et les permissions **View Channels**, **Read Message History**, **Send Messages** et **Embed Links**. Ouvrir le lien généré et inviter le bot dans le serveur.
5. Dans Discord, limiter ses permissions aux deux salons choisis. Activer le mode développeur pour copier leurs identifiants et les mettre dans les variables Render correspondantes.

Le relais reconstruit les idées et validations à partir de l’historique du salon configuré, avec pagination. Les commandes et messages des bots ne sont pas des idées. Les lots annulés sont exclus des synthèses destinées à « lance ». La publication d’un compte rendu passe par un outil d’écriture.

## État du prototype

La modernisation de l’interface et ses vérifications sont décrites dans [le compte rendu du chantier](docs/modernisation-interface.md). Les tests isolés des deux parcours se lancent avec `npm test` sous Node 24 ou supérieur, sans accès à Discord.

- La carte, le journal, les joueurs, les flammes et l’inventaire sont partagés en direct entre les navigateurs connectés au même service.
- La première salle reprend les combinaisons de torches, les caches, les quatre roues dentées, la rotation de la salle et la découverte de la relique.
- Le chapitre et l’état de partie sont conservés en mémoire du processus. Ils sont réinitialisés lors d’un redémarrage ou d’un nouveau déploiement. Une base de données sera nécessaire avant des parties publiques ou persistantes.
- Certaines interactions secondaires (documents, cassettes et énigmes d’autres salles) restent à intégrer.

## Réinitialiser une partie

Redémarrer le service remet l’état du prototype à zéro. Le redémarrage Render peut aussi couper la partie en cours.

## Vocal

Le vocal est accessible à tous depuis l’accueil. Atlantide, Gunung Padang, Ħal Saflieni et Gizeh disposent de leur propre salon. Un joueur connecté au vocal change de salon en naviguant dans le jeu et garde son micro coupé s’il l’avait désactivé.

Pour les réseaux qui bloquent WebRTC en connexion directe, le serveur accepte un relais TURN de type coturn avec authentification par secret partagé. Renseigner `VOICE_TURN_URLS` (URL `turn:` ou `turns:` séparées par des virgules) et `VOICE_TURN_SECRET` dans l’environnement Render. Le navigateur reçoit des identifiants temporaires. En l’absence de relais, les connexions directes restent disponibles.
