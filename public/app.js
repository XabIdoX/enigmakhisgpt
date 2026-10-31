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
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
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
  $('#player-list').innerHTML = game.players.map((player) => `<span class="player-chip"><i style="--player-color:${esc(player.color)}"></i>${esc(player.name)}${player.id === playerId ? ' · vous' : ''}</span>`).join('') || '<span class="empty-state">L’expédition vous attend.</span>';
  const isMember = game.players.some((player) => player.id === playerId);
  $('#join-box').classList.toggle('joined', isMember);
  $('#join-box').innerHTML = isMember ? '<span class="joined-label">✓ Vous faites partie de l’expédition</span>' : `<input id="player-name" maxlength="22" placeholder="Votre nom" autocomplete="nickname" value="${esc(draftName)}"><button id="join-button">Rejoindre <span>→</span></button>`;
}
function renderJournal() {
  $('#journal').innerHTML = game.log.map((entry) => `<div class="journal-entry"><time>${esc(entry.time)}</time>${esc(entry.text)}</div>`).join('');
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
  renderMap(); renderObjects(); renderInventory(); renderPlayers(); renderJournal(); renderClues();
}
async function join() {
  const input = $('#player-name');
  const name = (input?.value || draftName).trim();
  if (!name) return toast('Entre ton nom pour rejoindre l’expédition.');
  draftName = name;
  try {
    const result = await api('/api/join', { name });
    playerId = result.player.id;
    localStorage.setItem('enigmakhi-player-id', playerId);
    localStorage.setItem('enigmakhi-player-name', name);
    toast(`Bienvenue dans l’expédition, ${name} !`);
    render();
  } catch (error) { toast(error.message); }
}
document.addEventListener('input', (event) => { if (event.target.id === 'player-name') draftName = event.target.value; });
document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (target) {
    const extra = {};
    if (target.dataset.itemId) extra.itemId = target.dataset.itemId;
    if (target.dataset.torchId) extra.torchId = target.dataset.torchId;
    if (target.dataset.statueId) extra.statueId = target.dataset.statueId;
    act(target.dataset.action, extra);
  }
  if (event.target.closest('#join-button')) join();
  if (event.target.closest('#share-button')) {
    navigator.clipboard?.writeText(location.href).then(() => toast('Lien de la partie copié.')).catch(() => toast('Copie le lien affiché dans la barre d’adresse.'));
  }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Enter' && event.target.id === 'player-name') join(); });
fetch(stateUrl).then((response) => response.json()).then((snapshot) => { game = snapshot; render(); }).catch(() => toast('Impossible de joindre le serveur de la partie.'));
const events = new EventSource('/api/events');
events.onmessage = (event) => { game = JSON.parse(event.data); render(); };
events.onerror = () => { $('#connection-label').textContent = 'Reconnexion…'; };
