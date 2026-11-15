/* ════════════════════════════════════════════════════
   GestiónPyme — App Logic
   by JPB Marketing
   ════════════════════════════════════════════════════ */

'use strict';

// ── Constants ────────────────────────────────────────

const STORAGE = {
  expenses: 'gestipyme_expenses',
  income:   'gestipyme_income',
  tasks:    'gestipyme_tasks',
  diary:    'gestipyme_diary',
  videos:   'gestipyme_videos',
  rules:    'gestipyme_rules',
  pipeline: 'gestipyme_pipeline',
};

const APP_VERSION = '3';

const CATEGORIES = {
  empresa: [
    'Marketing', 'Tecnología', 'Oficina y Suministros',
    'Personal / RRHH', 'Ventas', 'Logística',
    'Impuestos y Contabilidad', 'Servicios Profesionales',
    'Arriendo', 'Otros Empresa',
  ],
  personal: [
    'Alimentación', 'Transporte', 'Vivienda',
    'Salud', 'Educación', 'Entretenimiento',
    'Ropa y Calzado', 'Servicios Básicos',
    'Ahorro / Inversión', 'Gatita', 'Otros Personal',
  ],
};

const CATEGORY_ICONS = {
  'Alimentación': '🍽', 'Transporte': '🚗', 'Vivienda': '🏠',
  'Salud': '💊', 'Educación': '📚', 'Entretenimiento': '🎬',
  'Ropa y Calzado': '👟', 'Servicios Básicos': '⚡',
  'Ahorro / Inversión': '💰', 'Gatita': '🐱', 'Otros Personal': '📌',
  'Marketing': '📢', 'Tecnología': '💻', 'Oficina y Suministros': '🖊',
  'Personal / RRHH': '👥', 'Ventas': '🤝', 'Logística': '📦',
  'Impuestos y Contabilidad': '📋', 'Servicios Profesionales': '⚖',
  'Arriendo': '🔑', 'Otros Empresa': '📌',
};

const QUOTES = [
  { text: 'No ahorres lo que te queda después de gastar; gasta lo que queda después de ahorrar.', author: 'Warren Buffett' },
  { text: 'El presupuesto es contar el dinero antes de gastarlo.', author: 'John Maxwell' },
  { text: 'Invertir en conocimiento siempre paga el mejor interés.', author: 'Benjamin Franklin' },
  { text: 'El dinero es un buen sirviente pero un mal amo.', author: 'Francis Bacon' },
  { text: 'La riqueza no consiste en tener grandes posesiones, sino en tener pocas necesidades.', author: 'Epictetus' },
  { text: 'El primer paso hacia la libertad financiera es decidir que eres tú quien controla tu destino.', author: 'Robert Kiyosaki' },
  { text: 'Un emprendedor ve oportunidades donde otros ven obstáculos.', author: 'Michael Gerber' },
  { text: 'Las finanzas ordenadas son el cimiento de cualquier negocio exitoso.', author: 'JPB Marketing' },
  { text: 'No es cuánto ganas, sino cuánto guardas lo que define tu futuro financiero.', author: 'Robert Kiyosaki' },
  { text: 'Quien controla sus gastos, controla su futuro.', author: 'Anónimo' },
  { text: 'Un negocio sin flujo de caja es como un auto sin combustible.', author: 'JPB Marketing' },
  { text: 'La disciplina financiera de hoy es la libertad económica de mañana.', author: 'Anónimo' },
  { text: 'El secreto del éxito: saber cuánto gastas, cuánto ganas, y la diferencia entre ambos.', author: 'Anónimo' },
  { text: 'Cuida los centavos y los pesos se cuidan solos.', author: 'Refrán popular' },
  { text: 'El emprendedor exitoso no espera el momento perfecto, lo crea.', author: 'Anónimo' },
  { text: 'Separar tus finanzas personales de las de tu empresa no es opcional, es vital.', author: 'JPB Marketing' },
];

// ── State ────────────────────────────────────────────

const state = {
  currentPage:      'dashboard',
  quoteIndex:       Math.floor(Math.random() * QUOTES.length),
  expenseFilter:    { type: 'all', month: '', category: '', tag: '' },
  calDate:          new Date(),
  calSelected:      null,
  chartPeriod:      6,
  charts:           {},
  diaryCalDate:     new Date(),
  diaryCalSelected: null,
  expenseView:      'calendar',
  expCalDate:       new Date(),
  expCalSelected:   null,
};

// ── Storage helpers ──────────────────────────────────

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; }
  catch { return []; }
}
function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
  if (window.gestipymeSync) window.gestipymeSync.pushDebounced();
}

function getExpenses() { return load(STORAGE.expenses); }
function saveExpenses(data) { save(STORAGE.expenses, data); }
function getIncome()   { return load(STORAGE.income); }
function saveIncome(data) { save(STORAGE.income, data); }
function getTasks()       { return load(STORAGE.tasks); }
function saveTasks(data)  { save(STORAGE.tasks, data); }
function getDiary()       { return load(STORAGE.diary); }
function saveDiary(data)  { save(STORAGE.diary, data); }
function getVideos()      { return load(STORAGE.videos); }
function saveVideos(data) { save(STORAGE.videos, data); }
function getRules()       { return load(STORAGE.rules); }
function saveRules(data)  { save(STORAGE.rules, data); }
function getPipeline()    { return load(STORAGE.pipeline); }
function savePipeline(d)  { save(STORAGE.pipeline, d); }

// ── Utils ────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

let privacyMode = localStorage.getItem('gestipyme_privacy') === '1';

function maskAmount() {
  return '$***.***';
}

function clp(n) {
  const raw = '$' + Math.round(n).toLocaleString('es-CL');
  return privacyMode ? maskAmount() : raw;
}

function setPrivacyMode(on) {
  privacyMode = on;
  localStorage.setItem('gestipyme_privacy', on ? '1' : '0');
  document.getElementById('privacyLabel').textContent = on ? 'Activado' : 'Desactivado';
  document.getElementById('privacyToggle').checked = on;
  // re-render current page
  const page = state.currentPage;
  if (page === 'dashboard')     renderDashboard();
  else if (page === 'gastos')   renderExpenses();
  else if (page === 'graficos') renderCharts();
  else if (page === 'pipeline') renderPipeline();
}

function shortClp(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 100000)  return '$' + Math.round(n / 1000) + 'k';
  if (n >= 10000)   return '$' + (n / 1000).toFixed(0) + 'k';
  if (n >= 1000)    return '$' + (n / 1000).toFixed(1) + 'k';
  return clp(n);
}

function today() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

function formatDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function monthLabel(iso) {
  const [y, m] = iso.split('-');
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  return months[parseInt(m) - 1] + ' ' + y.slice(2);
}

function isOverdue(dueDate) {
  return dueDate && dueDate < today();
}

function fmtPesos(n, skipPrivacy = false) {
  const raw = '$' + Math.round(Number(n)).toLocaleString('es-CL');
  return (privacyMode && !skipPrivacy) ? maskAmount() : raw;
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Router ───────────────────────────────────────────

function navigateTo(page) {
  if (!document.getElementById(`page-${page}`)) return;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.page === page);
  });
  const titles = {
    dashboard: 'Dashboard',
    archivo:   'Archivo',
    gastos:    'Gastos',
    graficos:  'Gráficos',
    tareas:    'Tareas',
    calendario:'Calendario',
    diario:    'Diario',
    pipeline:      'Pipeline',
    configuracion: 'Configuración',
    videos:        'Videos',
    notas:         'Notas',
    sii:           'SII / Impuestos',
    donaciones:'Apóyanos',
  };
  document.getElementById('topbarPage').textContent = titles[page] || page;
  state.currentPage = page;
  if (page === 'graficos')   renderCharts();
  if (page === 'calendario') renderCalendar();
  if (page === 'dashboard')  renderDashboard();
  if (page === 'archivo')    renderPlanner();
  if (page === 'tareas')     renderKanban();
  if (page === 'diario')     renderDiary();
  if (page === 'pipeline')   renderPipeline();
  if (page === 'configuracion') { renderEmpresas(); mailConfigInit(); pushConfigInit(); }
  if (page === 'videos')     renderVideos();
  if (page === 'notas' && typeof renderNotes === 'function') renderNotes();
  if (page === 'sii' && typeof renderSii === 'function') renderSii();
  if (page === 'gastos')     renderExpenses();
  window.scrollTo(0, 0);
}

// ── Dashboard ────────────────────────────────────────

let dashPeriod = 30;   // 30 | 90 | 'month'
let dashType   = 'all'; // 'all' | 'empresa' | 'personal'

function setDashPeriod(p) { dashPeriod = p; renderDashboard(); }
function setDashType(t)   { dashType   = t; renderDashboard(); }

function getDashExpenses() {
  const all = getExpenses();
  const now = new Date();
  let filtered;
  if (dashPeriod === 'month') {
    const curMo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    filtered = all.filter(e => e.date.startsWith(curMo));
  } else {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - dashPeriod);
    const cutoffStr = localDateStr(cutoff);
    filtered = all.filter(e => e.date >= cutoffStr);
  }
  if (dashType !== 'all') filtered = filtered.filter(e => e.type === dashType);
  return filtered;
}

function getDashPeriodLabel() {
  if (dashPeriod === 'month') return 'Este mes';
  return `Últimos ${dashPeriod} días`;
}

// ── Planificador diario / semanal ────────────────────

const planner = { focus: null, initialized: false };
const PLANNER_DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const PLANNER_DAY_FULL = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function plannerAddDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return localDateStr(new Date(y, m - 1, d + n));
}

function plannerTasksOn(dateStr) {
  return getTasks().filter(t => t.dueDate === dateStr);
}

function plannerStreak(todayStr) {
  let streak = 0;
  for (let i = 1; i <= 60; i++) {
    const day = plannerAddDays(todayStr, -i);
    const due = plannerTasksOn(day);
    if (!due.length || due.some(t => t.status !== 'done')) break;
    streak++;
  }
  return streak;
}

function plannerMotivation(done, total) {
  if (total === 0) return { msg: 'Día en blanco. ¿Qué quieres lograr hoy?', tone: 'idle' };
  if (done === 0) return { msg: 'El primer tick es el más difícil. ¡Vamos! 💪', tone: 'start' };
  if (done === total) return { msg: '¡Día completo! 🏆 Te lo ganaste.', tone: 'win' };
  const pct = done / total;
  if (pct >= 0.5) return { msg: `¡Más de la mitad! Vas increíble 🔥 (${done}/${total})`, tone: 'mid' };
  return { msg: `Buen comienzo, sigue así (${done}/${total})`, tone: 'go' };
}

function plannerEnsureInit() {
  if (planner.initialized) return;
  planner.initialized = true;
  planner.focus = localDateStr(new Date());

  document.getElementById('plannerRefresh').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.textContent = '⟳ Actualizando…';
    if (window.gestipymeSync) await window.gestipymeSync.pullAndApply();
    renderDashboard();
    renderKanban();
    btn.disabled = false;
    btn.textContent = '✓ Listo';
    setTimeout(() => { btn.textContent = '⟳ Actualizar'; }, 1500);
  });

  document.getElementById('plannerAddForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const title = document.getElementById('plannerAddTitle').value.trim();
    if (!title) return;
    const when = document.getElementById('plannerAddWhen').value;
    const todayStr = localDateStr(new Date());
    let dueDate;
    if (when === 'today') dueDate = todayStr;
    else if (when === 'tomorrow') dueDate = plannerAddDays(todayStr, 1);
    else {
      const dow = new Date().getDay();
      dueDate = plannerAddDays(todayStr, dow === 0 ? 0 : 7 - dow);
    }
    const tasks = getTasks();
    tasks.push({
      id: uid(),
      title,
      description: '',
      priority: document.getElementById('plannerAddPriority').value,
      category: 'empresa',
      dueDate,
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    saveTasks(tasks);
    document.getElementById('plannerAddTitle').value = '';
    planner.focus = dueDate;
    renderPlanner();
    renderKanban();
  });
}

function plannerToggle(id) {
  const tasks = getTasks();
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.status = t.status === 'done' ? 'pending' : 'done';
  if (t.status === 'done') celebrate(window.event);
  saveTasks(tasks);
  renderPlanner();
  renderKanban();
  calRefresh();
}

function plannerTaskRow(t, showDate) {
  const overdue = t.status !== 'done' && t.dueDate < localDateStr(new Date());
  const prioCls = { high: 'p-high', medium: 'p-medium', low: 'p-low' }[t.priority] || 'p-medium';
  const dateLabel = showDate && t.dueDate
    ? `<span class="planner-task-date${overdue ? ' overdue' : ''}">${overdue ? '⚠ vencida · ' : ''}${formatDate(t.dueDate)}</span>`
    : (overdue ? '<span class="planner-task-date overdue">⚠ vencida</span>' : '');
  const isDone = t.status === 'done';
  return `
    <div class="planner-task ${isDone ? 'is-done' : ''} ${prioCls}" data-id="${t.id}">
      <div class="planner-task-body">
        <div class="planner-task-title">${escHtml(t.title)}</div>
        ${dateLabel}
      </div>
      <span class="planner-task-cat">${t.category === 'empresa' ? 'Emp' : 'Per'}</span>
      <button class="planner-toggle ${isDone ? 'undo' : 'complete'}" onclick="plannerToggle('${t.id}')">${isDone ? '↩ Deshacer' : '✓ Completar'}</button>
      <button class="planner-task-del" onclick="deleteTask('${t.id}')" title="Borrar">✕</button>
    </div>`;
}

function renderPlanner() {
  const el = document.getElementById('planner');
  if (!el) return;
  plannerEnsureInit();

  const now = new Date();
  const todayStr = localDateStr(now);
  if (!planner.focus) planner.focus = todayStr;

  document.getElementById('plannerDate').textContent =
    `${PLANNER_DAY_FULL[now.getDay()]} ${now.getDate()} de ${['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][now.getMonth()]}`;

  const focusDue = plannerTasksOn(planner.focus);
  const focusDone = focusDue.filter(t => t.status === 'done').length;
  const pct = focusDue.length ? Math.round((focusDone / focusDue.length) * 100) : 0;

  const C = 2 * Math.PI * 52;
  const ring = document.getElementById('plannerRingFg');
  ring.style.strokeDasharray = `${C}`;
  ring.style.strokeDashoffset = `${C * (1 - pct / 100)}`;
  document.getElementById('plannerPct').textContent = `${pct}%`;

  const mot = plannerMotivation(focusDone, focusDue.length);
  const msgEl = document.getElementById('plannerMsg');
  msgEl.textContent = mot.msg;
  msgEl.dataset.tone = mot.tone;

  const streak = plannerStreak(todayStr);
  document.getElementById('plannerStreak').textContent =
    streak > 0 ? `🔥 Racha: ${streak} día${streak > 1 ? 's' : ''} completo${streak > 1 ? 's' : ''} seguidos` : '';

  const weekEl = document.getElementById('plannerWeek');
  weekEl.innerHTML = Array.from({ length: 7 }, (_, i) => {
    const day = plannerAddDays(todayStr, i);
    const due = plannerTasksOn(day);
    const pending = due.filter(t => t.status !== 'done').length;
    const d = new Date(...day.split('-').map((v, idx) => idx === 1 ? Number(v) - 1 : Number(v)));
    const allDone = due.length > 0 && pending === 0;
    return `
      <button class="planner-day ${day === planner.focus ? 'active' : ''} ${day === todayStr ? 'is-today' : ''} ${allDone ? 'all-done' : ''}"
              onclick="plannerFocus('${day}')">
        <span class="planner-day-name">${PLANNER_DAY_NAMES[d.getDay()]}</span>
        <span class="planner-day-num">${d.getDate()}</span>
        <span class="planner-day-count">${allDone ? '✓' : (pending || '·')}</span>
      </button>`;
  }).join('');

  const focusLabel = planner.focus === todayStr ? 'Hoy' : (() => {
    const [y, m, dd] = planner.focus.split('-').map(Number);
    const fd = new Date(y, m - 1, dd);
    return `${PLANNER_DAY_FULL[fd.getDay()]} ${fd.getDate()}`;
  })();
  document.querySelector('#planner .planner-col:first-child .planner-col-title').firstChild.textContent = `${focusLabel} `;
  document.getElementById('plannerCountToday').textContent = focusDue.length ? `${focusDone}/${focusDue.length}` : '';

  const listToday = document.getElementById('plannerListToday');
  listToday.innerHTML = focusDue.length
    ? focusDue.map(t => plannerTaskRow(t, false)).join('')
    : '<p class="planner-empty">Nada para este día. Agregá algo arriba ✨</p>';

  document.getElementById('plannerWeekTitle').textContent = 'Próximos días';
  const all = getTasks();
  const upcoming = all
    .filter(t => t.status !== 'done' && t.dueDate && t.dueDate > todayStr)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const listWeek = document.getElementById('plannerListWeek');
  listWeek.innerHTML = upcoming.length
    ? upcoming.map(t => plannerTaskRow(t, true)).join('')
    : '<p class="planner-empty">Nada próximo agendado 🙌</p>';

  const archive = all
    .filter(t => t.status === 'done' || (t.dueDate && t.dueDate < todayStr && t.status !== 'done'))
    .sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));
  document.getElementById('plannerArchiveBadge').textContent = archive.length ? archive.length : '';
  document.getElementById('plannerListArchive').innerHTML = archive.length
    ? archive.map(t => plannerArchiveRow(t)).join('')
    : '<p class="planner-empty">Todavía no hay nada archivado.</p>';
}

function plannerArchiveRow(t) {
  const done = t.status === 'done';
  const badge = done
    ? '<span class="planner-badge done">✓ completada</span>'
    : '<span class="planner-badge late">⚠ vencida sin completar</span>';
  const action = done
    ? `<button class="planner-toggle undo" onclick="plannerToggle('${t.id}')">↩ Deshacer</button>`
    : `<button class="planner-resched" onclick="plannerRescheduleToday('${t.id}')">Mover a hoy</button>`;
  return `
    <div class="planner-task ${done ? 'is-done' : 'p-high'}" data-id="${t.id}">
      <div class="planner-task-body">
        <div class="planner-task-title">${escHtml(t.title)}</div>
        <div class="planner-task-date">${badge} ${t.dueDate ? formatDate(t.dueDate) : ''}</div>
      </div>
      ${action}
      <button class="planner-task-del" onclick="deleteTask('${t.id}')" title="Borrar">✕</button>
    </div>`;
}

function plannerRescheduleToday(id) {
  const tasks = getTasks();
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.dueDate = localDateStr(new Date());
  t.status = 'pending';
  saveTasks(tasks);
  renderPlanner();
  renderKanban();
}

function plannerFocus(dateStr) {
  planner.focus = dateStr;
  renderPlanner();
}

function renderDashboard() {
  renderPlanner();

  const now = new Date();
  const h = now.getHours();
  const greeting = h < 12 ? 'Buenos días 👋' : h < 19 ? 'Buenas tardes 👋' : 'Buenas noches 👋';
  document.getElementById('greeting').textContent = greeting;

  // update active state on filter buttons
  document.querySelectorAll('[data-dashperiod]').forEach(b =>
    b.classList.toggle('active', String(b.dataset.dashperiod) === String(dashPeriod)));
  document.querySelectorAll('[data-dashtype]').forEach(b =>
    b.classList.toggle('active', b.dataset.dashtype === dashType));

  const expenses = getDashExpenses();
  const periodLabel = getDashPeriodLabel();
  const empresa  = expenses.filter(e => e.type === 'empresa').reduce((a, e) => a + e.amount, 0);
  const personal = expenses.filter(e => e.type === 'personal').reduce((a, e) => a + e.amount, 0);
  const total    = dashType === 'empresa' ? empresa : dashType === 'personal' ? personal : empresa + personal;
  const tasks    = getTasks().filter(t => t.status !== 'done');

  // Income filtered by same period
  const allIncome = getIncome();
  const now2 = new Date();
  let incomeFiltered;
  if (dashPeriod === 'month') {
    const curMo = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,'0')}`;
    incomeFiltered = allIncome.filter(e => e.date.startsWith(curMo));
  } else {
    const cutoff = new Date(now2); cutoff.setDate(cutoff.getDate() - dashPeriod);
    const cutoffStr = localDateStr(cutoff);
    incomeFiltered = allIncome.filter(e => e.date >= cutoffStr);
  }
  const totalIncome = incomeFiltered.reduce((a, e) => a + e.amount, 0);
  const saldoLibre  = totalIncome - total;

  document.getElementById('kpiEmpresa').textContent   = clp(empresa);
  document.getElementById('kpiPersonal').textContent  = clp(personal);
  document.getElementById('kpiTotal').textContent     = clp(total);
  document.getElementById('kpiTasks').textContent     = tasks.length;
  document.getElementById('kpiIngresos').textContent  = clp(totalIncome);
  document.getElementById('kpiSaldo').textContent     = clp(Math.abs(saldoLibre));
  const saldoEl = document.getElementById('kpiSaldo');
  saldoEl.style.color = saldoLibre >= 0 ? '#16a34a' : '#dc2626';
  document.getElementById('kpiSaldoLabel').textContent = saldoLibre >= 0 ? 'Superávit' : 'Déficit';

  document.querySelectorAll('.kpi-period').forEach((el, i) => {
    if (i < 3) el.textContent = periodLabel;
  });
  document.getElementById('kpiIngresosPeriod').textContent = periodLabel;
  document.getElementById('kpiSaldoPeriod').textContent    = periodLabel;

  const pipeline = getPipeline();
  const ventasLeads = pipeline.filter(l => l.stage === 'facturado' || l.stage === 'recompra');
  const ventasTotal = ventasLeads.reduce((s, l) => s + (Number(l.price) || 0), 0);
  const comision = Math.round(ventasTotal * 0.05);
  document.getElementById('kpiVentas').textContent = fmtPesos(comision);
  document.getElementById('kpiVentasPeriod').textContent = privacyMode
    ? `5% de $***.*** · ** ventas`
    : `5% de ${clp(ventasTotal)} · ${ventasLeads.length} venta${ventasLeads.length !== 1 ? 's' : ''}`;

  renderBizKpis(totalIncome, total, empresa);
  renderRecentExpenses();
  renderUpcomingTasks();
  renderQuote();
}

function renderBizKpis(totalIncome, totalGastos, gastoEmpresa) {
  const leads = getPipeline();
  const now   = new Date();
  const curMo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;

  // Conversión: cerrados (facturado+recompra) / total
  const cerrados = leads.filter(l => l.stage === 'facturado' || l.stage === 'recompra');
  const convPct  = leads.length ? Math.round(cerrados.length / leads.length * 100) : 0;
  document.getElementById('kpiBizConversion').textContent   = `${convPct}%`;
  document.getElementById('kpiBizConversionSub').textContent = `${cerrados.length} de ${leads.length} leads`;

  // Ticket promedio
  const conPrecio = cerrados.filter(l => l.price > 0);
  const ticketAvg = conPrecio.length
    ? Math.round(conPrecio.reduce((s,l) => s + l.price, 0) / conPrecio.length)
    : 0;
  document.getElementById('kpiBizTicket').textContent = ticketAvg ? clp(ticketAvg) : '—';

  // Pipeline activo (leads no cerrados con precio)
  const activos     = leads.filter(l => l.stage !== 'facturado' && l.stage !== 'recompra' && l.stage !== 'perdido');
  const pipelineVal = activos.reduce((s,l) => s + (Number(l.price)||0), 0);
  document.getElementById('kpiBizPipeline').textContent    = pipelineVal ? clp(pipelineVal) : '—';
  document.getElementById('kpiBizPipelineSub').textContent = `${activos.length} leads en curso`;

  // Margen neto %
  const margen = totalIncome > 0 ? Math.round((totalIncome - totalGastos) / totalIncome * 100) : null;
  const margenEl = document.getElementById('kpiBizMargen');
  if (margen !== null) {
    margenEl.textContent      = `${margen}%`;
    margenEl.style.color      = margen >= 0 ? '#16a34a' : '#dc2626';
    document.getElementById('kpiBizMargenSub').textContent = margen >= 0 ? 'superávit del período' : 'déficit del período';
  } else {
    margenEl.textContent = '—';
    margenEl.style.color = '';
  }

  // ROI JPB = (comisión 5% − gastos empresa) / gastos empresa × 100
  const roiEl = document.getElementById('kpiBizRatio');
  const ventasLeadsRoi = leads.filter(l => l.stage === 'facturado' || l.stage === 'recompra');
  const comisionRoi = Math.round(ventasLeadsRoi.reduce((s,l) => s + (Number(l.price)||0), 0) * 0.05);
  if (gastoEmpresa > 0) {
    const roi = Math.round((comisionRoi - gastoEmpresa) / gastoEmpresa * 100);
    roiEl.textContent = `${roi > 0 ? '+' : ''}${roi}%`;
    roiEl.style.color = roi > 0 ? '#16a34a' : '#dc2626';
  } else {
    roiEl.textContent = '—';
    roiEl.style.color = '';
  }

  // Leads este mes
  const leadsMes = leads.filter(l => l.date && l.date.startsWith(curMo));
  document.getElementById('kpiBizLeadsMes').textContent    = leadsMes.length;
  document.getElementById('kpiBizLeadsMesSub').textContent = `${leadsMes.length} nuevos en ${['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'][now.getMonth()]}`;

  // Velocidad de cierre (días entre fecha lead y fecha cierre — aproximado por fecha del lead)
  const conFecha = cerrados.filter(l => l.date);
  const velDias  = conFecha.length
    ? Math.round(conFecha.reduce((s,l) => {
        const d = (new Date() - new Date(l.date)) / 86400000;
        return s + d;
      }, 0) / conFecha.length)
    : null;
  document.getElementById('kpiBizVelocidad').textContent = velDias !== null ? `${velDias}d` : '—';

}

function renderRecentExpenses() {
  const el = document.getElementById('recentExpenses');
  const list = getDashExpenses().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
      <p>Sin transacciones aún</p>
      <button class="btn btn-sm btn-primary" id="addFirstExpense">Agregar primer gasto</button>
    </div>`;
    document.getElementById('addFirstExpense')?.addEventListener('click', () => openExpenseModal());
    return;
  }
  el.innerHTML = list.map(e => `
    <div class="txn-row">
      <div class="txn-icon ${e.type}">${e.type === 'empresa' ? 'EMP' : 'PER'}</div>
      <div style="flex:1">
        <div class="txn-desc">${escHtml(e.description)}</div>
        <div class="txn-cat">${escHtml(e.category)}</div>
      </div>
      <div style="text-align:right">
        <div class="txn-amount">${clp(e.amount)}</div>
        <div class="txn-date">${formatDate(e.date)}</div>
      </div>
    </div>
  `).join('');
}

function renderUpcomingTasks() {
  const el = document.getElementById('upcomingTasks');
  const list = getTasks()
    .filter(t => t.status !== 'done')
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 5);

  if (!list.length) {
    el.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
      <p>Sin tareas pendientes</p>
    </div>`;
    return;
  }
  el.innerHTML = list.map(t => `
    <div class="task-row">
      <div class="task-priority-dot ${t.priority}"></div>
      <div class="task-title">${escHtml(t.title)}</div>
      <span class="task-cat-badge ${t.category}">${t.category === 'empresa' ? 'Empresa' : 'Personal'}</span>
      ${t.dueDate ? `<span class="task-due${isOverdue(t.dueDate) ? ' overdue' : ''}">${formatDate(t.dueDate)}</span>` : ''}
    </div>
  `).join('');
}

// ── Quotes ───────────────────────────────────────────

function renderQuote() {
  const q = QUOTES[state.quoteIndex];
  document.getElementById('quoteText').textContent   = `"${q.text}"`;
  document.getElementById('quoteAuthor').textContent = `— ${q.author}`;
}

// ── Expenses ─────────────────────────────────────────

function populateCategorySelect(typeVal) {
  const sel = document.getElementById('expenseCategory');
  const cats = CATEGORIES[typeVal] || CATEGORIES.empresa;
  sel.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
}

function renderTagPreview(tagsStr) {
  const tags = tagsStr.split(',').map(t => t.trim()).filter(Boolean);
  const el = document.getElementById('expenseTagPreview');
  if (!el) return;
  el.innerHTML = tags.map(t => `<span class="exp-tag">${escHtml(t)}</span>`).join('');
}

function openExpenseModal(id, preDate) {
  document.getElementById('expenseId').value     = '';
  document.getElementById('expenseDesc').value   = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseType').value   = 'empresa';
  document.getElementById('expenseDate').value   = preDate || today();
  document.getElementById('expenseNotes').value  = '';
  document.getElementById('expenseTags').value   = '';
  document.getElementById('expenseTagPreview').innerHTML = '';
  populateCategorySelect('empresa');

  if (id) {
    const e = getExpenses().find(x => x.id === id);
    if (!e) return;
    document.getElementById('expenseModalTitle').textContent = 'Editar Gasto';
    document.getElementById('expenseId').value     = e.id;
    document.getElementById('expenseDesc').value   = e.description;
    document.getElementById('expenseAmount').value = e.amount;
    document.getElementById('expenseType').value   = e.type;
    populateCategorySelect(e.type);
    document.getElementById('expenseCategory').value = e.category;
    document.getElementById('expenseDate').value   = e.date;
    document.getElementById('expenseNotes').value  = e.notes || '';
    const tagsStr = (e.tags || []).join(', ');
    document.getElementById('expenseTags').value   = tagsStr;
    renderTagPreview(tagsStr);
  } else {
    document.getElementById('expenseModalTitle').textContent = 'Nuevo Gasto';
  }

  // live preview while typing tags
  document.getElementById('expenseTags').oninput = e => renderTagPreview(e.target.value);

  openModal('expenseModal');
}

function saveExpense(e) {
  e.preventDefault();
  const desc   = document.getElementById('expenseDesc').value.trim();
  const amount = parseFloat(document.getElementById('expenseAmount').value);
  const type   = document.getElementById('expenseType').value;
  const cat    = document.getElementById('expenseCategory').value;
  const date   = document.getElementById('expenseDate').value;
  const notes  = document.getElementById('expenseNotes').value.trim();

  if (!desc || !amount || !date) return;

  const tagsRaw = document.getElementById('expenseTags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  const id = document.getElementById('expenseId').value;
  const expenses = getExpenses();
  const record = { id: id || uid(), description: desc, amount, type, category: cat, date, notes, tags, createdAt: id ? undefined : new Date().toISOString() };

  if (id) {
    const idx = expenses.findIndex(x => x.id === id);
    if (idx !== -1) { record.createdAt = expenses[idx].createdAt; expenses[idx] = record; }
  } else {
    expenses.push(record);
  }

  saveExpenses(expenses);
  closeModal('expenseModal');
  renderExpenses();
  renderDashboard();
  if (state.currentPage === 'graficos') renderCharts();
  if (state.currentPage === 'calendario') calRefresh();
}

async function deleteExpense(id) {
  if (!(await appConfirm('¿Eliminar este gasto?'))) return;
  saveExpenses(getExpenses().filter(e => e.id !== id));
  renderExpenses();
  renderDashboard();
  if (state.currentPage === 'graficos') renderCharts();
  calRefresh();
}

function renderExpenses() {
  const { type, month, category, tag } = state.expenseFilter;
  let list = getExpenses();

  if (type !== 'all') list = list.filter(e => e.type === type);
  if (month)          list = list.filter(e => e.date.startsWith(month));
  if (category)       list = list.filter(e => e.category === category);
  if (tag)            list = list.filter(e => (e.tags || []).includes(tag));

  // show active tag filter banner
  let tagBanner = document.getElementById('activeTagBanner');
  if (!tagBanner) {
    tagBanner = document.createElement('div');
    tagBanner.id = 'activeTagBanner';
    tagBanner.className = 'active-tag-banner';
    const listContainer = document.getElementById('expenseListContainer') || document.getElementById('expenseGroupedList')?.parentElement;
    if (listContainer) listContainer.prepend(tagBanner);
  }
  if (tag) {
    tagBanner.innerHTML = `Filtrando por etiqueta: <strong>${escHtml(tag)}</strong> <button onclick="clearTagFilter()" class="btn-clear-tag">✕ Quitar</button>`;
    tagBanner.style.display = '';
  } else {
    tagBanner.style.display = 'none';
  }

  list.sort((a, b) => b.date.localeCompare(a.date));

  const empresa  = list.filter(e => e.type === 'empresa').reduce((a, e) => a + e.amount, 0);
  const personal = list.filter(e => e.type === 'personal').reduce((a, e) => a + e.amount, 0);
  document.getElementById('sumEmpresa').textContent  = clp(empresa);
  document.getElementById('sumPersonal').textContent = clp(personal);
  document.getElementById('sumTotal').textContent    = clp(empresa + personal);
  document.getElementById('sumCount').textContent    = list.length;
  const gatitaTotal = list.filter(e => e.category === 'Gatita').reduce((s, e) => s + e.amount, 0);
  document.getElementById('sumGatita').textContent   = clp(gatitaTotal);
  document.getElementById('sumGatitaChip').classList.toggle('active', state.expenseFilter.category === 'Gatita');

  if (state.expenseView === 'calendar') {
    renderExpenseCalendar();
  } else {
    renderExpenseList(list);
  }
}

function renderExpenseCalendar() {
  document.getElementById('expenseCalContainer').style.display = '';
  document.getElementById('expenseListContainer').style.display = 'none';

  const d    = state.expCalDate;
  const year = d.getFullYear();
  const mon  = d.getMonth();
  const mStr = `${year}-${String(mon + 1).padStart(2, '0')}`;

  document.getElementById('filterMonth').value = mStr;
  state.expenseFilter.month = mStr;

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('expCalTitle').textContent = `${MONTHS[mon]} ${year}`;

  const { type, category } = state.expenseFilter;
  const allExp = getExpenses().filter(e =>
    e.date.startsWith(mStr)
    && (type === 'all' || e.type === type)
    && (!category || e.category === category)
  );

  const byDay = {};
  allExp.forEach(e => {
    const day = parseInt(e.date.split('-')[2]);
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(e);
  });

  const firstDay    = new Date(year, mon, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const todayStr    = today();

  const grid = document.getElementById('expCalGrid');
  let html = '';

  for (let i = 0; i < startOffset; i++) {
    html += `<div class="exp-cal-day empty"></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr    = `${mStr}-${String(day).padStart(2, '0')}`;
    const isToday = dStr === todayStr;
    const dayExps = byDay[day] || [];
    const total   = dayExps.reduce((a, e) => a + e.amount, 0);

    const hasEmpresa  = dayExps.some(e => e.type === 'empresa');
    const hasPersonal = dayExps.some(e => e.type === 'personal');
    let typeClass = '';
    if (hasEmpresa && hasPersonal)  typeClass = ' has-both';
    else if (hasEmpresa)            typeClass = ' has-empresa';
    else if (hasPersonal)           typeClass = ' has-personal';

    html += `
      <div class="exp-cal-day${typeClass}${isToday ? ' today' : ''}"
           data-date="${dStr}" onclick="selectExpenseDay('${dStr}')">
        <div class="exp-cal-num">${day}</div>
        ${total > 0 ? `<div class="exp-cal-amount">${shortClp(total)}</div>` : ''}
      </div>`;
  }

  grid.innerHTML = html;

  if (state.expCalSelected && state.expCalSelected.startsWith(mStr)) {
    const sel = grid.querySelector(`[data-date="${state.expCalSelected}"]`);
    if (sel) sel.classList.add('selected');
    renderExpDayPanel(state.expCalSelected);
  } else {
    state.expCalSelected = null;
    document.getElementById('expDayPanel').style.display = 'none';
  }
}

function selectExpenseDay(dateStr) {
  state.expCalSelected = dateStr;
  document.querySelectorAll('#expCalGrid .exp-cal-day').forEach(el => {
    el.classList.toggle('selected', el.dataset.date === dateStr);
  });
  renderExpDayPanel(dateStr);
}

function renderExpDayPanel(dateStr) {
  const { type, category } = state.expenseFilter;
  const dayExps = getExpenses().filter(e =>
    e.date === dateStr
    && (type === 'all' || e.type === type)
    && (!category || e.category === category)
  ).sort((a, b) => a.description.localeCompare(b.description));

  const panel = document.getElementById('expDayPanel');
  panel.style.display = '';

  const [y, m, d]  = dateStr.split('-');
  const dayObj     = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
  const WDAYS      = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const MNAMES     = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                      'septiembre','octubre','noviembre','diciembre'];
  const dateLabel  = `${WDAYS[dayObj.getDay()]}, ${parseInt(d)} de ${MNAMES[parseInt(m)-1]} de ${y}`;
  const total      = dayExps.reduce((a, e) => a + e.amount, 0);
  const expRows    = dayExps.map(e => expRowHtml(e)).join('');

  panel.innerHTML = `
    <div class="exp-day-panel-head">
      <div>
        <div class="exp-day-panel-title">${dateLabel}</div>
        ${total > 0 ? `<div class="exp-day-panel-total">${clp(total)} · ${dayExps.length} gasto${dayExps.length !== 1 ? 's' : ''}</div>` : ''}
      </div>
      <button class="btn btn-primary btn-sm" onclick="openExpenseModal(null,'${dateStr}')">+ Agregar</button>
    </div>
    ${dayExps.length ? expRows : '<p class="exp-day-empty">Sin gastos. Agrega el primero.</p>'}`;
}

function expRowHtml(e) {
  const tagPills = (e.tags || []).map(t =>
    `<span class="exp-tag clickable" onclick="filterByTag('${escHtml(t)}')">${escHtml(t)}</span>`
  ).join('');
  return `
    <div class="exp-row">
      <div class="exp-row-icon">${CATEGORY_ICONS[e.category] || '💼'}</div>
      <div class="exp-row-body">
        <div class="exp-row-desc">${escHtml(e.description)}</div>
        <div class="exp-row-meta">
          <span class="type-badge ${e.type}">${e.type === 'empresa' ? 'Empresa' : 'Personal'}</span>
          <span class="cat-badge">${escHtml(e.category)}</span>
          ${e.notes ? `<span class="exp-row-notes">${escHtml(e.notes)}</span>` : ''}
        </div>
        ${tagPills ? `<div class="exp-row-tags">${tagPills}</div>` : ''}
      </div>
      <div class="exp-row-amount">${clp(e.amount)}</div>
      <div class="td-actions">
        <button class="cal-gatita${e.category === 'Gatita' ? ' on' : ''}" onclick="calToggleGatita('${e.id}')" title="${e.category === 'Gatita' ? 'Quitar de Gatita' : 'Guardar este gasto en la categoría Gatita'}">Gatita</button>
        <button class="btn-icon" onclick="openExpenseModal('${e.id}')" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="deleteExpense('${e.id}')" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    </div>`;
}

// Navigate from dashboard KPI → Gastos with pre-applied filter
function goToGastosFiltered(type) {
  state.expenseFilter.type = type;
  // mirror the dash period into gastos month filter
  if (dashPeriod === 'month') {
    const now = new Date();
    state.expenseFilter.month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  } else {
    state.expenseFilter.month = '';
  }
  state.expenseFilter.category = '';
  navigateTo('gastos');
  // sync the type tabs UI
  setTimeout(() => {
    document.querySelectorAll('#expenseFilterTabs .ftab').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === type);
    });
    const sel = document.getElementById('filterType');
    if (sel) sel.value = type;
  }, 50);
}

// Filter expenses by tag (from clicking a tag pill)
function filterByTag(tag) {
  state.expenseFilter.tag = tag;
  navigateTo('gastos');
}

function clearTagFilter() {
  state.expenseFilter.tag = '';
  renderExpenses();
}

function openIncomeModal() {
  const now = new Date();
  let list = getIncome();
  if (dashPeriod === 'month') {
    const curMo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    list = list.filter(e => e.date.startsWith(curMo));
  } else {
    const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - dashPeriod);
    list = list.filter(e => e.date >= localDateStr(cutoff));
  }
  list.sort((a, b) => b.date.localeCompare(a.date));

  const total = list.reduce((s, e) => s + e.amount, 0);
  const totalGastos = getDashExpenses().reduce((s, e) => s + e.amount, 0);
  const saldo = total - totalGastos;

  document.getElementById('incomeModalSummary').innerHTML = `
    <div style="flex:1;text-align:center">
      <div style="font-size:.72rem;color:var(--light);margin-bottom:2px">Ingresos</div>
      <div style="font-size:1.1rem;font-weight:800;color:#16a34a">${clp(total)}</div>
    </div>
    <div style="flex:1;text-align:center">
      <div style="font-size:.72rem;color:var(--light);margin-bottom:2px">Gastos</div>
      <div style="font-size:1.1rem;font-weight:800;color:#dc2626">${clp(totalGastos)}</div>
    </div>
    <div style="flex:1;text-align:center">
      <div style="font-size:.72rem;color:var(--light);margin-bottom:2px">${saldo>=0?'Superávit':'Déficit'}</div>
      <div style="font-size:1.1rem;font-weight:800;color:${saldo>=0?'#16a34a':'#dc2626'}">${clp(Math.abs(saldo))}</div>
    </div>`;

  document.getElementById('incomeModalList').innerHTML = list.length
    ? list.map(e => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:36px;height:36px;border-radius:8px;background:#dcfce7;color:#16a34a;display:grid;place-items:center;font-size:.7rem;font-weight:700;flex-shrink:0">ING</div>
        <div style="flex:1">
          <div style="font-size:.85rem;font-weight:600;color:var(--heading)">${escHtml(e.description)}</div>
          <div style="font-size:.72rem;color:var(--light)">${escHtml(e.category)} · ${formatDate(e.date)}</div>
        </div>
        <div style="font-size:.9rem;font-weight:800;color:#16a34a">${clp(e.amount)}</div>
      </div>`).join('')
    : `<p style="text-align:center;color:var(--light);padding:24px">Sin ingresos en este período</p>`;

  document.getElementById('modalIngresos').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeIncomeModal() {
  document.getElementById('modalIngresos').style.display = 'none';
  document.body.style.overflow = '';
}

function renderExpenseList(list) {
  document.getElementById('expenseCalContainer').style.display = 'none';
  document.getElementById('expenseListContainer').style.display = '';

  const container = document.getElementById('expenseGroupedList');

  if (!list.length) {
    container.innerHTML = `<div class="card" style="padding:24px;text-align:center;color:var(--light)">Sin gastos para los filtros seleccionados.</div>`;
    return;
  }

  const groups = {};
  list.forEach(e => {
    if (!groups[e.date]) groups[e.date] = [];
    groups[e.date].push(e);
  });

  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const WDAYS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
  const MNAMES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
                  'septiembre','octubre','noviembre','diciembre'];

  container.innerHTML = sortedDates.map(dateStr => {
    const [y, m, d] = dateStr.split('-');
    const dayObj    = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    const label     = `${WDAYS[dayObj.getDay()]} ${parseInt(d)} de ${MNAMES[parseInt(m)-1]} de ${y}`;
    const dayExps   = groups[dateStr];
    const totalDay  = dayExps.reduce((a, e) => a + e.amount, 0);
    const hasEmpresa  = dayExps.some(e => e.type === 'empresa');
    const hasPersonal = dayExps.some(e => e.type === 'personal');
    const grpClass  = hasEmpresa && hasPersonal ? 'both' : (hasEmpresa ? 'empresa' : 'personal');

    return `
      <div class="exp-day-group exp-day-group--${grpClass}">
        <div class="exp-day-head">
          <span class="exp-day-date">${label}</span>
          <span class="exp-day-daytotal">${clp(totalDay)}</span>
        </div>
        ${dayExps.map(e => expRowHtml(e)).join('')}
      </div>`;
  }).join('');
}

function populateFilterCategories() {
  const sel = document.getElementById('filterCategory');
  const all = [...CATEGORIES.empresa, ...CATEGORIES.personal];
  const opts = ['<option value="">Todas las categorías</option>',
    ...all.map(c => `<option value="${c}">${c}</option>`)].join('');
  sel.innerHTML = opts;
}

function exportCsv() {
  const list = getExpenses().sort((a, b) => b.date.localeCompare(a.date));
  if (!list.length) { alert('Sin datos para exportar.'); return; }
  const header = 'Fecha,Descripción,Categoría,Tipo,Monto (CLP),Notas';
  const rows = list.map(e =>
    `${e.date},"${e.description.replace(/"/g,'""')}","${e.category}",${e.type},${e.amount},"${(e.notes||'').replace(/"/g,'""')}"`
  );
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gestipyme-gastos-${today()}.csv`;
  a.click();
}

// ── Tasks ────────────────────────────────────────────

function toggleTaskReminderFields(show) {
  document.getElementById('taskReminderFields').style.display = show ? 'block' : 'none';
}

const REMINDER_UNIT_LABELS = { minutes: 'minutos antes', hours: 'horas antes', days: 'días antes' };

function reminderRowHtml(rowId, amount, unit) {
  const opts = Object.entries(REMINDER_UNIT_LABELS)
    .map(([val, label]) => `<option value="${val}"${val === unit ? ' selected' : ''}>${label}</option>`)
    .join('');
  return `
    <div class="reminder-row" data-row-id="${rowId}">
      <input type="number" min="1" value="${amount}" class="reminder-amount">
      <select class="reminder-unit">${opts}</select>
      <button type="button" class="reminder-row-remove" onclick="removeTaskReminderRow('${rowId}')">×</button>
    </div>`;
}

function addTaskReminderRow(amount, unit) {
  const list = document.getElementById('taskReminderList');
  const rowId = uid();
  list.insertAdjacentHTML('beforeend', reminderRowHtml(rowId, amount || 1, unit || 'days'));
}

function removeTaskReminderRow(rowId) {
  document.querySelector(`.reminder-row[data-row-id="${rowId}"]`)?.remove();
}

function collectTaskReminders() {
  return Array.from(document.querySelectorAll('#taskReminderList .reminder-row')).map(row => ({
    amount: Math.max(1, parseInt(row.querySelector('.reminder-amount').value, 10) || 1),
    unit:   row.querySelector('.reminder-unit').value,
  }));
}

function renderTaskReminderEmailDefaults(selectedEmails) {
  const box = document.getElementById('taskReminderEmailDefaults');
  const defaults = mailConfigCache.defaultRecipients || [];
  box.innerHTML = defaults.map(email => `
    <label class="checkbox-label" style="font-weight:400">
      <input type="checkbox" class="task-reminder-email-default" value="${escHtml(email)}"${selectedEmails.includes(email) ? ' checked' : ''}>
      ${escHtml(email)}
    </label>`).join('');
}

function collectTaskReminderEmails() {
  const checked = Array.from(document.querySelectorAll('.task-reminder-email-default:checked')).map(c => c.value);
  const extra = document.getElementById('taskReminderEmailExtra').value.trim();
  if (extra) checked.push(extra);
  return checked.join(',');
}

function openTaskModal(id, preDate, preTitle, preTime) {
  document.getElementById('taskId').value       = '';
  document.getElementById('taskTitle').value    = '';
  document.getElementById('taskDesc').value     = '';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskCategory').value = 'empresa';
  document.getElementById('taskDueDate').value  = '';
  document.getElementById('taskStatus').value   = 'pending';
  document.getElementById('taskReminderEnabled').checked = false;
  document.getElementById('taskDueTime').value  = '';
  document.getElementById('taskReminderEmailExtra').value = '';
  document.getElementById('taskReminderList').innerHTML = '';
  renderTaskReminderEmailDefaults(mailConfigCache.defaultRecipients || []);
  toggleTaskReminderFields(false);

  if (id) {
    const t = getTasks().find(x => x.id === id);
    if (!t) return;
    document.getElementById('taskModalTitle').textContent = 'Editar Tarea';
    document.getElementById('taskId').value       = t.id;
    document.getElementById('taskTitle').value    = t.title;
    document.getElementById('taskDesc').value     = t.description || '';
    document.getElementById('taskPriority').value = t.priority;
    document.getElementById('taskCategory').value = t.category;
    document.getElementById('taskDueDate').value  = t.dueDate || '';
    document.getElementById('taskStatus').value   = t.status;
    document.getElementById('taskReminderEnabled').checked = !!t.reminderEnabled;
    document.getElementById('taskDueTime').value  = t.dueTime || '';
    const savedEmails = (t.reminderEmail || '').split(',').map(e => e.trim()).filter(Boolean);
    renderTaskReminderEmailDefaults(savedEmails.length ? savedEmails : (mailConfigCache.defaultRecipients || []));
    document.getElementById('taskReminderEmailExtra').value =
      savedEmails.filter(e => !(mailConfigCache.defaultRecipients || []).includes(e)).join(',');
    (t.reminders && t.reminders.length ? t.reminders : []).forEach(r => addTaskReminderRow(r.amount, r.unit));
    toggleTaskReminderFields(!!t.reminderEnabled);
  } else {
    document.getElementById('taskModalTitle').textContent = 'Nueva Tarea';
    document.getElementById('taskDueDate').value = preDate || today();
    if (preTitle) document.getElementById('taskTitle').value = preTitle;
    if (preTime) document.getElementById('taskDueTime').value = preTime;
  }
  if (!document.getElementById('taskReminderList').children.length) addTaskReminderRow(1, 'days');

  openModal('taskModal');
}

function saveTask(e) {
  e.preventDefault();
  const title   = document.getElementById('taskTitle').value.trim();
  if (!title) return;
  const id           = document.getElementById('taskId').value;
  const dueDate      = document.getElementById('taskDueDate').value;
  const reminders    = collectTaskReminders();
  const reminderEnabled = document.getElementById('taskReminderEnabled').checked && !!dueDate && reminders.length > 0;
  const tasks   = getTasks();
  const record  = {
    id:          id || uid(),
    title,
    description: document.getElementById('taskDesc').value.trim(),
    priority:    document.getElementById('taskPriority').value,
    category:    document.getElementById('taskCategory').value,
    dueDate,
    status:      document.getElementById('taskStatus').value,
    createdAt:   id ? undefined : new Date().toISOString(),
    reminderEnabled,
    dueTime:       document.getElementById('taskDueTime').value || '09:00',
    reminderEmail: collectTaskReminderEmails(),
    reminders,
  };

  if (id) {
    const idx = tasks.findIndex(x => x.id === id);
    if (idx !== -1) { record.createdAt = tasks[idx].createdAt; tasks[idx] = record; }
  } else {
    tasks.push(record);
  }

  saveTasks(tasks);
  if (window.gestipyme) window.gestipyme.syncReminder(record);
  closeModal('taskModal');
  renderKanban();
  renderDashboard();
  calRefresh();
}

async function deleteTask(id) {
  if (!(await appConfirm('¿Eliminar esta tarea?'))) return;
  saveTasks(getTasks().filter(t => t.id !== id));
  if (window.gestipyme) window.gestipyme.deleteReminder(id);
  renderKanban();
  renderDashboard();
  calRefresh();
}

function moveTask(id, direction) {
  const tasks = getTasks();
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  const order = ['pending', 'in_progress', 'done'];
  const cur = order.indexOf(t.status);
  const next = cur + direction;
  if (next < 0 || next >= order.length) return;
  t.status = order[next];
  saveTasks(tasks);
  renderKanban();
  renderDashboard();
}

function renderKanban() {
  const tasks = getTasks();
  const cols  = { pending: [], in_progress: [], done: [] };
  tasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });

  const priorityLabel = { high: 'Alta', medium: 'Media', low: 'Baja' };

  Object.entries(cols).forEach(([status, list]) => {
    const nameMap = { pending: 'Pending', in_progress: 'InProgress', done: 'Done' };
    const badge = document.getElementById(`count${nameMap[status]}`);
    const body  = document.getElementById(`kanban${nameMap[status]}`);
    if (!badge || !body) return;

    badge.textContent = list.length;
    if (!list.length) {
      body.innerHTML = '<div class="kanban-empty">Sin tareas</div>';
      return;
    }

    const order = ['pending', 'in_progress', 'done'];
    const cur   = order.indexOf(status);

    body.innerHTML = list.map(t => `
      <div class="task-card">
        <div class="task-card-header">
          <div class="task-card-title">${escHtml(t.title)}</div>
          <span class="task-cat-badge ${t.category}">${t.category === 'empresa' ? 'Emp' : 'Per'}</span>
        </div>
        ${t.description ? `<div class="task-card-desc">${escHtml(t.description)}</div>` : ''}
        <div class="task-card-footer">
          <span class="priority-badge ${t.priority}">${priorityLabel[t.priority]}</span>
          ${t.dueDate ? `<span class="due-date-badge${isOverdue(t.dueDate) && t.status !== 'done' ? ' overdue' : ''}">📅 ${formatDate(t.dueDate)}</span>` : ''}
          ${t.reminderEnabled && t.reminders && t.reminders.length ? `<span class="due-date-badge" title="${t.reminders.length} recordatorio(s) por email antes del ${formatDate(t.dueDate)} ${t.dueTime || ''}">🔔 ${t.reminders.length}</span>` : ''}
          <div class="task-card-actions">
            ${cur > 0 ? `<button class="move-btn" onclick="moveTask('${t.id}',-1)">← Atrás</button>` : ''}
            ${cur < 2 ? `<button class="move-btn" onclick="moveTask('${t.id}',1)">Adelante →</button>` : ''}
            <button class="btn-icon" onclick="openTaskModal('${t.id}')" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="btn-icon danger" onclick="deleteTask('${t.id}')" title="Eliminar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  });
}

// ── Diary ────────────────────────────────────────────

function openDiaryModal(id, preDate) {
  document.getElementById('diaryId').value      = '';
  document.getElementById('diaryDate').value    = today();
  document.getElementById('diaryMood').value    = '🔥';
  document.getElementById('diaryTitle').value   = '';
  document.getElementById('diaryContent').value = '';

  if (id) {
    const e = getDiary().find(x => x.id === id);
    if (!e) return;
    document.getElementById('diaryModalTitle').textContent = 'Editar Entrada';
    document.getElementById('diaryId').value      = e.id;
    document.getElementById('diaryDate').value    = e.date;
    document.getElementById('diaryMood').value    = e.mood || '😊';
    document.getElementById('diaryTitle').value   = e.title || '';
    document.getElementById('diaryContent').value = e.content;
  } else {
    document.getElementById('diaryModalTitle').textContent = 'Nueva Entrada';
    if (preDate) document.getElementById('diaryDate').value = preDate;
  }
  openModal('diaryModal');
}

function saveDiaryEntry(e) {
  e.preventDefault();
  const content = document.getElementById('diaryContent').value.trim();
  if (!content) return;

  const id      = document.getElementById('diaryId').value;
  const entries = getDiary();
  const record  = {
    id:        id || uid(),
    date:      document.getElementById('diaryDate').value || today(),
    mood:      document.getElementById('diaryMood').value,
    title:     document.getElementById('diaryTitle').value.trim(),
    content,
    createdAt: id ? undefined : new Date().toISOString(),
  };

  if (id) {
    const idx = entries.findIndex(x => x.id === id);
    if (idx !== -1) { record.createdAt = entries[idx].createdAt; entries[idx] = record; }
  } else {
    entries.push(record);
  }

  saveDiary(entries);
  closeModal('diaryModal');
  renderDiaryCalendar();
  selectDiaryDay(record.date);
}

async function deleteDiaryEntry(id) {
  if (!(await appConfirm('¿Eliminar esta entrada del diario?'))) return;
  const entry = getDiary().find(e => e.id === id);
  saveDiary(getDiary().filter(e => e.id !== id));
  renderDiaryCalendar();
  if (entry) selectDiaryDay(entry.date);
}

function renderDiary() {
  renderDiaryCalendar();
}

function renderDiaryCalendar() {
  const d    = state.diaryCalDate;
  const year = d.getFullYear();
  const mon  = d.getMonth();

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('diaryCalTitle').textContent = `${months[mon]} ${year}`;

  const firstDay    = new Date(year, mon, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const todayStr    = today();

  const prefix = `${year}-${String(mon + 1).padStart(2, '0')}`;
  const byDay  = {};
  getDiary().forEach(e => {
    if (e.date.startsWith(prefix)) {
      byDay[parseInt(e.date.split('-')[2])] = e;
    }
  });

  let html = '';
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="cal-day empty"><div class="cal-day-num"></div></div>`;
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const dStr       = `${prefix}-${String(day).padStart(2, '0')}`;
    const isToday    = dStr === todayStr;
    const isSelected = state.diaryCalSelected === dStr;
    const entry      = byDay[day];
    html += `
      <div class="cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}${entry ? ' diary-has-entry' : ''}"
           onclick="selectDiaryDay('${dStr}')">
        <div class="cal-day-num">${day}</div>
        ${entry ? `<div class="diary-cal-mood">${entry.mood || '😊'}</div>` : ''}
      </div>`;
  }
  document.getElementById('diaryCalGrid').innerHTML = html;
}

function selectDiaryDay(dateStr) {
  state.diaryCalSelected = dateStr;
  renderDiaryCalendar();

  const el    = document.getElementById('diaryDayPanel');
  const entry = getDiary().find(e => e.date === dateStr);
  const [y, m, d] = dateStr.split('-');
  const monthNames = ['enero','febrero','marzo','abril','mayo','junio',
                      'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const dayLabel = `${parseInt(d)} de ${monthNames[parseInt(m) - 1]} de ${y}`;

  if (!entry) {
    el.innerHTML = `<div class="card diary-day-empty">
      <span class="diary-day-empty-label">${dayLabel} — Sin entrada</span>
      <button class="btn btn-primary btn-sm" onclick="openDiaryModal('', '${dateStr}')">+ Crear entrada para este día</button>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="card diary-day-card">
    <div class="diary-entry-head">
      <div class="diary-mood">${entry.mood || '😊'}</div>
      <div class="diary-meta">
        <div class="diary-title">${entry.title ? escHtml(entry.title) : '<em style="color:var(--light)">Sin título</em>'}</div>
        <div class="diary-date">${dayLabel}</div>
      </div>
      <div class="diary-actions">
        <button class="btn-icon" onclick="openDiaryModal('${entry.id}')" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="deleteDiaryEntry('${entry.id}')" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    </div>
    <div class="diary-full-content">${escHtml(entry.content)}</div>
  </div>`;
}

// ── Rules ─────────────────────────────────────────────

function openRuleModal(id) {
  document.getElementById('ruleId').value      = '';
  document.getElementById('ruleTitle').value   = '';
  document.getElementById('ruleContent').value = '';

  if (id) {
    const r = getRules().find(x => x.id === id);
    if (!r) return;
    document.getElementById('ruleModalTitle').textContent = 'Editar Regla';
    document.getElementById('ruleId').value      = r.id;
    document.getElementById('ruleTitle').value   = r.title;
    document.getElementById('ruleContent').value = r.content;
  } else {
    document.getElementById('ruleModalTitle').textContent = 'Nueva Regla';
  }
  openModal('ruleModal');
}

function saveRule(e) {
  e.preventDefault();
  const title   = document.getElementById('ruleTitle').value.trim();
  const content = document.getElementById('ruleContent').value.trim();
  if (!title || !content) return;

  const id    = document.getElementById('ruleId').value;
  const rules = getRules();
  const record = {
    id:        id || uid(),
    title,
    content,
    createdAt: id ? undefined : new Date().toISOString(),
  };

  if (id) {
    const idx = rules.findIndex(x => x.id === id);
    if (idx !== -1) { record.createdAt = rules[idx].createdAt; rules[idx] = record; }
  } else {
    rules.push(record);
  }

  saveRules(rules);
  closeModal('ruleModal');
  renderRules();
}

async function deleteRule(id) {
  if (!(await appConfirm('¿Eliminar esta regla?'))) return;
  saveRules(getRules().filter(r => r.id !== id));
  renderRules();
}

function renderRules() {
  const el   = document.getElementById('rulesList');
  const list = getRules().sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

  if (!list.length) {
    el.innerHTML = `<div class="card"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
      <p>Sin reglas personales aún</p>
      <button class="btn btn-sm btn-primary" id="addFirstRule">Añadir primera regla</button>
    </div></div>`;
    document.getElementById('addFirstRule')?.addEventListener('click', () => openRuleModal());
    return;
  }

  el.innerHTML = list.map((r, i) => `
    <div class="rule-card card" style="margin-bottom:12px">
      <div class="rule-card-head">
        <div>
          <div class="rule-card-num">REGLA ${i + 1}</div>
          <div class="rule-card-title">${escHtml(r.title)}</div>
        </div>
        <div class="rule-card-actions">
          <button class="btn-icon" onclick="openRuleModal('${r.id}')" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="deleteRule('${r.id}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
      <div class="rule-card-content">${escHtml(r.content)}</div>
    </div>
  `).join('');
}

// ── Videos ───────────────────────────────────────────

function openVideoModal(id) {
  document.getElementById('videoId').value      = '';
  document.getElementById('videoTitle').value   = '';
  document.getElementById('videoAuthor').value  = '';
  document.getElementById('videoTags').value    = '';
  document.getElementById('videoThesis').value  = '';
  document.getElementById('videoContent').value = '';

  if (id) {
    const v = getVideos().find(x => x.id === id);
    if (!v) return;
    document.getElementById('videoModalTitle').textContent = 'Editar Video';
    document.getElementById('videoId').value      = v.id;
    document.getElementById('videoTitle').value   = v.title;
    document.getElementById('videoAuthor').value  = v.author || '';
    document.getElementById('videoTags').value    = (v.tags || []).join(', ');
    document.getElementById('videoThesis').value  = v.thesis || '';
    document.getElementById('videoContent').value = v.content;
  } else {
    document.getElementById('videoModalTitle').textContent = 'Nuevo Video';
  }
  openModal('videoModal');
}

function saveVideoEntry(e) {
  e.preventDefault();
  const title   = document.getElementById('videoTitle').value.trim();
  const content = document.getElementById('videoContent').value.trim();
  if (!title || !content) return;

  const id      = document.getElementById('videoId').value;
  const videos  = getVideos();
  const tagsRaw = document.getElementById('videoTags').value;
  const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];

  const record = {
    id:        id || uid(),
    title,
    author:    document.getElementById('videoAuthor').value.trim(),
    thesis:    document.getElementById('videoThesis').value.trim(),
    content,
    tags,
    createdAt: id ? undefined : new Date().toISOString(),
  };

  if (id) {
    const idx = videos.findIndex(x => x.id === id);
    if (idx !== -1) { record.createdAt = videos[idx].createdAt; videos[idx] = record; }
  } else {
    videos.push(record);
  }

  saveVideos(videos);
  closeModal('videoModal');
  renderVideos();
}

async function deleteVideoEntry(id) {
  if (!(await appConfirm('¿Eliminar este video?'))) return;
  saveVideos(getVideos().filter(v => v.id !== id));
  renderVideos();
}

function openVideoDetail(id) {
  const v = getVideos().find(x => x.id === id);
  if (!v) return;

  document.getElementById('videoDetailTitle').textContent = v.title;
  const tagsHtml = (v.tags || []).map(t => `<span class="video-tag">${escHtml(t)}</span>`).join('');
  document.getElementById('videoDetailBody').innerHTML = `
    ${v.author ? `<p class="video-detail-author">Por: <strong>${escHtml(v.author)}</strong></p>` : ''}
    ${v.thesis ? `<div class="video-thesis-box"><strong>Tesis:</strong> ${escHtml(v.thesis)}</div>` : ''}
    <div class="video-detail-content">${escHtml(v.content).replace(/\n/g, '<br>')}</div>
    ${tagsHtml ? `<div class="video-tags-row" style="margin-top:16px">${tagsHtml}</div>` : ''}
  `;
  openModal('videoDetailModal');
}

function renderVideos() {
  const el   = document.getElementById('videoList');
  const list = getVideos().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

  if (!list.length) {
    el.innerHTML = `<div class="card" style="grid-column:1/-1"><div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="40" height="40"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
      <p>Sin videos en la biblioteca aún</p>
      <button class="btn btn-sm btn-primary" id="addFirstVideo">Agregar primer video</button>
    </div></div>`;
    document.getElementById('addFirstVideo')?.addEventListener('click', () => openVideoModal());
    return;
  }

  el.innerHTML = list.map(v => `
    <div class="video-card card">
      <div class="video-card-head">
        <div class="video-icon">🎬</div>
        <div class="video-card-actions">
          <button class="btn-icon" onclick="openVideoModal('${v.id}')" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="deleteVideoEntry('${v.id}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
      <h3 class="video-card-title">${escHtml(v.title)}</h3>
      ${v.author ? `<div class="video-card-author">${escHtml(v.author)}</div>` : ''}
      ${v.thesis ? `<div class="video-card-thesis">"${escHtml(v.thesis)}"</div>` : ''}
      ${v.tags?.length ? `<div class="video-tags-row">${v.tags.map(t => `<span class="video-tag">${escHtml(t)}</span>`).join('')}</div>` : ''}
      <button class="btn btn-outline btn-sm video-detail-btn" onclick="openVideoDetail('${v.id}')">Ver resumen completo →</button>
    </div>
  `).join('');
}

// ── Calendar ─────────────────────────────────────────

function renderCalendar() {
  const d    = state.calDate;
  const year = d.getFullYear();
  const mon  = d.getMonth();

  const months = ['enero','febrero','marzo','abril','mayo','junio',
                  'julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('calTitle').textContent = `${months[mon]} de ${year}`;

  const startOffset = new Date(year, mon, 1).getDay(); // semana parte en domingo
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const weeks = Math.ceil((startOffset + daysInMonth) / 7);
  const todayStr = today();
  const first = new Date(year, mon, 1 - startOffset);

  const all = {};
  const bucket = (ds) => (all[ds] = all[ds] || { exp: 0, inc: 0, tasks: [] });
  getExpenses().forEach(e => { bucket(e.date).exp += Number(e.amount) || 0; });
  getIncome().forEach(e => { bucket(e.date).inc += Number(e.amount) || 0; });
  getTasks().forEach(t => { if (t.dueDate) bucket(t.dueDate).tasks.push(t); });

  const fmtTime = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = hhmm.split(':').map(Number);
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`;
  };
  const MAX = 4;
  let html = '';
  for (let i = 0; i < weeks * 7; i++) {
    const cd = new Date(first.getFullYear(), first.getMonth(), first.getDate() + i);
    const dStr = localDateStr(cd);
    const inMonth = cd.getMonth() === mon;
    const b = all[dStr] || { exp: 0, inc: 0, tasks: [] };
    const sorted = b.tasks.slice().sort((x, y) => (x.dueTime || '99').localeCompare(y.dueTime || '99'));
    const tasks = sorted.filter(t => t.status !== 'done');
    const doneN = sorted.length - tasks.length;
    const gev = (window.GCAL ? window.GCAL.forDate(dStr) : []);
    const items = [
      ...gev.map(g => ({ k: 'g', g, o: g.allDay ? '00:00' : g.time })),
      ...tasks.map(t => ({ k: 't', t, o: t.dueTime || '99:99' })),
    ].sort((x, y) => x.o.localeCompare(y.o));
    const chip = (it) => it.k === 'g' ? `
      <div class="gcal-ev google" title="${escHtml(it.g.title)}" onclick="event.stopPropagation();calGoogleEvPop('${dStr}','${escHtml(it.g.id)}', this)">
        <i></i><span class="gcal-ev-body">${it.g.allDay ? '' : `<span class="gcal-ev-t">${fmtTime(it.g.time)}</span>`}<span class="gcal-ev-n">${escHtml(it.g.title)}</span></span>
      </div>` : `
      <div class="gcal-ev${it.t.category === 'personal' ? ' personal' : ''}" title="${escHtml(it.t.title)}" onclick="event.stopPropagation();calTaskPop('${it.t.id}', this)">
        <i></i><span class="gcal-ev-body">${it.t.dueTime ? `<span class="gcal-ev-t">${fmtTime(it.t.dueTime)}</span>` : ''}<span class="gcal-ev-n">${escHtml(it.t.title)}</span></span>
      </div>`;
    const chips = items.slice(0, MAX).map(chip).join('');
    const more = items.length > MAX ? `<div class="gcal-more" onclick="event.stopPropagation();calMore('${dStr}')">+${items.length - MAX} más</div>` : '';
    const allDone = doneN > 0 && tasks.length === 0;
    const doneTag = doneN ? `<div class="gcal-donecount${allDone ? ' all' : ''}" title="Tareas completadas"><span class="gcal-donecheck">✓</span> ${allDone ? '¡Día completo!' : `${doneN} lista${doneN > 1 ? 's' : ''}`}</div>` : '';
    const money = (b.exp > 0 || b.inc > 0)
      ? `<div class="gcal-money">${b.inc > 0 ? `<span class="inc">+${clp(b.inc)}</span>` : ''}${b.exp > 0 ? `<span class="exp">−${clp(b.exp)}</span>` : ''}</div>` : '';
    const label = cd.getDate() === 1 ? `${cd.getDate()} ${months[cd.getMonth()].slice(0, 3)}` : cd.getDate();
    html += `
      <div class="cal-day gcal-day${allDone ? ' alldone' : ''}${inMonth ? '' : ' other'}${dStr === todayStr ? ' today' : ''}${state.calSelected === dStr ? ' selected' : ''}"
           data-date="${dStr}" onclick="calDayClick('${dStr}')">
        <div class="gcal-top"><div class="gcal-num"><span>${label}</span></div>
          <button class="gcal-add" title="Agregar una tarea este día" onclick="event.stopPropagation();calQuickAdd('${dStr}')">+</button></div>
        ${chips}${more}${doneTag}${money}
      </div>`;
  }
  document.getElementById('calGrid').innerHTML = html;
}

function calRefresh() {
  if (!document.getElementById('calGrid')) return;
  if (state.calSelected) selectCalDay(state.calSelected); else renderCalendar();
}

function selectCalDay(dateStr) {
  state.calSelected = dateStr;
  renderCalendar();

  const expenses = getExpenses().filter(e => e.date === dateStr);
  const tasks    = getTasks().filter(t => t.dueDate === dateStr).sort((x, y) => (x.dueTime || '').localeCompare(y.dueTime || ''));
  const title    = document.getElementById('calEventsTitle');
  const list     = document.getElementById('calEventsList');

  const longDay = (() => { const [yy, mm, dd] = dateStr.split('-').map(Number); const t = new Date(yy, mm - 1, dd).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }); return t.charAt(0).toUpperCase() + t.slice(1); })();
  title.innerHTML = `${escHtml(longDay)}
    <span class="cal-ev-actions"><button class="btn btn-primary btn-sm" onclick="openTaskModal('', '${dateStr}')">+ Tarea</button>
    <button class="btn btn-outline btn-sm" onclick="openExpenseModal('', '${dateStr}')">+ Gasto</button></span>`;

  if (!expenses.length && !tasks.length && !(window.GCAL && window.GCAL.forDate(dateStr).length)) {
    list.innerHTML = '<p class="cal-events-empty">Sin eventos para este día. Usa «+ Tarea» o «+ Gasto».</p>';
    return;
  }
  const gevs = (window.GCAL ? window.GCAL.forDate(dateStr) : []);
  const doneCount = tasks.filter(t => t.status === 'done').length;
  const progress = tasks.length ? `
    <div class="cal-progress${doneCount === tasks.length ? ' full' : ''}">
      <div class="cal-progress-top"><span>${doneCount === tasks.length ? '🎉 ¡Todo listo este día!' : `${doneCount} de ${tasks.length} tareas listas`}</span><b>${Math.round(doneCount / tasks.length * 100)}%</b></div>
      <div class="cal-progress-bar"><i style="width:${Math.round(doneCount / tasks.length * 100)}%"></i></div>
    </div>` : '';

  const ic = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">${d}</svg>`;
  const pen = ic('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>');
  const bin = ic('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>');
  const gRows = gevs.map(g => `
      <div class="cal-event-item cal-gev">
        <span class="cal-gev-badge">G</span>
        <span class="cal-event-name"><b>${g.allDay ? 'Todo el día' : escHtml(g.time) + (g.endTime ? '–' + escHtml(g.endTime) : '')}</b> · ${escHtml(g.title)}${g.location ? `<br><small style="color:var(--light)">📍 ${escHtml(g.location)}</small>` : ''}</span>
        <span class="task-cat-badge" style="background:#ccfbf1;color:#0f766e">Google</span>
      </div>`).join('');
  list.innerHTML = progress + gRows + [
    ...tasks.map(t => `
      <div class="cal-event-item${t.status === 'done' ? ' is-done' : ''}">
        <button class="cal-check${t.status === 'done' ? ' on' : ''}" onclick="calToggleTask('${t.id}', event)" title="${t.status === 'done' ? 'Marcar pendiente' : 'Marcar completada'}">✓</button>
        <span class="cal-event-name"><b>${t.dueTime ? escHtml(t.dueTime) + ' · ' : ''}</b>${escHtml(t.title)}</span>
        <span class="task-cat-badge ${t.category}">${t.category === 'empresa' ? 'Empresa' : 'Personal'}</span>
        <button class="btn-icon" onclick="openTaskModal('${t.id}')" title="Editar">${pen}</button>
        <button class="btn-icon danger" onclick="deleteTask('${t.id}')" title="Eliminar">${bin}</button>
      </div>`),
    ...expenses.map(e => `
      <div class="cal-event-item">
        <div class="cal-event-type expense"></div>
        <span class="cal-event-name">${escHtml(e.description)} <small style="color:var(--light)">${escHtml(e.category)}</small></span>
        <span class="cal-event-amount">${clp(e.amount)}</span>
        <button class="cal-gatita${e.category === 'Gatita' ? ' on' : ''}" onclick="calToggleGatita('${e.id}')" title="${e.category === 'Gatita' ? 'Quitar de Gatita' : 'Guardar este gasto en la categoría Gatita'}">🐱 Gatita</button>
        <button class="btn-icon" onclick="openExpenseModal('${e.id}')" title="Editar">${pen}</button>
        <button class="btn-icon danger" onclick="deleteExpense('${e.id}')" title="Eliminar">${bin}</button>
      </div>`),
  ].join('');
}

function gatitaFlash() {
  const old = document.getElementById('gatitaFlash');
  if (old) old.remove();
  const el = document.createElement('div');
  el.id = 'gatitaFlash';
  el.className = 'gatita-flash';
  const stars = Array.from({ length: 14 }, () =>
    `<i style="left:${Math.round(Math.random() * 100)}%;top:${Math.round(Math.random() * 100)}%;animation-delay:${(Math.random() * .5).toFixed(2)}s;font-size:${18 + Math.round(Math.random() * 26)}px">${['✨', '⭐', '💖', '✨'][Math.floor(Math.random() * 4)]}</i>`).join('');
  el.innerHTML = `<div class="gatita-flash-box">${stars}<span class="gatita-flash-text">macabeo culiao</span></div>`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1200);
}

function calToggleGatita(id) {
  gatitaFlash();
  const list = getExpenses();
  const e = list.find(x => x.id === id);
  if (!e) return;
  if (e.category === 'Gatita') {
    e.category = e.prevCategory || 'Otros Personal';
    e.type = e.prevType || e.type;
    delete e.prevCategory; delete e.prevType;
  } else {
    e.prevCategory = e.category; e.prevType = e.type;
    e.category = 'Gatita'; e.type = 'personal';
  }
  saveExpenses(list);
  renderExpenses(); renderDashboard();
  if (state.currentPage === 'graficos') renderCharts();
  calRefresh();
}

function celebrate(ev) {
  const x = ev && ev.clientX ? ev.clientX : window.innerWidth / 2;
  const y = ev && ev.clientY ? ev.clientY : window.innerHeight / 2;
  const box = document.createElement('div');
  box.className = 'celebrate';
  const bits = ['🎉', '✨', '✅', '⭐', '💚', '🎊'];
  box.innerHTML = Array.from({ length: 14 }, (_, i) => {
    const ang = (Math.PI * 2 * i) / 14 + Math.random() * 0.4, dist = 60 + Math.random() * 70;
    return `<i style="--dx:${Math.round(Math.cos(ang) * dist)}px;--dy:${Math.round(Math.sin(ang) * dist - 30)}px;animation-delay:${(Math.random() * 0.08).toFixed(2)}s">${bits[i % bits.length]}</i>`;
  }).join('') + '<b>¡Listo!</b>';
  box.style.left = x + 'px'; box.style.top = y + 'px';
  document.body.appendChild(box);
  setTimeout(() => box.remove(), 1100);
}

function calToggleTask(id, ev) {
  const tasks = getTasks();
  const t = tasks.find(x => x.id === id);
  if (!t) return;
  t.status = t.status === 'done' ? 'pending' : 'done';
  if (t.status === 'done') celebrate(ev);
  saveTasks(tasks);
  renderKanban(); renderDashboard(); calRefresh();
  calClosePop();
}

// ── Calendario: ventanitas (agregar rápido / detalle de tarea) ──

function calClosePop() {
  const p = document.getElementById('calPop');
  if (p) p.remove();
}

function calPlacePop(pop, anchor) {
  document.body.appendChild(pop);
  const r = anchor ? anchor.getBoundingClientRect() : { left: 80, top: 120, right: 80, bottom: 120, width: 0 };
  const w = pop.offsetWidth, h = pop.offsetHeight;
  let left = r.right + 8;
  if (left + w > window.innerWidth - 12) left = r.left - w - 8;
  if (left < 12) left = Math.max(12, Math.min(window.innerWidth - w - 12, r.left));
  let top = Math.max(12, Math.min(window.innerHeight - h - 12, r.top - 8));
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function calDayClick(dateStr) {
  calClosePop();
  selectCalDay(dateStr);
  const panel = document.getElementById('calEvents');
  if (panel) {
    const r = panel.getBoundingClientRect();
    if (r.top > window.innerHeight * 0.55) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function calQuickAdd(dateStr) {
  calClosePop();
  selectCalDay(dateStr);
  const cell = document.querySelector(`.gcal-day[data-date="${dateStr}"]`);
  const pop = document.createElement('div');
  pop.id = 'calPop';
  pop.className = 'cal-pop';
  pop.innerHTML = `
    <button class="cal-pop-x" onclick="calClosePop()" aria-label="Cerrar">×</button>
    <div class="cal-pop-date">${escHtml(formatDate(dateStr))}</div>
    <input class="cal-pop-title" id="calPopTitle" placeholder="Agregar título" autocomplete="off">
    <div class="cal-pop-row">
      <input type="time" id="calPopTime" class="cal-pop-in">
      <select id="calPopCat" class="cal-pop-in"><option value="empresa">Empresa</option><option value="personal">Personal</option></select>
    </div>
    <div class="cal-pop-actions">
      <button class="btn btn-outline btn-sm" id="calPopMore">Más opciones</button>
      <button class="btn btn-primary btn-sm" id="calPopSave">Guardar</button>
    </div>`;
  calPlacePop(pop, cell);
  const title = document.getElementById('calPopTitle');
  title.focus();
  const save = () => {
    const v = title.value.trim();
    if (!v) { title.focus(); return; }
    const tasks = getTasks();
    tasks.push({
      id: uid(), title: v, description: '', priority: 'medium',
      category: document.getElementById('calPopCat').value,
      dueDate: dateStr, dueTime: document.getElementById('calPopTime').value || '',
      status: 'pending', createdAt: new Date().toISOString(), reminderEnabled: false, reminders: [],
    });
    saveTasks(tasks);
    calClosePop();
    renderKanban(); renderDashboard(); calRefresh();
  };
  document.getElementById('calPopSave').onclick = save;
  title.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') calClosePop(); });
  document.getElementById('calPopMore').onclick = () => {
    const v = title.value.trim(), tm = document.getElementById('calPopTime').value;
    calClosePop();
    openTaskModal('', dateStr, v, tm);
  };
}

function calTaskPop(id, anchor) {
  calClosePop();
  const t = getTasks().find(x => x.id === id);
  if (!t) return;
  const pop = document.createElement('div');
  pop.id = 'calPop';
  pop.className = 'cal-pop';
  const done = t.status === 'done';
  pop.innerHTML = `
    <div class="cal-pop-tools">
      <button class="btn-icon" title="Editar" onclick="calClosePop();openTaskModal('${t.id}')">✏️</button>
      <button class="btn-icon danger" title="Eliminar" onclick="calClosePop();deleteTask('${t.id}')">🗑️</button>
      <button class="btn-icon" title="Cerrar" onclick="calClosePop()">✕</button>
    </div>
    <div class="cal-pop-h"><i class="${t.category === 'personal' ? 'personal' : ''}"></i><div><div class="cal-pop-name${done ? ' done' : ''}">${escHtml(t.title)}</div>
      <div class="cal-pop-meta">${escHtml(formatDate(t.dueDate))}${t.dueTime ? ' · ' + escHtml(t.dueTime) : ''}</div></div></div>
    <div class="cal-pop-meta">${t.category === 'empresa' ? 'Empresa' : 'Personal'} · Prioridad ${t.priority === 'high' ? 'alta' : t.priority === 'low' ? 'baja' : 'media'}${t.reminderEnabled ? ' · 🔔 ' + (t.reminders || []).length + ' recordatorio(s)' : ''}</div>
    ${t.description ? `<div class="cal-pop-desc">${escHtml(t.description)}</div>` : ''}
    <div class="cal-pop-actions"><button class="btn ${done ? 'btn-outline' : 'btn-primary'} btn-sm" onclick="calToggleTask('${t.id}', event)">${done ? '↩ Marcar pendiente' : '✓ Marcar completada'}</button></div>`;
  calPlacePop(pop, anchor);
}

function calGoogleEvPop(dateStr, id, anchor) {
  calClosePop();
  const g = (window.GCAL ? window.GCAL.forDate(dateStr) : []).find(x => x.id === id);
  if (!g) return;
  const pop = document.createElement('div');
  pop.id = 'calPop';
  pop.className = 'cal-pop';
  pop.innerHTML = `
    <div class="cal-pop-tools"><button class="btn-icon" title="Cerrar" onclick="calClosePop()">✕</button></div>
    <div class="cal-pop-h"><i class="google"></i><div><div class="cal-pop-name">${escHtml(g.title)}</div>
      <div class="cal-pop-meta">${escHtml(formatDate(g.date))}${g.allDay ? ' · todo el día' : ' · ' + escHtml(g.time) + (g.endTime ? '–' + escHtml(g.endTime) : '')}</div></div></div>
    ${g.location ? `<div class="cal-pop-meta">📍 ${escHtml(g.location)}</div>` : ''}
    <div class="cal-pop-meta" style="color:#0f766e">Evento de Google Calendar (solo lectura). Para cambiarlo, edítalo en Google.</div>`;
  calPlacePop(pop, anchor);
}

function calMore(dateStr) {
  calClosePop();
  selectCalDay(dateStr);
  const el = document.getElementById('calEvents');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function calBellInit() {
  const b = document.getElementById('calBell');
  if (!b) return;
  const P = window.gestipymePush;
  if (!P || !P.supported) { b.style.display = 'none'; return; }
  const paint = async () => {
    const on = (await P.getStatus()) === 'subscribed';
    b.classList.toggle('on', on);
    b.textContent = on ? '🔔 Avisos activos (1 h antes)' : '🔔 Activar avisos al teléfono';
  };
  b.addEventListener('click', async () => {
    if ((await P.getStatus()) === 'subscribed') { if (await appConfirm('¿Desactivar los avisos en este dispositivo?')) { await P.unsubscribe(); } }
    else { try { await P.subscribe(); } catch (err) { await appConfirm(err.message); } }
    paint();
  });
  paint();
}

document.addEventListener('mousedown', (e) => {
  const p = document.getElementById('calPop');
  if (p && !p.contains(e.target) && !e.target.closest('.gcal-day')) calClosePop();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') calClosePop(); });

// ── Charts ───────────────────────────────────────────

function destroyChart(key) {
  if (state.charts[key]) { state.charts[key].destroy(); delete state.charts[key]; }
}

function getLast(n) {
  const result = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

function renderCharts() {
  const expenses = getExpenses();
  if (!expenses.length) {
    document.getElementById('chartsEmpty').style.display = 'flex';
    document.querySelector('.charts-grid').style.display = 'none';
    return;
  }
  document.getElementById('chartsEmpty').style.display = 'none';
  document.querySelector('.charts-grid').style.display = 'grid';

  const months = getLast(state.chartPeriod);

  // Monthly line chart
  destroyChart('monthly');
  const monthlyEmpresa  = months.map(m => expenses.filter(e => e.type === 'empresa'  && e.date.startsWith(m)).reduce((a,e) => a+e.amount,0));
  const monthlyPersonal = months.map(m => expenses.filter(e => e.type === 'personal' && e.date.startsWith(m)).reduce((a,e) => a+e.amount,0));

  state.charts.monthly = new Chart(document.getElementById('chartMonthly'), {
    type: 'line',
    data: {
      labels: months.map(m => monthLabel(m + '-01')),
      datasets: [
        {
          label: 'Empresa',
          data: monthlyEmpresa,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,.08)',
          fill: true,
          tension: .35,
          pointBackgroundColor: '#2563eb',
          pointRadius: 4,
        },
        {
          label: 'Personal',
          data: monthlyPersonal,
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,.06)',
          fill: true,
          tension: .35,
          pointBackgroundColor: '#7c3aed',
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => privacyMode ? '$***.***' : '$' + v.toLocaleString('es-CL') },
        },
      },
    },
  });

  // Category pie
  destroyChart('category');
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
  // Gatita siempre se muestra, aunque no esté entre las 8 más grandes
  const catKeys  = sortedCats.slice(0, 8);
  if (catTotals['Gatita'] && !catKeys.includes('Gatita')) { catKeys.pop(); catKeys.push('Gatita'); }
  const catVals  = catKeys.map(k => catTotals[k]);
  const palette0 = ['#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d'];
  const palette  = catKeys.map((k, i) => k === 'Gatita' ? '#ec4899' : palette0[i % palette0.length]);

  state.charts.category = new Chart(document.getElementById('chartCategory'), {
    type: 'doughnut',
    data: {
      labels: catKeys,
      datasets: [{ data: catVals, backgroundColor: palette, borderWidth: 2, borderColor: '#fff' }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right', labels: { font: { size: 11 } } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${clp(ctx.raw)}` } },
      },
    },
  });

  // Comparison bar
  destroyChart('comparison');
  state.charts.comparison = new Chart(document.getElementById('chartComparison'), {
    type: 'bar',
    data: {
      labels: months.map(m => monthLabel(m + '-01')),
      datasets: [
        { label: 'Empresa',  data: monthlyEmpresa,  backgroundColor: 'rgba(37,99,235,.75)',  borderRadius: 4 },
        { label: 'Personal', data: monthlyPersonal, backgroundColor: 'rgba(124,58,237,.65)', borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => privacyMode ? '$***.***' : '$' + v.toLocaleString('es-CL') },
        },
      },
    },
  });

  // Commissions chart — 5% of pipeline lead prices per month
  destroyChart('commissions');
  const leads = getPipeline();
  const monthlyComm = months.map(m => {
    const sum = leads
      .filter(l => l.price && l.date && l.date.startsWith(m))
      .reduce((a, l) => a + (Number(l.price) || 0), 0);
    return Math.round(sum * 0.05);
  });
  const totalComm = monthlyComm.reduce((a, v) => a + v, 0);
  const commTotalEl = document.getElementById('chartCommTotal');
  if (commTotalEl) commTotalEl.textContent = totalComm > 0 ? 'Total: ' + clp(totalComm) : '';
  state.charts.commissions = new Chart(document.getElementById('chartCommissions'), {
    type: 'bar',
    data: {
      labels: months.map(m => monthLabel(m + '-01')),
      datasets: [{
        label: 'Comisión 5%',
        data: monthlyComm,
        backgroundColor: 'rgba(22,163,74,.75)',
        borderColor: '#16a34a',
        borderWidth: 1,
        borderRadius: 5,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { callback: v => privacyMode ? '$***.***' : '$' + v.toLocaleString('es-CL') },
        },
      },
    },
  });
}

// ── Modals ───────────────────────────────────────────

function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById('backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function appConfirm(message) {
  return new Promise((resolve) => {
    document.getElementById('confirmModalMessage').textContent = message;
    openModal('confirmModal');
    const okBtn     = document.getElementById('confirmModalOk');
    const cancelBtn = document.getElementById('confirmModalCancel');
    const cleanup = (result) => {
      closeModal('confirmModal');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk     = () => cleanup(true);
    const onCancel = () => cleanup(false);
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

// ── Pipeline CRM ─────────────────────────────────────

const PL_STAGES = ['lead','derivado','cotizado','minimo','oficial','facturado','recompra'];

let plFilter     = 'all';
let plMonthFrom  = ''; // 'YYYY-MM'
let plMonthTo    = '';

function seedCotizacionesOficiales() {
  let existing = getPipeline();
  const refs = new Set(existing.map(l => l.cotizRef).filter(Boolean));
  const oficiales = [
    {cotizRef:'17023',name:'Nicolas Yanine',company:'Molino Yanine',biz:'polimer',phone:'',email:'',product:'Fundas PE Transp. 240x140x40mic',qty:'1.750 un · $675 c/u',price:1181250,stage:'oficial',notes:'Cotización oficial N°17023',date:'2026-02-17'},
    {cotizRef:'17037',name:'Agrofresh',company:'Agrofresh',biz:'polimer',phone:'',email:'',product:'Bolsas PEBD + Basura negras 4 medidas',qty:'5.200 un total',price:3445000,stage:'oficial',notes:'Cotización oficial N°17037. PEBD 300x275x90 400un; Basura 224x150x80 1000un; 110x120x80 1000un; 70x90x60 2800un',date:'2026-03-12'},
    {cotizRef:'17040',name:'SUMINEX',company:'SUMINEX',biz:'polimer',phone:'',email:'',product:'PEBD colores + Basura + Doble sello fondo 11 medidas',qty:'79.900 un total',price:22543560,stage:'oficial',notes:'Cotización oficial N°17040. Bolsas colores 110x120x200mic y múltiples medidas doble sello fondo.',date:'2026-03-18'},
    {cotizRef:'17041',name:'Embotelladora Andina',company:'Embotelladora Andina (Coca-Cola)',biz:'polimer',phone:'',email:'',product:'Bolsas BINS PEBD Transparente 255x215x45mic',qty:'650 un · $1.244 c/u',price:808600,stage:'oficial',notes:'Cotización oficial N°17041. Pago 30 días fecha factura.',date:'2026-03-18'},
    {cotizRef:'17042',name:'KREEMS',company:'KREEMS',biz:'polimer',phone:'',email:'',product:'Bolsas basura 3 medidas + Prepicadas',qty:'46.500 un + 2.400 kg prepicadas',price:6550005,stage:'oficial',notes:'Cotización oficial N°17042. Basura 90x120x80 20.000un; 70x90x30 8.500un; 50x70x30 18.000un. Prepicadas 300kg/medida.',date:'2026-03-19'},
    {cotizRef:'17043',name:'SUMINEX',company:'SUMINEX',biz:'polimer',phone:'',email:'',product:'Bolsas basura + PEBD colores 110x120x200mic',qty:'30.000 un total',price:28800000,stage:'oficial',notes:'Cotización oficial N°17043. Segunda cotización SUMINEX con variantes 5k/10k.',date:'2026-03-20'},
    {cotizRef:'17044',name:'KERSTING',company:'KERSTING',biz:'polimer',phone:'',email:'',product:'Bolsas PP Transp. Impresas 1 cara "LEXO" 10.4x22.5x80mic',qty:'135.000 un · $29,90 c/u',price:4036500,stage:'oficial',notes:'Cotización oficial N°17044. Pago 30 días factura. Entrega 30-35 días hábiles.',date:'2026-03-20'},
    {cotizRef:'17046',name:'AXPA',company:'AXPA',biz:'polimer',phone:'',email:'',product:'Bolsas PEBD TTE 60x90x60mic',qty:'15.000 un · $120,60 c/u',price:1809000,stage:'oficial',notes:'Cotización oficial N°17046.',date:'2026-03-27'},
    {cotizRef:'17047',name:'SUMINEX',company:'SUMINEX',biz:'polimer',phone:'',email:'',product:'PEBD colores + Negras dos sellos y fondo, 10 items',qty:'80.000 un total',price:46765600,stage:'oficial',notes:'Cotización oficial N°17047. Tercera cotización SUMINEX, precios actualizados.',date:'2026-03-27'},
    {cotizRef:'17049',name:'SCHUFFENER LTDA',company:'Schuffener Ltda',biz:'polimer',phone:'',email:'',product:'Fundas PEBD pigmentada negra 140x140x220',qty:'500 un x 90mic + 500 un x 100mic',price:4410000,stage:'oficial',notes:'Cotización oficial N°17049. Archivo: C. Pastenes.',date:'2026-04-06'},
    {cotizRef:'17053',name:'SHEC',company:'SHEC',biz:'polimer',phone:'',email:'',product:'Bolsa BINS Transparente 250x260x50mic',qty:'400 un · $2.036 c/u',price:814400,stage:'oficial',notes:'Cotización oficial N°17053.',date:'2026-04-16'},
    {cotizRef:'17054',name:'Cecinas Española',company:'Cecinas Española',biz:'polimer',phone:'',email:'',product:'Bolsa BD naranja imp. BAXTER 350x500x100mic + Clisés',qty:'10.000 un · $123,90 c/u + clisés $96.000',price:1335000,stage:'oficial',notes:'Cotización oficial N°17054. Incluye clisés para impresión.',date:'2026-04-16'},
    {cotizRef:'17058',name:'WSS',company:'WSS',biz:'polimer',phone:'',email:'',product:'Bolsa BD Transp. Doble Sello Fondo 40x60x200mic',qty:'13.000 un · $285 c/u',price:3705000,stage:'oficial',notes:'Cotización oficial N°17058. Pago cheque 30 días.',date:'2026-04-30'},
    {cotizRef:'17059',name:'ALLDISPLAY',company:'Alldisplay',biz:'polimer',phone:'',email:'',product:'Bolsas hielo imp. manilla 1kg (20x40x70) + 2kg (28x50x80) con clisés',qty:'45k-65k un c/medida · desde $36,90 c/u + $165.000 clisés',price:1825500,stage:'oficial',notes:'Cotización oficial N°17059. 3 rangos de precio por volumen para 2 medidas + clisés.',date:'2026-05-04'},
    {cotizRef:'17060',name:'WSS',company:'WSS',biz:'polimer',phone:'',email:'',product:'Bolsa BD Doble Sello 40x60x200mic + BD Transp. 25x35x60mic',qty:'13.000 + 25.000 un',price:4542500,stage:'oficial',notes:'Cotización oficial N°17060. Segunda cotización WSS. Pago cheque 30 días.',date:'2026-05-05'},
    {cotizRef:'17061',name:'San Francisco',company:'San Francisco',biz:'polimer',phone:'',email:'',product:'Bolsa BD Transparente BINS 240x240x50mic',qty:'600 un · $1.820 c/u',price:1092000,stage:'oficial',notes:'Cotización oficial N°17061.',date:'2026-05-05'},
    {cotizRef:'17062',name:'Alimentos Porvenir',company:'Alimentos Porvenir',biz:'polimer',phone:'',email:'',product:'Bolsa BD Transparente Cubre BINS 260x180x80mic',qty:'600 un · $2.176 c/u',price:1305600,stage:'oficial',notes:'Cotización oficial N°17062.',date:'2026-05-06'},
    {cotizRef:'17063',name:'Aseo Swan',company:'Aseo Swan',biz:'polimer',phone:'',email:'',product:'Bolsas Basura Negras 4 medidas: 110x120 + 50x70 + 70x90 + 140x160',qty:'2.000+10.752+6.000+1.200 un',price:2657192,stage:'oficial',notes:'Cotización oficial N°17063. Sin fecha en documento.',date:'2026-05-07'},
    {cotizRef:'17068',name:'Frigosur',company:'Frigosur',biz:'polimer',phone:'',email:'ivanfrigosur1@gmail.com',product:'Bolsas BD Virgen Transparente 60x90x80mic',qty:'6.300 un · $244 c/u · Total $1.829.268 c/IVA',price:1537200,stage:'oficial',notes:'Cotización oficial N°17068.',date:'2026-05-11'},
    {cotizRef:'17069',name:'Daily Fresh',company:'Daily Fresh',biz:'polimer',phone:'',email:'pparedes@dailyfresh.cl',product:'Bolsas BD Transparente 90x110x40mic',qty:'4.000 un · $182 c/u · Total $866.320 c/IVA',price:728000,stage:'oficial',notes:'Cotización oficial N°17069. Pago 30 días fecha factura.',date:'2026-05-12'},
    {cotizRef:'17070',name:'Rey Ramos',company:'Rey Ramos',biz:'polimer',phone:'',email:'',product:'Bolsa PEBD Transp. Impresa 1c/1col. 60x60x60mic + Clichés',qty:'8.700 un · $158,20 c/u + clichés $95.000 · Total $1.750.895 c/IVA',price:1471340,stage:'oficial',notes:'Cotización oficial N°17070.',date:'2026-05-13'},
    {cotizRef:'17071',name:'Kim / La Tribu',company:'Tribu SPA',biz:'polimer',phone:'',email:'',product:'Bolsa Hielo PEBD imp. 1c/1col — 22x35x80 + 34x35x80mic + Clichés',qty:'300kg c/medida · $3.900/kg · Total $2.933.350 c/IVA',price:2465000,stage:'oficial',notes:'Cotización oficial N°17071. Descuento al comprar ambas medidas. Precio separado: $4.400/kg.',date:'2026-05-13'},
    {cotizRef:'17073',name:'VOLTAGE',company:'Voltage',biz:'polimer',phone:'',email:'',product:'Bolsa PEBD Transp. Impresa 40x50x100 + Vacío PE/PA 40x60 + 50x70x100mic',qty:'200.000 + 30.000 + 30.000 un · Total $54.487.720 c/IVA',price:45788000,stage:'oficial',notes:'Cotización oficial N°17073. Impresa 3col anverso + 2col reverso + pestaña 20cm. Clichés pendientes.',date:'2026-05-14'},
    {cotizRef:'17075',name:'Huelpack SPA',company:'Huelpack SPA',biz:'polimer',phone:'',email:'',product:'Bolsa BINS 250x230x60mic',qty:'180 un · $2.585 c/u · Total $553.707 c/IVA',price:465300,stage:'oficial',notes:'Cotización oficial N°17075. Pago contado. Entrega según stock.',date:'2026-05-14'},
    {cotizRef:'17076',name:'VOLTAGE',company:'Voltage',biz:'polimer',phone:'',email:'',product:'Bolsas BD Transp. pestaña imp. 3col/2col 40x40+20x100mic + Clichés',qty:'200.000 un · $160,50 c/u + clichés $388.602 · Total $38.661.436 c/IVA',price:32488600,stage:'oficial',notes:'Cotización oficial N°17076. Segunda cotización Voltage. Aditivo frío.',date:'2026-05-20'},
    {cotizRef:'17077',name:'SP GROUP',company:'SP GROUP',biz:'polimer',phone:'',email:'',product:'Bolsa de Basura PEBD 90x110x80mic',qty:'1.500 un · $314 c/u · Total $560.490 c/IVA',price:471000,stage:'oficial',notes:'Cotización oficial N°17077. Fabián Placencia estaba esperando esta cotización.',date:'2026-05-25'},
  ];
  // Migration: add prices to existing oficial leads that lack them
  const priceMap = {};
  oficiales.forEach(c => { if (c.price) priceMap[c.cotizRef] = c.price; });
  let priceMigrated = false;
  existing = existing.map(l => {
    if (l.cotizRef && !l.price && priceMap[l.cotizRef]) {
      priceMigrated = true;
      return { ...l, price: priceMap[l.cotizRef] };
    }
    return l;
  });
  if (priceMigrated) savePipeline(existing);
  const nuevos = oficiales
    .filter(c => !refs.has(c.cotizRef))
    .map(c => ({ ...c, id: uid() }));
  if (nuevos.length) savePipeline([...getPipeline(), ...nuevos]);
}

const PL_DEFAULT_TITLES = {
  lead: 'Lead Contactado', derivado: 'Derivado Homs', cotizado: 'Cotizado',
  minimo: 'Pedido ≥300kg', oficial: 'Compra Oficial', facturado: 'Facturado', recompra: 'Recompra'
};

function getPLTitles() { return load('gestipyme_pl_titles') || {}; }
function savePLTitles(t) { save('gestipyme_pl_titles', t); }

// ── Column colors ──────────────────────────────────────────────
const PL_COL_PRESETS = [
  { label:'Azul',       bg:'linear-gradient(135deg,#1e3a5f,#2563eb)', text:'#fff' },
  { label:'Índigo',     bg:'linear-gradient(135deg,#312e81,#6366f1)', text:'#fff' },
  { label:'Violeta',    bg:'linear-gradient(135deg,#4c1d95,#8b5cf6)', text:'#fff' },
  { label:'Fucsia',     bg:'linear-gradient(135deg,#831843,#ec4899)', text:'#fff' },
  { label:'Rojo',       bg:'linear-gradient(135deg,#7f1d1d,#ef4444)', text:'#fff' },
  { label:'Naranja',    bg:'linear-gradient(135deg,#7c2d12,#f97316)', text:'#fff' },
  { label:'Ámbar',      bg:'linear-gradient(135deg,#78350f,#f59e0b)', text:'#fff' },
  { label:'Lima',       bg:'linear-gradient(135deg,#365314,#84cc16)', text:'#fff' },
  { label:'Verde',      bg:'linear-gradient(135deg,#14532d,#22c55e)', text:'#fff' },
  { label:'Teal',       bg:'linear-gradient(135deg,#134e4a,#14b8a6)', text:'#fff' },
  { label:'Cyan',       bg:'linear-gradient(135deg,#164e63,#06b6d4)', text:'#fff' },
  { label:'Pizarra',    bg:'linear-gradient(135deg,#1e293b,#475569)', text:'#fff' },
  { label:'Gris',       bg:'linear-gradient(135deg,#374151,#9ca3af)', text:'#fff' },
  { label:'Blanco',     bg:'#f8fafc', text:'#1e293b' },
];

function getPLColors() { return load('gestipyme_pl_colors') || {}; }
function savePLColors(c) { save('gestipyme_pl_colors', c); }

// ── Dynamic stages ──────────────────────────────────────────────
function getActiveStages() {
  const saved = load('gestipyme_pl_stages');
  let stages = (saved && Array.isArray(saved) && saved.length)
    ? saved
    : PL_STAGES.map(id => ({ id, title: PL_DEFAULT_TITLES[id] }));
  // Apply drag order if saved
  const order = load('gestipyme_pl_order');
  if (order && Array.isArray(order) && order.length === stages.length) {
    const map = Object.fromEntries(stages.map(s => [s.id, s]));
    const reordered = order.map(id => map[id]).filter(Boolean);
    if (reordered.length === stages.length) stages = reordered;
  }
  return stages;
}
function saveActiveStages(s) { save('gestipyme_pl_stages', s); }

function renderPipelineBoard() {
  const board = document.getElementById('pipelineBoard');
  if (!board) return;
  const stages = getActiveStages();
  const PAINT = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>`;
  board.innerHTML = stages.map(s => `
    <div class="pipeline-col${s.id==='oficial'?' pipeline-col--oficial':''}" data-stage="${escHtml(s.id)}">
      <div class="pipeline-col-header" draggable="true">
        <span class="pipeline-col-title" id="plTitle-${escHtml(s.id)}" contenteditable="true" spellcheck="false">${escHtml(s.title)}</span>
        <button class="col-color-btn" data-colstage="${escHtml(s.id)}" title="Color">${PAINT}</button>
        <span class="pipeline-col-badge" id="plCount-${escHtml(s.id)}">0</span>
        <button class="col-del-btn" data-colstage="${escHtml(s.id)}" title="Eliminar columna">×</button>
      </div>
      <div class="pipeline-col-total" id="plTotal-${escHtml(s.id)}" style="display:none"></div>
      <div class="pipeline-col-body" id="plCol-${escHtml(s.id)}"></div>
    </div>
  `).join('');

  // Wire contenteditable titles
  stages.forEach(s => {
    const el = document.getElementById(`plTitle-${s.id}`);
    if (!el) return;
    el.addEventListener('blur', () => {
      const text = el.textContent.trim();
      if (!text) { el.textContent = s.title; return; }
      const st = getActiveStages();
      const idx = st.findIndex(x => x.id === s.id);
      if (idx !== -1) { st[idx].title = text; saveActiveStages(st); }
    });
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });

  // Color/delete buttons — use click (not mousedown) to avoid timing conflicts.
  // Remove first to avoid duplicate listeners when board is re-rendered.
  board.removeEventListener('click', boardClickHandler);
  board.addEventListener('click', boardClickHandler);

  // Add-col button lives OUTSIDE innerHTML — appended after column order is restored
  // (see end of this function, after initColDrag)

  // Apply saved colors
  applyColColors();

  // Init drag (may reorder columns via board.appendChild)
  initColDrag();

  // Add-col button must go last — AFTER initColDrag potentially moves columns around
  const addBtn = document.createElement('button');
  addBtn.className = 'pipeline-add-col';
  addBtn.id = 'pipelineAddCol';
  addBtn.textContent = '＋ Nueva columna';
  addBtn.addEventListener('click', addPipelineCol);
  board.appendChild(addBtn);
}

function boardClickHandler(e) {
  const colorBtn = e.target.closest('.col-color-btn');
  const delBtn   = e.target.closest('.col-del-btn');
  if (colorBtn) {
    e.stopPropagation();
    openColColorPicker(colorBtn.dataset.colstage, colorBtn);
  } else if (delBtn) {
    e.stopPropagation();
    deletePipelineCol(delBtn.dataset.colstage);
  }
}

function applyColColors() {
  const colors = getPLColors();
  const stages = getActiveStages();
  let css = '';
  stages.forEach(s => {
    const c = colors[s.id];
    if (!c) return;
    const dark = c.text === '#fff';
    const sel = `.pipeline-col[data-stage="${s.id}"]`;
    css += `
      ${sel} .pipeline-col-header{background:${c.bg}!important;color:${c.text}!important}
      ${sel} .pipeline-col-title,${sel} .col-color-btn,${sel} .col-del-btn{color:${c.text}!important}
      ${sel} .pipeline-col-badge{background:rgba(128,128,128,.35)!important;color:${c.text}!important}
      ${sel} .pipeline-col-total{color:${dark?'rgba(255,255,255,.95)':'#15803d'}!important;background:${dark?'rgba(0,0,0,.25)':'rgba(22,163,74,.12)'}!important}
    `;
  });
  let el = document.getElementById('pl-col-colors');
  if (!el) { el = document.createElement('style'); el.id = 'pl-col-colors'; document.head.appendChild(el); }
  el.textContent = css;
}

function openColColorPicker(stage, anchorEl) {
  document.querySelectorAll('.col-color-popup').forEach(p => p.remove());
  const colors = getPLColors();
  const popup = document.createElement('div');
  popup.className = 'col-color-popup';
  popup.innerHTML = `<div class="col-color-grid">
    ${PL_COL_PRESETS.map((p, i) => `<button class="col-color-swatch${colors[stage]?.bg===p.bg?' active':''}" data-idx="${i}" style="background:${p.bg}" title="${p.label}"></button>`).join('')}
    <button class="col-color-reset" title="Restablecer">↩</button>
  </div>`;
  document.body.appendChild(popup);
  const r = anchorEl.getBoundingClientRect();
  popup.style.top  = (r.bottom + 6) + 'px';
  popup.style.left = Math.max(4, r.left - 50) + 'px';

  // Swatch / reset: use click + stopPropagation so the close handler (on document) never fires for popup clicks
  popup.addEventListener('click', e => {
    e.stopPropagation();
    const sw = e.target.closest('.col-color-swatch');
    const rs = e.target.closest('.col-color-reset');
    if (sw) {
      const preset = PL_COL_PRESETS[Number(sw.dataset.idx)];
      const c = getPLColors(); c[stage] = preset; savePLColors(c);
      applyColColors(); popup.remove();
    } else if (rs) {
      const c = getPLColors(); delete c[stage]; savePLColors(c);
      applyColColors(); popup.remove();
    }
  });
  // Close when clicking anywhere outside the popup.
  // setTimeout ensures the click that opened the popup is already done before we register this.
  const close = ev => { popup.remove(); document.removeEventListener('click', close); };
  setTimeout(() => document.addEventListener('click', close), 0);
}

function addPipelineCol() {
  const stages = getActiveStages();
  const newId = 'col_' + Date.now();
  stages.push({ id: newId, title: 'Nueva Etapa' });
  saveActiveStages(stages);
  boardInited = false;
  renderPipeline();
}

async function deletePipelineCol(stageId) {
  const count = getPipeline().filter(l => l.stage === stageId).length;
  const msg = count > 0
    ? `Esta columna tiene ${count} lead(s). Al eliminarla los leads quedarán sin etapa. ¿Continuar?`
    : '¿Eliminar esta columna?';
  if (!(await appConfirm(msg))) return;
  const stages = getActiveStages().filter(s => s.id !== stageId);
  saveActiveStages(stages);
  boardInited = false;
  renderPipeline();
}

function initColDrag() {
  const board = document.getElementById('pipelineBoard');
  if (!board) return;
  let dragSrc = null;
  // dragstart fires from the header (draggable="true" on header only)
  board.addEventListener('dragstart', e => {
    const header = e.target.closest('.pipeline-col-header');
    if (!header) return;
    // Don't drag if user clicked a button or contenteditable
    if (e.target.closest('button, [contenteditable]')) { e.preventDefault(); return; }
    dragSrc = header.closest('.pipeline-col');
    if (!dragSrc) return;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => dragSrc.classList.add('col-dragging'), 0);
  });
  board.addEventListener('dragend', e => {
    if (dragSrc) dragSrc.classList.remove('col-dragging');
    board.querySelectorAll('.pipeline-col').forEach(c => c.classList.remove('col-drag-over'));
    const order = [...board.querySelectorAll('.pipeline-col')].map(c => c.dataset.stage);
    save('gestipyme_pl_order', order);
    // Also persist order into stages array
    const stagesMap = Object.fromEntries(getActiveStages().map(s => [s.id, s]));
    const reordered = order.map(id => stagesMap[id]).filter(Boolean);
    if (reordered.length) saveActiveStages(reordered);
    dragSrc = null;
    applyColColors();
    // Keep add-col button at the very end after DOM reorder
    const addBtn = document.getElementById('pipelineAddCol');
    if (addBtn) board.appendChild(addBtn);
  });
  board.addEventListener('dragover', e => {
    e.preventDefault();
    const col = e.target.closest('.pipeline-col');
    if (!col || col === dragSrc) return;
    board.querySelectorAll('.pipeline-col').forEach(c => c.classList.remove('col-drag-over'));
    col.classList.add('col-drag-over');
  });
  board.addEventListener('drop', e => {
    e.preventDefault();
    const col = e.target.closest('.pipeline-col');
    if (!col || col === dragSrc || !dragSrc) return;
    col.classList.remove('col-drag-over');
    const cols = [...board.querySelectorAll('.pipeline-col')];
    const srcIdx = cols.indexOf(dragSrc);
    const tgtIdx = cols.indexOf(col);
    if (srcIdx < tgtIdx) board.insertBefore(dragSrc, col.nextSibling);
    else board.insertBefore(dragSrc, col);
  });
  // restore saved order
  const savedOrder = load('gestipyme_pl_order');
  if (savedOrder && Array.isArray(savedOrder)) {
    savedOrder.forEach(stage => {
      const el = board.querySelector(`[data-stage="${stage}"]`);
      if (el) board.appendChild(el);
    });
  }
}

function seedPipelineLeads() {
  if (getPipeline().length > 0) return; // ya hay datos
  const now = '2026-06-06';
  const leads = [
    // ── RECOMPRA ──
    {id:uid(),name:'Natalia Mattisine',company:'Poseidón Seafood',biz:'polimer',phone:'56974787879',email:'mattisinenatalia4@gmail.com',product:'Bolsas 30x20+35x25 70/80mic',qty:'300kg',stage:'recompra',notes:'4 intentos, nunca recibió cotización. URGENTE.',date:now},
    {id:uid(),name:'Nini Álvarez / Manufacuras Bernardita',company:'Manufacturas Bernardita',biz:'polimer',phone:'56992092122',email:'Ninialvarezb@gmail.com',product:'No especificado',qty:'',stage:'recompra',notes:'Nunca le llegó la cotización, muy molesta.',date:now},
    {id:uid(),name:'Patricia Opazo / Plásticos Martel',company:'Plásticos Martel',biz:'polimer',phone:'56976487604',email:'patricia123opazo@gmail.com',product:'No especificado',qty:'',stage:'recompra',notes:'Muy frustrada, nunca recibió cotización.',date:now},
    {id:uid(),name:'Importadora Araya',company:'Importadora Araya',biz:'polimer',phone:'56939676050',email:'madi@importadoraaraya.cl',product:'No especificado',qty:'',stage:'recompra',notes:'No llegó cotización.',date:now},
    {id:uid(),name:'Fabián Placencia',company:'',biz:'polimer',phone:'56998104466',email:'',product:'No especificado',qty:'',stage:'recompra',notes:'Referencia cotización 17077, nunca recibida.',date:now},

    // ── COTIZADO ──
    {id:uid(),name:'Karin Hidalgo',company:'CRAM',biz:'polimer',phone:'56965876001',email:'karin.hidalgo@gmail.com',product:'Termosellable 18x20 40mic',qty:'1000un',stage:'cotizado',notes:'Consultó con/sin impresión.',date:now},
    {id:uid(),name:'Daniela Rojas / Kisushi',company:'Kisushi Spa',biz:'polimer',phone:'56928947083',email:'danielarojasllanten1@gmail.com',product:'Basura 90x120 40mic',qty:'300un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Luis Ortiz',company:'Comunidad Edificio Exequiel Fernández',biz:'polimer',phone:'56964129501',email:'lortizceballos63@gmail.com',product:'Basura 50x70+80x110+140x160 40mic',qty:'300kg c/u',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Javiera Morales',company:'SUR SPA',biz:'polimer',phone:'56944008966',email:'VENTAS1@COMFAST.CL',product:'Polietileno varias medidas',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Francisca Erazo',company:'',biz:'polimer',phone:'56951308518',email:'francisca.erazo.gonzalez@gmail.com',product:'Basura 50x70+70x90+80x110',qty:'300kg c/u',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Marie Alonzo',company:'Vitalcom Chl',biz:'polimer',phone:'56978504359',email:'ovandoandree@gmail.com',product:'Doypack 16x24 120mic',qty:'10000un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Jaime Valdebenito',company:'COMERCIAL IBL SPA',biz:'polimer',phone:'56949039104',email:'jvaldebenito@ibl.cl',product:'Prepicado 20x30 8mic',qty:'300kg',stage:'cotizado',notes:'Username: eljaime32',date:now},
    {id:uid(),name:'Pedro Paredes',company:'MACER SA',biz:'polimer',phone:'56999698983',email:'macer@macer.cl',product:'Bolsa 650x900 200mic',qty:'200/300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'JP Condominio Parque Vivo 2',company:'Condominio Parque Vivo 2',biz:'polimer',phone:'56987436104',email:'mayordomoparquevivo2@gmail.com',product:'Basura 140x160 120mic + 110x180 100mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Fabiola Herrera',company:'',biz:'polimer',phone:'56990893836',email:'fabyola.herrera.parra70@gmail.com',product:'Doypack 15x20',qty:'2000un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Juan Martínez',company:'Botillería Villa Yungay',biz:'polimer',phone:'56938940769',email:'emilianothomas93@gmail.com',product:'Envase especial 10x20 80mic 1 cara',qty:'700un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Maria Araujo',company:'',biz:'polimer',phone:'56964778312',email:'mariaaraujomarcelo@gmail.com',product:'Biopropileno 15x24 30mic',qty:'10000un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Francisco',company:'BetterBites',biz:'polimer',phone:'56976258592',email:'francisco@betterbites.cl',product:'Rollo PE 50cm 20mic',qty:'5 rollos',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Gian',company:'Viveros',biz:'polimer',phone:'56954166708',email:'gianvenencianot@gmail.com',product:'Viveros 60x70 40mic',qty:'400un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Carolina Pinto',company:'Protein-Goo',biz:'polimer',phone:'56952457288',email:'carolinaexperta@gmail.com',product:'Pouch 7x25 + 15x30 impresión 3 colores',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Ramón Mallea',company:'Comercial Mallea',biz:'polimer',phone:'56996744261',email:'inzunza.demarchi34@gmail.com',product:'Vacío 15x30 + 15x20',qty:'3600+6000un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Hector Saji',company:'',biz:'polimer',phone:'56978876815',email:'hectorsaji@mail.com',product:'Basura 70x110 40mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Alejandra Pan',company:'Bazar Celeste Batuco',biz:'polimer',phone:'56977791178',email:'bazarcelestebatuco@gmail.com',product:'Aseo 120x140+100x120 45mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Matías Sandoval',company:'Matt Plast',biz:'polimer',phone:'56971635204',email:'Matiashernan.s94@gmail.com',product:'Prepicado varias medidas',qty:'330kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Claudio López',company:'Dixo',biz:'polimer',phone:'56945714313',email:'claudio.lopez.cordova@gmail.com',product:'Pizza 33x33 300kg impresión 1 cara',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Patricio Nievas',company:'Urioste y Razeto',biz:'polimer',phone:'56998441889',email:'pnievas46@gmail.com',product:'LDPE 49x40 20mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Alejandro Muñoz',company:'Inversiones Bantu',biz:'polimer',phone:'56939448538',email:'calidad.bantu@gmail.com',product:'Prepicado 40x30+40x60 20mic',qty:'10kg c/u',stage:'cotizado',notes:'Control de calidad.',date:now},
    {id:uid(),name:'Caco Guzmán',company:'',biz:'polimer',phone:'56956845680',email:'Cacoguzman17@gmail.com',product:'Hielo 20x35 manilla 1 color 1 cara',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Sebastian Umaña',company:'Grez y Ulloa',biz:'polimer',phone:'56921711657',email:'sebastian.umana@grezyulloa.cl',product:'Policarbonato 2.4x1.2m 4mm',qty:'2un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'José Velasquez',company:'Plásticos Isaias',biz:'polimer',phone:'56929675013',email:'Joluvesa90@gmail.com',product:'Camiseta 40x50 30mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Ramón Molina',company:'Lavado a Tiempo SPA',biz:'polimer',phone:'56989498183',email:'lavadoatiempospa@gmail.com',product:'PEBD 30x40+35x50 90mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Rodrigo Ahumada',company:'',biz:'polimer',phone:'56964265383',email:'roo77ahumada@gmail.com',product:'Basura 140x160 80mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Jose Gil',company:'Bacara SA',biz:'polimer',phone:'56986205544',email:'ia@passer.cl',product:'Rollo 40x60 25mic',qty:'1000un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Patricio Pérez',company:'Isla Mágica',biz:'polimer',phone:'56965592839',email:'patandresperez@gmail.com',product:'PA/PE 24x18 120mic',qty:'250000un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Adriana Valbuena',company:'Vcommerce',biz:'polimer',phone:'56947398537',email:'Avalbuena@vcommerce.cl',product:'Prepicado 3 medidas',qty:'10 rollos c/u',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Roxana Cortés',company:'DISTRIMAR',biz:'polimer',phone:'56999943500',email:'adquisicionesdistrimar@gmail.com',product:'Funda bins 240x220 40mic',qty:'100un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Gerardo Pérez',company:'Inversiones La Reina',biz:'polimer',phone:'56996792648',email:'gpnautico@gmail.com',product:'OPP/BOPP 35x11x11 35mic',qty:'3000un',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Maribel Villar',company:'Alfa Chile SPA',biz:'polimer',phone:'56967778150',email:'alfachilespa@gmail.com',product:'Cubre pallet 250x180 30mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Víctor Contreras',company:'Packline',biz:'polimer',phone:'56978690645',email:'packline.cl@gmail.com',product:'Camiseta 40x50 + Pullpack 35x50 20mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Pedro Antonio',company:'Daily Fresh',biz:'polimer',phone:'56984093035',email:'pparedes@dailyfresh.cl',product:'Transparente 90x110 40mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Valentina Alcayaga',company:'ARALMAQ SPA',biz:'polimer',phone:'56930599638',email:'valentina.alcayaga@aralmaq.com',product:'Basura 140x160 80mic',qty:'300kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Ivan',company:'Frigosur',biz:'polimer',phone:'56963883439',email:'ivanfrigosur1@gmail.com',product:'Bolsa 60x90 80mic',qty:'500kg',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Isabel Guajardo',company:'Retail Saffie SPA',biz:'polimer',phone:'56986355187',email:'retailsaffiespa@gmail.com',product:'Basura 3 medidas',qty:'300kg c/u',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Maribel Navarro',company:'',biz:'polimer',phone:'56987102703',email:'maribelnavarrov.mn@gmail.com',product:'Doypack aluminizado 5x10 100mic',qty:'326087un',stage:'cotizado',notes:'Pedido grande.',date:now},
    {id:uid(),name:'Swan Chile (operaciones)',company:'Swan Chile',biz:'polimer',phone:'56994357194',email:'operaciones@aseoswan.cl',product:'Basura 4 medidas',qty:'350kg c/u',stage:'cotizado',notes:'Test JP.',date:now},
    {id:uid(),name:'Alex Márquez',company:'Comercial Visión Sur',biz:'polimer',phone:'56975462444',email:'vdsur.spa@gmail.com',product:'Rollo prepicado 20x30+30x40 25mic',qty:'20un',stage:'cotizado',notes:'Cantidad baja, derivar si no confirma mínimo.',date:now},
    {id:uid(),name:'Kim',company:'La Tribu',biz:'polimer',phone:'',email:'',product:'Bolsas',qty:'',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'José Soiza',company:'Epsilon',biz:'polimer',phone:'',email:'',product:'',qty:'',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Gerardo Gabriel Parada',company:'Rio Vivo',biz:'polimer',phone:'',email:'',product:'',qty:'',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Alan Guenchor',company:'Feria Peñalolén',biz:'polimer',phone:'',email:'',product:'',qty:'',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Eduardo Moreno',company:'',biz:'polimer',phone:'',email:'',product:'',qty:'',stage:'cotizado',notes:'',date:now},
    {id:uid(),name:'Carolina Villarroel',company:'Cristalim',biz:'polimer',phone:'56996978605',email:'',product:'Prepicado 5 medidas',qty:'100kg c/u',stage:'cotizado',notes:'Sin email confirmado.',date:now},
    {id:uid(),name:'Juan Pablo Bayas',company:'JPB Marketing',biz:'polimer',phone:'56944843503',email:'Bp.juanpix@gmail.com',product:'Hielo 40x50 90mic',qty:'9058un',stage:'cotizado',notes:'Test.',date:now},

    // ── COTIZADO — Fierros Idini ──
    {id:uid(),name:'Jerson Montecino',company:'Fix Master',biz:'fierros',phone:'56968448112',email:'jerson.montecino@gmail.com',product:'Perfil 75x75x1.5mm',qty:'7 barras',stage:'cotizado',notes:'',date:now},

    // ── DERIVADO ──
    {id:uid(),name:'Leslie Meza',company:'Horizonte Coffee',biz:'polimer',phone:'56959865785',email:'',product:'Bolsa café 13x20 90mic',qty:'300-500un',stage:'derivado',notes:'Derivado Homs, cantidad bajo mínimo.',date:now},
    {id:uid(),name:'Leydi',company:'',biz:'polimer',phone:'56992992112',email:'',product:'Wicket 40x60 25mic',qty:'9000un',stage:'derivado',notes:'Derivado Homs.',date:now},
    {id:uid(),name:'eduquinterosm',company:'',biz:'polimer',phone:'56937408397',email:'',product:'Bolsas grandes',qty:'10un',stage:'derivado',notes:'Muy bajo mínimo, derivado.',date:now},
    {id:uid(),name:'Jacqueline',company:'',biz:'polimer',phone:'56937129655',email:'',product:'Varias medidas',qty:'100un c/medida',stage:'derivado',notes:'Bajo mínimo, derivado.',date:now},
    {id:uid(),name:'Mercadito Reyes',company:'',biz:'polimer',phone:'',email:'',product:'Mangas',qty:'2un',stage:'derivado',notes:'Muy bajo mínimo.',date:now},
    {id:uid(),name:'Cesario',company:'Emporio Gourmet',biz:'polimer',phone:'56986089718',email:'',product:'Vacío 25x35 80mic',qty:'100un',stage:'derivado',notes:'Bajo mínimo, derivado.',date:now},
    {id:uid(),name:'Fernanda Vargas',company:'',biz:'polimer',phone:'56988895429',email:'',product:'Bins 150x100 80mic',qty:'500un',stage:'derivado',notes:'Derivado, no especificó peso.',date:now},
    {id:uid(),name:'José',company:'',biz:'polimer',phone:'56997415186',email:'',product:'Bins',qty:'10un',stage:'derivado',notes:'Muy bajo mínimo.',date:now},

    // ── MÍNIMO ≥300kg (sin email) ──
    {id:uid(),name:'Michele Bravo',company:'',biz:'polimer',phone:'56987743024',email:'',product:'Basura 140x160 40mic',qty:'300kg',stage:'minimo',notes:'Sin email, cumple mínimo.',date:now},
    {id:uid(),name:'Paola A',company:'',biz:'polimer',phone:'56949732502',email:'',product:'Courier 35x45 adhesivo',qty:'1800un',stage:'minimo',notes:'Sin email.',date:now},

    // ── LEAD ──
    {id:uid(),name:'Gustavo',company:'',biz:'polimer',phone:'56995087101',email:'',product:'Doypack negro',qty:'',stage:'lead',notes:'Sin medidas ni cantidad.',date:now},
    {id:uid(),name:'Rafael',company:'',biz:'polimer',phone:'56987920151',email:'',product:'Manga 20-25cm',qty:'100kg',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Yaque',company:'',biz:'polimer',phone:'56957844592',email:'',product:'70x90 + 90x120',qty:'',stage:'lead',notes:'Sin cantidad.',date:now},
    {id:uid(),name:'orangust14',company:'',biz:'polimer',phone:'56948932253',email:'',product:'Courier rojo',qty:'',stage:'lead',notes:'Sin medidas.',date:now},
    {id:uid(),name:'Victor',company:'',biz:'polimer',phone:'56941016792',email:'',product:'',qty:'',stage:'lead',notes:'Solo saludo.',date:now},
    {id:uid(),name:'Ramon Herrera',company:'',biz:'polimer',phone:'56988046530',email:'',product:'',qty:'',stage:'lead',notes:'Enviό TikTok.',date:now},
    {id:uid(),name:'Andres',company:'',biz:'polimer',phone:'56997734443',email:'',product:'Bolsas residuos 100x250cm',qty:'',stage:'lead',notes:'Derivado a agente.',date:now},
    {id:uid(),name:'Gonzalo Henríquez',company:'',biz:'polimer',phone:'56963735829',email:'',product:'',qty:'',stage:'lead',notes:'Pidió catálogo.',date:now},
    {id:uid(),name:'Jesús',company:'',biz:'polimer',phone:'56974482672',email:'',product:'Basura 120lt',qty:'',stage:'lead',notes:'Pidió catálogo.',date:now},
    {id:uid(),name:'Pablo Javier',company:'',biz:'polimer',phone:'56934812308',email:'',product:'',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'ARTEGRASS',company:'',biz:'polimer',phone:'56920675514',email:'',product:'Bolsas 25kg',qty:'',stage:'lead',notes:'Sin medidas.',date:now},
    {id:uid(),name:'Angelo',company:'',biz:'polimer',phone:'56949877428',email:'',product:'',qty:'',stage:'lead',notes:'Preguntó por empleo.',date:now},
    {id:uid(),name:'Viviana Andrea',company:'',biz:'polimer',phone:'56998229925',email:'',product:'Bolsas pan 20x40',qty:'',stage:'lead',notes:'No completó.',date:now},
    {id:uid(),name:'Gabi',company:'',biz:'polimer',phone:'56967558508',email:'',product:'Film polietileno 13840m2',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Dani',company:'',biz:'polimer',phone:'56987270083',email:'',product:'Camiseta',qty:'',stage:'lead',notes:'Sin medidas.',date:now},
    {id:uid(),name:'Karen Rego',company:'',biz:'polimer',phone:'56979743037',email:'',product:'80x110 100mic',qty:'500un',stage:'lead',notes:'No completó.',date:now},
    {id:uid(),name:'Jocee',company:'',biz:'polimer',phone:'56950360444',email:'',product:'',qty:'',stage:'lead',notes:'Imagen sin datos.',date:now},
    {id:uid(),name:'Brandy',company:'',biz:'polimer',phone:'56941955336',email:'',product:'Bolsas pan',qty:'',stage:'lead',notes:'Sin datos.',date:now},
    {id:uid(),name:'Maria',company:'',biz:'polimer',phone:'56936903378',email:'',product:'Bolsa 50x90 cal.300',qty:'',stage:'lead',notes:'No completó.',date:now},
    {id:uid(),name:'Alejandra',company:'',biz:'polimer',phone:'56974113252',email:'',product:'Bolsa calibre 2 64x67',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Eudys Villarroel',company:'',biz:'polimer',phone:'56952300462',email:'',product:'',qty:'',stage:'lead',notes:'Ofrecía chatarra.',date:now},
    {id:uid(),name:'Álvaro Magnere',company:'',biz:'polimer',phone:'56977065439',email:'',product:'',qty:'',stage:'lead',notes:'Solo audio, no completó.',date:now},
    {id:uid(),name:'Abril',company:'',biz:'polimer',phone:'56936169266',email:'',product:'',qty:'5000un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Gabriel Ogalde',company:'',biz:'polimer',phone:'56977623568',email:'',product:'',qty:'1000un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Mariela',company:'',biz:'polimer',phone:'56946812680',email:'',product:'',qty:'',stage:'lead',notes:'Sin micraje.',date:now},
    {id:uid(),name:'Marcelo Montecinos',company:'',biz:'polimer',phone:'56963027623',email:'',product:'Sacos',qty:'100un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Mirka Lagos',company:'',biz:'polimer',phone:'56965582882',email:'',product:'Camisetas 5 medidas',qty:'bajas',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Osvaldo Miranda',company:'',biz:'polimer',phone:'56996491550',email:'',product:'Hielo + termocontraíbles',qty:'',stage:'lead',notes:'Sin medidas.',date:now},
    {id:uid(),name:'Cristian Mendoza',company:'',biz:'polimer',phone:'56985053150',email:'',product:'',qty:'100un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Juan Carlos Costero',company:'',biz:'polimer',phone:'56942800721',email:'',product:'BOPP films',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Cristian Molina',company:'Outlet',biz:'polimer',phone:'56967285336',email:'',product:'',qty:'2000un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Manuel',company:'',biz:'polimer',phone:'56971259007',email:'',product:'',qty:'400un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Camilo Muñoz',company:'',biz:'polimer',phone:'56992687626',email:'',product:'Manga 10m',qty:'',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Jorge',company:'Almidones Arce',biz:'polimer',phone:'56954230271',email:'fidelyspa@gmail.com',product:'Basura 50x70+70x90',qty:'',stage:'lead',notes:'Sin confirmar cantidad.',date:now},
    {id:uid(),name:'Ivan Henríquez',company:'',biz:'polimer',phone:'56993363754',email:'',product:'Celofán frutos secos',qty:'',stage:'lead',notes:'Sin micraje.',date:now},
    {id:uid(),name:'Cinderella',company:'',biz:'polimer',phone:'56922450405',email:'',product:'',qty:'',stage:'lead',notes:'Primera compra, sin datos.',date:now},
    {id:uid(),name:'Yorca',company:'',biz:'polimer',phone:'56989159816',email:'',product:'140x160 80mic',qty:'',stage:'lead',notes:'Sin cantidad.',date:now},
    {id:uid(),name:'Maryte',company:'',biz:'polimer',phone:'56997482687',email:'',product:'Bins',qty:'',stage:'lead',notes:'Sin medidas.',date:now},
    {id:uid(),name:'Susana',company:'',biz:'polimer',phone:'56941675214',email:'',product:'Camisetas 4 medidas',qty:'',stage:'lead',notes:'Sin email.',date:now},
    {id:uid(),name:'clau',company:'',biz:'polimer',phone:'56990790670',email:'',product:'Rojas alta resistencia',qty:'',stage:'lead',notes:'Sin datos.',date:now},
    {id:uid(),name:'Daniel',company:'',biz:'polimer',phone:'56987921902',email:'',product:'',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Janet Ivon',company:'',biz:'polimer',phone:'56987746174',email:'',product:'',qty:'',stage:'lead',notes:'Bot duplicado.',date:now},
    {id:uid(),name:'Benjamin',company:'',biz:'polimer',phone:'56962300738',email:'',product:'Bolsa sellar 40x40 30mic',qty:'300un',stage:'lead',notes:'Sin email.',date:now},
    {id:uid(),name:'RoxanaDiaz Sembrasol',company:'Sembrasol',biz:'polimer',phone:'56953095627',email:'',product:'PEBD 250x250 50mic',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Cecy',company:'',biz:'polimer',phone:'56979671352',email:'',product:'',qty:'',stage:'lead',notes:'Sin datos de contacto.',date:now},
    {id:uid(),name:'Danny',company:'',biz:'polimer',phone:'56934512696',email:'',product:'Camiseta',qty:'',stage:'lead',notes:'Incompleto.',date:now},
    {id:uid(),name:'Moon Bite',company:'',biz:'polimer',phone:'56972441505',email:'',product:'Celofán personalizado',qty:'',stage:'lead',notes:'Sin datos.',date:now},
    {id:uid(),name:'Valeska Brisso',company:'',biz:'polimer',phone:'56968412726',email:'',product:'',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Isa Guzmán',company:'',biz:'polimer',phone:'56942825129',email:'',product:'Vacío',qty:'100un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'LeluMania',company:'',biz:'polimer',phone:'56920307933',email:'',product:'Planchas acrílico',qty:'',stage:'lead',notes:'Producto no disponible.',date:now},
    {id:uid(),name:'Alumco Spa',company:'Alumco Spa',biz:'polimer',phone:'56926378892',email:'',product:'',qty:'50un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Franco',company:'',biz:'polimer',phone:'56976722369',email:'',product:'',qty:'1un',stage:'lead',notes:'Muy bajo mínimo.',date:now},
    {id:uid(),name:'Camila Avilés',company:'',biz:'polimer',phone:'56949271199',email:'',product:'Prepicada carnicería',qty:'',stage:'lead',notes:'No completó.',date:now},
    {id:uid(),name:'Karencita',company:'',biz:'polimer',phone:'56942976871',email:'',product:'Basura 25kg',qty:'',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Cr',company:'',biz:'fierros',phone:'56992295442',email:'',product:'Fierro cuadrado',qty:'',stage:'lead',notes:'Chat equivocado.',date:now},
    {id:uid(),name:'Jean San Octavio',company:'Ferretería',biz:'fierros',phone:'56929894657',email:'',product:'',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Edgar',company:'',biz:'polimer',phone:'56927784901',email:'',product:'',qty:'1000un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Clau',company:'',biz:'polimer',phone:'56941147762',email:'',product:'',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Paula Javiera',company:'',biz:'polimer',phone:'56956381898',email:'',product:'',qty:'50+30un',stage:'lead',notes:'Bajo mínimo.',date:now},
    {id:uid(),name:'Eduardo Valenzuela',company:'',biz:'polimer',phone:'56983844886',email:'',product:'El saco',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'AgustínMelisenda',company:'',biz:'polimer',phone:'56953274041',email:'',product:'',qty:'',stage:'lead',notes:'Solo audio.',date:now},
    {id:uid(),name:'David',company:'',biz:'polimer',phone:'56948001921',email:'',product:'',qty:'',stage:'lead',notes:'Ofrecía chatarra.',date:now},
    {id:uid(),name:'Danny (papel)',company:'',biz:'polimer',phone:'56961894406',email:'',product:'Bolsas papel',qty:'',stage:'lead',notes:'No disponemos de papel.',date:now},
    {id:uid(),name:'Victor zipper',company:'',biz:'polimer',phone:'56995289286',email:'',product:'Zipper 3 medidas',qty:'',stage:'lead',notes:'Sin completar.',date:now},
    {id:uid(),name:'Viviana',company:'',biz:'polimer',phone:'56995977555',email:'',product:'',qty:'',stage:'lead',notes:'Sin datos.',date:now},
    {id:uid(),name:'Rodrigo ASY',company:'',biz:'polimer',phone:'56993965123',email:'',product:'',qty:'',stage:'lead',notes:'',date:now},
    {id:uid(),name:'Gabi (bins)',company:'',biz:'polimer',phone:'56966415936',email:'',product:'Bins 1000 litros',qty:'',stage:'lead',notes:'',date:now},
  ];
  savePipeline(leads);
}

let boardInited = false;
function renderPipeline() {
  seedPipelineLeads();
  seedCotizacionesOficiales();
  renderPipelineFilters();
  if (!boardInited) { renderPipelineBoard(); boardInited = true; }
  else { applyColColors(); }
  const leads = getPipeline();
  let filtered = plFilter === 'all' ? leads : leads.filter(l => l.biz === plFilter);
  if (plMonthFrom) filtered = filtered.filter(l => l.date && l.date.slice(0,7) >= plMonthFrom);
  if (plMonthTo)   filtered = filtered.filter(l => l.date && l.date.slice(0,7) <= plMonthTo);

  getActiveStages().forEach(({ id: stage }) => {
    const col = document.getElementById(`plCol-${stage}`);
    const badge = document.getElementById(`plCount-${stage}`);
    const totalEl = document.getElementById(`plTotal-${stage}`);
    if (!col || !badge) return;
    const items = filtered.filter(l => l.stage === stage);
    badge.textContent = items.length;
    // Column total
    if (totalEl) {
      const sum = items.reduce((s, l) => s + (Number(l.price) || 0), 0);
      if (sum > 0) {
        totalEl.textContent = fmtPesos(sum, true) + ' neto';
        totalEl.style.display = 'block';
      } else {
        totalEl.textContent = '';
        totalEl.style.display = 'none';
      }
    }
    if (!items.length) {
      col.innerHTML = '<div class="kanban-empty">Sin leads</div>';
      return;
    }
    const stageIds = getActiveStages().map(s => s.id);
    const cur = stageIds.indexOf(stage);
    col.innerHTML = items.map(l => `
      <div class="pl-card" data-id="${l.id}">
        ${l.cotizRef ? `<div class="pl-card-cotiz-ref">N°${escHtml(l.cotizRef)}</div>` : ''}
        ${l.price ? `<div class="pl-card-price">${fmtPesos(l.price, true)} <span class="pl-card-price-label">neto</span></div>` : ''}
        <div class="pl-card-name">${escHtml(l.name)}</div>
        ${l.company ? `<div class="pl-card-company">${escHtml(l.company)}</div>` : ''}
        ${l.product ? `<div class="pl-card-product">${escHtml(l.product)}</div>` : ''}
        <div class="pl-card-meta">
          ${l.phone ? `<span>📱 ${escHtml(l.phone)}</span>` : ''}
          ${l.qty ? `<span>⚖️ ${escHtml(l.qty)}</span>` : ''}
          ${l.date ? `<span>📅 ${formatDate(l.date)}</span>` : ''}
        </div>
        ${l.notes ? `<div class="pl-card-notes">${escHtml(l.notes)}</div>` : ''}
        <div class="pl-card-actions">
          ${cur > 0 ? `<button class="move-btn" onclick="moveLead('${l.id}',-1)">← Atrás</button>` : ''}
          ${cur < stageIds.length-1 ? `<button class="move-btn" onclick="moveLead('${l.id}',1)">Adelante →</button>` : ''}
          <button class="btn-icon cotiz-btn" onclick="openCotizModal('${l.id}')" title="Ver cotización">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
          </button>
          <button class="btn-icon" onclick="openLeadModal('${l.id}')" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon danger" onclick="deleteLead('${l.id}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');
  });
}

function openLeadModal(id) {
  const lead = id ? getPipeline().find(l => l.id === id) : null;
  document.getElementById('leadModalTitle').textContent = lead ? 'Editar Lead' : 'Nuevo Lead';
  document.getElementById('leadId').value = lead ? lead.id : '';
  document.getElementById('leadName').value = lead ? lead.name : '';
  document.getElementById('leadCompany').value = lead ? (lead.company || '') : '';
  populateLeadBizSelect(lead?.biz || getEmpresas()[0]?.id || '');
  document.getElementById('leadPhone').value = lead ? (lead.phone || '') : '';
  document.getElementById('leadEmail').value = lead ? (lead.email || '') : '';
  document.getElementById('leadProduct').value = lead ? (lead.product || '') : '';
  document.getElementById('leadQty').value = lead ? (lead.qty || '') : '';
  const stageSelect = document.getElementById('leadStage');
  const currentStage = lead ? (lead.stage || 'lead') : (getActiveStages()[0]?.id || 'lead');
  stageSelect.innerHTML = getActiveStages().map(s =>
    `<option value="${escHtml(s.id)}"${s.id===currentStage?' selected':''}>${escHtml(s.title)}</option>`
  ).join('');
  stageSelect.value = currentStage;
  document.getElementById('leadNotes').value = lead ? (lead.notes || '') : '';
  document.getElementById('leadDate').value = lead ? (lead.date || today()) : today();
  document.getElementById('leadPrice').value = lead ? (lead.price || '') : '';
  document.getElementById('leadModal').style.display = 'flex';
}

function closeLeadModal() {
  document.getElementById('leadModal').style.display = 'none';
}

function openCotizModal(id) {
  const l = getPipeline().find(x => x.id === id);
  if (!l) return;
  const titles = getPLTitles();
  const stageLabel = titles[l.stage] || PL_DEFAULT_TITLES[l.stage] || l.stage;
  const bizName = getEmpresas().find(e => e.id === l.biz)?.nombre || l.biz || 'Empresa';
  const quoteNum = 'COT-' + id.slice(-6).toUpperCase();
  const dateStr = l.date ? formatDate(l.date) : formatDate(today());

  const html = `
    <div class="cotiz-doc">
      <div class="cotiz-header">
        <div class="cotiz-brand">
          <div class="cotiz-brand-name">${escHtml(bizName)}</div>
          <div class="cotiz-brand-sub">Propuesta Comercial</div>
        </div>
        <div class="cotiz-meta">
          <div class="cotiz-num">${quoteNum}</div>
          <div class="cotiz-date">${dateStr}</div>
          <div class="cotiz-stage-badge">${escHtml(stageLabel)}</div>
        </div>
      </div>

      <div class="cotiz-section">
        <div class="cotiz-section-title">Cliente</div>
        <div class="cotiz-grid">
          <div class="cotiz-field"><span class="cotiz-label">Nombre</span><span class="cotiz-val">${escHtml(l.name || '—')}</span></div>
          ${l.company ? `<div class="cotiz-field"><span class="cotiz-label">Empresa</span><span class="cotiz-val">${escHtml(l.company)}</span></div>` : ''}
          ${l.phone   ? `<div class="cotiz-field"><span class="cotiz-label">Teléfono</span><span class="cotiz-val">${escHtml(l.phone)}</span></div>` : ''}
          ${l.email   ? `<div class="cotiz-field"><span class="cotiz-label">Email</span><span class="cotiz-val">${escHtml(l.email)}</span></div>` : ''}
        </div>
      </div>

      ${l.product || l.qty ? `
      <div class="cotiz-section">
        <div class="cotiz-section-title">Producto / Solicitud</div>
        <table class="cotiz-table">
          <thead><tr><th>Descripción</th><th>Cantidad</th></tr></thead>
          <tbody><tr>
            <td>${escHtml(l.product || '—')}</td>
            <td>${escHtml(l.qty || '—')}</td>
          </tr></tbody>
        </table>
      </div>` : ''}

      ${l.notes ? `
      <div class="cotiz-section">
        <div class="cotiz-section-title">Notas</div>
        <div class="cotiz-notes-body">${escHtml(l.notes)}</div>
      </div>` : ''}

      <div class="cotiz-footer">
        <div>Estado del proceso: <strong>${escHtml(stageLabel)}</strong></div>
        <div class="cotiz-footer-brand">${escHtml(bizName)}</div>
      </div>
    </div>
  `;

  document.getElementById('cotizContent').innerHTML = html;
  document.getElementById('cotizModal').style.display = 'flex';

  document.getElementById('cotizPrint').onclick = () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${quoteNum}</title>
    <style>
      body{font-family:system-ui,sans-serif;margin:40px;color:#111;font-size:14px}
      .cotiz-doc{max-width:680px;margin:auto}
      .cotiz-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #111;margin-bottom:24px}
      .cotiz-brand-name{font-size:22px;font-weight:800;letter-spacing:-.5px}
      .cotiz-brand-sub{color:#666;font-size:12px;margin-top:2px}
      .cotiz-num{font-size:13px;font-weight:700;text-align:right}
      .cotiz-date{color:#666;font-size:12px;text-align:right}
      .cotiz-stage-badge{display:inline-block;margin-top:6px;background:#111;color:#fff;border-radius:4px;padding:2px 8px;font-size:11px;font-weight:600;text-transform:uppercase;float:right}
      .cotiz-section{margin-bottom:24px}
      .cotiz-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#666;border-bottom:1px solid #e5e5e5;padding-bottom:4px;margin-bottom:12px}
      .cotiz-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .cotiz-field{display:flex;flex-direction:column}
      .cotiz-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.05em}
      .cotiz-val{font-size:14px;font-weight:500;margin-top:2px}
      .cotiz-table{width:100%;border-collapse:collapse}
      .cotiz-table th{background:#f5f5f5;padding:8px 12px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#666;border:1px solid #e5e5e5}
      .cotiz-table td{padding:10px 12px;border:1px solid #e5e5e5;vertical-align:top}
      .cotiz-notes-body{background:#f9f9f9;border-radius:6px;padding:12px;font-size:13px;color:#444;line-height:1.6}
      .cotiz-footer{display:flex;justify-content:space-between;align-items:center;padding-top:20px;border-top:1px solid #e5e5e5;font-size:12px;color:#666;margin-top:32px}
      .cotiz-footer-brand{font-weight:700;color:#111}
    </style></head><body>${document.getElementById('cotizContent').innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };

  document.getElementById('cotizCopy').onclick = () => {
    const lines = [
      `COTIZACIÓN ${quoteNum} — ${dateStr}`,
      `Cliente: ${l.name}`,
      l.company ? `Empresa: ${l.company}` : '',
      l.phone   ? `Teléfono: ${l.phone}` : '',
      l.email   ? `Email: ${l.email}` : '',
      '',
      l.product ? `Producto: ${l.product}` : '',
      l.qty     ? `Cantidad: ${l.qty}` : '',
      l.notes   ? `\nNotas: ${l.notes}` : '',
      '',
      `Estado: ${stageLabel}`,
    ].filter(x => x !== undefined && x !== null).join('\n').replace(/\n{3,}/g, '\n\n').trim();
    navigator.clipboard.writeText(lines).then(() => {
      const btn = document.getElementById('cotizCopy');
      btn.textContent = '¡Copiado!';
      setTimeout(() => { btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg> Copiar texto`; }, 1800);
    });
  };
}

function closeCotizModal() {
  document.getElementById('cotizModal').style.display = 'none';
}

function saveLead(e) {
  e.preventDefault();
  const id = document.getElementById('leadId').value;
  const leads = getPipeline();
  const lead = {
    id: id || uid(),
    name: document.getElementById('leadName').value.trim(),
    company: document.getElementById('leadCompany').value.trim(),
    biz: document.getElementById('leadBiz').value,
    phone: document.getElementById('leadPhone').value.trim(),
    email: document.getElementById('leadEmail').value.trim(),
    product: document.getElementById('leadProduct').value.trim(),
    qty: document.getElementById('leadQty').value.trim(),
    price: Number(document.getElementById('leadPrice').value) || 0,
    stage: document.getElementById('leadStage').value,
    notes: document.getElementById('leadNotes').value.trim(),
    date: document.getElementById('leadDate').value,
  };
  if (id) {
    const idx = leads.findIndex(l => l.id === id);
    if (idx !== -1) {
      const prev = leads[idx];
      if (prev.cotizRef) lead.cotizRef = prev.cotizRef;
      if (!lead.price && prev.price) lead.price = prev.price;
      leads[idx] = lead;
    } else leads.push(lead);
  } else {
    leads.push(lead);
  }
  savePipeline(leads);
  closeLeadModal();
  renderPipeline();
}

async function deleteLead(id) {
  if (!(await appConfirm('¿Eliminar este lead?'))) return;
  savePipeline(getPipeline().filter(l => l.id !== id));
  renderPipeline();
}

function moveLead(id, dir) {
  const stageIds = getActiveStages().map(s => s.id);
  const leads = getPipeline();
  const lead = leads.find(l => l.id === id);
  if (!lead) return;
  const cur = stageIds.indexOf(lead.stage);
  const next = cur + dir;
  if (next < 0 || next >= stageIds.length) return;
  lead.stage = stageIds[next];
  savePipeline(leads);
  renderPipeline();
}

// ── Init & Events ────────────────────────────────────

// Tarjeta Visa Internacional ****3375 — movimientos may-jun 2026
// USD convertido a CLP con TC ~950 (referencia mercado jun 2026)
function importVisaInt26() {
  const empresa = 'empresa', personal = 'personal';
  const TC = 950; // tipo de cambio USD→CLP
  const usd = v => Math.round(v * TC);
  const entries = [
    // WIX.COM x3 (29/05) — hosting/plataformas negocio
    { date:'2026-05-29', description:'WIX.COM (hosting)', amount:usd(100), category:'Software', type:empresa, notes:'Visa Int ****3375 · $100 USD' },
    { date:'2026-05-29', description:'WIX.COM (hosting)', amount:usd(100), category:'Software', type:empresa, notes:'Visa Int ****3375 · $100 USD' },
    { date:'2026-05-29', description:'WIX.COM (hosting)', amount:usd(100), category:'Software', type:empresa, notes:'Visa Int ****3375 · $100 USD' },
    // PARAMOUNT+ personal
    { date:'2026-05-29', description:'Paramount+', amount:usd(6.38), category:'Entretenimiento', type:personal, notes:'Visa Int ****3375 · $6.38 USD' },
    // WIX.COM (27/05)
    { date:'2026-05-27', description:'WIX.COM (hosting)', amount:usd(100), category:'Software', type:empresa, notes:'Visa Int ****3375 · $100 USD' },
    // Claude.ai subscription
    { date:'2026-05-26', description:'Claude.ai (Anthropic)', amount:usd(23.80), category:'Software', type:empresa, notes:'Visa Int ****3375 · $23.80 USD' },
    // BuilderBot mensual — herramienta de automatización
    { date:'2026-05-01', description:'BuilderBot (mensual)', amount:usd(39), category:'Software', type:empresa, notes:'Suscripción mensual · $39 USD' },
  ].map(e => ({ id: uid(), createdAt: new Date().toISOString(), notes: e.notes, source: 'visa_int', ...e }));
  const existing = getExpenses();
  saveExpenses([...existing, ...entries]);
}

function importBdcJun26() {
  // Cartola Banco de Chile — cuenta corriente — cargos abril-junio 2026
  const personal = 'personal', empresa = 'empresa';
  const entries = [
    // ── Junio 2026 ──
    { date:'2026-06-08', description:'Traspaso A:Khipu Clbs E',              amount:54181,  category:'Servicios',       type:personal, notes:'Banco de Chile' },
    { date:'2026-06-04', description:'Crunchyroll',                            amount:5490,   category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-06-04', description:'El Colorado',                            amount:99000,  category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-06-04', description:'Google YouTube',                         amount:3450,   category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-06-04', description:'Traspaso A:Juan Carlos Jara',            amount:2611,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-06-02', description:'Recaudación Pagos de Servicios',         amount:3921,   category:'Servicios',       type:personal, notes:'Banco de Chile' },
    { date:'2026-06-02', description:'Traspaso A:Jose Ignacio Espinoza',       amount:2645,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-06-01', description:'Impuesto Línea de Crédito',              amount:217,    category:'Banco',           type:personal, notes:'' },
    { date:'2026-06-01', description:'Didi',                                   amount:20608,  category:'Transporte',      type:personal, notes:'' },
    { date:'2026-06-01', description:'Didi',                                   amount:8076,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-06-01', description:'Didi',                                   amount:6950,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-06-01', description:'Los Viñedos Del C',                      amount:6350,   category:'Alimentación',    type:personal, notes:'Restaurante' },
    // ── Mayo 2026 ──
    { date:'2026-05-29', description:'Club Lo Cañas',                          amount:45000,  category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-05-29', description:'Traspaso A:Kevin',                       amount:15000,  category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-27', description:'Recaudación Pagos de Servicios',         amount:15230,  category:'Servicios',       type:personal, notes:'Banco de Chile' },
    { date:'2026-05-26', description:'MercadoPago',                            amount:592,    category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-25', description:'Traspaso A:Martin Eduardo Fuenzal',      amount:3685,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-20', description:'Copec Asistido',                         amount:20000,  category:'Transporte',      type:personal, notes:'Bencina' },
    { date:'2026-05-20', description:'Traspaso A:Gonzalo Iguere',              amount:4360,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-18', description:'Seguro Protección',                      amount:3231,   category:'Banco',           type:personal, notes:'Banco de Chile' },
    { date:'2026-05-18', description:'Comercial Los Molinos',                  amount:20140,  category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-18', description:'Uber Trip',                              amount:3250,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-05-18', description:'Uber Trip',                              amount:3494,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-05-18', description:'Los Viñedos Del C',                      amount:39120,  category:'Alimentación',    type:personal, notes:'Restaurante' },
    { date:'2026-05-15', description:'Comisión Compras en el Exterior',        amount:148,    category:'Banco',           type:personal, notes:'' },
    { date:'2026-05-13', description:'Spotify',                                amount:4950,   category:'Entretenimiento', type:personal, notes:'Suscripción mensual' },
    { date:'2026-05-12', description:'Wix.com',                                amount:7711,   category:'Software',        type:empresa,  notes:'Hosting web' },
    { date:'2026-05-11', description:'Didi',                                   amount:12408,  category:'Transporte',      type:personal, notes:'' },
    { date:'2026-05-08', description:'Pago Línea de Crédito',                  amount:329175, category:'Banco',           type:personal, notes:'Banco de Chile' },
    { date:'2026-05-08', description:'Traspaso A:Khipu Clbs E',               amount:50681,  category:'Servicios',       type:personal, notes:'Banco de Chile' },
    { date:'2026-05-06', description:'Tottus Quilín',                          amount:4972,   category:'Alimentación',    type:personal, notes:'Supermercado' },
    { date:'2026-05-05', description:'Universidad de Chile — NIC Chile',       amount:9990,   category:'Software',        type:empresa,  notes:'Dominio web' },
    { date:'2026-05-04', description:'Intereses Línea de Crédito',             amount:294,    category:'Banco',           type:personal, notes:'' },
    { date:'2026-05-04', description:'Impuesto Línea de Crédito',              amount:29,     category:'Banco',           type:personal, notes:'' },
    { date:'2026-05-04', description:'Uber Trip',                              amount:12593,  category:'Transporte',      type:personal, notes:'' },
    { date:'2026-05-04', description:'Crunchyroll',                            amount:5490,   category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-05-04', description:'Google YouTube',                         amount:3450,   category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-05-04', description:'Traspaso A:Juan Carlos Jara',            amount:3000,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-04', description:'Traspaso A:Vicente Mateo Aburto',        amount:17540,  category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-04', description:'Uber Trip',                              amount:3716,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-05-04', description:'Danica Yanara Far',                      amount:7546,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-05-04', description:'Uber Trip',                              amount:3580,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-05-04', description:'Patagonia Alimentos',                    amount:21560,  category:'Alimentación',    type:personal, notes:'' },
    // ── Abril 2026 ──
    { date:'2026-04-30', description:'Ventapormenor',                          amount:4000,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-30', description:'Uber Trip',                              amount:4290,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-04-28', description:'Amortización Línea de Crédito',          amount:129880, category:'Banco',           type:personal, notes:'' },
    { date:'2026-04-28', description:'Inv Los Leones C',                       amount:2250,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-27', description:'Flixbus',                                amount:70498,  category:'Transporte',      type:personal, notes:'' },
    { date:'2026-04-27', description:'Uber Trip',                              amount:4082,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-04-27', description:'Cai Weiguo',                             amount:18600,  category:'Alimentación',    type:personal, notes:'Restaurante' },
    { date:'2026-04-27', description:'Uber Trip',                              amount:3793,   category:'Transporte',      type:personal, notes:'' },
    { date:'2026-04-27', description:'Los Viñedos Del C',                      amount:5700,   category:'Alimentación',    type:personal, notes:'Restaurante' },
    { date:'2026-04-27', description:'Little Caesars',                         amount:19500,  category:'Alimentación',    type:personal, notes:'' },
    { date:'2026-04-24', description:'Pronto UAI Casino',                      amount:3690,   category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-04-23', description:'FCLudus Limitada',                       amount:5500,   category:'Entretenimiento', type:personal, notes:'' },
    { date:'2026-04-23', description:'Tottus Quilín',                          amount:7547,   category:'Alimentación',    type:personal, notes:'Supermercado' },
    { date:'2026-04-23', description:'Recaudación Pagos de Servicios',         amount:14110,  category:'Servicios',       type:personal, notes:'Banco de Chile' },
    { date:'2026-04-22', description:'Traspaso A:Martin Eduardo Fuenzal',      amount:2897,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-22', description:'Traspaso A:Martin Eduardo Fuenzal',      amount:2000,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-22', description:'Traspaso A:Sebastian Guajardo',          amount:2286,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-22', description:'Traspaso A:Martin Eduardo Fuenzal',      amount:33125,  category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-22', description:'Traspaso A:Renzo Vignola',               amount:3215,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-22', description:'Traspaso A:Martin Eduardo Fuenzal',      amount:9047,   category:'Otro',            type:personal, notes:'' },
    { date:'2026-04-22', description:'La Tarta',                               amount:2200,   category:'Alimentación',    type:personal, notes:'' },
  ].map(e => ({ id: uid(), createdAt: new Date().toISOString(), notes: '', source: 'bdc', ...e }));

  const existing = getExpenses();
  saveExpenses([...existing, ...entries]);
}

function importBdcApr26() {
  const entries = [
    { description: 'Entel PCS',                    amount: 14110,  category: 'Servicios Básicos', date: '2026-03-25', notes: 'Pago en línea' },
    { description: 'Heladería Freddo',              amount: 10280,  category: 'Alimentación',      date: '2026-03-25', notes: '' },
    { description: 'Heladería Freddo',              amount: 3590,   category: 'Alimentación',      date: '2026-03-25', notes: '' },
    { description: 'Starbucks Las Perdices',        amount: 5400,   category: 'Alimentación',      date: '2026-03-28', notes: '' },
    { description: 'Starbucks Las Perdices',        amount: 5400,   category: 'Alimentación',      date: '2026-03-29', notes: '' },
    { description: 'Copec 60195 — Bencina',        amount: 30500,  category: 'Transporte',        date: '2026-03-30', notes: '' },
    { description: 'La Tarta',                      amount: 1800,   category: 'Alimentación',      date: '2026-03-31', notes: '' },
    { description: 'Smart Fit Gimnasia',            amount: 34900,  category: 'Salud',             date: '2026-04-01', notes: 'Cuota mensual' },
    { description: 'LinkedIn',                      amount: 124950, category: 'Otros Personal',    date: '2026-04-01', notes: '' },
    { description: 'BCI Generales — Seguro',        amount: 7790,   category: 'Servicios Básicos', date: '2026-04-02', notes: '' },
    { description: 'Municipalidad de La Florida',   amount: 27502,  category: 'Otros Personal',    date: '2026-04-02', notes: '' },
    { description: 'MercadoPago Desarrollo',        amount: 2390,   category: 'Otros Personal',    date: '2026-04-02', notes: '' },
    { description: 'Fullneumaticos (4 cuotas)',     amount: 233990, category: 'Transporte',        date: '2026-04-02', notes: 'Cuota mensual $65.782' },
    { description: 'Los Viñedos del Con',           amount: 2980,   category: 'Entretenimiento',   date: '2026-04-03', notes: '' },
    { description: 'Uber Trip',                     amount: 2895,   category: 'Transporte',        date: '2026-04-04', notes: '' },
    { description: 'La Tarta',                      amount: 1400,   category: 'Alimentación',      date: '2026-04-06', notes: '' },
    { description: 'La Tarta',                      amount: 500,    category: 'Alimentación',      date: '2026-04-06', notes: '' },
    { description: 'Hiper Líder La Reina',          amount: 6403,   category: 'Alimentación',      date: '2026-04-06', notes: '' },
    { description: 'Flow — Samsung (cuota 18/24)',  amount: 19582,  category: 'Otros Personal',    date: '2026-04-22', notes: '' },
    { description: 'Comisión mantención tarjeta',   amount: 4802,   category: 'Servicios Básicos', date: '2026-04-22', notes: 'Banco de Chile VISA' },
    { description: 'Intereses rotativos tarjeta',   amount: 34699,  category: 'Servicios Básicos', date: '2026-04-22', notes: 'Banco de Chile VISA' },
    { description: 'Impuesto DL 3475 tarjeta',      amount: 1442,   category: 'Otros Personal',    date: '2026-04-22', notes: '' },
  ].map(e => ({ id: uid(), type: 'personal', createdAt: new Date().toISOString(), source: 'bdc', ...e }));

  const existing = getExpenses();
  saveExpenses([...existing, ...entries]);
}

function deduplicateExpenses() {
  const all = getExpenses();
  const seen = new Set();
  const deduped = all.filter(e => {
    const key = `${e.date}|${e.description}|${e.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (deduped.length < all.length) saveExpenses(deduped);
}

// Abonos cartola Banco de Chile — abr-jun 2026
// Excluidas: Transferencias desde Línea de Crédito (son deuda, no ingreso real)
function importBdcAbonos() {
  const entries = [
    // ── Junio 2026 ──
    { date:'2026-06-04', description:'Abono API En Línea 775009764',        amount:1182445, category:'Empresa',    notes:'BDC abono · probablemente pago cliente' },
    { date:'2026-06-04', description:'Traspaso De: Martin Eduardo Fuenzal', amount:100000,  category:'Varios',     notes:'BDC abono' },
    { date:'2026-06-04', description:'Traspaso De: Jose Ignacio Espinoza',  amount:3912,    category:'Varios',     notes:'BDC abono' },
    { date:'2026-06-04', description:'Traspaso De: Jose Ignacio Espinoza',  amount:3912,    category:'Varios',     notes:'BDC abono' },
    { date:'2026-06-02', description:'Traspaso De: Renzo Alessandro Vignola', amount:3214,  category:'Varios',     notes:'BDC abono' },
    { date:'2026-06-01', description:'Traspaso De: Juan Carlos Jara Correa', amount:3214,   category:'Varios',     notes:'BDC abono' },
    { date:'2026-06-01', description:'Traspaso De: Vicente Andres Gonzalez', amount:3213,   category:'Varios',     notes:'BDC abono' },
    { date:'2026-06-01', description:'Traspaso De: Cesar Ivan Bayas Rojas', amount:160000,  category:'Familia',    notes:'BDC abono' },
    // ── Mayo 2026 ──
    { date:'2026-05-29', description:'Traspaso De: Marco Andres Munoz',     amount:22500,   category:'Varios',     notes:'BDC abono' },
    { date:'2026-05-29', description:'Traspaso De: Alvarez Garrido Lucia',  amount:2500,    category:'Familia',    notes:'BDC abono' },
    { date:'2026-05-27', description:'Traspaso De: Martin Eduardo Fuenzal', amount:7824,    category:'Varios',     notes:'BDC abono' },
    { date:'2026-05-25', description:'Traspaso De: Alvarez Garrido Lucia',  amount:23000,   category:'Familia',    notes:'BDC abono' },
    { date:'2026-05-25', description:'Traspaso De: Alvarez Garrido Lucia',  amount:10000,   category:'Familia',    notes:'BDC abono' },
    { date:'2026-05-20', description:'Traspaso De: Benjamin Alejandro Gar', amount:2400,    category:'Varios',     notes:'BDC abono' },
    { date:'2026-05-20', description:'Traspaso De: Vicente Mateo Aburto',   amount:3912,    category:'Varios',     notes:'BDC abono' },
    { date:'2026-05-12', description:'Traspaso De: Alvarez Garrido Lucia',  amount:160000,  category:'Familia',    notes:'BDC abono' },
    { date:'2026-05-08', description:'App-traspaso De: JPB Marketing Spa',  amount:555000,  category:'Empresa',    notes:'BDC abono · sueldo/retiro empresa' },
    { date:'2026-05-04', description:'Traspaso De: Cesar Ivan Bayas Rojas', amount:160000,  category:'Familia',    notes:'BDC abono' },
    // ── Abril 2026 ──
    { date:'2026-04-28', description:'App-traspaso De: JPB Marketing Spa',  amount:1100000, category:'Empresa',    notes:'BDC abono · sueldo/retiro empresa' },
    { date:'2026-04-27', description:'Traspaso De: Alvarez Garrido Lucia',  amount:12000,   category:'Familia',    notes:'BDC abono' },
  ].map(e => ({ id: uid(), createdAt: new Date().toISOString(), source: 'bdc_abono', ...e }));
  saveIncome([...getIncome(), ...entries]);
}

function deduplicateIncome() {
  const all = getIncome();
  const seen = new Set();
  const deduped = all.filter(e => {
    const key = `${e.date}|${e.description}|${e.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (deduped.length < all.length) saveIncome(deduped);
}

async function init() {
  mailConfigInit();
  if (window.gestipymePush && window.gestipymePush.supported) window.gestipymePush.register();

  const syncedFromRemote = window.gestipymeSync ? await window.gestipymeSync.pullAndApply() : false;
  if (syncedFromRemote) localStorage.setItem('gestipyme_version', APP_VERSION);

  if (localStorage.getItem('gestipyme_version') !== APP_VERSION) {
    Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
    seedInitialData();
    localStorage.setItem('gestipyme_version', APP_VERSION);
  }

  // v2: full reset — wipe all expenses and reimport clean from scratch
  if (!localStorage.getItem('gestipyme_full_reset_v3')) {
    // clear all previous import flags
    ['gestipyme_import_bdc_apr26','gestipyme_import_bdc_jun26','gestipyme_import_bdc_jun26b',
     'gestipyme_import_bdc_jun26c','gestipyme_import_bdc_jun26d',
     'gestipyme_import_visa_int_26','gestipyme_import_visa_int_26b','gestipyme_import_visa_int_26c',
     'gestipyme_import_visa_int_26d','gestipyme_import_visa_int_26e'].forEach(k => localStorage.removeItem(k));
    // wipe ALL expenses
    saveExpenses([]);
    // reimport everything fresh
    importBdcApr26();
    importBdcJun26();
    importVisaInt26();
    localStorage.setItem('gestipyme_import_bdc_apr26', '1');
    localStorage.setItem('gestipyme_import_bdc_jun26d', '1');
    localStorage.setItem('gestipyme_import_visa_int_26e', '1');
    localStorage.setItem('gestipyme_full_reset_v3', '1');
  }

  if (!localStorage.getItem('gestipyme_import_abonos_v1')) {
    saveIncome([]);
    importBdcAbonos();
    localStorage.setItem('gestipyme_import_abonos_v1', '1');
  }

  deduplicateExpenses();
  deduplicateIncome();
  if (typeof notasSeed === 'function') notasSeed();

  // Date
  const now  = new Date();
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  window.updateTopbarDate = () => {
    const n = new Date();
    document.getElementById('topbarDate').textContent =
      `${days[n.getDay()]}, ${n.getDate()} de ${months[n.getMonth()]} ${n.getFullYear()}`;
  };
  window.updateTopbarDate();

  populateFilterCategories();

  // Default calendar to most recent month with expenses (or current month)
  const allDates = getExpenses().map(e => e.date).sort();
  const latestDate = allDates[allDates.length - 1];
  if (latestDate) {
    const [ly, lm] = latestDate.split('-');
    state.expCalDate = new Date(parseInt(ly), parseInt(lm) - 1, 1);
    const latestMo = `${ly}-${lm}`;
    document.getElementById('filterMonth').value = latestMo;
    state.expenseFilter.month = latestMo;
  } else {
    const curMo = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    document.getElementById('filterMonth').value = curMo;
    state.expenseFilter.month = curMo;
  }

  renderDashboard();
  renderExpenses();

  // ── Navigation ──
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
      if (document.getElementById('sidebar').classList.contains('open')) {
        document.getElementById('sidebar').classList.remove('open');
        document.getElementById('backdrop').classList.remove('open');
      }
    });
  });

  // ── Sidebar toggle (mobile) ──
  document.getElementById('menuToggle').addEventListener('click', () => {
    const sb = document.getElementById('sidebar');
    const bd = document.getElementById('backdrop');
    const isOpen = sb.classList.toggle('open');
    bd.classList.toggle('open', isOpen);
  });

  // ── Quick add ──
  document.getElementById('quickAddBtn').addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('quickAddMenu').classList.toggle('open');
  });
  document.getElementById('qaExpense').addEventListener('click', () => {
    document.getElementById('quickAddMenu').classList.remove('open');
    openExpenseModal();
  });
  document.getElementById('qaTask').addEventListener('click', () => {
    document.getElementById('quickAddMenu').classList.remove('open');
    openTaskModal();
  });
  document.addEventListener('click', () => {
    document.getElementById('quickAddMenu').classList.remove('open');
  });

  // ── Quotes ──
  document.getElementById('quoteNext').addEventListener('click', () => {
    state.quoteIndex = (state.quoteIndex + 1) % QUOTES.length;
    renderQuote();
  });

  // ── Expense page ──
  document.getElementById('newExpenseBtn').addEventListener('click', () => openExpenseModal());
  document.getElementById('addFirstExpense')?.addEventListener('click', () => openExpenseModal());

  document.getElementById('expenseFilterTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.ftab');
    if (!btn) return;
    document.querySelectorAll('#expenseFilterTabs .ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.expenseFilter.type = btn.dataset.filter;
    renderExpenses();
  });

  document.getElementById('filterMonth').addEventListener('change', (e) => {
    state.expenseFilter.month = e.target.value;
    if (e.target.value) {
      const [y, m] = e.target.value.split('-');
      state.expCalDate = new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    state.expCalSelected = null;
    renderExpenses();
  });

  document.getElementById('filterCategory').addEventListener('change', (e) => {
    state.expenseFilter.category = e.target.value;
    renderExpenses();
  });

  document.getElementById('exportCsvBtn').addEventListener('click', exportCsv);

  // ── Expense view toggle ──
  document.getElementById('expViewToggle').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-expview]');
    if (!btn) return;
    document.querySelectorAll('#expViewToggle [data-expview]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.expenseView = btn.dataset.expview;
    if (state.expenseView === 'calendar' && state.expenseFilter.month) {
      const [y, m] = state.expenseFilter.month.split('-');
      state.expCalDate = new Date(parseInt(y), parseInt(m) - 1, 1);
    }
    state.expCalSelected = null;
    renderExpenses();
  });

  document.getElementById('expCalPrev').addEventListener('click', () => {
    state.expCalDate = new Date(state.expCalDate.getFullYear(), state.expCalDate.getMonth() - 1, 1);
    state.expCalSelected = null;
    renderExpenses();
  });

  document.getElementById('expCalNext').addEventListener('click', () => {
    state.expCalDate = new Date(state.expCalDate.getFullYear(), state.expCalDate.getMonth() + 1, 1);
    state.expCalSelected = null;
    renderExpenses();
  });

  document.getElementById('expenseType').addEventListener('change', (e) => {
    populateCategorySelect(e.target.value);
  });

  document.getElementById('expenseForm').addEventListener('submit', saveExpense);

  // ── Task page ──
  document.getElementById('newTaskBtn').addEventListener('click', () => openTaskModal());
  document.getElementById('taskForm').addEventListener('submit', saveTask);

  // ── Diary page ──
  document.getElementById('newDiaryBtn').addEventListener('click', () => openDiaryModal());
  document.getElementById('diaryForm').addEventListener('submit', saveDiaryEntry);
  document.getElementById('diaryCalPrev').addEventListener('click', () => {
    state.diaryCalDate = new Date(state.diaryCalDate.getFullYear(), state.diaryCalDate.getMonth() - 1, 1);
    renderDiaryCalendar();
  });
  document.getElementById('diaryCalNext').addEventListener('click', () => {
    state.diaryCalDate = new Date(state.diaryCalDate.getFullYear(), state.diaryCalDate.getMonth() + 1, 1);
    renderDiaryCalendar();
  });
  document.querySelectorAll('[data-diary-tab]').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.diaryTab;
      document.querySelectorAll('[data-diary-tab]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('diaryTabEntradas').style.display = tab === 'entradas' ? 'block' : 'none';
      document.getElementById('diaryTabReglas').style.display   = tab === 'reglas'   ? 'block' : 'none';
      if (tab === 'reglas') renderRules();
    });
  });

  // ── Rules ──
  document.getElementById('newRuleBtn').addEventListener('click', () => openRuleModal());
  document.getElementById('ruleForm').addEventListener('submit', saveRule);

  // ── Pipeline ──
  document.getElementById('newLeadBtn').addEventListener('click', () => openLeadModal());
  document.getElementById('leadForm').addEventListener('submit', saveLead);
  document.getElementById('leadModalClose').addEventListener('click', closeLeadModal);
  document.getElementById('leadModalCancel').addEventListener('click', closeLeadModal);
  document.getElementById('leadModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('leadModal')) closeLeadModal();
  });
  document.getElementById('cotizModalClose').addEventListener('click', closeCotizModal);
  document.getElementById('cotizModal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('cotizModal')) closeCotizModal();
  });
  document.getElementById('pipelineFilterTabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-plfilter]');
    if (!btn) return;
    document.querySelectorAll('#pipelineFilterTabs .ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    plFilter = btn.dataset.plfilter;
    renderPipeline();
  });

  // ── Privacy mode ──
  if (privacyMode) {
    document.getElementById('privacyToggle').checked = true;
    document.getElementById('privacyLabel').textContent = 'Activado';
  }

  // ── Pipeline month range filter ──
  populateMonthSelects();
  document.getElementById('plMonthFrom')?.addEventListener('change', e => { plMonthFrom = e.target.value; renderPipeline(); });
  document.getElementById('plMonthTo')?.addEventListener('change',   e => { plMonthTo   = e.target.value; renderPipeline(); });

  // ── Empresas ──
  document.getElementById('newEmpresaBtn')?.addEventListener('click', () => openEmpresaModal());

  // ── Videos page ──
  document.getElementById('newVideoBtn').addEventListener('click', () => openVideoModal());
  document.getElementById('videoForm').addEventListener('submit', saveVideoEntry);

  // ── Charts period ──
  document.querySelector('.chart-period-selector')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.ftab');
    if (!btn) return;
    document.querySelectorAll('.chart-period-selector .ftab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.chartPeriod = parseInt(btn.dataset.period);
    if (state.currentPage === 'graficos') renderCharts();
  });

  // ── Calendar nav ──
  calBellInit();
  document.getElementById('calRefreshBtn').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = 'Actualizando…';
    try {
      if (window.gestipymeSync) await window.gestipymeSync.pullAndApply();
      if (typeof renderKanban === 'function') renderKanban();
      if (typeof renderDashboard === 'function') renderDashboard();
      calRefresh();
    } finally {
      btn.disabled = false; btn.textContent = '↻ Actualizar';
    }
  });
  document.getElementById('sumGatitaChip').addEventListener('click', () => {
    const sel = document.getElementById('filterCategory');
    sel.value = state.expenseFilter.category === 'Gatita' ? '' : 'Gatita';
    sel.dispatchEvent(new Event('change'));
  });
  document.getElementById('calToday').addEventListener('click', () => {
    state.calDate = new Date();
    renderCalendar();
  });
  document.getElementById('calPrev').addEventListener('click', () => {
    state.calDate = new Date(state.calDate.getFullYear(), state.calDate.getMonth() - 1, 1);
    renderCalendar();
  });
  document.getElementById('calNext').addEventListener('click', () => {
    state.calDate = new Date(state.calDate.getFullYear(), state.calDate.getMonth() + 1, 1);
    renderCalendar();
  });

  // ── Modal close buttons ──
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  // ── Backdrop close ──
  document.getElementById('backdrop').addEventListener('click', () => {
    ['expenseModal', 'taskModal', 'diaryModal', 'ruleModal', 'videoModal', 'videoDetailModal', 'noteModal', 'noteDetailModal'].forEach(id => {
      if (document.getElementById(id)?.classList.contains('open')) closeModal(id);
    });
    document.getElementById('sidebar').classList.remove('open');
  });

}

// ── Initial seed ─────────────────────────────────────

function seedInitialData() {
  const diaryEntries = [
    {
      id: uid(),
      date: '2026-06-07',
      mood: '🔥',
      title: 'Jornada 10am–11pm: Fierros Idini + Nicolás + webs',
      content: 'Jornada: 10am a 11pm\n\nFierros Idini: conversación sobre avances de Udo. Google Ads arranca en 1 a 1.5 meses\n\nProspecto Nicolás (app NBA): seguimiento para reunión del lunes. Pendiente urgente: entregar Sales Operation profesional\n\nAvance en página web JPB Marketing + página web para Conflex\n\nEstado de ánimo: orgullo por jornada larga y productiva. Foco en mantener momentum para el lunes',
      createdAt: new Date().toISOString(),
    },
  ];

  const ruleEntries = [
    {
      id: uid(),
      title: 'Regla Maquiavelo — No declarar metas ni logros futuros',
      content: 'No hablar de metas ni logros futuros. Respaldado por Peter Gollwitzer ("social reality"): declarar intenciones genera reconocimiento social que el cerebro registra como avance real sin que exista. El efecto es peor en contextos sociales sin rendición de cuentas. La energía que se gasta explicando una visión es energía que no se usa construyendo. La rendición de cuentas se reemplaza con métricas internas.\n\nAplicación: callar, ejecutar, mostrar resultados — no planes.\n\nExcepción — Compromiso estratégico de alto nivel: comprometerse con un entregable concreto ante un cliente de alto nivel es válido cuando sabes que puedes cumplir, hay un deadline real y no decirlo te saca del juego. La presión en ese caso es combustible, no sabotaje.',
      createdAt: new Date().toISOString(),
    },
    {
      id: uid(),
      title: 'Ajedrez mental como procesamiento estratégico',
      content: 'Cuando estoy planificando o bajo presión, mi cerebro corre simulaciones de ajedrez involuntarias: piezas moviéndose, intervalos de aproximadamente 10 segundos. No es literal — la torre no representa un problema específico.\n\nEl cerebro activa circuitos de pensamiento estratégico en un dominio con reglas claras para "calentar" el músculo de analizar, anticipar y decidir, mientras procesa el problema real de forma difusa en segundo plano. La conexión no es de contenido sino de proceso.\n\nEs una válvula de escape productiva — similar a por qué surgen ideas en la ducha. No interrumpirlo.',
      createdAt: new Date().toISOString(),
    },
  ];

  const videoEntries = [
    {
      id: uid(),
      title: '"El Cónclave" — Maquiavelo y la riqueza invisible',
      author: 'YouTube',
      thesis: 'La verdadera riqueza se construye en el silencio y la invisibilidad. El poder real no es estatus, es capacidad de elección.',
      content: 'SEGMENTOS CLAVE:\n\n0:00–3:30 — La trampa de la visibilidad\nEl sistema programa para buscar reconocimiento. La visibilidad prematura es extracción: envidias, exigencias de familiares, presión estatal, ajustes de precios erosionan el capital.\n\n3:30–6:00 — La Virtù como estrategia\nNo es virtud moral, es capacidad estratégica fría. El constructor de riqueza opera sin audiencia, protegiendo sus movimientos.\n\n6:00–7:00 — Efecto de sustitución simbólica\nAnunciar metas libera dopamina prematura, reduce el esfuerzo real. El silencio estratégico fomenta la acumulación real.\n\n7:00–9:00 y 17:00–18:00 — Ejemplos históricos\nWarren Buffett evita exhibiciones innecesarias. Los Rothschild usaron discreción como doctrina de supervivencia generacional. Cosme de Médici controlaba Florencia desde un perfil de ciudadano común.\n\n10:30–14:00 — Construcción de carácter\nLa solidez financiera nace de estructura interna que no necesita testigos. El error de la clase media es la transparencia excesiva: hablar de sueldos, deudas y planes te hace vulnerable y predecible.\n\nCONCLUSIÓN: La invisibilidad no es debilidad, es fortaleza estratégica.',
      tags: ['maquiavelo', 'riqueza', 'estrategia', 'visibilidad', 'poder'],
      createdAt: new Date().toISOString(),
    },
  ];

  saveExpenses([]);
  saveTasks([]);
  saveDiary(diaryEntries);
  saveRules(ruleEntries);
  saveVideos(videoEntries);
}

// ── Demo seed ────────────────────────────────────────

function seedDemoData() {
  const now = new Date();
  const y  = now.getFullYear();
  const m  = String(now.getMonth() + 1).padStart(2, '0');
  const prevMonthNum = now.getMonth() === 0 ? 12 : now.getMonth();
  const lm = String(prevMonthNum).padStart(2, '0');
  const ly = now.getMonth() === 0 ? y - 1 : y;

  const expenses = [
    { id: uid(), description: 'Suscripción Adobe Creative Cloud', amount: 62000, type: 'empresa', category: 'Tecnología', date: `${y}-${m}-05`, notes: '' },
    { id: uid(), description: 'Publicidad Facebook Ads', amount: 150000, type: 'empresa', category: 'Marketing', date: `${y}-${m}-08`, notes: 'Campaña prospección' },
    { id: uid(), description: 'Arriendo oficina', amount: 320000, type: 'empresa', category: 'Arriendo', date: `${y}-${m}-01`, notes: '' },
    { id: uid(), description: 'Supermercado semana', amount: 48000, type: 'personal', category: 'Alimentación', date: `${y}-${m}-12`, notes: '' },
    { id: uid(), description: 'Bencina', amount: 35000, type: 'personal', category: 'Transporte', date: `${y}-${m}-10`, notes: '' },
    { id: uid(), description: 'Hosting + dominio anual', amount: 85000, type: 'empresa', category: 'Tecnología', date: `${y}-${m}-15`, notes: '' },
    { id: uid(), description: 'Almuerzo equipo', amount: 42000, type: 'empresa', category: 'Oficina y Suministros', date: `${y}-${m}-20`, notes: '' },
    { id: uid(), description: 'Cine + salida', amount: 25000, type: 'personal', category: 'Entretenimiento', date: `${y}-${m}-18`, notes: '' },
    { id: uid(), description: 'Google Workspace', amount: 18000, type: 'empresa', category: 'Tecnología', date: `${ly}-${lm}-03`, notes: '' },
    { id: uid(), description: 'LinkedIn Premium', amount: 55000, type: 'empresa', category: 'Marketing', date: `${ly}-${lm}-07`, notes: '' },
    { id: uid(), description: 'Farmacia', amount: 12000, type: 'personal', category: 'Salud', date: `${ly}-${lm}-14`, notes: '' },
  ].map(e => ({ ...e, createdAt: new Date().toISOString() }));

  const tasks = [
    { id: uid(), title: 'Revisar facturas pendientes de clientes', description: 'Verificar pagos del mes anterior', priority: 'high', category: 'empresa', status: 'pending', dueDate: `${y}-${m}-${String(Math.min(now.getDate() + 3, 28)).padStart(2,'0')}`, createdAt: new Date().toISOString() },
    { id: uid(), title: 'Declarar IVA mensual', description: '', priority: 'high', category: 'empresa', status: 'in_progress', dueDate: `${y}-${m}-20`, createdAt: new Date().toISOString() },
    { id: uid(), title: 'Actualizar presupuesto anual', description: 'Revisar proyecciones Q3-Q4', priority: 'medium', category: 'empresa', status: 'pending', dueDate: '', createdAt: new Date().toISOString() },
    { id: uid(), title: 'Pagar dividendo hipoteca', description: '', priority: 'medium', category: 'personal', status: 'pending', dueDate: `${y}-${m}-${String(Math.min(now.getDate() + 5, 28)).padStart(2,'0')}`, createdAt: new Date().toISOString() },
    { id: uid(), title: 'Reunión con contador', description: 'Cierre trimestral', priority: 'high', category: 'empresa', status: 'done', dueDate: `${y}-${m}-05`, createdAt: new Date().toISOString() },
  ];

  saveExpenses(expenses);
  saveTasks(tasks);
  renderDashboard();
  renderExpenses();
}

// ── AI Assistant ─────────────────────────────────────

const AI = {
  history:  [],
  pending:  null,
  loading:  false,
  queue:    [],
};

const AI_SYSTEM = () => `Eres el asistente personal de GestiónPyme, una app para un emprendedor chileno. No sos un formulario ni un bot frío: sos como alguien de confianza con quien él conversa de noche para contarle cómo le fue el día, y vos lo ayudás a ordenar lo que dijo — tareas, gastos, recordatorios — mientras le contestás con calidez, en chileno informal (tú/vos, "cachai", tono cercano pero sin exagerar), corto y natural, nunca robótico ni acartonado.
Responde SOLO con JSON válido, sin texto adicional, sin markdown, sin explicar que es JSON.

El usuario puede contarte varias cosas de corrido (su día completo). Cuando detectes UNO O MÁS gastos/tareas en el mismo mensaje, devuelve:
{"action":"multi","items":[ {"action":"expense",...} , {"action":"task",...} ],"reply":"tu respuesta conversacional y cálida, comentando su día, antes de listar lo que vas a registrar"}
Cada elemento de "items" lleva su propio "action" ("expense" o "task") y el resto de sus campos, con el mismo formato exacto que se describe abajo para cada tipo.

Si detectás solo UN gasto, devuelve directo (sin envolver en "multi"):
{"action":"expense","description":"...","amount":50000,"expenseType":"empresa|personal","category":"...","date":"YYYY-MM-DD","notes":""}

Si detectás solo UNA tarea o algo que recordarle, devuelve directo:
{"action":"task","title":"...","priority":"low|medium|high","category":"empresa|personal","dueDate":"YYYY-MM-DD|null","description":"","dueTime":"HH:MM|null","reminders":[{"amount":1,"unit":"hours|minutes|days"}]}
- "dueTime" y "reminders" son opcionales: solo los incluyes si el usuario mencionó una hora concreta o pidió explícitamente que le recuerdes algo ("avísame", "recuérdame", "mándame un recordatorio"). Si no, omite esos campos.

Para charla, preguntas, o cuando solo quiere contarte algo sin que registres nada, devuelve:
{"action":"chat","message":"tu respuesta conversacional, cálida y breve, en tu personalidad"}

Reglas importantes:
- Hoy es ${today()}. Usa esta fecha si el usuario no especifica.
- La moneda es CLP (pesos chilenos). "50k" o "50 mil" = 50000.
- empresa = gasto/tarea laboral o de negocio. personal = gasto/tarea personal.
- Categorías empresa: Marketing, Tecnología, Oficina y Suministros, Personal / RRHH, Ventas, Logística, Impuestos y Contabilidad, Servicios Profesionales, Arriendo, Otros Empresa.
- Categorías personal: Alimentación, Transporte, Vivienda, Salud, Educación, Entretenimiento, Ropa y Calzado, Servicios Básicos, Ahorro / Inversión, Gatita, Otros Personal.
- Si el usuario dice "almuerzo", "comida" → Alimentación (personal) u Oficina y Suministros (empresa).
- Si falta info esencial de un gasto/tarea puntual (monto, descripción), usa "chat" para pedir el dato — no inventes cifras.
- Sé breve: 1-3 frases en "reply"/"message", nunca un párrafo largo.`;

// ── Configuración de correo (recordatorios) ──────────

let mailConfigCache = { gmailUser: '', gmailAppPassword: '', defaultRecipients: [] };

function renderMailDefaultsList() {
  const list = document.getElementById('mailDefaultsList');
  list.innerHTML = mailConfigCache.defaultRecipients.map(email => `
    <div style="display:flex; align-items:center; gap:8px">
      <span style="flex:1; font-size:.85rem">${escHtml(email)}</span>
      <button type="button" class="reminder-row-remove" onclick="removeMailDefault('${email}')">×</button>
    </div>`).join('') || '<p class="config-block-sub" style="margin:0">Todavía no agregaste ningún correo.</p>';
}

async function mailConfigInit() {
  const block = document.getElementById('mailConfigBlock');
  if (!window.gestipyme) { block.style.display = 'none'; return; }
  block.style.display = '';
  mailConfigCache = await window.gestipyme.getMailConfig();
  if (!Array.isArray(mailConfigCache.defaultRecipients)) mailConfigCache.defaultRecipients = [];
  document.getElementById('mailGmailUser').value = mailConfigCache.gmailUser;
  document.getElementById('mailGmailPass').value = mailConfigCache.gmailAppPassword;
  renderMailDefaultsList();
  refreshReminderAgentStatus();
}

async function persistMailConfig() {
  await window.gestipyme.setMailConfig(mailConfigCache);
}

async function addMailDefault() {
  const input = document.getElementById('mailDefaultsInput');
  const email = input.value.trim();
  if (!email) return;
  if (!mailConfigCache.defaultRecipients.includes(email)) {
    mailConfigCache.defaultRecipients.push(email);
    await persistMailConfig();
    renderMailDefaultsList();
  }
  input.value = '';
}

async function removeMailDefault(email) {
  mailConfigCache.defaultRecipients = mailConfigCache.defaultRecipients.filter(e => e !== email);
  await persistMailConfig();
  renderMailDefaultsList();
}

async function mailConfigSave() {
  mailConfigCache.gmailUser        = document.getElementById('mailGmailUser').value.trim();
  mailConfigCache.gmailAppPassword = document.getElementById('mailGmailPass').value.trim();
  await persistMailConfig();
  alert('Configuración de correo guardada.');
}

async function mailConfigSendTest() {
  await mailConfigSave();
  const res = await window.gestipyme.sendTestMail(mailConfigCache);
  alert(res.ok ? 'Correo de prueba enviado. Revisa tu bandeja de entrada.' : `Error al enviar: ${res.error}`);
}

async function refreshReminderAgentStatus() {
  const { installed } = await window.gestipyme.reminderAgentStatus();
  document.getElementById('reminderAgentStatus').textContent = installed
    ? 'Activo — revisa recordatorios pendientes cada 15 minutos, aunque la app esté cerrada.'
    : 'Inactivo — los recordatorios solo se marcan, pero no se envían solos.';
  const btn = document.getElementById('reminderAgentBtn');
  btn.textContent = installed ? 'Desactivar' : 'Activar';
  btn.dataset.installed = installed ? '1' : '0';
}

async function toggleReminderAgent() {
  const btn = document.getElementById('reminderAgentBtn');
  const installed = btn.dataset.installed === '1';
  const res = installed
    ? await window.gestipyme.uninstallReminderAgent()
    : await window.gestipyme.installReminderAgent();
  if (res && res.error) alert(`Error: ${res.error}`);
  refreshReminderAgentStatus();
}

// ── Notificaciones push (móvil) ───────────────────────

async function pushConfigInit() {
  const block = document.getElementById('pushConfigBlock');
  if (!window.gestipymePush || !window.gestipymePush.supported) { block.style.display = 'none'; return; }
  block.style.display = '';
  await refreshPushStatus();
}

async function refreshPushStatus() {
  const status = await window.gestipymePush.getStatus();
  const subscribed = status === 'subscribed';
  document.getElementById('pushStatusText').textContent = subscribed
    ? 'Activadas — vas a recibir un aviso directo en este dispositivo cuando venza un recordatorio.'
    : 'Recibí un aviso directo en este dispositivo cuando venza un recordatorio, además del correo.';
  const btn = document.getElementById('pushToggleBtn');
  btn.textContent = subscribed ? 'Desactivar' : 'Activar';
  btn.dataset.subscribed = subscribed ? '1' : '0';
}

async function togglePushSubscription() {
  const btn = document.getElementById('pushToggleBtn');
  const subscribed = btn.dataset.subscribed === '1';
  try {
    if (subscribed) await window.gestipymePush.unsubscribe();
    else await window.gestipymePush.subscribe();
  } catch (err) {
    alert(`Error: ${err.message}`);
  }
  refreshPushStatus();
}

function aiGetKey() {
  return localStorage.getItem('gestipyme_api_key') || '';
}

function aiSetKey(key) {
  localStorage.setItem('gestipyme_api_key', key.trim());
}

function elGetKey()     { return localStorage.getItem('gestipyme_el_key') || ''; }
function elSetKey(k)    { localStorage.setItem('gestipyme_el_key', k.trim()); }
function elGetVoiceId() { return localStorage.getItem('gestipyme_el_voice') || ''; }
function elSetVoiceId(v){ localStorage.setItem('gestipyme_el_voice', v.trim()); }
function elGetEnabled() { return localStorage.getItem('gestipyme_el_enabled') === '1'; }
function elSetEnabled(on) { localStorage.setItem('gestipyme_el_enabled', on ? '1' : '0'); }

let aiCurrentAudio = null;

async function aiSpeak(text) {
  if (!elGetEnabled()) return;
  const key = elGetKey();
  const voiceId = elGetVoiceId();
  if (!key || !voiceId || !text) return;

  try {
    if (aiCurrentAudio) { aiCurrentAudio.pause(); aiCurrentAudio = null; }
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': key,
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) { console.warn('[voz] ElevenLabs respondió', res.status); return; }
    const blob = await res.blob();
    aiCurrentAudio = new Audio(URL.createObjectURL(blob));
    aiCurrentAudio.play().catch(() => {});
  } catch (err) {
    console.warn('[voz] No se pudo generar el audio:', err.message);
  }
}

function aiTimeStr() {
  const n = new Date();
  return `${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`;
}

function aiAppendMsg(role, text) {
  const el = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = `
    <div class="ai-msg-bubble">${escHtml(text)}</div>
    <div class="ai-msg-time">${aiTimeStr()}</div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function aiShowTyping() {
  const el = document.getElementById('aiMessages');
  const div = document.createElement('div');
  div.className = 'ai-msg bot';
  div.id = 'aiTypingIndicator';
  div.innerHTML = `<div class="ai-typing">
    <div class="ai-typing-dot"></div>
    <div class="ai-typing-dot"></div>
    <div class="ai-typing-dot"></div>
  </div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function aiRemoveTyping() {
  document.getElementById('aiTypingIndicator')?.remove();
}

function aiShowPreview(data) {
  const area = document.getElementById('aiPreviewArea');
  const card = document.getElementById('aiPreviewCard');
  AI.pending = data;

  const queueBadge = AI.queue.length
    ? `<div class="ai-preview-row"><span class="ai-preview-label">Quedan</span><span class="ai-preview-val">${AI.queue.length} más después de esto</span></div>`
    : '';

  if (data.action === 'expense') {
    card.innerHTML = `
      <div class="ai-preview-type expense">Nuevo Gasto</div>
      <div class="ai-preview-row"><span class="ai-preview-label">Descripción</span><span class="ai-preview-val">${escHtml(data.description)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Monto</span><span class="ai-preview-val" style="color:var(--empresa);font-size:1.05rem">${clp(data.amount)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Tipo</span><span class="ai-preview-val">${data.expenseType === 'empresa' ? 'Empresa' : 'Personal'}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Categoría</span><span class="ai-preview-val">${escHtml(data.category)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Fecha</span><span class="ai-preview-val">${formatDate(data.date)}</span></div>
      ${data.notes ? `<div class="ai-preview-row"><span class="ai-preview-label">Notas</span><span class="ai-preview-val">${escHtml(data.notes)}</span></div>` : ''}
      ${queueBadge}
    `;
  } else if (data.action === 'task') {
    const pLabel = { high: 'Alta', medium: 'Media', low: 'Baja' };
    const hasReminder = data.reminders && data.reminders.length;
    card.innerHTML = `
      <div class="ai-preview-type task">Nueva Tarea</div>
      <div class="ai-preview-row"><span class="ai-preview-label">Título</span><span class="ai-preview-val">${escHtml(data.title)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Prioridad</span><span class="ai-preview-val">${pLabel[data.priority] || data.priority}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Tipo</span><span class="ai-preview-val">${data.category === 'empresa' ? 'Empresa' : 'Personal'}</span></div>
      ${data.dueDate ? `<div class="ai-preview-row"><span class="ai-preview-label">Vence</span><span class="ai-preview-val">${formatDate(data.dueDate)}${data.dueTime ? ' ' + data.dueTime : ''}</span></div>` : ''}
      ${data.description ? `<div class="ai-preview-row"><span class="ai-preview-label">Desc.</span><span class="ai-preview-val">${escHtml(data.description)}</span></div>` : ''}
      ${hasReminder ? `<div class="ai-preview-row"><span class="ai-preview-label">🔔</span><span class="ai-preview-val">${data.reminders.map(r => `${r.amount} ${r.unit} antes`).join(', ')}</span></div>` : ''}
      ${queueBadge}
    `;
  }

  area.style.display = 'block';
}

function aiHidePreview() {
  document.getElementById('aiPreviewArea').style.display = 'none';
  AI.pending = null;
}

function aiConfirm() {
  const data = AI.pending;
  if (!data) return;

  if (data.action === 'expense') {
    const expenses = getExpenses();
    expenses.push({
      id: uid(),
      description: data.description,
      amount: data.amount,
      type: data.expenseType,
      category: data.category,
      date: data.date,
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
    });
    saveExpenses(expenses);
    renderExpenses();
    renderDashboard();
    if (state.currentPage === 'graficos') renderCharts();
    aiAppendMsg('bot', `✅ Gasto guardado: ${data.description} — ${clp(data.amount)}`);
  } else if (data.action === 'task') {
    const hasReminder = Array.isArray(data.reminders) && data.reminders.length > 0;
    const record = {
      id: uid(),
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      category: data.category,
      dueDate: data.dueDate || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
      reminderEnabled: hasReminder && !!data.dueDate,
      dueTime: data.dueTime || '09:00',
      reminderEmail: (mailConfigCache.defaultRecipients || []).join(','),
      reminders: hasReminder ? data.reminders : [],
    };
    const tasks = getTasks();
    tasks.push(record);
    saveTasks(tasks);
    if (window.gestipyme && record.reminderEnabled) window.gestipyme.syncReminder(record);
    renderKanban();
    renderDashboard();
    aiAppendMsg('bot', `✅ Tarea agregada: "${data.title}"${record.reminderEnabled ? ' 🔔' : ''}`);
  }

  aiHidePreview();

  if (AI.queue.length) {
    const next = AI.queue.shift();
    setTimeout(() => aiShowPreview(next), 300);
  }
}

function aiEditBeforeConfirm() {
  const data = AI.pending;
  if (!data) return;
  aiHidePreview();
  AI.queue = [];

  if (data.action === 'expense') {
    openExpenseModal();
    setTimeout(() => {
      document.getElementById('expenseDesc').value    = data.description;
      document.getElementById('expenseAmount').value  = data.amount;
      document.getElementById('expenseType').value    = data.expenseType;
      populateCategorySelect(data.expenseType);
      document.getElementById('expenseCategory').value = data.category;
      document.getElementById('expenseDate').value    = data.date;
      document.getElementById('expenseNotes').value   = data.notes || '';
    }, 50);
  } else if (data.action === 'task') {
    openTaskModal();
    setTimeout(() => {
      document.getElementById('taskTitle').value    = data.title;
      document.getElementById('taskPriority').value = data.priority;
      document.getElementById('taskCategory').value = data.category;
      document.getElementById('taskDueDate').value  = data.dueDate || '';
      document.getElementById('taskDesc').value     = data.description || '';
    }, 50);
  }
}

async function aiSendMessage(text) {
  if (AI.loading || !text.trim()) return;

  const key = aiGetKey();
  if (!key) {
    document.getElementById('aiNoKey').style.display = 'flex';
    document.getElementById('aiInputRow').style.display = 'none';
    return;
  }

  AI.loading = true;
  document.getElementById('aiSend').disabled = true;
  document.getElementById('aiInput').value = '';
  aiHidePreview();

  aiAppendMsg('user', text);
  AI.history.push({ role: 'user', content: text });

  aiShowTyping();

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 900,
        system: AI_SYSTEM(),
        messages: AI.history.slice(-8),
      }),
    });

    aiRemoveTyping();

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err?.error?.message || `Error ${res.status}`;
      if (res.status === 401) {
        aiAppendMsg('bot', '⚠️ API Key inválida. Ve a configuración (⚙) y revisa tu clave.');
      } else {
        aiAppendMsg('bot', `⚠️ Error: ${msg}`);
      }
      return;
    }

    const data = await res.json();
    const raw  = data.content[0].text.trim();
    AI.history.push({ role: 'assistant', content: raw });

    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = null; }

    if (!parsed) {
      aiAppendMsg('bot', raw);
      return;
    }

    if (parsed.action === 'multi' && Array.isArray(parsed.items) && parsed.items.length) {
      const reply = parsed.reply || `Encontré ${parsed.items.length} cosas para registrar, vamos una por una.`;
      aiAppendMsg('bot', reply);
      aiSpeak(reply);
      AI.queue = parsed.items.slice(1);
      aiShowPreview(parsed.items[0]);
    } else if (parsed.action === 'expense' || parsed.action === 'task') {
      const preview = parsed.action === 'expense'
        ? `Encontré un gasto de ${clp(parsed.amount)}. ¿Lo guardo?`
        : `Encontré una tarea: "${parsed.title}". ¿La agrego?`;
      aiAppendMsg('bot', preview);
      aiShowPreview(parsed);
    } else {
      const msg = parsed.message || raw;
      aiAppendMsg('bot', msg);
      aiSpeak(msg);
    }

  } catch (e) {
    aiRemoveTyping();
    aiAppendMsg('bot', '⚠️ No pude conectarme. Revisa tu conexión e inténtalo de nuevo.');
  } finally {
    AI.loading = false;
    document.getElementById('aiSend').disabled = false;
    document.getElementById('aiInput').focus();
  }
}

function aiInit() {
  const bubble = document.getElementById('aiBubble');
  const panel  = document.getElementById('aiPanel');

  // Welcome message
  aiAppendMsg('bot', '¡Hola! 👋 Contame cómo te fue hoy y te voy ordenando gastos, tareas y recordatorios — podés contarme varias cosas de corrido.\n\nEjemplos:\n• "gasté 45 mil en bencina y mañana tengo que declarar el IVA"\n• "recuérdame a las 10 la reunión con la fábrica de pallets"\n• "almuerzo de empresa 28000"');

  bubble.addEventListener('click', () => {
    panel.classList.toggle('open');
    bubble.classList.toggle('hidden', panel.classList.contains('open'));
    if (panel.classList.contains('open')) {
      const key = aiGetKey();
      if (!key) {
        document.getElementById('aiNoKey').style.display = 'flex';
        document.getElementById('aiInputRow').style.display = 'none';
      } else {
        document.getElementById('aiNoKey').style.display = 'none';
        document.getElementById('aiInputRow').style.display = 'flex';
        setTimeout(() => document.getElementById('aiInput').focus(), 100);
      }
    }
  });

  document.getElementById('aiCloseBtn').addEventListener('click', () => {
    panel.classList.remove('open');
    bubble.classList.remove('hidden');
  });

  const openAiKeyModal = () => {
    document.getElementById('apiKeyInput').value  = aiGetKey();
    document.getElementById('elKeyInput').value     = elGetKey();
    document.getElementById('elVoiceIdInput').value = elGetVoiceId();
    document.getElementById('elVoiceEnabled').checked = elGetEnabled();
    openModal('aiKeyModal');
  };

  document.getElementById('aiSettingsBtn').addEventListener('click', openAiKeyModal);
  document.getElementById('aiGoSetKey').addEventListener('click', openAiKeyModal);

  document.getElementById('saveApiKey').addEventListener('click', () => {
    const k = document.getElementById('apiKeyInput').value.trim();
    if (!k) { alert('Ingresa una API Key válida.'); return; }
    aiSetKey(k);
    elSetKey(document.getElementById('elKeyInput').value);
    elSetVoiceId(document.getElementById('elVoiceIdInput').value);
    elSetEnabled(document.getElementById('elVoiceEnabled').checked);
    closeModal('aiKeyModal');
    document.getElementById('aiNoKey').style.display = 'none';
    document.getElementById('aiInputRow').style.display = 'flex';
    aiAppendMsg('bot', '✅ API Key configurada. Ahora puedes usar el asistente.');
    setTimeout(() => document.getElementById('aiInput').focus(), 100);
  });

  document.getElementById('aiSend').addEventListener('click', () => {
    aiSendMessage(document.getElementById('aiInput').value);
  });

  document.getElementById('aiInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') aiSendMessage(document.getElementById('aiInput').value);
  });

  document.getElementById('aiPreviewConfirm').addEventListener('click', aiConfirm);
  document.getElementById('aiPreviewEdit').addEventListener('click', aiEditBeforeConfirm);

  setupAiVoiceInput();
}

function setupAiVoiceInput() {
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  const micBtn = document.getElementById('aiMic');
  if (!SpeechRecognitionCtor) { micBtn.style.display = 'none'; return; }
  micBtn.style.display = 'flex';

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = 'es-CL';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  let listening = false;

  recognition.addEventListener('result', (e) => {
    const transcript = e.results[e.results.length - 1][0].transcript.trim();
    if (transcript) {
      document.getElementById('aiInput').value = transcript;
      aiSendMessage(transcript);
    }
  });

  recognition.addEventListener('end', () => {
    listening = false;
    micBtn.classList.remove('listening');
  });

  recognition.addEventListener('error', () => {
    listening = false;
    micBtn.classList.remove('listening');
  });

  micBtn.addEventListener('click', () => {
    if (listening) { recognition.stop(); return; }
    try {
      recognition.start();
      listening = true;
      micBtn.classList.add('listening');
    } catch {}
  });
}

// ── Empresas ─────────────────────────────────────────

const STORAGE_EMPRESAS = 'gestipyme_empresas';

const DEFAULT_EMPRESAS = [
  { id: 'polimer',  nombre: 'Polimer',      color: '#2563eb' },
  { id: 'fierros',  nombre: 'Fierros Idini', color: '#b45309' },
  { id: 'otro',     nombre: 'Otro',          color: '#6b7280' },
];

function getEmpresas() {
  const saved = load(STORAGE_EMPRESAS);
  return (saved && Array.isArray(saved) && saved.length) ? saved : DEFAULT_EMPRESAS;
}
function saveEmpresas(arr) { save(STORAGE_EMPRESAS, arr); }

// Populate month selects with last 24 months
function populateMonthSelects() {
  const ids = ['plMonthFrom', 'plMonthTo'];
  const names = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now = new Date();
  ids.forEach(id => {
    const sel = document.getElementById(id);
    if (!sel) return;
    // keep first "Sin límite" option, rebuild rest
    sel.innerHTML = '<option value="">Sin límite</option>';
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const opt = document.createElement('option');
      opt.value = val;
      opt.textContent = `${names[d.getMonth()]} ${d.getFullYear()}`;
      sel.appendChild(opt);
    }
  });
}

// Rebuild Pipeline filter tabs based on current empresas
function renderPipelineFilters() {
  const tabs = document.getElementById('pipelineFilterTabs');
  if (!tabs) return;
  const empresas = getEmpresas();
  tabs.innerHTML = `<button class="ftab${plFilter==='all'?' active':''}" data-plfilter="all">Todos</button>` +
    empresas.map(e => `<button class="ftab${plFilter===e.id?' active':''}" data-plfilter="${escHtml(e.id)}">${escHtml(e.nombre)}</button>`).join('');
}

// Populate leadBiz select with current empresas
function populateLeadBizSelect(currentVal) {
  const sel = document.getElementById('leadBiz');
  if (!sel) return;
  const empresas = getEmpresas();
  sel.innerHTML = empresas.map(e => `<option value="${escHtml(e.id)}"${e.id===currentVal?' selected':''}>${escHtml(e.nombre)}</option>`).join('');
}

function renderEmpresas() {
  const list = document.getElementById('empresaList');
  if (!list) return;
  const empresas = getEmpresas();
  if (!empresas.length) {
    list.innerHTML = '<p style="color:var(--light);padding:20px">No hay empresas.</p>';
    return;
  }
  list.innerHTML = `<div class="empresa-grid">
    ${empresas.map(e => `
      <div class="empresa-card">
        <div class="empresa-color-strip" style="background:${escHtml(e.color)}"></div>
        <div class="empresa-info">
          <div class="empresa-nombre">${escHtml(e.nombre)}</div>
          <div class="empresa-id">${escHtml(e.id)}</div>
        </div>
        <div class="empresa-actions">
          <button class="btn-icon" onclick="openEmpresaModal('${escHtml(e.id)}')" title="Editar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          ${e.id !== 'otro' ? `<button class="btn-icon danger" onclick="deleteEmpresa('${escHtml(e.id)}')" title="Eliminar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
          </button>` : ''}
        </div>
      </div>
    `).join('')}
  </div>`;
}

function openEmpresaModal(id) {
  const e = id ? getEmpresas().find(x => x.id === id) : null;
  document.getElementById('empresaModalTitle').textContent = e ? 'Editar Empresa' : 'Nueva Empresa';
  document.getElementById('empresaId').value     = e?.id     || '';
  document.getElementById('empresaNombre').value = e?.nombre || '';
  document.getElementById('empresaColor').value  = e?.color  || '#2563eb';
  const overlay = document.getElementById('modalEmpresa');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('empresaNombre').focus(), 100);
}

function closeEmpresaModal() {
  document.getElementById('modalEmpresa').style.display = 'none';
  document.body.style.overflow = '';
}

function saveEmpresa() {
  const nombre = document.getElementById('empresaNombre').value.trim();
  if (!nombre) { alert('El nombre es requerido'); return; }
  const empresas = getEmpresas();
  const existingId = document.getElementById('empresaId').value;
  const color = document.getElementById('empresaColor').value;
  if (existingId) {
    const idx = empresas.findIndex(e => e.id === existingId);
    if (idx !== -1) { empresas[idx].nombre = nombre; empresas[idx].color = color; }
  } else {
    // Generate id from name
    const newId = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_').replace(/_+/g,'_').slice(0,20) + '_' + Date.now().toString(36);
    empresas.push({ id: newId, nombre, color });
  }
  saveEmpresas(empresas);
  closeEmpresaModal();
  renderEmpresas();
  renderPipelineFilters(); // sync pipeline tabs
}

async function deleteEmpresa(id) {
  const count = getPipeline().filter(l => l.biz === id).length;
  const msg = count > 0
    ? `Esta empresa tiene ${count} lead(s) en Pipeline. Al eliminarla los leads quedarán sin empresa. ¿Continuar?`
    : '¿Eliminar esta empresa?';
  if (!(await appConfirm(msg))) return;
  saveEmpresas(getEmpresas().filter(e => e.id !== id));
  if (plFilter === id) plFilter = 'all';
  renderEmpresas();
  renderPipelineFilters();
}

// ── Start ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => { init(); aiInit(); });
