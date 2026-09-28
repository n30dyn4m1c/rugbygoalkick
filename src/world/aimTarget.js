// ---------------------------------------------------------------------------
// Aim target (crosshair projected in the air at the goal plane)
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import {
  GOALPOST_Z, CROSSBAR_HEIGHT, UPRIGHT_HEIGHT, MAX_SPEED, KICK_ANGLE_RAD, GRAVITY,
} from '../config.js';

function buildCrosshair() {
  const group = new THREE.Group();
  const color = 0x00e5ff;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.6, 0.75, 32),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.85, depthTest: false }),
  );
  group.add(ring);

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(0.12, 16),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthTest: false }),
  );
  group.add(dot);

  const barMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthTest: false });
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.06), barMat);
    const angle = (i * Math.PI) / 2;
    bar.position.set(Math.cos(angle) * 0.95, Math.sin(angle) * 0.95, 0);
    bar.rotation.z = angle;
    group.add(bar);
  }

  // Vertical drop-line from crosshair to the ground
  const dropLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -1, 0)]),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }),
  );
  group.add(dropLine);

  group.renderOrder = 999;
  return { group, dropLine };
}

export function createAimTarget(scene) {
  const { group, dropLine } = buildCrosshair();
  scene.add(group);

  /** Re-project the crosshair for the current aim. */
  function update(yaw, kickX, kickZ) {
    const forward = Math.cos(yaw);
    if (forward < 0.001) {
      group.visible = false;
      return;
    }
    const t = (kickZ - GOALPOST_Z) / forward;
    const targetX = kickX + Math.sin(yaw) * t;

    // Height estimate at a representative 65% power
    const horizDist = Math.hypot(targetX - kickX, GOALPOST_Z - kickZ);
    const representativeSpeed = MAX_SPEED * 0.65;
    const vHoriz = representativeSpeed * Math.cos(KICK_ANGLE_RAD);
    const vVert = representativeSpeed * Math.sin(KICK_ANGLE_RAD);
    const tFlight = vHoriz > 0.01 ? horizDist / vHoriz : 1;
    const estimatedY = 0.3 + vVert * tFlight - 0.5 * GRAVITY * tFlight * tFlight;
    const targetY = Math.max(CROSSBAR_HEIGHT, Math.min(estimatedY, UPRIGHT_HEIGHT + 2));

    group.position.set(targetX, targetY, GOALPOST_Z);
    group.visible = true;

    const positions = dropLine.geometry.attributes.position;
    positions.setXYZ(1, 0, -targetY, 0);
    positions.needsUpdate = true;
    dropLine.geometry.computeBoundingSphere();

    group.lookAt(kickX, targetY, kickZ);
  }

  return { group, update };
}
