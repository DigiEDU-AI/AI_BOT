/**
 * scripts/api.js
 * Hlavné komunikačné rozhranie pre AI a ukladanie dát.
 */

window.AppAPI = (function () {

  // Pomocná funkcia na získanie aktuálnej URL a PINu
  function _getAuth() {
    return {
      url: window.AppConfig.getGasUrl(),
      pin: localStorage.getItem('tb_user_pin') // Predpokladáme, že auth.js ho sem uložil
    };
  }

  async function _post(payload) {
    const auth = _getAuth();
    
    // Pridáme PIN ku každej požiadavke
    const body = {
      ...payload,
      pin: auth.pin
    };

    const res = await fetch(auth.url, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(body),
      headers: {
        // FIX: Zmena z application/json na text/plain pre GAS
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!res.ok) throw new Error('API Error: ' + res.status);
    return await res.json();
  }

  /**
   * Odoslanie požiadavky na AI (Kolo A alebo B)
   */
  async function askAI(prompt, options = {}) {
    return await _post({
      action: 'ai_request',
      payload: {
        prompt: prompt,
        provider: options.provider || window.AppConfig.getRoundAProvider(),
        model: options.model || window.AppConfig.getRoundAModel(),
        max_tokens: options.max_tokens || 2000
      }
    });
  }

  /**
   * Uloženie vyriešeného prípadu do Google Drive
   */
  async function saveCase(caseData) {
    return await _post({
      action: 'saveCase',
      caseData: caseData
    });
  }

  /**
   * Načítanie indexu z Knowledge Base
   */
  async function getKBIndex(moduleName) {
    return await _post({
      action: 'kb_index',
      module: moduleName
    });
  }

  return {
    askAI,
    saveCase,
    getKBIndex
  };

})();  async function saveCase(caseData) {
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
