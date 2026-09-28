// ---------------------------------------------------------------------------
// Ground & rugby league markings: try lines, 10 m lines to halfway, dead-ball
// lines, touchlines and touch-in-goal lines, painted distance numbers.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, IN_GOAL_DEPTH, FIELD_WIDTH } from '../config.js';
import { role } from './materials.js';

const FIELD_LENGTH = 100; // try line to try line
const HALF_W = FIELD_WIDTH / 2;
const NUMBERS = ['10', '20', '30', '40', '50'];

function numberAtlas() {
  const cell = 128;
  const c = document.createElement('canvas');
  c.width = cell * NUMBERS.length;
  c.height = cell;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = `800 ${cell * 0.8}px 'Barlow Condensed', 'Arial Narrow', sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  NUMBERS.forEach((n, i) => g.fillText(n, cell * i + cell / 2, cell * 0.54));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createField(scene) {
  const group = new THREE.Group();
  const tryNear = GOALPOST_Z;
  const tryFar = GOALPOST_Z + FIELD_LENGTH;

  // Mowing stripes come from the grass material's map (look-dev preset)
  const ground = role(new THREE.Mesh(new THREE.PlaneGeometry(260, 260)), 'grass');
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = GOALPOST_Z + 50;
  ground.receiveShadow = true;
  group.add(ground);

  for (const z of [tryNear - IN_GOAL_DEPTH / 2, tryFar + IN_GOAL_DEPTH / 2]) {
    const inGoal = role(new THREE.Mesh(new THREE.PlaneGeometry(FIELD_WIDTH, IN_GOAL_DEPTH)), 'inGoal');
    inGoal.rotation.x = -Math.PI / 2;
    inGoal.position.set(0, 0.005, z);
    inGoal.receiveShadow = true;
    group.add(inGoal);
  }

  // All straight lines merged into one mesh (one draw call)
  const strips = [];
  const line = (w, d, x, z) => strips.push(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(x, 0.012, z));
  for (let d = 10; d < FIELD_LENGTH; d += 10) line(FIELD_WIDTH, d === 50 ? 0.18 : 0.12, 0, tryNear + d);
  line(FIELD_WIDTH, 0.2, 0, tryNear);
  line(FIELD_WIDTH, 0.2, 0, tryFar);
  line(FIELD_WIDTH, 0.2, 0, tryNear - IN_GOAL_DEPTH); // dead-ball lines
  line(FIELD_WIDTH, 0.2, 0, tryFar + IN_GOAL_DEPTH);
  for (const x of [-HALF_W, HALF_W]) {
    line(0.15, FIELD_LENGTH + 2 * IN_GOAL_DEPTH, x, tryNear + FIELD_LENGTH / 2); // touch + touch-in-goal
  }
  const lines = role(new THREE.Mesh(mergePlanes(strips)), 'lines');
  lines.receiveShadow = true;
  group.add(lines);

  // Painted numbers beside each 10 m line, readable from the kicking end
  const atlas = numberAtlas();
  const numMat = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, alphaTest: 0.3, depthWrite: false, fog: true });
  const numGeos = [];
  for (let d = 10; d < FIELD_LENGTH; d += 10) {
    const idx = NUMBERS.indexOf(String(d <= 50 ? d : FIELD_LENGTH - d));
    for (const x of [-HALF_W + 6, HALF_W - 6]) {
      const geo = new THREE.PlaneGeometry(2.6, 2.6).rotateX(-Math.PI / 2).translate(x, 0.014, tryNear + d + 2.2);
      const uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setX(i, (idx + uv.getX(i)) / NUMBERS.length);
      numGeos.push(geo);
    }
  }
  group.add(new THREE.Mesh(mergePlanes(numGeos, true), numMat));

  scene.add(group);
  return group;
}

function mergePlanes(geos, withUv = false) {
  const pos = [];
  const nor = [];
  const uv = [];
  const idx = [];
  let offset = 0;
  for (const g of geos) {
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
    if (withUv) uv.push(...g.attributes.uv.array);
    for (const i of g.index.array) idx.push(i + offset);
    offset += g.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  if (withUv) out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  out.setIndex(idx);
  return out;
}
