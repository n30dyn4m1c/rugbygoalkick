// ---------------------------------------------------------------------------
// Aim preview — dotted trajectory arc and an "at the posts" marker, drawn
// from the same simulate() result the kick will follow.
//
// Tiers: 3 = full arc + marker, 2 = long fading arc, 1 = short fading arc, 0 = off
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z } from '../config.js';

export const PREVIEW_TIERS = {
  3: { fraction: 1, marker: true, label: 'Full' },
  2: { fraction: 0.65, marker: false, label: 'Long' },
  1: { fraction: 0.35, marker: false, label: 'Short' },
  0: { fraction: 0, marker: false, label: 'Off' },
};

const MAX_DOTS = 90;
const DOT_SPACING = 1.1; // metres along the path

export function createAimPreview(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false });
  const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), dotMat, MAX_DOTS);
  dots.frustumCulled = false;
  dots.count = 0;
  group.add(dots);

  // Goal-plane marker: ring + centre dot, facing the kicker
  const markerMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide, depthTest: false, transparent: true });
  const marker = new THREE.Group();
  marker.add(new THREE.Mesh(new THREE.RingGeometry(0.32, 0.46, 32), markerMat));
  marker.add(new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), markerMat));
  marker.renderOrder = 10;
  group.add(marker);

  // Landing marker on the ground (for kicks that fall short)
  const landing = new THREE.Mesh(
    new THREE.RingGeometry(0.35, 0.5, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthWrite: false }),
  );
  landing.rotation.x = -Math.PI / 2;
  group.add(landing);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  /**
   * @param {object} result  simulate() result with samples
   * @param {number} tier    0–3
   */
  function update(result, tier) {
    const cfg = PREVIEW_TIERS[tier] ?? PREVIEW_TIERS[0];
    const samples = result.samples;
    const start = samples[0];

    // The arc ends at the goal plane, the first post hit, or the landing.
    const firstHit = result.events[0]?.t ?? Infinity;
    const endT = Math.min(result.crossing?.t ?? Infinity, firstHit, result.landing?.t ?? Infinity);
    const endIdx = Math.min(samples.length - 1, Math.ceil(endT * 120));

    // Path length up to the end
    let total = 0;
    for (let i = 1; i <= endIdx; i++) total += Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y, samples[i].z - samples[i - 1].z);
    const shown = total * cfg.fraction;

    let n = 0;
    let travelled = 0;
    let next = DOT_SPACING * 0.6;
    for (let i = 1; i <= endIdx && n < MAX_DOTS; i++) {
      const a = samples[i - 1];
      const b = samples[i];
      travelled += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      if (travelled < next) continue;
      if (travelled > shown) break;
      next += DOT_SPACING;
      const dist = Math.hypot(b.x - start.x, b.z - start.z);
      // Fade the tail on shortened arcs by shrinking the last dots
      const tail = cfg.fraction < 1 ? Math.min(1, (shown - travelled) / (shown * 0.4)) : 1;
      const r = (0.045 + dist * 0.004) * (0.35 + 0.65 * tail);
      p.set(b.x, b.y, b.z);
      s.set(r, r, r);
      m.compose(p, q, s);
      dots.setMatrixAt(n++, m);
    }
    dots.count = n;
    dots.instanceMatrix.needsUpdate = true;

    marker.visible = false;
    landing.visible = false;
    if (cfg.marker) {
      const hitFirst = firstHit < (result.crossing?.t ?? Infinity);
      if (result.crossing && !hitFirst) {
        marker.position.set(result.crossing.x, result.crossing.y, GOALPOST_Z + 0.05);
        marker.visible = true;
      } else if (hitFirst) {
        const pt = result.events[0].point;
        marker.position.set(pt.x, pt.y, pt.z + 0.3);
        marker.visible = true;
      } else if (result.landing) {
        landing.position.set(result.landing.x, 0.03, result.landing.z);
        landing.visible = true;
      }
    }
  }

  return {
    update,
    set visible(v) {
      group.visible = v;
    },
  };
}
