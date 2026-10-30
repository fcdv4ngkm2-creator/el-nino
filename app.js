/* El Niño — offline trip companion. Vanilla JS, no build step. Started by boot.js once the trip data is unlocked. */
window.__startApp = function () {
  'use strict';
  const T = window.TRIP;
  const MAP = window.GALAPAGOS_MAP;
  const $ = (s, el = document) => el.querySelector(s);
  const view = $('#view');
  const enc = encodeURIComponent;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* ---------------- Storage ---------------- */
  const S = {
    get(k, d) { try { const v = localStorage.getItem('elnino:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('elnino:' + k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem('elnino:' + k); } catch (e) {} }
  };

  /* ---------------- Icons ---------------- */
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    trip: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18M8 14h3M8 18h6"/>',
    map: '<path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4z"/><path d="M9 4v13M15 7v13"/>',
    fish: '<path d="M2.5 12c2.6-4.6 8.4-6.6 13.3-3.8L20.5 5v14l-4.7-3.2C10.9 18.6 5.1 16.6 2.5 12z"/><circle cx="8" cy="11" r="1" fill="currentColor" stroke="none"/>',
    wallet: '<rect x="2.5" y="6" width="19" height="14" rx="3"/><path d="M16.5 13h2M2.5 10h19M6 6l9.5-3 1.5 3"/>',
    flight: '<path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/>',
    car: '<path d="M5 17h14M5 17a2 2 0 1 1-4 0v-4l2.3-5.4A2 2 0 0 1 5.1 6.4h13.8a2 2 0 0 1 1.8 1.2L23 13v4a2 2 0 1 1-4 0"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/><path d="M1 13h22"/>',
    hotel: '<path d="M2 20V8M2 16h20M22 20v-6a3 3 0 0 0-3-3h-8v5"/><circle cx="6.5" cy="12" r="2"/>',
    boat: '<path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1s1.2 1 2.5 1c2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.4 19A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 1.8.4 3.4 1.1 5M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6M12 10v4M12 2v3"/>',
    dive: '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
    tour: '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
    task: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
    wa: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/><path d="M8.5 9.5c.3 2.3 2.7 4.7 5 5l1.2-1.2 2 1-.5 1.5c-3.6.2-8-4.2-7.8-7.8l1.5-.5 1 2z" fill="currentColor" stroke="none"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m22 7-10 6L2 7"/>',
    ext: '<path d="M7 17 17 7M8 7h9v9"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    share: '<path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
    cal: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    dollar: '<path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    thermo: '<path d="M14 4v10.5a4 4 0 1 1-4 0V4a2 2 0 0 1 4 0z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    bag: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18M16 10a4 4 0 0 1-8 0"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M20 17v5H6.5A2.5 2.5 0 0 1 4 19.5"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    camera: '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    swap: '<path d="M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    heart: '<path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>',
    wifi: '<path d="M5 12.6a10 10 0 0 1 14 0M1.4 9a15 15 0 0 1 21.2 0M8.5 16.1a5 5 0 0 1 7 0M12 20h.01"/>'
  };
  const I = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || ''}</svg>`;

  /* ---------------- Time ---------------- */
  // All trip dates fall after Europe's clocks change (25 Oct 2026) and Ecuador has no DST, so fixed offsets are exact.
  const OFF = { GMT: 0, CET: 60, ECT: -300, GAL: -360 };
  const TZNAME = { GMT: 'London', CET: 'Madrid', ECT: 'Quito', GAL: 'Galápagos' };
  const TZLONG = { GMT: 'UK time (GMT)', CET: 'Madrid time (CET)', ECT: 'Ecuador mainland (UTC−5)', GAL: 'Galápagos time (UTC−6)' };
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MO = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function at(date, time, tz) {
    const [y, m, d] = date.split('-').map(Number);
    const [hh, mm] = time.split(':').map(Number);
    return Date.UTC(y, m - 1, d, hh, mm) - OFF[tz] * 60000;
  }
  function parts(ms, tz) {
    const d = new Date(ms + OFF[tz] * 60000);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay(), hh: d.getUTCHours(), mm: d.getUTCMinutes(), ss: d.getUTCSeconds(),
      date: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}` };
  }
  const hm = (ms, tz) => { const p = parts(ms, tz); return `${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`; };
  function dateObj(ds) { const [y, m, d] = ds.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }
  function fmtDate(ds, opt = {}) {
    const d = dateObj(ds);
    const wd = WD[d.getUTCDay()], mo = MO[d.getUTCMonth()];
    if (opt.short) return `${wd.slice(0, 3)} ${d.getUTCDate()} ${mo.slice(0, 3)}`;
    return `${wd} ${d.getUTCDate()} ${mo}`;
  }
  function now() {
    const sim = S.get('simNow', null);
    if (sim) return sim + (Date.now() - S.get('simSet', Date.now()));
    return Date.now();
  }

  /* ---------------- Derived data ---------------- */
  const EVENTS = [];
  T.days.forEach((d, di) => {
    d.n = di + 1;
    d.phaseObj = T.phases.find(p => p.id === d.phase);
    d.events.forEach(e => {
      e.day = d; e.date = d.date;
      if (e.time) {
        e.start = at(d.date, e.time, e.tz);
        if (e.end) e.endMs = at(e.end.date || d.date, e.end.time, e.end.tz);
      }
      EVENTS.push(e);
    });
  });
  const TIMED = EVENTS.filter(e => e.start).sort((a, b) => a.start - b.start);
  const TRIP_START = TIMED[0].start;
  const TRIP_END = TIMED[TIMED.length - 1].start + 3600000;
  const EV = id => EVENTS.find(e => e.id === id);
  const DAY = ds => T.days.find(d => d.date === ds);
  const FLIGHTS = EVENTS.filter(e => e.type === 'flight');
  const SITES = T.sites.map((s, i) => Object.assign(s, { n: i + 1 }));
  const SITE = id => SITES.find(s => s.id === id);
  const phaseColor = id => (T.phases.find(p => p.id === id) || {}).color || '#888';

  const AIRPORTS = { LHR: T.places.lhr.ll, MAD: T.places.mad.ll, UIO: T.places.uio.ll, GYE: T.places.gye.ll, GPS: T.places.gps.ll, SCY: T.places.scy.ll };
  function km(a, b) {
    const R = 6371, r = x => x * Math.PI / 180;
    const dLa = r(b[0] - a[0]), dLo = r(b[1] - a[1]);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a[0])) * Math.cos(r(b[0])) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const KM_TOTAL = Math.round(FLIGHTS.reduce((s, e) => s + km(AIRPORTS[e.flight.from], AIRPORTS[e.flight.to]), 0));
  const SKY_DIVES = T.days.reduce((s, d) => s + (d.phase === 'gs' && d.dives ? d.dives.reduce((a, x) => a + (x.count || 1), 0) : 0), 0);

  function ctx() {
    const n = now();
    let status = n < TRIP_START ? 'pre' : n > TRIP_END ? 'post' : 'during';
    let tz = 'GMT';
    for (const e of TIMED) {
      if (e.start > n) break;
      tz = e.endMs && e.endMs <= n ? e.end.tz : e.tz;
    }
    if (status === 'post') tz = 'GMT';
    const today = parts(n, tz).date;
    let di = T.days.findIndex(d => d.date === today);
    if (status === 'pre') di = 0;
    if (di < 0) di = status === 'post' ? T.days.length - 1 : 0;
    const day = T.days[di];
    const live = TIMED.find(e => e.endMs && e.start <= n && n < e.endMs);
    const next = TIMED.find(e => e.start > n);
    return { n, status, tz, di, day, live, next, today };
  }

  /* ---------------- UI helpers ---------------- */
  const typeLabel = { flight: 'Flight', car: 'Transfer', hotel: 'Stay', boat: 'Liveaboard', dive: 'Diving', tour: 'Land tour', task: 'To do' };
  const typeIcon = t => ({ flight: 'flight', car: 'car', hotel: 'hotel', boat: 'boat', dive: 'dive', tour: 'tour', task: 'task' }[t] || 'info');
  const img = name => `img/${name}.jpg`;
  const digits = p => p.replace(/[^\d+]/g, '');
  const waLink = p => `https://wa.me/${p.replace(/\D/g, '')}`;
  const appleMap = pl => `https://maps.apple.com/?q=${enc(pl.q || pl.name)}${pl.ll ? `&ll=${pl.ll.join(',')}` : ''}`;
  const googleMap = pl => `https://www.google.com/maps/search/?api=1&query=${enc(pl.q || pl.name)}`;

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1900);
  }
  function copy(text, label) {
    const done = () => toast(`${label || 'Copied'} ✓`);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => fallbackCopy(text, done));
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) {} ta.remove();
  }
  function haptic() { try { navigator.vibrate && navigator.vibrate(8); } catch (e) {} }

  function timeCell(e) {
    if (!e.time) return `<div class="time"><small style="padding-top:3px">${{ hotel: 'Stay', boat: 'Aboard', dive: 'Dive', tour: 'Ashore' }[e.type] || ''}</small></div>`;
    const t = e.approx ? `≈${e.time}` : e.time;
    return `<div class="time">${t}<small>${TZNAME[e.tz]}</small></div>`;
  }
  function timeline(events, n) {
    return `<ul class="tl">${events.map(e => {
      const past = e.start && (e.endMs || e.start + 1800000) < n;
      const isNow = e.start && e.start <= n && n < (e.endMs || e.start + 1800000);
      return `<li class="${past ? 'past' : ''} ${isNow ? 'now' : ''}"><button class="row" data-ev="${e.id}">
        ${timeCell(e)}
        <div class="node t-${e.type}">${I(typeIcon(e.type))}</div>
        <div class="body"><div class="t">${esc(e.title)}</div>${e.sub ? `<div class="s">${esc(e.sub)}</div>` : ''}</div>
        <div class="chev">${I('right')}</div></button></li>`;
    }).join('')}</ul>`;
  }
  function checklist(ids) {
    const done = S.get('tasks', {});
    return ids.map(id => {
      const t = T.tasks[id]; if (!t) return '';
      return `<div class="check ${done[id] ? 'on' : ''}" data-task="${id}" role="checkbox" aria-checked="${!!done[id]}">
        <span class="box">${I('check')}</span>
        <span><div class="t">${esc(t.t)}</div><div class="s">${esc(t.s)}</div></span>
        ${t.url ? `<a class="go" href="${t.url}" target="_blank" rel="noopener" data-stop>Open</a>` : ''}
      </div>`;
    }).join('');
  }
  function cdParts(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60];
  }
  function homeTime(e) {
    if (!e.start || e.tz === 'GMT') return '';
    return `${hm(e.start, 'GMT')} in London`;
  }

  /* ---------------- Boarding pass ---------------- */
  function pass(e, opts = {}) {
    const f = e.flight; const n = now();
    const done = e.endMs && e.endMs < n;
    const arrDate = e.end.date ? fmtDate(e.end.date, { short: true }) : fmtDate(e.date, { short: true });
    return `<div class="pass ${opts.small ? 'small' : ''} ${done && opts.dim ? 'done' : ''}" ${opts.tap ? `data-ev="${e.id}" role="button"` : ''}>
      <div class="ph"><span>${esc(f.airline)}</span><span>${esc(f.no)}</span></div>
      <div class="route">
        <div><div class="iata">${f.from}</div><div class="city">${esc(f.fromCity)}${f.fromTerm ? ' · ' + f.fromTerm : ''}</div></div>
        <div class="plane">${I('flight')}<div class="line"></div><span>${esc(f.dur)}</span></div>
        <div class="r"><div class="iata">${f.to}</div><div class="city">${esc(f.toCity)}${f.toTerm ? ' · ' + f.toTerm : ''}</div></div>
      </div>
      <div class="times">
        <div><b>${e.time}</b><small>${fmtDate(e.date, { short: true })} · ${TZNAME[e.tz]}</small></div>
        <div class="r"><b>${e.end.time}</b><small>${arrDate} · ${TZNAME[e.end.tz]}</small></div>
      </div>
      <div class="tear"><i></i></div>
      <div class="grid4">
        <div><small>Booking</small><b class="ref">${f.ref}</b></div>
        <div><small>Cabin</small><b>${esc(f.cabin)}</b></div>
        <div><small>Status</small><b>${done ? 'Flown' : e.start <= n ? 'In the air' : 'Booked'}</b></div>
      </div>
      ${f.seats ? `<div class="seats">${f.seats.map(s => `<div class="seat"><small>${s[0]}</small><b>${s[1]}</b><span>${s[2]}</span></div>`).join('')}</div>` : ''}
    </div>`;
  }

  /* ---------------- Sheet ---------------- */
  function openSheet(html) {
    closeSheet(true);
    const scrim = document.createElement('div'); scrim.className = 'scrim';
    const sh = document.createElement('div'); sh.className = 'sheet'; sh.setAttribute('role', 'dialog');
    sh.innerHTML = `<div class="grab"><i></i></div><button class="roundbtn dark close" data-close aria-label="Close">${I('x')}</button>${html}`;
    document.body.append(scrim, sh);
    requestAnimationFrame(() => { scrim.classList.add('show'); sh.classList.add('show'); });
    scrim.addEventListener('click', () => closeSheet());
    // swipe down to dismiss
    let y0 = null, dy = 0;
    sh.addEventListener('touchstart', ev => { if (sh.scrollTop <= 0) { y0 = ev.touches[0].clientY; dy = 0; } }, { passive: true });
    sh.addEventListener('touchmove', ev => { if (y0 == null) return; dy = ev.touches[0].clientY - y0; if (dy > 0) { sh.style.transition = 'none'; sh.style.transform = `translateY(${dy}px)`; } }, { passive: true });
    sh.addEventListener('touchend', () => { if (y0 == null) return; sh.style.transition = ''; if (dy > 110) closeSheet(); else sh.style.transform = ''; y0 = null; });
    document.body.style.overflow = 'hidden';
  }
  function closeSheet(instant) {
    const sh = $('.sheet'), sc = $('.scrim');
    if (!sh) return;
    document.body.style.overflow = '';
    if (instant) { sh.remove(); sc && sc.remove(); return; }
    sh.style.transform = 'translateY(100%)'; sc && sc.classList.remove('show');
    setTimeout(() => { sh.remove(); sc && sc.remove(); }, 380);
  }

  function eventSheet(e) {
    const d = e.day; const pl = e.place && T.places[e.place];
    const site = e.site && SITE(e.site);
    let body = '';
    const whenLine = e.time
      ? `${fmtDate(d.date)} · ${e.approx ? '≈' : ''}${e.time} ${TZNAME[e.tz]} time${homeTime(e) ? ` · ${homeTime(e)}` : ''}`
      : fmtDate(d.date);

    if (e.flight) {
      const f = e.flight;
      body += `<div class="block">${pass(e)}</div>
        <div class="block actions">
          <a class="act primary" href="https://www.flightaware.com/live/flight/${f.fa}" target="_blank" rel="noopener">${I('flight')}Live status</a>
          <button class="act" data-copy="${f.ref}" data-label="Booking ref ${f.ref} copied">${I('copy')}Copy ref</button>
          <a class="act" href="${f.manage}" target="_blank" rel="noopener">${I('ext')}Manage</a>
        </div>
        <div class="block card kv">
          <div class="k">Duration</div><div class="v">${esc(f.dur)}</div>
          <div class="k">Baggage</div><div class="v">${esc(f.bags)}</div>
          <div class="k">Departs</div><div class="v">${e.time} ${TZNAME[e.tz]}${homeTime(e) ? `<br><span class="muted" style="font-weight:500;font-size:13px">${homeTime(e)}</span>` : ''}</div>
          <div class="k">Arrives</div><div class="v">${e.end.time} ${TZNAME[e.end.tz]}${e.end.date ? ` (${fmtDate(e.end.date, { short: true })})` : ''}</div>
        </div>`;
      if (e.note) body += `<div class="block alert info">${I('info')}<div><p>${esc(e.note)}</p></div></div>`;
      if (f.to === 'GPS' || f.from === 'UIO' && d.date === '2026-10-30') body += `<div class="block alert">${I('alert')}<div><b>Baggage drops on Avianca</b><p>Your BA/Iberia allowance is 3 × 32 kg, but Avianca is 1 × 23 kg hold + 10 kg cabin each. Extra bags are about $60 per bag each way, paid at the desk.</p></div></div>`;
    }
    if (e.hotel) {
      const h = e.hotel;
      body += `<div class="block card kv">
        <div class="k">Check-in</div><div class="v">${esc(h.in)}</div>
        <div class="k">Check-out</div><div class="v">${esc(h.out)}</div>
        <div class="k">Room</div><div class="v">${esc(h.room)}</div>
        ${pl && pl.addr ? `<div class="k">Address</div><div class="v">${esc(pl.addr)}</div>` : ''}
      </div>`;
      if (h.extra) body += `<div class="block alert info">${I('info')}<div><p>${esc(h.extra)}</p></div></div>`;
      if (e.id === 'gs-embark') body += `<div class="block"><div class="passes">${['boat', 'cabin', 'deck', 'dining', 'divedeck'].map(x => `<img src="${img(x)}" alt="" style="border-radius:18px;height:200px;object-fit:cover" loading="lazy">`).join('')}</div></div>`;
    }
    if (e.lines) body += `<div class="block card"><ul class="lines">${e.lines.map(l => `<li>${esc(l)}</li>`).join('')}</ul></div>`;
    if (site) {
      const dives = (d.dives || []);
      body += `<div class="block card">${dives.map(x => `<div class="divesite"><div class="h"><b>${esc(x.site)}</b>${x.count ? `<span class="n">×${x.count}</span>` : ''}</div><div class="where">${esc(x.where)}</div><ul>${x.notes.map(nn => `<li>${esc(nn)}</li>`).join('')}</ul></div>`).join('')}</div>`;
    }
    const acts = [];
    if (e.phone) acts.push(`<a class="act primary" href="tel:${digits(e.phone)}">${I('phone')}Call</a>`);
    if (e.wa) acts.push(`<a class="act" href="${waLink(e.phone)}" target="_blank" rel="noopener">${I('wa')}WhatsApp</a>`);
    if (pl) acts.push(`<a class="act" href="${appleMap(pl)}" target="_blank" rel="noopener">${I('pin')}Apple Maps</a>`, `<a class="act" href="${googleMap(pl)}" target="_blank" rel="noopener">${I('map')}Google</a>`);
    if (e.guide) acts.push(`<a class="act" href="#/guide/${e.guide}" data-close>${I('book')}Step by step</a>`);
    if (site) acts.push(`<a class="act" href="#/map/${site.id}" data-close>${I('map')}On the chart</a>`);
    acts.push(`<a class="act" href="#/day/${d.date}" data-close>${I('cal')}Day ${String(d.n).padStart(2, '0')}</a>`);
    body += `<div class="block actions">${acts.join('')}</div>`;

    openSheet(`
      <div style="padding:6px 20px 0;display:flex;align-items:center;gap:10px"><span class="caps" style="color:var(--coral)">${typeLabel[e.type]}</span></div>
      <h2>${esc(e.title)}</h2>
      <p class="sub">${whenLine}</p>
      ${e.sub && !e.flight ? `<p class="sub" style="margin-top:2px">${esc(e.sub)}</p>` : ''}
      ${body}
    `);
  }

  /* ---------------- Views ---------------- */
  let timers = [];
  const every = (fn, ms) => { fn(); timers.push(setInterval(fn, ms)); };

  function clocksHTML(c) {
    const zones = [c.tz];
    if (c.tz === 'ECT') zones.push('GAL');
    if (c.tz === 'GAL') zones.push('ECT');
    if (c.tz === 'CET') zones.push('ECT');
    if (c.tz !== 'GMT') zones.push('GMT'); else zones.push('ECT', 'GAL');
    return zones.slice(0, 3).map((z, i) => `<div class="clock ${i === 0 ? 'here' : ''}"><b data-clock="${z}">${hm(c.n, z)}</b><span>${TZNAME[z]}</span></div>`).join('');
  }

  function viewToday() {
    const c = ctx(); const d = c.day;
    const total = T.days.length;
    let dayline;
    if (c.status === 'pre') { const days = Math.ceil((TRIP_START - c.n) / 86400000); dayline = `Departs in ${days} day${days === 1 ? '' : 's'}`; }
    else if (c.status === 'post') dayline = 'Trip complete · Welcome home';
    else dayline = `Day ${d.n} of ${total} · ${fmtDate(d.date)}`;

    const target = c.live || c.next;
    let next = '';
    const atSea = !c.live && c.status === 'during' && target && target.start - c.n > 20 * 3600000 && d.events.find(e => !e.time && (e.type === 'dive' || e.type === 'tour' || e.type === 'boat'));
    if (atSea) {
      next = `<div class="nextup live" data-ev="${atSea.id}" role="button">
        <div class="top"><div class="ic t-${atSea.type}">${I(typeIcon(atSea.type))}</div>
          <div style="min-width:0"><div class="lbl">Today ${atSea.type === 'tour' ? 'ashore' : d.phase === 'ab' || d.phase === 'gs' ? 'at sea' : ''}</div>
          <div class="t">${esc(atSea.title)}</div>
          <div class="s">${esc(d.place)}${d.water ? ' · ' + esc(d.water) : ''}</div></div></div>
        <div class="cdcap">Next on the clock: ${esc(target.title)}</div>
        <div class="countdown" data-cd="${target.start}">
          <div><b>0</b><span>days</span></div><div><b>0</b><span>hrs</span></div><div><b>0</b><span>min</span></div><div><b>0</b><span>sec</span></div>
        </div></div>`;
    } else if (target) {
      const isLive = target === c.live;
      next = `<div class="nextup ${isLive ? 'live' : ''}" data-ev="${target.id}" role="button">
        <div class="top"><div class="ic t-${target.type}">${I(typeIcon(target.type))}</div>
          <div style="min-width:0"><div class="lbl">${isLive ? 'Happening now' : 'Next up'}</div>
          <div class="t">${esc(target.title)}</div>
          <div class="s">${fmtDate(target.date, { short: true })} · ${target.approx ? '≈' : ''}${target.time} ${TZNAME[target.tz]}${isLive ? ` · lands ${target.end.time}` : ''}</div></div></div>
        <div class="countdown" data-cd="${isLive ? target.endMs : target.start}">
          <div><b>0</b><span>days</span></div><div><b>0</b><span>hrs</span></div><div><b>0</b><span>min</span></div><div><b>0</b><span>sec</span></div>
        </div></div>`;
    } else {
      next = `<div class="nextup"><div class="top"><div class="ic t-boat">${I('heart')}</div><div><div class="lbl">That’s a wrap</div><div class="t">21 days, two boats, one El Niño.</div><div class="s">Open the Logbook to relive it.</div></div></div></div>`;
    }

    const alerts = [];
    if (d.alert) alerts.push(`<div class="alert">${I('alert')}<div><b>${esc(d.alert.title)}</b><p>${esc(d.alert.text)}</p></div></div>`);
    if (c.di <= 1 && c.status !== 'post') alerts.push(`<div class="alert">${I('alert')}<div><b>Avianca baggage is much smaller</b><p>1 × 23 kg hold + 10 kg cabin each on the Galápagos flights (vs 3 × 32 kg on BA/Iberia). Extra bags are about $60 each way.</p></div></div>`);
    if (c.di === 0 && c.status !== 'post') alerts.push(`<div class="alert info">${I('info')}<div><b>Quito sits at 2,850 m</b><p>Drink plenty of water, go easy on alcohol tonight, and expect to feel a little breathless on stairs.</p></div></div>`);
    const upcomingGap = T.days.find(x => x.alert && x.date > d.date && dateObj(x.date) - dateObj(d.date) <= 3 * 86400000);
    if (upcomingGap) alerts.push(`<div class="alert">${I('alert')}<div><b>Coming up: ${esc(upcomingGap.alert.title.toLowerCase())}</b><p>${fmtDate(upcomingGap.date)}: no hotel or Santa Cruz → San Cristóbal transfer in your documents yet.</p></div></div>`);

    const tasks = (d.tasks || []);
    const nextDay = T.days[c.di + 1];
    const quick = [
      { ic: 'phone', t: 'Ground team', s: 'Quito transfers, 24 h', href: 'tel:' + digits(T.contacts[0].phone) },
      { ic: 'wa', t: 'Boat: Galapagos Sky', s: 'WhatsApp the crew', href: waLink('+593 99 016 7139'), ext: 1 },
      { ic: 'doc', t: 'Declaration', s: 'Galápagos entry form', href: 'https://siabg.abgalapagos.gob.ec/declaraciones/nueva', ext: 1 },
      { ic: 'flight', t: 'Boarding passes', s: `${FLIGHTS.length} flights`, href: '#/wallet' },
      { ic: 'users', t: 'All contacts', s: 'Call · WhatsApp · email', href: '#/contacts' }
    ];

    const n = c.n;
    const bars = T.days.map((x, i) => `<i style="flex:1;background:${phaseColor(x.phase)}" class="${c.status === 'post' || i < c.di ? 'done' : ''} ${c.status === 'during' && i === c.di ? 'now' : ''}"></i>`).join('');
    const loggedDives = totalDives(); const spotted = Object.keys(S.get('spotted', {})).length;
    const standalone = window.navigator.standalone || matchMedia('(display-mode: standalone)').matches;

    view.innerHTML = `
      <section class="cover">
        <img class="bg" src="${img(d.img)}" alt="">
        <div class="inner">
          <div class="masthead"><span class="issue">Issue Nº 01 · Oct–Nov 2026</span><a class="menu" href="#/settings" aria-label="Settings">${I('sliders')}</a></div>
          <div class="logo">El Niño</div>
          <div class="tag">Galápagos by liveaboard · ${T.travellers.join(' &amp; ')}</div>
          <div class="bottom">
            <div class="dayline"><span class="dot"></span>${dayline}</div>
            <h2>${esc(c.status === 'post' ? 'Home again' : d.title)}</h2>
            <div class="place">${esc(c.status === 'post' ? 'London' : d.place)}</div>
            <div class="clockrow">${clocksHTML(c)}</div>
          </div>
        </div>
      </section>
      ${next}
      ${alerts.length ? `<div class="sec">${alerts.join('')}</div>` : ''}
      ${tasks.length && c.status !== 'post' ? `<div class="sec"><div class="sec-h"><h3>${c.di === 0 ? 'Tonight' : 'To do today'}</h3><span class="muted" style="font-size:13px" data-taskcount="${tasks.join(',')}"></span></div><div class="card">${checklist(tasks)}</div></div>` : ''}
      <div class="sec">
        <div class="sec-h"><h3>${c.status === 'pre' ? 'Day one' : 'Today’s plan'}</h3><a href="#/day/${d.date}">Full day →</a></div>
        <div class="card">${timeline(d.events, n)}</div>
      </div>
      <div class="sec"><a class="card dispatch-cta" href="#/dispatch/${d.date}">
        <img src="${img(d.img)}" alt="">
        <div class="tx"><span class="caps">New · Dispatches</span><b>Send home a dispatch</b><span>Your photos, the day’s highlights and a fun fact, laid out like a magazine page</span></div>
        <div class="go">${I('right')}</div></a></div>
      ${nextDay && c.status !== 'post' ? `<div class="sec"><div class="sec-h"><h3>Tomorrow</h3><a href="#/trip">Itinerary →</a></div>${dayCard(nextDay, c, true)}</div>` : ''}
      <div class="sec"><div class="sec-h"><h3>Quick</h3></div><div class="quick">${quick.map(q => `<a class="qa" href="${q.href}" ${q.ext ? 'target="_blank" rel="noopener"' : ''}><div class="ic">${I(q.ic)}</div><b>${q.t}</b><span>${q.s}</span></a>`).join('')}</div></div>
      <div class="sec">
        <div class="card progress">
          <div class="caps muted">The voyage</div>
          <div class="big"><b>${c.status === 'pre' ? 0 : c.status === 'post' ? total : d.n}</b><span class="muted">of ${total} days</span></div>
          <div class="bar">${bars}</div>
          <div class="legend">${T.phases.map(p => `<span style="--c:${p.color}">${p.name}</span>`).join('')}</div>
        </div>
      </div>
      <div class="sec"><div class="stats">
        <div class="stat"><b>${KM_TOTAL.toLocaleString('en-GB')}</b><span>km flown · ${FLIGHTS.length} flights</span></div>
        <div class="stat"><b>15</b><span>nights at sea · 2 boats</span></div>
        <div class="stat"><b>${loggedDives}</b><span>dives logged · ${SKY_DIVES} planned on the Sky alone</span></div>
        <div class="stat"><b>${spotted}<span style="font-size:18px;color:var(--muted)">/${T.wildlife.length}</span></b><span>species spotted</span></div>
      </div></div>
      ${!standalone ? `<div class="sec"><div class="card install"><img src="icons/icon-180.png" alt=""><div><b>Put El Niño on your Home Screen</b><span>In Safari, tap ${I('share', 'share')} Share, then <b style="display:inline">Add to Home Screen</b>. It works fully offline once it’s saved.</span></div></div></div>` : ''}
      <div class="footer"><div class="logo-s">El Niño</div>Every booking, every dive, offline. Made for ${T.travellers.join(' &amp; ')}.</div>
    `;
    every(tick, 1000);
  }

  function tick() {
    const n = now();
    document.querySelectorAll('[data-cd]').forEach(el => {
      const p = cdParts(+el.dataset.cd - n);
      el.querySelectorAll('b').forEach((b, i) => { const v = String(p[i]).padStart(i ? 2 : 1, '0'); if (b.textContent !== v) b.textContent = v; });
    });
    document.querySelectorAll('[data-clock]').forEach(el => { const v = hm(n, el.dataset.clock); if (el.textContent !== v) el.textContent = v; });
    document.querySelectorAll('[data-taskcount]').forEach(el => {
      const ids = el.dataset.taskcount.split(','); const done = S.get('tasks', {});
      el.textContent = `${ids.filter(i => done[i]).length} of ${ids.length} done`;
    });
  }

  function dayCard(d, c, compact) {
    const isToday = c.status === 'during' && d.date === c.day.date;
    const past = c.status === 'post' || (c.status === 'during' && d.date < c.day.date);
    const flights = d.events.filter(e => e.type === 'flight').length;
    const dives = (d.dives || []).reduce((a, x) => a + (x.count || 1), 0);
    const chips = [];
    if (flights) chips.push(`<span class="chip">${I('flight')}${flights} flight${flights > 1 ? 's' : ''}</span>`);
    if (dives) chips.push(`<span class="chip">${I('dive')}${(d.dives || []).some(x => x.count) ? dives + ' dives' : (d.dives.length > 1 ? 'Site TBC' : 'Diving')}</span>`);
    if (d.events.some(e => e.type === 'tour')) chips.push(`<span class="chip">${I('tour')}Land tour</span>`);
    if (d.events.some(e => e.type === 'hotel' && e.hotel)) chips.push(`<span class="chip">${I('hotel')}Hotel</span>`);
    if (d.water) chips.push(`<span class="chip">${I('thermo')}${esc(d.water.split('·')[0].trim())}</span>`);
    if (d.alert) chips.push(`<span class="chip" style="background:color-mix(in srgb,var(--warn) 18%,transparent);color:var(--warn)">${I('alert')}Check</span>`);
    return `<a class="daycard ${past ? 'past' : ''} ${compact ? 'compact' : ''}" href="#/day/${d.date}" style="--pc:${phaseColor(d.phase)}">
      <div class="img"><img src="${img(d.img)}" alt="" loading="lazy">
        <div class="dn"><b>${String(d.n).padStart(2, '0')}</b><span>${fmtDate(d.date, { short: true })}</span></div>
        ${isToday ? '<span class="today-pill">Today</span>' : ''}</div>
      <div class="txt"><div class="kick">${esc(d.kicker)}</div><h4>${esc(d.title)}</h4><div class="pl">${esc(d.place)}</div>
      ${chips.length ? `<div class="chips">${chips.join('')}</div>` : ''}</div></a>`;
  }

  function viewTrip(mode) {
    const c = ctx();
    mode = mode || S.get('tripMode', 'list');
    S.set('tripMode', mode);
    let body = '';
    if (mode === 'list') {
      body = T.phases.map(p => {
        const days = T.days.filter(d => d.phase === p.id);
        return `<div class="part" style="--pc:${p.color}"><div><div class="num">${p.part}</div><h2>${p.name}</h2></div><div class="rule"></div></div>
          ${days.map(d => dayCard(d, c)).join('')}`;
      }).join('');
    } else {
      body = `<div class="cal"><div class="legend">${T.phases.map(p => `<span><i style="background:${p.color}"></i>${p.name}</span>`).join('')}</div>
        ${[[2026, 9], [2026, 10]].map(([y, m]) => monthGrid(y, m, c)).join('')}</div>`;
    }
    view.innerHTML = `
      <header class="page-h"><div class="caps">29 Oct – 18 Nov 2026</div><h1>The <em>Itinerary</em></h1><p>${T.days.length} days · 2 liveaboards · ${FLIGHTS.length} flights · 4 hotels</p></header>
      <div class="seg" role="tablist"><button class="${mode === 'list' ? 'on' : ''}" data-mode="list">List</button><button class="${mode === 'cal' ? 'on' : ''}" data-mode="cal">Calendar</button></div>
      <div class="shimmer-in">${body}</div>
      <div class="footer">Dive sites are subject to sea conditions and National Park scheduling.</div>`;
    if (mode === 'list' && c.status === 'during' && !viewTrip._scrolled) {
      viewTrip._scrolled = true;
      const el = view.querySelector(`a[href="#/day/${c.day.date}"]`);
      if (el && c.di > 1) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
    }
  }
  function monthGrid(y, m, c) {
    const first = new Date(Date.UTC(y, m, 1)); const daysIn = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const lead = (first.getUTCDay() + 6) % 7; // Monday first
    let cells = '';
    for (let i = 0; i < lead; i++) cells += '<div></div>';
    for (let dd = 1; dd <= daysIn; dd++) {
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
      const d = DAY(ds);
      if (!d) { cells += `<div class="c">${dd}</div>`; continue; }
      const ics = [];
      if (d.events.some(e => e.type === 'flight')) ics.push(I('flight'));
      if (d.dives) ics.push(I('dive'));
      if (d.events.some(e => e.type === 'tour')) ics.push(I('tour'));
      if (d.alert) ics.push(I('alert'));
      const dc = (d.dives || []).reduce((a, x) => a + (x.count || 0), 0);
      const past = c.status === 'post' || (c.status === 'during' && ds < c.day.date);
      const today = c.status === 'during' && ds === c.day.date;
      cells += `<a class="c trip ${past ? 'past' : ''} ${today ? 'today' : ''}" href="#/day/${ds}" style="--pc:${phaseColor(d.phase)}">${dd}${dc ? `<span class="dc">${dc}</span>` : ''}<span class="ics">${ics.slice(0, 3).join('')}</span></a>`;
    }
    const tripDays = T.days.filter(d => dateObj(d.date).getUTCMonth() === m).length;
    return `<div class="card month"><div class="mh">${MO[m]} <small>${tripDays} trip days</small></div><div class="grid">
      ${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div></div>`;
  }

  function viewDay(ds) {
    const d = DAY(ds); if (!d) return go('#/trip');
    const c = ctx(); const i = d.n - 1;
    const prev = T.days[i - 1], nxt = T.days[i + 1];
    const notes = S.get('notes:' + ds, '');
    const pc = phaseColor(d.phase);
    view.innerHTML = `
      <section class="dayhero"><img src="${img(d.img)}" alt="">
        <div class="inner">
          <div class="navbtns"><a class="roundbtn" href="#/trip" aria-label="Back">${I('left')}</a>
            <button class="roundbtn" data-act="shareday" data-date="${ds}" aria-label="Share">${I('share')}</button></div>
          <div class="bottom">
            <div class="bignum">${String(d.n).padStart(2, '0')}</div>
            <div class="kick">${fmtDate(ds)} · ${esc(d.kicker)}</div>
            <h1>${esc(d.title)}</h1>
            <div class="pl">${esc(d.place)}</div>
            <div class="chips"><span class="chip" style="background:${pc};color:#fff">${esc(d.phaseObj.name)}</span>
              ${d.water ? `<span class="chip" style="background:rgba(255,255,255,.18);color:#fff">${I('thermo')}${esc(d.water)}</span>` : ''}
              <span class="chip" style="background:rgba(255,255,255,.18);color:#fff">${I('clock')}${TZNAME[d.tz]} time</span></div>
          </div>
        </div>
      </section>
      <p class="lede" style="--pc:${pc}">${esc(d.summary)}</p>
      ${d.alert ? `<div class="sec"><div class="alert">${I('alert')}<div><b>${esc(d.alert.title)}</b><p>${esc(d.alert.text)}</p></div></div></div>` : ''}
      <div class="sec"><div class="sec-h"><h3>The plan</h3></div><div class="card">${timeline(d.events, c.n)}</div></div>
      ${d.dives ? `<div class="sec"><div class="sec-h"><h3>Dive sites</h3><a href="#/map/${(d.events.find(e => e.site) || {}).site || ''}">Chart →</a></div><div class="card">${d.dives.map((x, k) => DV.siteBlock(ds, x, k)).join('')}${DV.extraDives(ds).length ? `<div class="divesite"><div class="h"><b>Other dives</b></div><div class="dives">${DV.extraDives(ds).map(DV.diveRow).join('')}</div></div>` : ''}</div></div>` : ''}
      ${d.ideas ? `<div class="sec"><div class="sec-h"><h3>Ideas for the day</h3></div><div class="card"><ul class="ideas">${d.ideas.map((x, k) => `<li><span>${k + 1}</span>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}
      ${d.tasks ? `<div class="sec"><div class="sec-h"><h3>Checklist</h3></div><div class="card">${checklist(d.tasks)}</div></div>` : ''}
      ${c.status !== 'pre' && ds <= c.day.date || c.status === 'post' ? `<div class="sec"><a class="btn" href="#/dispatch/${ds}" style="width:100%;background:var(--coral);padding:15px">${I('heart')} Send a dispatch from this day</a></div>` : ''}
      <div class="sec"><div class="sec-h"><h3>Journal</h3><span class="muted" style="font-size:12px">Saved on this phone</span></div>
        <div class="card"><textarea class="notes" data-notes="${ds}" placeholder="What did you see today? Who spotted it first?">${esc(notes)}</textarea></div></div>
      <div class="sec daynav">
        ${prev ? `<a class="card" href="#/day/${prev.date}"><small>← Day ${String(prev.n).padStart(2, '0')}</small><b>${esc(prev.title)}</b></a>` : '<span></span>'}
        ${nxt ? `<a class="card next" href="#/day/${nxt.date}"><small>Day ${String(nxt.n).padStart(2, '0')} →</small><b>${esc(nxt.title)}</b></a>` : '<span></span>'}
      </div>`;
  }
  function totalDives() { return DV ? DV.count() : 0; }

  /* ---------------- Map ---------------- */
  const [LON0, LON1, LAT0, LAT1] = MAP.bbox;
  const proj = ll => [(ll[1] - LON0) / (LON1 - LON0) * MAP.w, (LAT1 - ll[0]) / (LAT1 - LAT0) * MAP.h];
  const VIEWS = { all: [0, 0, 1000, 1065], west: [95, 470, 380, 405], north: [10, 0, 300, 320], central: [440, 520, 540, 575] };
  function smooth(pts) {
    if (pts.length < 3) return 'M' + pts.map(p => p.join(',')).join('L');
    let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
      const t = 0.18;
      const c1 = [p1[0] + (p2[0] - p0[0]) * t, p1[1] + (p2[1] - p0[1]) * t];
      const c2 = [p2[0] - (p3[0] - p1[0]) * t, p2[1] - (p3[1] - p1[1]) * t];
      d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    }
    return d;
  }
  const ptOf = id => { const s = SITE(id); if (s) return proj(s.ll); const p = T.places[id]; return proj(p.ll); };

  function viewMap(focus) {
    const filter = S.get('mapFilter', 'all');
    const vkey = S.get('mapView', 'all');
    const c = ctx();
    const show = b => filter === 'all' || b === filter || b === 'both';
    const grat = [];
    for (let lon = -92; lon <= -89; lon += 0.5) { const x = proj([0, lon])[0]; grat.push(`<path class="grat" d="M${x},0V${MAP.h}"/>`); }
    for (let lat = -1.5; lat <= 1.8; lat += 0.5) { const y = proj([lat, 0])[1]; grat.push(`<path class="grat" d="M0,${y}H${MAP.w}"/>`); }
    const eqY = proj([0, 0])[1];
    const routes = ['ab', 'gs'].filter(b => filter === 'all' || filter === b).map(b =>
      `<path class="route ${b} anim" vector-effect="non-scaling-stroke" d="${smooth(T.routes[b].map(ptOf))}"/>`).join('');
    const ports = [['gps', 'Baltra'], ['ayora', 'Puerto Ayora'], ['dock', 'San Cristóbal']];
    const islands = [['ISABELA', [-1.18, -91.05]], ['FERNANDINA', [-0.62, -91.78]], ['SANTA CRUZ', [-1.0, -90.38]], ['SAN CRISTÓBAL', [-1.12, -89.62]], ['SANTIAGO', [0.12, -90.75]], ['WOLF', [1.38, -91.45]], ['DARWIN', [1.68, -91.6]]];
    let hereLL = null;
    if (c.status === 'during' && c.di >= 1 && c.di <= 17) {
      const sid = (c.day.events.find(e => e.site) || {}).site;
      hereLL = sid ? SITE(sid).ll : (c.day.events.find(e => e.place && T.places[e.place].ll) || {}).place && T.places[c.day.events.find(e => e.place && T.places[e.place].ll).place].ll;
    }
    const svg = `<svg viewBox="${VIEWS[vkey].join(' ')}" id="chart" role="img" aria-label="Map of the Galápagos with dive sites">
      <defs><linearGradient id="both" x1="0" x2="1"><stop offset=".5" stop-color="#F2643D"/><stop offset=".5" stop-color="#1E9AA0"/></linearGradient></defs>
      ${grat.join('')}
      <path class="eq" vector-effect="non-scaling-stroke" d="M0,${eqY}H${MAP.w}"/>
      <g class="scl" data-x="820" data-y="${eqY - 10}"><text class="eqlbl" x="0" y="0" style="text-anchor:middle">EQUATOR · 0°</text></g>
      ${MAP.paths.map(p => `<path class="land" vector-effect="non-scaling-stroke" d="${p}"/>`).join('')}
      ${islands.map(([n, ll]) => { const [x, y] = proj(ll); return `<g class="scl" data-x="${x}" data-y="${y}"><text class="ilbl" style="fill:rgba(255,236,210,.55)">${n}</text></g>`; }).join('')}
      ${routes}
      ${ports.map(([id, n]) => { const [x, y] = proj(T.places[id].ll); return `<g class="pin port scl" data-x="${x}" data-y="${y}"><circle class="o" r="9"/><circle class="i" r="5.5"/><text class="plbl" x="14" y="5" style="text-anchor:start">${n}</text></g>`; }).join('')}
      ${SITES.filter(s => show(s.boat)).map(s => { const [x, y] = proj(s.ll); return `<g class="pin ${s.boat} scl ${focus === s.id ? 'on' : ''}" data-x="${x}" data-y="${y}" data-site="${s.id}"><circle class="o" r="15"/><circle class="i" r="11.5"/><text>${s.n}</text></g>`; }).join('')}
      ${hereLL ? (() => { const [x, y] = proj(hereLL); return `<g class="scl" data-x="${x}" data-y="${y}"><circle class="here-ring" r="16"/></g>`; })() : ''}
    </svg>`;
    const list = b => SITES.filter(s => s.boat === b || s.boat === 'both').map(s => `<button class="row" data-site="${s.id}"><span class="n" style="background:${s.boat === 'both' ? 'linear-gradient(90deg,#F2643D 50%,#1E9AA0 50%)' : phaseColor(b)}">${s.n}</span><div><b>${esc(s.name)}</b><span>${esc(s.island)} · ${s.days.map(x => fmtDate(x, { short: true })).join(', ')}</span></div></button>`).join('');
    view.innerHTML = `
      <header class="page-h"><div class="caps">Galápagos Archipelago</div><h1>The <em>Chart</em></h1><p>Two voyages, ${SITES.length} sites, straddling the equator.</p></header>
      <div class="mapfilter">
        ${[['all', 'Both boats', '#999'], ['ab', 'Anne Bonny', '#F2643D'], ['gs', 'Galapagos Sky', '#1E9AA0']].map(([k, n, col]) => `<button data-mapfilter="${k}" class="${filter === k ? 'on' : ''}" style="--c:${col}"><i></i>${n}</button>`).join('')}
      </div>
      <div class="mapfilter" style="padding-top:8px">
        ${[['all', 'Whole archipelago'], ['west', 'The cold west'], ['north', 'Wolf & Darwin'], ['central', 'Santa Cruz → San Cristóbal']].map(([k, n]) => `<button data-mapview="${k}" class="${vkey === k ? 'on' : ''}">${n}</button>`).join('')}
      </div>
      <div class="mapwrap">${svg}
        <div class="compass">N<br>▲</div>
        <div class="scalebar" id="scalebar"><i></i>50 km</div>
      </div>
      <p class="muted" style="font-size:12px;margin:8px 20px 0">Site positions are approximate. Tap a pin for details.</p>
      <div class="sec"><div class="sec-h"><h3 style="color:#F2643D">Anne Bonny</h3><span class="muted" style="font-size:13px">30 Oct – 7 Nov</span></div><div class="card sitelist">${list('ab')}</div></div>
      <div class="sec"><div class="sec-h"><h3 style="color:#1E9AA0">Galapagos Sky</h3><span class="muted" style="font-size:13px">8 – 15 Nov</span></div><div class="card sitelist">${list('gs')}</div></div>
      <div class="sec"><div class="sec-h"><h3>Official route</h3><a href="docs/galapagos-sky-route-map.pdf" target="_blank">PDF →</a></div><div class="card"><img src="img/route.jpg" alt="Galapagos Sky route map" loading="lazy"></div></div>`;
    layoutChart(VIEWS[vkey]);
    if (focus) setTimeout(() => siteSheet(focus), 300);
  }
  function layoutChart(vb) {
    const svg = $('#chart'); if (!svg) return;
    svg.setAttribute('viewBox', vb.join(' '));
    const s = Math.max(.55, 1.9 * vb[2] / 1000); // keep pins a constant on-screen size at any zoom
    svg.querySelectorAll('.scl').forEach(g => g.setAttribute('transform', `translate(${g.dataset.x},${g.dataset.y}) scale(${s})`));
    const sb = $('#scalebar');
    if (sb) { const pxPerKm = 1000 / ((LON1 - LON0) * 111.3); const w = svg.clientWidth || 340; const kmv = vb[2] < 500 ? 20 : 50; sb.querySelector('i').style.width = (kmv * pxPerKm * w / vb[2]) + 'px'; sb.lastChild.textContent = `${kmv} km`; }
  }
  function animateChart(to) {
    const svg = $('#chart'); if (!svg) return;
    const from = svg.getAttribute('viewBox').split(' ').map(Number);
    const t0 = performance.now(), D = 700;
    const ease = t => 1 - Math.pow(1 - t, 3);
    function step(t) {
      const k = ease(Math.min(1, (t - t0) / D));
      layoutChart(from.map((v, i) => v + (to[i] - v) * k));
      if (k < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  function siteSheet(id) {
    const s = SITE(id); if (!s) return;
    const days = s.days.map(DAY);
    const notes = [];
    days.forEach(d => (d.dives || []).forEach(x => { if (x.site.toLowerCase().includes(s.name.split(' ').slice(-1)[0].toLowerCase()) || x.site.toLowerCase().includes(s.name.toLowerCase())) notes.push(x); }));
    const boat = s.boat === 'both' ? 'Both boats' : s.boat === 'ab' ? 'Anne Bonny' : 'Galapagos Sky';
    openSheet(`
      <div style="padding:6px 20px 0"><span class="caps" style="color:${s.boat === 'gs' ? '#1E9AA0' : '#F2643D'}">Site ${s.n} · ${boat}</span></div>
      <h2>${esc(s.name)}</h2><p class="sub">${esc(s.island)}</p>
      ${notes.length ? `<div class="block card">${notes.slice(0, 2).map(x => `<div class="divesite"><div class="h"><b>${esc(x.site)}</b>${x.count ? `<span class="n">×${x.count}</span>` : ''}</div><ul>${x.notes.map(n => `<li>${esc(n)}</li>`).join('')}</ul></div>`).join('')}</div>` : ''}
      <div class="block card list">${days.map(d => `<a class="row" href="#/day/${d.date}" data-close><div class="ic" style="background:${phaseColor(d.phase)}">${I('cal')}</div><div class="tx"><b>Day ${String(d.n).padStart(2, '0')} · ${esc(d.title)}</b><span>${fmtDate(d.date)}</span></div>${I('right')}</a>`).join('')}</div>
      <div class="block actions"><a class="act" href="https://maps.apple.com/?ll=${s.ll.join(',')}&q=${enc(s.name)}" target="_blank" rel="noopener">${I('pin')}Apple Maps</a><a class="act" href="https://en.wikipedia.org/wiki/Special:Search?search=${enc(s.name + ' Galapagos')}" target="_blank" rel="noopener">${I('book')}Read more</a></div>`);
  }

  /* ---------------- Logbook ---------------- */
  function ring(val, max, color) {
    const r = 28, C = 2 * Math.PI * r, off = C * (1 - Math.min(1, max ? val / max : 0));
    return `<svg viewBox="0 0 64 64"><circle class="bg" cx="32" cy="32" r="${r}"/><circle class="fg" cx="32" cy="32" r="${r}" stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${off}"/></svg>`;
  }
  function viewLog() {
    const spotted = S.get('spotted', {});
    const dl = S.get('dl', {});
    const diveDays = T.days.filter(d => d.dives);
    const big = T.wildlife.filter(w => w.big); const bigDone = big.filter(w => spotted[w.id]).length;
    const total = totalDives();
    view.innerHTML = `
      <header class="page-h"><div class="caps">Field notes</div><h1>The <em>Logbook</em></h1><p>Every dive in full, plus the wildlife you tick off. Saved on this phone.</p></header>
      <div class="sec rings">
        <div class="card ringcard">${ring(total, 40, '#2F7FD8')}<div><b>${total}</b><span>dives logged</span></div></div>
        <div class="card ringcard">${ring(Object.keys(spotted).length, T.wildlife.length, '#2E9C6A')}<div><b>${Object.keys(spotted).length}<small style="font-size:16px;color:var(--muted)">/${T.wildlife.length}</small></b><span>species spotted</span></div></div>
      </div>
      ${DV.logbookHTML()}
      <div class="sec"><div class="card pad" style="display:flex;align-items:center;gap:14px">
        <div style="font-family:var(--serif);font-size:40px;line-height:1;color:var(--coral)">${bigDone}<span style="font-size:20px;color:var(--muted)">/6</span></div>
        <div><b style="display:block">The Galápagos Six</b><span class="muted" style="font-size:13px">Hammerhead, whale shark, mola, marine iguana, penguin, flightless cormorant. ${bigDone === 6 ? 'All six. Legendary. 🏆' : 'Get all six for bragging rights.'}</span></div></div></div>
      <div class="sec"><div class="sec-h"><h3>Wildlife</h3><span class="muted" style="font-size:13px">Tap when you see it</span></div>
        <div class="species">${T.wildlife.map(w => `<button class="sp ${spotted[w.id] ? 'on' : ''}" data-sp="${w.id}">
          <img src="${img(w.img)}" alt="" loading="lazy">${w.big ? '<span class="big5">Big six</span>' : ''}
          <span class="badge">${I('check')}</span>
          <span class="lbl"><b>${esc(w.name)}</b><span class="${spotted[w.id] ? 'when' : ''}">${spotted[w.id] ? 'Spotted ' + fmtDate(spotted[w.id], { short: true }) : esc(w.where)}</span></span></button>`).join('')}</div></div>`;
    DV.bindLogbook(view);
  }

  /* ---------------- Wallet & sub-pages ---------------- */
  function subHead(kicker, title, sub, back = '#/wallet') {
    return `<div style="padding:calc(var(--sat) + 14px) 16px 0"><a class="roundbtn dark" href="${back}" aria-label="Back">${I('left')}</a></div>
      <header class="page-h" style="padding-top:12px"><div class="caps">${kicker}</div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</header>`;
  }
  const STAYS = ['wyndham', 'ab-embark', 'gs-embark', 'indigo', 'plaza'];

  function viewWallet() {
    const c = ctx();
    const nextIdx = Math.max(0, FLIGHTS.findIndex(e => e.endMs > c.n));
    const tiles = [
      ['#/pack', 'bag', 'Packing list', `${packDone()} of ${packTotal()} packed`, '#F2643D'],
      ['#/contacts', 'users', 'Contacts', `${T.contacts.length} numbers & emails`, '#1E9AA0'],
      ['#/docs', 'doc', 'Documents', `${T.docs.length} PDFs · ${T.links.length} links`, '#0E4A5A'],
      ['#/guides', 'book', 'How-to guides', 'Airport & boarding, with photos', '#8E5A9B'],
      ['#/info/money', 'dollar', 'Money & tips', 'Cash, fees, gratuities, converter', '#C9A227'],
      ['#/info/water', 'thermo', 'Water & wetsuits', 'The El Niño effect', '#2F7FD8'],
      ['#/info/safety', 'shield', 'Health & safety', 'Diving rules, altitude, no-fly', '#2E9C6A'],
      ['#/info/time', 'globe', 'Time zones', 'Four clocks, one trip', '#7A7F82']
    ];
    view.innerHTML = `
      <header class="page-h"><div class="caps">Everything, offline</div><h1>The <em>Wallet</em></h1><p>Boarding passes, stays, contacts and documents.</p></header>
      <div class="sec"><div class="sec-h"><h3>Boarding passes</h3><span class="muted" style="font-size:13px">${FLIGHTS.length} flights · swipe</span></div>
        <div class="passes" id="passes">${FLIGHTS.map(e => pass(e, { small: true, tap: true, dim: true })).join('')}</div></div>
      <div class="sec"><div class="sec-h"><h3>Stays</h3></div><div class="card list">
        ${STAYS.map(id => { const e = EV(id); return `<button class="row" data-ev="${id}"><div class="ic t-${e.type}">${I(typeIcon(e.type))}</div><div class="tx"><b>${esc(e.hotel.name)}</b><span>${esc(e.hotel.in)} → ${esc(e.hotel.out)} · ${esc(e.hotel.room.split('·')[0].split(',')[0])}</span></div>${I('right')}</button>`; }).join('')}
        <a class="row" href="#/day/2026-11-07"><div class="ic" style="background:var(--warn)">${I('alert')}</div><div class="tx"><b>Night of 7 Nov: not booked</b><span>Puerto Ayora · plus transfer to San Cristóbal</span></div>${I('right')}</a>
      </div></div>
      <div class="sec tilegrid">${tiles.map(([h, ic, t, s, col]) => `<a class="card tile" href="${h}"><div class="ic" style="background:${col}">${I(ic)}</div><b>${t}</b><span>${s}</span></a>`).join('')}</div>
      <div class="sec"><div class="card list">
        <button class="row" data-act="ics"><div class="ic" style="background:#F2643D">${I('cal')}</div><div class="tx"><b>Add the trip to Calendar</b><span>Every flight, transfer and day, as an .ics file</span></div>${I('right')}</button>
        <a class="row" href="#/dispatches"><div class="ic" style="background:#D2462A">${I('heart')}</div><div class="tx"><b>Dispatches</b><span>Magazine pages home, and The Complete Voyage</span></div>${I('right')}</a>
        <a class="row" href="#/settings"><div class="ic" style="background:#33434D">${I('sliders')}</div><div class="tx"><b>Settings</b><span>Theme, time travel, reset</span></div>${I('right')}</a>
        <a class="row" href="#/credits"><div class="ic" style="background:#7A7F82">${I('camera')}</div><div class="tx"><b>Photo credits</b><span>Wikimedia Commons & operator guides</span></div>${I('right')}</a>
      </div></div>`;
    const ps = $('#passes'); if (ps && nextIdx > 0) requestAnimationFrame(() => { const el = ps.children[nextIdx]; ps.scrollLeft = el.offsetLeft - 16; });
  }

  const PACK_ITEMS = () => T.packing.flatMap(g => g.items.map(i => g.group + '|' + i));
  const packTotal = () => PACK_ITEMS().length;
  const packDone = () => { const p = S.get('pack', {}); return PACK_ITEMS().filter(k => p[k]).length; };
  function viewPack() {
    const p = S.get('pack', {});
    view.innerHTML = subHead('From the workshop notes & Galapagos Sky', 'Packing <em>list</em>', `${packDone()} of ${packTotal()} packed`) +
      T.packing.map(g => `<div class="sec"><div class="sec-h"><h3>${g.group}</h3><span class="muted" style="font-size:13px">${g.items.filter(i => p[g.group + '|' + i]).length}/${g.items.length}</span></div><div class="card">
        ${g.items.map(i => { const k = g.group + '|' + i; return `<div class="check ${p[k] ? 'on' : ''}" data-pack="${esc(k)}"><span class="box">${I('check')}</span><span><div class="t">${esc(i)}</div></span></div>`; }).join('')}</div></div>`).join('') +
      `<div class="sec" style="text-align:center"><button class="btn ghost" data-act="resetpack">Reset packing list</button></div>`;
  }
  function viewContacts() {
    const groups = [...new Set(T.contacts.map(x => x.group))];
    view.innerHTML = subHead('One tap away', '<em>Contacts</em>', 'Ecuador mobiles work best via WhatsApp on the boat’s Wi-Fi.') +
      `<div class="sec"><div class="card list">${groups.map(g => `<div class="grp">${g}</div>` + T.contacts.filter(x => x.group === g).map(x => `
        <div class="row"><div class="tx"><b>${esc(x.name)}</b><span>${esc(x.role)}${x.phone ? ' · ' + esc(x.phone) : ''}</span>${x.note ? `<span style="color:var(--warn)">${esc(x.note)}</span>` : ''}</div>
        <div class="end">${x.phone && !x.waOnly ? `<a class="pillbtn" href="tel:${digits(x.phone)}" aria-label="Call">${I('phone')}</a>` : ''}${x.wa ? `<a class="pillbtn" href="${waLink(x.phone)}" target="_blank" rel="noopener" aria-label="WhatsApp">${I('wa')}</a>` : ''}${x.email ? `<a class="pillbtn" href="mailto:${x.email}" aria-label="Email">${I('mail')}</a>` : ''}</div></div>`).join('')).join('')}</div></div>
      <div class="sec"><div class="alert info">${I('info')}<div><b>Nautilus Lifeline</b><p>Galapagos Sky’s MMSI is 735057585. A Lifeline is required safety kit, along with an SMB and an audible signal.</p></div></div></div>`;
  }
  function viewDocs() {
    view.innerHTML = subHead('Saved for offline', '<em>Documents</em>', 'The original PDFs open even with no signal.') +
      `<div class="sec"><div class="sec-h"><h3>PDFs</h3></div><div class="card list">${T.docs.map(d => `<a class="row" href="${d.file}" target="_blank"><div class="ic" style="background:#0E4A5A">${I('doc')}</div><div class="tx"><b>${esc(d.title)}</b><span>${esc(d.sub)}</span></div>${I('right')}</a>`).join('')}</div></div>
      <div class="sec"><div class="sec-h"><h3>Links</h3><span class="muted" style="font-size:13px">Need signal</span></div><div class="card list">${T.links.map(l => `<a class="row" href="${l.url}" target="_blank" rel="noopener"><div class="ic" style="background:${l.hot ? '#F2643D' : '#7A7F82'}">${I(l.hot ? 'alert' : 'ext')}</div><div class="tx"><b>${esc(l.title)}</b><span>${esc(l.sub)}</span></div>${I('ext')}</a>`).join('')}</div></div>
      <div class="sec"><div class="sec-h"><h3>Booking references</h3></div><div class="card list">
        ${[...new Map(FLIGHTS.map(e => [e.flight.ref, [e.flight.airline, e.flight.ref]])).values()].map(([a, r]) => `<button class="row" data-copy="${r}" data-label="${a} ref copied"><div class="ic t-flight">${I('flight')}</div><div class="tx"><b style="font-family:ui-monospace,Menlo,monospace;letter-spacing:.08em">${r}</b><span>${a} · tap to copy</span></div>${I('copy')}</button>`).join('')}</div></div>`;
  }
  function viewGuides() {
    view.innerHTML = subHead('With photos', 'How-to <em>guides</em>', 'Know what each step looks like before you get there.') +
      `<div class="sec">${Object.entries(T.guides).map(([id, g]) => `<a class="daycard" href="#/guide/${id}" style="--pc:var(--coral)"><div class="img" style="height:150px"><img src="${img(g.img)}" alt="" loading="lazy"></div><div class="txt"><div class="kick">${esc(g.kicker)}</div><h4>${esc(g.title)}</h4><div class="pl">${g.steps.length} steps</div></div></a>`).join('')}</div>`;
  }
  function viewGuide(id) {
    const g = T.guides[id]; if (!g) return go('#/guides');
    view.innerHTML = `<section class="dayhero" style="height:44vh;min-height:300px"><img src="${img(g.img)}" alt=""><div class="inner"><div class="navbtns"><a class="roundbtn" href="#/guides" aria-label="Back">${I('left')}</a></div>
      <div class="bottom"><div class="kick">${esc(g.kicker)}</div><h1>${esc(g.title)}</h1></div></div></section>
      ${g.intro ? `<p class="lede" style="font-size:17px">${esc(g.intro)}</p>` : ''}
      <div class="sec"><div class="card">${g.steps.map((s, i) => `<div class="step"><div class="no">${i + 1}</div><div><h4>${esc(s.h)}</h4><p>${esc(s.p)}</p>${s.img ? `<img src="${img(s.img)}" alt="" loading="lazy">` : ''}</div></div>`).join('')}</div></div>
      ${id === 'galapagos-flight' ? `<div class="sec"><div class="card pad" style="display:flex;gap:14px;align-items:center"><img src="${img('g_sebastian')}" alt="" style="width:64px;height:64px;border-radius:50%;object-fit:cover"><div><b>Look for this sign</b><div class="muted" style="font-size:13px">Ecoventura / Galapagos Sky reps (e.g. Sebastián Bravo) work this hall. Handy if you need help, though your own assistant is with you on the 30th.</div></div></div></div>` : ''}`;
  }

  function viewInfo(id) {
    const pages = {
      money: () => subHead('Cash is king', 'Money &amp; <em>tips</em>', 'Ecuador uses the US dollar.') + `
        <div class="sec"><div class="card"><div class="checkhead"><b>£ ⇄ $ converter</b><span class="ring">rate <input id="fx" inputmode="decimal" value="${S.get('fx', 1.30)}" style="width:52px;border:0;background:var(--paper-2);border-radius:8px;padding:3px 6px;font:inherit;color:var(--ink)"></span></div>
          <div class="conv"><label><small>GBP £</small><input id="gbp" inputmode="decimal" value="100"></label><span class="sw">${I('swap')}</span><label><small>USD $</small><input id="usd" inputmode="decimal" value="${(100 * S.get('fx', 1.30)).toFixed(0)}"></label></div>
          <p class="muted" style="font-size:12px;margin:-6px 16px 14px">Set the rate yourself. It isn’t live, so it works offline.</p></div></div>
        <div class="sec"><div class="card prose">
          <h4>Bring small bills</h4><ul><li>$1, $5, $10 and $20. Change is often short.</li><li><b>$50 and $100 notes are not accepted</b> in Galápagos shops, restaurants or airports.</li><li>Taxis to the dock: under $5, cash only.</li><li>Airport trolleys in Quito may need a little cash.</li></ul>
          <h4>Already paid</h4><ul><li>Transit Control Card (TCT) and Galápagos National Park fee: included</li><li>Nitrox: prepaid (per the workshop notes)</li></ul>
          <h4>Might come up</h4><ul><li>Extra Avianca hold bag: ≈ $60 per bag, each way</li><li>Galapagos Sky rentals, if needed: full kit $250 (7 nights), or BCD $80, regulator $75, 7 mm suit $45 and so on</li><li>Hyperbaric chamber fee: $35 (normally prepaid)</li></ul>
          <h4>Crew tips</h4><ul><li><b>Galapagos Sky:</b> the workshop notes suggest ≈ $750; the boat’s guide says 10% of the cruise rate. Cash preferred, Visa/MC/Amex accepted. Shared by all crew.</li><li><b>Anne Bonny:</b> no guidance in your documents. Ask the crew early in the week.</li></ul>
        </div></div>`,
      water: () => subHead('Why we’re called El Niño', 'Water &amp; <em>wetsuits</em>', 'The ocean is running hot this year.') + `
        <div class="sec"><div class="card"><div class="checkhead"><b>Expected water (Galapagos Sky plan)</b></div>
          <div class="temps"><div><b>22–26°</b><span>Wolf & Darwin</span></div><div><b>21–24°</b><span>Central islands</span></div><div><b>13–21°</b><span>The cold west</span></div></div></div></div>
        <div class="sec"><div class="card prose">
          <h4>The El Niño effect</h4><p>The workshop’s pre-trip note: water is much warmer than usual, about 2–3 °C up in the north and 5–8 °C up in the south and west. Galapagos Sky reported ≈ 30 °C north and ≈ 28 °C south. The big animals are still showing up for now.</p>
          <h4>What to wear</h4><ul><li>A 3 mm would probably do; a <b>5 mm is the safer call</b>.</li><li>Bring a way to bulk up (hooded vest, shorty over-suit) in case it snaps back to normal. That would be a big drop.</li><li>The boat’s standard advice is 7 mm, and guides switch to drysuits in the south-west in a normal year.</li><li>Rental wetsuits exist aboard the Sky. <b>Gloves and hoods do not.</b></li></ul>
          <h4>Gloves</h4><p>Kevlar-reinforced 3 mm or tough, thin work gloves, especially on your left hand, since your right is on the camera. On some dives you descend and hold sharp rock in current.</p>
        </div></div>
        <div class="sec"><div class="card list">${T.links.slice(1, 4).map(l => `<a class="row" href="${l.url}" target="_blank" rel="noopener"><div class="ic" style="background:#2F7FD8">${I('thermo')}</div><div class="tx"><b>${esc(l.title)}</b><span>${esc(l.sub)}</span></div>${I('ext')}</a>`).join('')}</div></div>`,
      safety: () => subHead('Dive smart', 'Health &amp; <em>safety</em>', 'Galápagos is advanced diving: current, surge and thermoclines.') + `
        <div class="sec"><div class="card prose">
          <h4>In the water</h4><ul><li>Dive as a group with the National Park guide, 8 divers per guide. Stay together; the guides decide underwater.</li><li>At Wolf & Darwin, settle in a spread-out line. <b>Don’t creep forward.</b> The sharks like calm, quiet, still groups.</li><li>If the guide signals a whale shark or manta in the blue, swim out fast.</li><li>All dives are by panga: back-roll entry (some negative), hand gear up, climb the ladder.</li><li>Nitrox 32%: analyse and log every tank. Bring your card.</li><li>Night dive at Wolf: proper light and a tank marker.</li></ul>
          <h4>Required kit</h4><ul><li>Surface marker buoy (big sausage + reel)</li><li>Audible signal (whistle / horn) and a reflective item</li><li>Nautilus Lifeline (MMSI 735057585)</li><li>Dive computer, ideally plus a backup</li></ul>
          <h4>No-fly</h4><p>Last Sky dive is Saturday 14 Nov (Pinzón). The guidance is an 18–24 h surface interval, and your flight is Monday 16 Nov at 14:15, so you have plenty of margin.</p>
          <h4>Altitude</h4><p>Quito is ≈ 2,850 m. Hydrate and take the first evening gently.</p>
          <h4>Sun</h4><p>Right on the equator, the sun is fierce. Use reef-safe sunscreen, a hat and sunglasses.</p>
          <h4>Insurance & chamber</h4><p>Dive accident insurance is mandatory. The hyperbaric chamber is in Puerto Ayora. Emergency number in Ecuador: <a href="tel:911"><b>911</b></a>.</p>
          <h4>Phones</h4><p>Signal is very limited at sea. The Sky has free Wi-Fi, but tell family and work to expect gaps.</p>
        </div></div>`,
      time: () => subHead('Four clocks', 'Time <em>zones</em>', 'Every time in this app is local to where it happens.') + `
        <div class="sec"><div class="card list">${['GMT', 'CET', 'ECT', 'GAL'].map(z => `<div class="row"><div class="ic" style="background:#0E4A5A">${I('clock')}</div><div class="tx"><b>${TZNAME[z]}</b><span>${TZLONG[z]}</span></div><b data-clock="${z}" style="font-family:var(--serif);font-size:26px;font-weight:400">${hm(now(), z)}</b></div>`).join('')}</div></div>
        <div class="sec"><div class="alert info">${I('info')}<div><b>Galápagos is 1 hour behind the mainland</b><p>Put your watch back when you land at Baltra on the 30th, and forward again when you reach Guayaquil on the 16th. London is 5 hours ahead of Quito and 6 ahead of the islands.</p></div></div></div>`
    };
    if (!pages[id]) return go('#/wallet');
    view.innerHTML = pages[id]();
    if (id === 'time') every(tick, 1000);
  }

  function viewSettings() {
    const sim = S.get('simNow', null);
    const theme = S.get('theme', 'auto');
    const toLocalInput = ms => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); };
    view.innerHTML = subHead('Behind the scenes', '<em>Settings</em>', '', '#/') + `
      <div class="sec"><div class="card">
        <div class="settings-row"><b>Appearance</b><select id="theme">${['auto', 'light', 'dark'].map(t => `<option value="${t}" ${t === theme ? 'selected' : ''}>${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></div>
      </div></div>
      <div class="sec"><div class="sec-h"><h3>Time travel</h3></div><div class="card">
        <div class="settings-row"><div><b>Preview the app at another moment</b><div class="muted" style="font-size:12.5px">Uses this phone’s clock zone</div></div></div>
        <div class="settings-row"><input type="datetime-local" id="sim" value="${toLocalInput(sim ? now() : Date.now())}" min="2026-10-20T00:00" max="2026-11-25T00:00"><button class="btn" data-act="sim" style="padding:8px 14px">Go</button></div>
        <div class="settings-row"><span class="muted" style="font-size:13px">${sim ? 'Previewing a simulated time' : 'Using real time'}</span>${sim ? '<button class="btn ghost" data-act="realtime" style="padding:8px 14px">Back to now</button>' : ''}</div>
      </div></div>
      <div class="sec"><div class="card">
        <div class="settings-row"><div><b>Reset everything</b><div class="muted" style="font-size:12.5px">Checklists, logbook, journal & settings</div></div><button class="btn ghost" data-act="resetall" style="padding:8px 14px;color:#D2462A">Reset</button></div>
      </div></div>
      <div class="footer"><div class="logo-s">El Niño</div>v1 · works offline · data stays on this phone</div>`;
  }
  function viewCredits() {
    view.innerHTML = subHead('Thank you', 'Photo <em>credits</em>', 'Photos from Wikimedia Commons under their stated licences. Boat, airport and dock photos are from the Galapagos Sky / Ecoventura guides in your documents.') +
      `<div class="sec"><div class="card">${(window.PHOTO_CREDITS || []).map(c => `<div class="credit"><b>${esc(c.title)}</b><br>${esc(c.artist || 'Unknown')} · ${esc(c.lic)} · <a href="${c.url}" target="_blank" rel="noopener">source</a></div>`).join('')}</div></div>
      <div class="sec"><div class="card pad muted" style="font-size:13px">Coastlines: Natural Earth (public domain). Typefaces: Fraunces & Inter (SIL Open Font License).</div></div>`;
  }

  /* ---------------- Actions ---------------- */
  function familyText() {
    const c = ctx(); const d = c.day;
    const lines = [];
    if (c.status === 'pre') lines.push(`🌊 El Niño: we fly to the Galápagos in ${Math.ceil((TRIP_START - c.n) / 86400000)} days!`);
    else if (c.status === 'post') lines.push('🏡 Home safe from the Galápagos. What a trip.');
    else {
      lines.push(`🌊 Galápagos update: Day ${d.n} of ${T.days.length} (${fmtDate(d.date)})`);
      lines.push(`Today: ${d.title}, ${d.place}.`);
      if (c.next) lines.push(`Next: ${c.next.title}, ${fmtDate(c.next.date, { short: true })} ${c.next.time} local.`);
      if (d.phase === 'ab' || d.phase === 'gs') lines.push('We’re on a liveaboard, so signal is patchy. We’ll check in when we can.');
    }
    const spotted = Object.keys(S.get('spotted', {})).map(id => T.wildlife.find(w => w.id === id).name);
    if (spotted.length) lines.push(`Spotted so far: ${spotted.slice(0, 6).join(', ')}${spotted.length > 6 ? '…' : ''}`);
    const last = FLIGHTS[FLIGHTS.length - 1];
    lines.push(`Home ${fmtDate(last.date, { short: true })}, landing ${last.end.time}. 💙 ${T.travellers.join(' & ')}`);
    return lines.join('\n');
  }
  function share(text, title) {
    if (navigator.share) navigator.share({ title: title || 'El Niño', text }).catch(() => {});
    else copy(text, 'Message copied');
  }
  function icsFile() {
    const pad = n => String(n).padStart(2, '0');
    const z = ms => { const d = new Date(ms); return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`; };
    const clean = s => String(s).replace(/[,;\\]/g, m => '\\' + m).replace(/\n/g, '\\n');
    const out = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//El Nino//Trip//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:El Niño · Galápagos'];
    TIMED.forEach(e => {
      out.push('BEGIN:VEVENT', `UID:${e.id}@elnino.trip`, `DTSTAMP:${z(Date.now())}`, `DTSTART:${z(e.start)}`, `DTEND:${z(e.endMs || e.start + 3600000)}`,
        `SUMMARY:${clean(e.title)}`, `DESCRIPTION:${clean([e.sub, e.flight ? `Booking ${e.flight.ref} · ${e.flight.cabin}` : '', ...(e.lines || [])].filter(Boolean).join('\n'))}`);
      if (e.start - 3 * 3600000 > Date.now() && e.type !== 'hotel') out.push('BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${clean(e.title)}`, 'END:VALARM');
      out.push('END:VEVENT');
    });
    T.days.forEach(d => {
      const s = d.date.replace(/-/g, ''); const nx = new Date(dateObj(d.date).getTime() + 86400000); const e = `${nx.getUTCFullYear()}${pad(nx.getUTCMonth() + 1)}${pad(nx.getUTCDate())}`;
      out.push('BEGIN:VEVENT', `UID:day-${d.date}@elnino.trip`, `DTSTAMP:${z(Date.now())}`, `DTSTART;VALUE=DATE:${s}`, `DTEND;VALUE=DATE:${e}`, `SUMMARY:${clean(`Day ${d.n} · ${d.title}`)}`, `DESCRIPTION:${clean(d.place + '\n' + d.summary)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
    });
    out.push('END:VCALENDAR');
    return out.join('\r\n');
  }
  function exportIcs() {
    const ics = icsFile();
    const file = typeof File === 'function' ? new File([ics], 'el-nino-trip.ics', { type: 'text/calendar' }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: 'El Niño trip calendar' }).catch(() => {}); return; }
    const a = document.createElement('a'); a.href = 'data:text/calendar;charset=utf-8,' + enc(ics); a.download = 'el-nino-trip.ics'; document.body.appendChild(a); a.click(); a.remove();
  }

  document.addEventListener('click', ev => {
    const t = ev.target;
    if (t.closest('[data-stop]')) return;
    const el = (s) => t.closest(s);
    let x;
    if ((x = el('[data-close]'))) { closeSheet(); if (x.tagName !== 'A') return; }
    if ((x = el('[data-ev]'))) { const e = EV(x.dataset.ev); if (e) { haptic(); eventSheet(e); } return; }
    if ((x = el('[data-task]'))) {
      const id = x.dataset.task; const done = S.get('tasks', {}); done[id] = !done[id]; if (!done[id]) delete done[id]; S.set('tasks', done);
      x.classList.toggle('on', !!done[id]); x.setAttribute('aria-checked', !!done[id]); haptic(); tick(); return;
    }
    if ((x = el('[data-pack]'))) {
      const k = x.dataset.pack; const p = S.get('pack', {}); p[k] = !p[k]; if (!p[k]) delete p[k]; S.set('pack', p); x.classList.toggle('on', !!p[k]); haptic();
      const sub = view.querySelector('.page-h p'); if (sub) sub.textContent = `${packDone()} of ${packTotal()} packed`; return;
    }
    if ((x = el('[data-sp]'))) {
      const id = x.dataset.sp; const sp = S.get('spotted', {});
      if (sp[id]) delete sp[id]; else { sp[id] = ctx().day.date; toast(`${T.wildlife.find(w => w.id === id).name} spotted! 🎉`); }
      S.set('spotted', sp); haptic(); const sy = scrollY; viewLog(); scrollTo(0, sy);
      const card = view.querySelector(`[data-sp="${id}"]`); card && card.classList.add('pop'); return;
    }
    if ((x = el('[data-site]'))) { haptic(); siteSheet(x.dataset.site); view.querySelectorAll('.pin').forEach(p => p.classList.toggle('on', p.dataset.site === x.dataset.site)); return; }
    if ((x = el('[data-mode]'))) { viewTrip(x.dataset.mode); return; }
    if ((x = el('[data-mapfilter]'))) { S.set('mapFilter', x.dataset.mapfilter); viewMap(); return; }
    if ((x = el('[data-mapview]'))) { S.set('mapView', x.dataset.mapview); view.querySelectorAll('[data-mapview]').forEach(b => b.classList.toggle('on', b === x)); animateChart(VIEWS[x.dataset.mapview]); return; }
    if ((x = el('[data-copy]'))) { copy(x.dataset.copy, x.dataset.label); return; }
    if ((x = el('[data-act]'))) {
      const a = x.dataset.act;
      if (a === 'family') share(familyText(), 'El Niño update');
      if (a === 'shareday') { const d = DAY(x.dataset.date); share(`Day ${d.n} · ${fmtDate(d.date)}\n${d.title}, ${d.place}\n\n${d.summary}`, d.title); }
      if (a === 'ics') exportIcs();
      if (a === 'sim') { const v = $('#sim').value; if (v) { S.set('simNow', new Date(v).getTime()); S.set('simSet', Date.now()); toast('Time travelling ⏳'); go('#/'); } }
      if (a === 'realtime') { S.del('simNow'); S.del('simSet'); toast('Back to the present'); viewSettings(); }
      if (a === 'resetpack') { if (confirm('Untick every packing item?')) { S.del('pack'); viewPack(); } }
      if (a === 'resetall') { if (confirm('Clear all checklists, logbook entries, journal notes and settings on this phone?')) { try { Object.keys(localStorage).filter(k => k.startsWith('elnino:') && k !== 'elnino:key').forEach(k => localStorage.removeItem(k)); } catch (e) {} toast('All clear'); go('#/'); } }
      return;
    }
  });
  document.addEventListener('input', ev => {
    const t = ev.target;
    if (t.dataset.notes) { S.set('notes:' + t.dataset.notes, t.value); }
    if (t.id === 'gbp' || t.id === 'usd' || t.id === 'fx') {
      const fx = parseFloat($('#fx').value) || 0; if (t.id === 'fx') S.set('fx', fx);
      const g = $('#gbp'), u = $('#usd');
      if (t.id === 'usd') g.value = fx ? (parseFloat(u.value || 0) / fx).toFixed(0) : '';
      else u.value = (parseFloat(g.value || 0) * fx).toFixed(0);
    }
  });
  document.addEventListener('change', ev => {
    if (ev.target.id === 'theme') { S.set('theme', ev.target.value); applyTheme(); }
  });
  function applyTheme() {
    const t = S.get('theme', 'auto');
    if (t === 'auto') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
  }

  /* ---------------- Dispatches ---------------- */
  let DV = null;
  const D = window.ElNinoDispatch({ T, S, I, esc, img, fmtDate, view, toast, go: h => go(h), openSheet, closeSheet, phaseColor, km, ctx, DAY, MAP, proj,
    routeD: { ab: smooth(T.routes.ab.map(ptOf)), gs: smooth(T.routes.gs.map(ptOf)) }, diveIndex: () => DV ? DV.index() : [] });
  DV = window.ElNinoDives({ T, S, I, esc, img, fmtDate, view, toast, go: h => go(h), openSheet, closeSheet, phaseColor, DAY, ctx, kit: D.kit,
    releaseURLs: D.releaseURLs, rerender: () => { const sy = scrollY; render(); scrollTo(0, sy); } });

  /* ---------------- Router ---------------- */
  function route() {
    const h = location.hash.replace(/^#\/?/, '');
    const parts = h.split('/');
    return { root: parts[0] || 'today', arg: parts[1], parts };
  }
  function go(h) { if (location.hash === h) render(); else location.hash = h; }
  const TABROOT = { dive: 'log', dispatch: 'today', dispatches: 'today', today: 'today', trip: 'trip', day: 'trip', map: 'map', log: 'log', wallet: 'wallet', pack: 'wallet', contacts: 'wallet', docs: 'wallet', guides: 'wallet', guide: 'wallet', info: 'wallet', credits: 'wallet', settings: 'today' };
  let lastRoute = '';
  function render() {
    timers.forEach(clearInterval); timers = [];
    closeSheet(true);
    const r = route();
    const fns = { today: viewToday, trip: () => viewTrip(r.arg), day: () => viewDay(r.arg), map: () => viewMap(r.arg), log: viewLog, wallet: viewWallet,
      pack: viewPack, contacts: viewContacts, docs: viewDocs, guides: viewGuides, guide: () => viewGuide(r.arg), info: () => viewInfo(r.arg), settings: viewSettings, credits: viewCredits,
      dispatch: () => D.viewComposer(r.arg || ctx().day.date), dispatches: D.viewArchive,
      dive: () => (r.parts[1] === 'new' || r.parts[2] === 'edit') ? DV.viewForm(r.parts[2] === 'edit' ? ['dive', r.parts[1]] : r.parts) : DV.viewDive(r.arg) };
    (fns[r.root] || viewToday)();
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === (TABROOT[r.root] || 'today')));
    const key = location.hash;
    if (key !== lastRoute) { window.scrollTo(0, 0); view.classList.remove('view-enter'); void view.offsetWidth; view.classList.add('view-enter'); }
    lastRoute = key;
  }
  window.addEventListener('hashchange', render);

  /* ---------------- Boot ---------------- */
  const tabs = [['today', '#/', 'home', 'Today'], ['trip', '#/trip', 'trip', 'Itinerary'], ['map', '#/map', 'map', 'Chart'], ['log', '#/log', 'fish', 'Logbook'], ['wallet', '#/wallet', 'wallet', 'Wallet']];
  $('#tabs').innerHTML = tabs.map(([k, h, ic, n]) => `<a href="${h}" data-tab="${k}">${I(ic)}<span>${n}</span></a>`).join('');
  applyTheme();
  const q = new URLSearchParams(location.search).get('now');
  if (q) { const ms = Date.parse(q); if (!isNaN(ms)) { S.set('simNow', ms); S.set('simSet', Date.now()); } }
  render();

  const pill = $('#offline');
  const net = () => { pill.classList.toggle('show', !navigator.onLine); };
  window.addEventListener('online', net); window.addEventListener('offline', net); net();
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing; w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Update ready. Reopen the app to apply it.'); });
      });
    }).catch(() => {});
    navigator.serviceWorker.addEventListener('message', e => { if (e.data === 'cached') toast('Saved for offline ✓'); });
  }
  // re-render Today when the app returns to the foreground (time may have moved on)
  document.addEventListener('visibilitychange', () => { if (!document.hidden && route().root === 'today') render(); });
};
