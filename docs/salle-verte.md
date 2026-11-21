# Salle Verte — La cour des deux rois

Premier cadre demandé par DoX le 21 novembre 2026, avec publication directe sur Render. Gunung Padang reste la deuxième expédition, entre Atlantide et Ħal Saflieni. Priorité ordinateur.

## Intention et statut

Deux rois s’affrontent ; leur bataille devient un problème d’échecs dont les joueurs doivent trouver le mat. Le créateur autorise un cadre et un défi provisoires pour disposer immédiatement d’une base visible. Le roi d’Ivoire et le roi de Basalte sont des propositions, sans valeur historique ni validation narrative définitive.

La cour de basalte, les deux serments et la stèle constituent une première exploration. Lire les trois inscriptions débloque la bataille. Le tableau présente ensuite un mat en un coup, puis un sceau vert et une transition vers Malte. Le sceau et cette transition sont provisoires ; aucune relique définitive n’est ajoutée à l’inventaire commun.

## Démonstration d’échecs

Position : roi blanc f6, dame blanche f7, roi noir h8 ; blancs au trait. Solution : Dg7#. La dame attaque h8 et couvre g8/h7 ; le roi f6 protège g7. Le prototype ne constitue pas un moteur d’échecs général. Le serveur valide la solution de cette position fixe, les prérequis et l’appartenance à l’équipe. Les erreurs laissent le tableau intact pour un nouvel essai.

Les inscriptions, le réveil et la résolution sont synchronisés par le serveur et SSE. L’observation et la sélection du coup restent personnelles jusqu’à validation. La progression est en mémoire et disparaît au redémarrage, comme les autres salles. Un salon vocal `green` accompagne l’expédition ; la transmission audio réelle dépend toujours du réseau et des autorisations micro.

## Fichiers et vérifications

- `public/green.css` : cour illustrée en CSS, deux monuments, panneaux et échiquier.
- `public/green.js` : observation, sélection clavier/souris, confirmations et rendu commun.
- `green-room.mjs` : état et validation, appelés depuis `server.mjs`.
- Intégration dans `public/index.html`, `public/app.js`, `public/experience.js`, `voice.mjs` et `public/voice.js`.
- `tests/server-flow.test.mjs` : parcours à deux joueurs, refus d’actions prématurées, invalides ou anonymes, erreurs de coup, résolution unique et indépendance des autres salles.
- `tests/voice.test.mjs` : accueil du vocal vert et isolation des salons.

Les 15 tests passent avec `node --test tests/*.test.mjs`. La vérification navigateur locale n’a pas abouti (connexion navigateur puis contrôle de fenêtre indisponibles) ; vérifier l’interface sur Render après le déploiement. Les adaptations et vérifications spécifiques mobile/tablette restent pour le chantier dédié.

## À définir avec les créateurs

Les identités et motivations définitives des rois, le lien exact avec Omar, les scènes de bataille, la vraie position d’échecs, la difficulté et le nombre de coups, la récompense et les indices coopératifs. La première version porte explicitement la mention « prototype jouable ».
