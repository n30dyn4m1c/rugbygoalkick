// ---------------------------------------------------------------------------
// Remappable keyboard bindings: action → list of KeyboardEvent.code values.
// ---------------------------------------------------------------------------
export const ACTIONS = {
  aimLeft: 'Aim left',
  aimRight: 'Aim right',
  raise: 'Raise kick / move tee closer',
  lower: 'Lower kick / move tee back',
  kick: 'Timing meter / kick',
  confirm: 'Confirm',
  fine: 'Fine adjust (hold)',
  pause: 'Pause',
};

export const DEFAULT_BINDINGS = {
  aimLeft: ['ArrowLeft', 'KeyA'],
  aimRight: ['ArrowRight', 'KeyD'],
  raise: ['ArrowUp', 'KeyW'],
  lower: ['ArrowDown', 'KeyS'],
  kick: ['Space'],
  confirm: ['Enter', 'NumpadEnter'],
  fine: ['ShiftLeft', 'ShiftRight'],
  pause: ['Escape', 'KeyP'],
};

/** Reverse map code → actions for fast lookup. */
export function indexBindings(bindings) {
  const byCode = new Map();
  for (const [action, codes] of Object.entries(bindings)) {
    for (const code of codes) {
      if (!byCode.has(code)) byCode.set(code, []);
      byCode.get(code).push(action);
    }
  }
  return byCode;
}

/** Bind `code` to `action` as its primary key, removing it from any other action. */
export function rebind(bindings, action, code) {
  const next = {};
  for (const [a, codes] of Object.entries(bindings)) next[a] = codes.filter((c) => c !== code);
  next[action] = [code, ...next[action].filter((c) => c !== code)].slice(0, 2);
  return next;
}

/** Human-readable key name. */
export function keyLabel(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const names = {
    ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Space', Enter: 'Enter',
    NumpadEnter: 'Num Enter', ShiftLeft: 'Shift', ShiftRight: 'R Shift', Escape: 'Esc',
  };
  return names[code] ?? code;
}
