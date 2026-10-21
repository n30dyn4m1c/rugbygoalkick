import { describe, it, expect } from 'vitest';
import { generateRound, generatePressureRound, applyDifficulty } from '../src/game/round.js';
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
        expect(Math.abs(r.tryX)).toBeLessThanOrEqual(10 + diff * 21 + 1e-9);
        expect(Math.abs(r.tryX)).toBeLessThan(34); // inside the field
        expect([1, 2, 3]).toContain(r.previewTier);
        expect(r.windSpeed).toBeGreaterThanOrEqual(1 + diff * 4 - 1e-9);
        expect(r.windSpeed).toBeLessThanOrEqual(2 + diff * 7 + 1e-9);
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
  it('shortens the preview and speeds up the meter as rounds go on', () => {
    const r = match(5);
    expect(r[0].previewTier).toBe(3);
    expect(r[9].previewTier).toBeLessThan(r[0].previewTier);
    expect(r[9].meterPeriod).toBeLessThan(r[0].meterPeriod);
  });

  it('peaks hardest on the last rounds', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const r = match(seed);
      expect(r[9].windSpeed).toBeGreaterThanOrEqual(5 - 1e-9); // 5–9 m/s climax
      expect(r[9].meterPeriod).toBeLessThan(1.0);
      expect(Math.abs(r[9].tryX)).toBeGreaterThanOrEqual(21.7 - 1e-9); // ≥ 70% of max width at diff 1
    }
  });
});

describe('difficulty setting', () => {
  const withDifficulty = (seed, difficulty) => {
    const rng = createRng(seed);
    return Array.from({ length: 10 }, (_, i) => generateRound(i + 1, 10, rng, difficulty));
  };

  it('surely softens easy and steepens hard, round by round', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const easy = withDifficulty(seed, 'easy');
      const normal = match(seed);
      const hard = withDifficulty(seed, 'hard');
      for (let i = 0; i < 10; i++) {
        expect(easy[i].windSpeed).toBeLessThanOrEqual(normal[i].windSpeed);
        expect(normal[i].windSpeed).toBeLessThanOrEqual(hard[i].windSpeed);
        expect(Math.abs(easy[i].tryX)).toBeLessThanOrEqual(Math.abs(normal[i].tryX));
        expect(Math.abs(normal[i].tryX)).toBeLessThanOrEqual(Math.abs(hard[i].tryX));
        expect(easy[i].meterPeriod).toBeGreaterThanOrEqual(normal[i].meterPeriod);
        expect(normal[i].meterPeriod).toBeGreaterThanOrEqual(hard[i].meterPeriod);
      }
    }
  });

  it('hard ends at the 1.25 difficulty ceiling with a readable meter', () => {
    const r = withDifficulty(7, 'hard');
    expect(r[9].difficulty).toBe(1.25);
    expect(r[0].difficulty).toBe(0);
    expect(r[9].meterPeriod).toBe(0.8); // floored, never unreadably fast
    expect(r[9].previewTier).toBe(1);
  });

  it('easy keeps a longer preview at the climax', () => {
    const r = withDifficulty(7, 'easy');
    expect(r[9].difficulty).toBeCloseTo(0.6);
    expect(r[9].previewTier).toBe(2);
  });

  it('pressure respects the setting too', () => {
    const late = (k, difficulty) => generatePressureRound(k, createRng(3), difficulty).windSpeed;
    expect(late(12, 'easy')).toBeLessThanOrEqual(late(12, 'normal'));
    expect(late(12, 'normal')).toBeLessThanOrEqual(late(12, 'hard'));
  });

  it('applyDifficulty caps at 1.25 and falls back to normal', () => {
    expect(applyDifficulty(1, 'hard')).toBe(1.25);
    expect(applyDifficulty(1, 'easy')).toBe(0.6);
    expect(applyDifficulty(1)).toBe(1);
    expect(applyDifficulty(1, undefined)).toBe(1);
    expect(applyDifficulty(1, 'bogus')).toBe(1);
  });
});
