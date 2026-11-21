(() => {
  const titles = { welcome: 'Vocal de l’accueil', blue: 'Vocal d’Atlantide', green: 'Vocal de Gunung Padang', red: 'Vocal de Ħal Saflieni', yellow: 'Vocal de Gizeh' };
  const element = (name) => document.getElementById(`voice-${name}`);
  const title = element('title');
  const status = element('status');
  const roster = element('peers');
  const join = element('join');
  const mute = element('mute');
  const leave = element('leave');
  const unblock = element('unblock');
  const audioContainer = element('audio');
  let room = document.body.dataset.screen || 'welcome';
  let microphone;
  let session;

  function render(message) {
    title.textContent = titles[room];
    const ready = Boolean(session?.token);
    join.hidden = Boolean(microphone);
    mute.hidden = leave.hidden = !microphone;
    const muted = microphone?.getAudioTracks().some((track) => !track.enabled) ?? false;
    mute.textContent = muted ? 'Réactiver le micro' : 'Couper le micro';
    mute.setAttribute('aria-pressed', String(muted));
    const peers = [...(session?.peers.values() || [])];
    unblock.hidden = !peers.some((peer) => peer.audioBlocked);
    roster.hidden = !peers.length;
    roster.replaceChildren(...peers.map(({ name }) => {
      const item = document.createElement('li');
      item.textContent = name;
      return item;
    }));
    let label = room === 'welcome' ? 'Ouvert à tous les Akhis' : 'Pour les équipiers dans cette salle';
    if (session) label = 'Connexion au vocal…';
    if (ready) {
      const count = peers.length + 1;
      label = count === 1 ? 'Vous êtes seul dans le vocal' : `${count} participants`;
      if (peers.some(({ failed }) => failed)) label += ' · Connexion audio interrompue. Rejoignez à nouveau le vocal.';
    }
    if (status.textContent !== (message || label)) status.textContent = message || label;
  }

  function clearSession() {
    if (!session) return;
    const previous = session;
    session = undefined;
    previous.controller.abort();
    clearTimeout(previous.timeout);
    clearInterval(previous.ping);
    for (const id of previous.peers.keys()) closePeer(previous, id);
  }

  function stop(message) {
    clearSession();
    const stream = microphone;
    microphone = undefined;
    stream?.getTracks().forEach((track) => track.stop());
    render(message);
  }

  function post(action, body, signal) {
    return fetch(`/api/voice/${action}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal,
    });
  }

  function closePeer(active, id) {
    const peer = active.peers.get(id);
    if (!peer) return;
    active.peers.delete(id);
    peer.connection.close();
    peer.audio.remove();
    peer.audio.srcObject = null;
  }

  function markFailed(active, peer) {
    if (session !== active || active.peers.get(peer.id) !== peer) return;
    peer.failed = true;
    render();
  }

  function sendSignal(active, peer, payload) {
    peer.outgoing = peer.outgoing.then(async () => {
      if (session !== active || active.peers.get(peer.id) !== peer) return;
      const response = await post('signal', { token: active.token, to: peer.id, ...payload }, active.controller.signal);
      if (!response.ok && response.status !== 404) throw new Error('Signal vocal refusé');
    }).catch(() => markFailed(active, peer));
  }

  async function sendDescription(active, peer) {
    await peer.connection.setLocalDescription();
    sendSignal(active, peer, { description: peer.connection.localDescription.toJSON() });
    peer.descriptionSent = true;
    for (const candidate of peer.candidates) sendSignal(active, peer, { candidate });
    peer.candidates.length = 0;
  }

  function play(active, peer) {
    return peer.audio.play().then(() => { peer.audioBlocked = false; }, () => {
      peer.audioBlocked = true;
    }).finally(() => { if (session === active) render(); });
  }

  function addPeer(active, profile, call) {
    if (active.peers.has(profile.id)) return;
    const connection = new RTCPeerConnection({ iceServers: active.iceServers });
    const audio = document.createElement('audio');
    audioContainer.append(audio);
    const peer = { ...profile, connection, audio, candidates: [], outgoing: Promise.resolve() };
    active.peers.set(profile.id, peer);
    connection.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      if (peer.descriptionSent) sendSignal(active, peer, { candidate: candidate.toJSON() });
      else peer.candidates.push(candidate.toJSON());
    };
    connection.ontrack = ({ streams }) => {
      if (session !== active || active.peers.get(peer.id) !== peer) return;
      audio.srcObject = streams[0];
      void play(active, peer);
    };
    connection.onconnectionstatechange = () => {
      if (connection.connectionState === 'failed') markFailed(active, peer);
    };
    for (const track of microphone.getAudioTracks()) connection.addTrack(track, microphone);
    // Only the latest arrival offers. Existing members already know it from the join event.
    if (call) void sendDescription(active, peer).catch(() => markFailed(active, peer));
  }

  async function receive(active, event) {
    switch (event.type) {
      case 'ready':
        clearTimeout(active.timeout);
        active.token = event.token;
        active.iceServers = event.iceServers;
        active.ping = setInterval(async () => {
          try {
            const response = await post('ping', { token: active.token }, active.controller.signal);
            if (!response.ok) throw new Error('Salon indisponible');
          } catch {
            if (session === active) stop('Vocal déconnecté. Vous pouvez le rejoindre à nouveau.');
          }
        }, 20_000);
        for (const profile of event.peers) addPeer(active, profile, true);
        break;
      case 'joined':
        addPeer(active, event.peer, false);
        break;
      case 'left':
        closePeer(active, event.id);
        break;
      case 'signal': {
        const peer = active.peers.get(event.from);
        if (!peer) return;
        try {
          if (event.description) {
            await peer.connection.setRemoteDescription(event.description);
            if (event.description.type === 'offer' && session === active) await sendDescription(active, peer);
          } else {
            await peer.connection.addIceCandidate(event.candidate);
          }
        } catch {
          markFailed(active, peer);
        }
        return;
      }
      default:
        return;
    }
    render();
  }

  async function connect() {
    clearSession();
    const active = { controller: new AbortController(), peers: new Map() };
    session = active;
    active.timeout = setTimeout(() => active.controller.abort(), 15_000);
    render();
    try {
      const response = await post('join', { room, playerId }, active.controller.signal);
      if (!response.ok) {
        const detail = await response.json().catch(() => ({}));
        stopIfCurrent(active, detail.error || 'Ce salon vocal est indisponible.');
        return;
      }
      const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      try {
        while (session === active) {
          const { value, done } = await reader.read();
          if (done || session !== active) break;
          const lines = (buffer + value).split('\n');
          buffer = lines.pop();
          for (const line of lines) {
            if (session !== active) return;
            if (line.startsWith('data: ')) await receive(active, JSON.parse(line.slice(6)));
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch {
      // Navigating between rooms also cancels the previous stream.
    }
    stopIfCurrent(active, 'Vocal déconnecté. Vous pouvez le rejoindre à nouveau.');
  }

  function stopIfCurrent(active, message) {
    if (session === active) stop(message);
  }

  join.addEventListener('click', async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      render('Le vocal n’est pas disponible dans ce navigateur.');
      return;
    }
    join.disabled = true;
    render('Autorisez le micro pour rejoindre le vocal.');
    try {
      microphone = await navigator.mediaDevices.getUserMedia({ audio: true });
      for (const track of microphone.getAudioTracks()) {
        track.addEventListener('ended', () => stop('Micro indisponible. Rejoignez à nouveau le vocal.'), { once: true });
      }
      void connect();
      mute.focus({ preventScroll: true });
    } catch {
      render('Micro inaccessible. Vérifiez les autorisations du navigateur.');
    } finally {
      join.disabled = false;
    }
  });
  mute.addEventListener('click', () => {
    const tracks = microphone?.getAudioTracks();
    if (!tracks?.length) return;
    const enable = !tracks[0].enabled;
    for (const track of tracks) track.enabled = enable;
    render();
  });
  leave.addEventListener('click', () => {
    stop();
    join.focus({ preventScroll: true });
  });
  unblock.addEventListener('click', () => {
    const active = session;
    if (!active) return;
    for (const peer of active.peers.values()) {
      if (peer.audioBlocked) void play(active, peer);
    }
  });
  document.addEventListener('expedition:screen', ({ detail }) => {
    if (detail === room) return;
    room = detail;
    if (microphone) void connect();
    else render();
  });
  window.addEventListener('pagehide', () => stop());
  render();
})();
