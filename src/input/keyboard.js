// ---------------------------------------------------------------------------
// Keyboard input — tracks held keys
// ---------------------------------------------------------------------------
const KEYMAP = {
  Space: 'kick',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
};

export function createKeyboard(target = window) {
  const held = { kick: false, left: false, right: false, up: false, down: false };

  target.addEventListener('keydown', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    e.preventDefault();
    if (action === 'kick' && e.repeat) return;
    held[action] = true;
  });

  target.addEventListener('keyup', (e) => {
    const action = KEYMAP[e.code];
    if (!action) return;
    if (action === 'kick') e.preventDefault();
    held[action] = false;
  });

  // Keys released while the window is unfocused never send keyup.
  const releaseAll = () => {
    for (const k of Object.keys(held)) held[k] = false;
  };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) releaseAll();
  });

  return held;
}
