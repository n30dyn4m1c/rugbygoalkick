// ---------------------------------------------------------------------------
// Try marker
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export { createBall, createTee } from './ball.js';

export function createTryMarker(scene) {
  const geo = new THREE.CircleGeometry(0.6, 24);
  const mat = new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide });
  const marker = new THREE.Mesh(geo, mat);
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.03;
  scene.add(marker);
  return marker;
}
