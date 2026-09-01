const AI_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

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

async function estructurarNota(env, { vendedor, telefono, nota }) {
  const prompt = `Eres un asistente que estructura notas de llamadas de venta B2B en Chile.
Un vendedor acaba de terminar una llamada y dictó esta nota de voz sobre lo que pasó:

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    const auth = request.headers.get('Authorization');
    const expected = 'Basic ' + btoa('jpb:' + env.DASHBOARD_PASSWORD);
    if (auth !== expected) {
      return new Response('Autenticación requerida', {
        status: 401,
        headers: { 'WWW-Authenticate': 'Basic realm="Llamadas B2B"' },
      });
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

        const estructurado = await estructurarNota(env, { vendedor, telefono, nota });
        const createdAt = new Date().toISOString();

        const result = await env.DB.prepare(
          `INSERT INTO llamadas (vendedor, telefono, empresa, contacto, resultado, proximo_paso, fecha_seguimiento, resumen, nota_original, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            createdAt
          )
          .run();

        return json({
          id: result.meta.last_row_id,
          vendedor,
          telefono,
          created_at: createdAt,
          ...estructurado,
        });
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
