/* ─────────────────────────────────────────────────────────────────────────
   home.js — workspace home page logic
   Wires status strip, recent activity feed, and roadmap views grid.
   ───────────────────────────────────────────────────────────────────────── */

import {
  getStatusCounts,
  getShippedCount,
  getRecentlyShipped,
  getComingUp,
  getProjectsByGoal,
  projectDisplayTitle,
  projectActualEndDate,
  projectEndDate
} from '../data.js?v=26';
import { DATA_PROGRAM_GOALS, GOAL_BY_VALUE } from '../config.js?v=26';
import { openProjectModal } from '../modal.js?v=26';
import { startLoading, showError } from '../ui-state.js?v=26';
import { getActiveFilters, subscribe } from '../filters.js?v=26';

/* ─── Status strip ──────────────────────────────────────────────────────── */

async function renderStatusStrip() {
  try {
    const filters = getActiveFilters();
    const [counts, shipped] = await Promise.all([
      getStatusCounts({ filters }),
      getShippedCount({ filters })
    ]);

    setStat('active',    counts['Active']    || 0);
    setStat('scheduled', counts['Scheduled'] || 0);
    setStat('future',    counts['Future']    || 0);
    setStat('idea',      counts['Idea']      || 0);
    setStat('complete',  shipped);
  } catch (err) {
    console.error('Failed to render status strip:', err);
    document.querySelectorAll('[data-stat]').forEach(el => { el.textContent = '—'; });
    const slot = document.getElementById('status-strip-error');
    if (slot) {
      slot.textContent = "Couldn't load counts. The page sections below will retry independently.";
    }
  }
}

function setStat(key, value) {
  const el = document.querySelector(`[data-stat="${key}"]`);
  if (el) el.textContent = String(value);
}

/* ─── Roadmap views grid ────────────────────────────────────────────────── */

async function renderRoadmapViewsGrid() {
  const target = document.getElementById('roadmap-views');
  if (!target) return;

  const loading = startLoading(target, 'goal-grid');

  try {
    const filters = getActiveFilters();
    const groups = await getProjectsByGoal({ filters });
    loading.cancel();

    // When goal filter is active, hide cards for goals not in the filter
    const visibleGoals = filters.goal?.length
      ? DATA_PROGRAM_GOALS.filter(g => filters.goal.includes(g.slug))
      : DATA_PROGRAM_GOALS;

    if (visibleGoals.length === 0) {
      target.innerHTML = `<p class="muted">No goals match the current filter.</p>`;
      return;
    }

    const cards = visibleGoals.map(goal => {
      const projects = groups[goal.value] || [];
      const counts = projects.reduce((acc, p) => {
        const s = p.status || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      return `
        <a class="goal-card" href="goal.html?goal=${encodeURIComponent(goal.slug)}" style="--goal-accent: ${goal.color};">
          <div class="goal-card__title">${escape(goal.short)}</div>
          <div class="goal-card__desc">${escape(goal.description)}</div>
          <div class="goal-card__counts">
            ${counts['Active']    ? `<span class="goal-card__count" style="color: var(--status-active);">${counts['Active']} active</span>` : ''}
            ${counts['Scheduled'] ? `<span class="goal-card__count" style="color: var(--status-scheduled);">${counts['Scheduled']} scheduled</span>` : ''}
            ${counts['Future']    ? `<span class="goal-card__count" style="color: var(--status-future);">${counts['Future']} future</span>` : ''}
            ${counts['Idea']      ? `<span class="goal-card__count muted">${counts['Idea']} under review</span>` : ''}
            ${counts['Complete']  ? `<span class="goal-card__count muted">${counts['Complete']} shipped</span>` : ''}
            ${counts['Canceled']  ? `<span class="goal-card__count" style="color: var(--status-canceled);">${counts['Canceled']} cancelled</span>` : ''}
            ${projects.length === 0 ? `<span class="goal-card__count faint">No projects yet</span>` : ''}
          </div>
        </a>`;
    }).join('');

    target.innerHTML = cards;
  } catch (err) {
    loading.cancel();
    console.error('Failed to render roadmap views grid:', err);
    showError(target, {
      title: "Couldn't load goal data",
      message: 'There was a problem reaching the data service. This is usually temporary.',
      error: err,
      onRetry: renderRoadmapViewsGrid
    });
  }
}

/* ─── Recently shipped ──────────────────────────────────────────────────── */

async function renderRecentlyShipped() {
  const target = document.getElementById('recently-shipped');
  if (!target) return;

  const loading = startLoading(target, 'feed', { rows: 6 });

  try {
    const shipped = await getRecentlyShipped({ limit: 6, filters: getActiveFilters() });
    loading.cancel();
    if (!shipped.length) {
      target.innerHTML = `<p class="muted" style="padding: var(--space-4);">Nothing shipped yet.</p>`;
      return;
    }

    target.innerHTML = shipped.map(p => {
      const date = projectActualEndDate(p);
      const dateStr = date ? formatShortDate(date) : '';
      const ago = date ? formatRelativeDate(date) : '';

      return `
        <div class="activity-row activity-row--clickable" data-objectid="${p.ObjectId}" tabindex="0" role="button" aria-label="View details for ${escape(projectDisplayTitle(p))}">
          <span class="activity-row__date" title="${escape(ago)}">${escape(dateStr)}</span>
          <span class="activity-row__title">${escape(projectDisplayTitle(p))}</span>
          <span class="activity-row__status" style="color: var(--status-complete);">Shipped</span>
        </div>`;
    }).join('');
  } catch (err) {
    loading.cancel();
    console.error('Failed to render recently shipped:', err);
    showError(target, {
      title: "Couldn't load shipped projects",
      error: err,
      onRetry: renderRecentlyShipped
    });
  }
}

/* ─── Coming up ─────────────────────────────────────────────────────────── */

async function renderComingUp() {
  const target = document.getElementById('coming-up');
  if (!target) return;

  const loading = startLoading(target, 'feed', { rows: 6 });

  try {
    const coming = await getComingUp({ limit: 6, filters: getActiveFilters() });
    loading.cancel();
    if (!coming.length) {
      target.innerHTML = `<p class="muted" style="padding: var(--space-4);">Nothing scheduled in the near term.</p>`;
      return;
    }

    target.innerHTML = coming.map(p => {
      const date = projectEndDate(p);
      const dateStr = date ? formatShortDate(date) : '';
      const statusColor = STATUS_COLOR_VAR[p.status] || 'var(--status-idea)';

      return `
        <div class="activity-row activity-row--clickable" data-objectid="${p.ObjectId}" tabindex="0" role="button" aria-label="View details for ${escape(projectDisplayTitle(p))}">
          <span class="activity-row__date">${escape(dateStr)}</span>
          <span class="activity-row__title">${escape(projectDisplayTitle(p))}</span>
          <span class="activity-row__status" style="color: ${statusColor};">${escape(p.status || '')}</span>
        </div>`;
    }).join('');
  } catch (err) {
    loading.cancel();
    console.error('Failed to render coming up:', err);
    showError(target, {
      title: "Couldn't load upcoming projects",
      error: err,
      onRetry: renderComingUp
    });
  }
}

const STATUS_COLOR_VAR = {
  'Active':    'var(--status-active)',
  'Scheduled': 'var(--status-scheduled)',
  'Future':    'var(--status-future)',
  'Idea':      'var(--status-idea)',
  'On Hold':   'var(--status-onhold)',
  'Waiting':   'var(--status-waiting)',
  'Complete':  'var(--status-complete)',
  'Canceled':  'var(--status-canceled)'
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatShortDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatRelativeDate(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/* ─── Boot ──────────────────────────────────────────────────────────────── */

function renderAll() {
  renderStatusStrip();
  renderRoadmapViewsGrid();
  renderRecentlyShipped();
  renderComingUp();
}

renderAll();
subscribe(renderAll);

// Event delegation: clickable rows open the modal
document.addEventListener('click', e => {
  const row = e.target.closest('.activity-row--clickable[data-objectid]');
  if (row) openProjectModal(row.getAttribute('data-objectid'));
});

document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest && e.target.closest('.activity-row--clickable[data-objectid]');
  if (row) {
    e.preventDefault();
    openProjectModal(row.getAttribute('data-objectid'));
  }
});
