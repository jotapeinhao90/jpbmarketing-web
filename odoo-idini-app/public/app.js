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
const pct = (f) => `${Math.round((f || 0) * 100)}%`;
const parseFecha = (iso) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso.replace(" ", "T") + "Z");
const fecha = (iso) => (iso ? parseFecha(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) : "");
const fechaCorta = (iso) => (iso ? parseFecha(iso).toLocaleDateString("es-CL", { day: "numeric", month: "short" }) : "");
const hora = (d) => d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
const plural = (n, s, p) => `${NUM.format(n)} ${n === 1 ? s : p}`;
const quitarCodigo = (s) => String(s || "").replace(/^\[[^\]]*\]\s*/, "");
const ultimoTramo = (s) => String(s || "").split(" / ").pop();
const iniciales = (n) => (String(n).replace(/[^\p{L}\p{N} ]/gu, "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
const COLORES = ["#FF5A1F", "#7FC8A9", "#F7B72F", "#8FA7B8", "#D98C5F", "#C9B79C"];
const colorDe = (s) => COLORES[[...String(s)].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORES.length];
const semanaISO = (d) => {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - dia);
  return Math.ceil(((t - Date.UTC(t.getUTCFullYear(), 0, 1)) / 864e5 + 1) / 7);
};
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const atraso = (d) => (d > 0 ? `<span class="neg">${d} ${d === 1 ? "día" : "días"} de atraso</span>` : "");

const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} },
};

const svg = (d) => `<svg class="i" viewBox="0 0 24 24">${d}</svg>`;
const ICON = {
  doc: svg('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h8M8 17h5"/>'),
  receipt: svg('<path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 1 .7V2l-1 .7-3-2-3 2-3-2-3 2z"/><path d="M8 8h8M8 12h8"/>'),
  check: svg('<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  till: svg('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M7 20h10M12 16v4"/>'),
  box: svg('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/><path d="M12 13v8"/>'),
  phone: svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.8a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  mail: svg('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
  chev: '<svg class="i chev" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="m9 6 6 6-6 6"/></svg>',
  back: '<svg class="i" viewBox="0 0 24 24" style="width:18px;height:18px"><path d="m15 6-6 6 6 6"/></svg>',
  alert: svg('<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>'),
  truck: svg('<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>'),
  inbox: svg('<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z"/>'),
  wallet: svg('<path d="M20 12V8H6a2 2 0 0 1 0-4h12v4"/><path d="M4 6v12a2 2 0 0 0 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/>'),
  cart: svg('<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>'),
  store: svg('<path d="m3 9 1-5h16l1 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v8h14v-8"/>'),
  users: svg('<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="8" r="4"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 4.13a4 4 0 0 1 0 7.75"/>'),
  book: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  tools: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>'),
  trend: svg('<path d="m3 17 6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
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
const errTxt = (e) => (e.message === "offline" ? "Sin conexión" : e.message);

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
  store.del("idini_cache_alertas");
  S.kpis = null;
  S.alertas = null;
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
const TABS = ["resumen", "ventas", "productos", "clientes", "mas"];
const SUBS = {
  cobranza: { titulo: "Cobranza", desc: "Facturas por cobrar, antigüedad y pagos", icono: "wallet", cls: "" },
  compras: { titulo: "Compras", desc: "Órdenes, proveedores y recepciones", icono: "cart", cls: "m1" },
  inventario: { titulo: "Inventario", desc: "Stock por bodega, entregas y alertas", icono: "inbox", cls: "m2" },
  pos: { titulo: "Punto de venta", desc: "Caja, métodos de pago y sucursales", icono: "till", cls: "" },
  equipo: { titulo: "Equipo de ventas", desc: "Qué vendió cada persona", icono: "users", cls: "m1" },
  catalogo: { titulo: "Catálogo", desc: "Calidad de datos, categorías y precios", icono: "book", cls: "m2" },
  proyecto: { titulo: "Implementación", desc: "Avance del proyecto de Odoo", icono: "tools", cls: "" },
};
const S = {
  tab: TABS.includes(store.get("idini_tab")) ? store.get("idini_tab") : "resumen",
  sub: null,
  periodo: store.get("idini_periodo") || "semana",
  kpis: null,
  alertas: null,
  animado: false,
  rep: {},
  ventas: { estado: "", items: [], total: 0, cargando: false, error: null },
  prod: { q: "", categ: "", modo: "", items: [], total: 0, cats: null, cargando: false, error: null, seq: 0 },
  cli: { q: "", modo: "", items: [], total: 0, cargando: false, error: null, seq: 0 },
  ultimaCarga: 0,
};
const GRAF = {};

function go(tab, { sub = null } = {}) {
  S.tab = tab;
  S.sub = tab === "mas" ? sub : null;
  store.set("idini_tab", tab);
  $$(".tabbar button").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
  render();
  $("#view").scrollTop = 0;
  if (tab === "ventas" && !S.ventas.items.length) cargarVentas(true);
  if (tab === "productos" && !S.prod.items.length) { cargarCategorias(); cargarProductos(true); }
  if (tab === "clientes" && !S.cli.items.length) cargarClientes(true);
  if (tab === "mas" && S.sub) cargarReporte(S.sub);
}

// Atajos desde las alertas: "tab:valor".
function ir(destino) {
  const [tipo, valor] = destino.split(":");
  if (tipo === "mas") go("mas", { sub: valor });
  else if (tipo === "ventas") { S.ventas.estado = valor || ""; S.ventas.items = []; go("ventas"); }
  else if (tipo === "prod") { S.prod.modo = valor || ""; S.prod.items = []; go("productos"); }
}
$$(".tabbar button").forEach((b) => b.addEventListener("click", () => go(b.dataset.tab)));

function setOffline(v) { $("#offline").hidden = !v; }

/* ---------- Componentes ---------- */
function grafico(id, items, { stacked = false, tip = "Toca una barra para ver el detalle", h = 170 } = {}) {
  if (!items.length || items.every((i) => !i.a && !i.b)) return `<div class="empty">Sin movimientos en este período.</div>`;
  GRAF[id] = items;
  const W = 320, padL = 4, padR = 4, padT = 10, padB = 22;
  const total = (i) => (i.a || 0) + (stacked ? i.b || 0 : 0);
  const max = Math.max(...items.map(total), 1);
  const step = niceStep(max / 3);
  const top = Math.ceil(max / step) * step || 1;
  const bw = (W - padL - padR) / items.length;
  const bar = Math.min(30, bw * 0.62);
  const y = (v) => padT + (h - padT - padB) * (1 - v / top);
  let grid = "";
  for (let v = 0; v <= top; v += step) {
    grid += `<line class="grid" x1="0" x2="${W}" y1="${y(v)}" y2="${y(v)}"/>`;
    if (v > 0) grid += `<text class="ylab" x="2" y="${y(v) - 3}">${moneyC(v)}</text>`;
  }
  const bars = items.map((m, i) => {
    const x = padL + i * bw + (bw - bar) / 2;
    const ha = Math.max(m.a ? 2 : 0, h - padB - y(m.a || 0));
    const last = i === items.length - 1 ? " last" : "";
    let r = `<rect class="bar${last}" x="${x}" y="${h - padB - ha}" width="${bar}" height="${ha}" rx="${stacked ? 3 : 6}" style="animation-delay:${i * 40}ms"/>`;
    if (stacked && m.b) {
      const hb = Math.max(2, h - padB - y(m.b));
      r += `<rect class="bar2${last}" x="${x}" y="${h - padB - ha - hb}" width="${bar}" height="${hb}" rx="3" style="animation-delay:${i * 40}ms"/>`;
    }
    const mostrar = items.length <= 14 || i % 2 === 0;
    return `<g data-g="${id}" data-i="${i}">${r}<rect x="${padL + i * bw}" y="0" width="${bw}" height="${h}" fill="transparent"/>${mostrar ? `<text x="${padL + i * bw + bw / 2}" y="${h - 6}" text-anchor="middle">${esc(m.lab)}</text>` : ""}</g>`;
  }).join("");
  return `<div id="tip-${id}" class="chart-tip">${tip}</div><svg class="chart" viewBox="0 0 ${W} ${h}" style="height:${h}px" role="img">${grid}${bars}</svg>`;
}
function niceStep(raw) {
  const p = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

function ranking(items, { sub = () => "", valor = (i) => i.total, fmt = moneyC } = {}) {
  if (!items.length) return `<p class="muted">Sin datos todavía.</p>`;
  const max = Math.max(...items.map(valor), 1);
  return `<div class="rank">${items.map((i) => `
    <div class="rank-row">
      <div class="rank-head"><span class="name">${esc(i.nombre)}</span><span class="amount num">${fmt(valor(i))}</span></div>
      <div class="rank-bar"><i style="width:${Math.max(3, (Math.max(valor(i), 0) / max) * 100)}%"></i></div>
      <div class="rank-meta">${esc(sub(i))}</div>
    </div>`).join("")}</div>`;
}

function anillo(frac, grande, chico, r = 52, w = 12, size = 124) {
  const C = 2 * Math.PI * r;
  const off = S.animado ? C * (1 - frac) : C;
  const c = size / 2;
  return `<div class="ringw" style="width:${size}px;height:${size}px">
    <svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px"><circle class="bgc" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="${w}"/>
      <circle class="fg" cx="${c}" cy="${c}" r="${r}" fill="none" stroke-width="${w}" stroke-dasharray="${C}" stroke-dashoffset="${off}" data-target="${C * (1 - frac)}"/></svg>
    <div class="mid"><b>${grande}</b><span>${chico}</span></div></div>`;
}

const tile = (icono, cls, valor, etiqueta, extra = "") => `<section class="card kpi ${cls}"><div class="ic">${ICON[icono]}</div><div class="n num ${extra}">${valor}</div><div class="l">${etiqueta}</div></section>`;
const lrow = (izq, sub, der, badge = "") => `<div class="lrow"><div class="tx"><b>${izq}</b><span>${sub}</span></div><div class="rt"><b>${der}</b>${badge}</div></div>`;
const seccion = (t, extra = "") => `<div class="sec"><span>${t}</span>${extra}</div>`;
const esqueleto = (n = 4, alto = 70) => `<div class="list">${`<div class="sk" style="height:${alto}px"></div>`.repeat(n)}</div>`;
const vacio = (msg) => `<p class="muted">${msg}</p>`;
const errorBox = (msg, retry) => `<div class="empty">No se pudo cargar.<br><span class="muted">${esc(msg)}</span><br><button class="btn ac" data-retry="${retry}">Reintentar</button></div>`;

/* ---------- Carga de datos de Hoy ---------- */
async function cargarKpis({ silencioso = false } = {}) {
  $("#refresh").classList.add("spin");
  if (!silencioso && !S.kpis) render();
  const tareas = [
    api("/api/kpis").then((d) => { S.kpis = d; S.kpisError = null; S.ultimaCarga = Date.now(); store.set("idini_cache_kpis", { t: S.ultimaCarga, d }); }),
    api("/api/alertas").then((d) => { S.alertas = d; store.set("idini_cache_alertas", d); }),
  ];
  const res = await Promise.allSettled(tareas);
  const fallo = res.find((r) => r.status === "rejected" && !(r.reason instanceof AuthError));
  if (res.some((r) => r.reason instanceof AuthError)) return;
  if (fallo) {
    if (fallo.reason.message === "offline") setOffline(true);
    else if (!S.kpis) S.kpisError = fallo.reason.message;
  } else setOffline(false);
  $("#refresh").classList.remove("spin");
  if (S.tab === "resumen") render({ conservarScroll: true });
}

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
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

function graficoMeses(id, meses) {
  const items = meses.slice(-12).map((m) => ({ lab: MESES[parseFecha(m.desde).getUTCMonth()], a: m.total, tip: `<b>${esc(cap(m.mes))}</b> · <b class="num">${money(m.total)}</b> · ${plural(m.n, "pedido", "pedidos")}` }));
  return grafico(id, items);
}

/* ---------- Hoy ---------- */
function alertasHTML(a) {
  if (!a) return esqueleto(3, 44);
  const L = [];
  const add = (cond, cls, icono, titulo, sub, der, destino) => cond && L.push(`<button class="al ${cls}" data-ir="${destino}"><div class="ic">${ICON[icono]}</div><div class="tx"><b>${titulo}</b><span>${sub}</span></div>${der ? `<span class="amt num">${der}</span>` : ""}${ICON.chev}</button>`);
  add(a.facturasVencidas.n > 0, "red", "alert", "Facturas vencidas", `${plural(a.facturasVencidas.n, "factura", "facturas")} sin cobrar`, moneyC(a.facturasVencidas.total), "mas:cobranza");
  add(a.entregas.atrasadas > 0, "red", "truck", "Entregas atrasadas", `${a.entregas.atrasadas} de ${a.entregas.n} pendientes pasaron su fecha`, "", "mas:inventario");
  add(a.entregas.atrasadas === 0 && a.entregas.n > 0, "", "truck", "Entregas pendientes", `${plural(a.entregas.n, "despacho", "despachos")} por entregar`, "", "mas:inventario");
  add(a.cotizacionesVencidas.n > 0, "", "doc", "Cotizaciones vencidas", `${plural(a.cotizacionesVencidas.n, "cotización", "cotizaciones")} pasaron su fecha de validez`, moneyC(a.cotizacionesVencidas.total), "ventas:vencidas");
  add(a.porFacturar.n > 0, "", "receipt", "Pedidos por facturar", `${plural(a.porFacturar.n, "pedido", "pedidos")} ya confirmados sin factura`, moneyC(a.porFacturar.total), "ventas:porfacturar");
  add(a.recepciones.n > 0, "", "inbox", "Compras por recibir", `${plural(a.recepciones.n, "recepción", "recepciones")} pendientes${a.recepciones.atrasadas ? ` · ${a.recepciones.atrasadas} atrasadas` : ""}`, moneyC(a.comprasPorRecibir.total), "mas:compras");
  add(a.stockNegativo > 0, "", "box", "Stock negativo", `${plural(a.stockNegativo, "registro", "registros")} con existencias bajo cero`, "", "prod:negativo");
  add(a.posAbierto.n > 0, "", "till", "Caja con órdenes abiertas", `${plural(a.posAbierto.n, "orden", "órdenes")} sin cerrar · ${plural(a.posAbierto.sesiones, "sesión abierta", "sesiones abiertas")}`, moneyC(a.posAbierto.total), "mas:pos");
  add(a.facturasBorrador.n > 0, "", "receipt", "Facturas en borrador", `${plural(a.facturasBorrador.n, "factura", "facturas")} sin emitir`, moneyC(a.facturasBorrador.total), "mas:cobranza");
  return L.length ? L.join("") : `<div class="todo-ok">${ICON.check} Todo al día, no hay nada pendiente.</div>`;
}

function renderResumen() {
  const k = S.kpis;
  if (!k) {
    if (S.kpisError) return errorBox(S.kpisError, "kpis");
    return `<div class="stack"><div class="sk" style="height:34px;width:60%"></div><div class="sk" style="height:160px"></div><div class="sk" style="height:140px"></div><div class="grid2"><div class="sk" style="height:104px"></div><div class="sk" style="height:104px"></div></div></div>`;
  }
  const a = S.alertas;
  const hoy = new Date();
  const conf = k.ventas.confirmadas, cot = k.ventas.cotizaciones;
  const tasa = conf.n + cot.n ? conf.n / (conf.n + cot.n) : 0;
  const d = deltaMes(k.meses);
  let goal = "";
  if (d && d.previo > 0) {
    const p = ((d.actual - d.previo) / d.previo) * 100;
    const cls = Math.abs(p) < 0.5 ? "flat" : p > 0 ? "" : "down";
    const txt = d.actual / d.previo >= 5 ? `×${DEC1.format(d.actual / d.previo)}` : `${DEC1.format(Math.abs(p))}%`;
    goal = `<div class="goal ${cls}">${p > 0 ? "▲" : p < 0 ? "▼" : "•"} ${txt} vs. ${d.mesPrev} · este mes ${moneyC(d.actual)}</div>`;
  } else if (d?.actual) goal = `<div class="goal">Este mes ${moneyC(d.actual)}</div>`;

  const per = k.periodos[S.periodo] || k.periodos.semana;
  const vendidoPer = per.pedidos.total + per.pos.total;
  const dias = k.dias.map((x) => {
    const dt = parseFecha(x.dia);
    return { lab: String(dt.getUTCDate()), a: x.pedidos, b: x.pos, tip: `<b>${DIAS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MESES[dt.getUTCMonth()]}</b> · Pedidos <b class="num">${money(x.pedidos)}</b> · Caja <b class="num">${money(x.pos)}</b>` };
  });
  const cobrarPct = k.facturas.total ? Math.round((k.facturas.porCobrar / k.facturas.total) * 100) : 0;
  const nd = "…";

  return `<div class="stack ${S.animado ? "" : "anim"}">
    <div class="hello"><h2>Hola, equipo Idini</h2>
      <p>${cap(hoy.toLocaleDateString("es-CL", { month: "long" }))} · Semana ${semanaISO(hoy)} · Actualizado ${hora(new Date(S.ultimaCarga || Date.now()))}</p></div>

    <section class="card hero">
      ${anillo(tasa, pct(tasa), "tasa de cierre")}
      <div class="t">
        <div class="l">Ventas confirmadas</div>
        <div class="big num">${money(conf.total)}</div>
        <div class="s">${conf.n} de ${conf.n + cot.n} pedidos cerrados</div>
        ${goal}
      </div>
    </section>

    <section class="card">
      <div class="seg" role="tablist">
        ${[["hoy", "Hoy"], ["semana", "7 días"], ["mes", "30 días"]].map(([v, l]) => `<button class="${S.periodo === v ? "on" : ""}" data-periodo="${v}">${l}</button>`).join("")}
      </div>
      <div class="mini">
        <div class="m"><div class="l">Vendido (pedidos + caja)</div><div class="v num">${moneyC(vendidoPer)}</div><div class="s">${plural(per.pedidos.n + per.pos.n, "venta", "ventas")}</div></div>
        <div class="m"><div class="l">Cotizaciones nuevas</div><div class="v num">${moneyC(per.cotizaciones.total)}</div><div class="s">${plural(per.cotizaciones.n, "cotización", "cotizaciones")}</div></div>
        <div class="m"><div class="l">Facturado</div><div class="v num">${moneyC(per.facturas.total)}</div><div class="s">${plural(per.facturas.n, "factura", "facturas")}</div></div>
        <div class="m"><div class="l">Pagos recibidos</div><div class="v num">${moneyC(per.pagos.total)}</div><div class="s">${plural(per.pagos.n, "pago", "pagos")}</div></div>
      </div>
    </section>

    ${seccion("Requiere atención")}
    <section class="card">${alertasHTML(a)}</section>

    <div class="grid2">
      ${tile("doc", "a", a ? moneyC(a.cotizacionesVigentes.total) : nd, a ? `${plural(a.cotizacionesVigentes.n, "cotización vigente", "cotizaciones vigentes")}` : "Cotizaciones vigentes")}
      ${tile("alert", "r", a ? moneyC(a.cotizacionesVencidas.total) : nd, a ? `${plural(a.cotizacionesVencidas.n, "cotización vencida", "cotizaciones vencidas")}` : "Cotizaciones vencidas", a?.cotizacionesVencidas.n ? "warn" : "")}
      ${tile("receipt", "", a ? moneyC(a.porFacturar.total) : nd, a ? `Por facturar · ${plural(a.porFacturar.n, "pedido", "pedidos")}` : "Por facturar")}
      ${tile("clock", "a", moneyC(k.facturas.porCobrar), `Por cobrar · ${cobrarPct}% de lo facturado`, k.facturas.porCobrar > 0 ? "warn" : "")}
      ${tile("check", "", moneyC(k.facturas.total), `Facturado · ${k.facturas.n} facturas`)}
      ${tile("trend", "r", moneyC(k.ventas.ticket), "Ticket promedio por pedido")}
      ${tile("till", "", moneyC(k.pos.total), `Caja cerrada · ${k.pos.n} ventas`)}
      ${tile("inbox", "a", a ? moneyC(a.comprasPorRecibir.total) : nd, a ? `Por recibir · ${plural(a.comprasPorRecibir.n, "compra", "compras")}` : "Compras por recibir")}
    </div>

    ${seccion("Últimos 14 días")}
    <section class="card">
      ${grafico("dias", dias, { stacked: true, h: 180 })}
      <div class="keys"><span><i class="dot"></i> Pedidos</span><span><i class="dot" style="--c:var(--mint)"></i> Caja (POS)</span></div>
    </section>

    ${seccion("Ventas por mes")}
    <section class="card">${graficoMeses("meses", k.meses)}</section>

    ${seccion("Ventas por categoría")}
    <section class="card">${ranking(k.categorias.map((c) => ({ ...c, nombre: ultimoTramo(c.nombre) })), { sub: (c) => `${NUM.format(c.cant)} unidades` })}</section>

    ${seccion("Productos más vendidos")}
    <section class="card">${ranking(k.topProductos, { sub: (p) => `${NUM.format(p.cant)} unidades${p.codigo ? " · " + p.codigo : ""}` })}</section>

    ${seccion("Mejores clientes")}
    <section class="card">${ranking(k.topClientes, { sub: (c) => plural(c.n, "pedido", "pedidos") })}</section>

    ${seccion("Vendedores", `<button data-ir="mas:equipo">Ver equipo</button>`)}
    <section class="card">${ranking(k.topVendedores, { sub: (v) => plural(v.n, "pedido", "pedidos") })}</section>

    ${seccion("Últimos pedidos", `<button data-ir="ventas:">Ver todos</button>`)}
    <div class="list">${k.ultimos.slice(0, 5).map(ventaItem).join("")}</div>
  </div>`;
}

/* ---------- Ventas ---------- */
const ESTADO = {
  draft: ["Cotización", "warn"], sent: ["Cotización enviada", "warn"], sale: ["Confirmada", "good"], done: ["Completada", "good"], cancel: ["Cancelada", "bad"],
};
function ventaItem(o, sinCliente = false) {
  const [txt, cls] = ESTADO[o.estado] || [o.estado, ""];
  const extra = o.vencida ? `<span class="badge bad">Vencida</span>` : o.porFacturar ? `<span class="badge warn">Por facturar</span>` : `<span class="badge ${cls}">${esc(txt)}</span>`;
  return `<button class="item" data-pedido="${o.id}">
    <div class="row"><span class="title">${esc(sinCliente ? o.ref : o.cliente)}</span><span class="price num">${money(o.total)}</span></div>
    <div class="row"><span class="meta">${sinCliente ? "" : esc(o.ref) + " · "}${fecha(o.fecha)}${o.vendedor ? " · " + esc(o.vendedor) : ""}</span>${extra}</div>
  </button>`;
}

async function cargarVentas(reset = false) {
  const v = S.ventas;
  if (v.cargando) return;
  v.cargando = true;
  v.error = null;
  if (reset) { v.items = []; v.total = 0; }
  if (S.tab === "ventas") render();
  try {
    const r = await api(`/api/ventas?${new URLSearchParams({ estado: v.estado, offset: String(v.items.length) })}`);
    v.items = v.items.concat(r.items);
    v.total = r.total;
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError) return;
    v.error = errTxt(e);
  } finally {
    v.cargando = false;
    if (S.tab === "ventas") render({ conservarScroll: true });
  }
}

function renderVentas() {
  const v = S.ventas;
  const chips = [["", "Todas"], ["confirmadas", "Confirmadas"], ["cotizaciones", "Cotizaciones"], ["vencidas", "Vencidas"], ["porfacturar", "Por facturar"]]
    .map(([val, lab]) => `<button class="chip ${v.estado === val ? "on" : ""}" data-estado="${val}">${lab}</button>`).join("");
  let cuerpo;
  if (v.error && !v.items.length) cuerpo = errorBox(v.error, "ventas");
  else if (v.cargando && !v.items.length) cuerpo = esqueleto(6);
  else if (!v.items.length) cuerpo = `<div class="empty">No hay pedidos con este filtro.</div>`;
  else cuerpo = `<div class="count">${plural(v.total, "pedido", "pedidos")}</div><div class="list">${v.items.map(ventaItem).join("")}</div>
      ${v.items.length < v.total ? `<button class="more" data-more="ventas">${v.cargando ? "Cargando…" : "Cargar más"}</button>` : ""}`;
  return `<div class="toolbar"><div class="chips">${chips}</div></div>${cuerpo}`;
}

const FACTURACION = { "to invoice": "Por facturar", invoiced: "Facturado", no: "Nada por facturar", upselling: "Oportunidad de venta" };
const PICKING = { assigned: "Listo", confirmed: "En espera", waiting: "Esperando", done: "Hecho", cancel: "Cancelado", draft: "Borrador" };
const PAGO = { not_paid: "Sin pagar", partial: "Pago parcial", paid: "Pagada", in_payment: "En proceso", reversed: "Revertida" };

async function abrirPedido(id, push = false) {
  abrirSheet(`<div class="sk" style="height:26px;width:55%;margin-bottom:12px"></div>${esqueleto(3, 60)}`, { push });
  try {
    const o = await api(`/api/pedido?id=${id}`);
    const [txt, cls] = ESTADO[o.estado] || [o.estado, ""];
    const vencida = ["draft", "sent"].includes(o.estado) && o.vigencia && o.vigencia < new Date().toISOString().slice(0, 10);
    $("#sheet .body").innerHTML = `<h3>${esc(o.ref)} <span class="badge ${vencida ? "bad" : cls}" style="vertical-align:middle">${vencida ? "Vencida" : esc(txt)}</span></h3>
      <div class="code">${o.clienteId ? `<button class="back" style="margin:0;padding:0;font-weight:700" data-cli="${o.clienteId}" data-push="1">${esc(o.cliente)}</button>` : esc(o.cliente)}</div>
      <div class="card" style="box-shadow:none;background:var(--p2)">
        <div class="kv"><span>Fecha</span><span>${fecha(o.fecha)}</span></div>
        ${o.vigencia ? `<div class="kv"><span>Válida hasta</span><span class="${vencida ? "neg" : ""}">${fecha(o.vigencia)}</span></div>` : ""}
        ${o.vendedor ? `<div class="kv"><span>Vendedor</span><span>${esc(o.vendedor)}</span></div>` : ""}
        <div class="kv"><span>Facturación</span><span>${FACTURACION[o.facturacion] || esc(o.facturacion)}</span></div>
      </div>
      ${seccion("Productos")}
      <div>${o.lineas.map((l) => lrow(esc(l.producto), `${NUM.format(l.cantidad)} × ${money(l.precio)}${l.descuento ? ` · −${NUM.format(l.descuento)}%` : ""}${o.estado === "sale" || o.estado === "done" ? ` · entregado ${NUM.format(l.entregado)}/${NUM.format(l.cantidad)}` : ""}`, money(l.subtotal))).join("") || vacio("Sin líneas.")}</div>
      <div class="card" style="box-shadow:none;background:var(--p2);margin-top:12px">
        <div class="kv"><span>Neto</span><span class="num">${money(o.neto)}</span></div>
        <div class="kv"><span>IVA</span><span class="num">${money(o.iva)}</span></div>
        <div class="kv total"><span>Total</span><span class="num">${money(o.total)}</span></div>
      </div>
      ${o.entregas.length ? seccion("Entregas") + `<div>${o.entregas.map((e) => lrow(esc(e.nombre), fecha(e.fecha), PICKING[e.estado] || esc(e.estado))).join("")}</div>` : ""}
      ${o.facturas.length ? seccion("Facturas") + `<div>${o.facturas.map((f) => lrow(esc(f.nombre), f.estado === "draft" ? "Pendiente de emitir" : PAGO[f.pago] || esc(f.pago), money(f.total), f.saldo > 0 && f.estado === "posted" ? `<span class="badge warn">Saldo ${moneyC(f.saldo)}</span>` : "")).join("")}</div>` : ""}
      ${o.nota ? `<div class="note">${esc(o.nota)}</div>` : ""}
      <button class="btn block" data-close style="margin-top:14px">Cerrar</button>`;
  } catch (e) {
    if (!(e instanceof AuthError)) $("#sheet .body").innerHTML = errorBox(errTxt(e), "cerrar");
  }
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
    const q = new URLSearchParams({ q: p.q, offset: String(p.items.length), modo: p.modo });
    if (p.categ) q.set("categ", p.categ);
    const r = await api(`/api/productos?${q}`);
    if (seq !== p.seq) return; // respuesta de una búsqueda anterior
    p.items = p.items.concat(r.items);
    p.total = r.total;
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError || seq !== p.seq) return;
    p.error = errTxt(e);
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
    <div class="row"><span class="meta">${p.codigo ? esc(p.codigo) + " · " : ""}${esc(ultimoTramo(p.categoria))}</span>${stockBadge(p.stock)}</div>
  </button>`;
}

function renderChips() {
  const el = $("#catChips");
  if (!el) return;
  const cats = S.prod.cats || [];
  el.innerHTML = `<button class="chip ${S.prod.categ ? "" : "on"}" data-categ="">Todas</button>` +
    cats.map((c) => `<button class="chip ${String(S.prod.categ) === String(c.id) ? "on" : ""}" data-categ="${c.id}">${esc(ultimoTramo(c.nombre))}</button>`).join("");
}

function renderLista() {
  const el = $("#prodList");
  if (!el) return;
  const p = S.prod;
  if (p.error && !p.items.length) el.innerHTML = errorBox(p.error, "productos");
  else if (p.cargando && !p.items.length) el.innerHTML = esqueleto(7);
  else if (!p.items.length) el.innerHTML = `<div class="empty">No encontramos productos${p.q ? ` para “${esc(p.q)}”` : ""}.</div>`;
  else el.innerHTML = `<div class="count">${plural(p.total, "producto", "productos")}</div><div class="list">${p.items.map(productoItem).join("")}</div>
      ${p.items.length < p.total ? `<button class="more" data-more="productos">${p.cargando ? "Cargando…" : "Cargar más"}</button>` : ""}`;
}

function renderProductos() {
  const modos = [["", "Todos"], ["stock", "Con stock"], ["negativo", "Stock negativo"], ["sincosto", "Sin costo"]]
    .map(([v, l]) => `<button class="chip ${S.prod.modo === v ? "on" : ""}" data-modo="${v}">${l}</button>`).join("");
  return `<div class="toolbar">
    <label class="search">${ICON.search}
      <input id="q" type="search" inputmode="search" enterkeyhint="search" placeholder="Buscar por nombre o código" autocomplete="off" value="${esc(S.prod.q)}">
    </label>
    <div class="chips">${modos}</div>
    <div id="catChips" class="chips"></div>
  </div>
  <div id="prodList"></div>`;
}

function fichaProducto(p, base) {
  const m = p.margen;
  return `<h3>${esc(p.nombre)}</h3>
    <div class="code">${p.codigo ? "Código " + esc(p.codigo) + " · " : ""}${esc(ultimoTramo(p.categoria))}${p.unidad && !/^units?$/i.test(p.unidad) ? " · " + esc(p.unidad) : ""}</div>
    ${stockBadge(p.stock)} ${p.archivado ? `<span class="badge warn">Archivado</span>` : ""}
    <div class="facts">
      <div class="fact"><div class="l">Precio de lista</div><div class="v num">${money(p.precio)}</div></div>
      <div class="fact"><div class="l">Stock disponible</div><div class="v num ${p.stock < 0 ? "neg" : ""}">${NUM.format(p.stock)}</div></div>
      <div class="fact"><div class="l">Costo</div><div class="v num">${p.costo > 0 ? money(p.costo) : "—"}</div></div>
      <div class="fact"><div class="l">Margen</div><div class="v num">${m == null ? "—" : pct(m)}</div></div>
    </div>
    ${base ? "" : `<div class="card" style="box-shadow:none;background:var(--p2)">
      <div class="kv"><span>Previsto (stock + entradas − salidas)</span><span class="num ${p.previsto < 0 ? "neg" : ""}">${NUM.format(p.previsto)}</span></div>
      <div class="kv"><span>Por recibir</span><span class="num">${NUM.format(p.entrante)}</span></div>
      <div class="kv"><span>Por entregar</span><span class="num">${NUM.format(p.saliente)}</span></div>
      ${p.barras ? `<div class="kv"><span>Código de barras</span><span>${esc(p.barras)}</span></div>` : ""}
    </div>
    ${seccion("Vendido")}
    <div class="card" style="box-shadow:none;background:var(--p2)">
      <div class="kv"><span>En pedidos</span><span class="num">${NUM.format(p.vendido.cant)} un. · ${money(p.vendido.total)}</span></div>
      <div class="kv"><span>En caja (POS)</span><span class="num">${NUM.format(p.vendidoCaja.cant)} un. · ${money(p.vendidoCaja.total)}</span></div>
    </div>
    ${seccion("Stock por ubicación")}
    <div>${p.ubicaciones.length ? p.ubicaciones.map((u) => lrow(esc(u.nombre), u.reservado ? `${NUM.format(u.reservado)} reservado` : "Disponible", `<span class="${u.unidades < 0 ? "neg" : ""}">${NUM.format(u.unidades)} un.</span>`)).join("") : vacio("Sin existencias registradas en bodegas.")}</div>
    ${seccion("Proveedores")}
    <div>${p.proveedores.length ? p.proveedores.map((s) => lrow(esc(s.nombre), `Mínimo ${NUM.format(s.minimo)}`, money(s.precio))).join("") : vacio("Sin proveedores con precio cargado.")}</div>`}
    <button class="btn block" data-close style="margin-top:14px">Cerrar</button>`;
}

async function abrirProducto(id, push = false) {
  const base = S.prod.items.find((x) => x.id === +id);
  abrirSheet(base ? fichaProducto({ ...base, unidad: "", margen: base.costo > 0 && base.precio > 0 ? (base.precio - base.costo) / base.precio : null }, true) : esqueleto(3, 60), { push });
  try {
    const p = await api(`/api/producto?id=${id}`);
    $("#sheet .body").innerHTML = fichaProducto(p, false);
  } catch (e) {
    if (!(e instanceof AuthError) && !base) $("#sheet .body").innerHTML = errorBox(errTxt(e), "cerrar");
  }
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
    const r = await api(`/api/clientes?${new URLSearchParams({ q: c.q, offset: String(c.items.length), modo: c.modo })}`);
    if (seq !== c.seq) return;
    c.items = c.items.concat(r.items);
    c.total = r.total;
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError || seq !== c.seq) return;
    c.error = errTxt(e);
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
  if (c.error && !c.items.length) el.innerHTML = errorBox(c.error, "clientes");
  else if (c.cargando && !c.items.length) el.innerHTML = esqueleto(7, 68);
  else if (!c.items.length) el.innerHTML = `<div class="empty">No encontramos clientes${c.q ? ` para “${esc(c.q)}”` : ""}.</div>`;
  else el.innerHTML = `<div class="count">${plural(c.total, "cliente", "clientes")}</div><div class="list">${c.items.map(clienteItem).join("")}</div>
      ${c.items.length < c.total ? `<button class="more" data-more="clientes">${c.cargando ? "Cargando…" : "Cargar más"}</button>` : ""}`;
}

function renderClientes() {
  const modos = [["", "Con pedidos"], ["todos", "Todos"]].map(([v, l]) => `<button class="chip ${S.cli.modo === v ? "on" : ""}" data-cmodo="${v}">${l}</button>`).join("");
  return `<div class="toolbar">
    <label class="search">${ICON.search}
      <input id="qc" type="search" inputmode="search" enterkeyhint="search" placeholder="Buscar por nombre, RUT o correo" autocomplete="off" value="${esc(S.cli.q)}">
    </label>
    <div class="chips">${modos}</div>
  </div>
  <div id="cliList"></div>`;
}

async function abrirCliente(id, push = false) {
  const base = S.cli.items.find((x) => x.id === +id);
  abrirSheet(`<div class="sk" style="height:26px;width:60%;margin-bottom:12px"></div>${esqueleto(2, 60)}`, { push });
  try {
    const [c, pedidos] = await Promise.all([api(`/api/cliente?id=${id}`), api(`/api/ventas?cliente=${encodeURIComponent(id)}`)]);
    const tel = String(c.telefono || "").replace(/[^\d+]/g, "");
    $("#sheet .body").innerHTML = `<h3>${esc(c.nombre)}</h3>
      <div class="code">${[c.rut, c.ciudad].filter(Boolean).map(esc).join(" · ")}</div>
      ${c.direccion ? `<p class="muted" style="margin-bottom:12px">${esc(c.direccion)}${c.ciudad ? ", " + esc(c.ciudad) : ""}</p>` : ""}
      <div class="btnrow">
        <a class="btn ${tel ? "ac" : "off"}" ${tel ? `href="tel:${tel}"` : ""}>${ICON.phone} Llamar</a>
        <a class="btn ${c.email ? "" : "off"}" ${c.email ? `href="mailto:${esc(c.email)}"` : ""}>${ICON.mail} Correo</a>
      </div>
      ${c.telefono ? `<p class="muted">Tel. ${esc(c.telefono)}</p>` : ""}${c.email ? `<p class="muted">${esc(c.email)}</p>` : ""}
      <div class="facts">
        <div class="fact"><div class="l">Compras confirmadas</div><div class="v num">${moneyC(c.compras.total)}</div><div class="l">${plural(c.compras.n, "pedido", "pedidos")}</div></div>
        <div class="fact"><div class="l">En cotización</div><div class="v num">${moneyC(c.cotizaciones.total)}</div><div class="l">${plural(c.cotizaciones.n, "cotización", "cotizaciones")}</div></div>
        <div class="fact"><div class="l">Por cobrar</div><div class="v num ${c.porCobrar.total > 0 ? "warn-t" : ""}">${moneyC(c.porCobrar.total)}</div><div class="l">${plural(c.porCobrar.n, "factura", "facturas")}</div></div>
        <div class="fact"><div class="l">Pagos recibidos</div><div class="v num">${moneyC(c.pagos.total)}</div><div class="l">${c.ultimaCompra ? "Última compra " + fechaCorta(c.ultimaCompra) : "Sin compras"}</div></div>
      </div>
      ${seccion("Pedidos")}
      <div class="list">${pedidos.items.length ? pedidos.items.map((o) => ventaItem(o, true)).join("") : vacio("Este cliente aún no tiene pedidos.")}</div>
      <button class="btn block" data-close style="margin-top:14px">Cerrar</button>`;
  } catch (e) {
    if (!(e instanceof AuthError)) $("#sheet .body").innerHTML = base ? `<h3>${esc(base.nombre)}</h3>${errorBox(errTxt(e), "cerrar")}` : errorBox(errTxt(e), "cerrar");
  }
}

/* ---------- Más: menú y reportes ---------- */
function renderMas() {
  if (S.sub) return renderSub();
  return `<div class="stack">
    <div class="subhead"><h2>Más reportes</h2><p>Todo lo que hay en Odoo, ordenado por área.</p></div>
    <div class="menu">${Object.entries(SUBS).map(([k, s]) => `<button class="mcard ${s.cls}" data-sub="${k}"><div class="ic">${ICON[s.icono]}</div><b>${s.titulo}</b><span>${s.desc}</span></button>`).join("")}</div>
  </div>`;
}

async function cargarReporte(nombre, { forzar = false } = {}) {
  const r = (S.rep[nombre] ||= { d: null, error: null, cargando: false });
  if (r.cargando || (r.d && !forzar && Date.now() - (r.t || 0) < 60000)) return;
  r.cargando = true;
  r.error = null;
  if (S.tab === "mas" && S.sub === nombre && !r.d) render();
  try {
    r.d = await api(`/api/${nombre}`);
    r.t = Date.now();
    setOffline(false);
  } catch (e) {
    if (e instanceof AuthError) return;
    if (e.message === "offline") setOffline(true);
    else r.error = e.message;
  } finally {
    r.cargando = false;
    if (S.tab === "mas" && S.sub === nombre) render({ conservarScroll: true });
  }
}

function renderSub() {
  const meta = SUBS[S.sub];
  const r = S.rep[S.sub] || {};
  const cab = `<button class="back" data-sub="">${ICON.back} Más</button><div class="subhead"><h2>${meta.titulo}</h2><p>${meta.desc}</p></div>`;
  if (!r.d) return `<div class="stack">${cab}${r.error ? errorBox(r.error, "sub") : `<div class="sk" style="height:150px"></div>${esqueleto(3, 90)}`}</div>`;
  return `<div class="stack ${S.animado ? "" : "anim"}">${cab}${REPORTES[S.sub](r.d)}</div>`;
}

const REPORTES = {
  cobranza(d) {
    const T = d.tramos;
    const tr = [["Al día", T.alDia, "var(--mint)"], ["1–30 días", T.d30, "var(--amb)"], ["31–60 días", T.d60, "#FF9B54"], ["61–90 días", T.d90, "var(--red)"], ["+90 días", T.mas, "#B0301F"]];
    const totalT = tr.reduce((a, [, t]) => a + t.total, 0) || 1;
    return `<section class="card hero">
        ${anillo(d.porCobrar.total ? 1 - d.vencido.total / d.porCobrar.total : 1, d.porCobrar.total ? pct(1 - d.vencido.total / d.porCobrar.total) : "100%", "al día")}
        <div class="t"><div class="l">Por cobrar</div><div class="big num">${money(d.porCobrar.total)}</div><div class="s">${plural(d.porCobrar.n, "factura", "facturas")}</div>
        <div class="goal ${d.vencido.n ? "down" : ""}">${d.vencido.n ? `${moneyC(d.vencido.total)} vencido · ${plural(d.vencido.n, "factura", "facturas")}` : "Nada vencido"}</div></div>
      </section>
      ${seccion("Antigüedad de la deuda")}
      <section class="card">
        <div class="stackbar">${tr.map(([, t, c]) => (t.total > 0 ? `<i style="width:${(t.total / totalT) * 100}%;background:${c}"></i>` : "")).join("")}</div>
        <div class="legend">${tr.map(([l, t, c]) => `<div><i class="dot" style="--c:${c}"></i>${l}<b>${moneyC(t.total)}</b></div>`).join("")}</div>
      </section>
      ${seccion("Quiénes deben")}
      <section class="card">${ranking(d.deudores, { sub: () => "" })}</section>
      ${seccion("Facturas pendientes")}
      <section class="card">${d.facturas.length ? d.facturas.map((f) => lrow(esc(f.cliente), `${esc(f.nombre)} · vence ${fechaCorta(f.vence)}`, money(f.saldo), f.diasVencida > 0 ? `<span class="badge bad">${f.diasVencida} d vencida</span>` : `<span class="badge good">Al día</span>`)).join("") : vacio("No hay facturas pendientes de cobro.")}</section>
      ${seccion("Pagos recibidos por mes")}
      <section class="card">${graficoMeses("pagos", d.pagosMeses.map((m) => ({ ...m, mes: m.mes })))}</section>
      ${seccion("Últimos pagos")}
      <section class="card">${d.pagos.length ? d.pagos.map((p) => lrow(esc(p.cliente), `${esc(p.nombre)} · ${fechaCorta(p.fecha)}`, money(p.monto), `<span class="badge ${p.estado === "paid" ? "good" : "warn"}">${p.estado === "paid" ? "Conciliado" : "En proceso"}</span>`)).join("") : vacio("Sin pagos registrados.")}</section>
      ${d.porFacturar.length ? seccion("Pedidos por facturar") + `<section class="card">${d.porFacturar.map((o) => lrow(esc(o.cliente), `${esc(o.ref)} · ${fechaCorta(o.fecha)}`, money(o.total))).join("")}</section>` : ""}
      ${d.borradores.length ? seccion("Facturas en borrador") + `<section class="card">${d.borradores.map((b) => lrow(esc(b.cliente), "Sin emitir", money(b.total))).join("")}</section>` : ""}`;
  },

  compras(d) {
    const REC = { pending: ["Por recibir", "warn"], partial: ["Recibida en parte", "warn"], full: ["Recibida", "good"] };
    const EST = { draft: "Borrador", sent: "Enviada", purchase: "Confirmada", done: "Cerrada", cancel: "Anulada" };
    return `<div class="grid2">
        ${tile("cart", "m1", moneyC(d.comprado.total), `Comprado · ${plural(d.comprado.n, "orden", "órdenes")}`)}
        ${tile("inbox", "a", moneyC(d.porRecibir.total), `Por recibir · ${d.porRecibir.n}`, d.porRecibir.n ? "warn" : "")}
        ${tile("receipt", "r", moneyC(d.ticket), "Ticket promedio de compra")}
        ${tile("users", "", NUM.format(d.proveedoresConPrecios), "Proveedores con precios cargados")}
      </div>
      ${seccion("Compras por mes")}
      <section class="card">${graficoMeses("comprasm", d.meses)}</section>
      ${seccion("Proveedores principales")}
      <section class="card">${ranking(d.proveedores, { sub: (p) => plural(p.n, "orden", "órdenes") })}</section>
      ${seccion("Recepciones pendientes")}
      <section class="card">${d.recepciones.length ? d.recepciones.map((r) => lrow(esc(r.proveedor), `${esc(r.nombre)}${r.origen ? " · " + esc(r.origen) : ""} · ${fechaCorta(r.fecha)}`, atraso(r.diasAtraso) || "En plazo")).join("") : vacio("No hay recepciones pendientes.")}</section>
      ${seccion("Órdenes de compra")}
      <section class="card">${d.ordenes.map((o) => { const rc = REC[o.recepcion]; return lrow(esc(o.proveedor), `${esc(o.ref)} · ${fechaCorta(o.fecha)}${o.comprador ? " · " + esc(o.comprador) : ""}`, money(o.total), o.state === "cancel" || o.estado === "cancel" ? `<span class="badge bad">Anulada</span>` : rc && o.estado === "purchase" ? `<span class="badge ${rc[1]}">${rc[0]}</span>` : `<span class="badge">${EST[o.estado] || esc(o.estado)}</span>`); }).join("")}</section>`;
  },

  inventario(d) {
    const neg = d.negativos.length;
    return `<div class="grid2">
        ${tile("store", "", NUM.format(d.almacenes), "Bodegas y sucursales")}
        ${tile("box", "m1", NUM.format(d.conStock), "Líneas de stock positivo")}
        ${tile("truck", "a", NUM.format(d.entregas.n), `Entregas pendientes${d.entregas.atrasadas ? " · " + d.entregas.atrasadas + " atrasadas" : ""}`, d.entregas.atrasadas ? "warn" : "")}
        ${tile("inbox", "r", NUM.format(d.recepciones.n), `Recepciones pendientes${d.recepciones.atrasadas ? " · " + d.recepciones.atrasadas + " atrasadas" : ""}`)}
      </div>
      ${seccion("Existencias por ubicación")}
      <section class="card">${d.ubicaciones.length ? d.ubicaciones.map((u) => lrow(esc(u.almacen), `${esc(u.nombre)} · ${plural(u.lineas, "producto", "productos")}`, `<span class="${u.unidades < 0 ? "neg" : ""}">${NUM.format(u.unidades)} un.</span>`)).join("") : vacio("Sin existencias registradas.")}
        <div class="note">Unidades netas por ubicación. Un total negativo significa que se vendió o entregó más de lo que se recibió en el sistema. Reservado en pedidos: ${NUM.format(d.reservado)} un.</div></section>
      ${seccion("Entregas pendientes")}
      <section class="card">${d.entregas.lista.length ? d.entregas.lista.map((e) => lrow(esc(e.contraparte), `${esc(e.nombre)}${e.origen ? " · " + esc(e.origen) : ""} · ${fechaCorta(e.fecha)}`, atraso(e.diasAtraso) || "En plazo", `<span class="badge ${e.estado === "assigned" ? "good" : "warn"}">${PICKING[e.estado] || ""}</span>`)).join("") : vacio("No hay entregas pendientes.")}</section>
      ${seccion("Recepciones pendientes")}
      <section class="card">${d.recepciones.lista.length ? d.recepciones.lista.map((e) => lrow(esc(e.contraparte), `${esc(e.nombre)}${e.origen ? " · " + esc(e.origen) : ""} · ${fechaCorta(e.fecha)}`, atraso(e.diasAtraso) || "En plazo")).join("") : vacio("No hay recepciones pendientes.")}</section>
      ${seccion(`Stock negativo${neg ? `<span class="pill-n">${neg}</span>` : ""}`, `<button data-ir="prod:negativo">Ver productos</button>`)}
      <section class="card">${neg ? d.negativos.map((q) => lrow(esc(q.producto), `${q.codigo ? esc(q.codigo) + " · " : ""}${esc(q.ubicacion)}`, `<span class="neg">${NUM.format(q.cantidad)} un.</span>`)).join("") : `<div class="todo-ok">${ICON.check} Sin stock negativo.</div>`}</section>`;
  },

  pos(d) {
    const totM = d.metodos.reduce((a, m) => a + m.total, 0) || 1;
    const col = ["var(--ac)", "var(--mint)", "var(--amb)", "#8FA7B8", "#C9B79C"];
    const dias = d.dias.map((x) => {
      const dt = parseFecha(x.dia);
      return { lab: String(dt.getUTCDate()), a: x.total, tip: `<b>${DIAS[dt.getUTCDay()]} ${dt.getUTCDate()} ${MESES[dt.getUTCMonth()]}</b> · <b class="num">${money(x.total)}</b> · ${plural(x.n, "venta", "ventas")}` };
    });
    const SES = { opened: ["Abierta", "warn"], closed: ["Cerrada", "good"], opening_control: ["Abriendo", "warn"], closing_control: ["Cerrando", "warn"] };
    return `<div class="grid2">
        ${tile("till", "m1", moneyC(d.cerradas.total), `Ventas cerradas · ${d.cerradas.n}`)}
        ${tile("receipt", "r", moneyC(d.ticket), "Ticket promedio")}
        ${tile("clock", "a", moneyC(d.abiertas.total), `Órdenes abiertas · ${d.abiertas.n}`, d.abiertas.n ? "warn" : "")}
        ${tile("alert", "", NUM.format(d.anuladas), "Órdenes anuladas")}
      </div>
      ${d.abiertas.n ? `<div class="note">Hay ${plural(d.abiertas.n, "orden", "órdenes")} en caja por ${money(d.abiertas.total)} que todavía no se cobran ni se cierran. Quedan fuera de las ventas cerradas hasta que se pague la orden o se cierre la sesión.</div>` : ""}
      ${seccion("Ventas de caja · 14 días")}
      <section class="card">${grafico("posdias", dias)}</section>
      ${seccion("Métodos de pago")}
      <section class="card">
        <div class="stackbar">${d.metodos.map((m, i) => `<i style="width:${(m.total / totM) * 100}%;background:${col[i % col.length]}"></i>`).join("")}</div>
        <div class="legend">${d.metodos.map((m, i) => `<div><i class="dot" style="--c:${col[i % col.length]}"></i>${esc(m.nombre)}<b>${pct(m.total / totM)}</b></div>`).join("")}</div>
        <div style="margin-top:14px">${ranking(d.metodos, { sub: (m) => plural(m.n, "pago", "pagos") })}</div>
      </section>
      ${seccion("Por sucursal")}
      <section class="card">${ranking(d.sucursales, { sub: (s) => plural(s.n, "venta", "ventas") })}</section>
      ${seccion("Por cajero")}
      <section class="card">${ranking(d.cajeros, { sub: (c) => plural(c.n, "venta", "ventas") })}</section>
      ${seccion("Más vendidos en caja")}
      <section class="card">${ranking(d.productos, { sub: (p) => `${NUM.format(p.cant)} unidades` })}</section>
      ${seccion("Sesiones de caja")}
      <section class="card">${d.sesiones.map((s) => { const e = SES[s.estado] || [s.estado, ""]; return lrow(esc(s.nombre), `${esc(s.sucursal)} · desde ${fecha(s.inicio)}`, `<span class="badge ${e[1]}">${e[0]}</span>`); }).join("")}</section>`;
  },

  equipo(d) {
    const max = Math.max(...d.personas.map((p) => p.vendido), 1);
    return `<section class="card hero">
        <div class="t"><div class="l">Vendido por el equipo</div><div class="big num">${money(d.totalVendido)}</div><div class="s">Pedidos confirmados + ventas de caja cerradas</div></div>
      </section>
      ${seccion("Por persona")}
      <div class="list">${d.personas.map((p) => `<div class="item">
        <div class="row"><span class="title">${esc(p.nombre)}</span><span class="price num">${moneyC(p.vendido)}</span></div>
        <div class="rank-bar"><i style="width:${Math.max(3, (p.vendido / max) * 100)}%"></i></div>
        <div class="row"><span class="meta">${plural(p.pedidos.n, "pedido", "pedidos")} · ${plural(p.caja.n, "venta de caja", "ventas de caja")}</span>
          <span class="meta">${p.cierre == null ? "Sin cotizaciones" : `Cierre ${pct(p.cierre)}`}</span></div>
        ${p.cotizaciones.n ? `<span class="meta">${plural(p.cotizaciones.n, "cotización abierta", "cotizaciones abiertas")} por ${moneyC(p.cotizaciones.total)}</span>` : ""}
      </div>`).join("")}</div>
      <div class="note">Cierre = pedidos confirmados ÷ (confirmados + cotizaciones abiertas) de cada vendedor.</div>`;
  },

  catalogo(d) {
    const comp = d.total ? d.conCosto / d.total : 0;
    return `<section class="card hero">
        ${anillo(comp, pct(comp), "con costo")}
        <div class="t"><div class="l">Productos activos</div><div class="big num">${NUM.format(d.total)}</div><div class="s">${NUM.format(d.sinCosto)} sin costo cargado</div>
        <div class="goal ${comp < 0.9 ? "down" : ""}">${comp < 0.9 ? "Sin costo no se puede calcular margen" : "Catálogo completo"}</div></div>
      </section>
      <div class="grid2">
        ${tile("check", "m1", NUM.format(d.conPrecio), `Con precio de venta · ${pct(d.total ? d.conPrecio / d.total : 0)}`)}
        ${tile("box", "", NUM.format(d.conStock), "Con stock disponible")}
        ${tile("book", "a", NUM.format(d.categorias), "Categorías")}
        ${tile("alert", "r", NUM.format(d.sinPrecio), "Sin precio de venta", d.sinPrecio ? "warn" : "")}
      </div>
      ${seccion("Categorías con más productos")}
      <section class="card">${ranking(d.topCategorias.map((c) => ({ ...c, nombre: ultimoTramo(c.nombre) })), { valor: (c) => c.n, fmt: (n) => NUM.format(n), sub: () => "" })}</section>
      ${seccion("Proveedores con precios cargados")}
      <section class="card">${ranking(d.proveedores, { valor: (c) => c.n, fmt: (n) => plural(n, "producto", "productos"), sub: () => "" })}</section>
      ${seccion("Listas de precios")}
      <section class="card">${d.listasPrecio.map((l) => `<span class="chip-s">${esc(l)}</span>`).join("")}</section>
      <button class="btn block" data-ir="prod:sincosto">Ver productos sin costo</button>`;
  },

  proyecto(d) {
    return `<section class="card hero">
        ${anillo(d.avance, pct(d.avance), "completado")}
        <div class="t"><div class="l">${esc(d.proyecto)}</div><div class="big num">${d.listas} de ${d.total}</div><div class="s">tareas terminadas</div>
        <div class="goal ${d.atrasadas ? "down" : ""}">${d.atrasadas ? `${plural(d.atrasadas, "tarea atrasada", "tareas atrasadas")}` : "Todo en plazo"}</div></div>
      </section>
      ${seccion("Por fase")}
      <section class="card">${ranking(d.etapas, { valor: (e) => e.n, fmt: (n) => plural(n, "tarea", "tareas"), sub: () => "" })}</section>
      ${seccion("Estado de las tareas")}
      <section class="card">${ranking(d.estados, { valor: (e) => e.n, fmt: (n) => NUM.format(n), sub: () => "" })}</section>
      ${seccion("Próximas y atrasadas")}
      <section class="card">${d.proximas.length ? d.proximas.map((t) => lrow(esc(t.nombre), `${esc(t.etapa || "Sin fase")} · ${t.vence ? "vence " + fechaCorta(t.vence) : "sin fecha"}`, t.dias > 0 ? `<span class="neg">${t.dias} d atraso</span>` : "En plazo")).join("") : vacio("No hay tareas abiertas.")}</section>`;
  },
};

/* ---------- Hoja de detalle ---------- */
const pila = [];
function abrirSheet(html, { push = false } = {}) {
  const sh = $("#sheet");
  if (push && !sh.hidden) pila.push(sh.innerHTML);
  else if (!push) pila.length = 0;
  sh.innerHTML = `<div class="grab"></div>${pila.length ? `<button class="back" data-back>${ICON.back} Volver</button>` : ""}<div class="body">${html}</div>`;
  sh.scrollTop = 0;
  $("#sheetBg").hidden = false;
  sh.hidden = false;
}
function volverSheet() {
  const h = pila.pop();
  if (h) { $("#sheet").innerHTML = h; $("#sheet").scrollTop = 0; } else cerrarSheet();
}
function cerrarSheet() {
  pila.length = 0;
  $("#sheet").hidden = true;
  $("#sheetBg").hidden = true;
}
$("#sheetBg").addEventListener("click", cerrarSheet);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") cerrarSheet(); });

/* ---------- Render y eventos ---------- */
function render({ conservarScroll = false } = {}) {
  const v = $("#view");
  const y = v.scrollTop;
  if (S.tab === "resumen") { v.innerHTML = renderResumen(); postRender(); }
  else if (S.tab === "ventas") v.innerHTML = renderVentas();
  else if (S.tab === "productos") { v.innerHTML = renderProductos(); renderChips(); renderLista(); }
  else if (S.tab === "clientes") { v.innerHTML = renderClientes(); renderListaClientes(); }
  else { v.innerHTML = renderMas(); postRender(); }
  if (conservarScroll) v.scrollTop = y;
}

// Anima los anillos la primera vez que aparecen.
function postRender() {
  const fgs = $$(".ringw .fg");
  if (fgs.length && !S.animado) requestAnimationFrame(() => requestAnimationFrame(() => fgs.forEach((fg) => { fg.style.strokeDashoffset = fg.dataset.target; })));
  if (fgs.length) S.animado = true;
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

function accion(e) {
  const g = e.target.closest("g[data-g]");
  if (g) {
    const it = GRAF[g.dataset.g]?.[+g.dataset.i];
    const chart = g.closest("svg");
    $$(".bar, .bar2", chart).forEach((b) => b.classList.add("dim"));
    $$(".bar, .bar2", g).forEach((b) => { b.classList.remove("dim"); b.classList.add("sel"); });
    $$(".bar.sel, .bar2.sel", chart).forEach((b) => { if (!g.contains(b)) b.classList.remove("sel"); });
    const tip = $(`#tip-${g.dataset.g}`);
    if (tip && it) tip.innerHTML = it.tip;
    return;
  }
  const t = e.target.closest("button, a");
  if (!t) return;
  const d = t.dataset;
  const push = !!d.push || !$("#sheet").hidden;
  if (d.close !== undefined) cerrarSheet();
  else if (d.back !== undefined) volverSheet();
  else if (d.estado !== undefined) { S.ventas.estado = d.estado; cargarVentas(true); }
  else if (d.categ !== undefined) { S.prod.categ = d.categ; renderChips(); cargarProductos(true); }
  else if (d.modo !== undefined) { S.prod.modo = d.modo; render({ conservarScroll: true }); cargarProductos(true); }
  else if (d.cmodo !== undefined) { S.cli.modo = d.cmodo; render({ conservarScroll: true }); cargarClientes(true); }
  else if (d.periodo) { S.periodo = d.periodo; store.set("idini_periodo", d.periodo); render({ conservarScroll: true }); }
  else if (d.pedido) abrirPedido(d.pedido, push);
  else if (d.prod) abrirProducto(d.prod, push);
  else if (d.cli) abrirCliente(d.cli, push);
  else if (d.ir) { cerrarSheet(); ir(d.ir); }
  else if (d.sub !== undefined) { S.sub = d.sub || null; render(); $("#view").scrollTop = 0; if (S.sub) cargarReporte(S.sub); }
  else if (d.more === "ventas") cargarVentas();
  else if (d.more === "productos") cargarProductos();
  else if (d.more === "clientes") cargarClientes();
  else if (d.retry === "kpis") { S.kpisError = null; cargarKpis(); }
  else if (d.retry === "ventas") cargarVentas(true);
  else if (d.retry === "productos") cargarProductos(true);
  else if (d.retry === "clientes") cargarClientes(true);
  else if (d.retry === "sub") cargarReporte(S.sub, { forzar: true });
  else if (d.retry === "cerrar") cerrarSheet();
}
$("#view").addEventListener("click", accion);
$("#sheet").addEventListener("click", accion);

$("#refresh").addEventListener("click", () => {
  if (S.tab === "resumen") cargarKpis({ silencioso: true });
  else if (S.tab === "ventas") cargarVentas(true);
  else if (S.tab === "productos") cargarProductos(true);
  else if (S.tab === "clientes") cargarClientes(true);
  else if (S.sub) cargarReporte(S.sub, { forzar: true });
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
  S.alertas = store.get("idini_cache_alertas");
  go(S.tab);
  cargarKpis({ silencioso: true });
}

if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
}
token ? iniciar() : mostrarLogin();
