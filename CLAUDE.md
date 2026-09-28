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
npm run smoke        # Playwright: real touch/keyboard input checks
```

`npx playwright install chromium` may be needed once for the screenshot script.

## Architecture

`index.html` holds the DOM HUD overlay; `src/main.js` bootstraps everything.

```
src/
  config.js        league dimensions, physics and tuning constants (single source of truth)
  core/            rng.js (seeded mulberry32), clock.js (game-time timers), loop.js (120 Hz fixed step), events.js
  physics/         PURE — simulate.js (fixed-step flight, drag vs wind, post/bar collisions, outcomes),
                   conversion.js (tee geometry, suggested spot, aim yaw), wind.js (kicker-relative wording),
                   explain.js (result copy + "why" line)
  game/            round.js + meter.js (pure), game.js (state machine, input handling, flight playback)
  world/           three.js builders: renderer, lighting, field, posts, stadium, flags, props,
                   aimPreview (dotted arc + posts marker), teeGuide, cameraRig
  input/           input.js (keyboard + pointer + gamepad → axes and events), bindings.js (remappable keys)
  settings/        storage.js (versioned localStorage, memory fallback), settings.js, scores.js (bests)
  ui/              hud.js (DOM HUD; CSS shows panels by data-phase), screens.js (title/pause/settings/
                   summary, focus + key remapping), tutorial.js (interactive coach marks)
  debug/           hook.js — window.__game, dev builds only
test/              Vitest suites
scripts/           screenshots.mjs, smoke.mjs (real input events), contact-sheet.py (dev helper)
```

### Rules

- `physics/`, `game/round.js`, `game/meter.js`, `core/rng.js`, `core/clock.js` and `settings/storage.js` must not import three.js or touch the DOM — they are unit-tested in Node.
- **One simulation**: the aim preview and the real kick both come from `simulate()`. The kick is simulated once at contact and played back sample by sample, so preview, flight and result can never disagree. No hidden randomness.
- Gameplay timing uses the game clock / fixed step, never `setTimeout`. The loop stops when the tab is hidden.
- Aim is a **yaw**: 0 = straight downfield (−Z), positive = kicker's right (+X), clamped to ±85°.
- Coordinates: goal line at `z = GOALPOST_Z` (−50), kicker faces −Z, +X is right. Wind is an air velocity `{x, z}` (where it pushes the ball).

### App flow (`main.js`)

Title (mode buttons on the title itself) → match or tutorial ⇄ pause / settings → summary → title. Page load to first kick is two taps (Play match, Kick from here). Menus set `body.menu-open`, call `game.setActive(false)` and pause the loop; Esc / P / gamepad B / the ⏸ button step back; hiding the tab auto-pauses.

### Game flow (`game/game.js`)

`idle` (title backdrop orbit) → `establish` (skippable fly-in) → `tee` (choose distance on the conversion line) → `aim` (yaw, elevation, power via slingshot drag or timing meter) → `flight` (playback; result revealed at the goal plane / post hit / landing) → next round or `over`.

### Physics

120 Hz semi-implicit Euler; gravity + quadratic drag `k·|v−w|·(v−w)` (DRAG_K = 0.008). Goal plane found by segment crossing before first ground contact. Swept sphere vs cylinder collisions for uprights and crossbar. League goal: posts 5.5 m apart, bar 3 m. Tuning is asserted in `test/simulate.test.js` (35 m makeable, 45 m wide into a 7 m/s headwind hard).

### Debug hook

In dev, `window.__game` exposes `seed(n)`, `freeze()`, `step(seconds)`, `startMatch()`, `startTutorial()`, `showTitle()`, `pause()`, `resume()`, `openSettings()`, `go(state)`, `setAim({yaw, elevationDeg, teeDist})`, `kick(power)`, `autoplay(n)`, `yawToPosts()`, `state`, `app`, `renderer`, `settings`, `scores`.

## Dependencies

- **three** (0.170): rendering
- **vite** (6): dev server/bundler
- **@fontsource/barlow-condensed**: self-hosted display font (Latin 700/800)
- **vitest**, **playwright** (dev): tests and screenshots
