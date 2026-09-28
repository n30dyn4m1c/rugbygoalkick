// ---------------------------------------------------------------------------
// Web Audio engine: one context, four buses (sfx, music, crowd → master).
// Created lazily and resumed on the first user gesture (autoplay policy).
// Everything is synthesised; no audio files.
// ---------------------------------------------------------------------------
export function createAudioEngine() {
  let ctx = null;
  let buses = null;
  let noise = null;
  const volumes = { master: 0.8, sfx: 0.9, music: 0.5, crowd: 0.7, muted: false };
  const readyFns = [];

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC({ latencyHint: 'interactive' });
    const master = ctx.createGain();
    // Gentle limiter so stacked cheers never clip
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.ratio.value = 8;
    master.connect(limiter).connect(ctx.destination);
    buses = { master, sfx: ctx.createGain(), music: ctx.createGain(), crowd: ctx.createGain() };
    for (const k of ['sfx', 'music', 'crowd']) buses[k].connect(master);

    // 2 s of white noise, shared by every noisy sound
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

    apply();
  }

  function flushReady() {
    for (const fn of readyFns.splice(0)) fn();
  }

  function apply() {
    if (!ctx) return;
    const t = ctx.currentTime;
    buses.master.gain.setTargetAtTime(volumes.muted ? 0 : volumes.master, t, 0.03);
    buses.sfx.gain.setTargetAtTime(volumes.sfx, t, 0.03);
    buses.music.gain.setTargetAtTime(volumes.music, t, 0.03);
    buses.crowd.gain.setTargetAtTime(volumes.crowd, t, 0.03);
  }

  function unlock() {
    init();
    if (!ctx) return;
    (ctx.state === 'suspended' ? ctx.resume() : Promise.resolve()).then(flushReady, () => {});
  }
  for (const type of ['pointerdown', 'keydown', 'touchend']) {
    window.addEventListener(type, unlock, { capture: true, passive: true });
  }

  return {
    get ctx() {
      return ctx;
    },
    get ready() {
      return !!ctx && ctx.state === 'running';
    },
    bus: (name) => buses?.[name],
    get noise() {
      return noise;
    },
    /** Run fn once audio is unlocked and running (immediately if it already is). */
    onReady(fn) {
      if (ctx?.state === 'running') fn();
      else readyFns.push(fn);
    },
    setVolumes(v) {
      Object.assign(volumes, v);
      apply();
    },
    /** Suspend while the tab is hidden or the game is paused. */
    suspend() {
      ctx?.suspend();
    },
    resume() {
      if (ctx?.state === 'suspended') ctx.resume();
    },
  };
}
