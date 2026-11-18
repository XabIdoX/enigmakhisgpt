/* Presentation and personal tools. Shared puzzle state remains server-owned. */
const expeditions = [
  { tone:'blue', place:'ATLANTIQUE · BERMUDES', title:'Le site englouti', room:'Atlantide', state:'Première expédition · jouable', body:'Sous l’Atlantique, un sanctuaire oublié attend. Observez les fresques, guidez les flammes et réveillez un mécanisme ancien.', screen:'blue' },
  { tone:'green', place:'JAVA · INDONÉSIE', title:'Gunung Padang', room:'Salle verte', state:'Deuxième expédition · à venir', body:'Des strates anciennes gardent la mémoire d’un passage. La trace d’Omar se poursuit au cœur de l’Indonésie.' },
  { tone:'red', place:'ĦAL SAFLIENI · MALTE', title:'Ħal Saflieni', room:'Malte', state:'Troisième expédition · jouable', body:'George Herbert est retrouvé mort. Quatre archéologues, des alibis à confronter et un secret enfoui sous la pierre.', screen:'red' },
  { tone:'gold', place:'GIZEH · ÉGYPTE', title:'Les pierres du désert', room:'Salle jaune', state:'Quatrième expédition · à venir', body:'La piste se rapproche de l’origine du pacte. À Gizeh, les pierres gardent encore ce qu’Omar ne pouvait révéler.' },
  { tone:'black', place:'PYRAMIDE DE MYKÉRINOS', title:'La chambre scellée', room:'Salle noire', state:'Dernière expédition · à venir', body:'Sous la pyramide, une salle relie les fragments de l’histoire. C’est ici qu’Omar a découvert le secret et signé son pacte.' },
];
let selectedExpedition = 0;
let prologuePage = 0;
let dialogMode = null;
let inspectedItemId = null;
let previousFocus = null;
const dialog = $('#experience-dialog');
const prologue = [
  { year:'1895', where:'15 FÉVRIER · PYRAMIDE DE MYKÉRINOS', title:'Une découverte. Puis le noir.', body:'En explorant la pyramide de Mykérinos, Omar Zboubi découvre le secret qui relie les sites archéologiques. Un rocher bloque le passage. L’archéologue est pris au piège.', quote:'Deux jours passent dans l’obscurité.' },
  { year:'1895', where:'DEUX JOURS PLUS TARD', title:'Le prix du silence.', body:'Omar signe un pacte de sang. Il est enfin libéré, mais une condition le lie désormais : il lui est interdit de révéler sa découverte.', quote:'Libre de partir. Condamné à se taire.' },
  { year:'1921', where:'LE MESSAGE CACHÉ', title:'Une autre façon de raconter.', body:'Avant sa mort en 1921, Omar trouve le moyen de cacher son message. Les traces qu’il laisse derrière lui relient cinq expéditions, de l’Atlantide à la salle sous Mykérinos.', quote:'Ce qui ne peut être dit peut encore être découvert.' },
  { year:'2020', where:'14 AVRIL · UNE BROCANTE À LYON', title:'Cinq euros pour un mystère.', body:'Les Akhis achètent une boîte. Elle contient huit pièces de bronze numérotées et un message en arabe : « Chacun choisi sa pièce ». Chacun choisit la sienne. Zino garde la boîte.', quote:'Et vous, quelle pièce choisirez-vous ?' },
];

function renderDestination() {
  const destination = expeditions[selectedExpedition];
  const node = $('#destination-card');
  node.dataset.tone = destination.tone;
  setMarkup(node, `<div class="destination-meta"><span>DOSSIER 0${selectedExpedition + 1}</span><span>${destination.room.toUpperCase()}</span></div><span class="destination-state">${destination.state}</span><h3>${destination.title}</h3><p>${destination.body}</p>${destination.screen ? `<button data-start-expedition="${destination.screen}">${game?.players.some((player) => player.id === playerId) ? 'Entrer dans l’expédition' : 'Choisir ma pièce pour explorer'} <span aria-hidden="true">↗</span></button>` : '<div class="coming-soon">Ce chapitre n’est pas encore ouvert.</div>'}`);
  document.querySelectorAll('[data-expedition]').forEach((button) => {
    const selected = Number(button.dataset.expedition) === selectedExpedition;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function openDialog(mode, content) {
  if (!dialog.open) previousFocus = document.activeElement;
  dialogMode = mode;
  $('#dialog-content').innerHTML = content;
  if (!dialog.open) dialog.showModal();
  document.body.style.overflow = 'hidden';
}
function closeDialog() { dialog.close(); }
dialog.addEventListener('close', () => {
  document.body.style.overflow = '';
  if (dialogMode === 'sanctuary') {
    const home = document.querySelector('#game-screen .room-card');
    home.insertBefore($('#sanctuary-scene'), home.querySelector('.sanctuary-legend'));
    home.append($('#sanctuary-inspector'));
    dialog.classList.remove('sanctuary-dialog');
  }
  if (dialogMode === 'hypogeum') {
    $('#red-screen .red-map-panel').append($('#hypogeum-exploration'));
    document.body.append($('#toast'));
    dialog.classList.remove('hypogeum-dialog');
  }
  dialogMode = null;
  inspectedItemId = null;
  // Shared updates can replace the opener while a dialog is displayed.
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll:true });
});
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) {
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog();
  }
});
$('.dialog-close').addEventListener('click', closeDialog);

function renderPrologue() {
  const page = prologue[prologuePage];
  openDialog('prologue', `<div class="dialog-inner"><div class="story-page"><span class="section-kicker">PROLOGUE · ${page.where}</span><div class="story-year" aria-hidden="true">${page.year}</div><h2 id="dialog-title">${page.title}</h2><p>${page.body}</p><blockquote>${page.quote}</blockquote></div><div class="story-controls"><button class="story-prev" data-story-prev ${prologuePage === 0 ? 'disabled' : ''}>← Retour</button><div class="story-dots" aria-label="Pages du prologue">${prologue.map((_, index) => `<button data-story-page="${index}" aria-label="Page ${index + 1}" ${index === prologuePage ? 'aria-current="step"' : ''}></button>`).join('')}</div><button class="story-next" data-story-next>${prologuePage === prologue.length - 1 ? 'Choisir ma pièce ↗' : 'La suite →'}</button></div></div>`);
}
function goToJoin() {
  if (dialog.open) closeDialog();
  showScreen('welcome');
  $('#rejoindre').scrollIntoView({ behavior:reducedMotion() ? 'instant' : 'smooth' });
  $('#player-name').focus({ preventScroll:true });
}
function reducedMotion() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

function openSanctuary() {
  openDialog('sanctuary', '<div class="dialog-inner"><span class="section-kicker">ATLANTIDE · LE SANCTUAIRE DES PROFONDEURS</span><h2 id="dialog-title">Au cœur de la cité perdue</h2><button type="button" class="text-button sanctuary-audio-control" data-toggle-sound aria-pressed="true">Sons</button><div id="expanded-sanctuary"></div></div>');
  dialog.classList.add('sanctuary-dialog');
  sanctuaryAudio.updateButton();
  $('#expanded-sanctuary').append($('#sanctuary-scene'), $('#sanctuary-inspector'));
}

function openHypogeum(opener) {
  openDialog('hypogeum', '<div class="dialog-inner"><span class="section-kicker">ĦAL SAFLIENI · 2E SOUS-SOL</span><h2 id="dialog-title">Explorer l’hypogée</h2><button type="button" class="text-button sanctuary-audio-control" data-toggle-sound aria-pressed="true">Sons</button><div id="expanded-hypogeum"></div></div>');
  previousFocus = opener;
  dialog.classList.add('hypogeum-dialog');
  sanctuaryAudio.updateButton();
  $('#expanded-hypogeum').append($('#hypogeum-exploration'));
  dialog.append($('#toast'));
}

function inspectObject(id, refresh = false) {
  if (id === 'map') { openSanctuary(); return; }
  const item = inspectableObjects.get(id);
  if (!item) {
    if (refresh) $('#object-inspect-actions').innerHTML = '<p>Cet objet a été déplacé par l’équipe.</p>';
    return;
  }
  inspectedItemId = id;
  let description = item.location === 'inventory' ? 'Cet objet fait partie de l’inventaire commun. Toute l’équipe peut le consulter.' : 'Observez cet élément de la salle. Les objets ramassés sont partagés avec toute l’équipe.';
  let action = objectActions(item);
  if (id === 'center-table') description = `${game.insertedGears.length} roues sur 4 sont installées dans le mécanisme central.`;
  if (id.startsWith('document_')) description = 'Un document retrouvé dans le sanctuaire. Son illustration est visible ici ; son texte détaillé n’est pas encore disponible.';
  if (id.startsWith('tape_')) description = 'Une cassette retrouvée dans la salle. Sa lecture audio n’est pas encore disponible.';
  if (id.startsWith('statue-')) description = 'Une des douze statues du sanctuaire. Certaines attendent un objet sur leur socle.';
  if (id.startsWith('mural-')) description = 'Une fresque ancienne du sanctuaire. Le motif des flammes peut révéler de nouvelles possibilités.';
  if (item.location === 'inventory') {
    action = ['small_gear','medium_gear','big_gear'].includes(id) ? objectButton('Installer dans le mécanisme', 'insert-gear', { itemId:id }) : id === 'blue_relic' ? objectButton('Utiliser la relique', 'use-relic') : '<span class="inspect-status">✓ Dans l’inventaire de l’équipe</span>';
  }
  const imageSrc = `/assets/${item.image}`;
  if (refresh) {
    setMarkup($('#object-inspect-actions'), action);
    $('#inspect-description').textContent = description;
    return;
  }
  openDialog('object', `<div class="dialog-inner"><span class="section-kicker">CARNET D’OBSERVATION</span><h2 id="dialog-title">${esc(item.name)}</h2><img class="inspect-image ${id === 'map' ? 'plan-image' : ''}" src="${imageSrc}" alt="${esc(item.name)} en détail"><p id="inspect-description">${description}</p><div class="object-inspect-actions" id="object-inspect-actions">${action}</div></div>`);
}

function openNotes() {
  openDialog('notes', `<div class="dialog-inner"><span class="section-kicker">VOTRE CARNET PERSONNEL</span><h2 id="dialog-title">Ne perdez pas le fil.</h2><p>Une combinaison, une hypothèse, un détail… Ces notes restent sur ce navigateur et ne sont pas partagées avec les autres Akhis.</p><label class="notes-label" for="personal-notes">Vos observations</label><textarea id="personal-notes" class="notes-area" maxlength="12000" placeholder="Ce que nous avons découvert…"></textarea><div class="notes-status" id="notes-status" role="status">Enregistrement automatique sur cet appareil.</div></div>`);
  $('#personal-notes').value = storage.getItem('enigmakhi-notes') || '';
  $('#personal-notes').focus();
}
function openHelp() {
  openDialog('help', `<div class="dialog-inner"><span class="section-kicker">LE GUIDE DES AKHIS</span><h2 id="dialog-title">L’enquête se joue ensemble.</h2><ol class="help-list"><li><b>Observez la carte.</b> ${currentScreen === 'red' ? 'Choisissez un secteur ou un suspect pour ouvrir son dossier.' : 'Cliquez sur une flamme pour la déplacer. Les repères bleus permettent d’examiner les fresques.'}</li><li><b>Explorez les détails.</b> ${currentScreen === 'red' ? 'Relisez les éléments partagés et confrontez les alibis.' : 'Filtrez les éléments autour de vous. Cliquez sur l’image d’un objet pour l’examiner en grand.'}</li><li><b>Partagez vos découvertes.</b> Les actions, l’inventaire et la chronologie se synchronisent avec toute l’équipe. Le bouton « Inviter l’équipe » copie le lien.</li><li><b>Gardez vos hypothèses.</b> « Mes notes » ouvre votre carnet personnel. Le mode Immersion agrandit l’espace d’exploration.</li></ol><p>Les découvertes de la partie sont conservées tant que le serveur reste actif. Un redémarrage remet l’expédition à zéro.</p></div>`);
}
async function shareExpedition() {
  const url = `${location.origin}/`;
  try {
    if (!navigator.clipboard?.writeText) throw new Error('Presse-papiers indisponible');
    await navigator.clipboard.writeText(url);
    toast('Lien copié. Envoyez-le à vos Akhis !');
  } catch {
    openDialog('share', `<div class="dialog-inner"><span class="section-kicker">RASSEMBLER LES AKHIS</span><h2 id="dialog-title">Inviter l’équipe.</h2><p>Copiez ce lien et envoyez-le aux autres joueurs. Vous partagerez la même expédition.</p><label class="notes-label" for="share-url">Lien de la partie</label><input id="share-url" class="notes-area" style="min-height:0" readonly value="${esc(url)}"></div>`);
    $('#share-url').select();
  }
}

document.addEventListener('click', (event) => {
  const button = event.target.closest('button,a');
  if (!button || button.disabled) return;
  if (button.hasAttribute('data-expedition')) { selectedExpedition = Number(button.dataset.expedition); renderDestination(); }
  if (button.hasAttribute('data-start-expedition')) {
    if (game?.players.some((player) => player.id === playerId)) showScreen(button.dataset.startExpedition);
    else goToJoin();
  }
  if (button.hasAttribute('data-home-anchor')) {
    event.preventDefault(); showScreen('welcome');
    document.getElementById(button.dataset.homeAnchor)?.scrollIntoView({ behavior:reducedMotion() ? 'instant' : 'smooth' });
  }
  if (button.hasAttribute('data-open-prologue')) { prologuePage = 0; renderPrologue(); }
  if (button.hasAttribute('data-story-page')) { prologuePage = Number(button.dataset.storyPage); renderPrologue(); $('.story-next').focus(); }
  if (button.hasAttribute('data-story-prev')) { prologuePage = Math.max(0, prologuePage - 1); renderPrologue(); $('.story-prev').focus(); }
  if (button.hasAttribute('data-story-next')) {
    if (prologuePage === prologue.length - 1) goToJoin();
    else { prologuePage++; renderPrologue(); $('.story-next').focus(); }
  }
  if (button.hasAttribute('data-open-notes')) openNotes();
  if (button.hasAttribute('data-open-help')) openHelp();
  if (button.id === 'focus-mode') {
    const enabled = document.body.classList.toggle('focus-mode');
    button.setAttribute('aria-pressed', String(enabled));
    if (enabled) window.scrollTo({ top:0, behavior:reducedMotion() ? 'instant' : 'smooth' });
  }
  if (button.hasAttribute('data-inspect')) inspectObject(button.dataset.inspect);
  if (button.hasAttribute('data-inspect-plan')) inspectObject('map');
  if (button.hasAttribute('data-expand-red')) openHypogeum(button);
  if (button.hasAttribute('data-object-filter')) {
    objectFilter = button.dataset.objectFilter;
    document.querySelectorAll('[data-object-filter]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
    if (game) renderObjects();
  }
});
document.addEventListener('input', (event) => {
  if (event.target.id === 'personal-notes') {
    const saved = storage.setItem('enigmakhi-notes', event.target.value);
    $('#notes-status').textContent = saved ? '✓ Notes enregistrées sur cet appareil.' : 'Le navigateur bloque l’enregistrement. Copiez vos notes avant de fermer.';
  }
});
document.addEventListener('keydown', (event) => {
  const coin = event.target.closest('[data-coin]');
  if (!coin || coin.disabled || !['ArrowRight','ArrowLeft','ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
  event.preventDefault();
  const current = Number(coin.dataset.coin) - 1;
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? 7 : (current + (['ArrowLeft','ArrowUp'].includes(event.key) ? -1 : 1) + 8) % 8;
  const target = document.querySelector(`[data-coin="${next + 1}"]`);
  target.click(); target.focus();
});
document.addEventListener('expedition:updated', () => {
  renderDestination();
  if (dialogMode === 'object' && inspectedItemId) inspectObject(inspectedItemId, true);
  for (const [screen, finished, title, description] of [
    ['game-screen',game.finished,'La porte est ouverte.','Vous avez réveillé le mécanisme et retrouvé la relique bleue. Cette étape de l’expédition est accomplie.'],
    ['red-screen',game.red.finished,'Le dossier est résolu.','La relique est retrouvée. La vision d’Omar indique la prochaine destination : Gizeh.'],
  ]) {
    let banner = document.querySelector(`#${screen} .completion-banner`);
    if (finished && !banner) { banner = document.createElement('div'); banner.className = 'completion-banner'; banner.setAttribute('role','status'); banner.innerHTML = `<strong>${title}</strong>${description}`; document.querySelector(`#${screen} .game-intro`).after(banner); }
    if (!finished && banner) banner.remove();
  }
});
renderDestination();
