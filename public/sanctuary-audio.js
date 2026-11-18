/* Stone slab recording by Rooms_Boxes (CC0), excerpt approved by DoX. */
const sanctuaryAudio = (() => {
  const AudioEngine = window.AudioContext || window.webkitAudioContext;
  let muted = false;
  try { muted = localStorage.getItem('enigmakhi-sound-muted') === 'true'; } catch {}
  let context;
  let bufferPromise;
  let voice;
  let generation = 0;

  function updateButton() {
    document.querySelectorAll('#sound-toggle, [data-toggle-sound]').forEach((button) => {
      button.innerHTML = '<span aria-hidden="true">' + (muted ? '♩' : '♫') + '</span> Sons';
      button.setAttribute('aria-pressed', String(!muted));
      button.setAttribute('aria-label', muted ? 'Activer les sons' : 'Couper les sons');
      button.title = muted ? 'Activer les sons' : 'Couper les sons';
      button.disabled = !AudioEngine;
      if (!AudioEngine) button.title = 'Les sons sont indisponibles dans ce navigateur.';
    });
  }

  function loadBuffer() {
    if (!bufferPromise) {
      bufferPromise = fetch('/assets/stone-slab-slide.mp3')
        .then((response) => {
          if (!response.ok) throw new Error('Son indisponible');
          return response.arrayBuffer();
        })
        .then((bytes) => context.decodeAudioData(bytes))
        .catch((error) => { bufferPromise = undefined; throw error; });
    }
    return bufferPromise;
  }

  function unlock() {
    if (muted || !AudioEngine) return;
    try {
      context ||= new AudioEngine({ latencyHint:'interactive' });
      if (context.state === 'suspended') context.resume().catch(() => {});
      loadBuffer().catch(() => {});
    } catch {
      // A later user gesture can retry if the browser or audio device was unavailable.
    }
  }

  function stop() {
    generation++;
    if (!voice) return;
    const current = voice;
    voice = undefined;
    const now = context.currentTime;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setValueAtTime(current.gain.gain.value, now);
    current.gain.gain.linearRampToValueAtTime(0, now + .025);
    current.source.stop(now + .03);
  }

  function canPlay(screen) {
    return !muted && context?.state === 'running' &&
      !document.hidden && document.body.dataset.screen === screen;
  }

  async function playStone(screen = 'blue') {
    stop();
    if (!canPlay(screen)) return;
    const request = generation;
    const started = performance.now();
    try {
      const buffer = await loadBuffer();
      if (request !== generation || !canPlay(screen)) return;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const offset = reduced ? 0 : (performance.now() - started) / 1000;
      if (offset >= buffer.duration) return;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      const length = reduced ? .8 : buffer.duration - offset;
      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(.65, now + .03);
      gain.gain.setValueAtTime(.65, now + Math.max(.03, length - .12));
      gain.gain.linearRampToValueAtTime(0, now + length);
      source.connect(gain);
      gain.connect(context.destination);
      const current = { source, gain };
      voice = current;
      source.onended = () => {
        source.disconnect();
        gain.disconnect();
        if (voice === current) voice = undefined;
      };
      source.start(0, offset, length);
    } catch {
      // An unavailable sound must not interrupt the expedition.
    }
  }

  document.addEventListener('pointerdown', unlock, { capture:true });
  document.addEventListener('keydown', (event) => {
    if (!event.repeat && ['Enter',' '].includes(event.key)) unlock();
  }, { capture:true });
  document.addEventListener('click', (event) => {
    if (!event.target.closest('#sound-toggle, [data-toggle-sound]')) return;
    muted = !muted;
    stop();
    try { localStorage.setItem('enigmakhi-sound-muted', String(muted)); } catch {}
    updateButton();
    if (!muted) unlock();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  updateButton();
  return { playStone, stop, updateButton };
})();
