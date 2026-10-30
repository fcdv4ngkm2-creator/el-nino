/* El Niño — Dispatches: a magazine-style page home from each day of the trip.
   Photos + the day's log + logbook highlights + a fun fact, laid out on canvas and
   exported as a PDF (and a postcard JPEG). Everything stays on the phone (IndexedDB). */
window.ElNinoDispatch = function (A) {
  'use strict';
  const { T, S, I, esc, img, fmtDate, view, toast, go, openSheet, closeSheet, phaseColor, km } = A;

  /* ---------------- Storage (IndexedDB: photos are too big for localStorage) ---------------- */
  const DB = {
    _db: null,
    open() {
      if (this._db) return Promise.resolve(this._db);
      return new Promise((res, rej) => {
        const r = indexedDB.open('elnino-dispatches', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('d', { keyPath: 'date' });
        r.onsuccess = () => { this._db = r.result; res(r.result); };
        r.onerror = () => rej(r.error);
      });
    },
    async tx(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const t = db.transaction('d', mode); const st = t.objectStore('d'); const out = fn(st);
        t.oncomplete = () => res(out instanceof IDBRequest ? out.result : out);
        t.onerror = () => rej(t.error);
      });
    },
    get(date) { return this.tx('readonly', st => st.get(date)); },
    put(rec) { return this.tx('readwrite', st => { st.put(rec); }); },
    del(date) { return this.tx('readwrite', st => { st.delete(date); }); },
    all() { return this.tx('readonly', st => st.getAll()); }
  };
  try { navigator.storage && navigator.storage.persist && navigator.storage.persist(); } catch (e) {}

  /* ---------------- Fun facts ---------------- */
  // k: matches species ids, site ids, place keys, phase ids or 'any'. Most specific match wins.
  const FACTS = [
    { k: ['iguana', 'douglas', 'espinosa'], t: 'Marine iguanas are the only lizards on Earth that forage in the sea. They sneeze out the extra salt through glands in their noses.' },
    { k: ['iguana'], t: 'In El Niño years, when their algae dies back, marine iguanas can actually shrink, bones included, then grow again when food returns.' },
    { k: ['penguin', 'tagus', 'vroca'], t: 'The Galápagos penguin is the only penguin that lives north of the equator. A few nest on the northern tip of Isabela.' },
    { k: ['penguin'], t: 'Galápagos penguins survive the equatorial sun thanks to the cold Cromwell Current, which wells up along the western islands.' },
    { k: ['cormorant', 'tagus', 'espinosa'], t: 'The flightless cormorant is the only cormorant in the world that can’t fly. Its wings are about a third of the size it would need.' },
    { k: ['mola', 'vroca'], t: 'The Mola mola is the heaviest bony fish in the world, and can weigh over two tonnes. They visit cleaning stations so small fish can pick off their parasites.' },
    { k: ['hammer', 'wolf', 'darwin'], t: 'A hammerhead’s wide head spreads out its electrical sensors like a metal detector. By day they school in hundreds; at night they hunt alone.' },
    { k: ['whale', 'darwin'], t: 'Almost all the whale sharks seen at Darwin are large females, and many appear to be pregnant. Nobody yet knows where they give birth.' },
    { k: ['whale'], t: 'Every whale shark’s pattern of spots is unique, like a fingerprint. Researchers identify individuals from divers’ photos.' },
    { k: ['darwin'], t: 'Darwin’s Arch collapsed into the sea in May 2021. And Charles Darwin himself never set foot on the island named after him.' },
    { k: ['wolf'], t: 'Wolf Island is named after the German geologist Theodor Wolf, who surveyed the Galápagos in the 1870s.' },
    { k: ['sealion', 'piedra', 'gavilanes'], t: 'Galápagos sea lions are found almost nowhere else on Earth. They’re the archipelago’s welcoming committee, and its most playful dive buddies.' },
    { k: ['turtle', 'elizabeth', 'patillos'], t: 'A resting green turtle can stay underwater for hours. Females swim back to the beach where they hatched to lay their own eggs.' },
    { k: ['batfish'], t: 'The red-lipped batfish is a poor swimmer. It mostly walks along the sea floor on its stiff, leg-like fins.' },
    { k: ['booby', 'seymour'], t: 'A blue-footed booby’s feet get their colour from pigments in fresh fish. The bluer the feet, the healthier the bird, and the more attractive to a mate.' },
    { k: ['seymour'], t: 'The land iguanas on North Seymour were moved there from Baltra in the 1930s. Later, when Baltra’s own iguanas died out, North Seymour’s were used to bring them back.' },
    { k: ['tortoise'], t: 'The islands are named after their tortoises: “galápago” is an old Spanish word for tortoise, after the saddle-like shape of some shells.' },
    { k: ['tortoise'], t: 'Galápagos giant tortoises can live for well over 100 years. Some alive today hatched before the First World War.' },
    { k: ['pinzon'], t: 'After rats were cleared from Pinzón in 2012, baby tortoises were found hatching in the wild there for the first time in over a century.' },
    { k: ['fernandina', 'douglas', 'espinosa', 'patillos', 'gavilanes'], t: 'Fernandina is the youngest island in the Galápagos and one of the most active volcanoes in the world.' },
    { k: ['isabela', 'vroca', 'tagus', 'elizabeth', 'albemarle'], t: 'Isabela is shaped like a seahorse. It formed when six shield volcanoes merged, and it straddles the equator.' },
    { k: ['tagus'], t: 'Tagus Cove is named after HMS Tagus, which anchored here in 1814. Sailors have been carving their ships’ names into its cliffs ever since.' },
    { k: ['albemarle', 'wolf', 'darwin'], t: 'You’ve crossed into the Northern Hemisphere! Wolf, Darwin and northern Isabela all sit above the equator.' },
    { k: ['ayora', 'tortoise'], t: 'Puerto Ayora is home to the Charles Darwin Research Station, where Lonesome George, the last Pinta Island tortoise, lived until 2012.' },
    { k: ['dock', 'lobos', 'gs'], t: 'Charles Darwin’s first landing in the Galápagos was on San Cristóbal, in September 1835. Its town, Puerto Baquerizo Moreno, is the islands’ capital.' },
    { k: ['gps', 'borrero'], t: 'Baltra’s airport began life as a US air base in the Second World War, guarding the approach to the Panama Canal.' },
    { k: ['quito'], t: 'Quito’s old town was one of the first places ever named a UNESCO World Heritage Site, in 1978.' },
    { k: ['quito'], t: 'Quito sits about 2,850 m up. That’s more than twice the height of Ben Nevis, and it’s a capital city.' },
    { k: ['ab', 'gs', 'any'], t: '“El Niño” means “the boy”, as in the Christ child. Peruvian fishermen named the warm current because it tended to arrive around Christmas.' },
    { k: ['ab', 'gs', 'any'], t: 'Three ocean currents collide around the Galápagos: the cold Humboldt, the warm Panama current and the deep Cromwell. That’s why penguins and tropical fish share the same water.' },
    { k: ['any'], t: '“Ecuador” is simply Spanish for “equator”. The line runs about 25 km north of Quito.' },
    { k: ['any'], t: 'About 97% of the Galápagos’ land is national park, and the marine reserve around it is one of the largest in the world.' },
    { k: ['home'], t: 'Between London and the islands you’ll have covered more than 22,000 km by air, over half the way around the planet.' }
  ];
  function factsFor(d, spottedIds) {
    const keys = [...spottedIds];
    d.events.forEach(e => { if (e.site) keys.push(e.site); if (e.place) keys.push(e.place); });
    if (d.phase === 'out' || d.date >= '2026-11-16') keys.push(d.date === '2026-11-18' ? 'home' : 'quito');
    if (d.date === '2026-11-17' || d.date === '2026-11-16') keys.push('quito');
    if (/Fernandina/.test(d.place)) keys.push('fernandina');
    if (/Isabela/.test(d.place)) keys.push('isabela');
    keys.push(d.phase, 'any');
    const out = [];
    keys.forEach(k => FACTS.forEach(f => { if (f.k.includes(k) && !out.includes(f.t)) out.push(f.t); }));
    return out;
  }

  /* ---------------- Day data ---------------- */
  const LONDON = [51.5074, -0.1278];
  function dayLL(d) {
    const se = d.events.find(e => e.site); if (se) return T.sites.find(s => s.id === se.site).ll;
    const pe = d.events.slice().reverse().find(e => e.place && T.places[e.place].ll); if (pe) return T.places[pe.place].ll;
    return d.date === '2026-11-18' ? LONDON : T.places.plaza.ll;
  }
  const inIslands = d => d.date >= '2026-10-30' && d.date <= '2026-11-15';
  function coords(ll) {
    const f = (v, p, n) => { const a = Math.abs(v); const deg = Math.floor(a); const min = Math.round((a - deg) * 60); return `${deg}°${String(min).padStart(2, '0')}′${v >= 0 ? p : n}`; };
    return `${f(ll[0], 'N', 'S')}  ${f(ll[1], 'E', 'W')}`;
  }
  function spottedOn(date) { const sp = S.get('spotted', {}); return T.wildlife.filter(w => sp[w.id] === date); }
  function divesOn(d) {
    const by = {};
    A.diveIndex().filter(x => x.date === d.date).forEach(x => { const b = by[x.site] || (by[x.site] = { site: x.site, n: 0, deep: 0, mins: 0 }); b.n++; b.deep = Math.max(b.deep, +x.maxDepth || 0); b.mins += +x.bottom || 0; });
    return Object.values(by);
  }
  function totalsTo(date) {
    const sp = S.get('spotted', {});
    return { dives: A.diveIndex().filter(x => x.date <= date).length, species: Object.values(sp).filter(v => v <= date).length };
  }
  function autoHighlights(d) {
    const out = [];
    const fl = d.events.filter(e => e.flight);
    if (fl.length) out.push({ key: 'flights', t: `Flew ${[fl[0].flight.fromCity, ...fl.map(e => e.flight.toCity)].join(' → ')}` });
    divesOn(d).forEach(x => out.push({ key: 'dive:' + x.site, t: `${x.n} dive${x.n > 1 ? 's' : ''} at ${x.site}${x.deep ? ` · deepest ${Math.round(x.deep)} m` : ''}${x.mins ? ` · ${x.mins} min underwater` : ''}` }));
    d.events.filter(e => e.type === 'tour').forEach(e => out.push({ key: 'tour:' + e.id, t: `Ashore: ${e.title.replace(/^Land tour: /, '')}` }));
    if (!out.length && d.dives) out.push({ key: 'plan', t: `Diving ${d.dives.map(x => x.site).join(' & ')}` });
    return out;
  }
  const signerText = s => !s || s === 'Both' ? `Love, ${T.travellers.join(' & ')}` : `Love, ${s}`;

  /* ---------------- Photos ---------------- */
  function loadImg(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
  async function resize(file, max = 1500) {
    const url = URL.createObjectURL(file);
    try {
      const im = await loadImg(url);
      const s = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * s); c.height = Math.round(im.naturalHeight * s);
      c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
      return await new Promise(r => c.toBlob(r, 'image/jpeg', 0.84));
    } finally { URL.revokeObjectURL(url); }
  }
  let liveURLs = [];
  const blobURL = b => { const u = URL.createObjectURL(b); liveURLs.push(u); return u; };
  function releaseURLs() { liveURLs.forEach(u => URL.revokeObjectURL(u)); liveURLs = []; }

  /* ---------------- Composer ---------------- */
  const EMOJIS = ['🦈', '🐢', '🐧', '🦭', '🦎', '🐋', '🐟', '🤿', '🌊', '☀️', '🌋', '😍', '🤩', '😴', '🍹', '🏆'];
  let rec = null, saveT = null;
  const blank = d => ({ date: d.date, headline: d.title, emoji: '', note: S.get('notes:' + d.date, ''), custom: ['', '', ''], autoOff: [], factIdx: 0, signer: 'Both', cover: 0, photos: [], updated: Date.now() });
  function save() { clearTimeout(saveT); saveT = setTimeout(() => { rec.updated = Date.now(); DB.put(rec).catch(() => toast('Couldn’t save on this phone')); }, 350); }

  async function viewComposer(date) {
    releaseURLs();
    const c = A.ctx();
    const d = A.DAY(date) || c.day;
    rec = (await DB.get(d.date).catch(() => null)) || blank(d);
    const maxDay = c.status === 'pre' ? 0 : c.status === 'post' ? T.days.length - 1 : c.di;
    const days = T.days.slice(0, maxDay + 1);
    const saved = new Set((await DB.all().catch(() => [])).map(r => r.date));
    const facts = factsFor(d, spottedOn(d.date).map(w => w.id));
    const autos = autoHighlights(d);
    view.innerHTML = `
      <div style="padding:calc(var(--sat) + 14px) 16px 0;display:flex;justify-content:space-between"><a class="roundbtn dark" href="#/" aria-label="Back">${I('left')}</a><a class="roundbtn dark" href="#/dispatches" aria-label="All dispatches">${I('book')}</a></div>
      <header class="page-h" style="padding-top:12px"><div class="caps">Dispatch from the islands</div><h1>Send <em>home</em></h1><p>Add your photos and we’ll lay out a magazine page from Day ${String(d.n).padStart(2, '0')}, shared as a PDF.</p></header>
      <div class="daychips">${days.map(x => `<a href="#/dispatch/${x.date}" class="${x.date === d.date ? 'on' : ''}" style="--pc:${phaseColor(x.phase)}"><b>${String(x.n).padStart(2, '0')}</b><span>${fmtDate(x.date, { short: true }).slice(4)}</span>${saved.has(x.date) ? '<i></i>' : ''}</a>`).join('')}</div>

      <div class="sec"><div class="sec-h"><h3>Photos</h3><span class="muted" style="font-size:13px" id="phcount"></span></div>
        <div class="phgrid" id="phgrid"></div></div>

      <div class="sec"><div class="sec-h"><h3>Today in one emoji</h3></div>
        <div class="emojis">${EMOJIS.map(e => `<button data-emoji="${e}" class="${rec.emoji === e ? 'on' : ''}">${e}</button>`).join('')}</div></div>

      <div class="sec"><div class="sec-h"><h3>Headline</h3><button id="hlreset">Reset</button></div>
        <div class="card"><input class="bigin" id="headline" maxlength="60" value="${esc(rec.headline)}" placeholder="${esc(d.title)}"></div></div>

      <div class="sec"><div class="sec-h"><h3>From the deck</h3><span class="muted" style="font-size:12px">A few lines for home</span></div>
        <div class="card"><textarea class="notes" id="note" placeholder="What was the moment of the day? Who saw it first? What did the guide say?">${esc(rec.note)}</textarea></div></div>

      <div class="sec"><div class="sec-h"><h3>Highlights</h3><span class="muted" style="font-size:12px">From your logbook</span></div>
        <div class="card">
          ${autos.length ? autos.map(h => `<div class="check ${rec.autoOff.includes(h.key) ? '' : 'on'}" data-auto="${esc(h.key)}"><span class="box">${I('check')}</span><span><div class="t" style="text-decoration:none;color:var(--ink)">${esc(h.t)}</div></span></div>`).join('') : `<div class="check" style="pointer-events:none"><span class="s">Log dives and tick wildlife in the Logbook and they’ll appear here automatically.</span></div>`}
          ${spottedOn(d.date).length ? `<div class="check" style="pointer-events:none"><span class="box" style="border:0;background:var(--teal)">${I('fish')}</span><span><div class="t">Spotted: ${esc(spottedOn(d.date).map(w => w.name).join(', '))}</div><div class="s">Shown with photos on page 2</div></span></div>` : ''}
          ${rec.custom.map((v, i) => `<div class="check"><span class="box" style="border-style:dashed"></span><input class="hlin" data-custom="${i}" maxlength="80" value="${esc(v)}" placeholder="${['Best moment…', 'Biggest surprise…', 'Dad’s quote of the day…'][i]}"></div>`).join('')}
        </div></div>

      <div class="sec"><div class="factcard"><div class="caps">Did you know?</div><p id="fact">${esc(facts[rec.factIdx % facts.length])}</p>
        <button id="shuffle">${I('swap')} Another fact</button></div></div>

      <div class="sec"><div class="sec-h"><h3>Signed</h3></div>
        <div class="seg" style="margin:0">${[...T.travellers, 'Both'].map(s => `<button data-signer="${esc(s)}" class="${rec.signer === s ? 'on' : ''}">${s === 'Both' ? esc(T.travellers.join(' & ')) : esc(s)}</button>`).join('')}</div></div>

      <div class="sec" style="display:grid;gap:10px">
        <button class="btn" id="preview" style="background:var(--coral);padding:16px;font-size:16.5px">${I('doc')} Preview &amp; share the dispatch</button>
        <button class="btn ghost" data-act="family">${I('share')} Or send a quick text update</button>
        ${saved.has(d.date) ? `<button class="btn ghost" id="deldisp" style="color:#D2462A">Delete this dispatch</button>` : ''}
      </div>`;
    drawPhotos();

    const $ = s => view.querySelector(s);
    $('#headline').addEventListener('input', e => { rec.headline = e.target.value; save(); });
    $('#hlreset').addEventListener('click', () => { rec.headline = d.title; $('#headline').value = d.title; save(); });
    $('#note').addEventListener('input', e => { rec.note = e.target.value; save(); });
    view.querySelectorAll('[data-custom]').forEach(inp => inp.addEventListener('input', e => { rec.custom[+e.target.dataset.custom] = e.target.value; save(); }));
    view.querySelectorAll('[data-auto]').forEach(el => el.addEventListener('click', () => {
      const k = el.dataset.auto; const i = rec.autoOff.indexOf(k);
      if (i >= 0) rec.autoOff.splice(i, 1); else rec.autoOff.push(k);
      el.classList.toggle('on', i >= 0); save();
    }));
    view.querySelectorAll('[data-emoji]').forEach(b => b.addEventListener('click', () => {
      rec.emoji = rec.emoji === b.dataset.emoji ? '' : b.dataset.emoji;
      view.querySelectorAll('[data-emoji]').forEach(x => x.classList.toggle('on', x.dataset.emoji === rec.emoji)); save();
    }));
    view.querySelectorAll('[data-signer]').forEach(b => b.addEventListener('click', () => {
      rec.signer = b.dataset.signer; view.querySelectorAll('[data-signer]').forEach(x => x.classList.toggle('on', x === b)); save();
    }));
    $('#shuffle').addEventListener('click', () => {
      rec.factIdx = (rec.factIdx + 1) % facts.length; const p = $('#fact');
      p.classList.remove('flip'); void p.offsetWidth; p.classList.add('flip'); p.textContent = facts[rec.factIdx]; save();
    });
    $('#preview').addEventListener('click', () => preview(d, facts));
    const del = $('#deldisp');
    if (del) del.addEventListener('click', async () => { if (confirm('Delete this dispatch and its photos from this phone?')) { await DB.del(d.date); toast('Dispatch deleted'); go('#/dispatch/' + d.date); } });
  }

  function drawPhotos() {
    const g = view.querySelector('#phgrid'); if (!g) return;
    g.innerHTML = rec.photos.map((p, i) => `
      <div class="ph ${i === rec.cover ? 'iscover' : ''}">
        <img src="${blobURL(p.blob)}" alt="">
        <button class="phx" data-rm="${i}" aria-label="Remove photo">${I('x')}</button>
        <button class="phstar" data-cover="${i}">${i === rec.cover ? 'Cover ★' : 'Make cover'}</button>
        <input data-cap="${i}" maxlength="70" value="${esc(p.caption || '')}" placeholder="Caption…">
      </div>`).join('') + (rec.photos.length < 8 ? `
      <label class="ph add"><input type="file" accept="image/*" multiple id="phin"><span>${I('camera')}<b>Add photos</b><small>Up to ${8 - rec.photos.length} more</small></span></label>` : '');
    const cnt = view.querySelector('#phcount'); if (cnt) cnt.textContent = rec.photos.length ? `${rec.photos.length} of 8` : 'The first one is the cover';
    g.querySelectorAll('[data-rm]').forEach(b => b.addEventListener('click', () => { rec.photos.splice(+b.dataset.rm, 1); if (rec.cover >= rec.photos.length) rec.cover = 0; save(); drawPhotos(); }));
    g.querySelectorAll('[data-cover]').forEach(b => b.addEventListener('click', () => { rec.cover = +b.dataset.cover; save(); drawPhotos(); }));
    g.querySelectorAll('[data-cap]').forEach(inp => inp.addEventListener('input', e => { rec.photos[+e.target.dataset.cap].caption = e.target.value; save(); }));
    const inp = g.querySelector('#phin');
    if (inp) inp.addEventListener('change', async e => {
      const files = [...e.target.files].slice(0, 8 - rec.photos.length); if (!files.length) return;
      toast(`Adding ${files.length} photo${files.length > 1 ? 's' : ''}…`);
      for (const f of files) { try { rec.photos.push({ blob: await resize(f), caption: '' }); } catch (err) { toast('One photo couldn’t be read'); } }
      save(); drawPhotos();
    });
  }

  /* ---------------- Canvas helpers ---------------- */
  const W = 1240, H = 1754, M = 76;
  const C = { paper: '#F4EEE4', ink: '#0F1D26', ink2: '#33434D', muted: '#7A7F82', line: 'rgba(15,29,38,.14)', coral: '#F2643D', abyss: '#07202E', sand: '#E9DCC3' };
  const SERIF = "'Fraunces', Georgia, serif", SANS = "'Inter', -apple-system, Helvetica, Arial, sans-serif";
  const font = (ctx, w, s, fam, it) => { ctx.font = `${it ? 'italic ' : ''}${w} ${s}px ${fam}`; };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function cover(ctx, im, x, y, w, h) {
    const s = Math.max(w / im.naturalWidth, h / im.naturalHeight); const sw = w / s, sh = h / s;
    ctx.drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, x, y, w, h);
  }
  function wrap(ctx, text, maxW) {
    const words = String(text).replace(/\s+/g, ' ').trim().split(' '); const lines = []; let cur = '';
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function para(ctx, text, x, y, maxW, lh, maxLines) {
    let lines = wrap(ctx, text, maxW);
    if (maxLines && lines.length > maxLines) { lines = lines.slice(0, maxLines); let l = lines[maxLines - 1]; while (ctx.measureText(l + '…').width > maxW && l.length) l = l.slice(0, -1); lines[maxLines - 1] = l.replace(/[\s,.;:]+$/, '') + '…'; }
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh)); return lines.length;
  }
  function caps(ctx, text, x, y, sp, align) {
    const chars = [...String(text).toUpperCase()]; const w = chars.reduce((a, ch) => a + ctx.measureText(ch).width + sp, -sp);
    let cx = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    const prev = ctx.textAlign; ctx.textAlign = 'left';
    chars.forEach(ch => { ctx.fillText(ch, cx, y); cx += ctx.measureText(ch).width + sp; });
    ctx.textAlign = prev; return w;
  }
  async function fontsReady() {
    try { await Promise.all(['italic 400 100px Fraunces', '400 60px Fraunces', '500 60px Fraunces', '400 30px Inter', '600 30px Inter', '700 30px Inter'].map(f => document.fonts.load(f))); } catch (e) {}
  }
  function footer(ctx, d, page, pages, signer) {
    ctx.fillStyle = C.line; ctx.fillRect(M, H - 104, W - 2 * M, 2);
    ctx.fillStyle = C.ink; font(ctx, 400, 34, SERIF, true); ctx.textAlign = 'left'; ctx.fillText(signer || 'El Niño', M, H - 52);
    ctx.fillStyle = C.muted; font(ctx, 600, 17, SANS); caps(ctx, `El Niño · Galápagos 2026 · ${page}/${pages}`, W - M, H - 56, 3, 'right');
  }
  function pageHead(ctx, d, label) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = C.ink; font(ctx, 400, 66, SERIF, true); ctx.textAlign = 'left'; ctx.fillText('El Niño', M, 132);
    ctx.fillStyle = C.coral; font(ctx, 700, 18, SANS); caps(ctx, label, W - M, 104, 4, 'right');
    ctx.fillStyle = C.muted; font(ctx, 600, 18, SANS); caps(ctx, `Day ${String(d.n).padStart(2, '0')} · ${fmtDate(d.date)}`, W - M, 136, 3, 'right');
    ctx.fillStyle = C.ink; ctx.fillRect(M, 168, W - 2 * M, 3);
  }

  /* ---------------- Page renderer ---------------- */
  async function renderPages(r, d, facts) {
    await fontsReady();
    const photos = await Promise.all(r.photos.map(p => loadImg(blobURL(p.blob)).catch(() => null)));
    const coverIm = photos[r.cover] || await loadImg(img(d.img)).catch(() => null);
    const extras = r.photos.map((p, i) => ({ im: photos[i], cap: p.caption })).filter((p, i) => i !== r.cover && p.im);
    const pc = phaseColor(d.phase); const ph = d.phaseObj ? d.phaseObj.name : '';
    const tot = totalsTo(d.date); const ll = dayLL(d); const dist = Math.round(km(LONDON, ll));
    const spotted = spottedOn(d.date);
    const highlights = autoHighlights(d).filter(h => !r.autoOff.includes(h.key)).map(h => h.t).concat(r.custom.filter(Boolean));
    const fact = facts[r.factIdx % facts.length];
    const nxt = T.days[d.n];
    const signer = signerText(r.signer);
    const pages = [];
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d'); ctx.textBaseline = 'alphabetic'; pages.push(c); return ctx; };

    /* ---- Page 1: cover ---- */
    let ctx = mk();
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    const HH = 960;
    ctx.fillStyle = C.abyss; ctx.fillRect(0, 0, W, HH);
    if (coverIm) cover(ctx, coverIm, 0, 0, W, HH);
    let g = ctx.createLinearGradient(0, 0, 0, 420); g.addColorStop(0, 'rgba(7,32,46,.72)'); g.addColorStop(1, 'rgba(7,32,46,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, 420);
    g = ctx.createLinearGradient(0, 520, 0, HH); g.addColorStop(0, 'rgba(7,32,46,0)'); g.addColorStop(1, 'rgba(7,32,46,.9)'); ctx.fillStyle = g; ctx.fillRect(0, 520, W, HH - 520);
    ctx.fillStyle = '#fff'; font(ctx, 600, 21, SANS); caps(ctx, `Dispatch from day ${String(d.n).padStart(2, '0')} · ${fmtDate(d.date)} 2026`, M, 100, 5);
    font(ctx, 400, 176, SERIF, true); ctx.fillText('El Niño', M - 6, 268);
    font(ctx, 400, 34, SERIF, true); ctx.globalAlpha = .92; ctx.fillText('Galápagos by liveaboard', M, 326); ctx.globalAlpha = 1;
    if (r.emoji) {
      const ex = W - M - 74, ey = 186;
      ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(ex, ey, 74, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2; ctx.stroke();
      ctx.fillStyle = '#000'; ctx.font = "78px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(r.emoji, ex, ey + 4);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    }
    font(ctx, 500, 94, SERIF);
    let hl = wrap(ctx, r.headline || d.title, W - 2 * M).slice(0, 3);
    const placeY = HH - 64, lastY = placeY - 62, firstY = lastY - (hl.length - 1) * 100;
    ctx.fillStyle = '#fff'; hl.forEach((l, i) => ctx.fillText(l, M, firstY + i * 100));
    font(ctx, 500, 32, SANS); ctx.globalAlpha = .9; ctx.fillText(d.place, M, placeY); ctx.globalAlpha = 1;
    font(ctx, 700, 19, SANS); const pill = `${ph} · Day ${d.n} of ${T.days.length}`.toUpperCase();
    const pw = [...pill].reduce((a, ch) => a + ctx.measureText(ch).width + 3, 0) + 36;
    ctx.fillStyle = pc; rr(ctx, M, firstY - 92 - 46, pw, 46, 23); ctx.fill();
    ctx.fillStyle = '#fff'; caps(ctx, pill, M + 18, firstY - 92 - 16, 3);
    // stats strip
    const stats = [[`${d.n}`, `of ${T.days.length} days`], [`${tot.dives}`, 'dives logged'], [`${tot.species}`, 'species spotted'], [dist < 50 ? 'Home' : dist.toLocaleString('en-GB'), dist < 50 ? 'sweet home' : 'km from London']];
    const cw = (W - 2 * M) / 4;
    stats.forEach(([v, l], i) => {
      const x = M + i * cw;
      if (i) { ctx.fillStyle = C.line; ctx.fillRect(x, HH + 54, 2, 140); }
      ctx.fillStyle = C.ink; font(ctx, 400, 74, SERIF); ctx.textAlign = 'center'; ctx.fillText(v, x + cw / 2, HH + 136);
      ctx.fillStyle = C.muted; font(ctx, 700, 16, SANS); caps(ctx, l, x + cw / 2, HH + 180, 3, 'center');
    });
    ctx.textAlign = 'left';
    ctx.fillStyle = C.line; ctx.fillRect(M, HH + 236, W - 2 * M, 2);
    // from the deck
    let y = HH + 306;
    ctx.fillStyle = C.coral; font(ctx, 700, 19, SANS); caps(ctx, 'From the deck', M, y, 5);
    const note = (r.note || '').trim() || d.summary;
    y += 70;
    const body = note.slice(1).replace(/\s+/g, ' ').trim(), cap1 = note[0];
    // pick the largest type size that fits the space (drop cap spans the first two lines)
    let fs = 36, lh, lines1, rest, fits = false;
    for (fs = 36; fs >= 24; fs -= 2) {
      lh = Math.round(fs * 1.46); font(ctx, 500, Math.round(lh * 2.3), SERIF); const dcw0 = ctx.measureText(cap1).width + 16;
      font(ctx, 400, fs, SERIF); const l1 = wrap(ctx, body, W - 2 * M - dcw0); const first = l1.slice(0, 2).join(' ');
      const rem = body.slice(first.length).trim(); const l2 = rem ? wrap(ctx, rem, W - 2 * M) : [];
      if (y + (2 + l2.length - 1) * lh <= H - 150) { fits = true; break; }
    }
    if (!fits) fs = 24;
    lh = Math.round(fs * 1.46);
    ctx.fillStyle = C.coral; font(ctx, 500, Math.round(lh * 2.3), SERIF); ctx.fillText(cap1, M - 4, y + lh - 2);
    const dcw = ctx.measureText(cap1).width + 16;
    ctx.fillStyle = C.ink2; font(ctx, 400, fs, SERIF);
    const firstTwo = wrap(ctx, body, W - 2 * M - dcw).slice(0, 2).join(' ');
    const n1 = para(ctx, firstTwo, M + dcw, y, W - 2 * M - dcw, lh, 2);
    rest = body.slice(firstTwo.length).trim();
    if (rest) para(ctx, rest, M, y + n1 * lh, W - 2 * M, lh, Math.max(1, Math.floor((H - 150 - y - n1 * lh) / lh) + 1));
    footer(ctx, d, 1, 0, signer);

    /* ---- Page 2: the day ---- */
    ctx = mk(); pageHead(ctx, d, 'The day in full');
    y = 220;
    const mapW = 520, mapH = 600, colX = M + mapW + 44, colW = W - M - colX, colEnd = y + mapH;
    await drawMapCard(ctx, M, y, mapW, mapH, d, ll);
    ctx.fillStyle = C.coral; font(ctx, 700, 19, SANS); caps(ctx, 'The day’s log', colX, y + 22, 5);
    let ty = y + 78;
    const lbl = { hotel: 'Stay', boat: 'Aboard', dive: 'Dive', tour: 'Ashore' };
    for (const e of d.events.slice(0, 7)) {
      if (ty > colEnd - 40) break;
      if (e.time) { ctx.fillStyle = C.ink; font(ctx, 700, 23, SANS); ctx.fillText((e.approx ? '≈' : '') + e.time, colX, ty); }
      else { ctx.fillStyle = C.muted; font(ctx, 700, 15, SANS); caps(ctx, lbl[e.type] || '', colX, ty - 2, 2); }
      ctx.fillStyle = C.ink2; font(ctx, 500, 26, SANS);
      const nl = para(ctx, e.title, colX + 104, ty, colW - 104, 34, 2);
      ty += nl * 34 + 24;
    }
    const brief = (d.dives || []).flatMap(x => x.notes).filter(t => !/^(Depth|Water)/.test(t)).slice(0, 5);
    if (brief.length && ty < colEnd - 110) {
      ctx.fillStyle = C.line; ctx.fillRect(colX, ty - 6, colW, 2); ty += 40;
      ctx.fillStyle = C.muted; font(ctx, 700, 15, SANS); caps(ctx, 'From the dive brief', colX, ty, 3); ty += 46;
      for (const t of brief) {
        font(ctx, 400, 25, SERIF); const need = wrap(ctx, t, colW - 26).slice(0, 2).length * 32;
        if (ty + need > colEnd - (d.water ? 80 : 10)) break;
        ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(colX + 6, ty - 8, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = C.ink2; const nl = para(ctx, t, colX + 26, ty, colW - 26, 32, 2); ty += nl * 32 + 14;
      }
    }
    if (d.water) {
      const wy = Math.min(Math.max(ty, y + 120), colEnd - 56);
      ctx.strokeStyle = C.line; ctx.lineWidth = 2; rr(ctx, colX, wy, colW, 56, 16); ctx.stroke();
      ctx.fillStyle = C.muted; font(ctx, 700, 15, SANS); const lw = caps(ctx, 'Water', colX + 20, wy + 35, 3);
      ctx.fillStyle = C.ink; font(ctx, 600, 23, SANS); ctx.fillText(d.water, colX + 40 + lw, wy + 36);
    }
    y += mapH + 64;
    // the fun fact is anchored above the footer; everything else flows into the space above it
    font(ctx, 400, 33, SERIF); let fl = wrap(ctx, fact, W - 2 * M - 96);
    if (fl.length > 5) { fl = fl.slice(0, 5); fl[4] = fl[4].replace(/[\s,.;:]+\S*$/, '') + '…'; }
    const fh = 118 + fl.length * 46, tomorrowH = nxt ? 70 : 0, factY = H - 140 - tomorrowH - fh;
    // spotted
    ctx.fillStyle = C.coral; font(ctx, 700, 19, SANS); caps(ctx, 'Spotted', M, y, 5);
    y += 28;
    if (spotted.length) {
      let x = M, rowY = y, rows = 1;
      for (const w of spotted) {
        font(ctx, 600, 24, SANS); const cwid = ctx.measureText(w.name).width + 104;
        if (x + cwid > W - M) { x = M; rowY += 86; rows++; if (rows > 2) break; }
        ctx.fillStyle = '#FFFCF7'; rr(ctx, x, rowY, cwid, 72, 36); ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
        const wim = await loadImg(img(w.img)).catch(() => null);
        if (wim) { ctx.save(); ctx.beginPath(); ctx.arc(x + 36, rowY + 36, 28, 0, Math.PI * 2); ctx.clip(); cover(ctx, wim, x + 8, rowY + 8, 56, 56); ctx.restore(); }
        ctx.fillStyle = C.ink; ctx.fillText(w.name, x + 78, rowY + 45);
        x += cwid + 14;
      }
      y = rowY + 72 + 62;
    } else {
      ctx.fillStyle = C.muted; font(ctx, 400, 30, SERIF, true); ctx.fillText('Nothing ticked in the logbook today. The sea keeps its secrets.', M, y + 36); y += 100;
    }
    // highlights
    const hls = highlights.slice(0, 5);
    if (hls.length && y < factY - 120) {
      ctx.fillStyle = C.coral; font(ctx, 700, 19, SANS); caps(ctx, 'Highlights', M, y, 5); y += 56;
      for (let i = 0; i < hls.length; i++) {
        font(ctx, 400, 32, SERIF); const need = wrap(ctx, hls[i], W - 2 * M - 50).slice(0, 2).length * 42;
        if (y - 32 + need > factY - 28) break;
        ctx.fillStyle = C.coral; font(ctx, 400, 36, SERIF, true); ctx.fillText(String(i + 1), M, y);
        ctx.fillStyle = C.ink; font(ctx, 400, 32, SERIF); const nl = para(ctx, hls[i], M + 50, y, W - 2 * M - 50, 42, 2); y += nl * 42 + 16;
      }
      y += 26;
    }
    // photos fill any generous gap before the fact
    let ex = extras.slice();
    if (ex.length && factY - 40 - y >= 360) {
      const pw2 = (W - 2 * M - 28) / 2, phH = Math.min(420, factY - 40 - y - 50);
      ex.splice(0, 2).forEach((p, i) => {
        const x = M + i * (pw2 + 28);
        ctx.save(); rr(ctx, x, y, pw2, phH, 22); ctx.clip(); cover(ctx, p.im, x, y, pw2, phH); ctx.restore();
        if (p.cap) { ctx.fillStyle = C.ink2; font(ctx, 400, 23, SERIF, true); para(ctx, p.cap, x, y + phH + 34, pw2, 28, 1); }
      });
    }
    // fun fact
    ctx.fillStyle = C.coral; rr(ctx, M, factY, W - 2 * M, fh, 30); ctx.fill();
    ctx.save(); rr(ctx, M, factY, W - 2 * M, fh, 30); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.16)'; ctx.beginPath(); ctx.arc(W - M - 60, factY + 30, 130, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    ctx.fillStyle = '#fff'; font(ctx, 700, 19, SANS); caps(ctx, 'Did you know?', M + 48, factY + 66, 5);
    font(ctx, 400, 33, SERIF); fl.forEach((l, i) => ctx.fillText(l, M + 48, factY + 120 + i * 46));
    if (nxt) {
      ctx.fillStyle = C.muted; font(ctx, 700, 17, SANS); const tw = caps(ctx, 'Tomorrow', M, H - 152, 4);
      ctx.fillStyle = C.ink; font(ctx, 500, 26, SANS); para(ctx, `Day ${String(nxt.n).padStart(2, '0')} · ${nxt.title}${nxt.title.includes(nxt.place.split(/[ ,→·]/)[0]) ? '' : ' · ' + nxt.place}`, M + tw + 22, H - 152, W - 2 * M - tw - 22, 30, 1);
    }

    /* ---- Page 3+: the camera roll ---- */
    while (ex.length) {
      ctx = mk(); pageHead(ctx, d, 'The camera roll');
      const batch = ex.splice(0, 5); y = 220;
      const big = batch.shift(); const bigH = batch.length ? 640 : 1200;
      ctx.save(); rr(ctx, M, y, W - 2 * M, bigH, 26); ctx.clip(); cover(ctx, big.im, M, y, W - 2 * M, bigH); ctx.restore();
      if (big.cap) { ctx.fillStyle = C.ink2; font(ctx, 400, 26, SERIF, true); para(ctx, big.cap, M, y + bigH + 38, W - 2 * M, 30, 1); }
      y += bigH + 72;
      const cols = batch.length === 1 ? 1 : batch.length === 3 ? 3 : 2;
      const pw3 = (W - 2 * M - 28 * (cols - 1)) / cols, ph3 = { 1: 600, 2: 600, 3: 420, 4: 300 }[batch.length] || 300;
      batch.forEach((p, i) => {
        const x = M + (i % cols) * (pw3 + 28), yy = y + Math.floor(i / cols) * (ph3 + 70);
        ctx.save(); rr(ctx, x, yy, pw3, ph3, 22); ctx.clip(); cover(ctx, p.im, x, yy, pw3, ph3); ctx.restore();
        if (p.cap) { ctx.fillStyle = C.ink2; font(ctx, 400, 22, SERIF, true); para(ctx, p.cap, x, yy + ph3 + 32, pw3, 26, 1); }
      });
    }
    // number the footers now we know the page count
    pages.forEach((c, i) => { if (i) footer(c.getContext('2d'), d, i + 1, pages.length, signer); });
    const c1 = pages[0].getContext('2d'); c1.fillStyle = C.paper; c1.fillRect(0, H - 110, W, 110); footer(c1, d, 1, pages.length, signer);
    return pages;
  }

  async function drawMapCard(ctx, x, y, w, h, d, ll) {
    ctx.save(); rr(ctx, x, y, w, h, 28); ctx.clip();
    const g = ctx.createRadialGradient(x + w * .4, y + h * .3, 20, x + w * .5, y + h * .5, h);
    g.addColorStop(0, '#0F4A63'); g.addColorStop(.6, '#0A2E42'); g.addColorStop(1, '#061B28'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    if (inIslands(d)) {
      const MP = A.MAP; const s = Math.min((w - 70) / MP.w, (h - 120) / MP.h); const ox = x + (w - MP.w * s) / 2, oy = y + 30;
      ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
      ctx.strokeStyle = 'rgba(255,214,170,.35)'; ctx.setLineDash([8, 12]); ctx.lineWidth = 2 / s; const eq = A.proj([0, 0])[1]; ctx.beginPath(); ctx.moveTo(0, eq); ctx.lineTo(MP.w, eq); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = C.sand; MP.paths.forEach(p => ctx.fill(new Path2D(p)));
      ['ab', 'gs'].forEach(b => { ctx.strokeStyle = b === 'ab' ? 'rgba(242,100,61,.55)' : 'rgba(79,209,197,.55)'; ctx.lineWidth = 2.4 / s; ctx.stroke(new Path2D(A.routeD[b])); });
      const [px, py] = A.proj(ll);
      ctx.fillStyle = 'rgba(255,217,168,.35)'; ctx.beginPath(); ctx.arc(px, py, 26 / s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 13 / s, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(px, py, 8.5 / s, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255,214,170,.8)'; font(ctx, 400, 16, SERIF, true); ctx.fillText('equator', x + 18, oy + A.proj([0, 0])[1] * s - 8);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,.06)';
      for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2 - 30, 40 + i * 46, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.stroke(); }
      ctx.fillStyle = C.coral; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2 - 30, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; font(ctx, 400, 54, SERIF, true); ctx.textAlign = 'center';
      ctx.fillText(d.date === '2026-11-18' ? 'London' : 'Quito', x + w / 2, y + h / 2 + 70);
      font(ctx, 600, 20, SANS); ctx.globalAlpha = .7; caps(ctx, d.date === '2026-11-18' ? 'Home sweet home' : '2,850 m up in the Andes', x + w / 2, y + h / 2 + 112, 3, 'center'); ctx.globalAlpha = 1;
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = 'rgba(4,16,24,.55)'; ctx.fillRect(x, y + h - 66, w, 66);
    ctx.fillStyle = '#fff'; font(ctx, 700, 20, SANS); caps(ctx, 'We are here', x + 22, y + h - 26, 4);
    font(ctx, 500, 21, SANS); ctx.textAlign = 'right'; ctx.fillText(coords(ll), x + w - 22, y + h - 26); ctx.textAlign = 'left';
    ctx.restore();
  }

  /* ---------------- PDF (pages are full-bleed JPEGs; no library needed) ---------------- */
  async function jpegBytes(canvas, q = 0.86) { const b = await new Promise(r => canvas.toBlob(r, 'image/jpeg', q)); return new Uint8Array(await b.arrayBuffer()); }
  function makePDF(jpegs, pw, ph) {
    const enc = new TextEncoder(); const chunks = []; let len = 0; const offs = [];
    const push = x => { const u = typeof x === 'string' ? enc.encode(x) : x; chunks.push(u); len += u.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); body(); push('\nendobj\n'); };
    const PW = 595.28, PH = 841.89, n = jpegs.length;
    push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    obj(1, () => push('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => push(`<< /Type /Pages /Count ${n} /Kids [${jpegs.map((_, i) => `${3 + i * 3} 0 R`).join(' ')}] >>`));
    jpegs.forEach((j, i) => {
      const p = 3 + i * 3, c = p + 1, im = p + 2; const content = `q ${PW} 0 0 ${PH} 0 0 cm /Im0 Do Q`;
      obj(p, () => push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${c} 0 R >>`));
      obj(c, () => push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
      obj(im, () => { push(`<< /Type /XObject /Subtype /Image /Width ${pw} /Height ${ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${j.length} >>\nstream\n`); push(j); push('\nendstream'); });
    });
    const total = 3 + n * 3; const xref = len;
    push(`xref\n0 ${total}\n0000000000 65535 f \n`);
    for (let k = 1; k < total; k++) push(`${String(offs[k]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info << /Title (El Nino Dispatch) /Creator (El Nino) >> >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(chunks, { type: 'application/pdf' });
  }
  async function shareFile(blob, name, title) {
    const file = new File([blob], name, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.target = '_blank'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 60000);
  }
  const slug = d => `el-nino-day-${String(d.n).padStart(2, '0')}`;

  /* ---------------- Preview sheet ---------------- */
  async function preview(d, facts) {
    clearTimeout(saveT); rec.updated = Date.now(); await DB.put(rec).catch(() => {});
    openSheet(`<div style="padding:6px 20px 0"><span class="caps" style="color:var(--coral)">Dispatch · Day ${String(d.n).padStart(2, '0')}</span></div>
      <h2>${esc(rec.headline || d.title)}</h2><p class="sub">${fmtDate(d.date)} · laying out your pages…</p>
      <div class="block"><div class="render-wait"><div class="spinner"></div>Setting the type, placing the photos…</div></div>`);
    let pages;
    try { pages = await renderPages(rec, d, facts); }
    catch (e) { console.error(e); const s = document.querySelector('.sheet .render-wait'); if (s) s.textContent = 'Something went wrong laying out the pages. Try fewer photos?'; return; }
    const jpgs = await Promise.all(pages.map(c => jpegBytes(c)));
    const pdf = makePDF(jpgs, W, H);
    const postcard = new Blob([jpgs[0]], { type: 'image/jpeg' });
    const thumbs = jpgs.map(j => blobURL(new Blob([j], { type: 'image/jpeg' })));
    pages.forEach(c => { c.width = c.height = 0; });
    const sh = document.querySelector('.sheet'); if (!sh) return;
    sh.querySelector('.sub').textContent = `${fmtDate(d.date)} · ${thumbs.length} page${thumbs.length > 1 ? 's' : ''} · ${(pdf.size / 1048576).toFixed(1)} MB`;
    sh.querySelector('.block').outerHTML = `
      <div class="block"><div class="pagestrip">${thumbs.map((u, i) => `<figure><img src="${u}" alt="Page ${i + 1}"><figcaption>${i + 1} / ${thumbs.length}</figcaption></figure>`).join('')}</div></div>
      <div class="block actions">
        <button class="act primary" id="sharepdf">${I('doc')}Share PDF</button>
        <button class="act" id="sharecard">${I('camera')}Share postcard</button>
        <button class="act" data-close>${I('left')}Keep editing</button>
      </div>
      <p class="muted" style="font-size:12.5px;margin:12px 20px 0">The PDF is for email and family who like to print. The postcard is the cover as one image, perfect for WhatsApp.</p>`;
    sh.querySelector('#sharepdf').addEventListener('click', () => shareFile(pdf, slug(d) + '.pdf', `El Niño · Day ${d.n}`));
    sh.querySelector('#sharecard').addEventListener('click', () => shareFile(postcard, slug(d) + '.jpg', `El Niño · Day ${d.n}`));
  }

  /* ---------------- Archive + The Complete Voyage ---------------- */
  async function viewArchive() {
    releaseURLs();
    const all = (await DB.all().catch(() => [])).sort((a, b) => a.date < b.date ? -1 : 1);
    const c = A.ctx();
    view.innerHTML = `
      <div style="padding:calc(var(--sat) + 14px) 16px 0"><a class="roundbtn dark" href="#/" aria-label="Back">${I('left')}</a></div>
      <header class="page-h" style="padding-top:12px"><div class="caps">Saved on this phone</div><h1>The <em>Dispatches</em></h1><p>${all.length ? `${all.length} dispatch${all.length > 1 ? 'es' : ''} so far.` : 'None yet. Your first one is a few taps away.'}</p></header>
      <div class="sec" style="display:grid;gap:10px">
        <a class="btn" href="#/dispatch/${c.day.date}" style="background:var(--coral);padding:15px">${I('plus')} ${all.some(r => r.date === c.day.date) ? 'Edit today’s dispatch' : 'New dispatch for today'}</a>
        ${all.length ? `<button class="btn" id="voyage" style="padding:15px">${I('book')} Compile The Complete Voyage</button>` : ''}
      </div>
      ${all.length ? `<div class="sec">${all.map(r => { const d = A.DAY(r.date); const ph = r.photos[r.cover] || r.photos[0];
        return `<a class="daycard compact" href="#/dispatch/${r.date}" style="--pc:${phaseColor(d.phase)}"><div class="img"><img src="${ph ? blobURL(ph.blob) : img(d.img)}" alt="">
          <div class="dn"><b>${String(d.n).padStart(2, '0')}</b><span>${fmtDate(d.date, { short: true })}</span></div>${r.emoji ? `<span class="today-pill" style="background:rgba(255,255,255,.85);font-size:20px;padding:2px 8px">${r.emoji}</span>` : ''}</div>
          <div class="txt"><div class="kick">${esc(d.kicker)}</div><h4>${esc(r.headline || d.title)}</h4><div class="pl">${r.photos.length} photo${r.photos.length === 1 ? '' : 's'} · ${esc(signerText(r.signer))}</div></div></a>`; }).join('')}</div>` : `
      <div class="sec"><div class="card pad" style="text-align:center"><div style="font-size:44px">✉️</div><p class="muted">Each day, add a few photos and a line or two. At the end of the trip, compile them all into one keepsake: <b>The Complete Voyage</b>.</p></div></div>`}`;
    const v = view.querySelector('#voyage'); if (v) v.addEventListener('click', () => compileVoyage(all));
  }

  async function compileVoyage(all) {
    openSheet(`<div style="padding:6px 20px 0"><span class="caps" style="color:var(--coral)">The Complete Voyage</span></div><h2>Binding the book…</h2>
      <p class="sub" id="vprog">Starting</p><div class="block"><div class="render-wait"><div class="spinner"></div>This can take a minute for a long trip.</div></div>`);
    const prog = t => { const p = document.getElementById('vprog'); if (p) p.textContent = t; };
    try {
      await fontsReady();
      const jpgs = [];
      jpgs.push(await jpegBytes(await titlePage(all)));
      for (let i = 0; i < all.length; i++) {
        const r = all[i]; const d = A.DAY(r.date); prog(`Day ${d.n} · ${i + 1} of ${all.length}`);
        const pages = await renderPages(r, d, factsFor(d, spottedOn(d.date).map(w => w.id)));
        for (const c of pages) { jpgs.push(await jpegBytes(c, 0.8)); c.width = c.height = 0; }
      }
      const pdf = makePDF(jpgs, W, H);
      const sh = document.querySelector('.sheet'); if (!sh) return;
      sh.querySelector('h2').textContent = 'Your voyage, bound';
      prog(`${jpgs.length} pages · ${(pdf.size / 1048576).toFixed(1)} MB`);
      sh.querySelector('.block').outerHTML = `<div class="block"><div class="pagestrip"><figure><img src="${blobURL(new Blob([jpgs[0]], { type: 'image/jpeg' }))}" alt=""><figcaption>Cover</figcaption></figure></div></div>
        <div class="block actions"><button class="act primary" id="sharevoy">${I('doc')}Share the book</button><button class="act" data-close>${I('x')}Close</button></div>`;
      sh.querySelector('#sharevoy').addEventListener('click', () => shareFile(pdf, 'el-nino-the-complete-voyage.pdf', 'El Niño · The Complete Voyage'));
    } catch (e) { console.error(e); prog('Something went wrong. Try again with fewer photos.'); }
  }
  async function titlePage(all) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    ctx.fillStyle = C.abyss; ctx.fillRect(0, 0, W, H);
    const first = all.find(r => r.photos.length) ; const im = first ? await loadImg(blobURL((first.photos[first.cover] || first.photos[0]).blob)).catch(() => null) : await loadImg(img('kicker')).catch(() => null);
    if (im) cover(ctx, im, 0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(7,32,46,.75)'); g.addColorStop(.4, 'rgba(7,32,46,.25)'); g.addColorStop(1, 'rgba(7,32,46,.95)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff'; font(ctx, 600, 22, SANS); caps(ctx, 'Galápagos · 29 October – 18 November 2026', M, 110, 5);
    font(ctx, 400, 220, SERIF, true); ctx.fillText('El Niño', M - 8, 330);
    font(ctx, 400, 64, SERIF); ctx.fillText('The Complete Voyage', M, 430);
    font(ctx, 400, 34, SERIF, true); ctx.globalAlpha = .9; ctx.fillText(`A logbook in ${all.length} dispatch${all.length > 1 ? 'es' : ''}, by ${T.travellers.join(' & ')}`, M, 490); ctx.globalAlpha = 1;
    const tot = totalsTo('2026-12-31');
    const stats = [[String(T.days.length), 'days'], [String(tot.dives), 'dives logged'], [String(tot.species), 'species spotted'], ['2', 'liveaboards']];
    const cw = (W - 2 * M) / 4;
    stats.forEach(([v, l], i) => { const x = M + i * cw; ctx.textAlign = 'center'; font(ctx, 400, 92, SERIF); ctx.fillText(v, x + cw / 2, H - 250); font(ctx, 700, 17, SANS); ctx.globalAlpha = .75; caps(ctx, l, x + cw / 2, H - 200, 3, 'center'); ctx.globalAlpha = 1; });
    ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(M, H - 140, W - 2 * M, 2);
    ctx.fillStyle = '#fff'; font(ctx, 400, 30, SERIF, true); ctx.fillText(`Spotted: ${T.wildlife.filter(w => S.get('spotted', {})[w.id]).map(w => w.name).slice(0, 6).join(' · ') || 'the whole ocean'}`, M, H - 80);
    return c;
  }

  // Shared drawing/export kit (used by the dive log for cards and the logbook PDF)
  const kit = { W, H, M, C, SERIF, SANS, font, rr, cover, wrap, para, caps, fontsReady, loadImg, jpegBytes, makePDF, shareFile, resize, blobURL };
  return { viewComposer, viewArchive, releaseURLs, kit };
};
