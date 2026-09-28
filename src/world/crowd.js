// ---------------------------------------------------------------------------
// Crowd — two instanced meshes (bodies, heads) for every seat in the stands:
// two draw calls total. Idle sway and a cheer bounce run in the vertex shader.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

const SEAT_SPACING = 0.9;

function animated(material, uniforms) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.uniforms.uCheer = uniforms.uCheer;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uCheer;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec3 seat = instanceMatrix[3].xyz;
        float phase = fract(sin(dot(seat.xz, vec2(12.9898, 78.233))) * 43758.5453) * 6.2831;
        float idle = sin(uTime * 1.3 + phase) * 0.04;
        float jump = max(0.0, sin(uTime * 9.0 + phase)) * 0.35 * uCheer;
        transformed.y += idle + jump;`,
      );
  };
  material.customProgramCacheKey = () => 'crowd';
  return material;
}

/**
 * @param {THREE.Scene} scene
 * @param {{x, z, y, dirX, dirZ, length}[]} rows  one entry per seating row:
 *   centre position, facing direction (toward the pitch) and row length
 * @param {() => number} rng
 */
export function createCrowd(scene, rows, rng) {
  const seats = [];
  for (const r of rows) {
    const n = Math.floor(r.length / SEAT_SPACING);
    const ax = -r.dirZ; // along the row
    const az = r.dirX;
    for (let i = 0; i < n; i++) {
      if (rng() < 0.18) continue; // empty seats
      const t = (i - n / 2 + 0.5) * SEAT_SPACING + (rng() - 0.5) * 0.3;
      seats.push({ x: r.x + ax * t, y: r.y, z: r.z + az * t, yaw: Math.atan2(r.dirX, r.dirZ), shirt: rng(), skin: rng() });
    }
  }

  const uniforms = { uTime: { value: 0 }, uCheer: { value: 0 } };
  const bodyGeo = new THREE.BoxGeometry(0.46, 0.62, 0.3).translate(0, 0.31, 0);
  const headGeo = new THREE.IcosahedronGeometry(0.14, 0).translate(0, 0.78, 0);
  const bodyMat = animated(new THREE.MeshLambertMaterial({ color: 0xffffff }), uniforms);
  const headMat = animated(new THREE.MeshLambertMaterial({ color: 0xffffff }), uniforms);
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, seats.length);
  const heads = new THREE.InstancedMesh(headGeo, headMat, seats.length);
  bodies.userData.crowd = heads.userData.crowd = true;

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  seats.forEach((seat, i) => {
    q.setFromAxisAngle(up, seat.yaw);
    s.setScalar(0.9 + seat.skin * 0.2);
    p.set(seat.x, seat.y, seat.z);
    m.compose(p, q, s);
    bodies.setMatrixAt(i, m);
    heads.setMatrixAt(i, m);
  });
  scene.add(bodies, heads);

  function applyPalette(shirts, skins) {
    const c = new THREE.Color();
    seats.forEach((seat, i) => {
      bodies.setColorAt(i, c.set(shirts[Math.floor(seat.shirt * shirts.length)]));
      heads.setColorAt(i, c.set(skins[Math.floor(seat.skin * skins.length)]));
    });
    bodies.instanceColor.needsUpdate = true;
    heads.instanceColor.needsUpdate = true;
  }

  return {
    count: seats.length,
    applyPalette,
    update(time, cheer) {
      uniforms.uTime.value = time;
      uniforms.uCheer.value = cheer;
    },
  };
}
