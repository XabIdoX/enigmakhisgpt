/* Local observations and move drafts; only confirmed actions change shared state. */
(() => {
  const clues = {
    ivory: { title:'Le serment d’Ivoire', kicker:'LE ROI QUI VOULAIT OUVRIR', body:'Une couronne claire surmonte le premier trône. Le relief montre un souverain guidant les siens vers une porte de lumière. À ses côtés, une conseillère porte le même sceau que la dame de l’échiquier.', quote:'« Je ne gagnerai pas par le nombre. Je protégerai celle qui fera le dernier pas. »' },
    basalt: { title:'Le serment de Basalte', kicker:'LE ROI QUI GARDAIT LE SEUIL', body:'Le second souverain est sculpté dans une pierre sombre. Son armée se resserre autour du sanctuaire. Plus bas, les silhouettes s’effacent : il ne reste qu’un roi, retranché dans un angle du champ de bataille.', quote:'« Tant qu’une seule voie me reste, nul ne franchira ce seuil. »' },
    stele: { title:'La bataille inachevée', kicker:'SOIXANTE-QUATRE CASES DANS LA PIERRE', body:'Deux armées sont gravées de part et d’autre d’une grille. La dernière scène est presque vide : le roi d’Ivoire en f6, sa dame en f7 et le roi de Basalte en h8. Les autres combattants ont disparu. Le camp d’Ivoire doit jouer.', quote:'« Ne prends pas la couronne. Retire-lui toutes ses issues. Un seul mouvement doit suffire. »' },
  };
  let selectedClue = null;
  let queenSelected = false;
  let destination = null;
  let sending = false;
  let boardSignature = '';
  const el = (id) => document.getElementById(`green-${id}`);

  async function send(action, extra = {}) {
    if (sending) return;
    sending = true;
    renderGreen();
    try {
      const response = await fetch('/api/action', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action, playerId, ...extra}) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Ce mouvement ne peut pas être joué.');
      if (!game || result.state.version >= game.version) game = result.state;
      if (action === 'green-move') { queenSelected = false; destination = null; }
      render();
      el('move-feedback').textContent = '';
    } catch (error) {
      el('move-feedback').textContent = error.message;
      toast(error.message);
    } finally { sending = false; renderGreen(); }
  }

  function renderGreen() {
    const green = game?.green;
    if (!green) return;
    for (const button of document.querySelectorAll('[data-green-clue]')) {
      const id = button.dataset.greenClue;
      button.disabled = sending;
      button.setAttribute('aria-pressed', String(selectedClue === id));
      button.querySelector('small').textContent = green.inspected.includes(id) ? '✓ Déchiffré par l’équipe' : id === 'stele' ? 'Observer les gravures' : 'Lire son serment';
    }
    const steps = [
      [green.inspected.includes('ivory'), 'Lire le serment d’Ivoire'],
      [green.inspected.includes('basalt'), 'Lire le serment de Basalte'],
      [green.inspected.includes('stele'), 'Déchiffrer la stèle'],
      [green.battle, 'Réveiller la bataille'],
      [green.finished, 'Trouver le dernier coup'],
    ];
    setMarkup(el('progress'), steps.map(([done,text],i) => `<li class="${done ? 'done' : ''}"><span>${done ? '✓' : i+1}</span>${text}</li>`).join(''));
    el('awaken').disabled = green.inspected.length < 3 || sending;
    el('battle-locked').hidden = green.battle;
    el('battle-active').hidden = !green.battle;
    el('battle-state').textContent = green.finished ? 'Échec et mat' : green.battle ? 'Aux blancs de jouer' : `${green.inspected.length} / 3 inscriptions`;
    el('ending').hidden = !green.finished;
    if (green.finished || !green.battle) { queenSelected = false; destination = null; }
    el('confirm').disabled = !destination || sending || green.finished;
    el('clear').disabled = !queenSelected || sending || green.finished;
    el('move-preview').textContent = green.finished ? 'Dame f7 → g7 · échec et mat.' : destination ? `Votre proposition : dame f7 → ${destination}.` : queenSelected ? 'Dame sélectionnée. Choisissez une case.' : 'Aucun coup sélectionné.';
    const signature = JSON.stringify([green.battle, green.finished, queenSelected, destination, sending]);
    if (signature !== boardSignature) {
      boardSignature = signature;
      const focusedSquare = document.activeElement?.dataset.greenSquare;
      const queenAt = green.finished ? 'g7' : 'f7';
      const squares = [];
      for (let rank=8; rank>=1; rank--) for (let file=0; file<8; file++) {
        const square = `${'abcdefgh'[file]}${rank}`;
        const piece = square === queenAt ? ['♕','dame d’Ivoire','ivory-piece'] : square === 'f6' ? ['♔','roi d’Ivoire','ivory-piece'] : square === 'h8' ? ['♚','roi de Basalte','basalt-piece'] : ['','case vide',''];
        squares.push(`<button type="button" class="green-square ${(file+rank)%2 === 0 ? 'dark' : ''} ${piece[2]} ${queenSelected && square === 'f7' ? 'selected' : ''} ${destination === square ? 'target' : ''}" data-green-square="${square}" aria-label="${square}, ${piece[1]}" aria-pressed="${destination === square || (queenSelected && square === 'f7')}" ${green.finished || !green.battle || sending ? 'disabled' : ''}><span aria-hidden="true">${piece[0]}</span><small aria-hidden="true">${square}</small></button>`);
      }
      el('board').innerHTML = squares.join('');
      if (focusedSquare) el('board').querySelector(`[data-green-square="${focusedSquare}"]`)?.focus({preventScroll:true});
    }
    const entries = game.log.filter((entry) => /Gunung Padang|deux rois|dernier mouvement/.test(entry.text));
    setMarkup(el('journal'), entries.length ? entries.map((entry) => `<p><time>${esc(entry.time)}</time>${esc(entry.text)}</p>`).join('') : '<p>Aucun vestige déchiffré. Approchez-vous des deux rois.</p>');
  }

  document.addEventListener('click', (event) => {
    const clue = event.target.closest('[data-green-clue]');
    if (clue) {
      selectedClue = clue.dataset.greenClue;
      const content = clues[selectedClue];
      el('clue-title').textContent = content.title;
      el('clue-kicker').textContent = content.kicker;
      el('clue-body').textContent = content.body;
      el('clue-quote').textContent = content.quote;
      el('clue-title').focus({preventScroll:true});
      send('green-inspect', {clueId:selectedClue});
    }
    if (event.target.closest('#green-awaken')) send('green-battle');
    const squareButton = event.target.closest('[data-green-square]');
    if (squareButton && !squareButton.disabled) {
      const square = squareButton.dataset.greenSquare;
      if (square === 'f7') { queenSelected = true; destination = null; }
      else if (!queenSelected) el('move-feedback').textContent = 'Sélectionnez d’abord la dame en f7.';
      else if (square === 'f6' || square === 'h8') el('move-feedback').textContent = 'On ne prend pas un roi. Choisissez une case vide.';
      else {
        const dx = square.charCodeAt(0) - 'f'.charCodeAt(0);
        const dy = Number(square[1]) - 7;
        if ((dx === 0 && dy < 0) || !(dx === 0 || dy === 0 || Math.abs(dx) === Math.abs(dy))) {
          el('move-feedback').textContent = 'La dame suit une ligne, une colonne ou une diagonale sans traverser une pièce.';
          destination = null;
        } else { destination = square; el('move-feedback').textContent = ''; }
      }
      renderGreen();
    }
    if (event.target.closest('#green-confirm') && destination) send('green-move', {from:'f7',to:destination});
    if (event.target.closest('#green-clear')) { queenSelected = false; destination = null; el('move-feedback').textContent = ''; renderGreen(); }
  });
  el('board').addEventListener('keydown', (event) => {
    if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
    const square = event.target.dataset.greenSquare;
    if (!square) return;
    event.preventDefault();
    const file = square.charCodeAt(0) + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0);
    const rank = Number(square[1]) + (event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0);
    el('board').querySelector(`[data-green-square="${String.fromCharCode(file)}${rank}"]`)?.focus();
  });
  document.addEventListener('expedition:updated', renderGreen);
  document.addEventListener('expedition:screen', renderGreen);
  renderGreen();
})();
