import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const publicRoot = resolve(dirname(fileURLToPath(import.meta.url)), 'public');
const port = Number(process.env.PORT || 3000);
const streams = new Set();
const now = () => new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const itemSeed = {
  stone: ['Caillou pointu', 'stone.png', 'room', true],
  bucket: ['Seau en bois', 'bucket.png', 'room', true],
  tape_1: ['Cassette 1', 'tape_1.png', 'room', true],
  tape_2: ['Cassette 2', 'tape_2.png', 'room', true],
  document_1: ['Document 1', 'document_1.png', 'room', true],
  document_2: ['Document 2', 'document_2.png', 'room', true],
  document_3: ['Document 3', 'document_3.png', 'room', true],
  tape_recorder: ['Magnétophone', 'tape_recorder.png', 'room', false],
  small_gear: ['Petite roue dentée', 'small_gear.png', 'hidden-wall', true],
  medium_gear: ['Roue dentée moyenne', 'medium_gear.png', 'hidden-floor-1', true],
  big_gear: ['Grande roue dentée', 'big_gear.png', 'under-statue', true],
  pickaxe: ['Pioche', 'pickaxe.png', 'hidden-floor-1', true],
  spear: ['Lance en pierre', 'spear.png', 'statue-8', false],
  old_gear: ['Vieille roue dentée', 'old_gear.png', 'center-table', true],
  blue_relic: ['Relique bleue', 'blue_relic.png', 'hidden-floor-2', true],
};

function freshState() {
  return {
    version: 1,
    players: [],
    log: [{ time: now(), text: 'La salle bleue est silencieuse. Une table de pierre occupe son centre.' }],
    phase: 1,
    torches: [6, 3, 8, 11],
    tableActive: false,
    rotated: false,
    muralSolved: false,
    muralBroken: false,
    floor1: false,
    floor2: false,
    underStatue: false,
    inventory: [],
    statueItems: {},
    insertedGears: ['old_gear'],
    finished: false,
    red: { started: false, inspected: [], plugs: [], plugged: [], usedPlugs: [], ventus: [], windReady: false, horseOpen: false, falconOpen: false, howardSecured: false, relicFound: false, finished: false },
    items: Object.fromEntries(Object.entries(itemSeed).map(([id, [name, image, location, pickable]]) => [id, { id, name, image, location, pickable }])),
  };
}

let state = freshState();
function publicState() {
  return JSON.parse(JSON.stringify(state));
}
function broadcast() {
  const payload = `data: ${JSON.stringify(publicState())}\n\n`;
  for (const response of streams) response.write(payload);
}
function note(text) {
  state.log.unshift({ time: now(), text });
  state.log = state.log.slice(0, 24);
  state.version++;
  broadcast();
}
function reply(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
async function bodyJson(req) {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

const phaseRules = {
  1: [[1, 2, 6], [10, 7, 3], [12, 5, 8], [4, 9, 11]],
  2: [[5, 6, 1], [3, 8, 10], [7, 11, 12], [9, 2, 4]],
};
const torchTargets = { 1: [1, 10, 12, 4], 2: [5, 3, 7, 9] };
const muralTarget = [6, 3, 12, 9];

function act(data) {
  const { action, itemId, torchId, playerId } = data;
  const actor = state.players.find((p) => p.id === playerId)?.name || 'Un joueur';
  const red = state.red;
  if (String(action || '').startsWith('red-') && !state.players.some((player) => player.id === playerId)) return 'Rejoins l’équipe pour participer à l’enquête.';

  if (action === 'red-enter') {
    if (!red.started) {
      red.started = true;
      note(`${actor} ouvre le dossier du meurtre de George Herbert à Ħal Saflieni.`);
    }
    return null;
  }

  if (action === 'red-inspect') {
    const clueId = String(data.clueId || '');
    const valid = new Set(['horse-zone','whale-zone','falcon-zone','phoenix-zone','passage-clue','suspect-howard','suspect-evelyn','suspect-hugh','suspect-omar','horse-mark','whale-mark','falcon-mark','phoenix-mark','crime-scene','handkerchief','entry-log','horse-inscription','wind-holes','plug-whale','plug-corridor','plug-phoenix','horse-cache','falcon-cache','red-relic']);
    if (!valid.has(clueId)) return 'Cet élément ne figure pas dans le dossier.';
    if (clueId === 'horse-cache' && !red.horseOpen) return 'La salle du Cheval est encore fermée.';
    if (clueId === 'falcon-cache' && !red.falconOpen) return 'La salle du Faucon est encore inaccessible.';
    if (clueId === 'red-relic' && !red.relicFound) return 'La relique n’a pas encore été révélée.';
    if (!red.inspected.includes(clueId)) {
      red.inspected.push(clueId);
      const plugForClue = { 'plug-whale': 'Bouchon de la Baleine', 'plug-corridor': 'Bouchon du couloir', 'plug-phoenix': 'Bouchon du Phénix' };
      if (plugForClue[clueId] && !red.plugs.includes(clueId)) red.plugs.push(clueId);
      const label = plugForClue[clueId] || clueId.replaceAll('-', ' ');
      note(`${actor} consigne « ${label} » dans le carnet d’enquête.`);
    }
    return null;
  }

  if (action === 'red-activate') {
    const room = String(data.room || '');
    const marks = { horse: 'horse-mark', whale: 'whale-mark', falcon: 'falcon-mark' };
    if (!marks[room] || !red.inspected.includes(marks[room])) return 'Examine d’abord la fresque de cette salle.';
    if (red.ventus.includes(room)) return 'Le signe Ventus est déjà activé dans cette salle.';
    red.ventus.push(room);
    if (red.ventus.length === 3) {
      red.windReady = true;
      note(`${actor} active le Ventus dans les trois salles accessibles. Un souffle traverse la fresque à trous du Faucon.`);
    } else note(`${actor} active le signe Ventus dans la salle de la ${room === 'horse' ? 'Cheval' : room === 'whale' ? 'Baleine' : 'Faucon'}.`);
    return null;
  }

  if (action === 'red-place-plug') {
    const slot = Number(data.slot);
    if (!red.windReady) return 'Le Ventus doit d’abord réveiller la fresque centrale.';
    if (!Number.isInteger(slot) || slot < 1 || slot > 3) return 'Choisis l’un des trois trous de la fresque.';
    if (red.plugged.includes(slot)) return 'Ce trou est déjà bouché.';
    const available = red.plugs.find((id) => !red.usedPlugs.includes(id));
    if (!available) return 'Il faut encore trouver un bouchon dans le site.';
    red.plugged.push(slot);
    red.usedPlugs.push(available);
    if (red.plugged.length === 3) {
      red.falconOpen = true;
      red.inspected.push('falcon-cache');
      note(`${actor} place le troisième bouchon. La fresque pivote et révèle l’annexe cachée du Faucon.`);
    } else note(`${actor} insère un bouchon dans le trou ${slot} de la fresque.`);
    return null;
  }

  if (action === 'red-open-horse') {
    if (!red.inspected.includes('horse-inscription')) return 'Examine d’abord l’inscription du passage.';
    if (String(data.code || '').trim().toUpperCase() !== 'EQUUS') return 'La séquence ne correspond pas au nom latin de la monture.';
    if (red.horseOpen) return 'La salle du Cheval est déjà ouverte.';
    red.horseOpen = true;
    red.howardSecured = true;
    red.inspected.push('horse-cache');
    note(`${actor} déverrouille EQUUS. Dans l’annexe, le Beretta et le carnet de George confondent Howard, qui est ligoté par le groupe.`);
    return null;
  }

  if (action === 'red-finalize') {
    const murals = ['horse-mark','whale-mark','falcon-mark','phoenix-mark'];
    if (!red.horseOpen || !red.falconOpen) return 'Les deux salles cachées doivent être découvertes.';
    if (!murals.every((id) => red.inspected.includes(id))) return 'Lisez les quatre fresques avant d’actionner le mécanisme final.';
    if (red.finished) return 'La relique a déjà été révélée.';
    red.finished = true;
    red.relicFound = true;
    red.inspected.push('red-relic');
    note(`${actor} active le mécanisme final. Omar retrouve la relique et reçoit une vision de Gizeh, prochaine étape de l’expédition.`);
    return null;
  }

  if (state.finished && !String(action || '').startsWith('red-')) return 'La salle a déjà été résolue.';

  if (action === 'cycle-torch') {
    const index = state.torches.indexOf(Number(torchId));
    if (index < 0) return 'Cette statue n’a pas de torche allumée.';
    const cycle = phaseRules[state.phase][index];
    state.torches[index] = cycle[(cycle.indexOf(state.torches[index]) + 1) % cycle.length];
    const flames = state.torches;
    if (flames.join(',') === muralTarget.join(',')) {
      state.muralSolved = true;
      note(`${actor} règle les torches sur un motif. Un mécanisme répond derrière les fresques.`);
      return null;
    }
    if (flames.join(',') === torchTargets[state.phase].join(',')) {
      if (state.phase === 1) {
        state.floor1 = true;
        state.items.medium_gear.location = 'hidden-floor-1';
        state.items.pickaxe.location = 'hidden-floor-1';
        note(`${actor} allume les quatre flammes bleues. Une dalle secrète s’ouvre au sol !`);
      } else {
        state.floor2 = true;
        state.items.blue_relic.location = 'hidden-floor-2';
        note(`${actor} retrouve la seconde combinaison. Une alcôve révèle la relique bleue.`);
      }
      return null;
    }
    note(`${actor} manipule la torche ${torchId}. Le motif des flammes change.`);
    return null;
  }

  if (action === 'take') {
    const item = state.items[itemId];
    if (!item || !item.pickable) return 'Cet élément ne peut pas être ramassé.';
    const available = item.location === 'room' || item.location === 'center-table'
      || (item.location === 'hidden-floor-1' && state.floor1)
      || (item.location === 'hidden-floor-2' && state.floor2)
      || (item.location === 'under-statue' && state.underStatue)
      || (item.location === 'hidden-wall' && state.muralBroken);
    if (!available) return 'Cet objet est encore inaccessible.';
    item.location = 'inventory';
    state.inventory.push(itemId);
    note(`${actor} ajoute « ${item.name} » à l’inventaire commun.`);
    return null;
  }

  if (action === 'place-statue') {
    const required = { 3: 'stone', 5: 'pickaxe', 10: 'bucket', 8: 'spear' };
    const id = Number(data.statueId);
    const wanted = required[id];
    const spearAlreadyOnStatue = id === 8 && state.items.spear.location === 'statue-8';
    if (!wanted || (!state.inventory.includes(wanted) && !spearAlreadyOnStatue)) return 'Il manque l’objet qui correspond à cette statue.';
    state.inventory = state.inventory.filter((itemId) => itemId !== wanted);
    state.items[wanted].location = `statue-${id}`;
    state.statueItems[id] = wanted;
    const complete = Object.entries(required).every(([statue, item]) => state.statueItems[statue] === item);
    if (complete) {
      state.underStatue = true;
      state.items.big_gear.location = 'under-statue';
      note(`${actor} place le dernier objet. Une cache s’ouvre sous la statue 1.`);
    } else note(`${actor} place un objet sur la statue ${id}.`);
    return null;
  }

  if (action === 'break-mural') {
    if (!state.inventory.includes('pickaxe')) return 'Il faut d’abord récupérer la pioche.';
    if (!state.muralSolved) return 'Le motif des flammes doit d’abord révéler la fresque fragile.';
    state.muralBroken = true;
    state.items.small_gear.location = 'hidden-wall';
    note(`${actor} brise la fresque marquée. Une petite roue dentée apparaît derrière le mur.`);
    return null;
  }

  if (action === 'insert-gear') {
    if (!['small_gear', 'medium_gear', 'big_gear'].includes(itemId) || !state.inventory.includes(itemId)) return 'Cette roue n’est pas dans l’inventaire.';
    state.inventory = state.inventory.filter((id) => id !== itemId);
    state.insertedGears.push(itemId);
    state.items[itemId].location = 'center-table';
    if (state.insertedGears.length === 4) {
      state.tableActive = true;
      note(`${actor} installe la dernière roue. Le mécanisme central est complet.`);
    } else note(`${actor} insère « ${state.items[itemId].name} » dans la table centrale.`);
    return null;
  }

  if (action === 'rotate-table') {
    if (!state.tableActive) return 'Il manque encore des roues au mécanisme.';
    state.rotated = true;
    state.phase = 2;
    state.torches = [6, 8, 11, 2];
    note(`${actor} active la table. La salle pivote et les torches se réorganisent.`);
    return null;
  }

  if (action === 'use-relic') {
    if (!state.inventory.includes('blue_relic') || !state.floor2) return 'La relique n’est pas encore accessible.';
    state.finished = true;
    note(`${actor} utilise la relique. La porte rouge s’ouvre : la salle suivante est accessible !`);
    return null;
  }
  if (action === 'reset') {
    state = freshState();
    note('La partie est réinitialisée. Une nouvelle exploration commence.');
    return null;
  }
  return 'Action inconnue.';
}

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/state' && req.method === 'GET') return reply(res, 200, publicState());
  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' });
    res.write(`data: ${JSON.stringify(publicState())}\n\n`);
    streams.add(res);
    req.on('close', () => streams.delete(res));
    return;
  }
  if (url.pathname === '/api/join' && req.method === 'POST') {
    try {
      const data = await bodyJson(req);
      const name = String(data.name || '').trim().slice(0, 22);
      if (!name) return reply(res, 400, { error: 'Entre un nom pour rejoindre la partie.' });
      const returningPlayer = state.players.find((player) => player.id === data.playerId);
      if (returningPlayer) return reply(res, 200, { player: returningPlayer });
      if (state.players.length >= 24) return reply(res, 400, { error: 'La partie est complète.' });
      const coin = Math.max(1, Math.min(8, Number(data.coin) || 1));
      const player = { id: randomUUID(), name, coin, color: ['#8ed9e6', '#d0a56a', '#b6a4e8', '#8fc3a0'][state.players.length % 4] };
      state.players.push(player);
      note(`${name} rejoint l’expédition.`);
      return reply(res, 200, { player });
    } catch { return reply(res, 400, { error: 'Requête invalide.' }); }
  }
  if (url.pathname === '/api/action' && req.method === 'POST') {
    try {
      const message = act(await bodyJson(req));
      if (message) return reply(res, 400, { error: message });
      state.version++;
      broadcast();
      return reply(res, 200, { ok: true, state: publicState() });
    } catch { return reply(res, 400, { error: 'Action invalide.' }); }
  }
  if (url.pathname === '/api/reset' && req.method === 'POST') {
    state = freshState();
    note('La partie est réinitialisée. Une nouvelle exploration commence.');
    return reply(res, 200, { ok: true });
  }

  let rel;
  try { rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1)); }
  catch { return reply(res, 400, { error: 'Invalid path' }); }
  const target = resolve(join(publicRoot, rel));
  if (target !== publicRoot && !target.startsWith(`${publicRoot}${sep}`)) return reply(res, 403, { error: 'Forbidden' });
  try {
    const data = await readFile(target);
    res.writeHead(200, { 'content-type': mime[extname(target)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    res.end(data);
  } catch { reply(res, 404, { error: 'Not found' }); }
});

server.listen(port, '0.0.0.0', () => console.log(`EnigmAkhi prêt sur le port ${port}`));
