/* ─────────────────────────────────────────────────────────────────────────
   filter-ui.js — filter modal + active-state banner.

   Self-contained UI for the filter system. Auto-initializes on import:
     - Binds clicks on [data-filter-toggle] (the filter button in the topnav)
     - Renders the active-filter banner under the topnav
     - Updates the filter-button badge (active count)
     - Listens to filter-state changes and re-renders both surfaces

   Modal pattern modeled on modal.js — markup created on first open, reused
   thereafter. Closes on Escape, backdrop click, close button, or Cancel.

   On Apply: stages working state into filters.js via setFilters().
   On Cancel: discards working state.
   On Clear all: un-checks everything inside the modal (does not apply).
   ───────────────────────────────────────────────────────────────────────── */

import {
  getActiveFilters,
  setFilters,
  clearFilters,
  subscribe,
  activeFilterCount,
  appendFiltersToHref
} from './filters.js?v=32';
import { DATA_PROGRAM_GOALS, STATUS_ORDER } from './config.js?v=32';
import { getDistinctDepartments } from './data.js?v=32';

// Status labels we display in the modal — same as the live app's mapping
const STATUS_DISPLAY_LABEL = {
  'Idea':     'Under review',
  'Canceled': 'Cancelled'
};

let modalEl = null;
let lastFocusedEl = null;
let workingState = null;        // staged filters inside the modal
let cachedDepartments = null;   // populated on first modal open

/* ─── Modal lifecycle ────────────────────────────────────────────────── */

async function openFilterModal() {
  await ensureModalExists();
  lastFocusedEl = document.activeElement;
  workingState = getActiveFilters();
  renderModalBody();
  modalEl.classList.add('filter-modal--open');
  modalEl.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  // Focus the close button for keyboard accessibility
  const closeBtn = modalEl.querySelector('.filter-modal__close');
  if (closeBtn) closeBtn.focus();
}

function closeFilterModal() {
  if (!modalEl) return;
  modalEl.classList.remove('filter-modal--open');
  modalEl.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  workingState = null;
  if (lastFocusedEl?.focus) lastFocusedEl.focus();
  lastFocusedEl = null;
}

async function ensureModalExists() {
  if (modalEl) return;

  // Pre-fetch department list so the modal renders immediately on open
  if (!cachedDepartments) {
    try {
      cachedDepartments = await getDistinctDepartments();
    } catch (err) {
      console.error('Could not load department list:', err);
      cachedDepartments = [];
    }
  }

  modalEl = document.createElement('div');
  modalEl.className = 'filter-modal';
  modalEl.setAttribute('role', 'dialog');
  modalEl.setAttribute('aria-modal', 'true');
  modalEl.setAttribute('aria-labelledby', 'filter-modal-title');
  modalEl.setAttribute('aria-hidden', 'true');

  modalEl.innerHTML = `
    <div class="filter-modal__backdrop" data-filter-close></div>
    <div class="filter-modal__panel" role="document">
      <div class="filter-modal__header">
        <h3 class="filter-modal__title" id="filter-modal-title">Filter projects</h3>
        <button class="filter-modal__close" type="button" aria-label="Close" data-filter-close>×</button>
      </div>
      <div class="filter-modal__body"></div>
      <div class="filter-modal__footer">
        <button class="filter-modal__clear" type="button" data-filter-action="clear">Clear all</button>
        <button class="btn--secondary" type="button" data-filter-close>Cancel</button>
        <button class="btn--primary" type="button" data-filter-action="apply">Apply</button>
      </div>
    </div>`;

  document.body.appendChild(modalEl);

  // Close handlers
  modalEl.addEventListener('click', e => {
    if (e.target.hasAttribute('data-filter-close')) closeFilterModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalEl?.classList.contains('filter-modal--open')) {
      closeFilterModal();
    }
  });

  // Action buttons (clear / apply)
  modalEl.addEventListener('click', e => {
    const action = e.target.getAttribute?.('data-filter-action');
    if (action === 'apply') {
      setFilters(workingState || {});
      closeFilterModal();
    } else if (action === 'clear') {
      workingState = {};
      renderModalBody();
    }
  });

  // Checkbox change → update working state
  modalEl.addEventListener('change', e => {
    const cb = e.target;
    if (cb.tagName !== 'INPUT' || cb.type !== 'checkbox') return;
    const group = cb.dataset.group;
    const value = cb.dataset.value;
    if (!group || !value) return;
    workingState = workingState || {};
    workingState[group] = workingState[group] || [];
    if (cb.checked) {
      if (!workingState[group].includes(value)) workingState[group].push(value);
    } else {
      workingState[group] = workingState[group].filter(v => v !== value);
    }
    updateApplyButtonLabel();
  });
}

function renderModalBody() {
  const body = modalEl.querySelector('.filter-modal__body');
  // On goal-detail, the goal is implied by the page; the filter system doesn't
  // manage the goal key there. Replace the Goal section with a contextual note.
  const onGoalDetail = window.location.pathname.endsWith('goal.html');
  body.innerHTML = `
    ${renderSection('Status', 'status', STATUS_ORDER.map(s => ({
      value: s,
      label: STATUS_DISPLAY_LABEL[s] || s
    })))}
    ${onGoalDetail ? renderGoalContextNote() : renderSection('Data Program Goal', 'goal', DATA_PROGRAM_GOALS.map(g => ({
      value: g.slug,
      label: g.short
    })))}
    ${renderSection('Department', 'dept', (cachedDepartments || []).map(d => ({
      value: d,
      label: d
    })), { dynamicNote: true })}
  `;
  updateApplyButtonLabel();
}

function renderGoalContextNote() {
  return `
    <div class="filter-modal__section">
      <div class="filter-modal__section-label">Data Program Goal</div>
      <p class="filter-modal__context-note">
        You're viewing a single goal. Use Status and Department filters to narrow this view, or visit the
        <a href="portfolio.html">Portfolio</a> to compare across goals.
      </p>
    </div>`;
}

function renderSection(label, group, options, opts = {}) {
  const selected = new Set(workingState?.[group] || []);
  return `
    <div class="filter-modal__section">
      <div class="filter-modal__section-label">
        ${escape(label)}
        ${opts.dynamicNote ? `<span class="filter-modal__section-note">(derived from data)</span>` : ''}
      </div>
      <div class="filter-modal__options">
        ${options.length === 0
          ? `<p class="muted" style="grid-column: 1 / -1; margin: 0; font-size: var(--text-sm);">No options available.</p>`
          : options.map(opt => `
              <label class="filter-modal__option">
                <input type="checkbox"
                       data-group="${escape(group)}"
                       data-value="${escape(opt.value)}"
                       ${selected.has(opt.value) ? 'checked' : ''}>
                ${escape(opt.label)}
              </label>`).join('')}
      </div>
    </div>`;
}

function updateApplyButtonLabel() {
  const applyBtn = modalEl.querySelector('[data-filter-action="apply"]');
  if (!applyBtn) return;
  let count = 0;
  if (workingState) {
    for (const k of ['status', 'goal', 'dept']) count += (workingState[k]?.length || 0);
  }
  applyBtn.textContent = count > 0 ? `Apply (${count})` : 'Apply';
}

/* ─── Filter button + banner (in-page UI) ───────────────────────────────── */

function refreshUI() {
  const filters = getActiveFilters();
  const count = activeFilterCount();

  // Update the filter button badge
  for (const btn of document.querySelectorAll('[data-filter-toggle]')) {
    const badge = btn.querySelector('.topnav__filter-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = String(count);
        badge.hidden = false;
      } else {
        badge.hidden = true;
      }
    }
  }

  // Update the active-filter banner
  const banner = document.getElementById('filter-banner');
  if (!banner) return;
  if (count === 0) {
    banner.hidden = true;
    banner.innerHTML = '';
    return;
  }
  banner.hidden = false;
  banner.innerHTML = `
    <div class="filter-banner__inner">
      <span class="filter-banner__label">Filtered:</span>
      ${renderChips('status', filters.status, label => label)}
      ${renderChips('goal', filters.goal, slug => goalLabelForSlug(slug))}
      ${renderChips('dept', filters.dept, label => label)}
      <button class="filter-banner__clear" type="button" data-filter-action="clear-all">Clear all</button>
    </div>`;
}

function renderChips(group, values, labelFn) {
  if (!values?.length) return '';
  return values.map(v => `
    <span class="filter-chip">
      ${escape(labelFn(v) || v)}
      <button class="filter-chip__remove" type="button"
              data-filter-action="remove-chip"
              data-group="${escape(group)}"
              data-value="${escape(v)}"
              aria-label="Remove ${escape(labelFn(v) || v)} filter">×</button>
    </span>`).join('');
}

function goalLabelForSlug(slug) {
  const g = DATA_PROGRAM_GOALS.find(x => x.slug === slug);
  return g ? g.short : slug;
}

/* ─── Share button + toast ──────────────────────────────────────────────── */

let toastEl = null;
let toastTimer = null;

async function shareCurrentUrl() {
  const url = window.location.href;
  try {
    await navigator.clipboard.writeText(url);
    showToast('Link copied to clipboard');
  } catch (err) {
    // navigator.clipboard can fail on http or in old browsers; fall back
    console.warn('Clipboard write failed; using fallback:', err);
    fallbackCopy(url);
    showToast('Link copied to clipboard');
  }
}

function fallbackCopy(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch {}
  ta.remove();
}

function showToast(message) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    toastEl.setAttribute('role', 'status');
    toastEl.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  // Force reflow so the transition triggers when we add the visible class
  void toastEl.offsetWidth;
  toastEl.classList.add('toast--visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl?.classList.remove('toast--visible');
  }, 2200);
}

/* ─── Cross-page filter persistence ──────────────────────────────────────
   Rewrite internal nav links so filter state carries across page nav.
   Topnav and footer links live in static HTML and are walked here.
   Page-rendered dynamic links (goal cards) use appendFiltersToHref()
   inline at render time — see home.js / portfolio.js.
   ───────────────────────────────────────────────────────────────────────── */

/** Rewrite static internal nav links so filter state carries across page
 *  navigation. Targets the static topnav links and the footer "What's new"
 *  link — both live in the page HTML and aren't re-rendered.
 *
 *  Dynamic links rendered by page modules (goal cards on home/portfolio)
 *  call appendFiltersToHref() inline at render time. Two paths because the
 *  static links can be DOM-walked once on init / once per filter change,
 *  whereas dynamic links don't exist until a page module's render runs. */
function rewriteNavLinks() {
  const selectors = ['.topnav a[href]', '.page-footer a[href]'];
  for (const sel of selectors) {
    for (const a of document.querySelectorAll(sel)) {
      const original = a.dataset.originalHref || a.getAttribute('href');
      if (!original || /^(https?:|mailto:|#|javascript:)/i.test(original)) continue;
      a.dataset.originalHref = original;
      a.setAttribute('href', appendFiltersToHref(original));
    }
  }
}

/* ─── Bootstrapping ─────────────────────────────────────────────────────── */

function init() {
  // Filter button click → open modal. Share button click → copy URL.
  document.addEventListener('click', e => {
    if (e.target.closest?.('[data-filter-toggle]')) {
      openFilterModal();
      return;
    }
    if (e.target.closest?.('[data-share-toggle]')) {
      shareCurrentUrl();
      return;
    }

    // Banner: remove a single chip
    const removeBtn = e.target.closest?.('[data-filter-action="remove-chip"]');
    if (removeBtn) {
      const group = removeBtn.dataset.group;
      const value = removeBtn.dataset.value;
      const filters = getActiveFilters();
      const updated = (filters[group] || []).filter(v => v !== value);
      setFilters({ [group]: updated });
      return;
    }

    // Banner: clear all
    if (e.target.closest?.('[data-filter-action="clear-all"]')) {
      clearFilters();
    }
  });

  // Re-render UI + nav links whenever filter state changes
  subscribe(() => {
    refreshUI();
    rewriteNavLinks();
  });

  // Initial render
  refreshUI();
  rewriteNavLinks();
}

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

init();
