const RESCUE_STYLE_ID = 'mobile-ui-rescue-style';

function injectRescueStyle() {
  if (document.getElementById(RESCUE_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = RESCUE_STYLE_ID;
  style.textContent = `
    html, body {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100dvh !important;
      min-height: 100dvh !important;
      overflow: hidden !important;
      overscroll-behavior: none !important;
      touch-action: none !important;
    }
    #container {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100dvh !important;
      overflow: hidden !important;
      touch-action: none !important;
    }
    canvas#c {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      height: 100dvh !important;
      z-index: 1 !important;
    }
    #crosshair { z-index: 110 !important; display: block !important; visibility: visible !important; opacity: 0.95 !important; }
    #hud-top { z-index: 130 !important; display: flex !important; visibility: visible !important; opacity: 1 !important; }
    #hotbar { z-index: 130 !important; display: flex !important; visibility: visible !important; opacity: 1 !important; }
    #joystick-base { z-index: 135 !important; display: block !important; visibility: visible !important; opacity: 1 !important; }
    #action-buttons { z-index: 135 !important; display: grid !important; visibility: visible !important; opacity: 1 !important; }
    #center-toast { z-index: 150 !important; }
    #inventory-panel { z-index: 180 !important; }
    #info-overlay { z-index: 190 !important; }
    #mobileStartRescue {
      position: fixed;
      left: 50%;
      bottom: max(150px, calc(env(safe-area-inset-bottom) + 132px));
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
    @media (min-width: 900px) and (orientation: landscape) {
      #mobileStartRescue { bottom: max(118px, calc(env(safe-area-inset-bottom) + 96px)); }
      #hotbar { max-width: calc(100vw - 330px) !important; }
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
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function initMobileUiRescue() {
  injectRescueStyle();
  lockScrollPosition();
  createRescueButton();
  installTapToStartFallback();
  window.addEventListener('resize', () => requestAnimationFrame(lockScrollPosition));
  window.addEventListener('orientationchange', () => window.setTimeout(lockScrollPosition, 250));
  document.addEventListener('scroll', lockScrollPosition, { passive: true });
  window.setInterval(lockScrollPosition, 1500);
}

initMobileUiRescue();
