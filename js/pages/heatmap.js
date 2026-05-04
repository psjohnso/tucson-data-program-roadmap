/* ─────────────────────────────────────────────────────────────────────────
   heatmap.js — Portfolio heatmap

   Renders a 2-D grid of project counts across two project dimensions.
   The user picks the dimension pairing via the View dropdown; URL state
   is ?view=<id> with the default (goal-dept) omitted.

   Dimension model: each dimension has
     keyFn(p)         → the bucket key for a project
     labelFn(key)     → display string for a bucket
     orderedKeysFn(t) → ordered array of keys to render (t = totals map)

   Goals always render in fixed config order; status follows STATUS_ORDER
   (only values present); dept and team are dynamic, sorted by total desc.

   Filter state is respected; refresh integration is wired.

   Future enhancement: cell click → drill-down by applying both row and
   column as filters (where they map to filter dimensions).
   ───────────────────────────────────────────────────────────────────────── */

import { getProjects, laneGoalFor } from '../data.js?v=37';
import {
  DATA_PROGRAM_GOALS,
  GOAL_BY_VALUE,
  STATUS_ORDER,
  STATUS_LABELS
} from '../config.js?v=37';
import { startLoading, showError } from '../ui-state.js?v=37';
import { getActiveFilters, subscribe } from '../filters.js?v=37';

const NO_DEPT_LABEL = 'Unassigned';
const NO_TEAM_LABEL = 'Unassigned';
const UNCLASSIFIED_GOAL = 'Unclassified';

/* ─── Dimensions ─────────────────────────────────────────────────────────── */

const DIMENSIONS = {
  goal: {
    title: 'Data Program Goal',
    keyFn: (p) => laneGoalFor(p),                 // returns AGOL value or 'Unclassified'
    labelFn: (key) => GOAL_BY_VALUE[key]?.short || key,
    orderedKeysFn: (totals) => {
      const out = DATA_PROGRAM_GOALS.map(g => g.value);
      if (totals[UNCLASSIFIED_GOAL]) out.push(UNCLASSIFIED_GOAL);
      return out;  // always show all 6, even if empty (audit signal)
    }
  },
  dept: {
    title: 'Department',
    keyFn: (p) => p.partner_dept || NO_DEPT_LABEL,
    labelFn: (key) => key,
    orderedKeysFn: (totals) =>
      Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  },
  team: {
    title: 'ITD Team',
    keyFn: (p) => p.itd_team || NO_TEAM_LABEL,
    labelFn: (key) => key,
    orderedKeysFn: (totals) =>
      Object.keys(totals).sort((a, b) => totals[b] - totals[a])
  },
  status: {
    title: 'Status',
    keyFn: (p) => p.status || 'Unknown',
    labelFn: (key) => STATUS_LABELS[key] || key,
    orderedKeysFn: (totals) =>
      STATUS_ORDER.filter(s => totals[s] > 0)
  }
};

/* ─── View definitions ───────────────────────────────────────────────────── */

const VIEWS = {
  'goal-dept':   { row: 'goal',   col: 'dept'   },
  'team-goal':   { row: 'team',   col: 'goal'   },
  'status-goal': { row: 'status', col: 'goal'   },
  'dept-status': { row: 'dept',   col: 'status' }
};
const DEFAULT_VIEW = 'goal-dept';

function getCurrentView() {
  const v = new URLSearchParams(window.location.search).get('view');
  return VIEWS[v] ? v : DEFAULT_VIEW;
}

function setView(viewId) {
  const params = new URLSearchParams(window.location.search);
  if (viewId === DEFAULT_VIEW) params.delete('view'); else params.set('view', viewId);
  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  window.history.replaceState(null, '', url);
}

/* ─── Rendering ──────────────────────────────────────────────────────────── */

function escape(s) {
  if (s == null) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function colorFor(count, max) {
  if (!count) return null;
  const ratio = max > 0 ? count / max : 0;
  const alpha = 0.05 + ratio * 0.80;
  return `rgba(0, 38, 105, ${alpha.toFixed(3)})`;
}

function textColorFor(count, max) {
  if (!count) return 'var(--text-tertiary)';
  const ratio = max > 0 ? count / max : 0;
  return ratio > 0.55 ? 'white' : 'var(--text-primary)';
}

function explainerFor(viewId) {
  const v = VIEWS[viewId];
  const rowDim = DIMENSIONS[v.row];
  const colDim = DIMENSIONS[v.col];
  return `Each row is a ${rowDim.title.toLowerCase()}; each column is a ${colDim.title.toLowerCase()}. The number in each cell is the count of projects at that intersection; cell color scales with that count. The trailing column and row show per-${rowDim.title.toLowerCase()} and per-${colDim.title.toLowerCase()} totals.`;
}

async function renderHeatmap() {
  const slot = document.getElementById('heatmap-slot');
  const explainer = document.getElementById('heatmap-explainer');
  if (!slot) return;

  const viewId = getCurrentView();
  const view = VIEWS[viewId];
  const rowDim = DIMENSIONS[view.row];
  const colDim = DIMENSIONS[view.col];

  if (explainer) explainer.textContent = explainerFor(viewId);
  syncToggleControl(viewId);

  const loading = startLoading(slot, 'goal-grid');

  try {
    const filters = getActiveFilters();
    const projects = await getProjects({ filters });
    loading.cancel();

    // grid[rowKey][colKey] = count
    const grid = {};
    const rowTotals = {};
    const colTotals = {};
    for (const p of projects) {
      const rk = rowDim.keyFn(p);
      const ck = colDim.keyFn(p);
      grid[rk] = grid[rk] || {};
      grid[rk][ck] = (grid[rk][ck] || 0) + 1;
      rowTotals[rk] = (rowTotals[rk] || 0) + 1;
      colTotals[ck] = (colTotals[ck] || 0) + 1;
    }

    const rowKeys = rowDim.orderedKeysFn(rowTotals);
    const colKeys = colDim.orderedKeysFn(colTotals);

    if (colKeys.length === 0) {
      slot.innerHTML = `<p class="muted prose" style="padding: var(--space-6) 0;">No projects match the current filter — try clearing filters or visiting the Portfolio.</p>`;
      return;
    }

    let maxCount = 0;
    for (const rk of rowKeys) {
      for (const ck of colKeys) {
        const c = grid[rk]?.[ck] || 0;
        if (c > maxCount) maxCount = c;
      }
    }

    let html = `<div class="heatmap-wrap"><table class="heatmap"><thead><tr>`;
    html += `<th class="heatmap__corner"></th>`;
    for (const ck of colKeys) {
      html += `<th class="heatmap__col">${escape(colDim.labelFn(ck))}</th>`;
    }
    html += `<th class="heatmap__total-h">Total</th></tr></thead><tbody>`;

    let grandTotal = 0;
    for (const rk of rowKeys) {
      html += `<tr><th class="heatmap__row">${escape(rowDim.labelFn(rk))}</th>`;
      let rowTotal = 0;
      for (const ck of colKeys) {
        const c = grid[rk]?.[ck] || 0;
        rowTotal += c;
        if (c === 0) {
          html += `<td class="heatmap__cell heatmap__cell--empty">·</td>`;
        } else {
          const bg = colorFor(c, maxCount);
          const fg = textColorFor(c, maxCount);
          const tooltip = `${escape(colDim.labelFn(ck))} × ${escape(rowDim.labelFn(rk))}: ${c} project${c===1?'':'s'}`;
          html += `<td class="heatmap__cell" style="background:${bg};color:${fg};" title="${tooltip}">${c}</td>`;
        }
      }
      html += `<td class="heatmap__row-total">${rowTotal}</td></tr>`;
      grandTotal += rowTotal;
    }

    html += `<tr><th class="heatmap__row">${escape(colDim.title)} total</th>`;
    for (const ck of colKeys) {
      html += `<td class="heatmap__row-total">${colTotals[ck] || 0}</td>`;
    }
    html += `<td class="heatmap__grand-total">${grandTotal}</td></tr>`;
    html += `</tbody></table></div>`;

    html += `
      <div class="heatmap-legend">
        <span>Fewer projects</span>
        <span class="heatmap-legend__bar"></span>
        <span>More projects</span>
        <span class="heatmap-legend__divider">·</span>
        <span>Max cell: <strong>${maxCount}</strong></span>
        <span>Total: <strong>${grandTotal}</strong> project${grandTotal===1?'':'s'} across <strong>${colKeys.length}</strong> ${escape(colDim.title.toLowerCase())} value${colKeys.length===1?'':'s'}</span>
      </div>`;

    slot.innerHTML = html;
  } catch (err) {
    loading.cancel();
    console.error('Failed to render heatmap:', err);
    showError(slot, {
      title: "Couldn't load heatmap data",
      error: err,
      onRetry: renderHeatmap
    });
  }
}

function syncToggleControl(viewId) {
  const select = document.getElementById('heatmap-view');
  if (select && select.value !== viewId) select.value = viewId;
}

/* ─── Boot ───────────────────────────────────────────────────────────────── */

const select = document.getElementById('heatmap-view');
if (select) {
  select.value = getCurrentView();
  select.addEventListener('change', () => {
    setView(select.value);
    renderHeatmap();
  });
}

renderHeatmap();
subscribe(renderHeatmap);
window.addEventListener('tucson-data:refresh', renderHeatmap);
