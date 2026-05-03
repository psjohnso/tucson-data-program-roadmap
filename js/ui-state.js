/* ─────────────────────────────────────────────────────────────────────────
   ui-state.js — loading and error state helpers

   Each page handles fetches with the same pattern:
     1. Render a skeleton for the section being loaded
     2. After ~5 seconds, surface a "Still loading…" hint
     3. After ~15 seconds with no response, treat as error
     4. On error, render the error block with a Retry button

   This module exports the building blocks so pages don't reinvent them.
   ───────────────────────────────────────────────────────────────────────── */

/** Skeleton markup factory. Pass a "kind" describing the shape needed. */
export function skeletonHtml(kind, opts = {}) {
  switch (kind) {
    case 'status-strip':
      return `
        <div class="skel-status-strip" aria-busy="true" aria-label="Loading status counts">
          ${[1,2,3,4,5].map(() => `
            <div class="skel-metric-card">
              <div class="skel"></div>
              <div class="skel"></div>
            </div>`).join('')}
        </div>`;
    case 'goal-grid':
      return `
        <div class="skel-grid" aria-busy="true" aria-label="Loading goals">
          ${[1,2,3,4,5,6].map(() => `
            <div class="skel-card">
              <div class="skel"></div>
              <div class="skel"></div>
              <div class="skel"></div>
              <div class="skel"></div>
            </div>`).join('')}
        </div>`;
    case 'feed':
      return `
        <div class="skel-feed" aria-busy="true" aria-label="Loading">
          ${Array.from({ length: opts.rows || 6 }).map(() => `
            <div class="skel-feed-row">
              <div class="skel"></div>
              <div class="skel"></div>
              <div class="skel"></div>
            </div>`).join('')}
        </div>`;
    case 'timeline':
      return `
        <div class="skel-timeline" aria-busy="true" aria-label="Loading timeline">
          <div class="skel-timeline__labels">
            ${[1,2,3,4,5,6].map(() => `<div class="skel"></div>`).join('')}
          </div>
          <div class="skel-timeline__bars">
            ${[1,2,3,4,5].map(() => `<div class="skel"></div>`).join('')}
          </div>
        </div>`;
    case 'project-list':
      return `
        <div class="skel-feed" aria-busy="true" aria-label="Loading projects">
          ${Array.from({ length: opts.rows || 8 }).map(() => `
            <div class="skel-feed-row">
              <div class="skel"></div>
              <div class="skel"></div>
              <div class="skel"></div>
            </div>`).join('')}
        </div>`;
    case 'modal':
      return `
        <div class="skel-modal" aria-busy="true" aria-label="Loading project details">
          <div class="skel-modal__header">
            <div class="skel-modal__eyebrow">
              <div class="skel"></div>
              <div class="skel"></div>
            </div>
            <div class="skel skel-modal__title"></div>
            <div class="skel skel-modal__subtitle"></div>
          </div>
          <div class="skel-modal__content">
            <div class="skel skel-modal__label"></div>
            <div class="skel skel-modal__line"></div>
            <div class="skel skel-modal__line"></div>
            <div class="skel skel-modal__line skel-modal__line--last"></div>
            <div class="skel-modal__meta-grid">
              <div class="skel-modal__meta-item">
                <div class="skel skel-modal__meta-label"></div>
                <div class="skel skel-modal__meta-value"></div>
              </div>
              <div class="skel-modal__meta-item">
                <div class="skel skel-modal__meta-label"></div>
                <div class="skel skel-modal__meta-value"></div>
              </div>
            </div>
          </div>
          <div class="skel-modal__footer">
            <div class="skel"></div>
          </div>
        </div>`;
    default:
      return `<div class="skel" style="height: 80px;"></div>`;
  }
}

/** Render a fetch-error block with a Retry button. */
export function errorHtml({ title, message, details, retryId }) {
  const retryAttr = retryId ? ` id="${retryId}"` : '';
  return `
    <div class="fetch-error" role="alert">
      <span class="fetch-error__icon" aria-hidden="true">⚠</span>
      <div class="fetch-error__title">${escape(title || "Couldn't load this section")}</div>
      <div class="fetch-error__message">${escape(message || "There was a problem reaching the data service. This is usually temporary.")}</div>
      ${details ? `<div class="fetch-error__details">${escape(details)}</div>` : ''}
      <button${retryAttr} class="fetch-error__retry" type="button">Try again</button>
    </div>`;
}

/** Mark a slot as loading: render skeleton, set up timeouts that surface
 *  "Still loading…" and eventually an error if the load doesn't complete. */
export function startLoading(slot, kind, opts = {}) {
  if (!slot) return { cancel: () => {} };
  slot.innerHTML = skeletonHtml(kind, opts);

  // After 5s, if still loading, surface a "Still loading…" hint below.
  // After 15s, hand off to error state with a friendly timeout message.
  let stillLoadingTimer = null;
  let timeoutTimer = null;
  let stillLoadingEl = null;

  stillLoadingTimer = setTimeout(() => {
    stillLoadingEl = document.createElement('div');
    stillLoadingEl.className = 'loading-hint';
    stillLoadingEl.textContent = 'Still loading… the data service is responding slowly.';
    slot.appendChild(stillLoadingEl);
    // Trigger fade-in
    requestAnimationFrame(() => stillLoadingEl?.classList.add('visible'));
  }, 5000);

  return {
    cancel: () => {
      clearTimeout(stillLoadingTimer);
      clearTimeout(timeoutTimer);
      stillLoadingEl?.remove();
    }
  };
}

/** Render an error state into the slot, wire up a retry handler. */
export function showError(slot, { title, message, error, onRetry }) {
  if (!slot) return;
  const retryId = `retry-${Math.random().toString(36).slice(2, 9)}`;
  const details = error?.message || (typeof error === 'string' ? error : null);
  slot.innerHTML = errorHtml({ title, message, details, retryId });
  if (onRetry) {
    const btn = document.getElementById(retryId);
    if (btn) btn.addEventListener('click', onRetry, { once: true });
  }
}

/** Helper escape. Duplicated from each page to keep this module standalone. */
function escape(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
