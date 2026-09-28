// ---------------------------------------------------------------------------
// Ball flight — pure functions, plain {x, y, z} objects, no three.js / DOM.
// ---------------------------------------------------------------------------
import { GRAVITY, BALL_GROUND_Y } from '../config.js';

/** Launch velocity for a kick. aimAngle is a yaw where π points down -Z. */
export function launchVelocity(power01, aimAngle, maxSpeed, kickAngle) {
  const speed = maxSpeed * Math.max(power01, 0.1);
  return {
    x: speed * Math.cos(kickAngle) * Math.sin(aimAngle),
    y: speed * Math.sin(kickAngle),
    z: speed * Math.cos(kickAngle) * Math.cos(aimAngle),
  };
}

/** Analytic position at time t (wind applied as a constant acceleration). */
export function positionAt(start, vel, wind, t, gravity = GRAVITY) {
  return {
    x: start.x + vel.x * t + 0.5 * wind.x * t * t,
    y: start.y + vel.y * t - 0.5 * gravity * t * t,
    z: start.z + vel.z * t + 0.5 * wind.z * t * t,
  };
}

export function hasLanded(pos, t) {
  return pos.y <= BALL_GROUND_Y && t > 0.2;
}
