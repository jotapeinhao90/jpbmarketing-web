// Puente entre la app móvil y Odoo (JSON-2). La clave API vive solo aquí como secreto.
const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

// Odoo Online limita las conexiones simultáneas: máximo 3 llamadas en vuelo y reintento con espera.
let enVuelo = 0;
const cola = [];
async function turno() {
  if (enVuelo >= 3) await new Promise((r) => cola.push(r));
  enVuelo++;
}
function liberar() {
  enVuelo--;
  cola.shift()?.();
}

async function odoo(env, model, method, body) {
  let ultimo;
  for (let intento = 0; intento < 4; intento++) {
    if (intento) await new Promise((r) => setTimeout(r, 250 * 2 ** intento));
    await turno();
    try {
      const r = await fetch(`${env.ODOO_URL}/json/2/${model}/${method}`, {
        method: "POST",
        headers: {
          Authorization: `bearer ${env.ODOO_KEY}`,
          "X-Odoo-Database": env.ODOO_DB,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const texto = await r.text();
      let data;
      try { data = JSON.parse(texto); } catch { ultimo = new Error(`Odoo respondió ${r.status} (reintentando)`); continue; }
      if (!r.ok) {
        ultimo = new Error(data?.message || `Odoo ${r.status}`);
        if (r.status >= 500 || r.status === 429) continue;
        throw ultimo;
      }
      return data;
    } finally {
      liberar();
    }
  }
  throw ultimo || new Error("Odoo no respondió");
}

const group = (env, model, domain, groupby, aggregates, extra = {}) =>
  odoo(env, model, "formatted_read_group", { domain, groupby, aggregates, ...extra });

const enc = new TextEncoder();
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(env, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

// Comparación en tiempo constante (hash de ambos lados para igualar largos).
async function safeEqual(env, a, b) {
  const [x, y] = await Promise.all([hmac(env, `eq:${a}`), hmac(env, `eq:${b}`)]);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return d === 0;
}

const SESION_DIAS = 30;

async function firmar(env, usuario) {
  const payload = b64u(enc.encode(JSON.stringify({ u: usuario, exp: Date.now() + SESION_DIAS * 864e5 })));
  return `${payload}.${await hmac(env, payload)}`;
}

async function autorizado(req, env) {
  const h = req.headers.get("authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : "";
  const [payload, firma] = token.split(".");
  if (!payload || !firma || !(await safeEqual(env, firma, await hmac(env, payload)))) return false;
  try {
    const { exp } = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return exp > Date.now();
  } catch {
    return false;
  }
}

async function login(req, env) {
  let body = {};
  try { body = await req.json(); } catch {}
  const okU = await safeEqual(env, String(body.user || "").trim().toLowerCase(), env.APP_USER.toLowerCase());
  const okP = await safeEqual(env, String(body.pass || ""), env.APP_PASS);
  if (!(okU && okP)) {
    await new Promise((r) => setTimeout(r, 700)); // frena fuerza bruta
    return json({ error: "Usuario o contraseña incorrectos" }, 401);
  }
  return json({ token: await firmar(env, env.APP_USER), dias: SESION_DIAS });
}

const CONFIRMED = [["state", "in", ["sale", "done"]]];

async function kpis(env) {
  const desde = new Date(Date.now() - 365 * 864e5).toISOString().slice(0, 10);
  const [estados, meses, prodTop, clientes, vendedores, ultimos, facturas, nProd, nConStock, nClientes, pos] =
    await Promise.all([
      group(env, "sale.order", [], ["state"], ["amount_total:sum", "__count"]),
      group(env, "sale.order", [...CONFIRMED, ["date_order", ">=", desde]], ["date_order:month"], ["amount_total:sum", "__count"], { order: "date_order:month asc" }),
      group(env, "sale.order.line", [["order_id.state", "in", ["sale", "done"]]], ["product_id"], ["price_subtotal:sum", "product_uom_qty:sum"], { order: "price_subtotal:sum desc", limit: 8 }),
      group(env, "sale.order", CONFIRMED, ["partner_id"], ["amount_total:sum", "__count"], { order: "amount_total:sum desc", limit: 6 }),
      group(env, "sale.order", CONFIRMED, ["user_id"], ["amount_total:sum", "__count"], { order: "amount_total:sum desc", limit: 6 }),
      odoo(env, "sale.order", "search_read", { domain: [], fields: ["name", "date_order", "amount_total", "state", "partner_id", "user_id"], limit: 8, order: "date_order desc" }),
      group(env, "account.move", [["move_type", "=", "out_invoice"], ["state", "=", "posted"]], [], ["amount_total:sum", "amount_residual:sum", "__count"]),
      odoo(env, "product.product", "search_count", { domain: [["active", "=", true]] }),
      odoo(env, "product.product", "search_count", { domain: [["qty_available", ">", 0]] }),
      odoo(env, "res.partner", "search_count", { domain: [["customer_rank", ">", 0]] }),
      group(env, "pos.order", [["state", "in", ["paid", "done", "invoiced"]]], [], ["amount_total:sum", "__count"]),
    ]);

  const est = Object.fromEntries(estados.map((e) => [e.state, { total: e["amount_total:sum"], n: e.__count }]));
  const conf = { total: (est.sale?.total || 0) + (est.done?.total || 0), n: (est.sale?.n || 0) + (est.done?.n || 0) };
  const f = facturas[0] || {};
  return {
    generado: new Date().toISOString(),
    ventas: { confirmadas: conf, cotizaciones: est.draft || { total: 0, n: 0 }, ticket: conf.n ? conf.total / conf.n : 0 },
    facturas: { total: f["amount_total:sum"] || 0, porCobrar: f["amount_residual:sum"] || 0, n: f.__count || 0 },
    pos: { total: pos[0]?.["amount_total:sum"] || 0, n: pos[0]?.__count || 0 },
    catalogo: { productos: nProd, conStock: nConStock, clientes: nClientes },
    meses: meses.map((m) => ({ desde: m["date_order:month"][0], mes: m["date_order:month"][1], total: m["amount_total:sum"], n: m.__count })),
    topProductos: prodTop.map((p) => ({ nombre: (p.product_id?.[1] || "—").replace(/^\[[^\]]*\]\s*/, ""), codigo: (p.product_id?.[1] || "").match(/^\[([^\]]*)\]/)?.[1] || "", total: p["price_subtotal:sum"], cant: p["product_uom_qty:sum"] })),
    topClientes: clientes.map((c) => ({ nombre: c.partner_id?.[1] || "—", total: c["amount_total:sum"], n: c.__count })),
    topVendedores: vendedores.map((v) => ({ nombre: v.user_id?.[1] || "Sin asignar", total: v["amount_total:sum"], n: v.__count })),
    ultimos: ultimos.map((o) => ({ ref: o.name, fecha: o.date_order, total: o.amount_total, estado: o.state, cliente: o.partner_id?.[1] || "—", vendedor: o.user_id?.[1] || "" })),
  };
}

const KPI_TTL_MS = 60_000;
let kpiMem = null; // { t, data } — caché por instancia del Worker

async function kpisCacheado(env, ctx) {
  if (kpiMem && Date.now() - kpiMem.t < KPI_TTL_MS) return json(kpiMem.data, 200, { "x-cache": "hit" });
  try {
    const data = await kpis(env);
    kpiMem = { t: Date.now(), data };
    return json(data);
  } catch (e) {
    if (kpiMem) return json(kpiMem.data, 200, { "x-cache": "stale" }); // mejor datos de hace unos minutos que un error
    throw e;
  }
}

async function productos(env, url) {
  const q = (url.searchParams.get("q") || "").trim();
  const categ = url.searchParams.get("categ");
  const soloStock = url.searchParams.get("stock") === "1";
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const domain = [["active", "=", true]];
  if (q) domain.push("|", ["name", "ilike", q], ["default_code", "ilike", q]);
  if (categ) domain.push(["categ_id", "=", parseInt(categ, 10)]);
  if (soloStock) domain.push(["qty_available", ">", 0]);
  const [items, total] = await Promise.all([
    odoo(env, "product.product", "search_read", {
      domain, fields: ["name", "default_code", "list_price", "standard_price", "qty_available", "categ_id"],
      limit: 30, offset, order: "name asc, id asc",
    }),
    odoo(env, "product.product", "search_count", { domain }),
  ]);
  return {
    total,
    items: items.map((p) => ({
      id: p.id, nombre: p.name, codigo: p.default_code || "", precio: p.list_price, costo: p.standard_price,
      stock: p.qty_available, categoria: p.categ_id?.[1] || "",
    })),
  };
}

async function ventas(env, url) {
  const estado = url.searchParams.get("estado");
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const domain = [];
  const cliente = parseInt(url.searchParams.get("cliente") || "", 10);
  if (cliente) domain.push(["partner_id", "=", cliente]);
  if (estado === "confirmadas") domain.push(["state", "in", ["sale", "done"]]);
  else if (estado === "cotizaciones") domain.push(["state", "in", ["draft", "sent"]]);
  const [items, total] = await Promise.all([
    odoo(env, "sale.order", "search_read", { domain, fields: ["name", "date_order", "amount_total", "state", "partner_id", "user_id"], limit: 25, offset, order: "date_order desc" }),
    odoo(env, "sale.order", "search_count", { domain }),
  ]);
  return {
    total,
    items: items.map((o) => ({ ref: o.name, fecha: o.date_order, total: o.amount_total, estado: o.state, cliente: o.partner_id?.[1] || "—", vendedor: o.user_id?.[1] || "" })),
  };
}

async function clientes(env, url) {
  const q = (url.searchParams.get("q") || "").trim();
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") || "0", 10));
  const domain = [["customer_rank", ">", 0], ["is_company", "=", true]];
  if (q) domain.push("|", "|", ["name", "ilike", q], ["vat", "ilike", q], ["email", "ilike", q]);
  const [items, total] = await Promise.all([
    odoo(env, "res.partner", "search_read", { domain, fields: ["name", "vat", "city", "phone", "email", "street"], limit: 30, offset, order: "name asc, id asc" }),
    odoo(env, "res.partner", "search_count", { domain }),
  ]);
  const f = (v) => (v === false || v == null ? "" : v);
  return {
    total,
    items: items.map((c) => ({ id: c.id, nombre: c.name, rut: f(c.vat), ciudad: f(c.city), telefono: f(c.phone), email: f(c.email), direccion: f(c.street) })),
  };
}

async function categorias(env) {
  const g = await group(env, "product.product", [["active", "=", true]], ["categ_id"], ["__count"], { order: "__count desc", limit: 40 });
  return g.map((c) => ({ id: c.categ_id?.[0], nombre: c.categ_id?.[1] || "Sin categoría", n: c.__count }));
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      if (url.pathname === "/api/login" && req.method === "POST") return await login(req, env);
      if (!(await autorizado(req, env))) return json({ error: "Sesión expirada" }, 401);
      if (url.pathname === "/api/kpis") return await kpisCacheado(env, ctx);
      if (url.pathname === "/api/productos") return json(await productos(env, url));
      if (url.pathname === "/api/ventas") return json(await ventas(env, url));
      if (url.pathname === "/api/clientes") return json(await clientes(env, url));
      if (url.pathname === "/api/categorias") return json(await categorias(env));
      return json({ error: "No existe" }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 502);
    }
  },
};
