/**
 * scripts/app.js
 * Hlavný riadiaci skript aplikácie TechBot.
 * Zabezpečuje prepínanie modulov a inicializáciu UI po prihlásení.
 */

const App = (function () {
  
  // ── INICIALIZÁCIA PO LOGINU ──
  function init() {
    console.log('[App] Inicializujem hlavné menu a prostredie...');
    
    _applyConfig();
    _setupEventListeners();
    _updateStatus();
  }

  /**
   * Nastaví UI podľa stiahnutého AppConfigu
   */
  function _applyConfig() {
    const config = window.AppConfig.get();
    if (!config) return;

    // Nastavenie názvu aplikácie z configu
    const appName = config.app_settings?.app_name || "TechBot Support";
    document.querySelector('.logo-title').innerText = appName.split(' ')[0]; 
    
    // Nastavenie informácií v hlavičke
    const cacheInfo = document.getElementById('header-cache-info');
    if (cacheInfo) {
      cacheInfo.innerText = `v${config.app_settings?.version || '1.0.0'}`;
    }
  }

  /**
   * Prepojenie tlačidiel v menu s funkciami
   */
  function _setupEventListeners() {
    // 1. Karty v menu (HW, WiFi, M365...)
    document.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => {
        const moduleId = card.getAttribute('data-module');
        _openModule(moduleId);
      });
    });

    // 2. Tlačidlá v headeri (Logout, Admin)
    document.getElementById('btn-logout')?.addEventListener('click', () => {
      location.reload(); // Najrýchlejší logout - reset aplikácie
    });

    document.getElementById('btn-admin')?.addEventListener('click', () => {
      _showScreen('screen-admin');
      // Ak máš admin.js, tu by sa volala jeho init funkcia
    });

    // 3. Tlačidlo "Čítať KB"
    document.getElementById('btn-read-kb')?.addEventListener('click', () => {
      const kbUrl = window.AppConfig.getKBReaderUrl();
      if (kbUrl) {
        window.open(kbUrl, '_blank');
      } else {
        alert('URL pre KB nie je v konfigurácii nastavená.');
      }
    });

    // 4. Tlačidlo späť v moduloch
    document.getElementById('btn-back')?.addEventListener('click', () => {
      _showScreen('screen-menu');
    });
  }

  /**
   * Logika otvárania konkrétneho modulu
   */
  function _openModule(moduleId) {
    const screenModule = document.getElementById('screen-module');
    const moduleTitle = document.getElementById('module-title');
    
    // Mapovanie ID na pekný názov
    const names = {
      'hw': 'Hardware Support',
      'm365': 'Microsoft 365 / Win',
      'wifi': 'WiFi & Network',
      'digi': 'DigiEDU Školník',
      'other': 'Ostatné problémy'
    };

    moduleTitle.innerText = names[moduleId] || 'Modul';
    _showScreen('screen-module');

    // Inicializácia špecifického modulu
    // Napríklad pre HW modul:
    if (moduleId === 'hw' && window.HWModule) {
      window.HWModule.init();
    } else {
      document.getElementById('module-content').innerHTML = `
        <div class="placeholder-msg">
          <p>Modul <strong>${moduleId.toUpperCase()}</strong> je v príprave.</p>
          <button onclick="App.goBack()">Späť do menu</button>
        </div>
      `;
    }
  }

  function _updateStatus() {
    const statusBadge = document.getElementById('header-status');
    if (statusBadge) {
      statusBadge.innerText = navigator.onLine ? 'ONLINE' : 'OFFLINE';
      statusBadge.className = `status-badge ${navigator.onLine ? 'online' : 'offline'}`;
    }
  }

  function _showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  // Verejné funkcie
  return {
    init,
    goBack: () => _showScreen('screen-menu')
  };

})();

// Sledovanie zmeny stavu siete
window.addEventListener('online', () => App.init());
window.addEventListener('offline', () => App.init());
