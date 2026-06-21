import * as THREE from 'three';
import './style.css';

const CHUNK_SIZE = 16;
const VIEW_DISTANCE = 2;
const MAX_HEIGHT = 34;
const SEA_LEVEL = 6;
const EYE_HEIGHT = 1.7;
const PLAYER_RADIUS = 0.32;
const STEP_HEIGHT = 1.05;
const MOVE_SPEED = 4.6;
const SPRINT_MULTIPLIER = 1.55;
const GRAVITY = 24;
const JUMP_SPEED = 8;
const REACH = 7;
const SAVE_KEY = 'block-world-v2-state';

const BLOCKS = {
  grass: { name: '草方块', color: 0x6fbf3f, side: 0x879449, solid: true },
  dirt: { name: '泥土', color: 0x8b6b4a, solid: true },
  stone: { name: '石头', color: 0x9a9a9a, solid: true },
  sand: { name: '沙子', color: 0xe8d2a0, solid: true },
  wood: { name: '木头', color: 0x6b4423, solid: true },
  leaves: { name: '树叶', color: 0x5cb83c, solid: true },
  brick: { name: '砖块', color: 0xb35b4a, solid: true },
  glass: { name: '玻璃', color: 0x9ed9f3, solid: true },
  lamp: { name: '灯块', color: 0xffd35a, solid: true, emissive: true },
  water: { name: '水', color: 0x367ecb, solid: false },
  coal: { name: '煤矿', color: 0x303030, solid: true },
  gold: { name: '金矿', color: 0xd8b13f, solid: true },
};

const HOTBAR = ['grass', 'dirt', 'stone', 'sand', 'wood', 'leaves', 'brick', 'glass', 'lamp'];
const FACE_DEFS = [
  { name: 'px', n: [1, 0, 0], corners: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], shade: 0.82 },
  { name: 'nx', n: [-1, 0, 0], corners: [[0, 0, 1], [0, 1, 1], [0, 1, 0], [0, 0, 0]], shade: 0.68 },
  { name: 'py', n: [0, 1, 0], corners: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], shade: 1.0 },
  { name: 'ny', n: [0, -1, 0], corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], shade: 0.5 },
  { name: 'pz', n: [0, 0, 1], corners: [[1, 0, 1], [1, 1, 1], [0, 1, 1], [0, 0, 1]], shade: 0.75 },
  { name: 'nz', n: [0, 0, -1], corners: [[0, 0, 0], [0, 1, 0], [1, 1, 0], [1, 0, 0]], shade: 0.88 },
];

const canvas = document.getElementById('c');
const overlay = document.getElementById('info-overlay');
const debugText = document.getElementById('debugText');
const toastEl = document.getElementById('center-toast');
const hotbarEl = document.getElementById('hotbar');
const joyBase = document.getElementById('joystick-base');
const joyKnob = document.getElementById('joystick-knob');

let seed = createSeed();
let selectedType = 'grass';
let toastTimer = 0;
let gameStarted = false;
let lastSaveTime = 0;

const chunks = new Map();
const edits = new Map();
const keys = new Set();
const joyVec = { x: 0, y: 0 };
const clouds = [];

const player = {
  x: 0,
  y: 18,
  z: 0,
  yaw: 0,
  pitch: -0.15,
  vy: 0,
  onGround: false,
};

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8ecae8, 28, 96);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 160);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.65));
renderer.setSize(window.innerWidth, window.innerHeight);

const ambient = new THREE.AmbientLight(0x91b4d4, 0.58);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xfff2cc, 1.0);
sun.position.set(40, 70, 26);
scene.add(sun);

const moon = new THREE.DirectionalLight(0x8fa8ff, 0.12);
moon.position.set(-40, 50, -26);
scene.add(moon);

const worldGroup = new THREE.Group();
scene.add(worldGroup);

const chunkMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const highlightGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.025, 1.025, 1.025));
const highlightBox = new THREE.LineSegments(highlightGeo, new THREE.LineBasicMaterial({ color: 0xffffff }));
highlightBox.visible = false;
scene.add(highlightBox);

const raycaster = new THREE.Raycaster();
raycaster.far = REACH;
const lookDir = new THREE.Vector3();
let currentTarget = null;
let currentPlaceCell = null;

function createSeed() {
  return Math.floor(100000 + Math.random() * 900000);
}

function hash2(x, z, salt = 0) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed + salt, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function smooth(t) {
  return t * t * (3 - 2 * t);
}

function valueNoise(x, z, scale, salt = 0) {
  const fx = x / scale;
  const fz = z / scale;
  const x0 = Math.floor(fx);
  const z0 = Math.floor(fz);
  const tx = smooth(fx - x0);
  const tz = smooth(fz - z0);
  const a = hash2(x0, z0, salt);
  const b = hash2(x0 + 1, z0, salt);
  const c = hash2(x0, z0 + 1, salt);
  const d = hash2(x0 + 1, z0 + 1, salt);
  const ab = a + (b - a) * tx;
  const cd = c + (d - c) * tx;
  return ab + (cd - ab) * tz;
}

function terrainHeight(x, z) {
  const continents = valueNoise(x, z, 54, 1);
  const hills = valueNoise(x, z, 22, 2);
  const detail = valueNoise(x, z, 8, 3);
  const ridge = Math.abs(valueNoise(x, z, 34, 4) - 0.5) * 2;
  let h = 7 + continents * 9 + hills * 7 + detail * 2 + ridge * 4;
  if (continents < 0.25) h -= 4;
  return Math.max(2, Math.min(MAX_HEIGHT - 7, Math.floor(h)));
}

function biomeAt(x, z, h) {
  const moisture = valueNoise(x, z, 46, 5);
  if (h <= SEA_LEVEL + 1) return 'beach';
  if (moisture < 0.23) return 'dry';
  if (h > 24) return 'stonepeak';
  return 'forest';
}

function chunkKey(cx, cz) {
  return `${cx},${cz}`;
}

function blockKey(x, y, z) {
  return `${x},${y},${z}`;
}

function localKey(lx, y, lz) {
  return `${lx},${y},${lz}`;
}

function worldToChunk(v) {
  return Math.floor(v / CHUNK_SIZE);
}

function worldToLocal(v) {
  return ((v % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
}

function parseLocalKey(key) {
  const [lx, y, lz] = key.split(',').map(Number);
  return { lx, y, lz };
}

function getChunk(cx, cz) {
  return chunks.get(chunkKey(cx, cz));
}

function ensureChunkData(cx, cz) {
  const key = chunkKey(cx, cz);
  let chunk = chunks.get(key);
  if (chunk) return chunk;

  const data = new Map();
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const x = cx * CHUNK_SIZE + lx;
      const z = cz * CHUNK_SIZE + lz;
      const h = terrainHeight(x, z);
      const biome = biomeAt(x, z, h);

      for (let y = 0; y <= h; y++) {
        let type = 'stone';
        if (y === h) type = biome === 'beach' || biome === 'dry' ? 'sand' : 'grass';
        else if (y >= h - 3) type = biome === 'beach' || biome === 'dry' ? 'sand' : 'dirt';
        else if (y < h - 8) {
          const ore = hash2(x * 3 + y, z * 3 - y, 21);
          if (ore > 0.985 && y < 16) type = 'gold';
          else if (ore > 0.958 && y < 24) type = 'coal';
        }
        data.set(localKey(lx, y, lz), type);
      }

      if (h < SEA_LEVEL) {
        for (let y = h + 1; y <= SEA_LEVEL; y++) data.set(localKey(lx, y, lz), 'water');
      }
    }
  }

  generateTreesForChunk(cx, cz, data);
  chunk = { cx, cz, data, mesh: null, dirty: true, lastUsedFrame: 0 };
  chunks.set(key, chunk);
  applyEditsToChunk(chunk);
  return chunk;
}

function generateTreesForChunk(cx, cz, data) {
  for (let lx = 1; lx < CHUNK_SIZE - 1; lx++) {
    for (let lz = 1; lz < CHUNK_SIZE - 1; lz++) {
      const x = cx * CHUNK_SIZE + lx;
      const z = cz * CHUNK_SIZE + lz;
      const h = terrainHeight(x, z);
      const biome = biomeAt(x, z, h);
      if (biome !== 'forest') continue;
      if (hash2(x, z, 9) < 0.972) continue;
      if (data.get(localKey(lx, h, lz)) !== 'grass') continue;

      const trunkH = 4 + Math.floor(hash2(x, z, 10) * 3);
      for (let i = 1; i <= trunkH; i++) data.set(localKey(lx, h + i, lz), 'wood');
      const crownY = h + trunkH;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dy = -1; dy <= 2; dy++) {
            const dist = Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - 1);
            if (dist > 4) continue;
            if (hash2(x + dx, z + dz, 100 + dy) < 0.1) continue;
            const nlx = lx + dx;
            const nlz = lz + dz;
            const ny = crownY + dy;
            if (nlx < 0 || nlx >= CHUNK_SIZE || nlz < 0 || nlz >= CHUNK_SIZE || ny < 0 || ny > MAX_HEIGHT) continue;
            const k = localKey(nlx, ny, nlz);
            if (!data.has(k)) data.set(k, 'leaves');
          }
        }
      }
    }
  }
}

function applyEditsToChunk(chunk) {
  const minX = chunk.cx * CHUNK_SIZE;
  const minZ = chunk.cz * CHUNK_SIZE;
  for (const [key, type] of edits) {
    const [x, y, z] = key.split(',').map(Number);
    if (x < minX || x >= minX + CHUNK_SIZE || z < minZ || z >= minZ + CHUNK_SIZE) continue;
    const lk = localKey(worldToLocal(x), y, worldToLocal(z));
    if (type === null) chunk.data.delete(lk);
    else chunk.data.set(lk, type);
  }
}

function getBlockWorld(x, y, z) {
  if (y < 0 || y > MAX_HEIGHT) return null;
  const editKey = blockKey(x, y, z);
  if (edits.has(editKey)) return edits.get(editKey);
  const cx = worldToChunk(x);
  const cz = worldToChunk(z);
  const chunk = ensureChunkData(cx, cz);
  return chunk.data.get(localKey(worldToLocal(x), y, worldToLocal(z))) || null;
}

function setBlockWorld(x, y, z, type) {
  if (y < 0 || y > MAX_HEIGHT) return;
  const cx = worldToChunk(x);
  const cz = worldToChunk(z);
  const chunk = ensureChunkData(cx, cz);
  const lk = localKey(worldToLocal(x), y, worldToLocal(z));
  if (type === null) chunk.data.delete(lk);
  else chunk.data.set(lk, type);
  edits.set(blockKey(x, y, z), type);
  markBlockNeighborhoodDirty(x, z);
}

function markChunkDirty(cx, cz) {
  const chunk = getChunk(cx, cz);
  if (chunk) chunk.dirty = true;
}

function markBlockNeighborhoodDirty(x, z) {
  const cx = worldToChunk(x);
  const cz = worldToChunk(z);
  markChunkDirty(cx, cz);
  if (worldToLocal(x) === 0) markChunkDirty(cx - 1, cz);
  if (worldToLocal(x) === CHUNK_SIZE - 1) markChunkDirty(cx + 1, cz);
  if (worldToLocal(z) === 0) markChunkDirty(cx, cz - 1);
  if (worldToLocal(z) === CHUNK_SIZE - 1) markChunkDirty(cx, cz + 1);
}

function colorForFace(type, faceName) {
  const info = BLOCKS[type] || BLOCKS.dirt;
  if (type === 'grass') {
    if (faceName === 'py') return info.color;
    if (faceName === 'ny') return BLOCKS.dirt.color;
    return info.side;
  }
  if (type === 'wood' && (faceName === 'py' || faceName === 'ny')) return 0x84552d;
  if (type === 'glass') return 0xbfeeff;
  if (type === 'lamp') return 0xffdc73;
  return info.color;
}

function buildChunkMesh(chunk) {
  if (chunk.mesh) {
    worldGroup.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    chunk.mesh = null;
  }

  const positions = [];
  const normals = [];
  const colors = [];
  const blockPositions = [];
  const indices = [];
  let vertexIndex = 0;

  for (const [lk, type] of chunk.data) {
    const { lx, y, lz } = parseLocalKey(lk);
    const x = chunk.cx * CHUNK_SIZE + lx;
    const z = chunk.cz * CHUNK_SIZE + lz;
    const blockInfo = BLOCKS[type];
    if (!blockInfo) continue;

    for (const face of FACE_DEFS) {
      const nx = x + face.n[0];
      const ny = y + face.n[1];
      const nz = z + face.n[2];
      const neighbor = getBlockWorld(nx, ny, nz);
      if (neighbor && !(type !== 'water' && neighbor === 'water')) continue;

      const color = new THREE.Color(colorForFace(type, face.name));
      const lightBoost = blockInfo.emissive ? 1.25 : 1.0;
      color.multiplyScalar(face.shade * lightBoost);

      for (const c of face.corners) {
        positions.push(x + c[0], y + c[1], z + c[2]);
        normals.push(face.n[0], face.n[1], face.n[2]);
        colors.push(color.r, color.g, color.b);
        blockPositions.push(x, y, z);
      }

      indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
      vertexIndex += 4;
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('blockPos', new THREE.Float32BufferAttribute(blockPositions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, chunkMaterial);
  mesh.userData.chunk = { cx: chunk.cx, cz: chunk.cz };
  chunk.mesh = mesh;
  chunk.dirty = false;
  worldGroup.add(mesh);
}

function disposeChunk(chunk) {
  if (chunk.mesh) {
    worldGroup.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
  }
}

let frameId = 0;
function updateVisibleChunks() {
  frameId++;
  const pcx = worldToChunk(Math.floor(player.x));
  const pcz = worldToChunk(Math.floor(player.z));

  for (let dx = -VIEW_DISTANCE; dx <= VIEW_DISTANCE; dx++) {
    for (let dz = -VIEW_DISTANCE; dz <= VIEW_DISTANCE; dz++) {
      const chunk = ensureChunkData(pcx + dx, pcz + dz);
      chunk.lastUsedFrame = frameId;
    }
  }

  const maxDist = VIEW_DISTANCE + 1;
  for (const [key, chunk] of chunks) {
    if (Math.abs(chunk.cx - pcx) > maxDist || Math.abs(chunk.cz - pcz) > maxDist) {
      disposeChunk(chunk);
      chunks.delete(key);
    }
  }

  let rebuilt = 0;
  for (const chunk of chunks.values()) {
    if (!chunk.dirty) continue;
    buildChunkMesh(chunk);
    rebuilt++;
    if (rebuilt >= 2) break;
  }
}

function getTopSolidHeight(x, z) {
  const bx = Math.round(x);
  const bz = Math.round(z);
  for (let y = MAX_HEIGHT; y >= 0; y--) {
    const type = getBlockWorld(bx, y, bz);
    if (type && BLOCKS[type]?.solid) return y + 1;
  }
  return 0;
}

function sampleGroundHeight(x, z) {
  return Math.max(
    getTopSolidHeight(x - PLAYER_RADIUS, z - PLAYER_RADIUS),
    getTopSolidHeight(x + PLAYER_RADIUS, z - PLAYER_RADIUS),
    getTopSolidHeight(x - PLAYER_RADIUS, z + PLAYER_RADIUS),
    getTopSolidHeight(x + PLAYER_RADIUS, z + PLAYER_RADIUS)
  );
}

function overlapsPlayer(x, y, z) {
  const feet = player.y - EYE_HEIGHT;
  const head = player.y + 0.12;
  const closestX = Math.max(x, Math.min(player.x, x + 1));
  const closestZ = Math.max(z, Math.min(player.z, z + 1));
  const dx = player.x - closestX;
  const dz = player.z - closestZ;
  const xzHit = dx * dx + dz * dz < PLAYER_RADIUS * PLAYER_RADIUS;
  const yHit = y < head && y + 1 > feet;
  return xzHit && yHit;
}

function resetPlayerToSpawn() {
  player.x = 0;
  player.z = 0;
  player.y = sampleGroundHeight(0, 0) + EYE_HEIGHT;
  player.vy = 0;
  player.onGround = true;
  showToast('已回到出生点');
}

function randomWorld() {
  seed = createSeed();
  edits.clear();
  for (const chunk of chunks.values()) disposeChunk(chunk);
  chunks.clear();
  resetPlayerToSpawn();
  saveState(true);
  showToast(`随机刷新：Seed ${seed}`);
}

function updateRaycast() {
  camera.getWorldDirection(lookDir);
  raycaster.set(camera.position, lookDir);

  const meshes = [];
  for (const chunk of chunks.values()) {
    if (chunk.mesh) meshes.push(chunk.mesh);
  }

  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length > 0 && hits[0].face) {
    const hit = hits[0];
    const attr = hit.object.geometry.getAttribute('blockPos');
    const a = hit.face.a;
    const x = Math.round(attr.getX(a));
    const y = Math.round(attr.getY(a));
    const z = Math.round(attr.getZ(a));
    const n = hit.face.normal;

    currentTarget = { x, y, z };
    currentPlaceCell = {
      x: x + Math.round(n.x),
      y: y + Math.round(n.y),
      z: z + Math.round(n.z),
    };

    highlightBox.position.set(x + 0.5, y + 0.5, z + 0.5);
    highlightBox.visible = true;
  } else {
    currentTarget = null;
    currentPlaceCell = null;
    highlightBox.visible = false;
  }
}

function mineTarget() {
  if (!currentTarget) return;
  const type = getBlockWorld(currentTarget.x, currentTarget.y, currentTarget.z);
  if (!type || type === 'water') return;
  setBlockWorld(currentTarget.x, currentTarget.y, currentTarget.z, null);
  showToast(`挖掉 ${BLOCKS[type]?.name || type}`);
}

function placeBlock() {
  if (!currentPlaceCell) return;
  const c = currentPlaceCell;
  if (c.y < 0 || c.y > MAX_HEIGHT) return;
  if (getBlockWorld(c.x, c.y, c.z)) return;
  if (overlapsPlayer(c.x, c.y, c.z)) return;
  setBlockWorld(c.x, c.y, c.z, selectedType);
  showToast(`放置 ${BLOCKS[selectedType].name}`);
}

function jump() {
  if (!player.onGround) return;
  player.vy = JUMP_SPEED;
  player.onGround = false;
}

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

function bindHold(el, handler, interval = 150) {
  let timer = null;
  const start = (e) => {
    e.preventDefault();
    e.stopPropagation();
    handler();
    clearInterval(timer);
    timer = setInterval(handler, interval);
  };
  const stop = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearInterval(timer);
    timer = null;
  };
  el.addEventListener('pointerdown', start, { passive: false });
  el.addEventListener('pointerup', stop, { passive: false });
  el.addEventListener('pointercancel', stop, { passive: false });
  el.addEventListener('pointerleave', stop, { passive: false });
}

bindTap(document.getElementById('startBtn'), () => {
  overlay.style.display = 'none';
  gameStarted = true;
  showToast('开始探索');
});
bindTap(document.getElementById('jumpBtn'), jump);
bindTap(document.getElementById('resetBtn'), resetPlayerToSpawn);
bindTap(document.getElementById('randomBtn'), randomWorld);
bindTap(document.getElementById('saveBtn'), () => saveState(true));
bindHold(document.getElementById('mineBtn'), mineTarget, 145);
bindHold(document.getElementById('placeBtn'), placeBlock, 165);

function buildHotbar() {
  hotbarEl.innerHTML = '';
  HOTBAR.forEach((type, index) => {
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = 'hotbar-slot' + (type === selectedType ? ' selected' : '');
    slot.setAttribute('aria-label', `${index + 1}: ${BLOCKS[type].name}`);

    const swatch = document.createElement('div');
    swatch.className = 'hotbar-color';
    swatch.style.background = `#${BLOCKS[type].color.toString(16).padStart(6, '0')}`;

    const num = document.createElement('div');
    num.className = 'hotbar-num';
    num.textContent = String(index + 1);

    slot.appendChild(swatch);
    slot.appendChild(num);
    bindTap(slot, () => selectBlock(type));
    hotbarEl.appendChild(slot);
  });
}

function selectBlock(type) {
  selectedType = type;
  document.querySelectorAll('.hotbar-slot').forEach((el, index) => {
    el.classList.toggle('selected', HOTBAR[index] === selectedType);
  });
  showToast(BLOCKS[type].name);
}

let joyActive = false;
let joyId = null;
let joyCenter = { x: 0, y: 0 };

function updateJoystick(e) {
  const dx = e.clientX - joyCenter.x;
  const dy = e.clientY - joyCenter.y;
  const maxR = 42;
  const dist = Math.min(Math.hypot(dx, dy), maxR);
  const ang = Math.atan2(dy, dx);
  const nx = Math.cos(ang) * dist;
  const ny = Math.sin(ang) * dist;
  const dead = dist < 6 ? 0 : 1;

  joyKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  joyVec.x = dead * nx / maxR;
  joyVec.y = dead * -ny / maxR;
}

joyBase.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  joyActive = true;
  joyId = e.pointerId;
  joyBase.setPointerCapture(joyId);
  const rect = joyBase.getBoundingClientRect();
  joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
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
  if (!gameStarted) return;
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
  rotateView(dx, dy);
}, { passive: false });

function endLook(e) {
  if (e.pointerId === lookId) {
    lookActive = false;
    lookId = null;
  }
}
canvas.addEventListener('pointerup', endLook);
canvas.addEventListener('pointercancel', endLook);

function rotateView(dx, dy) {
  player.yaw -= dx * 0.0044;
  player.pitch -= dy * 0.0044;
  const lim = Math.PI / 2 - 0.05;
  player.pitch = Math.max(-lim, Math.min(lim, player.pitch));
}

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') {
    e.preventDefault();
    jump();
  }
  const digit = Number(e.key);
  if (digit >= 1 && digit <= HOTBAR.length) selectBlock(HOTBAR[digit - 1]);
  if (e.code === 'KeyR') randomWorld();
  if (e.code === 'KeyF') resetPlayerToSpawn();
});

window.addEventListener('keyup', (e) => keys.delete(e.code));

window.addEventListener('mousemove', (e) => {
  if (document.pointerLockElement === canvas) rotateView(e.movementX, e.movementY);
});

canvas.addEventListener('dblclick', () => {
  if (canvas.requestPointerLock && gameStarted) canvas.requestPointerLock();
});

canvas.addEventListener('mousedown', (e) => {
  if (!gameStarted) return;
  if (e.button === 0) mineTarget();
  if (e.button === 2) placeBlock();
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
  const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT_MULTIPLIER : 1;
  const speed = MOVE_SPEED * sprint;
  let mx = forward.x * inputY + right.x * inputX;
  let mz = forward.z * inputY + right.z * inputX;
  const moveLen = Math.hypot(mx, mz);
  if (moveLen > 1) {
    mx /= moveLen;
    mz /= moveLen;
  }

  const nx = player.x + mx * speed * dt;
  const nz = player.z + mz * speed * dt;
  const feet = player.y - EYE_HEIGHT;
  const nextGround = sampleGroundHeight(nx, nz);
  if (nextGround <= feet + STEP_HEIGHT || !player.onGround) {
    player.x = nx;
    player.z = nz;
  }

  player.vy -= GRAVITY * dt;
  player.y += player.vy * dt;
  const groundY = sampleGroundHeight(player.x, player.z) + EYE_HEIGHT;
  if (player.y <= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (player.y < -25) resetPlayerToSpawn();
}

function createClouds() {
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 });
  const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 18; i++) {
    const group = new THREE.Group();
    const baseX = (hash2(i, 0, 70) - 0.5) * 120;
    const baseZ = (hash2(i, 1, 71) - 0.5) * 120;
    group.position.set(baseX, 31 + hash2(i, 2, 72) * 8, baseZ);
    const pieces = 3 + Math.floor(hash2(i, 3, 73) * 5);
    for (let j = 0; j < pieces; j++) {
      const m = new THREE.Mesh(cloudGeo, cloudMat);
      m.scale.set(5 + hash2(i, j, 74) * 8, 0.55, 2.2 + hash2(i, j, 75) * 4);
      m.position.set((j - pieces / 2) * 4.5, 0, (hash2(i, j, 76) - 0.5) * 4);
      group.add(m);
    }
    clouds.push(group);
    scene.add(group);
  }
}

function updateSky(time) {
  const cycle = (time * 0.000025) % 1;
  const daylight = Math.max(0.18, Math.sin(cycle * Math.PI * 2) * 0.5 + 0.55);
  const sky = new THREE.Color(0x08101f).lerp(new THREE.Color(0x8ecae8), daylight);
  scene.background = sky;
  scene.fog.color.copy(sky);
  ambient.intensity = 0.22 + daylight * 0.45;
  sun.intensity = 0.15 + daylight * 0.92;
  sun.position.set(Math.cos(cycle * Math.PI * 2) * 65, Math.sin(cycle * Math.PI * 2) * 70 + 10, 28);
  moon.intensity = 0.18 * (1 - daylight);

  for (let i = 0; i < clouds.length; i++) {
    const c = clouds[i];
    c.position.x += 0.004 + i * 0.00008;
    if (c.position.x > player.x + 86) c.position.x = player.x - 86;
  }
}

function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 900);
}

function updateHud() {
  const target = currentTarget ? `${getBlockWorld(currentTarget.x, currentTarget.y, currentTarget.z) || '-'}` : '无';
  debugText.textContent = `Seed ${seed}  |  方块 ${BLOCKS[selectedType].name}\n坐标 ${player.x.toFixed(1)}, ${Math.floor(player.y - EYE_HEIGHT)}, ${player.z.toFixed(1)}  |  区块 ${chunks.size}  |  目标 ${target}`;
}

function saveState(force = false) {
  const now = performance.now();
  if (!force && now - lastSaveTime < 5000) return;
  lastSaveTime = now;
  const payload = {
    seed,
    selectedType,
    player: { x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch },
    edits: Array.from(edits.entries()),
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    if (force) showToast('世界已保存');
  } catch {
    if (force) showToast('保存失败：浏览器存储不可用');
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const payload = JSON.parse(raw);
    if (!payload || !Number.isFinite(payload.seed)) return false;
    seed = payload.seed;
    selectedType = HOTBAR.includes(payload.selectedType) ? payload.selectedType : 'grass';
    edits.clear();
    if (Array.isArray(payload.edits)) {
      for (const item of payload.edits) {
        if (Array.isArray(item) && item.length === 2) edits.set(item[0], item[1]);
      }
    }
    if (payload.player) {
      player.x = Number(payload.player.x) || 0;
      player.y = Number(payload.player.y) || 18;
      player.z = Number(payload.player.z) || 0;
      player.yaw = Number(payload.player.yaw) || 0;
      player.pitch = Number(payload.player.pitch) || -0.15;
    }
    return true;
  } catch {
    return false;
  }
}

function initWorld() {
  const loaded = loadState();
  updateVisibleChunks();
  for (const chunk of chunks.values()) {
    if (chunk.dirty) buildChunkMesh(chunk);
  }
  if (!loaded) resetPlayerToSpawn();
  buildHotbar();
  createClouds();
  showToast(loaded ? '已载入上次世界' : `新世界 Seed ${seed}`);
}

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  updateVisibleChunks();
  updatePlayer(dt);
  camera.position.set(player.x, player.y, player.z);
  camera.rotation.x = player.pitch;
  camera.rotation.y = player.yaw;
  camera.rotation.z = 0;

  updateRaycast();
  updateSky(now);
  updateHud();
  saveState(false);
  renderer.render(scene, camera);
}

initWorld();
requestAnimationFrame(animate);
