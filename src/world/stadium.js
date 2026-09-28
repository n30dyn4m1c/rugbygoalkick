// ---------------------------------------------------------------------------
// Stadium stands. Returns the seating rows for the instanced crowd.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { FIELD_WIDTH, GOALPOST_Z } from '../config.js';
import { role } from './materials.js';

const TIER_DEPTH = 4;
const TIER_HEIGHT = 3;

export function createStadium(scene) {
  const group = new THREE.Group();
  const rows = [];

  // A stand of stepped tiers. (x, z) is the front tier centre; dir points
  // from the stand toward the pitch.
  function stand(x, z, length, dirX, dirZ, tiers) {
    const alongX = dirZ !== 0; // stand runs along X when it faces ±Z
    for (let i = 0; i < tiers; i++) {
      const cx = x - dirX * i * TIER_DEPTH;
      const cz = z - dirZ * i * TIER_DEPTH;
      const geo = alongX ? new THREE.BoxGeometry(length, TIER_HEIGHT, TIER_DEPTH) : new THREE.BoxGeometry(TIER_DEPTH, TIER_HEIGHT, length);
      const tier = role(new THREE.Mesh(geo), 'standConcrete');
      tier.position.set(cx, i * TIER_HEIGHT + TIER_HEIGHT / 2, cz);
      tier.receiveShadow = true;
      group.add(tier);

      const topGeo = alongX ? new THREE.PlaneGeometry(length, TIER_DEPTH) : new THREE.PlaneGeometry(TIER_DEPTH, length);
      const top = role(new THREE.Mesh(topGeo), i % 2 ? 'seatB' : 'seatA');
      top.rotation.x = -Math.PI / 2;
      top.position.set(cx, (i + 1) * TIER_HEIGHT + 0.01, cz);
      group.add(top);

      // Two rows of spectators per tier
      for (const d of [0.9, -0.7]) {
        rows.push({ x: cx + dirX * d, y: (i + 1) * TIER_HEIGHT, z: cz + dirZ * d, dirX, dirZ, length: length - 1 });
      }
    }
  }

  stand(40, -5, 130, -1, 0, 4);
  stand(-40, -5, 130, 1, 0, 4);
  stand(0, GOALPOST_Z - 18, FIELD_WIDTH, 0, 1, 3);
  stand(0, 58, FIELD_WIDTH, 0, -1, 3);

  scene.add(group);
  return { group, rows };
}
