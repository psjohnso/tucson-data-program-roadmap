/* ─────────────────────────────────────────────────────────────────────────
   filters.js — global filter state, URL-encoded.

   Single source of truth for "what subset of projects is the user looking at."
   State is parsed from window.location.search on load and written back via
   history.replaceState on change. No localStorage; URL-only persistence.

   URL shape:   ?status=Active,Scheduled&goal=governance,quality&dept=IT,Parks
   State shape: { status: ['Active', 'Scheduled'], goal: ['governance', ...], dept: [...] }

   Note on goal-detail collision: the goal-detail page uses ?goal=<slug> as a
   page identifier (single value). On that page the filter system still parses
   ?goal= as a filter array, but goal.js intentionally ignores it (page-wins
   semantics — Q7 in the design).

   Public API:
     getActiveFilters()           → current state object (don't mutate)
     setFilters(partial)          → merge into state, write URL, notify
     clearFilters()               → wipe all filters
     subscribe(cb)                → listen for changes; returns unsubscribe fn
     applyFilters(projects, opts) → return filtered project array
     activeFilterCount()          → total selected items across groups
     appendFiltersToHref(href)    → return href with current filters appended,
                                    preserving any existing query params on href

   Usage:
     import { applyFilters, subscribe, getActiveFilters } from './filters.js?v=31';
     const filtered = applyFilters(allProjects);
     subscribe(() => rerender());
   ───────────────────────────────────────────────────────────────────────── */

import { GOAL_BY_VALUE } from './config.js?v=31';

const FILTER_KEYS = ['status', 'goal', 'dept'];
const subscribers = new Set();

let state = parseFromUrl();

// Keep state synced if the user uses browser back/forward
window.addEventListener('popstate', () => {
  state = parseFromUrl();
  notify();
});

/* ─── Public API ────────────────────────────────────────────────────────── */

export function getActiveFilters() {
  // Return a shallow copy to discourage mutation
  return {
    status: [...(state.status || [])],
    goal:   [...(state.goal   || [])],
    dept:   [...(state.dept   || [])]
  };
}

export function setFilters(partial) {
  // Merge: provided keys overwrite, others stay
  const next = { ...state };
  for (const k of FILTER_KEYS) {
    if (k in partial) next[k] = (partial[k] || []).filter(Boolean);
  }
  // Clean up empty arrays
  for (const k of FILTER_KEYS) {
    if (!next[k] || next[k].length === 0) delete next[k];
  }
  state = next;
  writeToUrl();
  notify();
}

export function clearFilters() {
  state = {};
  writeToUrl();
  notify();
}

export function subscribe(cb) {
  subscribers.add(cb);
  return () => subscribers.delete(cb);
}

export function activeFilterCount() {
  let n = 0;
  for (const k of FILTER_KEYS) n += (state[k]?.length || 0);
  return n;
}

/** Filter a project array against the current filter state.
 *
 *  opts.skipGoal — true on goal-detail pages (page wins, ignore goal filter).
 *                  Status and dept filters still apply.
 *  opts.goalSlugFor — function (project) => goal-slug, used to map between
 *                    AGOL goal value strings and the slug we use in URLs.
 *                    Defaults to mapping via projectGoals + GOAL_BY_VALUE.
 */
export function applyFilters(projects, opts = {}) {
  if (!projects || !projects.length) return projects || [];

  const filters = state;
  const hasStatus = filters.status?.length;
  const hasGoal   = !opts.skipGoal && filters.goal?.length;
  const hasDept   = filters.dept?.length;

  if (!hasStatus && !hasGoal && !hasDept) return projects;

  return projects.filter(p => {
    if (hasStatus && !filters.status.includes(p.status)) return false;
    if (hasGoal) {
      const projectGoalSlugs = goalSlugsFor(p);
      if (!filters.goal.some(slug => projectGoalSlugs.includes(slug))) return false;
    }
    if (hasDept && !filters.dept.includes(p.partner_dept)) return false;
    return true;
  });
}

/** Return an href with current filter params merged in. Preserves any
 *  query params already on the href (e.g. goal.html?goal=governance keeps
 *  its goal param while ?status, ?dept get appended from the filter state).
 *
 *  Implementation note: deliberately does NOT use new URL() because that
 *  resolves relative paths against an origin, which on GitHub Pages strips
 *  the repo subpath (index.html → /index.html → 404). We treat the href as
 *  an opaque string and only touch its query part. */
export function appendFiltersToHref(href) {
  if (!href) return href;

  const hashIdx = href.indexOf('#');
  const hash = hashIdx >= 0 ? href.slice(hashIdx) : '';
  const noHash = hashIdx >= 0 ? href.slice(0, hashIdx) : href;

  const queryIdx = noHash.indexOf('?');
  const path = queryIdx >= 0 ? noHash.slice(0, queryIdx) : noHash;
  const queryStr = queryIdx >= 0 ? noHash.slice(queryIdx + 1) : '';

  const params = new URLSearchParams(queryStr);
  // Don't overwrite a goal param already on the link — clicking a goal card
  // sets ?goal=<slug> explicitly and that takes precedence over filter state.
  const existingGoal = params.has('goal');
  for (const k of FILTER_KEYS) {
    if (k === 'goal' && existingGoal) continue;
    if (state[k]?.length) params.set(k, state[k].join(','));
  }

  const newQuery = params.toString();
  return path + (newQuery ? '?' + newQuery : '') + hash;
}

/* ─── Internals ─────────────────────────────────────────────────────────── */

/** True when the current page is the goal-detail page, where ?goal= is a
 *  page identifier (single slug), not a filter array. The filter system
 *  ignores the goal key entirely on this page so it can't corrupt the URL. */
function isGoalDetailPage() {
  return window.location.pathname.endsWith('goal.html');
}

function parseFromUrl() {
  const onGoalDetail = isGoalDetailPage();
  const params = new URLSearchParams(window.location.search);
  const out = {};
  for (const k of FILTER_KEYS) {
    if (k === 'goal' && onGoalDetail) continue;
    const v = params.get(k);
    if (v) {
      const list = v.split(',').map(s => s.trim()).filter(Boolean);
      if (list.length) out[k] = list;
    }
  }
  return out;
}

function writeToUrl() {
  const onGoalDetail = isGoalDetailPage();
  const params = new URLSearchParams(window.location.search);
  for (const k of FILTER_KEYS) {
    if (k === 'goal' && onGoalDetail) continue;  // never touch the page identifier
    if (state[k]?.length) params.set(k, state[k].join(','));
    else params.delete(k);
  }
  const newSearch = params.toString();
  const url = window.location.pathname +
              (newSearch ? '?' + newSearch : '') +
              window.location.hash;
  window.history.replaceState(null, '', url);
}

function notify() {
  for (const cb of subscribers) {
    try { cb(getActiveFilters()); }
    catch (err) { console.error('Filter subscriber threw:', err); }
  }
}

/** Map a project's AGOL goal value strings to our URL slugs. The `dp_goal`
 *  field is comma-separated multi-select, so a project can match multiple
 *  goal slugs in the filter. */
function goalSlugsFor(project) {
  const raw = project.dp_goal;
  if (!raw) return [];
  const values = String(raw).split(',').map(s => s.trim()).filter(Boolean);
  const slugs = [];
  for (const v of values) {
    const goal = GOAL_BY_VALUE[v];
    if (goal?.slug) slugs.push(goal.slug);
  }
  return slugs;
}
