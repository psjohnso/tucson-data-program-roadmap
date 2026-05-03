# Tucson DATA — OPEN QUESTIONS

Things that are not yet decided, not yet done, or might need revisiting. The "what to work on next" doc.

Items are roughly ordered by urgency: launch-blocking decisions at the top, Phase 2 candidates further down.

---

## Decisions needed before public launch

### Launch shape

Three flavors of launch:

- **Truly public** — share with anyone including residents, index in Google, promote on social
- **Leadership / staff only** — share with named audiences, link-only discoverability
- **Soft launch** — data team and trusted leadership voices first, gather feedback for 1–2 weeks, then promote

Technical setup is the same for all three. The difference is audience and announcement strategy.

To delay search indexing while soft-launching, change `<meta name="robots" content="index,follow">` to `noindex,nofollow` and revert when ready.

### Custom domain (`data.tucsonaz.gov`)

Currently launching at `https://psjohnso.github.io/tucson-data-program-roadmap/` reads as a personal GitHub project. A custom domain would feel official.

What it takes:

1. IT request to the city DNS team for a CNAME record `data.tucsonaz.gov` → `psjohnso.github.io`
2. Add a `CNAME` file at the repo root with `data.tucsonaz.gov` as its only line
3. Set Custom Domain in GitHub Pages settings
4. Wait for DNS propagation (usually under an hour)
5. HTTPS auto-provisions via Let's Encrypt
6. Update canonical URLs, og:url tags, sitemap to use the new domain

The technical work is small. The IT/DNS request is the long pole.

### Analytics

Currently no analytics. We don't know who visits, which pages they land on, or whether the timeline gets used.

Options:

- **Plausible** ($9/mo) — privacy-first, no cookies, single script tag
- **Simple Analytics** (~$10/mo) — similar privacy posture
- **Google Analytics 4** (free) — full-featured but heavier and has privacy implications
- **None** — completely opt out

Plausible is the recommended path for a city government tool. If the data team is using analytics elsewhere, match what's familiar.

### Feedback loop

How does someone tell us the app misframed their project, or a leadership_summary reads wrong, or they want a feature?

Easiest first version: a "Send feedback" link in the footer pointing to `mailto:peter.johnson@tucsonaz.gov?subject=Tucson%20DATA%20feedback`. Zero infrastructure, can be upgraded to a Microsoft Form or GitHub Issues link later.

---

## Data quality items

### Mojibake in stored `leadership_summary`

A handful of records have `â€"` instead of `—` (em dash). Cause: UTF-8 round-tripped through Latin-1, likely from Excel saving CSV as Windows-1252 during an import.

Project P-165 was confirmed affected during build sessions. Others are unknown.

Fix options:

- **One-time bulk update via AGOL REST API** — script that fetches all records, identifies any with the pattern, replaces, updates. Probably 30 lines of Python.
- **Manual fix in the tracker** — find each affected record, clean the text by hand. Slow but no risk.
- **Fix at display time** — detect the pattern in `data.js` and replace before rendering. Hides the problem rather than fixing it; not recommended.

Recommend the bulk-update script. Could be a small standalone fix in a session.

### `working_due` dates that have passed but project is still Active

The "Coming Up" panel currently shows projects with `working_due` dates in the past or today, sorted ascending. So projects whose due date has passed but who are still Active appear at the top of the list, sometimes for weeks.

Two valid framings:

- **Stale-data signal** — if `working_due < today` and status is Active, surface this visually (red text, an "overdue" badge)
- **Filter out stale rows** — if `working_due < today - 7 days`, exclude from "Coming Up" entirely, on the assumption the date is just out of date

Right answer probably depends on whether the team treats `working_due` as a hard target or a planning estimate. Worth asking the team before implementing either.

---

## Open dual-counting question

### Goal lane assignment for multi-goal projects

A project can be tagged to multiple Data Program Goals (`dp_goal_*` boolean fields). The home page goal cards count multi-goal projects in *every* goal they touch, while the goal detail page counts only by `laneGoalFor()` (which uses `primary_dp_goal`, falling back to first goal in priority order).

Both views are valid:

- Home view answers "how many projects touch each goal"
- Goal detail view answers "what's primarily a Governance project"

But they produce different counts for the same goal, which can confuse leadership.

Options:

- **Document the difference** — add a tooltip or footnote on each view explaining the count semantics
- **Reconcile to a single rule** — pick one (probably the laneGoalFor rule) and use it everywhere
- **Show both** — on goal cards, "29 total · 12 primary"

Has not yet been escalated to the team. Probably worth a short conversation.

---

## Phase 2 candidates (deferred, no priority order)

### Filter modal

Currently every visit shows all visible Data Program projects. A filter modal with checkboxes for status, goal, and partner department would let leadership narrow the view. Could surface as a small filter button next to the section titles.

### Sharing modal

"Generate a shareable link to this filtered view" with a copy button. Needs filter state to be encoded in the URL first.

### Department views

Slice the portfolio by `partner_dept` instead of by goal. One card per department showing what they're working on. Useful when the data program expands beyond IT.

### Investment heatmap

Visualize where time and effort actually goes — by goal, by department, by quarter. Probably needs the time-tracking data from the tracker's `time_entries` feature service to be meaningful.

### What Works Cities certification view

Surface the WWC-tagged projects as a dedicated section showing progress against the eight practice areas and 43 criteria. This is an active strategic priority for the team and would be a natural Phase 2 addition.

### Background data refresh

Currently the data is fetched on page load and stays static. If a user keeps a tab open for an hour, they see stale data. Could add a periodic poll, a refresh button, or a "stale data" indicator.

### Release notes / "What's new" page

A dated changelog that leadership can check to see when something changed. Useful as the app evolves through Phase 2.

### Modal loading skeleton

The item detail modal still shows "Loading…" text rather than a proper skeleton when opening. Smaller surface than the page-level fetches, lower priority, but inconsistent with the rest of the app.

### Stale-HTML solution beyond `Cache-Control` meta hints

The cache-bust query strings protect CSS and JS but not HTML. The `Cache-Control` meta hint helps but isn't perfect. The real fix is a custom domain with proper edge cache headers — solved as a side effect of the custom domain decision above.

---

## Things that have been considered and rejected

Keep these here so they don't get re-proposed:

- **Hamburger menu on mobile** — only three nav items, no need
- **Touch gestures** (pinch-zoom timeline, swipe between pages) — significant complexity, marginal benefit
- **Mobile-specific routes or app** — same URLs work on every device
- **Authentication** — read-only public site, nothing to authenticate
- **localStorage / sessionStorage** — no personalization to persist
- **A bundler / build step** — adds complexity for a static site that doesn't need it
- **Switching from project_number to a slug-based URL** — `P-NNN` is what the team uses internally, slugs would be a translation layer for no benefit
