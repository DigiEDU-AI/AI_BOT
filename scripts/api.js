/**
 * scripts/api.js
 * Centralised GAS communication layer.
 * All sensitive data flows through here — never in frontend constants.
 */

window.API = (function () {

  let _pin         = null;
  let _adminPass   = null;
  let _online      = true;

  // ─────────────────────────────────────────
  // Internal
  // ─────────────────────────────────────────
  function _gasUrl() {
    return AppConfig.getGasUrl();
  }

  async function _post(payload) {
    const res = await fetch(_gasUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000), // 30 s timeout
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
  }

  // ─────────────────────────────────────────
  // Auth context setters
  // ─────────────────────────────────────────
  function setPin(pin)          { _pin = pin; }
  function setAdminPass(pass)   { _adminPass = pass; }
  function clearAuth()          { _pin = null; _adminPass = null; }

  // ─────────────────────────────────────────
  // Generic call
  // ─────────────────────────────────────────
  async function call(action, extras = {}, useAdmin = false) {
    const payload = { action, pin: _pin, ...extras };
    if (useAdmin) payload.adminPassword = _adminPass;

    try {
      const result = await _post(payload);
      _online = true;
      Cache.markOnline();
      return result;
    } catch (err) {
      _online = false;
      Cache.markOffline();
      throw err;
    }
  }

  // ─────────────────────────────────────────
  // Public API calls
  // ─────────────────────────────────────────

  /** Verify PIN against GAS */
  async function verifyPin(pin) {
    return _post({ action: 'verify_pin', pin });
  }

  /** Verify admin password */
  async function verifyAdmin(pin, pass) {
    return _post({ action: 'verify_admin', pin, adminPassword: pass });
  }

  /** AI request – Round A (content) or Round B (language cleanup) */
  async function aiRequest(payload) {
    if (!_online && !navigator.onLine) {
      throw new Error('Offline – AI volanie nie je dostupné');
    }
    return call('ai_request', { payload });
  }

  /** Save completed case + write to KB */
  async function saveCase(caseData) {
    if (!navigator.onLine) {
      Cache.enqueue({ type: 'saveCase', caseData });
      return { status: 'queued', message: 'Case uložený do fronty (offline)' };
    }
    return call('saveCase', { caseData });
  }

  /** Load KB index for a module */
  async function loadKBIndex(module) {
    const cached = Cache.getKBIndex(module);
    if (cached) return { status: 'success', data: cached, source: 'cache' };
    const res = await call('kb_index', { module });
    if (res?.status === 'success') Cache.cacheKBIndex(module, res.data);
    return res;
  }

  /** Update config value (admin only) */
  async function updateConfig(key, value) {
    return call('update_config', { key, value }, true);
  }

  /** Get admin stats */
  async function getAdminStats() {
    return call('admin_view', {}, true);
  }

  /** Process offline queue */
  async function flushQueue() {
    return Cache.processQueue(async (item) => {
      if (item.type === 'saveCase') {
        return call('saveCase', { caseData: item.caseData });
      }
    });
  }

  function isOnline() { return _online; }

  return {
    setPin, setAdminPass, clearAuth,
    call,
    verifyPin, verifyAdmin,
    aiRequest, saveCase, loadKBIndex,
    updateConfig, getAdminStats, flushQueue,
    isOnline,
  };
})();
