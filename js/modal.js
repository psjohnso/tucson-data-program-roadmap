/* ─────────────────────────────────────────────────────────────────────────
   modal.js — Item Detail Modal

   Self-contained module that opens a modal showing project details when
   called with a project ObjectId. Used by:
     - timeline bars (roadmap.js)
     - project list items (portfolio.js, home.js)
     - any future surface that needs to show project context

   Public API:
     openProjectModal(objectId)  → fetches and shows the project
     closeProjectModal()         → closes any open modal

   Modal markup is created on first use and reused. Closes via:
     - Escape key
     - Click on backdrop
     - Click on close button
   ───────────────────────────────────────────────────────────────────────── */

import {
  getProject,
  projectDisplayTitle,
  projectStartDate,
  projectEndDate,
  projectActualEndDate,
  projectGoals,
  projectInitiatives
} from './data.js?v=16';

let modalEl = null;
let lastFocusedEl = null;

/* ─── Public API ────────────────────────────────────────────────────────── */

export async function openProjectModal(objectId) {
  ensureModalExists();
  lastFocusedEl = document.activeElement;

  // Show loading state immediately
  const body = modalEl.querySelector('.modal__body');
  body.innerHTML = `<p class="muted" style="padding: var(--space-6); text-align: center;">Loading…</p>`;
  showModal();

  try {
    const project = await getProject(Number(objectId));
    if (!project) {
      body.innerHTML = `<p class="muted" style="padding: var(--space-6);">Project not found.</p>`;
      return;
    }
    body.innerHTML = renderProjectBody(project);
    // Focus the close button for accessibility
    const closeBtn = modalEl.querySelector('.modal__close');
    if (closeBtn) closeBtn.focus();
  } catch (err) {
    console.error('Modal failed to load project:', err);
    body.innerHTML = `<p class="muted" style="padding: var(--space-6);">Couldn't load project details. ${escape(err.message || err)}</p>`;
  }
}

export function closeProjectModal() {
  if (!modalEl) return;
  modalEl.classList.remove('modal--open');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  // Return focus to whatever was focused before we opened
  if (lastFocusedEl && typeof lastFocusedEl.focus === 'function') {
    lastFocusedEl.focus();
  }
  lastFocusedEl = null;
}

/* ─── Modal scaffolding ─────────────────────────────────────────────────── */

function ensureModalExists() {
  if (modalEl) return;

  modalEl = document.createElement('div');
  modalEl.className = 'modal';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-labelledby', 'modal-title');
  modalEl.setAttribute('aria-hidden', 'true');

  modalEl.innerHTML = `
    <div class="modal__backdrop" data-modal-close></div>
    <div class="modal__panel" role="document">
      <button class="modal__close" type="button" aria-label="Close" data-modal-close>×</button>
      <div class="modal__body"></div>
    </div>
  `;

  document.body.appendChild(modalEl);

  // Close-on-backdrop / close-button click
  modalEl.addEventListener('click', e => {
    if (e.target.hasAttribute('data-modal-close')) {
      closeProjectModal();
    }
  });

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalEl.classList.contains('modal--open')) {
      closeProjectModal();
    }
  });
}

function showModal() {
  modalEl.classList.add('modal--open');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

/* ─── Modal body content ────────────────────────────────────────────────── */

function renderProjectBody(p) {
  const title = projectDisplayTitle(p);
  const internalTitle = (p.title || '').trim();
  const showInternal = p.leadership_title && p.leadership_title.trim() && internalTitle && internalTitle !== title;

  const summary = (p.leadership_summary || '').trim();
  const description = (p.description || '').trim();
  const problem = (p.problem_statement || '').trim();

  const goals = projectGoals(p);
  const initiatives = projectInitiatives(p);

  const startDate = projectStartDate(p);
  const endDate = projectEndDate(p);
  const actualEnd = projectActualEndDate(p);

  const statusColor = STATUS_COLORS[p.status] || 'var(--text-tertiary)';
  const statusKey = STATUS_LABEL[p.status] || (p.status || 'Unknown');

  const trackerUrl = `https://psjohnso.github.io/analytics-tracker/#/project/${p.ObjectId}`;

  return `
    <div class="modal__header">
      <div class="modal__eyebrow">
        <span class="modal__status-dot" style="background: ${statusColor};" aria-hidden="true"></span>
        <span style="color: ${statusColor};">${escape(statusKey)}</span>
        ${p.partner_dept ? ` · <span>${escape(p.partner_dept)}</span>` : ''}
      </div>
      <h2 id="modal-title" class="modal__title">${escape(title)}</h2>
      ${showInternal ? `<div class="modal__subtitle muted">Internal: ${escape(internalTitle)}</div>` : ''}
    </div>

    <div class="modal__content">
      ${summary ? `
        <section class="modal__section">
          <div class="modal__section-label">Why this matters</div>
          <p class="prose">${escape(summary)}</p>
        </section>
      ` : description ? `
        <section class="modal__section">
          <div class="modal__section-label">Description</div>
          <p class="prose">${escape(description)}</p>
        </section>
      ` : ''}

      <section class="modal__section">
        <div class="modal__meta-grid">
          ${renderDateBlock('Start', startDate)}
          ${renderDateBlock(actualEnd ? 'Completed' : 'Working due', actualEnd || endDate)}
          ${p.project_size ? renderMetaBlock('Size', p.project_size) : ''}
          ${p.priority ? renderMetaBlock('Priority', p.priority) : ''}
          ${p.itd_team ? renderMetaBlock('Lead team', p.itd_team) : ''}
        </div>
      </section>

      ${goals.length ? `
        <section class="modal__section">
          <div class="modal__section-label">Data Program Goals</div>
          <div class="modal__chips">
            ${goals.map(g => `<span class="chip chip--goal">${escape(g)}</span>`).join('')}
          </div>
        </section>
      ` : ''}

      ${initiatives.length ? `
        <section class="modal__section">
          <div class="modal__section-label">IT initiative alignment</div>
          <ul class="modal__list">
            ${initiatives.map(i => `<li>${escape(i)}</li>`).join('')}
          </ul>
        </section>
      ` : ''}

      ${problem && problem !== description && !summary ? `
        <section class="modal__section">
          <div class="modal__section-label">Problem statement</div>
          <p class="prose">${escape(problem)}</p>
        </section>
      ` : ''}
    </div>

    <div class="modal__footer">
      <a href="${escape(trackerUrl)}" target="_blank" rel="noopener noreferrer" class="btn btn--ghost">
        Open in tracker ↗
      </a>
    </div>
  `;
}

function renderDateBlock(label, date) {
  if (!date) return '';
  return `
    <div class="modal__meta-item">
      <div class="modal__meta-label">${escape(label)}</div>
      <div class="modal__meta-value">${escape(formatDate(date))}</div>
    </div>
  `;
}

function renderMetaBlock(label, value) {
  return `
    <div class="modal__meta-item">
      <div class="modal__meta-label">${escape(label)}</div>
      <div class="modal__meta-value">${escape(value)}</div>
    </div>
  `;
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */

const STATUS_COLORS = {
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
  'Idea':     'Under review',
  'Canceled': 'Cancelled'
};

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
