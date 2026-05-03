/* ─────────────────────────────────────────────────────────────────────────
   config.js — shared constants: goals, statuses, fiscal calendar
   ───────────────────────────────────────────────────────────────────────── */

export const APP_VERSION = '1.2.0.0002';

// Six Data Program goals — values match what's stored in the tracker's
// dp_goal field. Keep label text in sync with the tracker's domain values.
//
// Each goal has TWO description fields:
//   description — short one-liner, for goal cards on home and portfolio pages
//   narrative   — longer 2-3 paragraph version, for the goal detail page
//
export const DATA_PROGRAM_GOALS = [
  {
    slug: 'governance',
    value: 'Establish Data Governance',
    short: 'Governance',
    color: 'var(--goal-governance)',
    description: 'Putting policies, standards, and accountable ownership in place for how the city manages its data.',
    narrative: [
      "Governance is the rules of the road for how the city handles its data. It defines who owns what, how data is classified, what standards apply when datasets are created or shared, and who has the authority to set those rules. Without governance, every department invents its own answers — and the city ends up with inconsistent data quality, duplicated effort, and avoidable risk.",
      "The bulk of the work in this goal is institution-building: standing up the Data Governance Executive Council and its working committees, writing the policies that DGEC adopts, defining roles like data stewards and custodians, and creating the tools (catalogs, scorecards, dashboards) that make governance enforceable rather than aspirational. It's foundational work — many other goals depend on it landing.",
    ],
    leadership_question: "Who's accountable for the city's data, and what rules apply to how it's used?"
  },
  {
    slug: 'quality',
    value: 'Enhance Data Quality and Accessibility',
    short: 'Quality & access',
    color: 'var(--goal-quality)',
    description: "Making the city's data trustworthy, current, and findable for the teams that need it.",
    narrative: [
      "Quality and accessibility is what determines whether city data actually gets used. Trustworthy data — data that's current, complete, and accurate — gives departments the confidence to act on it. Accessible data — data that staff can find, understand, and connect to other data — turns isolated databases into a usable city resource.",
      "Work in this goal includes the data catalog, dashboards that surface key operational data, the open data portal, dataset documentation, accessibility (ADA/Section 508) compliance for dashboards, and the methods for assessing whether a dataset is fit for a given purpose. When this goal succeeds, departments stop maintaining shadow spreadsheets and start trusting the official sources.",
    ],
    leadership_question: "Can the people who need this data find it, trust it, and use it?"
  },
  {
    slug: 'security',
    value: 'Strengthen Data Security',
    short: 'Security',
    color: 'var(--goal-security)',
    description: 'Protecting sensitive data, enforcing retention, and meeting compliance requirements.',
    narrative: [
      "Security ensures that the city's most sensitive data — personnel records, criminal justice data, protected health information, financial information — is appropriately protected from inappropriate access, while still flowing to staff who legitimately need it. Get this wrong and you have either a breach or a workaround culture; get it right and the system disappears into the background.",
      "The work in this goal is largely technical configuration paired with policy: defining authorized roles for data classifications, configuring tools like Microsoft Purview to automatically apply protection, validating that retention schedules actually execute, and providing staff with practical training on handling sensitive data day-to-day. It's also the smallest goal by project count — a deliberate signal that we're focusing on a few high-leverage controls rather than spreading effort thin.",
    ],
    leadership_question: "Are we protecting what we should, while not blocking the work that needs to get done?"
  },
  {
    slug: 'literacy',
    value: 'Build Data Literacy and Culture',
    short: 'Literacy & culture',
    color: 'var(--goal-literacy)',
    description: "Growing the city's confidence with data through training, documentation, and shared practice.",
    narrative: [
      "Literacy and culture is the work of growing the city's collective fluency with data — from line staff using a dashboard during a service request to executives interpreting performance metrics in a council session. Tools and policies don't deliver value on their own; people using them confidently is what produces outcomes.",
      "Most of the work in this goal is a structured training pathway covering data fundamentals, analytics and BI, visualization and storytelling, AI and advanced analytics, and the catalog itself. It also includes the city's public-facing data communication — annual transparency reports, department use-case stories, and the public dimension of the Data Program's progress.",
    ],
    leadership_question: "Is our staff getting more capable with data over time, and can we show that to the public?"
  },
  {
    slug: 'architecture',
    value: 'Implementing Scalable Architecture and Technology',
    short: 'Architecture',
    color: 'var(--goal-architecture)',
    description: 'Building the technical foundation the rest of the data program runs on.',
    narrative: [
      "Architecture is the layer of platforms, integrations, and infrastructure that the rest of the data program runs on. Snowflake as the city's analytical warehouse, the Power BI environment for reporting, the GIS portal for spatial data, the connectors that move data between systems — these are the technical investments that make everything else possible.",
      "Work in this goal includes platform migrations (such as moving Power BI views and GIS data from the legacy data warehouse to Snowflake), the New City Portal initiative replacing the public GIS infrastructure, AI platform investments, and ongoing tools-and-platforms inventory and rationalization. Most of this work is invisible to leadership when it's working — and very visible when it isn't.",
    ],
    leadership_question: "Can our platforms actually scale to what the city needs them to do?"
  },
  {
    slug: 'business-needs',
    value: 'Gather Business Needs',
    short: 'Business needs',
    color: 'var(--goal-business)',
    description: 'Surfacing what departments actually need from data so investments target real work.',
    narrative: [
      "Business needs is the goal that keeps the rest of the program honest. The other five goals can be done well in isolation and still miss the mark — if the platforms, training, and dashboards aren't connected to what departments actually need to make decisions, the program produces shelfware.",
      "Work in this goal is largely listening: the CMO Dashboard delivering operational metrics the City Manager actually uses, gap analyses against documented business needs, requirements-gathering for proposed tools, and the BI Steering Committee bringing department voices into prioritization. It's the smallest goal by project count, but it's where the biggest signals about whether the program is on track come from.",
    ],
    leadership_question: "Is the program producing what departments actually need to make decisions?"
  }
];

// Helper lookups
export const GOAL_BY_VALUE = Object.fromEntries(DATA_PROGRAM_GOALS.map(g => [g.value, g]));
export const GOAL_BY_SLUG  = Object.fromEntries(DATA_PROGRAM_GOALS.map(g => [g.slug,  g]));

// Status order for displaying counts and sorting
export const STATUS_ORDER = ['Active', 'Scheduled', 'Future', 'Idea', 'On Hold', 'Waiting', 'Complete', 'Canceled'];

// Status → CSS color variable
export const STATUS_COLORS = {
  'Active':    'var(--status-active)',
  'Scheduled': 'var(--status-scheduled)',
  'Future':    'var(--status-future)',
  'Idea':      'var(--status-idea)',
  'On Hold':   'var(--status-onhold)',
  'Waiting':   'var(--status-waiting)',
  'Complete':  'var(--status-complete)',
  'Canceled':  'var(--status-canceled)'
};

// Tucson fiscal year starts July 1
export function getFiscalYear(date = new Date()) {
  const d = (date instanceof Date) ? date : new Date(date);
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? y + 1 : y;
}
