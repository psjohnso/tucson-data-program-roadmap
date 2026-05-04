/* ─────────────────────────────────────────────────────────────────────────
   portfolio.js — strategic portfolio view

   Two render modes, selected by the ?view= URL param:
     ?view=goal (default)  → six Data Program Goal cards (the original view)
     ?view=dept            → one card per partner_dept, dynamically derived

   Both views share the same .portfolio-card markup and read filters via
   filters.js. Dept-card click → applies dept filter, switches to goal view,
   so leadership can drill from a department overview into how that dept's
   work distributes across the six goals.
   ───────────────────────────────────────────────────────────────────────── */

import { getProjectsByGoal, getProjectsByDepartment, projectDisplayTitle } from '../data.js?v=36';
import { DATA_PROGRAM_GOALS } from '../config.js?v=36';
import { openProjectModal } from '../modal.js?v=36';
import { startLoading, showError } from '../ui-state.js?v=36';
import { getActiveFilters, subscribe, appendFiltersToHref } from '../filters.js?v=36';

const SAMPLE_LIMIT = 4;
const STATUS_PRIORITY = ['Active', 'Scheduled', 'Future', 'Idea', 'Waiting', 'On Hold', 'Complete', 'Canceled'];

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

/* ─── View routing ───────────────────────────────────────────────────────── */

function getCurrentView() {
  const v = new URLSearchParams(window.location.search).get('view');
  return v === 'dept' ? 'dept' : 'goal';
}

/** Build a portfolio.html href that switches view AND applies a dept filter,
 *  while preserving any other filters already on the URL (status, goal). */
function deptCardHref(deptName) {
  const params = new URLSearchParams(window.location.search);
  params.delete('view');                 // back to default goal view
  params.set('dept', deptName);          // apply dept filter
  const qs = params.toString();
  return `portfolio.html${qs ? '?' + qs : ''}`;
}

async function renderPortfolio() {
  const view = getCurrentView();
  syncToggleControl(view);
  if (view === 'dept') return renderByDepartment();
  return renderByGoal();
}

function syncToggleControl(view) {
  const select = document.getElementById('portfolio-view');
  if (select && select.value !== view) select.value = view;
}

/* ─── By-goal render (original) ──────────────────────────────────────────── */

async function renderByGoal() {
  const target = document.getElementById('portfolio-grid');
  if (!target) return;

  const loading = startLoading(target, 'goal-grid');

  try {
    const filters = getActiveFilters();
    const groups = await getProjectsByGoal({ filters });
    loading.cancel();

    // When goal filter is active, only show those goals' cards.
    const visibleGoals = filters.goal?.length
      ? DATA_PROGRAM_GOALS.filter(g => filters.goal.includes(g.slug))
      : DATA_PROGRAM_GOALS;

    if (visibleGoals.length === 0) {
      target.innerHTML = `<p class="muted">No goals match the current filter.</p>`;
      return;
    }

    target.innerHTML = visibleGoals.map(goal => {
      const projects = groups[goal.value] || [];
      return renderCard({
        title: goal.short,
        href: appendFiltersToHref(`goal.html?goal=${encodeURIComponent(goal.slug)}`),
        accent: goal.color,
        description: goal.description,
        projects,
        emptyText: 'No projects tagged to this goal yet.'
      });
    }).join('');

    renderUnclassified(groups['Unclassified'] || []);
  } catch (err) {
    loading.cancel();
    console.error('Failed to render portfolio (by goal):', err);
    showError(target, {
      title: "Couldn't load portfolio data",
      error: err,
      onRetry: renderPortfolio
    });
  }
}

function renderUnclassified(unclassified) {
  const orphans = document.getElementById('orphans');
  if (!orphans) return;
  if (!unclassified.length) { orphans.innerHTML = ''; return; }
  orphans.innerHTML = `
    <div class="section-heading">Unclassified Data Program work</div>
    <p class="muted" style="margin-bottom: var(--space-3);">
      These projects are flagged as Data Program but don't have a Data Program Goal set yet.
    </p>
    <ul class="orphan-list">
      ${unclassified.slice(0, 10).map(p => `
        <li class="project-item" data-objectid="${p.ObjectId}" tabindex="0" role="button" aria-label="View details for ${escape(projectDisplayTitle(p))}">
          <span class="status-dot" style="background: ${STATUS_COLOR_VAR[p.status] || 'var(--text-tertiary)'};" aria-hidden="true"></span>
          ${escape(projectDisplayTitle(p))}
          <span class="faint" style="margin-left: var(--space-2);">${escape(p.status || '')}</span>
        </li>`).join('')}
    </ul>
    ${unclassified.length > 10 ? `<div class="muted" style="margin-top: var(--space-2);">+ ${unclassified.length - 10} more</div>` : ''}
  `;
}

/* ─── By-department render ───────────────────────────────────────────────── */

async function renderByDepartment() {
  const target = document.getElementById('portfolio-grid');
  if (!target) return;

  const loading = startLoading(target, 'goal-grid');

  try {
    const filters = getActiveFilters();
    const groups = await getProjectsByDepartment({ filters });
    loading.cancel();

    // Sort departments by total project count, descending — heaviest contributors first.
    const depts = Object.keys(groups).sort((a, b) => groups[b].length - groups[a].length);

    if (depts.length === 0) {
      target.innerHTML = `<p class="muted">No departments match the current filter.</p>`;
      return;
    }

    target.innerHTML = depts.map(dept => {
      const projects = groups[dept];
      return renderCard({
        title: dept,
        href: deptCardHref(dept),
        accent: 'var(--cot-innovation-blue)',
        description: null,                        // no per-dept descriptions in the data
        projects,
        emptyText: null,                          // groups have at least 1 project by construction
        showDeptOnRow: false                      // hide dept on rows since the card IS the dept
      });
    }).join('');

    // Hide orphan section in dept view (it's a goal-specific concept)
    const orphans = document.getElementById('orphans');
    if (orphans) orphans.innerHTML = '';
  } catch (err) {
    loading.cancel();
    console.error('Failed to render portfolio (by department):', err);
    showError(target, {
      title: "Couldn't load portfolio data",
      error: err,
      onRetry: renderPortfolio
    });
  }
}

/* ─── Shared card renderer ───────────────────────────────────────────────── */

function renderCard({ title, href, accent, description, projects, emptyText }) {
  const counts = projects.reduce((acc, p) => {
    acc[p.status || 'Unknown'] = (acc[p.status || 'Unknown'] || 0) + 1;
    return acc;
  }, {});
  const sortedProjects = [...projects].sort((a, b) => {
    const ai = STATUS_PRIORITY.indexOf(a.status); const bi = STATUS_PRIORITY.indexOf(b.status);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const sampleProjects = sortedProjects.slice(0, SAMPLE_LIMIT);
  const remaining = Math.max(0, projects.length - SAMPLE_LIMIT);

  return `
    <article class="portfolio-card" style="--goal-accent: ${accent};">
      <header class="portfolio-card__header">
        <h2 class="portfolio-card__title"><a href="${escape(href)}">${escape(title)} →</a></h2>
        <div class="portfolio-card__count-total">${projects.length}</div>
      </header>
      ${description ? `<p class="portfolio-card__desc">${escape(description)}</p>` : ''}
      <div class="portfolio-card__counts">
        ${renderCount(counts['Active'],    'Active',    'var(--status-active)')}
        ${renderCount(counts['Scheduled'], 'Scheduled', 'var(--status-scheduled)')}
        ${renderCount(counts['Future'],    'Future',    'var(--status-future)')}
        ${renderCount(counts['Idea'],      'Under review', 'var(--status-idea)')}
        ${renderCount(counts['Complete'],  'Shipped',   'var(--status-complete)')}
        ${renderCount(counts['Canceled'],  'Cancelled', 'var(--status-canceled)')}
      </div>
      ${sampleProjects.length ? `
        <ul class="portfolio-card__projects">
          ${sampleProjects.map(p => `
            <li class="project-item" data-objectid="${p.ObjectId}" tabindex="0" role="button" aria-label="View details for ${escape(projectDisplayTitle(p))}">
              <span class="status-dot" style="background: ${STATUS_COLOR_VAR[p.status] || 'var(--text-tertiary)'};" aria-hidden="true"></span>
              ${escape(projectDisplayTitle(p))}
            </li>`).join('')}
        </ul>
        ${remaining > 0 ? `<div class="portfolio-card__more muted">+ ${remaining} more</div>` : ''}
      ` : (emptyText
        ? `<p class="portfolio-card__empty muted">${escape(emptyText)}</p>`
        : '')}
    </article>`;
}

function renderCount(n, label, color) {
  if (!n) return '';
  return `<span class="portfolio-card__count" style="color: ${color};"><strong>${n}</strong> ${escape(label.toLowerCase())}</span>`;
}

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/* ─── Toggle dropdown wiring ─────────────────────────────────────────────── */

function setView(view) {
  const params = new URLSearchParams(window.location.search);
  if (view === 'goal') params.delete('view'); else params.set('view', view);
  const qs = params.toString();
  const url = window.location.pathname + (qs ? '?' + qs : '') + window.location.hash;
  window.history.replaceState(null, '', url);
}

const select = document.getElementById('portfolio-view');
if (select) {
  select.value = getCurrentView();
  select.addEventListener('change', () => {
    setView(select.value);
    renderPortfolio();
  });
}

/* ─── Boot ───────────────────────────────────────────────────────────────── */

renderPortfolio();
subscribe(renderPortfolio);
window.addEventListener('tucson-data:refresh', renderPortfolio);

// Event delegation: any click on a .project-item element opens the modal
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
