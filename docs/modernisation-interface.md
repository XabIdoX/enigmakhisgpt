# Modernisation de l’interface — 16 novembre 2026

## Direction retenue

L’accueil devient un carnet d’expédition : une scène photographique de la boîte,
une palette bleu profond / bronze / papier clair, une typographie plus lisible,
un atlas interactif et un passeport pour rejoindre l’équipe. L’hébergement reste
sur le service Render existant. Aucun framework ni dépendance de production ajouté.

## Interactions livrées

- Prologue en quatre pages, fidèle à la chronologie 1895 → 1921 → 2020.
- Atlas à cinq destinations dans l’ordre du récit. Les salles bleue et rouge
  restent jouables ; les trois autres sont explicitement annoncées à venir.
- Sélection de pièce au clavier (flèches, Début, Fin), validation du nom,
  protection contre les doubles soumissions et entrée volontaire dans une salle.
- Filtres des objets de la salle bleue et fiches agrandies des ressources
  originales, avec collecte ou utilisation depuis la fiche.
- Carnet personnel sauvegardé dans le navigateur ; il est clairement distinct
  de l’inventaire et de la chronologie partagés.
- Mode Immersion, guide de jeu, agrandissement du plan et retour aux indices
  de l’enquête depuis les éléments partagés.
- Fenêtres natives `dialog` (focus contenu, Échap), respect des animations
  réduites, mises en page téléphone et tablette, messages de fin d’expédition.
- Les mises à jour SSE préservent la saisie du code, le focus et la position
  des listes. Les actions utilisent aussi la réponse serveur pour éviter de
  dépendre uniquement de l’arrivée d’un événement SSE.

Les textes d’énigme, règles, personnages et solutions préexistants sont conservés.
La Salle Rouge reçoit une adaptation d’interface ; aucune réécriture de son
scénario ni de son plan de conception n’est entreprise dans ce chantier.

## Fichiers

- `public/index.html` : accueil et éléments d’interface.
- `public/expedition.css` : nouvelle direction visuelle, responsive, dialogues.
- `public/style.css` : styles existants et géométrie des plans conservés.
- `public/app.js` : rendu partagé, inscription, actions et saisies.
- `public/experience.js` : atlas, prologue, carnet, fiches, aide et immersion.
- `public/assets/expedition-box.jpg` : visuel original, 1536 × 1024, 284 ko.
- `public/assets/compass.svg` : favicon vectoriel.

## Vérification

Avec Node 24 ou supérieur : `node --test tests/server-flow.test.mjs` (ou `npm test`).
Le test démarre son propre serveur sur un port attribué par le système et
neutralise le module Discord avant import. Il ne touche jamais à la production.
Il vérifie les ressources, deux joueurs, la reconnexion d’un joueur, une vraie
livraison SSE, les refus d’actions invalides, puis la résolution complète des
salles bleue et rouge.

Vérifications navigateur effectuées sur l’instance locale : prologue, inscription
vide et valide, choix de pièce au clavier, atlas, collecte depuis une fiche,
notes relues après fermeture, immersion, navigation des secteurs, code EQUUS,
saisie conservée pendant une action dans un second onglet, vues 390 et 820 px.
Les formats étroits ont été contrôlés dans des iframes de test locales, le
réglage de viewport de l’outil n’étant pas appliqué par le navigateur de cette session.

## Limites conservées

- L’état commun reste en mémoire du processus : un redémarrage Render remet
  la partie à zéro. Cette limite est indiquée dans le passeport et le guide.
- Les illustrations des documents sont consultables ; leur texte détaillé et
  la lecture audio des cassettes restent à intégrer. Les fiches l’indiquent.
- Les notes sont locales à ce navigateur, sans partage ni synchronisation cloud.

## Visuel généré

Outil intégré ImageGen, génération originale puis conversion JPEG qualité 87
pour réduire le poids, sans retouche de contenu. Le PNG original reste dans
le répertoire de génération Codex. La copie utilisée est suivie dans le dépôt.

Prompt utilisé :

> Use case: stylized-concept. Asset type: premium cinematic website hero for a French cooperative archaeological mystery game. Create a photorealistic atmospheric still life, landscape 3:2 composition. An ancient small wooden Egyptian box with worn bronze fittings sits open on an archaeologist's dark desk, exactly eight round aged bronze coins arranged naturally in front of it, subtle engraved ancient geometric motifs, folded timeworn parchment, dusty textured linen, a single faint shaft of warm late sunlight from upper right, almost black teal shadow background. Detailed tactile oxidized copper and wood grain, photographic realism, restrained theatrical light, quiet mystery, beautiful art direction, high-end adventure video game key art. Box and coins occupy center-right, generous dark empty space to left, no people. No writing, no lettering, no watermark, no UI, no modern objects, no floating objects, no magical glow.
