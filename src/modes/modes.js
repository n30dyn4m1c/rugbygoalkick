// ---------------------------------------------------------------------------
// Game modes as data — pure (no DOM, no three.js) so the rules are testable.
//
//   rounds          total kicks (Infinity = until the mode ends it)
//   round(k, ctx)   round info for kick k (1-based)
//   ends(state)     true when the session is over after a result
//   shotClock(k)    seconds allowed from tee placement to contact, or null
//   score(state)    HUD score text
// ---------------------------------------------------------------------------
import { generateRound, generatePressureRound, generatePracticeRound } from '../game/round.js';

const matchScore = (s) => `${s.points} pts`;

export const MODES = {
  match: {
    id: 'match',
    title: 'Match',
    rounds: 10,
    round: (k, { rng }) => generateRound(k, 10, rng),
    ends: (s) => s.round >= 10,
    shotClock: () => null,
    score: matchScore,
  },

  // Today's match: the same ten kicks for everyone, seeded from the date
  daily: {
    id: 'daily',
    title: 'Daily challenge',
    rounds: 10,
    round: (k, { rng }) => generateRound(k, 10, rng),
    ends: (s) => s.round >= 10,
    shotClock: () => null,
    score: matchScore,
  },

  practice: {
    id: 'practice',
    title: 'Practice',
    rounds: Infinity,
    round: (k, { rng, practice }) => generatePracticeRound(practice, rng),
    ends: () => false,
    shotClock: () => null,
    score: (s) => `${s.goals}/${s.log.length} goals`,
  },

  pressure: {
    id: 'pressure',
    title: 'Pressure',
    rounds: Infinity,
    round: (k, { rng }) => generatePressureRound(k, rng),
    ends: (s) => s.log.length > 0 && !s.log.at(-1).scored,
    shotClock: (k, round) => round.shotClock,
    score: (s) => `streak ${s.streak}`,
  },

  tutorial: {
    id: 'tutorial',
    title: 'How to play',
    rounds: 1,
    // Calm, slightly off-centre, full preview and a slow meter
    round: () => ({ difficulty: 0, tryX: -9, wind: { x: 0, z: 0 }, windSpeed: 0, previewTier: 3, meterPeriod: 2 }),
    ends: () => true,
    shotClock: () => null,
    score: matchScore,
  },
};

/** Local calendar date as YYYY-MM-DD (the daily challenge's seed). */
export function todayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}
