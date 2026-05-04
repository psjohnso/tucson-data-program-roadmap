/* ─────────────────────────────────────────────────────────────────────────
   wwc.js — What Works Cities certification view

   Maps Tucson's data program portfolio onto the WWC certification framework
   (8 practice areas, 43 criteria). Driven by the wwc_criteria field on each
   project — wwc_practice is informational metadata that the team applies
   loosely; criteria codes are the granular, reliable mapping.

   Rendering:
     - Summary line at the top (X of 43 criteria addressed across N projects)
     - For each of the 8 practice areas, a section with its tagged criteria
     - Criteria with zero tagged projects are hidden (Q1=b in design)
     - Practice areas with all-empty criteria are hidden
     - Each criterion shows its code, name, description, and the projects
       tagged to it (clickable to open the modal)

   Filter state is respected: status/dept/goal filters apply to the project
   set before grouping. So filtering to "Active + IT" shows only the WWC
   coverage represented by Active IT projects.
   ───────────────────────────────────────────────────────────────────────── */

import {
  getProjects,
  projectDisplayTitle,
  projectWwcCriterionCodes
} from '../data.js?v=33';
import { WWC_PRACTICE_AREAS } from '../config.js?v=33';
import { openProjectModal } from '../modal.js?v=33';
import { startLoading, showError } from '../ui-state.js?v=33';
import { getActiveFilters, subscribe } from '../filters.js?v=33';

const TOTAL_CRITERIA_COUNT = WWC_PRACTICE_AREAS.reduce((acc, a) => acc + a.criteria.length, 0);

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

async function renderWwc() {
  const target = document.getElementById('wwc-content');
  if (!target) return;

  const loading = startLoading(target, 'goal-grid');

  try {
    const filters = getActiveFilters();
    const projects = await getProjects({ filters });
    loading.cancel();

    // Build code -> [projects] map
    const projectsByCode = {};
    const taggedProjects = new Set();
    for (const p of projects) {
      const codes = projectWwcCriterionCodes(p);
      if (codes.length === 0) continue;
      taggedProjects.add(p.ObjectId);
      for (const code of codes) {
        (projectsByCode[code] = projectsByCode[code] || []).push(p);
      }
    }

    // Tally addressed criteria
    const addressedCount = Object.keys(projectsByCode).length;

    // Render summary + sections
    target.innerHTML = `
      ${renderSummary(addressedCount, taggedProjects.size, projects.length)}
      ${renderPracticeAreas(projectsByCode)}
    `;
  } catch (err) {
    loading.cancel();
    console.error('Failed to render WWC view:', err);
    showError(target, {
      title: "Couldn't load WWC certification view",
      error: err,
      onRetry: renderWwc
    });
  }
}

function renderSummary(addressedCount, taggedProjectCount, totalProjectCount) {
  const filterNote = (taggedProjectCount === totalProjectCount)
    ? ''
    : ` <span class="muted">(of ${totalProjectCount} matching the current filter)</span>`;
  return `
    <section class="wwc-summary">
      <div class="wwc-summary__metric">
        <div class="wwc-summary__value">${addressedCount}<span class="wwc-summary__total"> / ${TOTAL_CRITERIA_COUNT}</span></div>
        <div class="wwc-summary__label">criteria addressed</div>
      </div>
      <div class="wwc-summary__metric">
        <div class="wwc-summary__value">${taggedProjectCount}</div>
        <div class="wwc-summary__label">projects tagged${filterNote}</div>
      </div>
      <div class="wwc-summary__metric">
        <div class="wwc-summary__value">${WWC_PRACTICE_AREAS.length}</div>
        <div class="wwc-summary__label">practice areas</div>
      </div>
    </section>`;
}

function renderPracticeAreas(projectsByCode) {
  const areas = WWC_PRACTICE_AREAS.map(area => {
    // Filter to criteria that have at least one tagged project
    const populated = area.criteria.filter(c => (projectsByCode[c.code] || []).length > 0);
    if (populated.length === 0) return '';
    return renderPracticeArea(area, populated, projectsByCode);
  }).filter(Boolean);

  if (areas.length === 0) {
    return `
      <p class="muted prose" style="padding: var(--space-6) 0;">
        No projects in the current view are tagged with WWC criteria yet. Try clearing filters,
        or visit the Portfolio to see all Data Program work.
      </p>`;
  }
  return `<div class="wwc-areas">${areas.join('')}</div>`;
}

function renderPracticeArea(area, populatedCriteria, projectsByCode) {
  return `
    <section class="wwc-area">
      <header class="wwc-area__header">
        <h2 class="wwc-area__title">${escape(area.short)}</h2>
        <p class="wwc-area__desc prose">${escape(area.description)}</p>
      </header>
      <div class="wwc-area__criteria">
        ${populatedCriteria.map(c => renderCriterion(c, projectsByCode[c.code] || [])).join('')}
      </div>
    </section>`;
}

function renderCriterion(criterion, projects) {
  return `
    <article class="wwc-criterion">
      <header class="wwc-criterion__header">
        <span class="wwc-criterion__code">${escape(criterion.code)}</span>
        <h3 class="wwc-criterion__name">${escape(criterion.name)}</h3>
        <span class="wwc-criterion__count">${projects.length} ${projects.length === 1 ? 'project' : 'projects'}</span>
      </header>
      <p class="wwc-criterion__desc prose">${escape(criterion.description)}</p>
      <ul class="wwc-criterion__projects">
        ${projects.map(p => `
          <li class="project-item" data-objectid="${p.ObjectId}" tabindex="0" role="button" aria-label="View details for ${escape(projectDisplayTitle(p))}">
            <span class="status-dot" style="background: ${STATUS_COLOR_VAR[p.status] || 'var(--text-tertiary)'};" aria-hidden="true"></span>
            ${escape(projectDisplayTitle(p))}
            ${p.partner_dept ? `<span class="faint" style="margin-left: var(--space-2);">${escape(p.partner_dept)}</span>` : ''}
          </li>`).join('')}
      </ul>
    </article>`;
}

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

renderWwc();
subscribe(renderWwc);
window.addEventListener('tucson-data:refresh', renderWwc);

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
