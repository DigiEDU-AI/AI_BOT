/**
 * components/ai-output.js
 * Renders AI Round 1 and Round 2 output cards.
 * Supports multi-select marking of "failed" cards.
 */

window.AIOutput = (function () {

  // ─────────────────────────────────────────
  // Build Round 1 HTML
  // ─────────────────────────────────────────
  function renderRound1(data, caseId) {
    const {
      main_advice = '',
      quick_tips = [],
      questions = [],
      possible_causes = [],
      recommendations = [],
    } = data;

    return `
      <div class="ai-output-wrapper" id="ai-output-round1">
        <div class="ai-round-header">
          <span class="ai-round-badge">KOLO 1</span>
          <span class="ai-round-title">Analýza a odporúčania</span>
        </div>

        <div class="advice-card">
          <div class="advice-label">▸ Hlavná rada</div>
          <div class="advice-text">${_escape(main_advice)}</div>
        </div>

        ${_renderCardBlock('Rýchle tipy', quick_tips, 'tip', true)}
        ${_renderCardBlock('Doplňujúce otázky', questions, 'q', false)}
        ${_renderCardBlock('Možné príčiny', possible_causes, 'cause', true)}
        ${_renderCardBlock('Odporúčané kroky', recommendations, 'rec', true)}

        <div class="followup-card">
          <div class="advice-label">▸ Doplňujúce informácie</div>
          <div class="followup-hint">
            Označte karty vyššie, ktoré <strong>nepomohli</strong>, a doplňte nové poznatky.
          </div>
          <div class="form-group">
            <textarea id="followup-text-r1" rows="3"
              placeholder="Čo ste skúsili? Aká bola reakcia zariadenia? Nové informácie..."></textarea>
          </div>
        </div>

        <div class="btn-group">
          <button class="btn btn-primary" id="btn-round2">🔄 Poradiť znova</button>
          <button class="btn btn-secondary" id="btn-close-case-r1">✓ Ukončiť CASE</button>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────
  // Build Round 2 HTML
  // ─────────────────────────────────────────
  function renderRound2(data) {
    const { final_advice = '' } = data;

    return `
      <div class="ai-output-wrapper" id="ai-output-round2">
        <div class="ai-round-header">
          <span class="ai-round-badge" style="background:rgba(245,158,11,.12);color:var(--warning);border-color:rgba(245,158,11,.28)">KOLO 2</span>
          <span class="ai-round-title">Spresnená diagnóza</span>
        </div>

        <div class="advice-card" style="border-left-color:var(--warning)">
          <div class="advice-label" style="color:var(--warning)">▸ Finálna rada</div>
          <div class="advice-text">${_escape(final_advice)}</div>
        </div>

        <div class="btn-group">
          <button class="btn btn-success" id="btn-close-case-r2">✓ Ukončiť CASE</button>
        </div>
      </div>
    `;
  }

  // ─────────────────────────────────────────
  // Card block helper
  // ─────────────────────────────────────────
  function _renderCardBlock(label, items, prefix, selectable) {
    if (!items || !items.length) return '';
    const hint = selectable ? '<span class="selectable-hint">· kliknite na nepomohlo</span>' : '';
    const cards = items.map((text, i) => `
      <div class="output-card ${selectable ? 'selectable' : ''}"
           data-card-id="${prefix}_${i}"
           ${selectable ? 'onclick="AIOutput.toggleFailed(this)"' : ''}>
        <span class="oc-num">${String(i + 1).padStart(2,'0')}</span>
        <span class="oc-text">${_escape(text)}</span>
        ${selectable ? '<span class="oc-fail-icon">✗</span>' : ''}
      </div>
    `).join('');

    return `
      <div class="cards-block">
        <div class="cards-block-label">${label} ${hint}</div>
        <div class="cards-list">${cards}</div>
      </div>
    `;
  }

  // ─────────────────────────────────────────
  // Toggle failed state on a card
  // ─────────────────────────────────────────
  function toggleFailed(el) {
    el.classList.toggle('marked-failed');
  }

  // ─────────────────────────────────────────
  // Collect marked cards
  // ─────────────────────────────────────────
  function getFailedCards() {
    return Array.from(document.querySelectorAll('.output-card.marked-failed'))
      .map(el => el.dataset.cardId);
  }

  // ─────────────────────────────────────────
  // Escape HTML
  // ─────────────────────────────────────────
  function _escape(str) {
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/\n/g, '<br>');
  }

  return { renderRound1, renderRound2, toggleFailed, getFailedCards };
})();
