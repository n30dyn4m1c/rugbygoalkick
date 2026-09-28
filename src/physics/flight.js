// ---------------------------------------------------------------------------
// Ball flight — pure functions, plain {x, y, z} objects, no three.js / DOM.
//
// Aim is a yaw angle: 0 = straight downfield (-Z), positive = to the kicker's
// right (+X). Always within (-π/2, π/2), so there is no angle wrap-around.
// ---------------------------------------------------------------------------
import { GRAVITY, BALL_GROUND_Y, GOALPOST_Z } from '../config.js';

export function launchVelocity(power01, yaw, maxSpeed, kickAngle) {
  const speed = maxSpeed * Math.max(power01, 0.1);
  const horiz = speed * Math.cos(kickAngle);
  return {
    x: horiz * Math.sin(yaw),
    y: speed * Math.sin(kickAngle),
    z: -horiz * Math.cos(yaw),
  };
}

/** Yaw from (x, z) that points at the centre of the posts. */
export function yawToPosts(x, z) {
  return Math.atan2(0 - x, z - GOALPOST_Z);
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
