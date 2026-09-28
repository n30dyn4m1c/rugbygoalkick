import { describe, it, expect } from 'vitest';
import { MODES, todayKey } from '../src/modes/modes.js';
import { generatePracticeRound, pressurePreviewTier, pressureShotClock, PRACTICE_WIND_DIRS } from '../src/game/round.js';
import { describeWind } from '../src/physics/wind.js';
import { yawToPosts, suggestedTeeDistance } from '../src/physics/conversion.js';
import { createRng, hashSeed } from '../src/core/rng.js';
import { GOALPOST_Z } from '../src/config.js';

const log = (...scored) => scored.map((s) => ({ scored: s }));

describe('match / daily', () => {
  it('last ten kicks', () => {
    expect(MODES.match.rounds).toBe(10);
    expect(MODES.match.ends({ round: 9 })).toBe(false);
    expect(MODES.match.ends({ round: 10 })).toBe(true);
  });

  it('daily gives everyone the same ten kicks on a given date', () => {
    const play = () => {
      const rng = createRng(hashSeed(`daily:${todayKey(new Date(2026, 8, 28))}`));
      return Array.from({ length: 10 }, (_, i) => MODES.daily.round(i + 1, { rng }));
    };
    expect(play()).toEqual(play());
  });

  it('formats the date key', () => {
    expect(todayKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('pressure', () => {
  it('continues while you score and ends at the first miss', () => {
    expect(MODES.pressure.ends({ log: log(true, true) })).toBe(false);
    expect(MODES.pressure.ends({ log: log(true, true, false) })).toBe(true);
    expect(MODES.pressure.ends({ log: [] })).toBe(false);
  });

  it('shortens the preview to nothing and tightens the shot clock', () => {
    expect(pressurePreviewTier(1)).toBe(2);
    expect(pressurePreviewTier(5)).toBe(1);
    expect(pressurePreviewTier(12)).toBe(0);
    expect(pressureShotClock(1)).toBeGreaterThan(pressureShotClock(6));
    expect(pressureShotClock(50)).toBe(12); // floor
  });

  it('gets harder with every kick', () => {
    const rng = createRng(3);
    const early = Array.from({ length: 40 }, () => MODES.pressure.round(1, { rng }).windSpeed);
    const late = Array.from({ length: 40 }, () => MODES.pressure.round(14, { rng }).windSpeed);
    const avg = (a) => a.reduce((x, y) => x + y) / a.length;
    expect(avg(late)).toBeGreaterThan(avg(early) + 2);
  });

  it('has a shot clock; other modes do not', () => {
    const r = MODES.pressure.round(1, { rng: createRng(1) });
    expect(MODES.pressure.shotClock(1, r)).toBeGreaterThan(0);
    expect(MODES.match.shotClock(1, r)).toBeNull();
  });
});

describe('practice', () => {
  it('never ends and uses the chosen try spot and preview', () => {
    expect(MODES.practice.ends()).toBe(false);
    const r = generatePracticeRound({ tryX: -20, windSpeed: 0, windDir: 'random', previewTier: 1 }, createRng(1));
    expect(r.tryX).toBe(-20);
    expect(r.previewTier).toBe(1);
    expect(r.windSpeed).toBe(0);
  });

  it.each([
    ['tail', 'Tailwind'],
    ['head', 'Headwind'],
    ['ltr', 'Crosswind, left to right'],
    ['rtl', 'Crosswind, right to left'],
    ['headLtr', 'Head-crosswind, left to right'],
    ['tailRtl', 'Tail-crosswind, right to left'],
  ])('wind %s is described from the kicker as "%s"', (dir, words) => {
    const tryX = 15;
    const r = generatePracticeRound({ tryX, windSpeed: 4, windDir: dir, previewTier: 3 }, createRng(1));
    const facing = yawToPosts(tryX, GOALPOST_Z + suggestedTeeDistance(tryX));
    expect(describeWind(r.wind, facing).label).toBe(`${words}, 4 m/s`);
  });

  it('random picks one of the named directions', () => {
    const r = generatePracticeRound({ tryX: 0, windSpeed: 3, windDir: 'random', previewTier: 3 }, createRng(9));
    expect(Math.hypot(r.wind.x, r.wind.z)).toBeCloseTo(3);
    expect(Object.keys(PRACTICE_WIND_DIRS).length).toBe(8);
  });
});
