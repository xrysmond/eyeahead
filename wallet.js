/* ============================================================
   EYEAHEAD — wallet.js
   Wallet connection via WalletConnect v2 + MetaMask SDK.
   Manages wallet state. Fires 'eyeahead:wallet-connected'
   and 'eyeahead:wallet-disconnected' custom events for
   positions.js, risk.js, alerts.js to respond to.
   ============================================================ */

'use strict';

(function () {

  /* ── State ── */
  const wallet = {
    connected:  false,
    address:    null,
    chainId:    null,
    provider:   null,
  };

  /* ── DOM ── */
  const connectBtn    = document.getElementById('connectWalletBtn');
  const walletDot     = document.getElementById('walletDot');
  const walletAddress = document.getElementById('walletAddress');

  /* ── Connect ── */
  async function connect() {
    try {
      // TODO: initialise WalletConnect v2 / MetaMask SDK here
      // const provider = new WalletConnectProvider({ ... });
      // await provider.enable();
      // const accounts = await provider.request({ method: 'eth_requestAccounts' });
      // wallet.address = accounts[0];
      // wallet.connected = true;
      // wallet.provider = provider;
      // setConnectedUI(wallet.address);
      // dispatchEvent(new CustomEvent('eyeahead:wallet-connected', { detail: wallet }));

      console.info('[EYEAHEAD] wallet.js: connect() — awaiting WalletConnect SDK integration');
    } catch (err) {
      console.error('[EYEAHEAD] wallet.js: connection failed', err);
    }
  }

  /* ── Disconnect ── */
  function disconnect() {
    wallet.connected = false;
    wallet.address   = null;
    wallet.chainId   = null;
    wallet.provider  = null;

    setDisconnectedUI();
    window.dispatchEvent(new CustomEvent('eyeahead:wallet-disconnected'));
  }

  /* ── UI: Connected ── */
  function setConnectedUI(address) {
    const short = address.slice(0, 6) + '...' + address.slice(-4);

    if (walletDot) {
      walletDot.classList.remove('wallet-status__indicator--disconnected');
      walletDot.classList.add('wallet-status__indicator--connected');
    }

    if (walletAddress) walletAddress.textContent = short;
    if (connectBtn)    connectBtn.textContent = 'Disconnect';
  }

  /* ── UI: Disconnected ── */
  function setDisconnectedUI() {
    if (walletDot) {
      walletDot.classList.remove('wallet-status__indicator--connected');
      walletDot.classList.add('wallet-status__indicator--disconnected');
    }

    if (walletAddress) walletAddress.textContent = 'Not connected';
    if (connectBtn)    connectBtn.textContent = 'Connect Wallet';
  }

  /* ── Events ── */
  if (connectBtn) {
    connectBtn.addEventListener('click', function () {
      wallet.connected ? disconnect() : connect();
    });
  }

  // Mirror connect button in empty-state sections
  const positionsConnectBtn = document.getElementById('positionsConnectBtn');
  const emptyConnectBtn     = document.getElementById('emptyConnectBtn');

  if (positionsConnectBtn) positionsConnectBtn.addEventListener('click', connect);
  if (emptyConnectBtn)     emptyConnectBtn.addEventListener('click', connect);

  /* ── Expose wallet state for other modules ── */
  window.EYEAHEAD = window.EYEAHEAD || {};
  window.EYEAHEAD.wallet = wallet;

  console.info('[EYEAHEAD] wallet.js loaded');

})();
