# Salle Jaune — Les pierres du désert

Cadre demandé par DoX le 21 novembre 2026 : créer la salle de Gizeh, son ambiance et son vocal, sans inventer d’énigme. Priorité ordinateur.

## Direction et limites narratives

Gizeh est la quatrième expédition, après Ħal Saflieni. La pyramide précise n’est pas nommée. La Salle Noire sous Mykérinos reste un chapitre distinct à venir. L’architecture et les descriptions constituent une mise en scène fictive, pas une restitution historique. Aucun nouvel événement n’est ajouté à la vie d’Omar.

Trois points de vue sont librement accessibles : plateau au couchant, passage de pierre, chambre intérieure. Chaque scène possède une illustration SVG, un repère d’observation et une description sensorielle. Les observations ne sont pas des indices : aucun code, mécanisme, objet à ramasser, récompense, verrou ou état de victoire n’est prévu. L’interface annonce explicitement « exploration sans énigme ».

## Interactions

- Accès depuis l’atlas, le passeport et la conclusion de la Salle Rouge ; retour à l’atlas.
- Navigation, lanterne et ambiance personnelles ; carnet d’observation commun synchronisé par SSE. Chaque lieu n’ajoute qu’une entrée, quel que soit le nombre de joueurs qui l’observent.
- Vent synthétisé localement avec Web Audio, désactivé à l’arrivée. Il s’atténue dans la pyramide, s’interrompt dans un onglet masqué et s’arrête à la sortie. Ce son est distinct du microphone.
- Salon vocal `yellow`, titre « Vocal de Gizeh », avec les commandes et le suivi des changements de salle existants.
- Notes personnelles, aide propre à cette salle, mode Immersion, navigation clavier et animations réduites selon la préférence du navigateur.
- L’état partagé est en mémoire comme pour les autres salles ; il disparaît au redémarrage.

## Fichiers

`public/yellow.js`, `public/yellow.css`, `public/assets/yellow-{plateau,passage,chamber}.svg`, `yellow-room.mjs`. Intégrations dans `public/index.html`, `public/app.js`, `public/experience.js`, `public/voice.js`, `voice.mjs`, `server.mjs`.

## Vérifications

Les 15 tests passent avec `node --test tests/*.test.mjs`, avec accès réseau local autorisé. Le parcours serveur vérifie l’accès direct à la chambre, les observations à deux joueurs, la déduplication, les refus des actions anonymes ou inconnues et l’absence d’impact sur les énigmes ou l’inventaire. Le test vocal vérifie l’accueil de deux participants dans Gizeh, les signaux entre eux, le départ et le refus des signaux depuis une autre salle.

Le contrôle visuel local est indisponible dans cette session (localhost inaccessible au navigateur intégré, contrôle d’Edge non autorisé). La vérification sur Render sera consignée après publication. La transmission réelle du micro entre deux personnes n’est pas testée. Les adaptations spécifiques mobile/tablette restent reportées.

## À définir avec les créateurs

La pyramide précise, le récit de la salle, l’énigme et ses interactions coopératives, les éventuels objets, indices et récompenses, puis la transition narrative vers la Salle Noire.
