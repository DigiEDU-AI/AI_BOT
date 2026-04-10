/**
 * scripts/auth.js
 * Správa PIN kódu, autentifikácia a prepínanie obrazoviek.
 */

const Auth = (function () {
  let enteredPin = "";
  const MAX_PIN_LENGTH = 6; // Podľa README

  // DOM elementy
  const pinDisplay = document.getElementById('pin-display');
  const loginError = document.getElementById('login-error');
  const loginFooter = document.getElementById('login-footer-info');

  /**
   * Inicializácia eventov pre PIN pad
   */
  function init() {
    console.log('[Auth] Inicializujem PIN pad...');
    
    document.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const digit = btn.getAttribute('data-digit');
        const action = btn.getAttribute('data-action');

        if (digit) _addDigit(digit);
        if (action === 'clear') _clearPin();
        if (action === 'submit') handleLogin();
      });
    });

    // Umožníme písať PIN aj na klávesnici
    document.addEventListener('keydown', (e) => {
      if (document.getElementById('screen-login').classList.contains('active')) {
        if (e.key >= '0' && e.key <= '9') _addDigit(e.key);
        if (e.key === 'Backspace') _clearPin();
        if (e.key === 'Enter') handleLogin();
      }
    });
  }

  function _addDigit(digit) {
    if (enteredPin.length < MAX_PIN_LENGTH) {
      enteredPin += digit;
      _updateDisplay();
      loginError.classList.add('hidden');
    }
  }

  function _clearPin() {
    enteredPin = "";
    _updateDisplay();
  }

  function _updateDisplay() {
    const dots = pinDisplay.querySelectorAll('.pin-dot');
    dots.forEach((dot, index) => {
      if (index < enteredPin.length) {
        dot.classList.add('filled');
      } else {
        dot.classList.remove('filled');
      }
    });
  }

  /**
   * Hlavná funkcia prihlásenia
   */
  async function handleLogin() {
    if (enteredPin.length < MAX_PIN_LENGTH) {
      _showError("Zadajte kompletný 6-ciferný PIN.");
      return;
    }

    _setLoading(true);

    try {
      // Voláme AppConfig s reálnym PINom
      // To spustí akcie 'get_config' a 'loadHardware' v GAS
      const { config } = await window.AppConfig.init(enteredPin);

      if (config) {
        console.log('[Auth] Login úspešný.');
        _showScreen('screen-menu');
        
        // Ak existuje hlavný App ovládač, povieme mu, že sme online
        if (window.App && typeof window.App.init === 'function') {
          window.App.init();
        }
      } else {
        // Ak config neprišiel, pravdepodobne zlý PIN v Script Properties
        _showError("Nesprávny PIN. Skúste to znova.");
        _clearPin();
      }
    } catch (error) {
      console.error('[Auth] Kritická chyba prihlásenia:', error);
      _showError("Chyba spojenia (Fetch Error). Skontrolujte GAS URL.");
    } finally {
      _setLoading(false);
    }
  }

  function _showError(msg) {
    loginError.innerText = msg;
    loginError.classList.remove('hidden');
  }

  function _setLoading(isLoading) {
    if (isLoading) {
      loginFooter.innerText = "Overujem a sťahujem dáta...";
      pinDisplay.classList.add('loading');
    } else {
      loginFooter.innerText = "Pripravený";
      pinDisplay.classList.remove('loading');
    }
  }

  function _showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  return {
    init,
    handleLogin
  };
})();

// Spustenie po načítaní DOMu
document.addEventListener('DOMContentLoaded', () => Auth.init());
