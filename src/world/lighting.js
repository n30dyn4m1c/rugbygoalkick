// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export function createLighting(scene) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
  dirLight.position.set(20, 40, 20);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(1024, 1024);
  dirLight.shadow.camera.left = -50;
  dirLight.shadow.camera.right = 50;
  dirLight.shadow.camera.top = 50;
  dirLight.shadow.camera.bottom = -50;
  scene.add(dirLight);

  return { ambientLight, dirLight };
}
