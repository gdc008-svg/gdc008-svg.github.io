/* Rechenkern: westliche Astrologie, chinesische Astrologie, Numerologie, Astrokartographie.
   Ephemeriden: astronomy-engine (VSOP87/ELP, Genauigkeit unter 1 Bogenminute).
   Häuser: Placidus (wie astro-seek Standard), tropischer Tierkreis, wahrer Mondknoten. */
(function (root) {
  'use strict';
  const A = root.Astronomy || (typeof require !== 'undefined' ? require('astronomy-engine') : null);
  const tzlookup = root.tzlookup || (typeof require !== 'undefined' ? require('tz-lookup') : null);
  const D2R = Math.PI / 180, R2D = 180 / Math.PI;
  const norm = x => ((x % 360) + 360) % 360;
  const norm180 = x => { x = norm(x); return x > 180 ? x - 360 : x; };
  const sin = x => Math.sin(x * D2R), cos = x => Math.cos(x * D2R), tan = x => Math.tan(x * D2R);
  const atan2 = (y, x) => Math.atan2(y, x) * R2D;
  const DAY = 86400000;

  const SIGNS = [
    ['Widder', '♈', 'Feuer', 'kardinal'], ['Stier', '♉', 'Erde', 'fix'], ['Zwillinge', '♊', 'Luft', 'veränderlich'],
    ['Krebs', '♋', 'Wasser', 'kardinal'], ['Löwe', '♌', 'Feuer', 'fix'], ['Jungfrau', '♍', 'Erde', 'veränderlich'],
    ['Waage', '♎', 'Luft', 'kardinal'], ['Skorpion', '♏', 'Wasser', 'fix'], ['Schütze', '♐', 'Feuer', 'veränderlich'],
    ['Steinbock', '♑', 'Erde', 'kardinal'], ['Wassermann', '♒', 'Luft', 'fix'], ['Fische', '♓', 'Wasser', 'veränderlich']
  ].map(([name, sym, el, mode], i) => ({ i, name, sym, el, mode }));

  const PLANETS = [
    { key: 'Sun', name: 'Sonne', sym: '☉', w: 2 },
    { key: 'Moon', name: 'Mond', sym: '☽', w: 1 },
    { key: 'Mercury', name: 'Merkur', sym: '☿', w: 1.5 },
    { key: 'Venus', name: 'Venus', sym: '♀', w: 2 },
    { key: 'Mars', name: 'Mars', sym: '♂', w: 2 },
    { key: 'Jupiter', name: 'Jupiter', sym: '♃', w: 3 },
    { key: 'Saturn', name: 'Saturn', sym: '♄', w: 3 },
    { key: 'Uranus', name: 'Uranus', sym: '♅', w: 2.5 },
    { key: 'Neptune', name: 'Neptun', sym: '♆', w: 2 },
    { key: 'Pluto', name: 'Pluto', sym: '♇', w: 2.5 },
    { key: 'Node', name: 'Mondknoten', sym: '☊', w: 1 }
  ];
  const PL = Object.fromEntries(PLANETS.map(p => [p.key, p]));

  const ASPECTS = [
    { a: 0, key: 'conj', name: 'Konjunktion', sym: '☌', orb: 8 },
    { a: 60, key: 'sext', name: 'Sextil', sym: '⚹', orb: 5 },
    { a: 90, key: 'square', name: 'Quadrat', sym: '□', orb: 7 },
    { a: 120, key: 'trine', name: 'Trigon', sym: '△', orb: 7 },
    { a: 180, key: 'opp', name: 'Opposition', sym: '☍', orb: 8 }
  ];

  /* ---------- Zeit ---------- */
  function tzOffsetMin(tz, date) {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const p = {};
    dtf.formatToParts(date).forEach(x => { p[x.type] = x.value; });
    const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
    return Math.round((asUTC - date.getTime()) / 60000);
  }
  function localToUtc(y, m, d, h, mi, tz) {
    const guess = Date.UTC(y, m - 1, d, h, mi);
    let off = tzOffsetMin(tz, new Date(guess));
    let utc = guess - off * 60000;
    const off2 = tzOffsetMin(tz, new Date(utc));
    if (off2 !== off) { off = off2; utc = guess - off * 60000; }
    return { date: new Date(utc), offsetMin: off };
  }
  function timezoneFor(lat, lon) { try { return tzlookup(lat, lon); } catch (e) { return 'UTC'; } }
  const jd = date => date.getTime() / DAY + 2440587.5;
  const jc = date => (jd(date) - 2451545) / 36525;

  /* ---------- Planeten ---------- */
  function trueNode(date) {
    const T = jc(date);
    const D = 297.8501921 + 445267.1114034 * T, M = 357.5291092 + 35999.0502909 * T;
    const Mp = 134.9633964 + 477198.8675055 * T, F = 93.2720950 + 483202.0175233 * T;
    const om = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T;
    return norm(om - 1.4979 * sin(2 * (D - F)) - 0.15 * sin(M) - 0.1226 * sin(2 * D) + 0.1176 * sin(2 * F) - 0.0801 * sin(2 * (Mp - F)));
  }
  function eclPos(key, date) {
    if (key === 'Sun') { const s = A.SunPosition(date); return { lon: s.elon, lat: s.elat }; }
    if (key === 'Moon') { const m = A.EclipticGeoMoon(date); return { lon: m.lon, lat: m.lat }; }
    if (key === 'Node') return { lon: trueNode(date), lat: 0 };
    const e = A.Ecliptic(A.GeoVector(key, date, true));
    return { lon: e.elon, lat: e.elat };
  }
  function lonOf(key, date) { return eclPos(key, date).lon; }
  function speed(key, date) {
    const a = lonOf(key, new Date(date.getTime() - DAY / 2)), b = lonOf(key, new Date(date.getTime() + DAY / 2));
    return norm180(b - a);
  }
  const obliquity = date => { const T = jc(date); return 23.4392911 - 0.0130042 * T - 1.64e-7 * T * T + 5.04e-7 * T * T * T; };
  function signOf(lon) { const l = norm(lon); const s = SIGNS[Math.floor(l / 30)]; const deg = l - s.i * 30; return { sign: s, deg, d: Math.floor(deg), m: Math.floor((deg % 1) * 60) }; }
  function fmtDeg(lon) { const s = signOf(lon); return `${s.d}°${String(s.m).padStart(2, '0')}′`; }

  /* ---------- Häuser (Placidus, Porphyrius als Ausweich in Polnähe) ---------- */
  function houses(date, lat, lon) {
    const eps = obliquity(date);
    const ramc = norm(A.SiderealTime(date) * 15 + lon);
    const mc = norm(atan2(sin(ramc), cos(ramc) * cos(eps)));
    const asc = norm(atan2(cos(ramc), -(sin(ramc) * cos(eps) + tan(lat) * sin(eps))));
    const cusps = new Array(12);
    cusps[0] = asc; cusps[9] = mc; cusps[6] = norm(asc + 180); cusps[3] = norm(mc + 180);
    let system = 'Placidus';
    const plac = (offsetFn) => {
      let l = mc;
      for (let k = 0; k < 30; k++) {
        const dec = Math.asin(sin(eps) * sin(l)) * R2D;
        const x = tan(lat) * tan(dec);
        if (Math.abs(x) >= 1) return null;
        const ad = Math.asin(x) * R2D;
        const ra = norm(ramc + offsetFn(ad));
        const nl = norm(atan2(sin(ra), cos(ra) * cos(eps)));
        if (Math.abs(norm180(nl - l)) < 1e-7) { l = nl; break; }
        l = nl;
      }
      return l;
    };
    const c11 = Math.abs(lat) < 66 ? plac(ad => (90 + ad) / 3) : null;
    const c12 = c11 != null ? plac(ad => 2 * (90 + ad) / 3) : null;
    const c2 = c12 != null ? plac(ad => 180 - 2 * (90 - ad) / 3) : null;
    const c3 = c2 != null ? plac(ad => 180 - (90 - ad) / 3) : null;
    if (c3 != null) {
      cusps[10] = c11; cusps[11] = c12; cusps[1] = c2; cusps[2] = c3;
    } else {
      system = 'Porphyrius';
      const q1 = norm(mc - asc + 360) / 3 * -1; // vom AC rückwärts
      const arcAscIc = norm(cusps[3] - asc);
      cusps[1] = norm(asc + arcAscIc / 3); cusps[2] = norm(asc + 2 * arcAscIc / 3);
      const arcMcAsc = norm(asc - mc);
      cusps[10] = norm(mc + arcMcAsc / 3); cusps[11] = norm(mc + 2 * arcMcAsc / 3);
      void q1;
    }
    cusps[4] = norm(cusps[10] + 180); cusps[5] = norm(cusps[11] + 180);
    cusps[7] = norm(cusps[1] + 180); cusps[8] = norm(cusps[2] + 180);
    return { asc, mc, cusps, ramc, eps, system };
  }
  function houseOf(lon, cusps) {
    for (let i = 0; i < 12; i++) {
      const a = cusps[i], b = cusps[(i + 1) % 12];
      if (norm(lon - a) < norm(b - a)) return i + 1;
    }
    return 1;
  }

  /* ---------- Radix ---------- */
  function natalChart(b) {
    const { date } = b.utc;
    const h = houses(date, b.lat, b.lon);
    const planets = PLANETS.map(p => {
      const pos = eclPos(p.key, date);
      const sp = p.key === 'Node' ? -0.05 : speed(p.key, date);
      return { ...p, lon: pos.lon, lat: pos.lat, speed: sp, retro: sp < 0 && p.key !== 'Node', house: houseOf(pos.lon, h.cusps), pos: signOf(pos.lon) };
    });
    const points = planets.concat([
      { key: 'ASC', name: 'Aszendent', sym: 'AC', lon: h.asc, pos: signOf(h.asc), house: 1, w: 2 },
      { key: 'MC', name: 'Himmelsmitte', sym: 'MC', lon: h.mc, pos: signOf(h.mc), house: 10, w: 2 }
    ]);
    const aspects = [];
    for (let i = 0; i < points.length; i++) for (let j = i + 1; j < points.length; j++) {
      const p = points[i], q = points[j];
      if ((p.key === 'ASC' && q.key === 'MC') || p.key === 'Node' && q.key === 'Node') continue;
      const sep = Math.abs(norm180(p.lon - q.lon));
      for (const as of ASPECTS) {
        const lum = ['Sun', 'Moon'].includes(p.key) || ['Sun', 'Moon'].includes(q.key);
        const orb = as.orb + (lum ? 2 : 0) - (p.key === 'Node' || q.key === 'Node' || p.key === 'ASC' || q.key === 'MC' || p.key === 'MC' || q.key === 'ASC' ? 3 : 0);
        const o = Math.abs(sep - as.a);
        if (o <= orb) aspects.push({ p, q, asp: as, orb: o });
      }
    }
    aspects.sort((x, y) => x.orb - y.orb);
    // Element- und Qualitätsbilanz (klassische Gewichtung)
    const balance = { Feuer: 0, Erde: 0, Luft: 0, Wasser: 0 };
    const wts = { Sun: 3, Moon: 3, ASC: 3, Mercury: 1, Venus: 1, Mars: 1, Jupiter: 1, Saturn: 1, Uranus: 0.5, Neptune: 0.5, Pluto: 0.5 };
    points.forEach(p => { if (wts[p.key]) balance[p.pos.sign.el] += wts[p.key]; });
    return { houses: h, planets, points, aspects, balance, byKey: Object.fromEntries(points.map(p => [p.key, p])) };
  }

  /* ---------- Sensitive Punkte (Formelmethode, Glückspunkt nach Andrea Buchholz) ---------- */
  function meanLilith(date) {
    const T = jc(date);
    return norm(83.3532465 + 4069.0137287 * T - 0.01032 * T * T - T * T * T / 80053 + T * T * T * T / 18999000 + 180);
  }
  function sensitivePoints(natal, date, lat) {
    const h = natal.houses, P = natal.byKey;
    const asc = h.asc, mc = h.mc, dc = norm(asc + 180);
    const sun = P.Sun.lon, moon = P.Moon.lon;
    const day = P.Sun.house >= 7; // Sonne über dem Horizont
    const eps = h.eps;
    const ascAt = (ramc, phi) => norm(atan2(cos(ramc), -(sin(ramc) * cos(eps) + tan(phi) * sin(eps))));
    const vertex = ascAt(norm(h.ramc + 180), lat >= 0 ? 90 - lat : -90 - lat);
    const east = ascAt(h.ramc, 0);
    const list = [
      { key: 'Fortuna', name: 'Glückspunkt', sym: '⊗', lon: day ? norm(asc + moon - sun) : norm(asc + sun - moon), formula: day ? 'AC + Mond − Sonne (Taggeburt)' : 'AC + Sonne − Mond (Nachtgeburt)' },
      { key: 'Spirit', name: 'Geistpunkt', sym: '◎', lon: day ? norm(asc + sun - moon) : norm(asc + moon - sun), formula: day ? 'AC + Sonne − Mond' : 'AC + Mond − Sonne' },
      { key: 'Love', name: 'Liebespunkt', sym: '♡', lon: norm(asc + P.Venus.lon - sun), formula: 'AC + Venus − Sonne' },
      { key: 'Marriage', name: 'Heiratspunkt', sym: '⚭', lon: norm(asc + dc - P.Venus.lon), formula: 'AC + DC − Venus' },
      { key: 'Success', name: 'Erfolgspunkt', sym: '★', lon: norm(asc + P.Jupiter.lon - sun), formula: 'AC + Jupiter − Sonne' },
      { key: 'Career', name: 'Karrierepunkt', sym: '▲', lon: norm(mc + moon - sun), formula: 'MC + Mond − Sonne' },
      { key: 'SNode', name: 'Südknoten', sym: '☋', lon: norm(P.Node.lon + 180), formula: 'Mondknoten + 180°' },
      { key: 'Lilith', name: 'Lilith (mittlere)', sym: '⚸', lon: meanLilith(date), formula: 'mittleres Mond-Apogäum' },
      { key: 'Vertex', name: 'Vertex', sym: 'Vx', lon: vertex, formula: 'westlicher Schnittpunkt Ekliptik / Erster Vertikal' },
      { key: 'East', name: 'Ostpunkt', sym: 'Ost', lon: east, formula: 'Aszendent am Äquator' }
    ];
    list.forEach(p => { p.pos = signOf(p.lon); p.house = houseOf(p.lon, h.cusps); p.near = natal.planets.filter(q => q.key !== 'Node' && Math.abs(norm180(q.lon - p.lon)) <= 3).map(q => q.name); });
    return { day, list, byKey: Object.fromEntries(list.map(p => [p.key, p])) };
  }

  /* ---------- Transite ---------- */
  const TRANSIT_ORB = { Sun: 2, Moon: 4, Mercury: 2, Venus: 2, Mars: 2, Jupiter: 2, Saturn: 2, Uranus: 1.5, Neptune: 1.5, Pluto: 1.5 };
  const BENEFIC = { Venus: 1, Jupiter: 1, Sun: 0.6 }, MALEFIC = { Saturn: 1, Mars: 0.8, Pluto: 0.8, Uranus: 0.6, Neptune: 0.5 };
  function aspectNature(tKey, aspKey) {
    if (aspKey === 'trine') return MALEFIC[tKey] ? 0.6 : 1;
    if (aspKey === 'sext') return MALEFIC[tKey] ? 0.45 : 0.75;
    if (aspKey === 'square') return BENEFIC[tKey] ? -0.35 : -0.9;
    if (aspKey === 'opp') return BENEFIC[tKey] ? -0.3 : -0.75;
    if (BENEFIC[tKey]) return 0.9;
    if (MALEFIC[tKey]) return -0.6 * MALEFIC[tKey];
    return 0.2;
  }
  const GENERATIONAL = ['Uranus', 'Neptune', 'Pluto'];
  function transitPositions(date) {
    return PLANETS.filter(p => p.key !== 'Node').map(p => ({ ...p, lon: lonOf(p.key, date) }));
  }
  function transitAspects(natal, date, opts = {}) {
    const tps = opts.positions || transitPositions(date);
    const res = [];
    const natalTargets = natal.points.filter(p => p.key !== 'Node');
    for (const t of tps) {
      if (opts.only && !opts.only.includes(t.key)) continue;
      for (const n of natalTargets) {
        if (t.key === 'Moon' && !['Sun', 'Moon', 'ASC', 'Venus', 'MC'].includes(n.key)) continue;
        if (GENERATIONAL.includes(t.key) && GENERATIONAL.includes(n.key)) continue; // gilt für eine ganze Generation
        const sep = Math.abs(norm180(t.lon - n.lon));
        for (const as of ASPECTS) {
          const max = opts.orb || TRANSIT_ORB[t.key];
          const o = Math.abs(sep - as.a);
          if (o <= max) {
            const nat = aspectNature(t.key, as.key);
            const strength = t.w * (n.w || 1) * (1 - 0.5 * o / max);
            res.push({ t, n, asp: as, orb: o, nature: nat, strength, value: nat * strength });
          }
        }
      }
    }
    return res.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  }

  /* ---------- Mond ---------- */
  function moonInfo(date) {
    const lon = lonOf('Moon', date);
    const ph = A.MoonPhase(date);
    const names = ['Neumond', 'zunehmende Sichel', 'erstes Viertel', 'zunehmender Mond', 'Vollmond', 'abnehmender Mond', 'letztes Viertel', 'abnehmende Sichel'];
    return { lon, sign: signOf(lon).sign, phase: ph, phaseName: names[Math.floor(norm(ph + 22.5) / 45) % 8], illum: (1 - cos(ph)) / 2 };
  }

  /* ---------- Astrokartographie ---------- */
  function eclToEq(lon, lat, eps) {
    const dec = Math.asin(sin(lat) * cos(eps) + cos(lat) * sin(eps) * sin(lon)) * R2D;
    const ra = norm(atan2(sin(lon) * cos(eps) - tan(lat) * sin(eps), cos(lon)));
    return { ra, dec };
  }
  function acgLines(date, keys) {
    const eps = obliquity(date), gst = A.SiderealTime(date) * 15;
    return (keys || PLANETS.map(p => p.key)).map(key => {
      const pos = eclPos(key, date);
      const { ra, dec } = eclToEq(pos.lon, pos.lat, eps);
      const mc = norm180(ra - gst);
      const asc = [], dsc = [];
      for (let la = -82; la <= 82; la += 1) {
        const x = -tan(la) * tan(dec);
        if (Math.abs(x) > 1) { asc.push(null); dsc.push(null); continue; }
        const H0 = Math.acos(x) * R2D;
        asc.push([norm180(ra - H0 - gst), la]);
        dsc.push([norm180(ra + H0 - gst), la]);
      }
      return { key, ra, dec, mc, ic: norm180(mc + 180), asc, dsc };
    });
  }
  // Kürzester Abstand eines Ortes zur Linie in km (Grosskreis, senkrecht zur Linie)
  function gcKm(la1, lo1, la2, lo2) {
    const a = Math.sin((la2 - la1) * D2R / 2) ** 2 + Math.cos(la1 * D2R) * Math.cos(la2 * D2R) * Math.sin(norm180(lo2 - lo1) * D2R / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(a)));
  }
  function curveKm(pts, lat, lon) {
    let best = Infinity;
    for (let i = 0; i + 1 < pts.length; i++) {
      const p = pts[i], q = pts[i + 1];
      if (!p || !q || Math.abs(p[1] - lat) > 25) continue;
      const dl = norm180(q[0] - p[0]);
      if (Math.abs(dl) > 30) continue;
      for (let k = 0; k <= 20; k++) {
        const f = k / 20;
        best = Math.min(best, gcKm(lat, lon, p[1] + f * (q[1] - p[1]), p[0] + f * dl));
      }
    }
    return best;
  }
  function lineDistances(lines, lat, lon) {
    const out = [];
    const merKm = m => { const d = Math.abs(norm180(lon - m)); return d >= 90 ? Infinity : 6371 * Math.asin(Math.cos(lat * D2R) * Math.sin(d * D2R)); };
    for (const L of lines) {
      out.push({ key: L.key, kind: 'MC', km: merKm(L.mc) });
      out.push({ key: L.key, kind: 'IC', km: merKm(L.ic) });
      const a = curveKm(L.asc, lat, lon), d = curveKm(L.dsc, lat, lon);
      if (a < Infinity) out.push({ key: L.key, kind: 'AC', km: a });
      if (d < Infinity) out.push({ key: L.key, kind: 'DC', km: d });
    }
    return out.sort((a, b) => a.km - b.km);
  }

  // Schnittpunkte zweier Linien verschiedener Planeten (Breite, Länge). MC/IC sind Meridiane, AC/DC Kurven.
  function acgCrossings(lines) {
    const out = [];
    const curveLon = (L, kind, i) => { const p = (kind === 'AC' ? L.asc : L.dsc)[i]; return p ? p[0] : null; };
    const lineLon = (L, kind, i) => kind === 'MC' ? L.mc : kind === 'IC' ? L.ic : curveLon(L, kind, i);
    for (let a = 0; a < lines.length; a++) for (let b = a + 1; b < lines.length; b++) {
      for (const ka of ['MC', 'IC', 'AC', 'DC']) for (const kb of ['MC', 'IC', 'AC', 'DC']) {
        if ((ka === 'MC' || ka === 'IC') && (kb === 'MC' || kb === 'IC')) continue; // Meridiane schneiden sich nicht
        for (let i = 0; i < 164; i++) {
          const a0 = lineLon(lines[a], ka, i), a1 = lineLon(lines[a], ka, i + 1), b0 = lineLon(lines[b], kb, i), b1 = lineLon(lines[b], kb, i + 1);
          if (a0 == null || a1 == null || b0 == null || b1 == null) continue;
          if (Math.abs(norm180(a1 - a0)) > 30 || Math.abs(norm180(b1 - b0)) > 30) continue;
          const d0 = norm180(a0 - b0), d1 = norm180(a1 - b1);
          if (Math.abs(d0) > 60 || Math.abs(d1) > 60 || d0 === d1) continue;
          if (d0 === 0 || (d0 < 0) !== (d1 < 0)) {
            const f = d0 / (d0 - d1);
            const lat = -82 + i + f;
            const lon = norm180(a0 + f * norm180(a1 - a0));
            out.push({ a: { key: lines[a].key, kind: ka }, b: { key: lines[b].key, kind: kb }, lat, lon });
          }
        }
      }
    }
    return out;
  }
  // Ortswechselhoroskop: gleicher Geburtsmoment, Häuser für einen anderen Ort
  function relocate(natal, date, lat, lon) {
    const h = houses(date, lat, lon);
    const planets = natal.planets.map(p => ({ ...p, house: houseOf(p.lon, h.cusps), natalHouse: p.house }));
    const angles = [['AC', h.asc], ['MC', h.mc], ['DC', norm(h.asc + 180)], ['IC', norm(h.mc + 180)]];
    const angular = [];
    planets.filter(p => p.key !== 'Node').forEach(p => angles.forEach(([k, l]) => { const o = Math.abs(norm180(p.lon - l)); if (o <= 8) angular.push({ p, angle: k, orb: o }); }));
    angular.sort((x, y) => x.orb - y.orb);
    return { houses: h, planets, angular };
  }

  /* ---------- Chinesische Astrologie ---------- */
  const STEMS = [['甲', 'Jia', 'Holz', 'Yang'], ['乙', 'Yi', 'Holz', 'Yin'], ['丙', 'Bing', 'Feuer', 'Yang'], ['丁', 'Ding', 'Feuer', 'Yin'], ['戊', 'Wu', 'Erde', 'Yang'], ['己', 'Ji', 'Erde', 'Yin'], ['庚', 'Geng', 'Metall', 'Yang'], ['辛', 'Xin', 'Metall', 'Yin'], ['壬', 'Ren', 'Wasser', 'Yang'], ['癸', 'Gui', 'Wasser', 'Yin']]
    .map(([ch, py, el, yy], i) => ({ i, ch, py, el, yy }));
  const BRANCHES = [['子', 'Ratte', 'Wasser'], ['丑', 'Büffel', 'Erde'], ['寅', 'Tiger', 'Holz'], ['卯', 'Hase', 'Holz'], ['辰', 'Drache', 'Erde'], ['巳', 'Schlange', 'Feuer'], ['午', 'Pferd', 'Feuer'], ['未', 'Ziege', 'Erde'], ['申', 'Affe', 'Metall'], ['酉', 'Hahn', 'Metall'], ['戌', 'Hund', 'Erde'], ['亥', 'Schwein', 'Wasser']]
    .map(([ch, animal, el], i) => ({ i, ch, animal, el }));
  const ELEMENTS = ['Holz', 'Feuer', 'Erde', 'Metall', 'Wasser'];
  const pillar = (s, b) => ({ stem: STEMS[((s % 10) + 10) % 10], branch: BRANCHES[((b % 12) + 12) % 12] });

  const lnyCache = {};
  function lunarNewYear(Y) {
    if (lnyCache[Y]) return lnyCache[Y];
    // Monat 11 = Mondmonat (nach Pekinger Kalendertag), der die Wintersonnenwende enthält; Neujahr = zwei Neumonde später
    const cnDay = d => { const c = new Date(d.getTime() + 8 * 3600000); return Date.UTC(c.getUTCFullYear(), c.getUTCMonth(), c.getUTCDate()); };
    const ws = cnDay(A.Seasons(Y - 1).dec_solstice.date);
    let t = A.MakeTime(new Date(ws - 35 * DAY)), m11 = null;
    const moons = [];
    for (let k = 0; k < 5; k++) { t = A.SearchMoonPhase(0, t, 40); moons.push(cnDay(t.date)); t = t.AddDays(1); }
    moons.forEach((d, k) => { if (d <= ws) m11 = k; });
    const start = new Date(moons[m11 + 2] - 8 * 3600000);
    return (lnyCache[Y] = start);
  }
  function lichun(Y) { return A.SearchSunLongitude(315, new Date(Date.UTC(Y, 0, 25)), 30).date; }
  function dayPillarFromYMD(y, m, d) {
    const jdn = Math.floor(Date.UTC(y, m - 1, d) / DAY) + 2440588;
    const idx = (((jdn - 11) % 60) + 60) % 60;
    return pillar(idx % 10, idx % 12);
  }
  function monthPillar(date) {
    const sl = A.SunPosition(date).elon;
    const mi = Math.floor(norm(sl - 315) / 30); // 0 = Tiger-Monat
    const y = date.getUTCFullYear();
    const by = date < lichun(y) ? y - 1 : y;
    const ys = ((by - 4) % 10 + 10) % 10;
    return pillar(((ys % 5) * 2 + 2 + mi) % 10, mi + 2);
  }
  function chineseChart(b) {
    const date = b.utc.date, Y = b.y;
    const zy = date < lunarNewYear(Y) ? Y - 1 : Y;
    const yearAnimal = pillar(zy - 4, zy - 4);
    const by = date < lichun(Y) ? Y - 1 : Y;
    const year = pillar(by - 4, by - 4);
    const month = monthPillar(date);
    const day = dayPillarFromYMD(b.y, b.m, b.d);
    const hb = b.unknownTime ? null : Math.floor((b.h + 1) / 2) % 12;
    const hour = hb == null ? null : pillar((day.stem.i % 5) * 2 + hb, hb);
    const counts = { Holz: 0, Feuer: 0, Erde: 0, Metall: 0, Wasser: 0 };
    [year, month, day, hour].filter(Boolean).forEach(p => { counts[p.stem.el]++; counts[p.branch.el]++; });
    return { zodiacYear: zy, animal: yearAnimal, pillars: { year, month, day, hour }, dayMaster: day.stem, counts, lny: lunarNewYear(Y) };
  }
  function branchRelation(a, b) {
    if (a === b) return { key: 'same', name: 'gleiches Zeichen', v: 0.3 };
    if ((a + b) % 12 === 1) return { key: 'liuhe', name: 'Sechser-Harmonie', v: 1 };
    if (a % 4 === b % 4) return { key: 'sanhe', name: 'Dreier-Harmonie', v: 0.8 };
    if (Math.abs(a - b) === 6) return { key: 'chong', name: 'Zusammenstoss', v: -1 };
    if ((a + b) % 12 === 7) return { key: 'hai', name: 'Schaden', v: -0.6 };
    return { key: 'neutral', name: 'neutral', v: 0 };
  }
  function elementRelation(dm, other) {
    const a = ELEMENTS.indexOf(dm), o = ELEMENTS.indexOf(other);
    if (a === o) return { key: 'peer', name: 'Gefährte', v: 0.3 };
    if ((o + 1) % 5 === a) return { key: 'resource', name: 'Stütze', v: 0.8 };
    if ((a + 1) % 5 === o) return { key: 'output', name: 'Ausdruck', v: 0.4 };
    if ((a + 2) % 5 === o) return { key: 'wealth', name: 'Wohlstand', v: 0.6 };
    return { key: 'power', name: 'Druck', v: -0.6 };
  }
  function supportingElement(el) { return ELEMENTS[(ELEMENTS.indexOf(el) + 4) % 5]; }

  /* ---------- Numerologie ---------- */
  const digitSum = n => String(n).split('').reduce((s, c) => s + (+c || 0), 0);
  function reduce(n, keepMaster = true) {
    while (n > 9 && !(keepMaster && (n === 11 || n === 22 || n === 33))) n = digitSum(n);
    return n;
  }
  function nameNumber(name, filter) {
    const map = 'abcdefghijklmnopqrstuvwxyz';
    const s = name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
    let sum = 0;
    for (const c of s) { const i = map.indexOf(c); if (i >= 0 && (!filter || filter(c))) sum += (i % 9) + 1; }
    return sum ? reduce(sum) : null;
  }
  function numerology(b, name) {
    const lp = reduce(reduce(b.d) + reduce(b.m) + reduce(digitSum(b.y)));
    const vowel = c => 'aeiou'.includes(c);
    return {
      lifePath: lp, birthday: reduce(b.d),
      expression: name ? nameNumber(name) : null,
      soul: name ? nameNumber(name, vowel) : null,
      personality: name ? nameNumber(name, c => !vowel(c)) : null
    };
  }
  function personalYear(b, year) { return reduce(reduce(b.d) + reduce(b.m) + reduce(digitSum(year)), false); }
  function personalMonth(b, year, month) { return reduce(personalYear(b, year) + month, false); }
  function personalDay(b, year, month, day) { return reduce(personalMonth(b, year, month) + reduce(day, false), false); }
  const NUM_GROUPS = [[1, 5, 7], [2, 4, 8], [3, 6, 9]];
  function numHarmony(a, b) {
    a = reduce(a, false); b = reduce(b, false);
    if (a === b) return 0.6;
    return NUM_GROUPS.some(g => g.includes(a) && g.includes(b)) ? 1 : 0;
  }

  root.AstroCore = {
    A, SIGNS, PLANETS, PL, ASPECTS, STEMS, BRANCHES, ELEMENTS, DAY,
    norm, norm180, tzOffsetMin, localToUtc, timezoneFor, signOf, fmtDeg, lonOf, speed, eclPos,
    houses, houseOf, natalChart, sensitivePoints, meanLilith, transitAspects, transitPositions, moonInfo, aspectNature,
    acgLines, lineDistances, acgCrossings, relocate,
    lunarNewYear, lichun, dayPillarFromYMD, monthPillar, chineseChart, branchRelation, elementRelation, supportingElement, pillar,
    reduce, nameNumber, numerology, personalYear, personalMonth, personalDay, numHarmony
  };
})(typeof window !== 'undefined' ? window : globalThis);
