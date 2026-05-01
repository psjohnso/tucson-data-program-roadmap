# Tucson DATA

Leadership-facing window onto the City of Tucson Data Team's data program portfolio. Reads from the same AGOL feature services the team's internal Analytics Project Tracker writes to. Read-only.

**Current version:** 0.1.0.0001 (Phase 1, chunk 1.1 — project skeleton)

---

## Status

Chunk 1.1 done. Three pages render the COT-branded header band and link to each other. Status strip on the home page is wired to a live data layer reading a placeholder seed.json with 3 sample projects.

Next: chunk 1.2 — replace seed.json with the real export of 39 Data Program projects from the tracker.

See `SPRINT_PLAN.md` for the full chunk-by-chunk plan.

## Run locally

This is a static site — no build step. Any static file server works.

```bash
# From the tucson-data/ directory
python3 -m http.server 8080

# Then open http://localhost:8080/
```

Don't open the .html files via `file://` — modules and `fetch('data/seed.json')` need an HTTP server.

## File layout

```
tucson-data/
├── index.html              Workspace home
├── roadmap.html            Roadmap timeline canvas (skeleton)
├── portfolio.html          Strategic Portfolio View (skeleton)
├── css/
│   ├── tokens.css          Design tokens — COT brand, status colors, sizing
│   └── base.css            Reset, typography, layout, header band, primitives
├── js/
│   ├── config.js           Goals, statuses, fiscal calendar
│   ├── data.js             Data access layer (Phase 1 reads seed.json;
│   │                       Phase 2 swaps to live AGOL queries)
│   └── pages/
│       ├── home.js         Wires status strip to live counts
│       ├── roadmap.js      (stub for chunk 1.4)
│       └── portfolio.js    (stub for chunk 1.6)
├── data/
│   └── seed.json           Phase 1 placeholder data — 3 sample projects
└── assets/                 (logo and brand assets go here)
```

## Asset placeholders

- The mark in the header is a CSS-drawn placeholder. Replace with the real COT mosaic SVG when available — drop it at `assets/mosaic.svg` and update `.header-mark` in `base.css` to render `<img src="assets/mosaic.svg">` instead of the placeholder div.

## Architecture quick reference

- **System of record:** the Analytics Project Tracker (`psjohnso/analytics-tracker`). All editing happens there.
- **This app:** read-only window. Visibility predicate `is_data_program=1 AND public_visibility=1` enforced in `js/data.js`.
- **Phase 1 → Phase 2 swap:** only `js/data.js` changes. Pages and components call its public functions and don't care about the source.

For the full architectural documentation, see `LEADERSHIP_APP_REFERENCE.md` in the project knowledge.

## Versioning

Follows the tracker's convention: `MAJOR.MINOR.PATCH.BUILD`. Update `APP_VERSION` in `js/config.js` and the footer text in each HTML page on every bump.
