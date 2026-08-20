/* ============================================================
   EYEAHEAD — positions.js
   Fetches DeFi positions for the connected wallet address.
   Data sources: DeFi Llama API (api.llama.fi), The Graph subgraphs
   (Aave V3, Compound V3, Uniswap V3, Curve, Morpho).
   Populates the position table and triggers risk.js recalculation.
   ============================================================ */

'use strict';

(function () {

  /* ── DOM ── */
  const positionsEmptyState = document.getElementById('positionsEmptyState');
  const positionTable       = document.getElementById('positionTable');
  const positionTableBody   = document.getElementById('positionTableBody');
  const positionHeaderCount = document.getElementById('positionHeaderCount');
  const statPositions       = document.getElementById('statPositions');
  const statAtRisk          = document.getElementById('statAtRisk');
  const statLastScan        = document.getElementById('statLastScan');

  /* ── State ── */
  let positions = [];

  /* ── Fetch ── */
  async function loadPositions(address) {
    console.info('[EYEAHEAD] positions.js: loading positions for', address);

    // TODO: query DeFi Llama user positions endpoint:
    // GET https://api.llama.fi/v2/historicalChainTvl/{protocol}/user/{address}

    // TODO: query The Graph subgraphs for lending health factors:
    // Aave V3:    https://api.thegraph.com/subgraphs/name/aave/protocol-v3
    // Compound:   https://api.thegraph.com/subgraphs/name/graphprotocol/compound-v3
    // Morpho:     https://api.thegraph.com/subgraphs/name/morpho-labs/morpho-aave-v3

    // TODO: normalise responses into positions[] array
    // TODO: call renderPositions(positions)
    // TODO: dispatch 'eyeahead:positions-loaded' for risk.js
  }

  /* ── Render ── */
  function renderPositions(data) {
    if (!data || data.length === 0) {
      showEmptyState();
      return;
    }

    hideEmptyState();

    positionTableBody.innerHTML = '';

    data.forEach(function (pos) {
      const row = buildPositionRow(pos);
      positionTableBody.appendChild(row);
    });

    // Update header count
    if (positionHeaderCount) {
      positionHeaderCount.textContent = data.length + ' position' + (data.length !== 1 ? 's' : '');
    }

    // Update stat card
    if (statPositions) statPositions.textContent = data.length;

    // Compute at-risk value (positions with warning/critical health)
    const atRisk = data
      .filter(function (p) { return p.riskLevel !== 'safe'; })
      .reduce(function (sum, p) { return sum + (p.valueUSD || 0); }, 0);

    if (statAtRisk) {
      statAtRisk.textContent = atRisk > 0 ? '$' + formatUSD(atRisk) : '$0';
    }

    // Last scan timestamp
    if (statLastScan) statLastScan.textContent = formatTime(new Date());

    // Notify risk.js
    window.dispatchEvent(new CustomEvent('eyeahead:positions-loaded', { detail: data }));
  }

  /* ── Build a single position row ── */
  function buildPositionRow(pos) {
    const row = document.createElement('div');
    row.className = 'position-row';
    row.setAttribute('role', 'row');

    const healthClass = pos.riskLevel === 'safe'
      ? 'health--safe'
      : pos.riskLevel === 'warning'
        ? 'health--warning'
        : 'health--critical';

    const badgeClass = 'risk-badge risk-badge--' + (pos.riskLevel || 'safe');

    row.innerHTML = [
      '<div class="position-row__protocol" role="cell">',
      '  <div class="protocol-icon">' + initials(pos.protocol) + '</div>',
      '  <span class="position-row__name">' + escHtml(pos.protocol) + '</span>',
      '</div>',
      '<div class="position-row__asset mono" role="cell">' + escHtml(pos.asset) + '</div>',
      '<div class="position-row__value" role="cell">$' + formatUSD(pos.valueUSD) + '</div>',
      '<div class="position-row__health ' + healthClass + '" role="cell">' + escHtml(String(pos.health)) + '</div>',
      '<div role="cell"><span class="' + badgeClass + '">' + (pos.riskLevel || 'SAFE').toUpperCase() + '</span></div>',
      '<div class="position-row__action" role="cell">',
      '  <button class="btn btn--ghost btn--sm" data-id="' + escHtml(pos.id) + '">Queue Exit</button>',
      '</div>',
    ].join('');

    // Queue exit handler
    const queueBtn = row.querySelector('[data-id]');
    if (queueBtn) {
      queueBtn.addEventListener('click', function () {
        window.dispatchEvent(new CustomEvent('eyeahead:queue-exit', { detail: pos }));
      });
    }

    return row;
  }

  /* ── Show / Hide table vs empty state ── */
  function showEmptyState() {
    if (positionsEmptyState) positionsEmptyState.removeAttribute('hidden');
    if (positionTable)       positionTable.setAttribute('hidden', '');
  }

  function hideEmptyState() {
    if (positionsEmptyState) positionsEmptyState.setAttribute('hidden', '');
    if (positionTable)       positionTable.removeAttribute('hidden');
  }

  /* ── Helpers ── */
  function formatUSD(n) {
    if (n == null || isNaN(n)) return '—';
    return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function initials(str) {
    return String(str || '?').slice(0, 2).toUpperCase();
  }

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ── Listen for wallet events ── */
  window.addEventListener('eyeahead:wallet-connected', function (e) {
    const address = e.detail && e.detail.address;
    if (address) loadPositions(address);
  });

  window.addEventListener('eyeahead:wallet-disconnected', function () {
    positions = [];
    showEmptyState();
    if (statPositions) statPositions.textContent = '—';
    if (statAtRisk)    statAtRisk.textContent = '—';
    if (statLastScan)  statLastScan.textContent = '—';
    if (positionHeaderCount) positionHeaderCount.textContent = '';
  });

  /* ── Expose ── */
  window.EYEAHEAD = window.EYEAHEAD || {};
  window.EYEAHEAD.positions = { load: loadPositions, render: renderPositions };

  console.info('[EYEAHEAD] positions.js loaded');

})();
