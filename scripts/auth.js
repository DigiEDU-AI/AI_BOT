/**
 * scripts/auth.js — v1.3 FINAL
 * Používa verify_pin akciu (PIN-chránená) – nie get_config (verejná).
 * Auto-submit po 0.8s od posledného stlačenia ak PIN >= 4 číslice.
 */
window.Auth = (function () {

  let _pin   = '';
  let _ok    = false;
  let _admin = false;
  let _saved = null;
  let _timer = null;

  // ── Pad ──────────────────────────────────
  function addDigit(d) {
    if (_pin.length >= 10) return;
    _pin += d;
    _dots();
    clearTimeout(_timer);
    if (_pin.length >= 4) _timer = setTimeout(submit, 800);
  }

  function clearLast() {
    clearTimeout(_timer);
    _pin = _pin.slice(0, -1);
    _dots();
    _hideErr();
  }

  function _dots() {
    document.querySelectorAll('.pin-dot').forEach((d, i) =>
      d.classList.toggle('filled', i < _pin.length));
  }

  // ── Submit ───────────────────────────────
  async function submit() {
    clearTimeout(_timer);
    if (_pin.length < 4) { App.showToast('PIN musí mať aspoň 4 číslice', 'warning'); return; }

    const btn = document.querySelector('.pin-btn.pin-submit');
    if (btn) btn.textContent = '⏳';
    App.showLoading('Overujem PIN...');

    try {
      const r    = await fetch(AppConfig.getGasUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'verify_pin', pin: _pin }),
        signal:  AbortSignal.timeout(20000),
      });
      const data = await r.json();

      if (data?.status === 'success') {
        _saved = _pin;
        _ok    = true;
        localStorage.setItem('tb_pin_b64', btoa(_pin));
        API.setPin(_pin);
        _hideErr();
        App.navigate('menu');
      } else {
        _fail(data?.message?.includes('PIN') ? 'Nesprávny PIN' : ('Chyba: ' + (data?.message || '?')));
      }
    } catch (e) {
      // Offline fallback
      const c = localStorage.getItem('tb_pin_b64');
      if (c && c === btoa(_pin)) {
        _saved = _pin; _ok = true;
        API.setPin(_pin);
        App.navigate('menu');
        App.showToast('Offline – cache prihlásenie', 'warning');
      } else {
        _fail('Spojenie zlyhalo: ' + e.message);
      }
    } finally {
      App.hideLoading();
      if (btn) btn.textContent = '✓';
    }
  }

  function _fail(msg) {
    const el = document.getElementById('login-error');
    if (el) { el.textContent = msg; el.classList.remove('hidden'); setTimeout(() => el.classList.add('hidden'), 5000); }
    App.showToast(msg, 'error');
    _pin = ''; _dots();
  }
  function _hideErr() { document.getElementById('login-error')?.classList.add('hidden'); }

  // ── Admin ────────────────────────────────
  async function verifyAdmin(pass) {
    App.showLoading('Overujem admin...');
    try {
      const r = await fetch(AppConfig.getGasUrl(), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'admin_view', pin: _saved, adminPassword: pass }),
        signal:  AbortSignal.timeout(15000),
      });
      const data = await r.json();
      App.hideLoading();
      if (data?.status === 'success') { API.setAdminPass(pass); _admin = true; return true; }
      App.showToast('Nesprávne admin heslo', 'error');
      return false;
    } catch { App.hideLoading(); App.showToast('Chyba spojenia', 'error'); return false; }
  }

  // ── Logout ───────────────────────────────
  function logout() {
    clearTimeout(_timer);
    _pin = ''; _saved = null; _ok = false; _admin = false;
    API.clearAuth(); _dots(); App.navigate('login');
  }

  // ── Bind ─────────────────────────────────
  function bindPinPad() {
    document.querySelectorAll('.pin-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.digit  !== undefined) addDigit(btn.dataset.digit);
        if (btn.dataset.action === 'clear')   clearLast();
        if (btn.dataset.action === 'submit')  { clearTimeout(_timer); submit(); }
      });
    });
    document.addEventListener('keydown', e => {
      if (App.currentScreen() !== 'login') return;
      if (/^[0-9]$/.test(e.key)) addDigit(e.key);
      if (e.key === 'Backspace') clearLast();
      if (e.key === 'Enter')     { clearTimeout(_timer); submit(); }
    });
  }

  function isAuthenticated() { return _ok; }
  function isAdminAuthed()   { return _admin; }
  function getCurrentPin()   { return _saved; }

  return { addDigit, clearLast, submit, verifyAdmin, logout, bindPinPad, isAuthenticated, isAdminAuthed, getCurrentPin };
})();
