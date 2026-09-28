// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
import * as THREE from 'three';
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
import { createGame } from './game/game.js';
import { onPlayAgain } from './ui/hud.js';

const { scene, camera, renderer } = createRenderer();
createLighting(scene);
createField(scene);
const flags = createCornerFlags(scene);
createGoalposts(scene);
createStadium(scene);
const tee = createTee(scene);
const ball = createBall(scene);
const tryMarker = createTryMarker(scene);
const infoLabel = createInfoLabel(scene);
const aimTarget = createAimTarget(scene);

const rig = createCameraRig(camera);
const keys = createKeyboard();
const game = createGame({ world: { ball, tee, tryMarker, infoLabel, aimTarget, flags }, rig, keys });

onPlayAgain(() => game.restart());

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  game.update(dt, clock.elapsedTime);
  renderer.render(scene, camera);
}

game.setupRound();
animate();
