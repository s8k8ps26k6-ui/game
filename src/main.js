import * as THREE from 'three';
import './style.css';

const WORLD_SIZE = 9;
const EYE_HEIGHT = 1.7;
const MOVE_SPEED = 4.2;
const GRAVITY = 22;
const JUMP_SPEED = 7.5;

const canvas = document.getElementById('c');
const overlay = document.getElementById('info-overlay');

function bindTap(el, handler) {
  let lastTouchTime = 0;

  el.addEventListener('pointerup', (e) => {
    e.preventDefault();
    e.stopPropagation();
    lastTouchTime = performance.now();
    handler(e);
  }, { passive: false });

  el.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (performance.now() - lastTouchTime > 350) handler(e);
  }, { passive: false });
}

bindTap(document.getElementById('startBtn'), () => {
  overlay.style.display = 'none';
});

const scene = new THREE.Scene();
const skyColor = 0x8ecae8;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 18, 46);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 100);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);

scene.add(new THREE.AmbientLight(0x88aacc, 0.6));

const sun = new THREE.DirectionalLight(0xfff3d6, 0.9);
sun.position.set(30, 50, 20);
scene.add(sun);

const world = new THREE.Group();
scene.add(world);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const materials = {
  dirt: new THREE.MeshLambertMaterial({ color: 0x8b6b4a }),
  stone: new THREE.MeshLambertMaterial({ color: 0x9a9a9a }),
  sand: new THREE.MeshLambertMaterial({ color: 0xe8d2a0 }),
  wood: new THREE.MeshLambertMaterial({ color: 0x6b4423 }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x5cb83c }),
  grassTop: new THREE.MeshLambertMaterial({ color: 0x6fbf3f }),
  grassSide: new THREE.MeshLambertMaterial({ color: 0x8a9c4a }),
  grassBottom: new THREE.MeshLambertMaterial({ color: 0x8b6b4a }),
};

function materialFor(type) {
  if (type === 'grass') {
    return [
      materials.grassSide,
      materials.grassSide,
      materials.grassTop,
      materials.grassBottom,
      materials.grassSide,
      materials.grassSide,
    ];
  }
  return materials[type] || materials.dirt;
}

const blocks = new Map();
const heightMap = new Map();

function keyOf(x, y, z) {
  return `${x},${y},${z}`;
}

function addBlock(x, y, z, type) {
  const key = keyOf(x, y, z);
  if (blocks.has(key)) return;

  const mesh = new THREE.Mesh(boxGeo, materialFor(type));
  mesh.position.set(x, y + 0.5, z);
  mesh.userData = { x, y, z, type };

  blocks.set(key, { type, mesh });
  world.add(mesh);

  const colKey = `${x},${z}`;
  const curTop = heightMap.get(colKey) ?? 0;
  if (y + 1 > curTop) heightMap.set(colKey, y + 1);
}

function removeBlock(x, y, z) {
  const key = keyOf(x, y, z);
  const entry = blocks.get(key);
  if (!entry) return;

  world.remove(entry.mesh);
  blocks.delete(key);

  const colKey = `${x},${z}`;
  let top = heightMap.get(colKey) ?? 0;
  while (top > 0 && !blocks.has(keyOf(x, top - 1, z))) top--;
  heightMap.set(colKey, top);
}

function getHeightAt(x, z) {
  return heightMap.get(`${Math.round(x)},${Math.round(z)}`) ?? 0;
}

let seedOffset = Math.random() * 1000;

function computeHeight(x, z) {
  const n =
    Math.sin(x * 0.35 + seedOffset) +
    Math.cos(z * 0.35 - seedOffset) +
    Math.sin((x + z) * 0.2) +
    Math.cos((x - z) * 0.25);

  return Math.max(2, Math.min(6, Math.round(3 + n * 0.8)));
}

function generateWorld(size) {
  for (let x = -size; x <= size; x++) {
    for (let z = -size; z <= size; z++) {
      const h = computeHeight(x, z);

      for (let y = Math.max(0, h - 3); y < h; y++) {
        let type;
        if (y === h - 1) type = 'grass';
        else if (y >= h - 2) type = 'dirt';
        else type = 'stone';

        addBlock(x, y, z, type);
      }
    }
  }

  const treeCount = 8 + Math.floor(Math.random() * 5);
  const placed = [];
  let attempts = 0;

  while (placed.length < treeCount && attempts < 200) {
    attempts++;

    const tx = Math.floor((Math.random() * 2 - 1) * size * 0.75);
    const tz = Math.floor((Math.random() * 2 - 1) * size * 0.75);

    if (Math.abs(tx) < 2 && Math.abs(tz) < 2) continue;
    if (placed.some((p) => Math.abs(p[0] - tx) < 2 && Math.abs(p[1] - tz) < 2)) continue;

    placed.push([tx, tz]);

    const th = getHeightAt(tx, tz);
    const trunkH = 3 + Math.floor(Math.random() * 2);

    for (let i = 0; i < trunkH; i++) addBlock(tx, th + i, tz, 'wood');

    const topY = th + trunkH;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dy = 0; dy <= 1; dy++) {
          if (dx === 0 && dz === 0 && dy === 0) continue;
          if (Math.random() < 0.15) continue;
          addBlock(tx + dx, topY + dy, tz + dz, 'leaves');
        }
      }
    }

    addBlock(tx, topY + 2, tz, 'leaves');
  }
}

function clearWorld() {
  for (const [, entry] of blocks) {
    world.remove(entry.mesh);
  }
  blocks.clear();
  heightMap.clear();
}

const player = {
  x: 0,
  z: 0,
  y: 0,
  yaw: 0,
  pitch: -0.1,
  vy: 0,
  onGround: true,
};

function resetWorld() {
  clearWorld();
  seedOffset = Math.random() * 1000;
  generateWorld(WORLD_SIZE);

  player.x = 0;
  player.z = 0;
  player.y = getHeightAt(0, 0) + EYE_HEIGHT;
  player.vy = 0;
  player.onGround = true;
}

const raycaster = new THREE.Raycaster();
raycaster.far = 6;

const lookDir = new THREE.Vector3();
const highlightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.02, 1.02, 1.02));
const highlightBox = new THREE.LineSegments(
  highlightGeo,
  new THREE.LineBasicMaterial({ color: 0xffffff })
);
highlightBox.visible = false;
scene.add(highlightBox);

let currentTarget = null;
let currentPlaceCell = null;

function updateRaycast() {
  camera.getWorldDirection(lookDir);
  raycaster.set(camera.position, lookDir);

  const hits = raycaster.intersectObjects(world.children, false);

  if (hits.length > 0 && hits[0].face) {
    const hit = hits[0];
    const ud = hit.object.userData;
    const n = hit.face.normal;

    currentTarget = { x: ud.x, y: ud.y, z: ud.z };
    currentPlaceCell = {
      x: ud.x + Math.round(n.x),
      y: ud.y + Math.round(n.y),
      z: ud.z + Math.round(n.z),
    };

    highlightBox.position.set(ud.x, ud.y + 0.5, ud.z);
    highlightBox.visible = true;
  } else {
    currentTarget = null;
    currentPlaceCell = null;
    highlightBox.visible = false;
  }
}

let selectedType = 'dirt';

const joyVec = { x: 0, y: 0 };
let joyActive = false;
let joyId = null;
let joyCenter = { x: 0, y: 0 };

const joyBase = document.getElementById('joystick-base');
const joyKnob = document.getElementById('joystick-knob');

function updateJoystick(e) {
  const dx = e.clientX - joyCenter.x;
  const dy = e.clientY - joyCenter.y;
  const maxR = 38;
  const dist = Math.min(Math.hypot(dx, dy), maxR);
  const ang = Math.atan2(dy, dx);
  const nx = Math.cos(ang) * dist;
  const ny = Math.sin(ang) * dist;

  joyKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  joyVec.x = nx / maxR;
  joyVec.y = -ny / maxR;
}

joyBase.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  joyActive = true;
  joyId = e.pointerId;
  joyBase.setPointerCapture(joyId);

  const rect = joyBase.getBoundingClientRect();
  joyCenter = {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };

  updateJoystick(e);
}, { passive: false });

joyBase.addEventListener('pointermove', (e) => {
  if (joyActive && e.pointerId === joyId) {
    e.preventDefault();
    updateJoystick(e);
  }
}, { passive: false });

function endJoy(e) {
  if (e.pointerId !== joyId) return;

  joyActive = false;
  joyId = null;
  joyVec.x = 0;
  joyVec.y = 0;
  joyKnob.style.transform = 'translate(-50%, -50%)';
}

joyBase.addEventListener('pointerup', endJoy);
joyBase.addEventListener('pointercancel', endJoy);

let lookActive = false;
let lookId = null;
let lastX = 0;
let lastY = 0;

canvas.addEventListener('pointerdown', (e) => {
  if (overlay.style.display !== 'none') return;

  e.preventDefault();
  lookActive = true;
  lookId = e.pointerId;
  canvas.setPointerCapture(lookId);
  lastX = e.clientX;
  lastY = e.clientY;
}, { passive: false });

canvas.addEventListener('pointermove', (e) => {
  if (!lookActive || e.pointerId !== lookId) return;

  e.preventDefault();

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  player.yaw -= dx * 0.0045;
  player.pitch -= dy * 0.0045;

  const lim = Math.PI / 2 - 0.05;
  player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
}, { passive: false });

function endLook(e) {
  if (e.pointerId === lookId) {
    lookActive = false;
    lookId = null;
  }
}

canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);

function mineTarget() {
  if (currentTarget) removeBlock(currentTarget.x, currentTarget.y, currentTarget.z);
}

function placeBlock() {
  if (!currentPlaceCell) return;

  const px = Math.round(player.x);
  const pz = Math.round(player.z);
  const feetY = Math.floor(player.y - EYE_HEIGHT);
  const headY = Math.floor(player.y);
  const c = currentPlaceCell;

  if (c.x === px && c.z === pz && (c.y === feetY || c.y === headY)) return;

  addBlock(c.x, c.y, c.z, selectedType);
}

function jump() {
  if (!player.onGround) return;

  player.vy = JUMP_SPEED;
  player.onGround = false;
}

bindTap(document.getElementById('mineBtn'), mineTarget);
bindTap(document.getElementById('placeBtn'), placeBlock);
bindTap(document.getElementById('jumpBtn'), jump);
bindTap(document.getElementById('resetBtn'), resetWorld);

const paletteEl = document.getElementById('palette');
const paletteTypes = [
  ['grass', 0x6fbf3f],
  ['dirt', 0x8b6b4a],
  ['stone', 0x9a9a9a],
  ['sand', 0xe8d2a0],
  ['wood', 0x6b4423],
  ['leaves', 0x5cb83c],
];

paletteTypes.forEach(([type, color]) => {
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'swatch' + (type === selectedType ? ' selected' : '');
  sw.style.background = `#${color.toString(16).padStart(6, '0')}`;
  sw.setAttribute('aria-label', `选择 ${type}`);

  bindTap(sw, () => {
    selectedType = type;
    document.querySelectorAll('.swatch').forEach((el) => el.classList.remove('selected'));
    sw.classList.add('selected');
  });

  paletteEl.appendChild(sw);
});

const keys = new Set();

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') {
    e.preventDefault();
    jump();
  }
});

window.addEventListener('keyup', (e) => {
  keys.delete(e.code);
});

function getKeyboardMove() {
  let x = 0;
  let y = 0;

  if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;

  return { x, y };
}

document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function updatePlayer(dt) {
  const kb = getKeyboardMove();
  let inputX = joyVec.x + kb.x;
  let inputY = joyVec.y + kb.y;

  const inputLen = Math.hypot(inputX, inputY);
  if (inputLen > 1) {
    inputX /= inputLen;
    inputY /= inputLen;
  }

  const forward = { x: -Math.sin(player.yaw), z: -Math.cos(player.yaw) };
  const right = { x: Math.cos(player.yaw), z: -Math.sin(player.yaw) };

  let mx = forward.x * inputY + right.x * inputX;
  let mz = forward.z * inputY + right.z * inputX;

  const moveLen = Math.hypot(mx, mz);
  if (moveLen > 1) {
    mx /= moveLen;
    mz /= moveLen;
  }

  const nx = player.x + mx * MOVE_SPEED * dt;
  const nz = player.z + mz * MOVE_SPEED * dt;

  const curG = getHeightAt(player.x, player.z);
  const newG = getHeightAt(nx, nz);

  if (newG - curG <= 1) {
    player.x = nx;
    player.z = nz;
  }

  player.vy -= GRAVITY * dt;
  player.y += player.vy * dt;

  const groundY = getHeightAt(player.x, player.z) + EYE_HEIGHT;
  if (player.y <= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (player.y < -15) resetWorld();
}

let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);

  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updatePlayer(dt);

  camera.position.set(player.x, player.y, player.z);
  camera.rotation.x = player.pitch;
  camera.rotation.y = player.yaw;
  camera.rotation.z = 0;

  updateRaycast();
  renderer.render(scene, camera);
}

resetWorld();
requestAnimationFrame(animate);
