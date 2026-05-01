/* ─────────────────────────────────────────────────────────────────────────
   home.js — workspace home page logic
   Currently wires the status strip to live counts from the data layer.
   Roadmap-views grid, funnel, capacity readout, and recent activity arrive
   in subsequent chunks.
   ───────────────────────────────────────────────────────────────────────── */

import { getStatusCounts, getShippedCount } from '../data.js';

async function renderStatusStrip() {
  const strip = document.getElementById('status-strip');
  if (!strip) return;

  try {
    const [counts, shipped] = await Promise.all([
      getStatusCounts(),
      getShippedCount()
    ]);

    setStat('active',    counts['Active']    || 0);
    setStat('scheduled', counts['Scheduled'] || 0);
    setStat('future',    counts['Future']    || 0);
    setStat('idea',      counts['Idea']      || 0);
    setStat('complete',  shipped);
  } catch (err) {
    console.error('Failed to render status strip:', err);
    document.querySelectorAll('[data-stat]').forEach(el => { el.textContent = '?'; });
  }
}

function setStat(key, value) {
  const el = document.querySelector(`[data-stat="${key}"]`);
  if (el) el.textContent = String(value);
}

renderStatusStrip();
