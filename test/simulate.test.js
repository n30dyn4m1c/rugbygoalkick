import { describe, it, expect } from 'vitest';
import { simulate, classify, findPostContact, kickVelocity, isGoal, OUTCOME, DT } from '../src/physics/simulate.js';
import { GOALPOST_Z, POST_HALF_WIDTH, CROSSBAR_HEIGHT } from '../src/config.js';

const D = Math.PI / 180;
const CALM = { x: 0, z: 0 };
const fast = { record: false, untilLanding: true };
const from = (x, dist) => ({ x, y: 0.3, z: GOALPOST_Z + dist });
const aimAt = (start, targetX) => Math.atan2(targetX - start.x, start.z - GOALPOST_Z);

// How many of 101 power settings score at an elevation, with the best aim within ±6°.
function makeablePowerSteps(start, wind, elevationDeg) {
  const base = aimAt(start, 0);
  let n = 0;
  for (let i = 0; i <= 100; i++) {
    for (let da = -6; da <= 6; da += 0.5) {
      const r = simulate({ start, yaw: base + da * D, elevation: elevationDeg * D, power: i / 100 }, wind, fast);
      if (isGoal(r.outcome)) {
        n++;
        break;
      }
    }
  }
  return n;
}

describe('difficulty targets', () => {
  it('a clean 35 m kick is comfortably makeable (wide power window)', () => {
    expect(makeablePowerSteps(from(0, 35), CALM, 38)).toBeGreaterThanOrEqual(35);
  });

  it('a 45 m wide-angle kick into a 7 m/s headwind is hard but possible', () => {
    const best = Math.max(...[35, 38, 42].map((e) => makeablePowerSteps(from(25, 45), { x: 0, z: 7 }, e)));
    expect(best).toBeGreaterThanOrEqual(1);
    expect(best).toBeLessThanOrEqual(12);
  });
});

describe('drag and wind', () => {
  const kick = { start: from(0, 40), yaw: 0, elevation: 38 * D, power: 0.8 };

  it('a crosswind pushes the ball the way the air is moving', () => {
    const calm = simulate(kick, CALM, fast).crossing.x;
    expect(simulate(kick, { x: 5, z: 0 }, fast).crossing.x).toBeGreaterThan(calm + 0.3);
    expect(simulate(kick, { x: -5, z: 0 }, fast).crossing.x).toBeLessThan(calm - 0.3);
  });

  it('wind matters more the longer the ball is in the air', () => {
    const wind = { x: 5, z: 0 };
    const low = { ...kick, elevation: 25 * D };
    const high = { ...kick, elevation: 50 * D };
    const drift = (k) => simulate(k, wind, fast).landing.x;
    expect(Math.abs(drift(high))).toBeGreaterThan(Math.abs(drift(low)));
  });

  it('a tailwind carries further than a headwind', () => {
    const range = (w) => GOALPOST_Z + 40 - simulate(kick, w, fast).landing.z;
    expect(range({ x: 0, z: -5 })).toBeGreaterThan(range(CALM));
    expect(range(CALM)).toBeGreaterThan(range({ x: 0, z: 5 }));
  });

  it('drag shortens the flight compared with a vacuum', () => {
    const vac = simulate(kick, CALM, { ...fast, drag: 0 }).landing.z;
    expect(simulate(kick, CALM, fast).landing.z).toBeGreaterThan(vac);
  });
});

describe('goal-plane crossing', () => {
  it('interpolates the crossing between physics steps', () => {
    const r = simulate({ start: from(0, 20), yaw: 0, elevation: 35 * D, power: 1 }, CALM, fast);
    expect(r.crossing).not.toBeNull();
    expect(r.crossing.t % DT).not.toBeCloseTo(0, 6);
  });

  it('is detected during flight, and a ball that lands first is short', () => {
    const r = simulate({ start: from(0, 40), yaw: 0, elevation: 38 * D, power: 0.1 }, CALM, fast);
    expect(r.crossing).toBeNull();
    expect(r.outcome).toBe(OUTCOME.SHORT);
  });

  it('is deterministic', () => {
    const k = { start: from(12, 30), yaw: -0.3, elevation: 40 * D, power: 0.7 };
    expect(simulate(k, { x: 2, z: -1 })).toEqual(simulate(k, { x: 2, z: -1 }));
  });
});

describe('uprights and crossbar', () => {
  it('detects a swept hit on an upright', () => {
    const hit = findPostContact({ x: POST_HALF_WIDTH, y: 5, z: GOALPOST_Z + 0.5 }, { x: POST_HALF_WIDTH, y: 5, z: GOALPOST_Z - 0.5 });
    expect(hit.type).toBe('upright');
    expect(hit.side).toBe(1);
  });

  it('detects a swept hit on the crossbar', () => {
    const hit = findPostContact({ x: 0, y: CROSSBAR_HEIGHT, z: GOALPOST_Z + 0.5 }, { x: 0, y: CROSSBAR_HEIGHT, z: GOALPOST_Z - 0.5 });
    expect(hit.type).toBe('crossbar');
  });

  it('ignores the upright above its top (the extended post line still scores)', () => {
    expect(findPostContact({ x: POST_HALF_WIDTH, y: 17, z: GOALPOST_Z + 0.5 }, { x: POST_HALF_WIDTH, y: 17, z: GOALPOST_Z - 0.5 })).toBeNull();
  });

  it('a kick at the upright can bounce in or out', () => {
    const seen = new Set();
    const start = from(0, 25);
    for (let x = 2.5; x <= 3.0; x += 0.01) {
      for (const power of [0.5, 0.6, 0.7, 0.8]) {
        const r = simulate({ start, yaw: aimAt(start, x), elevation: 38 * D, power }, CALM, { record: false });
        if (r.events.length) seen.add(r.outcome);
      }
    }
    expect(seen.has(OUTCOME.GOAL_POST)).toBe(true);
    expect(seen.has(OUTCOME.POST_OUT)).toBe(true);
  });

  it('a kick into the crossbar registers a bar hit', () => {
    const start = from(0, 20);
    let found = false;
    for (let p = 0.2; p <= 0.6 && !found; p += 0.005) {
      const r = simulate({ start, yaw: 0, elevation: 30 * D, power: p }, CALM, { record: false });
      if (r.events.some((e) => e.type === 'crossbar')) found = true;
    }
    expect(found).toBe(true);
  });

  it('the ball keeps moving after a hit (it does not pass through the post)', () => {
    const start = from(POST_HALF_WIDTH, 20);
    const r = simulate({ start, yaw: 0, elevation: 30 * D, power: 0.9 }, CALM, { record: false });
    expect(r.events[0]?.type).toBe('upright');
    expect([OUTCOME.POST_OUT, OUTCOME.GOAL_POST]).toContain(r.outcome);
  });
});

describe('league post width (5.5 m)', () => {
  it('uses a 5.5 m gap', () => {
    expect(POST_HALF_WIDTH).toBe(2.75);
  });

  it.each([[0, OUTCOME.GOAL], [2.7, OUTCOME.GOAL], [-2.7, OUTCOME.GOAL], [2.8, OUTCOME.WIDE_RIGHT], [-2.8, OUTCOME.WIDE_LEFT], [5.5, OUTCOME.WIDE_RIGHT]])(
    'crossing at x = %s → %s (5.5 m used to be a goal with the old 11.2 m posts)',
    (x, outcome) => {
      expect(classify({ crossing: { x, y: 5, t: 1 }, events: [] })).toBe(outcome);
    },
  );

  it('a full kick through the middle scores and one aimed 4 m wide misses', () => {
    const start = from(0, 25);
    const k = (x) => simulate({ start, yaw: aimAt(start, x), elevation: 38 * D, power: 0.8 }, CALM, fast).outcome;
    expect(k(0)).toBe(OUTCOME.GOAL);
    expect(k(4)).toBe(OUTCOME.WIDE_RIGHT);
  });
});

describe('classify', () => {
  const c = (x, y, t = 1) => ({ x, y, t });
  it.each([
    [c(0, 5), [], OUTCOME.GOAL],
    [c(2.7, 5), [{ t: 0.9, type: 'upright' }], OUTCOME.GOAL_POST],
    [c(-3, 5), [], OUTCOME.WIDE_LEFT],
    [c(3, 5), [], OUTCOME.WIDE_RIGHT],
    [c(0, 2), [], OUTCOME.UNDER_BAR],
    [c(3, 5), [{ t: 0.9, type: 'upright' }], OUTCOME.POST_OUT],
    [null, [{ t: 0.9, type: 'upright' }], OUTCOME.POST_OUT],
    [null, [{ t: 0.9, type: 'crossbar' }], OUTCOME.BAR_OUT],
    [null, [], OUTCOME.SHORT],
  ])('crossing %o, events %o → %s', (crossing, events, outcome) => {
    expect(classify({ crossing, events })).toBe(outcome);
  });
});

describe('kick velocity', () => {
  it('honours yaw, elevation and power', () => {
    const v = kickVelocity({ yaw: 0.2, elevation: 40 * D, power: 1 });
    expect(v.x).toBeGreaterThan(0);
    expect(v.z).toBeLessThan(0);
    expect(Math.atan2(v.y, Math.hypot(v.x, v.z))).toBeCloseTo(40 * D);
  });
});
