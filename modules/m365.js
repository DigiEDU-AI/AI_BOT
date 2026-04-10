/**
 * modules/m365.js
 * Factory pre štandardné moduly (M365, WiFi, DigiEDU, Iný).
 * Používa AppConfig.getRoundA*() pre správne čítanie konfigurácie.
 */

function _createStandardModule(cfg) {
  const { key, icon, title, placeholder, systemPrompt } = cfg;

  let _caseId = null;
  let _screenshotBase64 = null;

  function init(container) {
    _caseId = `CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
    _screenshotBase64 = null;

    document.getElementById('module-title').textContent = `${icon} ${title}`;
    document.getElementById('case-id-display').textContent = _caseId;
    document.getElementById('btn-new-case').classList.remove('hidden');

    container.innerHTML = _html();
    _bind(container);
  }

  function _html() {
    return `
      <div class="form-section">
        <div class="form-section-title">Popis problému</div>
        <div class="form-group">
          <label>Opíšte problém čo najpresnejšie</label>
          <textarea id="std-problem" rows="6" placeholder="${placeholder}"></textarea>
        </div>
        <div class="form-group">
          <label>Screenshot / foto (voliteľné – neukladá sa, iba analýza)</label>
          <div class="upload-zone" id="std-upload-zone">
            <input type="file" id="std-screenshot" accept="image/*">
            <div class="upload-zone-text"><strong>Kliknite</strong> alebo presuňte obrázok sem</div>
          </div>
          <div class="upload-preview" id="std-upload-preview">
            <span id="std-upload-name">—</span>
            <button id="std-clear-btn">✗</button>
          </div>
        </div>
      </div>
      <div class="btn-group">
        <button class="btn btn-primary" id="btn-std-analyze">🔍 Analyzovať</button>
        <button class="btn btn-secondary" onclick="App.navigate('menu')">Späť</button>
      </div>
      <div id="std-output-area" style="margin-top:1.5rem"></div>
    `;
  }

  function _bind(container) {
    const fi   = container.querySelector('#std-screenshot');
    const zone = container.querySelector('#std-upload-zone');

    fi?.addEventListener('change', e => _file(e.target.files[0]));
    zone?.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone?.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('drag-over'); _file(e.dataTransfer.files[0]); });
    container.querySelector('#btn-std-analyze')?.addEventListener('click', _analyze);
    container.querySelector('#std-clear-btn')?.addEventListener('click', () => {
      _screenshotBase64 = null;
      document.getElementById('std-screenshot').value = '';
      document.getElementById('std-upload-preview').classList.remove('visible');
    });
  }

  async function _file(f) {
    if (!f?.type.startsWith('image/')) return;
    document.getElementById('std-upload-name').textContent = f.name;
    document.getElementById('std-upload-preview').classList.add('visible');
    _screenshotBase64 = await new Promise((res, rej) => {
      const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(f);
    });
  }

  async function _analyze() {
    const problem = document.getElementById('std-problem')?.value?.trim();
    if (!problem) { App.showToast('Vyplňte popis problému', 'warning'); return; }

    App.showLoading(`AI analyzuje — Kolo 1 (${AppConfig.getRoundAProvider()})...`);

    const prompt = `${systemPrompt}
Analyzuj nasledujúci problém a vráť VÝLUČNE JSON (žiadny iný text, žiadne backticky):

{
  "main_advice": "300-800 znakov",
  "quick_tips": ["tip 1", "tip 2", "tip 3"],
  "questions": ["otázka 1", "otázka 2", "otázka 3"],
  "possible_causes": ["príčina 1", "príčina 2", "príčina 3"],
  "recommendations": ["krok 1", "krok 2", "krok 3", "krok 4", "krok 5"]
}

Problém: ${problem}
${_screenshotBase64 ? '[Screenshot priložený]' : ''}`;

    const draft = {
      case_id: _caseId, created_at: new Date().toISOString(),
      status: 'open', module: key,
      input: { problem_text: problem, screenshot_uploaded: !!_screenshotBase64 },
    };
    Cache.saveDraft(draft);

    try {
      const res = await API.aiRequest({
        provider:        AppConfig.getRoundAProvider(),
        model:           AppConfig.getRoundAModel(),
        prompt, round: 'A',
        screenshotBase64: _screenshotBase64,
        max_cost_limit:  AppConfig.getRoundAMaxCost(),
      });

      let ai;
      try { ai = JSON.parse((res?.data || '').replace(/```json|```/g,'').trim()); }
      catch { ai = { main_advice: res?.data || '', quick_tips:[], questions:[], possible_causes:[], recommendations:[] }; }

      Cache.saveDraft({ ...draft, round_1: ai });
      const area = document.getElementById('std-output-area');
      if (area) {
        area.innerHTML = AIOutput.renderRound1(ai, _caseId);
        _r1bind(); area.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    } catch (e) { App.showToast('Analýza zlyhala: ' + e.message, 'error'); }
    finally { App.hideLoading(); }
  }

  function _r1bind() {
    document.getElementById('btn-round2')?.addEventListener('click', _r2);
    document.getElementById('btn-close-case-r1')?.addEventListener('click', _close);
  }

  async function _r2() {
    const fu = document.getElementById('followup-text-r1')?.value?.trim();
    const fd = AIOutput.getFailedCards();
    const dr = Cache.getDraft() || {};

    App.showLoading(`AI spresňuje — Kolo 2...`);
    const prompt = `Si odborný IT technik. Predchádzajúce kroky nepomohli.
Problém: ${dr.input?.problem_text || '—'}
Nepomohli: ${fd.join(', ') || 'žiadne'}
Nové info: ${fu || '—'}
Vráť IBA čistý text (200–600 znakov) s finálnou radou.`;

    try {
      const res = await API.aiRequest({
        provider: AppConfig.getRoundAProvider(), model: AppConfig.getRoundAModel(), prompt, round: 'A2',
      });
      const fa = res?.data || '';
      Cache.saveDraft({ ...dr, round_2: { disabled_cards: fd, user_followup: fu, final_advice: fa } });
      const area = document.getElementById('std-output-area');
      if (area) {
        document.getElementById('ai-output-round2')?.remove();
        area.insertAdjacentHTML('beforeend', AIOutput.renderRound2({ final_advice: fa }));
        document.getElementById('btn-close-case-r2')?.addEventListener('click', _close);
        document.getElementById('ai-output-round2')?.scrollIntoView({ behavior:'smooth' });
      }
    } catch (e) { App.showToast('Round 2 zlyhalo: ' + e.message, 'error'); }
    finally { App.hideLoading(); }
  }

  function _close() {
    const area = document.getElementById('std-output-area');
    if (!area) return;
    document.getElementById('case-close-section')?.remove();
    area.insertAdjacentHTML('beforeend', CaseClose.render(_caseId));
    document.getElementById('case-close-section')?.scrollIntoView({ behavior:'smooth' });
    document.getElementById('resolution-raw-text')?.addEventListener('input', () => {
      const t   = document.getElementById('resolution-raw-text').value.trim();
      const r   = document.getElementById('res-ok')?.classList.contains('sel-ok') ||
                  document.getElementById('res-fail')?.classList.contains('sel-fail');
      const btn = document.getElementById('btn-confirm-save');
      if (btn) btn.disabled = !(t && r);
    });
  }

  return { init };
}

// ══ Moduly ══
window.ModuleM365 = _createStandardModule({
  key: 'KB_365', icon: '🪟', title: '365 / Win problém',
  placeholder: 'Napr. Outlook sa nespustí po aktualizácii, Teams sa neotvorí, OneDrive nesynchrónizuje...\nUveďte verziu, chybový kód, kedy nastala zmena.',
  systemPrompt: 'Si skúsený IT technik pre Microsoft 365 a Windows v školskom prostredí. Komunikuj po slovensky.',
});

window.ModuleWifi = _createStandardModule({
  key: 'KB_WIFI', icon: '📡', title: 'WiFi problém',
  placeholder: 'Napr. Tablet Lenovo Tab K11 sa nepripojí na školskú WiFi, MikroTik router nereaguje, switch CSS610 nemá link...\nAP model, SSID, chybová hláška.',
  systemPrompt: 'Si skúsený sieťový technik (WiFi 6, LAN, MikroTik, TCP/IP, školská sieť). Komunikuj po slovensky.',
});

window.ModuleDigi = _createStandardModule({
  key: 'KB_ADMIN', icon: '🏫', title: 'DigiEDU školník',
  placeholder: 'Napr. Nemôžem priradiť žiaka do triedy v DigiEDU, chyba pri importe dát, synchronizácia s Active Directory nefunguje...',
  systemPrompt: 'Si odborník na DigiEDU, školské administratívne systémy a správu zariadení (MDM). Komunikuj po slovensky.',
});

window.ModuleOther = _createStandardModule({
  key: 'KB_INE', icon: '🔧', title: 'Iný problém',
  placeholder: 'Opíšte akýkoľvek technický alebo prevádzkový problém...',
  systemPrompt: 'Si všestranný IT technik pre školské prostredie. Komunikuj po slovensky.',
});
