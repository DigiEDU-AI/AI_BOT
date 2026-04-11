/**
 * config-loader/config.js
 * Načítava konfiguráciu z Google Apps Script (GAS) a spravuje lokálnu cache.
 * FIX: Implementovaná text/plain hlavička pre obídenie CORS obmedzení.
 */

window.AppConfig = (function () {

  // ── KONFIGURÁCIA BACKENDU ──
  // Aktuálna URL z tvojho posledného úspešného deploymentu
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-UXKn0bCVf7V47E7DIxMJzcfFt_T-fOai0JZ-adtS-fvmK0Qi8__I0UZeSGJZHr_I/exec';

  let _config   = null;
  let _hardware = null;

  // ── POMOCNÉ FUNKCIE PRE CACHE ──
  function _fromCache(key) {
    try { 
      return JSON.parse(localStorage.getItem(key) || 'null'); 
    } catch (e) { 
      console.error('[Config] Chyba pri čítaní cache:', e);
      return null; 
    }
  }

  function _toCache(key, value) {
    try { 
      localStorage.setItem(key, JSON.stringify(value)); 
    } catch (e) {
      console.error('[Config] Chyba pri ukladaní do cache:', e);
    }
  }

  // ── KOMUNIKÁCIA S GAS ──
  async function _post(payload) {
  // Musíme odstrániť zložité hlavičky, aby sme sa vyhli CORS preflightu
  const res = await fetch(GAS_URL, {
    method: 'POST',
    mode: 'no-cors', // SKÚS NAJPRV TOTO pre totálne obídenie, alebo ponechaj cors s text/plain
    body: JSON.stringify(payload),
    headers: {
      // TU JE ZMENA: Nesmie tu byť 'application/json'
      'Content-Type': 'text/plain;charset=utf-8' 
    }
  });

  // POZOR: Pri mode 'no-cors' neuvidíš res.ok, skúsme teda nechať 'cors' ale s text/plain:
  // Ak vyššie uvedené nepomôže, vymeň to za tento blok:
  /*
  const res = await fetch(GAS_URL, {
    method: 'POST',
    mode: 'cors',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
  });
  return res.json();
  */
}

  // ── INICIALIZÁCIA ──
  async function init(userPin = null) {
    _config   = _fromCache('tb_app_config');
    _hardware = _fromCache('tb_hw_catalog');

    // Ak nemáme PIN, nepokúšame sa o sieťové volanie pri štarte (prevencia Fetch Erroru)
    if (!userPin) {
      console.log('[Config] Režim offline/čakám na PIN.');
      return { config: _config, hardware: _hardware };
    }

    try {
      // 1. Načítanie app-config.json z Drive
      const cfgRes = await _post({ action: 'get_config', pin: userPin });
      if (cfgRes?.status === 'success') {
        _config = cfgRes.data;
        _toCache('tb_app_config', _config);
        console.log('[Config] Konfigurácia načítaná.');
      }

      // 2. Načítanie hardware-catalog.json z Drive
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
