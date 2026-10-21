// ---------------------------------------------------------------------------
// Best scores — versioned, stored locally
// ---------------------------------------------------------------------------
import { createStore } from './storage.js';

const DEFAULT_SCORES = {
  match: { bestPoints: 0, bestStreak: 0, played: 0 },
  matchEasy: { bestPoints: 0, bestStreak: 0, played: 0 },
  matchHard: { bestPoints: 0, bestStreak: 0, played: 0 },
  pressure: { bestStreak: 0, played: 0 },
  pressureEasy: { bestStreak: 0, played: 0 },
  pressureHard: { bestStreak: 0, played: 0 },
  practice: { kicks: 0, goals: 0 },
  daily: { date: '', bestPoints: 0, played: 0 },
  dailyEasy: { date: '', bestPoints: 0, played: 0 },
  dailyHard: { date: '', bestPoints: 0, played: 0 },
};

const store = createStore('rgk.scores', { version: 1, defaults: DEFAULT_SCORES });
let current = store.load();

/** Bests are kept per difficulty so an easy run can't take a hard slot. */
const slot = (base, difficulty) =>
  difficulty === 'easy' ? `${base}Easy` : difficulty === 'hard' ? `${base}Hard` : base;

export const scores = {
  get() {
    return current;
  },
  /** Record a finished match; returns which bests were beaten. */
  recordMatch({ points, bestStreak, difficulty }) {
    const key = slot('match', difficulty);
    const prev = current[key] ?? DEFAULT_SCORES.match;
    const beat = { points: points > prev.bestPoints, streak: bestStreak > prev.bestStreak };
    current = {
      ...current,
      [key]: {
        bestPoints: Math.max(prev.bestPoints, points),
        bestStreak: Math.max(prev.bestStreak, bestStreak),
        played: prev.played + 1,
      },
    };
    store.save(current);
    return { beat, previous: prev };
  },
  recordPressure({ streak, difficulty }) {
    const key = slot('pressure', difficulty);
    const prev = current[key] ?? DEFAULT_SCORES.pressure;
    const beat = { streak: streak > prev.bestStreak, points: false };
    current = { ...current, [key]: { bestStreak: Math.max(prev.bestStreak, streak), played: prev.played + 1 } };
    store.save(current);
    return { beat, previous: prev };
  },
  /** Daily bests reset when the date changes. */
  recordDaily({ points, date, difficulty }) {
    const key = slot('daily', difficulty);
    const blank = { date, bestPoints: 0, played: 0 };
    const prev = current[key]?.date === date ? current[key] : blank;
    const beat = { points: points > prev.bestPoints, streak: false };
    current = { ...current, [key]: { date, bestPoints: Math.max(prev.bestPoints, points), played: prev.played + 1 } };
    store.save(current);
    return { beat, previous: prev };
  },
  update(mode, patch) {
    current = { ...current, [mode]: { ...current[mode], ...patch } };
    store.save(current);
  },
};
