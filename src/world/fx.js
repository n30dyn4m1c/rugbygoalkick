// ---------------------------------------------------------------------------
// Confetti burst in the palette (one instanced mesh, simple drag + gravity,
// stepped on the fixed physics tick).
// ---------------------------------------------------------------------------
import * as THREE from 'three';

const COUNT = 160;
const COLORS = ['#f5c518', '#c8102e', '#161616', '#f4efe6'];

export function createConfetti(scene) {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.22, 0.14),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, fog: true }),
    COUNT,
  );
  mesh.frustumCulled = false;
  mesh.count = 0;
  const c = new THREE.Color();
  for (let i = 0; i < COUNT; i++) mesh.setColorAt(i, c.set(COLORS[i % COLORS.length]));
  scene.add(mesh);

  const parts = Array.from({ length: COUNT }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), r: new THREE.Euler(), w: new THREE.Vector3() }));
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);
  let life = 0;

  return {
    /** Burst from a point (e.g. the crossing above the bar). */
    burst(origin, { calm = false } = {}) {
      life = calm ? 1.6 : 3.2;
      mesh.count = calm ? 60 : COUNT;
      for (const part of parts) {
        part.p.copy(origin);
        const a = Math.random() * Math.PI * 2;
        const s = calm ? 1 + Math.random() * 1.5 : 3 + Math.random() * 6;
        part.v.set(Math.cos(a) * s, (calm ? 0.5 : 4) + Math.random() * (calm ? 1 : 6), Math.sin(a) * s * 0.6);
        part.r.set(Math.random() * 6, Math.random() * 6, 0);
        part.w.set(Math.random() * 8 - 4, Math.random() * 8 - 4, 0).multiplyScalar(calm ? 0.2 : 1);
      }
    },
    update(dt) {
      if (life <= 0) return;
      life -= dt;
      if (life <= 0) {
        mesh.count = 0;
        return;
      }
      for (let i = 0; i < mesh.count; i++) {
        const part = parts[i];
        part.v.y -= 6 * dt;
        part.v.multiplyScalar(1 - 1.8 * dt); // paper flutters: heavy drag
        part.p.addScaledVector(part.v, dt);
        part.r.x += part.w.x * dt;
        part.r.y += part.w.y * dt;
        q.setFromEuler(part.r);
        m.compose(part.p, q, one);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
