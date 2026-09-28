// ---------------------------------------------------------------------------
// Screens — title, pause, settings, summary. Real buttons, focus management,
// Esc / gamepad B to go back, arrows / d-pad to move between controls.
// ---------------------------------------------------------------------------
import { ACTIONS, DEFAULT_BINDINGS, keyLabel, rebind } from '../input/bindings.js';
import { RESULT_COPY } from '../physics/explain.js';

const $ = (id) => document.getElementById(id);

const stack = []; // open screen ids, top last
let lastFocus = null;

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), [tabindex="0"]';

function focusables(screen) {
  return [...screen.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
}

export function isOpen(id) {
  return id ? stack.includes(id) : stack.length > 0;
}

export function top() {
  return stack.at(-1) ?? null;
}

export function open(id, { focus } = {}) {
  if (!stack.length) lastFocus = document.activeElement;
  for (const s of stack) $(s).hidden = true;
  stack.push(id);
  document.body.classList.add('menu-open');
  const el = $(id);
  el.hidden = false;
  (focus ? $(focus) : focusables(el)[0])?.focus({ preventScroll: true });
}

export function close() {
  const id = stack.pop();
  if (id) $(id).hidden = true;
  const prev = top();
  document.body.classList.toggle('menu-open', !!prev);
  if (prev) {
    $(prev).hidden = false;
    focusables($(prev))[0]?.focus({ preventScroll: true });
  } else {
    lastFocus?.focus?.({ preventScroll: true });
    releaseHiddenFocus();
  }
  return id;
}

/** Drop focus left on a control inside a now-hidden screen, so keys reach the game. */
function releaseHiddenFocus() {
  const el = document.activeElement;
  if (el instanceof HTMLElement && el.closest('.screen[hidden]')) el.blur();
}

export function closeAll() {
  while (stack.length) $(stack.pop()).hidden = true;
  document.body.classList.remove('menu-open');
  releaseHiddenFocus();
}

/** Move focus within the top screen (arrow keys / d-pad). */
export function moveFocus(dir) {
  const id = top();
  if (!id) return;
  const list = focusables($(id));
  if (!list.length) return;
  const i = list.indexOf(document.activeElement);
  const next = i < 0 ? 0 : (i + dir + list.length) % list.length;
  list[next].focus();
}

export function activateFocused() {
  const el = document.activeElement;
  if (!top() || !el || !$(top()).contains(el)) return;
  if (el instanceof HTMLInputElement && el.type === 'checkbox') el.click();
  else if (el instanceof HTMLButtonElement) el.click();
}

// Arrow keys move between controls (range inputs keep left/right for their value)
window.addEventListener('keydown', (e) => {
  if (!top()) return;
  if (e.target instanceof HTMLElement && e.target.closest('[data-capture-keys]')) return;
  if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
    e.preventDefault();
    moveFocus(e.code === 'ArrowDown' ? 1 : -1);
  }
});

// ---------------------------------------------------------------------------
// Settings screen
// ---------------------------------------------------------------------------
const TOGGLES = ['invertDragAim', 'alwaysSuggestedTee', 'meterAssist', 'previewAssist', 'introEveryRound', 'muted', 'menuMusic', 'haptics'];

export function bindSettings(settings, { onRebindStart, onRebindEnd, glowDefault = () => false, reducedDefault = () => false, hapticsSupported = true }) {
  const s = () => settings.get();

  // Volumes
  for (const bus of ['master', 'sfx', 'crowd', 'music']) {
    const el = $(`vol-${bus}`);
    const out = $(`out-${bus}`);
    const show = () => (out.textContent = `${Math.round(Number(el.value) * 100)}%`);
    el.value = String(s().volumes[bus]);
    show();
    el.addEventListener('input', () => {
      show();
      settings.set({ volumes: { ...s().volumes, [bus]: Number(el.value) } });
    });
  }
  $('row-haptics').hidden = !hapticsSupported;

  const motion = $('set-reduceMotion');
  const syncMotion = () => (motion.checked = s().reduceMotion === 'auto' ? reducedDefault() : s().reduceMotion === 'on');
  syncMotion();
  motion.addEventListener('change', () => settings.set({ reduceMotion: motion.checked ? 'on' : 'off' }));
  $('screen-settings').addEventListener('focusin', syncMotion);

  const glow = $('set-glow');
  const syncGlow = () => (glow.checked = s().glow === 'auto' ? glowDefault() : s().glow === 'on');
  syncGlow();
  glow.addEventListener('change', () => settings.set({ glow: glow.checked ? 'on' : 'off' }));
  $('screen-settings').addEventListener('focusin', syncGlow);

  for (const key of TOGGLES) {
    const el = $(`set-${key}`);
    el.checked = !!s()[key];
    el.addEventListener('change', () => settings.set({ [key]: el.checked }));
    settings.subscribe((v) => (el.checked = !!v[key])); // e.g. the M key toggles mute
  }

  const hand = $('set-leftHanded');
  hand.checked = s().handedness === 'left';
  hand.addEventListener('change', () => settings.set({ handedness: hand.checked ? 'left' : 'right' }));

  const sens = $('set-aimSensitivity');
  const sensOut = $('out-aimSensitivity');
  sens.value = String(s().aimSensitivity);
  sensOut.textContent = `${Number(sens.value).toFixed(1)}×`;
  sens.addEventListener('input', () => {
    sensOut.textContent = `${Number(sens.value).toFixed(1)}×`;
    settings.set({ aimSensitivity: Number(sens.value) });
  });

  // Key remapping: click a key button, then press the new key (Esc cancels)
  const keymap = $('keymap');
  function renderKeys() {
    keymap.replaceChildren();
    for (const [action, label] of Object.entries(ACTIONS)) {
      const name = document.createElement('span');
      name.textContent = label;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'key-btn';
      btn.dataset.action = action;
      const codes = s().bindings[action] ?? [];
      btn.textContent = codes.map(keyLabel).join(' / ') || '—';
      btn.setAttribute('aria-label', `${label}: ${btn.textContent}. Press to change.`);
      btn.addEventListener('click', () => capture(btn, action));
      keymap.append(name, btn);
    }
  }

  function capture(btn, action) {
    btn.dataset.capturing = '';
    btn.setAttribute('data-capture-keys', '');
    btn.textContent = 'Press a key…';
    onRebindStart?.();
    const onKey = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.removeEventListener('keydown', onKey, true);
      if (e.code !== 'Escape') settings.set({ bindings: rebind(s().bindings, action, e.code) });
      renderKeys();
      keymap.querySelector(`[data-action="${action}"]`)?.focus();
      onRebindEnd?.();
    };
    window.addEventListener('keydown', onKey, true);
  }

  $('btn-reset-keys').addEventListener('click', () => {
    settings.set({ bindings: structuredClone(DEFAULT_BINDINGS) });
    renderKeys();
  });

  renderKeys();
}

// ---------------------------------------------------------------------------
// Title & summary content
// ---------------------------------------------------------------------------
export function setTitleBest(all, today) {
  const parts = [];
  if (all.match.bestPoints) parts.push(`Best ${all.match.bestPoints} pts`);
  if (all.pressure.bestStreak) parts.push(`pressure streak ${all.pressure.bestStreak}`);
  $('title-best').textContent = parts.join(' · ');
  $('daily-sub').textContent = all.daily.date === today && all.daily.bestPoints ? `Today: ${all.daily.bestPoints} pts` : 'Same kicks for all';
}

export function fillSummary({ mode, points, goals, streak, bestStreak, log, record }) {
  const pressure = mode === 'pressure';
  const total = log.length;
  $('summary-heading').textContent = pressure ? 'Streak over' : mode === 'daily' ? 'Daily challenge' : 'Full time';
  $('sum-points').parentElement.lastChild.textContent = pressure ? (streak === 1 ? ' goal' : ' goals') : ' pts';
  $('sum-points').textContent = String(pressure ? streak : points);
  const pct = total ? Math.round((goals / total) * 100) : 0;
  $('sum-line').textContent = pressure ? `${streak} in a row before the miss` : `${goals}/${total} goals · ${pct}% · best streak ${bestStreak}`;

  const best = $('sum-best');
  const { beat, previous } = record;
  best.classList.toggle('new', beat.points || beat.streak);
  if (pressure) {
    best.textContent = beat.streak ? (previous.bestStreak ? `New best! Previous ${previous.bestStreak}` : 'New best!') : `Best streak: ${previous.bestStreak}`;
  } else if (beat.points) {
    best.textContent = previous.bestPoints ? `New best! Previous ${previous.bestPoints} pts` : 'New best!';
  } else if (beat.streak) {
    best.textContent = `New best streak! Previous ${previous.bestStreak}`;
  } else {
    best.textContent = `Best: ${previous.bestPoints} pts`;
  }

  const rows = $('sum-rows');
  rows.replaceChildren();
  for (const k of log) {
    const tr = document.createElement('tr');
    const copy = RESULT_COPY[k.outcome];
    const cells = [String(k.round), `${k.teeDist.toFixed(0)} m`, copy.title, copy.points ? `+${copy.points}` : '0'];
    if (pressure) cells[3] = k.scored ? '✓' : '—';
    for (const [i, text] of cells.entries()) {
      const td = document.createElement('td');
      td.textContent = i === 2 ? `${copy.points ? '✓' : '✕'} ${text}` : text;
      if (i === 2 && copy.points) td.className = 'good';
      tr.append(td);
    }
    rows.append(tr);
  }
}

// ---------------------------------------------------------------------------
// Practice options
// ---------------------------------------------------------------------------
const DIR_WORDS = {
  tail: 'Tailwind: carries the ball toward the posts', head: 'Headwind: holds the ball up', ltr: 'Crosswind, left to right',
  rtl: 'Crosswind, right to left', tailLtr: 'Tail-crosswind, left to right', tailRtl: 'Tail-crosswind, right to left',
  headLtr: 'Head-crosswind, left to right', headRtl: 'Head-crosswind, right to left', random: 'Random direction each kick',
};

export function bindPractice(settings) {
  const opts = () => settings.get().practice;
  const set = (patch) => settings.set({ practice: { ...opts(), ...patch } });

  const tryEl = $('pr-tryX');
  const tryOut = $('pr-tryX-out');
  const showTry = () => {
    const x = Number(tryEl.value);
    tryOut.textContent = Math.abs(x) < 2 ? 'Centre' : `${Math.abs(x)} m ${x < 0 ? 'left' : 'right'}`;
  };
  tryEl.addEventListener('input', () => {
    showTry();
    set({ tryX: Number(tryEl.value) });
  });

  const radios = (name, key, parse) => {
    for (const el of document.querySelectorAll(`input[name="${name}"]`)) {
      el.addEventListener('change', () => el.checked && set({ [key]: parse(el.value) }));
    }
  };
  radios('pr-speed', 'windSpeed', Number);
  radios('pr-dir', 'windDir', String);
  radios('pr-preview', 'previewTier', Number);

  const caption = () => {
    $('pr-dir-caption').textContent = opts().windSpeed === 0 ? 'No wind' : DIR_WORDS[opts().windDir];
    $('pr-windDir').disabled = opts().windSpeed === 0;
  };
  settings.subscribe(caption);

  // Reflect saved options whenever the screen opens
  return function sync() {
    const o = opts();
    tryEl.value = String(o.tryX);
    showTry();
    for (const [name, val] of [['pr-speed', o.windSpeed], ['pr-dir', o.windDir], ['pr-preview', o.previewTier]]) {
      for (const el of document.querySelectorAll(`input[name="${name}"]`)) el.checked = el.value === String(val);
    }
    caption();
  };
}
