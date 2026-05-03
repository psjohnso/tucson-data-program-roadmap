# Tucson DATA — HANDOFF

State of the project as of **v1.0.0.0000** (Phase 1 production launch release).

This document is for someone (or some Claude) picking up the project. It tells you what exists, what works, and where things live. For the *why* behind specific choices, see DECISIONS.md. For *what to work on next*, see OPEN_QUESTIONS.md.

---

## What Tucson DATA is

A leadership-facing, read-only window onto the City of Tucson Data Team's data program portfolio. Reads live from the same AGOL feature services that the team's internal Analytics Project Tracker writes to. Filtered to `is_data_program=1 AND (public_visibility=1 OR public_visibility IS NULL)`.

Two-app architecture:

- **Tracker** (`psjohnso/analytics-tracker`) — the system of record. The team's only edit surface. Single-file HTML app with OAuth 2.0 to AGOL.
- **Tucson DATA** (this app, `psjohnso/tucson-data-program-roadmap`) — the public face. Read-only.

---

## Where it runs

- **Repo:** github.com/psjohnso/tucson-data-program-roadmap (public)
- **Live URL:** https://psjohnso.github.io/tucson-data-program-roadmap/
- **Hosting:** GitHub Pages (no build step, plain HTML/CSS/JS)
- **Backend:** AGOL feature service at `https://services3.arcgis.com/9coHY2fvuFjG9HQX/ArcGIS/rest/services/projects_view/FeatureServer/0`
- **Custom domain:** Not yet — see OPEN_QUESTIONS.md for the `data.tucsonaz.gov` decision

---

## What's in the build at v1.0.0.0000

Six pages plus shared chrome:

| Page | URL | What it shows |
|---|---|---|
| Home | `/` | Status strip, six goal cards with counts, recently shipped panel, coming up panel |
| Roadmap | `/roadmap.html` | SVG timeline with six brand-colored lanes (one per Data Program Goal) plus Unclassified, today marker, click-to-modal |
| Portfolio | `/portfolio.html` | Six goal cards, each linking to the goal detail page |
| Goal detail | `/goal.html?goal=<slug>` | Narrative, status counts, full project list grouped by status |
| Item detail modal | (overlay on any page) | Full project card with leadership_summary, dates, lead team, alignment fields, "Open in tracker" link |

Plus:

- **Loading skeletons** on every section (light gray pulsing placeholders)
- **Error states** with a "Try again" button on every fetch
- **Self-hosted fonts** (Lato + Cardo, woff2 in `/assets/fonts/`)
- **Mobile-responsive** layout (status strip → 1-col, activity rows → date+status top, title below; timeline → horizontal scroll with swipe hint)
- **Open Graph + Twitter Card** meta tags on every page for rich link previews
- **Sitemap.xml + robots.txt** at the site root
- **Tracker deep-link integration** via `?project=P-NNN` (the tracker side reads this and opens the matching project)

---

## File layout

```
tucson-data-program-roadmap/
├── index.html               # Home page
├── roadmap.html             # Roadmap timeline page
├── portfolio.html           # Strategic portfolio (six goal cards)
├── goal.html                # Goal detail (template, takes ?goal=<slug>)
├── sitemap.xml              # Lists all 9 indexable URLs
├── robots.txt               # Points at sitemap, allows all
├── README.md                # Public-facing overview, status, run instructions
├── PRODUCTION_DEPLOY_CHECKLIST.md  # Full launch runbook
├── HANDOFF.md               # This file
├── DECISIONS.md             # Why the code is this way
├── OPEN_QUESTIONS.md        # Pending items and deferred work
├── css/
│   ├── fonts.css            # @font-face declarations for self-hosted Lato + Cardo
│   ├── tokens.css           # CSS custom properties (colors, spacing, type scale)
│   ├── base.css             # Layout primitives, header band, containers
│   └── components.css       # Goal cards, activity rows, timeline, modal, skeletons, error states
├── js/
│   ├── config.js            # APP_VERSION, DATA_PROGRAM_GOALS array, fiscal-year helpers
│   ├── data.js              # AGOL queries (sole swap point for live ↔ stub)
│   ├── modal.js             # Item detail modal — used by all pages
│   ├── ui-state.js          # Loading skeletons + error state helpers (startLoading, showError)
│   └── pages/
│       ├── home.js
│       ├── roadmap.js
│       ├── portfolio.js
│       └── goal.js
└── assets/
    ├── tucson-data-logo.png + .svg
    ├── tucson-data-mark.png + .svg
    ├── favicon.png + .ico
    └── fonts/
        ├── lato-400.woff2, lato-700.woff2, lato-900.woff2
        └── cardo-400.woff2, cardo-400-italic.woff2, cardo-700.woff2
```

---

## Versioning conventions

- **MAJOR** — fundamental capability change (v0 → v1 was production launch)
- **MINOR** — new capability that didn't exist before (new page, new behavior)
- **PATCH** — focused improvement round within an existing feature
- **BUILD** — single-commit fix or tweak

Every release also bumps the cache-bust query string (`?v=N`) on every CSS and JS import — including JS-internal imports inside modules. Cache-bust counter is independent of the app version (currently at `?v=32`).

Publish procedure:

1. Update `APP_VERSION` in `js/config.js`
2. Update version footers in all four HTML files
3. Update `README.md` and `PRODUCTION_DEPLOY_CHECKLIST.md` if relevant
4. Bump cache-bust strings on all CSS/JS imports (HTML + internal JS imports)
5. Copy the build to outputs
6. Commit: `vX.X.X.XXXX — short description`
7. Push to `main`

---

## How the AGOL data flows

`js/data.js` is the single boundary between the app and AGOL. Every fetch goes through it. If you ever need to swap from live AGOL to a JSON stub for testing, this is the only file to edit.

Key fields used from the feature service:

- `ObjectId` — AGOL primary key (used internally, never in URLs)
- `project_number` — stable human-meaningful identifier in `P-NNN` format. **Used for tracker deep-links.**
- `title`, `leadership_title`, `leadership_summary` — display copy
- `status` — Active, Scheduled, Future, Idea, On Hold, Waiting, Complete, Canceled
- `partner_dept` — owning department
- `dp_goal_*` boolean fields — which Data Program Goals this project ladders to (multi-select)
- `primary_dp_goal` — single goal for lane assignment
- `start_date`, `working_due`, `actual_end` — timeline anchors
- `is_data_program` (filter) — must equal 1
- `public_visibility` (filter) — must equal 1 or be null

---

## How a fetch works (the pattern every page uses)

```js
import { startLoading, showError } from '../ui-state.js?v=32';

async function renderSomething() {
  const target = document.getElementById('some-slot');
  const loading = startLoading(target, 'goal-grid');  // shows skeleton

  try {
    const data = await getProjectsByGoal();
    loading.cancel();
    target.innerHTML = renderCards(data);
  } catch (err) {
    loading.cancel();
    showError(target, {
      title: "Couldn't load…",
      error: err,
      onRetry: renderSomething   // Try again button calls this
    });
  }
}
```

`startLoading` also surfaces a "Still loading…" hint after 5 seconds if the fetch hasn't resolved.

---

## How the tracker deep-link works

When a user clicks "Open in tracker" in the modal:

1. Tucson DATA opens `https://psjohnso.github.io/analytics-tracker/?project=P-NNN`
2. The tracker's `handleDeepLink()` function reads `?project=` from the URL
3. It looks up the project by `project_number` (with `objectId` as fallback)
4. Calls the tracker's `openProject(target.objectId)` to display the modal
5. Cleans the URL via `history.replaceState` so refresh doesn't re-open the modal

The function lives in the tracker's `index.html` and runs after the initial AGOL load completes. It was added in a separate session in the tracker repo.

---

## Local development

```bash
cd tucson-data-program-roadmap
python3 -m http.server 8080
# Open http://localhost:8080/
```

No build step. No npm install. Edit a file, refresh the browser.

---

## Verifying things work after a deploy

The full checklist is in `PRODUCTION_DEPLOY_CHECKLIST.md`. The shortest version:

1. Visit each page in order: home, roadmap, portfolio, a goal page
2. Click a project anywhere — modal should open with all fields populated
3. Click "Open in tracker" — should land on the right project in the tracker
4. Paste the URL into Slack — should render a card with logo, title, description
5. Open DevTools, throttle to "Slow 3G", reload — should see skeleton placeholders
6. Resize the browser to 390px wide — layout should still work

---

## What this app deliberately doesn't do (yet)

- No editing — the tracker is the only edit surface
- No filters — every visit shows all visible Data Program projects
- No sharing modal — to share a view, you copy the URL
- No analytics — we don't currently know who visits or what they look at
- No background refresh — the data is fetched on page load and stays static
- No accounts, no auth, no personalization

These are Phase 2 candidates. See OPEN_QUESTIONS.md.
