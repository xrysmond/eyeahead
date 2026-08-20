/* ============================================================
   EYEAHEAD — exit.js
   Manages the exit queue. Queues positions for one-click exit.
   Executes swaps via 1inch Fusion API (gasless, MEV-protected).
   ============================================================ */

'use strict';

(function () {

  /* ── DOM ── */
  const exitEmptyState = document.getElementById('exitEmptyState');
  const exitList       = document.getElementById('exitList');
  const executeExitBtn = document.getElementById('executeExitBtn');

  /* ── State ── */
  let queue = [];

  /* ── Add to queue ── */
  function queueExit(position) {
    const alreadyQueued = queue.find(function (p) { return p.id === position.id; });
    if (alreadyQueued) return;

    queue.push(position);
    renderQueue();

    // Scroll to exit section
    const exitSection = document.getElementById('exit-queue');
    if (exitSection) exitSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    console.info('[EYEAHEAD] exit.js: queued position', position.id);
  }

  /* ── Remove from queue ── */
  function dequeueExit(id) {
    queue = queue.filter(function (p) { return p.id !== id; });
    renderQueue();
  }

  /* ── Execute all queued exits via 1inch Fusion ── */
  async function executeAll() {
    if (queue.length === 0) return;

    console.info('[EYEAHEAD] exit.js: executing', queue.length, 'exits via 1inch Fusion');

    // TODO: for each queued position:
    //   1. GET https://api.1inch.dev/fusion/quoter/v1.0/1/quote/receive
    //      Params: { fromTokenAddress, toTokenAddress: USDC, amount, walletAddress }
    //   2. POST https://api.1inch.dev/fusion/relayer/v1.0/1/order/submit
    //      Body: { order: signedFusionOrder }
    //   Fusion orders are gasless and MEV-protected.
    //   Requires: 1inch API key + wallet signer (from wallet.js)

    // TODO: show per-exit execution status in the card
    // TODO: on success, remove from queue and show confirmation toast
  }

  /* ── Render queue ── */
  function renderQueue() {
    if (!exitList || !exitEmptyState) return;

    if (queue.length === 0) {
      exitEmptyState.removeAttribute('hidden');
      exitList.setAttribute('hidden', '');
      if (executeExitBtn) executeExitBtn.disabled = true;
      return;
    }

    exitEmptyState.setAttribute('hidden', '');
    exitList.removeAttribute('hidden');
    if (executeExitBtn) executeExitBtn.disabled = false;

    exitList.innerHTML = queue.map(buildExitCard).join('');

    // Attach remove handlers
    exitList.querySelectorAll('[data-remove-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        dequeueExit(btn.getAttribute('data-remove-id'));
      });
    });
  }

  /* ── Build exit card HTML ── */
  function buildExitCard(position) {
    return [
      '<div class="exit-card" role="listitem">',
      '  <div class="exit-card__info">',
      '    <div class="exit-card__name">' + escHtml(position.protocol) + ' — ' + escHtml(position.asset) + '</div>',
      '    <div class="exit-card__detail">$' + formatUSD(position.valueUSD) + ' &nbsp;·&nbsp; Via 1inch Fusion (gasless)</div>',
      '  </div>',
      '  <div class="exit-card__actions">',
      '    <span class="risk-badge risk-badge--critical">QUEUED</span>',
      '    <button class="btn btn--ghost btn--sm" data-remove-id="' + escHtml(position.id) + '">Remove</button>',
      '  </div>',
      '</div>',
    ].join('');
  }

  /* ── Execute button ── */
  if (executeExitBtn) {
    executeExitBtn.addEventListener('click', executeAll);
  }

  /* ── Listen for queue-exit events from positions.js and alert cards ── */
  window.addEventListener('eyeahead:queue-exit', function (e) {
    if (e.detail) queueExit(e.detail);
  });

  /* ── Listen for wallet disconnect: clear queue ── */
  window.addEventListener('eyeahead:wallet-disconnected', function () {
    queue = [];
    renderQueue();
  });

  /* ── Helpers ── */
  function formatUSD(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ── Expose ── */
  window.EYEAHEAD = window.EYEAHEAD || {};
  window.EYEAHEAD.exit = { queue: queueExit, dequeue: dequeueExit, execute: executeAll };

  console.info('[EYEAHEAD] exit.js loaded');

})();
