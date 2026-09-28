// ---------------------------------------------------------------------------
// Optional menu music: a kundu-style hand-drum groove, synthesised. The kundu
// is an hourglass drum played across Papua New Guinea; this is a generic
// pitched-membrane pattern, not a recording or a specific traditional rhythm.
// Uses a short look-ahead scheduler (audio clock) — not gameplay timing.
// ---------------------------------------------------------------------------
const BPM = 96;
// 16 steps: L = low open tone, H = high slap, m = muted ghost note
const PATTERN = 'L.m.H.mLL.m.H.Hm';

export function createMusic(a) {
  let playing = false;
  let timer = null;
  let nextTime = 0;
  let step = 0;
  let out = null;

  function drum(t, kind) {
    const { ctx } = a;
    const base = kind === 'H' ? 290 : kind === 'L' ? 150 : 210;
    const amp = kind === 'm' ? 0.12 : kind === 'H' ? 0.3 : 0.45;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(base * 1.35, t);
    o.frequency.exponentialRampToValueAtTime(base, t + 0.05); // membrane pitch drop
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(amp, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'L' ? 0.35 : 0.15));
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.4);
    // Skin slap transient
    const n = ctx.createBufferSource();
    n.buffer = a.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = kind === 'H' ? 2500 : 1200;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(amp * 0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
    n.connect(f).connect(ng).connect(out);
    n.start(t, Math.random(), 0.04);
  }

  function schedule() {
    const { ctx } = a;
    const stepDur = 60 / BPM / 4;
    while (nextTime < ctx.currentTime + 0.12) {
      const k = PATTERN[step % PATTERN.length];
      if (k !== '.') drum(nextTime, k);
      nextTime += stepDur;
      step++;
    }
  }

  return {
    get playing() {
      return playing;
    },
    start() {
      if (playing || !a.ready) return;
      playing = true;
      const { ctx } = a;
      out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, ctx.currentTime);
      out.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
      out.connect(a.bus('music'));
      nextTime = ctx.currentTime + 0.05;
      step = 0;
      timer = setInterval(schedule, 25);
    },
    stop() {
      if (!playing) return;
      playing = false;
      clearInterval(timer);
      const g = out;
      const t = a.ctx.currentTime;
      g.gain.setTargetAtTime(0.0001, t, 0.25);
      setTimeout(() => g.disconnect(), 1500);
    },
  };
}
