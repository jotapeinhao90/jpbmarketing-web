const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
// El large-v3-turbo rechaza el audio como array (solo acepta otro formato); el modelo
// base sí funciona con `audio: [...bytes]`. Comprobado empíricamente contra grabaciones reales.
const WHISPER_MODEL = '@cf/openai/whisper';

const RESULTADOS_VALIDOS = [
  'cotización enviada',
  'interesado',
  'no contesta',
  'rechazado',
  'venta cerrada',
  'reagendar',
  'otro',
];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function xml(text, status = 200) {
  return new Response(text, {
    status,
    headers: { 'Content-Type': 'text/xml' },
  });
}

function escapeXml(str) {
  return String(str || '').replace(/[<>&'"]/g, (c) => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;',
  }[c]));
}

// Los vendedores escriben el número como les acomoda ("9 1234 5678", "56912345678").
// Twilio exige formato E.164, así que normalizamos asumiendo Chile por defecto.
function normalizarTelefono(valor) {
  const limpio = String(valor || '').replace(/[^\d+]/g, '');
  if (!limpio) return '';
  if (limpio.startsWith('+')) return limpio;
  if (limpio.startsWith('56')) return '+' + limpio;
  if (limpio.length === 9 && limpio.startsWith('9')) return '+56' + limpio;
  if (limpio.length === 8) return '+569' + limpio;
  return '+' + limpio;
}

// Twilio exige que el "identity" de un Access Token sea solo alfanumérico y guion bajo.
function toIdentity(nombre) {
  return String(nombre || 'vendedor')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .slice(0, 100) || 'vendedor';
}

function base64url(input) {
  let bytes;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = new Uint8Array(input);
  }
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Construye a mano un Access Token JWT de Twilio (formato "twilio-fpa;v=1") firmado con
// la API Key, para que el navegador del vendedor pueda usar el Voice SDK sin exponer
// nunca el API Key Secret al cliente.
async function generarAccessToken(env, identity) {
  const now = Math.floor(Date.now() / 1000);
  const header = { typ: 'JWT', alg: 'HS256', cty: 'twilio-fpa;v=1' };
  const payload = {
    jti: `${env.TWILIO_API_KEY_SID}-${now}`,
    iss: env.TWILIO_API_KEY_SID,
    sub: env.TWILIO_ACCOUNT_SID,
    iat: now,
    exp: now + 3600,
    grants: {
      identity,
      voice: {
        incoming: { allow: false },
        outgoing: { application_sid: env.TWILIO_TWIML_APP_SID },
      },
    },
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.TWILIO_API_KEY_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64url(signature)}`;
}

async function estructurarNota(env, { vendedor, telefono, nota }) {
  const prompt = `Eres un asistente que estructura notas de llamadas de venta B2B en Chile.
Esta es la transcripción o nota de una llamada que un vendedor tuvo con un cliente:

"${nota}"

Teléfono marcado: ${telefono || 'no indicado'}

Devuelve SOLO un JSON válido (sin texto antes ni después, sin markdown) con estas claves exactas:
{
  "empresa": string o null,
  "contacto": string o null (nombre de la persona con la que habló),
  "resultado": una de estas categorías EXACTAS: ${RESULTADOS_VALIDOS.map((r) => `"${r}"`).join(', ')},
  "proximo_paso": string corto o null,
  "fecha_seguimiento": string corto (ej: "jueves", "2026-09-05") o null,
  "resumen": string de 1-2 frases en español, tono profesional, resumiendo la llamada
}`;

  try {
    const respuesta = await env.AI.run(AI_MODEL, {
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const raw = respuesta.response;
    let parsed;
    if (raw && typeof raw === 'object') {
      parsed = raw;
    } else {
      const match = String(raw || '').match(/\{[\s\S]*\}/);
      if (!match) throw new Error('sin JSON en la respuesta');
      parsed = JSON.parse(match[0]);
    }

    if (!RESULTADOS_VALIDOS.includes(parsed.resultado)) parsed.resultado = 'otro';
    return parsed;
  } catch (err) {
    // Si la IA falla, igual guardamos la llamada con la nota cruda — nunca se pierde el registro.
    return {
      empresa: null,
      contacto: null,
      resultado: 'otro',
      proximo_paso: null,
      fecha_seguimiento: null,
      resumen: nota,
    };
  }
}

async function guardarLlamada(env, { vendedor, telefono, nota, origen }) {
  const estructurado = await estructurarNota(env, { vendedor, telefono, nota });
  const createdAt = new Date().toISOString();

  const result = await env.DB.prepare(
    `INSERT INTO llamadas (vendedor, telefono, empresa, contacto, resultado, proximo_paso, fecha_seguimiento, resumen, nota_original, created_at, origen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      vendedor,
      telefono || null,
      estructurado.empresa || null,
      estructurado.contacto || null,
      estructurado.resultado || 'otro',
      estructurado.proximo_paso || null,
      estructurado.fecha_seguimiento || null,
      estructurado.resumen || nota,
      nota,
      createdAt,
      origen
    )
    .run();

  return { id: result.meta.last_row_id, vendedor, telefono, created_at: createdAt, ...estructurado };
}

// Descarga la grabación desde Twilio (autenticado con la API Key, igual que la REST API
// normal), la transcribe con Whisper (Cloudflare Workers AI) y genera el resumen.
async function transcribirYGuardar(env, { vendedor, telefono, recordingUrl }) {
  const authHeader = 'Basic ' + btoa(`${env.TWILIO_API_KEY_SID}:${env.TWILIO_API_KEY_SECRET}`);
  const audioRes = await fetch(`${recordingUrl}.mp3`, { headers: { Authorization: authHeader } });
  if (!audioRes.ok) throw new Error(`No se pudo descargar la grabación: ${audioRes.status}`);
  const audioBuffer = await audioRes.arrayBuffer();

  const transcripcion = await env.AI.run(WHISPER_MODEL, {
    audio: [...new Uint8Array(audioBuffer)],
    language: 'es',
  });
  const texto = transcripcion.text || transcripcion.transcription_info?.text || '';

  if (!texto.trim()) {
    await guardarLlamada(env, { vendedor, telefono, nota: '(llamada sin audio transcribible)', origen: 'llamada' });
    return;
  }

  await guardarLlamada(env, { vendedor, telefono, nota: texto, origen: 'llamada' });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Rutas que llama Twilio directamente (no el navegador del dashboard) — se protegen
    // con una clave propia en la URL, nunca con el Basic Auth del dashboard.
    if (url.pathname === '/api/voice/outgoing' && request.method === 'POST') {
      if (url.searchParams.get('key') !== env.TWILIO_WEBHOOK_KEY) {
        return new Response('forbidden', { status: 403 });
      }
      const form = await request.formData();
      // "MiNumero" y no "CallerId" para no chocar con los parámetros reservados que
      // Twilio agrega por su cuenta al POST del TwiML App.
      const to = normalizarTelefono(form.get('To'));
      const callerId = normalizarTelefono(form.get('MiNumero'));
      const vendedor = form.get('Vendedor') || 'Vendedor';
      const telefono = normalizarTelefono(form.get('Telefono')) || to;

      if (!to || !callerId) {
        return xml('<Response><Say language="es-MX">Falta el número a marcar.</Say></Response>', 400);
      }

      const callbackUrl = `https://llamadas.jpbmarketing.cl/api/voice/recording?key=${encodeURIComponent(env.TWILIO_WEBHOOK_KEY)}&vendedor=${encodeURIComponent(vendedor)}&telefono=${encodeURIComponent(telefono)}`;

      return xml(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial callerId="${escapeXml(callerId)}" answerOnBridge="true" record="record-from-answer-dual" recordingStatusCallback="${escapeXml(callbackUrl)}" recordingStatusCallbackEvent="completed" recordingStatusCallbackMethod="POST">
    ${escapeXml(to)}
  </Dial>
</Response>`);
    }

    if (url.pathname === '/api/voice/recording' && request.method === 'POST') {
      if (url.searchParams.get('key') !== env.TWILIO_WEBHOOK_KEY) {
        return new Response('forbidden', { status: 403 });
      }
      const vendedor = url.searchParams.get('vendedor') || 'Vendedor';
      const telefono = url.searchParams.get('telefono') || '';
      const form = await request.formData();
      const recordingUrl = form.get('RecordingUrl');
      const status = form.get('RecordingStatus');

      if (status === 'completed' && recordingUrl) {
        try {
          await transcribirYGuardar(env, { vendedor, telefono, recordingUrl });
        } catch (err) {
          await guardarLlamada(env, {
            vendedor,
            telefono,
            nota: `(no se pudo transcribir la grabación automáticamente: ${err.message})`,
            origen: 'llamada',
          });
        }
      }
      return new Response('ok');
    }

    // Todo lo demás (el dashboard y su API) requiere el Basic Auth normal.
    const auth = request.headers.get('Authorization');
    const expected = 'Basic ' + btoa('jpb:' + env.DASHBOARD_PASSWORD);
    if (auth !== expected) {
      return new Response('Autenticación requerida', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Llamadas B2B"' },
      });
    }

    // Diagnóstico: muestra qué dijo Twilio de las últimas llamadas y qué números
    // están verificados. Sirve para depurar sin tener que mirar la consola de Twilio.
    if (url.pathname === '/api/voice/debug') {
      const authHeader = 'Basic ' + btoa(`${env.TWILIO_API_KEY_SID}:${env.TWILIO_API_KEY_SECRET}`);
      const base = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}`;

      const [llamadasRes, callerIdsRes, appRes, alertasRes] = await Promise.all([
        fetch(`${base}/Calls.json?PageSize=5`, { headers: { Authorization: authHeader } }),
        fetch(`${base}/OutgoingCallerIds.json`, { headers: { Authorization: authHeader } }),
        fetch(`${base}/Applications/${env.TWILIO_TWIML_APP_SID}.json`, { headers: { Authorization: authHeader } }),
        fetch('https://monitor.twilio.com/v1/Alerts?PageSize=10', { headers: { Authorization: authHeader } }),
      ]);

      const llamadasData = await llamadasRes.json();
      const callerIdsData = await callerIdsRes.json();
      const appData = await appRes.json();
      const alertasData = await alertasRes.json();

      return json({
        alertas: (alertasData.alerts || []).map((a) => ({
          fecha: a.date_created,
          codigo: a.error_code,
          nivel: a.log_level,
          texto: (a.alert_text || '').slice(0, 300),
        })),
        twiml_app: {
          nombre: appData.friendly_name,
          voice_url: appData.voice_url || '(VACÍA — hay que configurarla)',
          voice_method: appData.voice_method,
        },
        numeros_verificados: (callerIdsData.outgoing_caller_ids || []).map((c) => c.phone_number),
        ultimas_llamadas: (llamadasData.calls || []).map((c) => ({
          fecha: c.date_created,
          de: c.from,
          para: c.to,
          estado: c.status,
          duracion: c.duration,
          error: c.error_code ? `${c.error_code}: ${c.error_message}` : null,
        })),
      });
    }

    if (url.pathname === '/api/voice/numeros') {
      const authHeader = 'Basic ' + btoa(`${env.TWILIO_API_KEY_SID}:${env.TWILIO_API_KEY_SECRET}`);
      const base = `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}`;

      const [verificadosRes, propiosRes] = await Promise.all([
        fetch(`${base}/OutgoingCallerIds.json`, { headers: { Authorization: authHeader } }),
        fetch(`${base}/IncomingPhoneNumbers.json`, { headers: { Authorization: authHeader } }),
      ]);
      const verificados = await verificadosRes.json();
      const propios = await propiosRes.json();

      return json([
        ...(verificados.outgoing_caller_ids || []).map((c) => ({
          numero: c.phone_number,
          etiqueta: `${c.phone_number} (tu número)`,
        })),
        ...(propios.incoming_phone_numbers || []).map((n) => ({
          numero: n.phone_number,
          etiqueta: `${n.phone_number} (número Twilio)`,
        })),
      ]);
    }

    if (url.pathname === '/api/voice/token' && request.method === 'POST') {
      const { vendedor } = await request.json();
      const token = await generarAccessToken(env, toIdentity(vendedor));
      return json({ token });
    }

    if (url.pathname === '/api/llamadas') {
      if (request.method === 'POST') {
        const body = await request.json();
        const vendedor = (body.vendedor || '').trim();
        const telefono = (body.telefono || '').trim();
        const nota = (body.nota || '').trim();

        if (!vendedor || !nota) {
          return json({ error: 'Falta vendedor o nota' }, 400);
        }

        const guardado = await guardarLlamada(env, { vendedor, telefono, nota, origen: 'manual' });
        return json(guardado);
      }

      if (request.method === 'GET') {
        const vendedorFiltro = url.searchParams.get('vendedor');
        let query = 'SELECT * FROM llamadas';
        const binds = [];
        if (vendedorFiltro) {
          query += ' WHERE vendedor = ?';
          binds.push(vendedorFiltro);
        }
        query += ' ORDER BY created_at DESC LIMIT 500';

        const stmt = env.DB.prepare(query).bind(...binds);
        const { results } = await stmt.all();
        return json(results);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
