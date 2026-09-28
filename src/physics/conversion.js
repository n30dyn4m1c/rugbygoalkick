// ---------------------------------------------------------------------------
// Conversion geometry — pure.
//
// A conversion is taken on the line through the grounding point,
// perpendicular to the goal line, at a distance the kicker chooses.
// Stepping back widens the angle to the posts for tries away from centre.
// ---------------------------------------------------------------------------
import { GOALPOST_Z, POST_HALF_WIDTH, TEE_DIST_MIN, TEE_DIST_MAX, MAX_AIM_YAW } from '../config.js';

/** Angle (radians) the gap between the uprights subtends from (x, dist out). */
export function postAngle(x, dist) {
  const a = Math.atan2(x + POST_HALF_WIDTH, dist);
  const b = Math.atan2(x - POST_HALF_WIDTH, dist);
  return Math.abs(a - b);
}

/** Distance (m) at which postAngle is largest for a try at lateral offset x. */
export function bestAngleDistance(x) {
  const d = Math.abs(x);
  return d > POST_HALF_WIDTH ? Math.sqrt(d * d - POST_HALF_WIDTH * POST_HALF_WIDTH) : 0;
}

/**
 * Suggested tee distance: the closest spot that keeps at least `keep` of the
 * best available angle. The angle curve is flat near its peak, so this trades
 * a sliver of angle for a much shorter kick. Never closer than `minDist`,
 * which leaves room for the ball to climb over the crossbar.
 */
export function suggestedTeeDistance(x, { keep = 0.92, minDist = 12 } = {}) {
  const peak = Math.max(bestAngleDistance(x), TEE_DIST_MIN);
  const best = postAngle(x, peak);
  let dist = TEE_DIST_MIN;
  while (dist < peak && postAngle(x, dist) < best * keep) dist += 0.5;
  return clampTeeDistance(Math.max(dist, minDist));
}

export function clampTeeDistance(dist) {
  return Math.min(Math.max(dist, TEE_DIST_MIN), TEE_DIST_MAX);
}

export function teePosition(tryX, dist, ballHeight) {
  return { x: tryX, y: ballHeight, z: GOALPOST_Z + dist };
}

/** Yaw (0 = downfield, + = right) from (x, z) to the centre of the posts. */
export function yawToPosts(x, z) {
  return Math.atan2(0 - x, z - GOALPOST_Z);
}

/** Keep the aim in front of the kicker. */
export function clampYaw(yaw) {
  return Math.min(Math.max(yaw, -MAX_AIM_YAW), MAX_AIM_YAW);
}
