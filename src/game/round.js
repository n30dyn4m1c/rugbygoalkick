// ---------------------------------------------------------------------------
// Round generation — pure. Difficulty scales with the round number.
// ---------------------------------------------------------------------------
import { GOALPOST_Z } from '../config.js';
import { yawToPosts } from '../physics/flight.js';

/**
 * @param {number} round        1-based round number
 * @param {number} totalRounds
 * @param {() => number} rng    uniform [0, 1)
 */
export function generateRound(round, totalRounds, rng) {
  // Difficulty progression factor: 0 (round 1) → 1 (last round)
  const diff = (round - 1) / (totalRounds - 1);

  // --- Try position: wider kicks in later rounds (±10 m → ±30 m) ---
  const maxTryWidth = 10 + diff * 20;
  let tryX = (rng() - 0.5) * 2 * maxTryWidth;

  // Bias toward wider positions in later rounds
  if (diff > 0.5) {
    const minWidth = maxTryWidth * 0.4;
    if (Math.abs(tryX) < minWidth) {
      tryX = (tryX >= 0 ? 1 : -1) * (minWidth + rng() * (maxTryWidth - minWidth));
    }
  }

  // --- Kick placement ---
  // A conversion is taken on a line through the grounding point, perpendicular
  // to the goal line, at a distance of the kicker's choosing.
  const kickX = tryX;
  const baseDistance = 15 + diff * 20; // 15 → 35
  const distVariation = 3;
  const kickZ = GOALPOST_Z + baseDistance + (rng() - 0.5) * distVariation + Math.abs(tryX) * 0.15;

  const autoAim = yawToPosts(kickX, kickZ);

  // --- Wind: stronger in later rounds (0–2 m/s → 3–8 m/s) ---
  const windDirDeg = rng() * 360;
  const minWind = diff * 3;
  const maxWind = 2 + diff * 6;
  const windSpeed = minWind + rng() * (maxWind - minWind);
  const windDirRad = (windDirDeg * Math.PI) / 180;
  const wind = { x: Math.sin(windDirRad) * windSpeed, z: Math.cos(windDirRad) * windSpeed };

  return { tryX, kickX, kickZ, autoAim, windDirDeg, windSpeed, wind };
}
