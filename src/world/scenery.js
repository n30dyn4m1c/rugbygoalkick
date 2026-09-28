// ---------------------------------------------------------------------------
// Scenery outside the pitch: hills, palms, floodlight towers, stand roofs and
// pattern banner boards. Each piece is toggled by the look-dev preset.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, FIELD_WIDTH } from '../config.js';
import { role } from './materials.js';
import { createGlowTexture } from './patterns.js';

function palmsMesh(rng) {
  // Trunks + frond clusters, instanced (2 draw calls)
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 1, 6).translate(0, 0.5, 0);
  const frond = new THREE.ConeGeometry(0.6, 4.2, 4, 1).rotateZ(Math.PI / 2).translate(2.1, 0, 0).scale(1, 0.25, 1);
  const parts = [];
  for (let k = 0; k < 7; k++) {
    const f = frond.clone();
    f.rotateZ(-0.35);
    f.rotateY((k / 7) * Math.PI * 2);
    parts.push(f);
  }
  const frondGeo = mergeSimple(parts);

  const spots = [];
  for (const side of [-1, 1]) {
    for (let z = GOALPOST_Z - 30; z <= GOALPOST_Z + 110; z += 11 + rng() * 6) spots.push([side * (62 + rng() * 12), z]);
  }
  for (let x = -55; x <= 55; x += 12 + rng() * 6) spots.push([x, GOALPOST_Z - 34 - rng() * 10]);

  const trunks = role(new THREE.InstancedMesh(trunkGeo, undefined, spots.length), 'palmTrunk');
  const fronds = role(new THREE.InstancedMesh(frondGeo, undefined, spots.length), 'palmLeaf');
  const m = new THREE.Matrix4();
  spots.forEach(([x, z], i) => {
    const h = 13 + rng() * 7;
    const lean = (rng() - 0.5) * 0.25;
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, rng() * 6, lean * 0.5));
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(1, h, 1));
    trunks.setMatrixAt(i, m);
    const top = new THREE.Vector3(0, h, 0).applyQuaternion(q).add(new THREE.Vector3(x, 0, z));
    m.compose(top, q, new THREE.Vector3(1, 1, 1));
    fronds.setMatrixAt(i, m);
  });
  const g = new THREE.Group();
  g.add(trunks, fronds);
  return g;
}

function mergeSimple(geos) {
  const pos = [];
  const nor = [];
  for (const geo of geos) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    pos.push(...g.attributes.position.array);
    nor.push(...g.attributes.normal.array);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  return out;
}

function hillsMesh(rng) {
  const geos = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2 + rng() * 0.2;
    const r = 170 + rng() * 60;
    const h = 22 + rng() * 38;
    const w = 45 + rng() * 40;
    const geo = new THREE.ConeGeometry(w, h, 7, 1).translate(Math.sin(a) * r, h / 2 - 2, GOALPOST_Z + 20 + Math.cos(a) * r);
    geos.push(geo);
  }
  return role(new THREE.Mesh(mergeSimple(geos)), 'hills');
}

// Faint light shafts from each floodlight head toward the pitch (one mesh,
// additive, alpha fading from the lamp down) — the "haze" in the night look.
function hazeCones(spots) {
  const geos = [];
  const target = new THREE.Vector3(0, 0, GOALPOST_Z + 22);
  for (const [x, z, h] of spots) {
    const apex = new THREE.Vector3(x, h + 1, z);
    const len = apex.distanceTo(target) * 0.55; // shafts fade out well above the pitch
    const cone = new THREE.ConeGeometry(7, len, 16, 1, true).translate(0, -len / 2, 0);
    const colors = [];
    const pos = cone.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const t = -pos.getY(i) / len; // 0 at the lamp, 1 at the ground
      colors.push(1, 0.97, 0.9, 0.1 * (1 - t) ** 2);
    }
    cone.setAttribute('color', new THREE.Float32BufferAttribute(colors, 4));
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(apex).normalize());
    cone.applyQuaternion(q).translate(apex.x, apex.y, apex.z);
    geos.push(cone.toNonIndexed());
  }
  const pos = [];
  const col = [];
  for (const geo of geos) {
    pos.push(...geo.attributes.position.array);
    col.push(...geo.attributes.color.array);
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  merged.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
  const mesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial({
    vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false,
  }));
  mesh.renderOrder = 5;
  return mesh;
}

function floodlights() {
  const g = new THREE.Group();
  const glow = createGlowTexture();
  // Behind the far stand (in view while aiming), along both sides, and behind the kicker
  const spots = [
    [-54, GOALPOST_Z - 40, 32], [54, GOALPOST_Z - 40, 32], // wide of the posts: keep the aim line clear
    [-58, GOALPOST_Z + 20, 34], [58, GOALPOST_Z + 20, 34],
    [-58, GOALPOST_Z + 85, 34], [58, GOALPOST_Z + 85, 34],
  ];
  g.add(hazeCones(spots.slice(0, 4)));
  for (const [x, z, h] of spots) {
    const pole = role(new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.8).translate(0, h / 2, 0)), 'floodPole');
    pole.position.set(x, 0, z);
    const head = role(new THREE.Mesh(new THREE.BoxGeometry(7, 3.5, 0.6)), 'floodHead');
    head.position.set(x, h + 1, z);
    head.lookAt(0, 0, GOALPOST_Z + 20);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: 0xfff6e0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
    halo.scale.set(22, 22, 1);
    halo.userData.halo = true;
    halo.position.set(x, h + 1, z).lerp(new THREE.Vector3(0, h, GOALPOST_Z + 20), 0.03);
    g.add(pole, head, halo);
  }
  return g;
}

function roofs() {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const roof = role(new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 132)), 'roof');
    roof.position.set(side * 48, 15.5, -5);
    roof.rotation.z = side * -0.12;
    g.add(roof);
    for (let z = -60; z <= 50; z += 22) {
      const post = role(new THREE.Mesh(new THREE.BoxGeometry(0.5, 16, 0.5).translate(0, 8, 0)), 'roofPost');
      post.position.set(side * 55, 0, z);
      g.add(post);
    }
  }
  return g;
}

function banners(patternTex) {
  // Perimeter boards: left, right and behind the dead-ball line (one material)
  const g = new THREE.Group();
  const h = 1.1;
  const specs = [
    { len: 120, pos: [-37, h / 2, -5], rotY: Math.PI / 2 },
    { len: 120, pos: [37, h / 2, -5], rotY: -Math.PI / 2 },
    { len: FIELD_WIDTH + 6, pos: [0, h / 2, GOALPOST_Z - 13], rotY: 0 },
  ];
  for (const s of specs) {
    const geo = new THREE.PlaneGeometry(s.len, h);
    geo.attributes.uv.array.forEach((v, i, arr) => {
      if (i % 2 === 0) arr[i] = v * (s.len / (h * 8)); // keep motifs square
    });
    const board = role(new THREE.Mesh(geo), 'banner');
    board.position.set(...s.pos);
    board.rotation.y = s.rotY;
    g.add(board);
  }
  g.userData.texture = patternTex;
  return g;
}

export function createScenery(scene, rng, patternTex) {
  const parts = {
    hills: hillsMesh(rng),
    palms: palmsMesh(rng),
    floodlights: floodlights(),
    roofs: roofs(),
    banners: banners(patternTex),
  };
  for (const p of Object.values(parts)) scene.add(p);

  return {
    parts,
    setVisible(flags) {
      for (const [k, p] of Object.entries(parts)) p.visible = !!flags[k];
    },
    /** Real bloom already glows the lamps: shrink the fake halos so they don't stack. */
    setBloom(on) {
      parts.floodlights.traverse((o) => {
        if (o.userData.halo) o.scale.setScalar(on ? 9 : 22);
      });
    },
  };
}
