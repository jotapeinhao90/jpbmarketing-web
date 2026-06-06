/* ════════════════════════════════════════════════════
   GestiónPyme — App Logic
   by JPB Marketing
   ════════════════════════════════════════════════════ */

'use strict';

// ── Constants ────────────────────────────────────────

const STORAGE = {
  expenses: 'gestipyme_expenses',
  tasks:    'gestipyme_tasks',
  diary:    'gestipyme_diary',
  videos:   'gestipyme_videos',
  rules:    'gestipyme_rules',
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
    'Ahorro / Inversión', 'Otros Personal',
  ],
};

const CATEGORY_ICONS = {
  'Alimentación': '🍽', 'Transporte': '🚗', 'Vivienda': '🏠',
  'Salud': '💊', 'Educación': '📚', 'Entretenimiento': '🎬',
  'Ropa y Calzado': '👟', 'Servicios Básicos': '⚡',
  'Ahorro / Inversión': '💰', 'Otros Personal': '📌',
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
  expenseFilter:    { type: 'all', month: '', category: '' },
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
}

function getExpenses() { return load(STORAGE.expenses); }
function saveExpenses(data) { save(STORAGE.expenses, data); }
function getTasks()       { return load(STORAGE.tasks); }
function saveTasks(data)  { save(STORAGE.tasks, data); }
function getDiary()       { return load(STORAGE.diary); }
function saveDiary(data)  { save(STORAGE.diary, data); }
function getVideos()      { return load(STORAGE.videos); }
function saveVideos(data) { save(STORAGE.videos, data); }
function getRules()       { return load(STORAGE.rules); }
function saveRules(data)  { save(STORAGE.rules, data); }

// ── Utils ────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function clp(n) {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function shortClp(n) {
  if (n >= 1000000) return '$' + (n / 1000000).toFixed(1) + 'M';
  if (n >= 100000)  return '$' + Math.round(n / 1000) + 'k';
  if (n >= 10000)   return '$' + (n / 1000).toFixed(0) + 'k';
  if (n >= 1000)    return '$' + (n / 1000).toFixed(1) + 'k';
  return clp(n);
}

function today() {
  return new Date().toISOString().slice(0, 10);
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
    gastos:    'Gastos',
    graficos:  'Gráficos',
    tareas:    'Tareas',
    calendario:'Calendario',
    diario:    'Diario',
    videos:    'Videos',
    donaciones:'Apóyanos',
  };
  document.getElementById('topbarPage').textContent = titles[page] || page;
  state.currentPage = page;
  if (page === 'graficos')   renderCharts();
  if (page === 'calendario') renderCalendar();
  if (page === 'dashboard')  renderDashboard();
  if (page === 'tareas')     renderKanban();
  if (page === 'diario')     renderDiary();
  if (page === 'videos')     renderVideos();
  if (page === 'gastos')     renderExpenses();
  window.scrollTo(0, 0);
}

// ── Dashboard ────────────────────────────────────────

function renderDashboard() {
  const now  = new Date();
  const yr   = now.getFullYear();
  const mo   = String(now.getMonth() + 1).padStart(2, '0');
  const curMo = `${yr}-${mo}`;

  const h = now.getHours();
  const greeting = h < 12 ? 'Buenos días 👋' : h < 19 ? 'Buenas tardes 👋' : 'Buenas noches 👋';
  document.getElementById('greeting').textContent = greeting;

  const expenses = getExpenses().filter(e => e.date.startsWith(curMo));
  const empresa  = expenses.filter(e => e.type === 'empresa').reduce((a, e) => a + e.amount, 0);
  const personal = expenses.filter(e => e.type === 'personal').reduce((a, e) => a + e.amount, 0);
  const tasks    = getTasks().filter(t => t.status !== 'done');

  document.getElementById('kpiEmpresa').textContent  = clp(empresa);
  document.getElementById('kpiPersonal').textContent = clp(personal);
  document.getElementById('kpiTotal').textContent    = clp(empresa + personal);
  document.getElementById('kpiTasks').textContent    = tasks.length;

  renderRecentExpenses();
  renderUpcomingTasks();
  renderQuote();
}

function renderRecentExpenses() {
  const el = document.getElementById('recentExpenses');
  const list = getExpenses().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6);
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

function openExpenseModal(id, preDate) {
  document.getElementById('expenseId').value    = '';
  document.getElementById('expenseDesc').value  = '';
  document.getElementById('expenseAmount').value = '';
  document.getElementById('expenseType').value   = 'empresa';
  document.getElementById('expenseDate').value   = preDate || today();
  document.getElementById('expenseNotes').value  = '';
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
  } else {
    document.getElementById('expenseModalTitle').textContent = 'Nuevo Gasto';
  }

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

  const id = document.getElementById('expenseId').value;
  const expenses = getExpenses();
  const record = { id: id || uid(), description: desc, amount, type, category: cat, date, notes, createdAt: id ? undefined : new Date().toISOString() };

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
  if (state.currentPage === 'calendario') renderCalendar();
}

function deleteExpense(id) {
  if (!confirm('¿Eliminar este gasto?')) return;
  saveExpenses(getExpenses().filter(e => e.id !== id));
  renderExpenses();
  renderDashboard();
  if (state.currentPage === 'graficos') renderCharts();
}

function renderExpenses() {
  const { type, month, category } = state.expenseFilter;
  let list = getExpenses();

  if (type !== 'all') list = list.filter(e => e.type === type);
  if (month)          list = list.filter(e => e.date.startsWith(month));
  if (category)       list = list.filter(e => e.category === category);

  list.sort((a, b) => b.date.localeCompare(a.date));

  const empresa  = list.filter(e => e.type === 'empresa').reduce((a, e) => a + e.amount, 0);
  const personal = list.filter(e => e.type === 'personal').reduce((a, e) => a + e.amount, 0);
  document.getElementById('sumEmpresa').textContent  = clp(empresa);
  document.getElementById('sumPersonal').textContent = clp(personal);
  document.getElementById('sumTotal').textContent    = clp(empresa + personal);
  document.getElementById('sumCount').textContent    = list.length;

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
      </div>
      <div class="exp-row-amount">${clp(e.amount)}</div>
      <div class="td-actions">
        <button class="btn-icon" onclick="openExpenseModal('${e.id}')" title="Editar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon danger" onclick="deleteExpense('${e.id}')" title="Eliminar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
        </button>
      </div>
    </div>`;
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

function openTaskModal(id) {
  document.getElementById('taskId').value       = '';
  document.getElementById('taskTitle').value    = '';
  document.getElementById('taskDesc').value     = '';
  document.getElementById('taskPriority').value = 'medium';
  document.getElementById('taskCategory').value = 'empresa';
  document.getElementById('taskDueDate').value  = '';
  document.getElementById('taskStatus').value   = 'pending';

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
  } else {
    document.getElementById('taskModalTitle').textContent = 'Nueva Tarea';
  }

  openModal('taskModal');
}

function saveTask(e) {
  e.preventDefault();
  const title   = document.getElementById('taskTitle').value.trim();
  if (!title) return;
  const id      = document.getElementById('taskId').value;
  const tasks   = getTasks();
  const record  = {
    id:          id || uid(),
    title,
    description: document.getElementById('taskDesc').value.trim(),
    priority:    document.getElementById('taskPriority').value,
    category:    document.getElementById('taskCategory').value,
    dueDate:     document.getElementById('taskDueDate').value,
    status:      document.getElementById('taskStatus').value,
    createdAt:   id ? undefined : new Date().toISOString(),
  };

  if (id) {
    const idx = tasks.findIndex(x => x.id === id);
    if (idx !== -1) { record.createdAt = tasks[idx].createdAt; tasks[idx] = record; }
  } else {
    tasks.push(record);
  }

  saveTasks(tasks);
  closeModal('taskModal');
  renderKanban();
  renderDashboard();
}

function deleteTask(id) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  saveTasks(getTasks().filter(t => t.id !== id));
  renderKanban();
  renderDashboard();
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

function deleteDiaryEntry(id) {
  if (!confirm('¿Eliminar esta entrada del diario?')) return;
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

function deleteRule(id) {
  if (!confirm('¿Eliminar esta regla?')) return;
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

function deleteVideoEntry(id) {
  if (!confirm('¿Eliminar este video?')) return;
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

  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  document.getElementById('calTitle').textContent = `${months[mon]} ${year}`;

  const firstDay = new Date(year, mon, 1).getDay(); // 0=Sun
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon=0
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  const todayStr = today();

  const yStr = String(year);
  const mStr = String(mon + 1).padStart(2, '0');
  const prefix = `${yStr}-${mStr}`;

  const expenses = getExpenses().filter(e => e.date.startsWith(prefix));
  const tasks    = getTasks().filter(t => t.dueDate && t.dueDate.startsWith(prefix));

  const expByDay  = {};
  const taskByDay = {};
  expenses.forEach(e => {
    const day = parseInt(e.date.split('-')[2]);
    expByDay[day] = (expByDay[day] || []);
    expByDay[day].push(e);
  });
  tasks.forEach(t => {
    const day = parseInt(t.dueDate.split('-')[2]);
    taskByDay[day] = (taskByDay[day] || []);
    taskByDay[day].push(t);
  });

  const grid = document.getElementById('calGrid');
  let html = '';

  for (let i = 0; i < startOffset; i++) {
    html += `<div class="cal-day empty"><div class="cal-day-num"></div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dStr = `${prefix}-${String(day).padStart(2, '0')}`;
    const isToday    = dStr === todayStr;
    const isSelected = state.calSelected === dStr;
    const exps  = expByDay[day]  || [];
    const tsks  = taskByDay[day] || [];
    const dots  = [
      ...exps.map(() => `<div class="cal-day-dot expense"></div>`),
      ...tsks.map(() => `<div class="cal-day-dot task"></div>`),
    ].slice(0, 6).join('');

    html += `
      <div class="cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}"
           data-date="${dStr}" onclick="selectCalDay('${dStr}')">
        <div class="cal-day-num">${day}</div>
        <div class="cal-day-dots">${dots}</div>
      </div>`;
  }

  grid.innerHTML = html;
}

function selectCalDay(dateStr) {
  state.calSelected = dateStr;
  renderCalendar();

  const expenses = getExpenses().filter(e => e.date === dateStr);
  const tasks    = getTasks().filter(t => t.dueDate === dateStr);
  const title    = document.getElementById('calEventsTitle');
  const list     = document.getElementById('calEventsList');

  title.textContent = `Eventos del ${formatDate(dateStr)}`;

  if (!expenses.length && !tasks.length) {
    list.innerHTML = '<p class="cal-events-empty">Sin eventos para este día.</p>';
    return;
  }

  list.innerHTML = [
    ...expenses.map(e => `
      <div class="cal-event-item">
        <div class="cal-event-type expense"></div>
        <span class="cal-event-name">${escHtml(e.description)} <small style="color:var(--light)">${escHtml(e.category)}</small></span>
        <span class="cal-event-amount">${clp(e.amount)}</span>
      </div>`),
    ...tasks.map(t => `
      <div class="cal-event-item">
        <div class="cal-event-type task"></div>
        <span class="cal-event-name">${escHtml(t.title)}</span>
        <span class="task-cat-badge ${t.category}">${t.category === 'empresa' ? 'Empresa' : 'Personal'}</span>
      </div>`),
  ].join('');
}

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
          ticks: { callback: v => '$' + v.toLocaleString('es-CL') },
        },
      },
    },
  });

  // Category pie
  destroyChart('category');
  const catTotals = {};
  expenses.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const catKeys  = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]).slice(0, 8);
  const catVals  = catKeys.map(k => catTotals[k]);
  const palette  = ['#2563eb','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d'];

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
          ticks: { callback: v => '$' + v.toLocaleString('es-CL') },
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

// ── Init & Events ────────────────────────────────────

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
  ].map(e => ({ id: uid(), type: 'personal', createdAt: new Date().toISOString(), ...e }));

  const existing = getExpenses();
  saveExpenses([...existing, ...entries]);
}

function init() {
  if (localStorage.getItem('gestipyme_version') !== APP_VERSION) {
    Object.values(STORAGE).forEach(k => localStorage.removeItem(k));
    seedInitialData();
    localStorage.setItem('gestipyme_version', APP_VERSION);
  }

  if (!localStorage.getItem('gestipyme_import_bdc_apr26')) {
    importBdcApr26();
    localStorage.setItem('gestipyme_import_bdc_apr26', '1');
  }

  // Date
  const now  = new Date();
  const days = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  document.getElementById('topbarDate').textContent =
    `${days[now.getDay()]}, ${now.getDate()} de ${months[now.getMonth()]} ${now.getFullYear()}`;

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
    ['expenseModal', 'taskModal', 'diaryModal', 'ruleModal', 'videoModal', 'videoDetailModal'].forEach(id => {
      if (document.getElementById(id).classList.contains('open')) closeModal(id);
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
};

const AI_SYSTEM = () => `Eres el asistente financiero de GestiónPyme, una app para emprendedores chilenos.
Tu único trabajo es ayudar a registrar gastos y tareas a través de lenguaje natural.
Responde SOLO con JSON válido, sin texto adicional, sin markdown.

Para un GASTO devuelve exactamente:
{"action":"expense","description":"...","amount":50000,"expenseType":"empresa|personal","category":"...","date":"YYYY-MM-DD","notes":""}

Para una TAREA devuelve exactamente:
{"action":"task","title":"...","priority":"low|medium|high","category":"empresa|personal","dueDate":"YYYY-MM-DD|null","description":""}

Para consultas o dudas devuelve:
{"action":"chat","message":"respuesta corta en español"}

Reglas importantes:
- Hoy es ${today()}. Usa esta fecha si el usuario no especifica.
- La moneda es CLP (pesos chilenos). "50k" o "50 mil" = 50000.
- empresa = gasto laboral/negocio. personal = gasto personal.
- Categorías empresa: Marketing, Tecnología, Oficina y Suministros, Personal / RRHH, Ventas, Logística, Impuestos y Contabilidad, Servicios Profesionales, Arriendo, Otros Empresa.
- Categorías personal: Alimentación, Transporte, Vivienda, Salud, Educación, Entretenimiento, Ropa y Calzado, Servicios Básicos, Ahorro / Inversión, Otros Personal.
- Si el usuario dice "almuerzo", "comida" → Alimentación (personal) u Oficina y Suministros (empresa).
- Si falta info esencial (monto, descripción), devuelve {"action":"chat","message":"..."} pidiendo el dato.`;

function aiGetKey() {
  return localStorage.getItem('gestipyme_api_key') || '';
}

function aiSetKey(key) {
  localStorage.setItem('gestipyme_api_key', key.trim());
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

  if (data.action === 'expense') {
    card.innerHTML = `
      <div class="ai-preview-type expense">Nuevo Gasto</div>
      <div class="ai-preview-row"><span class="ai-preview-label">Descripción</span><span class="ai-preview-val">${escHtml(data.description)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Monto</span><span class="ai-preview-val" style="color:var(--empresa);font-size:1.05rem">${clp(data.amount)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Tipo</span><span class="ai-preview-val">${data.expenseType === 'empresa' ? 'Empresa' : 'Personal'}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Categoría</span><span class="ai-preview-val">${escHtml(data.category)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Fecha</span><span class="ai-preview-val">${formatDate(data.date)}</span></div>
      ${data.notes ? `<div class="ai-preview-row"><span class="ai-preview-label">Notas</span><span class="ai-preview-val">${escHtml(data.notes)}</span></div>` : ''}
    `;
  } else if (data.action === 'task') {
    const pLabel = { high: 'Alta', medium: 'Media', low: 'Baja' };
    card.innerHTML = `
      <div class="ai-preview-type task">Nueva Tarea</div>
      <div class="ai-preview-row"><span class="ai-preview-label">Título</span><span class="ai-preview-val">${escHtml(data.title)}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Prioridad</span><span class="ai-preview-val">${pLabel[data.priority] || data.priority}</span></div>
      <div class="ai-preview-row"><span class="ai-preview-label">Tipo</span><span class="ai-preview-val">${data.category === 'empresa' ? 'Empresa' : 'Personal'}</span></div>
      ${data.dueDate ? `<div class="ai-preview-row"><span class="ai-preview-label">Vence</span><span class="ai-preview-val">${formatDate(data.dueDate)}</span></div>` : ''}
      ${data.description ? `<div class="ai-preview-row"><span class="ai-preview-label">Desc.</span><span class="ai-preview-val">${escHtml(data.description)}</span></div>` : ''}
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
    const tasks = getTasks();
    tasks.push({
      id: uid(),
      title: data.title,
      description: data.description || '',
      priority: data.priority,
      category: data.category,
      dueDate: data.dueDate || '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    saveTasks(tasks);
    renderKanban();
    renderDashboard();
    aiAppendMsg('bot', `✅ Tarea agregada: "${data.title}"`);
  }

  aiHidePreview();
}

function aiEditBeforeConfirm() {
  const data = AI.pending;
  if (!data) return;
  aiHidePreview();

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
        max_tokens: 400,
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

    if (parsed.action === 'expense' || parsed.action === 'task') {
      const preview = parsed.action === 'expense'
        ? `Encontré un gasto de ${clp(parsed.amount)}. ¿Lo guardo?`
        : `Encontré una tarea: "${parsed.title}". ¿La agrego?`;
      aiAppendMsg('bot', preview);
      aiShowPreview(parsed);
    } else {
      aiAppendMsg('bot', parsed.message || raw);
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
  aiAppendMsg('bot', '¡Hola! 👋 Puedo agregar gastos y tareas con lenguaje natural.\n\nEjemplos:\n• "gaste 45 mil en bencina personal"\n• "tarea revisar IVA de alta prioridad"\n• "almuerzo de empresa 28000"');

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

  document.getElementById('aiSettingsBtn').addEventListener('click', () => {
    document.getElementById('apiKeyInput').value = aiGetKey();
    openModal('aiKeyModal');
  });

  document.getElementById('aiGoSetKey').addEventListener('click', () => {
    document.getElementById('apiKeyInput').value = aiGetKey();
    openModal('aiKeyModal');
  });

  document.getElementById('saveApiKey').addEventListener('click', () => {
    const k = document.getElementById('apiKeyInput').value.trim();
    if (!k) { alert('Ingresa una API Key válida.'); return; }
    aiSetKey(k);
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
}

// ── Start ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => { init(); aiInit(); });
