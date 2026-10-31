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

## État du prototype

- La carte, le journal, les joueurs, les flammes et l’inventaire sont partagés en direct entre les navigateurs connectés au même service.
- La première salle reprend les combinaisons de torches, les caches, les quatre roues dentées, la rotation de la salle et la découverte de la relique.
- Le chapitre et l’état de partie sont conservés en mémoire du processus. Ils sont réinitialisés lors d’un redémarrage ou d’un nouveau déploiement. Une base de données sera nécessaire avant des parties publiques ou persistantes.
- Certaines interactions secondaires (documents, cassettes et énigmes d’autres salles) restent à intégrer.

## Réinitialiser une partie

Redémarrer le service remet l’état du prototype à zéro. Le redémarrage Render peut aussi couper la partie en cours.
