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
  }
  return id;
}

export function closeAll() {
  while (stack.length) $(stack.pop()).hidden = true;
  document.body.classList.remove('menu-open');
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
const TOGGLES = ['invertDragAim', 'alwaysSuggestedTee', 'meterAssist', 'previewAssist', 'introEveryRound'];

export function bindSettings(settings, { onRebindStart, onRebindEnd }) {
  const s = () => settings.get();

  for (const key of TOGGLES) {
    const el = $(`set-${key}`);
    el.checked = !!s()[key];
    el.addEventListener('change', () => settings.set({ [key]: el.checked }));
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
export function setTitleBest(best) {
  $('title-best').textContent = best.bestPoints ? `Best: ${best.bestPoints} pts · best streak ${best.bestStreak}` : '';
}

export function fillSummary({ points, goals, total, bestStreak, log, record }) {
  $('sum-points').textContent = String(points);
  const pct = total ? Math.round((goals / total) * 100) : 0;
  $('sum-line').textContent = `${goals}/${total} goals · ${pct}% · best streak ${bestStreak}`;

  const best = $('sum-best');
  const { beat, previous } = record;
  best.classList.toggle('new', beat.points || beat.streak);
  if (beat.points) best.textContent = previous.bestPoints ? `New best! Previous ${previous.bestPoints} pts` : 'New best!';
  else if (beat.streak) best.textContent = `New best streak! Previous ${previous.bestStreak}`;
  else best.textContent = `Best: ${previous.bestPoints} pts`;

  const rows = $('sum-rows');
  rows.replaceChildren();
  for (const k of log) {
    const tr = document.createElement('tr');
    const copy = RESULT_COPY[k.outcome];
    const cells = [String(k.round), `${k.teeDist.toFixed(0)} m`, copy.title, copy.points ? `+${copy.points}` : '0'];
    for (const [i, text] of cells.entries()) {
      const td = document.createElement('td');
      td.textContent = i === 2 ? `${copy.points ? '✓' : '✕'} ${text}` : text;
      if (i === 2 && copy.points) td.className = 'good';
      tr.append(td);
    }
    rows.append(tr);
  }
}
