// API para la app de dueños de barberías. Los archivos estáticos los sirve ASSETS.

const ZONA_CHILE = "America/Santiago";
const DIA_MS = 86_400_000;
const MARCADOR_DEMO = "5690000";
const TRAMOS = [
  { nombre: "Nivel 1", clientes: 0, precio: 25000 },
  { nombre: "Nivel 2", clientes: 100, precio: 85000 },
  { nombre: "Nivel 3", clientes: 300, precio: 120000 },
];
// Plan inventado que se muestra únicamente en el modo demo.
const DEMO_PLAN = {
  plan_nombre: "Plan Fidelización", dia_corte: 5, inicio_servicio: "2025-08-05", meta_clientes: 80,
  meta_canjes: 60, ticket_promedio: 12000,
};
const json = (data, status = 200) => Response.json(data, { status });

function esTelefonoDemo(telefono) {
  return String(telefono ?? "").startsWith(MARCADOR_DEMO);
}

function telefonoEnModo(telefono, modo) {
  return esTelefonoDemo(telefono) === (modo === "demo");
}

function condTel(columna, modo) {
  return `${columna} ${modo === "real" ? "NOT LIKE" : "LIKE"} '${MARCADOR_DEMO}%'`;
}

function planEnModo(negocio, modo) {
  return modo === "demo" ? { ...negocio, ...DEMO_PLAN } : negocio;
}

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

export function tramoPara(n) {
  const fidelizados = Math.max(0, numero(n));
  return TRAMOS.findLast((tramo) => fidelizados >= tramo.clientes) ?? TRAMOS[0];
}

export function calcularNivel(n) {
  const fidelizados = Math.max(0, numero(n));
  const tramo = tramoPara(fidelizados);
  const indice = TRAMOS.indexOf(tramo);
  const siguienteTramo = TRAMOS[indice + 1];
  return {
    fidelizados,
    tramos: TRAMOS.map((t) => ({ ...t, alcanzado: fidelizados >= t.clientes })),
    actual: { ...tramo, indice },
    siguiente: siguienteTramo ? {
      ...siguienteTramo,
      faltan: siguienteTramo.clientes - fidelizados,
      progreso_pct: Math.round((fidelizados - tramo.clientes) / (siguienteTramo.clientes - tramo.clientes) * 100),
    } : null,
    progreso_total_pct: Math.min(100, Math.round(fidelizados / TRAMOS.at(-1).clientes * 100)),
  };
}

async function existeConversacion(db, negocioId, telefono, modo) {
  if (!telefonoEnModo(telefono, modo)) return false;
  return !!(await db.prepare(
    `SELECT 1 FROM chat WHERE negocio_id = ? AND telefono = ? AND ${condTel("telefono", modo)}
     UNION ALL
     SELECT 1 FROM clientes WHERE negocio_id = ? AND telefono = ? AND ${condTel("telefono", modo)} LIMIT 1`
  ).bind(negocioId, telefono, negocioId, telefono).first());
}

async function llamarBot(env, ruta, cuerpo) {
  return env.BOT.fetch(`https://bot.interno${ruta}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-interno": env.INTERNO_KEY },
    body: JSON.stringify(cuerpo),
  });
}

function situacionCliente(c, ahora) {
  if (c.canjeado_en != null) return "canjeado";
  if (c.estado === "cancelado") return "cancelado";
  if (numero(c.codigo_vence) <= ahora) return "vencido";
  if (numero(c.codigo_vence) <= ahora + 7 * DIA_MS) return "por_vencer";
  return "vigente";
}

// Dos clientes pueden (rara vez) compartir código: en ese caso no se adivina, se pide canjear desde la ficha.
async function buscarCodigo(db, negocioId, codigo, modo) {
  const filas = (await db.prepare(
    `SELECT * FROM clientes WHERE negocio_id = ? AND codigo = ? AND ${condTel("telefono", modo)} LIMIT 2`
  ).bind(negocioId, codigo).all()).results;
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

async function canjearCliente(db, negocio, cliente, ahora, modo) {
  const error = errorCodigo(cliente, ahora);
  if (error) return error;
  const resultado = await db.prepare(
    `UPDATE clientes SET canjeado_en = ? WHERE negocio_id = ? AND telefono = ?
      AND ${condTel("telefono", modo)} AND canjeado_en IS NULL`
  ).bind(ahora, negocio.id, cliente.telefono).run();
  if (numero(resultado.meta?.changes) === 0) return json({ error: "Ese código ya fue canjeado" }, 409);
  return json({ ok: true, nombre: cliente.nombre, descuento_pct: numero(negocio.descuento_pct) });
}

async function resumen(db, negocio, modo) {
  const plan = planEnModo(negocio, modo);
  const ahora = Date.now();
  const hoy = fechaChile(ahora);
  const inicioMes = `${hoy.slice(0, 7)}-01`;
  const inicioMesMs = inicioFechaChile(inicioMes);
  const [clientesR, mensajesR] = await Promise.all([
    db.prepare(
      `SELECT estado, codigo, codigo_vence, creado_en, canjeado_en, cancelado_en,
              proximo_recordatorio, recordatorios_enviados
         FROM clientes WHERE negocio_id = ? AND ${condTel("telefono", modo)}`
    ).bind(negocio.id).all(),
    db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN direccion = 'in' THEN 1 ELSE 0 END), 0) AS recibidos_mes,
              COALESCE(SUM(CASE WHEN direccion = 'out' THEN 1 ELSE 0 END), 0) AS enviados_mes,
              COUNT(DISTINCT telefono) AS conversaciones_mes
         FROM chat WHERE negocio_id = ? AND ${condTel("telefono", modo)} AND creado_en >= ? AND creado_en <= ?`
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
  const ticket = numero(plan.ticket_promedio);
  const descuento = numero(negocio.descuento_pct);
  return {
    clientes: { registrados, vigentes, por_vencer: porVencer, vencidos, canjeados, cancelados, nuevos_mes: nuevosMes },
    canjes: { total: canjeados, mes: canjesMes, tasa: registrados ? Math.round((canjeados / registrados) * 1000) / 10 : 0 },
    metas: {
      clientes: { actual: nuevosMes, meta: numero(plan.meta_clientes) },
      canjes: { actual: canjesMes, meta: numero(plan.meta_canjes) },
    },
    ventas_estimadas_mes: ticket === 0 ? null : Math.round(canjesMes * ticket * (1 - descuento / 100)),
    recordatorios: { enviados_total: recordatoriosEnviados, proximos_7d: recordatoriosProximos },
    mensajes: {
      recibidos_mes: numero(mensajesR?.recibidos_mes),
      enviados_mes: numero(mensajesR?.enviados_mes),
      conversaciones_mes: numero(mensajesR?.conversaciones_mes),
    },
    nivel: calcularNivel(registrados),
    semanas: semanas.map(({ desde, registros, canjes }) => ({ desde, registros, canjes })),
  };
}

async function facturacion(db, negocio, modo) {
  const plan = planEnModo(negocio, modo);
  const hoy = fechaChile(Date.now());
  const corte = corteValido(plan.dia_corte);
  const ciclosBase = ciclosEntre(plan.inicio_servicio, hoy, corte);
  const [clientesR, pagosR] = await Promise.all([
    db.prepare(`SELECT creado_en FROM clientes WHERE negocio_id = ? AND ${condTel("telefono", modo)} AND codigo IS NOT NULL`).bind(negocio.id).all(),
    db.prepare("SELECT periodo, monto, pagado_en, nota FROM pagos WHERE negocio_id = ? AND demo = ?").bind(negocio.id, modo === "demo" ? 1 : 0).all(),
  ]);
  const pagos = new Map(pagosR.results.map((p) => [p.periodo, p]));
  const fechasClientes = clientesR.results.map((c) => fechaChile(c.creado_en));
  const nivel = calcularNivel(fechasClientes.length);
  const inicio = plan.inicio_servicio;
  const todos = ciclosBase.map((c) => {
    // El primer ciclo cuenta desde el inicio real del servicio, no desde el día de corte anterior.
    const desde = c.desde < inicio ? inicio : c.desde;
    const tramoCalculado = tramoPara(fechasClientes.filter((f) => f < desde).length);
    const pago = pagos.get(c.periodo);
    // Un ciclo pagado conserva lo que realmente se pagó, aunque después cambie el plan.
    const monto = pago ? numero(pago.monto) : tramoCalculado.precio;
    const tramoPago = pago ? TRAMOS.find((tramo) => tramo.precio === monto) : null;
    return {
      ...c, desde, nivel: (tramoPago ?? tramoCalculado).nombre, monto,
      estado: pago ? "pagado" : c.hasta >= hoy ? "en_curso" : "pendiente",
      pagado_en: pago?.pagado_en ?? null,
      nota: pago?.nota ?? "",
    };
  });
  const actual = todos.at(-1);
  return {
    plan: {
      nombre: "Plan Fidelización",
      dia_corte: corte,
      inicio_servicio: plan.inicio_servicio,
    },
    nivel,
    tiene_servicio: Boolean(partesISO(plan.inicio_servicio) && plan.inicio_servicio <= hoy),
    ciclos: todos.slice(-6).reverse(),
    deuda: todos.filter((c) => c.estado === "pendiente").reduce((s, c) => s + c.monto, 0),
    // Si el ciclo actual ya está pagado, lo próximo a cobrar es el valor vigente del plan.
    proximo_cobro: actual ? { fecha: moverDias(actual.hasta, 1), monto: actual.estado === "pagado" ? nivel.actual.precio : actual.monto } : null,
  };
}

async function api(request, env, url, negocio, modo) {
  const db = env.DB;
  const metodo = request.method;
  const ruta = url.pathname;

  if (ruta === "/api/yo") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    const plan = planEnModo(negocio, modo);
    const fidelizados = numero((await db.prepare(
      `SELECT COUNT(*) AS total FROM clientes WHERE negocio_id = ? AND ${condTel("telefono", modo)} AND codigo IS NOT NULL`
    ).bind(negocio.id).first())?.total);
    const precio = tramoPara(fidelizados).precio;
    return json({
      nombre: negocio.nombre, prefijo: negocio.prefijo_codigo, plan_nombre: plan.plan_nombre, descuento_pct: numero(negocio.descuento_pct),
      meta_clientes: numero(plan.meta_clientes), meta_canjes: numero(plan.meta_canjes),
      ticket_promedio: numero(plan.ticket_promedio), precio_actual: precio, precio_mensual: precio, modo, tiene_plan: true,
    });
  }

  if (ruta === "/api/resumen") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    return json(await resumen(db, negocio, modo));
  }

  if (ruta === "/api/clientes") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    const ahora = Date.now();
    const r = await db.prepare(
      `SELECT c.telefono, c.nombre, c.estado, c.codigo, c.codigo_vence, c.creado_en, c.recordatorios_enviados,
              c.proximo_recordatorio, c.canjeado_en, c.cancelado_en, COALESCE(m.mensajes, 0) AS mensajes
         FROM clientes c
         LEFT JOIN (
           SELECT telefono, COUNT(*) AS mensajes FROM chat WHERE negocio_id = ? AND ${condTel("telefono", modo)} GROUP BY telefono
         ) m ON m.telefono = c.telefono
        WHERE c.negocio_id = ? AND ${condTel("c.telefono", modo)} AND (c.codigo IS NOT NULL OR c.estado != 'esperando_nombre')
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
         FROM chat c WHERE c.negocio_id = ? AND ${condTel("c.telefono", modo)}
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
    if (!telefonoEnModo(telefono, modo)) return json({ error: "No existe esa conversación" }, 404);
    const [cliente, mensajesR, estadoChat] = await Promise.all([
      db.prepare(
        `SELECT telefono, nombre, estado, codigo, codigo_vence, canjeado_en FROM clientes
          WHERE negocio_id = ? AND telefono = ? AND ${condTel("telefono", modo)}`
      ).bind(negocio.id, telefono).first(),
      db.prepare(
        `SELECT direccion, tipo, texto, creado_en FROM (
           SELECT id, direccion, tipo, texto, creado_en FROM chat
            WHERE negocio_id = ? AND telefono = ? AND ${condTel("telefono", modo)} ORDER BY id DESC LIMIT 200
         ) ORDER BY creado_en ASC, id ASC`
      ).bind(negocio.id, telefono).all(),
      db.prepare(
        `SELECT EXISTS(SELECT 1 FROM pausas WHERE negocio_id = ? AND telefono = ?) AS pausada,
                (SELECT MAX(creado_en) FROM chat WHERE negocio_id = ? AND telefono = ?
                  AND ${condTel("telefono", modo)} AND direccion = 'in') AS ultimo_in_ts`
      ).bind(negocio.id, telefono, negocio.id, telefono).first(),
    ]);
    if (!cliente && mensajesR.results.length === 0) return json({ error: "No existe esa conversación" }, 404);
    return json({
      telefono,
      nombre: cliente?.nombre ?? null,
      estado: cliente?.estado ?? null,
      situacion: cliente?.codigo == null ? null : situacionCliente(cliente, Date.now()),
      codigo: cliente?.codigo ?? null,
      pausada: Boolean(estadoChat?.pausada),
      ventana_abierta: estadoChat?.ultimo_in_ts != null && Date.now() - numero(estadoChat.ultimo_in_ts) < DIA_MS,
      ultimo_in_ts: estadoChat?.ultimo_in_ts == null ? null : numero(estadoChat.ultimo_in_ts),
      mensajes: mensajesR.results,
    });
  }

  if (ruta === "/api/responder") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const telefono = typeof cuerpo.telefono === "string" ? cuerpo.telefono : "";
    const texto = typeof cuerpo.texto === "string" ? cuerpo.texto.trim() : "";
    if (!/^\d{6,20}$/.test(telefono)) return json({ error: "Teléfono inválido" }, 400);
    if (!texto || texto.length > 1000) return json({ error: "Texto inválido" }, 400);
    if (!telefonoEnModo(telefono, modo)) return json({ error: "No existe esa conversación" }, 404);
    if (!env.BOT || !env.INTERNO_KEY) return json({ error: "El envío de mensajes aún no está configurado." }, 503);
    if (!(await existeConversacion(db, negocio.id, telefono, modo))) return json({ error: "No existe esa conversación" }, 404);
    let respuesta;
    try {
      respuesta = await llamarBot(env, "/interno/responder", { negocio_id: negocio.id, telefono, texto });
    } catch (_) {
      return json({ error: "WhatsApp no aceptó el mensaje. Intenta de nuevo." }, 502);
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 200) return json({ ok: Boolean(datos.ok) });
    if ([404, 409, 502].includes(respuesta.status) && typeof datos.error === "string") return json({ error: datos.error }, respuesta.status);
    return json({ error: "WhatsApp no aceptó el mensaje. Intenta de nuevo." }, 502);
  }

  // ---- Notificaciones push (los avisos los envía el bot; la app solo guarda los dispositivos) ----
  if (ruta === "/api/push/clave") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    if (!env.VAPID_PUBLIC_KEY) return json({ error: "Las notificaciones aún no están configuradas." }, 503);
    return json({ clave: env.VAPID_PUBLIC_KEY });
  }

  if (ruta === "/api/push/suscribir") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const sub = cuerpo.subscription ?? {};
    const endpoint = typeof sub.endpoint === "string" ? sub.endpoint : "";
    const p256dh = typeof sub.keys?.p256dh === "string" ? sub.keys.p256dh : "";
    const auth = typeof sub.keys?.auth === "string" ? sub.keys.auth : "";
    const b64url = /^[A-Za-z0-9_-]+={0,2}$/;
    if (!endpoint.startsWith("https://") || endpoint.length > 700 || !b64url.test(p256dh) || p256dh.length > 200 || !b64url.test(auth) || auth.length > 100) {
      return json({ error: "Suscripción inválida" }, 400);
    }
    // El dispositivo queda asociado SIEMPRE a la barbería autenticada. Máximo 10 por barbería.
    await db.batch([
      db.prepare("INSERT OR REPLACE INTO push_subs (endpoint, negocio_id, p256dh, auth, creado_en) VALUES (?, ?, ?, ?, ?)").bind(endpoint, negocio.id, p256dh, auth, Date.now()),
      db.prepare("DELETE FROM push_subs WHERE negocio_id = ? AND endpoint NOT IN (SELECT endpoint FROM push_subs WHERE negocio_id = ? ORDER BY creado_en DESC LIMIT 10)").bind(negocio.id, negocio.id),
    ]);
    return json({ ok: true });
  }

  if (ruta === "/api/push/desuscribir") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const endpoint = typeof cuerpo.endpoint === "string" ? cuerpo.endpoint : "";
    if (!endpoint) return json({ error: "Falta el dispositivo" }, 400);
    await db.prepare("DELETE FROM push_subs WHERE endpoint = ? AND negocio_id = ?").bind(endpoint, negocio.id).run();
    return json({ ok: true });
  }

  if (ruta === "/api/push/probar") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    if (!env.BOT || !env.INTERNO_KEY) return json({ error: "El envío de mensajes aún no está configurado." }, 503);
    const hay = await db.prepare("SELECT 1 FROM push_subs WHERE negocio_id = ? LIMIT 1").bind(negocio.id).first();
    if (!hay) return json({ error: "Primero activa las notificaciones en este dispositivo." }, 409);
    let respuesta;
    try {
      respuesta = await llamarBot(env, "/interno/push-prueba", { negocio_id: negocio.id });
    } catch (_) {
      return json({ error: "No se pudo enviar la notificación de prueba." }, 502);
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 200) return json({ ok: true, enviadas: Number(datos.enviadas) || 0 });
    return json({ error: "No se pudo enviar la notificación de prueba." }, 502);
  }

  if (ruta === "/api/contacto/eliminar") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const telefono = typeof cuerpo.telefono === "string" ? cuerpo.telefono : "";
    if (!/^\d{6,20}$/.test(telefono)) return json({ error: "Teléfono inválido" }, 400);
    if (!telefonoEnModo(telefono, modo)) return json({ error: "No existe esa conversación" }, 404);
    if (!env.BOT || !env.INTERNO_KEY) return json({ error: "La eliminación aún no está configurada." }, 503);
    if (!(await existeConversacion(db, negocio.id, telefono, modo))) return json({ error: "No existe esa conversación" }, 404);
    let respuesta;
    try {
      respuesta = await llamarBot(env, "/interno/eliminar-contacto", { negocio_id: negocio.id, telefono });
    } catch (_) {
      return json({ error: "No se pudo eliminar el contacto. Intenta de nuevo." }, 502);
    }
    if (respuesta.status === 200) return json({ ok: true });
    return json({ error: "No se pudo eliminar el contacto. Intenta de nuevo." }, 502);
  }

  // ---- Plantilla de recordatorio (para escribir a un cliente cuando ya pasaron las 24 h) ----
  if (ruta === "/api/plantilla/estado") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    if (!env.BOT || !env.INTERNO_KEY) return json({ error: "El envío de mensajes aún no está configurado." }, 503);
    try {
      const r = await llamarBot(env, "/interno/plantilla-estado", { negocio_id: negocio.id });
      const d = await r.json().catch(() => ({}));
      if (r.status !== 200) return json({ error: "No se pudo consultar el estado de la plantilla." }, 502);
      return json({ existe: Boolean(d.existe), estado: String(d.estado ?? ""), categoria: d.categoria ?? null, motivo: d.motivo ?? null });
    } catch (_) {
      return json({ error: "No se pudo consultar el estado de la plantilla." }, 502);
    }
  }

  if (ruta === "/api/plantilla/enviar") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const telefono = typeof cuerpo.telefono === "string" ? cuerpo.telefono : "";
    if (!/^\d{6,20}$/.test(telefono)) return json({ error: "Teléfono inválido" }, 400);
    if (!telefonoEnModo(telefono, modo)) return json({ error: "No existe esa conversación" }, 404);
    if (!env.BOT || !env.INTERNO_KEY) return json({ error: "El envío de mensajes aún no está configurado." }, 503);
    if (!(await existeConversacion(db, negocio.id, telefono, modo))) return json({ error: "No existe esa conversación" }, 404);
    let respuesta;
    try {
      respuesta = await llamarBot(env, "/interno/enviar-plantilla", { negocio_id: negocio.id, telefono });
    } catch (_) {
      return json({ error: "No se pudo enviar el recordatorio. Intenta de nuevo." }, 502);
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 200) return json({ ok: true });
    if ([404, 409, 502].includes(respuesta.status) && typeof datos.error === "string") return json({ error: datos.error }, respuesta.status);
    return json({ error: "No se pudo enviar el recordatorio. Intenta de nuevo." }, 502);
  }

  if (ruta === "/api/pausa") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const telefono = typeof cuerpo.telefono === "string" ? cuerpo.telefono : "";
    if (!/^\d{6,20}$/.test(telefono)) return json({ error: "Teléfono inválido" }, 400);
    if (typeof cuerpo.pausar !== "boolean") return json({ error: "Pausa inválida" }, 400);
    if (!telefonoEnModo(telefono, modo)) return json({ error: "No existe esa conversación" }, 404);
    if (!env.BOT || !env.INTERNO_KEY) return json({ error: "El envío de mensajes aún no está configurado." }, 503);
    if (!(await existeConversacion(db, negocio.id, telefono, modo))) return json({ error: "No existe esa conversación" }, 404);
    let respuesta;
    try {
      respuesta = await llamarBot(env, "/interno/pausa", { negocio_id: negocio.id, telefono, pausar: cuerpo.pausar });
    } catch (_) {
      return json({ error: "No se pudo cambiar la pausa del bot." }, 502);
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (respuesta.status === 200) return json({ ok: Boolean(datos.ok), pausada: Boolean(datos.pausada) });
    if (respuesta.status === 404 && typeof datos.error === "string") return json({ error: datos.error }, 404);
    return json({ error: "No se pudo cambiar la pausa del bot." }, 502);
  }

  if (ruta === "/api/codigo/validar") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const codigo = normalizarCodigo(cuerpo.codigo);
    if (!codigo) return json({ error: "Falta el código" }, 400);
    const cliente = await buscarCodigo(db, negocio.id, codigo, modo);
    const error = errorCodigo(cliente, Date.now());
    if (error) return error;
    return json({ ok: true, nombre: cliente.nombre, codigo: cliente.codigo, vence: cliente.codigo_vence, descuento_pct: numero(negocio.descuento_pct) });
  }

  if (ruta === "/api/canjear") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const codigo = normalizarCodigo(cuerpo.codigo);
    if (!codigo) return json({ error: "Falta el código" }, 400);
    return canjearCliente(db, negocio, await buscarCodigo(db, negocio.id, codigo, modo), Date.now(), modo);
  }

  if (ruta === "/api/clientes/canje") {
    if (metodo !== "POST") return json({ error: "Método no permitido" }, 405);
    const cuerpo = await request.json().catch(() => ({}));
    const telefono = String(cuerpo.telefono ?? "").trim();
    if (!telefono) return json({ error: "Falta el teléfono" }, 400);
    const cliente = await db.prepare(
      `SELECT * FROM clientes WHERE negocio_id = ? AND telefono = ? AND ${condTel("telefono", modo)}`
    ).bind(negocio.id, telefono).first();
    if (!cliente) return json({ error: "No existe el cliente" }, 404);
    if (cliente.codigo == null) return json({ error: "El cliente no tiene código" }, 409);
    return canjearCliente(db, negocio, cliente, Date.now(), modo);
  }

  if (ruta === "/api/facturacion") {
    if (metodo !== "GET") return json({ error: "Método no permitido" }, 405);
    return json(await facturacion(db, negocio, modo));
  }

  return json({ error: "No encontrado" }, 404);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    try {
      const acceso = request.headers.get("x-acceso")?.trim();
      const modo = request.headers.get("x-modo") === "real" ? "real" : "demo";
      if (!acceso) return json({ error: "Acceso incorrecto" }, 401);
      const negocio = await env.DB.prepare(
        "SELECT * FROM negocios WHERE acceso = ? AND acceso IS NOT NULL AND acceso != ''"
      ).bind(acceso).first();
      if (!negocio) return json({ error: "Acceso incorrecto" }, 401);
      return await api(request, env, url, negocio, modo);
    } catch (_) {
      return json({ error: "Error interno" }, 500);
    }
  },
};
