// ---------------------------------------------------------------------------
// Camera rig — lerp-based moves between shots
// ---------------------------------------------------------------------------
import * as THREE from 'three';

export function createCameraRig(camera) {
  const followOffset = new THREE.Vector3(0, 3, 6);
  const lookTarget = new THREE.Vector3();
  const lookDest = new THREE.Vector3();
  const posTarget = new THREE.Vector3();
  const tmp = new THREE.Vector3();

  return {
    posTarget,
    lookDest,

    /** Cut to a position/look-at immediately. */
    cut(pos, look) {
      camera.position.set(pos.x, pos.y, pos.z);
      lookTarget.set(look.x, look.y, look.z);
      lookDest.copy(lookTarget);
      camera.lookAt(lookTarget);
    },

    hold() {
      camera.lookAt(lookTarget);
    },

    /** Ease position toward posTarget and gaze toward lookDest. */
    glide(dt, rate) {
      camera.position.lerp(posTarget, dt * rate);
      lookTarget.lerp(lookDest, dt * rate);
      camera.lookAt(lookTarget);
    },

    /** Behind-the-ball aiming view, panning with the crosshair. */
    aim(dt, kickX, kickZ, tilt, aimPos) {
      posTarget.set(kickX, 1.5 + tilt, kickZ + 5);
      lookTarget.set(aimPos.x, aimPos.y, aimPos.z);
      camera.position.lerp(posTarget, dt * 3);
      camera.lookAt(lookTarget);
    },

    lookFrom(pos) {
      lookTarget.set(pos.x, pos.y, pos.z);
    },

    follow(dt, ballPos) {
      tmp.copy(ballPos).add(followOffset);
      camera.position.lerp(tmp, dt * 3);
      lookTarget.lerp(ballPos, dt * 5);
      camera.lookAt(lookTarget);
    },
  };
}
