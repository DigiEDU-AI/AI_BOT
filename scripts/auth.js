/**
 * scripts/auth.js
 * Správa PIN kódu a autentifikácia.
 */
const Auth = (function () {
  let enteredPin = "";
  const MAX_PIN_LENGTH = 6;

  const pinDisplay = document.getElementById('pin-display');
  const loginError = document.getElementById('login-error');
  const loginFooter = document.getElementById('login-footer-info');

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

    document.addEventListener('keydown', (e) => {
      const screenLogin = document.getElementById('screen-login');
      if (screenLogin && screenLogin.classList.contains('active')) {
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

  async function handleLogin() {
    if (enteredPin.length < MAX_PIN_LENGTH) {
      _showError("Zadajte kompletný 6-ciferný PIN.");
      return;
    }

    _setLoading(true);

    try {
      // Voláme AppConfig, ktorý v sebe rieši action: 'get_config' [cite: 75]
      const { config } = await window.AppConfig.init(enteredPin);
      
      if (config) {
        console.log('[Auth] Login úspešný.');
        _showScreen('screen-menu');
        if (window.App && typeof window.App.init === 'function') {
          window.App.init();
        }
      } else {
        _showError("Nesprávny PIN alebo chyba konfigurácie.");
        _clearPin();
      }
    } catch (error) {
      console.error('[Auth] Kritická chyba prihlásenia:', error);
      _showError("Chyba spojenia. Skontrolujte konzolu (F12).");
    } finally {
      _setLoading(false);
    }
  }

  function _showError(msg) {
    loginError.innerText = msg;
    loginError.classList.remove('hidden');
  }

  function _setLoading(isLoading) {
    loginFooter.innerText = isLoading ? "Overujem a sťahujem dáta..." : "Pripravený";
    if (isLoading) pinDisplay.classList.add('loading');
    else pinDisplay.classList.remove('loading');
  }

  function _showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
  }

  return { init, handleLogin };
})();

document.addEventListener('DOMContentLoaded', () => Auth.init());
// v2
