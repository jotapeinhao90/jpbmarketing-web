const COOKIE_NAME = 'gp_session';
const LOGIN_PATH = '/__login';

function parseCookies(header) {
  const out = {};
  (header || '').split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return out;
}

function loginPage(error) {
  return `<!doctype html>
<html lang="es"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>GestiónPyme — Acceso</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; background:#0f172a; color:#fff; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; box-sizing:border-box; }
  form { background:#1e293b; padding:32px 28px; border-radius:16px; width:100%; max-width:340px; }
  h1 { font-size:1.1rem; margin:0 0 20px; }
  input { width:100%; padding:12px 14px; margin-bottom:12px; border-radius:8px; border:1px solid #334155; background:#0f172a; color:#fff; font-size:16px; box-sizing:border-box; }
  button { width:100%; padding:12px; border-radius:8px; border:none; background:#2563eb; color:#fff; font-weight:600; font-size:1rem; cursor:pointer; }
  .err { color:#f87171; font-size:.85rem; margin:-6px 0 14px; }
</style>
</head><body>
  <form method="POST" action="${LOGIN_PATH}">
    <h1>GestiónPyme</h1>
    ${error ? '<p class="err">Usuario o contraseña incorrectos.</p>' : ''}
    <input type="text" name="user" placeholder="Usuario" autocapitalize="off" autocorrect="off" required autofocus>
    <input type="password" name="pass" placeholder="Contraseña" required>
    <button type="submit">Entrar</button>
  </form>
</body></html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // CORS preflight from a cross-origin caller (e.g. the Mac desktop app) never carries
  // credentials — let it through unauthenticated so the browser proceeds to the real request.
  if (request.method === 'OPTIONS') {
    return next();
  }

  if (url.pathname === LOGIN_PATH && request.method === 'POST') {
    const form = await request.formData();
    const user = form.get('user');
    const pass = form.get('pass');
    if (user === env.PAGES_USER && pass === env.PAGES_PASS) {
      const headers = new Headers({ Location: '/' });
      headers.append(
        'Set-Cookie',
        `${COOKIE_NAME}=${env.SESSION_TOKEN}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`
      );
      return new Response(null, { status: 302, headers });
    }
    return new Response(loginPage(true), { status: 401, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
  }

  const cookies = parseCookies(request.headers.get('Cookie'));
  if (cookies[COOKIE_NAME] && cookies[COOKIE_NAME] === env.SESSION_TOKEN) {
    return next();
  }

  // Server-to-server calls (e.g. the Mac reminder daemon) use HTTP Basic Auth instead of a cookie.
  const auth = request.headers.get('Authorization');
  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const [user, pass] = atob(encoded).split(':');
      if (user === env.PAGES_USER && pass === env.PAGES_PASS) return next();
    }
  }

  return new Response(loginPage(false), { status: 401, headers: { 'Content-Type': 'text/html;charset=UTF-8' } });
}
