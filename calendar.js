/* Kalender-Export: exakte Zeitpunkte als .ics-Datei (Google, Apple, Outlook) und als Google-Kalender-Link */
(function (root) {
  'use strict';
  const C = root.AstroCore, F = root.Forecast;

  const pad = n => String(n).padStart(2, '0');
  const icsDate = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const icsDay = (y, m, d) => `${y}${pad(m)}${pad(d)}`;
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  // Zeilen über 75 Oktette falten (RFC 5545)
  function fold(line) {
    const out = []; let cur = '', len = 0;
    for (const ch of line) {
      const b = new TextEncoder().encode(ch).length;
      if (len + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; len = 0; }
      cur += ch; len += b;
    }
    out.push(cur);
    return out.join('\r\n ');
  }

  /* events: [{ id, start: Date, end: Date, summary, description, alarmMin?, allDay?: [y, m, d] }] */
  function eventsIcs(events, calName) {
    const stamp = icsDate(new Date());
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Horoskop//Exakte Zeitpunkte//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(calName)}`];
    events.forEach(e => {
      L.push('BEGIN:VEVENT', `UID:${e.id}@horoskop`, `DTSTAMP:${stamp}`);
      if (e.allDay) {
        const [y, m, d] = e.allDay, nx = new Date(Date.UTC(y, m - 1, d) + C.DAY);
        L.push(`DTSTART;VALUE=DATE:${icsDay(y, m, d)}`, `DTEND;VALUE=DATE:${icsDay(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate())}`);
      } else {
        L.push(`DTSTART:${icsDate(e.start)}`, `DTEND:${icsDate(e.end)}`);
      }
      L.push(`SUMMARY:${esc(e.summary)}`, `DESCRIPTION:${esc(e.description || '')}`, 'TRANSP:TRANSPARENT');
      if (e.alarmMin != null && !e.allDay) L.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.summary)}`, `TRIGGER:-PT${e.alarmMin}M`, 'END:VALARM');
      L.push('END:VEVENT');
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  function googleUrl(e) {
    const q = new URLSearchParams({ action: 'TEMPLATE', text: e.summary, details: e.description || '', dates: `${icsDate(e.start)}/${icsDate(e.end)}` });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }

  function download(filename, text) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // Ganztägige Tageswerte der Woche
  function dayEvents(P, W) {
    const uid = Math.round(P.b.utc.date.getTime() / 60000);
    return W.days.map(d => ({
      id: `day-${icsDay(d.y, d.m, d.d)}-${uid}`, allDay: [d.y, d.m, d.d],
      summary: `Tageswert ${d.total}/100 · Mond in ${d.moon.sign.name}`,
      description: `Liebe ${d.areas.love} · Beruf ${d.areas.career} · Energie ${d.areas.energy} · Kopf ${d.areas.mind}\nTageszahl ${d.pd} · Tagessäule ${d.dp.stem.el}-${d.dp.branch.animal}`
    }));
  }

  root.CalendarExport = { eventsIcs, googleUrl, download, dayEvents, icsDate };
})(typeof window !== 'undefined' ? window : globalThis);
