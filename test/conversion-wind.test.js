import { describe, it, expect } from 'vitest';
import { postAngle, bestAngleDistance, suggestedTeeDistance, yawToPosts, clampYaw } from '../src/physics/conversion.js';
import { kickVelocity } from '../src/physics/simulate.js';
import { describeWind, windLevel, windComponents } from '../src/physics/wind.js';
import { explain } from '../src/physics/explain.js';
import { simulate } from '../src/physics/simulate.js';
import { GOALPOST_Z, TEE_DIST_MIN, TEE_DIST_MAX } from '../src/config.js';

describe('conversion geometry', () => {
  it('the angle to the posts peaks at sqrt(x² − 2.75²)', () => {
    const x = 20;
    const d = bestAngleDistance(x);
    expect(postAngle(x, d)).toBeGreaterThan(postAngle(x, d - 2));
    expect(postAngle(x, d)).toBeGreaterThan(postAngle(x, d + 2));
  });

  it('stepping back widens the angle for a wide try', () => {
    expect(postAngle(25, 15)).toBeGreaterThan(postAngle(25, 6));
  });

  it('suggests a tee inside the allowed range, further back for wider tries', () => {
    for (let x = 0; x <= 34; x += 1) {
      const d = suggestedTeeDistance(x);
      expect(d).toBeGreaterThanOrEqual(TEE_DIST_MIN);
      expect(d).toBeLessThanOrEqual(TEE_DIST_MAX);
    }
    expect(suggestedTeeDistance(30)).toBeGreaterThan(suggestedTeeDistance(5));
  });

  it('keeps most of the best angle at the suggested spot', () => {
    const x = 28;
    expect(postAngle(x, suggestedTeeDistance(x))).toBeGreaterThanOrEqual(0.9 * postAngle(x, bestAngleDistance(x)));
  });
});

describe('aim yaw (regression: old aim wrapped around and kicked backwards)', () => {
  it('points at the posts from either side without wrapping', () => {
    expect(yawToPosts(10, GOALPOST_Z + 16)).toBeLessThan(0);
    expect(yawToPosts(-10, GOALPOST_Z + 16)).toBeGreaterThan(0);
    for (let x = -33; x <= 33; x += 3) {
      for (const d of [5, 12, 30, 45]) {
        const yaw = yawToPosts(x, GOALPOST_Z + d);
        expect(Math.abs(yaw)).toBeLessThan(Math.PI / 2);
        expect(kickVelocity({ yaw, elevation: 0.6, power: 0.5 }).z).toBeLessThan(0);
      }
    }
  });

  it('clamping keeps any requested aim in front of the kicker', () => {
    for (const yaw of [-10, -2, 2, 10]) {
      expect(kickVelocity({ yaw: clampYaw(yaw), elevation: 0.6, power: 1 }).z).toBeLessThan(0);
    }
  });
});

describe('wind from the kicker\'s view', () => {
  it('air moving to −X is a crosswind right to left', () => {
    const w = describeWind({ x: -4, z: 0 }, 0);
    expect(w.label).toBe('Crosswind, right to left, 4 m/s');
    expect(w.arrowDeg).toBeCloseTo(-90);
  });

  it('air moving toward the kicker (+Z) is a headwind', () => {
    const w = describeWind({ x: 0, z: 3 }, 0);
    expect(w.label).toBe('Headwind, 3 m/s');
    expect(Math.abs(w.arrowDeg)).toBeCloseTo(180);
  });

  it('air moving downfield is a tailwind with the arrow pointing at the posts', () => {
    const w = describeWind({ x: 0, z: -5 }, 0);
    expect(w.label).toBe('Tailwind, 5 m/s');
    expect(w.arrowDeg).toBeCloseTo(0);
  });

  it('describes diagonals', () => {
    expect(describeWind({ x: 3, z: 3 }, 0).label).toBe('Head-crosswind, left to right, 4 m/s');
  });

  it('is relative to the kicker\'s facing', () => {
    // Facing 90° right, air moving to +X is behind the kicker.
    expect(windComponents({ x: 4, z: 0 }, Math.PI / 2).along).toBeCloseTo(4);
  });

  it('grades strength in words, not just colour', () => {
    expect(windLevel(0.2)).toBe(0);
    expect(windLevel(9)).toBe(5);
    expect(describeWind({ x: 0, z: 0 }, 0).levelWord).toBe('Calm');
  });
});

describe('explain', () => {
  it('reports wind drift in the right direction', () => {
    const kick = { start: { x: 0, y: 0.3, z: GOALPOST_Z + 35 }, yaw: 0, elevation: 0.66, power: 0.8 };
    const wind = { x: -5, z: 0 };
    const r = simulate(kick, wind, { record: false });
    expect(explain(kick, wind, r)).toMatch(/Wind carried it \d+\.\d m left/);
  });
});
