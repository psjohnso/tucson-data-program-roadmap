/* ─────────────────────────────────────────────────────────────────────────
   portfolio.js — strategic portfolio view
   Renders six goal cards, one per Data Program Goal, with status counts and
   a sample of project titles drawn from the AGOL service.
   ───────────────────────────────────────────────────────────────────────── */

import { getProjectsByGoal, projectDisplayTitle } from '../data.js?v=9';
import { DATA_PROGRAM_GOALS } from '../config.js?v=9';

const SAMPLE_LIMIT = 4;
const STATUS_PRIORITY = ['Active', 'Scheduled', 'Future', 'Idea', 'Waiting', 'On Hold', 'Complete', 'Canceled'];

async function renderPortfolio() {
  const target = document.getElementById('portfolio-grid');
  if (!target) return;

  try {
    const groups = await getProjectsByGoal();

    target.innerHTML = DATA_PROGRAM_GOALS.map(goal => {
      const projects = groups[goal.value] || [];
      const counts = projects.reduce((acc, p) => {
        acc[p.status || 'Unknown'] = (acc[p.status || 'Unknown'] || 0) + 1;
        return acc;
      }, {});
      const sortedProjects = [...projects].sort((a, b) => {
        const ai = STATUS_PRIORITY.indexOf(a.status); const bi = STATUS_PRIORITY.indexOf(b.status);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      });
      const sampleProjects = sortedProjects.slice(0, SAMPLE_LIMIT);
      const remaining = Math.max(0, projects.length - SAMPLE_LIMIT);

      return `
        <article class="portfolio-card" style="--goal-accent: ${goal.color};">
          <header class="portfolio-card__header">
            <h2 class="portfolio-card__title">${escape(goal.short)}</h2>
            <div class="portfolio-card__count-total">${projects.length}</div>
          </header>
          <p class="portfolio-card__desc">${escape(goal.description)}</p>
          <div class="portfolio-card__counts">
            ${renderCount(counts['Active'],    'Active',    'var(--status-active)')}
            ${renderCount(counts['Scheduled'], 'Scheduled', 'var(--status-scheduled)')}
            ${renderCount(counts['Future'],    'Future',    'var(--status-future)')}
            ${renderCount(counts['Idea'],      'Under review', 'var(--status-idea)')}
            ${renderCount(counts['Complete'],  'Shipped',   'var(--status-complete)')}
            ${renderCount(counts['Canceled'],  'Cancelled', 'var(--status-canceled)')}
          </div>
          ${sampleProjects.length ? `
            <ul class="portfolio-card__projects">
              ${sampleProjects.map(p => `
                <li>
                  <span class="status-dot" style="background: ${STATUS_COLOR_VAR[p.status] || 'var(--text-tertiary)'};" aria-hidden="true"></span>
                  ${escape(projectDisplayTitle(p))}
                </li>`).join('')}
            </ul>
            ${remaining > 0 ? `<div class="portfolio-card__more muted">+ ${remaining} more</div>` : ''}
          ` : `
            <p class="portfolio-card__empty muted">No projects tagged to this goal yet.</p>
          `}
        </article>`;
    }).join('');

    // After the six brand cards, if any projects fall under "Unclassified"
    const unclassified = groups['Unclassified'] || [];
    if (unclassified.length) {
      const orphans = document.getElementById('orphans');
      if (orphans) {
        orphans.innerHTML = `
          <div class="section-heading">Unclassified Data Program work</div>
          <p class="muted" style="margin-bottom: var(--space-3);">
            These projects are flagged as Data Program but don't have a Data Program Goal set yet.
          </p>
          <ul class="orphan-list">
            ${unclassified.slice(0, 10).map(p => `
              <li>
                <span class="status-dot" style="background: ${STATUS_COLOR_VAR[p.status] || 'var(--text-tertiary)'};" aria-hidden="true"></span>
                ${escape(projectDisplayTitle(p))}
                <span class="faint" style="margin-left: var(--space-2);">${escape(p.status || '')}</span>
              </li>`).join('')}
          </ul>
          ${unclassified.length > 10 ? `<div class="muted" style="margin-top: var(--space-2);">+ ${unclassified.length - 10} more</div>` : ''}
        `;
      }
    }
  } catch (err) {
    console.error('Failed to render portfolio:', err);
    target.innerHTML = `<p class="muted">Couldn't load portfolio data. ${escape(err.message || err)}</p>`;
  }
}

const STATUS_COLOR_VAR = {
  'Active':    'var(--status-active)',
  'Scheduled': 'var(--status-scheduled)',
  'Future':    'var(--status-future)',
  'Idea':      'var(--status-idea)',
  'On Hold':   'var(--status-onhold)',
  'Waiting':   'var(--status-waiting)',
  'Complete':  'var(--status-complete)',
  'Canceled':  'var(--status-canceled)'
};

function renderCount(n, label, color) {
  if (!n) return '';
  return `<span class="portfolio-card__count" style="color: ${color};"><strong>${n}</strong> ${escape(label.toLowerCase())}</span>`;
}

function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

renderPortfolio();
