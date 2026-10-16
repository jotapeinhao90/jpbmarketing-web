// Puente entre la app móvil y Odoo (JSON-2). La clave API vive solo aquí como secreto.
import * as R from "./reportes.js";
import { limitador } from "./odoo.js";

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
  });

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


// Caché corta (60 s) compartida entre instancias con la Cache API de Cloudflare, más una copia en memoria
// para servir lo último que funcionó si Odoo falla ("stale-if-error").
const TTL_S = 60;
const memoria = new Map();

async function cacheado(clave, fn, origen) {
  const llave = new Request(`${origen}/__cache${clave}`);
  try {
    const hit = await caches.default.match(llave);
    if (hit) return json(await hit.json(), 200, { "x-cache": "hit" });
  } catch {}
  try {
    const data = await fn();
    memoria.set(clave, data);
    try {
      await caches.default.put(llave, new Response(JSON.stringify(data), { headers: { "content-type": "application/json", "cache-control": `public, max-age=${TTL_S}` } }));
    } catch {}
    return json(data);
  } catch (e) {
    if (memoria.has(clave)) return json(memoria.get(clave), 200, { "x-cache": "stale" });
    throw e;
  }
}

const entero = (url, k) => {
  const n = parseInt(url.searchParams.get(k) || "", 10);
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Falta el parámetro ${k}`);
  return n;
};

// Reportes agregados (se cachean 60 s).
const REPORTES = {
  "/api/kpis": R.kpis, "/api/alertas": R.alertas, "/api/cobranza": R.cobranza, "/api/compras": R.compras,
  "/api/inventario": R.inventario, "/api/pos": R.pos, "/api/equipo": R.equipo, "/api/proyecto": R.proyecto, "/api/catalogo": R.catalogo,
  "/api/categorias": R.categorias,
};

export default {
  async fetch(req, envBase) {
    const env = { ...envBase, lim: limitador(4) }; // limitador propio de esta petición
    const url = new URL(req.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(req);
    try {
      if (url.pathname === "/api/login" && req.method === "POST") return await login(req, env);
      if (!(await autorizado(req, env))) return json({ error: "Sesión expirada" }, 401);
      const p = url.pathname;
      if (REPORTES[p]) return await cacheado(p, () => REPORTES[p](env), url.origin);
      if (p === "/api/productos") return json(await R.productos(env, url));
      if (p === "/api/ventas") return json(await R.ventas(env, url));
      if (p === "/api/clientes") return json(await R.clientes(env, url));
      if (p === "/api/pedido") return json(await R.pedido(env, entero(url, "id")));
      if (p === "/api/producto") return json(await R.producto(env, entero(url, "id")));
      if (p === "/api/cliente") return json(await R.cliente(env, entero(url, "id")));
      return json({ error: "No existe" }, 404);
    } catch (e) {
      return json({ error: String(e.message || e) }, 502);
    }
  },
};
