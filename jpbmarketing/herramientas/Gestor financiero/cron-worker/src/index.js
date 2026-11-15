// Avisos push al teléfono: corre cada 5 min en Cloudflare y avisa 1 hora antes de cada tarea del calendario.
// No depende de que el Mac esté encendido. Lee el mismo estado/KV que la PWA.
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { fetchPanel, buildPending } from './conflex-lib.js';

const DEFAULT_TIME = '09:00';

// Convierte una fecha/hora de pared en la zona (Chile) a milisegundos UTC.
function zonedToUtcMs(dateStr, timeStr, tz) {
  const [y, mo, d] = dateStr.split('-').map(Number);
  const [h, mi] = (timeStr || DEFAULT_TIME).split(':').map(Number);
  let guess = Date.UTC(y, mo - 1, d, h, mi);
  for (let i = 0; i < 2; i++) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    }).formatToParts(new Date(guess));
    const g = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const asUtc = Date.UTC(+g.year, +g.month - 1, +g.day, +g.hour, +g.minute);
    guess += Date.UTC(y, mo - 1, d, h, mi) - asUtc;
  }
  return guess;
}

async function loadSubs(env) {
  const list = await env.SUBSCRIPTIONS.list({ prefix: 'sub:' });
  const subs = [];
  for (const k of list.keys) {
    const v = await env.SUBSCRIPTIONS.get(k.name);
    if (v) subs.push({ key: k.name, sub: JSON.parse(v) });
  }
  return subs;
}

const errs = [];
async function pushTo(env, subs, message) {
  const vapid = { subject: env.VAPID_SUBJECT, publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY };
  let ok = 0;
  for (const { key, sub } of subs) {
    try {
      const payload = await buildPushPayload({ data: JSON.stringify(message), options: { ttl: 3600, urgency: 'high' } }, sub, vapid);
      const res = await fetch(sub.endpoint, payload);
      if (res.status === 404 || res.status === 410) await env.SUBSCRIPTIONS.delete(key);
      else if (res.ok) ok++;
      else { const tx = await res.text(); console.log('push fallo', res.status, tx); errs.push(res.status + ' ' + tx.slice(0, 120)); }
    } catch (e) {
      console.log('push error', e.message); errs.push('exc ' + e.message);
    }
  }
  return ok;
}

async function run(env, dry) {
  const raw = await env.SUBSCRIPTIONS.get('state:main');
  if (!raw) return { sent: 0, note: 'sin estado' };
  const tasks = (JSON.parse(raw).data || {}).tasks || [];
  const now = Date.now();
  const lead = Number(env.LEAD_MINUTES || 60) * 60000;
  const tz = env.TZ || 'America/Santiago';

  const due = [];
  for (const t of tasks) {
    if (!t || !t.dueDate || t.status === 'done') continue;
    const anchor = zonedToUtcMs(t.dueDate, t.dueTime, tz);
    if (now < anchor - lead || now >= anchor) continue;
    const key = `sent:${t.id}:${t.dueDate}T${t.dueTime || DEFAULT_TIME}`;
    if (await env.SUBSCRIPTIONS.get(key)) continue;
    due.push({ t, anchor, key });
  }
  if (!due.length) return { sent: 0 };
  const subs = await loadSubs(env);
  if (!subs.length) return { sent: 0, note: 'sin dispositivos suscritos' };

  let sent = 0;
  for (const { t, anchor, key } of due) {
    const mins = Math.max(1, Math.round((anchor - now) / 60000));
    const when = new Intl.DateTimeFormat('es-CL', { timeZone: tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(anchor));
    const msg = {
      title: mins >= 55 ? `En 1 hora: ${t.title}` : `En ${mins} min: ${t.title}`,
      body: `Hoy a las ${when}${t.description ? ' · ' + String(t.description).slice(0, 80) : ''}`,
      tag: `gestipyme-${t.id}`,
    };
    if (dry) { console.log('DRY', msg); continue; }
    const n = await pushTo(env, subs, msg);
    if (n > 0) { await env.SUBSCRIPTIONS.put(key, '1', { expirationTtl: 3 * 86400 }); sent++; }
  }
  return { sent, due: due.length, errs };
}

// A las 11:00 (hora de Chile): mira Panel JPB y deja en el calendario del día una tarea de las 16:00
// «Cotizar pendientes de Conflex» con el detalle (el aviso al celular sale 1 h antes, a las 15:00).
async function conflexDaily(env, force) {
  if (!env.CONFLEX_CODE) return 'sin CONFLEX_CODE';
  const tz = env.TZ || 'America/Santiago';
  const f = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit' }).formatToParts(new Date()).map((p) => [p.type, p.value]));
  const today = `${f.year}-${f.month}-${f.day}`;
  if (Number(f.hour) < 11) return 'aún no son las 11';
  const flag = `conflex:daily:${today}`;
  if (!force && await env.SUBSCRIPTIONS.get(flag)) return 'ya corrió hoy';
  const snap = await fetchPanel(env.CONFLEX_CODE);
  await env.SUBSCRIPTIONS.put('conflex:snapshot', JSON.stringify(snap), { expirationTtl: 3 * 86400 });
  const doneRaw = await env.SUBSCRIPTIONS.get('conflex:done');
  const res = buildPending(snap, doneRaw ? JSON.parse(doneRaw) : []);
  const raw = await env.SUBSCRIPTIONS.get('state:main');
  const state = raw ? JSON.parse(raw) : { updatedAt: 0, data: {} };
  const tasks = state.data.tasks || (state.data.tasks = []);
  const id = `cf-${today}`;
  const idx = tasks.findIndex((t) => t.id === id);
  const n = res.porCotizar.length, s = res.seguimiento.length;
  if (false) { // desactivado: el usuario no quiere la tarea diaria en el calendario
    const lines = [
      ...res.porCotizar.map((g) => `• Cotizar: ${g.empresa || g.contacto} — ${g.solicitudes.map((x) => `${x.producto}${x.cantidad ? ' (' + x.cantidad + ')' : ''}`).join('; ')}`),
      ...res.seguimiento.map((g) => `• Seguimiento: ${g.nombre} — ${g.motivo}`),
    ];
    const task = {
      id, title: `Conflex: ${n} por cotizar${s ? ` · ${s} seguimiento${s > 1 ? 's' : ''}` : ''}`,
      description: lines.join('\n') + (res.antiguos.length ? `\n\n(${res.antiguos.length} con más de 3 días quedan ocultos en el Dashboard)` : '') + '\n\nDetalle por cliente en el Dashboard.',
      priority: 'high', category: 'empresa', dueDate: today, dueTime: '16:00',
      status: idx >= 0 ? tasks[idx].status : 'pending', createdAt: idx >= 0 ? tasks[idx].createdAt : new Date().toISOString(),
      reminderEnabled: true, reminders: [{ amount: 1, unit: 'hours' }], source: 'conflex',
    };
    if (idx >= 0) tasks[idx] = task; else tasks.push(task);
    state.updatedAt = Date.now();
    await env.SUBSCRIPTIONS.put('state:main', JSON.stringify(state));
  }
  await env.SUBSCRIPTIONS.put(flag, '1', { expirationTtl: 2 * 86400 });
  return `ok: ${n} por cotizar, ${s} seguimiento`;
}

export default {
  // Disparo manual para pruebas: GET /?k=<RUN_TOKEN>
  async fetch(request, env) {
    const u = new URL(request.url);
    if (!env.RUN_TOKEN || u.searchParams.get('k') !== env.RUN_TOKEN) return new Response('no', { status: 404 });
    if (u.searchParams.get('conflex') === '1') {
      return new Response(await conflexDaily(env, true).catch((e) => 'error ' + e.message));
    }
    return new Response(JSON.stringify(await run(env, false)), { headers: { 'Content-Type': 'application/json' } });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(run(env, false).then((r) => console.log('recordatorios', JSON.stringify(r))));
    ctx.waitUntil(conflexDaily(env).then((r) => console.log('conflex', r)).catch((e) => console.log('conflex error', e.message)));
  },
};
