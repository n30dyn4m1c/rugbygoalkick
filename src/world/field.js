// ---------------------------------------------------------------------------
// Ground & field markings
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, IN_GOAL_DEPTH, DEAD_BALL_Z, FIELD_WIDTH } from '../config.js';

export function createField(scene) {
  const groundGeo = new THREE.PlaneGeometry(200, 200);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const inGoalGeo = new THREE.PlaneGeometry(FIELD_WIDTH, IN_GOAL_DEPTH);
  const inGoalMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
  const inGoal = new THREE.Mesh(inGoalGeo, inGoalMat);
  inGoal.rotation.x = -Math.PI / 2;
  inGoal.position.set(0, 0.005, GOALPOST_Z - IN_GOAL_DEPTH / 2);
  scene.add(inGoal);

  for (let z = GOALPOST_Z; z <= GOALPOST_Z + 100; z += 10) {
    const lineGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 0.15);
    const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const line = new THREE.Mesh(lineGeo, lineMat);
    line.rotation.x = -Math.PI / 2;
    line.position.set(0, 0.01, z);
    scene.add(line);
  }

  const deadBallGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 0.25);
  const deadBallMat = new THREE.MeshBasicMaterial({ color: 0xff5252 });
  const deadBallLine = new THREE.Mesh(deadBallGeo, deadBallMat);
  deadBallLine.rotation.x = -Math.PI / 2;
  deadBallLine.position.set(0, 0.02, DEAD_BALL_Z);
  scene.add(deadBallLine);

  for (const xSide of [-FIELD_WIDTH / 2, FIELD_WIDTH / 2]) {
    const sideGeo = new THREE.PlaneGeometry(0.15, 120);
    const sideMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sideLine = new THREE.Mesh(sideGeo, sideMat);
    sideLine.rotation.x = -Math.PI / 2;
    sideLine.position.set(xSide, 0.01, GOALPOST_Z + 50);
    scene.add(sideLine);
  }

  for (let dist = 10; dist <= 40; dist += 10) {
    for (const side of [-1, 1]) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.font = 'bold 22px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(dist + 'm', 32, 24);
      const texture = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
      const sprite = new THREE.Sprite(spriteMat);
      sprite.scale.set(3, 1.5, 1);
      sprite.position.set(side * 36, 0.5, GOALPOST_Z + dist);
      scene.add(sprite);
    }
  }

  const tryLineGeo = new THREE.PlaneGeometry(FIELD_WIDTH, 0.3);
  const tryLineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
  const tryLine = new THREE.Mesh(tryLineGeo, tryLineMat);
  tryLine.rotation.x = -Math.PI / 2;
  tryLine.position.set(0, 0.02, GOALPOST_Z);
  scene.add(tryLine);
}
