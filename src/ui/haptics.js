// ---------------------------------------------------------------------------
// Haptics via navigator.vibrate where supported (Android Chrome; not iOS).
// ---------------------------------------------------------------------------
const supported = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function createHaptics(isEnabled) {
  const buzz = (pattern) => {
    if (supported && isEnabled()) navigator.vibrate(pattern);
  };
  return {
    supported,
    tick: () => buzz(6),
    kick: (power) => buzz(Math.round(18 + power * 22)),
    doink: () => buzz([30, 40, 30]),
    goal: () => buzz([40, 60, 80]),
    miss: () => buzz(25),
  };
}
