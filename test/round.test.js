import { describe, it, expect } from 'vitest';
import {
  generateRound, generatePressureRound, matchDifficulty, difficultyEnvelope, applyDifficulty,
} from '../src/game/round.js';
import { createRng, hashSeed } from '../src/core/rng.js';

const match = (seed) => {
  const rng = createRng(seed);
  return Array.from({ length: 10 }, (_, i) => generateRound(i + 1, 10, rng));
};

const withDifficulty = (seed, difficulty) => {
  const rng = createRng(seed);
  return Array.from({ length: 10 }, (_, i) => generateRound(i + 1, 10, rng, difficulty));
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
        const diff = matchDifficulty(i + 1, 10);
        expect(r.difficulty).toBeCloseTo(diff, 9);
        expect(Math.abs(r.tryX)).toBeLessThanOrEqual(difficultyEnvelope(diff).maxTryWidth + 1e-9);
        expect(Math.abs(r.tryX)).toBeLessThan(34); // inside the field
        expect([0, 1, 2, 3]).toContain(r.previewTier);
        expect(r.windSpeed).toBeGreaterThanOrEqual(difficultyEnvelope(diff).minWind - 1e-9);
        expect(r.windSpeed).toBeLessThanOrEqual(difficultyEnvelope(diff).maxWind + 1e-9);
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

describe('difficulty setting', () => {
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

  it('hard caps the eased curve at 1.2 with a readable meter and no preview', () => {
    const r = withDifficulty(7, 'hard');
    expect(r[9].difficulty).toBe(1.2);
    expect(r[0].difficulty).toBe(0);
    expect(r[9].meterPeriod).toBe(0.8); // floored, never unreadably fast
    expect(r[9].previewTier).toBe(0); // the hardest rounds play on pure aim
    expect(r[9].windSpeed).toBeLessThanOrEqual(difficultyEnvelope(1.2).maxWind + 1e-9);
  });

  it('easy keeps a present preview at the climax', () => {
    const r = withDifficulty(7, 'easy');
    expect(r[9].difficulty).toBeCloseTo(0.55);
    expect(r[9].previewTier).toBeGreaterThanOrEqual(1);
    expect(r[9].meterPeriod).toBeGreaterThan(1);
  });

  it('pressure respects the setting too', () => {
    const late = (k, difficulty) => generatePressureRound(k, createRng(3), difficulty).windSpeed;
    expect(late(12, 'easy')).toBeLessThanOrEqual(late(12, 'normal'));
    expect(late(12, 'normal')).toBeLessThanOrEqual(late(12, 'hard'));
  });

  it('applyDifficulty caps at the ceiling and falls back to normal', () => {
    expect(applyDifficulty(1, 'hard')).toBe(1.2);
    expect(applyDifficulty(1, 'easy')).toBeCloseTo(0.55);
    expect(applyDifficulty(1)).toBe(1);
    expect(applyDifficulty(1, undefined)).toBe(1);
    expect(applyDifficulty(1, 'bogus')).toBe(1);
    expect(applyDifficulty(-3, 'hard')).toBe(0);
  });
});
