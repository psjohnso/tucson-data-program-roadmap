/* ─────────────────────────────────────────────────────────────────────────
   goal.js — Goal Detail page

   Reads `?goal=<slug>` from the URL, finds the matching goal in config,
   and renders:
     - Goal header with brand color, full name, narrative paragraphs
     - Status counts strip filtered to this goal
     - Project list grouped by status, every project clickable to open modal

   Falls back to a 404-style message if the slug doesn't match a known goal.
   ───────────────────────────────────────────────────────────────────────── */

import { getProjectsByGoal, projectDisplayTitle, projectEndDate, projectActualEndDate } from '../data.js?v=28';
import { DATA_PROGRAM_GOALS, GOAL_BY_SLUG, STATUS_ORDER } from '../config.js?v=28';
import { openProjectModal } from '../modal.js?v=28';
import { startLoading, showError } from '../ui-state.js?v=28';
import { getActiveFilters, subscribe } from '../filters.js?v=28';

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

const STATUS_LABEL = {
  'Idea':      'Under review',
  'Canceled':  'Cancelled'
};

function getGoalSlug() {
  const params = new URLSearchParams(window.location.search);
  return params.get('goal');
}

async function renderGoal() {
  const slug = getGoalSlug();
  const goal = slug ? GOAL_BY_SLUG[slug] : null;

  if (!goal) {
    renderNotFound(slug);
    return;
  }

  // Set the page title and tab title
  document.title = `${goal.short} · Tucson DATA`;

  // Populate the context band that sits below the topnav. This communicates
  // "you are inside the portfolio, on this goal" without changing the height
  // of the main nav strip across pages.
  const contextBand = document.getElementById('goal-context-band');
  const contextName = document.getElementById('goal-context-name');
  const contextAccent = document.getElementById('goal-context-accent');
  if (contextBand && contextName) {
    contextName.textContent = goal.short;
    if (contextAccent) contextAccent.style.setProperty('--goal-accent', goal.color);
    contextBand.removeAttribute('hidden');
  }

  // Header
  const headerEl = document.getElementById('goal-header');
  if (headerEl) {
    headerEl.innerHTML = renderHeader(goal);
  }

  // Body content (counts + project list)
  const listEl = document.getElementById('goal-projects');
  const loading = startLoading(listEl, 'project-list', { rows: 8 });

  try {
    // Page-wins on goal: read filters but null out the goal filter so this
    // page always renders its identified goal regardless of global filter.
    // Status and dept filters still apply.
    const filters = getActiveFilters();
    delete filters.goal;
    const groups = await getProjectsByGoal({ filters });
    loading.cancel();
    const projects = groups[goal.value] || [];

    const counts = projects.reduce((acc, p) => {
      acc[p.status || 'Unknown'] = (acc[p.status || 'Unknown'] || 0) + 1;
      return acc;
    }, {});

    const countsEl = document.getElementById('goal-counts');
    if (countsEl) {
      countsEl.innerHTML = renderCountsStrip(counts);
    }

    if (listEl) {
      if (projects.length === 0) {
        listEl.innerHTML = `<p class="muted prose">No projects are currently tagged to this goal.</p>`;
      } else {
        listEl.innerHTML = renderProjectList(projects);
      }
    }
  } catch (err) {
    loading.cancel();
    console.error('Failed to render goal detail:', err);
    if (listEl) {
      showError(listEl, {
        title: "Couldn't load project list",
        error: err,
        onRetry: renderGoal
      });
    }
  }
}

/* ─── Render fragments ──────────────────────────────────────────────────── */

function renderHeader(goal) {
  const narrativeHtml = (goal.narrative || []).map(p => `<p>${escape(p)}</p>`).join('');
  const question = goal.leadership_question || '';

  return `
    <div class="goal-header" style="--goal-accent: ${goal.color};">
      <div class="goal-header__eyebrow">Data Program Goal</div>
      <h1 class="goal-header__title">${escape(goal.short)}</h1>
      ${question ? `<p class="goal-header__question">${escape(question)}</p>` : ''}
      <div class="goal-header__narrative prose">
        ${narrativeHtml}
      </div>
    </div>
  `;
}

function renderCountsStrip(counts) {
  // Same shape as the home page status strip, filtered to the goal
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return `
    <div class="status-strip">
      <div class="metric-card">
        <div class="metric-card__label">Total</div>
        <div class="metric-card__value" style="color: var(--cot-innovation-blue);">${total}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__label">Active</div>
        <div class="metric-card__value metric-card__value--active">${counts['Active'] || 0}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__label">Scheduled</div>
        <div class="metric-card__value metric-card__value--scheduled">${counts['Scheduled'] || 0}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__label">Future</div>
        <div class="metric-card__value metric-card__value--future">${counts['Future'] || 0}</div>
      </div>
      <div class="metric-card">
        <div class="metric-card__label">Shipped</div>
        <div class="metric-card__value metric-card__value--complete">${counts['Complete'] || 0}</div>
      </div>
    </div>
  `;
}

function renderProjectList(projects) {
  // Group by status, in priority order
  const byStatus = {};
  for (const p of projects) {
    const s = p.status || 'Unknown';
    if (!byStatus[s]) byStatus[s] = [];
    byStatus[s].push(p);
  }

  // Sort projects within each status — by working_due ascending for active/scheduled,
  // by actual_end descending for complete, alpha otherwise
  Object.keys(byStatus).forEach(status => {
    if (status === 'Active' || status === 'Scheduled') {
      byStatus[status].sort((a, b) => {
        const ad = projectEndDate(a)?.getTime() ?? Infinity;
        const bd = projectEndDate(b)?.getTime() ?? Infinity;
        return ad - bd;
      });
    } else if (status === 'Complete') {
      byStatus[status].sort((a, b) => {
        const ad = projectActualEndDate(a)?.getTime() ?? 0;
        const bd = projectActualEndDate(b)?.getTime() ?? 0;
        return bd - ad;
      });
    } else {
      byStatus[status].sort((a, b) =>
        projectDisplayTitle(a).localeCompare(projectDisplayTitle(b))
      );
    }
  });

  // Render each status block in priority order
  return STATUS_ORDER
    .filter(status => byStatus[status]?.length)
    .map(status => {
      const items = byStatus[status];
      const label = STATUS_LABEL[status] || status;
      const color = STATUS_COLOR_VAR[status] || 'var(--text-tertiary)';

      return `
        <section class="goal-status-block">
          <div class="goal-status-block__header">
            <span class="status-dot" style="background: ${color};" aria-hidden="true"></span>
            <h2 class="goal-status-block__label">${escape(label)}</h2>
            <span class="goal-status-block__count">${items.length}</span>
          </div>
          <ul class="goal-status-block__list">
            ${items.map(p => `
              <li class="project-item" data-objectid="${p.ObjectId}" tabindex="0" role="button" aria-label="View details for ${escape(projectDisplayTitle(p))}">
                <span class="status-dot" style="background: ${color};" aria-hidden="true"></span>
                ${escape(projectDisplayTitle(p))}
                ${p.partner_dept ? `<span class="faint" style="margin-left: var(--space-2);">${escape(p.partner_dept)}</span>` : ''}
              </li>`).join('')}
          </ul>
        </section>
      `;
    }).join('');
}

function renderNotFound(slug) {
  document.title = 'Goal not found · Tucson DATA';
  const headerEl = document.getElementById('goal-header');
  if (headerEl) {
    headerEl.innerHTML = `
      <div class="goal-header" style="--goal-accent: var(--text-tertiary);">
        <div class="goal-header__eyebrow">Goal not found</div>
        <h1 class="goal-header__title">${slug ? `Unknown goal: ${escape(slug)}` : 'No goal specified'}</h1>
        <p class="goal-header__narrative prose">
          <a href="portfolio.html">Browse all six goals on the portfolio page →</a>
        </p>
      </div>
    `;
  }
  // Hide counts and list sections when not found — including their section
  // heading divs which are part of the parent <section>
  const countsSection = document.getElementById('goal-counts')?.parentElement;
  const listSection = document.getElementById('goal-projects')?.parentElement;
  if (countsSection) countsSection.style.display = 'none';
  if (listSection) listSection.style.display = 'none';
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

renderGoal();
subscribe(renderGoal);

// Project items open the modal on click or Enter/Space
document.addEventListener('click', e => {
  const item = e.target.closest('.project-item[data-objectid]');
  if (item) openProjectModal(item.getAttribute('data-objectid'));
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const item = e.target.closest && e.target.closest('.project-item[data-objectid]');
  if (item) {
    e.preventDefault();
    openProjectModal(item.getAttribute('data-objectid'));
  }
});
