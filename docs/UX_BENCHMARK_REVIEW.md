# UI/UX Benchmark Review

A scan of the whole project (code, HUD, flow, screenshots) compared with the best-in-class games in the same space. Each item says what the game does now, what the benchmark does, and what to build. Items are ranked at the end.

Date: 2026-10-05 · Code at `54a92be` (main)

---

## 1. Where the game stands

The foundation is strong. Most indie sports games do not get these right:

| Area | Current state | Verdict |
|---|---|---|
| Honesty of aim | One `simulate()` drives the preview, the flight and the result. No hidden randomness. | **Best in class.** Golf Clash and Flick Kick do not promise this. |
| Feedback "why" | The result card explains the result, e.g. "Wind carried it 1.3 m left · Missed by 0.4 m" (`physics/explain.js`). | **Best in class.** Few games teach from every miss. |
| Platforms | Touch slingshot, keyboard and timing meter, gamepad. The hints change with the device. PWA, works offline. | Strong |
| Accessibility | Text scale, high contrast, reduced motion, remappable keys, assists, screen reader announcements, shape plus colour for outcomes. | Strong for a web game |
| Juice | Synthesised SFX, crowd tension bed, haptics, shake, confetti, slow motion through the posts, "Doink!" badge. | Good |
| Time to first kick | Two taps from page load. | Excellent |
| Modes | Match, Daily, Practice (with heat map), Pressure (shot clock), Tutorial. | Good breadth, shallow depth |

The gaps are in **depth and retention**, not in the core. There is no progression or reason to come back, no social or sharing loop, no kicker on screen, and little skill expression once the preview is gone. There is also no visual record of past kicks beyond a text table.

### Files scanned

`index.html`, `style.css`, `src/main.js`, `src/game/*`, `src/ui/*`, `src/modes/modes.js`, `src/settings/*`, `src/input/*`, `src/physics/explain.js`, `src/world/aimPreview.js`, `src/world/cameraRig.js`, `src/audio/*`, `vite.config.js`, and the screenshots in `docs/screenshots/`.

---

## 2. Benchmark set

| Game | Why it is a benchmark | What to learn from it |
|---|---|---|
| **Golf Clash** (Playdemic) | The leading mobile precision-shot game: wind, aim, power, accuracy | Wind guide with compensation rings, a "Perfect" accuracy needle, curl, 1v1 matches, tournaments, collectables |
| **Flick Kick Rugby / Football** (PikPok) | The genre's leading mobile kicker | Swipe-path curve, quick arcade loops, time attack, moving targets |
| **Rugby League 26 / RL Live 4, Rugby 25** (Big Ant) | Console rugby goal kicking | Tee placement along the line, aim arc, two-stage power and accuracy, a kicker with a routine and a run-up, broadcast presentation |
| **PGA Tour 2K / EA Sports golf** | Swing feel and shot feedback | Tempo grading ("Perfect / Fast / Slow"), shot tracer, instant replay, shot stats |
| **Madden / NFL kicking** | Pressure kicking UX | Two-click power and accuracy meter, the "icing" mechanic, stadium noise under pressure |
| **Score! Hero / Football Strike** | Mobile football set pieces | Handcrafted levels with 3-star ratings, 1v1 free-kick duels, cosmetic customisation |
| **Angry Birds** | The slingshot touch archetype | Ghost trail of the previous shot, a clear pull-back affordance |
| **Wordle / daily puzzles** | Daily-challenge retention | Spoiler-free shareable result grid, day streak, countdown to the next puzzle |
| **The Last of Us Part II, Celeste** | Accessibility benchmarks | Granular assists without stigma, audio cues for visual information, presets |

---

## 3. Gap analysis

Each item has an **impact** rating (H/M/L) and an **effort** rating (S/M/L).

### 3.1 Core kick: skill expression

**3.1.1 Touch kicks have no execution error.** Impact H · Effort M
- *Now:* Slingshot drag sets yaw and power exactly (`game/game.js` `dragState`). With the full preview (rounds 1–3), a touch player can line the dots up and never miss. With no preview (rounds 8–10), skill means reading the wind. The touch kick has no timing or steadiness skill. The keyboard meter has one, so the two inputs are unequal.
- *Benchmark:* Golf Clash adds an accuracy needle after power. PGA 2K grades tempo. Madden uses a second click for accuracy.
- *Build:* Add an optional **strike-quality** layer that is still deterministic and fair. Release speed or drag straightness sets a strike grade (Pure, Good, Shanked). The grade nudges yaw by a known amount, and the preview shows that range as a fan before the kick. Show the grade on the result card ("Pure strike"). Keep "one simulation" intact: the error is decided at contact and then simulated.

**3.1.2 No curve or spin.** Impact M · Effort M
- *Now:* Every kick flies straight apart from wind. The only spin is cosmetic, spiral vs end-over-end (`SPIRAL_BELOW_DEG`).
- *Benchmark:* Flick Kick's signature is a curved swipe. Real league kickers use a draw or a fade to hold a ball against a crosswind.
- *Build:* Add a **hook/fade** input: drag path curvature on touch, a modifier key or the right stick on desktop. In `simulate.js` it becomes a small Magnus-style lateral acceleration that decays over the flight. This adds a real decision against crosswinds ("curve it into the wind or aim off?").

**3.1.3 The tee decision lacks tension.** Impact M · Effort S
- *Now:* The suggested spot is close to optimal (`suggestedTeeDistance`). The summary screenshot shows 12 m on 8 of 10 kicks. Few players move the tee, so the `tee` phase feels like a confirm step.
- *Benchmark:* Big Ant makes placement a trade-off between angle and distance, and wind matters more on long kicks.
- *Build:* Show a live **make-difficulty readout** as the tee moves, such as "Angle 15.9° · Distance 32 m · ★★☆☆". Make wind effects grow with distance (they already do physically) and say so in the copy. Consider a small bonus for kicking from further back in score-attack modes, so moving the tee is a risk/reward choice.

**3.1.4 Pressure has no physical cost.** Impact M · Effort S
- *Now:* The Pressure shot clock only removes time. Aiming is just as steady at 2 s left as at 25 s.
- *Benchmark:* Golf Clash and sniper games add aim sway or a heartbeat under pressure. Madden adds "icing".
- *Build:* In Pressure and late Match rounds, add a slight, readable **aim sway** that grows as the clock runs down. Show it as a visual heartbeat ring and a crowd swell. Reduce motion and the assists should damp it.

### 3.2 Presentation and camera

**3.2.1 There is no kicker.** Impact H · Effort L
- *Now:* Only a ball on a tee. There is no player, run-up or routine. The establish fly-in pans over an empty field.
- *Benchmark:* Every console rugby and NFL game shows the kicker. Kicker routines (the step-back count, the glance up) are the tension beats on TV.
- *Build:* Add a stylised low-poly kicker (to match the art direction) with idle, step-back, run-up and strike animations. A first version can be a simple capsule figure with a procedural run-up. Time the strike to the existing `kick` event. Add an optional **routine beat**: steps back, looks at the posts, crowd hushes.

**3.2.2 No replay.** Impact H · Effort M
- *Now:* Each kick plays once. The result card then covers the posts (see the result screenshot), so the player cannot see where the ball actually crossed.
- *Benchmark:* PGA 2K's instant replay and tracer, the TV-style reverse-angle replay of a conversion, and Golf Clash's shareable replays.
- *Build:* The flight is already stored as `result.samples`, so a replay is cheap. Add a **"Replay" button** on the result card and the summary rows. Play from 2–3 camera angles (behind the posts, side-on, kicker POV) with a **shot tracer**. Since playback is deterministic, a replay can also be exported as a short clip later (see 3.6.2).

**3.2.3 The result card hides the outcome.** Impact M · Effort S
- *Now:* The `.result` card sits at 22% from the top (16% in landscape), over the posts and the crossing point. "+2" shows twice, on the card and as the float pop (`main.js:229`).
- *Build:* Move the card to the lower third, or dock it to the side in landscape. Keep the posts and the **goal-plane crossing marker** visible: draw a dot where the ball crossed, with a short tracer. Remove the duplicate "+2" from either the card or the float.

**3.2.4 Low crowd and stadium fidelity.** Impact M · Effort M
- *Now:* The crowd is blocky instanced boxes and the stands are flat tiers (see the screenshots). This is the weakest visual next to the strong field, posts and lighting.
- *Build:* Use billboarded crowd impostors with a few poses and team colours, a "Mexican wave" idle, and flags and banners in the stands. Add LED ad-board animation on the pattern boards after goals.

**3.2.5 Little variety in weather and time of day.** Impact M · Effort M
- *Now:* Look B (floodlit night) is the only look in play. A and C exist only for comparison (`?look=A|C`).
- *Build:* Ship the golden-hour preset as a playable condition. Add rain (wet ball: slightly more drag, a skid on landing, visual streaks in the floodlights) and visible gusts. Vary conditions by round in Match and expose them in Practice.

### 3.3 HUD and information design

**3.3.1 Jargon in the aim info.** Impact M · Effort S
- *Now:* "12 m out · target 15.9°". "Target" here means the angle the posts open up, which is not obvious.
- *Build:* Change it to "Posts open 15.9°", or replace the number with a small **angle wedge icon** that widens and narrows. The tee guide already draws this wedge in the world.

**3.3.2 Wind guidance is all text and no compensation.** Impact M · Effort M
- *Now:* The wind card gives a direction phrase, 5 bars and m/s. The arrow is screen-relative. Good, but the player still has to convert wind into aim in their head when the preview is off.
- *Benchmark:* Golf Clash's wind guide shows "rings" of compensation per wind unit, which players learn and discuss as a skill.
- *Build:* Add an optional **aim-off guide**. Tick marks on a goal-plane ruler show "1 tick = ~1 m drift at this distance". In the world, add a pennant on top of each upright that streams with the wind (real grounds have these), plus drifting particles in gusts.

**3.3.3 Elevation slider placement in landscape.** Impact L · Effort S
- *Now:* The vertical slider covers the right stand. It is fine on phones but large on desktop, where the mouse wheel already sets height.
- *Build:* Collapse it to a compact pill on desktop (`data-device=mouse|keyboard`) and expand it on hover or focus. Keep the full size on touch.

**3.3.4 Results auto-advance after 2.8 s.** Impact M · Effort S
- *Now:* `RESULT_HOLD = 2.8` (`game/game.js:35`). The game moves on even on a miss, when the "why" line is most useful.
- *Build:* Hold longer on misses (~4 s) or wait for a tap, with a setting: "Auto-advance: on / after goals only / off". Show a thin progress ring on the "Next kick" button so the auto-advance is visible.

### 3.4 Flow and safety

**3.4.1 Destructive menu actions have no confirmation.** Impact M · Effort S
- *Now:* "Restart" and "Quit to title" act at once (`main.js:384`, `main.js:393`). Pause is one Esc or B press away, so a wrong press mid-match loses progress.
- *Build:* Ask for a quick inline confirmation ("Quit match? Progress is lost · Quit / Cancel") when at least one kick has been taken.

**3.4.2 No loading state.** Impact M · Effort S
- *Now:* `body` is black until the three.js bundle parses and the scene builds. On slow phones the first visit shows a blank screen.
- *Build:* Inline a lightweight HTML/CSS splash in `index.html` (logo, posts silhouette, progress shimmer) and remove it on the first rendered frame. Add a `<noscript>` message.

**3.4.3 No resume after the tab is closed.** Impact L · Effort S
- *Now:* Closing the tab or the PWA mid-match loses the match.
- *Build:* Save `{mode, seed, round, log}` to storage after each result and offer "Continue match (kick 6/10)" on the title.

**3.4.4 Settings is one long scrolling list.** Impact L · Effort S
- *Build:* Add tabs or a segmented header (Controls · Assists · Sound · Accessibility · Graphics · Keys). Add **presets** for assists ("Relaxed / Standard / Pro"), as the TLOU2 accessibility presets do.

### 3.5 Modes and content

**3.5.1 Match is the same every time.** Impact H · Effort M
- *Now:* 10 kicks with a random try spot and wind, the same fixture name every time ("Highlands Hornbills v Coastal Crocs").
- *Benchmark:* Score! Hero and Flick Kick use authored situations and score attack.
- *Build:* Add **match context**. The scoreline and clock make some conversions matter more ("Down by 4, 2 min left. This one levels it"). Add a **sudden-death golden point** finish when a match is tied. Add a short **season or cup mode**: 8 fixtures against named teams, a ladder, a final under rain.

**3.5.2 No authored challenges.** Impact H · Effort M
- *Build:* A **Challenges** ladder of 30–60 handcrafted kicks, each with a 3-star rating (goal, through the middle third, under a par number of drags). Examples: "Sideline into a gale", "Hit the post and in", "Bar-clearer by under 1 m". The data fits the existing `MODES` pattern: one `round()` per challenge.

**3.5.3 Practice can do more for learning.** Impact M · Effort S
- *Now:* Practice has a chosen spot, wind, preview tier and heat map.
- *Benchmark:* The Angry Birds ghost trail; golf range modes with dispersion stats.
- *Build:* Show a **ghost trail of the last 3 kicks**. Add a "Retry the same kick" button. Add a dispersion readout (left/right spread in metres). Add drills, such as "5 from each mark across the field".

**3.5.4 Pressure and Daily need finishing touches.** Impact M · Effort S
- Daily: show a **countdown to the next daily**, mark today's run as done, and allow one scored attempt (practice reruns are unscored), as Wordle does.
- Pressure: show the best streak live in the HUD ("Best 7"), and play an audio and visual cue when the player passes their best.

### 3.6 Progression, retention and social

**3.6.1 No progression.** Impact H · Effort M
- *Now:* `settings/scores.js` keeps best points, best streak, played counts and practice totals, nothing more.
- *Benchmark:* Golf Clash (levels, collection), Flick Kick (unlocks), Duolingo (streaks).
- *Build:* Add **player XP and levels** earned from any mode, unlocking cosmetics: ball skins, tee colours, kicker kit, stadium dressing, goal celebrations. Add **achievements** ("Doink and in", "Touchline conversion", "10/10 match", "Kick in a 10 m/s headwind"). Add a **day streak** for Daily. Keep everything local-first; it fits the PWA and offline design.

**3.6.2 No sharing.** Impact H · Effort S
- *Benchmark:* Wordle's emoji grid made daily puzzles go viral.
- *Build:* Add a **share button** on the Daily and Pressure summaries using `navigator.share` with a clipboard fallback. Example text: `Goal Kick Daily 2026-10-05 · 16 pts · 🟢🟢🟢🟢🟢🟢⬅️🟢🟢➡️`. A later step is a share card image rendered from the summary canvas, or a replay GIF (see 3.2.2).

**3.6.3 No leaderboards or competition.** Impact M · Effort L
- *Build:* Phase 1: a local "beat your ghost" mode that replays your best Daily score kick by kick. Phase 2: an optional online Daily leaderboard (simple serverless endpoint; the seed already makes runs comparable). Phase 3: **async 1v1** where both players kick the same seeded set (the Golf Clash model without real-time networking).

**3.6.4 Thin stats.** Impact M · Effort S
- *Build:* Add a **Stats screen**: career accuracy, accuracy by try position (a field heat strip from left touchline to right), by wind strength and by distance, longest goal, most common miss. The heat-map logic in `world/heatmap.js` can be reused in 2D.

### 3.7 Summary screen

**3.7.1 The summary is a text table.** Impact M · Effort S
- *Now:* Ten rows of "12 m · ✓ Goal! · +2" (summary screenshot).
- *Build:* Add a **goal-mouth plot** at the top: the posts drawn in SVG with a dot for each kick's crossing point (`log[].crossing`, already recorded) and a ✕ for short kicks. This answers "how do I miss?" at a glance. Make the rows tappable to replay that kick. Add a one-line coaching tip based on the misses ("3 of your 4 misses drifted right: aim further into a left-to-right wind").

### 3.8 Onboarding

**3.8.1 Tutorial depth.** Impact M · Effort S
- *Now:* The coach marks are good and contextual (`ui/tutorial.js`). But a player first meets wind without the preview at round 4 or later, with no warning.
- *Build:* Add **just-in-time tips** the first time the preview shortens or disappears ("No aim guide from here. Read the wind card"), the first strong wind, and the first time the shot clock appears. Show each tip once and store it in settings.

### 3.9 Audio

**3.9.1 No commentary or announcer.** Impact M · Effort M
- *Now:* All synthesised SFX, crowd and music. Good, but there is no voice.
- *Benchmark:* Big Ant and EA games have commentary, and stadium PA announcements set the scene.
- *Build:* Use short recorded or TTS **call-outs** ("Conversion attempt from the touchline", "Doinks off the post!", "He's nailed it"). Keep them optional and off by default, mixed under the crowd. Recorded audio breaks the "no files" rule, so treat it as an opt-in, lazily cached asset pack.

**3.9.2 Audio cues for visual information.** Impact M · Effort S
- *Build:* For low-vision play, add an optional panned wind whoosh (left or right by crosswind direction, louder when stronger) and a rising tone as the meter or drag power climbs. This follows the TLOU2 audio-cue approach.

### 3.10 Accessibility (beyond what exists)

- **Colour-blind check:** green/red result text already has ✓ and ✕ glyphs (good). Also run the gold aim marker and the red post pads against deuteranopia and protanopia simulations. Impact L · Effort S
- **One-handed and switch play:** add a "tap-tap" control scheme on touch (tap to start a combined aim-sweep and power meter, tap to lock each). It also serves players who cannot drag. Impact M · Effort M
- **Hold vs toggle** for the fine-aim modifier. Impact L · Effort S
- **Pause on focus loss for gamepad disconnect** (show "Controller disconnected"). Impact L · Effort S

### 3.11 Performance and technical UX

- **Haptics on iOS:** `navigator.vibrate` does nothing on iOS Safari, so the vibration row is hidden there. Pressure-style haptics are not reachable from the web on iOS. Document this rather than build it. Impact L
- **PWA install prompt:** capture `beforeinstallprompt` and offer "Install for offline play" after the first finished match, not on load. Impact M · Effort S
- **Update toast:** `registerType: 'autoUpdate'` swaps versions silently. Show "Updated, new features" after an update. Impact L · Effort S

---

## 4. Prioritised roadmap

### Now: quick wins (each about a day or less)
1. Move the result card off the posts, draw the crossing dot, remove the duplicate "+2" (3.2.3)
2. Rename "target" to "Posts open", or use a wedge icon (3.3.1)
3. Longer hold on misses, plus an auto-advance setting with a progress ring (3.3.4)
4. Confirm Restart and Quit mid-match (3.4.1)
5. HTML splash screen and `<noscript>` (3.4.2)
6. Daily share text with an emoji grid, and a countdown to the next daily (3.6.2, 3.5.4)
7. Goal-mouth plot on the summary (3.7.1)
8. Just-in-time tips when the preview fades, strong wind appears, or the shot clock first shows (3.8.1)

### Next: depth (each about 1–2 weeks)
1. Instant replay with a tracer and 2–3 angles (3.2.2)
2. Strike-quality layer for touch, the same fairness for every input (3.1.1)
3. Tee make-difficulty readout and a risk/reward bonus (3.1.3)
4. Challenges ladder with 3-star ratings (3.5.2)
5. XP, achievements, cosmetic unlocks, Daily streak (3.6.1)
6. Stats screen (3.6.4), Practice ghost trail and retry (3.5.3)
7. Resume an unfinished match (3.4.3)

### Later: signature features (multi-week)
1. Animated kicker with run-up and routine (3.2.1)
2. Curve and hook kicks (3.1.2)
3. Match context, golden point, season or cup mode (3.5.1)
4. Weather and time-of-day conditions (3.2.5), crowd upgrade (3.2.4)
5. Online Daily leaderboard, then async 1v1 (3.6.3)
6. Optional commentary pack (3.9.1)

---

## 5. Guardrails for all of the above

These are the project's existing rules. New features must keep them:

- **One simulation.** Strike quality, curve, rain and sway are all decided at contact and fed into `simulate()`. The preview shows any spread honestly, and nothing random happens after contact.
- **Pure logic stays pure.** New rules (challenges, XP, achievements, stats, strike grades) go in Node-testable modules next to `physics/` and `modes/`, with Vitest coverage.
- **Every sound has a visual twin**, and nothing is shown by colour alone.
- **Game clock only**, no `setTimeout`, for replays, holds and tips.
- **Two taps to the first kick** must survive any new title-screen content (progression, continue, challenges).
