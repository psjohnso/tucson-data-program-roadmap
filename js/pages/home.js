/* ─────────────────────────────────────────────────────────────────────────
   home.js — workspace home page logic
   Wires status strip, recent activity feed, and roadmap views grid.
   ───────────────────────────────────────────────────────────────────────── */

import {
  getStatusCounts,
  getShippedCount,
  getRecentlyEdited,
  getProjectsByGoal,
  projectDisplayTitle,
  projectEditDate
} from '../data.js?v=4';
import { DATA_PROGRAM_GOALS, GOAL_BY_VALUE } from '../config.js?v=4';

/* ─── Status strip ──────────────────────────────────────────────────────── */

async function renderStatusStrip() {
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
    showError('status-strip-error', err);
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

  try {
    const groups = await getProjectsByGoal();

    const cards = DATA_PROGRAM_GOALS.map(goal => {
      const projects = groups[goal.value] || [];
      const counts = projects.reduce((acc, p) => {
        const s = p.status || 'Unknown';
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      }, {});

      return `
        <a class="goal-card" href="roadmap.html?goal=${encodeURIComponent(goal.slug)}" style="--goal-accent: ${goal.color};">
          <div class="goal-card__title">${escape(goal.short)}</div>
          <div class="goal-card__desc">${escape(goal.description)}</div>
          <div class="goal-card__counts">
            ${counts['Active']    ? `<span class="goal-card__count" style="color: var(--status-active);">${counts['Active']} active</span>` : ''}
            ${counts['Scheduled'] ? `<span class="goal-card__count" style="color: var(--status-scheduled);">${counts['Scheduled']} scheduled</span>` : ''}
            ${counts['Future']    ? `<span class="goal-card__count" style="color: var(--status-future);">${counts['Future']} future</span>` : ''}
            ${counts['Idea']      ? `<span class="goal-card__count muted">${counts['Idea']} under review</span>` : ''}
            ${counts['Complete']  ? `<span class="goal-card__count muted">${counts['Complete']} shipped</span>` : ''}
            ${projects.length === 0 ? `<span class="goal-card__count faint">No projects yet</span>` : ''}
          </div>
        </a>`;
    }).join('');

    target.innerHTML = cards;
  } catch (err) {
    console.error('Failed to render roadmap views grid:', err);
    target.innerHTML = `<p class="muted">Couldn't load goal data. ${escape(err.message)}</p>`;
  }
}

/* ─── Recent activity feed ──────────────────────────────────────────────── */

async function renderRecentActivity() {
  const target = document.getElementById('recent-activity');
  if (!target) return;

  try {
    const recent = await getRecentlyEdited({ limit: 6 });
    if (!recent.length) {
      target.innerHTML = `<p class="muted">No recent activity.</p>`;
      return;
    }

    target.innerHTML = recent.map(p => {
      const editDate = projectEditDate(p);
      const dateStr = editDate ? formatRelativeDate(editDate) : '';
      const statusColor = STATUS_COLOR_VAR[p.status] || 'var(--status-idea)';

      return `
        <div class="activity-row">
          <span class="activity-row__date">${escape(dateStr)}</span>
          <span class="activity-row__title">${escape(projectDisplayTitle(p))}</span>
          <span class="activity-row__status" style="color: ${statusColor};">${escape(p.status || '')}</span>
        </div>`;
    }).join('');
  } catch (err) {
    console.error('Failed to render recent activity:', err);
    target.innerHTML = `<p class="muted">Couldn't load recent activity.</p>`;
  }
}

const STATUS_COLOR_VAR = {
  'Active':    'var(--status-active)',
  'Scheduled': 'var(--status-scheduled)',
  'Future':    'var(--status-future)',
  'Idea':      'var(--status-idea)',
  'On Hold':   'var(--status-onhold)',
  'Waiting':   'var(--status-waiting)',
  'Complete':  'var(--status-complete)'
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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

function showError(slotId, err) {
  const slot = document.getElementById(slotId);
  if (slot) slot.textContent = `Couldn't load: ${err.message || err}`;
}

/* ─── Boot ──────────────────────────────────────────────────────────────── */

renderStatusStrip();
renderRoadmapViewsGrid();
renderRecentActivity();
