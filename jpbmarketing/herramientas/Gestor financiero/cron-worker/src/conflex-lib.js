// Lee los formularios/clientes/chats de Conflex desde Panel JPB (solo lectura, con el código
// de acceso del propio cliente Conflex) y calcula "por cotizar" y "seguimiento".
// Copia idéntica en cron-worker/src/conflex-lib.js — si cambias uno, cambia el otro.

const PANEL = 'https://control.jpbmarketing.cl';
const DIA = 24 * 3600 * 1000;

export async function fetchPanel(code) {
  const login = await fetch(`${PANEL}/api/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: code }),
  });
  if (!login.ok) throw new Error('Login en Panel JPB falló (' + login.status + ')');
  const cookie = (login.headers.get('set-cookie') || '').split(';')[0];
  const get = async (p) => {
    const r = await fetch(PANEL + p, { headers: { cookie } });
    if (!r.ok) throw new Error(p + ' → ' + r.status);
    return r.json();
  };
  const [f, c, ch] = await Promise.all([
    get('/api/clients/conflex/formularios'), get('/api/clients/conflex/clientes'), get('/api/clients/conflex/chats'),
  ]);
  return { forms: f.items || [], clientes: c.clientes || [], chats: ch.items || [], ts: Date.now() };
}

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const digits = (s) => String(s || '').replace(/\D/g, '');

function findRow(clientes, f) {
  const em = norm(f.email), tel = digits(f.telefono), emp = norm(f.empresa), nom = norm(f.nombre);
  return clientes.find((r) =>
    (em && norm(r.email) === em) || (tel && digits(r.telefono) === tel) ||
    (emp && norm(r.nombre) === emp) || (nom && (norm(r.contacto) === nom || norm(r.nombre) === nom))) || null;
}

export function buildPending(snap, doneTs, now = Date.now()) {
  const done = new Set((doneTs || []).map(Number));
  const groups = {};
  for (const f of snap.forms) {
    if (now - f.ts > 30 * DIA || done.has(f.ts)) continue;
    const row = findRow(snap.clientes, f);
    if (row && row.cantidadCotizaciones > 0) continue; // ya tiene cotización en el panel
    const key = norm(f.email) || digits(f.telefono) || norm(f.empresa) || norm(f.nombre);
    if (!key) continue;
    const g = groups[key] || (groups[key] = {
      key, empresa: f.empresa || '', contacto: f.nombre || '', email: f.email || '', telefono: f.telefono || '', desde: f.ts, solicitudes: [],
    });
    g.desde = Math.min(g.desde, f.ts);
    if (!g.email && f.email) g.email = f.email;
    if (!g.telefono && f.telefono) g.telefono = f.telefono;
    g.solicitudes.push({ ts: f.ts, producto: f.producto || '', cantidad: f.cantidad || '', mensaje: f.mensaje || '', pagina: f.pagina || '', origen: f.origen || '' });
  }
  const todos = Object.values(groups).sort((a, b) => b.solicitudes[0].ts - a.solicitudes[0].ts);
  // Los que llevan 3 días o más sin cotizarse quedan "ocultos" (no cuentan ni van al calendario)
  const porCotizar = todos.filter((g) => now - g.solicitudes[0].ts < 3 * DIA);
  const antiguos = todos.filter((g) => now - g.solicitudes[0].ts >= 3 * DIA);

  const byTel = {};
  snap.clientes.forEach((r) => { if (r.telefono) byTel[digits(r.telefono)] = r; });
  const seguimiento = [];
  snap.clientes.filter((r) => r.importante).forEach((r) => seguimiento.push({
    key: 'imp:' + r.clave, nombre: r.nombre || r.contacto || r.telefono, contacto: r.contacto || '', telefono: r.telefono || '', email: r.email || '',
    motivo: 'Marcado como importante', nota: r.notaSeguimiento || '', total: r.totalCotizado || 0,
  }));
  snap.chats.forEach((c) => {
    if (!((c.ultimoClienteTs || 0) > 0 && c.ultimoTs > c.ultimoClienteTs + 60000)) return;
    const dias = (now - c.ultimoTs) / DIA;
    if (dias < 2 || dias > 14 || c.pausada || c.archivado) return;
    const r = byTel[digits(c.telefono)];
    seguimiento.push({
      key: 'chat:' + c.telefono, nombre: (r && (r.nombre || r.contacto)) || c.telefono, contacto: (r && r.contacto) || '', telefono: c.telefono, email: (r && r.email) || '',
      motivo: `Dejó de responder hace ${Math.round(dias)} días`, nota: c.ultimoMensaje ? String(c.ultimoMensaje).slice(0, 160) : '', total: (r && r.totalCotizado) || 0,
    });
  });
  return { porCotizar, antiguos, seguimiento, actualizadoTs: snap.ts };
}
