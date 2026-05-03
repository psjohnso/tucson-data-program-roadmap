# Tucson DATA — DECISIONS

Architectural decisions and their reasoning. The "why" behind the code.

If you find yourself thinking "I'd build this differently" — read the relevant entry here first. There's probably a reason.

---

## Two-app architecture (tracker as system of record, Tucson DATA as public face)

**Decision:** The tracker is the only place where data is edited. Tucson DATA is read-only and pulls from the same AGOL feature services.

**Why:** Single source of truth. Avoids reconciliation problems. The pitch to leadership is cleaner — "we have a system of record, this is its public face." Decision is documented as the first principle in HANDOFF.md.

**Implication:** Any new field needed by Tucson DATA must be added to the tracker's schema and made available via the AGOL feature service first. Tucson DATA never writes.

---

## Tech stack: plain HTML + CSS + vanilla JS, no build step

**Decision:** No bundler, no transpiler, no framework. ES modules, fetch API, modern CSS.

**Why:**

- City IT environment is unpredictable; fewer moving parts = fewer things that break
- Editing is direct and obvious — open file, change file, refresh browser
- Matches the tracker, which uses the same approach
- Public-facing static site has no server-side anything; build steps add complexity for no gain

**Implication:** When tempted to add a framework, library, or build step, the bar is high. Single-file additions like Lucide icons via CDN are fine; switching to React or adding webpack is not.

---

## Roadmap lanes are Data Program Goals, not departments

**Decision:** The six lanes on the roadmap timeline are the six Data Program Goals (Governance, Quality & Access, Security, Literacy & Culture, Architecture, Business Needs). Not department lanes.

**Why:** All Data Program work currently lives in IT. Department lanes would produce one fat lane and five empty ones. Goal lanes communicate *what kind of work* is happening, which is what leadership cares about.

**Implication:** When the data program eventually expands beyond IT, this might need to be revisited. For now, goal lanes are the right framing.

---

## URLs use `project_number` (P-NNN), not `ObjectId`

**Decision:** External-facing project identifiers use the `project_number` field (format: `P-NNN`). ObjectId is used internally but never exposed in URLs.

**Why:**

- ObjectId is AGOL-managed and can drift if records are rebuilt or migrated. Bookmarks would silently break.
- ObjectId leaks an implementation detail of the backend
- ObjectId is meaningless to humans; project_number reads like the team already talks about projects

The team is also planning to retire the older DP-XXX numbering scheme; project_number is the future identifier.

**Implication:** Every Data Program project must have a `project_number`. As of v1.0.0.0000 all 67 do. New projects created in the tracker need to either auto-assign one or have it required at creation.

---

## Self-hosted fonts (woff2 in `/assets/fonts/`)

**Decision:** Lato and Cardo are shipped as woff2 files inside the repo, not loaded from Google Fonts.

**Why:**

- Eliminates the brief font-swap shimmy between pages (FOUT)
- No external request to Google on every page view (privacy posture for a city government site)
- Site works in environments where Google Fonts is blocked
- Fonts arrive cached with the rest of the bundle on second navigation

**Implication:** When adding a new font weight or style, download the woff2 file, put it in `/assets/fonts/`, and add an `@font-face` declaration in `css/fonts.css`. Don't reach for Google Fonts CDN.

**Cost:** ~126 KB of woff2 files in the repo. Acceptable.

---

## `scrollbar-gutter: stable` on the `html` element

**Decision:** The page reserves space for the vertical scrollbar even on pages that don't need one.

**Why:** Without this, the home page (tall, has scrollbar) and the goal page (short, no scrollbar) had different effective viewport widths, causing the centered logo and title to shift horizontally when navigating between them. With `scrollbar-gutter: stable`, the layout width is identical on every page.

**Implication:** Modern browsers honor this. Older browsers (pre-Chrome 94, pre-Firefox 97, pre-Safari 17) ignore it gracefully — they get the shift, but they would have anyway.

---

## Subtitle on every page is one line, locked via CSS

**Decision:** Each page's subtitle is a single short sentence. CSS enforces single-line rendering with `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`.

**Why:** Multi-line subtitles caused the page title position to bob up and down between pages. Locking subtitles to one line keeps the chrome stable.

**Implication:** When adding a new page, write a subtitle that fits on one line at typical desktop width. If it's truncating, shorten the copy — don't change the CSS.

---

## Multi-goal projects: every goal they touch (multi-count), not primary only

**Decision:** `getProjectsByGoal()` puts a project tagged with multiple Data Program Goals into *every* goal's bucket — not just its primary. A project tagged Governance + Quality with primary=Quality appears under both the Governance card and the Quality card. The roadmap timeline (which uses `laneGoalFor()` directly) still single-buckets by primary goal so each project shows on exactly one lane.

**Why:**

- Status-strip filtering (and the global filter system in general) checks `projectGoals(p)` — multi-tag matching. Pre-v1.2.0.0002 the home/portfolio goal cards used `laneGoalFor()` (primary only), producing a different count than the strip for the same goal — confusing under filter.
- Multi-count answers the framing leadership cares about: "how many projects touch each goal?"
- The trade-off — totals across goal cards exceed total projects — is acceptable; each card answers a per-goal question, not a portfolio-share question.

**Implication:** Goal cards on home, portfolio, and goal-detail use multi-count via `projectGoals(p)`. The roadmap timeline keeps single-bucketing via `laneGoalFor()` for visual clarity (one bar per project per timeline). New views that sum projects across goals must remember that totals will exceed the project count.

---

## `js/data.js` is the sole swap point for live ↔ stub data

**Decision:** Every AGOL fetch goes through functions in `js/data.js`. No page-level fetches.

**Why:** This was the original boundary between Phase 1 (seed JSON) and Phase 2 (live AGOL). The seed phase is over but the boundary remains useful — for testing, for any future cache layer, for swapping backends.

**Implication:** Don't put `fetch()` calls directly in page-level JS. If you need new AGOL data, add a function to `data.js` and import it.

---

## Loading skeletons, not "Loading..." text

**Decision:** Every section that fetches data shows a light gray pulsing placeholder of the right shape, not a text label.

**Why:**

- Layout doesn't pop into existence; sections fill in instead
- Communicates "this is going to be content" rather than "this is broken"
- Matches the perceived quality of consumer-grade tools

The shape-specific skeletons (status strip, goal grid, feed, timeline, project list) are defined in `css/components.css` under `.skel-*` classes. The factory functions are in `js/ui-state.js`.

**Implication:** When adding a new section that fetches data, either pick an existing skeleton kind (`'goal-grid'`, `'feed'`, etc.) that fits or add a new one. Don't show "Loading...".

---

## Errors show a Retry button, not a stack trace

**Decision:** When a fetch fails, the affected section shows a clean error block with a friendly message and a "Try again" button. Console gets the technical details for debugging.

**Why:** Most AGOL errors are transient (network blip, momentary service issue). A retry button often resolves them in one click. Burying the error in a console message would hide the failure from the user; showing a stack trace would scare them.

**Implication:** Every render function that calls AGOL must wrap its fetch in `startLoading()` / `showError()` from `ui-state.js`, with `onRetry` set to re-call itself. The pattern is consistent across all four pages.

---

## Mobile: status strip stacks 1-column, not 2

**Decision:** On `< 700px` viewports, the 5-card status strip becomes a single-column list (label left, value right) instead of a 2-column grid.

**Why:** A 5-cell grid in 2 columns leaves a dangling 5th cell. Single-column is cleaner and reads like a small data table. Three-column would also work but uses more vertical space.

---

## Mobile: timeline scrolls horizontally, with a swipe hint

**Decision:** On narrow viewports, the timeline canvas scrolls horizontally inside its container. Below it, an italic "Swipe the timeline to see more →" hint appears (mobile only).

**Why:** Squashing six lanes plus three years of dates into 390px would make the timeline unreadable. Horizontal scroll preserves legibility. The hint addresses discoverability — users sometimes don't realize horizontally-overflowing content can be scrolled.

**Earlier attempts that didn't work:** A right-edge fade via CSS `mask-image` faded the legend too. A pseudo-element overlay with `position: sticky` had layout issues. The text hint is simpler and more accessible.

---

## Modal goes full-screen on mobile

**Decision:** On narrow viewports, the item detail modal takes the full screen rather than being a centered card with backdrop.

**Why:** Mobile screens are too small for a centered card with surrounding backdrop — the card would be tiny and the backdrop would be wasted space. Full-screen treatment gives all available width to the content.

---

## GitHub Pages stale-HTML mitigation: `Cache-Control` meta hints

**Decision:** Every HTML page has `<meta http-equiv="Cache-Control" content="no-cache, must-revalidate">`.

**Why:** GitHub Pages caches HTML files for 10 minutes by default. This caused users to see stale pages after a deploy. The cache-bust query strings (`?v=N`) protect CSS and JS but can't be applied to HTML pages users navigate to directly.

**Implication:** Browsers honor this hint imperfectly. The fundamental fix is a custom domain with proper cache headers (see OPEN_QUESTIONS.md). For now, this reduces — but doesn't eliminate — the stale-page problem.

---

## Cache-bust counter (`?v=N`) is independent of app version

**Decision:** The `?v=21` you see on every CSS and JS import is a counter, not the app version. Bump it on every release that changes any CSS or JS.

**Why:** Originally the counter and the version were aligned. They drifted when the version bumped to v1.0.0.0000 and the counter only went from 20 → 21. Forcing them back into alignment would mean either a contrived version bump or a contrived counter jump. Cleaner to acknowledge they're separate things.

**Implication:** When releasing, bump cache-bust to N+1 regardless of the app version delta.

---

## Open Graph meta on every page

**Decision:** Every HTML page has Open Graph + Twitter Card meta tags with page-specific titles and descriptions.

**Why:** When someone shares a Tucson DATA URL in Slack, email, or social, the link should render a rich preview with the logo. Without OG tags, you get a bare URL.

**Implication:** When adding a new page, copy the meta block from `index.html` and update the `og:title`, `og:description`, and `og:url` to match.

---

## Browser localStorage is not used

**Decision:** No `localStorage`, no `sessionStorage`, no IndexedDB.

**Why:** No personalization. No saved filters. No state to persist. The app is purely a read-only view of live data. Adding storage would create a class of bugs (stale state, sync issues with live data) for no benefit.

**Implication:** If a feature in Phase 2 wants to remember user preferences, this decision needs to be revisited explicitly.
