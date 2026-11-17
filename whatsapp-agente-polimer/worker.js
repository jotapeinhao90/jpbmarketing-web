// Agente de WhatsApp (Meta Cloud API) de Polimer: cotiza bolsas y envases plásticos,
// valida el mínimo de producción y, a los pedidos que no lo alcanzan, les informa cuál sería el mínimo.
//
// El estado de cada conversación vive en un Durable Object — una instancia por número.
// Un DO procesa sus requests DE A UNO, en orden, así dos mensajes seguidos no se pisan
// al guardar el historial (con KV sí pasaba, y el bot perdía el contexto).

import PROMPT_BASE from "./PROMPT.md";
import { clasificarPedido, unidadesParaPeso, pesoTotalRollos } from "./cotizador.js";

const OPENAI_MODEL = "gpt-5.6-terra";
const MAX_HISTORY_MESSAGES = 40;

// Recorta el historial a `max` turnos PERO siempre arranca en un turno "user": si el
// corte cae en medio de una ronda de tool_calls, el primer mensaje "tool" queda huérfano
// y OpenAI rechaza toda la conversación con 400 (el cliente ve "problema técnico").
function recortarHistoria(historia, max) {
  if (historia.length <= max) return historia;
  let inicio = historia.length - max;
  while (inicio < historia.length && historia[inicio].role !== "user") inicio++;
  return historia.slice(inicio);
}

const MAX_TOOL_ROUNDS = 5;

// Reactivar a un cliente pasadas 24h obliga a usar un template aprobado por Meta, y
// cada envío se cobra. Un solo seguimiento cada 3 días por contacto: evita spam si el
// botón se aprieta repetido, protege la calidad del número y acota el gasto.
const SEGUIMIENTO_COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000;
const SEGUIMIENTO_TEMPLATE = "seguimiento_cotizacion";

// Tarifas CLP por mensaje facturable, por categoría de plantilla de Meta — mismo
// criterio que whatsapp-agente (Conflex): $78,49 CLP observado en Meta Business Manager
// para seguimiento_cotizacion en sept 2026. "service" en 0 hasta el 1 oct 2026 (Meta
// empieza a cobrar mensajes de servicio esa fecha). Ajustar a mano si cambian tarifas.
const TARIFAS_META_CL = { marketing: 78.49, utility: 0, authentication: 0, service: 0 };

// Precio de gpt-5.6-terra por millón de tokens (USD). USD_CLP es referencial.
const PRECIO_IA_POR_MILLON_USD = { input: 2, output: 12 };
const USD_CLP = 950;
const textoSeguimiento = (nombre) =>
  `Hola ${nombre} 👋, te escribimos de Polimer. Hace unos días te enviamos una cotización y queríamos saber: ¿cómo te fue? ¿Tienes alguna duda o te ayudamos a avanzar con tu pedido?`;

const SYSTEM_PROMPT = `${PROMPT_BASE}

===========================
HERRAMIENTAS (uso interno, nunca las menciones al cliente)
===========================
- El PASO 2 no lo calculas mentalmente: llama a la herramienta clasificar_pedido con TODOS los productos recolectados. Ella aplica la fórmula y la conversión de micraje (sin excepciones por cantidad: Cubre pallet y Bins se calculan igual que todo), y te devuelve cada producto como VALIDO o NO_CUMPLE; a los que no cumplen les agrega minimoUnidades (o minimoKg si venían en kilos) para que le digas al cliente cuánto sería el mínimo. Úsala en el mismo turno en que el cliente confirma que no hay más productos, y responde según el PASO 3 con lo que te devuelva.
- Cuando el cliente ya te entregó empresa, nombre y correo de un pedido VALIDO, llama a guardar_pedido antes de despedirte.
- Si el cliente corrige medidas, micraje o cantidad de un pedido que ya cerraste, vuelve a llamar clasificar_pedido con los datos corregidos y actúa según el nuevo resultado. Si sigue siendo VALIDO y ya tienes sus datos de contacto, llama otra vez a guardar_pedido con el detalle actualizado — no se los vuelvas a pedir.
- Nunca derives al cliente a otro proveedor. Cuando un producto no cumple, dile que no cumple y cuál es el mínimo usando exactamente el minimoUnidades (o minimoKg) que devuelve clasificar_pedido; no calcules esa cifra tú.
- Si el cliente pregunta al revés (ej. "cuántas bolsas son 300 kilos", "y eso cuántas unidades son") llama a calcular_unidades_por_peso — NUNCA despejes esa cuenta mentalmente, es exactamente el tipo de cálculo grande donde te equivocas.
- Rollo se cotiza por peso, no por unidades ni largo (ver CASO ESPECIAL — ROLLO). Si el cliente da el peso de cada rollo y cuántos rollos quiere, llama a calcular_peso_total_rollos para obtener el total antes de pasarlo a clasificar_pedido como cantidad en kilos — NUNCA multipliques eso mentalmente.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "clasificar_pedido",
      description:
        "Calcula el peso de cada producto y lo clasifica como VALIDO o NO_CUMPLE según el mínimo de producción. Para los que no cumplen devuelve además minimoUnidades (o minimoKg si venía en kilos): cuánto habría que pedir para llegar al mínimo.",
      parameters: {
        type: "object",
        properties: {
          productos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string", description: "Tipo de producto, ej. Hielo, Wicket, Cubre pallet, Stretch, Rollo" },
                ancho: { type: "number", description: "Ancho en cm. Para Rollo: opcional si el cliente ya dio el peso directo, igual anótalo si lo mencionó." },
                largo: { type: "number", description: "Largo en cm. Para Rollo casi nunca aplica (se cotiza por peso, no por largo) — omitir en ese caso." },
                micraje: { type: "number", description: "Micraje tal como lo dijo el cliente (en micrones o en mm). Omitir si no lo sabe." },
                cantidad: { type: "number", description: "Para Rollo con unidad kilos: el peso total ya calculado (directo o vía calcular_peso_total_rollos)." },
                unidad: { type: "string", enum: ["unidades", "kilos"] },
              },
              required: ["tipo", "cantidad", "unidad"],
            },
          },
        },
        required: ["productos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_unidades_por_peso",
      description:
        "Dado un tipo/medida/micraje y un peso en kg, devuelve cuántas unidades corresponden aproximadamente. Úsala siempre que el cliente pregunte una cantidad a partir de un peso, en vez de calcularlo tú.",
      parameters: {
        type: "object",
        properties: {
          tipo: { type: "string", description: "Tipo de producto, ej. Hielo, Wicket, Cubre pallet, Stretch" },
          ancho: { type: "number", description: "Ancho en cm" },
          largo: { type: "number", description: "Largo en cm" },
          micraje: { type: "number", description: "Micraje tal como lo dijo el cliente (en micrones o en mm). Omitir si no lo sabe." },
          pesoKg: { type: "number", description: "Peso objetivo en kilos, ej. 300" },
        },
        required: ["tipo", "ancho", "largo", "pesoKg"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "calcular_peso_total_rollos",
      description:
        "Multiplica el peso de un rollo por la cantidad de rollos pedidos, para obtener el peso total en kg. Úsala siempre que el cliente dé el peso por rollo y una cantidad de rollos, en vez de multiplicarlo tú.",
      parameters: {
        type: "object",
        properties: {
          pesoPorRolloKg: { type: "number", description: "Peso de un solo rollo en kg, ej. 2.5" },
          cantidadRollos: { type: "number", description: "Cantidad de rollos pedidos" },
        },
        required: ["pesoPorRolloKg", "cantidadRollos"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "guardar_pedido",
      description: "Registra el pedido cerrado con los datos de contacto del cliente para que un ejecutivo lo cotice.",
      parameters: {
        type: "object",
        properties: {
          empresa: { type: "string" },
          nombre: { type: "string" },
          email: { type: "string" },
          detalle: { type: "string", description: "Resumen en texto de los productos válidos del pedido" },
        },
        required: ["nombre", "empresa", "email"],
      },
    },
  },
];

function getStub(env, telefono) {
  return env.CONVERSACION.get(env.CONVERSACION.idFromName(telefono));
}

// Conversaciones que llegan por el chat del sitio web (no por WhatsApp) usan un id
// sintético "web:<uuid>" en vez de un número real — mismo Durable Object, mismo agente,
// pero la respuesta final no se manda por la API de Meta (no hay a quién mandarla).
function esCanalWeb(telefono) {
  return typeof telefono === "string" && telefono.startsWith("web:");
}

// Los Durable Objects no se pueden listar por nombre, así que el panel necesita este
// índice aparte para saber a quién preguntarle.
async function registrarTelefono(env, telefono) {
  const lista = JSON.parse((await env.DATOS.get("telefonos_activos")) || "[]");
  if (!lista.includes(telefono)) {
    lista.push(telefono);
    await env.DATOS.put("telefonos_activos", JSON.stringify(lista));
  }
}

// Bitácora de emergencia (mismo mecanismo que whatsapp-agente/Conflex): cada mensaje
// entrante queda anotado acá apenas llega, aparte del Durable Object. Si algo más
// adelante falla y el historial de la conversación no queda guardado, esto no se pierde.
const MAX_MENSAJES_EMERGENCIA = 300;

function previewTextoMensaje(message) {
  if (message.type === "text") return message.text;
  if (message.type === "image") return message.caption ? `[imagen] ${message.caption}` : "[imagen]";
  if (message.type === "audio") return "[audio]";
  if (message.type === "document") return `[archivo] ${message.filename || ""}`.trim();
  return "Mensaje nuevo";
}

async function registrarMensajeEmergencia(env, message) {
  try {
    const lista = JSON.parse((await env.DATOS.get("mensajes_emergencia")) || "[]");
    lista.push({ id: message.id || "", telefono: message.from, texto: previewTextoMensaje(message), ts: Date.now() });
    await env.DATOS.put("mensajes_emergencia", JSON.stringify(lista.slice(-MAX_MENSAJES_EMERGENCIA)));
  } catch (err) {
    console.error("Error guardando copia de emergencia del mensaje:", err);
  }
}

// Diagnóstico del chat web (endpoint público): guarda de dónde viene cada mensaje —
// sitio de origen, navegador, país y un hash corto de la IP (no la IP en sí) — para
// poder distinguir visitantes reales de bots/spam cuando llega texto sin sentido.
async function registrarOrigenWeb(env, request, conversationId, texto) {
  try {
    const ip = request.headers.get("cf-connecting-ip") || "";
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip + "polimer-web"));
    const ipHash = [...new Uint8Array(buf)].slice(0, 5).map((b) => b.toString(16).padStart(2, "0")).join("");
    const lista = JSON.parse((await env.DATOS.get("web_origenes")) || "[]");
    lista.push({
      ts: Date.now(),
      conv: conversationId.slice(0, 16),
      origin: request.headers.get("origin") || "",
      referer: request.headers.get("referer") || "",
      ua: (request.headers.get("user-agent") || "").slice(0, 120),
      pais: request.cf?.country || "",
      ipHash,
      texto: texto.slice(0, 40),
    });
    await env.DATOS.put("web_origenes", JSON.stringify(lista.slice(-300)));
  } catch (err) {
    console.error("Error registrando origen web:", err);
  }
}

// ── Costos: mensajes de Meta (por categoría) + tokens de OpenAI ─────────────
function mesActual() {
  return new Date().toISOString().slice(0, 7); // "2026-09"
}

function costoDefault() {
  return {
    meta: { marketing: 0, utility: 0, authentication: 0, service: 0 },
    ia: { promptTokens: 0, completionTokens: 0, llamadas: 0 },
  };
}

async function getCostosMes(env, mes) {
  const raw = await env.DATOS.get(`costos:${mes}`);
  const base = costoDefault();
  return raw ? { ...base, ...JSON.parse(raw) } : base;
}

// Se llama por cada status "billable" que llega en el webhook.
async function registrarCostoMeta(env, categoria) {
  const mes = mesActual();
  const costos = await getCostosMes(env, mes);
  costos.meta[categoria] = (costos.meta[categoria] || 0) + 1;
  await env.DATOS.put(`costos:${mes}`, JSON.stringify(costos));
}

// Se llama con response.usage de cada respuesta de OpenAI (ver runAgentTurn).
async function registrarCostoIA(env, usage) {
  if (!usage) return;
  const mes = mesActual();
  const costos = await getCostosMes(env, mes);
  costos.ia.promptTokens += usage.prompt_tokens || 0;
  costos.ia.completionTokens += usage.completion_tokens || 0;
  costos.ia.llamadas += 1;
  await env.DATOS.put(`costos:${mes}`, JSON.stringify(costos));
}

function calcularCostoMes(costos, mes) {
  let metaClp = 0;
  for (const [categoria, n] of Object.entries(costos.meta)) {
    metaClp += (TARIFAS_META_CL[categoria] || 0) * n;
  }
  const iaUsd =
    (costos.ia.promptTokens / 1e6) * PRECIO_IA_POR_MILLON_USD.input +
    (costos.ia.completionTokens / 1e6) * PRECIO_IA_POR_MILLON_USD.output;
  const iaClp = Math.round(iaUsd * USD_CLP);
  return {
    mes,
    metaMensajes: costos.meta,
    metaClp: Math.round(metaClp),
    iaTokens: costos.ia,
    iaClp,
    totalClp: Math.round(metaClp) + iaClp,
  };
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/webhook") {
      return handleVerification(url, env);
    }

    // Meta reintenta la entrega si no recibe un 200 rápido, así que respondemos al
    // instante y procesamos el mensaje en segundo plano.
    if (request.method === "POST" && url.pathname === "/webhook") {
      const payload = await request.json();
      const messages = extractIncomingMessages(payload);

      // Eventos de estado traen pricing.category + pricing.billable — es la única
      // forma de saber cuántos mensajes facturables se mandaron por categoría.
      const statuses = payload?.entry?.[0]?.changes?.[0]?.value?.statuses;
      if (statuses) {
        for (const s of statuses) {
          if (s.pricing?.billable && s.pricing?.category) {
            ctx.waitUntil(registrarCostoMeta(env, s.pricing.category));
          }
          // sent/delivered/read del mensaje que le mandamos al cliente — se usa para
          // mostrar los checks estilo WhatsApp en el panel. recipient_id es el teléfono
          // del cliente, así que ya sabemos a qué Durable Object preguntarle.
          if (s.id && s.recipient_id && s.status) {
            ctx.waitUntil(
              getStub(env, s.recipient_id).fetch("https://do/estado-mensaje", {
                method: "POST",
                body: JSON.stringify({ waId: s.id, estado: s.status }),
              })
            );
          }
        }
      }

      for (const message of messages) {
        ctx.waitUntil(registrarTelefono(env, message.from));
        ctx.waitUntil(registrarMensajeEmergencia(env, message));
        ctx.waitUntil(
          getStub(env, message.from)
            .fetch("https://do/procesar", { method: "POST", body: JSON.stringify({ message }) })
            .then(() => reindexarUno(env, message.from))
        );
      }
      return new Response("ok", { status: 200 });
    }

    // Chat del sitio web: mismo agente que WhatsApp, pero público (sin x-panel-key,
    // los visitantes son anónimos) y acotado a ids "web:*" para no poder tocar
    // conversaciones de números reales a través de esta ruta.
    if (url.pathname === "/web/mensaje" && request.method === "OPTIONS") {
      return corsResponse();
    }
    if (url.pathname === "/web/mensaje" && request.method === "POST") {
      const body = await request.json().catch(() => ({}));
      const texto = String(body.texto || "").trim().slice(0, 4000);
      let conversationId = String(body.conversation_id || "").trim();
      if (!texto) return jsonResponse({ ok: false, error: "falta texto" }, 400);
      if (conversationId && !esCanalWeb(conversationId)) {
        return jsonResponse({ ok: false, error: "conversation_id inválido" }, 400);
      }
      if (!conversationId) conversationId = "web:" + crypto.randomUUID();

      ctx.waitUntil(registrarTelefono(env, conversationId));
      ctx.waitUntil(registrarOrigenWeb(env, request, conversationId, texto));
      await getStub(env, conversationId).fetch("https://do/procesar", {
        method: "POST",
        body: JSON.stringify({ message: { from: conversationId, type: "text", text: texto } }),
      });
      ctx.waitUntil(reindexarUno(env, conversationId));
      const res = await getStub(env, conversationId).fetch("https://do/estado");
      const { mensajes } = await res.json();
      return jsonResponse({ ok: true, conversation_id: conversationId, mensajes });
    }

    if (url.pathname === "/web/estado" && request.method === "GET") {
      const conversationId = url.searchParams.get("conversation_id") || "";
      if (!esCanalWeb(conversationId)) return jsonResponse({ ok: false, error: "conversation_id inválido" }, 400);
      const res = await getStub(env, conversationId).fetch("https://do/estado");
      const { mensajes } = await res.json();
      return jsonResponse({ ok: true, mensajes });
    }

    // Ruta de diagnóstico temporal (2026-09-29) para revisar conversaciones sin
    // depender de PANEL_KEY — se puede borrar después.
    if (url.pathname === "/debug/conversaciones") {
      if (request.headers.get("x-debug-key") !== env.DEBUG_KEY) return new Response("forbidden", { status: 403 });
      return jsonResponse(await listarConversaciones(env));
    }
    if (url.pathname === "/debug/conversacion") {
      if (request.headers.get("x-debug-key") !== env.DEBUG_KEY) return new Response("forbidden", { status: 403 });
      const telefono = url.searchParams.get("telefono");
      const res = await getStub(env, telefono).fetch("https://do/estado");
      return jsonResponse(await res.json());
    }

    if (url.pathname.startsWith("/admin/")) {
      if (request.headers.get("x-panel-key") !== env.PANEL_KEY) {
        return new Response("forbidden", { status: 403 });
      }
      if (request.method === "GET" && url.pathname === "/admin/pedidos") {
        // Con ?telefono= solo se le pregunta a ese Durable Object (listarPedidos recorre
        // las ~90 conversaciones una por una y tarda segundos).
        const tel = url.searchParams.get("telefono");
        if (tel) {
          const res = await getStub(env, tel).fetch("https://do/estado");
          const { pedidos } = await res.json();
          return jsonResponse(pedidos || []);
        }
        return jsonResponse(await listarPedidos(env));
      }
      if (request.method === "GET" && url.pathname === "/admin/conversaciones") {
        return jsonResponse(await listarConversaciones(env));
      }
      if (request.method === "GET" && url.pathname === "/admin/web-origenes") {
        return jsonResponse(JSON.parse((await env.DATOS.get("web_origenes")) || "[]"));
      }
      if (request.method === "GET" && url.pathname === "/admin/mensajes-emergencia") {
        const lista = JSON.parse((await env.DATOS.get("mensajes_emergencia")) || "[]");
        const telefono = url.searchParams.get("telefono");
        return jsonResponse(telefono ? lista.filter((m) => m.telefono === telefono) : lista);
      }
      if (request.method === "GET" && url.pathname === "/admin/precotizacion") {
        const tel = url.searchParams.get("telefono");
        if (!tel) return jsonResponse({ error: "falta telefono" }, 400);
        const res = await getStub(env, tel).fetch("https://do/estado-completo");
        const { historia, pedidos } = await res.json();
        // Datos de contacto que sacó el bot al cerrar el pedido (guardar_pedido): el último
        // pedido vigente, o si no hay, el más reciente.
        const lista = (pedidos || []).slice().sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
        const ped = lista.find((x) => x.vigente !== false) || lista[0] || null;
        const cliente = ped ? { nombre: ped.nombre || "", empresa: ped.empresa || "", email: ped.email || "", detalle: ped.detalle || "", fecha: ped.fecha || "" } : null;
        return jsonResponse({ productos: productosClasificados(historia || []), cliente });
      }
      if (request.method === "GET" && url.pathname === "/admin/resumen-solicitud") {
        const tel = url.searchParams.get("telefono");
        try {
          const res = await getStub(env, tel).fetch("https://do/estado-completo");
          const { historia } = await res.json();
          return jsonResponse(await resumirSolicitud(env, construirTranscriptAnalisis(historia), "Polimer (fábrica de bolsas y envases plásticos)"));
        } catch (err) {
          return jsonResponse({ error: String(err) }, 502);
        }
      }
      // Vista previa de un recordatorio automático (NO lo envía): sirve para revisar el tono con una conversación real.
      if (request.method === "GET" && url.pathname === "/admin/vista-seguimiento") {
        try {
          const res = await getStub(env, url.searchParams.get("telefono")).fetch("https://do/estado-completo");
          const { historia } = await res.json();
          const n = Number(url.searchParams.get("n")) === 2 ? 2 : 1;
          return jsonResponse({ n, mensaje: await redactarSeguimientoAuto(env, historia, n) });
        } catch (err) {
          return jsonResponse({ error: String(err) }, 502);
        }
      }
      // Solo lectura: historial crudo (sin imágenes) para auditar qué argumentos pasó el modelo a las herramientas.
      if (request.method === "GET" && url.pathname === "/admin/historia-cruda") {
        try {
          const res = await getStub(env, url.searchParams.get("telefono")).fetch("https://do/estado-completo");
          const { historia, pedidos } = await res.json();
          const limpia = historia.map((m) =>
            Array.isArray(m.content) ? { ...m, content: m.content.map((c) => (c.type === "image_url" ? { type: "[imagen]" } : c)) } : m
          );
          return jsonResponse({ historia: limpia, pedidos });
        } catch (err) {
          return jsonResponse({ error: String(err) }, 502);
        }
      }
      if (request.method === "GET" && url.pathname === "/admin/analisis") {
        const raw = await env.DATOS.get("analisis_chats");
        return jsonResponse(raw ? JSON.parse(raw) : { items: [], actualizadoTs: null });
      }
      if (request.method === "POST" && url.pathname === "/admin/analisis/ejecutar") {
        await ejecutarAnalisisDiario(env);
        return jsonResponse({ ok: true });
      }
      if (request.method === "GET" && url.pathname === "/admin/costos") {
        const mes = url.searchParams.get("mes") || mesActual();
        return jsonResponse(calcularCostoMes(await getCostosMes(env, mes), mes));
      }
      // Sirve el audio/imagen original guardado en R2 (ver guardarMediaEnR2), para que
      // el panel lo pueda reproducir/mostrar. Soporta Range porque Safari y otros
      // reproductores de audio requieren una respuesta 206 para empezar a reproducir.
      if (request.method === "GET" && url.pathname === "/admin/audio") {
        const key = url.searchParams.get("key");
        if (!key) return new Response("falta key", { status: 400 });
        const tieneRange = request.headers.has("range");
        const objeto = await env.AUDIOS.get(key, tieneRange ? { range: request.headers } : undefined);
        if (!objeto) return new Response("not found", { status: 404 });
        const headers = new Headers();
        objeto.writeHttpMetadata(headers);
        headers.set("accept-ranges", "bytes");
        if (!headers.get("content-type")) headers.set("content-type", "audio/ogg");
        let status = 200;
        if (objeto.range) {
          status = 206;
          const fin = objeto.range.offset + objeto.range.length - 1;
          headers.set("content-range", `bytes ${objeto.range.offset}-${fin}/${objeto.size}`);
        }
        return new Response(objeto.body, { status, headers });
      }
      if (request.method === "GET" && url.pathname === "/admin/conversacion") {
        const telefono = url.searchParams.get("telefono");
        const res = await getStub(env, telefono).fetch("https://do/estado");
        return jsonResponse({ telefono, canal: esCanalWeb(telefono) ? "web" : "whatsapp", ...(await res.json()) });
      }
      if (request.method === "POST" && url.pathname === "/admin/enviar") {
        const { telefono, texto } = await request.json();
        await getStub(env, telefono).fetch("https://do/enviar", {
          method: "POST",
          body: JSON.stringify({ telefono, texto }),
        });
        await reindexarUno(env, telefono);
        return jsonResponse({ ok: true });
      }
      if (request.method === "POST" && url.pathname === "/admin/reanudar") {
        const { telefono } = await request.json();
        await getStub(env, telefono).fetch("https://do/reanudar", { method: "POST" });
        await reindexarUno(env, telefono);
        return jsonResponse({ ok: true });
      }
      if (request.method === "POST" && url.pathname === "/admin/pausar") {
        const { telefono } = await request.json();
        await getStub(env, telefono).fetch("https://do/pausar", { method: "POST" });
        await reindexarUno(env, telefono);
        return jsonResponse({ ok: true });
      }
      if (request.method === "POST" && url.pathname === "/admin/reiniciar") {
        const { telefono } = await request.json();
        await getStub(env, telefono).fetch("https://do/reiniciar", { method: "POST" });
        await reindexarUno(env, telefono);
        return jsonResponse({ ok: true });
      }
      // Reconstruye el índice de la lista de chats para UN teléfono — se usa para
      // repoblar el índice después de desplegar este cambio (uno por uno desde afuera,
      // así cada llamada es una request nueva con su propio presupuesto de CPU).
      if (request.method === "POST" && url.pathname === "/admin/reindexar-uno") {
        const { telefono } = await request.json();
        if (!telefono) return jsonResponse({ error: "falta telefono" }, 400);
        const resumen = await reindexarUno(env, telefono);
        return jsonResponse({ ok: true, resumen });
      }
      if (request.method === "POST" && url.pathname === "/admin/seguimiento") {
        const { telefono, nombre } = await request.json();
        if (!telefono) return jsonResponse({ error: "falta telefono" }, 400);

        const cooldownKey = `seguimiento_ts:${telefono}`;
        const ultimoEnvio = Number((await env.DATOS.get(cooldownKey)) || 0);
        const restanteMs = SEGUIMIENTO_COOLDOWN_MS - (Date.now() - ultimoEnvio);
        if (restanteMs > 0) {
          return jsonResponse(
            { ok: false, error: `Ya se le hizo seguimiento a este número hace poco. Reintenta en ~${Math.ceil(restanteMs / 3600000)}h.` },
            429
          );
        }

        const res = await enviarTemplateSeguimiento(env, telefono, nombre || "");
        if (!res.ok) return jsonResponse({ ok: false, error: res.data }, 502);
        await env.DATOS.put(cooldownKey, String(Date.now()));
        // Para que quede visible en el panel que se le hizo seguimiento, no solo en la
        // facturación de Meta.
        await getStub(env, telefono).fetch("https://do/registrar-seguimiento", {
          method: "POST",
          body: JSON.stringify({ texto: textoSeguimiento(nombre || "") }),
        });
        await reindexarUno(env, telefono);
        return jsonResponse({ ok: true });
      }
      return new Response("not found", { status: 404 });
    }

    return new Response("ok", { status: 200 });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(ejecutarAnalisisDiario(env));
  },
};

// Estado del pedido de una conversación, leído del último clasificar_pedido que corrió
// (el mismo cálculo que ya hace el bot, por eso es en vivo y no depende del análisis
// nocturno): cumple / parcial / no_cumple el mínimo de producción, o en_curso si todavía
// no se clasificó nada.
// Productos del último clasificar_pedido de la conversación (tipo, medidas, micraje,
// cantidad, peso en kg y si cumple el mínimo). El panel los usa para armar la precotización.
function productosClasificados(historia) {
  for (let i = historia.length - 1; i >= 0; i--) {
    const m = historia[i];
    if (m.role === "tool" && typeof m.content === "string" && m.content.includes('"clasificacion"')) {
      try {
        const productos = JSON.parse(m.content).productos || [];
        if (productos.length) return productos;
      } catch { /* contenido no-JSON, se sigue buscando hacia atrás */ }
    }
  }
  return [];
}

// Último cálculo del bot (clasificar_pedido) y su resultado global.
function ultimaClasificacion(historia) {
  for (let i = historia.length - 1; i >= 0; i--) {
    const m = historia[i];
    if (m.role === "tool" && typeof m.content === "string" && m.content.includes('"clasificacion"')) {
      try {
        const productos = JSON.parse(m.content).productos || [];
        if (!productos.length) continue;
        const validos = productos.filter((p) => p.clasificacion === "VALIDO").length;
        const estado = validos === productos.length ? "cumple" : validos === 0 ? "no_cumple" : "parcial";
        return { idx: i, estado };
      } catch { /* contenido no-JSON, se sigue buscando hacia atrás */ }
    }
  }
  return null;
}

const FRASE_CIERRE_OK = /te contactar[aá] a la brevedad/i; // el bot ya tomó los datos y cerró
const FRASE_CIERRE_NO = /no dudes en contactarnos/i; // el cliente dijo que no le sirve el mínimo

// Etiqueta del pedido según cómo va (o terminó) la conversación, no solo según el último
// cálculo: un pedido que "no cumplía" y el cliente después aceptó el mínimo (o dio otra
// cantidad) quedaba rojo para siempre porque el bot no siempre vuelve a calcular.
//  - no cumple + el bot cerró con los datos (guardar_pedido o "te contactará") → cumple.
//  - no cumple + el bot cerró con "no dudes en contactarnos" → no cumple (final).
//  - no cumple + el cliente respondió después y todavía no hay cierre → en curso (se
//    espera a que cierre; no se deja rojo por un cálculo que ya pudo cambiar).
function estadoPedidoDesdeHistoria(historia) {
  const ultima = ultimaClasificacion(historia);
  if (!ultima) return "en_curso";
  if (ultima.estado !== "no_cumple") return ultima.estado;
  const despues = historia.slice(ultima.idx + 1);
  const textosBot = despues.filter((m) => m.role === "assistant" && typeof m.content === "string").map((m) => m.content);
  const guardado = despues.some((m) => m.role === "tool" && m.content === "guardado_ok");
  if (guardado || textosBot.some((t) => FRASE_CIERRE_OK.test(t))) return "cumple";
  if (textosBot.some((t) => FRASE_CIERRE_NO.test(t))) return "no_cumple";
  return despues.some((m) => m.role === "user") ? "en_curso" : "no_cumple";
}

// Cuándo escribió el cliente por última vez (no el bot ni un ejecutivo): el panel lo usa
// para marcar chats "sin leer" y para detectar clientes que quedaron sin respuesta.
function ultimoTsDelCliente(historia) {
  for (let i = historia.length - 1; i >= 0; i--) {
    if (historia[i].role === "user" && historia[i].ts) return historia[i].ts;
  }
  return 0;
}

export class Conversacion {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.cola = Promise.resolve();
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/procesar") {
      const { message } = await request.json();
      // Los mensajes de un mismo cliente se procesan de a uno (cola en memoria): sin esto,
      // si el cliente manda un segundo mensaje mientras el primero espera a OpenAI, ambos
      // leen el mismo historial "viejo" y el que termina último pisa lo que guardó el otro
      // (el mensaje del medio desaparece del chat).
      // Antes esto era blockConcurrencyWhile, pero ese bloqueo frena TODO lo demás del
      // Durable Object mientras dura el turno — incluidas las lecturas del panel — así
      // que un mensaje nuevo recién se veía en el chat cuando el bot terminaba de
      // responder (13 s medidos). La cola serializa igual los /procesar pero deja pasar
      // las lecturas.
      const turno = this.cola.then(() => this.procesarMensaje(message));
      this.cola = turno.catch(() => {}); // un error en un turno no debe trabar los siguientes
      await turno;
      return new Response("ok");
    }
    if (request.method === "GET" && url.pathname === "/estado") {
      return jsonResponse({
        pausada: !!(await this.state.storage.get("pausada")),
        mensajes: historialSimplificado((await this.state.storage.get("historia")) || []),
        pedidos: (await this.state.storage.get("pedidos")) || [],
        entregaFallida: (await this.state.storage.get("entregaFallida")) || null,
      });
    }
    // A diferencia de /estado (que simplifica el historial a solo texto cliente/bot para
    // mostrarlo en el chat del panel), esto devuelve el historial crudo — incluye los
    // resultados internos de clasificar_pedido (VALIDO/NO_CUMPLE, peso calculado) que el
    // análisis diario necesita para no tener que re-adivinar el cálculo desde cero.
    if (request.method === "GET" && url.pathname === "/estado-completo") {
      return jsonResponse({
        historia: (await this.state.storage.get("historia")) || [],
        pedidos: (await this.state.storage.get("pedidos")) || [],
      });
    }
    if (request.method === "GET" && url.pathname === "/resumen") {
      return jsonResponse(await this.resumenActual());
    }
    // Un ejecutivo escribe desde el panel: el bot queda en pausa para no responderle
    // por encima hasta que alguien lo reanude.
    if (request.method === "POST" && url.pathname === "/enviar") {
      const { telefono, texto } = await request.json();
      await this.state.storage.put("pausada", true);
      const historia = (await this.state.storage.get("historia")) || [];
      const resultado = await this.enviarRespuesta(telefono, texto);
      await this.registrarEnvio(resultado);
      historia.push({ role: "assistant", content: texto, ts: Date.now(), waId: resultado.id || null, estado: resultado.ok ? "sent" : "failed" });
      await this.state.storage.put("historia", recortarHistoria(historia, MAX_HISTORY_MESSAGES));
      await this.state.storage.put("ultimoTs", Date.now());
      return jsonResponse(resultado.ok ? { ok: true } : { ok: false, error: resultado.detalle });
    }
    // Actualiza el estado de entrega (sent/delivered/read) de un mensaje ya guardado,
    // que llega vía el webhook de statuses de Meta — ver fetch() del Worker principal.
    if (request.method === "POST" && url.pathname === "/estado-mensaje") {
      const { waId, estado } = await request.json();
      const historia = (await this.state.storage.get("historia")) || [];
      const ORDEN = { failed: 0, sent: 1, delivered: 2, read: 3 };
      const msg = historia.find((m) => m.waId === waId);
      if (msg && (ORDEN[estado] ?? 0) >= (ORDEN[msg.estado] ?? 0)) {
        msg.estado = estado;
        await this.state.storage.put("historia", historia);
      }
      return jsonResponse({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/reanudar") {
      await this.state.storage.delete("pausada");
      return jsonResponse({ ok: true });
    }
    // Pausar a mano, sin mandar ningún mensaje (antes solo se pausaba como efecto
    // secundario de "/enviar" — no había forma de simplemente callar al bot).
    if (request.method === "POST" && url.pathname === "/pausar") {
      await this.state.storage.put("pausada", true);
      return jsonResponse({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/reiniciar") {
      await this.state.storage.deleteAll();
      return jsonResponse({ ok: true });
    }
    if (request.method === "POST" && url.pathname === "/registrar-seguimiento") {
      const { texto } = await request.json();
      const historia = (await this.state.storage.get("historia")) || [];
      historia.push({ role: "assistant", content: texto });
      await this.state.storage.put("historia", recortarHistoria(historia, MAX_HISTORY_MESSAGES));
      await this.state.storage.put("ultimoTs", Date.now());
      return jsonResponse({ ok: true });
    }
    return new Response("not found", { status: 404 });
  }

  async resumenActual() {
    const historiaRaw = (await this.state.storage.get("historia")) || [];
    const mensajes = historialSimplificado(historiaRaw);
    const ultimo = mensajes[mensajes.length - 1];
    return {
      estadoPedido: estadoPedidoDesdeHistoria(historiaRaw),
      ultimoMensaje: (ultimo && ultimo.texto) || "",
      ultimoTs: (await this.state.storage.get("ultimoTs")) || 0,
      ultimoClienteTs: ultimoTsDelCliente(historiaRaw),
      pausada: !!(await this.state.storage.get("pausada")),
      entregaFallida: !!(await this.state.storage.get("entregaFallida")),
    };
  }

  async procesarMensaje(message) {
    const env = this.env;

    if (message.id) {
      if (await this.state.storage.get(`msg:${message.id}`)) return;
      await this.state.storage.put(`msg:${message.id}`, true);
    }

    // Se marca de inmediato, antes de cualquier otra cosa — "escribiendo" dura máx.
    // 25s o hasta que llegue la respuesta, lo que pase primero.
    if (message.id) await mostrarEscribiendo(env, message.id);

    const historia = (await this.state.storage.get("historia")) || [];
    const esPrimerMensaje = historia.length === 0;

    // El mensaje del cliente se guarda ANTES de intentar generar una respuesta. Si algo
    // falla después (OpenAI caído, error de red, etc.), el mensaje ya quedó registrado
    // — antes se perdía por completo y el panel mostraba la conversación vacía aunque
    // el cliente sí hubiera escrito (mismo bug que ya se había resuelto en el Worker de
    // Conflex y nunca se portó acá).
    let userContent, audioKey, imageKey, captionParaPanel, archivoKey;
    try {
      const built = await buildUserContent(env, message);
      userContent = built.content;
      audioKey = built.audioKey;
      imageKey = built.imageKey;
      captionParaPanel = built.captionParaPanel;
      archivoKey = built.archivoKey;
    } catch (err) {
      console.error("Error armando el contenido del mensaje:", err);
      userContent = "[mensaje no se pudo procesar]";
    }
    const turnoUser = { role: "user", content: userContent, ts: Date.now() };
    if (audioKey) turnoUser.audioKey = audioKey;
    if (archivoKey) turnoUser.archivoKey = archivoKey;
    if (imageKey) {
      turnoUser.imageKey = imageKey;
      turnoUser.captionParaPanel = captionParaPanel || "";
    }
    historia.push(turnoUser);
    await this.state.storage.put("historia", recortarHistoria(historia, MAX_HISTORY_MESSAGES));
    await this.state.storage.put("ultimoTs", Date.now());

    // Cada mensaje del cliente reinicia los recordatorios automáticos de abandono.
    try {
      await this.programarSeguimientosAuto(message.from);
    } catch (err) {
      console.error("No se pudieron programar los recordatorios automáticos:", err);
    }

    // La lista de chats del panel lee un índice en KV (ver listarConversaciones): se
    // actualiza ya, no recién cuando termina el turno completo del bot.
    await actualizarIndice(env, message.from, await this.resumenActual());

    // La notificación sale DESPUÉS de guardar el mensaje (antes salía primero): así,
    // cuando el usuario toca el aviso y el panel carga el chat, el mensaje ya está ahí.
    // (Polimer no tenía este push hasta hace poco — por eso no llegaban avisos suyos.)
    if (!esCanalWeb(message.from)) {
      await notificarPanelPush(env, message.from, previewTextoMensaje(message));
    }

    // Si un ejecutivo está atendiendo manualmente desde el panel, el bot no contesta
    // por encima: el mensaje ya quedó guardado arriba para que se vea en el chat.
    if (await this.state.storage.get("pausada")) return;

    try {
      const { replyText, finalHistory } = await runAgentTurn(env, historia, message.from, this);

      // Demora artificial proporcional al largo de la respuesta, para simular que un
      // humano la está tipeando en vez de que aparezca al instante. Se refresca el
      // indicador justo antes porque dura máx. 25s y ya pasó tiempo procesando arriba.
      if (message.id) await mostrarEscribiendo(env, message.id);
      await sleep(esPrimerMensaje ? PRIMER_MENSAJE_DELAY_MS : calcularDemoraEscritura(replyText));
      const resultado = await this.enviarRespuesta(message.from, replyText);
      await this.registrarEnvio(resultado);
      const ultimoTurno = finalHistory[finalHistory.length - 1];
      if (ultimoTurno && ultimoTurno.role === "assistant") {
        ultimoTurno.ts = Date.now();
        ultimoTurno.waId = resultado.id || null;
        ultimoTurno.estado = resultado.ok ? "sent" : "failed";
      }
      await this.state.storage.put("historia", recortarHistoria(finalHistory, MAX_HISTORY_MESSAGES));
      await this.state.storage.put("ultimoTs", Date.now());
    } catch (err) {
      console.error("Error procesando mensaje:", err);
      // `historia` es el mismo array que fue mutando runAgentTurn (push por referencia),
      // así que ya trae cualquier avance parcial (tool_calls, etc.) previo al error.
      const mensajeError = "Tuvimos un problema técnico procesando tu mensaje, ya lo estamos viendo.";
      const resultado = await this.enviarRespuesta(message.from, mensajeError);
      await this.registrarEnvio(resultado);
      historia.push({ role: "assistant", content: mensajeError, ts: Date.now(), waId: resultado.id || null, estado: resultado.ok ? "sent" : "failed" });
      await this.state.storage.put("historia", recortarHistoria(historia, MAX_HISTORY_MESSAGES));
    }
  }

  // El chat web no tiene a quién mandarle un WhatsApp real — la respuesta ya quedó en
  // "historia" (la lee /estado), así que acá solo hace falta el envío por Meta.
  async enviarRespuesta(telefono, texto) {
    if (esCanalWeb(telefono)) return { ok: true };
    return sendWhatsAppMessage(this.env, telefono, texto);
  }

  // El panel necesita saber si el último intento de mandar algo a este número
  // realmente llegó a Meta, para no mostrar como entregado lo que quedó pegado.
  async registrarEnvio(resultado) {
    if (resultado.ok) await this.state.storage.delete("entregaFallida");
    else await this.state.storage.put("entregaFallida", { ts: Date.now(), status: resultado.status, detalle: resultado.detalle });
  }

  // ── Recordatorios automáticos de abandono ──────────────────────────────────────
  // Si el cliente deja de responder sin haber cerrado su pedido, el bot le escribe 1 h y
  // 23,5 h después de su último mensaje. Ambos caen dentro de la ventana de 24 h de WhatsApp,
  // así que son texto libre y no se cobran (pasadas las 24 h haría falta una plantilla).
  async programarSeguimientosAuto(telefono) {
    if (esCanalWeb(telefono)) return;
    const base = Date.now();
    await this.state.storage.put("telefonoAuto", telefono);
    await this.state.storage.put("seguimientosAuto", SEGUIMIENTOS_AUTO.map((s) => ({ ...s, ts: base + s.despuesMs, base })));
    await this.state.storage.setAlarm(base + SEGUIMIENTOS_AUTO[0].despuesMs);
  }

  async alarm() {
    // Misma cola que los mensajes del cliente: no se pisa con un turno en curso.
    const turno = this.cola.then(() => this.enviarSeguimientoAuto());
    this.cola = turno.catch(() => {});
    await turno;
  }

  async enviarSeguimientoAuto() {
    const pendientes = (await this.state.storage.get("seguimientosAuto")) || [];
    const ahora = Date.now();
    const debido = pendientes.find((s) => s.ts <= ahora);
    const resto = pendientes.filter((s) => s !== debido && (!debido || s.ts > ahora));
    await this.state.storage.put("seguimientosAuto", resto);
    if (resto.length) await this.state.storage.setAlarm(resto[0].ts);
    if (!debido) return;

    const telefono = await this.state.storage.get("telefonoAuto");
    const historia = (await this.state.storage.get("historia")) || [];
    const pedidos = (await this.state.storage.get("pedidos")) || [];
    const ultimoCliente = ultimoTsDelCliente(historia);
    const ultimo = historia[historia.length - 1];

    // Solo si el cliente no volvió a escribir, nadie lo atiende a mano, el pedido no se cerró
    // y sigue abierta la ventana de 24 h (si no, un texto libre no llegaría).
    if (!telefono || esCanalWeb(telefono)) return;
    if (await this.state.storage.get("pausada")) return;
    if (pedidos.some((p) => p.vigente)) return;
    if (!ultimoCliente || Math.abs(ultimoCliente - debido.base) > 60_000) return;
    if (!ultimo || ultimo.role !== "assistant") return;
    if (ahora - ultimoCliente > 23.9 * 60 * 60 * 1000) return;

    const texto = await redactarSeguimientoAuto(this.env, historia, debido.n);
    if (!texto) return;

    const resultado = await this.enviarRespuesta(telefono, texto);
    await this.registrarEnvio(resultado);
    historia.push({ role: "assistant", content: texto, ts: Date.now(), waId: resultado.id || null, estado: resultado.ok ? "sent" : "failed", seguimientoAuto: debido.n });
    await this.state.storage.put("historia", recortarHistoria(historia, MAX_HISTORY_MESSAGES));
    await this.state.storage.put("ultimoTs", Date.now());
    await actualizarIndice(this.env, telefono, await this.resumenActual());
  }

  async guardarPedido(telefono, datos) {
    const pedidos = (await this.state.storage.get("pedidos")) || [];
    const pedido = { ...datos, telefono, fecha: new Date().toISOString(), vigente: true };
    pedidos.push(pedido);
    await this.state.storage.put("pedidos", pedidos);
    return pedido;
  }

  // Si el cliente vuelve a cotizar después de haber cerrado un pedido, lo guardado ya
  // no es lo que quiere — se marca no vigente para que ningún ejecutivo lo llame por
  // un pedido que el propio cliente corrigió.
  async anularPedidosVigentes(motivo) {
    const pedidos = (await this.state.storage.get("pedidos")) || [];
    if (!pedidos.some((p) => p.vigente)) return;

    await this.state.storage.put(
      "pedidos",
      pedidos.map((p) =>
        p.vigente ? { ...p, vigente: false, anuladoPor: motivo, fechaAnulacion: new Date().toISOString() } : p
      )
    );
  }
}

const SEGUIMIENTOS_AUTO = [
  { n: 1, despuesMs: 60 * 60 * 1000 },
  { n: 2, despuesMs: 23.5 * 60 * 60 * 1000 },
];

const PROMPT_SEGUIMIENTO = `Eres quien atiende por WhatsApp a los clientes de POLIMER (fábrica de bolsas y envases plásticos). Un cliente dejó de responder antes de completar su cotización. Escribe UN mensaje corto de seguimiento para retomar la conversación, como lo escribiría una persona real, no un formulario.

Reglas del mensaje:
- 1 a 2 líneas, máximo 220 caracteres. Español chileno cercano pero formal. Sin ¿ de apertura (solo "?" al final). Sin emojis salvo, a lo más, uno.
- Retoma lo concreto: nombra el producto o lo que falta (medida, grosor, cantidad, empresa, nombre o correo) según lo que se ve en la conversación. Cierra con UNA pregunta fácil de contestar.
- Cero presión, cero culpa, sin "último aviso", sin ofertas ni descuentos, sin precios. No repitas el saludo largo ni lo que ya está dicho.
- Nunca digas que eres un bot o una IA.
- Si la conversación ya terminó de forma natural (el cliente dijo que no le sirve, que lo verá más adelante, se despidió, o ya no hay nada pendiente), responde exactamente: NO_ENVIAR.`;

const TIPO_SEGUIMIENTO = {
  1: "Es el PRIMER recordatorio, a la hora del último mensaje del cliente. Tono de \"sigues por ahí?\": breve y ligero, retomando justo donde quedaron.",
  2: "Es el SEGUNDO recordatorio, a casi un día del último mensaje del cliente (el primero no tuvo respuesta). Preséntate así: \"Hola, te habla Juan Pablo de Polimer\", y di con naturalidad que quizá no alcanzó a ver el mensaje o la cotización, ofreciendo retomarla cuando pueda. Debe sentirse como una persona que escribe, no como un aviso automático.",
};

async function redactarSeguimientoAuto(env, historia, n) {
  const transcript = construirTranscriptAnalisis(historia).split("\n").slice(-14).join("\n");
  if (!transcript.trim()) return null;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 150,
      reasoning_effort: "none",
      messages: [
        { role: "system", content: PROMPT_SEGUIMIENTO },
        { role: "user", content: `${TIPO_SEGUIMIENTO[n]}\n\nConversación hasta ahora:\n${transcript}\n\nEscribe el mensaje (o NO_ENVIAR):` },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  await registrarCostoIA(env, data.usage);
  const texto = (data.choices?.[0]?.message?.content || "").trim().replace(/^["“]|["”]$/g, "");
  if (!texto || /NO_ENVIAR/i.test(texto) || texto.length > 400) return null;
  return texto;
}

// Una cifra de mínimo (o cualquier cantidad de 4+ dígitos) dicha sin que haya corrido una
// herramienta de cálculo en ese turno es una cifra inventada: pasó en producción (chat de
// 40x25 / 70 micras: el bot dijo 231.661 unidades sin llamar ninguna herramienta; lo real
// era 23.167). Se detecta y se obliga a recalcular con la herramienta antes de enviar.
const RE_CIFRA_DE_MINIMO = /m[ií]nimo[^]*?(\d{1,3}(\.\d{3})+|\d{4,})/i;
const AVISO_USAR_HERRAMIENTA = {
  role: "system",
  content:
    "Tu borrador mencionaba una cifra de mínimo sin haberla calculado con una herramienta. Llama ahora a clasificar_pedido (o calcular_unidades_por_peso) con los datos EXACTOS que dio el cliente (medidas y grosor tal como los dijo) y usa textualmente el minimoUnidades o minimoKg que devuelva. No calcules cifras tú.",
};

async function runAgentTurn(env, history, telefono, conversacionDO) {
  let calculoEnTurno = false;
  let reintentado = false;
  let aviso = null;
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callOpenAI(env, aviso ? [...history, aviso] : history, modeloPara(telefono));
    await registrarCostoIA(env, response.usage);
    const msg = response.choices[0].message;
    history.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      if (!calculoEnTurno && !reintentado && RE_CIFRA_DE_MINIMO.test(msg.content || "")) {
        console.error("Cifra de mínimo sin herramienta, se reintenta:", msg.content);
        history.pop(); // el borrador con la cifra inventada no se guarda
        reintentado = true;
        aviso = AVISO_USAR_HERRAMIENTA;
        continue;
      }
      return { replyText: (msg.content || "").trim() || "Ya te ayudo con eso.", finalHistory: history };
    }

    for (const toolCall of msg.tool_calls) {
      let args;
      try {
        args = JSON.parse(toolCall.function.arguments || "{}");
      } catch (err) {
        console.error("El modelo devolvió argumentos de tool call inválidos:", toolCall.function.arguments, err);
        history.push({ role: "tool", tool_call_id: toolCall.id, content: "error: argumentos inválidos" });
        continue;
      }
      let resultContent;

      if (toolCall.function.name === "clasificar_pedido" || toolCall.function.name === "calcular_unidades_por_peso") calculoEnTurno = true;

      if (toolCall.function.name === "clasificar_pedido") {
        await conversacionDO.anularPedidosVigentes("el cliente volvió a cotizar");
        resultContent = JSON.stringify(clasificarPedido(args));
      } else if (toolCall.function.name === "calcular_unidades_por_peso") {
        resultContent = JSON.stringify(unidadesParaPeso(args));
      } else if (toolCall.function.name === "calcular_peso_total_rollos") {
        resultContent = JSON.stringify(pesoTotalRollos(args));
      } else if (toolCall.function.name === "guardar_pedido" && ultimaClasificacion(history)?.estado === "no_cumple") {
        // Si el último cálculo dice que NINGÚN producto cumple, el pedido no se puede cerrar tal
        // cual: el cliente seguramente aceptó otra cantidad (o el mínimo) y falta recalcular.
        // Sin esto el pedido se guardaba pero la etiqueta quedaba en rojo.
        resultContent = "error: el último cálculo marcó que ningún producto cumple el mínimo. Antes de guardar, llama clasificar_pedido con las cantidades definitivas que acordó el cliente.";
      } else if (toolCall.function.name === "guardar_pedido") {
        const pedido = await conversacionDO.guardarPedido(telefono, args);
        await notificarSheets(env, pedido).catch((err) => console.error("Error guardando en Sheets:", err));
        resultContent = "guardado_ok";
      } else {
        resultContent = "tool_desconocida";
      }

      history.push({ role: "tool", tool_call_id: toolCall.id, content: resultContent });
    }
  }

  return { replyText: "Dame un momento, ya te confirmo.", finalHistory: history };
}

// ── Análisis diario profundo por conversación (reemplaza el pipeline simple) ───────
// A diferencia del pipeline anterior (una etapa de 5 posibles, sin contexto), esto le
// pide al modelo un diagnóstico completo por cliente: resumen, si cumplió el mínimo de
// producción, qué tan caliente está el lead y por qué, alertas que un vendedor debería
// revisar ya, y cómo se compara con pedidos anteriores del mismo número. Corre una vez
// al día (cron) sobre TODAS las conversaciones activas, y también se puede disparar a
// mano desde el panel ("Analizar ahora").

// Convierte el historial crudo (el que se le manda a OpenAI, con tool_calls y resultados
// de herramientas) a una transcripción legible que incluye la clasificación real
// (VALIDO/NO_CUMPLE, peso calculado) en vez de que el modelo de análisis tenga que
// re-adivinarla desde el texto conversacional.
function construirTranscriptAnalisis(historiaRaw) {
  const lineas = [];
  for (const turno of historiaRaw) {
    if (turno.role === "user") {
      const texto = Array.isArray(turno.content)
        ? turno.content.filter((c) => c.type === "text").map((c) => c.text).join(" ")
        : turno.content;
      if (texto) lineas.push(`Cliente: ${texto}`);
    } else if (turno.role === "assistant" && turno.content) {
      lineas.push(`Bot: ${turno.content}`);
    } else if (turno.role === "tool" && typeof turno.content === "string") {
      lineas.push(`[Sistema] ${turno.content}`);
    }
  }
  return lineas.join("\n");
}

async function analizarConversacion(env, telefono, historiaRaw, pedidos) {
  const transcript = construirTranscriptAnalisis(historiaRaw);
  if (!transcript.trim()) return null; // conversación vacía, nada que analizar

  const historialPedidos = pedidos.length
    ? pedidos
        .map(
          (p, i) =>
            `${i + 1}. ${(p.fecha || "").slice(0, 10)} — ${p.vigente ? "VIGENTE" : `ANULADO (${p.anuladoPor || "sin motivo"})`} — ${p.detalle || ""}`
        )
        .join("\n")
    : "Sin pedidos guardados previamente para este número.";

  const prompt = `Sos un analista comercial senior revisando una conversación de WhatsApp entre un cliente y el bot de ventas de Polimer (fábrica de bolsas y envases plásticos). Analizá la transcripción completa (incluye mensajes del cliente, del bot, y resultados internos del sistema marcados como "[Sistema]", que ya traen la clasificación real VALIDO/NO_CUMPLE calculada; en conversaciones anteriores al cambio de política aparece NO_CUMPLE como DERIVAR, es lo mismo) y devolvé un diagnóstico profundo y honesto — no inventes datos que no estén en la transcripción.

TRANSCRIPCIÓN COMPLETA:
${transcript}

PEDIDOS GUARDADOS PREVIAMENTE PARA ESTE NÚMERO (antes de esta conversación):
${historialPedidos}

Devolvé SOLO un JSON con este formato exacto:
{
  "resumen": "resumen detallado (4-8 líneas) de qué pidió el cliente, cómo se desarrolló la conversación y en qué quedó",
  "cumpleMinimo": true | false | null,
  "nivelInteres": { "puntaje": 0-100, "razon": "por qué le pusiste ese puntaje, en 1-2 líneas" },
  "alertas": ["cada alerta accionable que un vendedor debería revisar YA, ej: cliente grande que no alcanzó el mínimo, pedido grande sin cerrar hace días, cliente frustrado o que se quejó, datos de contacto faltantes hace tiempo, contradicción entre lo que pidió y lo que se cotizó. Array vacío si de verdad no hay ninguna."],
  "comparacionHistorica": "cómo se compara este pedido/conversación con los pedidos previos de este mismo número (subió, bajó, cambió de producto, cliente recurrente, etc.) — null si es la primera conversación registrada para este número"
}

cumpleMinimo: true si al menos un producto quedó clasificado VALIDO en el [Sistema], false si TODOS quedaron NO_CUMPLE (o DERIVAR en conversaciones viejas), null si la conversación no llegó a clasificarse (sigue en curso, o el cliente nunca completó los datos).`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 700,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      reasoning_effort: "none",
    }),
  });
  if (!res.ok) throw new Error(`OpenAI análisis error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  await registrarCostoIA(env, data.usage);

  try {
    const analisis = JSON.parse(data.choices[0].message.content);
    return { telefono, ...analisis, actualizadoTs: Date.now() };
  } catch (err) {
    console.error("Análisis: el modelo devolvió JSON inválido:", data.choices[0].message.content, err);
    return null;
  }
}

async function ejecutarAnalisisDiario(env) {
  const telefonos = JSON.parse((await env.DATOS.get("telefonos_activos")) || "[]");
  const resultados = [];
  for (const telefono of telefonos) {
    try {
      const res = await getStub(env, telefono).fetch("https://do/estado-completo");
      const { historia, pedidos } = await res.json();
      const analisis = await analizarConversacion(env, telefono, historia, pedidos);
      if (analisis) resultados.push(analisis);
    } catch (err) {
      console.error("Error analizando conversación de", telefono, err);
    }
  }
  await env.DATOS.put("analisis_chats", JSON.stringify({ items: resultados, actualizadoTs: Date.now() }));
  await enviarAnalisisAlPanel(env, resultados);
}

async function enviarAnalisisAlPanel(env, items) {
  try {
    const res = await fetch("https://control.jpbmarketing.cl/api/clients/polimer/analisis", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-analisis-key": env.ANALISIS_KEY },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) console.error("Error enviando análisis al panel:", res.status, await res.text());
  } catch (err) {
    console.error("Error enviando análisis al panel:", err);
  }
}

// Los turnos guardados en `history` llevan metadata extra para el panel (ts, waId,
// estado de entrega) que la API de OpenAI no espera — se manda solo lo que corresponde.
function limpiarTurnoParaAPI({ role, content, tool_calls, tool_call_id }) {
  const turno = { role, content };
  if (tool_calls) turno.tool_calls = tool_calls;
  if (tool_call_id) turno.tool_call_id = tool_call_id;
  return turno;
}

// Solo para pruebas: una conversación web con id "web:luna-*" usa gpt-5.6-luna en vez del
// modelo de producción, para comparar calidad/costo sin tocar a los clientes reales.
function modeloPara(telefono) {
  return typeof telefono === "string" && telefono.startsWith("web:luna-") ? "gpt-5.6-luna" : OPENAI_MODEL;
}

async function callOpenAI(env, history, modelo = OPENAI_MODEL) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: modelo,
      max_completion_tokens: 1024,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history.map(limpiarTurnoParaAPI)],
      tools: TOOLS,
      reasoning_effort: "none", // requerido por la API para poder usar tools en /chat/completions
    }),
  });

  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`);
  return res.json();
}

async function notificarSheets(env, pedido) {
  if (!env.SHEETS_WEBHOOK_URL) return;
  await fetch(env.SHEETS_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.SHEETS_SECRET, ...pedido }),
  });
}

// Resumen de lo que pidió el cliente (para el PDF "Solicitud de cotización" del panel):
// la IA lee la conversación y devuelve los productos pedidos ya ordenados, en vez de
// pegar los mensajes crudos.
async function resumirSolicitud(env, transcript, negocio) {
  if (!transcript.trim()) return { resumen: "", items: [], observaciones: "" };
  const prompt = `Eres un asistente comercial de ${negocio}. Lee esta conversación de WhatsApp y extrae SOLO lo que el cliente pidió cotizar, para armar una solicitud de cotización ordenada.

Devuelve SOLO un JSON con este formato exacto:
{"resumen":"1 o 2 frases: quién pide y qué necesita","items":[{"producto":"nombre del producto","especificaciones":"medidas, micraje, diámetro, clase, material u otros datos técnicos","cantidad":"cantidad con su unidad (unidades, kg, metros)"}],"observaciones":"condiciones o consultas pendientes del cliente (despacho, plazos, preguntas sin responder); vacío si no hay"}

Reglas:
- No inventes nada: solo lo que dijo el cliente (o lo que el sistema calculó de sus datos).
- Si el cliente corrigió algo, usa la versión final.
- Ignora saludos, charla, pruebas y mensajes sin sentido. Si no pidió ningún producto, "items" va vacío.
- Un mismo producto con dos medidas, micrajes o diámetros distintos son dos ítems.

CONVERSACIÓN:
${transcript.slice(-12000)}`;
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 900,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      reasoning_effort: "none",
    }),
  });
  if (!res.ok) throw new Error(`OpenAI resumen error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  await registrarCostoIA(env, data.usage);
  const r = JSON.parse(data.choices[0].message.content);
  return {
    resumen: String(r.resumen || ""),
    items: Array.isArray(r.items) ? r.items : [],
    observaciones: String(r.observaciones || ""),
  };
}

// Todos en paralelo (Promise.all sin límite) se probó antes y era rápido con pocas
// conversaciones, pero ahora que son 150+ (sobre todo pruebas del chat web) el Worker
// revienta con error 503 ("excedió el límite de CPU") al abrir ese montón de Durable
// Objects de una sola vez — batchear de a 25 en paralelo bajó la concurrencia pero NO
// el CPU total (el límite del plan Free es de cómputo acumulado, no de paralelismo),
// así que seguía fallando igual con 150+ conversaciones. La lista ahora se lee de un
// índice ya armado en KV (un solo GET, sin abrir ningún Durable Object) que cada DO
// mantiene al día en actualizarIndice() cada vez que cambia su propio estado.
async function listarConversaciones(env) {
  const indice = JSON.parse((await env.DATOS.get("indice_conversaciones")) || "{}");
  return Object.values(indice).sort((a, b) => b.ultimoTs - a.ultimoTs);
}

// Guarda/actualiza el resumen de UN teléfono dentro del índice compartido en KV que
// lee listarConversaciones(). Se llama desde el propio Durable Object cada vez que
// cambia algo relevante (mensaje nuevo, pausar/reanudar, etc.) — así la lista del
// panel nunca tiene que volver a abrir los 150+ Durable Objects para armarse.
async function actualizarIndice(env, telefono, resumen) {
  try {
    const indice = JSON.parse((await env.DATOS.get("indice_conversaciones")) || "{}");
    indice[telefono] = { telefono, canal: esCanalWeb(telefono) ? "web" : "whatsapp", ...resumen };
    await env.DATOS.put("indice_conversaciones", JSON.stringify(indice));
  } catch (err) {
    // Si esto falla no debe tumbar el envío/recepción del mensaje real — en el peor
    // caso la lista del panel queda un rato desactualizada para ese número.
    console.error("Error actualizando índice de conversaciones:", telefono, err);
  }
}

// Reconstruye desde cero el índice de arriba, leyendo los 150+ Durable Objects UNA
// vez (en bloques, igual que antes). Pensado para correr una sola vez después de
// desplegar este cambio (o si el índice se corrompe), llamando a este endpoint una
// vez por teléfono desde afuera del Worker — así cada invocación es una request
// nueva con su propio presupuesto de CPU y nunca se acumula lo suficiente para
// pegar en el límite, a diferencia de hacerlo todo junto adentro de una sola request.
async function reindexarUno(env, telefono) {
  const res = await getStub(env, telefono).fetch("https://do/resumen");
  const resumen = await res.json();
  await actualizarIndice(env, telefono, resumen);
  return resumen;
}

async function listarPedidos(env) {
  const telefonos = JSON.parse((await env.DATOS.get("telefonos_activos")) || "[]");
  const todos = [];
  for (const telefono of telefonos) {
    const res = await getStub(env, telefono).fetch("https://do/estado");
    const { pedidos } = await res.json();
    todos.push(...pedidos);
  }
  return todos.sort((a, b) => b.fecha.localeCompare(a.fecha));
}

function handleVerification(url, env) {
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  if (mode === "subscribe" && token === env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(url.searchParams.get("hub.challenge"), { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta puede agrupar varios mensajes seguidos del mismo cliente en un solo webhook
// (`value.messages` con más de un elemento) — leer solo el primero perdía el resto en
// silencio, aunque el webhook (y su notificación push) sí llegaba. Se devuelven todos.
function extractIncomingMessages(payload) {
  const msgs = payload?.entry?.[0]?.changes?.[0]?.value?.messages;
  if (!msgs || !msgs.length) return [];

  const out = [];
  for (const msg of msgs) {
    if (msg.type === "text") out.push({ id: msg.id, from: msg.from, type: "text", text: msg.text.body });
    else if (msg.type === "audio") out.push({ id: msg.id, from: msg.from, type: "audio", mediaId: msg.audio.id });
    else if (msg.type === "image") {
      out.push({ id: msg.id, from: msg.from, type: "image", mediaId: msg.image.id, caption: msg.image.caption || "" });
    } else if (msg.type === "document") {
      // Logos en archivo editable (PDF, AI, EPS, CDR): el modelo no los abre, solo
      // sabe que llegaron; el archivo queda respaldado en R2 para el ejecutivo.
      out.push({ id: msg.id, from: msg.from, type: "document", mediaId: msg.document.id, filename: msg.document.filename || "", caption: msg.document.caption || "" });
    }
  }
  return out;
}

async function buildUserContent(env, message) {
  if (message.type === "text") return { content: message.text };

  if (message.type === "audio") {
    const { data, mimeType } = await downloadWhatsAppMedia(env, message.mediaId);
    const [texto, audioKey] = await Promise.all([
      transcribirAudio(env, data),
      guardarMediaEnR2(env, message, data, mimeType || "audio/ogg"),
    ]);
    return { content: `[Nota de voz transcrita]: ${texto || "(no se pudo transcribir el audio)"}`, audioKey };
  }

  if (message.type === "document") {
    let archivoKey = null;
    try {
      const { data, mimeType } = await downloadWhatsAppMedia(env, message.mediaId);
      archivoKey = await guardarMediaEnR2(env, message, data, mimeType || "application/octet-stream");
    } catch (err) {
      console.error("Error descargando documento:", err);
    }
    const nombre = message.filename || "sin nombre";
    return {
      content: `[El cliente envió un archivo: ${nombre}${message.caption ? ` — "${message.caption}"` : ""}. Si es el logo o diseño para la impresión, confírmale que lo recibimos y que el ejecutivo lo revisará; anótalo en el pedido.]`,
      archivoKey,
    };
  }

  const { data, mimeType } = await downloadWhatsAppMedia(env, message.mediaId);
  const imageKey = await guardarMediaEnR2(env, message, data, mimeType || "image/jpeg");
  return {
    content: [
      { type: "image_url", image_url: { url: `data:${mimeType};base64,${arrayBufferToBase64(data)}` } },
      {
        type: "text",
        text: message.caption || "El cliente envió esta imagen, interprétala en el contexto de la cotización (puede ser una foto del producto, una medida o una muestra).",
      },
    ],
    imageKey,
    captionParaPanel: message.caption || "",
  };
}

// Guarda el binario original en R2 sin interrumpir el flujo del bot si el respaldo
// falla: el LLM igual puede procesar la transcripción o la imagen descargada.
async function guardarMediaEnR2(env, message, data, contentType) {
  try {
    const key = `${message.from}/${message.id || Date.now()}`;
    await env.AUDIOS.put(key, data, { httpMetadata: { contentType } });
    return key;
  } catch (err) {
    console.error("Error guardando media en R2:", err);
    return null;
  }
}

// Los archivos de WhatsApp no vienen con URL directa: primero la metadata (que trae
// una URL firmada) y después el binario.
async function downloadWhatsAppMedia(env, mediaId) {
  const metaRes = await fetch(`https://graph.facebook.com/v21.0/${mediaId}`, {
    headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
  });
  if (!metaRes.ok) throw new Error(`Error obteniendo metadata de media: ${metaRes.status}`);
  const { url, mime_type } = await metaRes.json();

  const fileRes = await fetch(url, { headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` } });
  if (!fileRes.ok) throw new Error(`Error descargando media: ${fileRes.status}`);

  return { data: await fileRes.arrayBuffer(), mimeType: mime_type };
}

async function transcribirAudio(env, audioArrayBuffer) {
  const result = await env.AI.run("@cf/openai/whisper", { audio: [...new Uint8Array(audioArrayBuffer)] });
  return (result?.text || "").trim();
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function historialSimplificado(history) {
  const out = [];
  for (const turno of history) {
    if (turno.role === "user") {
      const texto = turno.imageKey
        ? `[imagen]${turno.captionParaPanel ? ` ${turno.captionParaPanel}` : ""}`
        : Array.isArray(turno.content)
        ? turno.content.filter((c) => c.type === "text").map((c) => c.text).join(" ")
        : turno.content;
      if (typeof texto === "string" && texto) {
        out.push({ rol: "cliente", texto, ts: turno.ts || null, audioKey: turno.audioKey || null, imageKey: turno.imageKey || null });
      }
    } else if (turno.role === "assistant" && typeof turno.content === "string" && turno.content) {
      out.push({ rol: "bot", texto: turno.content, ts: turno.ts || null, estado: turno.estado || null });
    }
  }
  return out;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// El primer mensaje de una conversación nueva se demora fijo, como si a la persona le
// tomara un rato notar el WhatsApp y ponerse a escribir; de ahí en adelante ya está
// "en la conversación" y responde a ritmo de tipeo (ver calcularDemoraEscritura).
const PRIMER_MENSAJE_DELAY_MS = 10000;

// ~45 caracteres/seg de "tipeo" con un piso para respuestas cortas y un techo para no
// hacer esperar de más en las largas; ±15% de variación para que no sea siempre el
// mismo ritmo exacto.
function calcularDemoraEscritura(texto) {
  const BASE_MS = 500;
  const MS_POR_CARACTER = 22;
  const MAX_MS = 6000;
  const jitter = 0.85 + Math.random() * 0.3;
  return Math.min(MAX_MS, Math.round((BASE_MS + (texto || "").length * MS_POR_CARACTER) * jitter));
}

// No es crítico para el flujo: si falla (ej. el mensaje ya no es marcable), no debe
// tumbar la respuesta real al cliente.
async function mostrarEscribiendo(env, messageId) {
  try {
    await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: messageId,
        typing_indicator: { type: "text" },
      }),
    });
  } catch (err) {
    console.error("Error mostrando indicador de escritura:", err);
  }
}

async function enviarTemplateSeguimiento(env, to, nombre) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: SEGUIMIENTO_TEMPLATE,
        language: { code: "es" },
        components: [{ type: "body", parameters: [{ type: "text", text: nombre || "" }] }],
      },
    }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) console.error("Error enviando template de seguimiento:", res.status, data);
  return { ok: res.ok, data };
}

// Devuelve si realmente llegó a Meta — el llamador lo usa para no dar por entregado
// (ni en el panel) un mensaje que en verdad se quedó pegado (ej. token vencido).
async function sendWhatsAppMessage(env, to, body) {
  const res = await fetch(`https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
    },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body } }),
  });
  if (res.ok) {
    const data = await res.json().catch(() => null);
    return { ok: true, id: data?.messages?.[0]?.id || null };
  }
  const detalle = await res.text();
  console.error("Error enviando mensaje de WhatsApp:", res.status, detalle);
  return { ok: false, status: res.status, detalle };
}

// Push al panel (control.jpbmarketing.cl) cuando llega un mensaje nuevo — mismo
// mecanismo que whatsapp-agente/Conflex, con su propio secret PANEL_NOTIFY_KEY (mismo
// valor que el resto de los bots, es el que valida NOTIFY_KEY en el panel).
async function notificarPanelPush(env, telefono, texto) {
  try {
    const cuerpo = (texto || "").length > 140 ? texto.slice(0, 140) + "…" : texto;
    const res = await fetch("https://control.jpbmarketing.cl/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-notify-key": env.PANEL_NOTIFY_KEY },
      body: JSON.stringify({ titulo: `Polimer — ${telefono}`, cuerpo: cuerpo || "Tienes un mensaje nuevo", telefono }),
    });
    if (!res.ok) {
      console.error("Error notificando push al panel:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Error notificando push al panel:", err);
  }
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "access-control-allow-origin": "*" },
  });
}

// Preflight de /web/mensaje (fetch con JSON desde el navegador dispara OPTIONS antes).
function corsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}
