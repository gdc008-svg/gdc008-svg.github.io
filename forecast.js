/* Prognose-Engine: kombiniert Transite, Mondlauf, Numerologie, chinesische Tagessäulen und Astrokartographie */
(function (root) {
  'use strict';
  const C = root.AstroCore, T = root.TEXTS;
  const DAY = C.DAY;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const pick = (arr, seed) => arr[Math.abs(Math.round(seed)) % arr.length];
  const WD = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  const fmtDate = d => `${d.getUTCDate()}. ${MONTHS[d.getUTCMonth()]}`;
  const fmtDateY = d => `${fmtDate(d)} ${d.getUTCFullYear()}`;

  const AREA_W = {
    love: { Venus: 1, Moon: 0.6, Mars: 0.4, Jupiter: 0.3 },
    career: { Sun: 0.6, Saturn: 0.8, Jupiter: 0.7, MC: 1, Mars: 0.4, Mercury: 0.3 },
    energy: { Mars: 1, Sun: 0.8, ASC: 0.6, Pluto: 0.3, Moon: 0.3 },
    mind: { Mercury: 1, Uranus: 0.5, Neptune: 0.4, Jupiter: 0.3, Moon: 0.2 }
  };
  const SLOW = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
  const AREA_NAMES = { love: 'Liebe', career: 'Beruf', energy: 'Energie', mind: 'Kopf und Kommunikation' };
  const NUM_AREA = { 1: { energy: 6, career: 3 }, 2: { love: 6 }, 3: { mind: 6, love: 2 }, 4: { career: 5 }, 5: { mind: 4, energy: 3 }, 6: { love: 7 }, 7: { mind: 3, energy: -4 }, 8: { career: 8 }, 9: { love: 2, career: -2 } };
  const CN_AREA = { resource: { energy: 3, mind: 3 }, peer: { energy: 3 }, output: { mind: 5, love: 2 }, wealth: { career: 6 }, power: { career: -4, energy: -3 } };
  const ELEM_COMPAT = (a, b) => a === b ? 1 : ((['Feuer', 'Luft'].includes(a) && ['Feuer', 'Luft'].includes(b)) || (['Erde', 'Wasser'].includes(a) && ['Erde', 'Wasser'].includes(b))) ? 0.5 : -0.3;

  function buildProfile(inp) {
    const tz = inp.tz || C.timezoneFor(inp.lat, inp.lon);
    const h = inp.unknownTime ? 12 : inp.h, mi = inp.unknownTime ? 0 : inp.mi;
    const utc = C.localToUtc(inp.y, inp.m, inp.d, h, mi, tz);
    const b = { ...inp, h, mi, tz, utc };
    const natal = C.natalChart(b);
    const chinese = C.chineseChart(b);
    const num = C.numerology(b, inp.name);
    const lines = C.acgLines(utc.date);
    const sens = b.unknownTime ? null : C.sensitivePoints(natal, utc.date, b.lat);
    return { b, natal, chinese, num, lines, sens };
  }

  function transitSentence(ta) {
    const kind = ta.asp.key === 'conj' ? 'conj' : (ta.asp.key === 'trine' || ta.asp.key === 'sext') ? 'harm' : 'tense';
    const verb = T.transit[ta.t.key][kind];
    const area = T.natalArea[ta.n.key];
    return `${verb} ${area}`;
  }
  function transitLabel(ta) { return `${ta.t.name} ${ta.asp.sym} ${ta.n.name}`; }

  function dayForecast(P, y, m, d) {
    const date = new Date(Date.UTC(y, m - 1, d, 11));
    const tas = C.transitAspects(P.natal, date);
    const areas = { love: 0, career: 0, energy: 0, mind: 0 };
    let astro = 0;
    tas.forEach(ta => {
      const v = ta.value * (SLOW.includes(ta.t.key) ? 0.4 : 1); // langsame Transite wirken als Hintergrund der ganzen Woche
      astro += v;
      for (const a in areas) areas[a] += v * ((AREA_W[a][ta.t.key] || 0) + (AREA_W[a][ta.n.key] || 0) * 0.7);
    });
    const moon = C.moonInfo(date);
    const moonV = ELEM_COMPAT(moon.sign.el, P.natal.byKey.Sun.pos.sign.el) * 0.6 + ELEM_COMPAT(moon.sign.el, P.natal.byKey.Moon.pos.sign.el) * 0.4;
    const pd = C.personalDay(P.b, y, m, d);
    const numV = C.numHarmony(pd, P.num.lifePath);
    const dp = C.dayPillarFromYMD(y, m, d);
    const brRel = C.branchRelation(dp.branch.i, P.chinese.animal.branch.i);
    const dayBr = C.branchRelation(dp.branch.i, P.chinese.pillars.day.branch.i);
    const elRel = C.elementRelation(P.chinese.dayMaster.el, dp.stem.el);
    const cnV = brRel.v * 0.7 + (dayBr.key === 'chong' ? -0.4 : dayBr.v * 0.2) + elRel.v * 0.6;
    const total = clamp(Math.round(52 + 24 * Math.tanh(astro / 2.5) + 5 * (numV - 0.4) + 7 * cnV + 4 * moonV), 6, 97);
    const ar = {};
    for (const a in areas) {
      ar[a] = clamp(Math.round(52 + 26 * Math.tanh(areas[a] / 2) + ((NUM_AREA[pd] || {})[a] || 0) + ((CN_AREA[elRel.key] || {})[a] || 0) + 4 * brRel.v + (a === 'love' ? 4 * moonV : 0)), 5, 97);
    }
    return { date, y, m, d, wd: WD[date.getUTCDay()], tas, moon, pd, numV, dp, brRel, elRel, total, areas: ar };
  }

  function nearestCitiesToLines(P, keys, kinds, maxKm, homeLat, homeLon) {
    const res = [];
    for (const c of root.CITIES) {
      const ds = C.lineDistances(P.lines.filter(l => keys.includes(l.key)), c[2], c[3]).filter(x => !kinds || kinds.includes(x.kind));
      if (ds.length && ds[0].km <= maxKm) {
        const home = Math.hypot((c[2] - homeLat) * 111, (c[3] - homeLon) * 111 * Math.cos(homeLat * Math.PI / 180));
        res.push({ city: c[0], country: c[1], lat: c[2], lon: c[3], line: ds[0], home });
      }
    }
    return res;
  }

  function weekForecast(P, startY, startM, startD) {
    const days = [];
    const s = Date.UTC(startY, startM - 1, startD);
    for (let i = 0; i < 7; i++) { const dt = new Date(s + i * DAY); days.push(dayForecast(P, dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate())); }
    const avg = Math.round(days.reduce((a, x) => a + x.total, 0) / 7);
    const best = days.reduce((a, x) => x.total > a.total ? x : a);
    const worst = days.reduce((a, x) => x.total < a.total ? x : a);
    const bestArea = k => days.reduce((a, x) => x.areas[k] > a.areas[k] ? x : a);
    const areaAvg = {};
    for (const k of Object.keys(AREA_NAMES)) areaAvg[k] = Math.round(days.reduce((a, x) => a + x.areas[k], 0) / 7);

    // wichtigste Transite der Woche (ohne Mond), mit Wirkungstagen
    const map = new Map();
    days.forEach((d, i) => d.tas.filter(t => t.t.key !== 'Moon').forEach(t => {
      const k = t.t.key + t.n.key + t.asp.key;
      const e = map.get(k) || { ta: t, days: [], peak: t };
      e.days.push(i); if (Math.abs(t.value) > Math.abs(e.peak.value)) e.peak = t;
      map.set(k, e);
    }));
    const top = [...map.values()].sort((a, b) => Math.abs(b.peak.value) * b.days.length ** 0.3 - Math.abs(a.peak.value) * a.days.length ** 0.3).slice(0, 4);

    // Glücksort: Linie des stärksten wohltuenden Transitplaneten
    const posTop = top.find(t => t.peak.value > 0 && ['Venus', 'Jupiter', 'Sun', 'Moon', 'Mercury'].includes(t.peak.t.key));
    const placeKey = posTop ? posTop.peak.t.key : 'Jupiter';
    let places = nearestCitiesToLines(P, [placeKey], ['MC', 'AC', 'DC'], 300, P.b.lat, P.b.lon).sort((a, b) => a.home - b.home);
    if (!places.length || places[0].home > 2500) {
      const extra = nearestCitiesToLines(P, ['Jupiter', 'Venus', 'Sun'], null, 350, P.b.lat, P.b.lon).filter(x => !places.some(p => p.city === x.city));
      places = places.concat(extra).sort((a, b) => a.home - b.home);
    }

    const supportEl = C.supportingElement(P.chinese.dayMaster.el);
    const pdCount = {};
    days.forEach(d => { pdCount[d.pd] = (pdCount[d.pd] || 0) + (d.total); });
    const luckyNumber = +Object.entries(pdCount).sort((a, b) => b[1] - a[1])[0][0];

    // Wochentext
    const tone = avg >= 64 ? 'Eine kraftvolle, günstige Woche.' : avg >= 52 ? 'Eine ausgeglichene Woche mit guten Fenstern.' : 'Eine anspruchsvolle Woche, in der Ruhe und Planung viel bewirken.';
    const p1 = [tone];
    top.slice(0, 3).forEach((e, i) => {
      const dn = e.days.length === 7 ? 'die ganze Woche' : e.days.length === 1 ? `am ${days[e.days[0]].wd}` : `von ${days[e.days[0]].wd} bis ${days[e.days[e.days.length - 1]].wd}`;
      p1.push(`${e.peak.t.name} (${e.peak.asp.name} zu deiner Radix-${e.peak.n.name}) ${transitSentence(e.peak)}, ${dn}. ${pick(e.peak.value >= 0 ? T.advice.pos : T.advice.neg, i + startD)}`);
    });
    const moonSigns = [...new Set(days.map(d => d.moon.sign.name))];
    const bestMoon = days.reduce((a, x) => (ELEM_COMPAT(x.moon.sign.el, P.natal.byKey.Sun.pos.sign.el) > ELEM_COMPAT(a.moon.sign.el, P.natal.byKey.Sun.pos.sign.el) ? x : a));
    const p2 = `Der Mond wandert durch ${moonSigns.join(', ').replace(/, ([^,]*)$/, ' und $1')}. Am besten harmoniert er mit deiner ${P.natal.byKey.Sun.pos.sign.name}-Sonne am ${bestMoon.wd} (Mond in ${bestMoon.moon.sign.name}): ${T.moonDay[bestMoon.moon.sign.name]}`;
    const py = C.personalYear(P.b, startY), pm = C.personalMonth(P.b, startY, startM);
    const p3 = `Du stehst in einem persönlichen ${py}er-Jahr (${T.personalYear[py]}) und einem ${pm}er-Monat. Deine stärksten Zahlentage sind ${days.filter(d => d.numV >= 1).map(d => d.wd).join(', ') || 'diese Woche gleichmässig verteilt'}, weil ihre Tageszahl mit deiner Lebenszahl ${P.num.lifePath} harmoniert.`;
    const harmDays = days.filter(d => d.brRel.v > 0.5).map(d => d.wd), clashDays = days.filter(d => d.brRel.key === 'chong' || d.brRel.key === 'hai').map(d => d.wd);
    const p4 = `Für dich als ${P.chinese.animal.stem.el}-${P.chinese.animal.branch.animal} mit dem Tagesmeister ${P.chinese.dayMaster.ch} (${P.chinese.dayMaster.el}) gilt: ${harmDays.length ? `Harmonie-Tage sind ${harmDays.join(', ')}` : 'Diese Woche gibt es keine ausgesprochenen Harmonie-Tage'}${clashDays.length ? `, Vorsicht gilt am ${clashDays.join(' und ')}` : ', und es gibt keinen Zusammenstoss-Tag'}. Stärkend wirkt für dich das Element ${supportEl}.`;
    const pl = places[0];
    const p5 = pl ? `Dein Glücksort der Woche liegt in ${pl.city} (${pl.country}) an deiner ${C.PL[pl.line.key].name}-${pl.line.kind}-Linie: Dort wirken ${T.acgPlanet[pl.line.key]} vor allem ${T.acgAngle[pl.line.kind]}.` : '';

    // Transite über die sensitiven Punkte (Konjunktionen)
    const sensHits = [];
    if (P.sens) {
      const SENS_KEYS = P.sens.list.map(s => s.key);
      const seen = new Set();
      days.forEach(d => {
        C.transitPositions(d.date).filter(t => ['Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(t.key)).forEach(t => {
          SENS_KEYS.forEach(k => {
            const sp = P.sens.byKey[k];
            const o = Math.abs(C.norm180(t.lon - sp.lon));
            const k2 = t.key + k;
            if (o <= 1.5 && !seen.has(k2)) { seen.add(k2); sensHits.push({ t, sp, day: d }); }
          });
        });
      });
    }
    const p6 = sensHits.length ? sensHits.slice(0, 3).map(h => `Ab ${h.day.wd} läuft ${h.t.key === 'Sun' ? 'die Sonne' : h.t.name} über deinen ${h.sp.name} (${h.sp.pos.sign.name}, ${h.sp.house}. Haus). Dieser Punkt zeigt, ${T.sensitive[h.sp.key][0].charAt(0).toLowerCase() + T.sensitive[h.sp.key][0].slice(1)} ${['Venus', 'Jupiter', 'Sun'].includes(h.t.key) ? 'Dieser Bereich wird jetzt spürbar begünstigt.' : h.t.key === 'Saturn' ? 'Hier ist Geduld und Ernsthaftigkeit gefragt.' : h.t.key === 'Mars' ? 'Hier kommt Bewegung hinein, handle entschlossen, aber nicht hastig.' : 'Gespräche und Pläne zu diesem Thema laufen gut.'}`).join(' ') : '';

    return {
      days, avg, best, worst, areaAvg, top, sensHits,
      optimal: {
        bestDay: best, love: bestArea('love'), career: bestArea('career'), energy: bestArea('energy'), mind: bestArea('mind'), caution: worst,
        luckyNumber, color: T.elementColor[supportEl], colorEl: supportEl, direction: T.elementDir[supportEl], place: pl, places: places.slice(0, 6), placeKey
      },
      text: [p1.join(' '), p2, p3, p4, p5, p6]
    };
  }

  /* ---------- Halbjahr / Jahr ---------- */
  function longForecast(P, startY, startM, months, onProgress) {
    const start = Date.UTC(startY, startM - 1, 1);
    const end = Date.UTC(startY, startM - 1 + months, 1);
    const nDays = Math.round((end - start) / DAY);
    const slowKeys = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    const targets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'ASC', 'MC'];
    const monthAgg = [];
    for (let i = 0; i < months; i++) {
      const dt = new Date(Date.UTC(startY, startM - 1 + i, 1));
      monthAgg.push({ y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, name: MONTHS[dt.getUTCMonth()], sum: 0, n: 0, areas: { love: 0, career: 0, energy: 0, mind: 0 }, transits: new Map(), events: [] });
    }
    const runs = {}; // laufende Transitperioden der langsamen Planeten
    const sensRuns = {}, sensPeriods = [];
    const SENS_LONG = P.sens ? P.sens.list.map(s => s.key) : [];
    const periods = [];
    const retro = { Mercury: null, Venus: null, Mars: null };
    const retroPeriods = [];
    let prevSpeed = {};
    for (let i = 0; i <= nDays; i++) {
      const date = new Date(start + i * DAY + 11 * 3600000);
      const pos = C.transitPositions(date);
      const mi = (date.getUTCFullYear() - startY) * 12 + date.getUTCMonth() - (startM - 1);
      // Monatswerte (ohne Mond)
      if (i < nDays) {
        const tas = C.transitAspects(P.natal, date, { positions: pos.filter(p => p.key !== 'Moon') });
        const M = monthAgg[mi];
        let s = 0; const ar = { love: 0, career: 0, energy: 0, mind: 0 };
        tas.forEach(ta => {
          s += ta.value;
          for (const a in ar) ar[a] += ta.value * ((AREA_W[a][ta.t.key] || 0) + (AREA_W[a][ta.n.key] || 0) * 0.7);
          const k = ta.t.key + ta.n.key + ta.asp.key;
          const e = M.transits.get(k) || { ta, sum: 0 };
          e.sum += ta.value; if (ta.orb < e.ta.orb) e.ta = ta; M.transits.set(k, e);
        });
        M.sum += s; M.n++;
        for (const a in ar) M.areas[a] += ar[a];
      }
      // langsame Transite als Perioden
      for (const t of pos.filter(p => slowKeys.includes(p.key))) {
        for (const nk of targets) {
          const n = P.natal.byKey[nk];
          const sep = Math.abs(C.norm180(t.lon - n.lon));
          for (const as of C.ASPECTS) {
            const k = t.key + nk + as.key;
            const o = Math.abs(sep - as.a);
            const orb = t.key === 'Jupiter' ? 2 : 1.5;
            if (o <= orb) {
              const r = runs[k] || (runs[k] = { t, n, asp: as, start: date, end: date, exact: date, minOrb: o, hits: [] });
              r.end = date; if (o < r.minOrb) { r.minOrb = o; r.exact = date; }
              if (r.prevO != null && o > r.prevO && r.falling && r.prevO < 0.6) r.hits.push(r.prevD);
              r.falling = r.prevO == null || o < r.prevO; r.prevO = o; r.prevD = date;
            } else if (runs[k] && date - runs[k].end > 75 * DAY) {
              periods.push(runs[k]); delete runs[k];
            }
          }
        }
      }
      // Jupiter und Saturn über den sensitiven Punkten
      if (P.sens) for (const t of pos.filter(p => p.key === 'Jupiter' || p.key === 'Saturn')) {
        for (const sk of SENS_LONG) {
          const sp = P.sens.byKey[sk], k = t.key + sk;
          const o = Math.abs(C.norm180(t.lon - sp.lon));
          if (o <= 1.5) { const r = sensRuns[k] || (sensRuns[k] = { t, sp, start: date, end: date, exact: date, minOrb: o }); r.end = date; if (o < r.minOrb) { r.minOrb = o; r.exact = date; } }
          else if (sensRuns[k] && date - sensRuns[k].end > 75 * DAY) { sensPeriods.push(sensRuns[k]); delete sensRuns[k]; }
        }
      }
      // Rückläufigkeiten
      for (const k of Object.keys(retro)) {
        const sp = C.speed(k, date);
        if (sp < 0 && !retro[k]) retro[k] = { key: k, start: date };
        if (sp >= 0 && retro[k]) { retroPeriods.push({ ...retro[k], end: date }); retro[k] = null; }
        prevSpeed[k] = sp;
      }
      if (onProgress && i % 30 === 0) onProgress(i / nDays);
    }
    Object.values(runs).forEach(r => periods.push(r));
    Object.values(sensRuns).forEach(r => sensPeriods.push(r));
    sensPeriods.sort((a, b) => a.start - b.start);
    Object.values(retro).filter(Boolean).forEach(r => retroPeriods.push({ ...r, end: null }));
    periods.forEach(p => {
      const nat = C.aspectNature(p.t.key, p.asp.key);
      p.value = nat * p.t.w * (p.n.w || 1);
      // Exakte Treffer zusammenfassen (Rückläufigkeit -> mehrere Daten)
      p.exacts = p.hits.length ? p.hits : [p.exact];
    });
    periods.sort((a, b) => a.start - b.start);

    // Finsternisse
    const eclipses = [];
    let le = C.A.SearchLunarEclipse(new Date(start));
    while (le.peak.date.getTime() < end) {
      eclipses.push({ kind: 'Mondfinsternis', type: le.kind, date: le.peak.date, lon: C.lonOf('Moon', le.peak.date) });
      le = C.A.NextLunarEclipse(le.peak);
    }
    let se = C.A.SearchGlobalSolarEclipse(new Date(start));
    while (se.peak.date.getTime() < end) {
      eclipses.push({ kind: 'Sonnenfinsternis', type: se.kind, date: se.peak.date, lon: C.lonOf('Sun', se.peak.date) });
      se = C.A.NextGlobalSolarEclipse(se.peak);
    }
    eclipses.forEach(e => {
      e.sign = C.signOf(e.lon).sign;
      e.house = C.houseOf(e.lon, P.natal.houses.cusps);
      e.hits = P.natal.points.filter(p => p.key !== 'Node' && Math.abs(C.norm180(p.lon - e.lon)) <= 5 || p.key !== 'Node' && Math.abs(Math.abs(C.norm180(p.lon - e.lon)) - 180) <= 3);
    });
    eclipses.sort((a, b) => a.date - b.date);

    // Neu- und Vollmonde
    const lunations = [];
    let t = C.A.MakeTime(new Date(start));
    for (;;) {
      const nm = C.A.SearchMoonPhase(0, t, 40), fm = C.A.SearchMoonPhase(180, t, 40);
      const nx = nm.date < fm.date ? { k: 'Neumond', tm: nm } : { k: 'Vollmond', tm: fm };
      if (nx.tm.date.getTime() >= end) break;
      const lon = C.lonOf('Moon', nx.tm.date);
      lunations.push({ kind: nx.k, date: nx.tm.date, sign: C.signOf(lon).sign, house: C.houseOf(lon, P.natal.houses.cusps) });
      t = nx.tm.AddDays(1);
    }

    // Solar (Geburtstags-Horoskop)
    const sr = C.A.SearchSunLongitude(P.natal.byKey.Sun.lon, new Date(start), Math.max(1, nDays));
    const solarReturn = sr && sr.date.getTime() < end ? sr.date : null;

    const monthsOut = monthAgg.map((M, i) => {
      const astro = M.sum / Math.max(1, M.n);
      const pm = C.personalMonth(P.b, M.y, M.m);
      const numV = C.numHarmony(pm, P.num.lifePath);
      const mp = C.monthPillar(new Date(Date.UTC(M.y, M.m - 1, 15)));
      const brRel = C.branchRelation(mp.branch.i, P.chinese.animal.branch.i);
      const elRel = C.elementRelation(P.chinese.dayMaster.el, mp.stem.el);
      const total = clamp(Math.round(52 + 24 * Math.tanh(astro / 3) + 5 * (numV - 0.4) + 6 * brRel.v + 4 * elRel.v), 8, 96);
      const ar = {};
      for (const a in M.areas) ar[a] = clamp(Math.round(52 + 26 * Math.tanh(M.areas[a] / Math.max(1, M.n) / 2.5) + ((NUM_AREA[pm] || {})[a] || 0) + ((CN_AREA[elRel.key] || {})[a] || 0) + 3 * brRel.v), 5, 96);
      const top = [...M.transits.values()].sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum)).slice(0, 3).map(e => e.ta);
      const mStart = Date.UTC(M.y, M.m - 1, 1), mEnd = Date.UTC(M.y, M.m, 1);
      const jupHouse = C.houseOf(C.lonOf('Jupiter', new Date(mStart + 14 * DAY)), P.natal.houses.cusps);
      return {
        y: M.y, m: M.m, name: M.name, total, areas: ar, pm, numV, mp, brRel, elRel, top, jupHouse,
        lunations: lunations.filter(l => l.date >= mStart && l.date < mEnd),
        eclipses: eclipses.filter(e => e.date >= mStart && e.date < mEnd),
        retro: retroPeriods.filter(r => r.start < mEnd && (!r.end || r.end >= mStart))
      };
    });
    const best = monthsOut.reduce((a, x) => x.total > a.total ? x : a);
    const bestLove = monthsOut.reduce((a, x) => x.areas.love > a.areas.love ? x : a);
    const bestCareer = monthsOut.reduce((a, x) => x.areas.career > a.areas.career ? x : a);
    const hardest = monthsOut.reduce((a, x) => x.total < a.total ? x : a);
    return { months: monthsOut, periods, sensPeriods, eclipses, retroPeriods, lunations, solarReturn, best, bestLove, bestCareer, hardest, start: new Date(start), end: new Date(end - DAY) };
  }

  root.Forecast = { buildProfile, dayForecast, weekForecast, longForecast, transitSentence, transitLabel, nearestCitiesToLines, AREA_NAMES, WD, MONTHS, fmtDate, fmtDateY };
})(typeof window !== 'undefined' ? window : globalThis);
