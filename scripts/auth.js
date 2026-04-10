/**
 * scripts/auth.js — v1.2
 * Opravy:
 *  - PIN funguje pre ľubovoľnú dĺžku (nie len 6 číslic)
 *  - Auto-submit 0.8s po poslednom stlačení (min 4 číslice)
 *  - Čitateľná chybová hláška priamo v UI
 */

window.Auth = (function () {

  let _pinBuffer    = '';
  let _authenticated = false;
  let _adminAuthed  = false;
  let _currentPin   = null;
  let _autoTimer    = null;

  // ── PIN pad ──────────────────────────────
  function addDigit(d) {
    if (_pinBuffer.length >= 10) return;
    _pinBuffer += d;
    _updateDots();
    clearTimeout(_autoTimer);
    if (_pinBuffer.length >= 4) {
      _autoTimer = setTimeout(submit, 800);
    }
  }

  function clearLast() {
    clearTimeout(_autoTimer);
    _pinBuffer = _pinBuffer.slice(0, -1);
    _updateDots();
    document.getElementById('login-error')?.classList.add('hidden');
  }

  function _updateDots() {
    document.querySelectorAll('.pin-dot').forEach((d, i) => {
      d.classList.toggle('filled', i < _pinBuffer.length);
    });
  }

  // ── Submit ───────────────────────────────
  async function submit() {
    clearTimeout(_autoTimer);
    if (_pinBuffer.length < 4) {
      App.showToast('PIN musí mať aspoň 4 číslice', 'warning');
      return;
    }

    const submitBtn = document.querySelector('.pin-btn.pin-submit');
    if (submitBtn) submitBtn.textContent = '⏳';
    App.showLoading('Overujem prístup...');

    try {
      const r = await fetch(AppConfig.getGasUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_config', pin: _pinBuffer }),
        signal: AbortSignal.timeout(20000),
      });

      const data = await r.json();

      if (data?.status === 'success') {
        if (data.data) localStorage.setItem('tb_app_config', JSON.stringify(data.data));
        localStorage.setItem('tb_pin_b64', btoa(_pinBuffer));
        _currentPin = _pinBuffer;
        _authenticated = true;
        API.setPin(_pinBuffer);
        document.getElementById('login-error')?.classList.add('hidden');
        App.navigate('menu');
      } else {
        _fail(data?.message?.includes('PIN') ? 'Nesprávny PIN' : ('GAS: ' + (data?.message || 'chyba')));
      }

    } catch (e) {
      // Offline fallback
      const cached = localStorage.getItem('tb_pin_b64');
      if (cached && cached === btoa(_pinBuffer)) {
        _currentPin = _pinBuffer; _authenticated = true;
        API.setPin(_pinBuffer);
        App.navigate('menu');
        App.showToast('Offline – cache prihlásenie', 'warning');
      } else {
        _fail('Spojenie zlyhalo: ' + e.message);
      }
    } finally {
      App.hideLoading();
      if (submitBtn) submitBtn.textContent = '✓';
    }
  }

  function _fail(reason) {
    const el = document.getElementById('login-error');
    if (el) { el.textContent = reason; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 5000); }
    _pinBuffer = '';
    _updateDots();
  }

  // ── Admin ────────────────────────────────
  async function verifyAdmin(pass) {
    App.showLoading('Overujem admin...');
    try {
      const r = await fetch(AppConfig.getGasUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin_view', pin: _currentPin, adminPassword: pass }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await r.json();
      App.hideLoading();
      if (data?.status === 'success') { API.setAdminPass(pass); _adminAuthed = true; return true; }
      App.showToast('Nesprávne admin heslo', 'error');
      return false;
    } catch { App.hideLoading(); App.showToast('Chyba spojenia', 'error'); return false; }
  }

  // ── Logout ───────────────────────────────
  function logout() {
    clearTimeout(_autoTimer);
    _pinBuffer = ''; _currentPin = null;
    _authenticated = false; _adminAuthed = false;
    API.clearAuth(); _updateDots();
    App.navigate('login');
  }

  // ── Bind ─────────────────────────────────
  function bindPinPad() {
    document.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.digit  !== undefined) addDigit(btn.dataset.digit);
        if (btn.dataset.action === 'clear')   clearLast();
        if (btn.dataset.action === 'submit')  { clearTimeout(_autoTimer); submit(); }
      });
    });
    document.addEventListener('keydown', e => {
      if (App.currentScreen() !== 'login') return;
      if (/^[0-9]$/.test(e.key))   addDigit(e.key);
      if (e.key === 'Backspace')    clearLast();
      if (e.key === 'Enter')        { clearTimeout(_autoTimer); submit(); }
    });
  }

  function isAuthenticated() { return _authenticated; }
  function isAdminAuthed()   { return _adminAuthed; }
  function getCurrentPin()   { return _currentPin; }

  return { addDigit, clearLast, submit, verifyAdmin, logout, bindPinPad, isAuthenticated, isAdminAuthed, getCurrentPin };
})();
