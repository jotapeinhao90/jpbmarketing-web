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

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
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

// Sesión persistente: en vez de Basic Auth (que en modo standalone de PWA en iOS no
// siempre se recuerda entre aperturas), usamos una cookie firmada con HMAC. No necesita
// tabla de sesiones — el valor esperado se recalcula cada vez, así que no hay estado que
// pueda "vencer" ni que haya que limpiar.
async function firmarSesion(env) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(env.SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('llamadas-b2b-session'));
  return base64url(sig);
}

function leerCookie(request, nombre) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(new RegExp('(?:^|;\\s*)' + nombre + '=([^;]+)'));
  return match ? match[1] : null;
}

async function sesionValida(request, env) {
  const valor = leerCookie(request, 'sesion');
  return !!valor && valor === (await firmarSesion(env));
}

const PAGINA_LOGIN = `<!DOCTYPE html>
<html lang="es-CL"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Llamadas B2B</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:flex; align-items:center; justify-content:center;
    background: radial-gradient(900px 500px at 80% -10%, rgba(139,123,255,0.2), transparent 60%),
                radial-gradient(700px 400px at 10% 100%, rgba(186,255,61,0.12), transparent 55%), #1b1d27;
    color:#f2f4fa; font-family:'Space Grotesk',sans-serif; }
  .box { width:min(340px, 88vw); text-align:center; }
  h1 { font-size:1.6rem; margin:0 0 6px; background:linear-gradient(100deg,#baff3d,#8b7bff);
    -webkit-background-clip:text; background-clip:text; color:transparent; }
  p { color:#9199b0; font-size:0.85rem; margin:0 0 26px; }
  input { width:100%; padding:14px 16px; border:1px solid rgba(255,255,255,0.14); background:rgba(255,255,255,0.05);
    border-radius:14px; color:#fff; font-size:1rem; margin-bottom:14px; font-family:inherit; }
  input:focus { outline:none; border-color:#baff3d; }
  button { width:100%; padding:15px; border:none; border-radius:14px; background:#baff3d; color:#0a1200;
    font-weight:700; font-size:1rem; font-family:inherit; cursor:pointer; }
  #error { color:#ff5c72; font-size:0.85rem; margin-top:12px; min-height:1em; }
</style></head>
<body>
  <form class="box" id="f">
    <h1>Llamadas B2B</h1>
    <p>Ingresa la contraseña del equipo</p>
    <input type="password" id="pw" autofocus placeholder="Contraseña">
    <button type="submit">Entrar</button>
    <div id="error"></div>
  </form>
  <script>
    document.getElementById('f').addEventListener('submit', async (e) => {
      e.preventDefault();
      const res = await fetch('/api/login', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ password: document.getElementById('pw').value }) });
      if (res.ok) location.reload();
      else document.getElementById('error').textContent = 'Contraseña incorrecta';
    });
  </script>
</body></html>`;

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

// Deriva una "temperatura" del contacto a partir de su historial — no cuesta nada
// (es lógica pura sobre datos que ya tenemos) y convierte una lista plana en una
// cola de trabajo priorizada para el vendedor.
function calcularTemperatura(vecesLlamado, ultimoResultado) {
  if (!vecesLlamado) return 'nuevo';
  if (['venta cerrada', 'interesado', 'cotización enviada'].includes(ultimoResultado)) return 'caliente';
  if (ultimoResultado === 'reagendar') return 'tibio';
  return 'frio';
}

async function guardarLlamada(env, { vendedor, telefono, nota, origen }) {
  const estructurado = await estructurarNota(env, { vendedor, telefono, nota });

  // Si el teléfono ya existe en la base de contactos, esos datos son más confiables
  // que lo que la IA adivinó de la conversación — los usamos para completar/corregir.
  if (telefono) {
    const contacto = await env.DB.prepare('SELECT empresa, contacto, cargo FROM contactos WHERE telefono = ?')
      .bind(telefono).first();
    if (contacto) {
      estructurado.empresa = contacto.empresa || estructurado.empresa;
      estructurado.contacto = contacto.contacto || estructurado.contacto;
    }
  }

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

    // Assets públicos: el manifest, íconos y el SDK de Twilio los tiene que poder pedir
    // el sistema operativo (al agregar a inicio) o el navegador sin sesión iniciada.
    if (/^\/(manifest\.json|icons\/|twilio-voice-sdk\.min\.js)/.test(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname === '/api/login' && request.method === 'POST') {
      const { password } = await request.json();
      if (password !== env.DASHBOARD_PASSWORD) return json({ error: 'incorrecta' }, 401);
      const valor = await firmarSesion(env);
      return json(
        { ok: true },
        200,
        { 'Set-Cookie': `sesion=${valor}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` }
      );
    }

    // Sesión persistente por cookie en vez de Basic Auth (ver [[firmarSesion]] arriba):
    // en la PWA instalada en el celular, Basic Auth no siempre sobrevive a cerrar y
    // reabrir la app — la cookie sí, porque el navegador la guarda igual que en Safari.
    if (!(await sesionValida(request, env))) {
      if (request.method === 'GET' && !url.pathname.startsWith('/api/')) {
        return new Response(PAGINA_LOGIN, { headers: { 'Content-Type': 'text/html' } });
      }
      return json({ error: 'Sesión requerida' }, 401);
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

    // Vendedores guardados (nombre + su número verificado). Reemplaza el tener que
    // escribir el nombre a mano cada vez y elegir el número por separado.
    if (url.pathname === '/api/usuarios') {
      if (request.method === 'GET') {
        const { results } = await env.DB.prepare('SELECT * FROM usuarios ORDER BY nombre').all();
        return json(results);
      }
      if (request.method === 'POST') {
        const { nombre, telefono } = await request.json();
        const tel = normalizarTelefono(telefono);
        if (!nombre || !tel) return json({ error: 'Falta nombre o teléfono' }, 400);

        const createdAt = new Date().toISOString();
        const result = await env.DB.prepare('INSERT INTO usuarios (nombre, telefono, created_at) VALUES (?, ?, ?)')
          .bind(nombre, tel, createdAt).run();
        return json({ id: result.meta.last_row_id, nombre, telefono: tel, created_at: createdAt });
      }
    }

    const usuarioMatch = url.pathname.match(/^\/api\/usuarios\/(\d+)$/);
    if (usuarioMatch && request.method === 'DELETE') {
      await env.DB.prepare('DELETE FROM usuarios WHERE id = ?').bind(usuarioMatch[1]).run();
      return json({ ok: true });
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

    // Importación masiva de la base de contactos (empresa, contacto, cargo por teléfono).
    // Upsert: si el teléfono ya existía, actualiza los datos en vez de duplicar.
    if (url.pathname === '/api/contactos/importar' && request.method === 'POST') {
      const { contactos } = await request.json();
      if (!Array.isArray(contactos) || !contactos.length) {
        return json({ error: 'Falta el array de contactos' }, 400);
      }

      const createdAt = new Date().toISOString();
      const statements = [];
      let omitidos = 0;

      for (const c of contactos) {
        const telefono = normalizarTelefono(c.telefono);
        if (!telefono) { omitidos++; continue; }
        statements.push(
          env.DB.prepare(
            `INSERT INTO contactos (telefono, empresa, contacto, cargo, notas, created_at)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(telefono) DO UPDATE SET
               empresa = excluded.empresa, contacto = excluded.contacto,
               cargo = excluded.cargo, notas = excluded.notas`
          ).bind(telefono, c.empresa || null, c.contacto || null, c.cargo || null, c.notas || null, createdAt)
        );
      }

      if (statements.length) await env.DB.batch(statements);
      return json({ importados: statements.length, omitidos });
    }

    // Autocompletado al marcar: si el teléfono ya está en la base, muestra quién es
    // y si algún vendedor ya habló con esa persona antes (evita llamadas a ciegas
    // o duplicadas sin que nadie se entere).
    if (url.pathname === '/api/contactos/buscar') {
      const telefono = normalizarTelefono(url.searchParams.get('telefono'));
      if (!telefono) return json({ encontrado: false });

      const contacto = await env.DB.prepare('SELECT * FROM contactos WHERE telefono = ?').bind(telefono).first();
      const historial = await env.DB.prepare(
        `SELECT COUNT(*) as veces, MAX(created_at) as ultima,
           (SELECT vendedor FROM llamadas WHERE telefono = ? ORDER BY created_at DESC LIMIT 1) as ultimo_vendedor,
           (SELECT resultado FROM llamadas WHERE telefono = ? ORDER BY created_at DESC LIMIT 1) as ultimo_resultado
         FROM llamadas WHERE telefono = ?`
      ).bind(telefono, telefono, telefono).first();

      return json({
        encontrado: !!contacto,
        empresa: contacto?.empresa || null,
        contacto: contacto?.contacto || null,
        cargo: contacto?.cargo || null,
        notas: contacto?.notas || null,
        veces_llamado: historial.veces,
        ultima_llamada: historial.ultima,
        ultimo_vendedor: historial.ultimo_vendedor,
        ultimo_resultado: historial.ultimo_resultado,
      });
    }

    // Panel de contactos: cruza la base maestra con el historial de llamadas y ordena
    // como una cola de trabajo — seguimientos pendientes y nunca contactados primero.
    if (url.pathname === '/api/contactos') {
      const { results } = await env.DB.prepare(
        `SELECT c.telefono, c.empresa, c.contacto, c.cargo, c.notas,
           COUNT(l.id) as veces_llamado,
           MAX(l.created_at) as ultima_llamada,
           (SELECT vendedor FROM llamadas WHERE telefono = c.telefono ORDER BY created_at DESC LIMIT 1) as ultimo_vendedor,
           (SELECT resultado FROM llamadas WHERE telefono = c.telefono ORDER BY created_at DESC LIMIT 1) as ultimo_resultado,
           (SELECT resumen FROM llamadas WHERE telefono = c.telefono ORDER BY created_at DESC LIMIT 1) as ultimo_resumen
         FROM contactos c
         LEFT JOIN llamadas l ON l.telefono = c.telefono
         GROUP BY c.telefono`
      ).all();

      const conTemperatura = results.map((c) => ({
        ...c,
        temperatura: calcularTemperatura(c.veces_llamado, c.ultimo_resultado),
      }));

      // Orden de prioridad: seguimientos primero, luego nunca contactados, luego el resto por fecha.
      const prioridad = { tibio: 0, nuevo: 1, caliente: 2, frio: 3 };
      conTemperatura.sort((a, b) => {
        const p = prioridad[a.temperatura] - prioridad[b.temperatura];
        if (p !== 0) return p;
        return (b.ultima_llamada || '').localeCompare(a.ultima_llamada || '');
      });

      return json(conTemperatura);
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
        const telefono = normalizarTelefono(body.telefono);
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
