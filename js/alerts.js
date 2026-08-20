/* ============================================================
   EYEAHEAD — alerts.js
   Ingests risk alerts from Forta Network + internal risk engine.
   Populates the alert feed panel and sidebar badge.
   Emits toast notifications for new critical alerts.
   ============================================================ */

'use strict';

(function () {

  /* ── DOM ── */
  const alertEmptyState = document.getElementById('alertEmptyState');
  const alertList       = document.getElementById('alertList');
  const markAllReadBtn  = document.getElementById('markAllReadBtn');
  const navAlertBadge   = document.getElementById('navAlertBadge');
  const statAlerts      = document.getElementById('statAlerts');
  const toastContainer  = document.getElementById('toastContainer');

  /* ── State ── */
  let alerts = [];

  /* ── Forta poll interval (ms) ── */
  const POLL_INTERVAL = 30000; // 30 seconds
  let pollTimer = null;

  /* ── Fetch alerts from Forta Network ── */
  async function fetchFortaAlerts(address) {
    // TODO: POST https://api.forta.network/alerts
    // Body: { filters: { addresses: [address], chainId: 1, severity: ['CRITICAL','HIGH','MEDIUM'] } }
    // Requires: Forta API key in request header
    // Returns: { alerts: [ { id, name, description, severity, protocol, timestamp } ] }
    console.info('[EYEAHEAD] alerts.js: fetchFortaAlerts() — awaiting Forta API integration');
    return [];
  }

  /* ── Poll cycle ── */
  async function pollAlerts(address) {
    const incoming = await fetchFortaAlerts(address);
    if (incoming && incoming.length > 0) {
      processNewAlerts(incoming);
    }
  }

  /* ── Start / Stop polling ── */
  function startPolling(address) {
    stopPolling();
    pollTimer = setInterval(function () { pollAlerts(address); }, POLL_INTERVAL);
  }

  function stopPolling() {
    if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    alerts = [];
    renderAlerts([]);
    updateBadge(0);
  }

  /* ── Process and de-duplicate incoming alerts ── */
  function processNewAlerts(incoming) {
    const existingIds = new Set(alerts.map(function (a) { return a.id; }));
    const fresh = incoming.filter(function (a) { return !existingIds.has(a.id); });

    if (fresh.length === 0) return;

    fresh.forEach(function (alert) { alerts.unshift(alert); });

    // Keep cap at 50 alerts in memory
    if (alerts.length > 50) alerts = alerts.slice(0, 50);

    renderAlerts(alerts);
    updateBadge(alerts.length);

    // Toast for each new critical alert
    fresh.forEach(function (alert) {
      if (alert.severity === 'CRITICAL' || alert.riskLevel === 'critical') {
        showToast(alert);
      }
    });

    // Notify risk.js of new alert data
    window.dispatchEvent(new CustomEvent('eyeahead:alerts-updated', { detail: alerts }));
  }

  /* ── Render alert feed ── */
  function renderAlerts(data) {
    if (!alertList || !alertEmptyState) return;

    if (!data || data.length === 0) {
      alertEmptyState.removeAttribute('hidden');
      alertList.setAttribute('hidden', '');
      if (markAllReadBtn) markAllReadBtn.disabled = true;
      return;
    }

    alertEmptyState.setAttribute('hidden', '');
    alertList.removeAttribute('hidden');
    if (markAllReadBtn) markAllReadBtn.disabled = false;

    alertList.innerHTML = data.map(buildAlertCard).join('');

    // Update stat counter
    if (statAlerts) statAlerts.textContent = data.length;
  }

  /* ── Build alert card HTML ── */
  function buildAlertCard(alert) {
    const level = resolveLevel(alert);
    const time  = alert.timestamp ? formatTime(new Date(alert.timestamp)) : 'just now';

    return [
      '<div class="alert-card alert-card--' + level + '" role="listitem">',
      '  <div class="alert-card__header">',
      '    <div class="alert-card__header-left">',
      '      <span class="risk-badge risk-badge--' + level + '">' + level.toUpperCase() + '</span>',
      '      <span class="alert-card__protocol">' + escHtml(alert.protocol || alert.name || 'Unknown Protocol') + '</span>',
      '    </div>',
      '    <span class="alert-card__time">' + time + '</span>',
      '  </div>',
      '  <p class="alert-card__message">' + escHtml(alert.description || 'Exploit signal detected. Review position immediately.') + '</p>',
      '  <div class="alert-card__actions">',
      '    <button class="btn btn--danger btn--sm" data-alert-id="' + escHtml(alert.id) + '">Queue Exit</button>',
      '    <button class="btn btn--ghost btn--sm">Dismiss</button>',
      '  </div>',
      '</div>',
    ].join('');
  }

  /* ── Toast ── */
  function showToast(alert) {
    if (!toastContainer) return;

    const level = resolveLevel(alert);
    const toast = document.createElement('div');
    toast.className = 'toast toast--' + level;

    toast.innerHTML = [
      '<div class="toast__title">' + escHtml(alert.protocol || alert.name || 'Risk Alert') + '</div>',
      '<div class="toast__message">' + escHtml(alert.description || 'Critical signal detected.') + '</div>',
    ].join('');

    toastContainer.appendChild(toast);

    // Auto-dismiss after 8 seconds
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 8000);

    // Dismiss on click
    toast.addEventListener('click', function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    });
  }

  /* ── Update sidebar badge ── */
  function updateBadge(count) {
    if (!navAlertBadge) return;
    if (count > 0) {
      navAlertBadge.textContent = count > 99 ? '99+' : count;
      navAlertBadge.removeAttribute('hidden');
    } else {
      navAlertBadge.setAttribute('hidden', '');
    }
  }

  /* ── Mark all read ── */
  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', function () {
      alerts = [];
      renderAlerts([]);
      updateBadge(0);
      if (statAlerts) statAlerts.textContent = '0';
    });
  }

  /* ── Helpers ── */
  function resolveLevel(alert) {
    const sev = (alert.severity || alert.riskLevel || '').toLowerCase();
    if (sev === 'critical' || sev === 'high') return 'critical';
    if (sev === 'medium' || sev === 'warning') return 'warning';
    return 'safe';
  }

  function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  function escHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ── Listen for wallet events ── */
  window.addEventListener('eyeahead:wallet-connected', function (e) {
    const address = e.detail && e.detail.address;
    if (address) startPolling(address);
  });

  window.addEventListener('eyeahead:wallet-disconnected', function () {
    stopPolling();
    if (statAlerts) statAlerts.textContent = '0';
  });

  /* ── Expose ── */
  window.EYEAHEAD = window.EYEAHEAD || {};
  window.EYEAHEAD.alerts = {
    add:    processNewAlerts,
    clear:  function () { stopPolling(); },
    toast:  showToast,
  };

  console.info('[EYEAHEAD] alerts.js loaded');

})();
