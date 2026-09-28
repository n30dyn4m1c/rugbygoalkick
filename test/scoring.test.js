import { describe, it, expect } from 'vitest';
import { judgeKick, goalPlaneTime, OUTCOME } from '../src/physics/scoring.js';
import { GOALPOST_Z, POST_HALF_WIDTH, POST_GAP } from '../src/config.js';

const NO_WIND = { x: 0, z: 0 };

// Start 10 m out, 10 m/s downfield → reaches the goal plane at t = 1 s.
function kickCrossingAt(x, vy, { wind = NO_WIND, landingTime = 10 } = {}) {
  const start = { x: 0, y: 0.3, z: GOALPOST_Z + 10 };
  const vel = { x, y: vy, z: -10 };
  return judgeKick({ start, vel, wind, landingTime });
}

describe('goal plane crossing', () => {
  it('finds the crossing time without wind', () => {
    expect(goalPlaneTime({ x: 0, y: 0, z: GOALPOST_Z + 30 }, { x: 0, y: 0, z: -10 }, NO_WIND)).toBeCloseTo(3);
  });

  it('returns null for a ball moving away from the posts', () => {
    expect(goalPlaneTime({ x: 0, y: 0, z: GOALPOST_Z + 30 }, { x: 0, y: 0, z: 10 }, NO_WIND)).toBeNull();
  });

  it('reports the crossing point', () => {
    const r = kickCrossingAt(1, 10);
    expect(r.crossing.t).toBeCloseTo(1);
    expect(r.crossing.x).toBeCloseTo(1);
    expect(r.crossing.y).toBeCloseTo(0.3 + 10 - 4.9);
  });
});

describe('league post width (5.5 m)', () => {
  it('uses a 5.5 m gap', () => {
    expect(POST_GAP).toBe(5.5);
    expect(POST_HALF_WIDTH).toBe(2.75);
  });

  it.each([0, 2.7, -2.7])('x = %s at the plane is a goal', (x) => {
    expect(kickCrossingAt(x, 10).outcome).toBe(OUTCOME.GOAL);
  });

  it.each([2.8, -2.8, 5.5])('x = %s at the plane is wide (was a goal with 11.2 m posts)', (x) => {
    expect(kickCrossingAt(x, 10).outcome).toBe(OUTCOME.WIDE);
  });
});

describe('crossbar and short kicks', () => {
  it('between the posts but under 3 m is under the bar', () => {
    expect(kickCrossingAt(0, 6).outcome).toBe(OUTCOME.LOW); // y ≈ 1.4 m
  });

  it('a ball that lands before the plane is short', () => {
    expect(kickCrossingAt(0, 10, { landingTime: 0.9 }).outcome).toBe(OUTCOME.SHORT);
  });

  it('landing just short of the goal line is short, not "too low" (regression)', () => {
    // Old code only called a kick short if it landed > 1 m in front of the line.
    const start = { x: 0, y: 0.3, z: GOALPOST_Z + 10.5 };
    const vel = { x: 0, y: 4.9, z: -10 }; // lands at t ≈ 1.0 s, 0.5 m short
    expect(judgeKick({ start, vel, wind: NO_WIND, landingTime: 1.0 }).outcome).toBe(OUTCOME.SHORT);
  });
});

describe('wind', () => {
  it('a crosswind blowing to +X carries a centred kick right', () => {
    const r = kickCrossingAt(0, 10, { wind: { x: 8, z: 0 } });
    expect(r.crossing.x).toBeGreaterThan(0);
    expect(r.outcome).toBe(OUTCOME.WIDE);
  });

  it('a crosswind blowing to -X carries it left', () => {
    expect(kickCrossingAt(0, 10, { wind: { x: -8, z: 0 } }).crossing.x).toBeLessThan(0);
  });

  it('a headwind delays the crossing', () => {
    const calm = kickCrossingAt(0, 10).crossing.t;
    const head = kickCrossingAt(0, 10, { wind: { x: 0, z: 2 } }).crossing.t;
    expect(head).toBeGreaterThan(calm);
  });
});
