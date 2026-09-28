// ---------------------------------------------------------------------------
// Goalposts
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, UPRIGHT_HEIGHT, POST_HALF_WIDTH, CROSSBAR_HEIGHT } from '../config.js';

export function createGoalposts(scene) {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const leftGeo = new THREE.CylinderGeometry(0.12, 0.12, UPRIGHT_HEIGHT, 12);
  const leftPost = new THREE.Mesh(leftGeo, postMat);
  leftPost.position.set(-POST_HALF_WIDTH, UPRIGHT_HEIGHT / 2, 0);
  leftPost.castShadow = true;
  group.add(leftPost);

  const rightPost = leftPost.clone();
  rightPost.position.set(POST_HALF_WIDTH, UPRIGHT_HEIGHT / 2, 0);
  group.add(rightPost);

  const barLen = POST_HALF_WIDTH * 2;
  const barGeo = new THREE.CylinderGeometry(0.1, 0.1, barLen, 12);
  const crossbar = new THREE.Mesh(barGeo, postMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, CROSSBAR_HEIGHT, 0);
  crossbar.castShadow = true;
  group.add(crossbar);

  group.position.set(0, 0, GOALPOST_Z);
  scene.add(group);
  return group;
}
