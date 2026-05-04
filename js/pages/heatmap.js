/* ─────────────────────────────────────────────────────────────────────────
   heatmap.js — Portfolio heatmap (Goal × Department)

   Cell value: count of projects in that goal × department intersection.
   Color intensity scales from light to deep innovation-blue based on the
   max cell value in the current view.

   Goal lane assignment uses laneGoalFor() (primary goal only) — same rule
   as the roadmap timeline, so each project shows in exactly one row.
   Multi-goal projects show under their primary goal.

   Filter state is respected; click on the filter button at the top of any
   page narrows what feeds into the heatmap.

   Future enhancement: when the tracker's time_entries feature service is
   exposed via AGOL, swap the cell value from project-count to sum-of-hours
   for a true investment view. Until then, count is the most honest signal.
   ───────────────────────────────────────────────────────────────────────── */

import { getProjects, laneGoalFor } from '../data.js?v=36';
import { DATA_PROGRAM_GOALS, GOAL_BY_VALUE } from '../config.js?v=36';
import { startLoading, showError } from '../ui-state.js?v=36';
import { getActiveFilters, subscribe } from '../filters.js?v=36';

const NO_DEPT_LABEL = 'Unassigned';

function projectGoalSlug(p) {
  const value = laneGoalFor(p);
  return GOAL_BY_VALUE[value]?.slug || null;
}

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

async function renderHeatmap() {
  const slot = document.getElementById('heatmap-slot');
  if (!slot) return;

  const loading = startLoading(slot, 'goal-grid');

  try {
    const filters = getActiveFilters();
    const projects = await getProjects({ filters });
    loading.cancel();

    // grid[goalSlug][dept] = count
    const grid = {};
    const deptTotals = {};
    for (const p of projects) {
      const slug = projectGoalSlug(p) || 'unclassified';
      const dept = p.partner_dept || NO_DEPT_LABEL;
      grid[slug] = grid[slug] || {};
      grid[slug][dept] = (grid[slug][dept] || 0) + 1;
      deptTotals[dept] = (deptTotals[dept] || 0) + 1;
    }

    const rows = [...DATA_PROGRAM_GOALS];
    if (grid['unclassified']) {
      rows.push({ slug: 'unclassified', short: 'Unclassified' });
    }

    const depts = Object.keys(deptTotals).sort((a, b) => deptTotals[b] - deptTotals[a]);

    if (depts.length === 0) {
      slot.innerHTML = `<p class="muted prose" style="padding: var(--space-6) 0;">No projects match the current filter — try clearing filters or visiting the Portfolio.</p>`;
      return;
    }

    let maxCount = 0;
    for (const slug in grid) {
      for (const c of Object.values(grid[slug])) {
        if (c > maxCount) maxCount = c;
      }
    }

    let html = `<div class="heatmap-wrap"><table class="heatmap"><thead><tr>`;
    html += `<th class="heatmap__corner"></th>`;
    for (const d of depts) html += `<th class="heatmap__col">${escape(d)}</th>`;
    html += `<th class="heatmap__total-h">Total</th></tr></thead><tbody>`;

    let grandTotal = 0;
    for (const row of rows) {
      html += `<tr><th class="heatmap__row">${escape(row.short)}</th>`;
      let rowTotal = 0;
      for (const d of depts) {
        const c = grid[row.slug]?.[d] || 0;
        rowTotal += c;
        if (c === 0) {
          html += `<td class="heatmap__cell heatmap__cell--empty">·</td>`;
        } else {
          const bg = colorFor(c, maxCount);
          const fg = textColorFor(c, maxCount);
          const tooltip = `${escape(d)} × ${escape(row.short)}: ${c} project${c===1?'':'s'}`;
          html += `<td class="heatmap__cell" style="background:${bg};color:${fg};" title="${tooltip}">${c}</td>`;
        }
      }
      html += `<td class="heatmap__row-total">${rowTotal}</td></tr>`;
      grandTotal += rowTotal;
    }

    html += `<tr><th class="heatmap__row">Department total</th>`;
    for (const d of depts) {
      html += `<td class="heatmap__row-total">${deptTotals[d]}</td>`;
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
        <span>Total: <strong>${grandTotal}</strong> project${grandTotal===1?'':'s'} across <strong>${depts.length}</strong> department${depts.length===1?'':'s'}</span>
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

renderHeatmap();
subscribe(renderHeatmap);
window.addEventListener('tucson-data:refresh', renderHeatmap);
