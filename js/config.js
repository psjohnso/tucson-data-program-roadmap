/* ─────────────────────────────────────────────────────────────────────────
   config.js — shared constants: goals, statuses, fiscal calendar
   ───────────────────────────────────────────────────────────────────────── */

export const APP_VERSION = '1.4.0.0000';

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

// What Works Cities certification taxonomy — 8 practice areas, 43 criteria.
// Source: certification.results4america.org (locked portal; transcribed from
// the team's view of the certification assessment).
//
// AGOL field shapes:
//   wwc_practice  — single-value: full practice area name string (e.g. "Data Management")
//   wwc_criteria  — multi-select: comma-separated strings of "CODE Name" form
//                   (e.g. "DM1 Implementing Data Strategy and Governance, LC3 ...")
//
// `code` is the parseable prefix on each criterion string (DM1, LC2, OD3, etc.).
export const WWC_PRACTICE_AREAS = [
  {
    slug: 'data-management',
    short: 'Data Management',
    description: 'The practices and policies that support comprehensive management of shared and internal data so local governments can routinely and strategically leverage data for decision making and delivery of data and analytics services.',
    criteria: [
      { code: 'DM1', name: 'Implementing Data Strategy and Governance', description: 'Your local government maintains a documented list of data strategy and governance responsibilities and meets at least quarterly to carry out those responsibilities.' },
      { code: 'DM2', name: 'Maintaining a Comprehensive Data Inventory', description: 'Your local government maintains a detailed data inventory that makes its data and relevant data from third parties more discoverable and accessible and better stewarded.' },
      { code: 'DM3', name: 'Sharing Data', description: 'Your local government has documented and user-friendly processes to expedite the sharing of data — including protected data — both cross-departmentally within your local government and with external partners.' },
      { code: 'DM4', name: 'Improving Data Quality', description: 'Your local government has and carries out documented policies or practices to improve data quality.' },
      { code: 'DM5', name: 'Protecting Data Privacy and Confidentiality', description: 'Your local government has documented policies or practices to protect the privacy and confidentiality of government-held data.' },
      { code: 'DM6', name: 'Managing Data Security', description: 'Your local government has documented policies or practices to manage the risk of data breach, loss, or unauthorized manipulation.' },
      { code: 'DM7', name: 'Qualitative Data Practices', description: 'Your local government has a documented strategy or process to routinely collect community input and qualitative data from residents and other external stakeholders to inform decision-making.' },
      { code: 'DM8', name: 'Disaggregated Data for Decision-Making', description: 'Your local government collects and analyzes data disaggregated by geographic and demographic subgroups to inform decision-making on key citywide priorities.' },
      { code: 'DM9', name: 'Data Service Standard', description: 'Your local government has a public-facing documented standard for developing and implementing high-quality data and analytics services citywide.' }
    ]
  },
  {
    slug: 'leadership-and-capacity',
    short: 'Leadership and Capacity',
    description: 'A strong foundation for the effective use of data and evidence starts with the chief executive and leadership routinely accessing data for decision-making and explicitly demonstrating that governing with data and evidence is an organizational expectation.',
    criteria: [
      { code: 'LC1', name: 'Executive Commitment to Data Informed Government', description: 'Your mayor and/or chief executive consistently communicates and demonstrates to staff that governing with data and evidence is an organizational expectation.' },
      { code: 'LC2', name: 'Use of Public Communications', description: 'Your mayor and/or chief executive(s) and city leaders regularly use data and evidence to publicly communicate investment or policy decisions and impact of government, and/or stories of progress made as a result.' },
      { code: 'LC3', name: 'Data Workforce Culture and Trainings', description: 'Your local government trains, upskills, and empowers local government staff in the management and the use of city data to inform decision-making.' },
      { code: 'LC4', name: 'Performance Management Leadership', description: 'Your local government has a designated leader and/or team responsible for implementing citywide performance management practices.' },
      { code: 'LC5', name: 'Data Leadership', description: 'Your local government has a designated leader and/or dedicated team responsible for implementing citywide data strategy, delivery, and governance practices and policies.' },
      { code: 'LC6', name: 'Rigorous Evaluation Leadership & Expertise', description: 'Your local government has a designated leader and/or team responsible for ensuring departments conduct evaluations (e.g., process, experimental, or quasi-experimental).' },
      { code: 'LC7', name: 'Results-Driven Contracting Leadership', description: 'Your local government has a designated leader and/or team responsible for applying results-driven contracting strategies or similar procurement best practices to its portfolio of upcoming key procurements, contracts, and/or grants citywide or within departments.' }
    ]
  },
  {
    slug: 'open-data',
    short: 'Open Data',
    description: 'The practice of proactively making city data publicly available — in whole or in part — and legally open for use. The creation of sustainable open data systems can promote informed decision-making, transparency, and robust resident engagement.',
    criteria: [
      { code: 'OD1', name: 'Open Data Policy', description: 'Your local government has a publicly available, codified open data policy that commits to data transparency and proactive public disclosure of local government data and data practices.' },
      { code: 'OD2', name: 'User Guidance for Open and Shared Data', description: 'Your local government provides clear "how-to" guidance to help all internal and external users (city staff, residents, businesses, etc.) access, analyze, engage, and use open and shared city data.' },
      { code: 'OD3', name: 'Open Data Portal', description: 'Your local government publishes open data to a central, public online location.' },
      { code: 'OD4', name: 'User Insights About Open and Shared Data', description: 'Your local government tracks and documents insights about internal and external data users and incorporates user needs into the design and implementation of its data and analytics services and transparency practices.' }
    ]
  },
  {
    slug: 'performance-and-analytics',
    short: 'Performance and Analytics',
    description: 'The practice of studying how to perform better and inserting those insights into the operational decision-making process, solving problems through performance management systems and the use of analyses, and creating a culture of accountability.',
    criteria: [
      { code: 'PA1', name: 'Selecting and Using Performance Metrics for Strategic Goals and Priorities', description: 'Your local government identifies strategic goals, aligns a diverse set of measures with those goals, and uses data to evaluate progress toward them.' },
      { code: 'PA2', name: 'Implementing Performance Management', description: 'Your local government holds performance management meetings during which it reviews data and data analysis, discusses insights, and makes decisions about its strategic goals at least quarterly.' },
      { code: 'PA3', name: 'Sharing Goals and Progress', description: 'Your local government regularly shares its strategic goals, performance measures, and progress toward achieving those goals with the public.' },
      { code: 'PA4', name: 'Evaluating Disparate Impact of Automated Decisions', description: 'Your local government has documented policies or practices aimed at harnessing the benefits of automated decision-making (ie. use of algorithms, predictive analytics, artificial intelligence, etc.) while also reducing associated risks, such as the impact of bias on data collection, selection and analysis.' },
      { code: 'PA5', name: 'Using Analysis in Decisions', description: "Your local government has a sustained, regular process for using analysis produced as part of your local government's performance and/or analytics program to inform decisions about resource prioritization or allocation, hiring, and/or accessible service delivery for citywide strategic priorities." }
    ]
  },
  {
    slug: 'data-driven-budget-and-finance',
    short: 'Data-Driven Budget and Finance',
    description: 'A strategic process used to incorporate data and evidence and align strategic priorities and metrics with financial decisions and to shift funding and resources from ineffective programs and services, to those that are evidence-based and resident-focused.',
    criteria: [
      { code: 'BF1', name: 'Data-Driven Budget and Financial Processes', description: 'Your local government uses quantitative and qualitative data to align its budget and financial processes (i.e. expenditures, strategic investments, revenue) with strategic priorities and to promote allocation of funds based on the needs of your communities.' },
      { code: 'BF2', name: 'Data-Driven Budget and Financial Decisions', description: 'Your local government has a sustained, regular process of using analyzed quantitative and qualitative data to inform budget and financial decisions about practices, programs, or policies.' },
      { code: 'BF3', name: 'Leveraging Funds for Outcomes', description: 'In the past 24 months, your local government has leveraged (allocated or repurposed) new and/or existing funds toward evidence-based programs based on the needs of your communities.' }
    ]
  },
  {
    slug: 'results-driven-contracting',
    short: 'Results-Driven Contracting',
    description: 'A set of strategies to structure, evaluate, and actively manage contracts strategically, using data to help local governments leverage procurement as a tool to make progress on their highest priority goals.',
    criteria: [
      { code: 'RDC1', name: 'Defining Goals for Key Procurements', description: 'Your local government defines strategic goals and desired outcomes for key procurements, contracts, and/or grants.' },
      { code: 'RDC2', name: 'Measuring Outcomes for Key Procurements', description: 'Your local government uses performance metrics to measure outcomes for key procurements and flag when vendor performance is off track during the course of a contract.' },
      { code: 'RDC3', name: 'Assessing Vendor Performance', description: 'Your local government assesses the performance of contractors in order to compare the effectiveness of similar contractors.' },
      { code: 'RDC4', name: 'Structuring Procurements to Support Strategic Goals', description: "Your local government uses procurement and contracting approaches that incentivize vendors to work toward your local government's strategic goals defined in the contracts, procurements, and/or grants." },
      { code: 'RDC5', name: 'Using Data to Manage Contracts and Improve Outcomes and Performance', description: 'Your local government actively manages contracts, using disaggregated performance data to achieve desired outcomes, by engaging with contractors at least quarterly during the course of the contract.' },
      { code: 'RDC6', name: 'Making Informed Contracting Decisions', description: 'Your local government reviews vendor performance data to inform future contracting decisions, including the selection of vendors, renewal of contracts, and/or expansion of existing scopes.' },
      { code: 'RDC7', name: 'Open and Shared Procurement Data', description: 'Your local government embeds opening and sharing data throughout the entire procurement process lifecycle in order to increase bid competitiveness and strengthen procurement transparency and accountability.' },
      { code: 'RDC8', name: 'Supporting Vendor Participation and Competition', description: 'Your local government improves procurement systems to make it easier for vendors to do business with the government, designs contracting opportunities so that more vendors can respond, and/or invests in building vendor capacity.' }
    ]
  },
  {
    slug: 'community-impact',
    short: 'Community Impact',
    description: "Practices related to the local government's role as a leader within the broader ecosystem of data-driven decision-making and in training and collaborating with stakeholders to build use of city data and analytics services to deepen community impact.",
    criteria: [
      { code: 'CI1', name: 'Community Data Training and Collaboration', description: 'Your local government supports efforts to educate, upskill, and activate community members (both individuals and local organizations e.g., civic groups, place-based partners, vendors, service providers) to better understand and use city data and analytics services to deepen community impact.' },
      { code: 'CI2', name: 'Analytics Service Delivery', description: "Your local government develops internal and resident-facing data-driven analytics services that utilize data from the city's data inventory to improve the lives and work of the community and the government." },
      { code: 'CI3', name: 'Promotion of Data & Evidence', description: 'Your local government uses evidence, and/or insights from organizational data it produces to contribute to a broader knowledge base and to collaborate with and catalyze external partners or stakeholders to do so as well.' }
    ]
  },
  {
    slug: 'evaluations',
    short: 'Evaluations',
    description: 'Systematic assessments using standard research methods to help local governments gain insights into the design, implementation, or effects of a policy, program, or practice, and make continual improvements.',
    criteria: [
      { code: 'EVAL1', name: 'Establishing City-Wide Evaluation Commitments', description: 'Your local government has a city-wide evaluation commitment that has been documented and implemented.' },
      { code: 'EVAL2', name: 'Launching Rigorous Evaluations', description: 'Your local government regularly identifies and launches rigorous evaluations (process, experimental, or quasi-experimental).' },
      { code: 'EVAL3', name: 'Using Rigorous Evaluation Results to Make Decisions', description: 'Your local government regularly uses rigorous evaluation results to make decisions.' },
      { code: 'EVAL4', name: 'Adapting Evidence-Based Programs', description: 'Your local government has a process for identifying and adapting evidence-based programs from outside sources such as academic researchers, clearinghouses, or other jurisdictions. Evidence-based programs are programs or practices that have demonstrated positive results through evaluations.' }
    ]
  }
];

// Build lookup tables for the WWC view to map a parsed criterion code (e.g. "DM1")
// back to its full record + parent practice area in O(1).
const _CRITERION_TO_AREA = {};
const _CRITERION_BY_CODE = {};
for (const area of WWC_PRACTICE_AREAS) {
  for (const c of area.criteria) {
    _CRITERION_TO_AREA[c.code] = area;
    _CRITERION_BY_CODE[c.code] = c;
  }
}
export const WWC_AREA_BY_SLUG       = Object.fromEntries(WWC_PRACTICE_AREAS.map(a => [a.slug, a]));
export const WWC_CRITERION_BY_CODE  = _CRITERION_BY_CODE;
export const WWC_AREA_FOR_CRITERION = _CRITERION_TO_AREA;

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
