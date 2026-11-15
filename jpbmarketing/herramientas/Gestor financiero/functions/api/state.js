const STATE_KEY = 'state:main';
const CORS_HEADERS = { 'Access-Control-Allow-Origin': '*' };

export async function onRequestGet(context) {
  const { env } = context;
  const raw = await env.SUBSCRIPTIONS.get(STATE_KEY);
  const body = raw ? raw : JSON.stringify({ updatedAt: 0, data: {} });
  return new Response(body, {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
  }
  if (!payload || typeof payload.data !== 'object') {
    return new Response('Bad request', { status: 400, headers: CORS_HEADERS });
  }

  const updatedAt = Date.now();
  await env.SUBSCRIPTIONS.put(STATE_KEY, JSON.stringify({ updatedAt, data: payload.data }));

  return new Response(JSON.stringify({ updatedAt }), {
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      ...CORS_HEADERS,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
