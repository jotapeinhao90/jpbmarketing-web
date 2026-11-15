/* Eventos de tu Google Calendar (solo lectura) vía api/gcal. Se guardan en memoria y en un caché local
   (no entran al estado sincronizado, para no duplicarse entre dispositivos). */
(function () {
  'use strict';
  const CACHE_KEY = 'gestipyme_gcal_cache';
  const G = { events: [], ts: 0, loading: false, error: '' };
  try { const c = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); if (c && c.events) { G.events = c.events; G.ts = c.ts || 0; } } catch (e) { /* sin caché */ }

  G.forDate = (d) => G.events.filter((e) => e.date <= d && (e.endDate || e.date) >= d);

  G.load = async function (force) {
    if (G.loading || (!force && Date.now() - G.ts < 120000 && G.events.length)) return;
    G.loading = true;
    try {
      const req = await gestipymeSyncRequestInit('GET');
      if (!req) throw new Error('sin configuración');
      const res = await fetch(req.url.replace('api/state', 'api/gcal'), req.init);
      if (!res.ok) throw new Error('Error ' + res.status);
      const j = await res.json();
      if (j.error) throw new Error(j.error);
      G.events = j.events || []; G.ts = Date.now(); G.error = '';
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ events: G.events, ts: G.ts })); } catch (e) { /* lleno */ }
      if (typeof calRefresh === 'function') calRefresh();
      if (typeof renderPlanner === 'function') renderPlanner();
    } catch (e) { G.error = e.message; }
    G.loading = false;
  };

  window.GCAL = G;
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => G.load(false), 1200));
  setInterval(() => { if (document.visibilityState === 'visible') G.load(false); }, 120000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') G.load(false); });
  const top = () => document.getElementById('topSync');
  window.addEventListener('DOMContentLoaded', () => { const b = top(); if (b) b.addEventListener('click', () => G.load(true)); });
})();
