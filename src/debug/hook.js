// ---------------------------------------------------------------------------
// Dev-only debug hook: window.__game (used by scripts/screenshots.mjs)
// ---------------------------------------------------------------------------
export function installDebugHook(api) {
  window.__game = api;
}
