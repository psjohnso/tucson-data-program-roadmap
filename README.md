# Tucson DATA

Leadership-facing window onto the City of Tucson Data Team's data program portfolio. Reads live from the same AGOL feature services the team's internal Analytics Project Tracker writes to. Read-only.

**Current version:** 1.0.0.0000

---

## Status

**Phase 1 complete.** v1.0.0.0000 is the production launch release.

- ✅ Chunk 1.1 — project skeleton with COT brand
- ✅ Chunk 1.2 — live data layer (AGOL feature service)
- ✅ Chunk 1.3 — workspace home (status strip, goal cards, recently shipped + coming up)
- ✅ Chunk 1.4 — roadmap timeline canvas
- ✅ Chunk 1.5 — item detail modal
- ✅ Chunk 1.6 — strategic portfolio view
- ✅ Chunk 1.7 — goal detail page
- ✅ Chunk 1.8/1.9 — loading skeletons + error states with retry
- ✅ Chunk 1.10 — mobile pass
- ✅ Chunk 1.11 — production deploy checklist + Open Graph + sitemap

See `PRODUCTION_DEPLOY_CHECKLIST.md` for the launch runbook.

See the project documentation in Claude.ai for the full plan and Phase 2 ideas.

## Run locally

```bash
# From the tucson-data/ directory
python3 -m http.server 8080
# Then open http://localhost:8080/
```

Don't open the .html files via `file://` — ES modules and AGOL fetches need an HTTP server.

## Deployment

Static files on GitHub Pages, no build step.

1. Replace files in your local `tucson-data-program-roadmap` clone (keep the `.git` folder)
2. GitHub Desktop → review changes → commit → push
3. Wait ~60 seconds, hard-refresh once

## Cache-busting protocol — IMPORTANT

GitHub Pages caches static files aggressively. To force browsers to fetch new versions, every file reference uses a `?v=N` query string:

- HTML files reference CSS/JS as `css/base.css?v=4`, `js/pages/home.js?v=4`, etc.
- JS modules reference each other as `import { ... } from '../data.js?v=4'`

**On every release, the version number in `?v=` must be bumped consistently across:**
- All `<link>` and `<script>` tags in all HTML files
- All `import` statements in `data.js`, `pages/home.js`, `pages/portfolio.js`, `pages/roadmap.js`
- The `APP_VERSION` constant in `js/config.js`
- The footer text `v0.1.0.NNNN` in all HTML files

If even one of these is missed, browsers may load a mix of old and new files, which can cause errors like *"module does not provide an export named X"* (one stale, one fresh).

A simple grep-and-replace handles it. From the project root:

```bash
# Bump query strings (replace 4 with old version, 5 with new)
find . -type f \( -name "*.html" -o -name "*.js" \) -exec sed -i 's/?v=4/?v=5/g' {} +

# Bump version footer
find . -type f -name "*.html" -exec sed -i 's/v0\.1\.0\.0004/v0.1.0.0005/g' {} +

# Bump APP_VERSION in config
sed -i "s/APP_VERSION = '1.0.0.0000'/APP_VERSION = '0.1.0.0005'/" js/config.js
```

## File layout

```
tucson-data/
├── index.html              Workspace home — status strip, goal cards, activity feed
├── roadmap.html            Roadmap timeline canvas (skeleton until chunk 1.4)
├── portfolio.html          Strategic Portfolio View — six goal cards
├── css/
│   ├── tokens.css          COT brand colors, typography, spacing
│   ├── base.css            Reset, layout, header band, primitives
│   └── components.css      Goal cards, portfolio cards, activity rows
├── js/
│   ├── config.js           Goals, statuses, fiscal calendar
│   ├── data.js             AGOL data access layer
│   └── pages/
│       ├── home.js         Home page renderer
│       ├── roadmap.js      (stub for chunk 1.4)
│       └── portfolio.js    Portfolio page renderer
└── assets/
    ├── tucson-data-logo.png    Full logo for header
    ├── tucson-data-mark.png    Square mark
    ├── favicon.png             16x16 PNG favicon
    └── favicon.ico             Multi-size ICO favicon
```

## Architecture

- **System of record:** the Analytics Project Tracker (`psjohnso/analytics-tracker`). All editing happens there.
- **This app:** read-only window. Visibility predicate `is_data_program=1 AND (public_visibility=1 OR public_visibility IS NULL)` enforced server-side in the AGOL query.
- **Data layer:** `js/data.js` queries the AGOL `projects_view` feature service directly with anonymous read.

For the full architectural documentation, see `LEADERSHIP_APP_REFERENCE.md` in the Claude.ai project knowledge.

## Versioning

Follows the tracker's convention: `MAJOR.MINOR.PATCH.BUILD`.

- **MAJOR** for the kind of capability change that fundamentally changes what the app is
- **MINOR** for new capabilities (a new page, a new behavior)
- **PATCH** for focused improvement rounds within an existing feature
- **BUILD** for single-commit fixes/tweaks
