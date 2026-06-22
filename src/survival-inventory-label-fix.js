function normalizeInventoryCountTags() {
  document.querySelectorAll('.inventory-item').forEach((item) => {
    const nameEl = item.querySelector('.inventory-name');
    const tag = item.querySelector('.inventory-count-tag');
    if (!nameEl || !tag || tag.parentElement === item) return;
    item.appendChild(tag);
  });
}

function initInventoryLabelFix() {
  normalizeInventoryCountTags();
  const grid = document.getElementById('inventory-grid');
  if (!grid) return;
  const observer = new MutationObserver(() => requestAnimationFrame(normalizeInventoryCountTags));
  observer.observe(grid, { childList: true, subtree: true });
  window.setInterval(normalizeInventoryCountTags, 800);
}

initInventoryLabelFix();
