/* Exakte Zeitpunkte: Transite auf Radix und sensitive Punkte, tägliche Achsen-Durchgänge (AC, MC, DC, IC) und Weltlinien-Aktivierungen */
(function (root) {
  'use strict';
  const C = root.AstroCore;
  const MIN = 60000, HOUR = 3600000, DAY = C.DAY;
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const GENERATIONAL = ['Uranus', 'Neptune', 'Pluto'];
  const MOON_TARGETS = ['Sun', 'Moon', 'ASC', 'Venus', 'MC'];

  // Nullstelle einer Winkelfunktion f(t) (Grad, -180..180) zwischen Stützstellen, Bisektion auf die Sekunde
  function refine(f, lo, hi, flo) {
    for (let k = 0; k < 40 && hi - lo > 1000; k++) {
      const mid = (lo + hi) / 2, fm = f(mid);
      if ((fm < 0) === (flo < 0)) { lo = mid; flo = fm; } else hi = mid;
    }
    return Math.round((lo + hi) / 2 / MIN) * MIN;
  }

  /* Transite: planets = Liste von Planeten-Schlüsseln, targets = [{key, name, sym, lon, w, kind:'natal'|'sens'}]
     aspects = Liste der Aspekt-Schlüssel (Standard: alle fünf). Rückgabe nach Zeit sortiert. */
  function transitTimes(planets, targets, t0, t1, opts = {}) {
    const out = [];
    const aspects = C.ASPECTS.filter(a => !opts.aspects || opts.aspects.includes(a.key));
    for (const pk of planets) {
      const t = C.PL[pk];
      const step = pk === 'Moon' ? HOUR : ['Sun', 'Mercury', 'Venus', 'Mars'].includes(pk) ? 6 * HOUR : DAY;
      const n = Math.ceil((t1 - t0) / step);
      const lons = [];
      for (let i = 0; i <= n; i++) lons.push(C.lonOf(pk, new Date(t0 + i * step)));
      for (const tg of targets) {
        if (pk === 'Moon' && tg.kind === 'natal' && !MOON_TARGETS.includes(tg.key)) continue;
        if (pk === 'Moon' && tg.kind === 'sens' && !opts.moonOnSens) continue;
        if (tg.kind === 'natal' && GENERATIONAL.includes(pk) && GENERATIONAL.includes(tg.key)) continue;
        for (const as of aspects) {
          const offs = as.a === 0 || as.a === 180 ? [as.a] : [as.a, -as.a];
          for (const a of offs) {
            const fa = lon => C.norm180(lon - tg.lon - a);
            for (let i = 0; i < n; i++) {
              const f0 = fa(lons[i]), f1 = fa(lons[i + 1]);
              if ((f0 < 0) === (f1 < 0) || Math.abs(f0 - f1) > 90) continue;
              const when = refine(ms => fa(C.lonOf(pk, new Date(ms))), t0 + i * step, Math.min(t1, t0 + (i + 1) * step), f0);
              if (when < t0 || when >= t1) continue;
              const nat = C.aspectNature(pk, as.key);
              const retro = C.speed(pk, new Date(when)) < 0;
              out.push({ type: 'transit', when: new Date(when), t, n: tg, asp: as, retro, nature: nat, value: nat * t.w * (tg.w || 1) });
            }
          }
        }
      }
    }
    return out.sort((x, y) => x.when - y.when);
  }

  // AC und MC für einen Ort, schnell (ohne Zwischenhäuser)
  function ascMc(ms, lat, lon) {
    const date = new Date(ms);
    const T = (ms / DAY + 2440587.5 - 2451545) / 36525;
    const eps = (23.4392911 - 0.0130042 * T) * D2R;
    const ramc = ((C.A.SiderealTime(date) * 15 + lon) % 360 + 360) % 360 * D2R;
    const mc = Math.atan2(Math.sin(ramc), Math.cos(ramc) * Math.cos(eps)) * R2D;
    const asc = Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(eps) + Math.tan(lat * D2R) * Math.sin(eps))) * R2D;
    return { asc: C.norm(asc), mc: C.norm(mc) };
  }
  const ANGLE = { AC: (x) => x.asc, MC: (x) => x.mc, DC: (x) => C.norm(x.asc + 180), IC: (x) => C.norm(x.mc + 180) };

  /* Achsen-Durchgänge: wann steht AC/MC/DC/IC am Ort (lat, lon) exakt auf dem Grad eines Ziels.
     targets = [{key, name, lon, angles:['AC','MC']}] */
  function angleTimes(targets, lat, lon, t0, t1) {
    const step = 4 * MIN;
    const n = Math.ceil((t1 - t0) / step);
    const series = [];
    for (let i = 0; i <= n; i++) series.push(ascMc(t0 + i * step, lat, lon));
    const out = [];
    for (const tg of targets) {
      for (const ak of tg.angles || ['AC', 'MC']) {
        const g = ANGLE[ak];
        const f = x => C.norm180(g(x) - tg.lon);
        for (let i = 0; i < n; i++) {
          const f0 = f(series[i]), f1 = f(series[i + 1]);
          if ((f0 < 0) === (f1 < 0) || Math.abs(f0 - f1) > 90) continue;
          const when = refine(ms => f(ascMc(ms, lat, lon)), t0 + i * step, t0 + (i + 1) * step, f0);
          if (when >= t0 && when < t1) out.push({ type: 'angle', when: new Date(when), angle: ak, target: tg, lat, lon });
        }
      }
    }
    return out.sort((x, y) => x.when - y.when);
  }

  // Zeitformat in der Zeitzone des Nutzers
  function fmt(tz) {
    const t = new Intl.DateTimeFormat('de-CH', { timeZone: tz, hour: '2-digit', minute: '2-digit' });
    const d = new Intl.DateTimeFormat('de-CH', { timeZone: tz, weekday: 'long', day: 'numeric', month: 'long' });
    const dy = new Intl.DateTimeFormat('de-CH', { timeZone: tz, weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
    const key = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return { time: x => t.format(x), date: x => d.format(x), dateY: x => dy.format(x), dayKey: x => key.format(x) };
  }
  function userTz(P) { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || P.b.tz; } catch (e) { return P.b.tz; } }

  root.Timing = { transitTimes, angleTimes, ascMc, fmt, userTz };
})(typeof window !== 'undefined' ? window : globalThis);
