# Modernisation de l’interface — 16 novembre 2026

## Livraison terminée

- Version applicative publiée sur `main` : `d433c95879e1181e5e3efe9751ff8ba5425db141`.
- Déploiement Render `dep-dbtir3mtlv9c73achv9g`, confirmé `live` le 16 novembre 2026 à 17 h 22 (Paris).
- Service existant `enigmakhi-preview` / `srv-dbj057tg1s2s73edtcbg` dans l’espace `My Workspace` (`tea-dbivqtp42hec73bla4tg`), explicitement confirmé par DoX.
- URL : https://enigmakhi-preview.onrender.com/.
- Après reprise du quota : code et fichiers existants conservés, déploiement vérifié sans le relancer. Accueil, prologue et connexion SSE contrôlés en production ; aucune erreur JavaScript détectée pendant ce contrôle.
- Compte rendu Discord publié : https://discord.com/channels/1073679166844702772/1571883063997104260/1571996004633411705.
- Capture de la production conservée dans `../modernisation-en-ligne.jpg` depuis le dossier du dépôt ; aperçu local antérieur conservé dans `../modernisation-apercu.jpg`.
- Aucun travail restant pour cette refonte. Les limites ci-dessous sont des chantiers ultérieurs, pas des étapes interrompues.

Le push n’avait pas déclenché de déploiement malgré l’option autoDeploy activée.
Après vérification de l’absence de déploiement en cours, un déploiement explicite
de la dernière version a été lancé et a abouti. Ne pas supposer qu’un prochain
push sera automatiquement publié : vérifier l’historique Render.

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

## Sanctuaire interactif de la Salle Bleue — 17 novembre 2026

Le sanctuaire utilise une scène HTML/CSS en vue fixe dans `public/sanctuary.css`, créée et actualisée par `renderMap` dans `public/app.js`. Les éléments restent en place entre les mises à jour du serveur pour conserver les animations. Les douze statues, huit fresques, objets, bassin, caches et table sont sélectionnables. Le panneau sous la scène propose les actions du jeu existantes, y compris la collecte et l’installation des roues. Les flammes suivent les circuits existants. La rotation de la table accompagne le passage à la phase II. Les règles et le serveur restent la référence de la progression coopérative.

Les ondes de l’eau, flammes et halos sont animés en CSS. Les animations suivent la préférence de réduction des mouvements et sont suspendues lorsque la salle est masquée. Le plan d’origine reste disponible à travers les commandes existantes.

Vérifications locales effectuées avec les 14 tests existants, puis dans le navigateur pour la sélection, le déplacement de flamme, la collecte, le placement sur statue et la rotation. Affichage contrôlé à 390 pixels et à la largeur de bureau du navigateur intégré. La scène utilise `overflow: clip` pour éviter un décalage interne provoqué par la mise au point des éléments. Publication approuvée par DoX et effectuée sur Render le 17 novembre 2026, commit f5e8666, déploiement dep-dbuc9ec9v7es7384hps0 confirmé live. Page publique, JavaScript, CSS et API vérifiés après publication.

## Ambiance Atlantide et exploration agrandie — 17 novembre 2026

Le titre et les accès de la première expédition affichent Atlantide. Le décor public/assets/atlantis-sanctuary.png habille l’arrivée et le fond de page. Le sanctuaire conserve ses éléments interactifs, avec pierre patinée, ruines et flammes turquoise.

Les anciens accès au plan ouvrent désormais la scène interactive agrandie dans la fenêtre d’observation. La scène et son panneau sont déplacés puis remis à leur emplacement à la fermeture, pour conserver les actions et les mises à jour coopératives. Les anciens dessins restent des fichiers d’archive.

Les objets accessibles dans la salle sont dispersés avec des coordonnées de présentation choisies pour cette interface. Le code source ne précisait pas leurs coordonnées dans la pièce. Le seau est placé près du bassin et le magnétophone près du mécanisme. Les positions de cache et les conditions de découverte restent issues du jeu existant. Aucun document de conception de la Salle Bleue n’a été retrouvé sur le Bureau lors de cette reprise.

Vérifications effectuées : 14 tests réussis, ouverture du sanctuaire agrandi par ses deux accès, déplacement d’une flamme, collecte dans la vue agrandie et retour à la scène normale. Rendu contrôlé sur ordinateur et à 390 pixels. Aucun message d’erreur JavaScript observé. Version locale en attente d’autorisation de publication.

## Priorité au sanctuaire et gardiens sculptés — 17 novembre 2026

La scène occupe la pleine largeur de la page Atlantide. Inventaire et objets, puis chronologie, indice et progression sont présentés sous le sanctuaire. La disposition mobile garde une colonne et l’exploration agrandie reste disponible.

Un gardien sculpté détouré (public/assets/atlantean-guardian.png) est réutilisé avec des variations de teinte et d’orientation sur les douze statues. Les objets réellement placés apparaissent sur les gardiens concernés. Cette réutilisation permet de conserver une seule illustration chargée pour l’ensemble des gardiens.

La table centrale présente quatre logements avec des roues de tailles différentes. Les roues installées deviennent visibles et tournent brièvement avec l’activation du mécanisme, puis la table passe à sa seconde orientation. L’animation ne se relance pas lors des mises à jour coopératives et respecte la réduction des mouvements.

Vérifications locales : 14 tests réussis, contrôle bureau et mobile, placement d’un objet depuis la scène, activation avec quatre roues installées et contrôle de la phase II et des quatre offrandes dans le navigateur. Les améliorations d’Atlantide restent locales en attente de confirmation de publication.

## Torches portées par les gardiens — 17 novembre 2026

Le gardien porte désormais un plateau d’une main et une torche de l’autre. Le fichier atlantean-guardian-torch.png contient la sculpture et la torche éteinte. La flamme animée est superposée à la coupe de la torche uniquement pour les statues allumées dans l’état partagé. Le point lumineux indépendant est supprimé. Torche et offrande suivent la même orientation que la sculpture, y compris dans les variantes retournées. Les circuits et les combinaisons du jeu sont conservés.

Validation des torches : 14 tests existants réussis. Dans le navigateur, le déplacement d’une flamme a confirmé l’extinction de la torche quittée, quatre flammes attachées aux sculptures et aucun élément lumineux détaché à côté des statues. La nouvelle illustration est aussi utilisée dans les fiches d’observation. Modification disponible dans l’aperçu local.

## Réactions animées aux découvertes — 17 novembre 2026

La découverte de la première cache déclenche une secousse puis le glissement de la table, l’ouverture d’un trou sous son emplacement initial et la remontée de la roue moyenne et de la pioche. La table décalée et le trou restent visibles ensuite.

Le déverrouillage de la fresque 2 déclenche une vibration, un halo et une fissure persistante. Sa destruction produit une secousse et de la poussière, puis révèle la petite roue. L’ouverture sous le premier gardien et la découverte de la relique possèdent également une animation.

Les séquences sont déclenchées par les changements de l’état partagé reçu par chaque client, sont mises en file si plusieurs découvertes arrivent ensemble et ne se répètent pas lors des mises à jour ordinaires. Un chargement de partie déjà avancée montre l’état atteint sans rejouer les découvertes historiques. Un retour à un état initial vide la file. Les effets respectent la réduction des mouvements et sont accompagnés d’un message annoncé aux technologies d’assistance.

Vérifications locales dans le navigateur : déverrouillage de la fresque, animation unseal-table active à l’ouverture, trou et objets visibles après déplacement, animation stone-impact et apparition treasure-rise de la petite roue à la destruction. Les essais utilisent une partie isolée au port 3190. Les règles et combinaisons du serveur sont conservées.

## Son du glissement de pierre — 17 novembre 2026

Le fichier public/assets/stone-slide.wav est un son original synthétisé de 3,6 secondes, mono PCM 16 bits à 44,1 kHz. Il combine grondement grave, frottement granuleux et choc final à 2,52 secondes, synchronisé avec l’arrivée de la table à sa position ouverte. Il est joué uniquement pour la découverte de la première cache.

Le contrôleur public/sanctuary-audio.js utilise Web Audio et prépare le son après un geste utilisateur. La commande Sons est disponible dans les outils et dans le sanctuaire agrandi. La préférence est conservée localement. Couper le son, masquer l’onglet, quitter Atlantide ou réinitialiser la découverte interrompt la lecture. Une réponse audio tardive est recalée sur l’animation ou abandonnée si celle-ci est terminée. En mode de réduction des mouvements, seul le choc final est joué. Les erreurs audio ne bloquent pas la partie.

Vérifications effectuées : 14 tests existants réussis, vérification du geste préalable, lecture unique, arrêt et silence en mode coupé, hors d’Atlantide et en arrière-plan avec un moteur audio simulé. Dans le navigateur, les commandes des deux vues ont été testées et la découverte a été déclenchée sans avertissement ou erreur audio. Le fichier est servi avec le type audio/wav. L’appréciation du timbre reste à faire par écoute du fichier fourni. Cette version reste locale.

## Son validé et publication de l’ensemble Atlantide

DoX a validé la proposition de dalle réelle et demandé la mise en ligne de l’ensemble des améliorations. Le son synthétique du test est remplacé par public/assets/stone-slab-slide.mp3, un extrait de 5,51 secondes de « stone_sliding.wav » par Rooms_Boxes, https://freesound.org/people/Rooms_Boxes/sounds/424169/, licence Creative Commons Zero (CC0). La source décrit une dalle déplacée sur un carrelage sablonneux. Extrait issu de l’aperçu MP3 haute qualité, de 7 à 12,5 secondes, sans modification de hauteur.

L’ouverture de la table dure désormais 5,5 secondes pour accompagner cet extrait. La lecture comporte un fondu bref au début et à la fin. En réduction des mouvements, un court extrait de 0,8 seconde est joué. Les mentions du son synthétique dans le compte rendu précédent décrivent uniquement le premier essai, remplacé après son rejet par DoX.

### Publication vérifiée

L’ensemble des améliorations d’Atlantide a été publié le 17 novembre 2026, commit 78ef38c, déploiement Render dep-dbudc2kipgvc738je1p0 confirmé live. La page, app.js, experience.js, sanctuary.css, sanctuary-audio.js, les deux illustrations utilisées et le son MP3 approuvé ont été comparés avec les fichiers locaux et sont identiques après normalisation des fins de ligne des fichiers texte. L’API répond correctement. Aucun log applicatif de niveau erreur n’a été remonté pendant le déploiement. L’extrait validé est servi avec le type audio/mpeg.

La consigne générale de priorité au web sur ordinateur est enregistrée dans les deux fichiers AGENTS.md du projet. Les adaptations et vérifications spécifiques aux mobiles et tablettes sont reportées à la finalisation complète du jeu.

## Hypogée interactif de la Salle Rouge

La scène interactive occupe toute la largeur au-dessus des dossiers, des pièces
à conviction, de la progression et de la chronologie. Le tracé s’appuie sur
`salle_rouge_map.png` et `La_salle_rouge.docx`. Il reprend l’entrée au sud,
le Cheval au nord-ouest, la Baleine au sud-ouest, le Faucon au centre et le
Phénix au sud-est, relié par la galerie nord. Les annexes disposent de leurs
propres accès. La fenêtre agrandie conserve la scène et ses commandes actives,
y compris les mises à jour coopératives.

Les fresques apparaissent sur le plan à l’exploration de leur secteur. Le vent,
les ouvertures des annexes et la relique réagissent aux changements de l’état
partagé. Les deux ouvertures utilisent le son de pierre validé pour Atlantide.
Les pièces à conviction sont filtrables et les bouchons indiquent s’ils ont été
installés. Le tableau de progression et le nom de l’indice ne dévoilent plus la
réponse de l’inscription latine. Les récits des indices et les règles du serveur
sont conservés.

Vérifications locales sur ordinateur : 14 tests du dépôt réussis et résolution
de la Salle Rouge dans Edge avec deux joueurs. Le contrôle couvre la saisie du
code pendant une mise à jour en direct, le son des annexes, la fermeture de la
vue agrandie avec retour au bouton d’ouverture, les filtres et l’immersion.

Le décor d’arrivée `public/assets/hypogeum.jpg` a été créé avec l’outil ImageGen
intégré. Prompt utilisé :

> Use case: stylized-concept. Wide 16:9 environment-only backdrop for a desktop mystery game. Photorealistic cinematic view from inside the Hypogeum of Hal Saflieni, Malta, imagined 1920s archaeological dig. Honey limestone hewn into rounded megalithic chambers, three deep dark carved portals and shallow stepped thresholds, ochre red faded spiral wall pigment and pools of warm amber lantern light. Rich tactile limestone, low-key burgundy shadows. Eye-level wide angle, atmospheric architectural photograph, room in foreground for UI overlay. No text, no people, no props that resemble clues, no weapons, no bodies, no controls, no map markings. This image is atmospheric backdrop behind a separate precise playable floor plan.
