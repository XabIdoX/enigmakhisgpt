const stateUrl = '/api/state';
const storage = {
  getItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
  setItem(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } },
};
const itemOrder = ['stone', 'bucket', 'tape_1', 'tape_2', 'document_1', 'document_2', 'document_3', 'tape_recorder', 'small_gear', 'medium_gear', 'big_gear', 'pickaxe', 'spear', 'old_gear', 'blue_relic'];
const placeByStatue = { 3: 'stone', 5: 'pickaxe', 10: 'bucket', 8: 'spear' };
let game = null;
let playerId = storage.getItem('enigmakhi-player-id') || null;
let draftName = storage.getItem('enigmakhi-player-name') || '';
let selectedCoin = Number(storage.getItem('enigmakhi-player-coin') || 1);
if (!Number.isInteger(selectedCoin) || selectedCoin < 1 || selectedCoin > 8) selectedCoin = 1;
let currentScreen = 'welcome';
let objectFilter = 'all';
let inspectableObjects = new Map();
let joining = false;
let equusDraft = '';
const pendingActions = new Set();
let toastTimer;
let selectedSceneObject = 'center-table';
let previousDiscoveries = null;
let discoveryQueue = [];
let discoveryTimer = null;
const sceneDiscoveries = [
  { key:'muralSolved', target:'mural-2', text:'Une vibration parcourt la pierre. La fresque se fissure…' },
  { key:'floor1', target:'floor-1', text:'La table se déplace. Une cache s’ouvre sous le mécanisme !' },
  { key:'underStatue', target:'statue-1', text:'Le premier gardien se soulève. Une roue apparaît sous son socle.' },
  { key:'muralBroken', target:'mural-2', text:'La fresque cède ! Une petite roue dentée apparaît dans le mur.' },
  { key:'floor2', target:'floor-2', text:'La seconde dalle s’écarte. La relique bleue émerge des profondeurs.' },
];
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
  'horse-inscription': { title:'L’inscription du passage', kicker:'ÉNIGME · LATIN', icon:'E', evidence:'Inscription latine', body:'Une phrase presque effacée évoque « le nom latin de la monture » et les premiers signes à suivre. Dans la fresque, le sage quitte son refuge pour revenir à Malte. Quelle est la monture ?', actions:['equus-door','horse-cache'] },
  'wind-holes': { title:'La fresque à trous', kicker:'ÉNIGME · LE VENT', icon:'◎', evidence:'Fresque à trous', body:'Trois bouchons de pierre manquent à cette fresque centrale. Les notes indiquent que le vent ne soufflera qu’après avoir activé le signe Ventus dans chacune des trois salles accessibles.', actions:['wind-controls','plug-corridor','falcon-cache'] },
  'plug-whale': { title:'Un bouchon dans un bassin', kicker:'OBJET · PIERRE SCULPTÉE', icon:'●', evidence:'Bouchon de la Baleine', body:'Au fond d’un bassin asséché, vous trouvez un bouchon de pierre ajusté à la taille des trous de la fresque centrale.' },
  'plug-corridor': { title:'Un bouchon dans le couloir', kicker:'OBJET · PIERRE SCULPTÉE', icon:'●', evidence:'Bouchon du couloir', body:'Coincé derrière une dalle déplacée, un deuxième bouchon porte le même symbole en spirale que la fresque du Faucon.' },
  'plug-phoenix': { title:'Un bouchon près du Phénix', kicker:'OBJET · PIERRE SCULPTÉE', icon:'●', evidence:'Bouchon du Phénix', body:'Une troisième pièce de pierre est retrouvée sous un fragment de fresque tombé au sol. Son revers est marqué d’un signe de vent.' },
  'horse-cache': { title:'L’annexe du Cheval', kicker:'SALLE CACHÉE DÉCOUVERTE', icon:'♞', evidence:'Pistolet et carnet de George', body:'Dans la cache, vous trouvez un Beretta 92 muni d’un silencieux et le carnet de George. Le carnet révèle le plan d’Howard : faire disparaître les outils de Hugh, profiter de la diversion pour passer par l’annexe, tuer George et voler ses notes. Howard est le meurtrier. Le groupe le ligote avant l’arrivée de la police.' },
  'falcon-cache': { title:'L’annexe du Faucon', kicker:'SALLE CACHÉE DÉCOUVERTE', icon:'⌁', evidence:'Entrée de l’annexe du Faucon', body:'Un vent ancien pousse derrière la fresque percée. Le passage s’ouvre sur une alcôve mécanique : un mécanisme plus profond semble encore attendre d’être activé.' },
  'red-relic': { title:'La relique du Faucon', kicker:'VISION · PROCHAINE DESTINATION', icon:'✦', evidence:'Relique retrouvée', body:'Omar actionne le mécanisme final. Une relique apparaît dans le mur et une vision le submerge. Le message le dirige vers la prochaine étape : Gizeh, la salle jaune.' },
};
let activeRedClue = null;
let requestedRedClue = null;
let redEvidenceFilter = 'all';
let previousHypogeumState = null;
const hypogeumDiscoveries = [
  { key:'windReady', effect:'wind', text:'Un courant d’air traverse les galeries. La fresque à trous s’éveille.' },
  { key:'horseOpen', effect:'horse', text:'La pierre cède. L’annexe du Cheval est ouverte.', sound:true },
  { key:'falconOpen', effect:'falcon', text:'La fresque se déplace et dévoile l’annexe du Faucon.', sound:true },
  { key:'relicFound', effect:'relic', text:'La relique apparaît dans l’annexe du Faucon.' },
];

const $ = (selector) => document.querySelector(selector);
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
$('#player-name').value = draftName;
document.body.dataset.screen = currentScreen;
function setMarkup(node, html) {
  if (node && node.innerHTML !== html) node.innerHTML = html;
}
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
  if (!game?.players.some((player) => player.id === playerId)) {
    toast('Rejoins l’expédition avant d’agir.');
    return false;
  }
  const key = JSON.stringify([action, extra]);
  if (pendingActions.has(key)) return false;
  pendingActions.add(key);
  try {
    const result = await api('/api/action', { action, playerId, ...extra });
    if (result.state && (!game || result.state.version >= game.version)) { game = result.state; render(); }
    const hint = action === 'take' ? 'Objet ajouté à l’inventaire commun.' : null;
    if (hint) toast(hint);
    return true;
  } catch (error) { toast(error.message); return false; }
  finally { pendingActions.delete(key); }
}
function accessible(item) {
  return item.location === 'room'
    || (item.location === 'hidden-floor-1' && game.floor1)
    || (item.location === 'hidden-floor-2' && game.floor2)
    || (item.location === 'under-statue' && game.underStatue)
    || (item.location === 'hidden-wall' && game.muralBroken);
}
function objectButton(label, action, data = {}) {
  return `<button class="mini-action" data-action="${action}" ${Object.entries(data).map(([key, val]) => `data-${key.replace(/[A-Z]/g, (letter) => '-' + letter.toLowerCase())}="${esc(val)}"`).join(' ')}>${label}</button>`;
}
function renderMap() {
  const scene = $('#sanctuary-scene');
  if (!scene.children.length) {
    const point = (id, label, x, y, content, style) =>
      `<button type="button" class="scene-point ${style}" data-scene-object="${id}" style="--x:${x}%;--y:${y}%" aria-label="${label}" title="${label}">${content}</button>`;
    const statues = Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 - 60) * Math.PI / 180;
      return point(`statue-${i + 1}`, `Statue ${i + 1}`, 50 + 33 * Math.cos(angle), 48 + 32 * Math.sin(angle),
        `<span class="statue-body" aria-hidden="true"><img class="guardian-sculpture" src="/assets/atlantean-guardian-torch.png" alt=""><img class="statue-offering" alt="" hidden><span class="statue-fire"></span></span><span class="scene-number">${i + 1}</span>`, 'scene-statue');
    });
    const murals = Array.from({ length: 8 }, (_, i) => {
      const angle = (i * 45 - 22.5) * Math.PI / 180;
      return point(`mural-${i + 1}`, `Fresque ${i + 1}`, 50 + 44 * Math.cos(angle), 48 + 43 * Math.sin(angle),
        `<span aria-hidden="true" class="mural-engraving">${['≋','⋈','⟡','⋀','⊙','⋔','⫶','⌁'][i]}</span><span class="scene-number">F${i + 1}</span>`, 'scene-mural');
    });
    const gears = ['old_gear','small_gear','medium_gear','big_gear'].map((id, i) =>
      `<span class="table-gear gear-${i}" data-scene-gear="${id}" aria-hidden="true"><span class="gear-wheel"><i class="gear-hub"></i></span></span>`).join('');
    const lootPositions = {
      stone:[27,45], bucket:[57,76], tape_1:[70,64], tape_2:[32,28],
      document_1:[57,24], document_2:[26,62], document_3:[69,35],
      tape_recorder:[67,53], small_gear:[89,66], medium_gear:[53,51],
      pickaxe:[49,58], big_gear:[70,24], blue_relic:[63,57],
    };
    const items = itemOrder.filter((id) => !['old_gear','spear'].includes(id)).map((id) =>
      point(id, game.items[id].name, ...lootPositions[id],
        `<img src="/assets/${game.items[id].image}" alt="">`, 'scene-loot')).join('');
    scene.innerHTML = `<div class="scene-ocean" aria-hidden="true"></div><div class="atlantean-ruins" aria-hidden="true"><i></i><i></i><i></i><i></i></div><div class="scene-chamber" aria-hidden="true"><div class="scene-floor"></div><div class="scene-compass">✧</div></div><div class="scene-entry" aria-hidden="true"></div>
      <div class="scene-elements">${statues.join('')}${murals.join('')}
      ${point('center-table','Table centrale',50,46,`<span class="table-disc" aria-hidden="true">${gears}<i class="table-needle"></i></span><span class="landmark-label">Mécanisme</span>`,'scene-table')}
      ${point('water','Bassin d’eau',50,70,'<span class="pool-water" aria-hidden="true"><i></i><i></i><i></i></span><span class="landmark-label">Bassin</span>','scene-pool')}
      ${point('floor-1','Cache sous la table',50,51,'<span aria-hidden="true">◇</span><span class="landmark-label">Cache</span>','scene-hatch')}
      ${point('floor-2','Seconde cache du sol',63,57,'<span aria-hidden="true">✧</span><span class="landmark-label">Cache</span>','scene-hatch')}
      ${items}</div><span class="scene-phase"></span><div class="scene-feedback" role="status" aria-live="polite"></div>`;
  }
  if (scene.dataset.rotated === 'false' && game.rotated && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    scene.classList.add('is-turning');
    const wheel = scene.querySelector('.gear-wheel');
    wheel.addEventListener('animationend', () => scene.classList.remove('is-turning'), { once:true });
  }
  if (!game.rotated) scene.classList.remove('is-turning');
  scene.dataset.rotated = String(game.rotated);
  scene.classList.toggle('is-rotated', game.rotated);
  scene.classList.toggle('is-ready', game.tableActive);
  scene.classList.toggle('is-complete', game.finished);
  scene.querySelector('.scene-phase').textContent = game.finished ? 'Porte ouverte' : `Mécanisme · phase ${game.rotated ? 'II' : 'I'}`;
  scene.querySelectorAll('[data-scene-object]').forEach((node) => {
    const id = node.dataset.sceneObject;
    const statue = id.startsWith('statue-');
    const lit = statue && game.torches.includes(Number(id.split('-')[1]));
    node.classList.toggle('is-lit', lit);
    if (statue) {
      const offering = game.items[game.statueItems[id.split('-')[1]]];
      const image = node.querySelector('.statue-offering');
      image.hidden = !offering;
      if (offering) image.src = '/assets/' + offering.image;
      node.classList.toggle('has-offering', !!offering);
    }
    node.classList.toggle('is-broken', id === 'mural-2' && game.muralBroken);
    node.classList.toggle('is-revealed', id === 'mural-2' && game.muralSolved);
    node.setAttribute('aria-pressed', String(id === selectedSceneObject));
    if (statue) node.setAttribute('aria-label', `Statue ${id.split('-')[1]}, ${lit ? 'flamme allumée' : 'torche éteinte'}`);
    if (id === 'floor-1' || id === 'floor-2') node.hidden = id === 'floor-1' ? !game.floor1 : !game.floor2;
    if (node.classList.contains('scene-loot')) {
      const item = game.items[id];
      node.hidden = !accessible(item) || item.location === 'inventory';
    }
  });
  scene.querySelectorAll('[data-scene-gear]').forEach((node) =>
    node.classList.toggle('is-installed', game.insertedGears.includes(node.dataset.sceneGear)));
  scene.querySelector('.scene-table').setAttribute('aria-label',
    `Table centrale, ${game.insertedGears.length}/4 roues installées`);
  updateSceneDiscoveries(scene);
  renderSceneInspector();
}

function updateSceneDiscoveries(scene) {
  const snapshot = Object.fromEntries(sceneDiscoveries.map(({ key }) => [key, !!game[key]]));
  for (const { key } of sceneDiscoveries) scene.classList.toggle('has-' + key, snapshot[key]);
  if (previousDiscoveries && sceneDiscoveries.some(({ key }) => previousDiscoveries[key] && !snapshot[key])) {
    sanctuaryAudio.stop();
    clearTimeout(discoveryTimer);
    discoveryTimer = null;
    discoveryQueue = [];
    delete scene.dataset.discovery;
    scene.querySelector('.scene-feedback').textContent = '';
  } else if (previousDiscoveries) {
    discoveryQueue.push(...sceneDiscoveries.filter(({ key }) => !previousDiscoveries[key] && snapshot[key]));
  }
  previousDiscoveries = snapshot;
  playNextDiscovery(scene);
}

function playNextDiscovery(scene) {
  if (discoveryTimer !== null || currentScreen !== 'blue' || !discoveryQueue.length) return;
  const discovery = discoveryQueue.shift();
  scene.dataset.discovery = discovery.key;
  if (discovery.key === 'floor1') sanctuaryAudio.playStone();
  scene.querySelector('.scene-feedback').textContent = discovery.text;
  selectedSceneObject = discovery.target;
  renderSceneInspector();
  discoveryTimer = setTimeout(() => {
    delete scene.dataset.discovery;
    scene.querySelector('.scene-feedback').textContent = '';
    discoveryTimer = null;
    playNextDiscovery(scene);
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 1600 : discovery.key === 'floor1' ? 6000 : 4000);
}

function renderSceneInspector() {
  const id = selectedSceneObject;
  const number = Number(id.split('-')[1]);
  const names = { 'center-table':'Table centrale', water:'Bassin d’eau', 'floor-1':'Cache sous la table', 'floor-2':'Seconde cache' };
  const name = names[id] || (id.startsWith('statue-') ? `Statue ${number}` :
    id.startsWith('mural-') ? `Fresque ${number}` : game.items[id]?.name);
  let description = 'Observez les marques anciennes et les objets à proximité.';
  let actions = objectActions(game.items[id] || { id });
  if (id.startsWith('statue-')) {
    const lit = game.torches.includes(number);
    description = lit ? 'La flamme avance sur son circuit de trois statues.' : 'La torche attend une flamme. Guidez une flamme allumée jusqu’ici.';
    if (lit) actions += objectButton('Déplacer la flamme', 'cycle-torch', { torchId:number });
    if (number === 1 && game.underStatue && game.items.big_gear.location !== 'inventory' && !game.insertedGears.includes('big_gear'))
      actions += objectButton('Ramasser la grande roue', 'take', { itemId:'big_gear' });
  }
  if (id === 'center-table') {
    description = game.rotated ? 'Le mécanisme a pivoté. Une nouvelle disposition des flammes vous attend.' : `${game.insertedGears.length}/4 roues installées. Complétez le mécanisme pour le faire pivoter.`;
    actions += ['small_gear','medium_gear','big_gear'].filter((gear) => game.inventory.includes(gear))
      .map((gear) => objectButton(`Installer · ${game.items[gear].name}`, 'insert-gear', { itemId:gear })).join('');
  }
  if (id === 'water') description = 'Des reflets parcourent l’eau du bassin. Le seau se trouve parmi les objets de la salle.';
  if (id.startsWith('floor-')) {
    description = 'Une dalle s’est ouverte. Les objets découverts peuvent être ramassés.';
    actions = Object.values(game.items).filter((item) => item.location === `hidden-${id}` && accessible(item))
      .map((item) => objectButton(`Ramasser · ${item.name}`, 'take', { itemId:item.id })).join('') || '<small>La cache est vide.</small>';
  }
  if (id === 'mural-2' && game.muralBroken && game.items.small_gear.location === 'hidden-wall')
    actions += objectButton('Ramasser la petite roue', 'take', { itemId:'small_gear' });
  if (game.items[id]?.location === 'inventory') actions = '<small>Objet dans l’inventaire commun.</small>';
  setMarkup($('#sanctuary-inspector'), `<div class="scene-observation"><strong>${esc(name || 'Sanctuaire')}</strong><p>${esc(description)}</p></div><div class="scene-actions">${actions}</div>`);
}
function objectActions(item) {
  const inv = game.inventory;
  let action = '';
  if (item.id === 'center-table') {
    if (game.tableActive && !game.rotated) action = objectButton('Activer', 'rotate-table');
    else if (game.rotated) action = '<small>Mécanisme activé</small>';
    else action = `<small>${game.insertedGears.length}/4 roues installées</small>`;
  } else if (item.id === 'mural-2') {
    action = game.muralBroken ? '<small>Fresque brisée</small>' : game.muralSolved ? objectButton('Frapper', 'break-mural') : '<small>Des marques anciennes</small>';
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
    { id: 'map', name: 'Sanctuaire d’Atlantide', image: 'compass.svg', location: 'room', pickable: false },
    { id: 'center-table', name: 'Table centrale', image: 'center_table.png', location: 'room', pickable: false },
    { id: 'water', name: 'Bassin d’eau', image: 'bucket.png', location: 'room', pickable: false },
    ...Array.from({ length: 12 }, (_, i) => ({ id: `statue-${i + 1}`, name: `Statue ${i + 1}`, image: 'atlantean-guardian-torch.png', location: 'room', pickable: false })),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `mural-${i + 1}`, name: `Fresque ${i + 1}`, image: game.muralBroken && i === 1 ? 'mural_broken.png' : 'mural_text.png', location: 'room', pickable: false })),
  ];
  const all = [...roomCards, ...items.filter((item) => !['old_gear','spear'].includes(item.id))];
  inspectableObjects = new Map([...all, ...Object.values(game.items).filter((item) => game.inventory.includes(item.id))].map((item) => [item.id, item]));
  const visible = all.filter((item) => objectFilter === 'all' || (objectFilter === 'items' && item.pickable) || (objectFilter === 'statues' && item.id.startsWith('statue-')) || (objectFilter === 'murals' && item.id.startsWith('mural-')));
  $('#object-count').textContent = `${visible.length} éléments`;
  setMarkup($('#object-grid'), visible.map((item) => `<article class="object-card"><button class="object-preview" data-inspect="${esc(item.id)}" aria-label="Examiner : ${esc(item.name)}"><img src="/assets/${esc(item.image)}" alt="" loading="lazy"></button><span class="object-copy"><strong>${esc(item.name)}</strong><small>${esc(item.id === 'center-table' ? `${game.insertedGears.length}/4 roues` : item.id.startsWith('statue-') && game.statueItems[item.id.split('-')[1]] ? 'Objet placé' : item.location === 'room' ? 'Dans la salle' : 'Cache révélée')}</small></span>${objectActions(item)}</article>`).join('') || '<p class="empty-state">Aucun objet à ramasser ici pour le moment. Continuez à explorer la salle.</p>');
}
function renderInventory() {
  const selected = itemOrder.filter((id) => game.inventory.includes(id));
  $('#inventory-count').textContent = selected.length;
  setMarkup($('#inventory-list'), selected.length ? selected.map((id) => {
    const item = game.items[id];
    let action = '';
    if (['small_gear', 'medium_gear', 'big_gear'].includes(id)) action = objectButton('Installer', 'insert-gear', { itemId: id });
    if (id === 'blue_relic') action = objectButton('Utiliser', 'use-relic');
    return `<div class="inventory-item"><button class="object-preview" data-inspect="${esc(id)}" aria-label="Examiner : ${esc(item.name)}"><img src="/assets/${esc(item.image)}" alt=""></button><span>${esc(item.name)}</span>${action}</div>`;
  }).join('') : '<div class="empty-state">Votre sac est encore vide. Examinez les objets de la salle pour commencer la collecte.</div>');
}
function renderPlayers() {
  $('#team-count').textContent = `${game.players.length} joueur${game.players.length === 1 ? '' : 's'}`;
  $('#player-list').innerHTML = game.players.map((player) => `<span class="player-chip"><i style="--player-color:${esc(player.color)}"></i>${coins[(Number(player.coin || 1) - 1) % coins.length].icon} ${esc(player.name)}${player.id === playerId ? ' · vous' : ''}</span>`).join('') || '<span class="empty-state">L’expédition vous attend.</span>';
  const isMember = game.players.some((player) => player.id === playerId);
  $('#join-box').classList.toggle('joined', isMember);
  setMarkup($('#join-box'), isMember ? '<span class="joined-label">✓ Vous faites partie de l’expédition</span>' : '<button class="text-link" data-home-anchor="rejoindre">Choisir ma pièce et rejoindre →</button>');
}
function renderLanding() {
  const member = game.players.find((player) => player.id === playerId);
  if (member) {
    selectedCoin = Math.max(1, Math.min(8, Math.floor(Number(member.coin) || 1)));
    $('#player-name').value = member.name;
  }
  const count = game.players.length;
  $('#welcome-player-count').textContent = count;
  $('#header-player-count').textContent = `${count} AKHI${count === 1 ? '' : 'S'}`;
  $('#team-preview-count').textContent = count ? `${count} joueur${count === 1 ? '' : 's'} dans l’équipe` : 'Personne n’a rejoint pour l’instant';
  $('#welcome-players').innerHTML = game.players.slice(0, 8).map((player) => `<span class="coin-avatar" title="${esc(player.name)}">${coins[(Number(player.coin || 1) - 1) % coins.length].icon}</span>`).join('');
  setMarkup($('#coin-picker'), coins.map((coin, index) => `<button type="button" class="coin-choice ${selectedCoin === index + 1 ? 'selected' : ''}" role="radio" aria-checked="${selectedCoin === index + 1}" tabindex="${selectedCoin === index + 1 ? '0' : '-1'}" aria-label="Pièce ${index + 1} : ${coin.name}" title="${coin.name}" data-coin="${index + 1}">${coin.icon}<span class="coin-numeral" aria-hidden="true">0${index + 1}</span></button>`).join(''));
  $('#coin-description').innerHTML = `<span>Pièce 0${selectedCoin} · ${coins[selectedCoin - 1].name}</span><small>Votre symbole d’expédition</small>`;
  const isMember = game.players.some((player) => player.id === playerId);
  const controls = $('#welcome-join-controls');
  if (isMember) {
    const player = game.players.find((entry) => entry.id === playerId);
    setMarkup(controls, `<div class="joined-panel"><span class="coin-avatar">${coins[(Number(player.coin || 1) - 1) % coins.length].icon}</span><span class="joined-name">Votre pièce est choisie.<br><b>${esc(player.name)}</b></span><div class="room-choice"><button id="start-game-button">${game.finished ? 'Revoir' : 'Explorer'} Atlantide <span>→</span></button><button id="start-red-button">${game.red.finished ? 'Revoir' : 'Explorer'} Ħal Saflieni <span>→</span></button></div></div>`);
  } else {
    setMarkup(controls, `<button id="join-button" class="join-submit" ${joining ? 'disabled' : ''}>${joining ? 'Connexion à l’équipe…' : 'Rejoindre l’équipe <span>→</span>'}</button>`);
  }
  $('#player-name').disabled = isMember;
  document.querySelectorAll('.coin-choice').forEach((button) => { button.disabled = isMember; });
}
function showScreen(screen) {
  if (screen !== currentScreen) {
    sanctuaryAudio.stop();
    requestedRedClue = null;
    if (currentScreen === 'red') {
      $('#hypogeum-discovery').textContent = '';
      for (const { effect } of hypogeumDiscoveries) $('#hypogeum-scene').classList.remove('reveal-' + effect);
    }
  }
  currentScreen = screen;
  document.body.dataset.screen = screen;
  document.body.classList.remove('focus-mode');
  $('#focus-mode').setAttribute('aria-pressed', 'false');
  $('#field-tools').classList.toggle('hidden', screen === 'welcome');
  const showWelcome = screen === 'welcome';
  $('#welcome-screen').classList.toggle('hidden', !showWelcome);
  $('#game-screen').classList.toggle('hidden', screen !== 'blue');
  $('#red-screen').classList.toggle('hidden', screen !== 'red');
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  if (screen === 'blue' && game) playNextDiscovery($('#sanctuary-scene'));
  if (screen === 'red' && playerId) act('red-enter');
}
function renderJournal() {
  $('#journal').innerHTML = game.log.map((entry) => `<div class="journal-entry"><time>${esc(entry.time)}</time>${esc(entry.text)}</div>`).join('');
  $('#red-journal').innerHTML = game.log.map((entry) => `<div class="journal-entry"><time>${esc(entry.time)}</time>${esc(entry.text)}</div>`).join('');
}
function renderClues() {
  $('#blue-hint').textContent = game.rotated
    ? 'Après la rotation, la gravure indique les statues 5, 3, 7 et 9.'
    : game.floor1
      ? 'La fresque répond aux statues 6, 3, 12 et 9. Les socles portent quatre silhouettes : un caillou (3), une pioche (5), une lance (8) et un seau (10).'
      : 'Pour ouvrir la dalle, portez les flammes aux statues 1, 10, 12 et 4.';
  $('#flame-sequence').innerHTML = game.torches.map((torch, index) => `<div class="flame-row"><span>Statue ${index === 0 ? 'Nord-est' : index === 1 ? 'Sud-est' : index === 2 ? 'Sud-ouest' : 'Nord-ouest'}</span><span><i class="state-dot"></i> ${torch}</span><span>Allumée</span></div>`).join('');
  const objective = game.finished ? ['Porte ouverte', 'La relique bleue est activée.'] : game.floor2 ? ['Retrouver la relique', 'Elle repose dans la cache sous le sol.'] : game.rotated ? ['Réveiller les flammes', 'La salle a pivoté : trouvez la seconde combinaison.'] : game.tableActive ? ['Activer la table', 'Le mécanisme est prêt à être enclenché.'] : game.floor1 ? ['Réunir les roues dentées', 'Explorez la dalle ouverte, la fresque et les statues. Installez les roues depuis l’inventaire.'] : ['Explorer les statues', 'Observez les flammes et les fresques de la salle.'];
  $('#objective-title').textContent = objective[0];
  $('#objective-detail').textContent = objective[1];
  $('#progress-fill').style.width = `${game.finished ? 100 : game.floor2 ? 82 : game.rotated ? 68 : game.tableActive ? 55 : game.floor1 ? 37 : game.muralSolved ? 24 : 12}%`;
  $('#connection-label').textContent = 'Synchronisé en direct';
}
function render() {
  if (!game) return;
  const focused = document.activeElement;
  const focusId = focused?.id;
  const focusAttrs = ['data-coin','data-scene-object','data-map-mural','data-torch-id','data-action','data-item-id','data-statue-id','data-room','data-slot','data-red-clue','data-inspect'];
  const focusSelector = focused ? focusAttrs.filter((key) => focused.hasAttribute(key)).map((key) => `[${key}="${CSS.escape(focused.getAttribute(key))}"]`).join('') : '';
  const selection = focused instanceof HTMLInputElement ? [focused.selectionStart, focused.selectionEnd] : null;
  const scrolls = ['object-grid','inventory-list','journal','red-journal','red-evidence-list'].map((id) => [id, document.getElementById(id)?.scrollTop]);
  renderMap(); renderObjects(); renderInventory(); renderPlayers(); renderJournal(); renderClues(); renderLanding(); renderRed();
  const codeInput = $('#equus-code');
  if (codeInput) codeInput.value = equusDraft;
  if (focused && !focused.isConnected) {
    const replacement = focusId ? document.getElementById(focusId) : focusSelector ? document.querySelector(focusSelector) : null;
    replacement?.focus({ preventScroll:true });
    if (selection && replacement instanceof HTMLInputElement) replacement.setSelectionRange(...selection);
  }
  for (const [id, scrollTop] of scrolls) if (scrollTop !== undefined) document.getElementById(id).scrollTop = scrollTop;
  $('#connection-label').textContent = 'Équipe synchronisée';
  document.dispatchEvent(new CustomEvent('expedition:updated'));
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
    if (id === 'wind-controls') {
      if (!red.windReady) return `<small class="red-action-hint">Ventus activé : ${red.ventus.length}/3 salles</small>`;
      return `<div class="plug-controls"><span>Bouchons trouvés : ${red.plugs.length}/3 · trous remplis : ${red.plugged.length}/3</span><div>${[1,2,3].map((slot) => `<button class="plug-slot ${red.plugged.includes(slot) ? 'done' : ''}" data-action="red-place-plug" data-slot="${slot}" ${red.plugged.includes(slot) || red.plugs.length <= red.usedPlugs.length ? 'disabled' : ''}>${red.plugged.includes(slot) ? '✓' : `Trou ${slot}`}</button>`).join('')}</div></div>`;
    }
    if (id === 'horse-cache') return red.horseOpen ? `<button class="red-action-button secondary" data-red-clue="horse-cache">Ouvrir l’annexe du Cheval</button>` : '';
    if (id === 'falcon-cache') return red.falconOpen ? `<button class="red-action-button secondary" data-red-clue="falcon-cache">Entrer dans l’annexe du Faucon</button>` : '';
    const label = redActionNames[id] || `Examiner : ${id.replaceAll('-', ' ')}`;
    const already = red.inspected.includes(id);
    if (id.startsWith('plug-') && already) return `<span class="action-complete">✓ Bouchon récupéré</span>`;
    return `<button class="red-action-button secondary" data-red-clue="${id}">${esc(already ? 'Relire · ' + redClues[id].title : label)}</button>`;
  }).filter(Boolean).join('');
  if (clue === redClues['falcon-cache']) {
    const murals = ['horse-mark','whale-mark','falcon-mark','phoenix-mark'];
    const ready = red.horseOpen && red.falconOpen && murals.every((id) => red.inspected.includes(id));
    return `${items}${red.finished ? '<button class="red-action-button secondary" data-red-clue="red-relic">Consulter la vision d’Omar →</button>' : ready ? '<button class="red-action-button finale-button" data-action="red-finalize">Activer le mécanisme final <span>→</span></button>' : `<small class="red-action-hint">${red.horseOpen ? 'Annexe du Cheval découverte' : 'Annexe du Cheval à découvrir'} · ${red.inspected.filter((id) => murals.includes(id)).length}/4 fresques lues</small>`}`;
  }
  if (red.windReady && red.plugs.some((id) => redClues[id] === clue)) {
    return '<button class="red-action-button secondary" data-red-clue="wind-holes">Rejoindre la fresque à trous →</button>';
  }
  return items;
}
function renderRedEvidence(red) {
  const clues = red.inspected.filter((id) => redClues[id]);
  const shown = clues.filter((id) => {
    if (redEvidenceFilter === 'testimony') return id.startsWith('suspect-') || id === 'entry-log';
    if (redEvidenceFilter === 'fresco') return id.endsWith('-mark') || id === 'wind-holes' || id === 'horse-inscription';
    if (redEvidenceFilter === 'object') return red.plugs.includes(id) || ['handkerchief','horse-cache','red-relic'].includes(id);
    return true;
  });
  $('#red-evidence-count').textContent = clues.length;
  const entries = shown.map((id) => {
    const plug = red.plugs.includes(id);
    const status = plug ? `<small>${red.usedPlugs.includes(id) ? 'Installé' : 'Disponible'}</small>` : '';
    return `<div class="evidence-entry"><i aria-hidden="true">${plug ? '●' : '✦'}</i><button data-red-clue="${id}">${esc(redClues[id].evidence)}</button>${status}</div>`;
  });
  const empty = clues.length ? 'Aucune découverte dans ce filtre.' : 'Les découvertes de l’équipe apparaîtront ici.';
  setMarkup($('#red-evidence-list'), entries.length ? entries.join('') : `<p class="empty-state">${empty}</p>`);
}
function renderHypogeum(red) {
  const scene = $('#hypogeum-scene');
  scene.classList.toggle('has-wind', red.windReady);
  scene.classList.toggle('horse-open', red.horseOpen);
  scene.classList.toggle('falcon-open', red.falconOpen);
  $('.hotspot-wind').classList.toggle('hidden', !red.windReady && !red.inspected.includes('wind-holes'));
  $('.hotspot-horse-annex').classList.toggle('hidden', !red.horseOpen);
  $('.hotspot-falcon-annex').classList.toggle('hidden', !red.falconOpen);
  $('.hotspot-relic').classList.toggle('hidden', !red.relicFound);
  scene.querySelectorAll('[data-hypogeum-slot]').forEach((socket) => {
    socket.classList.toggle('is-filled', red.plugged.includes(Number(socket.dataset.hypogeumSlot)));
  });
  scene.querySelectorAll('.map-hotspot').forEach((point) => {
    const id = point.dataset.redClue;
    if (point.dataset.redSector) point.classList.toggle('hidden', !red.inspected.includes(point.dataset.redSector));
    point.classList.toggle('is-visited', red.inspected.includes(id));
    point.classList.toggle('has-ventus', red.ventus.some((room) => id === room + '-zone'));
  });
  if (previousHypogeumState) {
    const cleared = hypogeumDiscoveries.some(({ key }) => previousHypogeumState[key] && !red[key]);
    const revealed = hypogeumDiscoveries.filter(({ key }) => !previousHypogeumState[key] && red[key]);
    if (cleared) {
      for (const { effect } of hypogeumDiscoveries) scene.classList.remove('reveal-' + effect);
      $('#hypogeum-discovery').textContent = '';
      if (currentScreen === 'red') sanctuaryAudio.stop();
    }
    if (currentScreen === 'red' && revealed.length) {
      for (const { effect } of revealed) scene.classList.add('reveal-' + effect);
      $('#hypogeum-discovery').textContent = revealed.map(({ text }) => text).join(' ');
      if (revealed.some(({ sound }) => sound)) sanctuaryAudio.playStone('red');
    }
  }
  previousHypogeumState = red;
}
function renderRed() {
  if (!game?.red) return;
  const red = game.red;
  renderRedEvidence(red);
  renderHypogeum(red);
  const steps = [
    `<div class="mechanism-row ${red.ventus.length === 3 ? 'complete' : ''}"><span class="mechanism-icon">≈</span><span><b>Réveiller le Ventus</b><small>${red.ventus.length}/3 fresques accessibles</small></span><i>${red.windReady ? '✓' : '·'}</i></div>`,
    `<div class="mechanism-row ${red.plugged.length === 3 ? 'complete' : ''}"><span class="mechanism-icon">◎</span><span><b>Ouvrir l’annexe du Faucon</b><small>${red.plugs.length}/3 bouchons · ${red.plugged.length}/3 trous</small></span><i>${red.falconOpen ? '✓' : '·'}</i></div>`,
    `<div class="mechanism-row ${red.horseOpen ? 'complete' : ''}"><span class="mechanism-icon">♞</span><span><b>Ouvrir l’annexe du Cheval</b><small>${red.horseOpen ? 'Howard est démasqué' : 'Déchiffrer l’inscription du passage'}</small></span><i>${red.horseOpen ? '✓' : '·'}</i></div>`,
    `<div class="mechanism-row ${red.finished ? 'complete' : ''}"><span class="mechanism-icon">✦</span><span><b>Retrouver la relique</b><small>${red.finished ? 'Vision de Gizeh reçue' : 'Les deux passages mènent au mécanisme final'}</small></span><i>${red.finished ? '✓' : '·'}</i></div>`,
  ];
  $('#red-mechanism-status').innerHTML = steps.join('');
  if (activeRedClue && !red.inspected.includes(activeRedClue)) {
    activeRedClue = null;
    equusDraft = '';
  }
  const clue = redClues[activeRedClue] || {
    icon:'✦', kicker:'CARNET D’ENQUÊTE', title:'Choisissez un secteur sur le plan',
    body:'Inspectez la scène du crime, comparez les horaires d’arrivée et écoutez les versions des quatre archéologues.',
  };
  $('#red-inspector-icon').textContent = clue.icon;
  $('#red-inspector-kicker').textContent = clue.kicker;
  $('#red-inspector-title').textContent = clue.title;
  $('#red-inspector-copy').textContent = clue.body;
  setMarkup($('#red-inspector-actions'), renderRedActions(clue, red));
  if ($('#equus-code')) $('#equus-code').value = equusDraft;
  document.querySelectorAll('#hypogeum-scene [data-red-clue], .suspect-list [data-red-clue]').forEach((button) => {
    const selected = button.dataset.redClue === activeRedClue;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
async function join() {
  if (joining) return;
  const input = $('#player-name');
  const name = (input?.value || draftName).trim();
  $('#join-error').textContent = '';
  input.removeAttribute('aria-invalid');
  if (!name) {
    $('#join-error').textContent = 'Entrez votre nom pour rejoindre l’expédition.';
    input.setAttribute('aria-invalid', 'true'); input.focus(); return;
  }
  draftName = name;
  joining = true;
  if (game) renderLanding();
  try {
    const result = await api('/api/join', { name, coin: selectedCoin, playerId });
    playerId = result.player.id;
    storage.setItem('enigmakhi-player-id', playerId);
    storage.setItem('enigmakhi-player-name', name);
    storage.setItem('enigmakhi-player-coin', selectedCoin);
    const response = await fetch(stateUrl);
    if (!response.ok) throw new Error('La synchronisation a échoué. Réessayez.');
    game = await response.json();
    toast(`Bienvenue dans l’expédition, ${name} !`);
    render();
    $('#start-game-button')?.focus({ preventScroll:true });
  } catch (error) { $('#join-error').textContent = error.message; toast(error.message); }
  finally { joining = false; if (game) renderLanding(); }
}
document.addEventListener('input', (event) => {
  if (event.target.id === 'player-name') { draftName = event.target.value; $('#join-error').textContent = ''; event.target.removeAttribute('aria-invalid'); }
  if (event.target.id === 'equus-code') equusDraft = event.target.value;
});
document.addEventListener('click', (event) => {
  const scenePoint = event.target.closest('[data-scene-object]');
  if (scenePoint) {
    selectedSceneObject = scenePoint.dataset.sceneObject;
    renderMap();
  }
  const redClue = event.target.closest('[data-red-clue]');
  if (redClue) {
    const clueId = redClue.dataset.redClue;
    requestedRedClue = clueId;
    const selectClue = () => {
      if (requestedRedClue !== clueId || currentScreen !== 'red') return;
      activeRedClue = clueId;
      renderRed();
      const heading = $('#red-inspector-title');
      heading.focus({ preventScroll:true });
      heading.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'nearest' });
    };
    if (game?.red.inspected.includes(clueId)) selectClue();
    else act('red-inspect', { clueId }).then((success) => { if (success) selectClue(); });
  }
  const redFilter = event.target.closest('[data-red-filter]');
  if (redFilter) {
    redEvidenceFilter = redFilter.dataset.redFilter;
    document.querySelectorAll('[data-red-filter]').forEach((button) => button.setAttribute('aria-pressed', String(button === redFilter)));
    if (game) renderRedEvidence(game.red);
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
    storage.setItem('enigmakhi-player-coin', selectedCoin);
    document.querySelectorAll('.coin-choice').forEach((button) => {
      const selected = Number(button.dataset.coin) === selectedCoin;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-checked', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    $('#coin-description').innerHTML = `<span>Pièce 0${selectedCoin} · ${coins[selectedCoin - 1].name}</span><small>Votre symbole d’expédition</small>`;
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
    shareExpedition();
  }
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.id === 'player-name') join();
  if (event.key === 'Enter' && event.target.id === 'equus-code') act('red-open-horse', { code: event.target.value });
});
fetch(stateUrl).then((response) => { if (!response.ok) throw new Error('Serveur indisponible'); return response.json(); }).then((snapshot) => { if (!game || snapshot.version >= game.version) { game = snapshot; render(); } }).catch(() => toast('Le serveur se réveille. La connexion sera rétablie automatiquement.'));
const events = new EventSource('/api/events');
events.onopen = () => { document.body.dataset.connection = 'online'; $('#connection-label').textContent = 'Équipe synchronisée'; };
events.onmessage = (event) => { game = JSON.parse(event.data); render(); };
events.onerror = () => { document.body.dataset.connection = 'offline'; $('#connection-label').textContent = 'Reconnexion…'; };
