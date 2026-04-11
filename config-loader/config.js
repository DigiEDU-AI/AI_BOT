/**
 * config-loader/config.js
 * FINALNA OPRAVA: Použitie CORS s text/plain pre úspešné prečítanie JSON odpovede. [cite: 86]
 */

window.AppConfig = (function () {

  // URL tvojho Google Apps Scriptu [cite: 87]
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-UXKn0bCVf7V47E7DIxMJzcfFt_T-fOai0JZ-adtS-fvmK0Qi8__I0UZeSGJZHr_I/exec';

  let _config   = null;
  let _hardware = null;

  function _fromCache(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }

  function _toCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // ── KOMUNIKÁCIA S GAS ──
  async function _post(payload) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors', // MUSÍ BYŤ CORS [cite: 87]
      body: JSON.stringify(payload),
      headers: {
        // Hlavička text/plain zabraňuje "preflight" kontrole 
        'Content-Type': 'text/plain;charset=utf-8' 
      }
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    // Teraz už môžeme bezpečne prečítať JSON 
    return await res.json();
  }

  // ── INICIALIZÁCIA ──
  async function init(userPin = null) {
    _config   = _fromCache('tb_app_config');
    _hardware = _fromCache('tb_hw_catalog');

    if (!userPin) {
      console.log('[Config] Offline režim / Čakám na PIN. [cite: 90]');
      return { config: _config, hardware: _hardware };
    }

    try {
      // 1. Načítanie app-config.json [cite: 91]
      const cfgRes = await _post({ action: 'get_config', pin: userPin });
      if (cfgRes?.status === 'success') {
        _config = cfgRes.data;
        _toCache('tb_app_config', _config);
        console.log('[Config] Konfigurácia načítaná. [cite: 92]');
      }

      // 2. Načítanie hardware-catalog.json [cite: 93]
      const hwRes = await _post({ action: 'loadHardware', pin: userPin });
      if (hwRes?.status === 'success') {
        _hardware = hwRes.data;
        _toCache('tb_hw_catalog', _hardware);
        console.log('[Config] HW katalóg načítaný. [cite: 106]');
      }
    } catch (e) {
      console.error('[Config] Chyba spojenia:', e.message); [cite: 95]
    }

    return { config: _config, hardware: _hardware }; [cite: 96]
  }

  // ── VEREJNÉ GETTERY ──
  function get()         { return _config; }
  
  function getHardware() { 
    if (Array.isArray(_hardware)) return _hardware; [cite: 109]
    if (_hardware?.hardware_catalog) return _hardware.hardware_catalog; [cite: 110]
    return [];
  }

  function getGasUrl()   { return GAS_URL; }

  function getRoundAProvider() {
    return _config?.ai_configuration?.round_A?.default_provider || 'claude'; [cite: 111]
  }

  function getRoundAModel() {
    return _config?.ai_configuration?.round_A?.default_model || 'claude-3-5-sonnet-20241022'; [cite: 112]
  }

  function getKBReaderUrl() {
    return _config?.app_settings?.kb_read_url || null; [cite: 113]
  }

  function getValue(path, fallback = null) {
    if (!_config) return fallback;
    return path.split('.').reduce((o, k) => o?.[k], _config) ?? fallback; [cite: 115]
  }

  return {
    init,
    get,
    getHardware,
    getGasUrl,
    getValue,
    getRoundAProvider,
    getRoundAModel,
    getKBReaderUrl
  };

})();
