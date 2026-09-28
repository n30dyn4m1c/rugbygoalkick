// ---------------------------------------------------------------------------
// Kicking tee, ball and try marker
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { role } from './materials.js';

export function createTee(scene) {
  const teeGeo = new THREE.ConeGeometry(0.12, 0.08, 12);
  const tee = role(new THREE.Mesh(teeGeo), 'tee');
  tee.rotation.x = Math.PI;
  tee.position.y = 0.04;
  scene.add(tee);
  return tee;
}

export function createBall(scene) {
  const geo = new THREE.SphereGeometry(0.22, 16, 16);
  const ball = role(new THREE.Mesh(geo), 'ball');
  ball.scale.set(1, 1.5, 1); // long axis along local Y
  ball.castShadow = true;
  scene.add(ball);

  const seamGeo = new THREE.TorusGeometry(0.18, 0.012, 6, 24);
  ball.add(role(new THREE.Mesh(seamGeo), 'seam'));
  ball.userData.outline = true;
  return ball;
}

export function createTryMarker(scene) {
  const geo = new THREE.CircleGeometry(0.6, 24);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide });
  const marker = new THREE.Mesh(geo, mat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.03;
  scene.add(marker);
  return marker;
}
