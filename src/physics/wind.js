// ---------------------------------------------------------------------------
// Wind described from the kicker's point of view — pure.
//
// Wind is an air velocity {x, z} in m/s (where the air, and so the ball, is
// pushed). `forwardYaw` is the kicker's facing (0 = downfield, + = right).
// ---------------------------------------------------------------------------
export const WIND_LEVELS = ['Calm', 'Light', 'Gentle', 'Moderate', 'Fresh', 'Strong'];

export function windLevel(speed) {
  if (speed < 0.5) return 0;
  if (speed < 2) return 1;
  if (speed < 4) return 2;
  if (speed < 6) return 3;
  if (speed < 8) return 4;
  return 5;
}

/**
 * Deterministic gust modulation for the wind's *visual* presence (flags,
 * corner trim). Pure and time-based so pause = freeze. The flight simulation
 * always uses the round's steady wind — gusts never move the ball.
 * @param {number} t  game time in seconds
 * @param {number} [seed] shifts the gust phase (e.g. per flag or per round)
 * @returns {number} multiplier in [0.8, 1.2] — 1 = steady air
 */
export function gustFactor(t, seed = 0) {
  const a = Math.sin((t + seed) * 0.53 + 2 * Math.sin((t + seed) * 0.21 + seed));
  const b = Math.sin((t + seed) * 1.7 + seed * 3);
  return 1 + 0.2 * (0.7 * a + 0.3 * b);
}

/**
 * Split wind into along-kick (+ = tailwind) and across (+ = pushes right). */
export function windComponents(wind, forwardYaw) {
  const fx = Math.sin(forwardYaw);
  const fz = -Math.cos(forwardYaw);
  const rx = Math.cos(forwardYaw);
  const rz = Math.sin(forwardYaw);
  return { along: wind.x * fx + wind.z * fz, across: wind.x * rx + wind.z * rz };
}

/**
 * @returns {{speed, level, levelWord, along, across, arrowDeg, label}}
 *   arrowDeg: screen rotation for an arrow drawn pointing "up" = toward the
 *   posts; 90 = pushing right, 180 = blowing into the kicker's face.
 */
export function describeWind(wind, forwardYaw) {
  const speed = Math.hypot(wind.x, wind.z);
  const level = windLevel(speed);
  const { along, across } = windComponents(wind, forwardYaw);
  const arrowDeg = (Math.atan2(across, along) * 180) / Math.PI;
  const rounded = Math.round(speed);

  let label;
  if (level === 0) {
    label = 'Calm';
  } else {
    const crossDir = across < 0 ? 'right to left' : 'left to right';
    const ratio = Math.abs(across) / speed;
    let kind;
    if (ratio > 0.92) kind = `Crosswind, ${crossDir}`;
    else if (ratio < 0.38) kind = along >= 0 ? 'Tailwind' : 'Headwind';
    else kind = `${along >= 0 ? 'Tail' : 'Head'}-crosswind, ${crossDir}`;
    label = `${kind}, ${rounded} m/s`;
  }

  return { speed, level, levelWord: WIND_LEVELS[level], along, across, arrowDeg, label };
}
