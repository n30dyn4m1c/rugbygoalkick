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
npm run lookdev      # Playwright: look-dev presets at three sizes + relative perf probe
npm run check:offline # after build: service worker installs, game reloads and plays offline
npm run icons        # re-render PWA icons from public/icons/icon.svg
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
  modes/           modes.js — PURE mode rules as data: match, daily, practice, pressure, tutorial
  world/           three.js builders: renderer, lighting (preset-driven key/fill/hemi, play-area shadows),
                   field (league markings), posts, stadium, crowd (instanced), scenery (hills, palms,
                   floodlights + haze, roofs, pattern boards), ball (lathe + tee), sky, patterns,
                   materials (role-based), lookdev (presets), post (lazy bloom), flags, props,
                   aimPreview (dotted arc + posts marker), teeGuide, cameraRig
  input/           input.js (keyboard + pointer + gamepad → axes and events), bindings.js (remappable keys)
  settings/        storage.js (versioned localStorage, memory fallback), settings.js, scores.js (bests)
  ui/              hud.js (DOM HUD; CSS shows panels by data-phase), screens.js (title/pause/settings/
                   summary, focus + key remapping), tutorial.js (interactive coach marks)
  audio/           engine.js (context, buses, unlock), sfx.js, crowd.js (tension bed, cheer/groan), music.js
                   (kundu-style menu groove) — all synthesised with Web Audio, no files
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

### Modes (`modes/modes.js`)

Each mode defines `rounds`, `round(k, ctx)`, `ends(state)`, `shotClock(k, round)` and `score(state)`. Match: 10 kicks, 2 pts a goal; difficulty eased by `matchDifficulty` in `game/round.js` (rounds 1–3 gentle, full preview; rounds 8–10 no preview, wind to 10 m/s, tries to the touchline). Daily: match rules with a date seed (same kicks for everyone). Practice: player-chosen try spot, wind and preview, unlimited, heat map of recent kicks (`world/heatmap.js`). Pressure: until the first miss, harder every kick, preview fades to nothing, shot clock (game time, so pause stops it). Bests are stored in `settings/scores.js`.

### App flow (`main.js`)

Title (mode buttons on the title itself) → match or tutorial ⇄ pause / settings → summary → title. Page load to first kick is two taps (Play match, Kick from here). Menus set `body.menu-open`, call `game.setActive(false)` and pause the loop; Esc / P / gamepad B / the ⏸ button step back; hiding the tab auto-pauses.

### Game flow (`game/game.js`)

`idle` (title backdrop orbit) → `establish` (skippable fly-in) → `tee` (choose distance on the conversion line) → `aim` (yaw, elevation, power via slingshot drag or timing meter) → `flight` (playback; result revealed at the goal plane / post hit / landing) → next round or `over`.

### Look (art direction B: floodlit night)

`world/lookdev.js` holds presets; **B** is the game's look (A golden hour and C flat graphic remain for comparison via `?look=A|C`). World meshes carry `userData.role`; a preset builds one material per role and swaps them in, so restyling never touches builders. Sky fog uses the horizon colour. Bloom is optional (`settings.glow`: auto = desktop on / phones off), lazy-loaded. Shadows re-render only when the ball moves (`shadowMap.autoUpdate = false`). UI colour tokens live on `:root` in `style.css`.

### Feedback

`game.on(event)` emits `teeStep`, `aimTick`, `elevTick`, `meterStart`, `kick`, `post`, `land`, `result`; `main.js` maps them to sound, haptics (`ui/haptics.js`), camera shake, confetti (`world/fx.js`) and HUD pops. Every meaningful sound has a visual twin (e.g. the post "doink" shows a Doink! badge). Reduced motion (`ui/motion.js`: setting or `prefers-reduced-motion`) removes shake and travel animations. Goals get a brief slow-motion (playback rate 0.35) around the crossing.

### Physics

120 Hz semi-implicit Euler; gravity + quadratic drag `k·|v−w|·(v−w)` (DRAG_K = 0.008). Goal plane found by segment crossing before first ground contact. Swept sphere vs cylinder collisions for uprights and crossbar. League goal: posts 5.5 m apart, bar 3 m. Tuning is asserted in `test/simulate.test.js` (35 m makeable, 45 m wide into a 7 m/s headwind hard).

### Accessibility

Settings: text size (`textScale` → `--ui-scale` on `:root`; every `--text-*` token multiplies it), high contrast (`body.high-contrast`: opaque panels, white borders, bolder aim preview via `preview.setBold`), reduce motion, meter/preview assists, remappable keys, aim sensitivity. Phase changes are announced to screen readers through `#sr-status` (`hud.announce`) in the same words as the HUD. Nothing is shown by colour alone.

### Performance and shipping

Pixel ratio capped at 2 with adaptive resolution (`world/renderer.js` `adapt()` steps down on slow frames, back up with headroom; `freeze()` disables it for deterministic screenshots). The loop renders once then idles while paused (`loop.invalidate()` requests a redraw). Shadow map is 1024 on mobile, 2048 on desktop; a replaced map is disposed. `vite-plugin-pwa` (`vite.config.js`) precaches everything, so it's installable and offline after the first visit.

### Debug hook

In dev, `window.__game` exposes `seed(n)`, `freeze()`, `step(seconds)`, `startMatch()`, `startTutorial()`, `showTitle()`, `pause()`, `resume()`, `openSettings()`, `go(state)`, `setAim({yaw, elevationDeg, teeDist})`, `kick(power)`, `autoplay(n)`, `yawToPosts()`, `state`, `app`, `renderer`, `settings`, `scores`.

## Dependencies

- **three** (0.170): rendering
- **vite** (6): dev server/bundler
- **@fontsource/barlow-condensed**: self-hosted display font (Latin 700/800)
- **vitest**, **playwright**, **vite-plugin-pwa** (dev): tests, screenshots, service worker + manifest
