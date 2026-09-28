import { describe, it, expect } from 'vitest';
import { createStore, mergeDefaults } from '../src/settings/storage.js';
import { DEFAULT_BINDINGS, rebind, indexBindings, keyLabel } from '../src/input/bindings.js';
import { meterPower } from '../src/game/meter.js';

const fakeStorage = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
};

describe('versioned storage', () => {
  const defaults = { a: 1, nested: { b: 2, c: 3 } };

  it('returns defaults when empty and round-trips saves', () => {
    const store = createStore('k', { version: 1, defaults, storage: fakeStorage() });
    expect(store.load()).toEqual(defaults);
    store.save({ a: 5, nested: { b: 6, c: 7 } });
    expect(store.load()).toEqual({ a: 5, nested: { b: 6, c: 7 } });
  });

  it('fills in settings added after the data was saved', () => {
    const storage = fakeStorage();
    storage.setItem('k', JSON.stringify({ v: 1, data: { a: 9 } }));
    expect(createStore('k', { version: 1, defaults, storage }).load()).toEqual({ a: 9, nested: { b: 2, c: 3 } });
  });

  it('migrates older versions', () => {
    const storage = fakeStorage();
    storage.setItem('k', JSON.stringify({ v: 0, data: { old: 4 } }));
    const store = createStore('k', { version: 1, defaults, storage, migrate: (d) => ({ a: d.old }) });
    expect(store.load().a).toBe(4);
  });

  it('survives corrupt data and a storage that throws', () => {
    const storage = fakeStorage();
    storage.setItem('k', '{not json');
    expect(createStore('k', { version: 1, defaults, storage }).load()).toEqual(defaults);

    const throwing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
    const store = createStore('k', { version: 1, defaults, storage: throwing });
    store.save({ a: 2, nested: { b: 2, c: 3 } });
    expect(store.load().a).toBe(2); // in-memory fallback
  });

  it('falls back to memory when no storage exists', () => {
    const store = createStore('k', { version: 1, defaults, storage: null });
    expect(store.persistent).toBe(false);
    store.save({ a: 3, nested: { b: 2, c: 3 } });
    expect(store.load().a).toBe(3);
  });

  it('mergeDefaults keeps arrays from saved data', () => {
    expect(mergeDefaults({ k: ['a'] }, { k: ['b', 'c'] })).toEqual({ k: ['b', 'c'] });
  });
});

describe('key bindings', () => {
  it('rebinding moves a key off its old action', () => {
    const next = rebind(DEFAULT_BINDINGS, 'kick', 'KeyA');
    expect(next.kick[0]).toBe('KeyA');
    expect(next.aimLeft).not.toContain('KeyA');
    expect(indexBindings(next).get('KeyA')).toEqual(['kick']);
  });

  it('labels keys for display', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('ArrowUp')).toBe('↑');
    expect(keyLabel('Space')).toBe('Space');
  });
});

describe('timing meter', () => {
  it('sweeps 0 → 1 → 0 so holding or waiting never pins full power', () => {
    expect(meterPower(0, 1.6)).toBeCloseTo(0);
    expect(meterPower(0.8, 1.6)).toBeCloseTo(1);
    expect(meterPower(1.6, 1.6)).toBeCloseTo(0);
    expect(meterPower(0.4, 1.6)).toBeCloseTo(0.5);
  });
});
