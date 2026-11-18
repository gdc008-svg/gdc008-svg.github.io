/* Kalender-Export: exakte Transitzeitpunkte der Woche als .ics-Datei */
(function (root) {
  'use strict';
  const C = root.AstroCore, F = root.Forecast;
  const HOUR = 3600000;
  const GENERATIONAL = ['Uranus', 'Neptune', 'Pluto'];
  const MOON_TARGETS = ['Sun', 'Moon', 'ASC', 'Venus', 'MC'];

  // Exakte Aspekt-Zeitpunkte zwischen Transitplanet und Radixpunkt im Intervall [t0, t1)
  function exactHits(P, t0, t1) {
    const hits = [];
    const targets = P.natal.points.filter(p => p.key !== 'Node');
    const steps = Math.ceil((t1 - t0) / HOUR);
    for (const t of C.PLANETS.filter(p => p.key !== 'Node')) {
      const lons = [];
      for (let i = 0; i <= steps; i++) lons.push(C.lonOf(t.key, new Date(t0 + i * HOUR)));
      for (const n of targets) {
        if (t.key === 'Moon' && !MOON_TARGETS.includes(n.key)) continue;
        if (GENERATIONAL.includes(t.key) && GENERATIONAL.includes(n.key)) continue;
        for (const as of C.ASPECTS) {
          // beide Seiten des Aspekts (bei Konjunktion und Opposition fallen sie zusammen)
          const offs = as.a === 0 || as.a === 180 ? [as.a] : [as.a, -as.a];
          for (const a of offs) {
            const f = lon => C.norm180(lon - n.lon - a);
            for (let i = 0; i < steps; i++) {
              const f0 = f(lons[i]), f1 = f(lons[i + 1]);
              if ((f0 < 0) === (f1 < 0)) continue;
              if (Math.abs(f0 - f1) > 90) continue; // Sprung bei ±180°, kein echter Durchgang
              let lo = t0 + i * HOUR, hi = lo + HOUR, flo = f0;
              for (let k = 0; k < 14; k++) {
                const mid = (lo + hi) / 2, fm = f(C.lonOf(t.key, new Date(mid)));
                if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
              }
              const when = Math.round((lo + hi) / 2 / 60000) * 60000;
              if (when < t0 || when >= t1) continue;
              const nat = C.aspectNature(t.key, as.key);
              const value = nat * t.w * (n.w || 1);
              hits.push({ when: new Date(when), ta: { t, n, asp: as, orb: 0, nature: nat, value } });
            }
          }
        }
      }
    }
    return hits.sort((x, y) => x.when - y.when);
  }

  const pad = n => String(n).padStart(2, '0');
  const icsDate = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
  const icsDay = (y, m, d) => `${y}${pad(m)}${pad(d)}`;
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
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

  function weekIcs(P, W, tz) {
    const d0 = W.days[0], d7 = W.days[6];
    const t0 = C.localToUtc(d0.y, d0.m, d0.d, 0, 0, tz).date.getTime();
    const end = new Date(Date.UTC(d7.y, d7.m - 1, d7.d) + C.DAY);
    const t1 = C.localToUtc(end.getUTCFullYear(), end.getUTCMonth() + 1, end.getUTCDate(), 0, 0, tz).date.getTime();
    const stamp = icsDate(new Date());
    const uid = `${icsDay(d0.y, d0.m, d0.d)}-${Math.round(P.b.utc.date.getTime() / 60000)}`;
    const timeFmt = new Intl.DateTimeFormat('de-CH', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Horoskop//Wochenprognose//DE', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
      `X-WR-CALNAME:${esc('Horoskop ' + F.fmtDate(d0.date) + ' bis ' + F.fmtDateY(d7.date))}`];
    const ev = (id, lines) => { L.push('BEGIN:VEVENT', `UID:${id}@horoskop`, `DTSTAMP:${stamp}`, ...lines, 'END:VEVENT'); };

    // Ganztägiger Tagesüberblick
    W.days.forEach(d => {
      const nx = new Date(Date.UTC(d.y, d.m - 1, d.d) + C.DAY);
      ev(`day-${icsDay(d.y, d.m, d.d)}-${uid}`, [
        `DTSTART;VALUE=DATE:${icsDay(d.y, d.m, d.d)}`,
        `DTEND;VALUE=DATE:${icsDay(nx.getUTCFullYear(), nx.getUTCMonth() + 1, nx.getUTCDate())}`,
        `SUMMARY:${esc(`Tageswert ${d.total}/100 · Mond in ${d.moon.sign.name}`)}`,
        `DESCRIPTION:${esc(`Liebe ${d.areas.love} · Beruf ${d.areas.career} · Energie ${d.areas.energy} · Kopf ${d.areas.mind}\nTageszahl ${d.pd} · Tagessäule ${d.dp.stem.el}-${d.dp.branch.animal}`)}`,
        'TRANSP:TRANSPARENT'
      ]);
    });

    // Exakte Transite mit Uhrzeit
    exactHits(P, t0, t1).forEach((h, i) => {
      const ta = h.ta, sign = ta.value >= 0 ? '+' : '–';
      ev(`tr-${i}-${h.when.getTime()}-${uid}`, [
        `DTSTART:${icsDate(h.when)}`,
        `DTEND:${icsDate(new Date(h.when.getTime() + 30 * 60000))}`,
        `SUMMARY:${esc(`${sign} ${ta.t.name} ${ta.asp.name} Radix-${ta.n.name}`)}`,
        `DESCRIPTION:${esc(`Exakt um ${timeFmt.format(h.when)} Uhr.\n${ta.t.name} ${F.transitSentence(ta)}.`)}`,
        'TRANSP:TRANSPARENT'
      ]);
    });
    L.push('END:VCALENDAR');
    return L.map(fold).join('\r\n') + '\r\n';
  }

  root.CalendarExport = { exactHits, weekIcs };
})(typeof window !== 'undefined' ? window : globalThis);
