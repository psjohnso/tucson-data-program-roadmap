/* ─────────────────────────────────────────────────────────────────────────
   data.js — data access layer

   PHASE 1 (current): reads from data/seed.json shaped exactly like AGOL responses.
   PHASE 2 (later):   swaps the load() implementation to fetch live AGOL feature
                      services. Page code stays identical.

   Visibility predicate (is_data_program=1 AND public_visibility=1) is enforced
   here, NOT in pages. Pages always receive the public subset.
   ───────────────────────────────────────────────────────────────────────── */

import { getFiscalYear } from './config.js';

let _cache = null;

async function load() {
  if (_cache) return _cache;
  const res = await fetch('data/seed.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load seed data (${res.status})`);
  _cache = await res.json();
  return _cache;
}

/** Apply the visibility predicate. */
function isPublic(p) {
  return p.is_data_program === 1 && p.public_visibility === 1;
}

/** Comma-separated multi-select string → array of trimmed values */
function multiSelect(value) {
  if (!value) return [];
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

/* ─────────────────────────────────────────────────────────────────────────
   Public API — these signatures must remain stable across Phase 1 → Phase 2.
   ───────────────────────────────────────────────────────────────────────── */

export async function getProjects({ filters = {} } = {}) {
  const { projects = [] } = await load();
  return projects.filter(p => isPublic(p) && matchesFilters(p, filters));
}

export async function getProject(id) {
  const { projects = [] } = await load();
  const project = projects.find(p => p.objectid === id);
  return project && isPublic(project) ? project : null;
}

export async function getStatusCounts({ filters = {} } = {}) {
  const projects = await getProjects({ filters });
  return projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
}

export async function getShippedCount({ fiscalYear } = {}) {
  const fy = fiscalYear ?? getFiscalYear();
  const projects = await getProjects({ filters: { status: ['Complete'] } });
  return projects.filter(p => {
    if (!p.actual_end) return false;
    return getFiscalYear(p.actual_end) === fy;
  }).length;
}

export async function getGoalDescriptions() {
  const { goal_descriptions = {} } = await load();
  return goal_descriptions;
}

/* ─────────────────────────────────────────────────────────────────────────
   Filter matching
   ───────────────────────────────────────────────────────────────────────── */

function matchesFilters(p, filters) {
  if (filters.status?.length && !filters.status.includes(p.status))                                          return false;
  if (filters.goal?.length   && !multiSelect(p.dp_goal).some(g => filters.goal.includes(g)))                 return false;
  if (filters.department     && p.partner_dept !== filters.department)                                       return false;
  if (filters.itInitiative?.length && !multiSelect(p.it_initiative).some(i => filters.itInitiative.includes(i))) return false;
  if (filters.cityInitiative?.length && !multiSelect(p.city_initiative).some(i => filters.cityInitiative.includes(i))) return false;
  if (filters.from && p.working_due_date && p.working_due_date < filters.from) return false;
  if (filters.to   && p.start             && p.start             > filters.to)   return false;
  return true;
}

/* ─────────────────────────────────────────────────────────────────────────
   Helpers exposed for components
   ───────────────────────────────────────────────────────────────────────── */

export function projectGoals(p) { return multiSelect(p.dp_goal); }
export function projectInitiatives(p) { return multiSelect(p.it_initiative); }
export function projectCityInitiatives(p) { return multiSelect(p.city_initiative); }
export function projectWwcPractices(p) { return multiSelect(p.wwc_practice); }
export function projectWwcCriteria(p) { return multiSelect(p.wwc_criteria); }

export function projectDisplayTitle(p) {
  return p.leadership_title?.trim() || p.title || '(untitled project)';
}

export function projectStartDate(p) { return p.start ? new Date(p.start) : null; }
export function projectEndDate(p) {
  if (p.working_due_date) return new Date(p.working_due_date);
  if (p.original_end)     return new Date(p.original_end);
  return null;
}
