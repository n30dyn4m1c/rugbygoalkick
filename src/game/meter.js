// ---------------------------------------------------------------------------
// Timing meter — pure
// ---------------------------------------------------------------------------

/** Triangle wave 0→1→0 over one period, so waiting never pins full power. */
export function meterPower(t, period) {
  const phase = (t / period) % 1;
  return phase < 0.5 ? phase * 2 : 2 - phase * 2;
}
