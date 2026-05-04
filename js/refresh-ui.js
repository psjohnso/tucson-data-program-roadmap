/* ─────────────────────────────────────────────────────────────────────────
   refresh-ui.js — data-freshness indicator + manual refresh

   Self-contained UI that surfaces "data is N minutes old" when the project
   cache is older than STALE_THRESHOLD_MIN, with a Refresh button that
   clears the cache and triggers all pages to re-render with fresh data.

   How re-rendering works:
     1. Refresh button → data.js clearCache()
     2. window dispatches 'tucson-data:refresh' custom event
     3. Each page module listens for it and calls its renderAll()
     4. renderAll re-invokes data.js helpers which see no cache and refetch
     5. Cache repopulates with _lastFetchTime = now → indicator hides

   Bar is hidden until either:
     - The cache exists and age >= STALE_THRESHOLD_MIN, OR
     - The cache exists at all on goal-detail (where age display still helpful)

   The bar polls every 60s to update relative-time display.
   ───────────────────────────────────────────────────────────────────────── */

import { getLastFetchTime, clearCache } from './data.js?v=37';

const STALE_THRESHOLD_MIN = 15;  // 15 minutes — shows indicator after this
const TICK_INTERVAL_MS = 60_000;  // re-render bar every minute

let bar = null;

function init() {
  bar = document.getElementById('refresh-bar');
  if (!bar) return;

  // First paint
  refreshUI();

  // Tick every minute so the relative time stays accurate
  setInterval(refreshUI, TICK_INTERVAL_MS);

  // Refresh button click
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-refresh-toggle]')) {
      handleRefresh();
    }
  });

  // Update bar after every page re-render so it can hide once data refreshes
  window.addEventListener('tucson-data:refresh', () => {
    // Give pages a moment to fetch and update _lastFetchTime
    setTimeout(refreshUI, 200);
  });
}

function refreshUI() {
  if (!bar) return;
  const fetchedAt = getLastFetchTime();
  if (!fetchedAt) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  const ageMin = Math.floor((Date.now() - fetchedAt) / 60_000);
  if (ageMin < STALE_THRESHOLD_MIN) {
    bar.hidden = true;
    bar.innerHTML = '';
    return;
  }
  bar.hidden = false;
  bar.innerHTML = renderBar(ageMin);
}

function renderBar(ageMin) {
  const ageText = formatAge(ageMin);
  return `
    <div class="refresh-bar__inner">
      <span class="refresh-bar__age" aria-live="polite">Data loaded ${ageText} ago</span>
      <button class="refresh-bar__btn" type="button" data-refresh-toggle>Refresh</button>
    </div>`;
}

function formatAge(ageMin) {
  if (ageMin < 60) return `${ageMin} min`;
  const hours = Math.floor(ageMin / 60);
  const minutes = ageMin % 60;
  if (hours === 1 && minutes === 0) return '1 hour';
  if (minutes === 0) return `${hours} hours`;
  return `${hours}h ${minutes}m`;
}

async function handleRefresh() {
  if (!bar) return;
  const btn = bar.querySelector('[data-refresh-toggle]');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Refreshing…';
  }

  // Clear cache so next read forces a fresh fetch
  clearCache();

  // Tell every page to re-render with fresh data
  window.dispatchEvent(new CustomEvent('tucson-data:refresh'));

  // After a short delay, re-render the bar. By then _lastFetchTime is updated
  // (a page module's renderAll has fired a fresh fetch). The bar will hide
  // because the new age is < STALE_THRESHOLD_MIN.
  setTimeout(() => {
    refreshUI();
    if (btn) { btn.disabled = false; btn.textContent = 'Refresh'; }
  }, 800);
}

init();
