// ---------------------------------------------------------------------------
// Game clock — advances only when the game advances, so pausing the loop
// pauses every timer. Replaces setTimeout for gameplay flow.
// ---------------------------------------------------------------------------
export function createClock() {
  let time = 0;
  let nextId = 1;
  let timers = [];

  return {
    get time() {
      return time;
    },

    advance(dt) {
      time += dt;
      for (;;) {
        let due = null;
        for (const t of timers) {
          if (t.at <= time && (!due || t.at < due.at)) due = t;
        }
        if (!due) break;
        timers = timers.filter((t) => t !== due);
        due.fn();
      }
    },

    /** Run fn once `seconds` of game time from now. Returns an id for cancel(). */
    after(seconds, fn) {
      const id = nextId++;
      timers.push({ id, at: time + seconds, fn });
      return id;
    },

    cancel(id) {
      timers = timers.filter((t) => t.id !== id);
    },

    clear() {
      timers = [];
    },

    get pending() {
      return timers.length;
    },
  };
}
