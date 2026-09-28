// ---------------------------------------------------------------------------
// Scene, Camera, Renderer
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export function createRenderer(container = document.body, onResize = () => {}) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  function resize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    onResize();
  }
  window.addEventListener('resize', resize);

  // -------------------------------------------------------------------------
  // Adaptive resolution: step the pixel ratio down while frames are slow,
  // back up when there's headroom. Capped at min(devicePixelRatio, 2).
  // -------------------------------------------------------------------------
  const cap = Math.min(window.devicePixelRatio, 2);
  const steps = [cap, 1.5, 1.25, 1].filter((v, i, a) => v <= cap && a.indexOf(v) === i);
  let level = 0;
  let slow = 0;
  let fast = 0;
  let last = 0;
  let adaptive = true;

  function adapt(now) {
    if (!adaptive) return;
    const dt = last ? now - last : 16;
    last = now;
    if (dt > 100) return; // tab switch / hitch: ignore
    if (dt > 22) {
      slow++;
      fast = 0;
    } else if (dt < 13) {
      fast++;
      slow = 0;
    }
    if (slow > 90 && level < steps.length - 1) {
      level++;
      slow = 0;
      renderer.setPixelRatio(steps[level]);
      onResize();
    } else if (fast > 600 && level > 0) {
      level--;
      fast = 0;
      renderer.setPixelRatio(steps[level]);
      onResize();
    }
  }

  /** Turn adaptivity off (e.g. deterministic screenshots) and restore full resolution. */
  function setAdaptive(on) {
    adaptive = on;
    if (!on && level !== 0) {
      level = 0;
      renderer.setPixelRatio(steps[0]);
      onResize();
    }
  }

  return { scene, camera, renderer, adapt, setAdaptive, get pixelRatio() { return steps[level]; } };
}
