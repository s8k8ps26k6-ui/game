const RESCUE_STYLE_ID = 'mobile-ui-rescue-style';

function updateViewportVars() {
  const viewport = window.visualViewport;
  const left = viewport?.offsetLeft || 0;
  const top = viewport?.offsetTop || 0;
  const width = viewport?.width || window.innerWidth || document.documentElement.clientWidth || 0;
  const height = viewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
  const right = Math.max(0, (window.innerWidth || width) - left - width);
  const bottom = Math.max(0, (window.innerHeight || height) - top - height);
  const root = document.documentElement.style;
  root.setProperty('--vv-left', `${left}px`);
  root.setProperty('--vv-top', `${top}px`);
  root.setProperty('--vv-width', `${width}px`);
  root.setProperty('--vv-height', `${height}px`);
  root.setProperty('--vv-right', `${right}px`);
  root.setProperty('--vv-bottom', `${bottom}px`);
}

function injectRescueStyle() {
  if (document.getElementById(RESCUE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = RESCUE_STYLE_ID;
  style.textContent = `
    html, body {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      overflow: hidden !important;
      overscroll-behavior: none !important;
      touch-action: none !important;
    }
    #container {
      position: fixed !important;
      left: var(--vv-left, 0px) !important;
      top: var(--vv-top, 0px) !important;
      width: var(--vv-width, 100vw) !important;
      height: var(--vv-height, 100vh) !important;
      overflow: hidden !important;
      touch-action: none !important;
      background: #000 !important;
    }
    canvas#c {
      position: absolute !important;
      left: 0 !important;
      top: 0 !important;
      width: var(--vv-width, 100vw) !important;
      height: var(--vv-height, 100vh) !important;
      z-index: 1 !important;
    }
    #crosshair { z-index: 110 !important; display: block !important; visibility: visible !important; opacity: 0.95 !important; }
    #hud-top {
      position: fixed !important;
      left: calc(var(--vv-left, 0px) + max(10px, env(safe-area-inset-left))) !important;
      top: calc(var(--vv-top, 0px) + max(10px, env(safe-area-inset-top))) !important;
      right: calc(var(--vv-right, 0px) + max(10px, env(safe-area-inset-right))) !important;
      z-index: 130 !important;
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #hotbar {
      position: fixed !important;
      left: calc(var(--vv-left, 0px) + var(--vv-width, 100vw) / 2) !important;
      top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 64px) !important;
      bottom: auto !important;
      transform: translateX(-50%) !important;
      z-index: 130 !important;
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      max-width: min(74vw, calc(var(--vv-width, 100vw) - 310px)) !important;
    }
    #joystick-base {
      position: fixed !important;
      left: calc(var(--vv-left, 0px) + max(22px, env(safe-area-inset-left))) !important;
      top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 144px) !important;
      bottom: auto !important;
      z-index: 135 !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #action-buttons {
      position: fixed !important;
      right: calc(var(--vv-right, 0px) + max(18px, env(safe-area-inset-right))) !important;
      top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 154px) !important;
      bottom: auto !important;
      z-index: 135 !important;
      display: grid !important;
      visibility: visible !important;
      opacity: 1 !important;
    }
    #center-toast { position: fixed !important; top: calc(var(--vv-top, 0px) + 18%) !important; z-index: 150 !important; }
    #inventory-panel { position: fixed !important; left: var(--vv-left, 0px) !important; top: var(--vv-top, 0px) !important; width: var(--vv-width, 100vw) !important; height: var(--vv-height, 100vh) !important; z-index: 180 !important; }
    #info-overlay { position: fixed !important; left: var(--vv-left, 0px) !important; top: var(--vv-top, 0px) !important; width: var(--vv-width, 100vw) !important; height: var(--vv-height, 100vh) !important; z-index: 190 !important; }
    #mobileStartRescue {
      position: fixed;
      left: calc(var(--vv-left, 0px) + var(--vv-width, 100vw) / 2);
      top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 230px);
      transform: translateX(-50%);
      z-index: 220;
      border: 1px solid rgba(255,255,255,0.28);
      border-radius: 999px;
      padding: 12px 18px;
      color: #07111f;
      background: rgba(255, 213, 74, 0.94);
      box-shadow: 0 10px 30px rgba(0,0,0,0.38);
      font-weight: 900;
      font-size: 15px;
      backdrop-filter: blur(12px);
      touch-action: manipulation;
    }
    #mobileStartRescue.hidden { display: none !important; }
    @media (max-height: 520px) and (orientation: landscape) {
      #hud-left { display: none !important; }
      #hud-tools { max-width: min(64vw, 520px) !important; }
      #joystick-base { width: 96px !important; height: 96px !important; top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 112px) !important; }
      #joystick-knob { width: 40px !important; height: 40px !important; }
      #action-buttons { transform: scale(0.88); transform-origin: right bottom; top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 132px) !important; }
      #hotbar { top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 54px) !important; transform: translateX(-50%) scale(0.88) !important; }
      #mobileStartRescue { top: calc(var(--vv-top, 0px) + var(--vv-height, 100vh) - 178px) !important; }
    }
  `;
  document.head.appendChild(style);
}

function isOverlayVisible() {
  const overlay = document.getElementById('info-overlay');
  if (!overlay) return false;
  const style = getComputedStyle(overlay);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

function clickStartButton() {
  const startBtn = document.getElementById('startBtn');
  if (!startBtn) return false;
  startBtn.click();
  return true;
}

function createRescueButton() {
  if (document.getElementById('mobileStartRescue')) return;
  const button = document.createElement('button');
  button.id = 'mobileStartRescue';
  button.type = 'button';
  button.textContent = '开始 / 恢复控制';
  button.addEventListener('pointerup', (event) => {
    event.preventDefault();
    event.stopPropagation();
    clickStartButton();
    button.classList.add('hidden');
  }, { passive: false });
  document.body.appendChild(button);
  window.setTimeout(() => {
    if (isOverlayVisible()) return;
    button.classList.remove('hidden');
  }, 700);
}

function installTapToStartFallback() {
  const canvas = document.getElementById('c');
  if (!canvas) return;
  const tryStart = () => {
    if (isOverlayVisible()) return;
    clickStartButton();
    document.getElementById('mobileStartRescue')?.classList.add('hidden');
  };
  canvas.addEventListener('pointerdown', tryStart, { capture: true, passive: true });
}

function lockScrollPosition() {
  updateViewportVars();
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function initMobileUiRescue() {
  updateViewportVars();
  injectRescueStyle();
  lockScrollPosition();
  createRescueButton();
  installTapToStartFallback();
  window.visualViewport?.addEventListener('resize', lockScrollPosition);
  window.visualViewport?.addEventListener('scroll', lockScrollPosition);
  window.addEventListener('resize', () => requestAnimationFrame(lockScrollPosition));
  window.addEventListener('orientationchange', () => window.setTimeout(lockScrollPosition, 250));
  document.addEventListener('scroll', lockScrollPosition, { passive: true });
  window.setInterval(lockScrollPosition, 1000);
}

initMobileUiRescue();
