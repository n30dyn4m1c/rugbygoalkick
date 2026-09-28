// ---------------------------------------------------------------------------
// Rugby ball: a prolate spheroid lathed around its long (local Y) axis, with a
// generated panel texture: four seams, a stripe band and a generic mark.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { role } from './materials.js';

// Slightly larger than a real ball (~0.28 m) so it reads on a phone
export const BALL_LENGTH = 0.34;
export const BALL_RADIUS_VIS = 0.105;

function ballProfile(segments = 20) {
  const pts = [];
  const half = BALL_LENGTH / 2;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments; // 0 = bottom tip, 1 = top tip
    const y = -half + t * BALL_LENGTH;
    const u = y / half;
    const r = BALL_RADIUS_VIS * Math.pow(Math.max(0, 1 - u * u), 0.62);
    pts.push(new THREE.Vector2(Math.max(r, 0.0015), y));
  }
  return pts;
}

function ballTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#f5f2ea';
  g.fillRect(0, 0, 512, 256);
  // Stripe bands (u runs around the ball, v along it)
  for (const [y, h, col] of [[92, 14, '#c8102e'], [110, 6, '#161616'], [140, 6, '#161616'], [150, 14, '#f2b705']]) {
    g.fillStyle = col;
    g.fillRect(0, y, 512, h);
  }
  // Generic mark on two opposite panels: a simple diamond, no branding
  for (const x of [64, 320]) {
    g.fillStyle = '#161616';
    g.beginPath();
    g.moveTo(x, 40);
    g.lineTo(x + 22, 62);
    g.lineTo(x, 84);
    g.lineTo(x - 22, 62);
    g.fill();
  }
  // Four seams
  g.fillStyle = 'rgba(60, 50, 40, 0.75)';
  for (let k = 0; k < 4; k++) g.fillRect(k * 128 - 1.5, 0, 3, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createBall(scene) {
  const geo = new THREE.LatheGeometry(ballProfile(), 32);
  const ball = role(new THREE.Mesh(geo), 'ball');
  ball.castShadow = true;
  ball.userData.outline = true;
  ball.userData.map = ballTexture();
  scene.add(ball);
  return ball;
}

// ---------------------------------------------------------------------------
// Kicking tee: weighted base, short stem, cupped top
// ---------------------------------------------------------------------------
export const TEE_HEIGHT = 0.07;

export function createTee(scene) {
  const profile = [
    [0.0, 0.0], [0.11, 0.0], [0.115, 0.008], [0.1, 0.016], [0.04, 0.026],
    [0.03, 0.05], [0.045, 0.062], [0.06, TEE_HEIGHT], [0.052, TEE_HEIGHT], [0.03, 0.058], [0.0, 0.056],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const tee = role(new THREE.Mesh(new THREE.LatheGeometry(profile, 24)), 'tee');
  tee.castShadow = true;
  scene.add(tee);
  return tee;
}
