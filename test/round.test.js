import { describe, it, expect } from 'vitest';
import { generateRound } from '../src/game/round.js';
import { createRng, hashSeed } from '../src/core/rng.js';

const match = (seed) => {
  const rng = createRng(seed);
  return Array.from({ length: 10 }, (_, i) => generateRound(i + 1, 10, rng));
};

describe('seeded round generator', () => {
  it('is reproducible for a seed', () => {
    expect(match(42)).toEqual(match(42));
  });

  it('differs between seeds', () => {
    expect(match(42)).not.toEqual(match(43));
  });

  it('keeps tries and wind within the difficulty envelope', () => {
    for (let seed = 1; seed <= 200; seed++) {
      match(seed).forEach((r, i) => {
        const diff = i / 9;
        expect(Math.abs(r.tryX)).toBeLessThanOrEqual(10 + diff * 20 + 1e-9);
        expect(r.kickX).toBe(r.tryX); // conversion line
        expect(r.windSpeed).toBeGreaterThanOrEqual(diff * 3 - 1e-9);
        expect(r.windSpeed).toBeLessThanOrEqual(2 + diff * 6 + 1e-9);
        expect(Math.hypot(r.wind.x, r.wind.z)).toBeCloseTo(r.windSpeed);
      });
    }
  });
});

describe('rng', () => {
  it('stays in [0, 1)', () => {
    const rng = createRng(7);
    for (let i = 0; i < 10000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('hashes strings stably', () => {
    expect(hashSeed('2026-09-28')).toBe(hashSeed('2026-09-28'));
    expect(hashSeed('2026-09-28')).not.toBe(hashSeed('2026-09-29'));
  });
});
