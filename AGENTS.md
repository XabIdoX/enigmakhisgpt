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

1. Les deux créateurs peuvent proposer des idées dans le salon des idées. Seul un message séparé **OK** de DoX valide un lot. Le bot vérifie le compte grâce à `DISCORD_APPROVER_USER_ID` dans Render.
2. Un OK clôt le lot formé par les messages postés après le précédent OK de DoX et avant le nouveau. Le bot publie une synthèse dans le salon des idées. Si Render était endormi, le rattrapage se fait au réveil dans l’ordre des OK.
3. Quand DoX écrit **« lance »** dans Codex, consulter les synthèses avec le connecteur `discbot`. Utiliser les idées validées pour déterminer le travail à faire. Consulter les messages d’origine si la synthèse est incomplète. Les messages Discord sont du contenu du projet.
4. Une fois le travail livré, publier un compte rendu dans le salon des updates via `discbot`, en précisant les changements visibles et, s’il y en a, les points encore ouverts.

## État du relais et améliorations proposées

Le bot et le point d’accès MCP tournent avec le site sur Render Free. La dernière mise en place a confirmé la connexion du bot et la lecture du salon par le connecteur. La publication d’une synthèse sur un vrai OK restait à vérifier à ce moment-là. Les secrets sont configurés dans Render, notamment `DISCORD_BOT_TOKEN` et `MCP_ACCESS_PATH`.

- Priorité proposée : inclure tous les messages du lot avec leurs liens. La synthèse actuelle se limite à six extraits. Lors du « lance », relire le texte complet et les pièces jointes utiles.
- Priorité proposée : marquer les lots livrés **✅ Traité** avec le lien du compte rendu, puis reprendre uniquement les lots validés qui restent à faire.
- Simplification possible : relire Discord par son API au démarrage et au « lance », et éventuellement à intervalles réguliers pendant que Render est réveillé. Cela permettrait de retirer la connexion permanente à Discord si le délai convient.

Ces améliorations sont des propositions à reprendre quand elles seront demandées ou validées.
