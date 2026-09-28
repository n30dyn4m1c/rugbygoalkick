# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

3D rugby league goal kicking game built with Three.js and Vite. Players convert tries across 10 rounds with increasing difficulty and wind. A revamp is in progress on the `revamp` branch (mobile + desktop, new controls, modes); this file describes the code as it stands.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Dev server (http://localhost:5173)
npm run build        # Production build to dist/
npm run preview      # Preview production build
npm test             # Vitest unit tests (pure physics/game logic)
npm run screenshots  # Playwright: screenshots at 390×844, 844×390, 1440×900 → screenshots/
```

`npx playwright install chromium` may be needed once for the screenshot script.

## Architecture

`index.html` holds the DOM HUD overlay; `src/main.js` bootstraps everything.

```
src/
  config.js        field/league dimensions and tuning constants (single source of truth)
  core/            rng.js (seeded mulberry32), clock.js (game-time timers), loop.js (120 Hz fixed step)
  physics/         PURE — flight.js (launch, trajectory), scoring.js (goal-plane judgement)
  game/            round.js (pure seeded round generator), game.js (state machine)
  world/           three.js scene builders: renderer, lighting, field, posts, stadium, flags, props, labels, aimTarget, cameraRig
  input/           keyboard.js (held-key state; releases on blur)
  ui/              hud.js (DOM updates)
  debug/           hook.js — window.__game, dev builds only
test/              Vitest suites for physics, scoring, rounds, rng, clock
scripts/           screenshots.mjs
```

### Rules

- `physics/`, `game/round.js`, `core/rng.js` and `core/clock.js` must not import three.js or touch the DOM — they are unit-tested in Node.
- Gameplay timing uses the game clock (`clock.after`), never `setTimeout`, so pausing the loop pauses everything. The loop stops when the tab is hidden.
- Aim is a **yaw**: 0 = straight downfield (−Z), positive = kicker's right (+X), kept within ±85°.
- Coordinates: goal line at `z = GOALPOST_Z` (−50), kicker faces −Z, +X is right.

### Game State Machine (`game/game.js`)

`intro_field` → `intro_try` → `intro_kick` → `intro_position` → `aiming` → `charging` → `kicked`, then the next round after 3 s of game time.

### Physics & scoring

- Analytic projectile with wind as constant acceleration (to be replaced by fixed-step drag against relative wind).
- `judgeKick` finds the first goal-plane crossing; a crossing after landing is SHORT.
- League goal: posts 5.5 m apart (`|x| < 2.75`), crossbar 3 m.

### Debug hook

In dev, `window.__game` exposes `seed(n)`, `freeze()`, `step(seconds)`, `skipIntro()`, `kick(yaw, power)`, `state`, `renderer`. The screenshot script freezes real-time stepping and advances the game deterministically.

## Dependencies

- **three** (0.170): rendering
- **vite** (6): dev server/bundler
- **vitest**, **playwright** (dev): tests and screenshots
