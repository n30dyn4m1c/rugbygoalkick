// ---------------------------------------------------------------------------
// Optional post-processing (bloom). Loaded lazily so the default bundle
// doesn't pay for it; render() falls back to a plain render when off.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export function createPost(renderer, scene, camera) {
  let composer = null;
  let enabled = false;
  let loading = null;

  async function load() {
    const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
      import('three/examples/jsm/postprocessing/EffectComposer.js'),
      import('three/examples/jsm/postprocessing/RenderPass.js'),
      import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
      import('three/examples/jsm/postprocessing/OutputPass.js'),
    ]);
    const size = renderer.getSize(new THREE.Vector2());
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    // Restrained: only lamps, lit boards and white lines cross the threshold
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), 0.28, 0.35, 0.9));
    composer.addPass(new OutputPass());
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(size.x, size.y);
  }

  return {
    setBloom(on) {
      enabled = on;
      if (on && !composer && !loading) loading = load();
    },
    get bloom() {
      return enabled;
    },
    whenReady() {
      return loading ?? Promise.resolve();
    },
    resize(w, h) {
      composer?.setPixelRatio(renderer.getPixelRatio());
      composer?.setSize(w, h);
    },
    render() {
      if (enabled && composer) composer.render();
      else renderer.render(scene, camera);
    },
  };
}
