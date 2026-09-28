// ---------------------------------------------------------------------------
// Corner posts with wind-driven flags
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z, FIELD_WIDTH } from '../config.js';

const FLAG_POST_HEIGHT = 1.5;
const FLAG_WIDTH = 1.0;
const FLAG_HEIGHT = 0.6;

function createCornerFlag(scene, x, z) {
  const group = new THREE.Group();
  const postGeo = new THREE.CylinderGeometry(0.03, 0.03, FLAG_POST_HEIGHT, 8);
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffdd00 });
  const post = new THREE.Mesh(postGeo, postMat);
  post.position.y = FLAG_POST_HEIGHT / 2;
  post.castShadow = true;
  group.add(post);

  const flagShape = new THREE.BufferGeometry();
  const vertices = new Float32Array([
    0, 0, 0,
    0, FLAG_HEIGHT, 0,
    FLAG_WIDTH, FLAG_HEIGHT * 0.5, 0,
  ]);
  flagShape.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  flagShape.computeVertexNormals();

  const flagMat = new THREE.MeshStandardMaterial({ color: 0xff1744, side: THREE.DoubleSide });
  const flag = new THREE.Mesh(flagShape, flagMat);
  flag.position.set(0, FLAG_POST_HEIGHT - FLAG_HEIGHT, 0);
  group.add(flag);

  group.position.set(x, 0, z);
  scene.add(group);
  return { group, flag };
}

export function createCornerFlags(scene) {
  const flags = [
    createCornerFlag(scene, -FIELD_WIDTH / 2, GOALPOST_Z),
    createCornerFlag(scene, FIELD_WIDTH / 2, GOALPOST_Z),
  ];

  function update(time, windDirDeg, windSpeed) {
    const windDirRad = (windDirDeg * Math.PI) / 180;
    const windNorm = Math.min(windSpeed / 8, 1);

    for (const { flag } of flags) {
      const positions = flag.geometry.attributes.position;
      const flutter = Math.sin(time * 12) * 0.08 * windNorm;
      const tipX = (Math.sin(windDirRad) * FLAG_WIDTH * windNorm) + flutter;
      const tipZ = (Math.cos(windDirRad) * FLAG_WIDTH * windNorm) + flutter * 0.5;
      const limpX = FLAG_WIDTH * 0.15;
      const limpZ = 0;
      const finalX = limpX + (tipX - limpX) * windNorm;
      const finalZ = limpZ + (tipZ - limpZ) * windNorm;
      const tipY = FLAG_HEIGHT * 0.5 - (1 - windNorm) * FLAG_HEIGHT * 0.3;

      positions.setXYZ(2, finalX, tipY, finalZ);
      positions.needsUpdate = true;
      flag.geometry.computeVertexNormals();
    }
  }

  return { update };
}
