/* ─────────────────────────────────────────────────────────────────────────
   data.js — data access layer

   Queries the tracker's AGOL projects_view feature service directly, filtered
   to the public Data Program subset. Anonymous read; no authentication.

   Visibility predicate enforced HERE, never in pages:
     is_data_program = 1  AND  (public_visibility = 1 OR public_visibility IS NULL)

   The NULL allowance is intentional. The field defaults to "visible," and
   existing records had NULL when the field was added. Treating NULL as
   visible means everyone is in by default, and editors opt OUT by setting 0.

   Field-name notes (these match the AGOL schema, not my earlier seed.json):
     - end date column is `end_` (the underscore avoids the SQL reserved word)
     - working due date is `working_due`
     - object id is `ObjectId` (case-sensitive)
     - dates come as ISO strings like "2026-04-12"
   ───────────────────────────────────────────────────────────────────────── */

import { getFiscalYear } from './config.js?v=4';

const SERVICE_URL =
  'https://services3.arcgis.com/9coHY2fvuFjG9HQX/ArcGIS/rest/services/projects_view/FeatureServer/0';

const VISIBLE_WHERE =
  "is_data_program=1 AND (public_visibility=1 OR public_visibility IS NULL)";

// Outfields we actually use. Smaller payloads, faster page loads.
const OUTFIELDS = [
  'ObjectId',
  'pid',
  'title',
  'leadership_title',
  'leadership_summary',
  'description',
  'problem_statement',
  'status',
  'start',
  'end_',
  'working_due',
  'actual_end',
  'is_data_program',
  'public_visibility',
  'dp_goal',
  'primary_dp_goal',
  'partner_dept',
  'itd_team',
  'project_size',
  'project_number',
  'it_initiative',
  'city_initiative',
  'wwc_practice',
  'wwc_criteria',
  'EditDate'
].join(',');

let _allProjectsCache = null;

/** Fetch every visible Data Program project. Cached for the page session. */
async function loadAllProjects() {
  if (_allProjectsCache) return _allProjectsCache;

  const url =
    SERVICE_URL +
    '/query' +
    '?where=' + encodeURIComponent(VISIBLE_WHERE) +
    '&outFields=' + OUTFIELDS +
    '&orderByFields=' + encodeURIComponent('title') +
    '&resultRecordCount=2000' +
    '&f=json';

  const res = await fetch(url, { mode: 'cors' });
  if (!res.ok) throw new Error(`AGOL request failed (${res.status})`);
  const json = await res.json();
  if (json.error) throw new Error(`AGOL error: ${json.error.message || JSON.stringify(json.error)}`);

  _allProjectsCache = (json.features || []).map(f => f.attributes);
  return _allProjectsCache;
}

/* ─────────────────────────────────────────────────────────────────────────
   Public API — stable signatures
   ───────────────────────────────────────────────────────────────────────── */

export async function getProjects({ filters = {} } = {}) {
  const all = await loadAllProjects();
  return all.filter(p => matchesFilters(p, filters));
}

export async function getProject(id) {
  const all = await loadAllProjects();
  return all.find(p => p.ObjectId === id) || null;
}

export async function getStatusCounts({ filters = {} } = {}) {
  const projects = await getProjects({ filters });
  return projects.reduce((acc, p) => {
    const s = p.status || 'Unknown';
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
}

export async function getShippedCount({ fiscalYear } = {}) {
  const fy = fiscalYear ?? getFiscalYear();
  const all = await loadAllProjects();
  return all.filter(p => {
    if (p.status !== 'Complete') return false;
    if (!p.actual_end) return false;
    return getFiscalYear(p.actual_end) === fy;
  }).length;
}

/** Return projects grouped by their lane goal (primary_dp_goal, falling back
 *  to the first dp_goal). Projects without any goal end up under "Unclassified". */
export async function getProjectsByGoal({ filters = {} } = {}) {
  const projects = await getProjects({ filters });
  const groups = {};
  for (const p of projects) {
    const goal = laneGoalFor(p);
    if (!groups[goal]) groups[goal] = [];
    groups[goal].push(p);
  }
  return groups;
}

/** Most recently edited projects. Useful for the "Recent activity" feed. */
export async function getRecentlyEdited({ limit = 5 } = {}) {
  const all = await loadAllProjects();
  return [...all]
    .filter(p => p.EditDate)
    .sort((a, b) => (b.EditDate || 0) - (a.EditDate || 0))
    .slice(0, limit);
}

/* ─────────────────────────────────────────────────────────────────────────
   Filter matching (visibility predicate is server-side, this is for UI filters)
   ───────────────────────────────────────────────────────────────────────── */

function matchesFilters(p, filters) {
  if (filters.status?.length && !filters.status.includes(p.status)) return false;
  if (filters.goal?.length && !projectGoals(p).some(g => filters.goal.includes(g))) return false;
  if (filters.department && p.partner_dept !== filters.department) return false;
  if (filters.itInitiative?.length && !projectInitiatives(p).some(i => filters.itInitiative.includes(i))) return false;
  if (filters.from && projectEndDate(p) && projectEndDate(p) < filters.from) return false;
  if (filters.to && projectStartDate(p) && projectStartDate(p) > filters.to) return false;
  return true;
}

/* ─────────────────────────────────────────────────────────────────────────
   Field accessors — handle multi-select strings, fallbacks, missing data
   ───────────────────────────────────────────────────────────────────────── */

/** Comma-separated multi-select string → array of trimmed values */
function multiSelect(value) {
  if (!value) return [];
  return String(value).split(',').map(s => s.trim()).filter(Boolean);
}

export function projectGoals(p)            { return multiSelect(p.dp_goal); }
export function projectInitiatives(p)      { return multiSelect(p.it_initiative); }
export function projectCityInitiatives(p)  { return multiSelect(p.city_initiative); }
export function projectWwcPractices(p)     { return multiSelect(p.wwc_practice); }
export function projectWwcCriteria(p)      { return multiSelect(p.wwc_criteria); }

export function projectDisplayTitle(p) {
  return (p.leadership_title?.trim()) || (p.title?.trim()) || '(untitled)';
}

/** What goal does this project belong to for lane assignment?
 *  primary_dp_goal first, then first item of dp_goal, then 'Unclassified'. */
export function laneGoalFor(p) {
  if (p.primary_dp_goal) return p.primary_dp_goal;
  const goals = projectGoals(p);
  if (goals.length) return goals[0];
  return 'Unclassified';
}

export function projectStartDate(p) {
  return p.start ? new Date(p.start) : null;
}

export function projectEndDate(p) {
  if (p.working_due) return new Date(p.working_due);
  if (p.end_) return new Date(p.end_);
  return null;
}

export function projectActualEndDate(p) {
  return p.actual_end ? new Date(p.actual_end) : null;
}

export function projectEditDate(p) {
  return p.EditDate ? new Date(p.EditDate) : null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Convenience: clear the cache so the next read re-fetches.
   Useful for a "refresh" button later.
   ───────────────────────────────────────────────────────────────────────── */
export function _clearCache() { _allProjectsCache = null; }
