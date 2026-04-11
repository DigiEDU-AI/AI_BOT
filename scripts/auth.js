const Auth = (function () {
  let enteredPin = "";
  const MAX_PIN_LENGTH = 6;
  const pinDisplay = document.getElementById('pin-display');
  const loginError = document.getElementById('login-error');
  const loginFooter = document.getElementById('login-footer-info');

  function init() {
    document.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const digit = btn.getAttribute('data-digit');
        const action = btn.getAttribute('data-action');
        if (digit) _addDigit(digit);
        if (action === 'clear') _clearPin();
        if (action === 'submit') handleLogin();
      });
    });
  }

  function _addDigit(digit) {
    if (enteredPin.length < MAX_PIN_LENGTH) {
      enteredPin += digit;
      _updateDisplay();
    }
  }

  function _clearPin() { enteredPin = ""; _updateDisplay(); }

  function _updateDisplay() {
    const dots = pinDisplay.querySelectorAll('.pin-dot');
    dots.forEach((dot, i) => dot.classList.toggle('filled', i < enteredPin.length));
  }

  async function handleLogin() {
    if (enteredPin.length < MAX_PIN_LENGTH) return;
    loginFooter.innerText = "Overujem...";
    try {
      const { config } = await window.AppConfig.init(enteredPin);
      if (config) {
        localStorage.setItem('tb_user_pin', enteredPin); // KRITICKÝ RIADOK
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById('screen-menu').classList.add('active');
        if (window.App?.init) window.App.init();
      } else {
        loginError.innerText = "Nesprávny PIN.";
        loginError.classList.remove('hidden');
        _clearPin();
      }
    } catch (e) { loginError.innerText = "Chyba spojenia."; }
    loginFooter.innerText = "Pripravený";
  }

  return { init };
})();
document.addEventListener('DOMContentLoaded', () => Auth.init());
