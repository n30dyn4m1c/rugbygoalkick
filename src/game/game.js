// ---------------------------------------------------------------------------
// Game — round flow and the per-frame state machine
//
// States per round:
//   intro_field → intro_try → intro_kick → intro_position → aiming → charging → kicked
// ---------------------------------------------------------------------------
import {
  GOALPOST_Z, TOTAL_ROUNDS, MAX_SPEED, KICK_ANGLE_RAD, POWER_SPEED, AIM_SPEED,
  MAX_AIM_OFFSET, MAX_AIM_YAW, TILT_SPEED, MAX_TILT, BALL_TEE_Y, BALL_GROUND_Y,
} from '../config.js';
import { launchVelocity, positionAt, hasLanded } from '../physics/flight.js';
import { judgeKick, OUTCOME } from '../physics/scoring.js';
import { generateRound } from './round.js';
import * as hud from '../ui/hud.js';

const RESULT_DELAY = 3; // seconds of game time before the next round

const RESULT_MESSAGES = {
  [OUTCOME.GOAL]: ['GOAL! Great kick!', '#00e676'],
  [OUTCOME.WIDE]: ['WIDE! Missed the posts.', '#ff5252'],
  [OUTCOME.SHORT]: ['SHORT! Try more power.', '#ffab00'],
  [OUTCOME.LOW]: ['TOO LOW! Hit the crossbar.', '#ff9100'],
};

/**
 * @param {object} deps
 * @param {object} deps.world   { ball, tee, tryMarker, infoLabel, aimTarget, flags }
 * @param {object} deps.rig     camera rig
 * @param {object} deps.keys    held-key state
 * @param {object} deps.clock   game clock (core/clock.js)
 * @param {() => number} deps.rng
 */
export function createGame({ world, rig, keys, clock, rng }) {
  const { ball, tee, tryMarker, infoLabel, aimTarget, flags } = world;

  const g = {
    state: 'intro_field',
    round: 1,
    score: 0,
    introTimer: 0,
    power: 0,
    tilt: 0,
    aimYaw: 0,
    kickArmed: false,
    roundInfo: null,
    ballInFlight: false,
    flightTime: 0,
    ballStart: { x: 0, y: 0, z: 0 },
    ballVel: { x: 0, y: 0, z: 0 },
    resultShown: false,
  };

  function placeBallOnTee() {
    const { kickX, kickZ } = g.roundInfo;
    ball.position.set(kickX, BALL_TEE_Y, kickZ);
    ball.rotation.set(0, 0, 0);
    tee.position.set(kickX, 0.04, kickZ);
  }

  function setupRound() {
    g.roundInfo = generateRound(g.round, TOTAL_ROUNDS, rng);
    const { tryX, kickX, kickZ, windSpeed, windDirDeg } = g.roundInfo;
    g.aimYaw = 0; // Start looking straight downfield

    placeBallOnTee();
    ball.visible = false;
    tee.visible = false;

    tryMarker.position.set(tryX, 0.03, GOALPOST_Z);
    tryMarker.visible = false;

    hud.updateRoundUI(g.round, TOTAL_ROUNDS, g.score);
    hud.updateWindUI(windSpeed, windDirDeg);
    aimTarget.update(g.aimYaw, kickX, kickZ);
    hud.updatePowerUI(0);

    g.state = 'intro_field';
    g.introTimer = 0;
    infoLabel.hide();

    // Establishing shot: standing on halfway looking at the posts
    rig.cut({ x: 0, y: 2, z: 0 }, { x: 0, y: 2, z: GOALPOST_Z });

    g.power = 0;
    g.ballInFlight = false;
    g.flightTime = 0;
    g.resultShown = false;
    aimTarget.group.visible = false;

    hud.hideMessage();
    g.tilt = 0;
    hud.setInstructions('');
  }

  function launch(power01) {
    g.ballVel = launchVelocity(power01, g.aimYaw, MAX_SPEED, KICK_ANGLE_RAD);
    g.ballStart = { x: ball.position.x, y: ball.position.y, z: ball.position.z };
    g.flightTime = 0;
    g.ballInFlight = true;
  }

  function updateBallPhysics(dt) {
    if (!g.ballInFlight) return;
    g.flightTime += dt;
    const p = positionAt(g.ballStart, g.ballVel, g.roundInfo.wind, g.flightTime);
    ball.position.set(p.x, p.y, p.z);
    ball.rotation.x += dt * 8;
    ball.rotation.z += dt * 3;

    if (hasLanded(p, g.flightTime)) {
      ball.position.y = BALL_GROUND_Y;
      g.ballInFlight = false;
      checkResult();
    }
  }

  function checkResult() {
    if (g.resultShown) return;
    const { outcome } = judgeKick({
      start: g.ballStart,
      vel: g.ballVel,
      wind: g.roundInfo.wind,
      landingTime: g.flightTime,
    });
    const [text, color] = RESULT_MESSAGES[outcome];
    g.resultShown = true;
    hud.showMessage(text, color);
    if (outcome === OUTCOME.GOAL) {
      g.score++;
      hud.updateRoundUI(g.round, TOTAL_ROUNDS, g.score);
    }
    scheduleNextRound();
  }

  function scheduleNextRound() {
    clock.after(RESULT_DELAY, () => {
      if (g.round >= TOTAL_ROUNDS) {
        hud.showGameOver(g.score, TOTAL_ROUNDS);
      } else {
        g.round++;
        setupRound();
      }
    });
  }

  function restart() {
    clock.clear();
    hud.hideGameOver();
    g.round = 1;
    g.score = 0;
    setupRound();
  }

  function sideName(x) {
    return x < -2 ? 'left' : (x > 2 ? 'right' : 'centre');
  }

  function updateIntro(dt, elapsed) {
    const { tryX, kickX, kickZ } = g.roundInfo;
    g.introTimer += dt;

    switch (g.state) {
      case 'intro_field':
        rig.hold();
        if (g.introTimer > 1.5) {
          g.state = 'intro_try';
          g.introTimer = 0;
          const dist = Math.abs(tryX).toFixed(0);
          const sideText = Math.abs(tryX) <= 2 ? 'centre' : `${dist}m from centre (${sideName(tryX)})`;
          infoLabel.show(`Try scored ${sideText}!`, { x: tryX, y: 8, z: GOALPOST_Z });
          tryMarker.visible = true;
        }
        break;

      case 'intro_try':
        rig.hold();
        tryMarker.visible = Math.floor(elapsed * 6) % 2 === 0; // blink
        if (g.introTimer > 2.5) {
          g.state = 'intro_kick';
          g.introTimer = 0;
          tryMarker.visible = false;
          const distGoal = Math.abs(kickZ - GOALPOST_Z).toFixed(0);
          const distSide = Math.abs(kickX).toFixed(0);
          infoLabel.show(`Kick: ${distSide}m from ${sideName(kickX)}, ${distGoal}m out`, { x: kickX, y: 8, z: kickZ });
          ball.visible = true;
          tee.visible = true;
        }
        break;

      case 'intro_kick':
        rig.hold();
        if (g.introTimer > 2.5) {
          g.state = 'intro_position';
          g.introTimer = 0;
          infoLabel.hide();
          rig.posTarget.set(kickX, 1.5, kickZ + 5);
          rig.lookDest.set(kickX, 1.5, GOALPOST_Z);
        }
        break;

      case 'intro_position':
        rig.glide(dt, 2.5);
        if (g.introTimer > 2.0) enterAiming();
        break;
    }
  }

  function enterAiming() {
    g.state = 'aiming';
    g.introTimer = 0;
    aimTarget.group.visible = false; // hidden until the player aims
    // A Space held over from the previous round must be released first
    g.kickArmed = !keys.kick;
    hud.setInstructions('LEFT/RIGHT to aim \u2014 UP/DOWN to tilt \u2014 Hold SPACE to charge');
  }

  /** Debug: jump straight to aiming with the camera behind the ball. */
  function skipIntro() {
    const { kickX, kickZ } = g.roundInfo;
    infoLabel.hide();
    tryMarker.visible = false;
    ball.visible = true;
    tee.visible = true;
    rig.cut({ x: kickX, y: 1.5, z: kickZ + 5 }, { x: kickX, y: 1.5, z: GOALPOST_Z });
    enterAiming();
  }

  /** Debug: kick immediately with the given aim and power. */
  function kickNow(yaw, power01) {
    if (g.state.startsWith('intro_')) skipIntro();
    g.aimYaw = yaw;
    g.power = power01;
    hud.updatePowerUI(power01);
    launch(power01);
    g.state = 'kicked';
    rig.lookFrom(ball.position);
    hud.setInstructions('');
    aimTarget.group.visible = false;
  }

  function update(dt, elapsed) {
    flags.update(elapsed, g.roundInfo.windDirDeg, g.roundInfo.windSpeed);

    if (g.state === 'aiming') {
      const pulse = 0.9 + Math.sin(elapsed * 3) * 0.1;
      aimTarget.group.scale.set(pulse, 1, pulse);
    }

    if (g.state.startsWith('intro_')) updateIntro(dt, elapsed);

    const { kickX, kickZ, autoAim } = g.roundInfo;
    switch (g.state) {
      case 'aiming':
        if (keys.left || keys.right) aimTarget.group.visible = true;
        if (keys.left) g.aimYaw -= AIM_SPEED;
        if (keys.right) g.aimYaw += AIM_SPEED;
        g.aimYaw = Math.max(autoAim - MAX_AIM_OFFSET, Math.min(autoAim + MAX_AIM_OFFSET, g.aimYaw));
        g.aimYaw = Math.max(-MAX_AIM_YAW, Math.min(MAX_AIM_YAW, g.aimYaw));

        if (keys.up) g.tilt = Math.min(g.tilt + TILT_SPEED * 10, MAX_TILT);
        if (keys.down) g.tilt = Math.max(g.tilt - TILT_SPEED * 10, -MAX_TILT);

        aimTarget.update(g.aimYaw, kickX, kickZ);
        rig.aim(dt, kickX, kickZ, g.tilt, aimTarget.group.position);

        if (!keys.kick) g.kickArmed = true;
        if (keys.kick && g.kickArmed) {
          g.state = 'charging';
          g.power = 0;
          aimTarget.group.visible = true;
          hud.setInstructions('Release SPACE to kick!');
        }
        break;

      case 'charging':
        g.power = Math.min(g.power + POWER_SPEED * dt, 1);
        hud.updatePowerUI(g.power);
        if (!keys.kick) {
          launch(g.power);
          g.state = 'kicked';
          rig.lookFrom(ball.position);
          hud.setInstructions('');
          aimTarget.group.visible = false;
        }
        break;

      case 'kicked':
        updateBallPhysics(dt);
        if (g.ballInFlight) rig.follow(dt, ball.position);
        break;
    }
  }

  return { state: g, setupRound, update, restart, skipIntro, kickNow };
}
