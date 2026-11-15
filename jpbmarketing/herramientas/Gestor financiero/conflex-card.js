/* Módulo del Dashboard: cotizaciones de Conflex por cotizar y seguimiento (viene de Panel JPB).
   Datos: GET api/conflex (Cloudflare). No se guardan en el estado sincronizado. */
(function () {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escHtml(String(s == null ? '' : s));
  const PANEL_URL = 'https://control.jpbmarketing.cl/?cliente=conflex&vista=clientes';
  const st = { data: null, loading: false, error: '', at: 0, open: true, showOld: false };

  async function api(method, qs, body) {
    const req = await gestipymeSyncRequestInit(method, body);
    if (!req) throw new Error('Sin configuración de sincronización');
    const res = await fetch(req.url.replace('api/state', 'api/conflex') + (qs || ''), req.init);
    if (!res.ok) throw new Error('Error ' + res.status);
    return res.json();
  }

  const ago = (ts) => { const d = Math.floor((Date.now() - ts) / 864e5); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : `hace ${d} d`; };
  const fmtDate = (ts) => new Date(ts).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  function ensureCard() {
    if ($('conflexCard')) return;
    const planner = $('planner');
    if (!planner) return;
    planner.insertAdjacentHTML('beforebegin', '<section class="cf-card card" id="conflexCard"></section>');
  }

  async function load(force) {
    ensureCard();
    if (st.loading || (!force && st.data && Date.now() - st.at < 60000)) { paint(); return; }
    st.loading = true; paint();
    try { st.data = await api('GET', force ? '?refresh=1' : ''); st.at = Date.now(); st.error = ''; }
    catch (e) { st.error = e.message; }
    st.loading = false; paint();
  }

  function paint() {
    const el = $('conflexCard');
    if (!el) return;
    const d = st.data;
    const n = d ? d.porCotizar.length : 0, s = d ? d.seguimiento.length : 0;
    let body = '';
    if (st.error && !d) body = `<div class="cf-empty">No pude traer los datos de Panel JPB (${esc(st.error)}).</div>`;
    else if (!d) body = '<div class="cf-empty">Cargando desde Panel JPB…</div>';
    else if (st.open) {
      body = `
        <div class="cf-sec">Por cotizar <b>${n}</b></div>
        ${n ? d.porCotizar.map((g, i) => `
          <button class="cf-row" data-cf="q${i}">
            <span class="cf-dot q"></span>
            <span class="cf-main"><b>${esc(g.empresa || g.contacto || 'Sin nombre')}</b>
              <small>${esc(g.solicitudes.map((x) => x.producto + (x.cantidad ? ' · ' + x.cantidad : '')).join('  |  ')).slice(0, 140)}</small></span>
            <span class="cf-when">${ago(g.solicitudes[0].ts)}</span>
          </button>`).join('') : '<div class="cf-empty">Todo cotizado 🎉</div>'}
        ${d.antiguos && d.antiguos.length ? `<button class="cf-old-toggle" id="cfOld">${st.showOld ? '▾' : '▸'} Ocultos · más de 3 días sin cotizar (${d.antiguos.length})</button>
          ${st.showOld ? d.antiguos.map((g, i) => `
          <button class="cf-row cf-old" data-cf="o${i}">
            <span class="cf-dot o"></span>
            <span class="cf-main"><b>${esc(g.empresa || g.contacto || 'Sin nombre')}</b>
              <small>${esc(g.solicitudes.map((x) => x.producto + (x.cantidad ? ' · ' + x.cantidad : '')).join('  |  ')).slice(0, 140)}</small></span>
            <span class="cf-when">${ago(g.solicitudes[0].ts)}</span>
          </button>`).join('') : ''}` : ''}
        <div class="cf-sec">Seguimiento <b>${s}</b></div>
        ${s ? d.seguimiento.map((g, i) => `
          <button class="cf-row" data-cf="s${i}">
            <span class="cf-dot s"></span>
            <span class="cf-main"><b>${esc(g.nombre)}</b><small>${esc(g.motivo)}${g.total ? ' · cotizado ' + fmtPesos(g.total, true) : ''}</small></span>
          </button>`).join('') : '<div class="cf-empty">Sin seguimientos pendientes.</div>'}`;
    }
    el.innerHTML = `
      <div class="cf-head">
        <button class="cf-title" id="cfToggle">🔩 Conflex · <span class="cf-pill q">${n} por cotizar</span> <span class="cf-pill s">${s} seguimiento</span> <small>${st.open ? '▾' : '▸'}</small></button>
        <div class="cf-actions">
          <a class="btn btn-outline btn-sm" href="${PANEL_URL}" target="_blank" rel="noopener">Abrir Panel JPB ↗</a>
          <button class="btn btn-outline btn-sm" id="cfRefresh">${st.loading ? 'Actualizando…' : '⟳ Actualizar'}</button>
        </div>
      </div>${body}`;
    $('cfToggle').onclick = () => { st.open = !st.open; paint(); };
    $('cfRefresh').onclick = () => load(true);
    if ($('cfOld')) $('cfOld').onclick = () => { st.showOld = !st.showOld; paint(); };
    el.querySelectorAll('[data-cf]').forEach((b) => b.addEventListener('click', () => openDetail(b.dataset.cf)));
  }

  function sheet(html) {
    let o = $('cfOverlay');
    if (!o) { o = document.createElement('div'); o.id = 'cfOverlay'; o.className = 'emo-overlay'; o.innerHTML = '<div class="emo-sheet" id="cfSheet"></div>'; document.body.appendChild(o); o.addEventListener('mousedown', (e) => { if (e.target === o) close(); }); }
    $('cfSheet').innerHTML = '<button class="emo-close" id="cfClose">×</button>' + html;
    o.classList.add('open'); $('cfClose').onclick = close;
  }
  function close() { const o = $('cfOverlay'); if (o) o.classList.remove('open'); }

  function addTask(title, description) {
    const tasks = getTasks();
    tasks.push({ id: uid(), title, description, priority: 'high', category: 'empresa', dueDate: today(), dueTime: '16:00', status: 'pending',
      createdAt: new Date().toISOString(), reminderEnabled: true, reminders: [{ amount: 1, unit: 'hours' }], source: 'conflex' });
    saveTasks(tasks);
    if (typeof renderKanban === 'function') renderKanban();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof calRefresh === 'function') calRefresh();
  }

  function openDetail(ref) {
    const d = st.data; if (!d) return;
    const kind = ref[0], i = Number(ref.slice(1));
    if (kind === 'q' || kind === 'o') {
      const g = (kind === 'q' ? d.porCotizar : d.antiguos)[i]; if (!g) return;
      sheet(`
        <h2 class="emo-h2">${esc(g.empresa || g.contacto)}</h2>
        <div class="emo-dim">${esc(g.contacto)}${g.email ? ` · <a href="mailto:${esc(g.email)}">${esc(g.email)}</a>` : ''}${g.telefono ? ` · <a href="tel:${esc(g.telefono)}">${esc(g.telefono)}</a>` : ''}</div>
        <div class="emo-block"><div class="emo-lbl">Qué pidió (pendiente de cotizar)</div>
          ${g.solicitudes.map((x) => `<div class="cf-req"><b>${esc(x.producto) || 'Sin producto indicado'}</b>
            <div>Cantidad: ${esc(x.cantidad) || '—'}</div>${x.mensaje ? `<div>Mensaje: ${esc(x.mensaje)}</div>` : ''}
            <div class="emo-dim">${fmtDate(x.ts)}${x.pagina ? ' · desde ' + esc(x.pagina) : ''}</div></div>`).join('')}</div>
        <div class="emo-actions">
          <button class="btn btn-primary" id="cfDone">✓ Ya cotizado</button>
          <button class="btn btn-outline" id="cfCal">📅 Agregar al calendario (16:00)</button>
          <a class="btn btn-outline" href="${PANEL_URL}" target="_blank" rel="noopener">Abrir en Panel ↗</a>
        </div>`);
      $('cfDone').onclick = async () => { try { await api('POST', '', { ts: g.solicitudes.map((x) => x.ts) }); close(); load(true); } catch (e) { alert('No se pudo marcar: ' + e.message); } };
      $('cfCal').onclick = () => { addTask(`Cotizar: ${g.empresa || g.contacto}`, g.solicitudes.map((x) => `${x.producto} (${x.cantidad || 's/cantidad'})`).join('\n') + (g.email ? '\n' + g.email : '')); close(); };
    } else {
      const g = d.seguimiento[i]; if (!g) return;
      sheet(`
        <h2 class="emo-h2">${esc(g.nombre)}</h2>
        <div class="emo-dim">${esc(g.motivo)}${g.total ? ' · total cotizado ' + fmtPesos(g.total, true) : ''}</div>
        <div class="emo-dim" style="margin-top:6px">${g.contacto ? esc(g.contacto) + ' · ' : ''}${g.telefono ? `<a href="tel:${esc(g.telefono)}">${esc(g.telefono)}</a>` : ''}${g.email ? ` · <a href="mailto:${esc(g.email)}">${esc(g.email)}</a>` : ''}</div>
        ${g.nota ? `<div class="emo-block"><div class="emo-lbl">Nota / último mensaje</div><div class="cf-req">${esc(g.nota)}</div></div>` : ''}
        <div class="emo-actions">
          <button class="btn btn-primary" id="cfCal">📅 Tarea de seguimiento (16:00)</button>
          <a class="btn btn-outline" href="${PANEL_URL}" target="_blank" rel="noopener">Abrir en Panel ↗</a>
        </div>`);
      $('cfCal').onclick = () => { addTask(`Seguimiento: ${g.nombre}`, g.motivo + (g.nota ? '\n' + g.nota : '')); close(); };
    }
  }

  const origDash = window.renderDashboard;
  if (typeof origDash === 'function') window.renderDashboard = function () { const r = origDash.apply(this, arguments); load(false); return r; };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  // Sincronización: botón fijo arriba + automática cada minuto y al volver a la app
  function busy() {
    if ($('calPop') || ($('cfOverlay') && $('cfOverlay').classList.contains('open')) || ($('emoOverlay') && $('emoOverlay').classList.contains('open'))) return true;
    if (document.querySelector('.modal.open, .modal-overlay.open')) return true;
    const a = document.activeElement;
    return !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName));
  }
  function rerender() {
    if (typeof renderKanban === 'function') renderKanban();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderExpenses === 'function') renderExpenses();
    if (typeof calRefresh === 'function') calRefresh();
    if (window.EmoUI && window.EmoUI.render) window.EmoUI.render();
  }
  async function syncNow(manual) {
    const btn = $('topSync');
    if (manual && btn) { btn.disabled = true; btn.textContent = '⟳ Actualizando…'; }
    try {
      const changed = window.gestipymeSync ? await window.gestipymeSync.pullAndApply() : false;
      if (manual || (changed && !busy())) rerender();
      if (manual) { load(true); if (btn) btn.textContent = changed ? '✓ Al día (con cambios)' : '✓ Al día'; }
    } catch (e) { if (manual && btn) btn.textContent = '⚠ Sin conexión'; }
    if (manual && btn) setTimeout(() => { btn.disabled = false; btn.textContent = '⟳ Actualizar'; }, 2200);
  }
  window.addEventListener('DOMContentLoaded', () => {
    const b = $('topSync'); if (b) b.addEventListener('click', () => syncNow(true));
  });
  let lastDay = today();
  function dayRollover() {
    if (today() === lastDay) return;
    lastDay = today();
    if (window.updateTopbarDate) window.updateTopbarDate();
    rerender();
  }
  setInterval(() => { dayRollover(); if (document.visibilityState === 'visible') syncNow(false); }, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') syncNow(false); });
  window.ConflexCard = { load };
  window.addEventListener('DOMContentLoaded', () => setTimeout(() => load(false), 1500));
})();
