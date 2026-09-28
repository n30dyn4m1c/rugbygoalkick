// ---------------------------------------------------------------------------
// Camera rig — framerate-independent easing toward per-shot goals, with a
// field of view that widens in portrait so the posts stay in frame.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import { GOALPOST_Z } from '../config.js';

const MIN_HFOV_DEG = 56;

export function createCameraRig(camera) {
  const pos = new THREE.Vector3(0, 2, 0);
  const look = new THREE.Vector3(0, 2, GOALPOST_Z);
  const posGoal = pos.clone();
  const lookGoal = look.clone();
  let rate = 3;

  function fitAspect() {
    const hfov = (MIN_HFOV_DEG * Math.PI) / 180;
    const vfov = (2 * Math.atan(Math.tan(hfov / 2) / camera.aspect) * 180) / Math.PI;
    camera.fov = Math.min(Math.max(vfov, 50), 78);
    camera.updateProjectionMatrix();
  }

  const fwd = (yaw) => ({ x: Math.sin(yaw), z: -Math.cos(yaw) });

  return {
    fitAspect,

    cut(p, l) {
      pos.set(p.x, p.y, p.z);
      look.set(l.x, l.y, l.z);
      posGoal.copy(pos);
      lookGoal.copy(look);
    },

    /** Ease toward a new position/look-at at `r` (1/s). */
    moveTo(p, l, r = 3) {
      posGoal.set(p.x, p.y, p.z);
      lookGoal.set(l.x, l.y, l.z);
      rate = r;
    },

    /** Elevated view behind the conversion line that shows the tee and the posts. */
    teeShot(tryX, teeZ, r = 3) {
      const portrait = camera.aspect < 1;
      const back = portrait ? 20 : 15;
      const height = portrait ? 17 : 12;
      this.moveTo(
        { x: tryX * 0.6, y: height, z: teeZ + back },
        { x: tryX * 0.45, y: 0, z: (teeZ + GOALPOST_Z) / 2 - 2 },
        r,
      );
    },

    /** Behind the ball, facing along the aim; ball low in frame, posts ahead. */
    aimShot(tee, yaw, r = 4) {
      const f = fwd(yaw);
      const portrait = camera.aspect < 1;
      const back = portrait ? 3.1 : 3.9;
      const height = portrait ? 1.45 : 1.6;
      this.moveTo(
        { x: tee.x - f.x * back, y: height, z: tee.z - f.z * back },
        { x: tee.x + f.x * 30, y: portrait ? 3.6 : 2.6, z: tee.z + f.z * 30 },
        r,
      );
    },

    /** Chase the ball from behind along the kick direction. */
    follow(ball, yaw, r = 3.2) {
      const f = fwd(yaw);
      this.moveTo(
        { x: ball.x - f.x * 7, y: Math.max(1.2, ball.y * 0.75 + 2), z: ball.z - f.z * 7 },
        ball,
        r,
      );
    },

    /** After the result: frame the posts around the point the kick was decided. */
    resultShot(focus, r = 1.8) {
      const x = focus.x * 0.6;
      const portrait = camera.aspect < 1;
      this.moveTo(
        { x, y: 3.4, z: Math.max(focus.z, GOALPOST_Z) + (portrait ? 24 : 19) },
        { x, y: Math.min(Math.max(focus.y, 3.5), 6), z: GOALPOST_Z },
        r,
      );
    },

    update(dt) {
      const k = 1 - Math.exp(-rate * dt);
      pos.lerp(posGoal, k);
      look.lerp(lookGoal, Math.min(1, k * 1.4));
      camera.position.copy(pos);
      camera.lookAt(look);
    },

    /** Horizontal viewing yaw (0 = downfield), for screen-space HUD arrows. */
    get viewYaw() {
      return Math.atan2(look.x - pos.x, pos.z - look.z);
    },
  };
}
