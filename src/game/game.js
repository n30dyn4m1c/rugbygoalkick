// ---------------------------------------------------------------------------
// Game — round flow and the per-step state machine
//
//   idle (title backdrop) → establish → tee → aim → flight → (next round | over)
//
// All timing runs on the game clock / fixed physics step, so pausing the loop
// pauses everything.
// ---------------------------------------------------------------------------
import * as THREE from 'three';
import {
  GOALPOST_Z, BALL_TEE_Y, TOTAL_ROUNDS, POINTS_PER_GOAL,
  ELEVATION_MIN_DEG, ELEVATION_MAX_DEG, ELEVATION_DEFAULT_DEG,
} from '../config.js';
import { simulate, isGoal, DT } from '../physics/simulate.js';
import {
  postAngle, suggestedTeeDistance, clampTeeDistance, yawToPosts, clampYaw,
} from '../physics/conversion.js';
import { describeWind } from '../physics/wind.js';
import { explain, RESULT_COPY } from '../physics/explain.js';
import { generateRound } from './round.js';
import { meterPower } from './meter.js';
import { keyLabel } from '../input/bindings.js';
import * as hud from '../ui/hud.js';

const DEG = Math.PI / 180;
const AIM_RATE = 16 * DEG; // rad/s at full stick / key
const ELEV_RATE = 14; // deg/s
const TEE_RATE = 9; // m/s
const FINE = 0.25;
const DRAG_AIM_GAIN = 0.35; // yaw change per radian of pull angle
const DRAG_CANCEL = 0.08; // release below this power cancels
const ESTABLISH_FIRST = 2.6;
const ESTABLISH = 1.4;
const RESULT_HOLD = 2.8;
const INPUT_GRACE = 0.12; // ignore the press that caused a state change
const BALL_SPIN = -2.2 * Math.PI * 2; // end over end, rad/s

/**
 * @param {object} deps
 * @param {object} deps.world    { ball, tee, tryMarker, preview, teeGuide, flags }
 * @param {object} deps.rig      camera rig
 * @param {THREE.Camera} deps.camera
 * @param {object} deps.input    unified input (input/input.js)
 * @param {object} deps.settings settings store
 * @param {() => number} deps.rng
 * @param {(phase: string) => void} [deps.onPhase]   phase changes (tutorial, audio…)
 * @param {(summary: object) => void} [deps.onMatchEnd]
 */
export function createGame({ world, rig, camera, input, settings, rng, onPhase = () => {}, onMatchEnd = () => {} }) {
  const { ball, tee, tryMarker, preview, teeGuide, flags } = world;

  const g = {
    state: 'idle',
    active: false, // false while a menu is open: game ignores input
    mode: 'match', // match | tutorial
    stateTime: 0,
    time: 0,
    round: 1,
    totalRounds: TOTAL_ROUNDS,
    points: 0,
    goals: 0,
    streak: 0,
    bestStreak: 0,
    log: [],
    roundInfo: null,
    teeDist: 20,
    suggestedDist: 20,
    yaw: 0,
    elevationDeg: ELEVATION_DEFAULT_DEG,
    lastPower: 0.7,
    meter: { running: false, t: 0 },
    drag: null,
    teeDrag: null,
    previewKey: '',
    previewResult: null,
    flight: null,
    firstRound: true,
  };

  // --- helpers ---------------------------------------------------------------

  const teePos = () => ({ x: g.roundInfo.tryX, y: BALL_TEE_Y, z: GOALPOST_Z + g.teeDist });
  const previewTier = () => Math.min(3, g.roundInfo.previewTier + (settings.get().previewAssist ? 1 : 0));
  const meterPeriod = () => g.roundInfo.meterPeriod * (settings.get().meterAssist ? 1.5 : 1);
  const angleDeg = () => postAngle(g.roundInfo.tryX, g.teeDist) / DEG;
  const currentKick = (power) => ({ start: teePos(), yaw: g.yaw, elevation: g.elevationDeg * DEG, power });

  function placeBallOnTee() {
    const p = teePos();
    tee.position.set(p.x, 0.04, p.z);
    ball.position.set(p.x, p.y, p.z);
    // Upright on the tee, leaning slightly back toward the kicker
    ball.quaternion.setFromAxisAngle(new THREE.Vector3(Math.cos(g.yaw), 0, Math.sin(g.yaw)), 0.3);
  }

  function windDesc(viewYaw = rig.viewYaw) {
    const desc = describeWind(g.roundInfo.wind, yawToPosts(g.roundInfo.tryX, GOALPOST_Z + g.teeDist));
    const arrow = describeWind(g.roundInfo.wind, viewYaw).arrowDeg;
    hud.setWind(desc, arrow);
  }

  function hint(kind) {
    const b = settings.get().bindings;
    const k = (a) => keyLabel(b[a][0]);
    const device = input.lastDevice;
    if (kind === 'tee') {
      if (device === 'keyboard') return `${k('raise')} ${k('lower')} move the tee · ${k('kick')} kick from here`;
      if (device === 'gamepad') return 'Stick up/down moves the tee · A: kick from here';
      return 'Drag along the line to move the tee';
    }
    if (kind === 'meter') {
      return device === 'gamepad' ? 'Press A again to kick' : `Press ${k('kick')} again to kick`;
    }
    if (device === 'keyboard') return `${k('aimLeft')} ${k('aimRight')} aim · ${k('raise')} ${k('lower')} height · ${k('kick')} start the meter`;
    if (device === 'gamepad') return 'Stick: aim and height · A: start the meter';
    return 'Drag back from anywhere · release to kick';
  }

  function go(state) {
    exit(g.state);
    g.state = state;
    g.stateTime = 0;
    enter(state);
  }

  // --- states ----------------------------------------------------------------

  function enter(state) {
    hud.setPhase(state);
    onPhase(state);
    switch (state) {
      case 'idle':
        ball.visible = false;
        tee.visible = false;
        tryMarker.visible = false;
        preview.visible = false;
        break;

      case 'establish': {
        const { tryX } = g.roundInfo;
        g.suggestedDist = suggestedTeeDistance(tryX);
        g.teeDist = g.suggestedDist;
        g.yaw = yawToPosts(tryX, GOALPOST_Z + g.teeDist);
        placeBallOnTee();
        ball.visible = false;
        tee.visible = false;
        tryMarker.position.set(tryX, 0.03, GOALPOST_Z);
        tryMarker.visible = true;
        preview.visible = false;
        const where = Math.abs(tryX) < 2 ? 'Try under the posts' : `Try, ${Math.abs(tryX).toFixed(0)} m ${tryX < 0 ? 'left' : 'right'} of the posts`;
        hud.setCaption(where, input.lastDevice === 'keyboard' ? 'Press any key to skip' : input.lastDevice === 'gamepad' ? 'Press A to skip' : 'Tap to skip');
        rig.cut({ x: tryX * 0.3, y: 20, z: GOALPOST_Z + 52 }, { x: tryX, y: 0, z: GOALPOST_Z });
        rig.teeShot(tryX, GOALPOST_Z + g.teeDist, longIntro() ? 1.1 : 2);
        windDesc(yawToPosts(tryX, GOALPOST_Z + g.teeDist));
        break;
      }

      case 'tee':
        if (settings.get().alwaysSuggestedTee) {
          go('aim');
          return;
        }
        ball.visible = true;
        tee.visible = true;
        teeGuide.visible = true;
        refreshTee();
        break;

      case 'aim':
        tryMarker.visible = false;
        ball.visible = true;
        tee.visible = true;
        g.yaw = yawToPosts(g.roundInfo.tryX, GOALPOST_Z + g.teeDist);
        placeBallOnTee();
        g.meter = { running: false, t: 0 };
        g.drag = null;
        g.previewKey = '';
        preview.visible = previewTier() > 0;
        hud.setElevation(g.elevationDeg);
        hud.setMeter(false);
        hud.setAimInfo(`${g.teeDist.toFixed(0)} m out · target ${angleDeg().toFixed(1)}°`, hint('aim'));
        rig.aimShot(teePos(), g.yaw, g.stateTime === 0 ? 2.5 : 4);
        break;

      case 'result':
        break;
    }
  }

  function exit(state) {
    switch (state) {
      case 'establish':
        hud.setCaption('');
        break;
      case 'tee':
        teeGuide.visible = false;
        g.teeDrag = null;
        break;
      case 'aim':
        preview.visible = false;
        hud.setMeter(false);
        hud.setDrag(null);
        break;
    }
  }

  function refreshTee() {
    const { tryX } = g.roundInfo;
    teeGuide.update(tryX, g.teeDist, g.suggestedDist, g.time);
    placeBallOnTee();
    const sug = Math.abs(g.teeDist - g.suggestedDist) < 0.25 ? ' · suggested' : ` · suggested ${g.suggestedDist.toFixed(0)} m`;
    hud.setTeeInfo(`${g.teeDist.toFixed(0)} m out · target ${angleDeg().toFixed(1)}°${sug}`, hint('tee'));
    rig.teeShot(tryX, GOALPOST_Z + g.teeDist, 3);
  }

  function kick(power) {
    const k = currentKick(power);
    g.lastPower = power;
    const result = simulate(k, g.roundInfo.wind);
    const firstHit = result.events[0]?.t;
    let revealT;
    if (result.crossing) revealT = result.crossing.t + 0.15;
    else if (firstHit !== undefined) revealT = firstHit + 0.6;
    else revealT = (result.landing?.t ?? result.duration) + 0.1;
    // Where the kick was decided: goal-plane crossing, first post hit, or landing
    const focus = result.crossing
      ? { x: result.crossing.x, y: result.crossing.y, z: GOALPOST_Z }
      : result.events[0]?.point ?? result.landing ?? result.samples.at(-1);
    g.flight = { kick: k, result, focus, t: 0, revealT: Math.min(revealT, result.duration), revealed: false, doneAt: null };
    go('flight');
  }

  function revealResult() {
    const f = g.flight;
    const { outcome } = f.result;
    const copy = RESULT_COPY[outcome];
    const scored = isGoal(outcome);
    if (scored) {
      g.points += POINTS_PER_GOAL;
      g.goals++;
      g.streak++;
      g.bestStreak = Math.max(g.bestStreak, g.streak);
    } else {
      g.streak = 0;
    }
    g.log.push({ round: g.round, outcome, teeDist: g.teeDist, tryX: g.roundInfo.tryX, crossing: f.result.crossing });
    hud.setScore(g.round, g.totalRounds, g.points);
    hud.showResult({
      title: copy.title,
      tone: copy.tone,
      points: scored ? POINTS_PER_GOAL : 0,
      why: explain(f.kick, g.roundInfo.wind, f.result),
      next: g.round >= g.totalRounds ? (g.mode === 'tutorial' ? 'Done' : 'See the summary') : 'Next kick',
    });
    hud.setPhase('result');
    onPhase('result');
    f.revealed = true;
    f.doneAt = f.t;
  }

  function longIntro() {
    return g.firstRound || settings.get().introEveryRound;
  }

  function nextRound() {
    if (g.state === 'over') return;
    onPhase('next');
    if (g.round >= g.totalRounds) {
      go('over');
      g.flight = null;
      onMatchEnd({
        mode: g.mode,
        points: g.points,
        goals: g.goals,
        total: g.totalRounds,
        bestStreak: g.bestStreak,
        log: g.log,
      });
      return;
    }
    g.round++;
    g.firstRound = false;
    setupRound();
  }

  function setupRound() {
    g.roundInfo = g.mode === 'tutorial'
      // Calm, slightly off-centre, full preview and a slow meter
      ? { difficulty: 0, tryX: -9, wind: { x: 0, z: 0 }, windSpeed: 0, previewTier: 3, meterPeriod: 2 }
      : generateRound(g.round, g.totalRounds, rng);
    g.flight = null;
    hud.setScore(g.round, g.totalRounds, g.points);
    go('establish');
  }

  function start(mode = 'match') {
    g.mode = mode;
    g.totalRounds = mode === 'tutorial' ? 1 : TOTAL_ROUNDS;
    g.round = 1;
    g.points = 0;
    g.goals = 0;
    g.streak = 0;
    g.bestStreak = 0;
    g.log = [];
    g.active = true;
    setupRound();
  }

  /** Title backdrop: slow orbit around the posts, nothing interactive. */
  function idle() {
    g.active = false;
    g.flight = null;
    if (!g.roundInfo) g.roundInfo = { tryX: 0, wind: { x: 1.5, z: -1 }, previewTier: 0, meterPeriod: 1.6 };
    go('idle');
  }

  // --- aiming ----------------------------------------------------------------

  function updatePreview(power) {
    const key = `${g.yaw.toFixed(4)}|${g.elevationDeg.toFixed(2)}|${power.toFixed(3)}|${g.teeDist}`;
    if (key === g.previewKey) return;
    g.previewKey = key;
    g.previewResult = simulate(currentKick(power), g.roundInfo.wind, { untilLanding: true, maxTime: 6 });
    preview.update(g.previewResult, previewTier());
  }

  function setElevation(deg) {
    g.elevationDeg = Math.min(Math.max(deg, ELEVATION_MIN_DEG), ELEVATION_MAX_DEG);
    hud.setElevation(g.elevationDeg);
  }

  function pullMax() {
    return Math.min(Math.max(window.innerHeight * 0.3, 140), 280);
  }

  function dragState(d) {
    const dx = d.x1 - d.x0;
    const dy = d.y1 - d.y0; // + = pulled down / back
    const len = Math.hypot(dx, dy);
    const power = dy > 0 ? Math.min(len / pullMax(), 1) : 0;
    const sens = settings.get().aimSensitivity * (settings.get().invertDragAim ? -1 : 1);
    const pullAngle = len > 12 ? Math.atan2(-dx, Math.max(dy, 1)) : 0; // slingshot: pull left → aim right
    return { power, yaw: clampYaw(d.yaw0 + pullAngle * DRAG_AIM_GAIN * sens), cancel: power < DRAG_CANCEL };
  }

  function updateAim(dt) {
    const axes = input.axes();
    const fine = axes.fine ? FINE : 1;
    const sens = settings.get().aimSensitivity;

    if (!g.drag) {
      if (axes.aim) g.yaw = clampYaw(g.yaw + axes.aim * AIM_RATE * sens * fine * dt);
      if (axes.elev) setElevation(g.elevationDeg + axes.elev * ELEV_RATE * fine * dt);
    }

    let power = g.lastPower;
    if (g.meter.running) {
      g.meter.t += dt;
      power = meterPower(g.meter.t, meterPeriod());
      hud.setMeter(true, power);
    } else if (g.drag) {
      const s = dragState(g.drag);
      g.yaw = s.yaw;
      power = Math.max(s.power, DRAG_CANCEL);
    }

    updatePreview(power);
    rig.aimShot(teePos(), g.yaw);
    placeBallOnTee();
  }

  // --- flight ------------------------------------------------------------------

  const spinAxis = new THREE.Vector3();
  const spinQ = new THREE.Quaternion();

  function updateFlight(dt) {
    const f = g.flight;
    const { samples, landing, duration } = f.result;
    f.t = Math.min(f.t + dt, duration);
    const idx = f.t / DT;
    const i = Math.min(Math.floor(idx), samples.length - 2);
    const a = samples[i];
    const b = samples[i + 1];
    const u = Math.min(Math.max(idx - i, 0), 1);
    ball.position.set(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u, a.z + (b.z - a.z) * u);

    // End-over-end spin about the kick's right axis, dying away once it lands
    const spin = landing && f.t > landing.t ? BALL_SPIN * Math.max(0, 1 - (f.t - landing.t) * 1.5) : BALL_SPIN;
    spinAxis.set(Math.cos(f.kick.yaw), 0, Math.sin(f.kick.yaw));
    spinQ.setFromAxisAngle(spinAxis, spin * dt);
    ball.quaternion.premultiply(spinQ);

    if (!f.revealed) rig.follow(ball.position, f.kick.yaw);
    else rig.resultShot(f.focus);

    if (!f.revealed && f.t >= f.revealT) revealResult();
    if (f.revealed && f.t - f.doneAt >= RESULT_HOLD) nextRound();
  }

  // --- input events -------------------------------------------------------------

  const raycaster = new THREE.Raycaster();
  const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  const hitPoint = new THREE.Vector3();

  function groundZAt(x, y) {
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.ray.intersectPlane(ground, hitPoint) ? hitPoint.z : null;
  }

  input.on('any', () => {
    if (!g.active) return;
    if (g.state === 'establish' && g.stateTime > INPUT_GRACE) go('tee');
    else if (g.flight?.revealed && g.flight.t - g.flight.doneAt > 0.35) nextRound();
  });

  input.on('press', ({ action }) => {
    if (!g.active || g.stateTime < INPUT_GRACE) return;
    if (g.state === 'tee' && (action === 'kick' || action === 'confirm')) {
      go('aim');
    } else if (g.state === 'aim' && action === 'kick' && !g.drag) {
      if (!g.meter.running) {
        g.meter = { running: true, t: 0 };
        onPhase('meter');
        hud.setAimInfo(`${g.teeDist.toFixed(0)} m out · target ${angleDeg().toFixed(1)}°`, hint('meter'));
      } else {
        kick(meterPower(g.meter.t, meterPeriod()));
      }
    }
  });

  input.on('pointer', (e) => {
    if (!g.active) return;
    if (g.state === 'tee') {
      if (e.phase === 'down' && g.stateTime > INPUT_GRACE) g.teeDrag = { id: e.id };
      if (g.teeDrag?.id !== e.id) return;
      if (e.phase === 'down' || e.phase === 'move') {
        const z = groundZAt(e.x, e.y);
        if (z !== null) {
          g.teeDist = Math.round(clampTeeDistance(z - GOALPOST_Z) * 2) / 2;
          refreshTee();
        }
      } else {
        g.teeDrag = null;
      }
      return;
    }

    if (g.state !== 'aim' || g.meter.running) return;
    if (e.phase === 'down' && !g.drag && g.stateTime > INPUT_GRACE) {
      g.drag = { id: e.id, x0: e.x, y0: e.y, x1: e.x, y1: e.y, yaw0: g.yaw };
    }
    if (!g.drag || g.drag.id !== e.id) return;
    g.drag.x1 = e.x;
    g.drag.y1 = e.y;
    const s = dragState(g.drag);
    if (e.phase === 'up') {
      const d = g.drag;
      g.drag = null;
      hud.setDrag(null);
      if (s.cancel) g.yaw = d.yaw0;
      else kick(s.power);
    } else if (e.phase === 'cancel') {
      g.yaw = g.drag.yaw0;
      g.drag = null;
      hud.setDrag(null);
    } else {
      hud.setDrag({ ...g.drag, power: s.power, cancel: s.cancel });
    }
  });

  input.on('wheel', ({ delta }) => {
    if (!g.active) return;
    if (g.state === 'aim') setElevation(g.elevationDeg - delta);
    if (g.state === 'tee') {
      g.teeDist = clampTeeDistance(g.teeDist + delta);
      refreshTee();
    }
  });

  input.on('device', () => {
    if (g.state === 'aim') hud.setAimInfo(`${g.teeDist.toFixed(0)} m out · target ${angleDeg().toFixed(1)}°`, hint(g.meter.running ? 'meter' : 'aim'));
    if (g.state === 'tee') refreshTee();
  });

  hud.onElevationInput((deg) => {
    if (g.state === 'aim') setElevation(deg);
  });

  hud.onTeeConfirm(() => {
    if (g.active && g.state === 'tee') go('aim');
  });

  hud.onNext(() => {
    if (g.active && g.flight?.revealed) nextRound();
  });

  // --- main update ---------------------------------------------------------------

  function update(dt) {
    g.time += dt;
    g.stateTime += dt;
    input.update();
    flags.update(g.time, g.roundInfo.wind);

    switch (g.state) {
      case 'idle': {
        const a = g.time * 0.06;
        rig.moveTo(
          { x: Math.sin(a) * 34, y: 11 + Math.sin(a * 0.7) * 2, z: GOALPOST_Z + 30 + Math.cos(a) * 14 },
          { x: 0, y: 5, z: GOALPOST_Z },
          0.8,
        );
        break;
      }

      case 'establish':
        if (g.stateTime >= (longIntro() ? ESTABLISH_FIRST : ESTABLISH)) go('tee');
        break;

      case 'tee': {
        const { elev, fine } = input.axes();
        if (elev) {
          g.teeDist = clampTeeDistance(g.teeDist - elev * TEE_RATE * (fine ? FINE : 1) * dt);
          refreshTee();
        } else {
          teeGuide.update(g.roundInfo.tryX, g.teeDist, g.suggestedDist, g.time);
        }
        break;
      }

      case 'aim':
        updateAim(dt);
        hud.setWindArrow(describeWind(g.roundInfo.wind, rig.viewYaw).arrowDeg);
        break;

      case 'flight':
      case 'result':
        updateFlight(dt);
        break;
    }
    rig.update(dt);
  }

  return {
    state: g,
    start,
    idle,
    update,
    setActive(on) {
      g.active = on;
      if (!on) {
        g.drag = null;
        hud.setDrag(null);
      }
    },
    // Debug helpers (used by window.__game)
    debug: {
      go,
      kick,
      next: nextRound,
      setAim({ yaw, elevationDeg, teeDist } = {}) {
        if (teeDist !== undefined) g.teeDist = clampTeeDistance(teeDist);
        if (yaw !== undefined) g.yaw = clampYaw(yaw);
        if (elevationDeg !== undefined) setElevation(elevationDeg);
        g.previewKey = '';
        placeBallOnTee();
      },
      yawToPosts: () => yawToPosts(g.roundInfo.tryX, GOALPOST_Z + g.teeDist),
    },
  };
}
