import { fetchEvents } from './_gcal-lib.js';

const CORS = { 'Access-Control-Allow-Origin': '*' };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', ...CORS } });

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}

export async function onRequestGet({ env }) {
  if (!env.GCAL_ICAL_URL) return json({ error: 'Falta GCAL_ICAL_URL' }, 500);
  try {
    const now = Date.now();
    const events = await fetchEvents(env.GCAL_ICAL_URL, now - 400 * 86400000, now + 400 * 86400000);
    return json({ events, ts: now });
  } catch (e) {
    return json({ error: e.message }, 502);
  }
}
