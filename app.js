/* Oberfläche: Eingabe, Seitenwechsel, Darstellung */
(function () {
  'use strict';
  const C = window.AstroCore, F = window.Forecast, T = window.TEXTS;
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const VS = '︎';
  const g = s => s + VS; // Symbol in Textdarstellung erzwingen
  const normStr = s => (s || '').toLowerCase().replace(/ß/g, 'ss').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const pad = n => String(n).padStart(2, '0');
  const cls = v => v >= 62 ? 'good' : v >= 45 ? 'mid' : 'low';
  const colVar = v => `var(--${cls(v) === 'good' ? 'good' : cls(v) === 'mid' ? 'mid' : 'low'})`;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ohne Speicher weiter */ } }
  };

  const EXAMPLE = { name: 'Maria Muster', date: '1985-06-15', time: '14:30', place: 'Zürich', country: 'Schweiz', example: true };
  let profile = null, input = null, longMonths = 12, longStart = null;

  /* ---------- Ortssuche ---------- */
  function fillDatalists() {
    const dl = $('#dl-places'), dc = $('#dl-countries');
    dl.innerHTML = window.CITIES.map(c => `<option value="${esc(c[0])}">${esc(c[1])}</option>`).join('');
    dc.innerHTML = [...new Set(window.CITIES.map(c => c[1]))].sort((a, b) => a.localeCompare(b, 'de')).map(c => `<option value="${esc(c)}"></option>`).join('');
  }
  async function geocode(place, country, latStr, lonStr) {
    const lat = parseFloat(String(latStr).replace(',', '.')), lon = parseFloat(String(lonStr).replace(',', '.'));
    if (isFinite(lat) && isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon, label: `${place || 'Eigene Koordinaten'}${country ? ', ' + country : ''}`, src: 'manual' };
    const p = normStr(place), c = normStr(country);
    if (!p) throw new Error('Bitte gib einen Geburtsort ein.');
    let hit = window.CITIES.find(x => normStr(x[0]) === p && (!c || normStr(x[1]) === c))
      || window.CITIES.find(x => normStr(x[0]) === p)
      || window.CITIES.find(x => normStr(x[0]).startsWith(p) && (!c || normStr(x[1]) === c));
    if (hit) return { lat: hit[2], lon: hit[3], label: `${hit[0]}, ${hit[1]}`, src: 'list' };
    try {
      const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=de&q=${encodeURIComponent(place + (country ? ', ' + country : ''))}`, { signal: ctl.signal });
      clearTimeout(to);
      const j = await r.json();
      if (j && j[0]) return { lat: +j[0].lat, lon: +j[0].lon, label: j[0].display_name.split(',').slice(0, 1).join('') + (country ? ', ' + country : ''), src: 'osm' };
    } catch (e) { /* Online-Suche nicht erreichbar */ }
    $('#coords').open = true;
    throw new Error(`„${place}“ ist nicht in der Ortsliste. Wähle einen Ort aus der Liste oder gib unten Breite und Länge ein.`);
  }

  /* ---------- Formular ---------- */
  function nextMonday(d = new Date()) {
    const x = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const wd = x.getUTCDay();
    x.setUTCDate(x.getUTCDate() + (wd === 1 ? 0 : (8 - wd) % 7));
    return x;
  }
  const isoDate = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  function setForm(v) {
    $('#f-name').value = v.name || ''; $('#f-date').value = v.date || ''; $('#f-time').value = v.time || '';
    $('#f-place').value = v.place || ''; $('#f-country').value = v.country || '';
    $('#f-lat').value = v.lat != null && v.src === 'manual' ? v.lat : ''; $('#f-lon').value = v.lon != null && v.src === 'manual' ? v.lon : '';
    $('#f-notime').checked = !!v.unknownTime; $('#f-time').disabled = !!v.unknownTime;
    $('#example-note').hidden = !v.example;
  }
  async function compute(v, opts = {}) {
    const [y, m, d] = (v.date || '').split('-').map(Number);
    if (!y || !m || !d) throw new Error('Bitte gib ein gültiges Geburtsdatum ein.');
    let h = 12, mi = 0;
    if (!v.unknownTime) {
      const t = (v.time || '').split(':').map(Number);
      if (t.length < 2 || !isFinite(t[0])) throw new Error('Bitte gib die Geburtszeit ein oder wähle „Geburtszeit unbekannt“.');
      [h, mi] = t;
    }
    const loc = await geocode(v.place, v.country, v.latIn, v.lonIn);
    input = { ...v, lat: loc.lat, lon: loc.lon, src: loc.src, placeLabel: loc.label };
    profile = F.buildProfile({ name: v.name, y, m, d, h, mi, unknownTime: !!v.unknownTime, lat: loc.lat, lon: loc.lon });
    const off = profile.b.utc.offsetMin;
    $('#place-info').textContent = `${loc.label} · ${Math.abs(loc.lat).toFixed(2)}° ${loc.lat >= 0 ? 'N' : 'S'}, ${Math.abs(loc.lon).toFixed(2)}° ${loc.lon >= 0 ? 'O' : 'W'} · ${profile.b.tz}, UTC${off >= 0 ? '+' : '−'}${Math.floor(Math.abs(off) / 60)}${Math.abs(off) % 60 ? ':' + pad(Math.abs(off) % 60) : ''} bei Geburt`;
    if (!opts.example) store.set('astro-input', { name: v.name, date: v.date, time: v.time, unknownTime: !!v.unknownTime, place: v.place, country: v.country, lat: loc.lat, lon: loc.lon, src: loc.src });
    render();
  }
  function readForm() {
    return {
      name: $('#f-name').value.trim(), date: $('#f-date').value, time: $('#f-time').value, unknownTime: $('#f-notime').checked,
      place: $('#f-place').value.trim(), country: $('#f-country').value.trim(), latIn: $('#f-lat').value.trim(), lonIn: $('#f-lon').value.trim()
    };
  }

  /* ---------- Seitenwechsel ---------- */
  function route() {
    const long = location.hash === '#langfrist';
    $('#page-woche').hidden = long; $('#page-langfrist').hidden = !long;
    $('#week-ctrl').hidden = long;
    $('#nav-woche').toggleAttribute('aria-current', !long); if (!long) $('#nav-woche').setAttribute('aria-current', 'page');
    $('#nav-langfrist').toggleAttribute('aria-current', long); if (long) $('#nav-langfrist').setAttribute('aria-current', 'page');
    $('#intro-eyebrow').textContent = long ? 'Seite 2 · Halbjahr und Jahr' : 'Seite 1 · Wochenprognose';
    $('#intro-title').textContent = long ? 'Dein halbes oder ganzes Jahr im Überblick' : 'Deine Woche aus vier Himmelsrichtungen';
    $('#intro-text').textContent = long
      ? 'Wähle sechs oder zwölf Monate. Die Prognose verfolgt die langsamen Planeten, Finsternisse und Rückläufigkeiten über deinen Geburtspunkten und verbindet sie mit deinen persönlichen Monatszahlen und den chinesischen Monatssäulen.'
      : 'Gib deine Geburtsdaten ein. Die Seite berechnet dein westliches Horoskop mit Placidus-Häusern, deine chinesischen vier Säulen, deine Lebenszahl und deine Planetenlinien auf der Weltkarte. Daraus entsteht eine Prognose für sieben Tage mit den besten Tagen, Farben, Zahlen und Orten.';
    $('#f-submit').textContent = long ? 'Jahresprognose berechnen' : 'Prognose berechnen';
    if (profile) render();
  }
  function render() {
    if (location.hash === '#langfrist') renderLong(); else renderWeek();
  }

  /* ---------- Bausteine ---------- */
  function barChart(items, opts = {}) {
    const W = opts.w || 700, H = 220, padL = 30, padB = 40, padT = 22, n = items.length;
    const bw = (W - padL - 10) / n;
    const y = v => padT + (H - padT - padB) * (1 - v / 100);
    let s = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.label || 'Diagramm')}">`;
    [0, 25, 50, 75, 100].forEach(v => { s += `<line class="grid" x1="${padL}" x2="${W - 10}" y1="${y(v)}" y2="${y(v)}"/><text x="${padL - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; });
    items.forEach((it, i) => {
      const x = padL + i * bw + bw * 0.18, w = bw * 0.64;
      s += `<rect class="bar-${cls(it.v)}" x="${x}" y="${y(it.v)}" width="${w}" height="${y(0) - y(it.v)}" rx="3"><title>${esc(it.title || it.l1)}: ${it.v}</title></rect>`;
      s += `<text class="val" x="${x + w / 2}" y="${y(it.v) - 6}" text-anchor="middle">${it.v}</text>`;
      s += `<text x="${x + w / 2}" y="${H - padB + 16}" text-anchor="middle" style="fill:var(--ink);font-weight:600">${esc(it.l1)}</text>`;
      if (it.l2) s += `<text x="${x + w / 2}" y="${H - padB + 31}" text-anchor="middle">${esc(it.l2)}</text>`;
    });
    return s + '</svg>';
  }
  const meter = (label, v, shown, color) => `<div class="meter"><span>${esc(label)}</span><div class="track"><div class="fill" style="width:${v}%;background:${color || colVar(v)}"></div></div><span class="num">${shown != null ? shown : v}</span></div>`;
  const shortWd = wd => wd.slice(0, 2);
  const dmy = d => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.`;

  /* ---------- Radix-Rad ---------- */
  function wheel(P) {
    const S = 560, c = S / 2, R1 = 250, R2 = 214, R3 = 200, RP = 176, RA = 128;
    const noTime = P.b.unknownTime;
    const asc = noTime ? 0 : P.natal.houses.asc;
    const ang = lon => (180 + (lon - asc)) * Math.PI / 180;
    const pt = (lon, r) => [c + r * Math.cos(ang(lon)), c - r * Math.sin(ang(lon))];
    let s = `<svg class="wheel" viewBox="0 0 ${S} ${S}" role="img" aria-label="Radix-Horoskop">`;
    s += `<circle class="ringfill" cx="${c}" cy="${c}" r="${R1}"/><circle class="ring" cx="${c}" cy="${c}" r="${R2}" style="fill:var(--paper)"/><circle class="ring" cx="${c}" cy="${c}" r="${R3}"/><circle class="ring" cx="${c}" cy="${c}" r="${RA}"/>`;
    for (let i = 0; i < 12; i++) {
      const [x1, y1] = pt(i * 30, R1), [x2, y2] = pt(i * 30, R2);
      s += `<line class="tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
      const [tx, ty] = pt(i * 30 + 15, (R1 + R2) / 2);
      s += `<text class="sg el-${C.SIGNS[i].el}" x="${tx}" y="${ty}">${g(C.SIGNS[i].sym)}</text>`;
    }
    for (let dg = 0; dg < 360; dg += 5) { const [x1, y1] = pt(dg, R2), [x2, y2] = pt(dg, R2 - (dg % 10 ? 4 : 7)); s += `<line class="tick" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`; }
    if (!noTime) {
      P.natal.houses.cusps.forEach((cu, i) => {
        const axis = i % 3 === 0;
        const [x1, y1] = pt(cu, axis ? R1 + 6 : R3), [x2, y2] = pt(cu, RA);
        s += `<line class="${axis ? 'axis' : 'cusp'}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
        const nx = P.natal.houses.cusps[(i + 1) % 12];
        const mid = cu + C.norm(nx - cu) / 2;
        const [hx, hy] = pt(mid, RA + 11);
        s += `<text class="hn" x="${hx}" y="${hy}">${i + 1}</text>`;
      });
      [['AC', P.natal.houses.asc], ['MC', P.natal.houses.mc], ['DC', P.natal.houses.asc + 180], ['IC', P.natal.houses.mc + 180]].forEach(([l, lon]) => {
        const [lx, ly] = pt(lon, R1 + 15);
        s += `<text class="axl" x="${lx}" y="${ly}">${l}</text>`;
      });
    }
    // Aspekte
    P.natal.aspects.filter(a => !['ASC', 'MC'].includes(a.p.key) && !['ASC', 'MC'].includes(a.q.key) && a.p.key !== 'Node' && a.q.key !== 'Node' && a.asp.key !== 'conj').forEach(a => {
      const [x1, y1] = pt(a.p.lon, RA - 2), [x2, y2] = pt(a.q.lon, RA - 2);
      const k = ['trine', 'sext'].includes(a.asp.key) ? 'harm' : 'tense';
      s += `<line class="asp-${k}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${a.orb < 2 ? 1.4 : 0.8}" opacity="0.8"/>`;
    });
    // Planeten mit Kollisionsausgleich
    const pl = P.natal.planets.map(p => ({ p, d: p.lon })).sort((a, b) => a.d - b.d);
    for (let it = 0; it < 40; it++) {
      for (let i = 0; i < pl.length; i++) {
        const a = pl[i], b = pl[(i + 1) % pl.length];
        const gap = C.norm(b.d - a.d);
        if (gap < 7.5 && pl.length > 1) { const push = (7.5 - gap) / 2; a.d = C.norm(a.d - push); b.d = C.norm(b.d + push); }
      }
    }
    pl.forEach(({ p, d }) => {
      const [x0, y0] = pt(p.lon, R3), [x1, y1] = pt(d, R3 - 9);
      s += `<line class="tick" x1="${x0}" y1="${y0}" x2="${x1}" y2="${y1}"/>`;
      const [gx, gy] = pt(d, RP), [dx, dy] = pt(d, RP - 21);
      s += `<text class="pg" x="${gx}" y="${gy}" style="fill:var(--pl-${p.key})">${g(p.sym)}<title>${esc(p.name)} ${C.fmtDeg(p.lon)} ${esc(p.pos.sign.name)}</title></text>`;
      s += `<text class="pd" x="${dx}" y="${dy}">${p.pos.d}°${p.retro ? 'R' : ''}</text>`;
    });
    // Sensitive Punkte (gold) am Innenkreis
    if (P.sens) ['Fortuna', 'Success', 'Love', 'Vertex'].forEach(k => {
      const sp = P.sens.byKey[k]; const [x, y] = pt(sp.lon, RA - 13); const [tx, ty] = pt(sp.lon, RA - 2);
      s += `<line class="tick" x1="${tx}" y1="${ty}" x2="${pt(sp.lon, RA - 6)[0]}" y2="${pt(sp.lon, RA - 6)[1]}" style="stroke:var(--brass)"/><text class="sp" x="${x}" y="${y}">${g(sp.sym)}<title>${esc(sp.name)} ${C.fmtDeg(sp.lon)} ${esc(sp.pos.sign.name)}</title></text>`;
    });
    return s + '</svg>';
  }

  /* ---------- Weltkarte ---------- */
  let mapOn = null;
  function worldMap(P, highlight, extra = {}) {
    if (!mapOn) mapOn = Object.fromEntries(C.PLANETS.map(p => [p.key, !['Node'].includes(p.key)]));
    const X = lon => (lon + 180).toFixed(2), Y = lat => (90 - lat).toFixed(2);
    let s = `<svg class="map" viewBox="0 0 360 180" role="img" aria-label="Weltkarte mit Planetenlinien">`;
    s += `<path class="land" d="${window.LAND_PATH}"/>`;
    for (let lo = -150; lo <= 150; lo += 30) s += `<line class="grat" x1="${X(lo)}" x2="${X(lo)}" y1="0" y2="180"/>`;
    for (let la = -60; la <= 60; la += 30) s += `<line class="grat" x1="0" x2="360" y1="${Y(la)}" y2="${Y(la)}" ${la === 0 ? 'style="stroke-width:.45"' : ''}/>`;
    P.lines.forEach(L => {
      if (!mapOn[L.key]) return;
      const col = `var(--pl-${L.key})`, sym = g(C.PL[L.key].sym);
      s += `<g data-k="${L.key}" style="stroke:${col}">`;
      s += `<line class="ln" x1="${X(L.mc)}" x2="${X(L.mc)}" y1="${Y(82)}" y2="${Y(-82)}"><title>${esc(C.PL[L.key].name)} MC</title></line>`;
      s += `<line class="ln ic" x1="${X(L.ic)}" x2="${X(L.ic)}" y1="${Y(82)}" y2="${Y(-82)}"><title>${esc(C.PL[L.key].name)} IC</title></line>`;
      [['asc', L.asc, 'AC'], ['dsc', L.dsc, 'DC']].forEach(([k, pts, nm]) => {
        let d = '', prev = null;
        pts.forEach(p => {
          if (!p) { prev = null; return; }
          d += (prev && Math.abs(p[0] - prev[0]) < 90 ? 'L' : 'M') + X(p[0]) + ' ' + Y(p[1]);
          prev = p;
        });
        s += `<path class="ln ${k}" d="${d}"><title>${esc(C.PL[L.key].name)} ${nm}</title></path>`;
      });
      s += `</g>`;
      s += `<text class="lbl" x="${X(L.mc)}" y="6.5" style="fill:${col}">${sym}</text><text class="lbl" x="${X(L.ic)}" y="178" style="fill:${col}">${sym}</text>`;
    });
    (extra.crosses || []).forEach(x => { s += `<circle class="cross" cx="${X(x.lon)}" cy="${Y(x.lat)}" r="1.6"><title>Schnittpunkt ${esc(C.PL[x.a.key].name)} ${x.a.kind} × ${esc(C.PL[x.b.key].name)} ${x.b.kind}</title></circle>`; });
    (highlight || []).forEach(h => { s += `<circle class="place" cx="${X(h.lon)}" cy="${Y(h.lat)}" r="1"><title>${esc(h.city)}</title></circle>`; });
    if (extra.reloc) s += `<circle class="home" cx="${X(extra.reloc.lon)}" cy="${Y(extra.reloc.lat)}" r="1.8" style="fill:var(--ink)"><title>${esc(extra.reloc.label)}</title></circle>`;
    s += `<circle class="home" cx="${X(P.b.lon)}" cy="${Y(P.b.lat)}" r="1.8"><title>Geburtsort</title></circle>`;
    return s + '</svg>';
  }
  function mapSection(P, highlight, idSuffix) {
    const toggles = C.PLANETS.map(p => `<button type="button" class="toggle" data-pl="${p.key}" aria-pressed="${mapOn ? mapOn[p.key] : p.key !== 'Node'}"><span class="dot" style="background:var(--pl-${p.key})"></span><span class="sym">${g(p.sym)}</span>${esc(p.name)}</button>`).join('');
    const legend = `<div class="legend">
      <span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke="currentColor" stroke-width="2"/></svg>MC: Beruf, Öffentlichkeit</span>
      <span><svg width="26" height="8"><line x1="0" x2="26" y1="4" y2="4" stroke="currentColor" stroke-width="2" stroke-dasharray="6 4"/></svg>IC: Zuhause, Familie</span>
      <span><svg width="26" height="8"><path d="M0 7 Q13 -3 26 7" fill="none" stroke="currentColor" stroke-width="2"/></svg>AC: Ausstrahlung, Neubeginn</span>
      <span><svg width="26" height="8"><path d="M0 7 Q13 -3 26 7" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="2 3"/></svg>DC: Partner, Beziehungen</span>
      <span><svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="var(--brass)"/></svg>Geburtsort</span></div>`;
    const good = F.nearestCitiesToLines(P, ['Venus', 'Jupiter', 'Sun'], null, 250, P.b.lat, P.b.lon).sort((a, b) => a.line.km - b.line.km).slice(0, 9);
    const hard = F.nearestCitiesToLines(P, ['Saturn', 'Mars', 'Pluto'], ['AC', 'MC', 'DC'], 150, P.b.lat, P.b.lon).sort((a, b) => a.home - b.home).slice(0, 3);
    const card = (x) => `<div class="placecard"><strong>${esc(x.city)}</strong><span class="small muted">${esc(x.country)} · <span class="sym" style="color:var(--pl-${x.line.key})">${g(C.PL[x.line.key].sym)}</span> ${esc(C.PL[x.line.key].name)}-${x.line.kind}-Linie, ${Math.round(x.line.km)} km entfernt</span><span class="small">${esc(T.acgPlanet[x.line.key])}, ${esc(T.acgAngle[x.line.kind])}.</span><button type="button" class="linkbtn" data-reloc="${esc(x.city)}" data-country="${esc(x.country)}">Ortswechselhoroskop für ${esc(x.city)}</button></div>`;
    const crosses = crossingsFor(P);
    const crossRows = crosses.map(x => `<tr><td><span class="sym" style="color:var(--pl-${x.a.key})">${g(C.PL[x.a.key].sym)}</span> ${esc(C.PL[x.a.key].name)} ${x.a.kind} <span class="muted">×</span> <span class="sym" style="color:var(--pl-${x.b.key})">${g(C.PL[x.b.key].sym)}</span> ${esc(C.PL[x.b.key].name)} ${x.b.kind}</td><td class="num">${Math.abs(x.lat).toFixed(1)}° ${x.lat >= 0 ? 'N' : 'S'}, ${Math.abs(x.lon).toFixed(1)}° ${x.lon >= 0 ? 'O' : 'W'}</td><td>${x.city ? `${esc(x.city.c[0])} <span class="small muted">(${Math.round(x.city.km)} km)</span>` : '<span class="muted">keine Stadt der Liste in der Nähe</span>'}</td><td>${esc(crossText(x))}</td></tr>`).join('');
    return `<section class="sheet" id="acg${idSuffix}">
      <div class="sheet-head"><div><span class="eyebrow">Astrokartographie</span><h2>Deine Planetenlinien auf der Weltkarte</h2></div></div>
      <p class="muted" style="max-width:72ch">Jede Linie zeigt, wo ein Planet im Moment deiner Geburt am Horizont aufging (AC), unterging (DC), am höchsten stand (MC) oder am tiefsten (IC). In der Nähe einer Linie, etwa bis 300 km, ist das Thema dieses Planeten für dich besonders spürbar.${P.b.unknownTime ? ' <strong>Ohne Geburtszeit sind die Linien nur ungefähr richtig.</strong>' : ''}</p>
      <div class="toggles" data-map="${idSuffix}">${toggles}</div>
      <div class="map-wrap" id="mapbox${idSuffix}">${worldMap(P, highlight)}</div>
      ${legend}
      <h3>Günstige Orte für dich</h3>
      <div class="placelist">${good.map(card).join('') || '<p class="muted">Keine Stadt der Liste liegt nahe an deinen Venus-, Jupiter- oder Sonnenlinien.</p>'}</div>
      ${hard.length ? `<h3>Orte mit mehr Reibung</h3><div class="placelist">${hard.map(card).join('')}</div>` : ''}
      <h3>Schnittpunkte deiner Linien</h3>
      <p class="muted small" style="max-width:72ch">Wo sich zwei Linien kreuzen, wirken beide Planeten zusammen. Auf der Karte sind diese Punkte als Ringe markiert. Der Breitengrad eines Schnittpunkts wirkt schwächer rund um die ganze Welt (Paran). Die Tabelle zeigt die Schnittpunkte, die deinem Geburtsort am nächsten liegen.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Linien</th><th>Lage</th><th>Nächste Stadt</th><th>Bedeutung</th></tr></thead><tbody>${crossRows}</tbody></table></div>
      <div class="howto">
        <h3>So liest du die Karte</h3>
        <p><strong>Wie die Städte gefunden werden.</strong> Für jede Stadt der Ortsliste misst die Seite den Abstand zur nächsten Linie, entlang des Breitengrads. Liegt eine Stadt näher als 250 km an einer Linie von Sonne, Venus oder Jupiter, erscheint sie bei den günstigen Orten. Bei Mars, Saturn und Pluto gilt eine Grenze von 150 km. Je näher eine Stadt an der Linie liegt, desto stärker wirkt sie.</p>
        <p><strong>Was die Linien bedeuten.</strong> Die Linien zeigen den Himmel im Moment deiner Geburt, übertragen auf die ganze Erde. Sie hängen nur von der Geburtszeit ab, nicht vom Geburtsort. An einem Ort auf einer MC-Linie stand dieser Planet im Moment deiner Geburt ganz oben am Himmel. Lebst du dort, tritt sein Thema im Beruf und in der Öffentlichkeit hervor. Auf einer AC-Linie prägt er dein Auftreten, auf einer DC-Linie deine Beziehungen, auf einer IC-Linie dein Zuhause.</p>
        <p><strong>Ortswechselhoroskop.</strong> Für einen bestimmten Ort rechnet die Seite dein Horoskop für denselben Geburtsmoment, aber mit den Häusern dieses Ortes. Die Planeten bleiben in ihren Zeichen, nur Aszendent, MC und die Häuser verschieben sich. So siehst du, welche Lebensbereiche an diesem Ort betont werden. Dazu kommen die Himmelsrichtung nach chinesischer Lehre und die Zahl des Ortsnamens.</p>
      </div>
      <div class="reloc" id="reloc${idSuffix}">
        <div><span class="eyebrow">Ortswechselhoroskop</span><h3>Dein Horoskop an einem anderen Ort</h3></div>
        <form class="reloc-form" data-relocform="${idSuffix}">
          <div class="field"><label for="rl-place${idSuffix}">Ort</label><input id="rl-place${idSuffix}" list="dl-places" autocomplete="off" placeholder="z.B. Budapest"></div>
          <div class="field"><label for="rl-country${idSuffix}">Land</label><input id="rl-country${idSuffix}" list="dl-countries" autocomplete="off" placeholder="z.B. Ungarn"></div>
          <button class="btn" type="submit">Berechnen</button>
        </form>
        <div class="err" id="rl-err${idSuffix}" role="alert"></div>
        <div id="rl-out${idSuffix}"></div>
      </div>
    </section>`;
  }
  function crossingsFor(P) {
    const PERSONAL = ['Sun', 'Moon', 'Mercury', 'Venus', 'Jupiter'];
    const kmTo = (lat, lon, la2, lo2) => Math.hypot((lat - la2) * 111.2, C.norm180(lon - lo2) * 111.2 * Math.cos(((lat + la2) / 2) * Math.PI / 180));
    return C.acgCrossings(P.lines.filter(l => l.key !== 'Node'))
      .filter(x => Math.abs(x.lat) < 70 && (PERSONAL.includes(x.a.key) || PERSONAL.includes(x.b.key)))
      .map(x => {
        let city = null;
        window.CITIES.forEach(c => { const km = kmTo(x.lat, x.lon, c[2], c[3]); if (km <= 350 && (!city || km < city.km)) city = { c, km }; });
        return { ...x, city, home: kmTo(x.lat, x.lon, P.b.lat, P.b.lon) };
      })
      .sort((a, b) => a.home - b.home).slice(0, 10);
  }
  function crossText(x) {
    const GOOD = ['Sun', 'Venus', 'Jupiter', 'Moon', 'Mercury'];
    const both = GOOD.includes(x.a.key) && GOOD.includes(x.b.key);
    const tone = both ? 'Eine harmonische Verbindung' : 'Eine spannungsreiche, aber kraftvolle Verbindung';
    return `${tone}: ${T.acgPlanet[x.a.key]} trifft auf ${T.acgPlanet[x.b.key]}.`;
  }
  const DIR_REL = {
    resource: 'Die Richtung nährt dich. Ein guter Ort zum Lernen, Erholen und Auftanken.',
    peer: 'Die Richtung stärkt dein Selbstvertrauen, bringt aber auch Konkurrenz.',
    output: 'Hier gibst du viel von dir. Gut für kreative Arbeit und Auftritte, auf Dauer anstrengend.',
    wealth: 'Du beherrschst das Element dieser Richtung. Ein guter Ort für Geld und Ergebnisse.',
    power: 'Das Element dieser Richtung kontrolliert dich. Der Ort fordert Disziplin und bringt Druck von aussen.'
  };
  const CN_DIR = [['Norden', 'Wasser'], ['Nordosten', 'Erde'], ['Osten', 'Holz'], ['Südosten', 'Holz'], ['Süden', 'Feuer'], ['Südwesten', 'Erde'], ['Westen', 'Metall'], ['Nordwesten', 'Metall']];
  function bearing(la1, lo1, la2, lo2) {
    const r = Math.PI / 180, y = Math.sin((lo2 - lo1) * r) * Math.cos(la2 * r);
    const x = Math.cos(la1 * r) * Math.sin(la2 * r) - Math.sin(la1 * r) * Math.cos(la2 * r) * Math.cos((lo2 - lo1) * r);
    return C.norm(Math.atan2(y, x) / r);
  }
  function relocationHtml(P, loc) {
    const R = C.relocate(P.natal, P.b.utc.date, loc.lat, loc.lon);
    const asc = C.signOf(R.houses.asc), mc = C.signOf(R.houses.mc);
    const shifts = R.planets.filter(p => ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'].includes(p.key) && p.house !== p.natalHouse)
      .map(p => `<li>${esc(p.name)}: zu Hause im ${p.natalHouse}., hier im ${p.house}. Haus (${esc(T.house[p.house])})</li>`).join('');
    const ang = R.angular.map(a => `<li><strong>${esc(a.p.name)} am ${a.angle}</strong> (${a.orb.toFixed(1)}°): ${esc(T.acgPlanet[a.p.key])}, ${esc(T.acgAngle[a.angle])}.</li>`).join('');
    const lines = C.lineDistances(P.lines.filter(l => l.key !== 'Node'), loc.lat, loc.lon).filter(d => d.km <= 400).slice(0, 4)
      .map(d => `<li>${esc(C.PL[d.key].name)}-${d.kind}-Linie, ${Math.round(d.km)} km</li>`).join('');
    const dist = Math.hypot((loc.lat - P.b.lat) * 111.2, C.norm180(loc.lon - P.b.lon) * 111.2 * Math.cos(P.b.lat * Math.PI / 180));
    let cn;
    if (dist < 30) cn = '<p class="small">Der Ort liegt an deinem Geburtsort, die Himmelsrichtung spielt keine Rolle.</p>';
    else {
      const [dir, el] = CN_DIR[Math.round(bearing(P.b.lat, P.b.lon, loc.lat, loc.lon) / 45) % 8];
      const rel = C.elementRelation(P.chinese.dayMaster.el, el);
      cn = `<p class="small">Von deinem Geburtsort aus liegt der Ort im <strong>${dir}</strong>. Diese Richtung gehört zum Element ${el}. Für deinen Tagesmeister ${esc(P.chinese.dayMaster.el)} bedeutet das <strong>${esc(rel.name)}</strong>: ${esc(DIR_REL[rel.key])}</p>`;
    }
    const nn = C.nameNumber(loc.label.split(',')[0]);
    const nh = nn ? C.numHarmony(nn, P.num.lifePath) : 0;
    const num = nn ? `<p class="small">Der Ortsname ergibt die Zahl <strong>${nn}</strong> (${esc(T.lifePath[nn][0])}). ${nh >= 1 ? `Sie harmoniert mit deiner Lebenszahl ${P.num.lifePath}.` : nh > 0 ? `Sie gleicht deiner Lebenszahl ${P.num.lifePath} und verstärkt sie.` : `Sie steht neutral zu deiner Lebenszahl ${P.num.lifePath}.`} ${esc(T.lifePath[nn][1])}</p>` : '';
    return `<p><strong>${esc(loc.label)}</strong>: Aszendent ${C.fmtDeg(R.houses.asc)} ${esc(asc.sign.name)} (zu Hause ${esc(P.natal.byKey.ASC.pos.sign.name)}), MC ${C.fmtDeg(R.houses.mc)} ${esc(mc.sign.name)} (zu Hause ${esc(P.natal.byKey.MC.pos.sign.name)}). Am neuen Ort wirkst du ${esc(T.signTrait[asc.sign.name])}.</p>
      <div class="reloc-grid">
        <div class="reloc-card"><span class="eyebrow">Westlich · Achsen</span>${ang ? `<ul>${ang}</ul>` : '<p class="small">Kein Planet steht hier nahe an einer Achse. Der Ort wirkt eher ruhig und neutral.</p>'}</div>
        <div class="reloc-card"><span class="eyebrow">Westlich · Häuser</span>${shifts ? `<ul>${shifts}</ul>` : '<p class="small">Die Planeten bleiben in denselben Häusern wie an deinem Geburtsort.</p>'}</div>
        <div class="reloc-card"><span class="eyebrow">Astrokartographie</span>${lines ? `<ul>${lines}</ul>` : '<p class="small">Keine deiner Linien verläuft näher als 400 km.</p>'}</div>
        <div class="reloc-card"><span class="eyebrow">Chinesisch und Numerologie</span>${cn}${num}</div>
      </div>`;
  }
  const relocState = {};
  function bindMap(P, highlight, idSuffix) {
    const extra = () => ({ crosses: crossingsFor(P), reloc: relocState[idSuffix] });
    const redraw = () => { $('#mapbox' + idSuffix).innerHTML = worldMap(P, highlight, extra()); };
    redraw();
    document.querySelectorAll(`[data-map="${idSuffix}"] .toggle`).forEach(b => b.addEventListener('click', () => {
      const k = b.dataset.pl; mapOn[k] = !mapOn[k]; b.setAttribute('aria-pressed', mapOn[k]);
      redraw();
    }));
    const run = async (place, country) => {
      $('#rl-err' + idSuffix).textContent = '';
      if (P.b.unknownTime) { $('#rl-err' + idSuffix).textContent = 'Für ein Ortswechselhoroskop braucht es die Geburtszeit.'; return; }
      try {
        const loc = await geocode(place, country, '', '');
        relocState[idSuffix] = loc;
        $('#rl-out' + idSuffix).innerHTML = relocationHtml(P, loc);
        redraw();
      } catch (e) { $('#rl-err' + idSuffix).textContent = e.message.replace(' oder gib unten Breite und Länge ein', ''); }
    };
    const form = document.querySelector(`[data-relocform="${idSuffix}"]`);
    form.addEventListener('submit', e => { e.preventDefault(); run($('#rl-place' + idSuffix).value.trim(), $('#rl-country' + idSuffix).value.trim()); });
    document.querySelectorAll(`#acg${idSuffix} [data-reloc]`).forEach(b => b.addEventListener('click', () => {
      $('#rl-place' + idSuffix).value = b.dataset.reloc; $('#rl-country' + idSuffix).value = b.dataset.country;
      run(b.dataset.reloc, b.dataset.country);
      $('#reloc' + idSuffix).scrollIntoView({ behavior: 'smooth', block: 'start' });
    }));
    if (relocState[idSuffix]) $('#rl-out' + idSuffix).innerHTML = relocationHtml(P, relocState[idSuffix]);
  }

  /* ---------- Profil-Sektionen ---------- */
  function westernSection(P) {
    const n = P.natal, noTime = P.b.unknownTime;
    const big = ['Sun', 'Moon', 'ASC'].filter(k => !(noTime && k === 'ASC')).map(k => {
      const p = n.byKey[k];
      return `<div class="big3"><span class="eyebrow">${esc(T.pointRole[k])}</span><span class="v"><span class="sym">${g(p.pos.sign.sym)}</span> ${esc(p.name)} in ${esc(p.pos.sign.name)}</span><span class="s">${esc(T.signTrait[p.pos.sign.name])}${p.house && !noTime && k !== 'ASC' ? `, wirkt im ${p.house}. Haus (${esc(T.house[p.house])})` : ''}.</span></div>`;
    }).join('');
    const rows = n.points.filter(p => !(noTime && ['ASC', 'MC'].includes(p.key))).map(p => `<tr><td><span class="sym" style="color:var(--pl-${p.key}, var(--brass))">${g(p.sym)}</span> ${esc(p.name)}</td><td><span class="sym">${g(p.pos.sign.sym)}</span> ${esc(p.pos.sign.name)}</td><td class="num">${C.fmtDeg(p.lon)}${p.retro ? ' R' : ''}</td><td class="num">${noTime ? '–' : p.house}</td></tr>`).join('');
    const asp = n.aspects.filter(a => !(noTime && (['ASC', 'MC'].includes(a.p.key) || ['ASC', 'MC'].includes(a.q.key)))).slice(0, 14).map(a => `<tr><td>${esc(a.p.name)} <span class="sym">${g(a.asp.sym)}</span> ${esc(a.q.name)}</td><td>${esc(a.asp.name)}</td><td class="num">${a.orb.toFixed(1)}°</td></tr>`).join('');
    const cusps = noTime ? '' : `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Haus</th><th>Spitze</th><th>Haus</th><th>Spitze</th></tr></thead><tbody>${[0, 1, 2, 3, 4, 5].map(i => {
      const a = n.houses.cusps[i], b = n.houses.cusps[i + 6];
      return `<tr><td class="num">${i + 1}</td><td><span class="sym">${g(C.signOf(a).sign.sym)}</span> <span class="num">${C.fmtDeg(a)}</span></td><td class="num">${i + 7}</td><td><span class="sym">${g(C.signOf(b).sign.sym)}</span> <span class="num">${C.fmtDeg(b)}</span></td></tr>`;
    }).join('')}</tbody></table></div>`;
    const balSum = Object.values(n.balance).reduce((a, b) => a + b, 0) || 1;
    const bal = Object.entries(n.balance).map(([k, v]) => meter(k, Math.round(v / balSum * 100), Math.round(v / balSum * 100) + '%', 'var(--brass)')).join('');
    return `<section class="sheet" id="western">
      <div class="sheet-head"><div><span class="eyebrow">Westliche Astrologie · tropisch · ${noTime ? 'ohne Häuser' : n.houses.system}</span><h2>Dein Geburtshoroskop</h2></div></div>
      <div class="summary3">${big}</div>
      <div class="chart-grid">
        ${wheel(P)}
        <div style="display:grid;gap:18px;min-width:0">
          <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Planet</th><th>Zeichen</th><th>Grad</th><th>Haus</th></tr></thead><tbody>${rows}</tbody></table></div>
          ${cusps}
        </div>
      </div>
      <div class="chart-grid">
        <div style="display:grid;gap:10px;min-width:0"><h3>Wichtigste Aspekte</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Aspekt</th><th>Art</th><th>Orbis</th></tr></thead><tbody>${asp}</tbody></table></div></div>
        <div style="display:grid;gap:10px;align-content:start"><h3>Elemente</h3><div class="meters">${bal}</div><p class="small muted">Gewichtet nach Sonne, Mond und Aszendent (je 3), persönlichen Planeten (je 1) und äusseren Planeten (je 0,5).</p></div>
      </div>
    </section>`;
  }
  function sensitiveSection(P) {
    if (!P.sens) return `<section class="sheet" id="sensitive"><div class="sheet-head"><div><span class="eyebrow">Sensitive Punkte</span><h2>Sensitive Punkte</h2></div></div><p class="muted">Die sensitiven Punkte werden aus dem Aszendenten berechnet. Ohne Geburtszeit lassen sie sich nicht bestimmen.</p></section>`;
    const rows = P.sens.list.map(sp => {
      const [short, long] = T.sensitive[sp.key];
      const near = sp.near.length ? ` Der Punkt steht nahe bei ${sp.near.join(' und ')}, das verstärkt ihn deutlich.` : '';
      const reading = `${short} Im Zeichen ${sp.pos.sign.name} wirkt der Punkt ${T.signTrait[sp.pos.sign.name]}; im ${sp.house}. Haus zeigt er sich im Bereich ${T.house[sp.house]}.${near}`;
      return `<tr><td class="sym-gold">${g(sp.sym)}</td><td><div class="sens-name"><strong>${esc(sp.name)}</strong><small>${esc(sp.formula)}</small></div></td><td class="num">${C.fmtDeg(sp.lon)} <span class="sym">${g(sp.pos.sign.sym)}</span> ${esc(sp.pos.sign.name)}</td><td class="num">${sp.house}</td><td><span>${esc(reading)}</span><br><span class="small muted">${esc(long)}</span></td></tr>`;
    }).join('');
    return `<section class="sheet" id="sensitive">
      <div class="sheet-head"><div><span class="eyebrow">Sensitive Punkte · ${P.sens.day ? 'Taggeburt' : 'Nachtgeburt'}</span><h2>Deine sensitiven Punkte</h2></div></div>
      <p class="muted" style="max-width:72ch">Sensitive Punkte sind berechnete Orte im Horoskop, keine Himmelskörper. Sie entstehen aus den Abständen zwischen Aszendent, MC und Planeten und zeigen, wo bestimmte Lebensthemen für dich besonders ansprechbar sind. Wenn ein Planet im Transit darüber läuft, wird das Thema aktiv. Der Glückspunkt ist nach der Formel von Andrea Buchholz berechnet, mit Tausch von Sonne und Mond bei Nachtgeburt. Die übrigen Punkte folgen den üblichen Formeln. Im Rad oben sind ⊗ Glückspunkt, ★ Erfolgspunkt, ♡ Liebespunkt und Vx Vertex in Gold eingezeichnet.</p>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>Punkt</th><th>Position</th><th>Haus</th><th>Bedeutung für dich</th></tr></thead><tbody>${rows}</tbody></table></div>
    </section>`;
  }
  function chineseSection(P) {
    const ch = P.chinese;
    const pil = [['Jahr', ch.pillars.year], ['Monat', ch.pillars.month], ['Tag', ch.pillars.day], ['Stunde', ch.pillars.hour]].map(([l, p]) => p
      ? `<div class="pillar ${l === 'Tag' ? 'dm' : ''}"><span class="eyebrow">${l}${l === 'Tag' ? ' · Tagesmeister' : ''}</span><span class="han">${p.stem.ch}<br>${p.branch.ch}</span><span class="small"><strong>${p.stem.yy}-${p.stem.el}</strong><br>${p.branch.animal}</span></div>`
      : `<div class="pillar"><span class="eyebrow">${l}</span><span class="han">–</span><span class="small muted">Geburtszeit unbekannt</span></div>`).join('');
    const lny = new Date(ch.lny.getTime() + 8 * 3600000);
    const max = Math.max(...Object.values(ch.counts), 1);
    const el = Object.entries(ch.counts).map(([k, v]) => meter(k, Math.round(v / max * 100), v, 'var(--brass)')).join('');
    const sup = C.supportingElement(ch.dayMaster.el);
    return `<section class="sheet" id="chinese">
      <div class="sheet-head"><div><span class="eyebrow">Chinesische Astrologie · Ba Zi</span><h2>${esc(ch.animal.stem.el)}-${esc(ch.animal.branch.animal)} <span class="han">${ch.animal.stem.ch}${ch.animal.branch.ch}</span></h2></div></div>
      <p style="max-width:72ch">Dein Tierzeichen ist der ${esc(ch.animal.branch.animal)}: ${esc(T.animal[ch.animal.branch.animal])}. Das Element ${esc(ch.animal.stem.el)} steht für ${esc(T.element[ch.animal.stem.el])}. Dein Tagesmeister <span class="han">${ch.dayMaster.ch}</span> (${esc(ch.dayMaster.yy)}-${esc(ch.dayMaster.el)}) beschreibt deinen Kern; gestärkt wirst du durch ${esc(sup)} (Farbe ${esc(T.elementColor[sup][0])}, Richtung ${esc(T.elementDir[sup])}).</p>
      <div class="pillars">${pil}</div>
      <div class="chart-grid">
        <div class="meters"><h3>Fünf Elemente in deinen Säulen</h3>${el}</div>
        <p class="small muted">Das Tierzeichen richtet sich nach dem chinesischen Neujahr (im Geburtsjahr am ${lny.getUTCDate()}.${lny.getUTCMonth() + 1}.${lny.getUTCFullYear()}). Die Jahres- und Monatssäule im Ba Zi beginnen mit dem Frühlingsanfang Lichun (Sonne auf 315°) und den Sonnenterminen. Die Stundensäule nutzt die Ortszeit.</p>
      </div>
    </section>`;
  }
  function numerologySection(P, refY, refM) {
    const n = P.num, py = C.personalYear(P.b, refY), pm = C.personalMonth(P.b, refY, refM);
    const card = (label, v, text) => v == null ? '' : `<div class="numcard"><span class="eyebrow">${label}</span><span class="n">${v}</span><span class="small">${esc(text)}</span></div>`;
    return `<section class="sheet" id="numerology">
      <div class="sheet-head"><div><span class="eyebrow">Numerologie · pythagoreisch</span><h2>Lebenszahl ${n.lifePath}: ${esc(T.lifePath[n.lifePath][0])}</h2></div></div>
      <p style="max-width:72ch">${esc(T.lifePath[n.lifePath][1])}</p>
      <div class="numgrid">
        ${card('Lebenszahl', n.lifePath, T.lifePath[n.lifePath][0])}
        ${card('Geburtstagszahl', n.birthday, T.lifePath[n.birthday] ? T.lifePath[n.birthday][1] : '')}
        ${card(`Persönliches Jahr ${refY}`, py, T.personalYear[py])}
        ${card(`Persönlicher Monat`, pm, T.personalDay[pm].replace('tag', 'monat').replace('Tag', 'Monat'))}
        ${card('Ausdruckszahl (Name)', n.expression, n.expression ? T.lifePath[n.expression][1] : '')}
        ${card('Seelenzahl (Vokale)', n.soul, n.soul ? 'Was du dir im Innersten wünschst: ' + T.lifePath[n.soul][0] + '.' : '')}
      </div>
      ${n.expression ? '' : '<p class="small muted">Gib oben deinen Namen ein, um Ausdrucks- und Seelenzahl zu sehen.</p>'}
    </section>`;
  }

  /* ---------- Exakte Zeitpunkte ---------- */
  const TM = () => window.Timing, CAL = () => window.CalendarExport;
  const LASTS = { Moon: 'einige Stunden', Sun: 'etwa 1 bis 2 Tage', Mercury: 'etwa 1 bis 2 Tage', Venus: 'etwa 1 bis 2 Tage', Mars: 'etwa 2 bis 4 Tage', Jupiter: 'mehrere Wochen', Saturn: 'mehrere Wochen bis Monate', Uranus: 'mehrere Monate', Neptune: 'mehrere Monate', Pluto: 'mehrere Monate' };
  const ANGLE_NAMES = { AC: 'Aszendent', MC: 'Himmelsmitte (MC)', DC: 'Deszendent', IC: 'Himmelstiefe (IC)' };
  let timePlace = null; // Ort für die Tageszeiten (Achsen)
  let evStore = {};    // Kalendereinträge der aktuellen Ansicht, nach Id
  function natalTargets(P, keys) {
    return P.natal.points.filter(p => p.key !== 'Node' && (!keys || keys.includes(p.key))).map(p => ({ key: p.key, name: p.name, sym: p.sym, lon: p.lon, w: p.w, kind: 'natal' }));
  }
  function sensTargets(P) {
    return P.sens ? P.sens.list.filter(sp => sp.key !== 'AntiVertex').map(sp => ({ key: sp.key, name: sp.name, sym: sp.sym, lon: sp.lon, w: 1.5, kind: 'sens', sp })) : [];
  }
  function hitTitle(h) {
    const sign = h.value >= 0 ? '+' : '–';
    return `${sign} ${h.t.name} ${h.asp.name} ${h.n.kind === 'sens' ? h.n.name : 'Radix-' + h.n.name}${h.retro ? ' (rückläufig)' : ''}`;
  }
  function hitMeaning(h) {
    if (h.n.kind === 'sens') {
      const good = h.value >= 0;
      return `${T.sensitive[h.n.key][0]} ${h.asp.key === 'conj' ? (good ? 'Der Planet läuft direkt über den Punkt und öffnet das Thema.' : 'Der Planet läuft direkt über den Punkt und fordert Arbeit an diesem Thema.') : good ? 'Das Thema wird harmonisch angeregt.' : 'Das Thema wird unter Spannung gesetzt.'}`;
    }
    return `${h.t.name} ${F.transitSentence({ t: h.t, n: h.n, asp: h.asp })}.`;
  }
  function hitEvent(h, f, tz) {
    const id = `tr-${h.t.key}-${h.n.key}-${h.asp.key}-${h.when.getTime()}`;
    const e = { id, start: h.when, end: new Date(h.when.getTime() + 30 * 60000), summary: hitTitle(h),
      description: `Exakt am ${f.dateY(h.when)} um ${f.time(h.when)} Uhr (${tz}). Am stärksten zu diesem Zeitpunkt, spürbar ${LASTS[h.t.key]} davor und danach.\n${hitMeaning(h)}` };
    evStore[id] = e; return e;
  }
  function angleEvent(a, f, tz, placeLabel, extra) {
    const tg = a.target;
    const id = `ax-${a.angle}-${tg.key}-${a.when.getTime()}-${Math.round(a.lat * 100)}`;
    const e = { id, start: new Date(a.when.getTime() - 15 * 60000), end: new Date(a.when.getTime() + 15 * 60000),
      summary: `${tg.line ? `${tg.city}: ${tg.name}-${tg.line}-Linie aktiv` : `${a.angle} über ${tg.name}`} · ${f.time(a.when)}`,
      description: `Um ${f.time(a.when)} Uhr (${tz}) steht in ${placeLabel} der laufende ${ANGLE_NAMES[a.angle]} exakt auf ${tg.line ? 'deinem Radix-' + tg.name : 'deinem ' + tg.name} (${C.fmtDeg(tg.lon)} ${C.signOf(tg.lon).sign.name}). Am stärksten etwa 15 Minuten davor und danach, als Tagesfenster rund eine Stunde.${extra ? '\n' + extra : ''}` };
    evStore[id] = e; return e;
  }
  const calBtns = e => `<span class="calbtns"><button type="button" class="linkbtn" data-ics="${esc(e.id)}" title="Als .ics-Datei für Apple, Outlook und Google">+ Kalender</button> <a class="linkbtn" href="${esc(CAL().googleUrl(e))}" target="_blank" rel="noopener">Google</a></span>`;
  function bindCal(scope) {
    scope.querySelectorAll('[data-ics]').forEach(b => b.addEventListener('click', () => {
      const e = evStore[b.dataset.ics]; if (!e) return;
      CAL().download(`${e.summary.replace(/[^\wäöüÄÖÜ]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)}.ics`, CAL().eventsIcs([e], 'Horoskop'));
    }));
  }
  function transitTable(hits, f, tz, withYear) {
    if (!hits.length) return '<p class="muted">In diesem Zeitraum wird kein Aspekt exakt.</p>';
    const rows = hits.map(h => {
      const e = hitEvent(h, f, tz);
      return `<tr><td class="num">${esc(withYear ? f.dateY(h.when) : f.date(h.when))}</td><td class="num"><strong>${f.time(h.when)}</strong></td>
        <td><span class="sym" style="color:var(--pl-${h.t.key})">${g(h.t.sym)}</span> <span class="chip ${h.value >= 0 ? 'pos' : 'neg'}">${esc(h.t.name)} ${esc(h.asp.name)} ${h.n.kind === 'sens' ? `<span class="sym-gold">${g(h.n.sym)}</span> ` : ''}${esc(h.n.kind === 'sens' ? h.n.name : 'Radix-' + h.n.name)}</span>${h.retro ? ' <span class="small muted">℞</span>' : ''}${h.n.kind === 'sens' ? `<br><span class="small muted">${C.fmtDeg(h.n.lon)} ${esc(h.n.sp.pos.sign.name)}, ${h.n.sp.house}. Haus</span>` : ''}</td>
        <td class="small">${esc(LASTS[h.t.key])}</td><td class="small">${esc(hitMeaning(h))}</td><td>${calBtns(e)}</td></tr>`;
    }).join('');
    return `<div class="tbl-wrap tbl-scroll"><table class="tbl"><thead><tr><th>Tag</th><th>Exakt</th><th>Ereignis</th><th>Spürbar</th><th>Bedeutung</th><th>Kalender</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  // Matrix: Zeilen = Ziel und Achse, Spalten = Tage
  function angleMatrix(list, dayKeys, dayLabels, f) {
    const groups = new Map();
    list.forEach(a => { const k = a.target.rowKey + '|' + a.angle; if (!groups.has(k)) groups.set(k, { a, byDay: {} }); (groups.get(k).byDay[f.dayKey(a.when)] = groups.get(k).byDay[f.dayKey(a.when)] || []).push(a); });
    const rows = [...groups.values()].map(gr => `<tr><td>${gr.a.target.label}</td><td class="num">${gr.a.angle}</td>${dayKeys.map(k => `<td class="num">${(gr.byDay[k] || []).map(a => f.time(a.when)).join('<br>') || '–'}</td>`).join('')}</tr>`).join('');
    return `<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Punkt</th><th>Achse</th>${dayLabels.map(l => `<th>${l}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div>`;
  }
  function worldLineTargets(P, places) {
    const seen = new Set(), out = [];
    const add = (city, country, lat, lon, key, kind) => {
      const k = city + key + kind; if (seen.has(k) || key === 'Node') return; seen.add(k);
      const pl = P.natal.byKey[key];
      out.push({ city, country, lat, lon, key, kind, target: { key, name: pl.name, sym: pl.sym, lon: pl.lon, line: kind, city, rowKey: k, label: `<strong>${esc(city)}</strong> <span class="small muted">${esc(country)}</span><br><span class="sym" style="color:var(--pl-${key})">${g(pl.sym)}</span> ${esc(pl.name)}-${kind}-Linie`, angles: [kind] } });
    };
    places.slice(0, 3).forEach(x => add(x.city, x.country, x.lat, x.lon, x.line.key, x.line.kind));
    crossingsFor(P).filter(x => x.city).forEach(x => { [x.a, x.b].forEach(l => add(x.city.c[0], x.city.c[1], x.city.c[2], x.city.c[3], l.key, l.kind)); });
    return out;
  }
  const KEY_SENS = ['Fortuna', 'Success', 'Love', 'Career', 'Spirit', 'Marriage', 'Vertex', 'Eros', 'Victory', 'Exaltation'];

  function weekTimingSection(P, W) {
    const tz = TM().userTz(P), f = TM().fmt(tz);
    const d0 = W.days[0], d7 = W.days[6];
    const t0 = C.localToUtc(d0.y, d0.m, d0.d, 0, 0, tz).date.getTime();
    const e7 = new Date(Date.UTC(d7.y, d7.m - 1, d7.d) + C.DAY);
    const t1 = C.localToUtc(e7.getUTCFullYear(), e7.getUTCMonth() + 1, e7.getUTCDate(), 0, 0, tz).date.getTime();
    const planets = C.PLANETS.filter(p => p.key !== 'Node').map(p => p.key);
    const natalHits = TM().transitTimes(planets, natalTargets(P), t0, t1);
    const sensHits = P.sens ? TM().transitTimes(planets.filter(k => k !== 'Moon'), sensTargets(P), t0, t1) : [];
    const hits = natalHits.concat(sensHits).sort((a, b) => a.when - b.when);
    const dayKeys = W.days.map(d => `${d.y}-${pad(d.m)}-${pad(d.d)}`);
    const dayLabels = W.days.map(d => `${shortWd(d.wd)} ${d.d}.${d.m}.`);
    const place = timePlace || { lat: P.b.lat, lon: P.b.lon, label: input && input.placeLabel ? input.placeLabel : 'Geburtsort' };
    let axisHtml = '<p class="muted">Ohne Geburtszeit gibt es keine sensitiven Punkte.</p>', axisEvents = [];
    if (P.sens) {
      const tg = sensTargets(P).map(s => ({ ...s, rowKey: s.key, label: `<span class="sym-gold">${g(s.sym)}</span> ${esc(s.name)} <span class="small muted">${C.fmtDeg(s.lon)} ${esc(s.sp.pos.sign.name)}</span>`, angles: ['AC', 'MC'] }));
      const ax = TM().angleTimes(tg, place.lat, place.lon, t0, t1);
      axisEvents = ax.map(a => angleEvent(a, f, tz, place.label, T.sensitive[a.target.key][0]));
      const main = ax.filter(a => KEY_SENS.includes(a.target.key)), rest = ax.filter(a => !KEY_SENS.includes(a.target.key));
      axisHtml = angleMatrix(main, dayKeys, dayLabels, f) + (rest.length ? `<details class="more"><summary>Alle übrigen sensitiven Punkte anzeigen</summary>${angleMatrix(rest, dayKeys, dayLabels, f)}</details>` : '');
    }
    const wl = worldLineTargets(P, W.optimal.places || []);
    let wlEvents = [], wlList = [];
    wl.forEach(x => { const r = TM().angleTimes([x.target], x.lat, x.lon, t0, t1); wlList = wlList.concat(r); wlEvents = wlEvents.concat(r.map(a => angleEvent(a, f, tz, x.city, `${T.acgPlanet[x.key]} wirken dort ${T.acgAngle[x.kind]}.`))); });
    const hitEvents = hits.map(h => hitEvent(h, f, tz));
    const html = `<section class="sheet" id="timing">
      <div class="sheet-head"><div><span class="eyebrow">Exakte Zeitpunkte · Zeiten in ${esc(tz)}</span><h2>Wann es genau am stärksten ist</h2></div>
        <div class="cal-export"><button type="button" class="btn ghost" id="cal-all">Alle exakten Transite in Kalender</button><span class="small muted">${hits.length} Termine mit Uhrzeit, dazu die Tageswerte</span></div></div>
      <p class="muted" style="max-width:76ch">Ein Transit wirkt nicht nur in einer Minute: Er baut sich auf, ist zum exakten Zeitpunkt am stärksten und klingt wieder ab. Wie lange, hängt vom Planeten ab (Spalte „Spürbar“). Innerhalb des Tages gibt es zusätzlich einen genauen Auslöser: Wenn der laufende Aszendent oder das MC deines Aufenthaltsortes über einen sensitiven Punkt oder eine deiner Linien läuft. Das geschieht jeden Tag einmal und dauert nur kurz, am stärksten etwa 15 Minuten davor und danach. Auf diese Zeit kannst du dich gezielt fokussieren.</p>
      <h3>Transite, die diese Woche exakt werden</h3>
      ${transitTable(hits, f, tz, false)}
      <h3 style="margin-top:18px">Tageszeiten: Aszendent und MC über deinen sensitiven Punkten</h3>
      <div class="timeplace"><div class="field"><label for="f-tplace">Aufenthaltsort für die Tageszeiten</label><input id="f-tplace" list="dl-places" autocomplete="off" value="${esc(place.label.split(',')[0])}"></div><button type="button" class="btn ghost" id="tplace-btn">Ort übernehmen</button><button type="button" class="btn ghost" id="cal-axis">Achsenzeiten in Kalender</button><span class="small muted" id="tplace-err" role="alert"></span></div>
      <p class="small muted">Jede Zeit ist der Moment, in dem der Punkt in ${esc(place.label)} exakt am Aszendenten aufgeht (AC) oder am höchsten steht (MC).</p>
      ${axisHtml}
      <h3 style="margin-top:18px">Weltlinien: wann deine Linien an diesen Orten täglich exakt sind</h3>
      <p class="small muted" style="max-width:76ch">Für die Glücksorte der Woche und die Städte an deinen Linienkreuzungen: Um diese Uhrzeit (deine Ortszeit) steht dort die laufende Achse genau auf dem Grad deines Radix-Planeten. Wer dort ist, erlebt das Thema der Linie in dieser Zeit am deutlichsten. Planst du dort ein Gespräch, einen Termin oder eine Ankunft, ist das der beste Zeitpunkt.</p>
      ${wl.length ? angleMatrix(wlList, dayKeys, dayLabels, f) + '<div style="margin-top:8px"><button type="button" class="btn ghost" id="cal-wl">Weltlinien-Zeiten in Kalender</button></div>' : '<p class="muted">Keine Linienorte in Reichweite.</p>'}
    </section>`;
    const bind = () => {
      const box = $('#timing'); bindCal(box);
      const name = `${F.fmtDate(d0.date)} bis ${F.fmtDateY(d7.date)}`;
      const fn = s => `horoskop-${s}-${dayKeys[0]}.ics`;
      $('#cal-all').addEventListener('click', () => CAL().download(fn('woche'), CAL().eventsIcs(CAL().dayEvents(P, W).concat(hitEvents), 'Horoskop ' + name)));
      $('#cal-axis').addEventListener('click', () => CAL().download(fn('achsen'), CAL().eventsIcs(axisEvents, 'Achsenzeiten ' + name)));
      const wlb = $('#cal-wl'); if (wlb) wlb.addEventListener('click', () => CAL().download(fn('weltlinien'), CAL().eventsIcs(wlEvents, 'Weltlinien ' + name)));
      $('#tplace-btn').addEventListener('click', async () => {
        try { const loc = await geocode($('#f-tplace').value.trim(), '', '', ''); timePlace = loc; store.set('astro-timeplace', loc); renderWeek(); document.getElementById('timing').scrollIntoView({ block: 'start' }); }
        catch (e) { $('#tplace-err').textContent = e.message.replace('Geburtsort', 'Ort'); }
      });
    };
    return { html, bind, hitEvents };
  }

  function longTimingSection(P, L) {
    const tz = TM().userTz(P), f = TM().fmt(tz);
    const t0 = C.localToUtc(L.start.getUTCFullYear(), L.start.getUTCMonth() + 1, 1, 0, 0, tz).date.getTime();
    const e = new Date(L.end.getTime() + C.DAY);
    const t1 = C.localToUtc(e.getUTCFullYear(), e.getUTCMonth() + 1, e.getUTCDate(), 0, 0, tz).date.getTime();
    const slow = ['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
    const natal = TM().transitTimes(slow, natalTargets(P, ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'ASC', 'MC']), t0, t1);
    const sens = P.sens ? TM().transitTimes(slow, sensTargets(P), t0, t1) : [];
    const sunOnSens = P.sens ? TM().transitTimes(['Sun'], sensTargets(P), t0, t1, { aspects: ['conj'] }) : [];
    const all = natal.concat(sens).sort((a, b) => a.when - b.when);
    const evs = all.concat(sunOnSens).map(h => hitEvent(h, f, tz));
    const html = `<section class="sheet" id="ltiming">
      <div class="sheet-head"><div><span class="eyebrow">Exakte Zeitpunkte · Zeiten in ${esc(tz)}</span><h2>Wann die grossen Transite genau exakt sind</h2></div>
        <div class="cal-export"><button type="button" class="btn ghost" id="lcal-all">Alle in Kalender übernehmen</button><span class="small muted">${evs.length} Termine mit Datum und Uhrzeit</span></div></div>
      <p class="muted" style="max-width:76ch">Die langsamen Planeten wirken über Wochen und Monate. Am exakten Zeitpunkt ist der Transit am stärksten; bei Rückläufigkeit (℞) wird derselbe Aspekt oft dreimal exakt. Die Tabelle zeigt Jupiter, Saturn, Uranus, Neptun und Pluto auf deinen Radix-Planeten, Achsen und ${P.sens ? P.sens.list.length : 0} sensitiven Punkten.</p>
      <h3>Langsame Planeten auf Radix und sensitiven Punkten</h3>
      ${transitTable(all, f, tz, true)}
      ${sunOnSens.length ? `<h3 style="margin-top:18px">Die Sonne auf deinen sensitiven Punkten</h3><p class="small muted">Einmal im Jahr läuft die Sonne über jeden Punkt. Dieser Tag ist der Jahrestag seines Themas, gut für Vorhaben in genau diesem Bereich.</p>${transitTable(sunOnSens, f, tz, true)}` : ''}
    </section>`;
    const bind = () => {
      bindCal($('#ltiming'));
      $('#lcal-all').addEventListener('click', () => CAL().download(`horoskop-transite-${L.start.getUTCFullYear()}-${pad(L.start.getUTCMonth() + 1)}.ics`, CAL().eventsIcs(evs, `Horoskop ${F.fmtDateY(L.start)} bis ${F.fmtDateY(L.end)}`)));
    };
    return { html, bind };
  }

  /* ---------- Wochenseite ---------- */
  function renderWeek() {
    const P = profile;
    const ws = $('#f-week').value ? $('#f-week').value.split('-').map(Number) : (() => { const d = nextMonday(); return [d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()]; })();
    const W = F.weekForecast(P, ws[0], ws[1], ws[2]);
    const o = W.optimal;
    const first = W.days[0].date, last = W.days[6].date;
    const chart = barChart(W.days.map(d => ({ v: d.total, l1: shortWd(d.wd), l2: dmy(d.date), title: d.wd })), { label: 'Tageswerte der Woche' });
    const opt = [
      ['Bester Tag', `${o.bestDay.wd}`, `Gesamtwert ${o.bestDay.total} von 100`],
      ['Liebe', o.love.wd, `Wert ${o.love.areas.love}`],
      ['Beruf und Geld', o.career.wd, `Wert ${o.career.areas.career}`],
      ['Vorsicht', o.caution.wd, `Wert ${o.caution.total}, lieber ruhig planen`],
      ['Glückszahl', `<span class="num">${o.luckyNumber}</span>`, T.personalDay[o.luckyNumber]],
      ['Glücksfarbe', `<span class="swatch" style="background:${o.color[1]}"></span>${esc(o.color[0])}`, `Element ${o.colorEl} stärkt deinen Tagesmeister`],
      ['Glücksrichtung', esc(o.direction.split(' (')[0]), 'nach dem stärkenden Element'],
      ['Glücksort', o.place ? esc(o.place.city) : '–', o.place ? `${esc(o.place.country)}, ${esc(C.PL[o.place.line.key].name)}-${o.place.line.kind}-Linie` : 'keine Linie in Reichweite']
    ].map(([k, v, s]) => `<div class="opt"><span class="k">${k}</span><span class="v">${v}</span><span class="s">${esc(s)}</span></div>`).join('');
    const labels = ['Überblick', 'Mond', 'Numerologie', 'Chinesisch', 'Astrokartographie', 'Sensitive Punkte'];
    const prose = W.text.map((t, i) => t ? `<p><span class="lbl">${labels[i]}.</span> ${esc(t)}</p>` : '').join('');
    const days = W.days.map(d => {
      const tas = d.tas.filter(t => t.t.key !== 'Moon' && !['Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'].includes(t.t.key)).slice(0, 2);
      const main = tas[0] || d.tas[0];
      const chips = d.tas.slice(0, 5).map(t => `<span class="chip ${t.value >= 0 ? 'pos' : 'neg'}">${esc(t.t.name)} ${esc(t.asp.name)} ${esc(t.n.name)}</span>`).join('');
      return `<div class="day">
        <div class="when"><b>${d.wd}</b><span class="small muted">${F.fmtDate(d.date)}</span></div>
        <span class="badge ${cls(d.total)}" title="Tageswert">${d.total}</span>
        <div class="body">
          <p>${main ? `<strong>${esc(main.t.name)} ${esc(main.asp.name)} ${esc(main.n.name)}:</strong> ${esc(main.t.name)} ${esc(F.transitSentence(main))}. ` : ''}${esc(T.moonDay[d.moon.sign.name])}</p>
          <p class="small muted">Mond in ${esc(d.moon.sign.name)} (${esc(d.moon.phaseName)}) · Tageszahl ${d.pd}: ${esc(T.personalDay[d.pd])} · Tagessäule <span class="han">${d.dp.stem.ch}${d.dp.branch.ch}</span> ${esc(d.dp.stem.el)}-${esc(d.dp.branch.animal)}, zu deinem Tierzeichen ${esc(d.brRel.name)}, Element ${esc(d.elRel.name)}</p>
          <div class="chips">${chips}</div>
        </div>
      </div>`;
    }).join('');
    evStore = {};
    const TS = weekTimingSection(P, W);
    $('#page-woche').innerHTML = `
      <section class="sheet" id="week">
        <div class="sheet-head"><div><span class="eyebrow">Wochenprognose · ${F.fmtDate(first)} bis ${F.fmtDateY(last)}</span><h2>${esc(P.b.name ? P.b.name.split(' ')[0] + ', deine Woche' : 'Deine Woche')}</h2></div>
          <div class="scorebig"><span class="n" style="color:${colVar(W.avg)}">${W.avg}</span><span class="muted">von 100<br>Wochenwert</span></div></div>
        <div class="week-top">
          <div>${chart}</div>
          <div class="meters">
            ${Object.entries(F.AREA_NAMES).map(([k, l]) => meter(l, W.areaAvg[k])).join('')}
            <p class="small muted">Die Werte verbinden die Transite zu deinem Radix, den Mondlauf, deine persönlichen Tageszahlen und die chinesischen Tagessäulen.</p>
          </div>
        </div>
        <div><h3 style="margin-bottom:10px">Optimale Werte der Woche</h3><div class="optimal">${opt}</div></div>
        <div class="prose">${prose}</div>
      </section>
      <section class="sheet" id="days">
        <div class="sheet-head"><div><span class="eyebrow">Tag für Tag</span><h2>Die sieben Tage im Einzelnen</h2></div>
          <div class="cal-export"><button type="button" class="btn ghost" id="cal-btn">In Kalender übernehmen</button><span class="small muted">Alle exakten Transite mit Uhrzeit, für Google, Apple und Outlook. Einzeltermine unten bei den exakten Zeitpunkten.</span></div></div>
        <div class="days">${days}</div>
      </section>
      ${TS.html}
      ${westernSection(P)}
      ${sensitiveSection(P)}
      ${chineseSection(P)}
      ${numerologySection(P, ws[0], ws[1])}
      ${mapSection(P, o.places, 'w')}`;
    bindMap(P, o.places, 'w');
    TS.bind();
    $('#cal-btn').addEventListener('click', () => {
      const tz = window.Timing.userTz(P);
      const ics = window.CalendarExport.eventsIcs(window.CalendarExport.dayEvents(P, W).concat(TS.hitEvents), `Horoskop ${F.fmtDate(W.days[0].date)} bis ${F.fmtDateY(W.days[6].date)}`);
      window.CalendarExport.download(`horoskop-${ws.map(n => String(n).padStart(2, '0')).join('-')}.ics`, ics); void tz;
    });
  }

  /* ---------- Halbjahr/Jahr ---------- */
  function timeline(L) {
    const ps = L.periods.filter(p => Math.abs(p.value) >= 2).slice(0, 22);
    if (!ps.length) return '<p class="muted">In diesem Zeitraum gibt es keine starken Transite der langsamen Planeten.</p>';
    const W = 900, rowH = 24, padL = 220, top = 26, H = top + ps.length * rowH + 8;
    const t0 = L.start.getTime(), t1 = L.end.getTime() + C.DAY;
    const x = t => padL + (W - padL - 10) * (Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0);
    let s = `<svg class="chart timeline" viewBox="0 0 ${W} ${H}" style="min-width:720px" role="img" aria-label="Zeitleiste der Transite">`;
    L.months.forEach(m => {
      const t = Date.UTC(m.y, m.m - 1, 1);
      s += `<line class="grid" x1="${x(t)}" x2="${x(t)}" y1="${top - 6}" y2="${H}"/><text x="${x(t) + 3}" y="14">${m.name.slice(0, 3)}</text>`;
    });
    ps.forEach((p, i) => {
      const y = top + i * rowH;
      const k = p.value >= 0 ? 'good' : 'low';
      s += `<text class="rowlbl" x="0" y="${y + 15}"><tspan class="sym" style="fill:var(--pl-${p.t.key});font-family:var(--f-sym)">${g(p.t.sym)}</tspan> ${esc(p.t.name)} ${esc(p.asp.name)} ${esc(p.n.name)}</text>`;
      s += `<rect class="bar-${k}" x="${x(p.start.getTime())}" y="${y + 6}" width="${Math.max(3, x(p.end.getTime()) - x(p.start.getTime()))}" height="11" rx="5" opacity="0.75"><title>${F.fmtDateY(p.start)} bis ${F.fmtDateY(p.end)}</title></rect>`;
      p.exacts.forEach(e => { if (e.getTime() >= t0 && e.getTime() <= t1) s += `<circle class="ex" cx="${x(e.getTime())}" cy="${y + 11.5}" r="3.2"><title>exakt am ${F.fmtDateY(e)}</title></circle>`; });
    });
    return s + '</svg>';
  }
  function renderLong() {
    const P = profile;
    const box = $('#page-langfrist');
    if (!longStart) { const now = new Date(); longStart = [now.getFullYear(), now.getMonth() + 1]; }
    box.innerHTML = `<section class="sheet"><div class="loading">Berechne ${longMonths} Monate…</div></section>`;
    setTimeout(() => {
      const L = F.longForecast(P, longStart[0], longStart[1], longMonths);
      evStore = {};
      const LT = longTimingSection(P, L);
      const chart = barChart(L.months.map(m => ({ v: m.total, l1: m.name.slice(0, 3), l2: L.months.indexOf(m) === 0 || m.m === 1 ? String(m.y) : '', title: `${m.name} ${m.y}` })), { w: 900, label: 'Monatswerte' });
      const avg = Math.round(L.months.reduce((a, m) => a + m.total, 0) / L.months.length);
      const py = C.personalYear(P.b, longStart[0]);
      const sr = L.solarReturn;
      const opt = [
        ['Bester Monat', `${L.best.name} ${L.best.y}`, `Gesamtwert ${L.best.total}`],
        ['Liebe', `${L.bestLove.name} ${L.bestLove.y}`, `Wert ${L.bestLove.areas.love}`],
        ['Beruf und Geld', `${L.bestCareer.name} ${L.bestCareer.y}`, `Wert ${L.bestCareer.areas.career}`],
        ['Vorsicht', `${L.hardest.name} ${L.hardest.y}`, `Wert ${L.hardest.total}, Kräfte einteilen`]
      ].map(([k, v, s]) => `<div class="opt"><span class="k">${k}</span><span class="v">${esc(v)}</span><span class="s">${esc(s)}</span></div>`).join('');
      const strongest = L.periods.filter(p => p.value > 0).sort((a, b) => b.value - a.value)[0];
      const hardest = L.periods.filter(p => p.value < 0).sort((a, b) => a.value - b.value)[0];
      const prose = [
        `<p><span class="lbl">Überblick.</span> ${esc(avg >= 62 ? 'Ein Zeitraum mit viel Rückenwind.' : avg >= 50 ? 'Ein ausgewogener Zeitraum mit klaren Höhepunkten.' : 'Ein fordernder Zeitraum, in dem Ausdauer belohnt wird.')} Am stärksten ist ${esc(L.best.name)} ${L.best.y}, am anspruchsvollsten ${esc(L.hardest.name)} ${L.hardest.y}.${sr ? ` Dein Sonnen-Rückkehrpunkt (astrologischer Geburtstag) fällt auf den ${F.fmtDateY(sr)} und eröffnet ein neues persönliches Jahr.` : ''}</p>`,
        strongest ? `<p><span class="lbl">Grösste Chance.</span> ${esc(strongest.t.name)} ${esc(strongest.asp.name)} ${esc(strongest.n.name)} vom ${F.fmtDateY(strongest.start)} bis ${F.fmtDateY(strongest.end)}: ${esc(strongest.t.name)} ${esc(F.transitSentence(strongest))}.</p>` : '',
        hardest ? `<p><span class="lbl">Grösste Prüfung.</span> ${esc(hardest.t.name)} ${esc(hardest.asp.name)} ${esc(hardest.n.name)} vom ${F.fmtDateY(hardest.start)} bis ${F.fmtDateY(hardest.end)}: ${esc(hardest.t.name)} ${esc(F.transitSentence(hardest))}.</p>` : '',
        `<p><span class="lbl">Numerologie.</span> ${longStart[0]} ist für dich ein persönliches ${py}er-Jahr: ${esc(T.personalYear[py])}${L.months.some(m => m.y !== longStart[0]) ? ` ${longStart[0] + 1} wird ein ${C.personalYear(P.b, longStart[0] + 1)}er-Jahr: ${esc(T.personalYear[C.personalYear(P.b, longStart[0] + 1)])}` : ''}</p>`,
        `<p><span class="lbl">Chinesisch.</span> ${esc(L.months.filter(m => m.brRel.v > 0.5).map(m => m.name).join(', ') || 'Keine Monate')} stehen in Harmonie zu deinem ${esc(P.chinese.animal.branch.animal)}${L.months.some(m => m.brRel.key === 'chong') ? `; ${esc(L.months.filter(m => m.brRel.key === 'chong').map(m => m.name).join(' und '))} bringt einen Zusammenstoss mit deinem Zeichen` : ''}.</p>`
      ].join('');
      const months = L.months.map(m => {
        const tr = m.top.map(t => `<li><span class="sym" style="color:var(--pl-${t.t.key})">${g(t.t.sym)}</span> ${esc(t.t.name)} ${esc(t.asp.name)} ${esc(t.n.name)}: ${esc(F.transitSentence(t))}</li>`).join('');
        const ev = [
          ...m.eclipses.map(e => `${e.kind} am ${F.fmtDate(e.date)} in ${e.sign.name}${P.b.unknownTime ? '' : ` (${e.house}. Haus)`}${e.hits.length ? `, trifft ${e.hits.map(h => h.name).join(', ')}` : ''}`),
          ...m.lunations.map(l => `${l.kind} ${F.fmtDate(l.date)} in ${l.sign.name}`),
          ...m.retro.map(r => `${C.PL[r.key].name} rückläufig ${r.start < new Date(Date.UTC(m.y, m.m - 1, 1)) ? 'seit ' + F.fmtDate(r.start) : 'ab ' + F.fmtDate(r.start)}${r.end ? ' bis ' + F.fmtDate(r.end) : ''}`)
        ];
        const tone = m.total >= 62 ? T.monthTone.hi : m.total >= 45 ? T.monthTone.mid : T.monthTone.lo;
        return `<article class="month">
          <div class="month-head"><h3>${esc(m.name)} ${m.y}</h3><span class="badge ${cls(m.total)}">${m.total}</span></div>
          <div class="mini">${Object.entries(F.AREA_NAMES).map(([k, l]) => `<div>${esc(l.split(' ')[0])}<div class="track"><div class="fill" style="width:${m.areas[k]}%;background:${colVar(m.areas[k])}"></div></div></div>`).join('')}</div>
          <p class="small">${esc(tone)} Persönlicher Monat ${m.pm}: ${esc(T.personalDay[m.pm].replace('tag', 'monat').replace('Tag', 'Monat'))} Monatssäule <span class="han">${m.mp.stem.ch}${m.mp.branch.ch}</span> ${esc(m.mp.stem.el)}-${esc(m.mp.branch.animal)} (${esc(m.brRel.name)}).${P.b.unknownTime ? '' : ` Jupiter im ${m.jupHouse}. Haus fördert ${esc(T.house[m.jupHouse])}.`}</p>
          ${tr ? `<ul>${tr}</ul>` : ''}
          ${ev.length ? `<p class="small muted">${ev.map(esc).join(' · ')}</p>` : ''}
        </article>`;
      }).join('');
      const ecl = L.eclipses.map(e => `<tr><td>${F.fmtDateY(e.date)}</td><td>${esc(e.kind)}</td><td><span class="sym">${g(e.sign.sym)}</span> ${esc(e.sign.name)}</td><td>${P.b.unknownTime ? '–' : e.house}</td><td>${e.hits.length ? esc(e.hits.map(h => h.name).join(', ')) : '–'}</td></tr>`).join('');
      box.innerHTML = `
        <section class="sheet" id="long">
          <div class="sheet-head"><div><span class="eyebrow">${longMonths === 6 ? 'Halbjahresprognose' : 'Jahresprognose'} · ${F.fmtDateY(L.start)} bis ${F.fmtDateY(L.end)}</span><h2>${esc(P.b.name ? P.b.name.split(' ')[0] + ', deine nächsten ' + longMonths + ' Monate' : 'Deine nächsten ' + longMonths + ' Monate')}</h2></div>
            <div class="controls">
              <div class="seg" role="group" aria-label="Zeitraum"><button type="button" data-m="6" aria-pressed="${longMonths === 6}">6 Monate</button><button type="button" data-m="12" aria-pressed="${longMonths === 12}">12 Monate</button></div>
              <div class="field"><label for="f-start">Beginn</label><input id="f-start" type="month" value="${longStart[0]}-${pad(longStart[1])}"></div>
            </div></div>
          ${chart}
          <div class="optimal">${opt}</div>
          <div class="prose">${prose}</div>
        </section>
        <section class="sheet"><div class="sheet-head"><div><span class="eyebrow">Monat für Monat</span><h2>Monatsübersicht</h2></div></div><div class="months">${months}</div></section>
        <section class="sheet"><div class="sheet-head"><div><span class="eyebrow">Langsame Planeten</span><h2>Die grossen Transite</h2></div></div>
          <p class="muted small">Balken zeigen, wann Jupiter, Saturn, Uranus, Neptun und Pluto einen deiner Geburtspunkte berühren (grün fördernd, rot fordernd). Punkte markieren die exakten Tage.</p>
          <div class="tbl-wrap">${timeline(L)}</div></section>
        ${L.sensPeriods.length ? `<section class="sheet"><div class="sheet-head"><div><span class="eyebrow">Sensitive Punkte</span><h2>Jupiter und Saturn auf deinen sensitiven Punkten</h2></div></div><p class="muted small">Jupiter öffnet das Thema des Punktes und bringt Chancen, Saturn verlangt Arbeit und macht es dauerhaft.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Zeitraum</th><th>Transit</th><th>Punkt</th><th>Bedeutung</th></tr></thead><tbody>${L.sensPeriods.map(p => `<tr><td class="num">${F.fmtDateY(p.start)} bis ${F.fmtDateY(p.end)}<br><span class="small muted">exakt ${F.fmtDateY(p.exact)}, Uhrzeit unten</span></td><td>${esc(p.t.name)}</td><td><span class="sym-gold">${g(p.sp.sym)}</span> ${esc(p.sp.name)} (${esc(p.sp.pos.sign.name)}, ${p.sp.house}. Haus)</td><td>${esc(T.sensitive[p.sp.key][0])} ${p.t.key === 'Jupiter' ? 'Jetzt wächst hier etwas.' : 'Jetzt wird hier Verantwortung verlangt.'}</td></tr>`).join('')}</tbody></table></div></section>` : ''}
        ${LT.html}
        ${L.eclipses.length ? `<section class="sheet"><div class="sheet-head"><div><span class="eyebrow">Finsternisse</span><h2>Wendepunkte im Zeitraum</h2></div></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Datum</th><th>Art</th><th>Zeichen</th><th>Haus</th><th>Trifft</th></tr></thead><tbody>${ecl}</tbody></table></div></section>` : ''}
        ${mapSection(P, [], 'l')}`;
      bindMap(P, [], 'l');
      LT.bind();
      box.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => { longMonths = +b.dataset.m; store.set('astro-long', longMonths); renderLong(); }));
      $('#f-start').addEventListener('change', e => { const [y, m] = e.target.value.split('-').map(Number); if (y && m) { longStart = [y, m]; renderLong(); } });
    }, 30);
  }

  /* ---------- Start ---------- */
  async function init() {
    fillDatalists();
    $('#f-week').value = isoDate(nextMonday());
    longMonths = store.get('astro-long') || 12;
    timePlace = store.get('astro-timeplace') || null;
    $('#f-notime').addEventListener('change', e => { $('#f-time').disabled = e.target.checked; });
    $('#f-week').addEventListener('change', () => { if (profile) renderWeek(); });
    $('#birth-form').addEventListener('submit', async e => {
      e.preventDefault();
      $('#form-err').textContent = '';
      $('#example-note').hidden = true;
      try { await compute(readForm()); document.getElementById(location.hash === '#langfrist' ? 'page-langfrist' : 'week').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
      catch (err) { $('#form-err').textContent = err.message; }
    });
    window.addEventListener('hashchange', route);
    const saved = store.get('astro-input');
    const v = saved || EXAMPLE;
    setForm(v);
    route();
    try { await compute({ ...v, latIn: v.src === 'manual' ? v.lat : '', lonIn: v.src === 'manual' ? v.lon : '' }, { example: !saved }); }
    catch (err) { $('#form-err').textContent = err.message; }
  }
  init();
})();
