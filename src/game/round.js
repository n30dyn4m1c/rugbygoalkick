// ---------------------------------------------------------------------------
// Round generation — pure. Difficulty scales with the round number.
// The kick distance is the player's choice (tee placement), so difficulty
// comes from how wide the try is, the wind, the preview and the meter speed.
// ---------------------------------------------------------------------------
import { FIELD_WIDTH } from '../config.js';

const MAX_TRY_X = FIELD_WIDTH / 2 - 1;

/** Match preview tier by difficulty 0–1: full → long → short. */
export function matchPreviewTier(diff) {
  if (diff < 0.25) return 3;
  if (diff < 0.6) return 2;
  return 1;
}

/**
 * @param {number} round        1-based round number
 * @param {number} totalRounds
 * @param {() => number} rng    uniform [0, 1)
 */
export function generateRound(round, totalRounds, rng) {
  // Difficulty progression factor: 0 (round 1) → 1 (last round)
  const diff = totalRounds > 1 ? (round - 1) / (totalRounds - 1) : 0;

  // --- Try position: wider in later rounds (±10 m → ±30 m) ---
  const maxTryWidth = Math.min(10 + diff * 20, MAX_TRY_X);
  let tryX = (rng() - 0.5) * 2 * maxTryWidth;

  // Bias toward wider positions in later rounds
  if (diff > 0.5) {
    const minWidth = maxTryWidth * 0.4;
    if (Math.abs(tryX) < minWidth) {
      tryX = (tryX >= 0 ? 1 : -1) * (minWidth + rng() * (maxTryWidth - minWidth));
    }
  }

  // --- Wind: stronger in later rounds (0–2 m/s → 3–8 m/s) ---
  const windDirRad = rng() * Math.PI * 2;
  const minWind = diff * 3;
  const maxWind = 2 + diff * 6;
  const windSpeed = minWind + rng() * (maxWind - minWind);
  const wind = { x: Math.sin(windDirRad) * windSpeed, z: Math.cos(windDirRad) * windSpeed };

  return {
    difficulty: diff,
    tryX,
    wind,
    windSpeed,
    previewTier: matchPreviewTier(diff),
    meterPeriod: 1.6 - diff * 0.5, // seconds for one 0→100→0 sweep
  };
}
