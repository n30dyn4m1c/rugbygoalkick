// ---------------------------------------------------------------------------
// Unified input: keyboard, pointer (touch + mouse) and gamepad → intents.
//
// Continuous intents are polled each physics step via axes():
//   aim   −1…1  (left/right)       elev  −1…1 (raise/lower; also tee closer/back)
//   fine  bool
// Discrete intents are emitted as events:
//   'press'   {action}  kick | confirm | pause | back
//   'any'     any key, click, tap or button (used to skip cut-scenes)
//   'pointer' {phase: down|move|up|cancel, x, y, id, pointerType}
//   'wheel'   {delta}
//   'device'  lastDevice changed: keyboard | touch | mouse | gamepad
// ---------------------------------------------------------------------------
import { createEmitter } from '../core/events.js';
import { indexBindings } from './bindings.js';

const STICK_DEAD = 0.18;

export function createInput({ surface, getBindings }) {
  const events = createEmitter();
  const heldActions = new Set();
  let byCode = indexBindings(getBindings());
  let lastDevice = matchMedia('(pointer: coarse)').matches ? 'touch' : 'keyboard';
  let pad = { aim: 0, elev: 0, fine: false };
  const padPrev = [];

  function setDevice(d) {
    if (d !== lastDevice) {
      lastDevice = d;
      events.emit('device', d);
    }
  }

  // --- Keyboard ------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLElement && e.target.closest('input, select, textarea, [data-capture-keys]')) return;
    const actions = byCode.get(e.code);
    setDevice('keyboard');
    if (!actions) {
      if (!e.repeat) events.emit('any', { source: 'keyboard' });
      return;
    }
    e.preventDefault();
    for (const a of actions) heldActions.add(a);
    if (e.repeat) return;
    events.emit('any', { source: 'keyboard' });
    for (const a of actions) {
      if (a === 'kick' || a === 'confirm' || a === 'pause') events.emit('press', { action: a, source: 'keyboard' });
    }
  });

  window.addEventListener('keyup', (e) => {
    for (const a of byCode.get(e.code) ?? []) heldActions.delete(a);
  });

  // Keys released while the window is unfocused never send keyup.
  const releaseAll = () => heldActions.clear();
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => document.hidden && releaseAll());

  // --- Pointer (touch + mouse) on the 3D surface ----------------------------
  const emitPointer = (phase) => (e) => {
    setDevice(e.pointerType === 'touch' || e.pointerType === 'pen' ? 'touch' : 'mouse');
    if (phase === 'down') {
      surface.setPointerCapture?.(e.pointerId);
      events.emit('any', { source: 'pointer' });
    }
    events.emit('pointer', { phase, x: e.clientX, y: e.clientY, id: e.pointerId, pointerType: e.pointerType });
  };
  surface.addEventListener('pointerdown', emitPointer('down'));
  surface.addEventListener('pointermove', emitPointer('move'));
  surface.addEventListener('pointerup', emitPointer('up'));
  surface.addEventListener('pointercancel', emitPointer('cancel'));
  surface.addEventListener('wheel', (e) => {
    e.preventDefault();
    setDevice('mouse');
    events.emit('wheel', { delta: Math.sign(e.deltaY) });
  }, { passive: false });
  surface.addEventListener('contextmenu', (e) => e.preventDefault());

  // --- Gamepad (polled) -----------------------------------------------------
  function pollGamepad() {
    const pads = navigator.getGamepads?.() ?? [];
    const gp = [...pads].find((p) => p && p.connected);
    if (!gp) {
      pad = { aim: 0, elev: 0, fine: false };
      return;
    }
    const dz = (v) => (Math.abs(v) < STICK_DEAD ? 0 : (v - Math.sign(v) * STICK_DEAD) / (1 - STICK_DEAD));
    const btn = (i) => !!gp.buttons[i]?.pressed;
    let aim = dz(gp.axes[0] ?? 0) + dz(gp.axes[2] ?? 0) * 0.3; // right stick = fine aim
    let elev = -dz(gp.axes[1] ?? 0);
    if (btn(14)) aim -= 1; // d-pad
    if (btn(15)) aim += 1;
    if (btn(12)) elev += 1;
    if (btn(13)) elev -= 1;
    pad = { aim: Math.max(-1, Math.min(1, aim)), elev: Math.max(-1, Math.min(1, elev)), fine: btn(4) || btn(5) };
    if (aim || elev) setDevice('gamepad');

    // Edge-triggered buttons: A / RT = kick, A = confirm, B = back, Start = pause
    const edges = { 0: ['kick', 'confirm'], 7: ['kick'], 1: ['back'], 9: ['pause'] };
    gp.buttons.forEach((b, i) => {
      const down = b.pressed;
      if (down && !padPrev[i]) {
        setDevice('gamepad');
        events.emit('any', { source: 'gamepad' });
        for (const a of edges[i] ?? []) events.emit('press', { action: a, source: 'gamepad' });
      }
      padPrev[i] = down;
    });
  }

  return {
    on: events.on,

    /** Call once per physics step. */
    update() {
      pollGamepad();
    },

    axes() {
      const k = (a) => (heldActions.has(a) ? 1 : 0);
      return {
        aim: Math.max(-1, Math.min(1, k('aimRight') - k('aimLeft') + pad.aim)),
        elev: Math.max(-1, Math.min(1, k('raise') - k('lower') + pad.elev)),
        fine: heldActions.has('fine') || pad.fine,
      };
    },

    isHeld(action) {
      return heldActions.has(action);
    },

    refreshBindings() {
      byCode = indexBindings(getBindings());
      heldActions.clear();
    },

    get lastDevice() {
      return lastDevice;
    },
  };
}
