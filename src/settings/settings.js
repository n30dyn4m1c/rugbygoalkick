// ---------------------------------------------------------------------------
// Player settings — loaded once, saved on every change, observable.
// ---------------------------------------------------------------------------
import { createStore } from './storage.js';
import { DEFAULT_BINDINGS } from '../input/bindings.js';

export const DEFAULT_SETTINGS = {
  aimSensitivity: 1, // 0.5–2
  invertDragAim: false,
  handedness: 'right', // which edge the elevation slider sits on
  meterAssist: false, // slower timing meter
  previewAssist: false, // one tier longer aim preview
  alwaysSuggestedTee: false,
  introEveryRound: false,
  tutorialDone: false,
  glow: 'auto', // bloom: auto (desktop on, phones off) | on | off
  volumes: { master: 0.8, sfx: 0.9, crowd: 0.7, music: 0.5 },
  muted: false,
  menuMusic: true,
  haptics: true,
  reduceMotion: 'auto', // auto (system setting) | on | off
  practice: { tryX: 12, windSpeed: 0, windDir: 'random', previewTier: 3 },
  bindings: DEFAULT_BINDINGS,
};

const store = createStore('rgk.settings', { version: 1, defaults: DEFAULT_SETTINGS });
const listeners = new Set();
let current = store.load();

export const settings = {
  get() {
    return current;
  },
  set(patch) {
    current = { ...current, ...patch };
    store.save(current);
    for (const fn of listeners) fn(current);
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
