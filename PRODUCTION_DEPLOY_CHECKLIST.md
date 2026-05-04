# Production Deploy Checklist

A runbook for promoting Tucson DATA from "deployable" to "shareable with leadership and the public." Walk through each section before announcing the URL.

**Current version:** v1.0.0.0000 (production launch release)

---

## v1.0.0.0000 — Phase 1 production launch

This is the first production release of Tucson DATA. The version bump from v0.1.x to v1.0.0 reflects that the app is no longer in active development — every Phase 1 chunk is complete, the chrome is stable, mobile works, error handling is in place, and the link previews are ready for sharing.

**What v1.0.0 includes:**

- Full leadership-facing portfolio view of the City of Tucson Data Program
- Live data from the team's tracker via AGOL feature services
- Six pages: home, roadmap, portfolio, goal detail (one template, six goals), item detail modal
- Self-hosted fonts, brand-correct logo, stable chrome across pages
- Loading skeletons and error states with retry on every fetch
- Mobile-responsive layout
- Open Graph + Twitter Card meta for link previews
- Sitemap + robots.txt for search engine indexing
- Deep-link integration with the analytics-tracker app via `?project=P-NNN`

**What's deferred to Phase 2:**

Filter modal, sharing modal, department views, investment heatmap, background data refresh, release notes page. See the bottom of this document.

---

## What's already done in v1.0.0.0000

These are baked into the build — nothing more to do for them, just verify they work after deploy:

- ✅ **Open Graph meta tags** on every page. Sharing a Tucson DATA link in Slack, Teams, or email will render a rich preview card with title, description, and the logo.
- ✅ **Twitter Card meta tags** for the same purpose on X / Twitter.
- ✅ **Canonical URLs** on every page (avoids duplicate-content issues if the site gets accessed via multiple URLs in the future).
- ✅ **Robots meta** set to `index, follow` — search engines are welcome.
- ✅ **`sitemap.xml`** at the site root listing all 9 pages (4 main + 5 visible goal slugs). Submit this to Google Search Console once the site is public.
- ✅ **`robots.txt`** at the site root, points at the sitemap.
- ✅ **HTML cache-control hints** (`no-cache, must-revalidate`) to reduce browser caching of HTML — helps mitigate the "users see stale pages after a deploy" problem on github.io domains.

After deploy, verify the OG tags work:

1. Open https://www.opengraph.xyz/ in a browser
2. Paste your Tucson DATA URL into the validator
3. Confirm the preview shows the logo, title, and description
4. Repeat for each main page

You can also test in Slack directly — paste the URL into a private channel and look at the preview card.

---

## Decisions you need to make before launch

### 1. Custom domain question

**Current URL:** `https://psjohnso.github.io/tucson-data-program-roadmap/`

That URL works but reads as "Peter's personal GitHub project," not "official City of Tucson tool." For a leadership-facing public surface, a custom domain like `data.tucsonaz.gov` would be better.

**What it would take:**

- IT request to the city's DNS team to create a CNAME record pointing `data.tucsonaz.gov` to `psjohnso.github.io`
- Add a `CNAME` file at the repo root containing just `data.tucsonaz.gov`
- GitHub Pages settings → Custom Domain field set to `data.tucsonaz.gov`
- Wait for DNS propagation (usually under an hour)
- HTTPS auto-provisions via GitHub's Let's Encrypt integration
- Update all the canonical URLs, og:url tags, and the sitemap to use the new domain

**Decision:** Are you launching at the github.io URL (faster, no IT dependency) or going through the custom-domain path (better optics, takes time)?

### 2. Public vs. internal launch

Three flavors of "launch":

- **Truly public** — share with anyone, including residents. Index in Google. Promote on social.
- **Leadership / staff only** — share with named audiences (DGEC, IT leadership, department directors). Discoverable only via the link, not actively indexed.
- **Soft launch** — share with the data team and a few trusted leadership voices first; gather feedback for 1-2 weeks; then promote.

The technical setup is the same for all three; the difference is in audience and announcement strategy. If you want to delay indexing while you soft-launch, change `<meta name="robots" content="index,follow">` to `noindex,nofollow` until you're ready, then bump back.

### 3. Analytics

The site currently has no analytics — we don't know who's visiting, which pages they land on, or whether the timeline gets used. Adding lightweight analytics is one of the few changes I'd recommend before sharing widely.

**Options:**

- **Plausible Analytics** ($9/mo) — privacy-first, no cookies, simple dashboard. Single script tag.
- **Google Analytics 4** (free) — full-featured but heavier and has privacy implications for a city government site.
- **Simple Analytics** (~$10/mo) — privacy-first alternative to Plausible.
- **None** — completely opt out. You won't know how the tool is being used.

If the data team is already using analytics elsewhere, match what's familiar.

### 4. Feedback loop

How does someone tell you the app misframed their project, or that a leadership_summary reads wrong, or that they want a feature?

Easiest options, in increasing effort:

- **A "Send feedback" link** in the footer pointing to `mailto:peter.johnson@tucsonaz.gov?subject=Tucson%20DATA%20feedback` — zero infrastructure, works immediately
- **A small Microsoft Form** linked from the footer — collects structured feedback into a spreadsheet
- **A GitHub Issues link** — appropriate if the audience is technical, less so for leadership

I'd suggest the mailto link as the v1 — low effort, easy to upgrade later.

---

## Pre-launch verification (do this on the live site)

Walk through the site once after deploying v1.0.0.0000. Check each item:

### Functional

- [ ] Home page loads and shows real status counts
- [ ] Goal cards on the home page display correct counts
- [ ] Recently shipped panel shows real projects with leadership_titles
- [ ] Coming up panel shows correct upcoming projects
- [ ] Roadmap timeline renders all six lanes plus Unclassified if applicable
- [ ] Today marker appears at the correct horizontal position
- [ ] Clicking a timeline bar opens the modal with project details
- [ ] Modal shows leadership_summary, dates, status, partner department, project number
- [ ] "Open in tracker" button in the modal opens the correct project in the tracker
- [ ] Portfolio page displays all six goal cards with brand-color stripes
- [ ] Clicking a goal card title navigates to the goal detail page
- [ ] Goal detail page shows the narrative, status counts, and project list grouped by status
- [ ] "Back to all goals" link from the goal page returns to the portfolio

### Visual

- [ ] Logo and title don't shift when navigating between pages
- [ ] Subtitles are one line on every page
- [ ] Header band height is consistent across all pages
- [ ] Footer shows v1.0.0.0000

### Mobile

- [ ] Home page status strip stacks to single column
- [ ] Activity rows show date+status on top line, title below
- [ ] Roadmap timeline scrolls horizontally with the swipe hint
- [ ] Modal goes full-screen on mobile
- [ ] Tap targets are reachable with one thumb

### Link previews

- [ ] Pasting the URL into Slack shows a card with logo, title, description
- [ ] Same in email (Outlook web)
- [ ] og:image returns 200 OK when fetched directly: `https://psjohnso.github.io/tucson-data-program-roadmap/assets/tucson-data-logo.png`

### Loading and error states

- [ ] DevTools → Network → set to "Slow 3G" → reload home page → see skeleton placeholders fill the layout immediately
- [ ] Wait 5 seconds with throttle on → see "Still loading…" hint
- [ ] DevTools → Network → block `services3.arcgis.com` → reload → see error block with "Try again" button
- [ ] Click "Try again" with the block removed → page recovers

### Search engine readiness (only if launching publicly)

- [ ] `https://psjohnso.github.io/tucson-data-program-roadmap/sitemap.xml` returns 200 OK and is valid XML
- [ ] `https://psjohnso.github.io/tucson-data-program-roadmap/robots.txt` returns 200 OK
- [ ] Submit the sitemap to Google Search Console (after the site is public)
- [ ] Submit the sitemap to Bing Webmaster Tools (optional)

---

## Post-launch — first week

- [ ] Watch the modal "Open in tracker" link — confirm the deep-link actually opens projects in the tracker (the tracker patch from this session needs to be deployed too, if it hasn't been already)
- [ ] Check the leadership_summary text on a sample of projects in the modal — flag any that read wrong
- [ ] Look for the mojibake (`â€"` instead of `—`) noted in earlier sessions — if any leadership_summaries still have it, run the bulk-fix script
- [ ] If using analytics: review which pages get the most traffic; do users click into goal pages? Modal? Tracker links?
- [ ] If feedback link is set up: triage incoming feedback weekly

---

## Things to consider for Phase 2

(Not part of this checklist; just keeping a list so they don't get lost.)

- Filter modal — by status, goal, department
- Department views — slice portfolio by partner_dept rather than goal
- Sharing modal — generate shareable links to filtered views
- Investment heatmap — visualize where time and effort actually goes
- Background data refresh — instead of full-page reload to refresh data
- A "What's new" or release notes page so leadership knows when something changed
