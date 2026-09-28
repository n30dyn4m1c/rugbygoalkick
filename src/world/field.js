// ---------------------------------------------------------------------------
// Ground & field markings
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, IN_GOAL_DEPTH, DEAD_BALL_Z, FIELD_WIDTH } from '../config.js';
import { role } from './materials.js';

export function createField(scene) {
  const group = new THREE.Group();

  // Mowing stripes come from the grass material's map (look-dev preset)
  const groundGeo = new THREE.PlaneGeometry(240, 240);
  const ground = role(new THREE.Mesh(groundGeo), 'grass');
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = GOALPOST_Z + 60;
  ground.receiveShadow = true;
  group.add(ground);

  const inGoal = role(new THREE.Mesh(new THREE.PlaneGeometry(FIELD_WIDTH, IN_GOAL_DEPTH)), 'inGoal');
  inGoal.rotation.x = -Math.PI / 2;
  inGoal.position.set(0, 0.005, GOALPOST_Z - IN_GOAL_DEPTH / 2);
  inGoal.receiveShadow = true;
  group.add(inGoal);

  const line = (w, d, x, z) => {
    const m = role(new THREE.Mesh(new THREE.PlaneGeometry(w, d)), 'lines');
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0.01, z);
    group.add(m);
  };
  for (let z = GOALPOST_Z + 10; z <= GOALPOST_Z + 100; z += 10) line(FIELD_WIDTH, 0.12, 0, z);
  line(FIELD_WIDTH, 0.2, 0, GOALPOST_Z); // try line
  line(FIELD_WIDTH, 0.2, 0, DEAD_BALL_Z);
  for (const x of [-FIELD_WIDTH / 2, FIELD_WIDTH / 2]) line(0.15, 120, x, GOALPOST_Z + 50);

  scene.add(group);
  return group;
}
