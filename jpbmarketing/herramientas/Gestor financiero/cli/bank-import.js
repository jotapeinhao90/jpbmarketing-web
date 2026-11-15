'use strict';

// Lee los avisos de compra del Banco de Chile desde Gmail (IMAP) y los agrega como gastos
// en el estado compartido de GestiónPyme (Cloudflare). Uso: node cli/bank-import.js [--dry]

const path = require('path');
const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const { BANK_MAIL_CONFIG_FILE, PUSH_CONFIG_FILE, DATA_DIR, readJSON, writeJSON } = require('../lib/paths');

const STATE_FILE = path.join(DATA_DIR, 'bank-import-state.json');
const DRY = process.argv.includes('--dry');
const INITIAL_SINCE = '2026-06-09';
const SOURCE_TAG = 'email-banco-chile';

setTimeout(() => { console.error('[bank-import] timeout general, abortando'); process.exit(1); }, 8 * 60 * 1000).unref();

const RULES = [
  [/UBER|CABIFY|DIDI|COPEC|SHELL|PETROBRAS|ENEX|AUTOPISTA|TAG |ESTACIONAMIENTO|METRO|TRANSANTIAGO|BIPA/, 'personal', 'Transporte'],
  [/JUMBO|LIDER|UNIMARC|SANTA ISABEL|TOTTUS|ALMACEN|MINIMARKET|MINIMARKE|PANADERIA|RAPPI|PEDIDOSYA|PEDIDOS YA|STARBUCKS|SBX|GASTRONOM|MCDONALD|BURGER|PIZZA|SUSHI|DOMINO|RESTAURANT|CAFE|CAFÉ|HELADER|SUPERMERC|OK MARKET/, 'personal', 'Alimentación'],
  [/FARMACIA|CRUZ VERDE|SALCOBRAND|AHUMADA|CLINICA|MEDIC|DENTAL|LABORATORIO/, 'personal', 'Salud'],
  [/NETFLIX|SPOTIFY|TWITCH|YOUTUBE|CRUNCHYROLL|DISNEY|HBO|STEAM|CINE|PLAYSTATION|NINTENDO|TICKETMASTER|PUNTOTICKET/, 'personal', 'Entretenimiento'],
  [/ENTEL|MOVISTAR|WOM|CLARO|VTR|ENEL|AGUAS|CGE|METROGAS|GASCO|LIPIGAS|ABASTIBLE/, 'personal', 'Servicios Básicos'],
  [/CLOUDFLARE|WIX|GODADDY|HOSTING|ANTHROPIC|CLAUDE|OPENAI|ELEVENLABS|GOOGLE WORKSPACE|GSUITE|GITHUB|NAMECHEAP|DIGITALOCEAN/, 'empresa', 'Tecnología'],
  [/FACEBK|FACEBOOK|META ADS|GOOGLE ?\*? ?ADS|LINKEDIN|TIKTOK ADS/, 'empresa', 'Marketing'],
];

function classify(merchant) {
  const m = merchant.toUpperCase();
  for (const [re, type, category] of RULES) if (re.test(m)) return { type, category };
  return { type: 'personal', category: 'Otros Personal' };
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-zA-Z]+;/g, '');
}

function htmlToText(h) {
  return decodeEntities(
    h.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<head[\s\S]*?<\/head>/gi, '')
      .replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
  ).replace(/[​-‏]/g, '').replace(/\s+/g, ' ').trim();
}

const PURCHASE_RE = /compra por (US\$|\$)([\d.,]+) con .{3,40}? \*{4}(\d{4}) en (.+?) el (\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/;

function parsePurchase(text) {
  const m = text.match(PURCHASE_RE);
  if (!m) return null;
  const [, cur, amount, last4, merchant, dd, mm, yyyy, hh, mi] = m;
  const isUsd = cur === 'US$';
  return {
    currency: isUsd ? 'USD' : 'CLP',
    amount: isUsd ? parseFloat(amount.replace(/\./g, '').replace(',', '.')) : parseInt(amount.replace(/\./g, ''), 10),
    last4,
    merchant: merchant.replace(/\s+/g, ' ').trim(),
    date: `${yyyy}-${mm}-${dd}`,
    time: `${hh}:${mi}`,
  };
}

const rateCache = {};
let latestRate = null;

async function usdRate(dateStr) {
  if (rateCache[dateStr]) return rateCache[dateStr];
  const [y, m, d] = dateStr.split('-');
  try {
    const r = await fetch(`https://mindicador.cl/api/dolar/${d}-${m}-${y}`, { signal: AbortSignal.timeout(4000) });
    if (r.ok) {
      const j = await r.json();
      const v = j.serie && j.serie[0] && j.serie[0].valor;
      if (v) return (rateCache[dateStr] = { rate: v, exact: true });
    }
  } catch {}
  if (!latestRate) {
    try {
      const r = await fetch('https://open.er-api.com/v6/latest/USD', { signal: AbortSignal.timeout(6000) });
      latestRate = (await r.json()).rates.CLP;
    } catch {}
  }
  return (rateCache[dateStr] = { rate: latestRate || 950, exact: false });
}

function uid() {
  return 'b' + Array.from({ length: 15 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
}

function authHeader(pc) {
  return 'Basic ' + Buffer.from(`${pc.pagesUser}:${pc.pagesPass}`).toString('base64');
}

async function main() {
  const cfg = readJSON(BANK_MAIL_CONFIG_FILE, null);
  if (!cfg) throw new Error('Falta bank-mail-config.json');
  const pushCfg = readJSON(PUSH_CONFIG_FILE, null);
  if (!pushCfg || !pushCfg.pagesUrl) throw new Error('Falta push-config.json (pagesUrl/credenciales)');

  const state = readJSON(STATE_FILE, { processed: [], lastRun: null });
  const processed = new Set(state.processed);
  const since = state.lastRun
    ? new Date(new Date(state.lastRun).getTime() - 3 * 864e5)
    : new Date(`${INITIAL_SINCE}T00:00:00`);

  const client = new ImapFlow({
    host: 'imap.gmail.com', port: 993, secure: true,
    auth: { user: cfg.user, pass: cfg.appPassword }, logger: false,
  });
  await client.connect();
  const found = [];
  const lock = await client.getMailboxLock('[Gmail]/Todos');
  try {
    const uids = await client.search({ from: 'enviodigital@bancochile.cl', since }, { uid: true });
    if (uids.length) {
      for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
        const subject = msg.envelope.subject || '';
        if (!/Compra con Tarjeta|Cargo en Cuenta/i.test(subject)) continue;
        const mail = await simpleParser(msg.source);
        const id = mail.messageId || `uid-${msg.uid}`;
        if (processed.has(id)) continue;
        const parsed = parsePurchase(htmlToText(mail.html || mail.text || ''));
        if (!parsed) { console.error(`[bank-import] no pude leer: "${subject}" (${id})`); continue; }
        found.push({ id, ...parsed });
      }
    }
  } finally {
    lock.release();
    await client.logout();
  }

  console.log(`[bank-import] correos de compra nuevos: ${found.length}`);

  const res = await fetch(`${pushCfg.pagesUrl}/api/state`, { headers: { Authorization: authHeader(pushCfg) } });
  if (!res.ok) throw new Error(`No pude leer el estado remoto (${res.status})`);
  const remote = await res.json();
  const data = remote.data || {};
  const expenses = Array.isArray(data.expenses) ? data.expenses : [];
  const knownRefs = new Set(expenses.map(e => e.bankRef).filter(Boolean));

  const fresh = found.filter(f => !knownRefs.has(f.id));
  fresh.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));

  const toAdd = [];
  for (const f of fresh) {
    const { type, category } = classify(f.merchant);
    let amount = f.amount;
    let extra = '';
    if (f.currency === 'USD') {
      const { rate, exact } = await usdRate(f.date);
      amount = Math.round(f.amount * rate);
      extra = ` · US$${String(f.amount).replace('.', ',')} a $${Math.round(rate)}/US$ (${exact ? 'dólar observado' : 'tipo de cambio referencial'})`;
    }
    toAdd.push({
      id: uid(),
      description: f.merchant,
      amount,
      type,
      category,
      date: f.date,
      notes: `Importado del correo del Banco de Chile · ****${f.last4} · ${f.time}${extra}`,
      source: SOURCE_TAG,
      bankRef: f.id,
      createdAt: new Date().toISOString(),
    });
  }

  if (DRY) {
    const byCat = {};
    toAdd.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
    console.log('[bank-import] DRY RUN — no se guarda nada');
    toAdd.slice(-12).forEach(e => console.log(`  ${e.date}  $${String(e.amount).padStart(8)}  ${e.type.padEnd(8)} ${e.category.padEnd(18)} ${e.description}`));
    console.log('  totales por categoría:', byCat);
    console.log('  total:', toAdd.reduce((s, e) => s + e.amount, 0), 'en', toAdd.length, 'gastos');
    return;
  }

  if (toAdd.length) {
    data.expenses = expenses.concat(toAdd);
    const post = await fetch(`${pushCfg.pagesUrl}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader(pushCfg) },
      body: JSON.stringify({ data }),
    });
    if (!post.ok) throw new Error(`No pude guardar el estado remoto (${post.status})`);
    console.log(`[bank-import] agregados ${toAdd.length} gastos a GestiónPyme`);
  } else {
    console.log('[bank-import] nada nuevo que agregar');
  }

  found.forEach(f => processed.add(f.id));
  writeJSON(STATE_FILE, { processed: [...processed], lastRun: new Date().toISOString() }, 0o600);
}

main().catch((err) => { console.error('[bank-import] ERROR:', err.message); process.exit(1); });
