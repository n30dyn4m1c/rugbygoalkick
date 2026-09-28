// ---------------------------------------------------------------------------
// Result copy and the one-line "why" — pure.
// ---------------------------------------------------------------------------
import { OUTCOME, simulate } from './simulate.js';
import { POST_HALF_WIDTH, CROSSBAR_HEIGHT, GOALPOST_Z } from '../config.js';

export const RESULT_COPY = {
  [OUTCOME.GOAL]: { title: 'Goal!', tone: 'good', points: 2 },
  [OUTCOME.GOAL_POST]: { title: 'In off the post!', tone: 'good', points: 2 },
  [OUTCOME.WIDE_LEFT]: { title: 'Wide left', tone: 'bad', points: 0 },
  [OUTCOME.WIDE_RIGHT]: { title: 'Wide right', tone: 'bad', points: 0 },
  [OUTCOME.SHORT]: { title: 'Short', tone: 'bad', points: 0 },
  [OUTCOME.UNDER_BAR]: { title: 'Under the bar', tone: 'bad', points: 0 },
  [OUTCOME.POST_OUT]: { title: 'Hit the post', tone: 'bad', points: 0 },
  [OUTCOME.BAR_OUT]: { title: 'Off the crossbar', tone: 'bad', points: 0 },
};

const m = (v) => `${Math.abs(v).toFixed(1)} m`;

/**
 * A short explanation of where the kick went and why.
 * @param {object} kick    the kick passed to simulate()
 * @param {object} wind
 * @param {object} result  simulate(kick, wind) result
 */
export function explain(kick, wind, result) {
  const reasons = [];
  const calm = simulate(kick, { x: 0, z: 0 }, { record: false, untilLanding: true });
  const windSpeed = Math.hypot(wind.x, wind.z);

  // Wind drift, measured where the ball crossed (or landed)
  const at = result.crossing ?? result.landing;
  const calmAt = calm.crossing ?? calm.landing;
  if (at && calmAt && windSpeed >= 0.5) {
    const drift = at.x - calmAt.x;
    if (Math.abs(drift) >= 0.3) reasons.push(`Wind carried it ${m(drift)} ${drift < 0 ? 'left' : 'right'}`);
  }

  const c = result.crossing;
  switch (result.outcome) {
    case OUTCOME.GOAL:
      reasons.unshift(`Cleared the bar by ${m(c.y - CROSSBAR_HEIGHT)}`);
      break;
    case OUTCOME.GOAL_POST:
      reasons.unshift('Hit the upright and went through');
      break;
    case OUTCOME.WIDE_LEFT:
    case OUTCOME.WIDE_RIGHT:
      reasons.unshift(`Missed by ${m(Math.abs(c.x) - POST_HALF_WIDTH)}`);
      break;
    case OUTCOME.UNDER_BAR:
      reasons.unshift(`${m(CROSSBAR_HEIGHT - c.y)} under the bar`);
      break;
    case OUTCOME.SHORT:
      if (result.landing) reasons.unshift(`Landed ${m(result.landing.z - GOALPOST_Z)} short of the posts`);
      break;
    case OUTCOME.POST_OUT:
      reasons.unshift('Bounced off the upright');
      break;
    case OUTCOME.BAR_OUT:
      reasons.unshift('Bounced off the crossbar');
      break;
  }
  return reasons.slice(0, 2).join(' · ');
}
