// ---------------------------------------------------------------------------
// Tee placement guide — conversion line, suggested spot, angle wedge to posts
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, POST_HALF_WIDTH, TEE_DIST_MIN, TEE_DIST_MAX } from '../config.js';

const DASH = 0.7;
const GAP = 0.6;

export function createTeeGuide(scene) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  // Dashed conversion line (one instanced draw)
  const dashCount = Math.ceil((TEE_DIST_MAX + 3) / (DASH + GAP));
  const dashes = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.14, DASH).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false }),
    dashCount,
  );
  const m = new THREE.Matrix4();
  for (let i = 0; i < dashCount; i++) {
    m.makeTranslation(0, 0.025, GOALPOST_Z + i * (DASH + GAP) + DASH / 2);
    dashes.setMatrixAt(i, m);
  }
  group.add(dashes);

  // Wedge: tee → both upright bases
  const wedgeGeo = new THREE.BufferGeometry();
  wedgeGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(9), 3));
  const wedge = new THREE.Mesh(
    wedgeGeo,
    new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
  );
  wedge.frustumCulled = false;
  group.add(wedge);

  // Suggested spot and current tee rings
  const ring = (color, r) => {
    const mesh = new THREE.Mesh(
      new THREE.RingGeometry(r * 0.72, r, 40).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color, transparent: true, depthWrite: false }),
    );
    group.add(mesh);
    return mesh;
  };
  const suggested = ring(0xffd23f, 0.75);
  const current = ring(0xffffff, 0.6);

  function update(tryX, dist, suggestedDist, time = 0) {
    dashes.position.x = tryX;
    const z = GOALPOST_Z + dist;
    const pos = wedgeGeo.attributes.position;
    pos.setXYZ(0, tryX, 0.02, z);
    pos.setXYZ(1, -POST_HALF_WIDTH, 0.02, GOALPOST_Z);
    pos.setXYZ(2, POST_HALF_WIDTH, 0.02, GOALPOST_Z);
    pos.needsUpdate = true;
    suggested.position.set(tryX, 0.03, GOALPOST_Z + suggestedDist);
    current.position.set(tryX, 0.035, z);
    const pulse = 1 + Math.sin(time * 5) * 0.08;
    current.scale.set(pulse, 1, pulse);
  }

  return {
    update,
    set visible(v) {
      group.visible = v;
    },
    limits: { min: TEE_DIST_MIN, max: TEE_DIST_MAX },
  };
}
