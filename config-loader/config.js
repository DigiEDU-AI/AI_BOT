window.AppConfig = (function () {
  const GAS_URL = 'https://script.google.com/macros/s/AKfycby-UXKn0bCVf7V47E7DIxMJzcfFt_T-fOai0JZ-adtS-fvmK0Qi8__I0UZeSGJZHr_I/exec';
  let _config = null;
  let _hardware = null;

  async function _post(payload) {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify(payload),
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }
    });
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    return await res.json();
  }

  return {
    init: async (userPin = null) => {
      _config = JSON.parse(localStorage.getItem('tb_app_config') || 'null');
      _hardware = JSON.parse(localStorage.getItem('tb_hw_catalog') || 'null');
      if (!userPin) return { config: _config, hardware: _hardware };

      try {
        const cfgRes = await _post({ action: 'get_config', pin: userPin });
        if (cfgRes?.status === 'success') {
          _config = cfgRes.data;
          localStorage.setItem('tb_app_config', JSON.stringify(_config));
        }
        const hwRes = await _post({ action: 'loadHardware', pin: userPin });
        if (hwRes?.status === 'success') {
          _hardware = hwRes.data;
          localStorage.setItem('tb_hw_catalog', JSON.stringify(_hardware));
        }
      } catch (e) { console.error('[Config] Chyba:', e.message); }
      return { config: _config, hardware: _hardware };
    },
    get: () => _config,
    getHardware: () => (Array.isArray(_hardware) ? _hardware : _hardware?.hardware_catalog || []),
    getGasUrl: () => GAS_URL,
    getRoundAProvider: () => _config?.ai_configuration?.round_A?.default_provider || 'claude',
    getRoundAModel: () => _config?.ai_configuration?.round_A?.default_model || 'claude-3-5-sonnet-20241022'
  };
})();
