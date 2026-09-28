// ---------------------------------------------------------------------------
// Kick judgement — pure. Solves for the moment the ball reaches the goal plane.
// ---------------------------------------------------------------------------
import { GRAVITY, GOALPOST_Z, UPRIGHT_SEPARATION, CROSSBAR_HEIGHT } from '../config.js';

export const OUTCOME = {
  GOAL: 'goal',
  WIDE: 'wide',
  SHORT: 'short',
  LOW: 'low',
};

/**
 * @param {{start, vel, wind, landing}} kick  landing = ball position on landing
 * @returns {{outcome: string, crossing?: {x, y, t}}}
 */
export function judgeKick({ start, vel, wind, landing }) {
  if (landing.z > GOALPOST_Z + 1) return { outcome: OUTCOME.SHORT };

  const a = 0.5 * wind.z;
  const b = vel.z;
  const c = start.z - GOALPOST_Z;

  let t;
  if (Math.abs(a) < 0.0001) {
    t = -c / b;
  } else {
    const disc = b * b - 4 * a * c;
    if (disc < 0) return { outcome: OUTCOME.WIDE };
    const sqrtDisc = Math.sqrt(disc);
    const candidates = [(-b + sqrtDisc) / (2 * a), (-b - sqrtDisc) / (2 * a)].filter((v) => v > 0);
    if (candidates.length === 0) return { outcome: OUTCOME.WIDE };
    t = Math.min(...candidates);
  }

  const y = start.y + vel.y * t - 0.5 * GRAVITY * t * t;
  const x = start.x + vel.x * t + 0.5 * wind.x * t * t;
  const crossing = { x, y, t };

  const betweenPosts = Math.abs(x) < UPRIGHT_SEPARATION;
  const aboveCrossbar = y > CROSSBAR_HEIGHT;

  if (betweenPosts && aboveCrossbar) return { outcome: OUTCOME.GOAL, crossing };
  if (!betweenPosts) return { outcome: OUTCOME.WIDE, crossing };
  return { outcome: OUTCOME.LOW, crossing };
}
