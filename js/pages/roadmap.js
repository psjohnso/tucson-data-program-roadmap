/* ─────────────────────────────────────────────────────────────────────────
   roadmap.js — timeline canvas

   Renders a horizontal timeline of Data Program projects across six lanes
   (one per Data Program Goal) plus an Unclassified lane for projects with
   no goal set. Time axis runs from `windowStart` to `windowEnd` (default:
   3 months back, 18 months forward). Status filter excludes Complete.

   For each project:
   - Both start and end → full bar, length proportional to duration
   - Only one date     → point marker (diamond)
   - Neither           → excluded silently (project still counts toward lane total)

   Bar packing per lane uses a greedy algorithm: sort by start date, place
   each bar in the lowest row that doesn't overlap with prior bars in that lane.
   Lanes auto-grow vertically to fit their stacks.
   ───────────────────────────────────────────────────────────────────────── */

import {
  getProjects,
  getProjectsByGoal,
  projectDisplayTitle,
  projectStartDate,
  projectEndDate,
  laneGoalFor
} from '../data.js?v=19';
import { DATA_PROGRAM_GOALS, GOAL_BY_VALUE } from '../config.js?v=19';
import { openProjectModal } from '../modal.js?v=19';
import { startLoading, showError } from '../ui-state.js?v=19';

/* ─── Layout constants ──────────────────────────────────────────────────── */

const LANE_LABEL_WIDTH  = 180;
const AXIS_HEIGHT       = 38;
const ROW_HEIGHT        = 28;          // height of one bar + its vertical padding
const ROW_BAR_HEIGHT    = 22;
const LANE_PADDING_TOP  = 10;
const LANE_PADDING_BOT  = 10;
const LANE_MIN_HEIGHT   = ROW_HEIGHT + LANE_PADDING_TOP + LANE_PADDING_BOT; // empty-lane height

const TODAY_MARKER_COLOR = 'var(--cot-sunset-orange)';

/* ─── Status filter — Complete excluded per chunk 1.4 spec ──────────────── */

const VISIBLE_STATUSES = new Set([
  'Active', 'Scheduled', 'Future', 'Idea', 'On Hold', 'Waiting', 'Canceled'
]);

const STATUS_COLORS = {
  'Active':    'var(--status-active)',
  'Scheduled': 'var(--status-scheduled)',
  'Future':    'var(--status-future)',
  'Idea':      'var(--status-idea)',
  'On Hold':   'var(--status-onhold)',
  'Waiting':   'var(--status-waiting)',
  'Canceled':  'var(--status-canceled)'
};

/* ─── Time window ───────────────────────────────────────────────────────── */

function defaultWindow() {
  const now = new Date();
  const start = new Date(now); start.setMonth(start.getMonth() - 3);
  const end   = new Date(now); end.setMonth(end.getMonth() + 18);
  // Snap to month boundaries for cleaner quarter axis
  start.setDate(1);
  end.setDate(1);
  end.setMonth(end.getMonth() + 1); // round up to start of next month
  return { start, end };
}

/* ─── Bar packing ────────────────────────────────────────────────────────────
   For each lane, sort projects by start date. Place each project in the
   lowest row where it doesn't overlap any already-placed project in that lane.
   ───────────────────────────────────────────────────────────────────────── */

function packLane(projects) {
  // Each project gets {project, startMs, endMs, row, isPoint}
  const items = projects.map(p => {
    let s = projectStartDate(p);
    let e = projectEndDate(p);
    const isPoint = !!(s && !e) || !!(!s && e);
    if (!s && !e) return null;     // exclude no-date projects
    // For point markers, give a small visual width by treating start and end
    // as the same date.
    if (isPoint) {
      const d = s || e;
      s = d; e = d;
    }
    return {
      project: p,
      startMs: s.getTime(),
      endMs: e.getTime(),
      isPoint
    };
  }).filter(Boolean);

  items.sort((a, b) => a.startMs - b.startMs);

  // rows[i] = endMs of the last item placed in row i
  const rows = [];
  for (const item of items) {
    let placedRow = -1;
    for (let i = 0; i < rows.length; i++) {
      // Some breathing room between bars in the same row: 7 days
      if (rows[i] + (7 * 24 * 60 * 60 * 1000) <= item.startMs) {
        placedRow = i;
        break;
      }
    }
    if (placedRow === -1) {
      placedRow = rows.length;
      rows.push(0);
    }
    rows[placedRow] = item.endMs;
    item.row = placedRow;
  }

  return {
    items,
    rowCount: Math.max(rows.length, 1)
  };
}

/* ─── Date axis helpers ─────────────────────────────────────────────────── */

/** Generate quarter boundary dates within [start, end]. */
function quarterBoundaries(start, end) {
  const out = [];
  const d = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3, 1);
  while (d <= end) {
    out.push(new Date(d));
    d.setMonth(d.getMonth() + 3);
  }
  return out;
}

function quarterLabel(date) {
  const q = Math.floor(date.getMonth() / 3) + 1;
  const yr = String(date.getFullYear()).slice(-2);
  return `Q${q} ${yr}`;
}

/** Convert a Date to an x coordinate within the canvas. */
function dateToX(date, windowStart, windowEnd, canvasLeft, canvasRight) {
  const total = windowEnd.getTime() - windowStart.getTime();
  const offset = date.getTime() - windowStart.getTime();
  const ratio = Math.max(0, Math.min(1, offset / total));
  return canvasLeft + ratio * (canvasRight - canvasLeft);
}

/* ─── Main render ───────────────────────────────────────────────────────── */

async function renderTimeline() {
  const target = document.getElementById('timeline');
  if (!target) return;

  const loading = startLoading(target, 'timeline');

  try {
    const { start: windowStart, end: windowEnd } = defaultWindow();

    // Fetch all projects (we filter for status here so the lane counts can
    // include all visible projects, while only non-Complete ones get bars)
    const allProjects = await getProjects();
    loading.cancel();
    const visibleProjects = allProjects.filter(p => VISIBLE_STATUSES.has(p.status));

    // Group by lane
    const lanes = [
      ...DATA_PROGRAM_GOALS.map(g => ({
        slug: g.slug,
        label: g.short,
        color: g.color,
        goalValue: g.value,
        totalCount: 0,
        projects: []
      })),
      {
        slug: 'unclassified',
        label: 'Unclassified',
        color: 'var(--text-tertiary)',
        goalValue: 'Unclassified',
        totalCount: 0,
        projects: []
      }
    ];
    const laneByGoal = Object.fromEntries(lanes.map(l => [l.goalValue, l]));

    // Count totals (across all statuses including Complete) for the lane label
    for (const p of allProjects) {
      const g = laneGoalFor(p);
      if (laneByGoal[g]) laneByGoal[g].totalCount++;
    }
    // And put the visible non-Complete projects into their lanes
    for (const p of visibleProjects) {
      const g = laneGoalFor(p);
      if (laneByGoal[g]) laneByGoal[g].projects.push(p);
    }

    // Pack each lane's bars
    for (const lane of lanes) {
      lane.packed = packLane(lane.projects);
    }

    // Hide ONLY the Unclassified lane if it's empty. Always show the six brand
    // lanes — an empty Security lane tells leadership a real story about
    // investment patterns. The lane shows its "No dated work" empty state.
    const visibleLanes = lanes.filter(l =>
      l.slug !== 'unclassified' || l.totalCount > 0 || l.packed.items.length > 0
    );

    // Compute lane Y positions
    let cursorY = AXIS_HEIGHT;
    for (const lane of visibleLanes) {
      const stacks = lane.packed.rowCount;
      const stackHeight = stacks * ROW_HEIGHT;
      lane.height = Math.max(LANE_MIN_HEIGHT, stackHeight + LANE_PADDING_TOP + LANE_PADDING_BOT);
      lane.yTop = cursorY;
      lane.yBot = cursorY + lane.height;
      cursorY += lane.height;
    }

    const totalHeight = cursorY;
    const canvasLeft = LANE_LABEL_WIDTH;
    // SVG viewBox width determined responsively via width="100%"; we work in a
    // fixed virtual width and rely on viewBox + preserveAspectRatio to scale.
    const canvasWidth = 1200;
    const canvasRight = canvasWidth;

    // Build SVG markup
    const svg = buildSvg({
      windowStart, windowEnd,
      lanes: visibleLanes,
      canvasLeft, canvasRight,
      totalHeight, canvasWidth
    });

    target.innerHTML = svg;

    attachTooltipBehavior(target);
  } catch (err) {
    loading.cancel();
    console.error('Failed to render timeline:', err);
    showError(target, {
      title: "Couldn't load timeline data",
      error: err,
      onRetry: renderTimeline
    });
  }
}

/* ─── SVG generation ────────────────────────────────────────────────────── */

function buildSvg({ windowStart, windowEnd, lanes, canvasLeft, canvasRight, totalHeight, canvasWidth }) {
  const today = new Date();
  const todayX = dateToX(today, windowStart, windowEnd, canvasLeft, canvasRight);
  const showToday = today >= windowStart && today <= windowEnd;

  let s = `<svg viewBox="0 0 ${canvasWidth} ${totalHeight}" width="100%" role="img" class="timeline-svg" preserveAspectRatio="xMinYMin meet">`;
  s += `<title>Data Program Roadmap timeline</title>`;
  s += `<desc>${lanes.length} lanes of Data Program work across the time window from ${formatMonth(windowStart)} to ${formatMonth(windowEnd)}.</desc>`;

  // Lane label gutter background
  s += `<rect x="0" y="0" width="${canvasLeft}" height="${totalHeight}" class="timeline-gutter"/>`;
  s += `<line x1="${canvasLeft}" y1="0" x2="${canvasLeft}" y2="${totalHeight}" class="timeline-gutter-divider"/>`;

  // Axis header background
  s += `<rect x="${canvasLeft}" y="0" width="${canvasWidth - canvasLeft}" height="${AXIS_HEIGHT}" class="timeline-axis-bg"/>`;
  s += `<line x1="0" y1="${AXIS_HEIGHT}" x2="${canvasWidth}" y2="${AXIS_HEIGHT}" class="timeline-axis-divider"/>`;

  // Quarter gridlines and labels
  const quarters = quarterBoundaries(windowStart, windowEnd);
  for (let i = 0; i < quarters.length; i++) {
    const q = quarters[i];
    if (q < windowStart) continue;
    const x = dateToX(q, windowStart, windowEnd, canvasLeft, canvasRight);

    // Gridline (skip if at the very edge to avoid double-line with gutter divider)
    if (x > canvasLeft + 0.5 && x < canvasRight - 0.5) {
      s += `<line x1="${x}" y1="${AXIS_HEIGHT}" x2="${x}" y2="${totalHeight}" class="timeline-gridline"/>`;
    }

    // Label position: center between this quarter and the next (or window end)
    const next = quarters[i + 1] && quarters[i + 1] <= windowEnd ? quarters[i + 1] : windowEnd;
    const nextX = dateToX(next, windowStart, windowEnd, canvasLeft, canvasRight);
    const labelX = (x + nextX) / 2;

    if (labelX < canvasRight - 20 && labelX > canvasLeft + 20) {
      s += `<text x="${labelX}" y="22" text-anchor="middle" class="timeline-quarter-label">${quarterLabel(q)}</text>`;
    }
  }

  // Lanes
  for (const lane of lanes) {
    s += renderLane(lane, windowStart, windowEnd, canvasLeft, canvasRight);
  }

  // Bottom border
  s += `<line x1="0" y1="${totalHeight - 0.5}" x2="${canvasWidth}" y2="${totalHeight - 0.5}" class="timeline-axis-divider"/>`;

  // Today marker (drawn last so it sits on top)
  if (showToday) {
    s += `<line x1="${todayX}" y1="${AXIS_HEIGHT}" x2="${todayX}" y2="${totalHeight}" class="timeline-today"/>`;
    // Triangle pointer at the top of the line
    s += `<polygon points="${todayX},${AXIS_HEIGHT} ${todayX - 5},${AXIS_HEIGHT - 7} ${todayX + 5},${AXIS_HEIGHT - 7}" class="timeline-today-marker"/>`;
    s += `<text x="${todayX}" y="${AXIS_HEIGHT - 11}" text-anchor="middle" class="timeline-today-label">TODAY</text>`;
  }

  s += `</svg>`;
  return s;
}

function renderLane(lane, windowStart, windowEnd, canvasLeft, canvasRight) {
  let s = '';

  // Lane separator (skip for the very first lane to avoid stacking on axis-divider)
  s += `<line x1="0" y1="${lane.yTop}" x2="${canvasRight}" y2="${lane.yTop}" class="timeline-lane-divider"/>`;

  // Lane accent stripe — colored vertical bar at left edge
  s += `<rect x="0" y="${lane.yTop}" width="4" height="${lane.height}" fill="${lane.color}"/>`;

  // Lane label
  const labelMidY = lane.yTop + lane.height / 2;
  const labelY1 = labelMidY - 6;
  const labelY2 = labelMidY + 10;
  s += `<text x="14" y="${labelY1}" class="timeline-lane-label">${escape(lane.label)}</text>`;
  s += `<text x="14" y="${labelY2}" class="timeline-lane-count">${lane.totalCount} project${lane.totalCount === 1 ? '' : 's'}</text>`;

  // Bars
  if (lane.packed.items.length === 0) {
    // Empty-state message in the lane
    const x = canvasLeft + 16;
    s += `<text x="${x}" y="${labelMidY + 4}" class="timeline-lane-empty">No dated work in this window</text>`;
  } else {
    for (const item of lane.packed.items) {
      s += renderBar(item, lane, windowStart, windowEnd, canvasLeft, canvasRight);
    }
  }

  return s;
}

function renderBar(item, lane, windowStart, windowEnd, canvasLeft, canvasRight) {
  const startDate = new Date(item.startMs);
  const endDate = new Date(item.endMs);

  // Clip bar to window
  const x1raw = dateToX(startDate, windowStart, windowEnd, canvasLeft, canvasRight);
  const x2raw = dateToX(endDate,   windowStart, windowEnd, canvasLeft, canvasRight);
  const clippedLeft  = startDate < windowStart;
  const clippedRight = endDate   > windowEnd;
  const x1 = Math.max(x1raw, canvasLeft);
  const x2 = Math.min(x2raw, canvasRight);

  const y = lane.yTop + LANE_PADDING_TOP + item.row * ROW_HEIGHT;
  const color = STATUS_COLORS[item.project.status] || 'var(--text-tertiary)';
  const title = projectDisplayTitle(item.project);
  const status = item.project.status || '';
  const tooltipText = `${title}\n${status} · ${formatRange(startDate, endDate, item.isPoint)}`;

  let s = '';

  if (item.isPoint) {
    // Diamond marker for projects with one date
    const cx = x1;
    const cy = y + ROW_BAR_HEIGHT / 2;
    const r = 7;
    s += `<g class="timeline-bar timeline-bar--point" data-tooltip="${escape(tooltipText)}" data-objectid="${item.project.ObjectId}" tabindex="0" role="button" aria-label="${escape(title)}">`;
    s += `<polygon points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}" fill="${color}"/>`;
    s += `</g>`;
    return s;
  }

  // Full bar
  const width = Math.max(x2 - x1, 4);
  s += `<g class="timeline-bar" data-tooltip="${escape(tooltipText)}" data-objectid="${item.project.ObjectId}" tabindex="0" role="button" aria-label="${escape(title)}">`;
  s += `<rect x="${x1}" y="${y}" width="${width}" height="${ROW_BAR_HEIGHT}" rx="3" fill="${color}"/>`;

  // Edge indicators if bar is clipped
  if (clippedLeft) {
    // Left chevron — small triangle pointing left at the bar's left edge
    s += `<polygon points="${x1 + 2},${y + 4} ${x1 + 2},${y + ROW_BAR_HEIGHT - 4} ${x1 - 4},${y + ROW_BAR_HEIGHT / 2}" fill="${color}"/>`;
  }
  if (clippedRight) {
    s += `<polygon points="${x2 - 2},${y + 4} ${x2 - 2},${y + ROW_BAR_HEIGHT - 4} ${x2 + 4},${y + ROW_BAR_HEIGHT / 2}" fill="${color}"/>`;
  }

  // Title text inside the bar (only if there's room)
  if (width > 60) {
    // Approximate character budget — about 6-7px per character in our font
    const charBudget = Math.floor((width - 14) / 6.5);
    let displayed = title;
    if (displayed.length > charBudget) {
      displayed = displayed.slice(0, Math.max(0, charBudget - 1)) + '…';
    }
    s += `<text x="${x1 + 7}" y="${y + ROW_BAR_HEIGHT / 2 + 4}" class="timeline-bar-label">${escape(displayed)}</text>`;
  }

  s += `</g>`;
  return s;
}

/* ─── Tooltip behavior ──────────────────────────────────────────────────── */

function attachTooltipBehavior(container) {
  // Create or reuse a single tooltip element
  let tooltip = container.querySelector('.timeline-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.className = 'timeline-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    container.appendChild(tooltip);
  }

  const bars = container.querySelectorAll('.timeline-bar');
  bars.forEach(bar => {
    bar.addEventListener('mouseenter', e => showTooltip(e, bar, tooltip, container));
    bar.addEventListener('mousemove',  e => showTooltip(e, bar, tooltip, container));
    bar.addEventListener('mouseleave', () => hideTooltip(tooltip));
    bar.addEventListener('focus',      () => showTooltipForFocus(bar, tooltip, container));
    bar.addEventListener('blur',       () => hideTooltip(tooltip));
    // Click: deep link to the tracker (item-detail modal arrives in chunk 1.5)
    bar.addEventListener('click', () => onBarClick(bar));
    bar.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onBarClick(bar);
      }
    });
  });
}

function showTooltip(e, bar, tooltip, container) {
  const text = bar.getAttribute('data-tooltip');
  if (!text) return;
  // Linebreaks in data-attribute → <br>
  tooltip.innerHTML = escape(text).replace(/\n/g, '<br>');
  tooltip.classList.add('visible');
  tooltip.setAttribute('aria-hidden', 'false');

  const containerRect = container.getBoundingClientRect();
  const x = e.clientX - containerRect.left;
  const y = e.clientY - containerRect.top;
  // Position the tooltip just above-right of the cursor
  tooltip.style.left = (x + 12) + 'px';
  tooltip.style.top  = (y - 8 - tooltip.offsetHeight) + 'px';
}

function showTooltipForFocus(bar, tooltip, container) {
  const text = bar.getAttribute('data-tooltip');
  if (!text) return;
  tooltip.innerHTML = escape(text).replace(/\n/g, '<br>');
  tooltip.classList.add('visible');
  tooltip.setAttribute('aria-hidden', 'false');
  const barRect = bar.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();
  tooltip.style.left = (barRect.left - containerRect.left) + 'px';
  tooltip.style.top  = (barRect.top  - containerRect.top - tooltip.offsetHeight - 8) + 'px';
}

function hideTooltip(tooltip) {
  tooltip.classList.remove('visible');
  tooltip.setAttribute('aria-hidden', 'true');
}

function onBarClick(bar) {
  const id = bar.getAttribute('data-objectid');
  if (!id) return;
  openProjectModal(id);
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatMonth(date) {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRange(start, end, isPoint) {
  if (isPoint) return formatShortDate(start);
  return `${formatShortDate(start)} → ${formatShortDate(end)}`;
}

renderTimeline();
