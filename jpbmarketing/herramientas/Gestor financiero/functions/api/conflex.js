import { fetchPanel, buildPending } from './_conflex-lib.js';

const SNAP_KEY = 'conflex:snapshot';
const DONE_KEY = 'conflex:done';
const CORS = { 'Access-Control-Allow-Origin': '*' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

async function loadDone(env) {
  const raw = await env.SUBSCRIPTIONS.get(DONE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function onRequestGet({ request, env }) {
  if (!env.CONFLEX_CODE) return json({ error: 'Falta CONFLEX_CODE' }, 500);
  const refresh = new URL(request.url).searchParams.get('refresh') === '1';
  let snap = null;
  const raw = await env.SUBSCRIPTIONS.get(SNAP_KEY);
  if (raw) snap = JSON.parse(raw);
  if (refresh || !snap || Date.now() - snap.ts > 2 * 60 * 1000) {
    try {
      snap = await fetchPanel(env.CONFLEX_CODE);
      await env.SUBSCRIPTIONS.put(SNAP_KEY, JSON.stringify(snap), { expirationTtl: 3 * 86400 });
    } catch (e) {
      if (!snap) return json({ error: e.message }, 502);
    }
  }
  return json(buildPending(snap, await loadDone(env)));
}

// POST { ts: [..], deshacer?: true } → marca solicitudes como ya cotizadas (o las devuelve a pendientes)
export async function onRequestPost({ request, env }) {
  const body = await request.json().catch(() => ({}));
  const list = (Array.isArray(body.ts) ? body.ts : []).map(Number).filter(Boolean);
  let done = await loadDone(env);
  done = body.deshacer ? done.filter((t) => !list.includes(t)) : [...new Set([...done, ...list])];
  await env.SUBSCRIPTIONS.put(DONE_KEY, JSON.stringify(done.slice(-500)));
  return json({ ok: true, done: done.length });
}
