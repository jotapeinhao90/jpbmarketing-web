'use strict';

// ── SII / Impuestos ──────────────────────────────────
// Foto de los datos del SII (sii-data.js, generada por scripts/build-sii-data.js desde sii-mcp) + calendario
// tributario, hallazgos del diagnóstico del 14-11-2026 y plan de acción. Usa helpers de app.js: getTasks, saveTasks, uid, escHtml, today.

const SII_PLAN_KEY = 'gestipyme_sii_plan';
const SII_UF_NOTE = 'Datos leídos del SII el';

const SII_HALLAZGOS = [
  { sev: 'urgente', t: 'F29 de octubre vence el vie 20-11', d: 'IVA estimado $185.047 más PPM (~$1.968). Págalo el 18 o 19: en junio hubo 5 pagos fallidos y en agosto presentaste fuera de plazo (recargos ~$17 mil). Prueba el código 756 (postergar IVA).' },
  { sev: 'urgente', t: 'IVA de servicios del extranjero sin declarar', d: 'Los invoices sin IVA (Wix/Google Ads, software) obligan a la SpA a emitir factura de compra y declarar el IVA en el código 39 del F29 (DL 825 art. 11 e). Desde noviembre, emitirlas cada mes; junio–octubre: rectificar con contador antes de que lo detecte el SII (multa 10% + 2%/mes, tope 30%).' },
  { sev: 'revisar', t: 'Folios faltantes: 5, 6, 7, 11, 21, 25 y NC N°1', d: 'No aparecen en el Registro de Ventas. Entra a MIPYME con tu RUT personal → documentos emitidos. Si hay una factura válida fuera del RCV es venta sin declarar.' },
  { sev: 'revisar', t: 'Galvarez Ltda.: posible cobro triple en agosto', d: 'Folios 30222, 30283 y 30330, los tres del 25-08 por $19.990 cada uno. Revisa la cartola y pide nota de crédito si cobraron de más.' },
  { sev: 'revisar', t: 'Libro de caja obligatorio', d: 'En Pro Pyme Transparente se exige libro de caja (ingresos cobrados y gastos pagados), además del RCV. Hoy no existe.' },
  { sev: 'revisar', t: 'PPM posiblemente bajo (0,1% en vez de 0,2%)', d: 'Revisa en el F29 los códigos 115 (tasa) y 62 (PPM). Diferencia del año ~$6.700; corregir desde octubre.' },
  { sev: 'revisar', t: 'Persona natural y SpA a la vez', d: 'Son relacionados (Cód. Tributario art. 8 N°17): ingresos se suman, riesgo de gastos en la entidad equivocada. Concentra la actividad en la SpA.' },
  { sev: 'info', t: 'Concentración de clientes: Polimer 83%', d: 'Contrato escrito con Polimer (plazo, fee, aviso de 60 días) y meta 2027: ningún cliente sobre 50%. Brand Advice es el primer cliente fuera del grupo industrial.' },
  { sev: 'info', t: 'Gastos casi sin registrar', d: 'Solo $510.014 en compras para $7,1 M de ventas (7%). Pide factura a nombre de la SpA para recuperar el 19% de IVA. Impuesto a la renta 2026 probablemente $0 (base bajo 13,5 UTA ≈ $11,5 M).' },
];

const SII_CALENDARIO = [
  { f: '2026-11-20', t: 'F29 octubre (pagar el 18–19)', alta: true },
  { f: '2026-12-21', t: 'F29 noviembre (el 20 cae domingo)' },
  { f: '2026-12-31', t: 'Cierre del año comercial: gastos registrados y pagados' },
  { f: '2027-01-20', t: 'F29 diciembre' },
  { f: '2027-02-22', t: 'F29 enero (el 20 cae sábado)' },
  { f: '2027-03-29', t: 'DJ 1947 (base asignada al dueño, PPM y retiros)', alta: true },
  { f: '2027-04-12', t: 'Operación Renta: F22 de la SpA y F22 personal (fecha por confirmar, abril)', alta: true },
  { f: '2027-07-01', t: 'Patente municipal (verifica si la sacaste; fecha según municipalidad)' },
];

const SII_PLAN = [
  { id: 'p1', t: 'Pagar el F29 de octubre (18–19 nov), revisar PPM 0,2% y probar código 756', f: '2026-11-18' },
  { id: 'p2', t: 'Revisar folios 5, 6, 7, 11, 21, 25 y NC N°1 en MIPYME (RUT personal)', f: '2026-11-19' },
  { id: 'p3', t: 'Revisar con Galvarez las 3 facturas del 25-08', f: '2026-11-19' },
  { id: 'p4', t: 'Emitir facturas de compra de invoices extranjeros (código 39) desde noviembre', f: '2026-11-30' },
  { id: 'p5', t: 'Rectificar con un contador los F29 de junio a octubre por el IVA extranjero', f: '2026-11-30' },
  { id: 'p6', t: 'Partir el libro de caja 2026 y conciliarlo con la cartola del Banco de Chile', f: '2026-12-15' },
  { id: 'p7', t: 'Separar la actividad de la persona natural y la SpA; contrato con Polimer', f: '2027-02-15' },
];

const clp = (n) => '$' + Math.round(n || 0).toLocaleString('es-CL');
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const mesLbl = (p) => MES[Number(p.slice(5, 7)) - 1] + ' ' + p.slice(2, 4);
const diasHasta = (f) => Math.round((new Date(f + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 86400000);
const fmtF = (f) => { const d = new Date(f + 'T12:00:00'); return d.toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }); };
const planDone = () => { try { return JSON.parse(localStorage.getItem(SII_PLAN_KEY) || '{}'); } catch { return {}; } };

function siiAddTasks() {
  const tasks = getTasks();
  const nuevas = [];
  const add = (id, title, f, desc, pr) => {
    if (tasks.some((t) => t.id === id) || f < today()) return;
    nuevas.push({ id, title, description: desc, priority: pr, category: 'empresa', dueDate: f, dueTime: '09:00', status: 'pending',
      createdAt: new Date().toISOString(), reminderEnabled: true, reminders: [{ amount: 1, unit: 'hours' }], source: 'sii' });
  };
  SII_CALENDARIO.forEach((c, i) => { if (i > 0) add('sii-cal-' + c.f, 'SII: ' + c.t, c.f, 'Calendario tributario (sección SII del gestor).', c.alta ? 'high' : 'medium'); });
  SII_PLAN.forEach((p) => add('sii-plan-' + p.id, 'SII: ' + p.t, p.f, 'Plan de acción del diagnóstico tributario del 14-11-2026.', 'high'));
  if (!nuevas.length) return 0;
  saveTasks(tasks.concat(nuevas));
  if (typeof renderKanban === 'function') renderKanban();
  if (typeof calRefresh === 'function') calRefresh();
  return nuevas.length;
}

function renderSii() {
  const root = document.getElementById('siiRoot');
  const D = window.SII_DATA;
  if (!root) return;
  if (!D) { root.innerHTML = '<p class="sii-muted">Sin datos del SII.</p>'; return; }
  const ventas = D.meses.reduce((s, m) => s + m.ventaNeto, 0);
  const compras = D.meses.reduce((s, m) => s + m.compraNeto + m.compraExento, 0);
  const extCLP = D.egresos.filter((e) => !e.facturaCompra).reduce((s, e) => s + e.clp, 0);
  const ivaExt = extCLP * 0.19;
  const oct = D.meses.find((m) => m.periodo === '2026-10');
  const ivaOct = oct ? oct.ventaIva - oct.compraIva : 0;
  const dias = diasHasta('2026-11-20');
  const diasTxt = dias < 0 ? 'vencido' : dias === 0 ? 'hoy' : `en ${dias} día${dias === 1 ? '' : 's'}`;
  const done = planDone();
  const totalCli = D.clientes.reduce((s, c) => s + c.neto, 0) || 1;
  const prox = SII_CALENDARIO.filter((c) => c.f >= today()).slice(0, 8);
  const porProv = {};
  D.egresos.forEach((e) => { (porProv[e.proveedor] ||= { n: 0, clp: 0, usd: 0 }); porProv[e.proveedor].n++; porProv[e.proveedor].clp += e.clp; porProv[e.proveedor].usd += e.usd || 0; });

  root.innerHTML = `
    <div class="sii-kpis">
      <div class="sii-kpi"><small>Ventas netas 2026</small><b>${clp(ventas)}</b><span>${D.meses.length ? '20 facturas' : ''}</span></div>
      <div class="sii-kpi warn"><small>F29 octubre vence</small><b>${diasTxt}</b><span>20-nov · IVA est. ${clp(ivaOct)}</span></div>
      <div class="sii-kpi bad"><small>IVA extranjero por declarar</small><b>${clp(ivaExt)}</b><span>${clp(extCLP)} en ${D.egresos.length} invoices · cód. 39</span></div>
      <div class="sii-kpi"><small>Compras 2026 (neto)</small><b>${clp(compras)}</b><span>${((compras / (ventas || 1)) * 100).toFixed(0)}% de las ventas</span></div>
    </div>
    <p class="sii-muted">${D.razon} · RUT ${D.rut} · ${D.regimen} · ${SII_UF_NOTE} ${D.generado}. Compras pendientes de aceptar: ${D.comprasPendientes.reduce((s, p) => s + p.filas, 0) === 0 ? 'ninguna ✅' : 'revisar'}.</p>

    <div class="sii-grid">
      <div class="card sii-card"><h3>Ventas y compras por mes (neto)</h3><div class="sii-chart"><canvas id="siiChart"></canvas></div></div>
      <div class="card sii-card"><h3>Próximos vencimientos</h3>
        ${prox.map((c) => { const d = diasHasta(c.f); return `<div class="sii-row ${c.alta ? 'alta' : ''}"><span>${escHtml(c.t)}</span><b>${fmtF(c.f)}<small>${d === 0 ? 'hoy' : d > 0 ? 'en ' + d + ' d' : ''}</small></b></div>`; }).join('')}
        <button class="btn btn-primary sii-btn" id="siiAddCal">📅 Agregar todo al calendario</button>
      </div>
    </div>

    <div class="sii-grid">
      <div class="card sii-card"><h3>F29 declarados</h3>
        <table class="sii-table"><tr><th>Período</th><th>Estado</th><th>Pagado</th><th>Presentado</th></tr>
        ${D.f29.map((f) => `<tr><td>${f.periodo}</td><td>${f.estado === 'Presentado' ? (f.fuera_de_plazo ? '⚠️ fuera de plazo' : '✅') : '⏳ ' + escHtml(f.estado)}</td><td>${f.monto_pagado ? clp(f.monto_pagado) : '—'}</td><td>${escHtml((f.fecha_presentacion || 'vence ' + f.vencimiento).slice(0, 10))}</td></tr>`).join('')}</table>
      </div>
      <div class="card sii-card"><h3>Clientes (ventas netas 2026)</h3>
        ${D.clientes.map((c) => { const p = (c.neto / totalCli) * 100; return `<div class="sii-bar"><div class="sii-bar-h"><span>${escHtml(c.nombre.replace(/ (LIMITADA|SPA|SOCIEDAD ANÓNIMA)$/i, ''))}</span><b>${clp(c.neto)} · ${p.toFixed(0)}%</b></div><div class="sii-bar-t"><i style="width:${p}%" class="${p > 50 ? 'bad' : ''}"></i></div></div>`; }).join('')}
        <p class="sii-muted">Meta: ningún cliente sobre 50% en 2027.</p>
      </div>
    </div>

    <div class="card sii-card"><h3>Hallazgos del diagnóstico (14-nov-2026)</h3>
      ${SII_HALLAZGOS.map((h) => `<div class="sii-hall ${h.sev}"><b>${h.sev === 'urgente' ? '⛔' : h.sev === 'revisar' ? '⚠️' : 'ℹ️'} ${escHtml(h.t)}</b><p>${escHtml(h.d)}</p></div>`).join('')}
    </div>

    <div class="card sii-card"><h3>Plan de acción</h3>
      ${SII_PLAN.map((p) => `<label class="sii-chk ${done[p.id] ? 'on' : ''}"><input type="checkbox" data-plan="${p.id}" ${done[p.id] ? 'checked' : ''}><span>${escHtml(p.t)}</span><small>${fmtF(p.f)}</small></label>`).join('')}
    </div>

    <div class="card sii-card"><h3>Invoices extranjeros (libro de egresos) · IVA 19% por declarar en código 39</h3>
      <table class="sii-table"><tr><th>Proveedor</th><th>Invoices</th><th>USD</th><th>CLP</th><th>IVA 19%</th></tr>
      ${Object.entries(porProv).map(([k, v]) => `<tr><td>${escHtml(k)}</td><td>${v.n}</td><td>${v.usd.toFixed(2)}</td><td>${clp(v.clp)}</td><td>${clp(v.clp * 0.19)}</td></tr>`).join('')}
      <tr class="tot"><td>Total</td><td>${D.egresos.length}</td><td></td><td>${clp(extCLP)}</td><td>${clp(ivaExt)}</td></tr></table>
      <p class="sii-muted">Cada invoice sin IVA exige factura de compra (tipo 46, RUT 55.555.555-5 si el proveedor no está inscrito), mismo mes. El IVA retenido también queda como crédito fiscal. Confirma con un contador antes de rectificar.</p>
    </div>

    <div class="card sii-card"><h3>Cómo funciona tu régimen (resumen)</h3>
      <ul class="sii-list">
        <li><b>F29 mensual:</b> día 20 por internet con pago (facturador electrónico); día 28 si es sin movimiento o sin pago; día 12 plazo general. Si cae fin de semana o feriado, pasa al siguiente día hábil.</li>
        <li><b>Pro Pyme Transparente:</b> la SpA no paga impuesto de primera categoría; tú pagas Global Complementario sobre (ingresos cobrados − gastos pagados). Bajo ~13,5 UTA pagas $0. PPM legal 0,2% de ventas.</li>
        <li><b>Compras del RCV:</b> acepta o reclama dentro de 8 días corridos; lo que no es del giro va a «No incluir».</li>
        <li><b>Respaldos:</b> guarda facturas y comprobantes 6 años (Cód. Tributario art. 200). Gastos personales mezclados pueden pagar 40% (art. 21).</li>
        <li><b>Boleta de honorarios:</b> retención 15,25% en 2026 (código 151 del F29 si la recibes como empresa).</li>
      </ul>
      <p class="sii-muted">No es asesoría tributaria formal; valida rectificaciones y cambios de régimen con un contador. Detalle completo en <code>sii-mcp/informes/analisis-2026-11-14.md</code>. Para refrescar cifras: pídele a Claude «actualiza los datos del SII» (corre <code>node scripts/build-sii-data.js</code>).</p>
    </div>`;

  const cv = document.getElementById('siiChart');
  if (cv && window.Chart) {
    if (window._siiChart) window._siiChart.destroy();
    const ms = D.meses.filter((m) => m.ventaNeto || m.compraNeto);
    window._siiChart = new Chart(cv, { type: 'bar', data: { labels: ms.map((m) => mesLbl(m.periodo)), datasets: [
      { label: 'Ventas', data: ms.map((m) => m.ventaNeto), backgroundColor: '#6366f1', borderRadius: 4 },
      { label: 'Compras', data: ms.map((m) => m.compraNeto), backgroundColor: '#f59e0b', borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => c.dataset.label + ': ' + clp(c.parsed.y) } } }, scales: { y: { ticks: { callback: (v) => '$' + (v / 1000) + 'k' } } } } });
  }
  const btn = document.getElementById('siiAddCal');
  if (btn) btn.onclick = () => { const n = siiAddTasks(); btn.textContent = n ? `✅ ${n} tareas agregadas al calendario` : '✅ Ya estaban todas en el calendario'; };
  root.querySelectorAll('[data-plan]').forEach((cb) => cb.addEventListener('change', () => {
    const d = planDone(); d[cb.dataset.plan] = cb.checked;
    try { localStorage.setItem(SII_PLAN_KEY, JSON.stringify(d)); } catch {}
    cb.closest('.sii-chk').classList.toggle('on', cb.checked);
  }));
}
