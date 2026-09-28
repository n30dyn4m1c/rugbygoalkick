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
import { createInfoLabel } from './world/labels.js';
import { createAimTarget } from './world/aimTarget.js';
import { createCameraRig } from './world/cameraRig.js';
import { createKeyboard } from './input/keyboard.js';
import { createClock } from './core/clock.js';
import { createLoop } from './core/loop.js';
import { createRng } from './core/rng.js';
import { createGame } from './game/game.js';
import { onPlayAgain } from './ui/hud.js';
import { installDebugHook } from './debug/hook.js';

const { scene, camera, renderer } = createRenderer();
createLighting(scene);
createField(scene);
const flags = createCornerFlags(scene);
createGoalposts(scene);
createStadium(scene, createRng(1)); // fixed seed: scenery looks the same every load
const tee = createTee(scene);
const ball = createBall(scene);
const tryMarker = createTryMarker(scene);
const infoLabel = createInfoLabel(scene);
const aimTarget = createAimTarget(scene);

const rig = createCameraRig(camera);
const keys = createKeyboard();
const clock = createClock();
let rng = createRng((Math.random() * 2 ** 32) >>> 0);
const game = createGame({
  world: { ball, tee, tryMarker, infoLabel, aimTarget, flags },
  rig,
  keys,
  clock,
  rng: () => rng(),
});

onPlayAgain(() => game.restart());

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const loop = createLoop({
  step(dt) {
    game.update(dt, clock.time);
    clock.advance(dt);
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
    clock,
    renderer,
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
    skipIntro: () => game.skipIntro(),
    kick: (yaw, power) => game.kickNow(yaw, power),
    get state() {
      return game.state;
    },
  });
}
