# Rugby Goal Kick — Revamp Brief

You are revamping **Rugby Goal Kick**, a small 3D web game in this repo (Three.js 0.170 + Vite 6, vanilla JS; nearly all logic lives in `main.js`, ~1,120 lines). Read `CLAUDE.md`, `main.js`, `index.html` and `style.css` in full before planning anything.

The goal is a game that feels like a polished, modern mobile-and-desktop sports game: a satisfying kick, a HUD that says only what matters, fast restarts, and a clear sense of place. It should also be honest: rules, physics, and aiming aids that behave as the player expects.

## Decisions already made (do not re-ask)

- **Code: rugby league, with a Papua New Guinea flavour.** Rugby league is PNG's national sport. Use league dimensions: posts **5.5 m apart**, crossbar **3 m**, try 4 pts / conversion 2 pts, 68 m field width, in-goal 6–11 m. Conversions are taken on a line perpendicular to the goal line through the point where the try was grounded, at a distance the kicker chooses.
  - PNG flavour means colour, crowd, sound and setting (red/black/gold palette, a tropical evening, hills, a local-ground feel, Melanesian geometric patterns on banners). **No real team names, logos, crests or trademarks** (e.g. no Kumuls/Hunters branding, no NRL marks). Invent fictional team names. Treat cultural motifs respectfully and keep them decorative, not caricature.
- **Platforms: mobile and desktop, both first-class.** Touch in portrait and landscape; mouse; keyboard; gamepad. Target a mid-range Android phone on a slow connection: small bundle, no large downloads, works offline once loaded.
- **Scope: polish + modes.** Fix the bugs, rebuild controls, HUD, menus, feedback and audio, and add **Practice** and **Pressure** modes plus locally saved best scores. No kicker character, career mode or unlockables in this pass.
- **Art direction: you propose it.** See Phase 4.

## What I already found (verify each, don't take my word)

1. **Posts are twice as wide as they should be.** `UPRIGHT_SEPARATION = 5.6` is used as the *half*-width (posts at x = ±5.6, and `checkResult` tests `|x| < 5.6`), so the goal is 11.2 m wide. `CLAUDE.md` says `|x| < 2.8`. Fix to league 5.5 m (±2.75) and make the check agree with the geometry.
2. **The crosshair lies.** `updateAimTarget()` estimates height at the posts using a fixed 65% power, so it doesn't reflect the actual kick.
3. **UP/DOWN "tilt" only moves the camera.** Launch elevation is hard-coded (`KICK_ANGLE_RAD = π/4.2`, about 43°); the player can't control trajectory height.
4. **The power bar has no skill in it.** It fills linearly and sits at 100%, so holding Space always gives maximum power.
5. **Wind is confusing.** The compass shows world N/E/S/W that mean nothing from the kicker's view (0° "N" is +Z, which blows *toward* the kicker). Strength is shown by colour alone. Wind is modelled as a constant acceleration rather than as air the ball moves through.
6. **Result logic is thin.** Evaluated only after landing; any kick under the bar reads "TOO LOW! Hit the crossbar"; the ball passes through posts and crossbar; nothing hits the uprights.
7. **About 8.5 s of unskippable intro every round** (1.5 + 2.5 + 2.5 + 2.0 s), times 10 rounds.
8. **Round transitions use a raw 3 s `setTimeout`.** No pause, not aware of tab visibility, no way to skip.
9. **Keyboard only.** No touch, mouse or gamepad. Instructions use `white-space: nowrap` and overflow on narrow screens. No safe-area handling.
10. **World-space text** (try/kick labels) is drawn to a canvas sprite in Arial, which is blurry and hard to read at distance.
11. **Missing basics:** title screen, pause, settings, audio, tutorial, saved scores, any accessibility options.
12. **Visual gaps:** the "rugby ball" is a scaled sphere with one torus seam and tumbles on arbitrary axes; no tone mapping; flat lighting; fog colour doesn't relate to the sky; one canvas crowd texture per stand tier (many draw calls); unused `#try-info` CSS.
13. The comment citing "Rugby League Rules (Law 6 Sec 3)" in `setupRound()` is unverified. Remove it or check it.

Add anything else you find to this list in your plan.

## How to work

- **Branch:** create `revamp` and commit at the end of each phase with a clear message. Open a PR when done.
- **Stop and show me** at the checkpoints marked ⏸. Otherwise make reasonable calls and note them in the PR description.
- **Verify visually, not just by build.** Add Playwright as a dev dependency and write a small script that starts the dev server and captures screenshots at **390×844 (phone portrait)**, **844×390 (phone landscape)** and **1440×900 (desktop)** for the title screen, aiming, mid-flight and result states. Read the screenshots yourself and fix what looks wrong before calling a phase done. Expose a debug hook (e.g. `window.__game`, dev builds only) so the script can jump to states and seed rounds deterministically.
- **Keep dependencies lean.** Three.js and Vite stay. Acceptable additions: Vitest, Playwright, `vite-plugin-pwa`, a self-hosted font via `@fontsource/*`. Anything else, ask first. No external model/texture downloads; keep geometry procedural or generated in code.

## Phase 0: Audit and plan ⏸

Produce a written plan: the confirmed bug list, the module layout, the control scheme per input, the screen flow, the HUD layout for portrait and landscape, and the risks. Wait for my OK.

## Phase 1: Restructure without changing behaviour

Split `main.js` into ES modules, for example: `src/core/` (loop, fixed-timestep, state machine, RNG, events), `src/physics/` (pure ball-flight and scoring), `src/world/` (field, posts, stadium, crowd, sky, lighting), `src/input/` (unified intent from touch/mouse/keyboard/gamepad), `src/ui/` (DOM HUD and screens), `src/audio/`, `src/modes/`, `src/settings/`. Physics and scoring must be pure functions with no Three.js or DOM imports so they can be unit-tested. Add Vitest and cover: goal-plane crossing, the new post width, upright and crossbar hits, wind effect direction, and a seeded round generator. Replace `setTimeout` flow with timers driven by the game clock so pause works everywhere.

## Phase 2: The kick (core feel and honesty)

- **Physics:** fixed-timestep integration (e.g. 120 Hz, semi-implicit Euler) with gravity and **quadratic air drag computed against velocity relative to the wind**, so wind matters more the longer the ball is in the air. Detect the goal plane by segment crossing during flight, not after landing. Add collision with uprights and crossbar (a satisfying "doink" bounce that can still go over or out). Tune constants so a clean 35 m kick is comfortably makeable and a 45 m wide-angle kick into a headwind is hard.
- **Kick inputs:** direction, power and elevation must all be player-controlled and must all show up in the preview.
  - **Touch/mouse:** drag-back-and-release or swipe on the ball. Swipe direction = aim, length/speed = power, and a curve or vertical component = elevation (or a separate simple elevation control, your call; justify it). Must feel good one-handed in portrait.
  - **Keyboard:** arrows aim and set elevation; Space uses a **timing meter** (oscillating or two-stage power/accuracy), so power is a skill, not a hold.
  - **Gamepad:** left stick aim/elevation, trigger or A for the meter.
  - **Remappable keys** and adjustable aim sensitivity.
- **Tee placement:** after the try, the player chooses how far back along the conversion line to place the tee (drag it on touch, arrows on keyboard), with a sensible suggested spot. This is a real league decision (step back to widen the angle) and should be the game's main strategic choice.
- **Aim preview:** a trajectory arc and an "at the posts" marker that reflect the current direction, power, elevation **and wind**, scaled by difficulty: full arc in Practice and early rounds, shorter or fading arc later, off in Pressure's hardest tier. Never show a preview that disagrees with the physics.
- **Wind:** present it relative to the kicker: an arrow in screen space showing where the ball will be pushed, plus a text label ("Crosswind, right to left, 4 m/s") and a strength level that isn't colour-only. Make corner flags, crowd banners and any particles agree with it.
- **Result states:** Goal, Wide left/right, Short, Under the bar, Hit the post (in/out). Each gets distinct copy, sound and visuals.

## Phase 3: Flow, screens and HUD

- **Flow:** Title → Mode select → Kick → Result → Next / Summary. From opening the page to the first kick should take **two taps at most**. Everything between kicks is skippable with a tap or key, and the intro fly-over plays only on a player's first round of a session (or when enabled in settings). Keep a short, cinematic establishing shot: where the try was scored, where the tee is, the wind.
- **HUD (DOM overlay, not canvas text):** show only what the current state needs.
  - Aiming: kick number, score, wind, tee distance and angle, the kick control.
  - In flight: nearly nothing.
  - Result: outcome, points, and a short "why" (e.g. "Wind carried it 1.8 m left").
  - Respect `env(safe-area-inset-*)`; separate portrait and landscape layouts; touch targets at least 44×44 px; nothing important in the corners a thumb covers.
- **Screens:** Pause (Esc / P / on-screen button / auto on tab hide), Settings, How to play (an interactive first-kick tutorial, not a wall of text), End-of-match summary with a per-kick breakdown and best-score comparison.
- **Typography:** one self-hosted display font plus the system UI font, large readable sizes, high contrast on a translucent backing so text reads over any sky.

## Phase 4: Art direction ⏸

Build a lightweight **look-dev preset system** (sky, fog, lighting, palette, post-processing on/off) and prototype **three directions**, each rendered in-engine with the Phase 1 geometry and captured at all three screenshot sizes:

- **A. Stylised golden hour:** low-poly, warm sunset, long shadows, palms and hills beyond a local ground.
- **B. Floodlit night:** broadcast mood, light haze, restrained bloom.
- **C. Flat graphic:** outlined, flat-shaded, poster-like colours with Melanesian pattern banners.

Rough AI mood references for each are below. Download them into `docs/art-refs/` for comparison only; don't ship or trace them, and treat their detail loosely (they are low-fidelity sketches):

- A: https://d8j0ntlcm91z4.cloudfront.net/user_3HJHrSXEICuO7S5oRM7gvHpCaiL/hf_20260928_031857_60a1fee9-04b1-4e8c-86b3-afef57d4fab2.png
- B: https://d8j0ntlcm91z4.cloudfront.net/user_3HJHrSXEICuO7S5oRM7gvHpCaiL/hf_20260928_031857_f3a36267-15e5-4a99-8082-71818494257c.png
- C: https://d8j0ntlcm91z4.cloudfront.net/user_3HJHrSXEICuO7S5oRM7gvHpCaiL/hf_20260928_031857_d28165af-dbfc-4cef-a7ac-e72fa3359cd3.png
- Portrait HUD mood: https://d8j0ntlcm91z4.cloudfront.net/user_3HJHrSXEICuO7S5oRM7gvHpCaiL/hf_20260928_031857_3daf37af-4100-4ec1-91a0-55d72146476e.png

Recommend one direction with reasons (readability of posts and ball against the sky, phone frame rate, how well it carries the PNG setting), measure FPS for each on a throttled profile, and **wait for my pick**. Then build it out fully:

- A proper rugby ball: a prolate spheroid via `LatheGeometry` with panel seams, spinning end-over-end or spiralling according to the kick type.
- Field: mowing stripes, correct league markings (try line, 10 m lines, halfway, dead-ball line, posts padding), a kicking tee that looks like a tee.
- Crowd: `InstancedMesh` or a few batched meshes, not one texture per tier; simple idle and cheer animation.
- Lighting and colour: `ACESFilmic` or `AgX` tone mapping, a gradient or procedural sky that matches the fog, and shadow bounds that cover only the play area.
- Colour and UI tokens (CSS custom properties) that match the chosen look.

## Phase 5: Feedback, juice and audio

- **Feedback on every input:** tee drag, aim change, meter start/stop, kick contact.
- **On goal:** a brief slow-motion as the ball crosses the plane, camera follow that frames the posts, a crowd roar, floating "+2", confetti in the palette.
- **On a miss:** distinct and quick, never punishing to sit through.
- **Restraint:** keep camera shake and flashes short and subtle, all behind a "Reduce motion" setting that also honours `prefers-reduced-motion`. No flicker faster than 3 Hz.
- **Audio:** Web Audio, synthesised or self-made, nothing copyrighted. Include a boot thump, whoosh, post "doink", crowd bed that swells with tension, cheer and groan, UI ticks, and an optional kundu-style drum loop on menus. Unlock audio on first interaction. Separate Master/SFX/Music/Crowd volumes plus a mute toggle. Any meaningful sound must have a visual equivalent. Haptics via `navigator.vibrate` where supported, with a toggle.

## Phase 6: Modes and persistence

- **Match (classic):** 10 conversions with rising difficulty (try position, wind, preview length). Score in league points (2 per goal), show accuracy %, save best score and best streak.
- **Practice:** choose the try spot, wind (or none), and preview level; unlimited kicks; show landing and crossing points for the last several kicks as a heat map at the posts.
- **Pressure:** consecutive kicks until the first miss, getting harder each kick, with an in-game shot clock tuned for fun. Save best streak.
- **Stretch (only if everything above is done):** a Daily Challenge seeded from the date.
- Persist settings and scores in `localStorage`, versioned, with graceful fallback when storage is unavailable.

## Phase 7: Accessibility, performance, shipping

- **Accessibility**, following the Game Accessibility Guidelines basics:
  - Remappable controls and adjustable sensitivity.
  - An assist option (longer preview, slower meter).
  - No information by colour alone.
  - Readable default text size plus a text-size setting.
  - High contrast.
  - Reduced motion.
  - All settings remembered.
  - Menus fully usable with keyboard, gamepad and screen reader (real buttons, labels, visible focus rings).
  - Game start reachable without menu diving.
- **Performance:**
  - Target **60 fps on a mid-range phone**, under ~100 draw calls.
  - Cap `devicePixelRatio` at 2 with an adaptive resolution fallback when frame time degrades.
  - Shadow map 512–1024 on mobile, and don't update it when nothing moves.
  - Dispose anything you rebuild.
  - Pause rendering when the tab is hidden.
  - Report the production bundle size and keep it small.
- **Offline:** make it an installable PWA (`vite-plugin-pwa`) with a proper icon and offline caching.
- **Docs:** rewrite `CLAUDE.md` for the new architecture and add a `README.md` with controls, modes, how to run tests and screenshots.

## Definition of done

- The bug list is fixed, and each fix has either a unit test or a screenshot.
- `npm run build`, `npm test` and the screenshot script all pass cleanly.
- Every screen looks right at all three sizes in the screenshots you checked.
- A new player on a phone can go from page load to first kick in two taps and understand why each kick went where it did.
- The PR description lists what changed, any decisions you made on my behalf, known issues, and anything you'd do next.
