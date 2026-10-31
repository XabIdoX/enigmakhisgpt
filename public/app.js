const stateUrl = '/api/state';
const torchPositions = [
  [70, 18], [83, 32], [88, 49], [80, 68], [68, 81], [50, 88],
  [32, 80], [17, 67], [12, 49], [17, 32], [31, 18], [50, 13],
];
const muralPositions = [[96, 39], [96, 61], [81, 90], [63, 96], [38, 96], [16, 84], [3, 63], [3, 39]];
const itemOrder = ['stone', 'bucket', 'tape_1', 'tape_2', 'document_1', 'document_2', 'document_3', 'tape_recorder', 'small_gear', 'medium_gear', 'big_gear', 'pickaxe', 'spear', 'old_gear', 'blue_relic'];
const placeByStatue = { 3: 'stone', 5: 'pickaxe', 10: 'bucket', 8: 'spear' };
let game = null;
let playerId = localStorage.getItem('enigmakhi-player-id') || null;
let draftName = localStorage.getItem('enigmakhi-player-name') || '';
let selectedCoin = Number(localStorage.getItem('enigmakhi-player-coin') || 1);
let toastTimer;
const coins = [
  { icon: '𓆣', name: 'Scarabée' }, { icon: '𓂀', name: 'Œil' },
  { icon: '𓋹', name: 'Ankh' }, { icon: '☼', name: 'Soleil' },
  { icon: '𓃭', name: 'Lion' }, { icon: '♜', name: 'Tour' },
  { icon: '◈', name: 'Sceau' }, { icon: '⚱', name: 'Vase' },
];
const redClues = {
  'horse-zone': { title:'Salle du Cheval', kicker:'SECTEUR DE HOWARD', icon:'♞', evidence:'Secteur de Howard', body:'Howard travaille dans l’ancienne salle-dortoir, au nord-ouest du plan. Des gravures couvrent le mur. Un passage mène vers le couloir central, mais sa forme paraît trop régulière pour être naturelle.', actions:['horse-mark','horse-inscription'] },
  'whale-zone': { title:'Salle de la Baleine', kicker:'SECTEUR DE HUGH & EVELYN', icon:'≈', evidence:'Salle de la Baleine', body:'Des bassins et des objets de toilette occupent cette salle. Hugh y fouille depuis une semaine ; Evelyn, son assistante, circule aussi entre ce secteur, celui d’Omar et la salle de George.', actions:['whale-mark','plug-whale'] },
  'falcon-zone': { title:'Salle du Faucon', kicker:'SECTEUR CENTRAL · OMAR', icon:'⌁', evidence:'Salle du Faucon', body:'Omar a été assigné à cette zone riche en inscriptions. Une fresque percée de trous se trouve près du passage. La pièce centrale semble relier les autres secteurs.', actions:['falcon-mark','wind-holes','plug-corridor'] },
  'phoenix-zone': { title:'Salle du Phénix', kicker:'SCÈNE DU CRIME · GEORGE', icon:'✳', evidence:'Scène du crime', body:'George Herbert a été retrouvé ici à 14 h 04, couvert de sang. Trois impacts de balle sont visibles au niveau du cœur et du foie. La fresque raconte le retour d’un homme que l’on croyait mort.', actions:['crime-scene','phoenix-mark','handkerchief','plug-phoenix'] },
  'passage-clue': { title:'Une faille dans la paroi', kicker:'PASSAGE DISSIMULÉ ?', icon:'⌁', evidence:'Passage suspect', body:'Un courant d’air froid traverse une fente près de la salle d’Howard. La poussière a été déplacée récemment. George et Howard avaient découvert une annexe dans ce secteur deux semaines plus tôt.', actions:['horse-inscription'] },
  'suspect-howard': { title:'Howard Carter', kicker:'DOSSIER · SUSPECT N° 01', icon:'HC', evidence:'Dossier Howard Carter', body:'Archéologue de 48 ans, arrivé à 13 h 50. Il porte une chemise blanche, des bretelles noires froissées et des chaussures étonnamment propres. Il accuse Omar, mais refuse de répondre aux questions sans avocat. Lui et George partageaient un secret : une salle cachée et une relique dont Howard espérait tirer sa réhabilitation.', actions:['entry-log'] },
  'suspect-evelyn': { title:'Evelyn Beauchamp', kicker:'DOSSIER · SUSPECTE N° 02', icon:'EB', evidence:'Dossier Evelyn Beauchamp', body:'Chercheuse de 27 ans, arrivée à 11 h 45. Assistante de Hugh, elle se déplaçait entre les salles de la Baleine, du Faucon et du Phénix. Elle a crié en découvrant George, puis a essayé de vérifier s’il respirait. Elle dit avoir appelé les responsables à l’entrée.', actions:['entry-log','handkerchief'] },
  'suspect-hugh': { title:'Hugh White', kicker:'DOSSIER · SUSPECT N° 03', icon:'HW', evidence:'Dossier Hugh White', body:'Historien de 40 ans, arrivé à 10 h 13 et parti à 13 h 53 selon le registre. Il fouillait la salle de la Baleine. Son mouchoir ensanglanté a été retrouvé près du corps ; il affirme l’avoir prêté à George en sortant.', actions:['entry-log','handkerchief'] },
  'suspect-omar': { title:'Omar Zboubi', kicker:'DOSSIER · SUSPECT N° 04', icon:'OZ', evidence:'Dossier Omar Zboubi', body:'Archéologue de 32 ans, arrivé trois jours plus tôt et affecté au secteur central. Il connaissait George depuis d’autres fouilles et lui a parlé de l’Atlantique. Howard l’accuse, mais Omar sait qu’il n’a pas tué son ami.', actions:['entry-log','falcon-zone'] },
  'horse-mark': { title:'La fresque du Cheval', kicker:'MARQUES ÉLÉMENTAIRES', icon:'♞', evidence:'Fresque du Cheval', body:'La fresque raconte le voyage du sage revenu à Malte après trois années d’exil. Les marques gravées sont Aqua et Terra. Un petit actionneur porte aussi le signe Ventus.', actions:['activate-horse','horse-inscription'] },
  'whale-mark': { title:'La fresque de la Baleine', kicker:'MARQUES ÉLÉMENTAIRES', icon:'≈', evidence:'Fresque de la Baleine', body:'Le sage et son faucon ont été trahis en mer. Une baleine a sauvé l’homme, qui s’est réveillé blessé sur une plage. Les marques gravées sont Ignis et Aqua.', actions:['activate-whale'] },
  'falcon-mark': { title:'La fresque du Faucon', kicker:'MARQUES ÉLÉMENTAIRES', icon:'⌁', evidence:'Fresque du Faucon', body:'Un homme savant arrive à Malte avec son faucon et devient responsable du port. L’histoire s’arrête au moment où il part chasser une baleine. Les marques gravées sont Ventus et Aqua.', actions:['activate-falcon'] },
  'phoenix-mark': { title:'La fresque du Phénix', kicker:'ACTIONNEUR ENDOMMAGÉ', icon:'✳', evidence:'Fresque du Phénix', body:'Le faucon revient vivant, marqué par la tempête. L’homme et ses anciens compagnons fondent le clan des Phénix Blancs pour rétablir la justice. Les marques Ignis et Ventus sont lisibles, mais l’actionneur de cette salle est bloqué.', actions:['handkerchief'] },
  'crime-scene': { title:'Le corps de George', kicker:'RAPPORT DE SCÈNE', icon:'✳', evidence:'Trois impacts de balle', body:'George a été atteint par trois balles au cœur et au foie. Le corps est encore chaud à 14 h 04 : le meurtre remonte à moins de vingt minutes. Les gardes ont verrouillé l’entrée après le cri d’Evelyn. Personne ne peut quitter le site.', actions:['entry-log','handkerchief'] },
  'handkerchief': { title:'Le mouchoir ensanglanté', kicker:'INDICE · EMPREINTES', icon:'▤', evidence:'Mouchoir de Hugh', body:'Un mouchoir portant le sang de George et les empreintes de la victime et des trois suspects est retrouvé au sol. Hugh dit l’avoir prêté à George en quittant le site. Evelyn affirme l’avoir touché pour vérifier si George était vivant. Les empreintes seules ne désignent donc pas le tireur.', actions:['entry-log'] },
  'entry-log': { title:'Registre des entrées', kicker:'INDICE · FENÊTRE DU MEURTRE', icon:'◷', evidence:'Horaires du registre', body:'Hugh est entré à 10 h 13 et ressorti à 13 h 53. George est arrivé à 13 h 47, Howard à 13 h 50 et Evelyn à 11 h 45. Le corps encore chaud resserre la fenêtre à 13 h 44–14 h 04 : Hugh reste donc à vérifier malgré son départ déclaré.', actions:['crime-scene'] },
  'horse-inscription': { title:'L’inscription du passage', kicker:'ÉNIGME · LATIN', icon:'E', evidence:'Inscription EQUUS', body:'Une phrase presque effacée évoque « le nom latin de la monture » et les premiers signes à suivre. Dans la fresque, le sage quitte son refuge pour revenir à Malte. Quelle est la monture ?', actions:['equus-door','horse-cache'] },
  'wind-holes': { title:'La fresque à trous', kicker:'ÉNIGME · LE VENT', icon:'◎', evidence:'Fresque à trous', body:'Trois bouchons de pierre manquent à cette fresque centrale. Les notes indiquent que le vent ne soufflera qu’après avoir activé le signe Ventus dans chacune des trois salles accessibles.', actions:['plug-corridor'] },
  'plug-whale': { title:'Un bouchon dans un bassin', kicker:'OBJET · PIERRE SCULPTÉE', icon:'●', evidence:'Bouchon de la Baleine', body:'Au fond d’un bassin asséché, vous trouvez un bouchon de pierre ajusté à la taille des trous de la fresque centrale.' },
  'plug-corridor': { title:'Un bouchon dans le couloir', kicker:'OBJET · PIERRE SCULPTÉE', icon:'●', evidence:'Bouchon du couloir', body:'Coincé derrière une dalle déplacée, un deuxième bouchon porte le même symbole en spirale que la fresque du Faucon.' },
  'plug-phoenix': { title:'Un bouchon près du Phénix', kicker:'OBJET · PIERRE SCULPTÉE', icon:'●', evidence:'Bouchon du Phénix', body:'Une troisième pièce de pierre est retrouvée sous un fragment de fresque tombé au sol. Son revers est marqué d’un signe de vent.' },
  'horse-cache': { title:'L’annexe du Cheval', kicker:'SALLE CACHÉE DÉCOUVERTE', icon:'♞', evidence:'Pistolet et carnet de George', body:'Dans la cache, vous trouvez un Beretta 92 muni d’un silencieux et le carnet de George. Le carnet révèle le plan d’Howard : faire disparaître les outils de Hugh, profiter de la diversion pour passer par l’annexe, tuer George et voler ses notes. Howard est le meurtrier. Le groupe le ligote avant l’arrivée de la police.' },
  'falcon-cache': { title:'L’annexe du Faucon', kicker:'SALLE CACHÉE DÉCOUVERTE', icon:'⌁', evidence:'Entrée de l’annexe du Faucon', body:'Un vent ancien pousse derrière la fresque percée. Le passage s’ouvre sur une alcôve mécanique : un mécanisme plus profond semble encore attendre d’être activé.' },
  'red-relic': { title:'La relique du Faucon', kicker:'VISION · PROCHAINE DESTINATION', icon:'✦', evidence:'Relique retrouvée', body:'Omar actionne le mécanisme final. Une relique apparaît dans le mur et une vision le submerge. Le message le dirige vers la prochaine étape : Gizeh, la salle jaune.' },
};
let activeRedClue = null;

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
$('#player-name').value = draftName;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2400);
}
async function api(path, data) {
  const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Une erreur est survenue.');
  return result;
}
async function act(action, extra = {}) {
  if (!playerId) return toast('Rejoins l’expédition avant d’agir.');
  try {
    await api('/api/action', { action, playerId, ...extra });
    const hint = action === 'take' ? 'Objet ajouté à l’inventaire commun.' : null;
    if (hint) toast(hint);
  } catch (error) { toast(error.message); }
}
function accessible(item) {
  return item.location === 'room' || item.location === 'center-table'
    || (item.location === 'hidden-floor-1' && game.floor1)
    || (item.location === 'hidden-floor-2' && game.floor2)
    || (item.location === 'under-statue' && game.underStatue)
    || (item.location === 'hidden-wall' && game.muralBroken);
}
function objectButton(label, action, data = {}) {
  return `<button class="mini-action" data-action="${action}" ${Object.entries(data).map(([key, val]) => `data-${key}="${esc(val)}"`).join(' ')}>${label}</button>`;
}
function renderMap() {
  const active = new Set(game.torches);
  const torches = torchPositions.map(([x, y], index) => {
    const id = index + 1;
    const isActive = active.has(id);
    return `<button class="torch-point ${isActive ? 'is-flame' : ''}" style="left:${x}%;top:${y}%" aria-label="Statue ${id}${isActive ? ', torche allumée' : ''}" title="${isActive ? `Faire avancer la flamme ${id}` : `Statue ${id}`}" ${isActive ? `data-action="cycle-torch" data-torch-id="${id}"` : 'disabled'}>${id}</button>`;
  }).join('');
  const murals = muralPositions.map(([x, y], index) => `<span class="torch-point is-mural" style="left:${x}%;top:${y}%;pointer-events:none" aria-hidden="true">${index + 1}</span>`).join('');
  $('#torch-points').innerHTML = torches + murals;
  const mapSrc = game.rotated ? '/assets/blue_room_map_2.jpg' : '/assets/blue_room_map_1.jpg';
  if ($('#room-map').getAttribute('src') !== mapSrc) $('#room-map').src = mapSrc;
}
function objectActions(item) {
  const inv = game.inventory;
  let action = '';
  if (item.id === 'center-table') {
    if (game.tableActive && !game.rotated) action = objectButton('Activer', 'rotate-table');
    else if (game.rotated) action = '<small>Mécanisme activé</small>';
    else action = `<small>${game.insertedGears.length}/4 roues installées</small>`;
  } else if (item.id === 'mural-2') {
    action = game.muralBroken ? '<small>Fresque brisée</small>' : objectButton('Frapper', 'break-mural');
  } else if (item.id.startsWith('statue-')) {
    const statueId = Number(item.id.split('-')[1]);
    const wanted = placeByStatue[statueId];
    if (wanted && (inv.includes(wanted) || (statueId === 8 && game.items.spear.location === 'statue-8')) && !game.statueItems[String(statueId)]) action = objectButton('Placer', 'place-statue', { statueId });
    else action = `<small>${game.statueItems[String(statueId)] ? 'Objet placé' : statueId === 8 ? 'La lance peut être prise' : 'Statue ancienne'}</small>`;
  } else if (item.pickable && accessible(item)) {
    action = objectButton('Ramasser', 'take', { itemId: item.id });
  } else if (item.id === 'inventory') action = `<small>${inv.length} objet${inv.length === 1 ? '' : 's'} rassemblé${inv.length === 1 ? '' : 's'}</small>`;
  else if (item.id === 'map') action = '<small>Plan de la salle</small>';
  else if (item.id.startsWith('document-')) action = '<small>Un document à examiner</small>';
  else if (item.id.startsWith('mural-')) action = '<small>Des marques anciennes</small>';
  else if (item.id === 'water') action = '<small>Un point d’eau</small>';
  else if (item.id === 'center-table') action = `<small>${game.insertedGears.length}/4 roues installées</small>`;
  else if (item.location === 'hidden-wall' && game.muralBroken) action = objectButton('Ramasser', 'take', { itemId: item.id });
  else action = '<small>À observer</small>';
  return action;
}
function renderObjects() {
  const items = itemOrder.map((id) => game.items[id]).filter((item) => item && item.pickable && accessible(item) && item.location !== 'inventory');
  const roomCards = [
    { id: 'inventory', name: 'Inventaire', image: 'inventory.png', location: 'room', pickable: false },
    { id: 'map', name: 'Carte de la salle', image: 'map.png', location: 'room', pickable: false },
    { id: 'center-table', name: 'Table centrale', image: 'center_table.png', location: 'room', pickable: false },
    { id: 'water', name: 'Bassin d’eau', image: 'bucket.png', location: 'room', pickable: false },
    ...Array.from({ length: 12 }, (_, i) => ({ id: `statue-${i + 1}`, name: `Statue ${i + 1}`, image: i + 1 === 8 ? 'spear.png' : 'stone.png', location: 'room', pickable: false })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `mural-${i + 1}`, name: `Fresque ${i + 1}`, image: game.muralBroken && i === 1 ? 'mural_broken.png' : 'mural_text.png', location: 'room', pickable: false })),
  ];
  const visible = [...roomCards, ...items.filter((item) => !['old_gear','spear'].includes(item.id))];
  $('#object-count').textContent = `${visible.length} éléments`;
  $('#object-grid').innerHTML = visible.map((item) => `<article class="object-card"><img src="/assets/${esc(item.image)}" alt=""><span class="object-copy"><strong>${esc(item.name)}</strong><small>${esc(item.id === 'center-table' ? `${game.insertedGears.length}/4 roues` : item.id.startsWith('statue-') && game.statueItems[item.id.split('-')[1]] ? 'Objet placé' : item.location === 'room' ? 'Dans la salle' : 'Cache révélée')}</small></span>${objectActions(item)}</article>`).join('');
}
function renderInventory() {
  const selected = itemOrder.filter((id) => game.inventory.includes(id));
  $('#inventory-count').textContent = selected.length;
  $('#inventory-list').innerHTML = selected.length ? selected.map((id) => {
    const item = game.items[id];
    let action = '';
    if (['small_gear', 'medium_gear', 'big_gear'].includes(id)) action = objectButton('Installer', 'insert-gear', { itemId: id });
    if (id === 'blue_relic') action = objectButton('Utiliser', 'use-relic');
    return `<div class="inventory-item"><img src="/assets/${esc(item.image)}" alt=""><span>${esc(item.name)}</span>${action}</div>`;
  }).join('') : '<div class="empty-state">Les objets ramassés par l’équipe apparaîtront ici.</div>';
}
function renderPlayers() {
  $('#team-count').textContent = `${game.players.length} joueur${game.players.length === 1 ? '' : 's'}`;
  $('#player-list').innerHTML = game.players.map((player) => `<span class="player-chip"><i style="--player-color:${esc(player.color)}"></i>${coins[(Number(player.coin || 1) - 1) % coins.length].icon} ${esc(player.name)}${player.id === playerId ? ' · vous' : ''}</span>`).join('') || '<span class="empty-state">L’expédition vous attend.</span>';
  const isMember = game.players.some((player) => player.id === playerId);
  $('#join-box').classList.toggle('joined', isMember);
  $('#join-box').innerHTML = isMember ? '<span class="joined-label">✓ Vous faites partie de l’expédition</span>' : `<input id="player-name" maxlength="22" placeholder="Votre nom" autocomplete="nickname" value="${esc(draftName)}"><button id="join-button">Rejoindre <span>→</span></button>`;
}
function renderLanding() {
  const count = game.players.length;
  $('#welcome-player-count').textContent = count;
  $('#header-player-count').textContent = `${count} AKHI${count === 1 ? '' : 'S'}`;
  $('#team-preview-count').textContent = count ? `${count} joueur${count === 1 ? '' : 's'} dans l’équipe` : 'Personne n’a rejoint pour l’instant';
  $('#welcome-players').innerHTML = game.players.slice(0, 8).map((player) => `<span class="coin-avatar" title="${esc(player.name)}">${coins[(Number(player.coin || 1) - 1) % coins.length].icon}</span>`).join('');
  $('#coin-picker').innerHTML = coins.map((coin, index) => `<button type="button" class="coin-choice ${selectedCoin === index + 1 ? 'selected' : ''}" role="radio" aria-checked="${selectedCoin === index + 1}" aria-label="Pièce ${index + 1} : ${coin.name}" title="${coin.name}" data-coin="${index + 1}">${coin.icon}</button>`).join('');
  const isMember = game.players.some((player) => player.id === playerId);
  const controls = $('#welcome-join-controls');
  if (isMember) {
    const player = game.players.find((entry) => entry.id === playerId);
    controls.innerHTML = `<div class="joined-panel"><span class="coin-avatar">${coins[(Number(player.coin || 1) - 1) % coins.length].icon}</span><span class="joined-name">Ta pièce est choisie.<br><b>${esc(player.name)}</b></span><div class="room-choice"><button id="start-game-button">Expédition 01 · Salle bleue <span>→</span></button><button id="start-red-button">Enquête 03 · Salle rouge <span>→</span></button></div></div>`;
  } else {
    controls.innerHTML = '<button id="join-button" class="join-submit">Rejoindre la partie <span>→</span></button>';
  }
}
function showScreen(screen) {
  const showWelcome = screen === 'welcome';
  $('#welcome-screen').classList.toggle('hidden', !showWelcome);
  $('#game-screen').classList.toggle('hidden', screen !== 'blue');
  $('#red-screen').classList.toggle('hidden', screen !== 'red');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (screen === 'red' && playerId) act('red-enter');
}
function renderJournal() {
  $('#journal').innerHTML = game.log.map((entry) => `<div class="journal-entry"><time>${esc(entry.time)}</time>${esc(entry.text)}</div>`).join('');
  $('#red-journal').innerHTML = game.log.map((entry) => `<div class="journal-entry"><time>${esc(entry.time)}</time>${esc(entry.text)}</div>`).join('');
}
function renderClues() {
  const active = new Set(game.torches);
  $('#flame-sequence').innerHTML = game.torches.map((torch, index) => `<div class="flame-row"><span>Statue ${index === 0 ? 'Nord-est' : index === 1 ? 'Sud-est' : index === 2 ? 'Sud-ouest' : 'Nord-ouest'}</span><span><i class="state-dot"></i> ${torch}</span><span>Allumée</span></div>`).join('');
  const objective = game.finished ? ['Porte ouverte', 'La salle rouge vous attend.'] : game.floor2 ? ['Retrouver la relique', 'Elle repose dans la cache sous le sol.'] : game.rotated ? ['Réveiller les flammes', 'La salle a pivoté : trouvez la seconde combinaison.'] : game.tableActive ? ['Activer la table', 'Le mécanisme est prêt à être enclenché.'] : game.floor1 ? ['Explorer la cache', 'Récupérez les objets qui viennent d’apparaître.'] : game.muralSolved ? ['Briser la fresque', 'La pioche permet de révéler la cache murale.'] : ['Explorer les statues', 'Observez les flammes et les fresques de la salle.'];
  $('#objective-title').textContent = objective[0];
  $('#objective-detail').textContent = objective[1];
  $('#progress-fill').style.width = `${game.finished ? 100 : game.floor2 ? 82 : game.rotated ? 68 : game.tableActive ? 55 : game.floor1 ? 37 : game.muralSolved ? 24 : 12}%`;
  $('#connection-label').textContent = 'Synchronisé en direct';
}
function render() {
  if (!game) return;
  renderMap(); renderObjects(); renderInventory(); renderPlayers(); renderJournal(); renderClues(); renderLanding(); renderRed();
  $('#connection-label').textContent = 'Équipe synchronisée';
}
const redActionNames = {
  'horse-mark':'Lire la fresque du Cheval','whale-mark':'Lire la fresque de la Baleine','falcon-mark':'Lire la fresque du Faucon','phoenix-mark':'Lire la fresque du Phénix',
  'horse-inscription':'Examiner l’inscription latine','wind-holes':'Examiner la fresque à trous','handkerchief':'Examiner le mouchoir ensanglanté','entry-log':'Consulter le registre','crime-scene':'Examiner le corps',
  'plug-whale':'Chercher dans les bassins','plug-corridor':'Chercher dans le couloir','plug-phoenix':'Fouiller les débris du Phénix','passage-clue':'Examiner le passage','falcon-zone':'Retourner à la salle du Faucon',
};
function renderRedActions(clue, red) {
  const items = (clue.actions || []).map((id) => {
    if (id.startsWith('activate-')) {
      const room = id.slice('activate-'.length);
      const active = red.ventus.includes(room);
      return `<button class="red-action-button ${active ? 'done' : ''}" data-action="red-activate" data-room="${room}" ${active ? 'disabled' : ''}>${active ? '✓ Ventus activé' : 'Activer Ventus'}</button>`;
    }
    if (id === 'equus-door') {
      return red.horseOpen ? '<span class="action-complete">✓ Passage ouvert · Howard est ligoté</span>' : '<div class="equus-form"><label for="equus-code">Nom latin de la monture</label><div><input id="equus-code" maxlength="5" placeholder="5 lettres"><button class="red-action-button" data-action="red-open-horse">Ouvrir</button></div></div>';
    }
    if (id === 'wind-holes') {
      if (!red.windReady) return `<button class="red-action-button secondary" data-red-clue="wind-holes">${redActionNames[id]}</button><small class="red-action-hint">Ventus activé : ${red.ventus.length}/3 salles</small>`;
      return `<div class="plug-controls"><span>Bouchons trouvés : ${red.plugs.length}/3 · trous remplis : ${red.plugged.length}/3</span><div>${[1,2,3].map((slot) => `<button class="plug-slot ${red.plugged.includes(slot) ? 'done' : ''}" data-action="red-place-plug" data-slot="${slot}" ${red.plugged.includes(slot) || red.plugs.length <= red.usedPlugs.length ? 'disabled' : ''}>${red.plugged.includes(slot) ? '✓' : `Trou ${slot}`}</button>`).join('')}</div></div>`;
    }
    if (id === 'horse-cache') return red.horseOpen ? `<button class="red-action-button secondary" data-red-clue="horse-cache">Ouvrir l’annexe du Cheval</button>` : '';
    if (id === 'falcon-cache') return red.falconOpen ? `<button class="red-action-button secondary" data-red-clue="falcon-cache">Entrer dans l’annexe du Faucon</button>` : '';
    if (id === 'red-finalize') return '';
    const label = redActionNames[id] || `Examiner : ${id.replaceAll('-', ' ')}`;
    const already = red.inspected.includes(id);
    if (id.startsWith('plug-') && already) return `<span class="action-complete">✓ Bouchon récupéré</span>`;
    if (id === 'falcon-cache' && !red.falconOpen) return '';
    if (id === 'horse-cache' && !red.horseOpen) return '';
    return `<button class="red-action-button secondary" data-red-clue="${id}">${already ? 'Relire' : label}</button>`;
  }).filter(Boolean).join('');
  if (clue === redClues['falcon-cache']) {
    const murals = ['horse-mark','whale-mark','falcon-mark','phoenix-mark'];
    const ready = red.horseOpen && red.falconOpen && murals.every((id) => red.inspected.includes(id));
    return `${items}${red.finished ? '<button class="red-action-button secondary" data-red-clue="red-relic">Consulter la vision d’Omar →</button>' : ready ? '<button class="red-action-button finale-button" data-action="red-finalize">Activer le mécanisme final <span>→</span></button>' : `<small class="red-action-hint">${red.horseOpen ? 'Annexe du Cheval découverte' : 'Annexe du Cheval à découvrir'} · ${red.inspected.filter((id) => murals.includes(id)).length}/4 fresques lues</small>`}`;
  }
  return items;
}
function renderRed() {
  if (!game?.red) return;
  const red = game.red;
  const evidenceIds = [...new Set([...red.inspected, ...red.plugs.map((plug) => `objet-${plug}`)])];
  const labels = Object.fromEntries(Object.entries(redClues).map(([id, clue]) => [id, clue.evidence]));
  $('#red-evidence-count').textContent = evidenceIds.length;
  $('#red-evidence-list').innerHTML = evidenceIds.length ? evidenceIds.map((id) => `<div class="evidence-entry"><i>${id.startsWith('objet-') ? '●' : '✦'}</i><span>${esc(labels[id.replace('objet-','')] || (id === 'objet-plug-whale' ? 'Bouchon de la Baleine' : id === 'objet-plug-corridor' ? 'Bouchon du couloir' : id === 'objet-plug-phoenix' ? 'Bouchon du Phénix' : id.replaceAll('-', ' ')))}</span><b>✓</b></div>`).join('') : '<p class="empty-state">Les découvertes de l’équipe apparaîtront ici.</p>';
  const steps = [
    `<div class="mechanism-row ${red.ventus.length === 3 ? 'complete' : ''}"><span class="mechanism-icon">≈</span><span><b>Réveiller le Ventus</b><small>${red.ventus.length}/3 fresques accessibles</small></span><i>${red.windReady ? '✓' : '·'}</i></div>`,
    `<div class="mechanism-row ${red.plugged.length === 3 ? 'complete' : ''}"><span class="mechanism-icon">◎</span><span><b>Ouvrir l’annexe du Faucon</b><small>${red.plugs.length}/3 bouchons · ${red.plugged.length}/3 trous</small></span><i>${red.falconOpen ? '✓' : '·'}</i></div>`,
    `<div class="mechanism-row ${red.horseOpen ? 'complete' : ''}"><span class="mechanism-icon">♞</span><span><b>Ouvrir l’annexe du Cheval</b><small>${red.horseOpen ? 'Howard est démasqué' : 'Indice latin : EQUUS'}</small></span><i>${red.horseOpen ? '✓' : '·'}</i></div>`,
    `<div class="mechanism-row ${red.finished ? 'complete' : ''}"><span class="mechanism-icon">✦</span><span><b>Retrouver la relique</b><small>${red.finished ? 'Vision de Gizeh reçue' : 'Les deux passages mènent au mécanisme final'}</small></span><i>${red.finished ? '✓' : '·'}</i></div>`,
  ];
  $('#red-mechanism-status').innerHTML = steps.join('');
  for (const [selector, isOpen] of [['.hotspot-horse',red.horseOpen],['.hotspot-falcon',red.falconOpen]]) {
    const node = $(selector);
    const clueId = selector === '.hotspot-horse' ? (isOpen ? 'horse-cache' : 'horse-zone') : (isOpen ? 'falcon-cache' : 'falcon-zone');
    node.dataset.redClue = clueId;
    node.classList.toggle('is-open', isOpen);
  }
  document.querySelectorAll('.map-hotspot').forEach((node) => node.classList.toggle('is-visited', red.inspected.includes(node.dataset.redClue)));
  if (!activeRedClue || !redClues[activeRedClue]) return;
  const clue = redClues[activeRedClue];
  $('#red-inspector-icon').textContent = clue.icon;
  $('#red-inspector-kicker').textContent = clue.kicker;
  $('#red-inspector-title').textContent = clue.title;
  $('#red-inspector-copy').textContent = clue.body;
  $('#red-inspector-actions').innerHTML = renderRedActions(clue, red);
}
async function join() {
  const input = $('#player-name');
  const name = (input?.value || draftName).trim();
  if (!name) return toast('Entre ton nom pour rejoindre l’expédition.');
  draftName = name;
  try {
    const result = await api('/api/join', { name, coin: selectedCoin, playerId });
    playerId = result.player.id;
    localStorage.setItem('enigmakhi-player-id', playerId);
    localStorage.setItem('enigmakhi-player-name', name);
    localStorage.setItem('enigmakhi-player-coin', selectedCoin);
    toast(`Bienvenue dans l’expédition, ${name} !`);
    render();
  } catch (error) { toast(error.message); }
}
document.addEventListener('input', (event) => { if (event.target.id === 'player-name') draftName = event.target.value; });
document.addEventListener('click', (event) => {
  const redClue = event.target.closest('[data-red-clue]');
  if (redClue) {
    activeRedClue = redClue.dataset.redClue;
    $('#red-inspector-title').textContent = 'Examen en cours…';
    act('red-inspect', { clueId: activeRedClue });
  }
  const target = event.target.closest('[data-action]');
  if (target) {
    const extra = {};
    if (target.dataset.itemId) extra.itemId = target.dataset.itemId;
    if (target.dataset.torchId) extra.torchId = target.dataset.torchId;
    if (target.dataset.statueId) extra.statueId = target.dataset.statueId;
    if (target.dataset.room) extra.room = target.dataset.room;
    if (target.dataset.slot) extra.slot = target.dataset.slot;
    if (target.dataset.action === 'red-open-horse') extra.code = $('#equus-code')?.value || '';
    act(target.dataset.action, extra);
  }
  const coin = event.target.closest('[data-coin]');
  if (coin) {
    selectedCoin = Number(coin.dataset.coin);
    localStorage.setItem('enigmakhi-player-coin', selectedCoin);
    document.querySelectorAll('.coin-choice').forEach((button) => {
      const selected = Number(button.dataset.coin) === selectedCoin;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  }
  if (event.target.closest('#join-button')) join();
  if (event.target.closest('#start-game-button')) showScreen('blue');
  if (event.target.closest('#start-red-button')) showScreen('red');
  if (event.target.closest('#back-to-welcome-red')) showScreen('welcome');
  if (event.target.closest('#back-to-welcome') || event.target.closest('#home-link')) {
    event.preventDefault();
    showScreen('welcome');
  }
  if (event.target.closest('#share-button')) {
    navigator.clipboard?.writeText(location.href).then(() => toast('Lien de la partie copié.')).catch(() => toast('Copie le lien affiché dans la barre d’adresse.'));
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.id === 'player-name') join();
  if (event.key === 'Enter' && event.target.id === 'equus-code') act('red-open-horse', { code: event.target.value });
});
fetch(stateUrl).then((response) => response.json()).then((snapshot) => { game = snapshot; render(); }).catch(() => toast('Impossible de joindre le serveur de la partie.'));
const events = new EventSource('/api/events');
events.onmessage = (event) => { game = JSON.parse(event.data); render(); };
events.onerror = () => { $('#connection-label').textContent = 'Reconnexion…'; };
