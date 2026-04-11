/**
 * config-loader/config.js
 * FINALNA OPRAVA: Použitie CORS s text/plain pre úspešné prečítanie JSON odpovede.
 */

window.AppConfig = (function () {

  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-UXKn0bCVf7V47E7DIxMJzcfFt_T-fOai0JZ-adtS-fvmK0Qi8__I0UZeSGJZHr_I/exec';

  let _config   = null;
  let _hardware = null;

  function _fromCache(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }

  function _toCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // ── KOMUNIKÁCIA S GAS (OPRAVENÁ) ──
  async function _post(payload) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors', // MUSÍ BYŤ CORS, aby sme mohli čítať odpoveď
      body: JSON.stringify(payload),
      headers: {
        // Hlavička text/plain zabraňuje "preflight" kontrole, ktorá ti hádzala chybu
        'Content-Type': 'text/plain;charset=utf-8' 
      }
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    
    // Teraz už môžeme bezpečne prečítať JSON
    return await res.json();
  }

  async function init(userPin = null) {
    _config   = _fromCache('tb_app_config');
    _hardware = _fromCache('tb_hw_catalog');

    if (!userPin) {
      console.log('[Config] Offline režim / Čakám na PIN.');
      return { config: _config, hardware: _hardware };
    }

    try {
      // 1. Načítanie app-config.json
      const cfgRes = await _post({ action: 'get_config', pin: userPin });
      if (cfgRes?.status === 'success') {
        _config = cfgRes.data;
        _toCache('tb_app_config', _config);
      }

      // 2. Načítanie hardware-catalog.json
      const hwRes = await _post({ action: 'loadHardware', pin: userPin });
      if (hwRes?.status === 'success') {
        _hardware = hwRes.data;
        _toCache('tb_hw_catalog', _hardware);
      }
    } catch (e) {
      console.error('[Config] Chyba spojenia:', e.message);
    }

    return { config: _config, hardware: _hardware };
  }

  function get()         { return _config; }
  function getHardware() { 
    if (Array.isArray(_hardware)) return _hardware;
    return _hardware?.hardware_catalog || []; 
  }
  function getGasUrl()   { return GAS_URL; }

  function getRoundAProvider() { return _config?.ai_configuration?.round_A?.default_provider || 'claude'; }
  function getRoundAModel()    { return _config?.ai_configuration?.round_A?.default_model || 'claude-3-5-sonnet-20241022'; }
  function getKBReaderUrl()    { return _config?.app_settings?.kb_read_url || null; }

  function getValue(path, fallback = null) {
    if (!_config) return fallback;
    return path.split('.').reduce((o, k) => o?.[k], _config) ?? fallback;
  }

  return { init, get, getHardware, getGasUrl, getValue, getRoundAProvider, getRoundAModel, getKBReaderUrl };

})();      // 2. Načítanie hardware-catalog.json z Drive
      const hwRes = await _post({ action: 'loadHardware', pin: userPin });
      if (hwRes?.status === 'success') {
        _hardware = hwRes.data;
        _toCache('tb_hw_catalog', _hardware);
        console.log('[Config] HW katalóg načítaný.');
      }
    } catch (e) {
      console.error('[Config] Chyba spojenia:', e.message);
    }

    return { config: _config, hardware: _hardware };
  }

  // ── VEREJNÉ GETTERY ──
  function get()         { return _config; }
  
  function getHardware() { 
    // Spracovanie štruktúry tvojho hardware-catalog.json
    if (Array.isArray(_hardware)) return _hardware;
    if (_hardware?.hardware_catalog) return _hardware.hardware_catalog;
    return [];
  }

  function getGasUrl()   { return GAS_URL; }

  function getRoundAProvider() {
    return _config?.ai_configuration?.round_A?.default_provider || 'claude';
  }

  function getRoundAModel() {
    return _config?.ai_configuration?.round_A?.default_model || 'claude-3-5-sonnet-20241022';
  }

  function getKBReaderUrl() {
    return _config?.app_settings?.kb_read_url || null;
  }

  function getValue(path, fallback = null) {
    if (!_config) return fallback;
    return path.split('.').reduce((o, k) => o?.[k], _config) ?? fallback;
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
