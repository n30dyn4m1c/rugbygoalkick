// ---------------------------------------------------------------------------
// Gradient sky dome with a sun glow and optional stars. The fog colour is set
// to the horizon colour so distant geometry melts into the sky.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww; // always at the far plane
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunSize;
  uniform float uSunGlow;
  uniform float uBands;
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 col = h > 0.0
      ? mix(uHorizon, uTop, pow(smoothstep(0.0, 0.55, h), 0.8))
      : mix(uHorizon, uBottom, smoothstep(0.0, -0.2, h));
    float d = max(dot(normalize(vDir), normalize(uSunDir)), 0.0);
    col += uSunColor * (smoothstep(1.0 - uSunSize, 1.0 - uSunSize * 0.6, d) + pow(d, 24.0) * uSunGlow);
    if (uBands > 0.0) col = floor(col * uBands + 0.5) / uBands; // posterised (flat graphic)
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function createSky(scene) {
  const uniforms = {
    uTop: { value: new THREE.Color() },
    uHorizon: { value: new THREE.Color() },
    uBottom: { value: new THREE.Color() },
    uSunDir: { value: new THREE.Vector3(0, 0.2, -1) },
    uSunColor: { value: new THREE.Color() },
    uSunSize: { value: 0.004 },
    uSunGlow: { value: 0.3 },
    uBands: { value: 0 },
  };
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(450, 32, 16),
    new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  dome.renderOrder = -1;
  dome.frustumCulled = false;
  scene.add(dome);

  // Stars (night only)
  const starGeo = new THREE.BufferGeometry();
  const pts = [];
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 400; i++) {
    const u = rand() * Math.PI * 2;
    const v = 0.08 + rand() * 0.9;
    const r = 420;
    pts.push(Math.cos(u) * Math.sqrt(1 - v * v) * r, v * r, Math.sin(u) * Math.sqrt(1 - v * v) * r);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.7 }));
  stars.visible = false;
  scene.add(stars);

  function apply(sky, fog) {
    uniforms.uTop.value.set(sky.top);
    uniforms.uHorizon.value.set(sky.horizon);
    uniforms.uBottom.value.set(sky.bottom ?? sky.horizon);
    uniforms.uSunColor.value.set(sky.sunColor ?? 0x000000);
    uniforms.uSunSize.value = sky.sunSize ?? 0.004;
    uniforms.uSunGlow.value = sky.sunGlow ?? 0.3;
    uniforms.uBands.value = sky.bands ?? 0;
    if (sky.sunDir) uniforms.uSunDir.value.set(...sky.sunDir).normalize();
    stars.visible = !!sky.stars;
    scene.fog = new THREE.Fog(fog.color ?? sky.horizon, fog.near, fog.far);
    scene.background = null;
  }

  return { apply, dome };
}
