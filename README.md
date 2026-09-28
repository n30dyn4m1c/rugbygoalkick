# Rugby Goal Kick

A rugby league goal-kicking game under Papua New Guinea floodlights, for phones and desktop. Pick your spot on the conversion line, read the wind, and put it between the posts. Built with Three.js and Vite; everything (geometry, textures, sound) is generated in code.

<p>
  <img src="docs/screenshots/phone-portrait-aiming.jpg" width="200" alt="Aiming on a phone: dotted trajectory arc, wind card, height slider">
  <img src="docs/screenshots/phone-portrait-tee.jpg" width="200" alt="Tee placement: dashed conversion line and the angle to the posts">
  <img src="docs/screenshots/phone-portrait-result.jpg" width="200" alt="Goal result card with confetti">
</p>
<img src="docs/screenshots/desktop-title.jpg" width="620" alt="Title screen over the floodlit ground">

## Play

```bash
npm install
npm run dev        # http://localhost:5173
```

Two taps from page load to your first kick: **Play match**, then **Kick from here**.

### The kick

1. **Place the tee.** A conversion is taken anywhere on the line straight back from where the try was scored. Stepping back widens the angle to the posts but makes the kick longer. The gold ring is a good spot.
2. **Aim, set the height, choose the power.** The dotted arc and the ring at the posts show exactly where the ball will go, wind included. Later kicks show less of the arc.
3. **Read the result.** Every result says why: *"Missed by 0.6 m · Wind carried it 1.2 m left"*.

League rules: posts 5.5 m apart, crossbar 3 m, 2 points for a conversion. The ball can hit the uprights or crossbar and go in or out.

### Controls

| | Touch / mouse | Keyboard (remappable) | Gamepad |
|---|---|---|---|
| Move the tee | Drag along the line | ↑ ↓ or W S | Left stick up/down |
| Confirm the tee | **Kick from here** | Space / Enter | A |
| Aim | Drag back from anywhere (slingshot): pull left to aim right | ← → or A D (Shift = fine) | Left stick (right stick = fine) |
| Height | **Height** slider (or mouse wheel) | ↑ ↓ or W S | Left stick up/down |
| Power | How far you pull back; release to kick | Space starts the timing meter, Space again kicks | A or RT, twice |
| Cancel a drag | Drag back to where you started | | |
| Pause | ⏸ button | Esc / P | Start |
| Mute | Settings | M | |

### Modes

- **Match**: 10 conversions. Tries get wider, the wind stronger and the preview shorter. Best score and best streak are saved.
- **Practice**: choose the try spot, the wind and how much preview you get. Unlimited kicks, with a heat map of your last eight at the posts.
- **Pressure**: keep scoring until you miss. Every kick is harder, the preview fades out, and there's a shot clock.
- **Daily**: today's ten kicks, the same for everyone.
- **How to play**: a one-kick interactive tutorial (it also runs on your first match).

### Settings and accessibility

Aim sensitivity, invert drag aim, left-handed layout, key remapping, slower meter and longer preview assists, always-use-the-suggested-spot. Separate Master, Effects, Crowd and Music volumes, a mute toggle and vibration. Text size, high contrast and reduce motion (which follows your system setting by default), plus floodlight glow (bloom). Everything is remembered. Every menu works with keyboard, gamepad and screen readers, and no information is carried by colour alone.

### Offline

It's an installable web app: after the first visit it works offline.

## Develop

```bash
npm run dev            # dev server with the window.__game debug hook
npm test               # Vitest: physics, scoring, modes, storage (pure modules)
npm run build          # production build to dist/
npm run preview        # serve dist/
npm run screenshots    # Playwright: every screen at 390×844, 844×390, 1440×900 → screenshots/
npm run smoke          # Playwright: real touch and keyboard input checks
npm run check:offline  # Playwright: production build installs a service worker and plays offline
npm run lookdev        # Playwright: art-direction presets and a relative perf probe
npm run icons          # re-render the PWA icons from public/icons/icon.svg
```

Playwright may need `npx playwright install chromium` once. The screenshot and smoke scripts use software WebGL (SwiftShader), so they run anywhere, but their frame rates say nothing about real devices.

See [CLAUDE.md](CLAUDE.md) for the architecture.

## Credits

Game, art, sound and music are original and generated in code. The pattern boards use abstract geometric bands in a red, black and gold palette. The menu groove is a synthesised hand-drum pattern in the spirit of the kundu, not a recording or a specific traditional rhythm. Team names are fictional.
