// ---------------------------------------------------------------------------
// Goalposts (with padding round the base of each upright)
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, UPRIGHT_HEIGHT, POST_HALF_WIDTH, CROSSBAR_HEIGHT, UPRIGHT_RADIUS, CROSSBAR_RADIUS } from '../config.js';
import { role } from './materials.js';

export function createGoalposts(scene) {
  const group = new THREE.Group();

  const uprightGeo = new THREE.CylinderGeometry(UPRIGHT_RADIUS * 1.2, UPRIGHT_RADIUS * 1.2, UPRIGHT_HEIGHT, 12);
  const padGeo = new THREE.CylinderGeometry(0.32, 0.32, 2, 16);
  for (const side of [-1, 1]) {
    const upright = role(new THREE.Mesh(uprightGeo), 'posts');
    upright.position.set(side * POST_HALF_WIDTH, UPRIGHT_HEIGHT / 2, 0);
    upright.castShadow = true;
    group.add(upright);
    const pad = role(new THREE.Mesh(padGeo), 'padding');
    pad.position.set(side * POST_HALF_WIDTH, 1, 0);
    pad.castShadow = true;
    group.add(pad);
  }

  const bar = role(new THREE.Mesh(new THREE.CylinderGeometry(CROSSBAR_RADIUS * 1.2, CROSSBAR_RADIUS * 1.2, POST_HALF_WIDTH * 2, 12)), 'posts');
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, CROSSBAR_HEIGHT, 0);
  bar.castShadow = true;
  group.add(bar);

  group.position.set(0, 0, GOALPOST_Z);
  group.userData.outline = true;
  scene.add(group);
  return group;
}
