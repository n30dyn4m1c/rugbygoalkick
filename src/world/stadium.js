// ---------------------------------------------------------------------------
// Stadium
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { FIELD_WIDTH } from '../config.js';

function createCrowdTexture(width, height, rng) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#555';
  ctx.fillRect(0, 0, width, height);
  const fleshTones = ['#d2a679', '#c68e5b', '#e0c8a8', '#8d6e4c', '#f5d0b0'];
  const shirtColors = ['#1565c0', '#c62828', '#fff', '#ffea00', '#4caf50', '#ff9800', '#9c27b0'];
  for (let i = 0; i < width * height * 0.15; i++) {
    const x = rng() * width;
    const y = rng() * height;
    ctx.fillStyle = fleshTones[Math.floor(rng() * fleshTones.length)];
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shirtColors[Math.floor(rng() * shirtColors.length)];
    ctx.fillRect(x - 1, y + 1.5, 2.5, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createStadium(scene, rng = Math.random) {
  const stadiumGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x707070 });
  const blueSeatMat = new THREE.MeshStandardMaterial({ color: 0x1565c0 });
  const redSeatMat = new THREE.MeshStandardMaterial({ color: 0xc62828 });

  function createStand(xPos, zPos, length, facingDir, tiers) {
    const standGroup = new THREE.Group();
    const tierDepth = 4;
    const tierHeight = 3;

    for (let i = 0; i < tiers; i++) {
      const seatColor = i % 2 === 0 ? blueSeatMat : redSeatMat;

      const tierGeo = facingDir === 'x'
        ? new THREE.BoxGeometry(tierDepth, tierHeight, length)
        : new THREE.BoxGeometry(length, tierHeight, tierDepth);

      const tierMesh = new THREE.Mesh(tierGeo, concreteMat);
      let tx, tz;
      if (facingDir === 'x') {
        tx = xPos + (xPos > 0 ? 1 : -1) * i * tierDepth;
        tz = zPos;
      } else {
        tx = xPos;
        tz = zPos + (zPos > 0 ? 1 : -1) * i * tierDepth;
      }
      tierMesh.position.set(tx, i * tierHeight + tierHeight / 2, tz);
      tierMesh.receiveShadow = true;
      standGroup.add(tierMesh);

      const topGeo = facingDir === 'x'
        ? new THREE.PlaneGeometry(tierDepth, length)
        : new THREE.PlaneGeometry(length, tierDepth);
      const topMesh = new THREE.Mesh(topGeo, seatColor);
      topMesh.rotation.x = -Math.PI / 2;
      topMesh.position.set(tx, i * tierHeight + tierHeight + 0.01, tz);
      standGroup.add(topMesh);

      const crowdTex = createCrowdTexture(128, 64, rng);
      const crowdMat = new THREE.MeshBasicMaterial({ map: crowdTex });
      if (facingDir === 'x') {
        const crowdGeo = new THREE.PlaneGeometry(tierHeight, length);
        const crowdMesh = new THREE.Mesh(crowdGeo, crowdMat);
        crowdMesh.rotation.y = xPos > 0 ? -Math.PI / 2 : Math.PI / 2;
        const faceX = xPos > 0 ? tx - tierDepth / 2 : tx + tierDepth / 2;
        crowdMesh.position.set(faceX, i * tierHeight + tierHeight / 2, tz);
        standGroup.add(crowdMesh);
      } else {
        const crowdGeo = new THREE.PlaneGeometry(length, tierHeight);
        const crowdMesh = new THREE.Mesh(crowdGeo, crowdMat);
        const faceZ = zPos > 0 ? tz - tierDepth / 2 : tz + tierDepth / 2;
        if (zPos < 0) crowdMesh.rotation.y = Math.PI;
        crowdMesh.position.set(tx, i * tierHeight + tierHeight / 2, faceZ);
        standGroup.add(crowdMesh);
      }
    }
    return standGroup;
  }

  const fieldLength = 130;

  stadiumGroup.add(createStand(40, -5, fieldLength, 'x', 4));
  stadiumGroup.add(createStand(-40, -5, fieldLength, 'x', 4));
  stadiumGroup.add(createStand(0, -68, FIELD_WIDTH, 'z', 3));
  stadiumGroup.add(createStand(0, 58, FIELD_WIDTH, 'z', 3));

  scene.add(stadiumGroup);
  return stadiumGroup;
}
