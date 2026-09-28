// ---------------------------------------------------------------------------
// Decorative banner pattern: abstract geometric bands (zigzag, diamond,
// chevron, triangle) in the red/black/gold palette. Deliberately generic —
// inspired by the geometry of Melanesian design, not copied from any clan,
// region or sacred motif.
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export function createPatternTexture({ colors = ['#111111', '#f2b705', '#c8102e', '#f4efe6'], width = 512, height = 64 } = {}) {
  const [ink, gold, red, cream] = colors;
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const g = c.getContext('2d');
  g.fillStyle = ink;
  g.fillRect(0, 0, width, height);

  const h = height;
  const unit = h; // one motif per square
  for (let x = 0, i = 0; x < width; x += unit, i++) {
    switch (i % 4) {
      case 0: // nested diamonds
        for (const [s, col] of [[0.46, gold], [0.32, red], [0.18, cream]]) {
          g.fillStyle = col;
          g.beginPath();
          g.moveTo(x + unit / 2, h / 2 - h * s);
          g.lineTo(x + unit / 2 + unit * s, h / 2);
          g.lineTo(x + unit / 2, h / 2 + h * s);
          g.lineTo(x + unit / 2 - unit * s, h / 2);
          g.closePath();
          g.fill();
        }
        break;
      case 1: // chevrons
        g.strokeStyle = gold;
        g.lineWidth = h * 0.09;
        for (let k = 0; k < 3; k++) {
          const yy = h * (0.25 + k * 0.25);
          g.beginPath();
          g.moveTo(x + unit * 0.12, yy - h * 0.12);
          g.lineTo(x + unit / 2, yy + h * 0.08);
          g.lineTo(x + unit * 0.88, yy - h * 0.12);
          g.stroke();
        }
        break;
      case 2: // opposed triangles
        g.fillStyle = red;
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + unit, 0);
        g.lineTo(x + unit / 2, h / 2);
        g.fill();
        g.fillStyle = gold;
        g.beginPath();
        g.moveTo(x, h);
        g.lineTo(x + unit, h);
        g.lineTo(x + unit / 2, h / 2);
        g.fill();
        break;
      case 3: // zigzag band
        g.strokeStyle = cream;
        g.lineWidth = h * 0.1;
        g.beginPath();
        for (let k = 0; k <= 4; k++) g.lineTo(x + (k / 4) * unit, k % 2 ? h * 0.3 : h * 0.7);
        g.stroke();
        break;
    }
  }
  // Borders
  g.fillStyle = gold;
  g.fillRect(0, 0, width, h * 0.06);
  g.fillRect(0, h * 0.94, width, h * 0.06);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  return tex;
}

/** Mowing stripes: bands across the field. */
export function createStripeTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 2;
  const g = c.getContext('2d');
  g.fillStyle = a;
  g.fillRect(0, 0, 4, 1);
  g.fillStyle = b;
  g.fillRect(0, 1, 4, 1);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = 8;
  return tex;
}

/** Soft radial glow for floodlight heads. */
export function createGlowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,250,235,0.55)');
  grad.addColorStop(1, 'rgba(255,245,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
