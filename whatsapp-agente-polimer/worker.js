// Agente de WhatsApp (Meta Cloud API) de Polimer: cotiza bolsas y envases plásticos,
// valida el mínimo de producción y deriva a Homs Pack los pedidos que no lo alcanzan.
//
// El estado de cada conversación vive en un Durable Object — una instancia por número.
// Un DO procesa sus requests DE A UNO, en orden, así dos mensajes seguidos no se pisan
// al guardar el historial (con KV sí pasaba, y el bot perdía el contexto).

import PROMPT_BASE from "./PROMPT.md";
import { clasificarPedido } from "./cotizador.js";

const OPENAI_MODEL = "gpt-5.6-terra";
const MAX_HISTORY_MESSAGES = 40;
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
- El PASO 2 no lo calculas mentalmente: llama a la herramienta clasificar_pedido con TODOS los productos recolectados. Ella aplica la fórmula, la conversión de micraje y la excepción de mínimo, y te devuelve cada producto como VALIDO o DERIVAR más el link de derivación ya armado. Úsala en el mismo turno en que el cliente confirma que no hay más productos, y responde según el PASO 3 con lo que te devuelva.
- Cuando el cliente ya te entregó empresa, nombre y correo de un pedido VALIDO, llama a guardar_pedido antes de despedirte.
- Si el cliente corrige medidas, micraje o cantidad de un pedido que ya cerraste, vuelve a llamar clasificar_pedido con los datos corregidos y actúa según el nuevo resultado. Si sigue siendo VALIDO y ya tienes sus datos de contacto, llama otra vez a guardar_pedido con el detalle actualizado — no se los vuelvas a pedir.
- Nunca inventes el link de derivación: usa exactamente el que devuelve clasificar_pedido.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "clasificar_pedido",
      description:
        "Calcula el peso de cada producto y lo clasifica como VALIDO o DERIVAR según el mínimo de producción. Devuelve además el link de derivación a Homs Pack si corresponde.",
      parameters: {
        type: "object",
        properties: {
          productos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                tipo: { type: "string", description: "Tipo de producto, ej. Hielo, Wicket, Cubre pallet, Stretch" },
                ancho: { type: "number", description: "Ancho en cm" },
                largo: { type: "number", description: "Largo en cm" },
                micraje: { type: "number", description: "Micraje tal como lo dijo el cliente (en micrones o en mm). Omitir si no lo sabe." },
                cantidad: { type: "number" },
                unidad: { type: "string", enum: ["unidades", "kilos"] },
              },
              required: ["tipo", "ancho", "largo", "cantidad", "unidad"],
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
      const message = extractIncomingMessage(payload);

      // Eventos de estado traen pricing.category + pricing.billable — es la única
      // forma de saber cuántos mensajes facturables se mandaron por categoría.
      const statuses = payload?.entry?.[0]?.changes?.[0]?.value?.statuses;
      if (statuses) {
        for (const s of statuses) {
          if (s.pricing?.billable && s.pricing?.category) {
            ctx.waitUntil(registrarCostoMeta(env, s.pricing.category));
          }
        }
      }

      if (message) {
        ctx.waitUntil(registrarTelefono(env, message.from));
        ctx.waitUntil(registrarMensajeEmergencia(env, message));
        ctx.waitUntil(
          getStub(env, message.from).fetch("https://do/procesar", {
            method: "POST",
            body: JSON.stringify({ message }),
          })
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
      await getStub(env, conversationId).fetch("https://do/procesar", {
        method: "POST",
        body: JSON.stringify({ message: { from: conversationId, type: "text", text: texto } }),
      });
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

    if (url.pathname.startsWith("/admin/")) {
      if (request.headers.get("x-panel-key") !== env.PANEL_KEY) {
        return new Response("forbidden", { status: 403 });
      }
      if (request.method === "GET" && url.pathname === "/admin/pedidos") {
        return jsonResponse(await listarPedidos(env));
      }
      if (request.method === "GET" && url.pathname === "/admin/conversaciones") {
        return jsonResponse(await listarConversaciones(env));
      }
      if (request.method === "GET" && url.pathname === "/admin/mensajes-emergencia") {
        const lista = JSON.parse((await env.DATOS.get("mensajes_emergencia")) || "[]");
        const telefono = url.searchParams.get("telefono");
        return jsonResponse(telefono ? lista.filter((m) => m.telefono === telefono) : lista);
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
        return jsonResponse({ ok: true });
      }
      if (request.method === "POST" && url.pathname === "/admin/reanudar") {
        const { telefono } = await request.json();
        await getStub(env, telefono).fetch("https://do/reanudar", { method: "POST" });
        return jsonResponse({ ok: true });
      }
      if (request.method === "POST" && url.pathname === "/admin/reiniciar") {
        const { telefono } = await request.json();
        await getStub(env, telefono).fetch("https://do/reiniciar", { method: "POST" });
        return jsonResponse({ ok: true });
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

export class Conversacion {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/procesar") {
      const { message } = await request.json();
      await this.procesarMensaje(message);
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
    // resultados internos de clasificar_pedido (VALIDO/DERIVAR, peso calculado) que el
    // análisis diario necesita para no tener que re-adivinar el cálculo desde cero.
    if (request.method === "GET" && url.pathname === "/estado-completo") {
      return jsonResponse({
        historia: (await this.state.storage.get("historia")) || [],
        pedidos: (await this.state.storage.get("pedidos")) || [],
      });
    }
    if (request.method === "GET" && url.pathname === "/resumen") {
      const mensajes = historialSimplificado((await this.state.storage.get("historia")) || []);
      const ultimo = mensajes[mensajes.length - 1];
      return jsonResponse({
        ultimoMensaje: (ultimo && ultimo.texto) || "",
        ultimoTs: (await this.state.storage.get("ultimoTs")) || 0,
        pausada: !!(await this.state.storage.get("pausada")),
        entregaFallida: !!(await this.state.storage.get("entregaFallida")),
      });
    }
    // Un ejecutivo escribe desde el panel: el bot queda en pausa para no responderle
    // por encima hasta que alguien lo reanude.
    if (request.method === "POST" && url.pathname === "/enviar") {
      const { telefono, texto } = await request.json();
      await this.state.storage.put("pausada", true);
      const historia = (await this.state.storage.get("historia")) || [];
      historia.push({ role: "assistant", content: texto });
      await this.state.storage.put("historia", historia.slice(-MAX_HISTORY_MESSAGES));
      await this.state.storage.put("ultimoTs", Date.now());
      const resultado = await this.enviarRespuesta(telefono, texto);
      await this.registrarEnvio(resultado);
      return jsonResponse(resultado.ok ? { ok: true } : { ok: false, error: resultado.detalle });
    }
    if (request.method === "POST" && url.pathname === "/reanudar") {
      await this.state.storage.delete("pausada");
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
      await this.state.storage.put("historia", historia.slice(-MAX_HISTORY_MESSAGES));
      await this.state.storage.put("ultimoTs", Date.now());
      return jsonResponse({ ok: true });
    }
    return new Response("not found", { status: 404 });
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
    let userContent;
    try {
      userContent = await buildUserContent(env, message);
    } catch (err) {
      console.error("Error armando el contenido del mensaje:", err);
      userContent = "[mensaje no se pudo procesar]";
    }
    historia.push({ role: "user", content: userContent });
    await this.state.storage.put("historia", historia.slice(-MAX_HISTORY_MESSAGES));
    await this.state.storage.put("ultimoTs", Date.now());

    // Si un ejecutivo está atendiendo manualmente desde el panel, el bot no contesta
    // por encima: el mensaje ya quedó guardado arriba para que se vea en el chat.
    if (await this.state.storage.get("pausada")) return;

    try {
      const { replyText, finalHistory } = await runAgentTurn(env, historia, message.from, this);

      await this.state.storage.put("historia", finalHistory.slice(-MAX_HISTORY_MESSAGES));
      await this.state.storage.put("ultimoTs", Date.now());

      // Demora artificial proporcional al largo de la respuesta, para simular que un
      // humano la está tipeando en vez de que aparezca al instante. Se refresca el
      // indicador justo antes porque dura máx. 25s y ya pasó tiempo procesando arriba.
      if (message.id) await mostrarEscribiendo(env, message.id);
      await sleep(esPrimerMensaje ? PRIMER_MENSAJE_DELAY_MS : calcularDemoraEscritura(replyText));
      await this.registrarEnvio(await this.enviarRespuesta(message.from, replyText));
    } catch (err) {
      console.error("Error procesando mensaje:", err);
      // `historia` es el mismo array que fue mutando runAgentTurn (push por referencia),
      // así que ya trae cualquier avance parcial (tool_calls, etc.) previo al error.
      const mensajeError = "Tuvimos un problema técnico procesando tu mensaje, ya lo estamos viendo.";
      historia.push({ role: "assistant", content: mensajeError });
      await this.state.storage.put("historia", historia.slice(-MAX_HISTORY_MESSAGES));
      await this.registrarEnvio(await this.enviarRespuesta(message.from, mensajeError));
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

async function runAgentTurn(env, history, telefono, conversacionDO) {
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await callOpenAI(env, history);
    await registrarCostoIA(env, response.usage);
    const msg = response.choices[0].message;
    history.push({ role: "assistant", content: msg.content, tool_calls: msg.tool_calls });

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
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

      if (toolCall.function.name === "clasificar_pedido") {
        await conversacionDO.anularPedidosVigentes("el cliente volvió a cotizar");
        resultContent = JSON.stringify(clasificarPedido(args));
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
// (VALIDO/DERIVAR, peso calculado) en vez de que el modelo de análisis tenga que
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

  const prompt = `Sos un analista comercial senior revisando una conversación de WhatsApp entre un cliente y el bot de ventas de Polimer (fábrica de bolsas y envases plásticos). Analizá la transcripción completa (incluye mensajes del cliente, del bot, y resultados internos del sistema marcados como "[Sistema]", que ya traen la clasificación real VALIDO/DERIVAR calculada) y devolvé un diagnóstico profundo y honesto — no inventes datos que no estén en la transcripción.

TRANSCRIPCIÓN COMPLETA:
${transcript}

PEDIDOS GUARDADOS PREVIAMENTE PARA ESTE NÚMERO (antes de esta conversación):
${historialPedidos}

Devolvé SOLO un JSON con este formato exacto:
{
  "resumen": "resumen detallado (4-8 líneas) de qué pidió el cliente, cómo se desarrolló la conversación y en qué quedó",
  "cumpleMinimo": true | false | null,
  "nivelInteres": { "puntaje": 0-100, "razon": "por qué le pusiste ese puntaje, en 1-2 líneas" },
  "alertas": ["cada alerta accionable que un vendedor debería revisar YA, ej: cliente grande derivado a Homs Pack, pedido grande sin cerrar hace días, cliente frustrado o que se quejó, datos de contacto faltantes hace tiempo, contradicción entre lo que pidió y lo que se cotizó. Array vacío si de verdad no hay ninguna."],
  "comparacionHistorica": "cómo se compara este pedido/conversación con los pedidos previos de este mismo número (subió, bajó, cambió de producto, cliente recurrente, etc.) — null si es la primera conversación registrada para este número"
}

cumpleMinimo: true si al menos un producto quedó clasificado VALIDO en el [Sistema], false si TODOS quedaron DERIVAR, null si la conversación no llegó a clasificarse (sigue en curso, o el cliente nunca completó los datos).`;

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

async function callOpenAI(env, history) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      max_completion_tokens: 1024,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
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

async function listarConversaciones(env) {
  const telefonos = JSON.parse((await env.DATOS.get("telefonos_activos")) || "[]");
  const conversaciones = [];
  for (const telefono of telefonos) {
    const res = await getStub(env, telefono).fetch("https://do/resumen");
    conversaciones.push({ telefono, canal: esCanalWeb(telefono) ? "web" : "whatsapp", ...(await res.json()) });
  }
  return conversaciones.sort((a, b) => b.ultimoTs - a.ultimoTs);
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

function extractIncomingMessage(payload) {
  const msg = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return null;

  if (msg.type === "text") return { id: msg.id, from: msg.from, type: "text", text: msg.text.body };
  if (msg.type === "audio") return { id: msg.id, from: msg.from, type: "audio", mediaId: msg.audio.id };
  if (msg.type === "image") {
    return { id: msg.id, from: msg.from, type: "image", mediaId: msg.image.id, caption: msg.image.caption || "" };
  }
  return null;
}

async function buildUserContent(env, message) {
  if (message.type === "text") return message.text;

  if (message.type === "audio") {
    const { data } = await downloadWhatsAppMedia(env, message.mediaId);
    const texto = await transcribirAudio(env, data);
    return `[Nota de voz transcrita]: ${texto || "(no se pudo transcribir el audio)"}`;
  }

  const { data, mimeType } = await downloadWhatsAppMedia(env, message.mediaId);
  return [
    { type: "image_url", image_url: { url: `data:${mimeType};base64,${arrayBufferToBase64(data)}` } },
    {
      type: "text",
      text: message.caption || "El cliente envió esta imagen, interprétala en el contexto de la cotización (puede ser una foto del producto, una medida o una muestra).",
    },
  ];
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
  return history
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content)
    .map((m) => ({ rol: m.role === "user" ? "cliente" : "bot", texto: m.content }));
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
  if (res.ok) return { ok: true };
  const detalle = await res.text();
  console.error("Error enviando mensaje de WhatsApp:", res.status, detalle);
  return { ok: false, status: res.status, detalle };
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
