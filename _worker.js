const ALLOWED_ORIGINS = ['https://jpbmarketing.cl', 'https://www.jpbmarketing.cl'];

function isBlockedHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local')) return true;
  if (h === '0.0.0.0' || h === '::1') return true;
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    if (a === 127 || a === 10 || a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

async function handleFetchPage(request) {
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return new Response('Forbidden', { status: 403 });
  }

  const target = new URL(request.url).searchParams.get('url');
  if (!target) return new Response('Missing url param', { status: 400 });

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    return new Response('Invalid url', { status: 400 });
  }
  if (!['http:', 'https:'].includes(targetUrl.protocol) || isBlockedHost(targetUrl.hostname)) {
    return new Response('Invalid target', { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const resp = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JPBProspectorBot/1.0; +https://jpbmarketing.cl)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    const html = await resp.text();
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Access-Control-Allow-Origin': origin,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return new Response('', { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

// ──────────────────────────────────────────────────────────
// Flow.cl payment integration
// ──────────────────────────────────────────────────────────
const FLOW_PRICE_CLP = '34990';
const FLOW_API_BASE = 'https://www.flow.cl/api';

function b64url(bytes) {
  let str = '';
  for (const b of new Uint8Array(bytes)) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64urlStr(str) {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function flowSign(params, secretKey) {
  const keys = Object.keys(params).sort();
  const toSign = keys.map(k => k + params[k]).join('');
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secretKey),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(toSign));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function handleFlowCreatePayment(request, env) {
  const origin = request.headers.get('Origin') || '';
  if (!ALLOWED_ORIGINS.some(o => origin.startsWith(o))) {
    return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403 });
  }
  let body;
  try { body = await request.json(); } catch (e) { return new Response(JSON.stringify({ error: 'bad_json' }), { status: 400 }); }
  const email = (body.email || '').trim();
  if (!email || !email.includes('@')) {
    return new Response(JSON.stringify({ error: 'invalid_email' }), { status: 400 });
  }

  const params = {
    apiKey: env.FLOW_API_KEY,
    commerceOrder: 'prospector-' + Date.now(),
    subject: 'Prospector B2B - Acceso ilimitado (mensual)',
    currency: 'CLP',
    amount: FLOW_PRICE_CLP,
    email,
    paymentMethod: '9',
    urlConfirmation: 'https://jpbmarketing.cl/api/flow-webhook',
    urlReturn: 'https://jpbmarketing.cl/prospector/?pago=ok',
    optional: JSON.stringify({ email }),
  };
  const s = await flowSign(params, env.FLOW_SECRET_KEY);
  const form = new URLSearchParams({ ...params, s });

  try {
    const resp = await fetch(FLOW_API_BASE + '/payment/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    const data = await resp.json();
    if (!data.url || !data.token) {
      return new Response(JSON.stringify({ error: 'flow_error', detail: data }), { status: 502 });
    }
    return new Response(JSON.stringify({ redirectUrl: data.url + '?token=' + data.token }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': origin },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'network' }), { status: 502 });
  }
}

// ──────────────────────────────────────────────────────────
// Google service-account auth (for Firestore REST writes)
// ──────────────────────────────────────────────────────────
async function getGoogleAccessToken(env) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/datastore',
    aud: sa.token_uri,
    exp: now + 3600,
    iat: now,
  };
  const encHeader = b64urlStr(JSON.stringify(header));
  const encClaim = b64urlStr(JSON.stringify(claim));
  const toSign = encHeader + '.' + encClaim;

  const pemBody = sa.private_key
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryDer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(toSign));
  const jwt = toSign + '.' + b64url(sig);

  const resp = await fetch(sa.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt),
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error('no_access_token');
  return data.access_token;
}

async function findUserDocByEmail(email, accessToken, projectId) {
  const resp = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`,
    {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        structuredQuery: {
          from: [{ collectionId: 'users' }],
          where: { fieldFilter: { field: { fieldPath: 'email' }, op: 'EQUAL', value: { stringValue: email } } },
          limit: 1,
        },
      }),
    }
  );
  const rows = await resp.json();
  const row = Array.isArray(rows) ? rows.find(r => r.document) : null;
  return row ? row.document.name : null;
}

async function markUserPremium(docName, accessToken, expiresAt) {
  const fieldsParam = ['updateMask.fieldPaths=premium', 'updateMask.fieldPaths=premiumExpiresAt', 'updateMask.fieldPaths=pendingPayment'].join('&');
  await fetch(`https://firestore.googleapis.com/v1/${docName}?${fieldsParam}`, {
    method: 'PATCH',
    headers: { 'Authorization': 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        premium: { booleanValue: true },
        premiumExpiresAt: { stringValue: expiresAt },
        pendingPayment: { booleanValue: false },
      },
    }),
  });
}

async function handleFlowWebhook(request, env) {
  let token;
  try {
    const form = await request.formData();
    token = form.get('token');
  } catch (e) {
    return new Response('bad_request', { status: 400 });
  }
  if (!token) return new Response('missing_token', { status: 400 });

  const statusParams = { apiKey: env.FLOW_API_KEY, token };
  const s = await flowSign(statusParams, env.FLOW_SECRET_KEY);
  let data;
  try {
    const resp = await fetch(FLOW_API_BASE + '/payment/getStatus?' + new URLSearchParams({ ...statusParams, s }));
    data = await resp.json();
  } catch (e) {
    return new Response('flow_error', { status: 502 });
  }

  if (data.status !== 2) return new Response('not_paid', { status: 200 });

  let email = null;
  try { email = JSON.parse(data.optional || '{}').email; } catch (e) {}
  if (!email) return new Response('no_email', { status: 200 });

  try {
    const accessToken = await getGoogleAccessToken(env);
    const docName = await findUserDocByEmail(email, accessToken, 'jpb-marketing');
    if (!docName) return new Response('user_not_found', { status: 200 });
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await markUserPremium(docName, accessToken, expiresAt);
    return new Response('OK', { status: 200 });
  } catch (e) {
    return new Response('internal_error', { status: 500 });
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/fetch-page') {
      return handleFetchPage(request);
    }
    if (url.pathname === '/api/flow-create-payment' && request.method === 'POST') {
      return handleFlowCreatePayment(request, env);
    }
    if (url.pathname === '/api/flow-webhook' && request.method === 'POST') {
      return handleFlowWebhook(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
