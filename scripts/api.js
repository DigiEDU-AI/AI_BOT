/**
 * scripts/api.js - FINALNA NANOVA OPRAVA
 */
window.AppAPI = (function () {

  async function _post(payload) {
    const url = window.AppConfig.getGasUrl();
    const pin = localStorage.getItem('tb_user_pin');
    
    // Google Apps Script vyžaduje, aby požiadavka vyzerala čo najjednoduchšie
    const requestOptions = {
      method: 'POST',
      mode: 'cors', // MUSÍ BYŤ CORS kvôli redirectom Google
      headers: {
        // Úplne vynecháme zložité hlavičky, necháme len základ
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({ ...payload, pin })
    };

    try {
      const res = await fetch(url, requestOptions);
      
      // Ak Google presmeruje (redirect), fetch to v mode 'cors' spracuje, 
      // ale musíme dostať validný JSON
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("[API] Server nevrátil JSON, ale toto:", text);
        throw new Error("Neplatná odpoveď zo servera");
      }
    } catch (err) {
      console.error("[API] Kritická chyba komunikácie:", err);
      throw err;
    }
  }

  return {
    askAI: async (prompt, opts = {}) => await _post({
      action: 'ai_request',
      payload: {
        prompt,
        provider: opts.provider || window.AppConfig.getRoundAProvider(),
        model: opts.model || window.AppConfig.getRoundAModel()
      }
    }),
    saveCase: async (caseData) => await _post({ action: 'saveCase', caseData }),
    getKBIndex: async (module) => await _post({ action: 'kb_index', module })
  };
})();
