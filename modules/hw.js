/**
 * modules/hw.js
 * Hardware modul – kompletný flow Kolo1 / Kolo2 / Ukončenie.
 * Používa AppConfig.getRoundA*() pre správne čítanie konfigurácie.
 */

window.ModuleHW = (function () {

  const MODULE_KEY = 'KB_HW';
  let _caseId = null;
  let _screenshotBase64 = null;

  // ─────────────────────────────────────────
  function init(container) {
    _caseId = _genCaseId();
    _screenshotBase64 = null;

    document.getElementById('module-title').textContent = '🖨 HW problém';
    document.getElementById('case-id-display').textContent = _caseId;
    document.getElementById('btn-new-case').classList.remove('hidden');

    container.innerHTML = _renderForm();
    _bindForm(container);
    _loadHardware();
  }

  // ─────────────────────────────────────────
  function _renderForm() {
    return `
      <div class="form-section">
        <div class="form-section-title">Identifikácia zariadenia</div>
        <div class="form-group">
          <label>Zariadenie (z katalógu)</label>
          <select id="hw-select">
            <option value="">— Vyber zariadenie —</option>
          </select>
        </div>
        <div class="form-group">
          <label>Doplňujúci model / sériové číslo (voliteľné)</label>
          <input type="text" id="hw-manual-name"
            placeholder="napr. HP LaserJet Pro 3102fdwe, SN: VNB3K12345">
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">Popis problému</div>
        <div class="form-group">
          <label>Opíšte problém čo najpresnejšie</label>
          <textarea id="hw-problem" rows="5"
            placeholder="Napr. Tablet Lenovo Tab K11 sa nenabíja, LED bliká, na displeji sa zobrazuje animácia nabíjania ale batéria neklesá pod 1%..."></textarea>
        </div>
        <div class="form-group">
          <label>Screenshot / foto chyby (voliteľné – neukladá sa, iba analýza)</label>
          <div class="upload-zone" id="hw-upload-zone">
            <input type="file" id="hw-screenshot" accept="image/*">
            <div class="upload-zone-text">
              <strong>Kliknite</strong> alebo presuňte obrázok sem
            </div>
          </div>
          <div class="upload-preview" id="hw-upload-preview">
            <span id="hw-upload-name">—</span>
            <button onclick="ModuleHW.clearScreenshot()">✗</button>
          </div>
        </div>
      </div>

      <div class="btn-group">
        <button class="btn btn-primary" id="btn-hw-analyze">🔍 Analyzovať problém</button>
        <button class="btn btn-secondary" onclick="App.navigate('menu')">Späť</button>
      </div>

      <div id="hw-output-area" style="margin-top:1.5rem"></div>
    `;
  }

  function _bindForm(container) {
    const fileInput = container.querySelector('#hw-screenshot');
    const zone      = container.querySelector('#hw-upload-zone');

    fileInput?.addEventListener('change', e => _handleFile(e.target.files[0]));
    zone?.addEventListener('dragover',  e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone?.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone?.addEventListener('drop', e => {
      e.preventDefault(); zone.classList.remove('drag-over');
      _handleFile(e.dataTransfer.files[0]);
    });
    container.querySelector('#btn-hw-analyze')?.addEventListener('click', runAnalysis);
  }

  async function _handleFile(file) {
    if (!file?.type.startsWith('image/')) return;
    document.getElementById('hw-upload-name').textContent = file.name;
    document.getElementById('hw-upload-preview').classList.add('visible');
    _screenshotBase64 = await _toBase64(file);
  }

  function clearScreenshot() {
    _screenshotBase64 = null;
    document.getElementById('hw-screenshot').value = '';
    document.getElementById('hw-upload-preview').classList.remove('visible');
  }

  function _toBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result.split(',')[1]);
      r.onerror = rej;
      r.readAsDataURL(file);
    });
  }

  // ─────────────────────────────────────────
  // Načítanie HW katalógu
  // ─────────────────────────────────────────
  function _loadHardware() {
    const select  = document.getElementById('hw-select');
    if (!select) return;

    const catalog = AppConfig.getHardware();
    if (!catalog?.length) {
      select.innerHTML = '<option value="">— Katalóg nedostupný —</option>';
      return;
    }

    // Zoskupiť podľa category
    const groups = {};
    catalog.forEach(item => {
      const cat = item.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });

    const catLabels = {
      tablet: '📱 Tablety', notebook: '💻 Notebooky', 'printer-mfp': '🖨 Tlačiarne',
      display: '🖥 Displeje / Interaktívne', networking: '📡 Sieť', voip: '☎ VoIP',
      audio: '🔊 Audio', peripheral: '🖱 Periférie', storage: '💾 Úložiská',
      sensor: '📊 Senzory', projector: '📽 Projektory', power: '⚡ Napájanie',
      cable: '🔌 Káble', furniture: '🪑 Nábytok', other: '🔧 Ostatné',
    };

    Object.entries(groups).forEach(([cat, items]) => {
      const optGroup = document.createElement('optgroup');
      optGroup.label = catLabels[cat] || cat;
      items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = String(item.id);
        opt.textContent = `${item.name} — ${item.pn}`;
        opt.dataset.json = JSON.stringify(item);
        optGroup.appendChild(opt);
      });
      select.appendChild(optGroup);
    });
  }

  // ─────────────────────────────────────────
  // Kolo 1
  // ─────────────────────────────────────────
  async function runAnalysis() {
    const hwSelect  = document.getElementById('hw-select');
    const hwManual  = document.getElementById('hw-manual-name')?.value?.trim();
    const problem   = document.getElementById('hw-problem')?.value?.trim();

    if (!problem) { App.showToast('Vyplňte popis problému', 'warning'); return; }

    const selOpt   = hwSelect?.selectedOptions?.[0];
    const hwSelected = selOpt?.dataset?.json ? JSON.parse(selOpt.dataset.json) : null;

    App.showLoading(`AI analyzuje — Kolo 1 (${AppConfig.getRoundAProvider()})...`);

    const draft = {
      case_id: _caseId, created_at: new Date().toISOString(),
      status: 'open', module: MODULE_KEY,
      input: { hardware_selected: hwSelected, hardware_manual_text: hwManual, problem_text: problem, screenshot_uploaded: !!_screenshotBase64 },
    };
    Cache.saveDraft(draft);

    const prompt = _buildPromptR1({ hwSelected, hwManual, problem });

    try {
      const res = await API.aiRequest({
        provider:        AppConfig.getRoundAProvider(),
        model:           AppConfig.getRoundAModel(),
        prompt,
        round:           'A',
        screenshotBase64: _screenshotBase64,
        max_cost_limit:  AppConfig.getRoundAMaxCost(),
      });

      const aiData = _parseJSON(res?.data || '');
      Cache.saveDraft({ ...draft, round_1: aiData });

      const area = document.getElementById('hw-output-area');
      if (area) {
        area.innerHTML = AIOutput.renderRound1(aiData, _caseId);
        _bindR1();
        area.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (e) {
      App.showToast('AI analýza zlyhala: ' + e.message, 'error');
    } finally {
      App.hideLoading();
    }
  }

  function _bindR1() {
    document.getElementById('btn-round2')?.addEventListener('click', runRound2);
    document.getElementById('btn-close-case-r1')?.addEventListener('click', openCaseClose);
  }

  // ─────────────────────────────────────────
  // Kolo 2
  // ─────────────────────────────────────────
  async function runRound2() {
    const followup   = document.getElementById('followup-text-r1')?.value?.trim();
    const failed     = AIOutput.getFailedCards();
    const draft      = Cache.getDraft() || {};

    App.showLoading(`AI spresňuje — Kolo 2 (${AppConfig.getRoundAProvider()})...`);

    const prompt = `Si odborný IT technik. Predchádzajúce kroky nepomohli.
Pôvodný problém: ${draft.input?.problem_text || '—'}
Zariadenie: ${draft.input?.hardware_selected?.name || '—'} (PN: ${draft.input?.hardware_selected?.pn || '—'})
Nepomohli body: ${failed.join(', ') || 'žiadne'}
Nové informácie: ${followup || '—'}
Vráť IBA čistý text s finálnou radou a konkrétnymi ďalšími krokmi (200–600 znakov).`;

    try {
      const res = await API.aiRequest({
        provider: AppConfig.getRoundAProvider(),
        model:    AppConfig.getRoundAModel(),
        prompt, round: 'A2',
      });

      const fa = res?.data || '';
      Cache.saveDraft({ ...draft, round_2: { disabled_cards: failed, user_followup: followup, final_advice: fa } });

      const area = document.getElementById('hw-output-area');
      if (area) {
        document.getElementById('ai-output-round2')?.remove();
        area.insertAdjacentHTML('beforeend', AIOutput.renderRound2({ final_advice: fa }));
        document.getElementById('btn-close-case-r2')?.addEventListener('click', openCaseClose);
        document.getElementById('ai-output-round2')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (e) {
      App.showToast('Round 2 zlyhalo: ' + e.message, 'error');
    } finally {
      App.hideLoading();
    }
  }

  // ─────────────────────────────────────────
  // Ukončenie
  // ─────────────────────────────────────────
  function openCaseClose() {
    const area = document.getElementById('hw-output-area');
    if (!area) return;
    document.getElementById('case-close-section')?.remove();
    area.insertAdjacentHTML('beforeend', CaseClose.render(_caseId));
    document.getElementById('case-close-section')?.scrollIntoView({ behavior: 'smooth' });
    document.getElementById('resolution-raw-text')?.addEventListener('input', _updateSaveBtn);
  }

  function _updateSaveBtn() {
    const t   = document.getElementById('resolution-raw-text')?.value?.trim();
    const r   = document.getElementById('res-ok')?.classList.contains('sel-ok') ||
                document.getElementById('res-fail')?.classList.contains('sel-fail');
    const btn = document.getElementById('btn-confirm-save');
    if (btn) btn.disabled = !(t && r);
  }

  // ─────────────────────────────────────────
  // Prompt builder – Kolo 1
  // ─────────────────────────────────────────
  function _buildPromptR1({ hwSelected, hwManual, problem }) {
    const hw = hwSelected
      ? `Zariadenie: ${hwSelected.name} (PN: ${hwSelected.pn})\nPopis: ${hwSelected.description || '—'}\nKategória: ${hwSelected.category || '—'}`
      : 'Zariadenie: nie je vybrané z katalógu';

    return `Si skúsený IT technik L2/L3 pre školský hardvér (tablety, notebooky, tlačiarne, sieťové zariadenia, interaktívne tabule).
Analyzuj nasledujúci HW problém a vráť VÝLUČNE JSON v tomto formáte (žiadny iný text, žiadne markdown backticky):

{
  "main_advice": "hlavná odborná rada 300-800 znakov",
  "quick_tips": ["tip 1", "tip 2", "tip 3"],
  "questions": ["otázka 1", "otázka 2", "otázka 3"],
  "possible_causes": ["príčina 1", "príčina 2", "príčina 3"],
  "recommendations": ["krok 1", "krok 2", "krok 3", "krok 4", "krok 5"]
}

--- VSTUP ---
${hw}
${hwManual ? 'Doplnenie technika: ' + hwManual : ''}
Popis problému: ${problem}
${_screenshotBase64 ? '[Screenshot priložený – analyzujte zobrazený obsah]' : ''}`;
  }

  // ─────────────────────────────────────────
  function _parseJSON(raw) {
    try {
      return JSON.parse(raw.replace(/```json|```/g, '').trim());
    } catch {
      return { main_advice: raw, quick_tips: [], questions: [], possible_causes: [], recommendations: [] };
    }
  }

  function _genCaseId() {
    return `CASE-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 90000) + 10000)}`;
  }

  return { init, runAnalysis, runRound2, openCaseClose, clearScreenshot };
})();
