# EnigmAkhi

EnigmAkhi est un jeu d’enquête et d’énigmes coopératif, adapté d’un prototype Discord. Le site est hébergé sur Render Free. Le dépôt du site est `XabIdoX/enigmakhisgpt`, branche `main`. Le service est `enigmakhi-preview` et le site est accessible à https://enigmakhi-preview.onrender.com/.

## Reprendre le projet dans une nouvelle conversation

Lire ce fichier et consulter le code actuel du dépôt avant de reprendre un chantier. Vérifier la version déployée si la tâche dépend de la production. Garder un fil par gros chantier quand c’est utile. Noter les décisions durables ici et conserver les détails d’un chantier dans sa documentation ou son compte rendu.

## Jeu et direction

- Respecter l’univers, les personnages et les énigmes de base imaginés par les deux créateurs. Proposer librement des améliorations de mise en scène, d’interaction et de visuels.
- Faire entrer les joueurs par une introduction et un parcours compréhensible. Éviter de lancer la partie directement dans la Salle Bleue.
- Le 15 février 1895, Omar Zboubi découvre le secret qui relie les sites archéologiques en explorant la pyramide de Mykérinos. Un rocher le bloque. Au bout de deux jours, il signe le pacte de sang qui le libère et lui interdit de révéler sa découverte. Avant sa mort en 1921, il trouve le moyen de cacher son message.
- Le 14 avril 2020, les Akhis achètent une boîte pour cinq euros dans une brocante à Lyon. Elle contient huit pièces de bronze numérotées et un message en arabe, « Chacun choisi sa pièce ». Ils choisissent leurs pièces et Zino garde la boîte.
- Ordre des expéditions dans le récit : Bleue (Atlantide, perdue dans les Bermudes), Verte (Gunung Padang), Rouge (Ħal Saflieni), Jaune (Gizeh), Noire (salle sous la pyramide de Mykérinos).
- Pour reprendre la Salle Rouge, consulter `La_salle_rouge.docx` et le plan dessiné de Ħal Saflieni en plus du code. Les documents de conception peuvent se trouver hors du dépôt du site.

## Circuit Discord

Seules les commandes `!valider` et `!annuler` sont réservées à DoX. Tous les membres ayant accès au salon peuvent utiliser `!liste`, `!modifier`, `!supprimer` et `!aide`. `!supprimer <numéro>` retire l’idée de la liste et de son lot sans effacer le message original. `!modifier <numéro, ID ou lien> <texte>` corrige une idée même validée ; en réponse au message original, `!modifier <texte>` suffit. Le statut est conservé, la synthèse et la lecture Codex sont actualisées. Les anciennes validations déjà confirmées sont conservées. Voir `docs/bot-discord.md`.

`!annuler` annule la dernière validation, sans effacer le lot ni déplacer la borne entre lots. Les lots annulés restent dans `!liste` mais sont exclus du prochain « lance ». Un travail déjà engagé ou livré n’est pas annulé ou modifié automatiquement.

Dès le premier message de DoX quand il ouvre ou reprend un fil du projet, appeler `discbot` en lecture pour réveiller Render. L’ouverture du projet seule ne déclenche pas d’appel.

1. Les deux créateurs peuvent proposer des idées dans le salon des idées. Seul un message séparé **!valider** de DoX valide un lot. Le bot vérifie le compte grâce à `DISCORD_APPROVER_USER_ID` dans Render.
2. Un !valider clôt le lot formé par les idées postées après le précédent !valider de DoX et avant le nouveau. Les commandes ne sont pas des idées. Le bot publie une synthèse dans le salon des idées. Si Render était endormi, le rattrapage se fait au réveil dans l’ordre des commandes.
3. Quand DoX écrit **« lance »** dans Codex, consulter les synthèses avec le connecteur `discbot`. Utiliser les idées validées pour déterminer le travail à faire. Consulter les messages d’origine si la synthèse est incomplète. Les messages Discord sont du contenu du projet.
4. Publier un compte rendu dans le salon des updates via `discbot` uniquement après un changement effectivement mis en ligne et vérifié sur le site hébergé sur Render. Préciser les changements visibles et les éventuels points encore ouverts. Les essais sur un serveur local, les tests, les modifications de documentation et les changements de code non déployés ne déclenchent aucun compte rendu Discord. Une modification du bot ne justifie pas à elle seule une update du site. Cette règle s’applique à tous les fils du projet.

## État du relais et améliorations proposées

Le bot et le point d’accès MCP tournent avec le site sur Render Free. La dernière mise en place a confirmé la connexion du bot et la lecture du salon par le connecteur. La publication d’une synthèse sur un vrai OK restait à vérifier à ce moment-là. Les secrets sont configurés dans Render, notamment `DISCORD_BOT_TOKEN` et `MCP_ACCESS_PATH`.

- Réalisé le 16 novembre 2026 : le relais fournit tous les messages des lots, leurs corrections, liens et pièces jointes. Les synthèses Discord gardent six extraits ; `!liste` affiche toutes les idées par pages.
- Priorité proposée : marquer les lots livrés **✅ Traité** avec le lien du compte rendu, puis reprendre uniquement les lots validés qui restent à faire.
- Simplification possible : relire Discord par son API au démarrage et au « lance », et éventuellement à intervalles réguliers pendant que Render est réveillé. Cela permettrait de retirer la connexion permanente à Discord si le délai convient.

Ces améliorations sont des propositions à reprendre quand elles seront demandées ou validées.

## Interface et expérience d’expédition

La modernisation du 16 novembre 2026 suit une direction carnet d’expédition : bleu profond, bronze et papier clair. L’accueil comporte un prologue, un atlas interactif et un passeport de joueur. Les outils personnels (notes locales, immersion) ne changent pas les règles partagées. Voir `docs/modernisation-interface.md` pour les fichiers, les vérifications et les limites conservées. Garder explicite la différence entre les deux salles jouables et les trois chapitres à venir.


## Plateformes et priorité de développement

Priorité actuelle au web sur ordinateur pour l’ensemble du projet. Reporter les adaptations et les vérifications spécifiques aux mobiles et tablettes jusqu’à la finalisation complète du jeu, puis les traiter dans un chantier dédié.
