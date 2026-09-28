// ---------------------------------------------------------------------------
// Reduced motion: the setting wins; 'auto' follows prefers-reduced-motion.
// ---------------------------------------------------------------------------
const query = matchMedia('(prefers-reduced-motion: reduce)');

export function reducedMotion(setting) {
  return setting === 'on' || (setting === 'auto' && query.matches);
}

export function onSystemMotionChange(fn) {
  query.addEventListener?.('change', fn);
}
