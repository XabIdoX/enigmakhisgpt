# EnigmAkhi — prototype web

Prototype jouable de la salle bleue d’EnigmAkhi, adapté depuis le bot Discord et ses ressources.

## Lancer en local

Prérequis : Node.js 20 ou plus récent. Le projet n’utilise aucune dépendance externe.

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

Le serveur expose un petit endpoint MCP sur `/mcp/<MCP_ACCESS_PATH>`. Il propose uniquement deux outils : lire les 100 derniers messages du salon idées et publier un compte rendu dans le salon updates. Le bot n’utilise aucun modèle d’IA et n’applique jamais de changement au site.

### Variables Render à configurer

- `DISCORD_BOT_TOKEN` : jeton du bot obtenu dans le Discord Developer Portal. À garder dans les variables secrètes de Render, jamais dans Git ni dans un message.
- `DISCORD_IDEAS_CHANNEL_ID` : identifiant du salon où sont postées les propositions.
- `DISCORD_UPDATES_CHANNEL_ID` : identifiant du salon où le relais publiera les comptes rendus.
- `MCP_ACCESS_PATH` : chaîne hexadécimale aléatoire d’au moins 48 caractères. Elle fait partie de l’URL privée du relais. Pour en générer une localement avec Node.js : `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Dans ChatGPT, ajouter un serveur MCP personnalisé avec l’URL `https://enigmakhi-preview.onrender.com/mcp/<MCP_ACCESS_PATH>` et l’option d’authentification **Aucune**. L’URL complète doit rester privée : toute personne qui la connaît pourrait lire les propositions ou publier dans le salon updates. Si elle fuit, remplacer `MCP_ACCESS_PATH` dans Render et mettre à jour l’URL du plugin.

### Créer et inviter le bot Discord

1. Dans le Discord Developer Portal, créer une application, ouvrir l’onglet **Bot**, puis ajouter le bot.
2. Activer **Message Content Intent** pour que le relais puisse lire le texte des propositions via l’API Discord.
3. Copier le jeton du bot directement dans la variable secrète `DISCORD_BOT_TOKEN` sur Render. Ne pas le coller dans ChatGPT ni dans GitHub.
4. Dans **OAuth2 → URL Generator**, sélectionner le scope `bot` et seulement les permissions **View Channels**, **Read Message History** et **Send Messages**. Ouvrir le lien généré et inviter le bot dans le serveur.
5. Dans Discord, limiter ses permissions aux deux salons choisis. Activer le mode développeur pour copier leurs identifiants et les mettre dans les variables Render correspondantes.

Le relais lit uniquement les messages des 100 dernières propositions dans le salon configuré. Les propositions sont du contenu utilisateur : elles ne valent jamais approbation. Je dois attendre ton accord explicite avant de commencer leur réalisation. La publication d’un compte rendu passe par un outil d’écriture et peut demander une confirmation dans ChatGPT.

## État du prototype

- La carte, le journal, les joueurs, les flammes et l’inventaire sont partagés en direct entre les navigateurs connectés au même service.
- La première salle reprend les combinaisons de torches, les caches, les quatre roues dentées, la rotation de la salle et la découverte de la relique.
- Le chapitre et l’état de partie sont conservés en mémoire du processus. Ils sont réinitialisés lors d’un redémarrage ou d’un nouveau déploiement. Une base de données sera nécessaire avant des parties publiques ou persistantes.
- Certaines interactions secondaires (documents, cassettes et énigmes d’autres salles) restent à intégrer.

## Réinitialiser une partie

Redémarrer le service remet l’état du prototype à zéro. Le redémarrage Render peut aussi couper la partie en cours.

