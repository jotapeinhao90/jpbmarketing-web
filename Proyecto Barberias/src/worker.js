// API de la plataforma de barberías. Todo /api/* exige la clave (header x-key = PANEL_KEY).
// La PWA estática vive en public/ y la sirve Cloudflare.

const ESTADOS = ["por_visitar", "contactada", "interesada", "demo", "cliente", "no_interesada"];
const TIPOS = ["visita", "llamada", "whatsapp", "nota"];
const MOTIVOS = ["", "precio", "no_le_interesa", "no_es_decisor", "tiene_sistema", "desconfianza", "sin_tiempo", "otro"];

const json = (data, status = 200) => Response.json(data, { status });
const texto = (v, max = 2000) => String(v ?? "").trim().slice(0, max);
const fechaOk = (v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v);

// Comparación en tiempo constante para no filtrar la clave por tiempos de respuesta.
function claveValida(recibida, esperada) {
  if (!esperada || !recibida || recibida.length !== esperada.length) return false;
  let diff = 0;
  for (let i = 0; i < esperada.length; i++) diff |= recibida.charCodeAt(i) ^ esperada.charCodeAt(i);
  return diff === 0;
}

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Dirección -> coordenadas con Nominatim (OpenStreetMap). Si el número no aparece en el mapa,
// reintenta solo con la calle y marca el resultado como "aprox" para que se vea en la ficha.
async function geocodificar(direccion, comuna) {
  if (!direccion && !comuna) return null;
  const intentos = [[[direccion, comuna, "Chile"], "exacta"]];
  const soloCalle = direccion.replace(/\s*(#|n°|nº|no\.?|número)?\s*\d+[\w-]*.*$/i, "").trim();
  if (soloCalle && soloCalle !== direccion) intentos.push([[soloCalle, comuna, "Chile"], "aprox"]);

  for (let i = 0; i < intentos.length; i++) {
    if (i > 0) await espera(1100); // política de Nominatim: 1 consulta por segundo
    const [partes, precision] = intentos[i];
    const q = partes.filter(Boolean).join(", ");
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=cl&q=${encodeURIComponent(q)}`,
        { headers: { "User-Agent": "JPBMarketing-Barberias/1.0 (admin-barberias.jpbmarketing.cl)", "Accept-Language": "es" } }
      );
      if (!r.ok) continue;
      const [hit] = await r.json();
      if (!hit) continue;
      const lat = Number(hit.lat), lng = Number(hit.lon);
      if (lat > -56 && lat < -17 && lng > -76 && lng < -66) return { lat, lng, geo: precision };
    } catch (e) { /* sigue con el siguiente intento */ }
  }
  return null;
}

function camposBarberia(b) {
  const out = {
    nombre: texto(b.nombre, 120),
    direccion: texto(b.direccion, 200),
    comuna: texto(b.comuna, 80),
    contacto: texto(b.contacto, 120),
    telefono: texto(b.telefono, 40),
    instagram: texto(b.instagram, 80),
    estado: texto(b.estado, 30) || "por_visitar",
    proxima_accion: texto(b.proxima_accion, 300),
    proxima_fecha: texto(b.proxima_fecha, 10),
  };
  if (!out.nombre) return { error: "Falta el nombre" };
  if (!ESTADOS.includes(out.estado)) return { error: "Estado inválido" };
  if (!fechaOk(out.proxima_fecha)) return { error: "Fecha inválida" };
  return { datos: out };
}

async function api(request, env, url) {
  const db = env.DB;
  const ahora = Date.now();
  const ruta = url.pathname.replace(/^\/api\//, "").split("/");
  const metodo = request.method;
  const cuerpo = metodo === "POST" || metodo === "PUT" ? await request.json().catch(() => ({})) : {};

  // GET /api/datos -> todo lo necesario para pintar la app (escala chica: cientos de filas)
  if (ruta[0] === "datos" && metodo === "GET") {
    const [b, v] = await Promise.all([
      db.prepare("SELECT * FROM barberias ORDER BY actualizado_en DESC").all(),
      db.prepare("SELECT * FROM visitas ORDER BY fecha DESC, id DESC").all(),
    ]);
    return json({ barberias: b.results, visitas: v.results });
  }

  if (ruta[0] === "barberias") {
    if (metodo === "POST" && ruta.length === 1) {
      const { datos, error } = camposBarberia(cuerpo);
      if (error) return json({ error }, 400);
      const g = await geocodificar(datos.direccion, datos.comuna);
      const r = await db
        .prepare(
          `INSERT INTO barberias (nombre, direccion, comuna, contacto, telefono, instagram, estado, proxima_accion, proxima_fecha, lat, lng, geo, creado_en, actualizado_en)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
        )
        .bind(datos.nombre, datos.direccion, datos.comuna, datos.contacto, datos.telefono, datos.instagram, datos.estado, datos.proxima_accion, datos.proxima_fecha, g?.lat ?? null, g?.lng ?? null, g?.geo ?? "", ahora, ahora)
        .run();
      return json({ id: r.meta.last_row_id, geo: g?.geo ?? "" }, 201);
    }

    const id = Number(ruta[1]);
    if (!Number.isInteger(id)) return json({ error: "Id inválido" }, 400);

    if (metodo === "PUT" && ruta.length === 2) {
      const { datos, error } = camposBarberia(cuerpo);
      if (error) return json({ error }, 400);
      await db
        .prepare(
          `UPDATE barberias SET nombre=?, direccion=?, comuna=?, contacto=?, telefono=?, instagram=?, estado=?, proxima_accion=?, proxima_fecha=?, actualizado_en=? WHERE id=?`
        )
        .bind(datos.nombre, datos.direccion, datos.comuna, datos.contacto, datos.telefono, datos.instagram, datos.estado, datos.proxima_accion, datos.proxima_fecha, ahora, id)
        .run();
      let geo = null;
      if (cuerpo.geocodificar) {
        geo = await geocodificar(datos.direccion, datos.comuna);
        await db.prepare("UPDATE barberias SET lat=?, lng=?, geo=? WHERE id=?").bind(geo?.lat ?? null, geo?.lng ?? null, geo?.geo ?? "", id).run();
      }
      return json({ ok: true, geo: geo?.geo ?? (cuerpo.geocodificar ? "" : undefined) });
    }

    // Ubicación puesta a mano (tocando el mapa)
    if (metodo === "PUT" && ruta[2] === "ubicacion") {
      const lat = Number(cuerpo.lat), lng = Number(cuerpo.lng);
      if (!(lat > -56 && lat < -17 && lng > -76 && lng < -66)) return json({ error: "Ubicación fuera de Chile" }, 400);
      const geo = cuerpo.geo === "verificada" ? "verificada" : "manual"; // verificada = coordenadas del propio negocio (Google/AgendaPro)
      await db.prepare("UPDATE barberias SET lat=?, lng=?, geo=?, actualizado_en=? WHERE id=?").bind(lat, lng, geo, ahora, id).run();
      return json({ ok: true });
    }

    // Zona de notas: cómo enfocar, qué salió bien / mal, notas libres, motivo de rechazo
    if (metodo === "PUT" && ruta[2] === "notas") {
      const motivo = texto(cuerpo.motivo_rechazo, 30);
      if (!MOTIVOS.includes(motivo)) return json({ error: "Motivo inválido" }, 400);
      await db
        .prepare("UPDATE barberias SET enfoque=?, salio_bien=?, salio_mal=?, notas=?, motivo_rechazo=?, actualizado_en=? WHERE id=?")
        .bind(texto(cuerpo.enfoque, 4000), texto(cuerpo.salio_bien, 4000), texto(cuerpo.salio_mal, 4000), texto(cuerpo.notas, 4000), motivo, ahora, id)
        .run();
      return json({ ok: true });
    }

    if (metodo === "DELETE" && ruta.length === 2) {
      await db.batch([
        db.prepare("DELETE FROM visitas WHERE barberia_id = ?").bind(id),
        db.prepare("DELETE FROM barberias WHERE id = ?").bind(id),
      ]);
      return json({ ok: true });
    }

    // POST /api/barberias/:id/visitas -> registra la visita y, opcionalmente, actualiza estado y próxima acción
    if (metodo === "POST" && ruta[2] === "visitas") {
      const tipo = TIPOS.includes(cuerpo.tipo) ? cuerpo.tipo : "visita";
      const fecha = texto(cuerpo.fecha, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return json({ error: "Fecha inválida" }, 400);
      const existe = await db.prepare("SELECT id FROM barberias WHERE id = ?").bind(id).first();
      if (!existe) return json({ error: "No existe la barbería" }, 404);

      const sentencias = [
        db.prepare("INSERT INTO visitas (barberia_id, fecha, tipo, notas, creado_en) VALUES (?,?,?,?,?)").bind(id, fecha, tipo, texto(cuerpo.notas), ahora),
      ];
      const sets = ["actualizado_en = ?"];
      const vals = [ahora];
      if (cuerpo.estado !== undefined) {
        if (!ESTADOS.includes(cuerpo.estado)) return json({ error: "Estado inválido" }, 400);
        sets.push("estado = ?"); vals.push(cuerpo.estado);
      }
      if (cuerpo.proxima_accion !== undefined) { sets.push("proxima_accion = ?"); vals.push(texto(cuerpo.proxima_accion, 300)); }
      if (cuerpo.proxima_fecha !== undefined) {
        const f = texto(cuerpo.proxima_fecha, 10);
        if (!fechaOk(f)) return json({ error: "Fecha inválida" }, 400);
        sets.push("proxima_fecha = ?"); vals.push(f);
      }
      if (cuerpo.motivo_rechazo !== undefined) {
        const m = texto(cuerpo.motivo_rechazo, 30);
        if (!MOTIVOS.includes(m)) return json({ error: "Motivo inválido" }, 400);
        sets.push("motivo_rechazo = ?"); vals.push(m);
      }
      sentencias.push(db.prepare(`UPDATE barberias SET ${sets.join(", ")} WHERE id = ?`).bind(...vals, id));
      await db.batch(sentencias);
      return json({ ok: true }, 201);
    }
  }

  if (ruta[0] === "visitas" && metodo === "DELETE") {
    const id = Number(ruta[1]);
    if (!Number.isInteger(id)) return json({ error: "Id inválido" }, 400);
    await db.prepare("DELETE FROM visitas WHERE id = ?").bind(id).run();
    return json({ ok: true });
  }

  return json({ error: "No encontrado" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);

    if (!claveValida(request.headers.get("x-key"), env.PANEL_KEY)) {
      return json({ error: "Clave incorrecta" }, 401);
    }
    try {
      return await api(request, env, url);
    } catch (e) {
      return json({ error: "Error interno" }, 500);
    }
  },
};
