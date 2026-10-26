// API de la plataforma de barberías. Todo /api/* exige la clave (header x-key = PANEL_KEY).
// La PWA estática vive en public/ y la sirve Cloudflare.

const ESTADOS = ["por_visitar", "contactada", "interesada", "demo", "cliente", "no_interesada"];
const TIPOS = ["visita", "llamada", "whatsapp", "nota"];

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
      const r = await db
        .prepare(
          `INSERT INTO barberias (nombre, direccion, comuna, contacto, telefono, instagram, estado, proxima_accion, proxima_fecha, creado_en, actualizado_en)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`
        )
        .bind(datos.nombre, datos.direccion, datos.comuna, datos.contacto, datos.telefono, datos.instagram, datos.estado, datos.proxima_accion, datos.proxima_fecha, ahora, ahora)
        .run();
      return json({ id: r.meta.last_row_id }, 201);
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
