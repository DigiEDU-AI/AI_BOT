/**
 * config-loader/config.js
 * Správa konfigurácie a úvodná komunikácia s GAS.
 * FIX: Použitie text/plain pre obídenie CORS preflightu.
 */

window.AppConfig = (function () {

  // Tvoja overená URL
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-UXKn0bCVf7V47E7DIxMJzcfFt_T-fOai0JZ-adtS-fvmK0Qi8__I0UZeSGJZHr_I/exec';

  let _config   = null;
  let _hardware = null;

  function _fromCache(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }

  function _toCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  async function _post(payload) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(payload),
      headers: {
        // Kritické pre obídenie CORS
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
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
      // 1. Načítanie hlavnej konfigurácie
      const cfgRes = await _post({ action: 'get_config', pin: userPin });
      if (cfgRes?.status === 'success') {
        _config = cfgRes.data;
        _toCache('tb_app_config', _config);
        console.log('[Config] Nastavenia aktualizované.');
      }

      // 2. Načítanie katalógu hardvéru
      const hwRes = await _post({ action: 'loadHardware', pin: userPin });
      if (hwRes?.status === 'success') {
        _hardware = hwRes.data;
        _toCache('tb_hw_catalog', _hardware);
        console.log('[Config] Hardware katalóg aktualizovaný.');
      }
    } catch (e) {
      console.error('[Config] Chyba siete:', e.message);
    }

    return { config: _config, hardware: _hardware };
  }

  // Gettery pre zvyšok aplikácie
  return {
    init,
    get: () => _config,
    getHardware: () => {
      if (Array.isArray(_hardware)) return _hardware;
      return _hardware?.hardware_catalog || [];
    },
    getGasUrl: () => GAS_URL,
    getValue: (path, fallback = null) => {
      if (!_config) return fallback;
      return path.split('.').reduce((o, k) => o?.[k], _config) ?? fallback;
    },
    getRoundAProvider: () => _config?.ai_configuration?.round_A?.default_provider || 'claude',
    getRoundAModel: () => _config?.ai_configuration?.round_A?.default_model || 'claude-3-5-sonnet-20241022'
  };

})();
