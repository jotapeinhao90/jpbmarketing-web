"use strict";

/* ---------- Utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const CLP = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 2 });
const DEC1 = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1 });
const money = (n) => CLP.format(Math.round(n || 0));
const moneyC = (n) => {
  n = n || 0;
  const a = Math.abs(n);
  if (a >= 1e9) return `$${DEC1.format(n / 1e9)} MM`;
  if (a >= 1e6) return `$${DEC1.format(n / 1e6)} M`;
  if (a >= 1e4) return `$${Math.round(n / 1e3).toLocaleString("es-CL")} mil`;
  return money(n);
};
const fecha = (iso) => {
  if (!iso) return "";
  const d = new Date(iso.replace(" ", "T") + "Z");
  return d.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" });
};
const hora = (d) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const iniciales = (n) => (String(n).replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
const COLORES = ["#F2564B", "#2DD4B0", "#FFB547", "#6AA8FF", "#35C7E8", "#B58CFF"];
const colorDe = (s) => COLORES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length];
const semanaISO = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const ICON = {
  doc: '<svg class="i" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/></svg>',
  receipt: '<svg class="i" viewBox="0 0 24 24"><path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8"/></svg>',
  check: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></svg>',
  clock: '<svg class="i" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  till: '<svg class="i" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/></svg>',
  box: '<svg class="i" viewBox="0 0 24 24"><path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/></svg>',
  phone: '<svg class="i" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg class="i" viewBox="0 0 24 24"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/></svg>',
  search: '<svg class="i" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
  chev: '<svg class="i chev" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="m9 6 6 6-6 6"/></svg>',
};

/* ---------- API ---------- */
let token = store.get("idini_token");

class AuthError extends Error {}

async function api(path) {
  let res;
  try {
    res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  } catch {
    throw new Error("offline");
  }
  if (res.status === 401) { cerrarSesion(); throw new AuthError(); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

/* ---------- Tema ---------- */
function aplicarTema(t) {
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
}
$("#theme").addEventListener("click", () => {
  // La app parte siempre en oscuro (como el panel de Monkey); el botón alterna y recuerda la elección.
  const nuevo = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  aplicarTema(nuevo);
  try { localStorage.setItem("idini_theme", nuevo); } catch {}
});

/* ---------- Sesión ---------- */
function mostrarLogin() {
  $("#app").hidden = true;
  $("#login").hidden = false;
  cerrarSheet();
}
function cerrarSesion() {
  token = null;
  store.del("idini_token");
  store.del("idini_cache_kpis");
  S.kpis = null;
  mostrarLogin();
}

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const f = e.currentTarget;
  const btn = $("button[type=submit]", f);
  const err = $("#loginError");
  err.hidden = true;
  btn.disabled = true;
  btn.textContent = "Entrando…";
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: f.user.value, pass: f.pass.value }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "No se pudo entrar");
    token = data.token;
    store.set("idini_token", token);
    f.pass.value = "";
    iniciar();
  } catch (ex) {
    err.textContent = ex.message === "Failed to fetch" ? "Sin conexión. Intenta de nuevo." : ex.message;
    err.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Entrar";
  }
});
$("#logout").addEventListener("click", () => { if (confirm("¿Cerrar sesión?")) cerrarSesion(); });

/* ---------- Estado y navegación ---------- */
const TABS = ["resumen", "ventas", "productos", "clientes"];
const S = {
  tab: TABS.includes(store.get("idini_tab")) ? store.get("idini_tab") : "resumen",
  kpis: null,
  animado: false,
  ventas: { estado: "", items: [], total: 0, cargando: false, error: null },
  prod: { q: "", categ: "", stock: false, items: [], total: 0, cats: null, cargando: false, error: null, seq: 0 },
  cli: { q: "", items: [], total: 0, cargando: false, error: null, seq: 0 },
  ultimaCarga: 0,
};

function go(tab) {
  S.tab = tab;
  store.set("idini_tab", tab);
  $$(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  render();
  $("#view").scrollTop = 0;
  if (tab === "ventas" && !S.ventas.items.length) cargarVentas(true);
  if (tab === "productos" && !S.prod.items.length) { cargarCategorias(); cargarProductos(true); }
  if (tab === "clientes" && !S.cli.items.length) cargarClientes(true);
}
$$(".tabbar button").forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));

function setOffline(v) { $("#offline").hidden = !v; }

/* ---------- Resumen ---------- */
async function cargarKpis({ silencioso = false } = {}) {
  const btn = $("#refresh");
  btn.classList.add("spin");
  if (!silencioso && !S.kpis) render();
  try {
    S.kpis = await api("/api/kpis");
    S.kpisError = null;
    S.ultimaCarga = Date.now();
    store.set("idini_cache_kpis", { t: S.ultimaCarga, d: S.kpis });
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError) return;
    if (e.message === "offline") setOffline(true);
    else if (!S.kpis) S.kpisError = e.message;
  } finally {
    btn.classList.remove("spin");
    if (S.tab === "resumen") render();
  }
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesKey = (d) => d.slice(0, 7);

function deltaMes(meses) {
  if (!meses?.length) return null;
  const hoy = new Date();
  const actual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`;
  const prevD = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const prev = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, "0")}`;
  const a = meses.find((m) => mesKey(m.desde) === actual);
  const p = meses.find((m) => mesKey(m.desde) === prev);
  return { actual: a?.total || 0, previo: p?.total || 0, mesPrev: MESES[prevD.getMonth()] };
}

function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function chartSVG(meses) {
  const data = meses.slice(-12);
  if (!data.length) return `<div class="empty">Aún no hay ventas confirmadas.</div>`;
  const W = 320, H = 170, padL = 4, padR = 4, padT = 10, padB = 22;
  const max = Math.max(...data.map((m) => m.total), 1);
  const step = niceStep(max / 3);
  const top = Math.ceil(max / step) * step || 1;
  const bw = (W - padL - padR) / data.length;
  const bar = Math.min(30, bw * 0.62);
  const y = (v) => padT + (H - padT - padB) * (1 - v / top);
  let grid = "";
  for (let v = 0; v <= top; v += step) {
    grid += `<line class="grid" x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`;
    if (v > 0) grid += `<text class="ylab" x="2" y="${y(v) - 3}">${moneyC(v)}</text>`;
  }
  const bars = data.map((m, i) => {
    const x = padL + i * bw + (bw - bar) / 2;
    const h = Math.max(2, H - padB - y(m.total));
    const lab = MESES[new Date(m.desde.replace(" ", "T")).getMonth()];
    const last = i === data.length - 1 ? " last" : "";
    return `<g data-i="${i}"><rect class="bar${last}" x="${x}" y="${H - padB - h}" width="${bar}" height="${h}" rx="6" style="animation-delay:${i * 60}ms"/><rect x="${padL + i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/><text x="${padL + i * bw + bw / 2}" y="${H - 6}" text-anchor="middle">${lab}</text></g>`;
  }).join("");
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Ventas confirmadas por mes">${grid}${bars}</svg>`;
}

function ranking(items, { sub }) {
  if (!items.length) return `<p class="muted">Sin datos todavía.</p>`;
  const max = Math.max(...items.map((i) => i.total), 1);
  return `<div class="rank">${items.map((i) => `
    <div class="rank-row">
      <div class="rank-head"><span class="name">${esc(i.nombre)}</span><span class="amount num">${moneyC(i.total)}</span></div>
      <div class="rank-bar"><i style="width:${Math.max(3, (i.total / max) * 100)}%"></i></div>
      <div class="rank-meta">${esc(sub(i))}</div>
    </div>`).join("")}</div>`;
}

const RING_R = 52, RING_C = 2 * Math.PI * RING_R;

function renderResumen() {
  const k = S.kpis;
  if (!k) {
    if (S.kpisError) return `<div class="empty">No se pudo cargar el resumen.<br><span class="muted">${esc(S.kpisError)}</span><br><button class="btn ac" data-retry="kpis">Reintentar</button></div>`;
    return `<div class="stack">
      <div class="sk" style="height:34px;width:60%"></div>
      <div class="sk" style="height:160px"></div>
      <div class="grid2"><div class="sk" style="height:104px"></div><div class="sk" style="height:104px"></div><div class="sk" style="height:104px"></div><div class="sk" style="height:104px"></div></div>
      <div class="sk" style="height:230px"></div></div>`;
  }
  const hoy = new Date();
  const conf = k.ventas.confirmadas, cot = k.ventas.cotizaciones;
  const tasa = conf.n + cot.n ? conf.n / (conf.n + cot.n) : 0;
  const d = deltaMes(k.meses);
  let goal = "";
  if (d && d.previo > 0) {
    const pct = ((d.actual - d.previo) / d.previo) * 100;
    const cls = Math.abs(pct) < 0.5 ? "flat" : pct > 0 ? "" : "down";
    const txt = d.actual / d.previo >= 5 ? `×${DEC1.format(d.actual / d.previo)}` : `${DEC1.format(Math.abs(pct))}%`;
    goal = `<div class="goal ${cls}">${pct > 0 ? "▲" : pct < 0 ? "▼" : "•"} ${txt} vs. ${d.mesPrev} · este mes ${moneyC(d.actual)}</div>`;
  } else if (d?.actual) {
    goal = `<div class="goal">Este mes ${moneyC(d.actual)}</div>`;
  }
  const cobrarPct = k.facturas.total ? Math.round((k.facturas.porCobrar / k.facturas.total) * 100) : 0;
  const offset = S.animado ? RING_C * (1 - tasa) : RING_C;

  return `<div class="stack ${S.animado ? "" : "anim"}">
    <div class="hello"><h2>Hola, equipo Idini</h2>
      <p>${cap(hoy.toLocaleDateString("es-CL", { month: "long" }))} · Semana ${semanaISO(hoy)} · Actualizado ${hora(new Date(S.ultimaCarga || Date.now()))}</p></div>

    <section class="card hero">
      <div class="ringw">
        <svg viewBox="0 0 124 124"><circle class="bgc" cx="62" cy="62" r="${RING_R}" fill="none" stroke-width="12"/>
          <circle class="fg" cx="62" cy="62" r="${RING_R}" fill="none" stroke-width="12" stroke-dasharray="${RING_C}" stroke-dashoffset="${offset}" data-target="${RING_C * (1 - tasa)}"/></svg>
        <div class="mid"><b>${Math.round(tasa * 100)}%</b><span>tasa de cierre</span></div>
      </div>
      <div class="t">
        <div class="l">Ventas confirmadas</div>
        <div class="big num">${money(conf.total)}</div>
        <div class="s">${conf.n} de ${conf.n + cot.n} pedidos cerrados</div>
        ${goal}
      </div>
    </section>

    <div class="grid2">
      <section class="card kpi a"><div class="ic">${ICON.doc}</div><div class="n num">${moneyC(cot.total)}</div><div class="l">En cotización · ${cot.n} abiertas</div></section>
      <section class="card kpi r"><div class="ic">${ICON.receipt}</div><div class="n num">${moneyC(k.ventas.ticket)}</div><div class="l">Ticket promedio</div></section>
      <section class="card kpi"><div class="ic">${ICON.check}</div><div class="n num">${moneyC(k.facturas.total)}</div><div class="l">Facturado · ${k.facturas.n} facturas</div></section>
      <section class="card kpi a"><div class="ic">${ICON.clock}</div><div class="n num ${k.facturas.porCobrar > 0 ? "warn" : ""}">${moneyC(k.facturas.porCobrar)}</div><div class="l">Por cobrar · ${cobrarPct}% facturado</div></section>
      <section class="card kpi"><div class="ic">${ICON.till}</div><div class="n num">${moneyC(k.pos.total)}</div><div class="l">Punto de venta · ${k.pos.n} ventas</div></section>
      <section class="card kpi r"><div class="ic">${ICON.box}</div><div class="n num">${NUM.format(k.catalogo.productos)}</div><div class="l">Productos · ${NUM.format(k.catalogo.conStock)} con stock</div></section>
    </div>

    <div class="sec"><span>Ventas por mes</span></div>
    <section class="card">
      <div id="chartTip" class="chart-tip">Toca una barra para ver el detalle</div>
      ${chartSVG(k.meses)}
    </section>

    <div class="sec"><span>Productos más vendidos</span></div>
    <section class="card">${ranking(k.topProductos, { sub: (p) => `${NUM.format(p.cant)} unidades${p.codigo ? " · " + p.codigo : ""}` })}</section>

    <div class="sec"><span>Mejores clientes</span></div>
    <section class="card">${ranking(k.topClientes, { sub: (c) => `${c.n} ${c.n === 1 ? "pedido" : "pedidos"}` })}</section>

    <div class="sec"><span>Vendedores</span></div>
    <section class="card">${ranking(k.topVendedores, { sub: (v) => `${v.n} ${v.n === 1 ? "pedido" : "pedidos"}` })}</section>

    <div class="sec"><span>Últimos pedidos</span><button data-tab-go="ventas">Ver todos</button></div>
    <div class="list">${k.ultimos.slice(0, 5).map(ventaItem).join("")}</div>
  </div>`;
}

function postResumen() {
  const k = S.kpis;
  if (!k) return;
  // Anillo: anima de vacío al valor la primera vez.
  const fg = $(".ringw .fg");
  if (fg && !S.animado) requestAnimationFrame(() => requestAnimationFrame(() => { fg.style.strokeDashoffset = fg.dataset.target; }));
  S.animado = true;

  const svg = $(".chart");
  if (!svg) return;
  const data = k.meses.slice(-12);
  const tip = $("#chartTip");
  $$("g[data-i]", svg).forEach((g) => g.addEventListener("click", () => {
    const m = data[+g.dataset.i];
    $$(".bar", svg).forEach((b) => b.classList.remove("sel"));
    $(".bar", g).classList.add("sel");
    tip.innerHTML = `<b>${esc(cap(m.mes))}</b> · <b class="num">${money(m.total)}</b> · ${m.n} ${m.n === 1 ? "pedido" : "pedidos"}`;
  }));
}

/* ---------- Ventas ---------- */
const ESTADO = {
  draft: ["Cotización", "warn"],
  sent: ["Cotización enviada", "warn"],
  sale: ["Confirmada", "good"],
  done: ["Completada", "good"],
  cancel: ["Cancelada", "bad"],
};
function ventaItem(o) {
  const [txt, cls] = ESTADO[o.estado] || [o.estado, ""];
  return `<div class="item">
    <div class="row"><span class="title">${esc(o.cliente)}</span><span class="price num">${money(o.total)}</span></div>
    <div class="row"><span class="meta">${esc(o.ref)} · ${fecha(o.fecha)}${o.vendedor ? " · " + esc(o.vendedor) : ""}</span><span class="badge ${cls}">${txt}</span></div>
  </div>`;
}

async function cargarVentas(reset = false) {
  const v = S.ventas;
  if (v.cargando) return;
  v.cargando = true;
  v.error = null;
  if (reset) { v.items = []; v.total = 0; }
  if (S.tab === "ventas") render();
  try {
    const q = new URLSearchParams({ estado: v.estado, offset: String(v.items.length) });
    const r = await api(`/api/ventas?${q}`);
    v.items = v.items.concat(r.items);
    v.total = r.total;
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError) return;
    v.error = e.message === "offline" ? "Sin conexión" : e.message;
  } finally {
    v.cargando = false;
    if (S.tab === "ventas") render({ conservarScroll: true });
  }
}

function renderVentas() {
  const v = S.ventas;
  const chips = [["", "Todas"], ["confirmadas", "Confirmadas"], ["cotizaciones", "Cotizaciones"]]
    .map(([val, lab]) => `<button class="chip ${v.estado === val ? "on" : ""}" data-estado="${val}">${lab}</button>`).join("");
  let cuerpo;
  if (v.error && !v.items.length) cuerpo = `<div class="empty">No se pudo cargar.<br><span class="muted">${esc(v.error)}</span><br><button class="btn ac" data-retry="ventas">Reintentar</button></div>`;
  else if (v.cargando && !v.items.length) cuerpo = `<div class="list">${'<div class="sk" style="height:70px"></div>'.repeat(6)}</div>`;
  else if (!v.items.length) cuerpo = `<div class="empty">No hay pedidos con este filtro.</div>`;
  else cuerpo = `<div class="count">${NUM.format(v.total)} pedidos</div><div class="list">${v.items.map(ventaItem).join("")}</div>
      ${v.items.length < v.total ? `<button class="more" data-more="ventas">${v.cargando ? "Cargando…" : "Cargar más"}</button>` : ""}`;
  return `<div class="toolbar"><div class="chips">${chips}</div></div>${cuerpo}`;
}

/* ---------- Productos ---------- */
async function cargarCategorias() {
  if (S.prod.cats) return;
  try { S.prod.cats = await api("/api/categorias"); if (S.tab === "productos") renderChips(); } catch {}
}

async function cargarProductos(reset = false) {
  const p = S.prod;
  const seq = ++p.seq;
  p.cargando = true;
  p.error = null;
  if (reset) { p.items = []; p.total = 0; }
  if (S.tab === "productos") renderLista();
  try {
    const q = new URLSearchParams({ q: p.q, offset: String(p.items.length) });
    if (p.categ) q.set("categ", p.categ);
    if (p.stock) q.set("stock", "1");
    const r = await api(`/api/productos?${q}`);
    if (seq !== p.seq) return; // respuesta de una búsqueda anterior
    p.items = p.items.concat(r.items);
    p.total = r.total;
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError || seq !== p.seq) return;
    p.error = e.message === "offline" ? "Sin conexión" : e.message;
  } finally {
    if (seq === p.seq) {
      p.cargando = false;
      if (S.tab === "productos") renderLista();
    }
  }
}

function stockBadge(n) {
  if (n > 0) return `<span class="badge good">${NUM.format(n)} en stock</span>`;
  if (n < 0) return `<span class="badge bad">Stock ${NUM.format(n)}</span>`;
  return `<span class="badge">Sin stock</span>`;
}

function productoItem(p) {
  return `<button class="item" data-prod="${p.id}">
    <div class="row"><span class="title">${esc(p.nombre)}</span><span class="price num">${money(p.precio)}</span></div>
    <div class="row"><span class="meta">${p.codigo ? esc(p.codigo) + " · " : ""}${esc(p.categoria.replace(/^IDINI \/ /, ""))}</span>${stockBadge(p.stock)}</div>
  </button>`;
}

function renderChips() {
  const el = $("#catChips");
  if (!el) return;
  const cats = S.prod.cats || [];
  el.innerHTML = `<button class="chip ${S.prod.categ ? "" : "on"}" data-categ="">Todas</button>` +
    cats.map((c) => `<button class="chip ${String(S.prod.categ) === String(c.id) ? "on" : ""}" data-categ="${c.id}">${esc(c.nombre.replace(/^IDINI \/ /, ""))}</button>`).join("");
}

function renderLista() {
  const el = $("#prodList");
  if (!el) return;
  const p = S.prod;
  if (p.error && !p.items.length) el.innerHTML = `<div class="empty">No se pudo cargar.<br><span class="muted">${esc(p.error)}</span><br><button class="btn ac" data-retry="productos">Reintentar</button></div>`;
  else if (p.cargando && !p.items.length) el.innerHTML = `<div class="list">${'<div class="sk" style="height:70px"></div>'.repeat(7)}</div>`;
  else if (!p.items.length) el.innerHTML = `<div class="empty">No encontramos productos${p.q ? ` para “${esc(p.q)}”` : ""}.</div>`;
  else el.innerHTML = `<div class="count">${NUM.format(p.total)} productos</div><div class="list">${p.items.map(productoItem).join("")}</div>
      ${p.items.length < p.total ? `<button class="more" data-more="productos">${p.cargando ? "Cargando…" : "Cargar más"}</button>` : ""}`;
}

function renderProductos() {
  return `<div class="toolbar">
    <label class="search">${ICON.search}
      <input id="q" type="search" inputmode="search" enterkeyhint="search" placeholder="Buscar por nombre o código" autocomplete="off" value="${esc(S.prod.q)}">
    </label>
    <div class="chips"><button class="chip ${S.prod.stock ? "on" : ""}" data-stock="1">Solo con stock</button></div>
    <div id="catChips" class="chips"></div>
  </div>
  <div id="prodList"></div>`;
}

function abrirProducto(id) {
  const p = S.prod.items.find((x) => x.id === +id);
  if (!p) return;
  const margen = p.costo > 0 && p.precio > 0 ? ((p.precio - p.costo) / p.precio) * 100 : null;
  abrirSheet(`<h3>${esc(p.nombre)}</h3>
    <div class="code">${p.codigo ? "Código " + esc(p.codigo) + " · " : ""}${esc(p.categoria)}</div>
    ${stockBadge(p.stock)}
    <div class="facts">
      <div class="fact"><div class="l">Precio de lista</div><div class="v num">${money(p.precio)}</div></div>
      <div class="fact"><div class="l">Stock disponible</div><div class="v num">${NUM.format(p.stock)}</div></div>
      <div class="fact"><div class="l">Costo</div><div class="v num">${p.costo > 0 ? money(p.costo) : "—"}</div></div>
      <div class="fact"><div class="l">Margen</div><div class="v num">${margen === null ? "—" : DEC1.format(margen) + "%"}</div></div>
    </div>
    <button class="btn block" data-close>Cerrar</button>`);
}

/* ---------- Clientes ---------- */
async function cargarClientes(reset = false) {
  const c = S.cli;
  const seq = ++c.seq;
  c.cargando = true;
  c.error = null;
  if (reset) { c.items = []; c.total = 0; }
  if (S.tab === "clientes") renderListaClientes();
  try {
    const q = new URLSearchParams({ q: c.q, offset: String(c.items.length) });
    const r = await api(`/api/clientes?${q}`);
    if (seq !== c.seq) return;
    c.items = c.items.concat(r.items);
    c.total = r.total;
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError || seq !== c.seq) return;
    c.error = e.message === "offline" ? "Sin conexión" : e.message;
  } finally {
    if (seq === c.seq) {
      c.cargando = false;
      if (S.tab === "clientes") renderListaClientes();
    }
  }
}

function clienteItem(c) {
  return `<button class="row-av" data-cli="${c.id}">
    <div class="av" style="--c:${colorDe(c.nombre)}">${esc(iniciales(c.nombre))}</div>
    <div class="tx"><b>${esc(c.nombre)}</b><span>${[c.rut, c.ciudad].filter(Boolean).map(esc).join(" · ") || "Sin datos de contacto"}</span></div>
    ${ICON.chev}
  </button>`;
}

function renderListaClientes() {
  const el = $("#cliList");
  if (!el) return;
  const c = S.cli;
  if (c.error && !c.items.length) el.innerHTML = `<div class="empty">No se pudo cargar.<br><span class="muted">${esc(c.error)}</span><br><button class="btn ac" data-retry="clientes">Reintentar</button></div>`;
  else if (c.cargando && !c.items.length) el.innerHTML = `<div class="list">${'<div class="sk" style="height:68px"></div>'.repeat(7)}</div>`;
  else if (!c.items.length) el.innerHTML = `<div class="empty">No encontramos clientes${c.q ? ` para “${esc(c.q)}”` : ""}.</div>`;
  else el.innerHTML = `<div class="count">${NUM.format(c.total)} clientes</div><div class="list">${c.items.map(clienteItem).join("")}</div>
      ${c.items.length < c.total ? `<button class="more" data-more="clientes">${c.cargando ? "Cargando…" : "Cargar más"}</button>` : ""}`;
}

function renderClientes() {
  return `<div class="toolbar">
    <label class="search">${ICON.search}
      <input id="qc" type="search" inputmode="search" enterkeyhint="search" placeholder="Buscar por nombre, RUT o correo" autocomplete="off" value="${esc(S.cli.q)}">
    </label>
  </div>
  <div id="cliList"></div>`;
}

async function abrirCliente(id) {
  const c = S.cli.items.find((x) => x.id === +id);
  if (!c) return;
  const tel = String(c.telefono || "").replace(/[^\d+]/g, "");
  abrirSheet(`<h3>${esc(c.nombre)}</h3>
    <div class="code">${[c.rut, c.ciudad].filter(Boolean).map(esc).join(" · ")}</div>
    ${c.direccion ? `<p class="muted" style="margin-bottom:12px">${esc(c.direccion)}${c.ciudad ? ", " + esc(c.ciudad) : ""}</p>` : ""}
    <div class="btnrow">
      <a class="btn ${tel ? "ac" : "off"}" ${tel ? `href="tel:${tel}"` : ""}>${ICON.phone} Llamar</a>
      <a class="btn ${c.email ? "" : "off"}" ${c.email ? `href="mailto:${esc(c.email)}"` : ""}>${ICON.mail} Correo</a>
    </div>
    ${c.telefono ? `<p class="muted">Tel. ${esc(c.telefono)}</p>` : ""}${c.email ? `<p class="muted">${esc(c.email)}</p>` : ""}
    <div class="sec"><span>Pedidos</span></div>
    <div id="cliPedidos" class="list"><div class="sk" style="height:70px"></div></div>
    <button class="btn block" data-close style="margin-top:14px">Cerrar</button>`);
  try {
    const r = await api(`/api/ventas?cliente=${encodeURIComponent(c.id)}`);
    const el = $("#cliPedidos");
    if (el) el.innerHTML = r.items.length ? r.items.map(ventaItem).join("") : `<p class="muted">Este cliente aún no tiene pedidos.</p>`;
  } catch (e) {
    const el = $("#cliPedidos");
    if (el && !(e instanceof AuthError)) el.innerHTML = `<p class="muted">No se pudieron cargar los pedidos.</p>`;
  }
}

/* ---------- Hoja de detalle ---------- */
function abrirSheet(html) {
  $("#sheet").innerHTML = `<div class="grab"></div>${html}`;
  $("#sheet").scrollTop = 0;
  $("#sheetBg").hidden = false;
  $("#sheet").hidden = false;
}
function cerrarSheet() {
  $("#sheet").hidden = true;
  $("#sheetBg").hidden = true;
}
$("#sheetBg").addEventListener("click", cerrarSheet);
$("#sheet").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) cerrarSheet(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarSheet(); });

/* ---------- Render y eventos ---------- */
function render({ conservarScroll = false } = {}) {
  const v = $("#view");
  const y = v.scrollTop;
  if (S.tab === "resumen") { v.innerHTML = renderResumen(); postResumen(); }
  else if (S.tab === "ventas") v.innerHTML = renderVentas();
  else if (S.tab === "productos") { v.innerHTML = renderProductos(); renderChips(); renderLista(); }
  else { v.innerHTML = renderClientes(); renderListaClientes(); }
  if (conservarScroll || S.tab === "resumen") v.scrollTop = y;
}

let debounce;
$("#view").addEventListener("input", (e) => {
  if (e.target.id !== "q" && e.target.id !== "qc") return;
  clearTimeout(debounce);
  const valor = e.target.value.trim();
  debounce = setTimeout(() => {
    if (e.target.id === "q") { S.prod.q = valor; cargarProductos(true); }
    else { S.cli.q = valor; cargarClientes(true); }
  }, 300);
});

$("#view").addEventListener("click", (e) => {
  const t = e.target.closest("button");
  if (!t) return;
  const d = t.dataset;
  if (d.estado !== undefined) { S.ventas.estado = d.estado; cargarVentas(true); }
  else if (d.categ !== undefined) { S.prod.categ = d.categ; renderChips(); cargarProductos(true); }
  else if (d.stock) { S.prod.stock = !S.prod.stock; t.classList.toggle("on", S.prod.stock); cargarProductos(true); }
  else if (d.prod) abrirProducto(d.prod);
  else if (d.cli) abrirCliente(d.cli);
  else if (d.tabGo) go(d.tabGo);
  else if (d.more === "ventas") cargarVentas();
  else if (d.more === "productos") cargarProductos();
  else if (d.more === "clientes") cargarClientes();
  else if (d.retry === "kpis") { S.kpisError = null; cargarKpis(); }
  else if (d.retry === "ventas") cargarVentas(true);
  else if (d.retry === "productos") cargarProductos(true);
  else if (d.retry === "clientes") cargarClientes(true);
});

$("#refresh").addEventListener("click", () => {
  if (S.tab === "resumen") cargarKpis({ silencioso: true });
  else if (S.tab === "ventas") cargarVentas(true);
  else if (S.tab === "productos") cargarProductos(true);
  else cargarClientes(true);
});

// Al volver a la app después de un rato, refresca solo.
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && token && Date.now() - S.ultimaCarga > 120000) cargarKpis({ silencioso: true });
});
window.addEventListener("online", () => token && cargarKpis({ silencioso: true }));
window.addEventListener("offline", () => setOffline(true));

/* ---------- Inicio ---------- */
function iniciar() {
  $("#login").hidden = true;
  $("#app").hidden = false;
  const cache = store.get("idini_cache_kpis");
  if (cache?.d) { S.kpis = cache.d; S.ultimaCarga = cache.t; }
  go(S.tab);
  cargarKpis({ silencioso: true });
}

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
token ? iniciar() : mostrarLogin();
