// ---------------------------------------------------------------------------
// Role-based materials. World meshes carry userData.role; the look-dev system
// builds one material per role for the active preset and swaps them in.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

// Roles drawn unlit (always read at full brightness)
const UNLIT = new Set(['lines']);

let toonGradient = null;
function getToonGradient() {
  if (!toonGradient) {
    // Three flat bands: shadow, mid, lit
    const data = new Uint8Array([70, 70, 70, 255, 170, 170, 170, 255, 255, 255, 255, 255]);
    toonGradient = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    toonGradient.minFilter = THREE.NearestFilter;
    toonGradient.magFilter = THREE.NearestFilter;
    toonGradient.needsUpdate = true;
  }
  return toonGradient;
}

/**
 * @param {object} palette  role → hex colour (or {color, emissive, emissiveIntensity, map})
 * @param {'standard'|'toon'} shading
 */
export function buildMaterials(palette, shading) {
  const mats = {};
  for (const [role, spec] of Object.entries(palette)) {
    const s = typeof spec === 'object' ? spec : { color: spec };
    const params = { color: s.color ?? 0xffffff };
    if (s.map) params.map = s.map;
    if (s.side) params.side = s.side;
    if (s.vertexColors) params.vertexColors = true;
    let m;
    if (UNLIT.has(role) || s.unlit) {
      m = new THREE.MeshBasicMaterial(params);
    } else if (shading === 'toon') {
      m = new THREE.MeshToonMaterial({ ...params, gradientMap: getToonGradient() });
    } else {
      m = new THREE.MeshStandardMaterial({ ...params, roughness: s.roughness ?? 0.9, metalness: 0 });
    }
    if (s.emissive !== undefined && 'emissive' in m) {
      m.emissive = new THREE.Color(s.emissive);
      m.emissiveIntensity = s.emissiveIntensity ?? 1;
      if (s.emissiveMap) m.emissiveMap = s.emissiveMap;
    }
    m.name = role;
    mats[role] = m;
  }
  return mats;
}

/** Assign role materials to every mesh under root that has a role. */
export function applyMaterials(root, mats) {
  root.traverse((o) => {
    const role = o.userData.role;
    if (role && mats[role] && o.material !== mats[role]) o.material = mats[role];
  });
}

export function disposeMaterials(mats) {
  for (const m of Object.values(mats ?? {})) m.dispose();
}

/** Tag a mesh with a role (placeholder material until a preset is applied). */
export function role(mesh, name) {
  mesh.userData.role = name;
  return mesh;
}

// ---------------------------------------------------------------------------
// Inverted-hull outlines (flat graphic look): a back-face copy pushed out
// along the normals, drawn black.
// ---------------------------------------------------------------------------
export function createOutlineMaterial(thickness = 0.04, color = 0x111111) {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>\n transformed += normalize(normal) * ${thickness.toFixed(3)};`,
    );
  };
  m.customProgramCacheKey = () => `outline-${thickness}`;
  return m;
}
