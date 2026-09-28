// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
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
import { createLoop } from './core/loop.js';
import { createRng } from './core/rng.js';
import { settings } from './settings/settings.js';
import { createGame } from './game/game.js';
import * as hud from './ui/hud.js';
import { installDebugHook } from './debug/hook.js';

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

const input = createInput({ surface: renderer.domElement, getBindings: () => settings.get().bindings });
hud.setDevice(input.lastDevice);
input.on('device', (d) => hud.setDevice(d));
hud.setHandedness(settings.get().handedness);
settings.subscribe((s) => {
  hud.setHandedness(s.handedness);
  input.refreshBindings();
});

let rng = createRng((Math.random() * 2 ** 32) >>> 0);
const game = createGame({
  world: { ball, tee, tryMarker, preview, teeGuide, flags },
  rig,
  camera,
  input,
  settings,
  rng: () => rng(),
});

hud.onPlayAgain(() => game.restart());

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const loop = createLoop({
  step(dt) {
    game.update(dt);
  },
  render() {
    renderer.render(scene, camera);
  },
});

game.setupRound();
loop.start();

if (import.meta.env.DEV) {
  installDebugHook({
    game,
    loop,
    renderer,
    settings,
    /** Restart the match with a deterministic round sequence. */
    seed(n) {
      rng = createRng(n);
      game.restart();
    },
    freeze() {
      loop.setManual(true);
    },
    step(seconds) {
      loop.stepFor(seconds);
    },
    go: (state) => game.debug.go(state),
    setAim: (aim) => game.debug.setAim(aim),
    kick: (power) => game.debug.kick(power),
    yawToPosts: () => game.debug.yawToPosts(),
    get state() {
      return game.state;
    },
  });
}
