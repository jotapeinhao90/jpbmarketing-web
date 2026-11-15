/* Diario emocional: captura, análisis, gráficos y herramientas de regulación.
   Depende de emo-core.js (EmoCore) y de las funciones globales de app.js. */
(function () {
  'use strict';
  const C = window.EmoCore;
  if (!C) return;

  const TOOLS_KEY = 'gestipyme_emo_tools';
  const SEED_KEY = 'gestipyme_emo_seeded';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => escHtml(String(s == null ? '' : s));
  const getTools = () => load(TOOLS_KEY);
  const saveTools = (d) => save(TOOLS_KEY, d);
  const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || '#888';
  const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const fmtDay = (s) => { const d = C.parseDate(s); return `${C.WEEKDAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`; };
  const sgn = (n) => (n > 0 ? '+' : '') + n;

  const ui = { range: 14, draft: null, charts: {}, tab: 'hoy', runner: null, mic: null };

  // ───────────────────────── Herramientas de regulación ─────────────────────────
  const TOOLS = {
    suspiro: { icon: '🌬️', name: 'Suspiro cíclico', min: 2, when: 'Ansiedad, estrés, tensión', src: 'Balban et al., 2023 (Cell Reports Medicine): 5 min/día mejoró el ánimo más que la meditación.' },
    tipp: { icon: '🧊', name: 'TIPP · reset corporal', min: 3, when: 'Activación muy alta, pánico, rabia intensa', src: 'DBT (Linehan): cambia la química del cuerpo en minutos.' },
    anclaje: { icon: '🖐️', name: 'Anclaje 5-4-3-2-1', min: 3, when: 'Mente acelerada, rumiación', src: 'Técnica de grounding sensorial (TCC / trauma).' },
    pensamientos: { icon: '🧠', name: 'Registro de pensamientos', min: 8, when: 'Pensamientos negativos o autocrítica', src: 'Terapia cognitiva (Beck, Burns).' },
    opuesta: { icon: '🔄', name: 'Acción opuesta', min: 4, when: 'Enojo, culpa o vergüenza que no calzan con los hechos', src: 'DBT (Linehan).' },
    activacion: { icon: '🚶', name: 'Activación conductual', min: 3, when: 'Desánimo, cansancio, apatía', src: 'Tratamiento con respaldo para ánimo bajo (Jacobson, Martell).' },
    volcado: { icon: '📝', name: 'Volcado mental', min: 5, when: 'Abrumo, demasiadas cosas en la cabeza', src: 'Descarga de memoria de trabajo + siguiente acción mínima (GTD).' },
    autocompasion: { icon: '💛', name: 'Autocompasión', min: 3, when: 'Culpa, vergüenza, errores', src: 'Neff; Terapia centrada en la compasión.' },
    stop: { icon: '✋', name: 'STOP · pausa', min: 1, when: 'Antes de reaccionar o responder enojado', src: 'DBT (Linehan).' },
  };
  const TOOL_ORDER = ['suspiro', 'stop', 'tipp', 'anclaje', 'pensamientos', 'opuesta', 'activacion', 'volcado', 'autocompasion'];

  // ───────────────────────── Datos ─────────────────────────
  function diaryEntries() { return getDiary().filter((e) => e && e.date); }
  function entryByDate(d) { return diaryEntries().find((e) => e.date === d); }
  function analytics(range) { return C.computeAnalytics(diaryEntries(), getTools(), range == null ? ui.range : range, today()); }

  function upsertEntry(entry) {
    const all = getDiary();
    const i = all.findIndex((e) => e.date === entry.date && !e.demo === !entry.demo);
    const j = i === -1 ? all.findIndex((e) => e.date === entry.date) : i;
    if (j !== -1) { entry.id = all[j].id; entry.createdAt = all[j].createdAt || entry.createdAt; all[j] = entry; } else all.push(entry);
    saveDiary(all);
  }

  // ───────────────────────── Demo ─────────────────────────
  const DEMO = [
    ['2026-10-02', 'Día tranquilo. Dormí 7 horas y desperté con energía. Avancé harto con el informe del título y quedé contento con la introducción. Almorcé con mi mamá y me sentí agradecido de tenerla cerca. Tengo que enviar la propuesta a Fierros Idini el lunes. Gasté 12 mil en almuerzo.', { stress: 3 }],
    ['2026-10-03', 'Día fome. Dormí 8 horas pero me quedé sin ganas, aburrido en la casa. Salí a caminar al final de la tarde y me sentí mejor, más tranquilo. Quiero retomar el gimnasio. Tengo que revisar los gastos de la empresa.', { stress: 3 }],
    ['2026-10-04', 'Me desperté con ansiedad pensando en la semana. Muy preocupado por la plata, el SII y las facturas pendientes. Siempre me pasa lo mismo los domingos, se me junta todo. Dormí 6 horas. Tengo que llamar a Polimer el lunes y preparar la reunión con Pablo. Me sentí abrumado, demasiadas cosas.', { stress: 7 }],
    ['2026-10-05', 'Día pesado. Dormí 5 horas, me sentía agotado y de mal humor. Discutí con un cliente por una cotización y quedé frustrado y enojado. Seguro que piensa que soy desordenado. Es mi culpa por no haber confirmado antes. Tengo que responder las cotizaciones de Conflex mañana.', { stress: 8 }],
    ['2026-10-06', 'Dormí 5 horas otra vez. Todo me sale mal, no avanzo con el informe y me siento inseguro, un fracaso. Estresado por el plazo de la entrega. Me sentí solo, nadie entiende la presión. Tengo que terminar el Excel el jueves. Hice el suspiro cíclico y me bajó la tensión. Gasté 8 mil en café.', { stress: 9 }],
    ['2026-10-07', 'Mejor día. Dormí 7 horas. Hice la respiración en la mañana y salí a trotar. Logré terminar el Excel y me sentí orgulloso y aliviado. Hablé con mi pareja y me sentí querido. Tengo que enviar el informe al profe el viernes.', { stress: 4 }],
    ['2026-10-08', 'Buen día de trabajo, motivado y enfocado. Dormí 8 horas. Cerré la reunión con Pablo de los pallets, estoy entusiasmado y con esperanza. Fui al gimnasio. Agradezco el apoyo de mis amigos. Tengo que coordinar la campaña de Conflex.', { stress: 3 }],
    ['2026-10-09', 'Día mixto. Dormí 6 horas. Entregué el informe y quedé aliviado, pero la profe me dio varios comentarios y me sentí decepcionado y con vergüenza. Debería haberlo revisado mejor. Salí a carretear con amigos y la pasé bien, me reí harto.', { stress: 5 }],
    ['2026-10-10', 'Descansé, dormí 9 horas. Día tranquilo y en paz, vi una serie y almorcé en familia. Algo de cansancio pero contento. Me siento agradecido. Quiero planificar la semana el domingo.', { stress: 2 }],
    ['2026-10-11', 'Me sentí un poco inquieto por la semana pero con más calma que el domingo pasado. Hice el volcado mental y armé la lista. Dormí 7 horas. Tengo que llamar a Inversiones Zambrano mañana y preparar la propuesta de Fierros Idini. Motivado.', { stress: 4 }],
  ];
  const DEMO_SESSIONS = [
    ['2026-10-04', 'volcado', 8, 5], ['2026-10-05', 'stop', 7, 5], ['2026-10-06', 'suspiro', 8, 5],
    ['2026-10-06', 'pensamientos', 7, 5], ['2026-10-07', 'suspiro', 5, 2], ['2026-10-09', 'autocompasion', 7, 4],
    ['2026-10-11', 'volcado', 6, 3], ['2026-10-03', 'activacion', 6, 4],
  ];

  function demoEntries() {
    return DEMO.map(([date, text, man]) => {
      const emo = C.buildEntryEmo({ stress: man.stress, source: 'demo' }, text, date);
      emo.tasks.forEach((t) => { t.added = true; });
      return { id: 'demo-' + date, date, mood: C.valenceToEmoji(emo.valence), title: '', content: text, emo, demo: true, createdAt: date + 'T22:30:00.000Z' };
    });
  }
  function loadDemo(force) {
    const have = new Set(getDiary().map((e) => e.id));
    const add = demoEntries().filter((e) => !have.has(e.id) && !entryByDate(e.date));
    if (add.length) saveDiary(getDiary().concat(add));
    const tools = getTools();
    if (!tools.some((t) => t.demo)) {
      saveTools(tools.concat(DEMO_SESSIONS.map(([date, tool, before, after], i) => ({ id: 'demo-s' + i, kind: 'session', tool, date, before, after, demo: true, createdAt: date + 'T20:00:00.000Z' }))));
    }
    if (force) render();
  }
  async function clearDemo() {
    if (!(await appConfirm('¿Quitar los 10 días de prueba? No toca tus entradas reales.'))) return;
    saveDiary(getDiary().filter((e) => !e.demo));
    saveTools(getTools().filter((t) => !t.demo));
    render();
    if (typeof renderDiary === 'function') renderDiary();
  }
  function seedOnce() {
    try {
      if (localStorage.getItem(SEED_KEY)) return;
      localStorage.setItem(SEED_KEY, '1');
      if (!getDiary().some((e) => e.emo)) loadDemo(false);
    } catch (e) { /* sin storage */ }
  }

  // ───────────────────────── Estructura de pestañas ─────────────────────────
  function setupTabs() {
    const nav = $('diaryTabNav');
    if (!nav || $('diaryTabHoy')) return;
    nav.insertAdjacentHTML('afterbegin',
      '<button class="ftab active" data-diary-tab="hoy">🧠 Contame tu día</button>' +
      '<button class="ftab" data-diary-tab="analisis">📊 Análisis</button>' +
      '<button class="ftab" data-diary-tab="herramientas">🧰 Herramientas</button>');
    nav.querySelector('[data-diary-tab="entradas"]').classList.remove('active');
    $('diaryTabEntradas').style.display = 'none';
    $('diaryTabEntradas').insertAdjacentHTML('beforebegin',
      '<div id="diaryTabHoy" class="emo-pane"></div><div id="diaryTabAnalisis" class="emo-pane" style="display:none"></div><div id="diaryTabHerramientas" class="emo-pane" style="display:none"></div>');
    nav.querySelectorAll('[data-diary-tab]').forEach((btn) => btn.addEventListener('click', () => {
      ui.tab = btn.dataset.diaryTab;
      ['hoy', 'analisis', 'herramientas'].forEach((t) => { $('diaryTab' + t[0].toUpperCase() + t.slice(1)).style.display = ui.tab === t ? 'block' : 'none'; });
      render();
    }));
    const sub = document.querySelector('#page-diario .page-sub');
    if (sub) sub.textContent = 'Cuéntame tu día, entiende tus emociones y usa herramientas para regularlas';
  }

  function render() {
    if (!$('diaryTabHoy')) return;
    if (ui.tab === 'hoy') renderHoy();
    else if (ui.tab === 'analisis') renderAnalisis();
    else if (ui.tab === 'herramientas') renderHerramientas();
  }

  // ───────────────────────── Pestaña HOY ─────────────────────────
  function promptOfDay() { return C.PROMPTS[Math.floor(C.parseDate(today()) / 864e5) % C.PROMPTS.length]; }

  function followUps() {
    const t = today(), from = C.addDays(t, -4);
    const tasks = getTasks();
    const out = [];
    diaryEntries().filter((e) => e.date >= from && e.date < t && e.emo).forEach((e) => {
      (e.emo.tasks || []).forEach((x) => {
        if (!x.added) return;
        const task = tasks.find((k) => k.id === x.taskId);
        if (task && task.status !== 'done') out.push({ title: task.title, date: e.date, due: task.dueDate });
      });
    });
    return out.slice(0, 4);
  }

  function renderHoy() {
    const el = $('diaryTabHoy');
    const d = ui.draft;
    const dateVal = d ? d.date : today();
    const existing = entryByDate(dateVal);
    const hasReal = diaryEntries().some((e) => !e.demo);
    const demoOn = diaryEntries().some((e) => e.demo);
    const fu = followUps();
    const a = analytics(7);
    el.innerHTML = `
      <div class="emo-hero card">
        <div class="emo-hero-top">
          <div>
            <h2 class="emo-h2">${d ? 'Revisa lo que entendí' : 'Cuéntame cómo te fue hoy'}</h2>
            <p class="emo-sub">Escribe o dicta con libertad: qué pasó, cómo te sentiste, cuánto dormiste, qué tienes que hacer. Yo ordeno las emociones, las tareas y los gastos.</p>
          </div>
          ${a.load ? loadBadge(a.load) : ''}
        </div>
        ${fu.length ? `<div class="emo-followup">📌 <strong>Quedó pendiente de días anteriores:</strong> ${fu.map((f) => `${esc(f.title)} <span class="emo-dim">(dijiste el ${fmtDay(f.date)})</span>`).join(' · ')}</div>` : ''}
        ${d ? renderPreview(d) : renderCapture(dateVal, existing)}
      </div>
      <div class="emo-footer-row">
        <span class="emo-dim">${demoOn ? '🧪 Hay 10 días de prueba cargados (2–11 oct).' : (hasReal ? '' : 'Aún no hay entradas.')}</span>
        ${demoOn ? '<button class="btn btn-outline btn-sm" id="emoClearDemo">Quitar datos de prueba</button>' : '<button class="btn btn-outline btn-sm" id="emoLoadDemo">Cargar 10 días de prueba</button>'}
      </div>
      ${disclaimer()}`;
    wireHoy();
  }

  function loadBadge(l) {
    const col = l.score < 35 ? 'var(--success)' : l.score < 60 ? 'var(--warning)' : 'var(--danger)';
    return `<div class="emo-load" title="Mezcla de estrés, deuda de sueño, ánimo y energía de los últimos 5 días"><div class="emo-load-n" style="color:${col}">${l.score}</div><div class="emo-load-l">Carga ${l.label.toLowerCase()}<br><span class="emo-dim">últimos 5 días</span></div></div>`;
  }

  function renderCapture(dateVal, existing) {
    return `
      <div class="emo-row">
        <label class="emo-lbl">Día</label>
        <input type="date" id="emoDate" class="form-control emo-date" value="${dateVal}" max="${today()}">
        ${existing ? '<span class="emo-dim">Ya hay una entrada: al guardar se reemplaza.</span>' : ''}
      </div>
      <div class="emo-prompt">💭 ${esc(promptOfDay())}</div>
      <div class="emo-textwrap">
        <textarea id="emoText" class="form-control emo-text" rows="7" placeholder="Hoy dormí 6 horas, me sentí... Tengo que llamar a... Gasté...">${existing && !existing.demo ? esc(existing.content) : ''}</textarea>
        <button type="button" class="ai-mic emo-mic" id="emoMic" title="Dictar">🎤</button>
      </div>
      <div class="emo-actions">
        <button class="btn btn-primary" id="emoAnalyze">🔍 Analizar mi día</button>
        <button class="btn btn-outline" id="emoManual">Prefiero elegir las emociones a mano</button>
      </div>`;
  }

  function emoChip(e, removable) {
    const def = C.EMO_BY_KEY[e.k];
    if (!def) return '';
    const fam = C.FAMILIES[def.fam];
    return `<span class="emo-chip" style="--c:${fam.color}" data-k="${e.k}">${esc(def.label)} <b>${e.i}</b>${removable ? `<button class="emo-x" data-rm="${e.k}" title="Quitar">×</button>` : ''}${e.auto ? '<i title="Detectada del texto">✦</i>' : ''}</span>`;
  }

  function renderPreview(d) {
    const emo = d.emo;
    const crisis = emo.crisis || d.crisis;
    const emoSorted = emo.emotions.slice().sort((x, y) => y.i - x.i);
    const recs = C.recommend({ emotions: emo.emotions, stress: emo.stress, energy: emo.energy, distortions: emo.distortions });
    return `
      ${crisis ? `<div class="emo-crisis">💛 ${esc(C.CRISIS_MESSAGE)}</div>` : ''}
      <div class="emo-prev-text">${esc(d.text)} <button class="btn-link" id="emoBack">editar texto</button></div>
      <div class="emo-block"><div class="emo-lbl">Emociones que detecté <span class="emo-dim">(quita las que no, agrega las que faltan)</span></div>
        <div class="emo-chips" id="emoChips">${emoSorted.map((e) => emoChip(e, true)).join('') || '<span class="emo-dim">No detecté emociones claras; elígelas abajo.</span>'}</div>
        <details class="emo-add"><summary>+ Agregar emoción</summary>
          <div class="emo-wheel">${C.FAMILY_ORDER.map((f) => `<div class="emo-fam"><div class="emo-fam-t" style="color:${C.FAMILIES[f].color}">${C.FAMILIES[f].label}</div>${C.EMOTIONS.filter((e) => e.fam === f).map((e) => `<button class="emo-pick" data-add="${e.k}" style="--c:${C.FAMILIES[f].color}">${esc(e.label)}</button>`).join('')}</div>`).join('')}</div>
        </details>
      </div>
      <div class="emo-sliders">
        ${slider('emoVal', 'Ánimo del día', -5, 5, 0.5, emo.valence, (v) => `${C.valenceToEmoji(v)} ${sgn(v)}`)}
        ${slider('emoEn', 'Energía', 1, 10, 0.5, emo.energy)}
        ${slider('emoStr', 'Estrés', 1, 10, 0.5, emo.stress)}
        ${slider('emoSleep', 'Horas de sueño', 0, 12, 0.5, emo.sleepH == null ? 7 : emo.sleepH, (v) => `${v} h${emo.sleepH == null ? ' (sin dato)' : ''}`)}
      </div>
      ${emo.tasks.length ? `<div class="emo-block"><div class="emo-lbl">📋 Cosas que tienes que hacer <span class="emo-dim">(van a Tareas con su fecha)</span></div>
        ${emo.tasks.map((t, i) => `<label class="emo-task"><input type="checkbox" data-task="${i}" ${t.added === false || t.added == null ? 'checked' : ''}> <span>${esc(t.title)}</span> <input type="date" class="emo-task-date" data-taskdate="${i}" value="${t.due}"> ${t.inferred ? '<span class="emo-dim" title="No dijiste fecha; puse mañana">fecha sugerida</span>' : ''}</label>`).join('')}</div>` : ''}
      ${emo.expenses.length ? `<div class="emo-block"><div class="emo-lbl">💸 Gastos que mencionaste</div>
        ${emo.expenses.map((x, i) => `<label class="emo-task"><input type="checkbox" data-exp="${i}" checked> <span>${esc(x.description)}</span> <b>${fmtPesos(x.amount, true)}</b></label>`).join('')}</div>` : ''}
      ${emo.distortions.length ? `<div class="emo-block"><div class="emo-lbl">🧩 Patrones de pensamiento que noté</div>
        ${emo.distortions.map((x) => { const D = C.DISTORTIONS[x.k]; return `<div class="emo-dist"><b>${D.label}</b> · <em>"${esc(x.q)}"</em><div class="emo-dim">${D.desc} ${esc(D.reframe)}</div></div>`; }).join('')}</div>` : ''}
      <div class="emo-insight">💡 ${esc(emo.insight)}</div>
      <div class="emo-block"><div class="emo-lbl">🧰 Para ahora, esto te puede servir</div>
        <div class="emo-recs">${recs.map((r) => `<button class="emo-rec" data-tool="${r.id}"><span>${TOOLS[r.id].icon}</span><div><b>${TOOLS[r.id].name}</b><div class="emo-dim">${esc(r.why)}</div></div></button>`).join('')}</div>
      </div>
      <div class="emo-actions"><button class="btn btn-primary" id="emoSave">✅ Guardar el día</button><button class="btn btn-outline" id="emoCancel">Cancelar</button></div>`;
  }

  function slider(id, label, min, max, step, val, fmt) {
    const shown = fmt ? fmt(val) : val;
    return `<div class="emo-sl"><div class="emo-sl-top"><span>${label}</span><b id="${id}V">${shown}</b></div><input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
  }

  function disclaimer() {
    return `<div class="emo-disc">Esta herramienta es de autoconocimiento y no reemplaza a un profesional de salud mental. Si estás en crisis: <b>*4141</b> (prevención del suicidio, gratis 24/7) o <b>Salud Responde 600 360 7777</b>.</div>`;
  }

  function wireHoy() {
    const el = $('diaryTabHoy');
    const on = (id, fn) => { const n = $(id); if (n) n.addEventListener('click', fn); };
    on('emoLoadDemo', () => { loadDemo(true); });
    on('emoClearDemo', clearDemo);
    on('emoAnalyze', () => {
      const text = $('emoText').value.trim();
      if (!text) { $('emoText').focus(); return; }
      startDraft(text);
    });
    on('emoManual', () => { startDraft($('emoText').value.trim() || ' ', true); });
    on('emoBack', () => { const t = ui.draft.text; ui.draft = null; renderHoy(); $('emoText').value = t; });
    on('emoCancel', () => { ui.draft = null; renderHoy(); });
    on('emoSave', saveDraft);
    const mic = $('emoMic');
    if (mic) setupMic(mic, $('emoText'));
    const dt = $('emoDate'); if (dt) dt.addEventListener('change', () => { ui.date = dt.value; });
    el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', () => { syncDraft(); ui.draft.emo.emotions = ui.draft.emo.emotions.filter((e) => e.k !== b.dataset.rm); renderHoy(); }));
    el.querySelectorAll('[data-add]').forEach((b) => b.addEventListener('click', () => {
      syncDraft();
      const k = b.dataset.add, emos = ui.draft.emo.emotions;
      if (!emos.some((e) => e.k === k)) emos.push({ k, i: 60, auto: false });
      recalcDraft(); renderHoy();
    }));
    el.querySelectorAll('.emo-chip').forEach((c) => c.addEventListener('click', (ev) => {
      if (ev.target.closest('.emo-x')) return;
      const e = ui.draft.emo.emotions.find((x) => x.k === c.dataset.k);
      if (!e) return;
      syncDraft();
      e.i = e.i >= 100 ? 20 : e.i + 20; e.auto = false;
      recalcDraft(); renderHoy();
    }));
    [['emoVal', (v) => `${C.valenceToEmoji(v)} ${sgn(v)}`], ['emoEn'], ['emoStr'], ['emoSleep', (v) => `${v} h`]].forEach(([id, f]) => {
      const r = $(id); if (!r) return;
      r.addEventListener('input', () => { $(id + 'V').textContent = f ? f(Number(r.value)) : r.value; });
    });
    el.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => openTool(b.dataset.tool)));
  }

  function startDraft(text, manual) {
    const date = ($('emoDate') && $('emoDate').value) || today();
    const emo = C.buildEntryEmo({}, manual ? '' : text, date);
    emo.tasks = C.analyzeText(text, { today: date }).tasks.map((t) => ({ ...t, added: false }));
    emo.expenses = C.analyzeText(text, { today: date }).expenses.map((x) => ({ ...x, added: false }));
    emo.distortions = C.analyzeText(text, { today: date }).distortions;
    ui.draft = { date, text: manual ? '' : text, emo, crisis: C.detectCrisis(text), manual: !!manual };
    if (manual) ui.draft.text = '(sin texto: elegiste las emociones a mano)';
    renderHoy();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Lee los sliders y recalcula el resumen cuando se cambian emociones
  function syncDraft() {
    const d = ui.draft; if (!d) return;
    const g = (id) => ($(id) ? Number($(id).value) : null);
    if (g('emoVal') != null) { d.emo.valence = g('emoVal'); d.emo.energy = g('emoEn'); d.emo.stress = g('emoStr'); const s = g('emoSleep'); d.emo.sleepH = (d.emo.sleepH == null && s === 7) ? null : s; }
    document.querySelectorAll('[data-task]').forEach((c) => { const t = d.emo.tasks[Number(c.dataset.task)]; if (t) t.added = !c.checked ? 'skip' : false; });
    document.querySelectorAll('[data-taskdate]').forEach((c) => { const t = d.emo.tasks[Number(c.dataset.taskdate)]; if (t) t.due = c.value; });
    document.querySelectorAll('[data-exp]').forEach((c) => { const t = d.emo.expenses[Number(c.dataset.exp)]; if (t) t.added = !c.checked ? 'skip' : false; });
  }
  function recalcDraft() {
    const d = ui.draft, emo = d.emo;
    let w = 0, v = 0, ar = 0;
    emo.emotions.forEach((e) => { const def = C.EMO_BY_KEY[e.k]; const k = e.i / 100; w += k; v += k * def.v; ar += k * def.a; });
    if (w > 0) { emo.valence = C.round1(C.clamp((v / w) * 5, -5, 5)); emo.energy = C.round1(C.clamp(1 + 9 * (ar / w), 1, 10)); }
    emo.perma = C.estimatePerma(emo);
    emo.insight = C.buildInsight(emo, d.date);
  }

  function saveDraft() {
    syncDraft();
    const d = ui.draft, emo = d.emo;
    emo.perma = C.estimatePerma(emo);
    emo.insight = C.buildInsight(emo, d.date);
    // tareas → Tareas
    const tasks = getTasks();
    emo.tasks.forEach((t) => {
      if (t.added === 'skip') { t.added = false; return; }
      const rec = { id: uid(), title: t.title, description: 'Desde mi diario del ' + d.date, priority: 'medium', category: 'empresa', dueDate: t.due, dueTime: t.time || '09:00', status: 'pending', createdAt: new Date().toISOString(), reminderEnabled: false, reminders: [], source: 'diario' };
      tasks.push(rec); t.added = true; t.taskId = rec.id;
    });
    saveTasks(tasks);
    // gastos → Gastos
    const exps = getExpenses();
    emo.expenses.forEach((x) => {
      if (x.added === 'skip') { x.added = false; return; }
      const rec = { id: uid(), description: x.description, amount: x.amount, type: 'personal', category: 'Otros Personal', date: d.date, notes: 'Mencionado en el diario', source: 'diario', createdAt: new Date().toISOString() };
      exps.push(rec); x.added = true; x.expenseId = rec.id;
    });
    saveExpenses(exps);
    const entry = { id: uid(), date: d.date, mood: C.valenceToEmoji(emo.valence), title: '', content: d.manual ? '' : d.text, emo, createdAt: new Date().toISOString() };
    upsertEntry(entry);
    ui.draft = null;
    if (typeof renderKanban === 'function') renderKanban();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderDiary === 'function') renderDiary();
    renderHoy();
    toastEmo('Día guardado ✅ Tareas y gastos enviados a su lugar.');
  }

  function toastEmo(msg) {
    let t = $('emoToast');
    if (!t) { t = document.createElement('div'); t.id = 'emoToast'; t.className = 'emo-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3200);
  }

  function setupMic(btn, target) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { btn.style.display = 'none'; return; }
    btn.addEventListener('click', () => {
      if (ui.mic) { ui.mic.stop(); return; }
      const rec = new SR();
      rec.lang = 'es-CL'; rec.continuous = true; rec.interimResults = false;
      rec.onresult = (ev) => {
        for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) target.value += (target.value && !/\s$/.test(target.value) ? ' ' : '') + ev.results[i][0].transcript.trim() + '.';
      };
      rec.onend = () => { ui.mic = null; btn.classList.remove('recording'); };
      rec.onerror = () => { ui.mic = null; btn.classList.remove('recording'); };
      ui.mic = rec; btn.classList.add('recording'); rec.start();
    });
  }

  // ───────────────────────── Pestaña ANÁLISIS ─────────────────────────
  function renderAnalisis() {
    const el = $('diaryTabAnalisis');
    Object.values(ui.charts).forEach((c) => { try { c.destroy(); } catch (e) { /* noop */ } });
    ui.charts = {};
    const a = analytics();
    const pill = (r, l) => `<button class="ftab ${ui.range === r ? 'active' : ''}" data-range="${r}">${l}</button>`;
    if (!a.n) {
      el.innerHTML = `<div class="card emo-empty"><div style="font-size:42px">🌱</div><h3>Aún no hay datos para analizar</h3><p class="emo-dim">Cuéntame tu día en la primera pestaña, o carga los 10 días de prueba.</p></div>`;
      return;
    }
    const k = a.kpi;
    const dv = k.valencePrev != null ? C.round1(k.valence - k.valencePrev) : null;
    el.innerHTML = `
      <div class="emo-range filter-tabs">${pill(7, '7 días')}${pill(14, '14 días')}${pill(30, '30 días')}${pill('all', 'Todo')}</div>
      <div class="emo-kpis">
        ${kpi('Ánimo promedio', `${C.valenceToEmoji(k.valence)} ${sgn(k.valence)}`, dv != null ? `${dv >= 0 ? '▲' : '▼'} ${Math.abs(dv)} vs período anterior` : `${a.n} días registrados`, dv == null ? '' : dv >= 0 ? 'good' : 'bad')}
        ${kpi('Energía', k.energy + '/10', '')}
        ${kpi('Estrés', k.stress + '/10', k.stress >= 6.5 ? 'alto' : k.stress <= 4 ? 'bajo' : 'medio', k.stress >= 6.5 ? 'bad' : 'good')}
        ${kpi('Sueño', k.sleep == null ? '—' : k.sleep + ' h', k.sleep != null && k.sleep < 7 ? 'bajo lo ideal (7–9 h)' : '', k.sleep != null && k.sleep < 6.5 ? 'bad' : '')}
        ${kpi('Constancia', `🔥 ${a.streak} ${a.streak === 1 ? 'día' : 'días'}`, `${k.consistency}% de los días`, '')}
      </div>
      <div class="card emo-card"><h3 class="emo-h3">💡 Lo que veo en tus datos</h3>
        <div class="emo-insights">${a.insights.map((i) => `<div class="emo-ins ${i.kind}"><span>${i.icon}</span><div>${esc(i.text)}</div></div>`).join('')}</div>
        <div class="emo-dim" style="margin-top:8px">Correlaciones calculadas sobre tus propios días; con pocos días son orientativas, no causales.</div>
      </div>
      <div class="emo-grid2">
        <div class="card emo-card emo-wide"><h3 class="emo-h3">📈 Tu semana emocional</h3><div class="emo-chart"><canvas id="chTime"></canvas></div></div>
        <div class="card emo-card"><h3 class="emo-h3">🗺️ Mapa emocional</h3><div class="emo-dim">Cada punto es un día: derecha = agradable, arriba = activado.</div><div class="emo-chart sq"><canvas id="chCirc"></canvas></div></div>
        <div class="card emo-card"><h3 class="emo-h3">🎡 Rueda de emociones</h3><div class="emo-chart sq"><canvas id="chWheel"></canvas></div></div>
        <div class="card emo-card"><h3 class="emo-h3">🗓️ Mapa de calor</h3>${heatmap(a)}</div>
        <div class="card emo-card"><h3 class="emo-h3">🌈 Bienestar (PERMA)</h3><div class="emo-dim">Estimado desde tus relatos: placer, compromiso, relaciones, sentido, logro.</div><div class="emo-chart sq"><canvas id="chPerma"></canvas></div></div>
        <div class="card emo-card"><h3 class="emo-h3">😴 Sueño vs ánimo</h3><div class="emo-chart sq"><canvas id="chSleep"></canvas></div></div>
        <div class="card emo-card"><h3 class="emo-h3">🔝 Emociones más frecuentes</h3><div class="emo-chart"><canvas id="chTop"></canvas></div></div>
        <div class="card emo-card"><h3 class="emo-h3">🧲 Temas que mueven tu ánimo</h3>${themeBars(a)}</div>
        <div class="card emo-card"><h3 class="emo-h3">🧩 Patrones de pensamiento</h3>${distBlock(a)}</div>
        <div class="card emo-card"><h3 class="emo-h3">🫶 Necesidades detrás</h3>${needsBlock(a)}</div>
        <div class="card emo-card emo-wide"><h3 class="emo-h3">🔬 Tu perfil emocional</h3>${profile(a)}</div>
        <div class="card emo-card emo-wide"><h3 class="emo-h3">🧰 ¿Qué te ha funcionado?</h3>${toolsBlock(a)}</div>
        ${a.wins.length ? `<div class="card emo-card emo-wide"><h3 class="emo-h3">🏆 Logros que anotaste</h3><div class="emo-wins">${a.wins.slice(-6).reverse().map((w) => `<div><span class="emo-dim">${fmtDay(w.date)}</span> ${esc(w.text)}</div>`).join('')}</div></div>` : ''}
      </div>
      <div class="emo-footer-row"><span></span><button class="btn btn-outline btn-sm" id="emoOpenEntries">Ver calendario de entradas →</button></div>
      ${disclaimer()}`;
    el.querySelectorAll('[data-range]').forEach((b) => b.addEventListener('click', () => { ui.range = b.dataset.range === 'all' ? 'all' : Number(b.dataset.range); renderAnalisis(); }));
    const oe = $('emoOpenEntries'); if (oe) oe.addEventListener('click', () => document.querySelector('[data-diary-tab="entradas"]').click());
    drawCharts(a);
  }

  const kpi = (l, v, sub, cls) => `<div class="card emo-kpi"><div class="emo-kpi-l">${l}</div><div class="emo-kpi-v">${v}</div><div class="emo-kpi-s ${cls || ''}">${sub || '&nbsp;'}</div></div>`;

  function heatmap(a) {
    const todayStr = a.todayStr, days = a.range === 'all' ? Math.max(14, a.windowDays) : Math.max(a.range, 14);
    const n = Math.min(days, 42);
    const byDate = {}; a.series.forEach((d) => { byDate[d.date] = d; });
    const start = C.addDays(todayStr, -(n - 1));
    const startDow = (C.parseDate(start).getDay() + 6) % 7;
    let cells = '<div class="emo-hm-dow">' + ['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => `<span>${x}</span>`).join('') + '</div><div class="emo-hm">';
    for (let i = 0; i < startDow; i++) cells += '<span class="emo-hm-c empty"></span>';
    for (let i = 0; i < n; i++) {
      const ds = C.addDays(start, i), d = byDate[ds];
      cells += d ? `<span class="emo-hm-c" style="background:${valColor(d.valence)}" title="${fmtDay(ds)}: ${sgn(d.valence)}">${C.parseDate(ds).getDate()}</span>` : `<span class="emo-hm-c none" title="${fmtDay(ds)}: sin registro">${C.parseDate(ds).getDate()}</span>`;
    }
    return cells + '</div><div class="emo-hm-leg"><span>difícil</span><i style="background:' + valColor(-5) + '"></i><i style="background:' + valColor(-2) + '"></i><i style="background:' + valColor(0) + '"></i><i style="background:' + valColor(2) + '"></i><i style="background:' + valColor(5) + '"></i><span>bueno</span></div>';
  }
  function valColor(v) {
    const t = C.clamp(v / 5, -1, 1);
    const mix = (a, b, k) => Math.round(a + (b - a) * k);
    const neu = [233, 233, 238], pos = [52, 168, 110], neg = [226, 84, 78];
    const tgt = t >= 0 ? pos : neg, k = Math.abs(t) * 0.95;
    return `rgb(${mix(neu[0], tgt[0], k)},${mix(neu[1], tgt[1], k)},${mix(neu[2], tgt[2], k)})`;
  }

  function themeBars(a) {
    if (!a.themeEffects.length) return '<div class="emo-dim">Necesito que un tema aparezca en al menos 2 días.</div>';
    const max = Math.max(...a.themeEffects.map((t) => Math.abs(t.delta)), 1);
    return '<div class="emo-bars">' + a.themeEffects.map((t) => `<div class="emo-bar"><span class="emo-bar-l">${esc(C.THEMES[t.k].label)} <i>${t.n}d</i></span><div class="emo-bar-t"><div class="emo-bar-f ${t.delta < 0 ? 'neg' : 'pos'}" style="width:${Math.abs(t.delta) / max * 50}%;${t.delta < 0 ? 'right:50%' : 'left:50%'}"></div></div><b>${sgn(t.delta)}</b></div>`).join('') + '</div><div class="emo-dim">Diferencia de tu ánimo respecto a tu promedio cuando aparece ese tema.</div>';
  }
  function distBlock(a) {
    if (!a.distortionCounts.length) return '<div class="emo-dim">Sin patrones repetidos detectados. Buena señal 🙂</div>';
    return a.distortionCounts.slice(0, 4).map((d) => `<div class="emo-dist"><b>${C.DISTORTIONS[d.k].label}</b> <span class="emo-pill">${d.n}×</span><div class="emo-dim">${esc(C.DISTORTIONS[d.k].reframe)}</div></div>`).join('') + '<button class="btn btn-outline btn-sm" data-tool-open="pensamientos" style="margin-top:8px">Trabajar un pensamiento →</button>';
  }
  function needsBlock(a) {
    if (!a.needCounts.length) return '<div class="emo-dim">Aún no se repite ninguna.</div>';
    return '<div class="emo-needs">' + a.needCounts.slice(0, 6).map((n) => `<span class="emo-need">${esc(C.NEEDS[n.k].label)} <b>${n.n}</b></span>`).join('') + '</div><div class="emo-dim" style="margin-top:8px">Cada emoción difícil suele señalar una necesidad sin cubrir. Pregúntate: ¿qué puedo darme hoy de esto?</div>';
  }
  function profile(a) {
    const row = (l, v, d) => `<div class="emo-prof"><div class="emo-prof-l">${l}</div><div class="emo-prof-v">${v}</div><div class="emo-dim">${d}</div></div>`;
    const var_ = a.variability, ratio = a.posNeg.ratio;
    return '<div class="emo-prof-grid">' +
      row('Granularidad', `${a.granularity.perDay} <small>emociones/día</small>`, `${a.granularity.distinct} distintas en el período. Nombrar con precisión ayuda a regularse mejor.`) +
      row('Variabilidad', var_ == null ? '—' : C.round1(var_), var_ == null ? 'Faltan datos' : var_ >= 2.2 ? 'Tu ánimo oscila bastante entre días.' : 'Ánimo relativamente estable.') +
      row('Inercia', a.inertia == null ? '—' : C.round1(a.inertia), a.inertia == null ? 'Faltan datos' : a.inertia >= 0.5 ? 'Un día malo tiende a arrastrar al siguiente.' : 'Cada día se "resetea" bastante bien.') +
      row('Recuperación', a.recovery == null ? '—' : `${a.recovery} <small>días</small>`, 'Tiempo típico para volver a tu nivel tras un día bajo.') +
      row('Positivas : negativas', ratio == null ? '—' : `${ratio} : 1`, 'Proporción simple de intensidad. No hay un número mágico; úsalo como tendencia.') +
      '</div>';
  }
  function toolsBlock(a) {
    if (!a.toolStats.length) return '<div class="emo-dim">Cuando uses herramientas y marques tu malestar antes y después, aquí verás cuál te sirve más.</div>';
    return '<div class="emo-bars">' + a.toolStats.map((t) => `<div class="emo-bar"><span class="emo-bar-l">${(TOOLS[t.id] || {}).icon || ''} ${esc(C.toolName(t.id))} <i>${t.n}×</i></span><div class="emo-bar-t"><div class="emo-bar-f pos" style="left:0;width:${C.clamp(t.dropPct, 0, 100)}%"></div></div><b>−${t.dropPct}%</b></div>`).join('') + '</div><div class="emo-dim">Baja promedio de tu malestar (0–10) entre antes y después de usar cada herramienta.</div>';
  }

  function drawCharts(a) {
    if (typeof Chart === 'undefined') return;
    const txt = css('--body'), grid = 'rgba(128,128,140,.18)';
    Chart.defaults.color = txt; Chart.defaults.font.family = 'inherit';
    const labels = a.series.map((d) => fmtDay(d.date));
    const mk = (id, cfg) => { const c = $(id); if (c) ui.charts[id] = new Chart(c, cfg); };
    mk('chTime', {
      type: 'line',
      data: { labels, datasets: [
        { label: 'Ánimo (−5…+5)', data: a.series.map((d) => d.valence), borderColor: '#4F78D6', backgroundColor: 'rgba(79,120,214,.15)', fill: true, tension: .35, yAxisID: 'y', pointRadius: 4, borderWidth: 3 },
        { label: 'Energía', data: a.series.map((d) => d.energy - 5.5), borderColor: '#F29B3C', tension: .35, yAxisID: 'y', pointRadius: 2, borderWidth: 2, borderDash: [4, 3] },
        { label: 'Estrés', data: a.series.map((d) => -(d.stress - 5.5)), borderColor: '#E5534B', tension: .35, yAxisID: 'y', pointRadius: 2, borderWidth: 2, borderDash: [2, 3] },
      ] },
      options: { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (c) => { const d = a.series[c.dataIndex]; return c.datasetIndex === 0 ? `Ánimo: ${sgn(d.valence)}` : c.datasetIndex === 1 ? `Energía: ${d.energy}/10` : `Estrés: ${d.stress}/10 (eje invertido)`; } } } },
        scales: { y: { min: -5, max: 5, grid: { color: grid }, ticks: { stepSize: 2.5 } }, x: { grid: { display: false } } } },
    });
    const quad = { id: 'quad', afterDraw(ch) {
      const { ctx, chartArea: ar } = ch; ctx.save(); ctx.font = '11px sans-serif'; ctx.fillStyle = 'rgba(128,128,140,.8)';
      ctx.textAlign = 'left'; ctx.fillText('Tenso / alterado', ar.left + 6, ar.top + 14);
      ctx.textAlign = 'right'; ctx.fillText('Entusiasmado', ar.right - 6, ar.top + 14);
      ctx.fillText('Tranquilo / sereno', ar.right - 6, ar.bottom - 6);
      ctx.textAlign = 'left'; ctx.fillText('Apagado / triste', ar.left + 6, ar.bottom - 6);
      ctx.restore(); } };
    mk('chCirc', {
      type: 'scatter',
      data: { datasets: [{ data: a.series.map((d, i) => ({ x: d.valence / 5, y: (d.energy - 5.5) / 4.5, i })), backgroundColor: a.series.map((d) => valColor(d.valence)), borderColor: 'rgba(0,0,0,.35)', pointRadius: a.series.map((d, i) => 4 + (i === a.series.length - 1 ? 3 : 0)) }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtDay(a.series[c.raw.i].date) } } },
        scales: { x: { min: -1, max: 1, grid: { color: grid }, ticks: { display: false } }, y: { min: -1, max: 1, grid: { color: grid }, ticks: { display: false } } } },
      plugins: [quad],
    });
    const fams = C.FAMILY_ORDER, tot = fams.map((f) => a.famTotals[f] || 0), mx = Math.max(...tot, 1);
    mk('chWheel', {
      type: 'radar',
      data: { labels: fams.map((f) => C.FAMILIES[f].label), datasets: [{ data: tot.map((t) => Math.round(t / mx * 100)), backgroundColor: 'rgba(79,120,214,.25)', borderColor: '#4F78D6', pointBackgroundColor: fams.map((f) => C.FAMILIES[f].color), borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: grid }, angleLines: { color: grid } } } },
    });
    mk('chPerma', {
      type: 'radar',
      data: { labels: ['Placer', 'Compromiso', 'Relaciones', 'Sentido', 'Logro'], datasets: [{ data: ['p', 'e', 'r', 'm', 'a'].map((k) => a.perma[k]), backgroundColor: 'rgba(63,162,119,.25)', borderColor: '#3FA277', borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { r: { min: 0, max: 10, ticks: { display: false }, grid: { color: grid }, angleLines: { color: grid } } } },
    });
    mk('chSleep', {
      type: 'scatter',
      data: { datasets: [{ data: a.sleepPoints, backgroundColor: '#4F78D6', pointRadius: 5 }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${fmtDay(c.raw.date)}: ${c.raw.x} h → ánimo ${sgn(c.raw.y)}` } } },
        scales: { x: { title: { display: true, text: 'Horas de sueño' }, min: 3, max: 10, grid: { color: grid } }, y: { title: { display: true, text: 'Ánimo' }, min: -5, max: 5, grid: { color: grid } } } },
    });
    const top = Object.keys(a.emoTotals).map((k) => ({ k, v: a.emoTotals[k] })).sort((x, y) => y.v - x.v).slice(0, 8);
    mk('chTop', {
      type: 'bar',
      data: { labels: top.map((t) => C.EMO_BY_KEY[t.k].label), datasets: [{ data: top.map((t) => t.v), backgroundColor: top.map((t) => C.FAMILIES[C.EMO_BY_KEY[t.k].fam].color), borderRadius: 6 }] },
      options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: grid }, ticks: { display: false } }, y: { grid: { display: false } } } },
    });
    $('diaryTabAnalisis').querySelectorAll('[data-tool-open]').forEach((b) => b.addEventListener('click', () => openTool(b.dataset.toolOpen)));
  }

  // ───────────────────────── Pestaña HERRAMIENTAS ─────────────────────────
  function renderHerramientas() {
    const el = $('diaryTabHerramientas');
    const a = analytics(30);
    const last = diaryEntries().filter((e) => e.emo).sort((x, y) => y.date.localeCompare(x.date))[0];
    const recs = last ? C.recommend({ emotions: last.emo.emotions, stress: last.emo.stress, energy: last.emo.energy, distortions: last.emo.distortions }) : [];
    const sessions = getTools().filter((t) => t.kind === 'session').sort((x, y) => (y.date + y.createdAt).localeCompare(x.date + x.createdAt)).slice(0, 6);
    el.innerHTML = `
      <div class="card emo-card">
        <h3 class="emo-h3">🚨 Necesito calmarme ahora</h3>
        <div class="emo-sos">
          <button class="btn btn-primary" data-tool="suspiro">🌬️ Respirar 2 min</button>
          <button class="btn btn-outline" data-tool="anclaje">🖐️ Volver al presente</button>
          <button class="btn btn-outline" data-tool="tipp">🧊 Bajar el cuerpo (TIPP)</button>
          <button class="btn btn-outline" data-tool="stop">✋ Pausa antes de reaccionar</button>
        </div>
      </div>
      ${recs.length ? `<div class="card emo-card"><h3 class="emo-h3">🎯 Recomendado según tu último registro (${fmtDay(last.date)})</h3><div class="emo-recs">${recs.map((r) => `<button class="emo-rec" data-tool="${r.id}"><span>${TOOLS[r.id].icon}</span><div><b>${TOOLS[r.id].name}</b><div class="emo-dim">${esc(r.why)}</div></div></button>`).join('')}</div></div>` : ''}
      ${a.toolStats.length ? `<div class="card emo-card"><h3 class="emo-h3">⭐ Tu manual personal</h3>${toolsBlock(a)}</div>` : ''}
      <div class="card emo-card"><h3 class="emo-h3">Todas las herramientas</h3>
        <div class="emo-toolgrid">${TOOL_ORDER.map((id) => { const T = TOOLS[id]; return `<button class="emo-tool" data-tool="${id}"><div class="emo-tool-i">${T.icon}</div><b>${T.name}</b><div class="emo-dim">${T.when}</div><div class="emo-tool-m">~${T.min} min</div></button>`; }).join('')}</div>
      </div>
      ${sessions.length ? `<div class="card emo-card"><h3 class="emo-h3">🕘 Últimas sesiones</h3>${sessions.map((s) => `<div class="emo-sess"><span>${(TOOLS[s.tool] || {}).icon || ''} ${esc(C.toolName(s.tool))}</span><span class="emo-dim">${fmtDay(s.date)}</span><b>${s.before} → ${s.after}</b></div>`).join('')}</div>` : ''}
      <div class="card emo-card"><h3 class="emo-h3">📞 Si lo necesitas</h3>
        <div class="emo-dim">Línea de Prevención del Suicidio: <b>*4141</b> (gratis, 24/7) · Salud Responde: <b>600 360 7777</b> · Emergencias: SAMU <b>131</b>, Carabineros <b>133</b>.</div></div>
      ${disclaimer()}`;
    el.querySelectorAll('[data-tool]').forEach((b) => b.addEventListener('click', () => openTool(b.dataset.tool)));
  }

  // ───────────────────────── Ejecutor de herramientas ─────────────────────────
  function overlay() {
    let o = $('emoOverlay');
    if (!o) {
      o = document.createElement('div'); o.id = 'emoOverlay'; o.className = 'emo-overlay';
      o.innerHTML = '<div class="emo-sheet" id="emoSheet"></div>';
      document.body.appendChild(o);
    }
    return o;
  }
  function closeTool() {
    if (ui.runner && ui.runner.stop) ui.runner.stop();
    ui.runner = null;
    const o = $('emoOverlay'); if (o) o.classList.remove('open');
    document.body.style.overflow = '';
  }
  function sheet(html) { const o = overlay(); $('emoSheet').innerHTML = html; o.classList.add('open'); document.body.style.overflow = 'hidden'; }

  function openTool(id) {
    const T = TOOLS[id]; if (!T) return;
    ui.runner = { id, before: null, data: {} };
    sheet(`
      <button class="emo-close" id="emoCloseTool">×</button>
      <div class="emo-tool-head"><span style="font-size:34px">${T.icon}</span><div><h2 class="emo-h2">${T.name}</h2><div class="emo-dim">${T.src}</div></div></div>
      <div class="emo-block"><div class="emo-lbl">¿Cuánto malestar sientes ahora? <b id="emoBeforeV">5</b>/10</div>
        <input type="range" id="emoBefore" min="0" max="10" step="1" value="5"></div>
      <button class="btn btn-primary" id="emoStartTool">Comenzar</button>`);
    $('emoCloseTool').onclick = closeTool;
    $('emoBefore').oninput = () => { $('emoBeforeV').textContent = $('emoBefore').value; };
    $('emoStartTool').onclick = () => { ui.runner.before = Number($('emoBefore').value); RUN[id](); };
  }

  function finishTool(extra) {
    const id = ui.runner.id, before = ui.runner.before;
    sheet(`
      <button class="emo-close" id="emoCloseTool">×</button>
      <h2 class="emo-h2">¿Cómo quedaste?</h2>
      <div class="emo-block"><div class="emo-lbl">Malestar ahora: <b id="emoAfterV">${Math.max(0, before - 2)}</b>/10 <span class="emo-dim">(antes: ${before})</span></div>
        <input type="range" id="emoAfter" min="0" max="10" step="1" value="${Math.max(0, before - 2)}"></div>
      <div class="emo-block"><textarea id="emoSessNote" class="form-control" rows="2" placeholder="Nota opcional: ¿qué notaste?"></textarea></div>
      <button class="btn btn-primary" id="emoSaveSess">Guardar</button>`);
    $('emoCloseTool').onclick = closeTool;
    $('emoAfter').oninput = () => { $('emoAfterV').textContent = $('emoAfter').value; };
    $('emoSaveSess').onclick = () => {
      const after = Number($('emoAfter').value);
      const tools = getTools();
      tools.push({ id: uid(), kind: 'session', tool: id, date: today(), before, after, note: $('emoSessNote').value.trim(), data: extra || null, createdAt: new Date().toISOString() });
      saveTools(tools);
      const diff = before - after;
      sheet(`<button class="emo-close" id="emoCloseTool">×</button><div style="text-align:center;padding:10px"><div style="font-size:46px">${diff > 0 ? '🌿' : '🤍'}</div><h2 class="emo-h2">${diff > 0 ? `Bajaste el malestar ${diff} ${diff === 1 ? 'punto' : 'puntos'}` : 'Gracias por darte este momento'}</h2><p class="emo-dim">${diff > 0 ? 'Quedó registrado: así sabré qué te funciona mejor.' : 'A veces no baja de inmediato. Quedó registrado igual; prueba otra herramienta si quieres.'}</p><button class="btn btn-primary" id="emoDoneTool">Listo</button></div>`);
      $('emoCloseTool').onclick = closeTool;
      $('emoDoneTool').onclick = () => { closeTool(); render(); };
    };
  }

  const head = () => '<button class="emo-close" id="emoCloseTool">×</button>';
  const wireClose = () => { const c = $('emoCloseTool'); if (c) c.onclick = closeTool; };

  function stepper(title, steps, finish) {
    let i = 0;
    const paint = () => {
      const s = steps[i];
      sheet(`${head()}<h2 class="emo-h2">${title}</h2><div class="emo-step-n">Paso ${i + 1} de ${steps.length}</div>
        <div class="emo-step"><div class="emo-step-t">${s.t}</div><div class="emo-dim">${s.d || ''}</div>${s.input ? `<textarea class="form-control emo-step-in" id="emoStepIn" rows="2" placeholder="${s.input}"></textarea>` : ''}${s.timer ? `<div class="emo-timer" id="emoTimer">${s.timer}s</div><button class="btn btn-outline btn-sm" id="emoTimerGo">Iniciar ${s.timer}s</button>` : ''}</div>
        <div class="emo-actions"><button class="btn btn-primary" id="emoNext">${i === steps.length - 1 ? 'Terminar' : 'Siguiente'}</button></div>`);
      wireClose();
      if (steps[i].timer) {
        $('emoTimerGo').onclick = () => {
          let t = steps[i].timer; $('emoTimerGo').disabled = true;
          const iv = setInterval(() => { t--; $('emoTimer').textContent = Math.max(0, t) + 's'; if (t <= 0) clearInterval(iv); }, 1000);
          ui.runner.stop = () => clearInterval(iv);
        };
      }
      $('emoNext').onclick = () => { if (ui.runner && ui.runner.stop) { ui.runner.stop(); ui.runner.stop = null; } if (i === steps.length - 1) finish(); else { i++; paint(); } };
    };
    paint();
  }

  const RUN = {
    suspiro() {
      const cycles = 10;
      let n = 0, timers = [];
      const later = (fn, ms) => timers.push(setTimeout(fn, ms));
      ui.runner.stop = () => timers.forEach(clearTimeout);
      sheet(`${head()}<h2 class="emo-h2">Suspiro cíclico</h2><p class="emo-dim">Inhala por la nariz, luego una segunda inhalación corta para llenar del todo, y suelta el aire lento por la boca.</p>
        <div class="emo-breath"><div class="emo-orb" id="emoOrb"></div><div class="emo-breath-t" id="emoBreathT">Prepárate…</div></div>
        <div class="emo-dim" style="text-align:center" id="emoBreathC"></div>`);
      wireClose();
      const orb = $('emoOrb'), txt = $('emoBreathT');
      const cycle = () => {
        if (n >= cycles) { finishTool(); return; }
        n++; $('emoBreathC').textContent = `Ciclo ${n} de ${cycles}`;
        orb.style.transition = 'transform 4s ease-in'; orb.style.transform = 'scale(1.6)'; txt.textContent = 'Inhala por la nariz…';
        later(() => { orb.style.transition = 'transform 1.2s ease-out'; orb.style.transform = 'scale(1.9)'; txt.textContent = 'Un poco más de aire…'; }, 4000);
        later(() => { orb.style.transition = 'transform 6.5s ease-in-out'; orb.style.transform = 'scale(1)'; txt.textContent = 'Suelta lento por la boca…'; }, 5400);
        later(cycle, 12000);
      };
      later(cycle, 1500);
    },
    stop() {
      stepper('STOP · pausa', [
        { t: '✋ S — Detente', d: 'No respondas, no envíes, no decidas. Congela por un momento. Deja las manos quietas.' },
        { t: '🌬️ T — Toma aire', d: 'Una respiración lenta: 4 segundos inhalando, 6 exhalando.', timer: 20 },
        { t: '👀 O — Observa', d: '¿Qué estoy sintiendo? ¿Qué pensamientos tengo? ¿Qué pasa en mi cuerpo? Nómbralo sin juzgar.', input: 'Siento… pienso…' },
        { t: '➡️ P — Procede con conciencia', d: '¿Qué acción me acerca a lo que realmente quiero? ¿Qué diría mi yo más sabio?', input: 'Voy a…' },
      ], () => finishTool());
    },
    tipp() {
      stepper('TIPP · reset corporal', [
        { t: '🧊 Temperatura', d: 'Moja la cara con agua muy fría (o sostén hielo/algo frío en las mejillas) conteniendo el aire. Activa el reflejo de buceo y baja el pulso.', timer: 30 },
        { t: '🏃 Ejercicio intenso', d: 'Sentadillas, saltos o subir escaleras rápido por 1 minuto. Gasta la activación.', timer: 60 },
        { t: '🌬️ Respiración pausada', d: 'Inhala 4 s, exhala 6–8 s. La exhalación más larga calma.', timer: 60 },
        { t: '💪 Relajación muscular', d: 'Tensa un grupo muscular 5 s (puños, hombros, piernas) y suelta de golpe. Repite en 3 zonas.' },
      ], () => finishTool());
    },
    anclaje() {
      stepper('Anclaje 5-4-3-2-1', [
        { t: '👁️ 5 cosas que ves', d: 'Mira alrededor y nómbralas en voz baja.', input: 'Veo…' },
        { t: '✋ 4 cosas que tocas', d: 'La ropa, la mesa, el piso, tu propia mano.', input: 'Toco…' },
        { t: '👂 3 cosas que oyes', d: 'Incluso los sonidos lejanos o suaves.', input: 'Oigo…' },
        { t: '👃 2 cosas que hueles', d: 'Si no huele a nada, imagina tu olor favorito.', input: 'Huelo…' },
        { t: '👅 1 cosa que saboreas', d: 'O toma un sorbo de agua y siéntelo.', input: 'Saboreo…' },
      ], () => finishTool());
    },
    pensamientos() {
      const f = {};
      const steps = [
        ['situacion', '1. ¿Qué pasó?', 'Solo los hechos, como los vería una cámara.', 'La situación fue…'],
        ['pensamiento', '2. ¿Qué pensamiento apareció?', 'La frase exacta que cruzó tu mente.', 'Pensé que…'],
        ['emocion', '3. ¿Qué emoción sentiste y cuánto (0–100)?', '', 'Ansiedad 80…'],
        ['favor', '4. Evidencia A FAVOR del pensamiento', 'Hechos, no sensaciones.', 'Hechos que lo apoyan…'],
        ['contra', '5. Evidencia EN CONTRA', '¿Qué lo contradice? ¿Qué le diría a un amigo?', 'Hechos que lo contradicen…'],
        ['alternativo', '6. Un pensamiento alternativo más equilibrado', 'Que considere ambas evidencias.', 'Otra forma de verlo es…'],
      ];
      let i = 0;
      const paint = () => {
        const [k, t, d, ph] = steps[i];
        sheet(`${head()}<h2 class="emo-h2">Registro de pensamientos</h2><div class="emo-step-n">${i + 1} de ${steps.length}</div>
          <div class="emo-step"><div class="emo-step-t">${t}</div><div class="emo-dim">${d}</div><textarea class="form-control emo-step-in" id="emoStepIn" rows="3" placeholder="${ph}">${esc(f[k] || '')}</textarea></div>
          <div class="emo-actions">${i ? '<button class="btn btn-outline" id="emoPrev">Atrás</button>' : ''}<button class="btn btn-primary" id="emoNext">${i === steps.length - 1 ? 'Terminar' : 'Siguiente'}</button></div>`);
        wireClose();
        const save = () => { f[k] = $('emoStepIn').value.trim(); };
        if ($('emoPrev')) $('emoPrev').onclick = () => { save(); i--; paint(); };
        $('emoNext').onclick = () => { save(); if (i === steps.length - 1) finishTool({ thoughtRecord: f }); else { i++; paint(); } };
      };
      paint();
    },
    opuesta() {
      const OPP = { Enojo: 'Ser amable o tomar distancia, en vez de atacar. Habla suave.', Miedo: 'Acercarte a lo que temes, de a poco y con un paso pequeño.', Tristeza: 'Activarte: salir, moverte, ver gente aunque no tengas ganas.', Culpa: 'Si no hiciste nada malo, no te disculpes ni te escondas; si sí, repara y suelta.', Vergüenza: 'Contar lo que pasó a alguien de confianza, en vez de esconderte.' };
      sheet(`${head()}<h2 class="emo-h2">Acción opuesta</h2><p class="emo-dim">Cuando la emoción no encaja con los hechos o te hace actuar contra lo que te conviene, haz lo contrario a su impulso.</p>
        <div class="emo-block"><div class="emo-lbl">¿Qué emoción?</div><div class="emo-chips">${Object.keys(OPP).map((k) => `<button class="emo-pick" data-opp="${k}">${k}</button>`).join('')}</div></div>
        <div id="emoOppOut"></div>`);
      wireClose();
      document.querySelectorAll('[data-opp]').forEach((b) => b.onclick = () => {
        $('emoOppOut').innerHTML = `<div class="emo-insight">Acción opuesta: ${esc(OPP[b.dataset.opp])}</div><div class="emo-block"><div class="emo-lbl">¿Cuál sería un primer paso concreto, hoy?</div><textarea class="form-control" id="emoOppStep" rows="2"></textarea></div><button class="btn btn-primary" id="emoOppGo">Hecho, continuar</button>`;
        $('emoOppGo').onclick = () => finishTool({ emocion: b.dataset.opp, paso: $('emoOppStep').value.trim() });
      });
    },
    activacion() {
      const ideas = ['Caminar 10 minutos al sol', 'Ducharme y cambiarme de ropa', 'Ordenar un solo cajón o escritorio', 'Escribirle a alguien que quiero', 'Hacer 10 sentadillas', 'Preparar algo rico de comer', 'Salir a comprar algo pequeño'];
      sheet(`${head()}<h2 class="emo-h2">Activación conductual</h2><p class="emo-dim">El ánimo sigue a la acción. Elige UNA cosa pequeña, de menos de 10 minutos, aunque no tengas ganas.</p>
        <div class="emo-chips">${ideas.map((x) => `<button class="emo-pick" data-idea="${esc(x)}">${esc(x)}</button>`).join('')}</div>
        <div class="emo-block"><input class="form-control" id="emoActIn" placeholder="…o escribe la tuya"></div>
        <label class="emo-task"><input type="checkbox" id="emoActTask" checked> <span>Agregarla a mis tareas de hoy</span></label>
        <button class="btn btn-primary" id="emoActGo">Lo voy a hacer</button>`);
      wireClose();
      document.querySelectorAll('[data-idea]').forEach((b) => b.onclick = () => { $('emoActIn').value = b.dataset.idea; });
      $('emoActGo').onclick = () => {
        const v = $('emoActIn').value.trim(); if (!v) { $('emoActIn').focus(); return; }
        if ($('emoActTask').checked) { const t = getTasks(); t.push({ id: uid(), title: v, description: 'Activación conductual', priority: 'low', category: 'personal', dueDate: today(), status: 'pending', createdAt: new Date().toISOString(), source: 'diario' }); saveTasks(t); if (typeof renderKanban === 'function') renderKanban(); }
        finishTool({ accion: v });
      };
    },
    volcado() {
      sheet(`${head()}<h2 class="emo-h2">Volcado mental</h2><p class="emo-dim">Escribe TODO lo que tienes en la cabeza, sin ordenar. Una idea por línea o separadas por comas.</p>
        <textarea class="form-control" id="emoDump" rows="7" placeholder="Llamar a…, enviar…, me preocupa…"></textarea>
        <button class="btn btn-primary" id="emoDumpGo" style="margin-top:10px">Ordenar</button><div id="emoDumpOut"></div>`);
      wireClose();
      $('emoDumpGo').onclick = () => {
        const text = $('emoDump').value.trim(); if (!text) return;
        const lines = text.split(/\n+/).map((l) => (/^(tengo que|debo|hay que)/i.test(l) ? l : 'Tengo que ' + l.charAt(0).toLowerCase() + l.slice(1)));
        const tasks = C.analyzeText(lines.join('. '), { today: today() }).tasks;
        $('emoDumpOut').innerHTML = `${tasks.length ? `<div class="emo-lbl" style="margin-top:12px">Lo convertí en tareas. Marca solo UNA como "lo siguiente":</div>${tasks.map((t, i) => `<label class="emo-task"><input type="radio" name="emoNext" value="${i}" ${i === 0 ? 'checked' : ''}> <span>${esc(t.title)}</span></label>`).join('')}<label class="emo-task"><input type="checkbox" id="emoDumpAll" checked> <span>Agregar todas a Tareas</span></label>` : '<div class="emo-dim" style="margin-top:12px">No vi tareas claras; igual descargar la cabeza ya sirve.</div>'}<button class="btn btn-primary" id="emoDumpDone" style="margin-top:10px">Listo</button>`;
        $('emoDumpDone').onclick = () => {
          if (tasks.length && $('emoDumpAll').checked) {
            const sel = Number((document.querySelector('input[name="emoNext"]:checked') || {}).value || 0);
            const all = getTasks();
            tasks.forEach((t, i) => all.push({ id: uid(), title: t.title, description: 'Del volcado mental', priority: i === sel ? 'high' : 'medium', category: 'empresa', dueDate: i === sel ? today() : t.due, status: 'pending', createdAt: new Date().toISOString(), source: 'diario' }));
            saveTasks(all); if (typeof renderKanban === 'function') renderKanban(); if (typeof renderDashboard === 'function') renderDashboard();
          }
          finishTool({ items: tasks.length });
        };
      };
    },
    autocompasion() {
      stepper('Autocompasión', [
        { t: '🤍 Reconoce el dolor', d: 'Hoy me está costando. Esto es un momento difícil. Nómbralo con tus palabras.', input: 'Me duele / me cuesta que…' },
        { t: '🌍 Humanidad compartida', d: 'Otras personas también se sienten así a veces. No soy el único/la única.' },
        { t: '💛 Háblate como a un amigo', d: '¿Qué le dirías a alguien que quieres si le pasara lo mismo? Escríbetelo a ti.', input: 'Me diría…' },
      ], () => finishTool());
    },
  };

  // ───────────────────────── Arranque ─────────────────────────
  function init() {
    setupTabs();
    window.EmoUI = { render, openTool, loadDemo: () => loadDemo(true), clearDemo };
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeTool(); });
    render();
  }
  window.EmoUI = { init, render: () => {} };
  window.addEventListener('DOMContentLoaded', () => setTimeout(init, 0));
  // app.js llama a renderDiary al entrar a la página: reengancharse
  const origNav = window.navigateTo;
  if (typeof origNav === 'function') window.navigateTo = function (p) { const r = origNav.apply(this, arguments); if (p === 'diario' && window.EmoUI.render) setTimeout(() => window.EmoUI.render(), 0); return r; };
})();
