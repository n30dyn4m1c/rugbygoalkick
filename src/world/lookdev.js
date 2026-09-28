// ---------------------------------------------------------------------------
// Look-dev presets: sky, fog, lighting, palette, shading, scenery and
// post-processing, applied at runtime. Three directions are prototyped:
//   A — stylised golden hour     B — floodlit night     C — flat graphic
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { buildMaterials, applyMaterials, disposeMaterials, createOutlineMaterial } from './materials.js';
import { createStripeTexture, createPatternTexture } from './patterns.js';

const RED = '#c8102e';
const BLACK = '#161616';
const GOLD = '#f2b705';
const CREAM = '#f4efe6';

const SKINS = ['#4a2f22', '#5b3a28', '#6b4630', '#3d271c', '#7a5236', '#553423'];

export const PRESETS = {
  A: {
    name: 'Stylised golden hour',
    toneMapping: 'aces',
    exposure: 1.05,
    shading: 'standard',
    sky: { top: '#3d4f8f', horizon: '#f6a774', bottom: '#e9b98a', sunDir: [-1, 0.12, -0.25], sunColor: '#fff0c8', sunSize: 0.0035, sunGlow: 0.7 },
    fog: { color: '#f0ae80', near: 110, far: 330 },
    lights: {
      hemi: { sky: '#ffd8b4', ground: '#3f5a26', intensity: 0.75 },
      key: { color: '#ffc896', intensity: 2.8, dir: [-1, 0.34, 0.35] }, // low from the left: rakes across the posts
    },
    grass: ['#6aac3e', '#5c9d34'],
    palette: {
      inGoal: '#4f8f2e', lines: '#fdfaf0', posts: '#f7f3ea', padding: RED,
      standConcrete: '#d9c6ab', seatA: '#d8502a', seatB: '#b8401f',
      flagPole: CREAM, flag: { color: RED, side: THREE.DoubleSide },
      tee: '#f2b705', seam: RED,
      hills: '#5f8f4a', palmTrunk: '#8a6a4a', palmLeaf: '#3f7d34',
      floodPole: '#666', floodHead: '#ccc', roof: '#b8a58c', roofPost: '#9a8a74',
    },
    crowd: [RED, RED, BLACK, GOLD, CREAM, '#2f7d5b', '#1f5f8a'],
    banner: [BLACK, GOLD, RED, CREAM],
    scenery: { hills: true, palms: true, floodlights: false, roofs: true, banners: true },
    outline: false,
    bloom: false,
  },

  B: {
    name: 'Floodlit night',
    toneMapping: 'aces',
    exposure: 1.1,
    shading: 'standard',
    // Deep blue-black sky warmed near the horizon by the stadium's own glow
    sky: { top: '#02040a', horizon: '#263049', bottom: '#0b0e16', stars: true, sunColor: '#000000' },
    fog: { color: '#1c2436', near: 70, far: 250 },
    lights: {
      hemi: { sky: '#6a7bb0', ground: '#1a2618', intensity: 0.65 },
      // Key: the far-right bank of floodlights; fill: the banks behind the kicker
      key: { color: '#f3f6ff', intensity: 2.3, dir: [0.7, 1.3, -0.45] },
      fill: { color: '#e4e9ff', intensity: 1.35, dir: [-0.45, 1.1, 1] },
    },
    grass: ['#2f8a36', '#287a2f'],
    palette: {
      inGoal: '#256f2a', lines: '#f4f6ff', posts: '#f6f7ff', padding: RED,
      standConcrete: '#555b68', seatA: '#3a404c', seatB: '#323844',
      flagPole: CREAM, flag: { color: RED, side: THREE.DoubleSide },
      tee: GOLD, seam: RED,
      hills: '#0d121b', palmTrunk: '#090c10', palmLeaf: '#0a0f12',
      floodPole: '#3a3f4a', floodHead: { color: '#ffffff', emissive: '#fff6e0', emissiveIntensity: 3 },
      roof: '#20242c', roofPost: '#2a2e36',
    },
    crowd: [RED, RED, BLACK, GOLD, CREAM, '#2f7d5b', '#8a8f9a'],
    banner: [BLACK, GOLD, RED, CREAM],
    bannerGlow: 0.9,
    // Hills and palms stay as silhouettes against the horizon glow: still a tropical ground at night
    scenery: { hills: true, palms: true, floodlights: true, roofs: true, banners: true },
    outline: false,
    bloom: 'auto', // restrained bloom on desktop, off on phones (a setting overrides)
  },

  C: {
    name: 'Flat graphic',
    toneMapping: 'none',
    exposure: 1,
    shading: 'toon',
    sky: { top: '#ff7a3d', horizon: '#ffd36e', bottom: '#ffd36e', sunDir: [0.3, 0.12, -1], sunColor: '#fff4c2', sunSize: 0.01, sunGlow: 0, bands: 10 },
    fog: { color: '#ffcf73', near: 140, far: 360 },
    lights: {
      hemi: { sky: '#ffffff', ground: '#9a9a9a', intensity: 1.1 },
      key: { color: '#ffffff', intensity: 1.9, dir: [0.4, 0.8, 0.5] },
    },
    grass: ['#39c24a', '#31b141'],
    palette: {
      inGoal: '#2aa53a', lines: '#ffffff', posts: '#ffffff', padding: RED,
      standConcrete: '#4a3530', seatA: '#e5482c', seatB: '#c9391f',
      flagPole: '#ffffff', flag: { color: RED, side: THREE.DoubleSide },
      tee: GOLD, seam: RED,
      hills: '#e0643a', palmTrunk: '#3a2416', palmLeaf: '#1f6b2b',
      floodPole: '#333', floodHead: '#eee', roof: '#222', roofPost: '#222',
    },
    crowd: ['#e5482c', '#ff6a2b', RED, BLACK, GOLD, '#ff9a3c'],
    banner: [BLACK, GOLD, RED, CREAM],
    scenery: { hills: true, palms: true, floodlights: false, roofs: false, banners: true },
    outline: true,
    bloom: false,
  },
};

const TONE = { aces: THREE.ACESFilmicToneMapping, agx: THREE.AgXToneMapping, none: THREE.NoToneMapping };

/**
 * @param {object} deps  { renderer, scene, sky, lighting, crowd, scenery, post }
 */
export function createLookdev({ renderer, scene, sky, lighting, crowd, scenery, post, mobile, ballMap, getBloomSetting = () => 'auto' }) {
  let mats = null;
  let grassTex = null;
  let patternTex = null;
  const outlineMat = createOutlineMaterial(0.035);
  const outlines = [];
  let current = null;

  function setOutlines(on) {
    for (const o of outlines) o.parent?.remove(o);
    outlines.length = 0;
    if (!on) return;
    scene.traverse((root) => {
      if (!root.userData.outline) return;
      root.traverse((m) => {
        if (!m.isMesh || m.isInstancedMesh || m.userData.isOutline) return;
        const hull = new THREE.Mesh(m.geometry, outlineMat);
        hull.userData.isOutline = true;
        hull.raycast = () => {};
        m.add(hull);
        outlines.push(hull);
      });
    });
  }

  function apply(key) {
    const p = PRESETS[key] ?? PRESETS.A;
    current = key;

    renderer.toneMapping = TONE[p.toneMapping];
    renderer.toneMappingExposure = p.exposure;
    sky.apply(p.sky, p.fog);
    lighting.apply(p.lights, { mobile });

    grassTex?.dispose();
    grassTex = createStripeTexture(...p.grass);
    grassTex.repeat.set(1, 24); // 240 m ground → 5 m stripes
    patternTex?.dispose();
    patternTex = createPatternTexture({ colors: p.banner });

    const palette = {
      ball: { color: '#ffffff', map: ballMap, roughness: 0.6 },
      ...p.palette,
      grass: { color: '#ffffff', map: grassTex },
      banner: p.bannerGlow
        ? { color: '#ffffff', map: patternTex, emissive: '#ffffff', emissiveMap: patternTex, emissiveIntensity: p.bannerGlow }
        : { color: '#ffffff', map: patternTex, unlit: p.shading === 'toon' },
    };
    const next = buildMaterials(palette, p.shading);
    applyMaterials(scene, next);
    disposeMaterials(mats);
    mats = next;

    crowd.applyPalette(p.crowd, SKINS);
    scenery.setVisible(p.scenery);
    setOutlines(p.outline);
    const pref = getBloomSetting();
    const auto = p.bloom === 'auto' ? !mobile : !!p.bloom;
    const bloom = pref === 'auto' ? auto : pref === 'on' && p.bloom !== false;
    post.setBloom(bloom);
    scenery.setBloom(bloom);
    renderer.shadowMap.needsUpdate = true;
  }

  return {
    apply,
    get current() {
      return current;
    },
    get preset() {
      return PRESETS[current];
    },
    setBloom(on) {
      post.setBloom(on);
    },
  };
}
