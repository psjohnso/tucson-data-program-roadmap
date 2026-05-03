# Tucson DATA — project memory

> Read this first. For deeper context, follow the pointers below.

## What this is

A leadership-facing, read-only window onto the City of Tucson Data Team's
data program portfolio. Reads live from AGOL feature services that the
team's internal Analytics Project Tracker writes to.

**Two-app architecture:** the tracker writes; Tucson DATA reads. Tucson DATA
never writes. Any new field needed here must be added to the tracker's
schema and exposed via the AGOL feature service first.

## Read these for context

Before any non-trivial change, read the relevant doc:

- `HANDOFF.md` — current state, file layout, AGOL field mapping, fetch pattern
- `DECISIONS.md` — architectural decisions + reasoning. Do not propose
  changes that contradict locked decisions; if you think one needs to
  change, surface it as a question first.
- `OPEN_QUESTIONS.md` — pending decisions and Phase 2 candidates, ordered
  by urgency. The "what to work on next" doc.

## Tech stack — locked

- Plain HTML + CSS + vanilla JS. No build step. No bundler. No framework.
- ES modules, `fetch`, modern CSS.
- No `localStorage` / `sessionStorage` / IndexedDB. The app is read-only;
  there is no state to persist.
- Self-hosted fonts (Lato + Cardo as woff2 in `assets/fonts/`). Don't
  reach for Google Fonts CDN.
- All AGOL fetches go through `js/data.js`. No page-level `fetch()` calls.
- URLs use `project_number` (`P-NNN`), never `ObjectId`.

## Versioning rules

Format: `vMAJOR.MINOR.PATCH.BUILD`. Before bumping, identify which kind:

- **MAJOR** — fundamental capability change. (v0 → v1 was the production launch.)
- **MINOR** — new capability that didn't exist before (new page, new
  behavior). Resets PATCH + BUILD.
- **PATCH** — focused improvement round to an existing feature. Resets BUILD.
- **BUILD** — single-commit fix or tweak within an ongoing round.

When in doubt, ask which kind before bumping.

## Publish procedure

Every release does all of these:

1. Update `APP_VERSION` in `js/config.js`.
2. Update the version footer in all four HTML files (`index.html`,
   `roadmap.html`, `portfolio.html`, `goal.html`).
3. Bump the cache-bust query string (`?v=N` → `?v=N+1`) on every CSS/JS
   import — **including JS-internal imports inside modules**. The
   cache-bust counter is independent of the app version and bumps every
   release regardless of what changed.
4. Update `README.md` and `PRODUCTION_DEPLOY_CHECKLIST.md` only if relevant.
5. Commit: `vX.X.X.XXXX — short description`.
6. Push to `main`.

## Subtitle rule (commonly relevant)

Page subtitles are single-line, ellipsis-truncated by CSS. If a subtitle
truncates on a real viewport, **shorten the copy** — don't change the CSS.
The locked rule lives in `DECISIONS.md`.

## Working style

- **Preview before building.** For new features or non-trivial changes,
  describe or mock the approach and wait for explicit confirmation before
  editing files.
- **Check before proposing.** Don't propose schema additions, fields, or
  infrastructure that might already exist. Inspect the repo, AGOL schema,
  and the docs above first.
- **Crisp options, crisp answers.** When presenting a decision, list 2–4
  concrete options. Single-word or single-sentence replies from me are fine.
- **Think → discuss → confirm → build.** Don't jump straight to editing files
  when the task involves any judgment.

## Local dev

```
python3 -m http.server 8080
# http://localhost:8080/
```

No `npm install`. No build step. Edit a file, refresh the browser.

## Repo

- GitHub: `psjohnso/tucson-data-program-roadmap` (public)
- Live: `https://psjohnso.github.io/tucson-data-program-roadmap/`
- Custom domain (`data.tucsonaz.gov`) — pending; see `OPEN_QUESTIONS.md`.
