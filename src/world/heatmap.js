// ---------------------------------------------------------------------------
// Practice heat map: where the last kicks crossed the goal plane (or landed,
// if they fell short). Goals are gold discs, misses are red crosses — shape,
// not just colour, tells them apart. Older kicks fade.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z } from '../config.js';

const MAX = 8;

function crossGeometry(size = 0.8, width = 0.2) {
  const a = new THREE.PlaneGeometry(size, width).rotateZ(Math.PI / 4);
  const b = new THREE.PlaneGeometry(size, width).rotateZ(-Math.PI / 4);
  const pos = [...a.toNonIndexed().attributes.position.array, ...b.toNonIndexed().attributes.position.array];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

export function createHeatmap(scene) {
  const group = new THREE.Group();
  group.visible = false;
  scene.add(group);

  const mat = (color) => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, depthWrite: false, depthTest: false });
  // Sized to read from 40+ m away on a phone
  const goals = new THREE.InstancedMesh(new THREE.CircleGeometry(0.36, 24), mat(0xffffff), MAX);
  const misses = new THREE.InstancedMesh(crossGeometry(), mat(0xffffff), MAX);
  // Dark backing behind every marker so it reads against the night sky and the lights
  const backs = new THREE.InstancedMesh(new THREE.CircleGeometry(0.52, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false, depthTest: false, side: THREE.DoubleSide }), MAX);
  backs.renderOrder = 8;
  backs.frustumCulled = false;
  backs.count = 0;
  group.add(backs);
  for (const m of [goals, misses]) {
    m.frustumCulled = false;
    m.count = 0;
    m.renderOrder = 9;
    group.add(m);
  }

  const mtx = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const flat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const gold = new THREE.Color('#f5c518');
  const red = new THREE.Color('#ff5a4f');
  const c = new THREE.Color();

  /** @param {{scored: boolean, crossing?, landing?}[]} kicks  oldest first */
  function update(kicks) {
    const recent = kicks.slice(-MAX);
    let ng = 0;
    let nm = 0;
    recent.forEach((k, i) => {
      const age = (recent.length - 1 - i) / MAX; // 0 = newest
      const fade = 1 - age * 0.75;
      let pos;
      let rot;
      if (k.crossing) {
        pos = new THREE.Vector3(k.crossing.x, k.crossing.y, GOALPOST_Z + 0.05);
        rot = q.identity();
      } else if (k.landing) {
        pos = new THREE.Vector3(k.landing.x, 0.05, k.landing.z);
        rot = flat;
      } else {
        return; // shot clock expiries have no point to show
      }
      const s = i === recent.length - 1 ? 1.35 : 1; // newest a touch larger
      mtx.compose(pos, rot, new THREE.Vector3(s, s, s));
      backs.setMatrixAt(ng + nm, mtx);
      if (k.scored) {
        goals.setMatrixAt(ng, mtx);
        goals.setColorAt(ng++, c.copy(gold).multiplyScalar(fade));
      } else {
        misses.setMatrixAt(nm, mtx);
        misses.setColorAt(nm++, c.copy(red).multiplyScalar(fade));
      }
    });
    goals.count = ng;
    misses.count = nm;
    backs.count = ng + nm;
    backs.instanceMatrix.needsUpdate = true;
    for (const m of [goals, misses]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    }
  }

  return {
    update,
    set visible(v) {
      group.visible = v;
    },
  };
}
