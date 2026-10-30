/* El Niño — the dive log. Full dive entries (numbers, gas, conditions, kit, wildlife, notes,
   photos, guide signature) stored in IndexedDB, with a lightweight index in localStorage so
   the rest of the app can show counts and stats instantly. Exports dive cards and a logbook PDF. */
window.ElNinoDives = function (A) {
  'use strict';
  const { T, S, I, esc, img, fmtDate, view, toast, go, openSheet, closeSheet, phaseColor, DAY, kit } = A;
  const K = kit;

  /* ---------------- Storage ---------------- */
  const DB = {
    _db: null,
    open() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('elnino-dives', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('v', { keyPath: 'id' });
        r.onsuccess = () => { this._db = r.result; res(r.result); };
        r.onerror = () => rej(r.error);
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('v', mode); const out = fn(t.objectStore('v'));
        t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
        t.onerror = () => rej(t.error);
      });
    },
    get(id) { return this.tx('readonly', st => st.get(id)); },
    put(r) { return this.tx('readwrite', st => { st.put(r); }); },
    del(id) { return this.tx('readwrite', st => { st.delete(id); }); },
    all() { return this.tx('readonly', st => st.getAll()); }
  };

  /* ---------------- Units (stored metric, shown however you like) ---------------- */
  const units = () => Object.assign({ depth: 'm', temp: 'C', press: 'bar', weight: 'kg' }, S.get('units', {}));
  const CONV = {
    depth: { m: [1, 'm'], ft: [3.28084, 'ft'] },
    temp: { C: null, F: null },
    press: { bar: [1, 'bar'], psi: [14.5038, 'psi'] },
    weight: { kg: [1, 'kg'], lb: [2.20462, 'lb'] }
  };
  const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
  function toUser(kind, v) {
    v = num(v); if (v == null) return '';
    const u = units()[kind === 'vis' ? 'depth' : kind];
    if (kind === 'temp') return u === 'F' ? Math.round(v * 9 / 5 + 32) : Math.round(v * 10) / 10;
    const f = CONV[kind === 'vis' ? 'depth' : kind][u][0]; const x = v * f;
    if (kind === 'press' && u === 'psi') return Math.round(x / 10) * 10;
    if (u === 'ft' || u === 'lb') return Math.round(x);
    return Math.round(x * 10) / 10;
  }
  function toMetric(kind, v) {
    v = num(v); if (v == null) return null;
    const u = units()[kind === 'vis' ? 'depth' : kind];
    if (kind === 'temp') return u === 'F' ? (v - 32) * 5 / 9 : v;
    return v / CONV[kind === 'vis' ? 'depth' : kind][u][0];
  }
  const unitLabel = kind => kind === 'temp' ? '°' + units().temp : CONV[kind === 'vis' ? 'depth' : kind][units()[kind === 'vis' ? 'depth' : kind]][1];
  const show = (kind, v) => { const x = toUser(kind, v); return x === '' ? '—' : `${x}${kind === 'temp' ? '' : ' '}${unitLabel(kind)}`; };

  /* ---------------- Index ---------------- */
  const index = () => S.get('diveIdx', []);
  function sacOf(r) {
    const g = r.gas || {}; const d = num(r.avgDepth) || (num(r.maxDepth) ? r.maxDepth * 0.62 : null);
    if (!(g.start > 0 && g.end >= 0 && g.start > g.end && g.tank > 0 && r.bottom > 0 && d)) return null;
    return ((g.start - g.end) * g.tank) / (r.bottom * (d / 10 + 1));
  }
  function rebuild(all) {
    const idx = all.map(r => ({ id: r.id, date: r.date, site: r.site, siteKey: r.siteKey || null, timeIn: r.timeIn || '', timeOut: r.timeOut || '',
      maxDepth: num(r.maxDepth), avgDepth: num(r.avgDepth), bottom: num(r.bottom), waterTemp: num(r.waterTemp), vis: num(r.vis), rating: r.rating || 0, fav: !!r.fav,
      species: r.species || [], boat: r.boat, felt: r.felt || '', suit: r.suit ? r.suit.mm : null, photo: !!(r.photos && r.photos.length), sac: sacOf(r), tags: r.tags || [] }))
      .sort((a, b) => (a.date + (a.timeIn || '99') + a.id).localeCompare(b.date + (b.timeIn || '99') + b.id));
    S.set('diveIdx', idx); return idx;
  }
  const refresh = async () => rebuild(await DB.all().catch(() => []));
  const offset = () => +S.get('diveOffset', 0) || 0;
  const diveNo = id => { const i = index().findIndex(x => x.id === id); return i < 0 ? offset() + index().length + 1 : offset() + i + 1; };
  const count = () => index().length;
  const newId = () => 'dv' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const mins = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const hm = n => `${Math.floor(n / 60)}h ${String(n % 60).padStart(2, '0')}m`;

  // The old one-tap counters become minimal dive entries the first time this runs.
  async function migrate() {
    const dl = S.get('dl', null); if (!dl) return;
    for (const [key, n] of Object.entries(dl)) {
      const [date, k] = [key.slice(0, 10), +key.slice(11)]; const d = DAY(date); if (!d || !d.dives || !d.dives[k]) continue;
      for (let i = 0; i < n; i++) await DB.put(Object.assign(blank(d, k), { id: newId() }));
    }
    S.del('dl'); await refresh();
  }

  /* ---------------- Defaults ---------------- */
  const TANKS = [['80 cu ft alu · 11 L', 11.1], ['100 cu ft · 15 L', 15], ['12 L steel', 12]];
  // the dive's area ("North coast, Santa Cruz") rather than the day's travel line
  function whereOf(r, d) {
    const ds = d.dives || [], k = r.siteKey ? +r.siteKey.split(':')[1] : -1;
    const hit = ds[k] || ds.find(x => r.site && x.site.toLowerCase().includes(r.site.toLowerCase()));
    return hit && hit.where ? hit.where : d.place;
  }

  function blank(d, k) {
    const site = d.dives && d.dives[k] ? d.dives[k] : null; const last = S.get('diveLast', {});
    const boat = d.phase === 'gs' ? 'gs' : 'ab';
    return {
      date: d.date, site: site ? site.site.split(' and/or ')[0].split(' / ')[0] : '', siteKey: site ? `${d.date}:${k}` : null, boat,
      diver: S.get('phoneOwner', ''), buddy: last.buddy || '', guide: (last.guide || {})[boat] || '',
      timeIn: '', timeOut: '', bottom: null, maxDepth: null, avgDepth: null,
      gas: { o2: 32, tank: last.tank || 11.1, start: null, end: null },
      waterTemp: null, vis: null, current: null, surge: null, thermo: false, entry: 'Back roll',
      suit: Object.assign({ mm: 5, hood: false, vest: false, gloves: true, shorty: false }, last.suit || {}), weight: last.weight || null, felt: '',
      tags: [], species: [], speciesOther: '', rating: 0, fav: false, safety: true, notes: '', photos: [], sig: null, sigName: ''
    };
  }

  // midpoint of the planned water temperature for the day, e.g. '22–26 °C' -> 24
  const planTemp = d => { const m = (d.water || '').match(/(\d+)\s*[–-]\s*(\d+)\s*°C/); return m ? Math.round((+m[1] + +m[2]) / 2) : null; };

  /* ---------------- Depth profile (approximate, from the numbers you enter) ---------------- */
  function profile(r) {
    const Tm = num(r.bottom), D = num(r.maxDepth); if (!(Tm > 0 && D > 0)) return null;
    const avg = Math.min(num(r.avgDepth) || D * 0.62, D), ss = D > 9 && Tm > 12 && r.safety !== false ? 5 : 0;
    const desc = Math.min(3.5, Tm * 0.08), ssEnd = Tm - 0.6, ssStart = ss ? ssEnd - Math.min(3, Tm * 0.08) : Tm - Tm * 0.07;
    const pts = [[0, 0], [desc, D * 0.88], [desc + Tm * 0.1, D], [Tm * 0.32, avg + (D - avg) * 0.55], [Tm * 0.5, avg], [Tm * 0.66, avg * 0.85],
      [ssStart - Math.min(2.5, Tm * 0.06), Math.max(ss + 2, avg * 0.55)], [ssStart, ss || avg * 0.25], [ssEnd, ss || 0.5], [Tm, 0]];
    return { pts, D, Tm, ss };
  }
  function profileSVG(r, w = 340, h = 130) {
    const p = profile(r); if (!p) return `<div class="prof-empty">Add max depth and bottom time to see your profile</div>`;
    const X = t => 8 + t / p.Tm * (w - 16), Y = d => 14 + d / p.D * (h - 34);
    const line = p.pts.map(([t, d], i) => `${i ? 'L' : 'M'}${X(t).toFixed(1)},${Y(d).toFixed(1)}`).join('');
    return `<svg class="prof" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1E9AA0" stop-opacity=".5"/><stop offset="1" stop-color="#0E4A5A" stop-opacity=".9"/></linearGradient></defs>
      <path d="${line}L${X(p.Tm)},${Y(0)}Z" fill="url(#pg)"/><path d="${line}" fill="none" stroke="#7FE3DA" stroke-width="2.2" stroke-linejoin="round"/>
      ${p.ss ? `<path d="M8,${Y(5)}H${w - 8}" stroke="rgba(255,214,170,.5)" stroke-dasharray="4 5"/><text x="${w - 10}" y="${Y(5) - 4}" text-anchor="end" class="pl">safety stop 5 m</text>` : ''}
      <text x="${X(p.pts[2][0]) + 6}" y="${Y(p.D) + 14}" class="pl b">${esc(show('depth', p.D))}</text>
      <text x="${w - 10}" y="${h - 6}" text-anchor="end" class="pl">${p.Tm} min</text></svg>`;
  }
  function drawProfile(ctx, r, x, y, w, h, theme) {
    const p = profile(r); if (!p) return false;
    const X = t => x + t / p.Tm * w, Y = d => y + 10 + d / p.D * (h - 30);
    ctx.save();
    ctx.beginPath(); p.pts.forEach(([t, d], i) => i ? ctx.lineTo(X(t), Y(d)) : ctx.moveTo(X(t), Y(d))); ctx.lineTo(X(p.Tm), Y(0)); ctx.closePath();
    const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(30,154,160,.45)'); g.addColorStop(1, theme === 'dark' ? 'rgba(14,74,90,.95)' : 'rgba(14,74,90,.75)'); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); p.pts.forEach(([t, d], i) => i ? ctx.lineTo(X(t), Y(d)) : ctx.moveTo(X(t), Y(d)));
    ctx.strokeStyle = theme === 'dark' ? '#7FE3DA' : '#0E4A5A'; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.stroke();
    if (p.ss) { ctx.setLineDash([10, 12]); ctx.strokeStyle = theme === 'dark' ? 'rgba(255,214,170,.6)' : 'rgba(242,100,61,.6)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, Y(5)); ctx.lineTo(x + w, Y(5)); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = theme === 'dark' ? '#fff' : K.C.ink; K.font(ctx, 700, 24, K.SANS); ctx.fillText(show('depth', p.D), X(p.pts[2][0]) + 12, Y(p.D) + 26);
    ctx.restore(); return true;
  }

  /* ---------------- Shared bits ---------------- */
  const CURRENT = ['None', 'Mild', 'Moderate', 'Strong', 'Ripping 🌀'];
  const SURGE = ['None', 'Some', 'Lots'];
  const ENTRY = ['Back roll', 'Negative', 'Giant stride', 'Shore'];
  const TAGS = ['Drift', 'Wall', 'Night', 'Cleaning station', 'Blue water', 'Hang on rocks', 'Pinnacle', 'Reef', 'Mangrove', 'Sand', 'Snorkel', 'Photo dive'];
  const FELT = [['cold', '🥶', 'Cold'], ['ok', '😊', 'Just right'], ['warm', '🥵', 'Warm']];
  const SUITS = [3, 5, 7, 'Dry'];
  const stars = n => '★★★★★'.slice(0, n) + '<span class="dim">' + '★★★★★'.slice(n) + '</span>';
  const speciesOf = id => T.wildlife.find(w => w.id === id);
  function siteOptions(d) {
    const out = [];
    (d.dives || []).forEach((x, k) => x.site.split(/ and\/or | \/ /).forEach(n => out.push({ name: n.trim(), key: `${d.date}:${k}` })));
    return out;
  }
  function diveRow(x) {
    const sp = (x.species || []).slice(0, 4).map(id => speciesOf(id)).filter(Boolean);
    return `<a class="diverow" href="#/dive/${x.id}">
      <div class="dn">Nº<b>${diveNo(x.id)}</b></div>
      <div class="dt"><b>${esc(x.site || 'Dive')}</b><span>${[x.timeIn, x.maxDepth != null ? show('depth', x.maxDepth) : '', x.bottom ? x.bottom + ' min' : '', x.waterTemp != null ? show('temp', x.waterTemp) : ''].filter(Boolean).join(' · ') || 'Tap to add the details'}</span>
        ${sp.length || x.rating ? `<div class="dm">${x.rating ? `<span class="st">${stars(x.rating)}</span>` : ''}${sp.map(w => `<img src="${img(w.img)}" alt="${esc(w.name)}">`).join('')}${x.fav ? '<span class="fv">♥</span>' : ''}</div>` : ''}</div>
      ${I('right')}</a>`;
  }

  /* ---------------- Blocks used by the Day page and the Logbook ---------------- */
  function siteBlock(ds, x, k, compact) {
    const key = `${ds}:${k}`; const logged = index().filter(i => i.siteKey === key);
    const planned = x.count || 0;
    return `<div class="divesite"><div class="h"><b>${esc(x.site)}</b>${planned ? `<span class="n">${logged.length}/${planned} logged</span>` : logged.length ? `<span class="n">${logged.length} logged</span>` : ''}</div>
      <div class="where">${esc(x.where)}</div>
      ${compact ? '' : `<ul>${x.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul>`}
      ${logged.length ? `<div class="dives">${logged.map(diveRow).join('')}</div>` : ''}
      <a class="logbtn ${logged.length ? '' : 'on'}" href="#/dive/new/${ds}/${k}">${I('plus')}<span>${logged.length ? 'Log another dive' : 'Log a dive'}</span></a></div>`;
  }
  function extraDives(ds) {
    const d = DAY(ds); const keys = new Set((d.dives || []).map((_, k) => `${ds}:${k}`));
    return index().filter(i => i.date === ds && !keys.has(i.siteKey));
  }

  function logbookHTML() {
    const idx = index(); const n = idx.length;
    const totalMin = idx.reduce((a, x) => a + (x.bottom || 0), 0);
    const best = (f, cmp) => idx.filter(x => x[f] != null).sort(cmp)[0];
    const deepest = best('maxDepth', (a, b) => b.maxDepth - a.maxDepth), longest = best('bottom', (a, b) => b.bottom - a.bottom);
    const coldest = best('waterTemp', (a, b) => a.waterTemp - b.waterTemp), warmest = best('waterTemp', (a, b) => b.waterTemp - a.waterTemp);
    const sac = best('sac', (a, b) => a.sac - b.sac), vis = best('vis', (a, b) => b.vis - a.vis);
    const fav = idx.find(x => x.fav) || best('rating', (a, b) => b.rating - a.rating);
    const tile = (lbl, val, x, sub) => x ? `<a class="stat" href="#/dive/${x.id}"><b>${val}</b><span>${lbl}${sub ? ' · ' + esc(sub) : ''}</span></a>` : `<div class="stat dimmed"><b>—</b><span>${lbl}</span></div>`;
    const diveDays = T.days.filter(d => d.dives || index().some(x => x.date === d.date));
    // depth chart
    const maxD = Math.max(30, ...idx.map(x => x.maxDepth || 0));
    const chart = n ? `<div class="card pad"><div class="depthchart">${idx.map(x => `<a href="#/dive/${x.id}" style="--h:${((x.maxDepth || 0) / maxD * 100).toFixed(1)}%;--c:${phaseColor(x.boat)}" title="${esc(x.site)}"><i></i></a>`).join('')}</div>
      <div class="chartaxis"><span>Dive Nº ${offset() + 1}</span><span>deepest ${deepest ? show('depth', deepest.maxDepth) : '—'}</span><span>Nº ${offset() + n}</span></div></div>` : '';
    // wetsuit verdict
    const bySuit = {};
    idx.filter(x => x.felt && x.suit != null).forEach(x => { const b = bySuit[x.suit] || (bySuit[x.suit] = { cold: 0, ok: 0, warm: 0 }); b[x.felt]++; });
    const verdict = Object.keys(bySuit).length ? `<div class="sec"><div class="sec-h"><h3>Wetsuit verdict</h3><span class="muted" style="font-size:12px">The El Niño question</span></div><div class="card">
      ${Object.entries(bySuit).map(([mm, b]) => `<div class="verdict"><b>${mm === 'Dry' ? 'Drysuit' : mm + ' mm'}</b><span>🥶 ${b.cold}</span><span>😊 ${b.ok}</span><span>🥵 ${b.warm}</span>
        <em>${b.cold > b.ok + b.warm ? 'Too thin. Add a layer' : b.warm > b.ok + b.cold ? 'Too warm, go thinner' : 'Spot on'}</em></div>`).join('')}</div></div>` : '';
    return `
      <div class="sec"><div class="sec-h"><h3>Your numbers</h3><button data-dv="settings">${I('sliders')} Settings</button></div>
        <div class="stats">
          <div class="stat"><b>${n}</b><span>dives this trip${offset() ? ` · Nº ${offset() + 1}–${offset() + n}` : ''}</span></div>
          <div class="stat"><b>${totalMin ? hm(totalMin) : '—'}</b><span>underwater</span></div>
          ${tile('deepest', deepest ? show('depth', deepest.maxDepth) : '', deepest, deepest && deepest.site)}
          ${tile('longest', longest ? longest.bottom + ' min' : '', longest, longest && longest.site)}
          ${tile('coldest water', coldest ? show('temp', coldest.waterTemp) : '', coldest, coldest && coldest.site)}
          ${tile('warmest water', warmest ? show('temp', warmest.waterTemp) : '', warmest, warmest && warmest.site)}
          ${tile('best air use (SAC)', sac ? `${Math.round(sac.sac)} L/min` : '', sac, sac && sac.site)}
          ${tile('best visibility', vis ? show('vis', vis.vis) : '', vis, vis && vis.site)}
        </div>
        ${fav && (fav.fav || fav.rating) ? `<a class="card favdive" href="#/dive/${fav.id}"><span class="caps">${fav.fav ? '♥ Dive of the trip' : 'Top rated'}</span><b>${esc(fav.site)}</b><span>Nº ${diveNo(fav.id)} · ${fmtDate(fav.date, { short: true })} · ${stars(fav.rating)}</span></a>` : ''}
      </div>
      ${n ? `<div class="sec"><div class="sec-h"><h3>Depth, dive by dive</h3></div>${chart}</div>` : ''}
      ${verdict}
      <div class="sec"><div class="sec-h"><h3>Dive log</h3>${n ? `<button data-dv="export">${I('doc')} Logbook PDF</button>` : ''}</div>
        <div class="card">${diveDays.map(d => `<div class="daygroup"><a href="#/day/${d.date}" class="caps" style="color:${phaseColor(d.phase)}">Day ${String(d.n).padStart(2, '0')} · ${fmtDate(d.date, { short: true })} · ${esc(d.place)}</a></div>
          ${(d.dives || []).map((x, k) => siteBlock(d.date, x, k, true)).join('')}
          ${extraDives(d.date).length ? `<div class="divesite"><div class="h"><b>Other dives</b></div><div class="dives">${extraDives(d.date).map(diveRow).join('')}</div></div>` : ''}`).join('')}
          <div class="divesite"><a class="logbtn" href="#/dive/new/${A.ctx().day.date}/x">${I('plus')}<span>Log a dive somewhere else</span></a></div>
        </div></div>`;
  }
  function bindLogbook(root) {
    root.querySelectorAll('[data-dv]').forEach(b => b.addEventListener('click', () => b.dataset.dv === 'settings' ? settingsSheet() : exportLogbook()));
  }
  function settingsSheet() {
    const u = units();
    const seg = (k, opts) => `<div class="chips-row">${opts.map(o => `<button class="chip-b ${u[k] === o ? 'on' : ''}" data-u="${k}" data-v="${o}">${o === 'C' ? '°C' : o === 'F' ? '°F' : o}</button>`).join('')}</div>`;
    openSheet(`<div style="padding:6px 20px 0"><span class="caps" style="color:var(--coral)">Dive log</span></div><h2>Settings</h2>
      <div class="block card">
        <div class="settings-row"><div><b>Whose phone is this?</b><div class="muted" style="font-size:12.5px">New dives are logged under this diver</div></div></div>
        <div class="settings-row"><div class="chips-row">${T.travellers.map(t => `<button class="chip-b ${S.get('phoneOwner', '') === t ? 'on' : ''}" data-owner="${esc(t)}">${esc(t)}</button>`).join('')}</div></div>
        <div class="settings-row"><div><b>Dives before this trip</b><div class="muted" style="font-size:12.5px">So dive numbers carry on from your lifetime total</div></div><input id="offset" inputmode="numeric" value="${offset() || ''}" placeholder="0" style="width:90px;text-align:right" class="numin"></div>
      </div>
      <div class="block card">
        <div class="settings-row"><b>Depth</b>${seg('depth', ['m', 'ft'])}</div>
        <div class="settings-row"><b>Temperature</b>${seg('temp', ['C', 'F'])}</div>
        <div class="settings-row"><b>Pressure</b>${seg('press', ['bar', 'psi'])}</div>
        <div class="settings-row"><b>Weight</b>${seg('weight', ['kg', 'lb'])}</div>
      </div>`);
    const sh = document.querySelector('.sheet');
    sh.querySelectorAll('[data-u]').forEach(b => b.addEventListener('click', () => { const u2 = units(); u2[b.dataset.u] = b.dataset.v; S.set('units', u2); sh.querySelectorAll(`[data-u="${b.dataset.u}"]`).forEach(x => x.classList.toggle('on', x === b)); A.rerender(); }));
    sh.querySelectorAll('[data-owner]').forEach(b => b.addEventListener('click', () => { S.set('phoneOwner', b.dataset.owner); sh.querySelectorAll('[data-owner]').forEach(x => x.classList.toggle('on', x === b)); }));
    sh.querySelector('#offset').addEventListener('input', e => { S.set('diveOffset', Math.max(0, parseInt(e.target.value, 10) || 0)); A.rerender(); });
  }

  /* ---------------- The dive form ---------------- */
  let f = null, editingId = null;
  const get = (o, p) => p.split('.').reduce((a, k) => a == null ? a : a[k], o);
  const set = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); ks.reduce((a, k) => a[k] || (a[k] = {}), o)[last] = v; };

  async function viewForm(parts) {
    A.releaseURLs();
    let d, isNew = parts[1] === 'new';
    if (isNew) {
      d = DAY(parts[2]) || A.ctx().day; const k = parts[3] === 'x' ? -1 : +parts[3];
      f = blank(d, k); editingId = null;
    } else {
      f = await DB.get(parts[1]).catch(() => null); if (!f) return go('#/log');
      editingId = f.id; d = DAY(f.date);
    }
    const no = editingId ? diveNo(editingId) : offset() + index().filter(x => (x.date + (x.timeIn || '99')) <= (f.date + '99')).length + 1;
    const opts = siteOptions(d);
    const u = units();
    const numField = (label, path, kind, step, ph, big) => `
      <label class="nf ${big ? 'big' : ''}"><span class="lbl">${label}</span>
        <span class="row"><button type="button" data-step="${path}" data-kind="${kind || ''}" data-d="-${step}">${I('minus')}</button>
        <input data-f="${path}" data-kind="${kind || ''}" inputmode="decimal" value="${kind ? toUser(kind, get(f, path)) : (get(f, path) ?? '')}" placeholder="${ph || ''}">
        <em>${kind ? unitLabel(kind) : path === 'bottom' ? 'min' : path === 'gas.o2' ? '%' : ''}</em>
        <button type="button" data-step="${path}" data-kind="${kind || ''}" data-d="${step}">${I('plus')}</button></span></label>`;
    const chips = (path, list, multi) => `<div class="chips-row">${list.map((o, i) => { const val = Array.isArray(o) ? o[0] : o; const lab = Array.isArray(o) ? o.slice(1).join(' ') : o;
      const on = multi ? (get(f, path) || []).includes(val) : get(f, path) === val;
      return `<button type="button" class="chip-b ${on ? 'on' : ''}" data-${multi ? 'multi' : 'chip'}="${path}" data-v="${esc(typeof val === 'number' ? 'n:' + val : val)}">${esc(String(lab))}</button>`; }).join('')}</div>`;
    const tog = (path, label) => `<button type="button" class="tog ${get(f, path) ? 'on' : ''}" data-tog="${path}"><i></i>${label}</button>`;
    const plan = (d.water || '').split('·');
    view.innerHTML = `
      <form id="diveform" autocomplete="off" onsubmit="return false">
      <div style="padding:calc(var(--sat) + 14px) 16px 0;display:flex;justify-content:space-between;align-items:center">
        <a class="roundbtn dark" href="${editingId ? '#/dive/' + editingId : '#/day/' + d.date}" aria-label="Cancel">${I('x')}</a>
        <span class="caps muted">${fmtDate(d.date, { short: true })} · ${esc(d.phaseObj.name)}</span></div>
      <header class="page-h" style="padding-top:10px"><div class="caps">${editingId ? 'Edit dive' : 'Log a dive'}</div><h1>Dive <em>Nº ${no}</em></h1></header>

      <div class="sec"><div class="sec-h"><h3>Where</h3></div><div class="card pad">
        ${opts.length ? `<div class="chips-row" id="sitechips">${opts.map(o => `<button type="button" class="chip-b ${f.site === o.name ? 'on' : ''}" data-sitepick="${esc(o.name)}" data-key="${o.key}">${esc(o.name)}</button>`).join('')}</div>` : ''}
        <input class="textin" data-f="site" value="${esc(f.site)}" placeholder="Dive site" style="margin-top:${opts.length ? 10 : 0}px">
        <div class="two" style="margin-top:12px">
          <label class="mini"><span>Time in</span><input type="time" data-f="timeIn" value="${f.timeIn}"></label>
          <label class="mini"><span>Time out</span><input type="time" data-f="timeOut" value="${f.timeOut}"></label>
        </div>
        <p class="muted hint" id="si"></p>
      </div></div>

      <div class="sec"><div class="sec-h"><h3>The numbers</h3></div><div class="card pad">
        <div class="grid2">
          ${numField('Max depth', 'maxDepth', 'depth', 1, '—', 1)}
          ${numField('Bottom time', 'bottom', '', 1, '—', 1)}
          ${numField('Water temp', 'waterTemp', 'temp', 1, planTemp(d) != null ? String(toUser('temp', planTemp(d))) : '—')}
          ${numField('Visibility', 'vis', 'vis', u.depth === 'ft' ? 5 : 1, '—')}
          ${numField('Avg depth', 'avgDepth', 'depth', 1, '—')}
          <div class="nf"><span class="lbl">Safety stop</span><div class="row" style="justify-content:flex-start;padding:4px 0">${tog('safety', 'Done')}</div></div>
        </div>
        ${d.water ? `<p class="muted hint">Plan for this site: ${esc(d.water)}</p>` : ''}
        <div class="profwrap" id="prof">${profileSVG(f)}</div>
      </div></div>

      <div class="sec"><div class="sec-h"><h3>Gas</h3><span class="muted" id="sac" style="font-size:13px"></span></div><div class="card pad">
        <span class="lbl">Mix</span>${chips('gas.o2', [21, 28, 32, 36].map(v => [v, v === 21 ? 'Air' : 'EAN' + v]))}
        <span class="lbl" style="margin-top:12px">Tank</span>${chips('gas.tank', TANKS.map(([l, v]) => [v, l]))}
        <div class="grid2" style="margin-top:12px">${numField('Start', 'gas.start', 'press', u.press === 'psi' ? 100 : 10, '200')}${numField('End', 'gas.end', 'press', u.press === 'psi' ? 100 : 10, '50')}</div>
      </div></div>

      <div class="sec"><div class="sec-h"><h3>Conditions</h3></div><div class="card pad">
        <span class="lbl">Current</span>${chips('current', CURRENT)}
        <span class="lbl" style="margin-top:12px">Surge</span>${chips('surge', SURGE)}
        <span class="lbl" style="margin-top:12px">Entry</span>${chips('entry', ENTRY)}
        <div style="margin-top:12px">${tog('thermo', 'Thermocline')}</div>
        <span class="lbl" style="margin-top:14px">Dive type</span>${chips('tags', TAGS, true)}
      </div></div>

      <div class="sec"><div class="sec-h"><h3>Kit &amp; comfort</h3></div><div class="card pad">
        <span class="lbl">Wetsuit</span>${chips('suit.mm', SUITS.map(s => [s, s === 'Dry' ? 'Drysuit' : s + ' mm']))}
        <div class="chips-row" style="margin-top:10px">${tog('suit.hood', 'Hood')}${tog('suit.vest', 'Hooded vest')}${tog('suit.shorty', 'Shorty layer')}${tog('suit.gloves', 'Gloves')}</div>
        <div class="grid2" style="margin-top:12px">${numField('Weights', 'weight', 'weight', 1, '—')}<div></div></div>
        <span class="lbl" style="margin-top:12px">How did it feel?</span>
        <div class="felt">${FELT.map(([v, e, l]) => `<button type="button" class="${f.felt === v ? 'on' : ''}" data-chip="felt" data-v="${v}"><b>${e}</b>${l}</button>`).join('')}</div>
      </div></div>

      <div class="sec"><div class="sec-h"><h3>What you saw</h3><span class="muted" style="font-size:12px">Also ticks your Logbook</span></div>
        <div class="spgrid">${T.wildlife.map(w => `<button type="button" class="spc ${f.species.includes(w.id) ? 'on' : ''}" data-spc="${w.id}"><img src="${img(w.img)}" alt=""><span>${esc(w.name)}</span></button>`).join('')}</div>
        <div class="card" style="margin-top:10px"><input class="textin flat" data-f="speciesOther" value="${esc(f.speciesOther)}" placeholder="Anything else? e.g. octopus, moray, frogfish…"></div></div>

      <div class="sec"><div class="sec-h"><h3>People</h3></div><div class="card pad">
        <span class="lbl">Diver</span><div class="chips-row">${T.travellers.map(t => `<button type="button" class="chip-b ${f.diver === t ? 'on' : ''}" data-chip="diver" data-v="${esc(t)}">${esc(t)}</button>`).join('')}</div>
        <div class="two" style="margin-top:12px">
          <label class="mini"><span>Buddy</span><input class="textin" data-f="buddy" value="${esc(f.buddy)}" placeholder="${esc(T.travellers.find(t => t !== f.diver) || '')}"></label>
          <label class="mini"><span>Guide</span><input class="textin" data-f="guide" value="${esc(f.guide)}" placeholder="Name"></label>
        </div></div></div>

      <div class="sec"><div class="sec-h"><h3>The verdict</h3></div><div class="card pad">
        <div class="rate">${[1, 2, 3, 4, 5].map(i => `<button type="button" data-rate="${i}" class="${f.rating >= i ? 'on' : ''}">★</button>`).join('')}
          <button type="button" class="favb ${f.fav ? 'on' : ''}" data-tog="fav">♥ Dive of the trip?</button></div>
        <textarea class="notes" data-f="notes" placeholder="What happened down there? The moment you’ll still be talking about at Christmas…" style="padding:12px 0 0">${esc(f.notes)}</textarea>
      </div></div>

      <div class="sec"><div class="sec-h"><h3>Photos</h3><span class="muted" style="font-size:13px" id="dphc"></span></div><div class="phgrid" id="dph"></div></div>

      <div class="sec"><div class="sec-h"><h3>Guide’s signature</h3><span class="muted" style="font-size:12px">Like a stamp in your paper logbook</span></div>
        <div class="card pad sigbox" id="sigbox"></div></div>

      <div class="savebar"><button type="button" class="btn" id="savedive">${I('check')} ${editingId ? 'Save changes' : 'Log this dive'}</button></div>
      </form>`;
    const form = view.querySelector('#diveform');
    drawDivePhotos(); drawSig(); liveCalc();

    form.addEventListener('input', e => {
      const t = e.target; const p = t.dataset.f; if (!p) return;
      let v = t.value;
      if (t.dataset.kind) v = toMetric(t.dataset.kind, v);
      else if (['bottom', 'gas.o2'].includes(p)) v = num(v);
      set(f, p, v);
      if (p === 'bottom') f._bottomManual = true;
      if (p === 'site') { const o = opts.find(o => o.name.toLowerCase() === String(v).trim().toLowerCase()); f.siteKey = o ? o.key : null; form.querySelectorAll('[data-sitepick]').forEach(b => b.classList.toggle('on', b.dataset.sitepick === v)); }
      liveCalc(p);
    });
    form.addEventListener('click', e => {
      const b = e.target.closest('button, [data-tog]'); if (!b) return;
      if (b.dataset.sitepick != null) { f.site = b.dataset.sitepick; f.siteKey = b.dataset.key; form.querySelector('[data-f="site"]').value = f.site; form.querySelectorAll('[data-sitepick]').forEach(x => x.classList.toggle('on', x === b)); return; }
      if (b.dataset.step) {
        const p = b.dataset.step, kind = b.dataset.kind, inp = form.querySelector(`[data-f="${p}"]`);
        const cur = num(inp.value) ?? num(inp.placeholder) ?? 0; const nv = Math.max(0, Math.round((cur + +b.dataset.d) * 10) / 10);
        inp.value = nv; set(f, p, kind ? toMetric(kind, nv) : nv); if (p === 'bottom') f._bottomManual = true; liveCalc(p); return;
      }
      if (b.dataset.chip) {
        const p = b.dataset.chip; let v = b.dataset.v; if (v.startsWith('n:')) v = +v.slice(2);
        const isN = ['current', 'surge'].includes(p); if (isN) v = (p === 'current' ? CURRENT : SURGE).indexOf(v);
        const same = get(f, p) === v; set(f, p, same && p !== 'gas.o2' && p !== 'gas.tank' && p !== 'suit.mm' ? (isN ? null : '') : v);
        b.parentElement.querySelectorAll(`[data-chip="${p}"]`).forEach(x => x.classList.toggle('on', x === b && !(same && x.classList.contains('on') && !['gas.o2', 'gas.tank', 'suit.mm'].includes(p))));
        if (p === 'diver') { const bud = form.querySelector('[data-f="buddy"]'); bud.placeholder = T.travellers.find(t => t !== f.diver) || ''; }
        liveCalc(p); return;
      }
      if (b.dataset.multi) { const p = b.dataset.multi, v = b.dataset.v; const arr = get(f, p) || []; const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); set(f, p, arr); b.classList.toggle('on', i < 0); return; }
      if (b.dataset.tog) { const p = b.dataset.tog; set(f, p, !get(f, p)); b.classList.toggle('on', !!get(f, p)); if (p === 'safety') liveCalc(p); return; }
      if (b.dataset.rate) { const n = +b.dataset.rate; f.rating = f.rating === n ? 0 : n; form.querySelectorAll('[data-rate]').forEach(x => x.classList.toggle('on', f.rating >= +x.dataset.rate)); return; }
      if (b.dataset.spc) { const id = b.dataset.spc; const i = f.species.indexOf(id); i >= 0 ? f.species.splice(i, 1) : f.species.push(id); b.classList.toggle('on', i < 0); return; }
      if (b.id === 'savedive') save();
    });
    // the current/surge chips store numbers; reflect existing values
    ['current', 'surge'].forEach(p => { const list = p === 'current' ? CURRENT : SURGE; form.querySelectorAll(`[data-chip="${p}"]`).forEach(x => x.classList.toggle('on', f[p] != null && list[f[p]] === x.dataset.v)); });
  }

  function liveCalc(changed) {
    const form = view.querySelector('#diveform'); if (!form) return;
    if ((changed === 'timeIn' || changed === 'timeOut' || !changed) && f.timeIn && f.timeOut && !f._bottomManual) {
      let m = mins(f.timeOut) - mins(f.timeIn); if (m < 0) m += 1440;
      if (m > 0 && m < 240) { f.bottom = m; const bi = form.querySelector('[data-f="bottom"]'); if (bi) bi.value = m; }
    }
    // surface interval from the previous dive that day
    const si = form.querySelector('#si');
    if (si) {
      const prev = index().filter(x => x.date === f.date && x.id !== editingId && x.timeOut && f.timeIn && x.timeOut <= f.timeIn).pop();
      si.textContent = prev ? `Surface interval since ${prev.site}: ${hm(mins(f.timeIn) - mins(prev.timeOut))}` : '';
    }
    const p = form.querySelector('#prof'); if (p) p.innerHTML = profileSVG(f);
    const sac = sacOf(f); const s = form.querySelector('#sac');
    if (s) s.innerHTML = sac ? `Air use <b style="color:var(--ink)">${Math.round(sac)} L/min</b>${f.avgDepth ? '' : ' (est.)'}` : f.gas.start && f.gas.end ? 'Add bottom time & depth for air use' : '';
  }

  function drawDivePhotos() {
    const g = view.querySelector('#dph'); if (!g) return;
    g.innerHTML = f.photos.map((p, i) => `<div class="ph"><img src="${K.blobURL(p.blob)}" alt=""><button type="button" class="phx" data-rmp="${i}" aria-label="Remove">${I('x')}</button>
      <input data-capp="${i}" maxlength="70" value="${esc(p.caption || '')}" placeholder="Caption…"></div>`).join('') +
      (f.photos.length < 6 ? `<label class="ph add"><input type="file" accept="image/*" multiple id="dphin"><span>${I('camera')}<b>Add photos</b><small>Up to ${6 - f.photos.length} more</small></span></label>` : '');
    const c = view.querySelector('#dphc'); if (c) c.textContent = f.photos.length ? `${f.photos.length} of 6` : '';
    g.querySelectorAll('[data-rmp]').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); f.photos.splice(+b.dataset.rmp, 1); drawDivePhotos(); }));
    g.querySelectorAll('[data-capp]').forEach(inp => inp.addEventListener('input', e => { e.stopPropagation(); f.photos[+inp.dataset.capp].caption = inp.value; }));
    const inp = g.querySelector('#dphin');
    if (inp) inp.addEventListener('change', async e => {
      const files = [...e.target.files].slice(0, 6 - f.photos.length); if (!files.length) return;
      toast(`Adding ${files.length} photo${files.length > 1 ? 's' : ''}…`);
      for (const file of files) { try { f.photos.push({ blob: await K.resize(file), caption: '' }); } catch (err) { toast('One photo couldn’t be read'); } }
      drawDivePhotos();
    });
  }

  function drawSig() {
    const box = view.querySelector('#sigbox'); if (!box) return;
    box.innerHTML = f.sig ? `<img src="${K.blobURL(f.sig)}" alt="Signature" class="sigimg"><div class="signame">${esc(f.sigName || f.guide || 'Guide')}</div>
      <div class="chips-row"><button type="button" class="chip-b" id="resign">Sign again</button><button type="button" class="chip-b" id="unsign">Remove</button></div>`
      : `<button type="button" class="btn ghost" id="signbtn" style="width:100%">${I('task')} Hand the phone to your guide</button>`;
    const sb = box.querySelector('#signbtn, #resign'); if (sb) sb.addEventListener('click', signSheet);
    const ub = box.querySelector('#unsign'); if (ub) ub.addEventListener('click', () => { f.sig = null; drawSig(); });
  }
  function signSheet() {
    openSheet(`<div style="padding:6px 20px 0"><span class="caps" style="color:var(--coral)">Dive Nº ${editingId ? diveNo(editingId) : '—'} · ${esc(f.site)}</span></div>
      <h2>Sign here, please</h2><p class="sub">${fmtDate(f.date)}${f.maxDepth ? ' · ' + show('depth', f.maxDepth) : ''}${f.bottom ? ' · ' + f.bottom + ' min' : ''}</p>
      <div class="block"><canvas id="sigpad" class="sigpad"></canvas></div>
      <div class="block card"><input class="textin flat" id="signame" value="${esc(f.sigName || f.guide)}" placeholder="Guide’s name"></div>
      <div class="block actions"><button class="act" id="sigclear">${I('x')}Clear</button><button class="act primary" id="sigsave">${I('check')}Done</button></div>`);
    const cv = document.getElementById('sigpad'); const dpr = Math.min(3, window.devicePixelRatio || 1);
    const rect = cv.getBoundingClientRect(); cv.width = rect.width * dpr; cv.height = rect.height * dpr;
    const ctx = cv.getContext('2d'); ctx.scale(dpr, dpr); ctx.lineWidth = 2.6; ctx.lineCap = ctx.lineJoin = 'round'; ctx.strokeStyle = '#0F1D26';
    let drawing = false, last = null, marks = 0;
    // keep finger strokes from scrolling or swiping the sheet away
    ['touchstart', 'touchmove'].forEach(ev => cv.addEventListener(ev, e => { e.stopPropagation(); e.preventDefault(); }, { passive: false }));
    const pt = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    cv.addEventListener('pointerdown', e => { drawing = true; last = pt(e); cv.setPointerCapture(e.pointerId); e.preventDefault(); });
    cv.addEventListener('pointermove', e => { if (!drawing) return; const p = pt(e); ctx.beginPath(); ctx.moveTo(...last); ctx.lineTo(...p); ctx.stroke(); last = p; marks++; e.preventDefault(); });
    const up = () => { drawing = false; }; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    document.getElementById('sigclear').addEventListener('click', () => { ctx.clearRect(0, 0, cv.width, cv.height); marks = 0; });
    document.getElementById('sigsave').addEventListener('click', () => {
      f.sigName = document.getElementById('signame').value;
      if (!marks) { closeSheet(); return; }
      cv.toBlob(b => { f.sig = b; closeSheet(); drawSig(); toast('Signed ✍️'); }, 'image/png');
    });
  }

  async function save() {
    if (!String(f.site || '').trim()) { toast('Add the dive site first'); view.querySelector('[data-f="site"]').focus(); return; }
    const isNew = !editingId; if (isNew) f.id = newId();
    delete f._bottomManual; f.updated = Date.now();
    if (!f.diver) f.diver = S.get('phoneOwner', '');
    try { await DB.put(f); } catch (e) { toast('Couldn’t save on this phone'); return; }
    // remember kit and people for next time
    const last = S.get('diveLast', {}); last.suit = f.suit; last.weight = f.weight; last.tank = f.gas.tank; last.buddy = f.buddy;
    last.guide = Object.assign(last.guide || {}, { [f.boat]: f.guide }); S.set('diveLast', last);
    if (f.diver) S.set('phoneOwner', S.get('phoneOwner', '') || f.diver);
    // anything seen on the dive is spotted in the Logbook
    const sp = S.get('spotted', {}); let newSp = 0; f.species.forEach(id => { if (!sp[id]) { sp[id] = f.date; newSp++; } }); S.set('spotted', sp);
    await refresh();
    toast(`Dive Nº ${diveNo(f.id)} logged 🤿${newSp ? ` · ${newSp} new species` : ''}`);
    go('#/dive/' + f.id);
  }

  /* ---------------- Dive detail ---------------- */
  async function viewDive(id) {
    A.releaseURLs();
    const r = await DB.get(id).catch(() => null); if (!r) return go('#/log');
    const d = DAY(r.date); const idx = index(); const i = idx.findIndex(x => x.id === id);
    const prev = idx[i - 1], next = idx[i + 1]; const no = diveNo(id); const sac = sacOf(r);
    const pbs = [];
    const all = idx.filter(x => x.id !== id);
    if (r.maxDepth && all.every(x => (x.maxDepth || 0) < r.maxDepth) && idx.length > 1) pbs.push('Deepest of the trip');
    if (r.bottom && all.every(x => (x.bottom || 0) < r.bottom) && idx.length > 1) pbs.push('Longest of the trip');
    if (r.waterTemp != null && all.every(x => x.waterTemp == null || x.waterTemp > r.waterTemp) && all.some(x => x.waterTemp != null)) pbs.push('Coldest water');
    if (r.fav) pbs.unshift('♥ Dive of the trip');
    const hero = r.photos.length ? K.blobURL(r.photos[0].blob) : img(d.img);
    const sp = r.species.map(speciesOf).filter(Boolean);
    const cond = [r.current != null ? `Current: ${CURRENT[r.current]}` : '', r.surge != null ? `Surge: ${SURGE[r.surge]}` : '', r.thermo ? 'Thermocline' : '', r.entry ? `${r.entry} entry` : '', ...(r.tags || [])].filter(Boolean);
    const kitBits = [r.suit && r.suit.mm != null ? (r.suit.mm === 'Dry' ? 'Drysuit' : r.suit.mm + ' mm') : '', r.suit && r.suit.hood ? 'hood' : '', r.suit && r.suit.vest ? 'hooded vest' : '', r.suit && r.suit.shorty ? 'shorty layer' : '', r.suit && r.suit.gloves ? 'gloves' : '', r.weight ? show('weight', r.weight) : ''].filter(Boolean);
    const felt = FELT.find(x => x[0] === r.felt);
    view.innerHTML = `
      <section class="dayhero" style="height:52vh;min-height:360px"><img src="${hero}" alt="">
        <div class="inner"><div class="navbtns"><a class="roundbtn" href="#/log" aria-label="Back">${I('left')}</a>
          <a class="roundbtn" href="#/dive/${id}/edit" aria-label="Edit">${I('sliders')}</a></div>
          <div class="bottom"><div class="kick">Dive Nº ${no} · ${fmtDate(r.date)}${r.timeIn ? ' · ' + r.timeIn : ''}</div>
            <h1>${esc(r.site)}</h1><div class="pl">${esc(whereOf(r, d))}${r.diver ? ' · ' + esc(r.diver) : ''}</div>
            <div class="chips"><span class="chip" style="background:${phaseColor(r.boat)};color:#fff">${r.boat === 'gs' ? 'Galapagos Sky' : 'Anne Bonny'}</span>
              ${r.rating ? `<span class="chip" style="background:rgba(255,255,255,.18);color:#FFD9A8">${'★'.repeat(r.rating)}</span>` : ''}
              ${pbs.map(p => `<span class="chip" style="background:var(--coral);color:#fff">${esc(p)}</span>`).join('')}</div></div></div></section>
      <div class="sec"><div class="dstats">
        <div><b>${show('depth', r.maxDepth)}</b><span>max depth</span></div>
        <div><b>${r.bottom ? r.bottom + '′' : '—'}</b><span>bottom time</span></div>
        <div><b>${show('temp', r.waterTemp)}</b><span>water</span></div>
        <div><b>${show('vis', r.vis)}</b><span>visibility</span></div>
      </div></div>
      <div class="sec"><div class="card profcard">${profileSVG(r, 360, 140)}
        <div class="profmeta"><span>${r.timeIn || '—'} → ${r.timeOut || '—'}</span><span>avg ${show('depth', r.avgDepth)}</span><span>${r.gas.o2 === 21 ? 'Air' : 'EAN' + r.gas.o2}</span>
        <span>${r.gas.start ? `${show('press', r.gas.start)} → ${show('press', r.gas.end)}` : 'gas —'}</span>${sac ? `<span><b>${Math.round(sac)} L/min</b> SAC</span>` : ''}</div></div></div>
      ${sp.length || r.speciesOther ? `<div class="sec"><div class="sec-h"><h3>What we saw</h3></div><div class="spgrid static">${sp.map(w => `<div class="spc on"><img src="${img(w.img)}" alt=""><span>${esc(w.name)}</span></div>`).join('')}</div>
        ${r.speciesOther ? `<p class="muted" style="margin:10px 4px 0;font-size:14px">Also: ${esc(r.speciesOther)}</p>` : ''}</div>` : ''}
      ${r.notes ? `<p class="lede" style="--pc:${phaseColor(r.boat)}">${esc(r.notes)}</p>` : ''}
      ${cond.length || kitBits.length || felt ? `<div class="sec"><div class="card pad">
        ${cond.length ? `<span class="lbl">Conditions</span><div class="chips">${cond.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>` : ''}
        ${kitBits.length || felt ? `<span class="lbl" style="margin-top:12px">Kit</span><div class="chips">${kitBits.map(c => `<span class="chip">${esc(c)}</span>`).join('')}${felt ? `<span class="chip">${felt[1]} ${felt[2]}</span>` : ''}</div>` : ''}
        ${r.buddy || r.guide ? `<span class="lbl" style="margin-top:12px">With</span><div class="chips">${r.buddy ? `<span class="chip">Buddy: ${esc(r.buddy)}</span>` : ''}${r.guide ? `<span class="chip">Guide: ${esc(r.guide)}</span>` : ''}</div>` : ''}
      </div></div>` : ''}
      ${r.photos.length > 1 ? `<div class="sec"><div class="sec-h"><h3>Photos</h3></div><div class="phgrid">${r.photos.map(p => `<div class="ph"><img src="${K.blobURL(p.blob)}" alt="">${p.caption ? `<div class="cap">${esc(p.caption)}</div>` : ''}</div>`).join('')}</div></div>` : ''}
      ${r.sig ? `<div class="sec"><div class="card pad sigbox"><span class="lbl">Verified by</span><img src="${K.blobURL(r.sig)}" class="sigimg" alt="Signature"><div class="signame">${esc(r.sigName || r.guide || '')}</div></div></div>` : ''}
      <div class="sec" style="display:grid;gap:10px">
        <button class="btn" id="sharecard" style="background:var(--coral);padding:15px">${I('share')} Share dive card</button>
        <a class="btn ghost" href="#/dive/${id}/edit">${I('sliders')} Edit dive</a>
        <button class="btn ghost" id="deldive" style="color:#D2462A">Delete dive</button></div>
      <div class="sec daynav">
        ${prev ? `<a class="card" href="#/dive/${prev.id}"><small>← Nº ${diveNo(prev.id)}</small><b>${esc(prev.site)}</b></a>` : '<span></span>'}
        ${next ? `<a class="card next" href="#/dive/${next.id}"><small>Nº ${diveNo(next.id)} →</small><b>${esc(next.site)}</b></a>` : '<span></span>'}</div>`;
    view.querySelector('#sharecard').addEventListener('click', () => shareCard(r));
    view.querySelector('#deldive').addEventListener('click', async () => { if (!confirm(`Delete dive Nº ${no} at ${r.site}?`)) return; await DB.del(id); await refresh(); toast('Dive deleted'); go('#/log'); });
  }

  /* ---------------- Dive card (1080×1350, for Instagram/WhatsApp) ---------------- */
  async function shareCard(r) {
    toast('Making your dive card…');
    await K.fontsReady();
    const CW = 1080, CH = 1350, m = 64; const d = DAY(r.date);
    const c = document.createElement('canvas'); c.width = CW; c.height = CH; const ctx = c.getContext('2d');
    ctx.fillStyle = K.C.abyss; ctx.fillRect(0, 0, CW, CH);
    const im = await K.loadImg(r.photos.length ? K.blobURL(r.photos[0].blob) : img(d.img)).catch(() => null);
    const PH = 760; if (im) K.cover(ctx, im, 0, 0, CW, PH);
    let g = ctx.createLinearGradient(0, 0, 0, 300); g.addColorStop(0, 'rgba(7,32,46,.7)'); g.addColorStop(1, 'rgba(7,32,46,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, CW, 300);
    g = ctx.createLinearGradient(0, PH - 380, 0, PH); g.addColorStop(0, 'rgba(7,32,46,0)'); g.addColorStop(1, 'rgba(7,32,46,1)'); ctx.fillStyle = g; ctx.fillRect(0, PH - 380, CW, 380);
    ctx.fillStyle = '#fff'; K.font(ctx, 400, 72, K.SERIF, true); ctx.fillText('El Niño', m, 116);
    K.font(ctx, 700, 20, K.SANS); K.caps(ctx, `Dive Nº ${diveNo(r.id)}`, CW - m, 100, 5, 'right');
    ctx.globalAlpha = .8; K.font(ctx, 600, 18, K.SANS); K.caps(ctx, fmtDate(r.date) + (r.timeIn ? ' · ' + r.timeIn : ''), CW - m, 132, 3, 'right'); ctx.globalAlpha = 1;
    K.font(ctx, 500, 88, K.SERIF); const tl = K.wrap(ctx, r.site, CW - 2 * m).slice(0, 2);
    tl.forEach((l, i) => ctx.fillText(l, m, PH - 70 - (tl.length - 1 - i) * 92));
    K.font(ctx, 500, 28, K.SANS); ctx.globalAlpha = .85; ctx.fillText(`${whereOf(r, d)} · ${r.boat === 'gs' ? 'Galapagos Sky' : 'Anne Bonny'}`, m, PH - 22); ctx.globalAlpha = 1;
    // stats
    const st = [[show('depth', r.maxDepth), 'max depth'], [r.bottom ? r.bottom + ' min' : '—', 'bottom time'], [show('temp', r.waterTemp), 'water'], [show('vis', r.vis), 'visibility']];
    const cw = (CW - 2 * m) / 4;
    st.forEach(([v, l], i) => { const x = m + i * cw + cw / 2; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; K.font(ctx, 400, 58, K.SERIF); ctx.fillText(v, x, PH + 110); ctx.fillStyle = 'rgba(255,255,255,.6)'; K.font(ctx, 700, 16, K.SANS); K.caps(ctx, l, x, PH + 148, 3, 'center'); });
    ctx.textAlign = 'left';
    // profile
    if (!drawProfile(ctx, r, m, PH + 180, CW - 2 * m, 190, 'dark')) { ctx.fillStyle = 'rgba(255,255,255,.08)'; K.rr(ctx, m, PH + 200, CW - 2 * m, 180, 24); ctx.fill(); }
    // species + rating
    let y = PH + 398; const sp = r.species.map(speciesOf).filter(Boolean).slice(0, 4);
    let x = m;
    for (const w of sp) {
      K.font(ctx, 600, 22, K.SANS); const cwid = ctx.measureText(w.name).width + 86; if (x + cwid > CW - m) break;
      ctx.fillStyle = 'rgba(255,255,255,.1)'; K.rr(ctx, x, y, cwid, 60, 30); ctx.fill();
      const wim = await K.loadImg(img(w.img)).catch(() => null);
      if (wim) { ctx.save(); ctx.beginPath(); ctx.arc(x + 30, y + 30, 23, 0, Math.PI * 2); ctx.clip(); K.cover(ctx, wim, x + 7, y + 7, 46, 46); ctx.restore(); }
      ctx.fillStyle = '#fff'; ctx.fillText(w.name, x + 64, y + 38); x += cwid + 12;
    }
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(m, CH - 92, CW - 2 * m, 2);
    ctx.fillStyle = '#FFD9A8'; K.font(ctx, 400, 34, K.SANS); ctx.fillText(r.rating ? '★'.repeat(r.rating) : '', m, CH - 40);
    ctx.fillStyle = 'rgba(255,255,255,.7)'; K.font(ctx, 600, 17, K.SANS); K.caps(ctx, `Galápagos 2026${r.diver ? ' · ' + r.diver : ''}`, CW - m, CH - 46, 3, 'right');
    const blob = await new Promise(res => c.toBlob(res, 'image/jpeg', 0.9));
    K.shareFile(blob, `el-nino-dive-${diveNo(r.id)}.jpg`, `Dive Nº ${diveNo(r.id)} · ${r.site}`);
  }

  /* ---------------- Logbook PDF ---------------- */
  async function exportLogbook() {
    openSheet(`<div style="padding:6px 20px 0"><span class="caps" style="color:var(--coral)">Logbook PDF</span></div><h2>Printing your logbook…</h2>
      <p class="sub" id="lprog">Starting</p><div class="block"><div class="render-wait"><div class="spinner"></div>One page per dive, signatures included.</div></div>`);
    const prog = t => { const p = document.getElementById('lprog'); if (p) p.textContent = t; };
    try {
      await K.fontsReady();
      const all = (await DB.all()).sort((a, b) => (a.date + (a.timeIn || '99') + a.id).localeCompare(b.date + (b.timeIn || '99') + b.id));
      const jpgs = [await K.jpegBytes(await logCover(all), 0.85)];
      for (let i = 0; i < all.length; i++) { prog(`Dive ${i + 1} of ${all.length}`); const c = await logPage(all[i]); jpgs.push(await K.jpegBytes(c, 0.82)); c.width = c.height = 0; }
      const pdf = K.makePDF(jpgs, K.W, K.H);
      const sh = document.querySelector('.sheet'); if (!sh) return;
      sh.querySelector('h2').textContent = 'Your logbook';
      prog(`${jpgs.length} pages · ${(pdf.size / 1048576).toFixed(1)} MB`);
      sh.querySelector('.block').outerHTML = `<div class="block"><div class="pagestrip"><figure><img src="${K.blobURL(new Blob([jpgs[Math.min(1, jpgs.length - 1)]], { type: 'image/jpeg' }))}" alt=""><figcaption>A dive page</figcaption></figure><figure><img src="${K.blobURL(new Blob([jpgs[0]], { type: 'image/jpeg' }))}" alt=""><figcaption>Summary</figcaption></figure></div></div>
        <div class="block actions"><button class="act primary" id="sharelog">${I('doc')}Share PDF</button><button class="act" data-close>${I('x')}Close</button></div>`;
      sh.querySelector('#sharelog').addEventListener('click', () => K.shareFile(pdf, 'el-nino-dive-log.pdf', 'El Niño · Dive log'));
    } catch (e) { console.error(e); prog('Something went wrong. Try again?'); }
  }
  function box(ctx, x, y, w, h, label, value, sub) {
    const C = K.C; ctx.strokeStyle = C.line; ctx.lineWidth = 2; K.rr(ctx, x, y, w, h, 16); ctx.stroke();
    ctx.fillStyle = C.muted; K.font(ctx, 700, 15, K.SANS); K.caps(ctx, label, x + 20, y + 34, 3);
    ctx.fillStyle = C.ink; K.font(ctx, 400, sub ? 36 : 40, K.SERIF); K.para(ctx, value || '—', x + 20, y + (sub ? 74 : 84), w - 40, 44, 1);
    if (sub) { ctx.fillStyle = C.muted; K.font(ctx, 500, 16, K.SANS); K.para(ctx, sub, x + 20, y + h - 16, w - 40, 20, 1); }
  }
  async function logPage(r) {
    const { W, H, M, C } = K; const d = DAY(r.date); const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    // header
    ctx.fillStyle = C.ink; K.font(ctx, 400, 30, K.SERIF, true); ctx.fillText('El Niño · Dive log', M, 92);
    ctx.fillStyle = C.coral; K.font(ctx, 700, 18, K.SANS); K.caps(ctx, `${r.boat === 'gs' ? 'Galapagos Sky' : 'Anne Bonny'} · Day ${d.n}`, W - M, 88, 4, 'right');
    ctx.fillStyle = C.ink; ctx.fillRect(M, 116, W - 2 * M, 3);
    ctx.fillStyle = C.coral; K.font(ctx, 300, 150, K.SERIF); ctx.fillText(String(diveNo(r.id)), M - 6, 270);
    const nw = ctx.measureText(String(diveNo(r.id))).width;
    ctx.fillStyle = C.ink; K.font(ctx, 500, 58, K.SERIF); K.para(ctx, r.site, M + nw + 36, 208, W - 2 * M - nw - 36, 60, 1);
    ctx.fillStyle = C.muted; K.font(ctx, 500, 24, K.SANS); ctx.fillText(`${fmtDate(r.date)} 2026 · ${whereOf(r, d)}`, M + nw + 38, 254);
    // boxes
    const gy = 300, bw = (W - 2 * M - 3 * 20) / 4, bh = 124;
    const sac = sacOf(r);
    const rows = [
      [['Time in', r.timeIn], ['Time out', r.timeOut], ['Bottom time', r.bottom ? r.bottom + ' min' : ''], ['Surface int.', (() => { const p = index().filter(x => x.date === r.date && x.id !== r.id && x.timeOut && r.timeIn && x.timeOut <= r.timeIn).pop(); return p ? hm(mins(r.timeIn) - mins(p.timeOut)) : ''; })()]],
      [['Max depth', r.maxDepth != null ? show('depth', r.maxDepth) : ''], ['Avg depth', r.avgDepth != null ? show('depth', r.avgDepth) : ''], ['Water', r.waterTemp != null ? show('temp', r.waterTemp) : ''], ['Visibility', r.vis != null ? show('vis', r.vis) : '']],
      [['Gas', r.gas.o2 === 21 ? 'Air' : `EAN${r.gas.o2}`, (TANKS.find(t => t[1] === r.gas.tank) || [''])[0]], ['Pressure', r.gas.start ? `${toUser('press', r.gas.start)}→${toUser('press', r.gas.end)}` : '', unitLabel('press')], ['Air use', sac ? Math.round(sac) + ' L/min' : '', 'SAC'], ['Current', r.current != null ? CURRENT[r.current].replace(' 🌀', '') : '', r.surge != null ? 'surge: ' + SURGE[r.surge].toLowerCase() : '']],
      [['Suit', r.suit ? (r.suit.mm === 'Dry' ? 'Drysuit' : r.suit.mm + ' mm') : '', [r.suit && r.suit.hood && 'hood', r.suit && r.suit.vest && 'vest', r.suit && r.suit.gloves && 'gloves'].filter(Boolean).join(', ')], ['Weights', r.weight ? show('weight', r.weight) : ''], ['Felt', (FELT.find(x => x[0] === r.felt) || ['', '', ''])[2]], ['Entry', r.entry || '', r.thermo ? 'thermocline' : '']]
    ];
    rows.forEach((row, ri) => row.forEach(([l, v, sub], ci) => box(ctx, M + ci * (bw + 20), gy + ri * (bh + 18), bw, bh, l, v, sub)));
    let y = gy + 4 * (bh + 18) + 20;
    // profile
    ctx.fillStyle = C.muted; K.font(ctx, 700, 15, K.SANS); K.caps(ctx, 'Profile (approximate)', M, y, 3); y += 20;
    ctx.fillStyle = '#E9E1D4'; K.rr(ctx, M, y, W - 2 * M, 190, 18); ctx.fill();
    if (!drawProfile(ctx, r, M + 20, y + 12, W - 2 * M - 40, 166, 'light')) { ctx.fillStyle = C.muted; K.font(ctx, 400, 26, K.SERIF, true); ctx.fillText('Depth and time not logged', M + 30, y + 104); }
    y += 236;
    // wildlife + tags
    const sp = r.species.map(speciesOf).filter(Boolean).map(w => w.name).concat(r.speciesOther ? [r.speciesOther] : []);
    ctx.fillStyle = C.muted; K.font(ctx, 700, 15, K.SANS); K.caps(ctx, 'Seen', M, y, 3);
    ctx.fillStyle = C.ink; K.font(ctx, 400, 28, K.SERIF); const sl = K.para(ctx, sp.join(' · ') || '—', M + 110, y + 4, W - 2 * M - 110, 36, 2); y += sl * 36 + 26;
    if ((r.tags || []).length) { ctx.fillStyle = C.muted; K.font(ctx, 700, 15, K.SANS); K.caps(ctx, 'Type', M, y, 3); ctx.fillStyle = C.ink2; K.font(ctx, 500, 24, K.SANS); K.para(ctx, r.tags.join(' · '), M + 110, y + 3, W - 2 * M - 110, 30, 1); y += 52; }
    // notes + rating
    ctx.fillStyle = C.muted; K.font(ctx, 700, 15, K.SANS); K.caps(ctx, 'Notes', M, y, 3);
    if (r.rating) { ctx.fillStyle = C.coral; K.font(ctx, 400, 28, K.SANS); ctx.textAlign = 'right'; ctx.fillText('★'.repeat(r.rating) + (r.fav ? '  ♥' : ''), W - M, y + 2); ctx.textAlign = 'left'; }
    y += 44;
    const photos = r.photos.slice(0, 3); const sigTop = H - 250;
    ctx.fillStyle = C.ink2; K.font(ctx, 400, 28, K.SERIF);
    const maxNoteLines = Math.max(2, Math.floor((sigTop - 40 - y) / 38));
    const nl = r.notes ? K.para(ctx, r.notes, M, y, W - 2 * M, 38, maxNoteLines) : 0; y += Math.max(1, nl) * 38;
    // photos strip fills whatever room is left above the signature box
    const room = sigTop - 30 - y;
    if (photos.length && room >= 150) {
      const photoH = Math.min(260, room), pw = (W - 2 * M - (photos.length - 1) * 18) / photos.length, py = y + (room - photoH) / 2;
      for (let i = 0; i < photos.length; i++) { const pim = await K.loadImg(K.blobURL(photos[i].blob)).catch(() => null); if (!pim) continue; ctx.save(); K.rr(ctx, M + i * (pw + 18), py, pw, photoH, 16); ctx.clip(); K.cover(ctx, pim, M + i * (pw + 18), py, pw, photoH); ctx.restore(); }
    }
    // signature box
    ctx.strokeStyle = C.line; ctx.lineWidth = 2; K.rr(ctx, M, sigTop, W - 2 * M, 170, 18); ctx.stroke();
    ctx.fillStyle = C.muted; K.font(ctx, 700, 15, K.SANS); K.caps(ctx, 'Guide signature / stamp', M + 24, sigTop + 36, 3);
    K.caps(ctx, `Buddy: ${r.buddy || '—'}`, W - M - 24, sigTop + 36, 3, 'right');
    if (r.sig) { const sim = await K.loadImg(K.blobURL(r.sig)).catch(() => null); if (sim) { const sh = 110, sw = Math.min(520, sim.naturalWidth / sim.naturalHeight * sh); ctx.drawImage(sim, M + 24, sigTop + 48, sw, sh); } }
    ctx.fillStyle = C.ink; K.font(ctx, 400, 28, K.SERIF, true); ctx.textAlign = 'right'; ctx.fillText(r.sigName || r.guide || '', W - M - 24, sigTop + 140); ctx.textAlign = 'left';
    ctx.fillStyle = C.line; ctx.fillRect(M, H - 56, W - 2 * M, 2);
    ctx.fillStyle = C.muted; K.font(ctx, 600, 16, K.SANS); K.caps(ctx, `${r.diver || T.travellers.join(' & ')} · Galápagos 2026`, M, H - 24, 3); K.caps(ctx, `Dive Nº ${diveNo(r.id)}`, W - M, H - 24, 3, 'right');
    return c;
  }
  async function logCover(all) {
    const { W, H, M, C } = K; const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    ctx.fillStyle = C.abyss; ctx.fillRect(0, 0, W, H);
    const hero = all.find(r => r.photos.length); const im = await K.loadImg(hero ? K.blobURL(hero.photos[0].blob) : img('hammerschool')).catch(() => null);
    if (im) K.cover(ctx, im, 0, 0, W, 760);
    const g = ctx.createLinearGradient(0, 300, 0, 760); g.addColorStop(0, 'rgba(7,32,46,0)'); g.addColorStop(1, 'rgba(7,32,46,1)'); ctx.fillStyle = g; ctx.fillRect(0, 300, W, 460);
    ctx.fillStyle = '#fff'; K.font(ctx, 600, 21, K.SANS); K.caps(ctx, 'Galápagos · Oct–Nov 2026', M, 96, 5);
    K.font(ctx, 400, 150, K.SERIF, true); ctx.fillText('Dive log', M - 6, 660);
    K.font(ctx, 400, 34, K.SERIF, true); ctx.globalAlpha = .85; ctx.fillText(`${[...new Set(all.map(r => r.diver).filter(Boolean))].join(' & ') || T.travellers.join(' & ')} · El Niño`, M, 720); ctx.globalAlpha = 1;
    const idx = index(); const tot = idx.reduce((a, x) => a + (x.bottom || 0), 0); const deep = Math.max(0, ...idx.map(x => x.maxDepth || 0));
    const st = [[String(all.length), 'dives'], [tot ? hm(tot) : '—', 'underwater'], [deep ? show('depth', deep) : '—', 'deepest'], [String(new Set(all.flatMap(r => r.species)).size), 'species']];
    const cw = (W - 2 * M) / 4;
    st.forEach(([v, l], i) => { const x = M + i * cw + cw / 2; ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; K.font(ctx, 400, 64, K.SERIF); ctx.fillText(v, x, 850); ctx.fillStyle = 'rgba(255,255,255,.6)'; K.font(ctx, 700, 16, K.SANS); K.caps(ctx, l, x, 890, 3, 'center'); });
    ctx.textAlign = 'left';
    // table of dives
    let y = 970; ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(M, y - 30, W - 2 * M, 2);
    const cols = [[M, 'Nº'], [M + 100, 'Date'], [M + 260, 'Site'], [W - M - 330, 'Depth'], [W - M - 200, 'Time'], [W - M - 90, 'Temp']];
    ctx.fillStyle = 'rgba(255,255,255,.55)'; K.font(ctx, 700, 15, K.SANS); cols.forEach(([x, l]) => K.caps(ctx, l, x, y, 3)); y += 40;
    const maxRows = Math.floor((H - 80 - y) / 34);
    all.slice(0, maxRows).forEach(r => {
      ctx.fillStyle = '#fff'; K.font(ctx, 500, 22, K.SANS);
      ctx.fillText(String(diveNo(r.id)), cols[0][0], y); ctx.fillText(fmtDate(r.date, { short: true }), cols[1][0], y);
      K.para(ctx, r.site, cols[2][0], y, cols[3][0] - cols[2][0] - 20, 26, 1);
      ctx.fillText(r.maxDepth != null ? show('depth', r.maxDepth) : '—', cols[3][0], y); ctx.fillText(r.bottom ? r.bottom + '′' : '—', cols[4][0], y); ctx.fillText(r.waterTemp != null ? show('temp', r.waterTemp) : '—', cols[5][0], y);
      y += 34;
    });
    if (all.length > maxRows) { ctx.fillStyle = 'rgba(255,255,255,.6)'; K.font(ctx, 400, 22, K.SERIF, true); ctx.fillText(`…and ${all.length - maxRows} more`, M, y + 6); }
    return c;
  }

  migrate().catch(() => {});
  return { viewForm, viewDive, logbookHTML, bindLogbook, siteBlock, extraDives, diveRow, index, count, refresh };
};
