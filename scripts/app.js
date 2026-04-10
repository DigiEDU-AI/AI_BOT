/**
 * scripts/app.js – PATCH verzia
 * Admin panel číta správnu štruktúru reálneho app-config.json.
 * Ostatná logika (routing, toasts, loading) ostáva rovnaká.
 */

window.App = (function () {

  let _screen      = 'login';
  let _toastCounter = 0;

  // ─────────────────────────────────────────
  async function init() {
    await AppConfig.init();

    Auth.bindPinPad();

    document.getElementById('btn-logout')?.addEventListener('click', Auth.logout.bind(Auth));
    document.getElementById('btn-admin')?.addEventListener('click', () => navigate('admin'));
    document.getElementById('btn-back')?.addEventListener('click', () => navigate('menu'));
    document.getElementById('btn-admin-back')?.addEventListener('click', () => navigate('menu'));
    document.getElementById('btn-new-case')?.addEventListener('click', () => navigate('menu'));
    document.getElementById('btn-read-kb')?.addEventListener('click', _openKB);

    document.querySelectorAll('.menu-card').forEach(card => {
      card.addEventListener('click', () => navigate('module', card.dataset.module));
    });

    window.addEventListener('online',  _goOnline);
    window.addEventListener('offline', _goOffline);
    _checkNet();

    // Login footer
    const fi = document.getElementById('login-footer-info');
    if (fi) fi.textContent = `v1.0.0 ${navigator.onLine ? '· Online' : '· Offline'}`;

    console.log('[App] TechBot ready');
  }

  // ─────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────
  function navigate(screen, moduleKey = null) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    _screen = screen;
    document.getElementById('screen-' + screen)?.classList.add('active');

    if (screen === 'module' && moduleKey) _loadModule(moduleKey);
    if (screen === 'admin')               _loadAdmin();
    if (screen === 'menu')                _refreshMenu();

    window.scrollTo(0, 0);
  }

  function currentScreen() { return _screen; }

  // ─────────────────────────────────────────
  // Module routing
  // ─────────────────────────────────────────
  const MODS = {
    hw:    () => ModuleHW,
    m365:  () => ModuleM365,
    wifi:  () => ModuleWifi,
    digi:  () => ModuleDigi,
    other: () => ModuleOther,
  };

  function _loadModule(key) {
    const c = document.getElementById('module-content');
    if (!c) return;
    c.innerHTML = '';
    const mod = MODS[key]?.();
    mod ? mod.init(c) : (c.innerHTML = `<div class="section-note">Modul "${key}" nie je dostupný.</div>`);
  }

  // ─────────────────────────────────────────
  // Admin panel
  // ─────────────────────────────────────────
  function _loadAdmin() {
    const c = document.getElementById('admin-content');
    if (!c) return;

    if (!Auth.isAdminAuthed()) {
      c.innerHTML = `
        <div class="admin-unlock-wrap">
          <div class="admin-unlock-title">🔐 Admin autentifikácia</div>
          <div class="admin-pw-row">
            <input type="password" id="admin-pw-input" placeholder="Admin heslo">
            <button class="btn btn-primary" onclick="App.submitAdminPass()">Vstúpiť</button>
          </div>
          <div id="admin-pw-error" class="login-error hidden" style="max-width:320px">Nesprávne heslo</div>
        </div>`;
      document.getElementById('admin-pw-input')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') submitAdminPass();
      });
      return;
    }
    _renderAdminDashboard(c);
  }

  async function submitAdminPass() {
    const pass = document.getElementById('admin-pw-input')?.value;
    if (!pass) return;
    const ok = await Auth.verifyAdmin(pass);
    if (ok) _renderAdminDashboard(document.getElementById('admin-content'));
    else    document.getElementById('admin-pw-error')?.classList.remove('hidden');
  }

  function _renderAdminDashboard(c) {
    const ci = Cache.getInfo();
    const qL = Cache.getQueueLength();

    // Prečítaj aktuálne hodnoty z reálneho configu
    const provA  = AppConfig.getRoundAProvider();
    const modA   = AppConfig.getRoundAModel();
    const provB  = AppConfig.getRoundBProvider();
    const modB   = AppConfig.getRoundBModel();
    const kbUrl  = AppConfig.getKBReaderUrl() || '';

    c.innerHTML = `
      <div class="admin-grid">

        <div class="admin-card">
          <div class="admin-card-title">Stav systému</div>
          <div class="stat-row"><span class="stat-label">Spojenie</span>
            <span class="stat-value">${navigator.onLine ? '🟢 Online' : '🔴 Offline'}</span></div>
          <div class="stat-row"><span class="stat-label">Posledné online</span>
            <span class="stat-value">${ci.lastOnline}</span></div>
          <div class="stat-row"><span class="stat-label">Sync fronta</span>
            <span class="stat-value">${qL} položiek</span></div>
          <div class="stat-row"><span class="stat-label">Cache záznamy</span>
            <span class="stat-value">${ci.cacheKeys}</span></div>
          ${qL > 0 ? '<div class="btn-group" style="margin-top:.75rem"><button class="btn btn-warning" onclick="App.flushQueue()">⬆ Synchronizovať frontu</button></div>' : ''}
        </div>

        <div class="admin-card">
          <div class="admin-card-title">AI – Kolo A (analýza)</div>
          <div class="form-group">
            <label>Provider</label>
            <select id="adm-a-provider">
              <option value="gemini" ${provA==='gemini'?'selected':''}>Gemini</option>
              <option value="claude" ${provA==='claude'?'selected':''}>Claude</option>
              <option value="gpt"    ${provA==='gpt'   ?'selected':''}>GPT (OpenAI)</option>
            </select>
          </div>
          <div class="form-group">
            <label>Model</label>
            <input type="text" id="adm-a-model" value="${modA}">
          </div>
          <div class="admin-card-title" style="margin-top:1rem">AI – Kolo B (korekcia)</div>
          <div class="form-group">
            <label>Provider</label>
            <select id="adm-b-provider">
              <option value="claude" ${provB==='claude'?'selected':''}>Claude</option>
              <option value="gemini" ${provB==='gemini'?'selected':''}>Gemini</option>
              <option value="gpt"    ${provB==='gpt'   ?'selected':''}>GPT</option>
            </select>
          </div>
          <div class="form-group">
            <label>Model</label>
            <input type="text" id="adm-b-model" value="${modB}">
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" onclick="App.saveAIConfig()">Uložiť AI nastavenia</button>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-title">Nastavenia aplikácie</div>
          <div class="form-group">
            <label>URL – Čítať KB</label>
            <input type="text" id="adm-kb-url" value="${kbUrl}">
          </div>
          <div class="form-group">
            <label>Nový PIN (prázdne = zachovať)</label>
            <input type="password" id="adm-pin" placeholder="••••••">
          </div>
          <div class="form-group">
            <label>Nové admin heslo (prázdne = zachovať)</label>
            <input type="password" id="adm-apw" placeholder="••••••••">
          </div>
          <div class="btn-group">
            <button class="btn btn-primary" onclick="App.saveAppConfig()">Uložiť</button>
          </div>
        </div>

        <div class="admin-card">
          <div class="admin-card-title">Cache</div>
          <div class="section-note" style="margin-bottom:.75rem">Vymazanie cache vynúti stiahnutie čerstvých dát.</div>
          <div class="btn-group">
            <button class="btn btn-secondary" onclick="App.clearKBCache()">Vymazať KB cache</button>
            <button class="btn btn-danger-outline" onclick="App.clearAllCache()">Vymazať všetko</button>
          </div>
        </div>

      </div>`;
  }

  // Admin akcie
  async function flushQueue() {
    showLoading('Synchronizujem frontu...'); try { const n = await API.flushQueue(); showToast(`Synchronizovaných: ${n}`, 'success'); } catch { showToast('Sync zlyhalo','error'); } finally { hideLoading(); }
  }

  async function saveAIConfig() {
    // Zapíše do app-config.json cez GAS update_config
    // Štruktúra musí odpovedať reálnemu configu: ai_configuration.round_A.default_provider atď.
    const payload = {
      'ai_configuration.round_A.default_provider': document.getElementById('adm-a-provider')?.value,
      'ai_configuration.round_A.default_model':    document.getElementById('adm-a-model')?.value,
      'ai_configuration.round_B.default_provider': document.getElementById('adm-b-provider')?.value,
      'ai_configuration.round_B.default_model':    document.getElementById('adm-b-model')?.value,
    };
    showLoading('Ukladám AI nastavenia...');
    try {
      for (const [k, v] of Object.entries(payload)) await API.updateConfig(k, v);
      // Obnoviť cache
      await AppConfig.init();
      showToast('AI nastavenia uložené', 'success');
    } catch { showToast('Uloženie zlyhalo','error'); } finally { hideLoading(); }
  }

  async function saveAppConfig() {
    const kbUrl  = document.getElementById('adm-kb-url')?.value;
    const newPin = document.getElementById('adm-pin')?.value;
    const newAdm = document.getElementById('adm-apw')?.value;
    showLoading('Ukladám nastavenia...');
    try {
      if (kbUrl)   await API.updateConfig('app_settings.kb_read_url', kbUrl);
      if (newPin)  await API.updateConfig('pin', newPin);
      if (newAdm)  await API.updateConfig('admin_password', newAdm);
      showToast('Nastavenia uložené', 'success');
    } catch { showToast('Uloženie zlyhalo','error'); } finally { hideLoading(); }
  }

  function clearKBCache() { Cache.clear('kb_idx_'); Cache.remove('tag_dict'); showToast('KB cache vymazaná','info'); }
  function clearAllCache() { if (!confirm('Naozaj?')) return; Cache.clear(); showToast('Cache vymazaná','warning'); }

  // ─────────────────────────────────────────
  // Connectivity
  // ─────────────────────────────────────────
  function _checkNet() { navigator.onLine ? _goOnline() : _goOffline(); }
  function _goOnline() {
    _setBadges(true); Cache.markOnline(); API.flushQueue().catch(()=>{});
  }
  function _goOffline() {
    _setBadges(false); Cache.markOffline();
    showToast('Offline – AI volania nie sú dostupné','warning');
  }
  function _setBadges(online) {
    document.querySelectorAll('.status-badge').forEach(b => {
      b.className = 'status-badge ' + (online ? 'online' : 'offline');
      b.textContent = online ? 'ONLINE' : 'OFFLINE';
    });
  }

  function _openKB() {
    const url = AppConfig.getKBReaderUrl();
    if (url) window.open(url,'_blank'); else showToast('KB URL nie je nastavená','warning');
  }

  function _refreshMenu() {
    const qL = Cache.getQueueLength();
    const el = document.getElementById('header-cache-info');
    if (el) el.textContent = qL > 0 ? `⚠ ${qL} čaká` : '';
  }

  // ─────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────
  function showLoading(text = 'Spracovávam...') {
    const el = document.getElementById('overlay-loading');
    const tx = document.getElementById('loading-text');
    el?.classList.remove('hidden');
    if (tx) tx.textContent = text;
  }
  function hideLoading() { document.getElementById('overlay-loading')?.classList.add('hidden'); }

  // ─────────────────────────────────────────
  // Toasts
  // ─────────────────────────────────────────
  function showToast(msg, type = 'info', ms = 3500) {
    const c = document.getElementById('toast-container');
    if (!c) return;
    const id = 'toast-' + (++_toastCounter);
    const t  = document.createElement('div');
    t.className = `toast toast-${type}`; t.id = id; t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.remove(), ms);
  }

  // ─────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  return {
    navigate, currentScreen,
    showLoading, hideLoading, showToast,
    submitAdminPass, saveAIConfig, saveAppConfig,
    flushQueue, clearKBCache, clearAllCache,
  };
})();
