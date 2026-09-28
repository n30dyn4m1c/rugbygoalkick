// ---------------------------------------------------------------------------
// Bootstrap and app flow:
//   title → (match | tutorial) ⇄ pause / settings → summary → title
// ---------------------------------------------------------------------------
import '@fontsource/barlow-condensed/latin-700.css';
import '@fontsource/barlow-condensed/latin-800.css';
import { createRenderer } from './world/renderer.js';
import { createLighting } from './world/lighting.js';
import { createField } from './world/field.js';
import { createCornerFlags } from './world/flags.js';
import { createGoalposts } from './world/posts.js';
import { createStadium } from './world/stadium.js';
import { createTee, createBall, createTryMarker } from './world/props.js';
import { createAimPreview } from './world/aimPreview.js';
import { createTeeGuide } from './world/teeGuide.js';
import { createCameraRig } from './world/cameraRig.js';
import { createInput } from './input/input.js';
import { keyLabel } from './input/bindings.js';
import { createLoop } from './core/loop.js';
import { createRng } from './core/rng.js';
import { settings } from './settings/settings.js';
import { scores } from './settings/scores.js';
import { createGame } from './game/game.js';
import * as hud from './ui/hud.js';
import * as screens from './ui/screens.js';
import { createTutorial } from './ui/tutorial.js';
import { installDebugHook } from './debug/hook.js';

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
let rig;
const { scene, camera, renderer } = createRenderer(document.getElementById('stage'), () => rig?.fitAspect());
rig = createCameraRig(camera);
rig.fitAspect();

createLighting(scene);
createField(scene);
const flags = createCornerFlags(scene);
createGoalposts(scene);
createStadium(scene, createRng(1)); // fixed seed: scenery looks the same every load
const tee = createTee(scene);
const ball = createBall(scene);
const tryMarker = createTryMarker(scene);
const preview = createAimPreview(scene);
const teeGuide = createTeeGuide(scene);

// ---------------------------------------------------------------------------
// Input, settings, tutorial
// ---------------------------------------------------------------------------
const input = createInput({ surface: renderer.domElement, getBindings: () => settings.get().bindings });
hud.setDevice(input.lastDevice);
hud.setHandedness(settings.get().handedness);
settings.subscribe((s) => {
  hud.setHandedness(s.handedness);
  input.refreshBindings();
});

const tutorial = createTutorial({ keyLabelFor: (action) => keyLabel(settings.get().bindings[action]?.[0]) });
let lastPhase = 'idle';

input.on('device', (d) => {
  hud.setDevice(d);
  tutorial.phase(lastPhase, d); // re-word the coach mark for the new device
});

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------
let rng = createRng((Math.random() * 2 ** 32) >>> 0);
const app = { mode: 'title' }; // title | playing | paused | summary

const game = createGame({
  world: { ball, tee, tryMarker, preview, teeGuide, flags },
  rig,
  camera,
  input,
  settings,
  rng: () => rng(),
  onPhase(phase) {
    lastPhase = phase;
    tutorial.phase(phase, input.lastDevice);
  },
  onMatchEnd(summary) {
    if (summary.mode === 'tutorial') {
      showTitle();
      return;
    }
    const record = scores.recordMatch(summary);
    screens.fillSummary({ ...summary, record });
    game.setActive(false);
    app.mode = 'summary';
    screens.open('screen-summary', { focus: 'btn-again' });
  },
});

const loop = createLoop({
  step(dt) {
    game.update(dt);
  },
  render() {
    renderer.render(scene, camera);
  },
});

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------
function showTitle() {
  tutorial.finish();
  screens.closeAll();
  loop.resume();
  game.idle();
  app.mode = 'title';
  screens.setTitleBest(scores.get().match);
  screens.open('screen-title', { focus: 'btn-play' });
}

function startMatch() {
  screens.closeAll();
  loop.resume();
  app.mode = 'playing';
  game.start('match');
  if (!settings.get().tutorialDone) tutorial.start(() => settings.set({ tutorialDone: true }));
  tutorial.phase(lastPhase, input.lastDevice);
}

function startTutorial() {
  screens.closeAll();
  loop.resume();
  app.mode = 'playing';
  game.start('tutorial');
  tutorial.start(() => settings.set({ tutorialDone: true }));
  tutorial.phase(lastPhase, input.lastDevice);
}

function pause() {
  if (app.mode !== 'playing') return;
  app.mode = 'paused';
  loop.pause();
  game.setActive(false);
  screens.open('screen-pause', { focus: 'btn-resume' });
}

function resume() {
  if (app.mode !== 'paused') return;
  screens.closeAll();
  app.mode = 'playing';
  loop.resume();
  game.setActive(true);
}

function openSettings() {
  screens.open('screen-settings', { focus: 'btn-settings-done' });
}

/** Esc / gamepad B / pause key: step back one level. */
function back() {
  if (screens.top() === 'screen-settings') screens.close();
  else if (app.mode === 'paused') resume();
  else if (app.mode === 'playing') pause();
}

const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
on('btn-play', startMatch);
on('btn-howto', startTutorial);
on('btn-settings', openSettings);
on('btn-resume', resume);
on('btn-restart', () => {
  screens.closeAll();
  startMatch();
});
on('btn-pause-howto', startTutorial);
on('btn-pause-settings', openSettings);
on('btn-quit', showTitle);
on('btn-settings-done', () => screens.close());
on('btn-again', startMatch);
on('btn-summary-title', showTitle);
hud.onPause(pause);

screens.bindSettings(settings, {});

input.on('press', ({ action }) => {
  if (action === 'pause' || action === 'back') {
    back();
    return;
  }
  if (!screens.isOpen()) return;
  // Gamepad menu navigation (keyboard uses Tab / arrows natively)
  if (action === 'navUp' || action === 'navLeft') screens.moveFocus(-1);
  else if (action === 'navDown' || action === 'navRight') screens.moveFocus(1);
  else if (action === 'confirm') screens.activateFocused();
});

// Auto-pause when the tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

showTitle();
loop.start();

// ---------------------------------------------------------------------------
// Dev-only debug hook (stripped from production builds)
// ---------------------------------------------------------------------------
if (import.meta.env.DEV) {
  installDebugHook({
    game,
    loop,
    renderer,
    settings,
    scores,
    app,
    /** Seed the round sequence (takes effect for the next match). */
    seed(n) {
      rng = createRng(n);
    },
    freeze() {
      loop.setManual(true);
    },
    step(seconds) {
      loop.stepFor(seconds);
    },
    startMatch,
    startTutorial,
    showTitle,
    pause,
    resume,
    openSettings,
    go: (state) => game.debug.go(state),
    setAim: (aim) => game.debug.setAim(aim),
    kick: (power) => game.debug.kick(power),
    yawToPosts: () => game.debug.yawToPosts(),
    /** Play n kicks straight at the posts (for summary screenshots). */
    autoplay(n, power = 0.8) {
      if (game.state.flight?.revealed) game.debug.next();
      for (let i = 0; i < n && game.state.state !== 'over'; i++) {
        game.debug.go('aim');
        game.debug.setAim({ yaw: game.debug.yawToPosts() + (i % 3 === 2 ? 0.12 : 0) });
        game.debug.kick(power);
        for (let s = 0; s < 80 && game.state.flight && !game.state.flight.revealed; s++) loop.stepFor(0.1);
        game.debug.next();
      }
    },
    get state() {
      return game.state;
    },
  });
}
