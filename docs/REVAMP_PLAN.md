# Rugby Goal Kick — Revamp Plan (Phase 0)

Status: **awaiting approval**. Nothing in the codebase has been changed. This file is untracked.

Source read in full: `CLAUDE.md`, `main.js` (1,121 lines), `index.html`, `style.css`, `package.json`.
Numeric claims below were checked with a small Node script against the formulas in `main.js`.

---

## 1. Confirmed bug list

### Your 13 items

| # | Finding | Verdict | Evidence (main.js) |
|---|---|---|---|
| 1 | Posts 11.2 m wide | **Confirmed.** `UPRIGHT_SEPARATION = 5.6` places posts at x = ±5.6 and the crossbar is `5.6 * 2` long; `checkResult` tests `|x| < 5.6`. Geometry and check agree with each other but both are 2× league width. `CLAUDE.md` says `< 2.8`, so docs disagree with code too. | L52, L200–208, L855 |
| 2 | Crosshair lies | **Confirmed, and worse.** Uses a fixed 65% power, ignores wind entirely, and clamps height to `≥ CROSSBAR_HEIGHT`, so it can never show a kick going under the bar. | L699–706 |
| 3 | UP/DOWN only moves camera | **Confirmed.** `camTilt` only feeds camera height; launch angle is fixed at π/4.2 ≈ 42.9°. | L521, L656, L1080 |
| 4 | Power bar has no skill | **Confirmed.** Linear fill at 0.7/s, saturates at 100% after 1.43 s. Max power is always right: 32 m/s at 43° has a 104 m vacuum range. | L522, L1096 |
| 5 | Wind confusing | **Confirmed.** 0° = +Z = blowing toward the kicker, displayed as "N" pointing up. Strength is colour only. **Also a units bug (see A3).** | L611–617, L736–769 |
| 6 | Result logic thin | **Confirmed.** Only after landing; every under-bar kick says "TOO LOW! Hit the crossbar"; no collision with posts/bar. **Also misclassifies near-short kicks (A4).** | L805–868 |
| 7 | 8.5 s unskippable intro | **Confirmed.** 1.5 + 2.5 + 2.5 + 2.0 s, every round. | L1001–1062 |
| 8 | Raw 3 s `setTimeout` | **Confirmed.** Also keeps running in a hidden tab while rAF is paused, so rounds advance in the background. | L884–893 |
| 9 | Keyboard only, overflow, no safe areas | **Confirmed.** `#instructions` is `white-space: nowrap`; no `viewport-fit=cover`, no `env(safe-area-inset-*)`, no `touch-action`. | style.css L220, index.html L6 |
| 10 | Blurry world-space text | **Confirmed.** 512×128 Arial canvas stretched to a 14×3.5 m sprite; distance markers are 64×32 canvases. | L97–114, L383–434 |
| 11 | Missing basics | **Confirmed.** Only a Game Over overlay exists. | — |
| 12 | Visual gaps | **Mostly confirmed.** Ball is a Y-scaled sphere + one torus seam, tumbles on X and Z at fixed rates. No tone mapping. Flat ambient + one directional light. 14 separate canvas crowd textures/materials (one per tier), about 42 meshes in the stadium alone. `#try-info` CSS unused. **One correction:** fog colour *does* equal the background colour (both `0x87ceeb`). The real problem is that the sky is one flat colour with no horizon gradient, so a new gradient sky will need fog matched to its horizon colour. | L7–8, L228–331, L351–366 |
| 13 | "Law 6 Sec 3" comment | **Unverified, and I'll remove it.** I'll replace it with a plain statement of the rule ("conversion taken on a line through the grounding point, perpendicular to the goal line, at any distance") rather than citing a law number I can't confirm offline. | L586 |

### Additional findings

| # | Finding | Severity | Evidence |
|---|---|---|---|
| A1 | **Aim clamp wrap-around sends kicks backwards.** `autoAim = atan2(dx, dz)` returns a *negative* angle for any try right of centre, while `aimAngle` starts at +π. The clamp compares them numerically, so on the first aiming frame the aim snaps to `autoAim + 60°`. For a try 10 m right in round 1 that's −88.8°, which has a positive Z velocity: the ball goes **away** from the posts if the player doesn't touch the arrows. The crosshair is hidden when that happens (t < 0), and the camera keeps looking at the stale straight-ahead target, so the player can't see anything is wrong. Tries left of centre are unaffected. | **Critical** | L598–599, L1078 |
| A2 | **Left/right arrows are inverted.** RIGHT adds to `aimAngle`; around π that makes `sin` negative, so the ball's x velocity goes negative, which is screen-left for a camera looking down −Z. | High | L1076–1077, L782 |
| A3 | **Wind units bug.** Wind in m/s is used directly as an acceleration in m/s² (`0.5·wind·t²`). An 8 m/s wind accelerates the ball at 0.8 g; a full-power kick (4.4 s flight) drifts **79 m**. | High | L798–800 |
| A4 | Landing within 1 m short of the goal line skips the SHORT branch and extrapolates the analytic curve past the landing point. Reports "TOO LOW" or "WIDE" for a ball that never got there. | Medium | L820, L826–853 |
| A5 | Stuck keys: no `blur`/`visibilitychange` reset, so a key held while alt-tabbing stays down. Space held through a round transition auto-starts charging next round. | Medium | L920–960 |
| A6 | Camera freezes during `charging` (`updateCamera` isn't called) and stops dead when the ball lands, so there's no result framing. | Low | L1095–1110 |
| A7 | Ball sticks where it lands (y clamped to 0.33, no bounce or roll). | Low | L805–808 |
| A8 | Flight time accumulates capped dt (0.05 s), so below 20 fps the flight runs in slow motion while the 3 s `setTimeout` runs in real time. | Low | L986, L795 |
| A9 | Field markings aren't league-correct: yellow try line, red dead-ball line, in-goal at one end only, the 10 m-line loop redraws the try line, no post padding. The tee is a point-down brown cone. | Low (Phase 4) | L65–121, L341–346 |
| A10 | Aim-target "pulse" scales local X and Z of a `lookAt`-oriented group, so the ring stretches horizontally rather than pulsing. | Cosmetic | L993–994 |
| A11 | Shadow frustum is 100×100 m around the origin with the light at (20, 40, 20). The posts at z = −50 sit on the edge; most texels cover empty stands. | Low | L38–42 |
| A12 | Dead code and stale docs: unused `lengthAxis` param, stale state comment at L528, `CLAUDE.md` post-width figure. | Cosmetic | L257, L528 |
| A13 | Mobile basics: no `user-select: none` or `touch-action: none` on the canvas (double-tap zoom, text selection), no `100dvh`. | Medium | style.css |

Draw calls: by count about 85 meshes and sprites before shadow passes. I'll measure with `renderer.info` in Phase 1 to get a baseline.

---

## 2. Module layout

```
index.html                 # thin shell: canvas host + UI root + <noscript>
src/
  main.js                  # bootstrap: settings → renderer → world → game → ui
  config.js                # field/league dimensions, tunables (single source of truth)
  core/
    loop.js                # rAF driver, 120 Hz fixed-step accumulator, render interpolation, pause
    clock.js               # game clock + timers (after/every), pausable; replaces setTimeout
    fsm.js                 # tiny state machine (enter/update/exit, transitions as data)
    rng.js                 # mulberry32 seeded RNG
    events.js              # typed event emitter (kick, goal, miss, post-hit, ui…)
  physics/                 # PURE: no three, no DOM. Plain {x,y,z} objects.
    flight.js              # step(state, wind, dt): gravity + quadratic drag on v_rel = v − wind
    simulate.js            # simulate(kick, wind, opts) → samples, crossing, events (shared by game AND preview)
    collide.js             # swept sphere vs upright/crossbar cylinders, restitution
    scoring.js             # classify(result) → GOAL | GOAL_OFF_POST | WIDE_L | WIDE_R | SHORT | UNDER_BAR | POST_OUT
    conversion.js          # conversion line, subtended angle, suggested tee distance
    wind.js                # kicker-relative decomposition + label text ("Crosswind, right to left, 4 m/s")
    explain.js             # "why" line: re-sim with zero wind → drift in metres
  game/
    round.js               # seeded round generator (try x, wind, preview tier) per mode/difficulty
    session.js             # kick log, score, streaks, accuracy
  modes/
    match.js  practice.js  pressure.js
  world/                   # three.js only
    renderer.js            # renderer, DPR cap, adaptive resolution, tone mapping, resize
    lookdev.js             # preset system (sky, fog, lights, palette, post on/off)
    sky.js  lighting.js  field.js  posts.js  stadium.js  crowd.js  flags.js  scenery.js
    ball.js  tee.js  aimPreview.js  camera.js  fx.js (confetti, slow-mo hooks)
  input/
    intents.js             # unified intents: aim, elevation, tee, meterPress, drag{…}, confirm, back, pause
    keyboard.js  pointer.js  gamepad.js  bindings.js (remap + persistence)
  ui/
    dom.js  hud.js  wind-widget.js  meter.js  toast.js
    screens/ title.js  pause.js  settings.js  result.js  summary.js  tutorial.js
  audio/
    engine.js              # context, unlock, buses (master/sfx/music/crowd), mute
    sfx.js                 # synthesised thump, whoosh, doink, ticks, cheer/groan
    crowd.js  music.js     # crowd bed with tension; optional kundu-style loop
  settings/
    settings.js  storage.js  # versioned localStorage with in-memory fallback + migration
  debug/
    hook.js                # window.__game in import.meta.env.DEV only
styles/ tokens.css  hud.css  screens.css
test/   *.test.js          # Vitest: physics, scoring, conversion, wind labels, rng, storage
scripts/screenshots.mjs    # Playwright: dev server + 3 viewports × states
```

Rule: `physics/`, `game/`, `core/rng.js`, `core/clock.js` and `settings/storage.js` import nothing from three or the DOM, so they're unit-testable in Node.

---

## 3. Kick model and control scheme

### Model (same for every input)
A kick is `{ teeDistance, aimYaw, elevation, power }`. The preview and the real flight both call `simulate()` with the same wind, so they can't disagree. There is **no hidden randomness**. Difficulty comes from wind, try position, meter speed and how much of the preview you're shown.

- **Elevation:** 25°–55°, default 38°, persists between kicks.
- **Power:** 0–100% maps to launch speed (about 12–31 m/s after tuning).
- **Preview tiers:** Full arc + posts marker → half arc + marker → marker only → nothing (Pressure's top tier). Practice lets you choose.

### Per input

| Phase | Touch (portrait/landscape) | Mouse | Keyboard (default, remappable) | Gamepad |
|---|---|---|---|---|
| Tee placement | Drag the tee along the conversion line (overhead camera); tap **Kick from here** | Same as touch | ↑/↓ (or W/S) move tee; Space/Enter confirm | Left stick Y moves tee; A confirm |
| Aim | Drag **back** from the ball (slingshot). Sideways angle = aim, pull length = power. Preview updates live; release kicks, drag back onto the ball to cancel | Same drag; wheel = elevation | ←/→ aim (Shift = fine), ↑/↓ elevation | Left stick X aim, Y elevation (right stick = fine aim) |
| Elevation | Vertical slider on the thumb-side edge (mirrors with the handedness setting) | Wheel or the same slider | ↑/↓ | Left stick Y |
| Power | Pull length | Pull length | **Timing meter:** Space starts it, power ping-pongs 0→100→0; Space again locks it and kicks. The posts marker rides the live meter value when the preview tier allows | A or RT, same meter |
| Result | Tap anywhere / **Next** | Click | Space/Enter | A |
| Pause | ⏸ button (44 px, top edge) or auto on tab hide | same | Esc / P | Start |

**Why a separate elevation control on touch, not a swipe curve?** A slingshot drag gives a continuous, previewable input, which a flick can't (a flick commits before you see the arc). Squeezing a third dimension into the same drag (vertical offset or curvature) makes power and elevation fight each other on a small screen. Elevation is a technique choice you set occasionally, so a persistent slider costs no extra gesture on most kicks and keeps the kick itself a single one-handed drag.

Settings: aim sensitivity, meter speed (assist), preview-length assist, handedness, invert-aim toggle, key remapping.

---

## 4. Screen flow

```
Load ─▶ TITLE (mode cards on the title itself: [ PLAY MATCH ]  Practice  Pressure   ⚙  ?)
          │ tap 1 (also unlocks audio)
          ▼
       ESTABLISHING SHOT  (first round of session: ≤3 s fly-over; later rounds: ~1 s cut; tap/Space skips)
          ▼
       TEE PLACEMENT  (suggested spot pre-set; angle wedge drawn to the posts)
          │ tap 2 "Kick from here"
          ▼
       AIM ─▶ FLIGHT ─▶ RESULT (outcome · points · why; auto-advance 2.5 s or tap)
          ▲                          │
          └──────── next kick ◀──────┤
                                     ▼ (end of match / first miss in Pressure)
                                  SUMMARY (per-kick table, accuracy, best comparison) ─▶ Again / Title
PAUSE overlays any state: Resume · Restart · Settings · How to play · Quit
```

- Page load to first kick = **2 taps** (Play, Kick from here). A setting "Always use suggested tee" removes tap 2 on later kicks.
- **Tutorial:** on first ever launch, the first Match kick runs with coach marks (drag here → watch the arc → release). There's no text wall; *How to play* replays the tutorial kick.
- Mode select lives on the Title screen rather than a separate screen, which keeps the two-tap budget.

---

## 5. HUD layout

Aiming state shown. In flight, only the pause button and a faint wind arrow remain. Result state shows the outcome card in the centre-top third, clear of the ball.

**Portrait 390×844**
```
┌──────────────────────────────┐  ← safe-area top
│ KICK 3/10   6 PTS       [⏸] │
│      ┌──────────────────┐    │
│      │ ↖  Cross R→L 4m/s│    │   wind card: arrow (screen-space, kicker view)
│      │    ▮▮▮▯▯ Moderate│    │   + text + 5-step bars (not colour-only)
│      └──────────────────┘    │
│             H  H             │   posts in upper third
│            [◎]               │   "at the posts" marker
│               .·´            │   arc
│            .´                │
│                          ┃ ▲ │   elevation slider, thumb side,
│        22 m · 31°        ┃ ● │   40–75% height (not the corner)
│           (ball)         ┃ ▼ │
│      drag back to kick   38° │
└──────────────────────────────┘  ← safe-area bottom (home indicator clear)
```

**Landscape 844×390**
```
┌────────────────────────────────────────────────────────┐
│ KICK 3/10 · 6 PTS    [↖ Cross R→L 4 m/s ▮▮▮▯▯]     [⏸]  │
│                                                  ┃ ▲   │
│                    H   H                         ┃ ●   │
│   22 m · 31°        [◎]                          ┃ ▼   │
│                   .·´                            38°   │
│               (ball)                                   │
└────────────────────────────────────────────────────────┘
  safe-area left/right respected for notches; everything ≥44 px targets
```

**Desktop 1440×900:** landscape layout at larger type scale, plus a small key-hint line at the bottom ("← → aim · ↑ ↓ height · Space meter"). The keyboard meter appears bottom-centre only once a key is pressed. Input hints switch to whichever device was used last.

Type: one self-hosted display font (`@fontsource`, Latin subset, 1–2 weights) for numbers and headings, system UI font for body. Text sits on translucent dark pills; minimum 16 px body, 14 px only for secondary labels.

---

## 6. Physics targets (Vitest-asserted)

- 120 Hz semi-implicit Euler; `a = g − k·|v−w|·(v−w)`, with k tuned around 0.006–0.01 m⁻¹ (rugby ball about 0.41 kg).
- Goal plane detected by segment crossing each step; the first crossing heading downfield decides the result (league: a ball that has passed over stays a goal).
- Uprights and crossbar are cylinders (r ≈ 0.06 m), ball is a sphere approximation (r ≈ 0.11 m), swept test per step, restitution ≈ 0.5. It can bounce in (Goal – off the post) or out.
- Tests: a clean 35 m straight kick is makeable across a wide power band, a 45 m kick at a wide angle into a 7 m/s headwind has a narrow window, and crosswind pushes the ball in the wind's direction. Also covered: 5.5 m width at both edges, the crossbar at 3 m, post and bar hits, the suggested tee maximising the subtended angle, and seeded rounds reproducing exactly.

---

## 7. Phase sequencing and one conflict to resolve

**Conflict:** Phase 1 says "without changing behaviour", but also asks for tests of the new post width and upright/crossbar hits, which are Phase 2 features.
**Proposal:**
- Phase 1a: pure split, behaviour-identical.
- Phase 1b: small bug-fix commit covering post width (#1), aim wrap-around (A1), inverted arrows (A2), stuck keys (A5), clock-driven timers. Tests for width, plane crossing, wind direction and the seeded generator land here.
- Phase 2: upright and crossbar collision tests, alongside the collision code.

Checkpoints: ⏸ after this plan, ⏸ at Phase 4 art-direction pick. Commit per phase on `revamp`, PR at the end.

---

## 8. Risks

| Risk | Mitigation |
|---|---|
| Touch drag feel needs iteration; hard to judge from screenshots | All gesture constants live in `config.js`; the dev hook can inject synthetic drags; I'll describe the feel honestly and ask you to try it on a real phone at the end of Phase 2 |
| Headless WebGL FPS is not phone FPS | Playwright with SwiftShader plus CDP CPU throttling gives **relative** numbers between directions only. I'll report them as such and add an in-game FPS/draw-call overlay (dev) so you can check on a real device |
| Bloom (direction B) needs `EffectComposer`: more bundle, more fill-rate on phones | Prefer faked glow (additive sprites on floodlights); real post-processing only as a toggle, off by default on mobile |
| Bundle size (three is the bulk) | Named imports only, no addons unless needed, font subset, PWA precache. Report gzip size each phase |
| Physics tuning vs "35 m easy / 45 m headwind hard" | Encode as tests; tune k, speed range and elevation range until they pass |
| Scope is large (7 phases) | Strict phase order; Daily Challenge only if everything else is done |
| iOS quirks: audio unlock, no `navigator.vibrate`, `100vh`, safe areas | Unlock on first gesture, feature-detect haptics, `dvh` + `env()`; test at the three sizes in WebKit via Playwright as well as Chromium |
| `localStorage` blocked (private mode) | Versioned storage wrapper with in-memory fallback and try/catch everywhere |
| Cultural motifs | Abstract geometric bands (zigzag, chevron, diamond) in red/black/gold. No national flag, emblem, bird-of-paradise crest, clan-specific or sacred designs; no real teams. Fictional clubs, e.g. "Highlands Hornbills" vs "Coastal Crocs" (placeholder names, open to your picks). Kundu-style loop is a generic synthesised hand-drum pattern |
| Art-ref URLs (CloudFront) may expire | Download them at the start of Phase 4; saved to `docs/art-refs/`, reference only |

---

## 9. Decisions I'm proposing (tell me if any are wrong)

1. Kick distance becomes the player's choice (tee placement), so Match difficulty scales try width, wind and preview tier, no longer a forced kick distance.
2. Keyboard/gamepad meter is **single-stage oscillating power** (no accuracy stage), since aim is already set precisely by arrows and an accuracy stage would add error touch players don't have.
3. Touch elevation is a persistent slider (reasons in §3).
4. No hidden randomness anywhere.
5. Remove the "Law 6 Sec 3" citation.
6. Upright height: current code uses 15 m. I'll use 16 m (commonly cited league minimum) unless you have a source that says otherwise. It only matters visually, since scoring uses the vertical extension of the posts.
