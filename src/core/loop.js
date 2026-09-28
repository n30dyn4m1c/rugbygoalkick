// ---------------------------------------------------------------------------
// Main loop — fixed-timestep simulation, variable-rate rendering.
// Stops rendering while the tab is hidden; supports manual stepping (debug).
// ---------------------------------------------------------------------------
export function createLoop({ step, render, hz = 120, maxFrame = 0.25 }) {
  const dt = 1 / hz;
  let acc = 0;
  let last = null;
  let rafId = null;
  let paused = false;
  let manual = false;

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (last === null) last = now;
    const elapsed = Math.min((now - last) / 1000, maxFrame);
    last = now;
    if (!paused && !manual) {
      acc += elapsed;
      while (acc >= dt) {
        step(dt);
        acc -= dt;
      }
    }
    render();
  }

  function start() {
    if (rafId === null) {
      last = null;
      rafId = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (rafId !== null) cancelAnimationFrame(rafId);
    rafId = null;
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  return {
    dt,
    start,
    stop,
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      acc = 0;
    },
    get paused() {
      return paused;
    },
    /** Debug: stop real-time stepping; advance only via stepFor(). */
    setManual(on) {
      manual = on;
      acc = 0;
    },
    stepFor(seconds) {
      const n = Math.round(seconds / dt);
      for (let i = 0; i < n; i++) step(dt);
      render();
    },
  };
}
