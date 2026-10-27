// API para la app de dueños de barberías. Los archivos estáticos los sirve ASSETS.

const ZONA_CHILE = "America/Santiago";
const DIA_MS = 86_400_000;
const json = (data, status = 200) => Response.json(data, { status });

export function fechaChile(epochMs) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA_CHILE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(epochMs));
}

function inicioFechaChile(fechaISO) {
  const p = partesISO(fechaISO);
  let izquierda = Date.UTC(p.y, p.mes - 1, p.d) - 2 * DIA_MS;
  let derecha = izquierda + 4 * DIA_MS;
  while (izquierda < derecha) {
    const medio = Math.floor((izquierda + derecha) / 2);
    if (fechaChile(medio) < fechaISO) izquierda = medio + 1;
    else derecha = medio;
  }
  return izquierda;
}

function partesISO(fecha) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha || "");
  if (!m) return null;
  const y = Number(m[1]), mes = Number(m[2]), d = Number(m[3]);
  const prueba = new Date(Date.UTC(y, mes - 1, d));
  if (prueba.getUTCFullYear() !== y || prueba.getUTCMonth() !== mes - 1 || prueba.getUTCDate() !== d) return null;
  return { y, mes, d };
}

function isoUTC(y, mes, d) {
  return new Date(Date.UTC(y, mes - 1, d)).toISOString().slice(0, 10);
}

function moverDias(fecha, dias) {
  const p = partesISO(fecha);
  return isoUTC(p.y, p.mes, p.d + dias);
}

function moverMesInicio(fecha, meses) {
  const p = partesISO(fecha);
  return isoUTC(p.y, p.mes - 1 + meses + 1, 1);
}

function corteValido(diaCorte) {
  const n = Number(diaCorte);
  return Number.isInteger(n) && n >= 1 && n <= 28 ? n : 1;
}

export function cicloQueContiene(fechaISO, diaCorte) {
  const p = partesISO(fechaISO);
  if (!p) throw new Error("Fecha inválida");
  const corte = corteValido(diaCorte);
  const mesBase = p.d >= corte ? isoUTC(p.y, p.mes, 1) : moverMesInicio(isoUTC(p.y, p.mes, 1), -1);
  const inicio = partesISO(mesBase);
  const desde = isoUTC(inicio.y, inicio.mes, corte);
  const siguienteMes = moverMesInicio(mesBase, 1);
  const sig = partesISO(siguienteMes);
  const hasta = moverDias(isoUTC(sig.y, sig.mes, corte), -1);
  return { periodo: desde, desde, hasta };
}

export function cicloSiguiente(ciclo, diaCorte) {
  return cicloQueContiene(moverDias(ciclo.hasta, 1), diaCorte);
}

export function ciclosEntre(inicioServicio, hoyISO, diaCorte) {
  if (!partesISO(inicioServicio) || !partesISO(hoyISO) || inicioServicio > hoyISO) return [];
  const ultimo = cicloQueContiene(hoyISO, diaCorte);
  const ciclos = [];
  let ciclo = cicloQueContiene(inicioServicio, diaCorte);
  while (ciclo.periodo <= ultimo.periodo) {
    ciclos.push(ciclo);
    ciclo = cicloSiguiente(ciclo, diaCorte);
  }
  return ciclos;
}

function lunesDeSemana(fecha) {
  const p = partesISO(fecha);
  const dia = new Date(Date.UTC(p.y, p.mes - 1, p.d)).getUTCDay();
  return moverDias(fecha, -(dia === 0 ? 6 : dia - 1));
}

function normalizarCodigo(valor) {
  return String(valor ?? "").trim().toUpperCase().replace(/\s+/g, "");
}

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) ? n : 0;
}

function situacionCliente(c, ahora) {
  if (c.canjeado_en != null) return "canjeado";
  if (c.estado === "cancelado") return "cancelado";
  if (numero(c.codigo_vence) <= ahora) return "vencido";
  if (numero(c.codigo_vence) <= ahora + 7 * DIA_MS) return "por_vencer";
  return "vigente";
}

// Dos clientes pueden (rara vez) compartir código: en ese caso no se adivina, se pide canjear desde la ficha.
async function buscarCodigo(db, negocioId, codigo) {
  const filas = (await db.prepare("SELECT * FROM clientes WHERE negocio_id = ? AND codigo = ? LIMIT 2").bind(negocioId, codigo).all()).results;
  if (filas.length > 1) return { duplicado: true };
  return filas[0] ?? null;
}

function errorCodigo(cliente, ahora) {
  if (!cliente) return json({ error: "No existe ese código" }, 404);
  if (cliente.duplicado) return json({ error: "Hay dos clientes con ese código. Búscalo en Clientes y marca el canje desde su ficha." }, 409);
  if (cliente.canjeado_en != null) return json({ error: "Ese código ya fue canjeado", canjeado_en: cliente.canjeado_en }, 409);
  if (cliente.estado === "cancelado") return json({ error: "El cliente canceló su suscripción" }, 409);
  if (numero(cliente.codigo_vence) <= ahora) return json({ error: "Código vencido", vence: cliente.codigo_vence }, 409);
  return null;
}

async function canjearCliente(db, negocio, cliente, ahora) {
  const error = errorCodigo(cliente, ahora);
  if (error) return error;
  const resultado = await db.prepare(
    "UPDATE clientes SET canjeado_en = ? WHERE negocio_id = ? AND telefono = ? AND canjeado_en IS NULL"
  ).bind(ahora, negocio.id, cliente.telefono).run();
  if (numero(resultado.meta?.changes) === 0) return json({ error: "Ese código ya fue canjeado" }, 409);
  return json({ ok: true, nombre: cliente.nombre, descuento_pct: numero(negocio.descuento_pct) });
}

async function resumen(db, negocio) {
  const ahora = Date.now();
  const hoy = fechaChile(ahora);
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const inicioMesMs = inicioFechaChile(inicioMes);
  const [clientesR, mensajesR] = await Promise.all([
    db.prepare(
      `SELECT estado, codigo, codigo_vence, creado_en, canjeado_en, cancelado_en,
              proximo_recordatorio, recordatorios_enviados
         FROM clientes WHERE negocio_id = ?`
    ).bind(negocio.id).all(),
    db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN direccion = 'in' THEN 1 ELSE 0 END), 0) AS recibidos_mes,
              COALESCE(SUM(CASE WHEN direccion = 'out' THEN 1 ELSE 0 END), 0) AS enviados_mes,
              COUNT(DISTINCT telefono) AS conversaciones_mes
         FROM chat WHERE negocio_id = ? AND creado_en >= ? AND creado_en <= ?`
    ).bind(negocio.id, inicioMesMs, ahora).first(),
  ]);
  const clientes = clientesR.results;

  let registrados = 0, vigentes = 0, porVencer = 0, vencidos = 0, canjeados = 0, cancelados = 0, nuevosMes = 0, canjesMes = 0;
  let recordatoriosEnviados = 0, recordatoriosProximos = 0;
  const lunesActual = lunesDeSemana(hoy);
  const semanas = Array.from({ length: 6 }, (_, i) => {
    const desde = moverDias(lunesActual, (i - 5) * 7);
    return { desde, hasta: moverDias(desde, 6), registros: 0, canjes: 0 };
  });

  for (const c of clientes) {
    recordatoriosEnviados += numero(c.recordatorios_enviados);
    if (c.estado === "activo" && c.canjeado_en == null && c.cancelado_en == null &&
        numero(c.proximo_recordatorio) >= ahora && numero(c.proximo_recordatorio) <= ahora + 7 * DIA_MS) {
      recordatoriosProximos++;
    }
    const tieneCodigo = c.codigo != null;
    if (tieneCodigo) registrados++;
    if (c.canjeado_en != null) canjeados++;
    if (c.estado === "cancelado") cancelados++;
    const vigente = c.estado === "activo" && c.canjeado_en == null && numero(c.codigo_vence) > ahora;
    if (vigente) {
      vigentes++;
      if (numero(c.codigo_vence) <= ahora + 7 * DIA_MS) porVencer++;
    }
    if (c.estado === "activo" && c.canjeado_en == null && numero(c.codigo_vence) <= ahora) vencidos++;
    const creado = fechaChile(c.creado_en);
    if (tieneCodigo && creado >= inicioMes && creado <= hoy) nuevosMes++;
    if (c.canjeado_en != null) {
      const fechaCanje = fechaChile(c.canjeado_en);
      if (fechaCanje >= inicioMes && fechaCanje <= hoy) canjesMes++;
    }
    for (const semana of semanas) {
      if (tieneCodigo && creado >= semana.desde && creado <= semana.hasta) semana.registros++;
      if (c.canjeado_en != null) {
        const fechaCanje = fechaChile(c.canjeado_en);
        if (fechaCanje >= semana.desde && fechaCanje <= semana.hasta) semana.canjes++;
      }
    }
  }
  const ticket = numero(negocio.ticket_promedio);
  const descuento = numero(negocio.descuento_pct);
  return {
    clientes: { registrados, vigentes, por_vencer: porVencer, vencidos, canjeados, cancelados, nuevos_mes: nuevosMes },
    canjes: { total: canjeados, mes: canjesMes, tasa: registrados ? Math.round((canjeados / registrados) * 1000) / 10 : 0 },
    metas: {
      clientes: { actual: nuevosMes, meta: numero(negocio.meta_clientes) },
      canjes: { actual: canjesMes, meta: numero(negocio.meta_canjes) },
    },
    ventas_estimadas_mes: ticket === 0 ? null : Math.round(canjesMes * ticket * (1 - descuento / 100)),
    recordatorios: { enviados_total: recordatoriosEnviados, proximos_7d: recordatoriosProximos },
    mensajes: {
      recibidos_mes: numero(mensajesR?.recibidos_mes),
      enviados_mes: numero(mensajesR?.enviados_mes),
      conversaciones_mes: numero(mensajesR?.conversaciones_mes),
    },
    semanas: semanas.map(({ desde, registros, canjes }) => ({ desde, registros, canjes })),
  };
}

async function facturacion(db, negocio) {
  const hoy = fechaChile(Date.now());
  const corte = corteValido(negocio.dia_corte);
  const ciclosBase = ciclosEntre(negocio.inicio_servicio, hoy, corte);
  const [canjesR, pagosR] = await Promise.all([
    db.prepare("SELECT canjeado_en FROM clientes WHERE negocio_id = ? AND canjeado_en IS NOT NULL").bind(negocio.id).all(),
    db.prepare("SELECT periodo, monto, pagado_en, nota FROM pagos WHERE negocio_id = ?").bind(negocio.id).all(),
  ]);
  const pagos = new Map(pagosR.results.map((p) => [p.periodo, p]));
  const fechasCanje = canjesR.results.map((c) => fechaChile(c.canjeado_en));
  const mensual = numero(negocio.precio_mensual), porCanje = numero(negocio.precio_canje);
  const inicio = negocio.inicio_servicio;
  const todos = ciclosBase.map((c) => {
    // El primer ciclo cuenta desde el inicio real del servicio, no desde el día de corte anterior.
    const desde = c.desde < inicio ? inicio : c.desde;
    const canjes = fechasCanje.filter((f) => f >= desde && f <= c.hasta).length;
    const pago = pagos.get(c.periodo);
    // Un ciclo pagado conserva lo que realmente se pagó, aunque después cambie el plan.
    const monto = pago ? numero(pago.monto) : mensual + canjes * porCanje;
    return {
      ...c, desde, canjes, monto,
      estado: pago ? "pagado" : c.hasta >= hoy ? "en_curso" : "pendiente",
      pagado_en: pago?.pagado_en ?? null,
      nota: pago?.nota ?? "",
    };
  });
  const actual = todos.at(-1);
  return {
    plan: {
      nombre: negocio.plan_nombre,
      precio_mensual: mensual,
      precio_canje: porCanje,
      dia_corte: corte,
      inicio_servicio: negocio.inicio_servicio,
    },
    ciclos: todos.slice(-6).reverse(),
    deuda: todos.filter((c) => c.estado === "pendiente").reduce((s, c) => s + c.monto, 0),
    // Si el ciclo actual ya está pagado, lo próximo a cobrar es el valor vigente del plan.
    proximo_cobro: actual ? { fecha: moverDias(actual.hasta, 1), monto: actual.estado === "pagado" ? mensual : actual.monto } : null,
  };
}

async function api(request, env, url, negocio) {
  const db = env.DB;
  const metodo = request.method;
  const ruta = url.pathname;

  if (ruta === "/api/yo") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    const precio = numero(negocio.precio_mensual);
    return json({
      nombre: negocio.nombre, prefijo: negocio.prefijo_codigo, plan_nombre: negocio.plan_nombre, descuento_pct: numero(negocio.descuento_pct),
      meta_clientes: numero(negocio.meta_clientes), meta_canjes: numero(negocio.meta_canjes),
      ticket_promedio: numero(negocio.ticket_promedio), precio_mensual: precio, tiene_plan: precio > 0,
    });
  }

  if (ruta === "/api/resumen") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    return json(await resumen(db, negocio));
  }

  if (ruta === "/api/clientes") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    const ahora = Date.now();
    const r = await db.prepare(
      `SELECT c.telefono, c.nombre, c.estado, c.codigo, c.codigo_vence, c.creado_en, c.recordatorios_enviados,
              c.proximo_recordatorio, c.canjeado_en, c.cancelado_en, COALESCE(m.mensajes, 0) AS mensajes
         FROM clientes c
         LEFT JOIN (
           SELECT telefono, COUNT(*) AS mensajes FROM chat WHERE negocio_id = ? GROUP BY telefono
         ) m ON m.telefono = c.telefono
        WHERE c.negocio_id = ? AND (c.codigo IS NOT NULL OR c.estado != 'esperando_nombre')
        ORDER BY c.creado_en DESC LIMIT 500`
    ).bind(negocio.id, negocio.id).all();
    return json(r.results.map((c) => ({ ...c, situacion: situacionCliente(c, ahora) })));
  }

  if (ruta === "/api/conversaciones") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    const ahora = Date.now();
    const r = await db.prepare(
      `SELECT c.telefono, MAX(c.creado_en) AS ultimo_ts, COUNT(*) AS mensajes,
              (SELECT texto FROM chat x WHERE x.negocio_id = c.negocio_id AND x.telefono = c.telefono ORDER BY x.id DESC LIMIT 1) AS ultimo_texto,
              (SELECT direccion FROM chat x WHERE x.negocio_id = c.negocio_id AND x.telefono = c.telefono ORDER BY x.id DESC LIMIT 1) AS ultimo_direccion,
              (SELECT nombre FROM clientes k WHERE k.negocio_id = c.negocio_id AND k.telefono = c.telefono) AS nombre,
              (SELECT estado FROM clientes k WHERE k.negocio_id = c.negocio_id AND k.telefono = c.telefono) AS estado,
              (SELECT codigo FROM clientes k WHERE k.negocio_id = c.negocio_id AND k.telefono = c.telefono) AS codigo,
              (SELECT codigo_vence FROM clientes k WHERE k.negocio_id = c.negocio_id AND k.telefono = c.telefono) AS codigo_vence,
              (SELECT canjeado_en FROM clientes k WHERE k.negocio_id = c.negocio_id AND k.telefono = c.telefono) AS canjeado_en,
              EXISTS(SELECT 1 FROM pausas p WHERE p.negocio_id = c.negocio_id AND p.telefono = c.telefono) AS pausada
         FROM chat c WHERE c.negocio_id = ?
        GROUP BY c.telefono ORDER BY ultimo_ts DESC LIMIT 100`
    ).bind(negocio.id).all();
    return json(r.results.map((c) => ({
      telefono: c.telefono,
      nombre: c.nombre ?? null,
      estado: c.estado ?? null,
      situacion: c.codigo == null ? null : situacionCliente(c, ahora),
      ultimo_texto: c.ultimo_texto,
      ultimo_direccion: c.ultimo_direccion,
      ultimo_ts: c.ultimo_ts,
      mensajes: numero(c.mensajes),
      pausada: Boolean(c.pausada),
    })));
  }

  if (ruta === "/api/chat") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    const telefono = url.searchParams.get("telefono") || "";
    if (!/^\d{6,20}$/.test(telefono)) return json({ error: "Teléfono inválido" }, 400);
    const [cliente, mensajesR] = await Promise.all([
      db.prepare(
        "SELECT telefono, nombre, estado, codigo, codigo_vence, canjeado_en FROM clientes WHERE negocio_id = ? AND telefono = ?"
      ).bind(negocio.id, telefono).first(),
      db.prepare(
        `SELECT direccion, tipo, texto, creado_en FROM (
           SELECT id, direccion, tipo, texto, creado_en FROM chat
            WHERE negocio_id = ? AND telefono = ? ORDER BY id DESC LIMIT 200
         ) ORDER BY creado_en ASC, id ASC`
      ).bind(negocio.id, telefono).all(),
    ]);
    if (!cliente && mensajesR.results.length === 0) return json({ error: "No existe esa conversación" }, 404);
    return json({
      telefono,
      nombre: cliente?.nombre ?? null,
      estado: cliente?.estado ?? null,
      situacion: cliente?.codigo == null ? null : situacionCliente(cliente, Date.now()),
      codigo: cliente?.codigo ?? null,
      mensajes: mensajesR.results,
    });
  }

  if (ruta === "/api/codigo/validar") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const codigo = normalizarCodigo(cuerpo.codigo);
    if (!codigo) return json({ error: "Falta el código" }, 400);
    const cliente = await buscarCodigo(db, negocio.id, codigo);
    const error = errorCodigo(cliente, Date.now());
    if (error) return error;
    return json({ ok: true, nombre: cliente.nombre, codigo: cliente.codigo, vence: cliente.codigo_vence, descuento_pct: numero(negocio.descuento_pct) });
  }

  if (ruta === "/api/canjear") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const codigo = normalizarCodigo(cuerpo.codigo);
    if (!codigo) return json({ error: "Falta el código" }, 400);
    return canjearCliente(db, negocio, await buscarCodigo(db, negocio.id, codigo), Date.now());
  }

  if (ruta === "/api/clientes/canje") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const telefono = String(cuerpo.telefono ?? "").trim();
    if (!telefono) return json({ error: "Falta el teléfono" }, 400);
    const cliente = await db.prepare("SELECT * FROM clientes WHERE negocio_id = ? AND telefono = ?").bind(negocio.id, telefono).first();
    if (!cliente) return json({ error: "No existe el cliente" }, 404);
    if (cliente.codigo == null) return json({ error: "El cliente no tiene código" }, 409);
    return canjearCliente(db, negocio, cliente, Date.now());
  }

  if (ruta === "/api/facturacion") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    return json(await facturacion(db, negocio));
  }

  return json({ error: "No encontrado" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      const acceso = request.headers.get("x-acceso")?.trim();
      if (!acceso) return json({ error: "Acceso incorrecto" }, 401);
      const negocio = await env.DB.prepare(
        "SELECT * FROM negocios WHERE acceso = ? AND acceso IS NOT NULL AND acceso != ''"
      ).bind(acceso).first();
      if (!negocio) return json({ error: "Acceso incorrecto" }, 401);
      return await api(request, env, url, negocio);
    } catch (_) {
      return json({ error: "Error interno" }, 500);
    }
  },
};
