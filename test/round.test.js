import { describe, it, expect } from 'vitest';
import { generateRound, matchDifficulty, difficultyEnvelope } from '../src/game/round.js';
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
        const env = difficultyEnvelope(matchDifficulty(i + 1, 10));
        expect(Math.abs(r.tryX)).toBeLessThanOrEqual(env.maxTryWidth + 1e-9);
        expect(Math.abs(r.tryX)).toBeLessThan(34); // inside the field
        expect([0, 1, 2, 3]).toContain(r.previewTier);
        expect(r.windSpeed).toBeGreaterThanOrEqual(env.minWind - 1e-9);
        expect(r.windSpeed).toBeLessThanOrEqual(env.maxWind + 1e-9);
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

describe('match progression', () => {
  it('opens gently: full preview, light wind and near-central tries for three kicks', () => {
    for (let seed = 1; seed <= 100; seed++) {
      match(seed).slice(0, 3).forEach((r) => {
        expect(r.previewTier).toBe(3);
        expect(r.windSpeed).toBeLessThan(3.5);
        expect(Math.abs(r.tryX)).toBeLessThan(13);
      });
    }
  });

  it('finishes hard: no preview, strong wind, wide tries for the last three kicks', () => {
    for (let seed = 1; seed <= 100; seed++) {
      match(seed).slice(7).forEach((r) => {
        expect(r.previewTier).toBe(0);
        expect(r.windSpeed).toBeGreaterThan(2.5);
        expect(Math.abs(r.tryX)).toBeGreaterThan(10);
      });
    }
  });

  it('only ever gets harder', () => {
    for (let k = 2; k <= 10; k++) expect(matchDifficulty(k, 10)).toBeGreaterThan(matchDifficulty(k - 1, 10));
    expect(matchDifficulty(1, 10)).toBe(0);
    expect(matchDifficulty(10, 10)).toBe(1);
  });

  it('shortens the preview and speeds up the meter as rounds go on', () => {
    const r = match(5);
    expect(r[0].previewTier).toBe(3);
    expect(r[9].previewTier).toBeLessThan(r[0].previewTier);
    expect(r[9].meterPeriod).toBeLessThan(r[0].meterPeriod);
  });
});
