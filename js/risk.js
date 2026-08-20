/* ============================================================
   EYEAHEAD — risk.js
   Calculates aggregate portfolio risk score (0–100) from:
   - Position health factors (Aave, Morpho, Compound)
   - Forta Network exploit signals
   - Chainlink price feed deviations
   Renders the risk ring and updates badge/label.
   ============================================================ */

'use strict';

(function () {

  /* ── DOM ── */
  const riskScoreDisplay = document.getElementById('riskScoreDisplay');
  const riskEmptyState   = document.getElementById('riskEmptyState');
  const riskRingFill     = document.getElementById('riskRingFill');
  const riskScoreNumber  = document.getElementById('riskScoreNumber');
  const riskBadge        = document.getElementById('riskBadge');
  const riskStatusDetail = document.getElementById('riskStatusDetail');
  const statAlerts       = document.getElementById('statAlerts');

  /* ── Score → Risk Level ── */
  function scoreToLevel(score) {
    if (score < 40)  return 'safe';
    if (score < 70)  return 'warning';
    return 'critical';
  }

  function levelToLabel(level) {
    return { safe: 'SAFE', warning: 'WARNING', critical: 'CRITICAL' }[level] || 'SAFE';
  }

  function levelToDetail(level, score) {
    if (level === 'safe')     return 'No critical signals detected';
    if (level === 'warning')  return 'Elevated risk — review positions';
    if (level === 'critical') return 'Immediate action required — score ' + score;
    return '';
  }

  /* ── Calculate Score ── */
  function calculateScore(positions) {
    if (!positions || positions.length === 0) return 0;

    // TODO: weighted aggregate from:
    //   1. Minimum health factor across lending positions (Aave HF < 1.1 = critical)
    //   2. Forta Network alert severity scores for each protocol address
    //   3. Chainlink ETHUSD / asset price deviation vs. 24h TWAP
    //   4. TVL drain velocity signal from DeFi Llama time-series
    // For now: derive from position riskLevel distribution as placeholder until APIs connected

    const levels = positions.map(function (p) { return p.riskLevel || 'safe'; });
    const criticalCount = levels.filter(function (l) { return l === 'critical'; }).length;
    const warningCount  = levels.filter(function (l) { return l === 'warning';  }).length;

    const raw = (criticalCount * 30) + (warningCount * 12);
    return Math.min(100, raw);
  }

  /* ── Render Ring ── */
  function renderScore(score) {
    const level = scoreToLevel(score);
    const circumference = 326.73; // 2π × 52

    if (!riskScoreDisplay || !riskEmptyState) return;

    // Show ring, hide empty state
    riskScoreDisplay.removeAttribute('hidden');
    riskEmptyState.setAttribute('hidden', '');

    // Animate ring fill
    if (riskRingFill) {
      riskRingFill.style.setProperty('--score', score);
      // Update ring stroke color
      riskRingFill.classList.remove('risk-ring__fill--warning', 'risk-ring__fill--critical');
      if (level === 'warning')  riskRingFill.classList.add('risk-ring__fill--warning');
      if (level === 'critical') riskRingFill.classList.add('risk-ring__fill--critical');
    }

    // Update center number
    if (riskScoreNumber) riskScoreNumber.textContent = score;

    // Update badge
    if (riskBadge) {
      riskBadge.className = 'risk-badge risk-badge--' + level;
      riskBadge.textContent = levelToLabel(level);
    }

    // Update detail text
    if (riskStatusDetail) riskStatusDetail.textContent = levelToDetail(level, score);
  }

  /* ── Reset ── */
  function resetScore() {
    if (riskScoreDisplay) riskScoreDisplay.setAttribute('hidden', '');
    if (riskEmptyState)   riskEmptyState.removeAttribute('hidden');
    if (riskScoreNumber)  riskScoreNumber.textContent = '—';
  }

  /* ── Listen for positions loaded ── */
  window.addEventListener('eyeahead:positions-loaded', function (e) {
    const positions = e.detail || [];
    const score = calculateScore(positions);
    renderScore(score);

    // Dispatch score for alerts.js
    window.dispatchEvent(new CustomEvent('eyeahead:score-updated', { detail: { score: score, level: scoreToLevel(score) } }));
  });

  /* ── Listen for wallet disconnect ── */
  window.addEventListener('eyeahead:wallet-disconnected', function () {
    resetScore();
  });

  /* ── Expose ── */
  window.EYEAHEAD = window.EYEAHEAD || {};
  window.EYEAHEAD.risk = { calculate: calculateScore, render: renderScore };

  console.info('[EYEAHEAD] risk.js loaded');

})();
