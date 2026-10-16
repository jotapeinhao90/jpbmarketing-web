// Cliente de la API JSON-2 de Odoo 19.
// Odoo Online limita las conexiones simultáneas: máximo 4 llamadas en vuelo por petición y reintento con espera.
// El estado vive en un limitador creado POR PETICIÓN: en Workers una promesa no puede resolverse desde otra petición.
export function limitador(max = 4) {
  let enVuelo = 0;
  const cola = [];
  return {
    async turno() {
      if (enVuelo >= max) await new Promise((r) => cola.push(r));
      enVuelo++;
    },
    liberar() {
      enVuelo--;
      cola.shift()?.();
    },
  };
}

export async function odoo(env, model, method, body) {
  const lim = env.lim || limitador();
  let ultimo;
  for (let intento = 0; intento < 4; intento++) {
    if (intento) await new Promise((r) => setTimeout(r, 250 * 2 ** intento));
    await lim.turno();
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
      lim.liberar();
    }
  }
  throw ultimo || new Error("Odoo no respondió");
}

export const group = (env, model, domain, groupby, aggregates, extra = {}) =>
  odoo(env, model, "formatted_read_group", { domain, groupby, aggregates, ...extra });

export const leer = (env, model, domain, fields, extra = {}) =>
  odoo(env, model, "search_read", { domain, fields, ...extra });

export const contar = (env, model, domain) => odoo(env, model, "search_count", { domain });

// Valores "vacíos" de Odoo (false) → cadena vacía / null.
export const txt = (v) => (v === false || v == null ? "" : v);
export const rel = (v) => (Array.isArray(v) ? v[1] : "");
