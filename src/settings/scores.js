// ---------------------------------------------------------------------------
// Best scores — versioned, stored locally
// ---------------------------------------------------------------------------
import { createStore } from './storage.js';

const DEFAULT_SCORES = {
  match: { bestPoints: 0, bestStreak: 0, played: 0 },
  pressure: { bestStreak: 0, played: 0 },
  practice: { kicks: 0, goals: 0 },
};

const store = createStore('rgk.scores', { version: 1, defaults: DEFAULT_SCORES });
let current = store.load();

export const scores = {
  get() {
    return current;
  },
  /** Record a finished match; returns which bests were beaten. */
  recordMatch({ points, bestStreak }) {
    const prev = current.match;
    const beat = { points: points > prev.bestPoints, streak: bestStreak > prev.bestStreak };
    current = {
      ...current,
      match: {
        bestPoints: Math.max(prev.bestPoints, points),
        bestStreak: Math.max(prev.bestStreak, bestStreak),
        played: prev.played + 1,
      },
    };
    store.save(current);
    return { beat, previous: prev };
  },
  update(mode, patch) {
    current = { ...current, [mode]: { ...current[mode], ...patch } };
    store.save(current);
  },
};
