// Lee el calendario de Google por su dirección secreta iCal (solo lectura) y devuelve los eventos
// ya expandidos (incluye repetidos) en hora de Chile.
import ICAL from 'ical.js';

const TZ = 'America/Santiago';
const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

function local(date) {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export async function fetchEvents(icalUrl, fromMs, toMs) {
  const res = await fetch(icalUrl, { cf: { cacheTtl: 120 } });
  if (!res.ok) throw new Error('Google Calendar respondió ' + res.status);
  const comp = new ICAL.Component(ICAL.parse(await res.text()));
  const out = [];
  const push = (ev, start, end, occId) => {
    const allDay = start.isDate;
    const s = start.toJSDate(), e = end ? end.toJSDate() : s;
    if (e.getTime() < fromMs || s.getTime() > toMs) return;
    const item = { id: `g:${ev.uid}:${occId}`, title: ev.summary || '(sin título)', location: ev.location || '', allDay };
    if (allDay) {
      item.date = start.toString(); // YYYY-MM-DD
      const last = new Date(e.getTime() - 86400000); // DTEND de todo el día es exclusivo
      item.endDate = (last >= s ? last : s).toISOString().slice(0, 10);
    } else {
      const ls = local(s), le = local(e);
      Object.assign(item, { date: ls.date, time: ls.time, endTime: le.date === ls.date ? le.time : '' });
    }
    out.push(item);
  };
  for (const vevent of comp.getAllSubcomponents('vevent')) {
    const ev = new ICAL.Event(vevent);
    if (vevent.getFirstPropertyValue('status') === 'CANCELLED') continue;
    if (ev.isRecurring()) {
      const it = ev.iterator();
      let next, n = 0;
      while ((next = it.next()) && n++ < 400) {
        if (next.toJSDate().getTime() > toMs) break;
        const d = ev.getOccurrenceDetails(next);
        push(ev, d.startDate, d.endDate, next.toString());
      }
    } else {
      push(ev, ev.startDate, ev.endDate, 'x');
    }
  }
  out.sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
  return out;
}
