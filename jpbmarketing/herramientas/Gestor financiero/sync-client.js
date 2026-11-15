'use strict';

const GESTIPYME_SYNC_KEYS = {
  expenses: 'gestipyme_expenses',
  income:   'gestipyme_income',
  tasks:    'gestipyme_tasks',
  diary:    'gestipyme_diary',
  emoTools: 'gestipyme_emo_tools',
  videos:   'gestipyme_videos',
  rules:    'gestipyme_rules',
  pipeline: 'gestipyme_pipeline',
  notes:    'gestipyme_notes',
  notesDismissed: 'gestipyme_notes_dismissed',
};

const SYNC_TIMESTAMP_KEY = 'gestipyme_sync_updatedAt';
const PUSH_DEBOUNCE_MS = 1500;

async function gestipymeSyncRequestInit(method, body) {
  if (window.gestipyme) {
    const cfg = await window.gestipyme.getSyncConfig();
    if (!cfg || !cfg.pagesUrl || !cfg.pagesUser) return null;
    const token = btoa(`${cfg.pagesUser}:${cfg.pagesPass}`);
    return {
      url: `${cfg.pagesUrl}/api/state`,
      init: {
        method,
        headers: {
          Authorization: `Basic ${token}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    };
  }
  return {
    url: 'api/state',
    init: {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    },
  };
}

let pushTimer = null;

window.gestipymeSync = {
  async pullAndApply() {
    try {
      const req = await gestipymeSyncRequestInit('GET');
      if (!req) return false;
      const res = await fetch(req.url, req.init);
      if (!res.ok) return false;
      const { updatedAt, data } = await res.json();
      const localUpdatedAt = parseInt(localStorage.getItem(SYNC_TIMESTAMP_KEY) || '0', 10);
      if (!updatedAt || updatedAt <= localUpdatedAt) return false;

      Object.entries(GESTIPYME_SYNC_KEYS).forEach(([shortKey, storageKey]) => {
        if (data && data[shortKey] !== undefined) {
          localStorage.setItem(storageKey, JSON.stringify(data[shortKey]));
        }
      });
      localStorage.setItem(SYNC_TIMESTAMP_KEY, String(updatedAt));
      return true;
    } catch (err) {
      console.warn('[sync] No se pudo traer el estado remoto:', err.message);
      return false;
    }
  },

  async pushNow() {
    try {
      const data = {};
      Object.entries(GESTIPYME_SYNC_KEYS).forEach(([shortKey, storageKey]) => {
        try { data[shortKey] = JSON.parse(localStorage.getItem(storageKey)) || []; }
        catch { data[shortKey] = []; }
      });

      const req = await gestipymeSyncRequestInit('POST', { data });
      if (!req) return;
      const res = await fetch(req.url, req.init);
      if (!res.ok) return;
      const { updatedAt } = await res.json();
      if (updatedAt) localStorage.setItem(SYNC_TIMESTAMP_KEY, String(updatedAt));
    } catch (err) {
      console.warn('[sync] No se pudo guardar el estado remoto:', err.message);
    }
  },

  pushDebounced() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => window.gestipymeSync.pushNow(), PUSH_DEBOUNCE_MS);
  },
};
