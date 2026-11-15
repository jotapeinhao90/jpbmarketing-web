# Pendiente: Proxy Cloudflare Worker para Asistente IA

## Por qué se necesita
El asistente IA actualmente usa la API Key del usuario desde su propio browser (modo personal).
Para que visitantes de jpbmarketing.cl puedan usarlo sin exponer ninguna clave, se necesita un Worker de Cloudflare como intermediario.

## Flujo objetivo
Visitante → Cloudflare Worker (con API key secreta) → Anthropic → respuesta

## Pasos pendientes

1. Crear cuenta en cloudflare.com (gratis)
2. Workers & Pages → Create Worker → pegar el código de worker.js (ver abajo)
3. Settings → Variables → agregar secret: ANTHROPIC_API_KEY = sk-ant-...
4. Deploy → copiar la URL resultante (ej: https://gestipyme-ai.usuario.workers.dev)
5. En app.js, función aiSendMessage(): cambiar la URL del fetch y eliminar los headers de API key

## Cambio en app.js (cuando tengas la URL del Worker)

Buscar en aiSendMessage() y reemplazar:

```js
// ANTES
const res = await fetch('https://api.anthropic.com/v1/messages', {
  headers: {
    'x-api-key': key,
    'anthropic-dangerous-direct-browser-access': 'true',
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
  },
  ...
});

// DESPUÉS (reemplazar URL y headers)
const res = await fetch('https://TU-WORKER.workers.dev', {
  headers: { 'Content-Type': 'application/json' },
  ...
});
```

También eliminar la lógica de aiGetKey() y el modal de API Key una vez que el Worker esté activo.

## Código del Worker (guardar como worker.js en Cloudflare)

```js
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (request.method !== 'POST') {
      return new Response('Not allowed', { status: 405 });
    }
    const origin = request.headers.get('Origin') || '';
    const allowed = ['https://jpbmarketing.cl', 'http://localhost'];
    if (!allowed.some(o => origin.startsWith(o))) {
      return new Response('Forbidden', { status: 403 });
    }
    const body = await request.json();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders() },
    });
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
```

## Costo estimado con 3 usuarios/día
- ~$0.31 USD/mes
- Plan gratis de Cloudflare cubre hasta 100k requests/día (más que suficiente)
