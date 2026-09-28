// ---------------------------------------------------------------------------
// Kick judgement — pure. Solves for the first moment the ball reaches the
// goal plane; a crossing after the ball has landed doesn't count.
// ---------------------------------------------------------------------------
import { GRAVITY, GOALPOST_Z, POST_HALF_WIDTH, CROSSBAR_HEIGHT } from '../config.js';

export const OUTCOME = {
  GOAL: 'goal',
  WIDE: 'wide',
  SHORT: 'short',
  LOW: 'low',
};

/** Earliest t > 0 at which z(t) = GOALPOST_Z, or null. */
export function goalPlaneTime(start, vel, wind) {
  const a = 0.5 * wind.z;
  const b = vel.z;
  const c = start.z - GOALPOST_Z;
  if (Math.abs(a) < 1e-9) {
    if (Math.abs(b) < 1e-9) return null;
    const t = -c / b;
    return t > 0 ? t : null;
  }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const roots = [(-b + sqrtDisc) / (2 * a), (-b - sqrtDisc) / (2 * a)].filter((t) => t > 0);
  return roots.length ? Math.min(...roots) : null;
}

/**
 * @param {{start, vel, wind, landingTime}} kick
 * @returns {{outcome: string, crossing?: {x, y, t}}}
 */
export function judgeKick({ start, vel, wind, landingTime }) {
  const t = goalPlaneTime(start, vel, wind);
  if (t === null || t > landingTime) return { outcome: OUTCOME.SHORT };

  const x = start.x + vel.x * t + 0.5 * wind.x * t * t;
  const y = start.y + vel.y * t - 0.5 * GRAVITY * t * t;
  const crossing = { x, y, t };

  const betweenPosts = Math.abs(x) < POST_HALF_WIDTH;
  if (!betweenPosts) return { outcome: OUTCOME.WIDE, crossing };
  if (y > CROSSBAR_HEIGHT) return { outcome: OUTCOME.GOAL, crossing };
  return { outcome: OUTCOME.LOW, crossing };
}
