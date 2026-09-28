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
import { createSky } from './world/sky.js';
import { createCrowd } from './world/crowd.js';
import { createScenery } from './world/scenery.js';
import { createLookdev } from './world/lookdev.js';
import { createPost } from './world/post.js';
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
import { createAudioEngine } from './audio/engine.js';
import { createSfx } from './audio/sfx.js';
import { createCrowdAudio } from './audio/crowd.js';
import { createMusic } from './audio/music.js';
import { createConfetti } from './world/fx.js';
import { createHaptics } from './ui/haptics.js';
import { reducedMotion, onSystemMotionChange } from './ui/motion.js';

// ---------------------------------------------------------------------------
// World
// ---------------------------------------------------------------------------
let rig;
let post;
const { scene, camera, renderer } = createRenderer(document.getElementById('stage'), () => {
  rig?.fitAspect();
  post?.resize(window.innerWidth, window.innerHeight);
});
rig = createCameraRig(camera);
rig.fitAspect();
post = createPost(renderer, scene, camera);

const sceneryRng = createRng(1); // fixed seed: scenery looks the same every load
const sky = createSky(scene);
const lighting = createLighting(scene);
createField(scene);
const flags = createCornerFlags(scene);
createGoalposts(scene);
const stadium = createStadium(scene);
const crowd = createCrowd(scene, stadium.rows, sceneryRng);
const scenery = createScenery(scene, sceneryRng);
const mobile = matchMedia('(pointer: coarse)').matches;
const tee = createTee(scene);
const ball = createBall(scene);
const tryMarker = createTryMarker(scene);
const preview = createAimPreview(scene);
const teeGuide = createTeeGuide(scene);
const confetti = createConfetti(scene);
const lookdev = createLookdev({
  renderer, scene, sky, lighting, crowd, scenery, post, mobile,
  ballMap: ball.userData.map,
  getBloomSetting: () => settings.get().glow,
});
// Floodlit night (direction B) is the game's look; ?look=A|C keeps the prototypes reachable
lookdev.apply(new URLSearchParams(location.search).get('look')?.toUpperCase() || 'B');

// Shadows only re-render when a shadow caster (the ball) has moved
renderer.shadowMap.autoUpdate = false;
renderer.shadowMap.needsUpdate = true;
const lastBall = { p: ball.position.clone(), q: ball.quaternion.clone(), v: ball.visible };
function updateShadowsIfMoved() {
  if (!ball.position.equals(lastBall.p) || !ball.quaternion.equals(lastBall.q) || ball.visible !== lastBall.v) {
    renderer.shadowMap.needsUpdate = true;
    lastBall.p.copy(ball.position);
    lastBall.q.copy(ball.quaternion);
    lastBall.v = ball.visible;
  }
}

// ---------------------------------------------------------------------------
// Input, settings, tutorial
// ---------------------------------------------------------------------------
const input = createInput({ surface: renderer.domElement, getBindings: () => settings.get().bindings });
hud.setDevice(input.lastDevice);
hud.setHandedness(settings.get().handedness);
// ---------------------------------------------------------------------------
// Audio, haptics, motion
// ---------------------------------------------------------------------------
const audio = createAudioEngine();
const sfx = createSfx(audio);
const crowdAudio = createCrowdAudio(audio);
const music = createMusic(audio);
const haptics = createHaptics(() => settings.get().haptics);
const reduced = () => reducedMotion(settings.get().reduceMotion);

function applyAudioSettings(s) {
  audio.setVolumes({ ...s.volumes, muted: s.muted });
}
function applyMotion() {
  document.body.classList.toggle('reduce-motion', reduced());
}
applyAudioSettings(settings.get());
applyMotion();
onSystemMotionChange(applyMotion);

let lastGlow = settings.get().glow;
settings.subscribe((s) => {
  hud.setHandedness(s.handedness);
  input.refreshBindings();
  applyAudioSettings(s);
  applyMotion();
  updateMusic();
  if (s.glow !== lastGlow) {
    lastGlow = s.glow;
    lookdev.apply(lookdev.current);
  }
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
    updateMusic();
    screens.open('screen-summary', { focus: 'btn-again' });
  },
});

// ---------------------------------------------------------------------------
// Feedback: every input and outcome gets sound, a visual and (on phones) a buzz
// ---------------------------------------------------------------------------
let cheer = 0; // crowd on its feet, decays after a goal
game.on('teeStep', () => {
  sfx.tick(0.9);
  haptics.tick();
});
game.on('aimTick', ({ deg }) => {
  sfx.tick(1.25);
  if (deg % 5 === 0) haptics.tick();
});
game.on('elevTick', () => sfx.tick(1.05));
game.on('meterStart', () => {
  sfx.blip(true);
  haptics.tick();
});
game.on('kick', ({ power, result }) => {
  sfx.kick(power);
  sfx.whoosh(Math.min(result.crossing?.t ?? result.landing?.t ?? 1.5, 2) + 0.3);
  haptics.kick(power);
  if (!reduced()) rig.shake(0.025 + power * 0.03);
});
game.on('post', (hit) => {
  sfx.doink();
  crowdAudio.gasp();
  haptics.doink();
  hud.doink();
  if (!reduced()) rig.shake(0.05);
});
game.on('land', () => sfx.thud());
game.on('result', ({ scored, focus }) => {
  if (scored) {
    crowdAudio.cheer(true);
    haptics.goal();
    hud.floatPoints(2);
    confetti.burst({ x: focus.x, y: Math.max(focus.y, 4), z: focus.z }, { calm: reduced() });
    cheer = 1;
  } else {
    crowdAudio.groan();
    haptics.miss();
  }
});

// Crowd tension follows the kick: settling in, the run-up, the flight
let lastTension = -1;
function crowdTension() {
  const s = game.state;
  if (app.mode !== 'playing') return 0.1;
  if (s.state === 'aim') return s.meter.running || s.drag ? 0.65 : 0.35;
  if (s.state === 'flight' && s.flight && !s.flight.revealed) {
    const toGo = s.flight.revealT - s.flight.t;
    return Math.min(1, 0.6 + 0.4 * (1 - Math.min(toGo, 2) / 2));
  }
  return 0.2;
}

function updateMusic() {
  const wanted = settings.get().menuMusic && (app.mode === 'title' || app.mode === 'summary');
  if (wanted && !music.playing) music.start();
  else if (!wanted && music.playing) music.stop();
}
audio.onReady(updateMusic);

// UI click sound on every button press
document.addEventListener('click', (e) => {
  if (e.target instanceof HTMLElement && e.target.closest('button')) sfx.uiClick();
});

const loop = createLoop({
  step(dt) {
    game.update(dt);
    cheer = Math.max(0, cheer - dt / 3.5);
    crowd.update(game.state.time, reduced() ? cheer * 0.3 : cheer);
    confetti.update(dt);
    const tension = crowdTension();
    if (Math.abs(tension - lastTension) > 0.04) {
      crowdAudio.setTension(tension);
      lastTension = tension;
    }
  },
  render() {
    updateShadowsIfMoved();
    post.render();
  },
});

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------
function showTitle() {
  tutorial.finish();
  screens.closeAll();
  loop.resume();
  audio.resume();
  game.idle();
  app.mode = 'title';
  updateMusic();
  screens.setTitleBest(scores.get().match);
  screens.open('screen-title', { focus: 'btn-play' });
}

function startMatch() {
  screens.closeAll();
  loop.resume();
  audio.resume();
  app.mode = 'playing';
  updateMusic();
  game.start('match');
  if (!settings.get().tutorialDone) tutorial.start(() => settings.set({ tutorialDone: true }));
  tutorial.phase(lastPhase, input.lastDevice);
}

function startTutorial() {
  screens.closeAll();
  loop.resume();
  audio.resume();
  app.mode = 'playing';
  updateMusic();
  game.start('tutorial');
  tutorial.start(() => settings.set({ tutorialDone: true }));
  tutorial.phase(lastPhase, input.lastDevice);
}

function pause() {
  if (app.mode !== 'playing') return;
  app.mode = 'paused';
  loop.pause();
  audio.suspend();
  game.setActive(false);
  screens.open('screen-pause', { focus: 'btn-resume' });
}

function resume() {
  if (app.mode !== 'paused') return;
  screens.closeAll();
  app.mode = 'playing';
  loop.resume();
  audio.resume();
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

screens.bindSettings(settings, {
  glowDefault: () => post.bloom,
  reducedDefault: () => reduced(),
  hapticsSupported: haptics.supported,
});

input.on('press', ({ action }) => {
  if (action === 'mute') {
    settings.set({ muted: !settings.get().muted });
    return;
  }
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

// Auto-pause (and silence) when the tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    pause();
    audio.suspend();
  } else if (app.mode !== 'paused') {
    audio.resume();
  }
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
    lookdev,
    post,
    crowd,
    audio,
    look: (key) => lookdev.apply(key),
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
    /** Aim for an outcome and kick; returns false if none was found. */
    kickFor(outcome) {
      const k = game.debug.findKick(outcome);
      if (!k) return false;
      game.debug.setAim({ yaw: k.yaw });
      game.debug.kick(k.power);
      return true;
    },
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
