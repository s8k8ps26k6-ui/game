const SURVIVAL_SAVE_KEY = 'block-world-survival-inventory-v1';

const BLOCK_NAMES = {
  grass: '草方块',
  dirt: '泥土',
  stone: '石头',
  sand: '沙子',
  gravel: '砂砾',
  clay: '黏土',
  snow: '雪块',
  ice: '冰',
  water: '水',
  wood: '原木',
  birchWood: '白桦木',
  leaves: '树叶',
  pineLeaves: '松叶',
  cactus: '仙人掌',
  reeds: '芦苇',
  tallgrass: '草丛',
  redflower: '红花',
  yellowflower: '黄花',
  mushroom: '蘑菇',
  coal: '煤矿',
  iron: '铁矿',
  gold: '金矿',
  crystal: '晶簇',
  basalt: '玄武岩',
  obsidian: '黑曜石',
  planks: '木板',
  brick: '砖块',
  glass: '玻璃',
  lamp: '灯块',
  white: '白墙',
  dark: '深色石',
  blue: '蓝砖',
  red: '红砖',
};

const HOTBAR_TYPES = ['grass', 'dirt', 'stone', 'wood', 'planks', 'glass', 'lamp', 'snow', 'water'];
const PLACEABLE_TYPES = new Set(Object.keys(BLOCK_NAMES));
const ITEM_NAMES = {
  stick: '木棍',
  craftingTable: '工作台',
  woodenPickaxe: '木镐',
  stonePickaxe: '石镐',
};
const DISPLAY_NAMES = { ...BLOCK_NAMES, ...ITEM_NAMES };
const NAME_TO_TYPE = Object.entries(DISPLAY_NAMES).reduce((acc, [type, name]) => {
  acc[name] = type;
  return acc;
}, {});

const DEFAULT_COUNTS = {
  grass: 12,
  dirt: 16,
  stone: 8,
  wood: 4,
  planks: 8,
  glass: 0,
  lamp: 0,
  snow: 0,
  water: 0,
};

const RECIPES = [
  { id: 'wood-planks', label: '原木 → 木板 ×4', inputs: { wood: 1 }, outputs: { planks: 4 } },
  { id: 'planks-table', label: '木板 ×4 → 工作台', inputs: { planks: 4 }, outputs: { craftingTable: 1 } },
  { id: 'planks-sticks', label: '木板 ×2 → 木棍 ×4', inputs: { planks: 2 }, outputs: { stick: 4 } },
  { id: 'wood-pickaxe', label: '木板 ×3 + 木棍 ×2 → 木镐', inputs: { planks: 3, stick: 2 }, outputs: { woodenPickaxe: 1 } },
  { id: 'stone-pickaxe', label: '石头 ×3 + 木棍 ×2 → 石镐', inputs: { stone: 3, stick: 2 }, outputs: { stonePickaxe: 1 } },
  { id: 'lamp', label: '煤矿 + 木板 → 灯块', inputs: { coal: 1, planks: 1 }, outputs: { lamp: 1 } },
];

const state = {
  counts: loadCounts(),
  panelOpen: false,
  lastToast: '',
  lastToastAt: 0,
};

function loadCounts() {
  try {
    const raw = localStorage.getItem(SURVIVAL_SAVE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_COUNTS, ...parsed };
  } catch {
    return { ...DEFAULT_COUNTS };
  }
}
function saveCounts() {
  localStorage.setItem(SURVIVAL_SAVE_KEY, JSON.stringify(state.counts));
}
function countOf(type) { return Math.max(0, Number(state.counts[type] || 0)); }
function addItem(type, amount = 1) {
  if (!type || amount === 0) return;
  state.counts[type] = countOf(type) + amount;
  saveCounts();
  refreshSurvivalUi();
}
function removeItem(type, amount = 1) {
  if (countOf(type) < amount) return false;
  state.counts[type] = countOf(type) - amount;
  saveCounts();
  refreshSurvivalUi();
  return true;
}
function showLiteToast(message) {
  const toast = document.getElementById('center-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showLiteToast.timer);
  showLiteToast.timer = window.setTimeout(() => toast.classList.remove('show'), 1300);
}

function getSelectedType() {
  const hotbarSlot = document.querySelector('.hotbar-slot.selected');
  if (hotbarSlot) {
    const index = Array.from(document.querySelectorAll('.hotbar-slot')).indexOf(hotbarSlot);
    if (index >= 0 && HOTBAR_TYPES[index]) return HOTBAR_TYPES[index];
    const label = hotbarSlot.getAttribute('aria-label') || '';
    const name = label.split(':').pop()?.trim();
    if (name && NAME_TO_TYPE[name]) return NAME_TO_TYPE[name];
  }
  const selectedInventoryName = document.querySelector('.inventory-item.selected .inventory-name')?.textContent?.trim();
  return NAME_TO_TYPE[selectedInventoryName] || 'grass';
}

function canPlaceSelected() {
  const type = getSelectedType();
  if (!PLACEABLE_TYPES.has(type)) return false;
  if (countOf(type) > 0) return true;
  showLiteToast(`${DISPLAY_NAMES[type] || type} 数量不足`);
  return false;
}

function installPlaceGuards() {
  const placeBtn = document.getElementById('placeBtn');
  const canvas = document.getElementById('c');
  const guard = (event) => {
    if (!canPlaceSelected()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  ['pointerdown', 'click'].forEach((type) => placeBtn?.addEventListener(type, guard, { capture: true, passive: false }));
  canvas?.addEventListener('mousedown', (event) => {
    if (event.button !== 2) return;
    guard(event);
  }, { capture: true, passive: false });
}

function handleGameToast(message) {
  const now = performance.now();
  if (!message || (message === state.lastToast && now - state.lastToastAt < 80)) return;
  state.lastToast = message;
  state.lastToastAt = now;

  const mined = message.match(/^挖掉\s+(.+)$/);
  if (mined) {
    const type = NAME_TO_TYPE[mined[1].trim()];
    if (type && type !== 'water') addItem(type, 1);
    return;
  }
  const placed = message.match(/^放置\s+(.+)$/);
  if (placed) {
    const type = NAME_TO_TYPE[placed[1].trim()];
    if (type) removeItem(type, 1);
  }
}

function observeToast() {
  const toast = document.getElementById('center-toast');
  if (!toast) return;
  const observer = new MutationObserver(() => handleGameToast(toast.textContent.trim()));
  observer.observe(toast, { childList: true, characterData: true, subtree: true });
}

function installStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .survival-count-badge {
      position: absolute;
      right: 5px;
      bottom: 4px;
      padding: 1px 5px;
      border-radius: 999px;
      background: rgba(0, 0, 0, 0.62);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      line-height: 1.2;
      pointer-events: none;
    }
    .hotbar-slot { position: relative; }
    .inventory-count-tag {
      margin-left: 6px;
      opacity: 0.78;
      font-size: 12px;
    }
    #craftBtn { min-width: 42px; }
    #survival-craft-panel {
      position: fixed;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: min(92vw, 430px);
      max-height: min(78vh, 620px);
      overflow: auto;
      z-index: 45;
      padding: 16px;
      border-radius: 22px;
      background: rgba(9, 15, 28, 0.94);
      color: #f5f8ff;
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.45);
      backdrop-filter: blur(18px);
      border: 1px solid rgba(255, 255, 255, 0.12);
    }
    #survival-craft-panel.hidden { display: none; }
    .survival-panel-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }
    .survival-panel-head h2 { margin: 0; font-size: 18px; }
    .survival-close {
      border: 0;
      border-radius: 12px;
      padding: 8px 11px;
      color: #fff;
      background: rgba(255, 255, 255, 0.12);
    }
    .survival-section-title {
      margin: 12px 0 8px;
      color: rgba(255, 255, 255, 0.72);
      font-size: 13px;
      font-weight: 700;
    }
    .survival-inventory-list {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
    }
    .survival-chip {
      border-radius: 999px;
      padding: 5px 9px;
      background: rgba(255, 255, 255, 0.1);
      font-size: 12px;
      white-space: nowrap;
    }
    .recipe-list { display: grid; gap: 8px; }
    .recipe-card {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.08);
    }
    .recipe-card.disabled { opacity: 0.48; }
    .recipe-main { display: grid; gap: 3px; }
    .recipe-label { font-weight: 800; font-size: 13px; }
    .recipe-cost { font-size: 11px; color: rgba(255, 255, 255, 0.62); }
    .recipe-card button {
      border: 0;
      border-radius: 12px;
      padding: 8px 10px;
      color: #06111f;
      background: #9ee493;
      font-weight: 900;
    }
    .recipe-card.disabled button { background: rgba(255,255,255,0.22); color: rgba(255,255,255,0.65); }
  `;
  document.head.appendChild(style);
}

function createCraftPanel() {
  const tools = document.getElementById('hud-tools');
  if (!tools || document.getElementById('craftBtn')) return;
  const craftBtn = document.createElement('button');
  craftBtn.id = 'craftBtn';
  craftBtn.className = 'tool-btn';
  craftBtn.type = 'button';
  craftBtn.setAttribute('aria-label', '打开合成');
  craftBtn.textContent = '⚒️';
  tools.insertBefore(craftBtn, tools.firstChild);

  const panel = document.createElement('div');
  panel.id = 'survival-craft-panel';
  panel.className = 'hidden';
  panel.innerHTML = `
    <div class="survival-panel-head">
      <h2>⚒️ 合成 / 背包</h2>
      <button class="survival-close" type="button">关闭</button>
    </div>
    <div class="survival-section-title">当前物品</div>
    <div class="survival-inventory-list" id="survivalInventoryList"></div>
    <div class="survival-section-title">配方</div>
    <div class="recipe-list" id="recipeList"></div>
  `;
  document.body.appendChild(panel);
  craftBtn.addEventListener('click', () => toggleCraftPanel(!state.panelOpen));
  panel.querySelector('.survival-close')?.addEventListener('click', () => toggleCraftPanel(false));
}
function toggleCraftPanel(open) {
  state.panelOpen = open;
  document.getElementById('survival-craft-panel')?.classList.toggle('hidden', !open);
  if (open) refreshCraftPanel();
}

function hasIngredients(recipe) {
  return Object.entries(recipe.inputs).every(([type, amount]) => countOf(type) >= amount);
}
function ingredientText(inputs) {
  return Object.entries(inputs).map(([type, amount]) => `${DISPLAY_NAMES[type] || type} ×${amount}`).join('，');
}
function outputText(outputs) {
  return Object.entries(outputs).map(([type, amount]) => `${DISPLAY_NAMES[type] || type} ×${amount}`).join('，');
}
function craft(recipe) {
  if (!hasIngredients(recipe)) {
    showLiteToast('材料不足');
    return;
  }
  Object.entries(recipe.inputs).forEach(([type, amount]) => { state.counts[type] = countOf(type) - amount; });
  Object.entries(recipe.outputs).forEach(([type, amount]) => { state.counts[type] = countOf(type) + amount; });
  saveCounts();
  showLiteToast(`合成 ${outputText(recipe.outputs)}`);
  refreshSurvivalUi();
}
function refreshCraftPanel() {
  const inv = document.getElementById('survivalInventoryList');
  if (inv) {
    inv.innerHTML = '';
    Object.entries(state.counts)
      .filter(([, amount]) => amount > 0)
      .sort(([a], [b]) => (DISPLAY_NAMES[a] || a).localeCompare(DISPLAY_NAMES[b] || b, 'zh-Hans-CN'))
      .forEach(([type, amount]) => {
        const chip = document.createElement('div');
        chip.className = 'survival-chip';
        chip.textContent = `${DISPLAY_NAMES[type] || type} ×${amount}`;
        inv.appendChild(chip);
      });
    if (!inv.children.length) inv.textContent = '背包为空，先挖一些方块。';
  }
  const list = document.getElementById('recipeList');
  if (!list) return;
  list.innerHTML = '';
  RECIPES.forEach((recipe) => {
    const ready = hasIngredients(recipe);
    const card = document.createElement('div');
    card.className = `recipe-card${ready ? '' : ' disabled'}`;
    card.innerHTML = `
      <div class="recipe-main">
        <div class="recipe-label">${recipe.label}</div>
        <div class="recipe-cost">需要：${ingredientText(recipe.inputs)}</div>
      </div>
      <button type="button">合成</button>
    `;
    card.querySelector('button')?.addEventListener('click', () => craft(recipe));
    list.appendChild(card);
  });
}

function refreshHotbarCounts() {
  document.querySelectorAll('.hotbar-slot').forEach((slot, index) => {
    const type = HOTBAR_TYPES[index];
    if (!type) return;
    let badge = slot.querySelector('.survival-count-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'survival-count-badge';
      slot.appendChild(badge);
    }
    badge.textContent = String(countOf(type));
  });
}
function refreshInventoryGridCounts() {
  document.querySelectorAll('.inventory-item').forEach((item) => {
    const nameEl = item.querySelector('.inventory-name');
    if (!nameEl) return;
    const type = NAME_TO_TYPE[nameEl.textContent.trim()];
    if (!type) return;
    let tag = item.querySelector('.inventory-count-tag');
    if (!tag) {
      tag = document.createElement('span');
      tag.className = 'inventory-count-tag';
      nameEl.appendChild(tag);
    }
    tag.textContent = `×${countOf(type)}`;
  });
}
function refreshSurvivalUi() {
  refreshHotbarCounts();
  refreshInventoryGridCounts();
  if (state.panelOpen) refreshCraftPanel();
}
function observeUiChanges() {
  const hotbar = document.getElementById('hotbar');
  const inventory = document.getElementById('inventory-grid');
  const observer = new MutationObserver(() => requestAnimationFrame(refreshSurvivalUi));
  if (hotbar) observer.observe(hotbar, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  if (inventory) observer.observe(inventory, { childList: true, subtree: true });
}

function initSurvivalLoopLite() {
  installStyles();
  createCraftPanel();
  installPlaceGuards();
  observeToast();
  observeUiChanges();
  refreshSurvivalUi();
  window.setTimeout(refreshSurvivalUi, 250);
}

initSurvivalLoopLite();
