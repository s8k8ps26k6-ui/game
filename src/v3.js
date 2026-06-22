import * as THREE from 'three';
import './v3.css';

const CHUNK_SIZE = 16;
const INITIAL_VIEW_DISTANCE = 2;
const MAX_VIEW_DISTANCE = 4;
const MAX_HEIGHT = 42;
const SEA_LEVEL = 7;
const EYE_HEIGHT = 1.7;
const PLAYER_WIDTH = 0.6;
const PLAYER_HALF_WIDTH = PLAYER_WIDTH / 2;
const PLAYER_HEIGHT = 1.8;
const MOVE_SPEED = 4.7;
const SPRINT_MULTIPLIER = 1.55;
const GRAVITY = 24;
const JUMP_SPEED = 8;
const REACH = 7;
const WORLD_DAY_SECONDS = 1200;
const SAVE_KEY = 'block-world-v3-state';

const BLOCKS = {
  grass: { name: '草方块', color: 0x6fbf3f, side: 0x879449, solid: true, group: '自然' },
  dirt: { name: '泥土', color: 0x8b6b4a, solid: true, group: '自然' },
  stone: { name: '石头', color: 0x9a9a9a, solid: true, group: '自然' },
  sand: { name: '沙子', color: 0xe8d2a0, solid: true, group: '自然' },
  gravel: { name: '砂砾', color: 0x7d7a74, solid: true, group: '自然' },
  clay: { name: '黏土', color: 0x92a2ad, solid: true, group: '自然' },
  snow: { name: '雪块', color: 0xf2f8ff, solid: true, group: '自然' },
  ice: { name: '冰', color: 0xb9e7ff, solid: true, group: '自然', shiny: true },
  water: { name: '水', color: 0x367ecb, solid: false, fluid: true, group: '自然' },
  wood: { name: '原木', color: 0x6b4423, solid: true, group: '植物' },
  birchWood: { name: '白桦木', color: 0xc7b68b, solid: true, group: '植物' },
  leaves: { name: '树叶', color: 0x5cb83c, solid: true, group: '植物' },
  pineLeaves: { name: '松叶', color: 0x2f7d54, solid: true, group: '植物' },
  cactus: { name: '仙人掌', color: 0x3d9b4a, solid: true, group: '植物' },
  reeds: { name: '芦苇', color: 0x94b957, solid: false, plant: true, group: '植物' },
  tallgrass: { name: '草丛', color: 0x79b74a, solid: false, plant: true, group: '植物' },
  redflower: { name: '红花', color: 0xe64e45, solid: false, plant: true, group: '植物' },
  yellowflower: { name: '黄花', color: 0xf5d142, solid: false, plant: true, group: '植物' },
  mushroom: { name: '蘑菇', color: 0xc15d46, solid: false, plant: true, group: '植物' },
  coal: { name: '煤矿', color: 0x303030, solid: true, group: '矿物' },
  iron: { name: '铁矿', color: 0xb18463, solid: true, group: '矿物' },
  gold: { name: '金矿', color: 0xd8b13f, solid: true, group: '矿物' },
  crystal: { name: '晶簇', color: 0x88d9ff, solid: true, group: '矿物', shiny: true },
  basalt: { name: '玄武岩', color: 0x37383e, solid: true, group: '矿物' },
  obsidian: { name: '黑曜石', color: 0x201933, solid: true, group: '矿物' },
  planks: { name: '木板', color: 0xb07a3f, solid: true, group: '建筑' },
  brick: { name: '砖块', color: 0xb35b4a, solid: true, group: '建筑' },
  glass: { name: '玻璃', color: 0x9ed9f3, solid: true, group: '建筑', shiny: true },
  lamp: { name: '灯块', color: 0xffd35a, solid: true, group: '建筑', emissive: true },
  white: { name: '白墙', color: 0xe8e3d8, solid: true, group: '建筑' },
  dark: { name: '深色石', color: 0x2c3140, solid: true, group: '建筑' },
  blue: { name: '蓝砖', color: 0x3d6ed0, solid: true, group: '建筑' },
  red: { name: '红砖', color: 0xc44742, solid: true, group: '建筑' },
};

const HOTBAR = ['grass', 'dirt', 'stone', 'wood', 'planks', 'glass', 'lamp', 'snow', 'water'];
const INVENTORY_GROUPS = ['全部', '自然', '植物', '矿物', '建筑'];
const TIME_SPEEDS = [0.25, 1, 4, 12, 48];
const WEATHER_MODES = ['auto', 'clear', 'rain', 'snow', 'storm'];
const RENDER_DISTANCES = [2, 3, 4];

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
const inventoryPanel = document.getElementById('inventory-panel');
const inventoryTabs = document.getElementById('inventory-tabs');
const inventoryGrid = document.getElementById('inventory-grid');
const joyBase = document.getElementById('joystick-base');
const joyKnob = document.getElementById('joystick-knob');

let seed = createSeed();
let selectedType = 'grass';
let selectedGroup = '全部';
let worldTime = 8.0;
let timeSpeedIndex = 1;
let weatherModeIndex = 0;
let currentWeather = 'clear';
let renderDistanceIndex = 0;
let viewDistance = INITIAL_VIEW_DISTANCE;
let toastTimer = 0;
let gameStarted = false;
let lastSaveTime = 0;
let lastEntitySpawn = 0;
let lastFootstep = 0;
let audioCtx = null;

const chunks = new Map();
const edits = new Map();
const keys = new Set();
const joyVec = { x: 0, y: 0 };
const clouds = [];
const entities = [];

const player = { x: 0, y: 18, z: 0, yaw: 0, pitch: -0.15, vy: 0, onGround: false };

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0x8ecae8, 28, 110);

const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 180);
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
const entityGroup = new THREE.Group();
scene.add(worldGroup);
scene.add(entityGroup);

const chunkMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
const transparentMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.62, depthWrite: false });
const highlightBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.025, 1.025, 1.025)), new THREE.LineBasicMaterial({ color: 0xffffff }));
highlightBox.visible = false;
scene.add(highlightBox);

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const entityMaterials = {
  cow: new THREE.MeshLambertMaterial({ color: 0x6b4a35 }),
  sheep: new THREE.MeshLambertMaterial({ color: 0xeeeeee }),
  fox: new THREE.MeshLambertMaterial({ color: 0xd07b2d }),
  rabbit: new THREE.MeshLambertMaterial({ color: 0xc9b9a4 }),
  bird: new THREE.MeshLambertMaterial({ color: 0x4e6fd6 }),
  dark: new THREE.MeshLambertMaterial({ color: 0x222222 }),
};

const weatherCount = 900;
const weatherPositions = new Float32Array(weatherCount * 3);
const weatherGeo = new THREE.BufferGeometry();
weatherGeo.setAttribute('position', new THREE.BufferAttribute(weatherPositions, 3));
const weatherMat = new THREE.PointsMaterial({ color: 0xbfd9ff, size: 0.08, transparent: true, opacity: 0.78 });
const weatherPoints = new THREE.Points(weatherGeo, weatherMat);
weatherPoints.visible = false;
scene.add(weatherPoints);

const raycaster = new THREE.Raycaster();
raycaster.far = REACH;
const lookDir = new THREE.Vector3();
let currentTarget = null;
let currentPlaceCell = null;

function createSeed() { return Math.floor(100000 + Math.random() * 900000); }
function hash2(x, z, salt = 0) {
  let n = Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ Math.imul(seed + salt, 1442695041);
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function smooth(t) { return t * t * (3 - 2 * t); }
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

function riverStrength(x, z) {
  const r1 = Math.abs(valueNoise(x, z, 44, 60) - 0.5);
  const r2 = Math.abs(valueNoise(x + 320, z - 180, 66, 61) - 0.5);
  const r3 = Math.abs(valueNoise(x - 130, z + 250, 88, 62) - 0.5);
  return Math.min(r1, r2 * 1.08, r3 * 1.15);
}
function isRiver(x, z) { return riverStrength(x, z) < 0.032; }
function terrainHeight(x, z) {
  const continents = valueNoise(x, z, 58, 1);
  const hills = valueNoise(x, z, 23, 2);
  const detail = valueNoise(x, z, 8, 3);
  const ridge = Math.abs(valueNoise(x, z, 35, 4) - 0.5) * 2;
  let h = 8 + continents * 10 + hills * 8 + detail * 2.2 + ridge * 5;
  if (continents < 0.24) h -= 4.2;
  const river = riverStrength(x, z);
  if (river < 0.032) h = Math.min(h, SEA_LEVEL - 2 + Math.floor(river * 48));
  return Math.max(2, Math.min(MAX_HEIGHT - 8, Math.floor(h)));
}
function temperatureAt(x, z, h) { return valueNoise(x + 500, z - 500, 72, 12) - h * 0.012; }
function moistureAt(x, z) { return valueNoise(x - 220, z + 120, 52, 13); }
function biomeAt(x, z, h) {
  const temp = temperatureAt(x, z, h);
  const moisture = moistureAt(x, z);
  if (temp < 0.19 || h > 27) return 'snow';
  if (isRiver(x, z)) return temp < 0.24 ? 'frozenRiver' : 'river';
  if (h <= SEA_LEVEL + 1) return 'beach';
  if (moisture < 0.23) return 'desert';
  if (moisture > 0.76 && h < 16) return 'wetland';
  if (moisture > 0.55) return 'forest';
  return 'plain';
}

function chunkKey(cx, cz) { return `${cx},${cz}`; }
function blockKey(x, y, z) { return `${x},${y},${z}`; }
function localKey(lx, y, lz) { return `${lx},${y},${lz}`; }
function worldToChunk(v) { return Math.floor(v / CHUNK_SIZE); }
function worldToLocal(v) { return ((v % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE; }
function parseLocalKey(key) { const [lx, y, lz] = key.split(',').map(Number); return { lx, y, lz }; }
function getChunk(cx, cz) { return chunks.get(chunkKey(cx, cz)); }

function ensureChunkData(cx, cz) {
  const key = chunkKey(cx, cz);
  let chunk = chunks.get(key);
  if (chunk) return chunk;
  const solid = new Map();
  const transparent = new Map();
  for (let lx = 0; lx < CHUNK_SIZE; lx++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      const x = cx * CHUNK_SIZE + lx;
      const z = cz * CHUNK_SIZE + lz;
      const h = terrainHeight(x, z);
      const biome = biomeAt(x, z, h);
      const cold = biome === 'snow' || biome === 'frozenRiver';
      for (let y = 0; y <= h; y++) {
        let type = 'stone';
        if (y === h) type = cold ? 'snow' : (biome === 'beach' || biome === 'desert' || biome === 'river' ? 'sand' : 'grass');
        else if (y >= h - 3) type = biome === 'desert' || biome === 'beach' ? 'sand' : (biome === 'river' || biome === 'frozenRiver' ? (y === h - 1 ? 'gravel' : 'clay') : 'dirt');
        else if (y < h - 9) {
          const ore = hash2(x * 3 + y, z * 3 - y, 21);
          if (ore > 0.991 && y < 14) type = 'crystal';
          else if (ore > 0.982 && y < 18) type = 'gold';
          else if (ore > 0.958 && y < 24) type = 'iron';
          else if (ore > 0.925 && y < 30) type = 'coal';
          else if (y < 5 && ore < 0.18) type = 'basalt';
        }
        solid.set(localKey(lx, y, lz), type);
      }
      if (h < SEA_LEVEL) {
        for (let y = h + 1; y <= SEA_LEVEL; y++) {
          const type = cold && y === SEA_LEVEL ? 'ice' : 'water';
          (type === 'water' ? transparent : solid).set(localKey(lx, y, lz), type);
        }
      }
      addSurfaceDecoration(solid, transparent, lx, h, lz, x, z, biome);
    }
  }
  generateTreesForChunk(cx, cz, solid);
  chunk = { cx, cz, solid, transparent, mesh: null, transparentMesh: null, dirty: true, lastUsedFrame: 0 };
  chunks.set(key, chunk);
  applyEditsToChunk(chunk);
  return chunk;
}

function addSurfaceDecoration(solid, transparent, lx, h, lz, x, z, biome) {
  if (h <= SEA_LEVEL) return;
  const top = solid.get(localKey(lx, h, lz));
  if (top !== 'grass' && top !== 'sand' && top !== 'snow') return;
  const r = hash2(x, z, 30);
  const y = h + 1;
  if (biome === 'desert' && top === 'sand') {
    if (r > 0.985) {
      const height = 2 + Math.floor(hash2(x, z, 31) * 2);
      for (let i = 0; i < height && y + i < MAX_HEIGHT; i++) solid.set(localKey(lx, y + i, lz), 'cactus');
    }
    return;
  }
  if ((biome === 'river' || biome === 'wetland') && r > 0.93) {
    transparent.set(localKey(lx, y, lz), 'reeds');
    if (r > 0.985 && y + 1 < MAX_HEIGHT) transparent.set(localKey(lx, y + 1, lz), 'reeds');
    return;
  }
  if (top === 'grass') {
    if (r > 0.82 && r < 0.91) transparent.set(localKey(lx, y, lz), 'tallgrass');
    else if (r >= 0.91 && r < 0.955) transparent.set(localKey(lx, y, lz), 'yellowflower');
    else if (r >= 0.955 && r < 0.985) transparent.set(localKey(lx, y, lz), 'redflower');
    else if (r >= 0.985) transparent.set(localKey(lx, y, lz), 'mushroom');
  }
}

function generateTreesForChunk(cx, cz, solid) {
  for (let lx = 2; lx < CHUNK_SIZE - 2; lx++) {
    for (let lz = 2; lz < CHUNK_SIZE - 2; lz++) {
      const x = cx * CHUNK_SIZE + lx;
      const z = cz * CHUNK_SIZE + lz;
      const h = terrainHeight(x, z);
      const biome = biomeAt(x, z, h);
      const treeChance = biome === 'forest' ? 0.962 : biome === 'snow' ? 0.978 : biome === 'plain' ? 0.992 : 1;
      if (hash2(x, z, 9) < treeChance) continue;
      if (!['grass', 'snow'].includes(solid.get(localKey(lx, h, lz)))) continue;
      const pine = biome === 'snow' || hash2(x, z, 18) > 0.72;
      const trunkType = pine ? 'wood' : (hash2(x, z, 19) > 0.62 ? 'birchWood' : 'wood');
      const leafType = pine ? 'pineLeaves' : 'leaves';
      const trunkH = pine ? 5 + Math.floor(hash2(x, z, 10) * 4) : 4 + Math.floor(hash2(x, z, 10) * 3);
      for (let i = 1; i <= trunkH; i++) solid.set(localKey(lx, h + i, lz), trunkType);
      const crownY = h + trunkH;
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          for (let dy = pine ? -2 : -1; dy <= 2; dy++) {
            const width = pine ? Math.max(1, 3 - Math.abs(dy)) : 2;
            if (Math.abs(dx) + Math.abs(dz) > width + 1) continue;
            if (!pine && Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - 1) > 4) continue;
            if (hash2(x + dx, z + dz, 100 + dy) < 0.08) continue;
            const nlx = lx + dx;
            const nlz = lz + dz;
            const ny = crownY + dy;
            if (nlx < 0 || nlx >= CHUNK_SIZE || nlz < 0 || nlz >= CHUNK_SIZE || ny < 0 || ny > MAX_HEIGHT) continue;
            const k = localKey(nlx, ny, nlz);
            if (!solid.has(k)) solid.set(k, leafType);
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
    chunk.solid.delete(lk);
    chunk.transparent.delete(lk);
    if (type !== null) {
      const dst = BLOCKS[type]?.fluid || BLOCKS[type]?.plant ? chunk.transparent : chunk.solid;
      dst.set(lk, type);
    }
  }
}

function getBlockWorld(x, y, z) {
  if (y < 0 || y > MAX_HEIGHT) return null;
  const editKey = blockKey(x, y, z);
  if (edits.has(editKey)) return edits.get(editKey);
  const chunk = ensureChunkData(worldToChunk(x), worldToChunk(z));
  const lk = localKey(worldToLocal(x), y, worldToLocal(z));
  return chunk.solid.get(lk) || chunk.transparent.get(lk) || null;
}

function setBlockWorld(x, y, z, type) {
  if (y < 0 || y > MAX_HEIGHT) return;
  const chunk = ensureChunkData(worldToChunk(x), worldToChunk(z));
  const lk = localKey(worldToLocal(x), y, worldToLocal(z));
  chunk.solid.delete(lk);
  chunk.transparent.delete(lk);
  if (type !== null) {
    const dst = BLOCKS[type]?.fluid || BLOCKS[type]?.plant ? chunk.transparent : chunk.solid;
    dst.set(lk, type);
  }
  edits.set(blockKey(x, y, z), type);
  markBlockNeighborhoodDirty(x, z);
}

function markChunkDirty(cx, cz) { const chunk = getChunk(cx, cz); if (chunk) chunk.dirty = true; }
function markBlockNeighborhoodDirty(x, z) {
  const cx = worldToChunk(x);
  const cz = worldToChunk(z);
  markChunkDirty(cx, cz);
  if (worldToLocal(x) === 0) markChunkDirty(cx - 1, cz);
  if (worldToLocal(x) === CHUNK_SIZE - 1) markChunkDirty(cx + 1, cz);
  if (worldToLocal(z) === 0) markChunkDirty(cx, cz - 1);
  if (worldToLocal(z) === CHUNK_SIZE - 1) markChunkDirty(cx, cz + 1);
}

function colorForFace(type, faceName, x, y, z) {
  const info = BLOCKS[type] || BLOCKS.dirt;
  let base = info.color;
  if (type === 'grass') {
    if (faceName === 'py') base = info.color;
    else if (faceName === 'ny') base = BLOCKS.dirt.color;
    else base = info.side;
  }
  if (type === 'wood' && (faceName === 'py' || faceName === 'ny')) base = 0x84552d;
  if (type === 'birchWood' && (faceName === 'py' || faceName === 'ny')) base = 0xd8cda5;
  const color = new THREE.Color(base);
  color.multiplyScalar(0.88 + hash2(x + y * 7, z - y * 5, 200) * 0.18);
  return color;
}
function shouldRenderFace(type, neighbor) {
  if (!neighbor) return true;
  if (type === neighbor && (type === 'water' || BLOCKS[type]?.plant)) return false;
  if (!BLOCKS[neighbor]?.solid) return true;
  if (type === 'water' || BLOCKS[type]?.plant) return true;
  return false;
}
function addFace(buffers, x, y, z, type, face) {
  const color = colorForFace(type, face.name, x, y, z);
  color.multiplyScalar(face.shade * (BLOCKS[type]?.emissive ? 1.28 : 1.0));
  const vertexIndex = buffers.positions.length / 3;
  for (const c of face.corners) {
    buffers.positions.push(x + c[0], y + c[1], z + c[2]);
    buffers.normals.push(face.n[0], face.n[1], face.n[2]);
    buffers.colors.push(color.r, color.g, color.b);
    buffers.blockPositions.push(x, y, z);
  }
  buffers.indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
}
function addPlant(buffers, x, y, z, type) {
  const h = type === 'reeds' ? 1.0 : type === 'mushroom' ? 0.45 : 0.72;
  const w = type === 'mushroom' ? 0.36 : 0.72;
  const cx = x + 0.5;
  const zc = z + 0.5;
  const color = new THREE.Color(BLOCKS[type]?.color || 0xffffff).multiplyScalar(0.94 + hash2(x + y, z - y, 220) * 0.14);
  const quads = [
    [[cx - w / 2, y, zc], [cx - w / 2, y + h, zc], [cx + w / 2, y + h, zc], [cx + w / 2, y, zc]],
    [[cx, y, zc - w / 2], [cx, y + h, zc - w / 2], [cx, y + h, zc + w / 2], [cx, y, zc + w / 2]],
  ];
  for (const quad of quads) {
    const vertexIndex = buffers.positions.length / 3;
    for (const p of quad) {
      buffers.positions.push(p[0], p[1], p[2]);
      buffers.normals.push(0, 1, 0);
      buffers.colors.push(color.r, color.g, color.b);
      buffers.blockPositions.push(x, y, z);
    }
    buffers.indices.push(vertexIndex, vertexIndex + 1, vertexIndex + 2, vertexIndex, vertexIndex + 2, vertexIndex + 3);
  }
}
function appendMapToBuffers(chunk, source, buffers) {
  for (const [lk, type] of source) {
    const { lx, y, lz } = parseLocalKey(lk);
    const x = chunk.cx * CHUNK_SIZE + lx;
    const z = chunk.cz * CHUNK_SIZE + lz;
    if (!BLOCKS[type]) continue;
    if (BLOCKS[type].plant) { addPlant(buffers, x, y, z, type); continue; }
    for (const face of FACE_DEFS) {
      const neighbor = getBlockWorld(x + face.n[0], y + face.n[1], z + face.n[2]);
      if (!shouldRenderFace(type, neighbor)) continue;
      addFace(buffers, x, y, z, type, face);
    }
  }
}
function makeGeometry(buffers) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(buffers.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(buffers.normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(buffers.colors, 3));
  geometry.setAttribute('blockPos', new THREE.Float32BufferAttribute(buffers.blockPositions, 3));
  geometry.setIndex(buffers.indices);
  geometry.computeBoundingSphere();
  return geometry;
}
function newBuffers() { return { positions: [], normals: [], colors: [], blockPositions: [], indices: [] }; }
function disposeMeshResource(mesh) {
  if (!mesh) return;
  worldGroup.remove(mesh);
  mesh.geometry?.dispose();
}
function disposeChunkMeshes(chunk) {
  disposeMeshResource(chunk.mesh);
  disposeMeshResource(chunk.transparentMesh);
  chunk.mesh = null;
  chunk.transparentMesh = null;
}
function buildChunkMesh(chunk) {
  disposeChunkMeshes(chunk);
  const solidBuffers = newBuffers();
  const transparentBuffers = newBuffers();
  appendMapToBuffers(chunk, chunk.solid, solidBuffers);
  appendMapToBuffers(chunk, chunk.transparent, transparentBuffers);
  if (solidBuffers.positions.length) {
    const mesh = new THREE.Mesh(makeGeometry(solidBuffers), chunkMaterial);
    mesh.userData.kind = 'solid';
    chunk.mesh = mesh;
    worldGroup.add(mesh);
  }
  if (transparentBuffers.positions.length) {
    const mesh = new THREE.Mesh(makeGeometry(transparentBuffers), transparentMaterial);
    mesh.userData.kind = 'transparent';
    chunk.transparentMesh = mesh;
    worldGroup.add(mesh);
  }
  chunk.dirty = false;
}
function disposeChunk(chunk) {
  disposeChunkMeshes(chunk);
}

let frameId = 0;
function updateVisibleChunks() {
  frameId++;
  const pcx = worldToChunk(Math.floor(player.x));
  const pcz = worldToChunk(Math.floor(player.z));
  for (let dx = -viewDistance; dx <= viewDistance; dx++) {
    for (let dz = -viewDistance; dz <= viewDistance; dz++) {
      const chunk = ensureChunkData(pcx + dx, pcz + dz);
      chunk.lastUsedFrame = frameId;
    }
  }
  const maxDist = viewDistance + 1;
  for (const [key, chunk] of Array.from(chunks.entries())) {
    if (Math.abs(chunk.cx - pcx) > maxDist || Math.abs(chunk.cz - pcz) > maxDist) {
      disposeChunk(chunk);
      chunks.delete(key);
    }
  }
  let rebuilt = 0;
  for (const chunk of Array.from(chunks.values())) {
    if (!chunk.dirty) continue;
    buildChunkMesh(chunk);
    rebuilt++;
    if (rebuilt >= 3) break;
  }
}

function isSolidBlockAt(x, y, z) {
  const type = getBlockWorld(x, y, z);
  return Boolean(type && BLOCKS[type]?.solid);
}
function playerAabbAt(x = player.x, eyeY = player.y, z = player.z) {
  const feet = eyeY - EYE_HEIGHT;
  return {
    minX: x - PLAYER_HALF_WIDTH,
    maxX: x + PLAYER_HALF_WIDTH,
    minY: feet,
    maxY: feet + PLAYER_HEIGHT,
    minZ: z - PLAYER_HALF_WIDTH,
    maxZ: z + PLAYER_HALF_WIDTH,
  };
}
function blockIntersectsAabb(x, y, z, aabb) {
  return x < aabb.maxX && x + 1 > aabb.minX
    && y < aabb.maxY && y + 1 > aabb.minY
    && z < aabb.maxZ && z + 1 > aabb.minZ;
}
function solidBlocksInAabb(aabb) {
  const blocks = [];
  const minX = Math.floor(aabb.minX);
  const maxX = Math.floor(aabb.maxX - 0.0001);
  const minY = Math.floor(aabb.minY);
  const maxY = Math.floor(aabb.maxY - 0.0001);
  const minZ = Math.floor(aabb.minZ);
  const maxZ = Math.floor(aabb.maxZ - 0.0001);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        if (isSolidBlockAt(x, y, z)) blocks.push({ x, y, z });
      }
    }
  }
  return blocks;
}
function isPlayerColliding(x = player.x, eyeY = player.y, z = player.z) {
  return solidBlocksInAabb(playerAabbAt(x, eyeY, z)).length > 0;
}
function movePlayerAxis(axis, delta) {
  if (delta === 0) return false;
  const epsilon = 0.0001;
  let nx = player.x;
  let nz = player.z;
  if (axis === 'x') nx += delta;
  else nz += delta;
  let aabb = playerAabbAt(nx, player.y, nz);
  const hits = solidBlocksInAabb(aabb);
  if (!hits.length) { player.x = nx; player.z = nz; return false; }
  if (axis === 'x') {
    if (delta > 0) nx = Math.min(...hits.map((b) => b.x)) - PLAYER_HALF_WIDTH - epsilon;
    else nx = Math.max(...hits.map((b) => b.x + 1)) + PLAYER_HALF_WIDTH + epsilon;
    if (!isPlayerColliding(nx, player.y, player.z)) player.x = nx;
  } else {
    if (delta > 0) nz = Math.min(...hits.map((b) => b.z)) - PLAYER_HALF_WIDTH - epsilon;
    else nz = Math.max(...hits.map((b) => b.z + 1)) + PLAYER_HALF_WIDTH + epsilon;
    if (!isPlayerColliding(player.x, player.y, nz)) player.z = nz;
  }
  return true;
}
function movePlayerVertical(delta) {
  if (delta === 0) return false;
  const epsilon = 0.0001;
  const nextY = player.y + delta;
  const aabb = playerAabbAt(player.x, nextY, player.z);
  const hits = solidBlocksInAabb(aabb);
  if (!hits.length) { player.y = nextY; player.onGround = false; return false; }
  if (delta > 0) {
    const topLimit = Math.min(...hits.map((b) => b.y));
    player.y = topLimit - PLAYER_HEIGHT + EYE_HEIGHT - epsilon;
    player.vy = 0;
    player.onGround = false;
  } else {
    const ground = Math.max(...hits.map((b) => b.y + 1));
    player.y = ground + EYE_HEIGHT + epsilon;
    player.vy = 0;
    player.onGround = true;
  }
  return true;
}
function getTopSolidHeight(x, z) {
  const bx = Math.round(x);
  const bz = Math.round(z);
  for (let y = MAX_HEIGHT; y >= 0; y--) {
    if (isSolidBlockAt(bx, y, bz)) return y + 1;
  }
  return 0;
}
function sampleGroundHeight(x, z) {
  return Math.max(getTopSolidHeight(x - PLAYER_HALF_WIDTH, z - PLAYER_HALF_WIDTH), getTopSolidHeight(x + PLAYER_HALF_WIDTH, z - PLAYER_HALF_WIDTH), getTopSolidHeight(x - PLAYER_HALF_WIDTH, z + PLAYER_HALF_WIDTH), getTopSolidHeight(x + PLAYER_HALF_WIDTH, z + PLAYER_HALF_WIDTH));
}
function isInWater() {
  const feetY = Math.floor(player.y - EYE_HEIGHT + 0.2);
  return getBlockWorld(Math.floor(player.x), feetY, Math.floor(player.z)) === 'water';
}
function overlapsPlayer(x, y, z) {
  return blockIntersectsAabb(x, y, z, playerAabbAt());
}
function resetPlayerToSpawn() {
  player.x = 0; player.z = 0; player.y = sampleGroundHeight(0, 0) + EYE_HEIGHT; player.vy = 0; player.onGround = true; showToast('已回到出生点');
}
function randomWorld() {
  seed = createSeed(); worldTime = 8; edits.clear(); clearEntities();
  for (const chunk of chunks.values()) disposeChunk(chunk);
  chunks.clear(); updateVisibleChunks(); resetPlayerToSpawn(); saveState(true); showToast(`随机刷新：Seed ${seed}`);
}
function updateRaycast() {
  camera.getWorldDirection(lookDir);
  raycaster.set(camera.position, lookDir);
  const meshes = [];
  for (const chunk of chunks.values()) { if (chunk.mesh) meshes.push(chunk.mesh); if (chunk.transparentMesh) meshes.push(chunk.transparentMesh); }
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
    currentPlaceCell = { x: x + Math.round(n.x), y: y + Math.round(n.y), z: z + Math.round(n.z) };
    highlightBox.position.set(x + 0.5, y + 0.5, z + 0.5);
    highlightBox.visible = true;
  } else { currentTarget = null; currentPlaceCell = null; highlightBox.visible = false; }
}
function mineTarget() {
  if (!currentTarget) return;
  const type = getBlockWorld(currentTarget.x, currentTarget.y, currentTarget.z);
  if (!type || type === 'water') return;
  setBlockWorld(currentTarget.x, currentTarget.y, currentTarget.z, null);
  playTone(160, 0.045, 0.05);
  showToast(`挖掉 ${BLOCKS[type]?.name || type}`);
}
function placeBlock() {
  if (!currentPlaceCell) return;
  const c = currentPlaceCell;
  if (c.y < 0 || c.y > MAX_HEIGHT || getBlockWorld(c.x, c.y, c.z) || overlapsPlayer(c.x, c.y, c.z)) return;
  setBlockWorld(c.x, c.y, c.z, selectedType);
  playTone(BLOCKS[selectedType]?.emissive ? 620 : 220, 0.04, 0.045);
  showToast(`放置 ${BLOCKS[selectedType].name}`);
}
function jump() { if (!player.onGround) return; player.vy = JUMP_SPEED; player.onGround = false; playTone(280, 0.035, 0.04); }

function bindTap(el, handler) {
  let lastTouchTime = 0;
  el.addEventListener('pointerup', (e) => { e.preventDefault(); e.stopPropagation(); lastTouchTime = performance.now(); unlockAudio(); handler(e); }, { passive: false });
  el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); if (performance.now() - lastTouchTime > 350) { unlockAudio(); handler(e); } }, { passive: false });
}
function bindHold(el, handler, interval = 150) {
  let timer = null;
  const start = (e) => { e.preventDefault(); e.stopPropagation(); unlockAudio(); handler(); clearInterval(timer); timer = setInterval(handler, interval); };
  const stop = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } clearInterval(timer); timer = null; };
  el.addEventListener('pointerdown', start, { passive: false }); el.addEventListener('pointerup', stop, { passive: false }); el.addEventListener('pointercancel', stop, { passive: false }); el.addEventListener('pointerleave', stop, { passive: false });
}
function unlockAudio() { if (audioCtx) return; try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audioCtx = null; } }
function playTone(freq = 220, duration = 0.04, gainValue = 0.04) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square'; osc.frequency.value = freq; gain.gain.value = gainValue; gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration);
}

bindTap(document.getElementById('startBtn'), () => { overlay.style.display = 'none'; gameStarted = true; showToast('开始探索'); });
bindTap(document.getElementById('jumpBtn'), jump);
bindTap(document.getElementById('resetBtn'), resetPlayerToSpawn);
bindTap(document.getElementById('randomBtn'), randomWorld);
bindTap(document.getElementById('saveBtn'), () => saveState(true));
bindTap(document.getElementById('inventoryBtn'), () => toggleInventory(true));
bindTap(document.getElementById('closeInventoryBtn'), () => toggleInventory(false));
bindTap(document.getElementById('timeBtn'), cycleTimeSpeed);
bindTap(document.getElementById('weatherBtn'), cycleWeather);
bindTap(document.getElementById('renderBtn'), cycleRenderDistance);
bindHold(document.getElementById('mineBtn'), mineTarget, 140);
bindHold(document.getElementById('placeBtn'), placeBlock, 165);

function blockColorCss(type) { return `#${(BLOCKS[type]?.color || 0xffffff).toString(16).padStart(6, '0')}`; }
function createBlockIcon(type) {
  const icon = document.createElement('div'); icon.className = 'block-icon'; icon.style.setProperty('--block-color', blockColorCss(type)); icon.style.setProperty('--icon-pattern', String(BLOCKS[type]?.plant || BLOCKS[type]?.fluid ? 0.25 : 0.56)); return icon;
}
function buildHotbar() {
  hotbarEl.innerHTML = '';
  HOTBAR.forEach((type, index) => {
    const slot = document.createElement('button'); slot.type = 'button'; slot.className = 'hotbar-slot' + (type === selectedType ? ' selected' : ''); slot.setAttribute('aria-label', `${index + 1}: ${BLOCKS[type].name}`);
    const num = document.createElement('div'); num.className = 'hotbar-num'; num.textContent = String(index + 1);
    slot.appendChild(createBlockIcon(type)); slot.appendChild(num); bindTap(slot, () => selectBlock(type)); hotbarEl.appendChild(slot);
  });
}
function buildInventory() {
  inventoryTabs.innerHTML = '';
  INVENTORY_GROUPS.forEach((group) => {
    const tab = document.createElement('button'); tab.type = 'button'; tab.className = 'inventory-tab' + (group === selectedGroup ? ' selected' : ''); tab.textContent = group;
    bindTap(tab, () => { selectedGroup = group; buildInventory(); }); inventoryTabs.appendChild(tab);
  });
  inventoryGrid.innerHTML = '';
  Object.entries(BLOCKS).filter(([, info]) => selectedGroup === '全部' || info.group === selectedGroup).forEach(([type, info]) => {
    if (type === 'water') return;
    const item = document.createElement('button'); item.type = 'button'; item.className = 'inventory-item' + (type === selectedType ? ' selected' : ''); item.appendChild(createBlockIcon(type));
    const label = document.createElement('div'); label.className = 'inventory-name'; label.textContent = info.name; item.appendChild(label);
    bindTap(item, () => { selectBlock(type); toggleInventory(false); }); inventoryGrid.appendChild(item);
  });
}
function toggleInventory(open) { inventoryPanel.classList.toggle('hidden', !open); if (open) buildInventory(); }
function selectBlock(type) {
  selectedType = type;
  document.querySelectorAll('.hotbar-slot').forEach((el, index) => el.classList.toggle('selected', HOTBAR[index] === selectedType));
  document.querySelectorAll('.inventory-item').forEach((el) => { const name = el.querySelector('.inventory-name')?.textContent; el.classList.toggle('selected', name === BLOCKS[type]?.name); });
  showToast(BLOCKS[type].name);
}
function cycleTimeSpeed() { timeSpeedIndex = (timeSpeedIndex + 1) % TIME_SPEEDS.length; showToast(`昼夜速度 ×${TIME_SPEEDS[timeSpeedIndex]}`); }
function cycleWeather() { weatherModeIndex = (weatherModeIndex + 1) % WEATHER_MODES.length; showToast(`天气：${weatherLabel(WEATHER_MODES[weatherModeIndex])}`); }
function cycleRenderDistance() { renderDistanceIndex = (renderDistanceIndex + 1) % RENDER_DISTANCES.length; viewDistance = Math.min(MAX_VIEW_DISTANCE, RENDER_DISTANCES[renderDistanceIndex]); for (const chunk of chunks.values()) chunk.dirty = true; showToast(`视野：${viewDistance} 区块`); }
function weatherLabel(mode) { return { auto: '自动', clear: '晴', rain: '雨', snow: '雪', storm: '暴雨' }[mode] || mode; }

let joyActive = false; let joyId = null; let joyCenter = { x: 0, y: 0 };
function updateJoystick(e) {
  const dx = e.clientX - joyCenter.x; const dy = e.clientY - joyCenter.y; const maxR = 42; const dist = Math.min(Math.hypot(dx, dy), maxR); const ang = Math.atan2(dy, dx); const nx = Math.cos(ang) * dist; const ny = Math.sin(ang) * dist; const dead = dist < 6 ? 0 : 1;
  joyKnob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`; joyVec.x = dead * nx / maxR; joyVec.y = dead * -ny / maxR;
}
joyBase.addEventListener('pointerdown', (e) => { e.preventDefault(); unlockAudio(); joyActive = true; joyId = e.pointerId; joyBase.setPointerCapture(joyId); const rect = joyBase.getBoundingClientRect(); joyCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; updateJoystick(e); }, { passive: false });
joyBase.addEventListener('pointermove', (e) => { if (joyActive && e.pointerId === joyId) { e.preventDefault(); updateJoystick(e); } }, { passive: false });
function endJoy(e) { if (e.pointerId !== joyId) return; joyActive = false; joyId = null; joyVec.x = 0; joyVec.y = 0; joyKnob.style.transform = 'translate(-50%, -50%)'; }
joyBase.addEventListener('pointerup', endJoy); joyBase.addEventListener('pointercancel', endJoy);

let lookActive = false; let lookId = null; let lastX = 0; let lastY = 0;
canvas.addEventListener('pointerdown', (e) => { if (!gameStarted) return; e.preventDefault(); unlockAudio(); lookActive = true; lookId = e.pointerId; canvas.setPointerCapture(lookId); lastX = e.clientX; lastY = e.clientY; }, { passive: false });
canvas.addEventListener('pointermove', (e) => { if (!lookActive || e.pointerId !== lookId) return; e.preventDefault(); const dx = e.clientX - lastX; const dy = e.clientY - lastY; lastX = e.clientX; lastY = e.clientY; rotateView(dx, dy); }, { passive: false });
function endLook(e) { if (e.pointerId === lookId) { lookActive = false; lookId = null; } }
canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);
function rotateView(dx, dy) { player.yaw -= dx * 0.0044; player.pitch -= dy * 0.0044; const lim = Math.PI / 2 - 0.05; player.pitch = Math.max(-lim, Math.min(lim, player.pitch)); }

window.addEventListener('keydown', (e) => {
  keys.add(e.code);
  if (e.code === 'Space') { e.preventDefault(); jump(); }
  const digit = Number(e.key);
  if (digit >= 1 && digit <= HOTBAR.length) selectBlock(HOTBAR[digit - 1]);
  if (e.code === 'KeyR') randomWorld(); if (e.code === 'KeyF') resetPlayerToSpawn(); if (e.code === 'KeyE') toggleInventory(inventoryPanel.classList.contains('hidden')); if (e.code === 'KeyT') cycleTimeSpeed(); if (e.code === 'KeyY') cycleWeather();
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas) rotateView(e.movementX, e.movementY); });
canvas.addEventListener('dblclick', () => { if (canvas.requestPointerLock && gameStarted) canvas.requestPointerLock(); });
canvas.addEventListener('mousedown', (e) => { if (!gameStarted) return; if (e.button === 0) mineTarget(); if (e.button === 2) placeBlock(); });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
window.addEventListener('resize', () => { camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth, window.innerHeight); });

function getKeyboardMove() { let x = 0; let y = 0; if (keys.has('KeyW') || keys.has('ArrowUp')) y += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) y -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1; return { x, y }; }
function updatePlayer(dt) {
  const kb = getKeyboardMove(); let inputX = joyVec.x + kb.x; let inputY = joyVec.y + kb.y; const inputLen = Math.hypot(inputX, inputY); if (inputLen > 1) { inputX /= inputLen; inputY /= inputLen; }
  const forward = { x: -Math.sin(player.yaw), z: -Math.cos(player.yaw) }; const right = { x: Math.cos(player.yaw), z: -Math.sin(player.yaw) }; const inWater = isInWater(); const sprint = keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT_MULTIPLIER : 1; const speed = MOVE_SPEED * sprint * (inWater ? 0.58 : 1);
  let mx = forward.x * inputY + right.x * inputX; let mz = forward.z * inputY + right.z * inputX; const moveLen = Math.hypot(mx, mz); if (moveLen > 1) { mx /= moveLen; mz /= moveLen; }
  movePlayerAxis('x', mx * speed * dt);
  movePlayerAxis('z', mz * speed * dt);
  player.vy -= (inWater ? GRAVITY * 0.28 : GRAVITY) * dt; if (inWater && player.vy < -2.2) player.vy = -2.2;
  movePlayerVertical(player.vy * dt);
  if (player.y < -25) resetPlayerToSpawn();
  const moving = Math.abs(mx) + Math.abs(mz) > 0.05; const now = performance.now(); if (moving && player.onGround && now - lastFootstep > (inWater ? 520 : 380)) { lastFootstep = now; playTone(inWater ? 110 : 90, 0.025, 0.018); }
}


function makePart(parent, material, scale, position) { const m = new THREE.Mesh(boxGeo, material); m.scale.set(scale[0], scale[1], scale[2]); m.position.set(position[0], position[1], position[2]); parent.add(m); return m; }
function createAnimalMesh(type) {
  const group = new THREE.Group(); const mat = entityMaterials[type] || entityMaterials.sheep; const dark = entityMaterials.dark;
  if (type === 'bird') { makePart(group, mat, [0.34, 0.22, 0.22], [0, 0.52, 0]); makePart(group, mat, [0.5, 0.04, 0.16], [-0.36, 0.55, 0]); makePart(group, mat, [0.5, 0.04, 0.16], [0.36, 0.55, 0]); return group; }
  const small = type === 'rabbit'; makePart(group, mat, small ? [0.42, 0.28, 0.24] : [0.72, 0.45, 0.34], [0, small ? 0.36 : 0.55, 0]); makePart(group, mat, small ? [0.22, 0.22, 0.20] : [0.34, 0.32, 0.28], [0.42, small ? 0.46 : 0.68, 0]); const legH = small ? 0.22 : 0.36; for (const sx of [-0.23, 0.23]) for (const sz of [-0.13, 0.13]) makePart(group, dark, [0.1, legH, 0.1], [sx, legH / 2, sz]); if (type === 'rabbit') { makePart(group, mat, [0.08, 0.32, 0.06], [0.5, 0.72, -0.06]); makePart(group, mat, [0.08, 0.32, 0.06], [0.5, 0.72, 0.06]); } return group;
}
function clearEntities() { for (const e of entities) entityGroup.remove(e.mesh); entities.length = 0; }
function spawnEntity(type, x, z) { const ground = sampleGroundHeight(x, z); const mesh = createAnimalMesh(type); mesh.position.set(x, ground, z); mesh.rotation.y = hash2(Math.floor(x), Math.floor(z), 500) * Math.PI * 2; entityGroup.add(mesh); entities.push({ type, mesh, x, z, y: ground, yaw: mesh.rotation.y, speed: type === 'bird' ? 1.4 : type === 'rabbit' ? 1.1 : 0.55, think: 0 }); }
function spawnEntitiesAroundPlayer(now) {
  if (now - lastEntitySpawn < 2500 || entities.length >= 22) return; lastEntitySpawn = now;
  for (let tries = 0; tries < 8; tries++) {
    const ang = Math.random() * Math.PI * 2; const dist = 18 + Math.random() * 38; const x = Math.round(player.x + Math.cos(ang) * dist); const z = Math.round(player.z + Math.sin(ang) * dist); const h = terrainHeight(x, z); const biome = biomeAt(x, z, h); const top = getBlockWorld(x, h, z); if (!['grass', 'snow', 'sand'].includes(top)) continue; if (getBlockWorld(x, h + 1, z) === 'water') continue;
    let type = 'cow'; if (biome === 'snow') type = Math.random() > 0.55 ? 'rabbit' : 'fox'; else if (biome === 'desert') type = Math.random() > 0.65 ? 'rabbit' : 'bird'; else if (biome === 'forest') type = Math.random() > 0.5 ? 'fox' : 'sheep'; else type = Math.random() > 0.5 ? 'cow' : 'sheep'; spawnEntity(type, x, z); break;
  }
}
function updateEntities(dt, now) {
  spawnEntitiesAroundPlayer(now);
  for (let i = entities.length - 1; i >= 0; i--) {
    const e = entities[i]; const dxp = e.x - player.x; const dzp = e.z - player.z; if (dxp * dxp + dzp * dzp > 95 * 95) { entityGroup.remove(e.mesh); entities.splice(i, 1); continue; }
    e.think -= dt; if (e.think <= 0) { e.think = 1.2 + Math.random() * 3.4; e.yaw += (Math.random() - 0.5) * 1.6; }
    const nx = e.x + Math.sin(e.yaw) * e.speed * dt; const nz = e.z + Math.cos(e.yaw) * e.speed * dt; const ground = sampleGroundHeight(nx, nz); const water = getBlockWorld(Math.round(nx), Math.floor(ground), Math.round(nz)) === 'water'; if (!water && Math.abs(ground - e.y) < 1.4) { e.x = nx; e.z = nz; e.y = ground; } else e.yaw += Math.PI * 0.5;
    e.mesh.position.set(e.x, e.y, e.z); e.mesh.rotation.y = e.yaw; if (e.type === 'bird') e.mesh.position.y += 2.2 + Math.sin(now * 0.004 + i) * 0.35;
  }
}

function createClouds() {
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.78 }); const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < 22; i++) { const group = new THREE.Group(); group.position.set((hash2(i, 0, 70) - 0.5) * 150, 32 + hash2(i, 2, 72) * 9, (hash2(i, 1, 71) - 0.5) * 150); const pieces = 3 + Math.floor(hash2(i, 3, 73) * 5); for (let j = 0; j < pieces; j++) { const m = new THREE.Mesh(cloudGeo, cloudMat); m.scale.set(5 + hash2(i, j, 74) * 8, 0.55, 2.2 + hash2(i, j, 75) * 4); m.position.set((j - pieces / 2) * 4.5, 0, (hash2(i, j, 76) - 0.5) * 4); group.add(m); } clouds.push(group); scene.add(group); }
}
function resolveWeather() { const mode = WEATHER_MODES[weatherModeIndex]; if (mode !== 'auto') return mode; const h = terrainHeight(Math.round(player.x), Math.round(player.z)); const biome = biomeAt(Math.round(player.x), Math.round(player.z), h); const stormNoise = valueNoise(worldTime * 18, seed % 777, 7, 500); if (biome === 'snow' && stormNoise > 0.44) return 'snow'; if (stormNoise > 0.78) return 'storm'; if (stormNoise > 0.58) return 'rain'; return 'clear'; }
function initWeatherParticles() { for (let i = 0; i < weatherCount; i++) resetWeatherParticle(i, true); weatherGeo.attributes.position.needsUpdate = true; }
function resetWeatherParticle(i, randomY = false) { const r = 36; weatherPositions[i * 3] = player.x + (Math.random() - 0.5) * r * 2; weatherPositions[i * 3 + 1] = player.y + (randomY ? Math.random() * 34 - 8 : 24 + Math.random() * 10); weatherPositions[i * 3 + 2] = player.z + (Math.random() - 0.5) * r * 2; }
function updateWeather(dt) {
  currentWeather = resolveWeather(); const active = currentWeather !== 'clear'; weatherPoints.visible = active; if (!active) return;
  const snow = currentWeather === 'snow'; weatherMat.color.set(snow ? 0xffffff : 0xa9c8ff); weatherMat.size = snow ? 0.16 : 0.075; weatherMat.opacity = currentWeather === 'storm' ? 0.92 : 0.72;
  const fall = snow ? 5 : currentWeather === 'storm' ? 32 : 22; const drift = snow ? 1.4 : 6.5;
  for (let i = 0; i < weatherCount; i++) { weatherPositions[i * 3] += (Math.sin(i + worldTime) * drift * 0.15) * dt; weatherPositions[i * 3 + 1] -= fall * dt; weatherPositions[i * 3 + 2] += (snow ? Math.cos(i * 1.7) * 0.22 : -0.8) * dt; if (weatherPositions[i * 3 + 1] < player.y - 6) resetWeatherParticle(i, false); }
  weatherGeo.attributes.position.needsUpdate = true;
}
function updateSky(dt, now) {
  worldTime = (worldTime + dt * TIME_SPEEDS[timeSpeedIndex] * 24 / WORLD_DAY_SECONDS) % 24;
  const angle = (worldTime / 24) * Math.PI * 2 - Math.PI / 2; const daylight = Math.max(0.08, Math.sin(angle) * 0.62 + 0.48); const dawn = Math.max(0, 1 - Math.abs(worldTime - 6) / 2.2) + Math.max(0, 1 - Math.abs(worldTime - 18) / 2.2);
  const sky = new THREE.Color(0x08101f).lerp(new THREE.Color(0x8ecae8), daylight).lerp(new THREE.Color(0xff9f7a), Math.min(0.35, dawn * 0.22));
  if (currentWeather === 'rain' || currentWeather === 'storm') sky.lerp(new THREE.Color(0x53606f), currentWeather === 'storm' ? 0.48 : 0.32); if (currentWeather === 'snow') sky.lerp(new THREE.Color(0xc4d2df), 0.24);
  scene.background = sky; scene.fog.color.copy(sky); scene.fog.far = currentWeather === 'storm' ? 66 : currentWeather === 'rain' || currentWeather === 'snow' ? 82 : 112; ambient.intensity = 0.18 + daylight * 0.50; sun.intensity = (0.12 + daylight * 0.92) * (currentWeather === 'storm' ? 0.55 : 1); sun.position.set(Math.cos(angle) * 70, Math.sin(angle) * 78 + 10, 28); moon.intensity = 0.20 * (1 - daylight);
  for (let i = 0; i < clouds.length; i++) { const c = clouds[i]; c.position.x += (0.004 + i * 0.00008) * (currentWeather === 'storm' ? 2.4 : 1); if (c.position.x > player.x + 90) c.position.x = player.x - 90; }
  if (currentWeather === 'storm' && Math.random() < dt * 0.18) { sun.intensity = 2.4; playTone(60, 0.08, 0.025); }
}

function showToast(text) { toastEl.textContent = text; toastEl.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1000); }
function formatTimeHour(hour) { const h = Math.floor(hour); const m = Math.floor((hour - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
function updateHud() {
  const target = currentTarget ? (BLOCKS[getBlockWorld(currentTarget.x, currentTarget.y, currentTarget.z)]?.name || '-') : '无'; const biome = biomeAt(Math.round(player.x), Math.round(player.z), terrainHeight(Math.round(player.x), Math.round(player.z)));
  debugText.textContent = `Seed ${seed} | ${formatTimeHour(worldTime)} ×${TIME_SPEEDS[timeSpeedIndex]} | ${weatherLabel(currentWeather)}\n手持 ${BLOCKS[selectedType].name} | 坐标 ${player.x.toFixed(1)}, ${Math.floor(player.y - EYE_HEIGHT)}, ${player.z.toFixed(1)}\n区块 ${chunks.size} | 生物群系 ${biome} | 目标 ${target} | 动物 ${entities.length}`;
}
function saveState(force = false) {
  const now = performance.now(); if (!force && now - lastSaveTime < 5000) return; lastSaveTime = now;
  const payload = { seed, selectedType, selectedGroup, worldTime, timeSpeedIndex, weatherModeIndex, renderDistanceIndex, player: { x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch }, edits: Array.from(edits.entries()).slice(-5000) };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(payload)); if (force) showToast('世界已保存'); } catch { if (force) showToast('保存失败：浏览器存储不可用'); }
}
function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY); if (!raw) return false; const payload = JSON.parse(raw); if (!payload || !Number.isFinite(payload.seed)) return false;
    seed = payload.seed; selectedType = BLOCKS[payload.selectedType] ? payload.selectedType : 'grass'; selectedGroup = INVENTORY_GROUPS.includes(payload.selectedGroup) ? payload.selectedGroup : '全部'; worldTime = Number.isFinite(payload.worldTime) ? payload.worldTime : 8; timeSpeedIndex = Number.isInteger(payload.timeSpeedIndex) ? Math.max(0, Math.min(TIME_SPEEDS.length - 1, payload.timeSpeedIndex)) : 1; weatherModeIndex = Number.isInteger(payload.weatherModeIndex) ? Math.max(0, Math.min(WEATHER_MODES.length - 1, payload.weatherModeIndex)) : 0; renderDistanceIndex = Number.isInteger(payload.renderDistanceIndex) ? Math.max(0, Math.min(RENDER_DISTANCES.length - 1, payload.renderDistanceIndex)) : 0; viewDistance = RENDER_DISTANCES[renderDistanceIndex];
    edits.clear(); if (Array.isArray(payload.edits)) for (const item of payload.edits) if (Array.isArray(item) && item.length === 2) edits.set(item[0], item[1]);
    if (payload.player) { player.x = Number(payload.player.x) || 0; player.y = Number(payload.player.y) || 18; player.z = Number(payload.player.z) || 0; player.yaw = Number(payload.player.yaw) || 0; player.pitch = Number(payload.player.pitch) || -0.15; }
    return true;
  } catch { return false; }
}
function initWorld() { const loaded = loadState(); buildHotbar(); buildInventory(); initWeatherParticles(); createClouds(); updateVisibleChunks(); if (!loaded) resetPlayerToSpawn(); currentWeather = resolveWeather(); showToast(loaded ? '已载入上次世界' : `新世界 Seed ${seed}`); }

let lastTime = performance.now();
function animate(now) {
  requestAnimationFrame(animate); const dt = Math.min((now - lastTime) / 1000, 0.05); lastTime = now;
  updateVisibleChunks(); updatePlayer(dt); updateEntities(dt, now);
  camera.position.set(player.x, player.y, player.z); camera.rotation.x = player.pitch; camera.rotation.y = player.yaw; camera.rotation.z = 0;
  updateRaycast(); updateWeather(dt); updateSky(dt, now); updateHud(); saveState(false); renderer.render(scene, camera);
}

initWorld();
requestAnimationFrame(animate);
