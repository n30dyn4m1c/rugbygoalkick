import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Scene, Camera, Renderer
// ---------------------------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);
scene.fog = new THREE.Fog(0x87ceeb, 80, 200);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------------------------------------------------------------------------
// Lighting
// ---------------------------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
dirLight.position.set(20, 40, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(1024, 1024);
dirLight.shadow.camera.left = -50;
dirLight.shadow.camera.right = 50;
dirLight.shadow.camera.top = 50;
dirLight.shadow.camera.bottom = -50;
scene.add(dirLight);

// ---------------------------------------------------------------------------
// Goalpost & Field Constants
// ---------------------------------------------------------------------------
const GOALPOST_Z = -50;
const IN_GOAL_DEPTH = 10;
const DEAD_BALL_Z = GOALPOST_Z - IN_GOAL_DEPTH;
const UPRIGHT_HEIGHT = 15;
const UPRIGHT_SEPARATION = 5.6;
const CROSSBAR_HEIGHT = 3;

// ---------------------------------------------------------------------------
// Ground
// ---------------------------------------------------------------------------
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const inGoalGeo = new THREE.PlaneGeometry(68, IN_GOAL_DEPTH);
const inGoalMat = new THREE.MeshStandardMaterial({ color: 0x1b5e20 });
const inGoal = new THREE.Mesh(inGoalGeo, inGoalMat);
inGoal.rotation.x = -Math.PI / 2;
inGoal.position.set(0, 0.005, GOALPOST_Z - IN_GOAL_DEPTH / 2);
scene.add(inGoal);

for (let z = GOALPOST_Z; z <= GOALPOST_Z + 100; z += 10) {
  const lineGeo = new THREE.PlaneGeometry(68, 0.15);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const line = new THREE.Mesh(lineGeo, lineMat);
  line.rotation.x = -Math.PI / 2;
  line.position.set(0, 0.01, z);
  scene.add(line);
}

const deadBallGeo = new THREE.PlaneGeometry(68, 0.25);
const deadBallMat = new THREE.MeshBasicMaterial({ color: 0xff5252 });
const deadBallLine = new THREE.Mesh(deadBallGeo, deadBallMat);
deadBallLine.rotation.x = -Math.PI / 2;
deadBallLine.position.set(0, 0.02, DEAD_BALL_Z);
scene.add(deadBallLine);

for (const xSide of [-34, 34]) {
  const sideGeo = new THREE.PlaneGeometry(0.15, 120);
  const sideMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const sideLine = new THREE.Mesh(sideGeo, sideMat);
  sideLine.rotation.x = -Math.PI / 2;
  sideLine.position.set(xSide, 0.01, GOALPOST_Z + 50);
  scene.add(sideLine);
}

for (let dist = 10; dist <= 40; dist += 10) {
  for (const side of [-1, 1]) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(dist + 'm', 32, 24);
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.scale.set(3, 1.5, 1);
    sprite.position.set(side * 36, 0.5, GOALPOST_Z + dist);
    scene.add(sprite);
  }
}

const tryLineGeo = new THREE.PlaneGeometry(68, 0.3);
const tryLineMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
const tryLine = new THREE.Mesh(tryLineGeo, tryLineMat);
tryLine.rotation.x = -Math.PI / 2;
tryLine.position.set(0, 0.02, GOALPOST_Z);
scene.add(tryLine);

// ---------------------------------------------------------------------------
// Corner Posts with Flags
// ---------------------------------------------------------------------------
const FLAG_POST_HEIGHT = 1.5;
const FLAG_WIDTH = 1.0;
const FLAG_HEIGHT = 0.6;
const cornerFlags = [];

function createCornerFlag(x, z) {
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

  const flagMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    side: THREE.DoubleSide,
  });
  const flag = new THREE.Mesh(flagShape, flagMat);
  flag.position.set(0, FLAG_POST_HEIGHT - FLAG_HEIGHT, 0);
  group.add(flag);

  group.position.set(x, 0, z);
  scene.add(group);
  return { group, flag };
}

const cornerPositions = [
  [-34, GOALPOST_Z],
  [34, GOALPOST_Z],
];
for (const [cx, cz] of cornerPositions) {
  cornerFlags.push(createCornerFlag(cx, cz));
}

function updateCornerFlags(time) {
  const windDirRad = (windDirDeg * Math.PI) / 180;
  const windNorm = Math.min(windSpeed / 8, 1);

  for (const { flag } of cornerFlags) {
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

// ---------------------------------------------------------------------------
// Goalposts
// ---------------------------------------------------------------------------
function createGoalpost() {
  const group = new THREE.Group();
  const postMat = new THREE.MeshStandardMaterial({ color: 0xffffff });

  const leftGeo = new THREE.CylinderGeometry(0.12, 0.12, UPRIGHT_HEIGHT, 12);
  const leftPost = new THREE.Mesh(leftGeo, postMat);
  leftPost.position.set(-UPRIGHT_SEPARATION, UPRIGHT_HEIGHT / 2, 0);
  leftPost.castShadow = true;
  group.add(leftPost);

  const rightPost = leftPost.clone();
  rightPost.position.set(UPRIGHT_SEPARATION, UPRIGHT_HEIGHT / 2, 0);
  group.add(rightPost);

  const barLen = UPRIGHT_SEPARATION * 2;
  const barGeo = new THREE.CylinderGeometry(0.1, 0.1, barLen, 12);
  const crossbar = new THREE.Mesh(barGeo, postMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, CROSSBAR_HEIGHT, 0);
  crossbar.castShadow = true;
  group.add(crossbar);

  group.position.set(0, 0, GOALPOST_Z);
  return group;
}

const goalpost = createGoalpost();
scene.add(goalpost);

// ---------------------------------------------------------------------------
// Stadium
// ---------------------------------------------------------------------------
function createStadium() {
  const stadiumGroup = new THREE.Group();
  const concreteMat = new THREE.MeshStandardMaterial({ color: 0x707070 });
  const blueSeatMat = new THREE.MeshStandardMaterial({ color: 0x1565c0 });
  const redSeatMat = new THREE.MeshStandardMaterial({ color: 0xc62828 });

  function createCrowdTexture(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, width, height);
    const fleshTones = ['#d2a679', '#c68e5b', '#e0c8a8', '#8d6e4c', '#f5d0b0'];
    const shirtColors = ['#1565c0', '#c62828', '#fff', '#ffea00', '#4caf50', '#ff9800', '#9c27b0'];
    for (let i = 0; i < width * height * 0.15; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      ctx.fillStyle = fleshTones[Math.floor(Math.random() * fleshTones.length)];
      ctx.beginPath();
      ctx.arc(x, y, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = shirtColors[Math.floor(Math.random() * shirtColors.length)];
      ctx.fillRect(x - 1, y + 1.5, 2.5, 3);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }

  function createStand(xPos, zPos, lengthAxis, length, facingDir, tiers) {
    const standGroup = new THREE.Group();
    const tierDepth = 4;
    const tierHeight = 3;

    for (let i = 0; i < tiers; i++) {
      const seatColor = i % 2 === 0 ? blueSeatMat : redSeatMat;

      let tierGeo;
      if (facingDir === 'x') {
        tierGeo = new THREE.BoxGeometry(tierDepth, tierHeight, length);
      } else {
        tierGeo = new THREE.BoxGeometry(length, tierHeight, tierDepth);
      }

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

      let topGeo;
      if (facingDir === 'x') {
        topGeo = new THREE.PlaneGeometry(tierDepth, length);
      } else {
        topGeo = new THREE.PlaneGeometry(length, tierDepth);
      }
      const topMesh = new THREE.Mesh(topGeo, seatColor);
      topMesh.rotation.x = -Math.PI / 2;
      topMesh.position.set(tx, i * tierHeight + tierHeight + 0.01, tz);
      standGroup.add(topMesh);

      const crowdTex = createCrowdTexture(128, 64);
      const crowdMat = new THREE.MeshBasicMaterial({ map: crowdTex });
      let crowdGeo;
      if (facingDir === 'x') {
        crowdGeo = new THREE.PlaneGeometry(tierHeight, length);
        const crowdMesh = new THREE.Mesh(crowdGeo, crowdMat);
        crowdMesh.rotation.y = xPos > 0 ? -Math.PI / 2 : Math.PI / 2;
        const faceX = xPos > 0
          ? tx - tierDepth / 2
          : tx + tierDepth / 2;
        crowdMesh.position.set(faceX, i * tierHeight + tierHeight / 2, tz);
        standGroup.add(crowdMesh);
      } else {
        crowdGeo = new THREE.PlaneGeometry(length, tierHeight);
        const crowdMesh = new THREE.Mesh(crowdGeo, crowdMat);
        const faceZ = zPos > 0
          ? tz - tierDepth / 2
          : tz + tierDepth / 2;
        if (zPos < 0) {
          crowdMesh.rotation.y = Math.PI;
        }
        crowdMesh.position.set(tx, i * tierHeight + tierHeight / 2, faceZ);
        standGroup.add(crowdMesh);
      }
    }
    return standGroup;
  }

  const fieldLength = 130;
  const fieldWidth = 68;

  stadiumGroup.add(createStand(40, -5, 'z', fieldLength, 'x', 4));
  stadiumGroup.add(createStand(-40, -5, 'z', fieldLength, 'x', 4));
  stadiumGroup.add(createStand(0, -68, 'x', fieldWidth, 'z', 3));
  stadiumGroup.add(createStand(0, 58, 'x', fieldWidth, 'z', 3));

  return stadiumGroup;
}

const stadium = createStadium();
scene.add(stadium);

// ---------------------------------------------------------------------------
// Kicking Tee
// ---------------------------------------------------------------------------
const teeGeo = new THREE.ConeGeometry(0.12, 0.08, 12);
const teeMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 }); // Brown
const kickingTee = new THREE.Mesh(teeGeo, teeMat);
kickingTee.rotation.x = Math.PI;
kickingTee.position.y = 0.04;
scene.add(kickingTee);

// ---------------------------------------------------------------------------
// Rugby Ball (WHITE)
// ---------------------------------------------------------------------------
function createBall() {
  const geo = new THREE.SphereGeometry(0.22, 16, 16);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const b = new THREE.Mesh(geo, mat);
  b.scale.set(1, 1.5, 1);
  b.castShadow = true;
  return b;
}

const ball = createBall();
scene.add(ball);

const seamGeo = new THREE.TorusGeometry(0.18, 0.012, 6, 24);
const seamMat = new THREE.MeshBasicMaterial({ color: 0x999999 });
const seam = new THREE.Mesh(seamGeo, seamMat);
ball.add(seam);

// ---------------------------------------------------------------------------
// Try Marker
// ---------------------------------------------------------------------------
const tryMarkerGeo = new THREE.CircleGeometry(0.6, 24);
const tryMarkerMat = new THREE.MeshBasicMaterial({ color: 0xff1744, side: THREE.DoubleSide });
const tryMarker = new THREE.Mesh(tryMarkerGeo, tryMarkerMat);
tryMarker.rotation.x = -Math.PI / 2;
tryMarker.position.y = 0.03;
scene.add(tryMarker);

// 3D label for info (try/kick stats)
const infoLabelSprite = createTextSprite('Info');
infoLabelSprite.visible = false;
scene.add(infoLabelSprite);

function createTextSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(0, 0, 512, 128);

  // Draw border
  ctx.strokeStyle = '#ffea00';
  ctx.lineWidth = 12; // Thicker border
  ctx.strokeRect(6, 6, 500, 116);

  // Draw text
  ctx.fillStyle = '#ffea00';
  ctx.font = 'bold 56px Arial'; // Larger font
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(14, 3.5, 1); // Even larger scale for 50m visibility
  sprite.renderOrder = 999;
  return sprite;
}

function updateInfoLabel(text, position) {
  const canvas = infoLabelSprite.material.map.image;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.beginPath();
  ctx.rect(0, 0, 512, 128);
  ctx.fill();

  // Text
  ctx.fillStyle = '#ffea00';
  ctx.font = 'bold 36px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);

  infoLabelSprite.material.map.needsUpdate = true;
  infoLabelSprite.position.copy(position);
  infoLabelSprite.visible = true;
}

// ---------------------------------------------------------------------------
// Aim Line removed — crosshair in the air replaces it
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Aim Target Marker (crosshair projected IN THE AIR at goalpost plane)
// ---------------------------------------------------------------------------
function createAimTarget() {
  const group = new THREE.Group();

  // Outer ring — vertical, facing the kicker
  const ringGeo = new THREE.RingGeometry(0.6, 0.75, 32);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
    depthTest: false,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  group.add(ring);

  // Inner dot
  const dotGeo = new THREE.CircleGeometry(0.12, 16);
  const dotMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  const dot = new THREE.Mesh(dotGeo, dotMat);
  group.add(dot);

  // Crosshair lines (4 short bars) — arranged on a vertical plane
  const barMat = new THREE.MeshBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthTest: false,
  });
  const barLen = 0.5;
  const barW = 0.06;
  for (let i = 0; i < 4; i++) {
    const barGeo = new THREE.PlaneGeometry(barLen, barW);
    const bar = new THREE.Mesh(barGeo, barMat);
    const angle = (i * Math.PI) / 2;
    const offset = 0.95;
    bar.position.set(
      Math.cos(angle) * offset,
      Math.sin(angle) * offset,
      0
    );
    bar.rotation.z = angle;
    group.add(bar);
  }

  // Vertical drop-line from crosshair down to ground (thin dashed-style line)
  const dropLineMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff,
    transparent: true,
    opacity: 0.4,
  });
  const dropLineGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, -1, 0), // will be updated dynamically
  ]);
  const dropLine = new THREE.Line(dropLineGeo, dropLineMat);
  dropLine.name = 'dropLine';
  group.add(dropLine);

  group.renderOrder = 999;
  return group;
}

const aimTarget = createAimTarget();
scene.add(aimTarget);

// ---------------------------------------------------------------------------
// Game Constants & State
// ---------------------------------------------------------------------------
const TOTAL_ROUNDS = 10;
const GRAVITY = 9.8;
const MAX_SPEED = 32;
const KICK_ANGLE_RAD = Math.PI / 4.2;
const POWER_SPEED = 0.7;
const AIM_SPEED = 0.02;
const MAX_AIM_OFFSET = Math.PI / 3; // Increased to allow straight-forward aiming

let currentRound = 1;
let score = 0;
let state = 'intro_try'; // intro_try | intro_kick | aiming | charging | kicked
let introTimer = 0;
let power = 0;

let tryX = 0;
let kickX = 0;
let kickZ = 15;

let aimAngle = 0;
let autoAim = 0;

let windX = 0;
let windZ = 0;
let windSpeed = 0;
let windDirDeg = 0;

let ballInFlight = false;
let ballVelocity = new THREE.Vector3();
let flightTime = 0;
let ballStartPos = new THREE.Vector3();

let spaceDown = false;
let leftDown = false;
let rightDown = false;
let upDown = false;
let downDown = false;

let camTilt = 0; // Vertical tilt offset
const TILT_SPEED = 0.015;
const MAX_TILT = 2;

const camOffset = new THREE.Vector3(0, 3, 6);
const camLookTarget = new THREE.Vector3();
const camLookDest = new THREE.Vector3();
const camPosTarget = new THREE.Vector3(); // For smooth transitions

let resultShown = false;

// ---------------------------------------------------------------------------
// Round Setup — difficulty scales with currentRound
// ---------------------------------------------------------------------------
function setupRound() {
  // Difficulty progression factor: 0 (round 1) → 1 (round TOTAL_ROUNDS)
  const diff = (currentRound - 1) / (TOTAL_ROUNDS - 1);

  // --- Try position: wider kicks in later rounds ---
  // Early: ±10m from centre.  Late: up to ±30m from centre
  const maxTryWidth = 10 + diff * 20; // 10 → 30
  tryX = (Math.random() - 0.5) * 2 * maxTryWidth;

  // Bias toward wider positions in later rounds
  if (diff > 0.5) {
    const minWidth = maxTryWidth * 0.4;
    if (Math.abs(tryX) < minWidth) {
      tryX = (tryX >= 0 ? 1 : -1) * (minWidth + Math.random() * (maxTryWidth - minWidth));
    }
  }

  // --- Kick placement: Rugby League Rules (Law 6 Sec 3) ---
  // Kick is taken on a line perpendicular to the goal line through the point of grounding.
  kickX = tryX;

  // Distance from goal line is at the kicker's discretion. 
  // We'll scale it for difficulty: ~15m (easy) to ~35m (hard).
  const baseDistance = 15 + diff * 20; // 15 → 35
  const distVariation = 3;
  kickZ = GOALPOST_Z + baseDistance + (Math.random() - 0.5) * distVariation + Math.abs(tryX) * 0.15;

  const dx = 0 - kickX;
  const dz = GOALPOST_Z - kickZ;
  autoAim = Math.atan2(dx, dz);
  aimAngle = Math.PI; // Start looking straight forward (parallel to Z)

  // Place ball on tee but hide for now
  updateBallPosition();
  ball.visible = false;
  kickingTee.visible = false;

  tryMarker.position.set(tryX, 0.03, GOALPOST_Z); // Move to try line exactly
  tryMarker.visible = false;

  // --- Wind: stronger and more unpredictable in later rounds ---
  // Early: 0–2 m/s.  Late: 3–8 m/s
  windDirDeg = Math.random() * 360;
  const minWind = diff * 3;            // 0 → 3
  const maxWind = 2 + diff * 6;        // 2 → 8
  windSpeed = minWind + Math.random() * (maxWind - minWind);
  const windDirRad = (windDirDeg * Math.PI) / 180;
  windX = Math.sin(windDirRad) * windSpeed;
  windZ = Math.cos(windDirRad) * windSpeed;

  updateRoundUI();
  updateWindUI();
  updateAimTarget();
  updatePowerUI(0);

  // Start sequence
  state = 'intro_field';
  introTimer = 0;

  infoLabelSprite.visible = false;

  // Initial Camera for 'intro_field': Standing at 50m (z=0) looking forward (z negative)
  camera.position.set(0, 2, 0);
  camLookTarget.set(0, 2, GOALPOST_Z);
  camLookDest.copy(camLookTarget);
  camera.lookAt(camLookTarget);

  power = 0;
  ballInFlight = false;
  flightTime = 0;
  resultShown = false;

  aimTarget.visible = false;

  hideMessage();
  camTilt = 0; // Reset tilt for new round

  document.getElementById('instructions').textContent = '';
}

function updateBallPosition() {
  ball.position.set(kickX, 0.3, kickZ);
  ball.rotation.set(0, 0, 0);
  kickingTee.position.set(kickX, 0.04, kickZ);
}

function updateIdleCamera(dt) {
  const camHeight = (state === 'aiming' || state === 'charging') ? (1.5 + camTilt) : 2;
  const cx = (state === 'aiming' || state === 'charging') ? kickX : 0;
  const cz = (state === 'aiming' || state === 'charging') ? (kickZ + 5) : 0;

  camPosTarget.set(cx, camHeight, cz);

  if (state === 'aiming' || state === 'charging') {
    // Pan with aim: look at the aim target crosshair (even if invisible)
    camLookTarget.set(aimTarget.position.x, aimTarget.position.y, aimTarget.position.z);
  } else {
    // During intro, look at the centre of the posts from 50m
    camLookTarget.set(0, 2, GOALPOST_Z);
  }

  camera.position.lerp(camPosTarget, dt * 3);
  camera.lookAt(camLookTarget);
}



// ---------------------------------------------------------------------------
// Aim Target Update (crosshair projected IN THE AIR at goalpost plane)
// ---------------------------------------------------------------------------
function updateAimTarget() {
  // Project aim direction to z = GOALPOST_Z
  const cosA = Math.cos(aimAngle);
  if (Math.abs(cosA) < 0.001) {
    aimTarget.visible = false;
    return;
  }
  const t = (GOALPOST_Z - kickZ) / cosA;
  if (t < 0) {
    aimTarget.visible = false;
    return;
  }
  const targetX = kickX + Math.sin(aimAngle) * t;

  // Estimate height at goalpost plane using projectile physics
  // Horizontal distance along aim direction
  const horizDist = Math.sqrt(
    Math.pow(targetX - kickX, 2) + Math.pow(GOALPOST_Z - kickZ, 2)
  );
  // Time of flight to goalpost at mid-power (assume a representative trajectory)
  const representativeSpeed = MAX_SPEED * 0.65;
  const vHoriz = representativeSpeed * Math.cos(KICK_ANGLE_RAD);
  const vVert = representativeSpeed * Math.sin(KICK_ANGLE_RAD);
  const tFlight = vHoriz > 0.01 ? horizDist / vHoriz : 1;
  const estimatedY = 0.3 + vVert * tFlight - 0.5 * GRAVITY * tFlight * tFlight;

  // Clamp height to a reasonable range
  const targetY = Math.max(CROSSBAR_HEIGHT, Math.min(estimatedY, UPRIGHT_HEIGHT + 2));

  aimTarget.position.set(targetX, targetY, GOALPOST_Z);
  aimTarget.visible = true;

  // Update drop-line to reach the ground
  const dropLine = aimTarget.getObjectByName('dropLine');
  if (dropLine) {
    const positions = dropLine.geometry.attributes.position;
    positions.setXYZ(1, 0, -targetY, 0);
    positions.needsUpdate = true;
    dropLine.geometry.computeBoundingSphere();
  }

  // Make crosshair face the kicker
  aimTarget.lookAt(kickX, targetY, kickZ);
}

// ---------------------------------------------------------------------------
// UI Updates
// ---------------------------------------------------------------------------
function updateRoundUI() {
  document.getElementById('round-counter').textContent =
    `Round ${currentRound} / ${TOTAL_ROUNDS}`;
  document.getElementById('score-display').textContent =
    `Goals: ${score} / ${TOTAL_ROUNDS}`;
}



function updateWindUI() {
  const speed = windSpeed.toFixed(1);

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(windDirDeg / 45) % 8;
  const dirName = dirs[idx];

  document.getElementById('wind-text').textContent = `Wind: ${speed} m/s ${dirName}`;

  const arrowEl = document.getElementById('wind-arrow-ptr');
  if (arrowEl) {
    const cssDeg = windDirDeg - 90;
    arrowEl.style.transform = `translate(0, -50%) rotate(${cssDeg}deg)`;

    let color;
    if (windSpeed <= 2) {
      color = '#4caf50';
    } else if (windSpeed <= 5) {
      const t = (windSpeed - 2) / 3;
      const r = Math.round(76 + t * (255 - 76));
      const g = Math.round(175 + t * (235 - 175));
      const b = Math.round(80 - t * 80);
      color = `rgb(${r},${g},${b})`;
    } else {
      const t = Math.min((windSpeed - 5) / 3, 1);
      const r = Math.round(255);
      const g = Math.round(235 - t * 200);
      const b = Math.round(0 + t * 30);
      color = `rgb(${r},${g},${b})`;
    }
    arrowEl.style.background = color;
    arrowEl.style.color = color;
  }
}

function updatePowerUI(p) {
  const pct = Math.round(p * 100);
  document.getElementById('power-bar-fill').style.width = pct + '%';
  document.getElementById('power-value').textContent = pct + '%';
}

// ---------------------------------------------------------------------------
// Physics
// ---------------------------------------------------------------------------
function launchBall(power01) {
  const speed = MAX_SPEED * Math.max(power01, 0.1);
  const vx = speed * Math.cos(KICK_ANGLE_RAD) * Math.sin(aimAngle);
  const vy = speed * Math.sin(KICK_ANGLE_RAD);
  const vz = speed * Math.cos(KICK_ANGLE_RAD) * Math.cos(aimAngle);

  ballVelocity.set(vx, vy, vz);
  ballStartPos.copy(ball.position);
  flightTime = 0;
  ballInFlight = true;
}

function updateBallPhysics(dt) {
  if (!ballInFlight) return;

  flightTime += dt;
  const t = flightTime;

  ball.position.x = ballStartPos.x + ballVelocity.x * t + 0.5 * windX * t * t;
  ball.position.y = ballStartPos.y + ballVelocity.y * t - 0.5 * GRAVITY * t * t;
  ball.position.z = ballStartPos.z + ballVelocity.z * t + 0.5 * windZ * t * t;

  ball.rotation.x += dt * 8;
  ball.rotation.z += dt * 3;

  if (ball.position.y <= 0.33 && t > 0.2) {
    ball.position.y = 0.33;
    ballInFlight = false;
    checkResult();
  }
}

// ---------------------------------------------------------------------------
// Result Check
// ---------------------------------------------------------------------------
function checkResult() {
  if (resultShown) return;

  const bz = ball.position.z;

  if (bz > GOALPOST_Z + 1) {
    showMessage('SHORT! Try more power.', '#ffab00');
    scheduleNextRound();
    return;
  }

  const a = 0.5 * windZ;
  const b_coeff = ballVelocity.z;
  const c = ballStartPos.z - GOALPOST_Z;

  let tAtGoal;
  if (Math.abs(a) < 0.0001) {
    tAtGoal = -c / b_coeff;
  } else {
    const disc = b_coeff * b_coeff - 4 * a * c;
    if (disc < 0) {
      showMessage('WIDE! Missed the posts.', '#ff5252');
      scheduleNextRound();
      return;
    }
    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b_coeff + sqrtDisc) / (2 * a);
    const t2 = (-b_coeff - sqrtDisc) / (2 * a);
    const candidates = [t1, t2].filter(t => t > 0);
    if (candidates.length === 0) {
      showMessage('WIDE! Missed the posts.', '#ff5252');
      scheduleNextRound();
      return;
    }
    tAtGoal = Math.min(...candidates);
  }

  const yAtGoal = ballStartPos.y + ballVelocity.y * tAtGoal - 0.5 * GRAVITY * tAtGoal * tAtGoal;
  const xAtGoal = ballStartPos.x + ballVelocity.x * tAtGoal + 0.5 * windX * tAtGoal * tAtGoal;

  const betweenPosts = Math.abs(xAtGoal) < UPRIGHT_SEPARATION;
  const aboveCrossbar = yAtGoal > CROSSBAR_HEIGHT;

  if (betweenPosts && aboveCrossbar) {
    showMessage('GOAL! Great kick!', '#00e676');
    score++;
    updateRoundUI();
  } else if (!betweenPosts) {
    showMessage('WIDE! Missed the posts.', '#ff5252');
  } else {
    showMessage('TOO LOW! Hit the crossbar.', '#ff9100');
  }
  scheduleNextRound();
}

function showMessage(text, color) {
  resultShown = true;
  const el = document.getElementById('message');
  el.textContent = text;
  el.style.color = color;
  el.style.display = 'block';
}

function hideMessage() {
  const el = document.getElementById('message');
  el.style.display = 'none';
  resultShown = false;
}

function scheduleNextRound() {
  setTimeout(() => {
    if (currentRound >= TOTAL_ROUNDS) {
      showGameOver();
    } else {
      currentRound++;
      setupRound();
    }
  }, 3000);
}

// ---------------------------------------------------------------------------
// Game Over
// ---------------------------------------------------------------------------
function showGameOver() {
  document.getElementById('final-score').textContent =
    `You scored ${score} / ${TOTAL_ROUNDS}`;
  const overlay = document.getElementById('game-over');
  overlay.style.display = 'flex';
}

function hideGameOver() {
  document.getElementById('game-over').style.display = 'none';
}

document.getElementById('play-again-btn').addEventListener('click', () => {
  hideGameOver();
  currentRound = 1;
  score = 0;

  setupRound();
});

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------
window.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !e.repeat) {
    e.preventDefault();
    spaceDown = true;
  }
  if (e.code === 'ArrowLeft') {
    e.preventDefault();
    leftDown = true;
  }
  if (e.code === 'ArrowRight') {
    e.preventDefault();
    rightDown = true;
  }
  if (e.code === 'ArrowUp') {
    e.preventDefault();
    upDown = true;
  }
  if (e.code === 'ArrowDown') {
    e.preventDefault();
    downDown = true;
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    spaceDown = false;
  }
  if (e.code === 'ArrowLeft') {
    leftDown = false;
  }
  if (e.code === 'ArrowRight') {
    rightDown = false;
  }
  if (e.code === 'ArrowUp') {
    upDown = false;
  }
  if (e.code === 'ArrowDown') {
    downDown = false;
  }
});

// ---------------------------------------------------------------------------
// Camera Tracking & Animation
// ---------------------------------------------------------------------------
function updateCamera(dt) {
  if (state === 'kicked' && ballInFlight) {
    const target = ball.position.clone().add(camOffset);
    camera.position.lerp(target, dt * 3);
    camLookTarget.lerp(ball.position, dt * 5);
    camera.lookAt(camLookTarget);
  } else if (state === 'intro_field' || state === 'intro_try' || state === 'intro_kick' || state === 'intro_position') {
    // Smooth lookAt
    camera.lookAt(camLookTarget);
  } else if (state === 'aiming') {
    updateIdleCamera(dt);
  }
}

// ---------------------------------------------------------------------------
// Animate
// ---------------------------------------------------------------------------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsed = clock.elapsedTime;

  updateCornerFlags(elapsed);

  // Pulse the aim target ring
  if (state === 'aiming') {
    const pulse = 0.9 + Math.sin(elapsed * 3) * 0.1;
    aimTarget.scale.set(pulse, 1, pulse);
  }

  // Sequence Manager
  if (state === 'intro_field') {
    introTimer += dt;
    camera.lookAt(camLookTarget);
    if (introTimer > 1.5) {
      state = 'intro_try';
      introTimer = 0;

      // Setup Try Info text
      const dist = Math.abs(tryX).toFixed(0);
      let sideText = 'centre';
      if (tryX < -2) sideText = `${dist}m from centre (left)`;
      else if (tryX > 2) sideText = `${dist}m from centre (right)`;
      // Position label above try spot
      updateInfoLabel(`Try scored ${sideText}!`, new THREE.Vector3(tryX, 8, GOALPOST_Z));
      tryMarker.visible = true;
    }
  } else if (state === 'intro_try') {
    introTimer += dt;
    // Camera stays at 50m
    camera.lookAt(camLookTarget);

    // Blinking try marker
    tryMarker.visible = Math.floor(elapsed * 6) % 2 === 0;

    if (introTimer > 2.5) {
      state = 'intro_kick';
      introTimer = 0;
      tryMarker.visible = false;

      // Setup Kick Info text
      const distGoal = Math.abs(kickZ - GOALPOST_Z).toFixed(0);
      const distSide = Math.abs(kickX).toFixed(0);
      const sideName = kickX < -2 ? 'left' : (kickX > 2 ? 'right' : 'centre');
      updateInfoLabel(
        `Kick: ${distSide}m from ${sideName}, ${distGoal}m out`,
        new THREE.Vector3(kickX, 8, kickZ)
      );

      // Show ball and tee
      ball.visible = true;
      kickingTee.visible = true;
    }
  } else if (state === 'intro_kick') {
    introTimer += dt;
    // Camera stays at 50m
    camera.lookAt(camLookTarget);

    if (introTimer > 2.5) {
      state = 'intro_position';
      introTimer = 0;
      infoLabelSprite.visible = false;

      // Target: 5m behind the ball
      camPosTarget.set(kickX, 1.5, kickZ + 5);
      // Dest: straight forward towards goal line
      camLookDest.set(kickX, 1.5, GOALPOST_Z);
    }
  } else if (state === 'intro_position') {
    introTimer += dt;
    // Smoothly transition from 50m to 5m behind ball
    camera.position.lerp(camPosTarget, dt * 2.5);
    camLookTarget.lerp(camLookDest, dt * 2.5);
    camera.lookAt(camLookTarget);

    if (introTimer > 2.0) {
      state = 'aiming';
      introTimer = 0;
      aimTarget.visible = false; // Hidden until user interacts
      document.getElementById('instructions').textContent =
        'LEFT/RIGHT to aim \u2014 UP/DOWN to tilt \u2014 Hold SPACE to charge';
    }
  }

  switch (state) {
    case 'aiming':
      if (leftDown || rightDown) {
        aimTarget.visible = true;
      }
      if (leftDown) aimAngle -= AIM_SPEED;
      if (rightDown) aimAngle += AIM_SPEED;
      aimAngle = Math.max(autoAim - MAX_AIM_OFFSET, Math.min(autoAim + MAX_AIM_OFFSET, aimAngle));

      if (upDown) camTilt = Math.min(camTilt + TILT_SPEED * 10, MAX_TILT);
      if (downDown) camTilt = Math.max(camTilt - TILT_SPEED * 10, -MAX_TILT);

      updateAimTarget();
      updateCamera(dt); // Handles 'aiming' smooth lerp

      if (spaceDown) {
        state = 'charging';
        power = 0;
        aimTarget.visible = true; // Show if they hadn't aimed yet
        document.getElementById('instructions').textContent =
          'Release SPACE to kick!';
      }
      break;

    case 'charging':
      power = Math.min(power + POWER_SPEED * dt, 1);
      updatePowerUI(power);
      if (!spaceDown) {
        launchBall(power);
        state = 'kicked';
        camLookTarget.copy(ball.position);
        document.getElementById('instructions').textContent = '';
        aimTarget.visible = false;
      }
      break;

    case 'kicked':
      updateBallPhysics(dt);
      updateCamera(dt);
      break;
  }

  renderer.render(scene, camera);
}

// ---------------------------------------------------------------------------
// Initialise
// ---------------------------------------------------------------------------
setupRound();

animate();
