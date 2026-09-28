// ---------------------------------------------------------------------------
// Fixed-step ball flight — the single source of truth for both the aim
// preview and the kick the player sees. Pure: no three.js, no DOM.
//
// Semi-implicit Euler at PHYSICS_HZ with gravity and quadratic drag computed
// against the ball's velocity relative to the air, so wind acts through drag
// and matters more the longer the ball is in the air.
// ---------------------------------------------------------------------------
import {
  GRAVITY, GOALPOST_Z, POST_HALF_WIDTH, CROSSBAR_HEIGHT, UPRIGHT_HEIGHT,
  PHYSICS_HZ, BALL_RADIUS, DRAG_K, UPRIGHT_RADIUS, CROSSBAR_RADIUS,
  POST_RESTITUTION, POST_FRICTION, GROUND_RESTITUTION, GROUND_FRICTION,
  KICK_SPEED_MIN, KICK_SPEED_MAX,
} from '../config.js';

export const DT = 1 / PHYSICS_HZ;

export const OUTCOME = {
  GOAL: 'goal',
  GOAL_POST: 'goal_post', // in off the woodwork
  WIDE_LEFT: 'wide_left',
  WIDE_RIGHT: 'wide_right',
  SHORT: 'short',
  UNDER_BAR: 'under_bar',
  POST_OUT: 'post_out',
  BAR_OUT: 'bar_out',
};

export const isGoal = (outcome) => outcome === OUTCOME.GOAL || outcome === OUTCOME.GOAL_POST;

export function kickSpeed(power01) {
  const p = Math.min(Math.max(power01, 0), 1);
  return KICK_SPEED_MIN + (KICK_SPEED_MAX - KICK_SPEED_MIN) * p;
}

/**
 * @param {{yaw: number, elevation: number, power: number}} kick
 *   yaw in radians (0 = downfield, + = right), elevation in radians, power 0–1
 */
export function kickVelocity({ yaw, elevation, power }) {
  const speed = kickSpeed(power);
  const horiz = speed * Math.cos(elevation);
  return { x: horiz * Math.sin(yaw), y: speed * Math.sin(elevation), z: -horiz * Math.cos(yaw) };
}

// Earliest s ∈ [0, 1] where the 2-D segment a→a+d comes within r of point c.
function segmentCircle(ax, ay, dx, dy, cx, cy, r) {
  const fx = ax - cx;
  const fy = ay - cy;
  const a = dx * dx + dy * dy;
  const c = fx * fx + fy * fy - r * r;
  if (c <= 0) return 0; // already touching
  if (a < 1e-12) return null;
  const b = 2 * (fx * dx + fy * dy);
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const s = (-b - Math.sqrt(disc)) / (2 * a);
  return s >= 0 && s <= 1 ? s : null;
}

/** Swept ball vs uprights and crossbar for the step p0 → p1. */
export function findPostContact(p0, p1) {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const dz = p1.z - p0.z;
  let best = null;

  for (const side of [-1, 1]) {
    const cx = side * POST_HALF_WIDTH;
    const s = segmentCircle(p0.x, p0.z, dx, dz, cx, GOALPOST_Z, BALL_RADIUS + UPRIGHT_RADIUS);
    if (s === null) continue;
    const y = p0.y + dy * s;
    if (y < 0 || y > UPRIGHT_HEIGHT) continue;
    if (!best || s < best.s) {
      const x = p0.x + dx * s;
      const z = p0.z + dz * s;
      const len = Math.hypot(x - cx, z - GOALPOST_Z) || 1;
      best = { s, type: 'upright', side, point: { x, y, z }, normal: { x: (x - cx) / len, y: 0, z: (z - GOALPOST_Z) / len } };
    }
  }

  const s = segmentCircle(p0.y, p0.z, dy, dz, CROSSBAR_HEIGHT, GOALPOST_Z, BALL_RADIUS + CROSSBAR_RADIUS);
  if (s !== null) {
    const x = p0.x + dx * s;
    if (Math.abs(x) <= POST_HALF_WIDTH && (!best || s < best.s)) {
      const y = p0.y + dy * s;
      const z = p0.z + dz * s;
      const len = Math.hypot(y - CROSSBAR_HEIGHT, z - GOALPOST_Z) || 1;
      best = { s, type: 'crossbar', side: 0, point: { x, y, z }, normal: { x: 0, y: (y - CROSSBAR_HEIGHT) / len, z: (z - GOALPOST_Z) / len } };
    }
  }
  return best;
}

/** Reflect v about n with restitution on the normal part and friction on the rest. */
function bounce(v, n, restitution, friction) {
  const vn = v.x * n.x + v.y * n.y + v.z * n.z;
  if (vn >= 0) return false;
  const tx = v.x - vn * n.x;
  const ty = v.y - vn * n.y;
  const tz = v.z - vn * n.z;
  v.x = tx * friction - restitution * vn * n.x;
  v.y = ty * friction - restitution * vn * n.y;
  v.z = tz * friction - restitution * vn * n.z;
  return true;
}

export function classify({ crossing, events }) {
  if (crossing) {
    const hitBefore = events.some((e) => e.t <= crossing.t);
    if (Math.abs(crossing.x) < POST_HALF_WIDTH) {
      if (crossing.y > CROSSBAR_HEIGHT) return hitBefore ? OUTCOME.GOAL_POST : OUTCOME.GOAL;
      return OUTCOME.UNDER_BAR;
    }
    if (hitBefore) return OUTCOME.POST_OUT;
    return crossing.x < 0 ? OUTCOME.WIDE_LEFT : OUTCOME.WIDE_RIGHT;
  }
  if (events.length) return events[0].type === 'crossbar' ? OUTCOME.BAR_OUT : OUTCOME.POST_OUT;
  return OUTCOME.SHORT;
}

/**
 * Simulate a kick from the tee until the ball comes to rest (or maxTime).
 *
 * @param {{start: {x,y,z}, yaw: number, elevation: number, power: number}} kick
 * @param {{x: number, z: number}} wind  air velocity, m/s
 * @param {object} [opts]
 * @param {boolean} [opts.record=true]   keep per-step samples (for playback/preview)
 * @param {boolean} [opts.untilLanding=false]  stop at first ground contact
 * @param {number}  [opts.maxTime=8]
 * @param {number}  [opts.drag=DRAG_K]
 * @returns {{samples: {x,y,z}[]|null, crossing: {x,y,t}|null, landing: {x,y,z,t}|null,
 *            events: {type,side,t,point}[], outcome: string, duration: number}}
 */
export function simulate(kick, wind, opts = {}) {
  const { record = true, untilLanding = false, maxTime = 8, drag = DRAG_K } = opts;
  const p = { ...kick.start };
  const v = kickVelocity(kick);
  const samples = record ? [{ ...p }] : null;
  const events = [];
  let crossing = null;
  let landing = null;
  let t = 0;

  while (t < maxTime) {
    const rx = v.x - wind.x;
    const ry = v.y;
    const rz = v.z - wind.z;
    const rs = Math.hypot(rx, ry, rz);
    v.x -= drag * rs * rx * DT;
    v.y -= (GRAVITY + drag * rs * ry) * DT;
    v.z -= drag * rs * rz * DT;

    const p0 = { x: p.x, y: p.y, z: p.z };
    p.x += v.x * DT;
    p.y += v.y * DT;
    p.z += v.z * DT;
    t += DT;

    if (!landing) {
      const hit = findPostContact(p0, p);
      if (hit && bounce(v, hit.normal, POST_RESTITUTION, POST_FRICTION)) {
        p.x = hit.point.x + hit.normal.x * 1e-4;
        p.y = hit.point.y + hit.normal.y * 1e-4;
        p.z = hit.point.z + hit.normal.z * 1e-4;
        events.push({ type: hit.type, side: hit.side, t: t - DT + hit.s * DT, point: hit.point });
      }

      // Goal plane: the first downfield crossing before the ball touches the ground decides.
      if (!crossing && p0.z > GOALPOST_Z && p.z <= GOALPOST_Z) {
        const f = (p0.z - GOALPOST_Z) / (p0.z - p.z);
        crossing = { x: p0.x + (p.x - p0.x) * f, y: p0.y + (p.y - p0.y) * f, t: t - DT + f * DT };
      }
    }

    if (p.y <= BALL_RADIUS && v.y < 0) {
      p.y = BALL_RADIUS;
      if (!landing) {
        landing = { x: p.x, y: p.y, z: p.z, t };
        if (untilLanding) {
          if (samples) samples.push({ ...p });
          break;
        }
      }
      v.y = -v.y * GROUND_RESTITUTION;
      v.x *= GROUND_FRICTION;
      v.z *= GROUND_FRICTION;
      if (v.y < 0.8) v.y = 0; // settle into a roll
    } else if (landing && p.y <= BALL_RADIUS + 1e-6) {
      const decay = Math.max(0, 1 - 2.5 * DT); // rolling resistance
      v.x *= decay;
      v.z *= decay;
    }

    if (samples) samples.push({ ...p });
    if (landing && p.y <= BALL_RADIUS + 1e-6 && Math.hypot(v.x, v.z) < 0.2) break;
  }

  const result = { samples, crossing, landing, events, duration: t };
  result.outcome = classify(result);
  return result;
}
