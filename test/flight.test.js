import { describe, it, expect } from 'vitest';
import { launchVelocity, yawToPosts, positionAt } from '../src/physics/flight.js';
import { GOALPOST_Z, MAX_AIM_OFFSET, MAX_AIM_YAW, MAX_SPEED, KICK_ANGLE_RAD } from '../src/config.js';

describe('aim yaw convention', () => {
  it('yaw 0 kicks straight downfield', () => {
    const v = launchVelocity(1, 0, MAX_SPEED, KICK_ANGLE_RAD);
    expect(v.x).toBeCloseTo(0);
    expect(v.z).toBeLessThan(0);
  });

  it('positive yaw goes to the kicker\'s right (+X)', () => {
    expect(launchVelocity(1, 0.2, MAX_SPEED, KICK_ANGLE_RAD).x).toBeGreaterThan(0);
  });

  it('points at the posts from either side', () => {
    expect(yawToPosts(10, GOALPOST_Z + 20)).toBeLessThan(0);
    expect(yawToPosts(-10, GOALPOST_Z + 20)).toBeGreaterThan(0);
    expect(yawToPosts(0, GOALPOST_Z + 20)).toBeCloseTo(0);
  });
});

describe('aim clamp regression (tries right of centre)', () => {
  // The old code clamped a +π start angle against a negative atan2 result,
  // snapping the aim 60° off and, for wide tries, kicking away from the posts.
  const clampYaw = (yaw, autoAim) => {
    const y = Math.max(autoAim - MAX_AIM_OFFSET, Math.min(autoAim + MAX_AIM_OFFSET, yaw));
    return Math.max(-MAX_AIM_YAW, Math.min(MAX_AIM_YAW, y));
  };

  it.each([[10, 16.5], [25, 12], [0.5, 16.5], [-10, 16.5], [30, 5]])(
    'try x=%s, %s m out: the start aim stays within 60° of the posts and heads downfield',
    (x, out) => {
      const autoAim = yawToPosts(x, GOALPOST_Z + out);
      const yaw = clampYaw(0, autoAim);
      expect(Math.abs(yaw - autoAim)).toBeLessThanOrEqual(MAX_AIM_OFFSET + 1e-9);
      // Straight ahead is kept whenever it is inside the window.
      if (Math.abs(autoAim) <= MAX_AIM_OFFSET) expect(yaw).toBe(0);
      expect(launchVelocity(0.8, yaw, MAX_SPEED, KICK_ANGLE_RAD).z).toBeLessThan(0);
    },
  );

  it('holding an arrow to the limit never aims behind the kicker', () => {
    const autoAim = yawToPosts(30, GOALPOST_Z + 5); // very wide, very close
    for (const yaw of [clampYaw(10, autoAim), clampYaw(-10, autoAim)]) {
      expect(launchVelocity(1, yaw, MAX_SPEED, KICK_ANGLE_RAD).z).toBeLessThan(0);
    }
  });
});

describe('positionAt', () => {
  it('falls under gravity', () => {
    const p = positionAt({ x: 0, y: 10, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, z: 0 }, 1);
    expect(p.y).toBeCloseTo(10 - 4.9);
  });
});
