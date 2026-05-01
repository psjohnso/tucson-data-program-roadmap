/* ─────────────────────────────────────────────────────────────────────────
   config.js — shared constants: goals, statuses, fiscal calendar
   ───────────────────────────────────────────────────────────────────────── */

export const APP_VERSION = '0.1.0.0004';

// Six Data Program goals — values match what's stored in the tracker's
// dp_goal field. Keep label text in sync with the tracker's domain values.
export const DATA_PROGRAM_GOALS = [
  {
    slug: 'governance',
    value: 'Establish Data Governance',
    short: 'Governance',
    color: 'var(--goal-governance)', /* cactus fruit */
    description: 'Putting policies, standards, and accountable ownership in place for how the city manages its data.'
  },
  {
    slug: 'quality',
    value: 'Enhance Data Quality and Accessibility',
    short: 'Quality & access',
    color: 'var(--goal-quality)',
    description: "Making the city's data trustworthy, current, and findable for the teams that need it."
  },
  {
    slug: 'security',
    value: 'Strengthen Data Security',
    short: 'Security',
    color: 'var(--goal-security)',
    description: 'Protecting sensitive data, enforcing retention, and meeting compliance requirements.'
  },
  {
    slug: 'literacy',
    value: 'Build Data Literacy and Culture',
    short: 'Literacy & culture',
    color: 'var(--goal-literacy)',
    description: "Growing the city's confidence with data through training, documentation, and shared practice."
  },
  {
    slug: 'architecture',
    value: 'Implementing Scalable Architecture and Technology',
    short: 'Architecture',
    color: 'var(--goal-architecture)',
    description: 'Building the technical foundation the rest of the data program runs on.'
  },
  {
    slug: 'business-needs',
    value: 'Gather Business Needs',
    short: 'Business needs',
    color: 'var(--goal-business)',
    description: 'Surfacing what departments actually need from data so investments target real work.'
  }
];

// Helper lookups
export const GOAL_BY_VALUE = Object.fromEntries(DATA_PROGRAM_GOALS.map(g => [g.value, g]));
export const GOAL_BY_SLUG  = Object.fromEntries(DATA_PROGRAM_GOALS.map(g => [g.slug,  g]));

// Status order for displaying counts and sorting
export const STATUS_ORDER = ['Active', 'Scheduled', 'Future', 'Idea', 'On Hold', 'Waiting', 'Complete'];

// Status → CSS color variable
export const STATUS_COLORS = {
  'Active':    'var(--status-active)',
  'Scheduled': 'var(--status-scheduled)',
  'Future':    'var(--status-future)',
  'Idea':      'var(--status-idea)',
  'On Hold':   'var(--status-onhold)',
  'Waiting':   'var(--status-waiting)',
  'Complete':  'var(--status-complete)'
};

// Tucson fiscal year starts July 1
export function getFiscalYear(date = new Date()) {
  const d = (date instanceof Date) ? date : new Date(date);
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? y + 1 : y;  // July (month 6) → next FY
}
