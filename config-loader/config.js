/**
 * config-loader/config.js
 * Načítava konfiguráciu z Google Apps Script (GAS) a spravuje lokálnu cache.
 */

window.AppConfig = (function () {

  // ── KONFIGURÁCIA BACKENDU ──
  // Uisti sa, že táto URL končí na /exec
  const GAS_URL = 'https://script.google.com/macros/s/AKfycbxkhO5-LkxMzqSyvpzLC9xlXg-u1UW2pmAHf1vqkoIwN6Q3UvuOxgZbG2KwQw9i9jt0/exec';

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
    const res = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors', // Povolenie cross-origin komunikácie
      body: JSON.stringify(payload),
      headers: { 
        // Použitie text/plain často obchádza prísne CORS kontroly v GAS
        'Content-Type': 'text/plain;charset=utf-8' 
      },
      signal: AbortSignal.timeout(15000), // Timeout po 15 sekundách
    });

    if (!res.ok) {
      throw new Error(`HTTP Error: ${res.status}`);
    }

    return res.json();
  }

  // ── INICIALIZÁCIA ──
  /**
   * Inicializuje konfiguráciu. 
   * @param {string} userPin - PIN zadaný užívateľom. Ak nie je zadaný, použije sa len cache.
   */
  async function init(userPin = null) {
    // Vždy najprv načítame to, čo máme v pamäti (pre offline štart)
    _config   = _fromCache('tb_app_config');
    _hardware = _fromCache('tb_hw_catalog');

    // Ak nemáme PIN, nepokúšame sa o sieťové volanie (zabráni Fetch Erroru)
    if (!userPin) {
      console.log('[Config] Načítaná lokálna cache, čakám na overenie PINu.');
      return { config: _config, hardware: _hardware };
    }

    try {
      // 1. Stiahnutie hlavnej konfigurácie
      const cfgRes = await _post({ action: 'get_config', pin: userPin });
      if (cfgRes?.status === 'success') {
        _config = cfgRes.data;
        _toCache('tb_app_config', _config);
        console.log('[Config] Nastavenia úspešne aktualizované z GAS.');
      } else {
        console.warn('[Config] GAS vrátil chybu pri get_config:', cfgRes?.message);
      }

      // 2. Stiahnutie katalógu hardvéru
      const hwRes = await _post({ action: 'loadHardware', pin: userPin });
      if (hwRes?.status === 'success') {
        _hardware = hwRes.data;
        _toCache('tb_hw_catalog', _hardware);
        console.log('[Config] Hardware katalóg aktualizovaný.');
      }
    } catch (e) {
      console.error('[Config] Sieťová chyba (Fetch Error):', e.message);
      // Fallback: ak sme v režime overovania a fetch zlyhal, vrátime aspoň cache
    }

    return { config: _config, hardware: _hardware };
  }

  // ── VEREJNÉ GETTERY ──
  function get()         { return _config; }
  
  function getHardware() { 
    // Ošetrenie štruktúry hardware-catalog.json
    if (Array.isArray(_hardware)) return _hardware;
    if (_hardware?.hardware_catalog) return _hardware.hardware_catalog;
    return [];
  }

  function getGasUrl()   { return GAS_URL; }

  function getRoundAProvider() {
    return _config?.ai_configuration?.round_A?.default_provider || 'claude';
  }

  function getRoundAModel() {
    return _config?.ai_configuration?.round_A?.default_model || 'claude-haiku-4-5-20251001';
  }

  function getKBReaderUrl() {
    return _config?.app_settings?.kb_read_url || null;
  }

  function getValue(path, fallback = null) {
    if (!_config) return fallback;
    return path.split('.').reduce((o, k) => o?.[k], _config) ?? fallback;
  }

  // Exportovanie API
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
