/**
 * scripts/offline-cache.js
 * Local cache for KB indexes, tags, last cases.
 * Sync queue for pending actions while offline.
 */

window.Cache = (function () {

  const PREFIX = 'tb_';

  function _key(k) { return PREFIX + k; }

  // ── Basic KV ──────────────────────────────
  function set(key, value) {
    try { localStorage.setItem(_key(key), JSON.stringify({ v: value, ts: Date.now() })); }
    catch { console.warn('[Cache] set failed', key); }
  }

  function get(key, maxAgeMs = null) {
    try {
      const raw = localStorage.getItem(_key(key));
      if (!raw) return null;
      const { v, ts } = JSON.parse(raw);
      if (maxAgeMs && (Date.now() - ts) > maxAgeMs) return null;
      return v;
    } catch { return null; }
  }

  function remove(key) {
    localStorage.removeItem(_key(key));
  }

  function clear(prefix = '') {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(PREFIX + prefix));
    keys.forEach(k => localStorage.removeItem(k));
  }

  // ── Sync Queue ────────────────────────────
  const QUEUE_KEY = _key('sync_queue');

  function enqueue(action) {
    const q = _getQueue();
    q.push({ ...action, queued_at: new Date().toISOString() });
    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
    console.log('[Cache] Enqueued:', action.type);
  }

  function _getQueue() {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); }
    catch { return []; }
  }

  function getQueueLength() { return _getQueue().length; }

  async function processQueue(gasCallFn) {
    const q = _getQueue();
    if (!q.length) return 0;

    const remaining = [];
    let processed = 0;

    for (const item of q) {
      try {
        await gasCallFn(item);
        processed++;
      } catch {
        remaining.push(item);
      }
    }

    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
    return processed;
  }

  // ── KB Index cache ────────────────────────
  const ONE_HOUR = 3600 * 1000;
  const FOUR_HOURS = 4 * ONE_HOUR;

  function cacheKBIndex(module, data) { set('kb_idx_' + module, data); }
  function getKBIndex(module)         { return get('kb_idx_' + module, FOUR_HOURS); }

  function cacheTagDict(data) { set('tag_dict', data); }
  function getTagDict()       { return get('tag_dict', FOUR_HOURS); }

  function cacheLastCases(cases) { set('last_cases', cases); }
  function getLastCases()        { return get('last_cases', ONE_HOUR); }

  // ── Session: current case draft ───────────
  function saveDraft(caseData) { set('case_draft', caseData); }
  function getDraft()          { return get('case_draft'); }
  function clearDraft()        { remove('case_draft'); }

  // ── Connectivity state ────────────────────
  function markOnline()  { set('last_online', Date.now()); }
  function markOffline() { set('last_offline', Date.now()); }
  function wasRecentlyOnline(withinMs = 10 * 60 * 1000) {
    const t = get('last_online');
    return t && (Date.now() - t) < withinMs;
  }

  // ── Info ──────────────────────────────────
  function getInfo() {
    const q = _getQueue();
    const lastOnline = get('last_online');
    return {
      queueLength: q.length,
      lastOnline: lastOnline ? new Date(lastOnline).toLocaleString('sk') : '—',
      cacheKeys: Object.keys(localStorage).filter(k => k.startsWith(PREFIX)).length,
    };
  }

  return {
    set, get, remove, clear,
    enqueue, getQueueLength, processQueue,
    cacheKBIndex, getKBIndex,
    cacheTagDict, getTagDict,
    cacheLastCases, getLastCases,
    saveDraft, getDraft, clearDraft,
    markOnline, markOffline, wasRecentlyOnline,
    getInfo,
  };
})();
