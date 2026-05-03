/* ─────────────────────────────────────────────────────────────────────────
   releases.js — "What's new" page

   Two sources of truth, joined by version number:
     - GitHub commits API → team-voice tagline (the commit subject)
     - releases.json      → leadership-voice paragraph (hand-written)

   Filter: only releases where BUILD == 0 (so PATCH bumps and larger appear,
   single-commit BUILD tweaks are folded into the next PATCH summary).
   ───────────────────────────────────────────────────────────────────────── */

import { startLoading, showError } from '../ui-state.js?v=32';

const COMMITS_URL    = 'https://api.github.com/repos/psjohnso/tucson-data-program-roadmap/commits?per_page=100';
const LEADERSHIP_URL = 'releases.json';

// Match a versioned commit subject like "v1.0.0.0000 — short description".
// Accepts em dash, en dash, or hyphen.
const VERSION_RE = /^v(\d+)\.(\d+)\.(\d+)\.(\d+)\s*[—–-]\s*(.+)$/;

async function loadReleases() {
  const slot = document.getElementById('releases-list');
  const loading = startLoading(slot, 'feed', { rows: 4 });

  try {
    const [commits, leadership] = await Promise.all([
      fetchJson(COMMITS_URL, 'GitHub commits API'),
      fetchJson(LEADERSHIP_URL, 'releases.json').catch(() => ({ releases: [] }))
    ]);

    loading.cancel();

    // Index leadership entries by version for O(1) lookup
    const leadByVersion = Object.fromEntries(
      (leadership.releases || []).map(e => [e.version, e])
    );

    const releases = parseReleases(commits, leadByVersion);

    if (releases.length === 0) {
      slot.innerHTML = `<p class="muted" style="padding: var(--space-6);">No releases to show yet.</p>`;
      return;
    }

    slot.innerHTML = renderReleases(releases);
  } catch (err) {
    loading.cancel();
    console.error('Releases page failed to load:', err);
    showError(slot, {
      title: "Couldn't load release history",
      message: err?.message?.includes('rate limit')
        ? "GitHub API rate limit reached. This usually clears within an hour."
        : "There was a problem reaching GitHub. This is usually temporary.",
      error: err,
      onRetry: loadReleases
    });
  }
}

async function fetchJson(url, label) {
  const res = await fetch(url);
  if (!res.ok) {
    if (res.status === 403) throw new Error(`${label}: rate limit or forbidden (${res.status})`);
    throw new Error(`${label}: HTTP ${res.status}`);
  }
  return res.json();
}

function parseReleases(commits, leadByVersion) {
  const out = [];
  const seen = new Set();
  for (const c of commits) {
    const subject = (c.commit?.message || '').split('\n')[0];
    const m = subject.match(VERSION_RE);
    if (!m) continue;
    const [, major, minor, patch, build, tagline] = m;
    if (Number(build) !== 0) continue;          // skip BUILD bumps
    const version = `${major}.${minor}.${patch}.${build}`;
    if (seen.has(version)) continue;            // dedupe (e.g. amend)
    seen.add(version);
    out.push({
      version,
      date: (c.commit?.author?.date || '').slice(0, 10),
      tagline: tagline.trim(),
      leadership: leadByVersion[version]?.leadership || null
    });
  }
  return out;
}

function renderReleases(releases) {
  return `
    <div class="releases">
      ${releases.map(renderRelease).join('')}
    </div>`;
}

function renderRelease(r) {
  return `
    <article class="release">
      <header class="release__header">
        <h2 class="release__version">v${escape(r.version)}</h2>
        <time class="release__date" datetime="${escape(r.date)}">${escape(formatDate(r.date))}</time>
      </header>
      <div class="release__section-label">What changed</div>
      ${r.leadership
        ? `<p class="release__leadership prose">${escape(r.leadership)}</p>`
        : `<p class="release__leadership release__leadership--empty">No summary available for this release.</p>`}
      <div class="release__section-label release__section-label--secondary">Release tagline</div>
      <p class="release__tagline">${escape(r.tagline)}</p>
    </article>`;
}

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

loadReleases();
