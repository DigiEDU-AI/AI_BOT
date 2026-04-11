/**
 * scripts/api.js
 * Hlavné komunikačné rozhranie pre AI požiadavky a ukladanie dát.
 * FIX: Implementovaná text/plain hlavička pre obídenie CORS blokácie.
 */

window.AppAPI = (function () {

  /**
   * Interná funkcia na vykonanie POST požiadavky na GAS backend.
   * Automaticky pripája PIN užívateľa z localStorage.
   */
  async function _post(payload) {
    const url = window.AppConfig.getGasUrl(); // Načíta URL z config.js
    const pin = localStorage.getItem('tb_user_pin'); // Načíta PIN uložený v auth.js
    
    if (!pin) {
      console.warn('[API] PIN nie je v pamäti, požiadavka môže zlyhať.');
    }

    const res = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      body: JSON.stringify({ 
        ...payload, 
        pin: pin // Každá požiadavka musí obsahovať PIN
      }),
      headers: {
        // Kľúč k vyriešeniu CORS: Musí byť text/plain
        'Content-Type': 'text/plain;charset=utf-8'
      }
    });

    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }

    return await res.json();
  }

  /**
   * Odošle požiadavku na AI (Kolo A alebo Kolo B).
   * @param {string} prompt - Textová inštrukcia pre AI.
   * @param {object} opts - Voliteľné nastavenia (model, provider).
   */
  async function askAI(prompt, opts = {}) {
    return await _post({
      action: 'ai_request',
      payload: {
        prompt: prompt,
        provider: opts.provider || window.AppConfig.getRoundAProvider(),
        model: opts.model || window.AppConfig.getRoundAModel(),
        max_tokens: opts.max_tokens || 2000
      }
    });
  }

  /**
   * Uloží výsledok diagnostiky (Case) do Google Drive.
   * @param {object} caseData - Kompletný objekt s dátami o prípade.
   */
  async function saveCase(caseData) {
    return await _post({
      action: 'saveCase',
      caseData: caseData
    });
  }

  /**
   * Načíta zoznam indexovaných súborov z Knowledge Base pre daný modul.
   * @param {string} moduleName - Názov modulu (napr. KB_HW).
   */
  async function getKBIndex(moduleName) {
    return await _post({
      action: 'kb_index',
      module: moduleName
    });
  }

  // Verejné rozhranie modulu
  return {
    askAI,
    saveCase,
    getKBIndex
  };

})();
