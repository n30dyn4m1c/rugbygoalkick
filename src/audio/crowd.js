// ---------------------------------------------------------------------------
// Crowd audio: a murmuring bed whose level and brightness follow the tension
// of the kick, plus one-shot cheers and groans.
// ---------------------------------------------------------------------------
export function createCrowdAudio(a) {
  let bed = null;

  function startBed() {
    const { ctx } = a;
    const src = ctx.createBufferSource();
    src.buffer = a.noise;
    src.loop = true;
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 650;
    band.Q.value = 0.6;
    const murmur = ctx.createGain();
    murmur.gain.value = 0.5;
    // Slow random-ish swell from two detuned LFOs
    for (const [rate, depth] of [[0.13, 0.12], [0.31, 0.08]]) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = rate;
      const lg = ctx.createGain();
      lg.gain.value = depth;
      lfo.connect(lg).connect(murmur.gain);
      lfo.start();
    }
    const level = ctx.createGain();
    level.gain.value = 0.0001;
    src.connect(band).connect(murmur).connect(level).connect(a.bus('crowd'));
    src.start();
    bed = { band, level };
  }

  a.onReady(startBed);

  /** A swell of many voices: noise through a vowel-ish band, shaped. */
  function burst({ peak, attack, hold, release, freq, freqEnd, q = 0.9 }) {
    if (!a.ready) return;
    const { ctx } = a;
    const t = ctx.currentTime;
    const dur = attack + hold + release;
    const src = ctx.createBufferSource();
    src.buffer = a.noise;
    src.loop = true;
    src.start(t, Math.random());
    src.stop(t + dur + 0.1);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.setValueAtTime(peak, t + attack + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.bus('crowd'));
  }

  return {
    /** 0 = relaxed murmur, 1 = everyone holding their breath / on their feet. */
    setTension(v) {
      if (!bed) return;
      const t = a.ctx.currentTime;
      bed.level.gain.setTargetAtTime(0.08 + v * 0.22, t, 0.4);
      bed.band.frequency.setTargetAtTime(550 + v * 450, t, 0.4);
    },
    cheer(big = true) {
      burst({ peak: big ? 0.9 : 0.6, attack: 0.12, hold: 1.1, release: 1.6, freq: 900, freqEnd: 1300 });
      burst({ peak: 0.35, attack: 0.2, hold: 0.8, release: 1.4, freq: 2400, freqEnd: 2000, q: 1.5 }); // whistles/hoots
    },
    groan() {
      burst({ peak: 0.55, attack: 0.08, hold: 0.25, release: 0.9, freq: 520, freqEnd: 260, q: 1.2 });
    },
    gasp() {
      burst({ peak: 0.4, attack: 0.05, hold: 0.1, release: 0.4, freq: 1100, freqEnd: 800, q: 1.4 });
    },
  };
}
