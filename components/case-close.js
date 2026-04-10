/**
 * components/case-close.js
 * Formulár ukončenia case-u.
 * Round B (jazyková korekcia) používa AppConfig.getRoundB*().
 */

window.CaseClose = (function () {

  let _resolution = null;

  function render(caseId) {
    return `
      <div class="case-close-card" id="case-close-section">
        <div class="case-close-title">▸ Ukončenie prípadu — ${caseId}</div>

        <div class="form-group">
          <label>Výsledok</label>
          <div class="resolution-toggle">
            <button class="res-btn" id="res-ok"   onclick="CaseClose.selectResolution('resolved')">✓ Vyriešené</button>
            <button class="res-btn" id="res-fail"  onclick="CaseClose.selectResolution('unresolved')">✗ Nevyriešené</button>
          </div>
        </div>

        <div class="form-group">
          <label id="res-text-label">Čo problém vyriešilo? / Aký bol výsledok?</label>
          <textarea id="resolution-raw-text" rows="4"
            placeholder="Popíšte čo pomohlo, aké kroky vyriešili problém, alebo čo sa zistilo..."></textarea>
        </div>

        <div class="btn-group">
          <button class="btn btn-secondary" id="btn-ai-correct"
            onclick="CaseClose.runAICorrection()">
            ✨ Jazyková korekcia (${AppConfig.getRoundBProvider()} / ${AppConfig.getRoundBModel()})
          </button>
        </div>

        <div id="correction-section" class="hidden" style="margin-top:1rem">
          <label>Náhľad upraveného textu</label>
          <div id="corrected-preview" class="corrected-preview is-loading">Spracovávam...</div>
          <div class="form-group" style="margin-top:.75rem">
            <label>Upravte text ak treba</label>
            <textarea id="corrected-editable" rows="4"></textarea>
          </div>
        </div>

        <hr class="sep">

        <div class="btn-group">
          <button class="btn btn-success" id="btn-confirm-save"
            onclick="CaseClose.confirmSave()" disabled>
            💾 Uložiť a zatvoriť CASE
          </button>
          <button class="btn btn-secondary" onclick="CaseClose.cancel()">Zrušiť</button>
        </div>

        <div id="save-result" class="hidden" style="margin-top:1rem"></div>
      </div>
    `;
  }

  function selectResolution(val) {
    _resolution = val;
    const ok   = document.getElementById('res-ok');
    const fail = document.getElementById('res-fail');
    const lbl  = document.getElementById('res-text-label');
    if (ok)   ok.className   = 'res-btn' + (val === 'resolved'   ? ' sel-ok'   : '');
    if (fail) fail.className = 'res-btn' + (val === 'unresolved' ? ' sel-fail' : '');
    if (lbl)  lbl.textContent = val === 'resolved' ? 'Čo problém vyriešilo?' : 'Čo sa zistilo / ďalší postup?';
    _checkSaveBtn();
  }

  function _checkSaveBtn() {
    const t   = document.getElementById('resolution-raw-text')?.value?.trim();
    const btn = document.getElementById('btn-confirm-save');
    if (btn) btn.disabled = !(_resolution && t);
  }

  async function runAICorrection() {
    const raw = document.getElementById('resolution-raw-text')?.value?.trim();
    if (!raw) { App.showToast('Najprv vyplňte text', 'warning'); return; }

    const sec  = document.getElementById('correction-section');
    const prev = document.getElementById('corrected-preview');
    const edit = document.getElementById('corrected-editable');

    if (sec)  sec.classList.remove('hidden');
    if (prev) { prev.textContent = 'Spracovávam...'; prev.classList.add('is-loading'); }

    const prompt = `Si slovenský jazykový editor pre IT technickú dokumentáciu.
Uprav text technika – oprav gramatiku, interpunkciu, štyl.
Zachovaj technický obsah a fakty. Text musí ostať v slovenčine.
Vráť IBA upravený text, žiadne vysvetlenia.

Text: ${raw}`;

    try {
      const res = await API.aiRequest({
        provider: AppConfig.getRoundBProvider(),
        model:    AppConfig.getRoundBModel(),
        prompt, round: 'B',
      });
      const corrected = res?.data || raw;
      if (prev) { prev.textContent = corrected; prev.classList.remove('is-loading'); }
      if (edit) edit.value = corrected;
    } catch {
      if (prev) { prev.textContent = 'Korekcia zlyhala – použije sa pôvodný text.'; prev.classList.remove('is-loading'); }
      if (edit) edit.value = raw;
      App.showToast('AI korekcia zlyhala', 'warning');
    }
  }

  async function confirmSave() {
    const raw       = document.getElementById('resolution-raw-text')?.value?.trim() || '';
    const corrected = document.getElementById('corrected-editable')?.value?.trim()  || raw;

    const draft = Cache.getDraft() || {};
    const finalCase = {
      ...draft,
      status:     'closed',
      updated_at: new Date().toISOString(),
      resolution: { result: _resolution, user_raw_text: raw, user_corrected_text: corrected },
    };

    App.showLoading('Ukladám prípad...');
    try {
      const res = await API.saveCase(finalCase);
      Cache.clearDraft();

      const r = document.getElementById('save-result');
      if (r) {
        r.classList.remove('hidden');
        r.innerHTML = `<div class="section-note text-success">
          ✓ Case <strong>${finalCase.case_id}</strong> bol uložený a zapísaný do KB.
          ${res?.status === 'queued' ? '<br>⚠ Offline – synchronizuje sa po obnovení spojenia.' : ''}
        </div>`;
      }
      document.getElementById('btn-confirm-save')?.setAttribute('disabled', true);
      App.showToast('Case uložený!', 'success');
      setTimeout(() => App.navigate('menu'), 2500);
    } catch (e) {
      App.showToast('Chyba uloženia: ' + e.message, 'error');
    } finally {
      App.hideLoading();
    }
  }

  function cancel() { App.navigate('menu'); }

  return { render, selectResolution, runAICorrection, confirmSave, cancel };
})();
