// ---------------------------------------------------------------------------
// Lighting rig driven by the look-dev preset: hemisphere fill + a key light
// whose shadow covers only the play area (goal end to ~50 m out).
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z } from '../config.js';

const SHADOW_CENTRE = new THREE.Vector3(0, 0, GOALPOST_Z + 20);

export function createLighting(scene) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0x445522, 0.6);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0005;
  key.shadow.normalBias = 0.02;
  key.target.position.copy(SHADOW_CENTRE);
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0xffffff, 0);
  fill.target.position.copy(SHADOW_CENTRE);
  scene.add(fill, fill.target);

  function apply(l, { mobile = false } = {}) {
    hemi.color.set(l.hemi.sky);
    hemi.groundColor.set(l.hemi.ground);
    hemi.intensity = l.hemi.intensity;

    key.color.set(l.key.color);
    key.intensity = l.key.intensity;
    const dir = new THREE.Vector3(...l.key.dir).normalize();
    key.position.copy(SHADOW_CENTRE).addScaledVector(dir, 90);

    // Fit the shadow frustum to the play area only
    const cam = key.shadow.camera;
    cam.left = -40;
    cam.right = 40;
    cam.top = 45;
    cam.bottom = -45;
    cam.near = 20;
    cam.far = 180;
    cam.updateProjectionMatrix();
    const size = mobile ? 1024 : 2048;
    if (key.shadow.mapSize.x !== size) {
      key.shadow.mapSize.set(size, size);
      key.shadow.map?.dispose();
      key.shadow.map = null;
    }

    fill.color.set(l.fill?.color ?? 0xffffff);
    fill.intensity = l.fill?.intensity ?? 0;
    if (l.fill) fill.position.copy(SHADOW_CENTRE).addScaledVector(new THREE.Vector3(...l.fill.dir).normalize(), 90);
  }

  return { apply, key, hemi, fill };
}
