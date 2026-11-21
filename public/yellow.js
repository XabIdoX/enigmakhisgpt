/* Free exploration: viewpoints, light and sound are personal; observations are shared. */
(() => {
  const places = {
    plateau: { name:'Le plateau', symbol:'△', atmosphere:'LE SOLEIL DÉCLINE', sensation:'Le sable sous vos pas. Le vent au loin.', target:'Observer la pyramide', alt:'Une pyramide de pierre dorée et son entrée, au soleil couchant, sur le plateau de Gizeh', title:'À l’heure où la pierre devient or.', intro:'La pyramide se détache sur un ciel de cuivre. Une ouverture sombre interrompt sa silhouette. Prenez le temps d’observer, puis avancez dans le passage lorsque vous le souhaitez.', observation:'La lumière rase accroche chaque assise de pierre. Au pied de la pyramide, le sable forme de petites vagues contre les blocs. L’entrée paraît presque noire après l’éclat du désert. Rien ne presse : le passage est libre.', detail:'Le vent traverse le plateau. Il ne reste bientôt que vos voix.' },
    passage: { name:'Le passage', symbol:'⋂', atmosphere:'LA CHALEUR S’EFFACE', sensation:'La pierre se resserre. Vos pas résonnent.', target:'Observer le passage', alt:'Un passage de blocs de pierre en perspective, baigné par un rayon de lumière venu du désert', title:'Le désert reste derrière vous.', intro:'Les parois se rapprochent. La lumière du dehors glisse encore sur le sol, mais l’air devient plus frais. Au fond du passage, un volume plus vaste se dessine.', observation:'Les joints irréguliers et les arêtes usées apparaissent à la lumière. Une poussière fine couvre le sol. Chaque pas revient en écho, plus sourd que le précédent. Le passage mène à la chambre ; aucune porte ne vous en interdit l’accès.', detail:'La lanterne éclaire les matières. Elle n’active aucun mécanisme.' },
    chamber: { name:'La chambre', symbol:'◇', atmosphere:'LE SILENCE DE LA PIERRE', sensation:'Un rai de lumière. La poussière en suspension.', target:'Observer la chambre', alt:'Une chambre de pierre à deux piliers, traversée par un faisceau doré, avec une paroi sombre au fond', title:'Un lieu qui attend son histoire.', intro:'Le passage s’élargit. Deux piliers encadrent une pièce silencieuse, traversée d’une lumière oblique. Vous pouvez vous arrêter ici, regarder les pierres et retrouver les voix de l’équipe.', observation:'Des blocs reposent au pied des murs. Un faisceau découpe lentement la poussière et laisse le fond de la chambre dans la pénombre. Pour l’instant, rien à actionner : vous découvrez seulement l’atmosphère de cette future étape.', detail:'L’énigme, les objets et le rôle de cette chambre seront définis avec les créateurs.' },
  };
  const el = (id) => document.getElementById(`yellow-${id}`);
  let place = 'plateau';
  let observing = false;
  let light = false;
  let ambient = false;
  let audioContext;
  let wind;
  let windGain;
  let audioGeneration = 0;

  function renderShared() {
    const observed = game?.yellow?.observed || [];
    setMarkup(el('observed'), Object.entries(places).map(([key, value]) => `<li class="${observed.includes(key) ? 'seen' : ''}"><span aria-hidden="true">${observed.includes(key) ? '✓' : '○'}</span>${value.name}${observed.includes(key) ? ' · observé' : ''}</li>`).join(''));
    const entries = (game?.log || []).filter((entry) => entry.text.includes(' à Gizeh.'));
    setMarkup(el('journal'), entries.length ? entries.map((entry) => `<p><time>${esc(entry.time)}</time>${esc(entry.text)}</p>`).join('') : '<p>Observez un lieu pour en laisser une trace à l’équipe.</p>');
  }

  function selectPlace(next) {
    place = next;
    const content = places[place];
    el('scene').dataset.place = place;
    el('art').src = `/assets/yellow-${place}.svg`;
    el('art').alt = content.alt;
    el('scene-atmosphere').textContent = content.atmosphere;
    el('sensation').textContent = content.sensation;
    el('hotspot-label').textContent = content.target;
    el('observation-kicker').textContent = `CARNET D’EXPLORATION · ${content.name.toUpperCase()}`;
    el('observation-title').textContent = content.title;
    el('observation-copy').textContent = content.intro;
    el('observation-detail').textContent = 'Exploration libre. Les détails du décor ne sont pas des indices d’énigme.';
    document.querySelector('.yellow-observation-symbol').textContent = content.symbol;
    el('feedback').textContent = '';
    document.querySelectorAll('[data-yellow-place]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.yellowPlace === place)));
    if (windGain && audioContext) windGain.gain.setTargetAtTime(place === 'plateau' ? .09 : .035, audioContext.currentTime, .7);
  }

  async function observe() {
    if (observing) return;
    const target = place;
    const content = places[target];
    el('observation-copy').textContent = content.observation;
    el('observation-detail').textContent = content.detail;
    el('observation-title').focus({preventScroll:true});
    observing = true;
    el('observe').disabled = true;
    try {
      const response = await fetch('/api/action', {method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:'yellow-observe',place:target,playerId})});
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'L’observation n’a pas pu être partagée. Réessayez.');
      if (!game || result.state.version >= game.version) game = result.state;
      render();
      if (place === target) el('feedback').textContent = 'Observation inscrite au carnet commun.';
    } catch(error) {
      if (place === target) el('feedback').textContent = error.message;
      toast(error.message);
    } finally { observing = false; el('observe').disabled = false; }
  }

  function stopAmbient() {
    audioGeneration++;
    if (wind) { wind.stop(); wind.disconnect(); wind = undefined; }
    if (windGain) { windGain.disconnect(); windGain = undefined; }
    if (audioContext?.state === 'running') audioContext.suspend().catch(() => {});
  }
  function soundButton() {
    el('sound').setAttribute('aria-pressed', String(ambient));
    el('sound').textContent = ambient ? 'Couper l’ambiance' : 'Activer l’ambiance';
  }
  async function startAmbient() {
    if (wind || !ambient || document.hidden || currentScreen !== 'yellow') return;
    const generation = ++audioGeneration;
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      await audioContext.resume();
      if (generation !== audioGeneration || !ambient || currentScreen !== 'yellow' || document.hidden) return;
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * 5, audioContext.sampleRate);
      const samples = buffer.getChannelData(0);
      let last = 0;
      for (let i=0; i<samples.length; i++) { last = (last + (Math.random()*2-1)*.02)/1.02; samples[i] = last*3; }
      wind = audioContext.createBufferSource();
      wind.buffer = buffer;
      wind.loop = true;
      windGain = audioContext.createGain();
      windGain.gain.setValueAtTime(0, audioContext.currentTime);
      windGain.gain.linearRampToValueAtTime(place === 'plateau' ? .09 : .035, audioContext.currentTime+1);
      wind.connect(windGain).connect(audioContext.destination);
      wind.start();
    } catch {
      if (generation !== audioGeneration) return;
      stopAmbient(); ambient = false; soundButton();
      el('feedback').textContent = 'L’ambiance sonore est indisponible dans ce navigateur. L’exploration reste accessible.';
    }
  }

  document.addEventListener('click', (event) => {
    const destination = event.target.closest('[data-yellow-place]');
    if (destination) selectPlace(destination.dataset.yellowPlace);
    if (event.target.closest('#yellow-observe')) observe();
    if (event.target.closest('#yellow-light')) {
      light = !light;
      el('scene').classList.toggle('lit', light);
      el('light').setAttribute('aria-pressed', String(light));
      el('light').textContent = light ? 'Lanterne allumée' : 'Lanterne éteinte';
    }
    if (event.target.closest('#yellow-sound')) {
      ambient = !ambient; soundButton();
      if (ambient) startAmbient(); else stopAmbient();
    }
  });
  document.addEventListener('expedition:updated', renderShared);
  document.addEventListener('expedition:screen', (event) => {
    if (event.detail !== 'yellow') { ambient = false; stopAmbient(); soundButton(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAmbient(); else if (ambient) startAmbient();
  });
  window.addEventListener('pagehide', stopAmbient);
  renderShared();
})();
