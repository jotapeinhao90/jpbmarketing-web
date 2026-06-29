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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/fetch-page') {
      return handleFetchPage(request);
    }
    return env.ASSETS.fetch(request);
  },
};
