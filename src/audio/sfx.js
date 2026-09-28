// ---------------------------------------------------------------------------
// Synthesised sound effects. Each function schedules nodes and lets them
// stop themselves; nothing is held between calls.
// ---------------------------------------------------------------------------

function env(g, t, attack, peak, decay) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseSource(a, t, duration, offset = Math.random()) {
  const src = a.ctx.createBufferSource();
  src.buffer = a.noise;
  src.start(t, offset, duration);
  return src;
}

export function createSfx(a) {
  const ok = () => a.ready;
  const out = () => a.bus('sfx');

  return {
    /** Boot on ball: low thump plus a leathery slap, louder with power. */
    kick(power = 0.7) {
      if (!ok()) return;
      const { ctx } = a;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.setValueAtTime(140, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      const g = ctx.createGain();
      env(g, t, 0.004, 0.6 + power * 0.4, 0.18);
      o.connect(g).connect(out());
      o.start(t);
      o.stop(t + 0.25);

      const n = noiseSource(a, t, 0.08);
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 1800;
      f.Q.value = 0.8;
      const ng = ctx.createGain();
      env(ng, t, 0.002, 0.35 + power * 0.3, 0.06);
      n.connect(f).connect(ng).connect(out());
    },

    /** Air rushing past, sweeping down as the ball climbs away. */
    whoosh(duration = 1.2) {
      if (!ok()) return;
      const { ctx } = a;
      const t = ctx.currentTime;
      const n = noiseSource(a, t, Math.min(duration, 1.9));
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.Q.value = 1.4;
      f.frequency.setValueAtTime(2400, t);
      f.frequency.exponentialRampToValueAtTime(500, t + duration);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.22, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
      n.connect(f).connect(g).connect(out());
    },

    /** The "doink": a padded metal post ringing. */
    doink(strength = 1) {
      if (!ok()) return;
      const { ctx } = a;
      const t = ctx.currentTime;
      for (const [freq, amp, dec] of [[392, 0.5, 0.5], [988, 0.25, 0.35], [1560, 0.12, 0.2]]) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq * 1.02, t);
        o.frequency.exponentialRampToValueAtTime(freq, t + 0.05);
        const g = ctx.createGain();
        env(g, t, 0.003, amp * strength, dec);
        o.connect(g).connect(out());
        o.start(t);
        o.stop(t + dec + 0.05);
      }
    },

    /** Ball landing on turf. */
    thud() {
      if (!ok()) return;
      const { ctx } = a;
      const t = ctx.currentTime;
      const n = noiseSource(a, t, 0.1);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 380;
      const g = ctx.createGain();
      env(g, t, 0.003, 0.4, 0.09);
      n.connect(f).connect(g).connect(out());
    },

    /** Small UI tick (tee steps, aim detents, menu focus). */
    tick(pitch = 1) {
      if (!ok()) return;
      const { ctx } = a;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = 1400 * pitch;
      const g = ctx.createGain();
      env(g, t, 0.001, 0.06, 0.03);
      o.connect(g).connect(out());
      o.start(t);
      o.stop(t + 0.05);
    },

    /** Meter start (rising) / lock (falling) blips. */
    blip(up = true) {
      if (!ok()) return;
      const { ctx } = a;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.setValueAtTime(up ? 520 : 880, t);
      o.frequency.exponentialRampToValueAtTime(up ? 880 : 520, t + 0.08);
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 2200;
      const g = ctx.createGain();
      env(g, t, 0.003, 0.08, 0.09);
      o.connect(f).connect(g).connect(out());
      o.start(t);
      o.stop(t + 0.12);
    },

    uiClick() {
      this.tick(0.7);
    },
  };
}
