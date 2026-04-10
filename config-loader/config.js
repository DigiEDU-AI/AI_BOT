/**
 * config-loader/config.js
 * Loads config from GAS, caches locally for offline.
 *
 * MAPOVANIE na reálny app-config.json:
 *   app_settings.kb_read_url
 *   ai_configuration.round_A.default_provider / default_model
 *   ai_configuration.round_B.default_provider / default_model
 *   saturation_rules.*
 */

window.AppConfig = (function () {

  // ── GAS URL – jediné miesto kde je URL vo frontende ──
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-UXKn0bCVf7V47E7DIxMJzcfFt_T-fOai0JZ-adtS-fvmK0Qi8__I0UZeSGJZHr_I/exec';

  let _config   = null;
  let _hardware = null;

  // ─────────────────────────────────────────
  function _fromCache(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
  }
  function _toCache(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }

  // ─────────────────────────────────────────
  // Init – volaný pri štarte PRED prihlásením
  // (get_config a loadHardware sú verejné v GAS)
  // ─────────────────────────────────────────
  async function init() {
    _config   = _fromCache('tb_app_config');
    _hardware = _fromCache('tb_hw_catalog');

    try {
      // get_config nepotrebuje PIN v pôvodnom GAS kóde?
      // → posielame dummy pin '', GAS vráti error → fallback na cache
      // → s mojim Code.gs je get_config public (no pin check)
      const cfgRes = await _post({ action: 'get_config', pin: '' });
      if (cfgRes?.status === 'success') {
        _config = cfgRes.data;
        _toCache('tb_app_config', _config);
      }

      const hwRes = await _post({ action: 'loadHardware', pin: '' });
      if (hwRes?.status === 'success') {
        _hardware = hwRes.data;
        _toCache('tb_hw_catalog', _hardware);
      }
    } catch (e) {
      console.warn('[Config] Offline – používam cache:', e.message);
    }

    return { config: _config, hardware: _hardware };
  }

  async function _post(payload) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    return res.json();
  }

  // ─────────────────────────────────────────
  // Getters – mapované na reálnu štruktúru configu
  // ─────────────────────────────────────────
  function get()         { return _config; }
  function getHardware() { return Array.isArray(_hardware) ? _hardware : (_hardware?.hardware_catalog || []); }
  function getGasUrl()   { return GAS_URL; }

  /** Provider pre Kolo A (obsah) */
  function getRoundAProvider() {
    return _config?.ai_configuration?.round_A?.default_provider || 'gemini';
  }
  /** Model pre Kolo A */
  function getRoundAModel() {
    return _config?.ai_configuration?.round_A?.default_model || 'gemini-1.5-pro';
  }
  /** Provider pre Kolo B (jazyková korekcia) */
  function getRoundBProvider() {
    return _config?.ai_configuration?.round_B?.default_provider || 'claude';
  }
  /** Model pre Kolo B */
  function getRoundBModel() {
    return _config?.ai_configuration?.round_B?.default_model || 'claude-3-5-sonnet-20241022';
  }
  /** URL pre tlačidlo "Čítať KB" */
  function getKBReaderUrl() {
    return _config?.app_settings?.kb_read_url || null;
  }
  /** Max cost pre Kolo A */
  function getRoundAMaxCost() {
    return _config?.ai_configuration?.round_A?.max_cost_limit || 0.05;
  }

  function getValue(path, fallback = null) {
    if (!_config) return fallback;
    return path.split('.').reduce((o, k) => o?.[k], _config) ?? fallback;
  }

  return {
    init, get, getHardware, getGasUrl, getValue,
    getRoundAProvider, getRoundAModel,
    getRoundBProvider, getRoundBModel,
    getKBReaderUrl, getRoundAMaxCost,
  };
})();
