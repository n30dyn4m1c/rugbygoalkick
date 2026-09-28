// ---------------------------------------------------------------------------
// Kicking tee, ball and try marker
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export function createTee(scene) {
  const teeGeo = new THREE.ConeGeometry(0.12, 0.08, 12);
  const teeMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
  const tee = new THREE.Mesh(teeGeo, teeMat);
  tee.rotation.x = Math.PI;
  tee.position.y = 0.04;
  scene.add(tee);
  return tee;
}

export function createBall(scene) {
  const geo = new THREE.SphereGeometry(0.22, 16, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const ball = new THREE.Mesh(geo, mat);
  ball.scale.set(1, 1.5, 1); // long axis along local Y
  ball.castShadow = true;
  scene.add(ball);

  const seamGeo = new THREE.TorusGeometry(0.18, 0.012, 6, 24);
  const seamMat = new THREE.MeshBasicMaterial({ color: 0x999999 });
  ball.add(new THREE.Mesh(seamGeo, seamMat));
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
