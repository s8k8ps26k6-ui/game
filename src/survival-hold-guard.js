function selectedHotbarCount() {
  const badge = document.querySelector('.hotbar-slot.selected .survival-count-badge');
  const value = Number(badge?.textContent || 0);
  return Number.isFinite(value) ? value : 0;
}

function stopPlaceHoldIfEmpty() {
  if (selectedHotbarCount() > 0) return;
  const placeBtn = document.getElementById('placeBtn');
  if (!placeBtn) return;
  try {
    placeBtn.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true, pointerId: 0 }));
  } catch {
    placeBtn.dispatchEvent(new Event('pointercancel', { bubbles: true }));
  }
}

function initSurvivalHoldGuard() {
  const toast = document.getElementById('center-toast');
  if (!toast) return;
  const observer = new MutationObserver(() => {
    const message = toast.textContent.trim();
    if (!message.startsWith('放置 ')) return;
    requestAnimationFrame(stopPlaceHoldIfEmpty);
  });
  observer.observe(toast, { childList: true, characterData: true, subtree: true });
}

initSurvivalHoldGuard();
