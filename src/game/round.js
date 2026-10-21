// ---------------------------------------------------------------------------
// Round generation — pure. Difficulty scales with the round number, eased
// so a match opens gently and finishes hard. The easy/normal/hard setting
// scales that eased curve (see applyDifficulty).
// The kick distance is the player's choice (tee placement), so difficulty
// comes from how wide the try is, the wind, the preview and the meter speed.
// ---------------------------------------------------------------------------
import { FIELD_WIDTH, GOALPOST_Z } from '../config.js';
import { yawToPosts, suggestedTeeDistance } from '../physics/conversion.js';

const MAX_TRY_X = FIELD_WIDTH / 2 - 1;

// ---------------------------------------------------------------------------
// Difficulty setting: how much of the eased ramp each session uses.
//   easy:   friendlier envelope everywhere, preview stays informative
//   normal: the tuned ramp
//   hard:   steeper — wider tries, stronger wind, faster meter
// ---------------------------------------------------------------------------
export const DIFFICULTIES = ['easy', 'normal', 'hard'];
const DIFF_FACTOR = { easy: 0.55, normal: 1, hard: 1.2 };
const DIFF_MAX = 1.2;
const METER_MIN = 0.8; // seconds; the sweep must stay readable

/** Map a difficulty factor 0–1 through the chosen setting, capped at DIFF_MAX. */
export function applyDifficulty(raw, difficulty = 'normal') {
  return Math.min(DIFF_MAX, Math.max(0, raw) * (DIFF_FACTOR[difficulty] ?? 1));
}

/**
 * Match difficulty 0–1 for a round. Eased so the opening kicks stay gentle
 * (rounds 1–3 of 10 sit under 0.1) and the back half climbs steeply.
 */
export function matchDifficulty(round, totalRounds) {
  const t = totalRounds > 1 ? (round - 1) / (totalRounds - 1) : 0;
  return Math.min(1, Math.max(0, t)) ** 1.6;
}

/**
 * Match preview tier by difficulty 0–1: full → long → short → none.
 * Over ten rounds: full 1–3, long 4–5, short 6–7, none 8–10.
 */
export function matchPreviewTier(diff) {
  if (diff < 0.15) return 3;
  if (diff < 0.3) return 2;
  if (diff < 0.6) return 1;
  return 0;
}

/** Envelope for a difficulty: try width, wind range, meter speed. */
export function difficultyEnvelope(diff) {
  return {
    maxTryWidth: Math.min(8 + diff * 25, MAX_TRY_X), // ±8 m → touchline
    minWind: diff * 5, // m/s
    maxWind: 1.5 + diff * 8.5, // 1.5 → 10 m/s (≈11.7 at the hard cap)
    meterPeriod: 1.6 - diff * 0.7, // seconds for one 0→100→0 sweep
  };
}

/**
 * @param {number} round        1-based round number
 * @param {number} totalRounds
 * @param {() => number} rng    uniform [0, 1)
 * @param {string} [difficulty] 'easy' | 'normal' | 'hard'
 */
export function generateRound(round, totalRounds, rng, difficulty = 'normal') {
  return roundAtDifficulty(applyDifficulty(matchDifficulty(round, totalRounds), difficulty), rng);
}

/** A round at difficulty 0–DIFF_MAX, one fixed rng draw set so the same seed
 *  is comparable across difficulties. */
export function roundAtDifficulty(diff, rng) {
  const env = difficultyEnvelope(diff);
  const [rPos, rWide, rDir, rWind] = [rng(), rng(), rng(), rng()];

  // --- Try position: wider in later rounds (±8 m → touchline) ---
  const { maxTryWidth } = env;
  let tryX = (rPos - 0.5) * 2 * maxTryWidth;

  // Bias toward wide positions once the match gets going (floor scales with
  // difficulty, so late tries demand genuinely wide-angle kicks)
  if (diff > 0.3) {
    const minWidth = maxTryWidth * Math.min(0.6, diff * 0.7);
    if (Math.abs(tryX) < minWidth) {
      tryX = (tryX >= 0 ? 1 : -1) * (minWidth + rWide * (maxTryWidth - minWidth));
    }
  }

  // --- Wind: stronger in later rounds ---
  const windDirRad = rDir * Math.PI * 2;
  const windSpeed = env.minWind + rWind * (env.maxWind - env.minWind);
  const wind = { x: Math.sin(windDirRad) * windSpeed, z: Math.cos(windDirRad) * windSpeed };

  return {
    difficulty: diff,
    tryX,
    wind,
    windSpeed,
    previewTier: matchPreviewTier(Math.min(diff, 1)),
    meterPeriod: Math.max(METER_MIN, env.meterPeriod),
  };
}

// ---------------------------------------------------------------------------
// Pressure: difficulty climbs with every kick in the streak.
// ---------------------------------------------------------------------------

/** Preview gets shorter, then disappears (the hardest tier has none). */
export function pressurePreviewTier(kick) {
  if (kick <= 3) return 2;
  if (kick <= 7) return 1;
  return 0;
}

/** Seconds on the shot clock for kick n (1-based): generous early, tight later. */
export function pressureShotClock(kick) {
  return Math.max(12, 26 - (kick - 1) * 1.5);
}

/**
 * @param {number} kick 1-based streak position
 * @param {() => number} rng
 * @param {string} [difficulty] 'easy' | 'normal' | 'hard'
 */
export function generatePressureRound(kick, rng, difficulty = 'normal') {
  const diff = applyDifficulty(Math.min(1, (kick - 1) / 12), difficulty);
  const r = roundAtDifficulty(diff, rng);
  return { ...r, previewTier: pressurePreviewTier(kick), shotClock: pressureShotClock(kick) };
}

// ---------------------------------------------------------------------------
// Practice: the player chooses the try spot, wind and preview.
// ---------------------------------------------------------------------------

/** Wind directions relative to a kicker facing the posts: [along, across] unit parts. */
export const PRACTICE_WIND_DIRS = {
  head: [-1, 0],
  tail: [1, 0],
  ltr: [0, 1],
  rtl: [0, -1],
  headLtr: [-Math.SQRT1_2, Math.SQRT1_2],
  headRtl: [-Math.SQRT1_2, -Math.SQRT1_2],
  tailLtr: [Math.SQRT1_2, Math.SQRT1_2],
  tailRtl: [Math.SQRT1_2, -Math.SQRT1_2],
};

/**
 * @param {{tryX: number, windSpeed: number, windDir: string, previewTier: number}} opts
 *   windDir is a PRACTICE_WIND_DIRS key or 'random'
 */
export function generatePracticeRound(opts, rng) {
  const tryX = opts.tryX;
  const facing = yawToPosts(tryX, GOALPOST_Z + suggestedTeeDistance(tryX));
  const keys = Object.keys(PRACTICE_WIND_DIRS);
  const dirKey = opts.windDir === 'random' ? keys[Math.floor(rng() * keys.length)] : opts.windDir;
  const [along, across] = PRACTICE_WIND_DIRS[dirKey] ?? [0, 0];
  const fx = Math.sin(facing);
  const fz = -Math.cos(facing);
  const rx = Math.cos(facing);
  const rz = Math.sin(facing);
  const sp = opts.windSpeed;
  const wind = { x: (fx * along + rx * across) * sp, z: (fz * along + rz * across) * sp };
  return { difficulty: 0, tryX, wind, windSpeed: sp, previewTier: opts.previewTier, meterPeriod: 1.6 };
}
