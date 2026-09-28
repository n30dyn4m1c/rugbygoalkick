// ---------------------------------------------------------------------------
// World-space info label (canvas sprite)
// ---------------------------------------------------------------------------
import * as THREE from 'three';

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, 512, 128);
  ctx.strokeStyle = '#ffea00';
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, 500, 116);
  ctx.fillStyle = '#ffea00';
  ctx.font = 'bold 56px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(14, 3.5, 1);
  sprite.renderOrder = 999;
  return sprite;
}

export function createInfoLabel(scene) {
  const sprite = createTextSprite('Info');
  sprite.visible = false;
  scene.add(sprite);

  function show(text, position) {
    const canvas = sprite.material.map.image;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.rect(0, 0, 512, 128);
    ctx.fill();
    ctx.fillStyle = '#ffea00';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);

    sprite.material.map.needsUpdate = true;
    sprite.position.set(position.x, position.y, position.z);
    sprite.visible = true;
  }

  function hide() {
    sprite.visible = false;
  }

  return { sprite, show, hide };
}
