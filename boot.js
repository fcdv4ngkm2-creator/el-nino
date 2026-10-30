/* El Niño — boot. In the published build the trip data ships encrypted (window.TRIP_ENC);
   this unlocks it with the passphrase (once per device, then remembers the key) and starts the app. */
(function () {
  'use strict';
  const start = () => { document.body.classList.remove('locked'); window.__startApp(); };
  if (window.TRIP) return start();

  const E = window.TRIP_ENC;
  const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const b64e = buf => { let s = ''; new Uint8Array(buf).forEach(b => { s += String.fromCharCode(b); }); return btoa(s); };
  const KEY = 'elnino:key';

  async function decryptWith(key) {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(E.iv) }, key, b64d(E.ct));
    window.TRIP = JSON.parse(new TextDecoder().decode(pt));
  }
  async function deriveKey(pass) {
    const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pass.trim().toLowerCase()), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64d(E.salt), iterations: E.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
  }
  async function tryStored() {
    try {
      const raw = localStorage.getItem(KEY); if (!raw) return false;
      await decryptWith(await crypto.subtle.importKey('raw', b64d(raw), 'AES-GCM', false, ['decrypt']));
      return true;
    } catch (e) { return false; }
  }

  function lock() {
    document.body.classList.add('locked');
    document.getElementById('view').innerHTML = `
      <section class="lockscreen">
        <img src="img/kicker.jpg" alt="">
        <form class="inner" id="unlock" autocomplete="off">
          <div class="issue">Issue Nº 01 · Oct–Nov 2026</div>
          <div class="logo">El Niño</div>
          <div class="tag">Galápagos by liveaboard</div>
          <div class="bottom">
            <label for="pass">Enter your trip passphrase</label>
            <div class="field"><input id="pass" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="Passphrase">
            <button type="submit">Unlock</button></div>
            <p class="msg" id="msg">You only need to do this once on each phone.</p>
          </div>
        </form>
      </section>`;
    const form = document.getElementById('unlock'), input = document.getElementById('pass'), msg = document.getElementById('msg');
    form.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (!input.value) return;
      msg.textContent = 'Unlocking…';
      try {
        const key = await deriveKey(input.value);
        await decryptWith(key);
        try { localStorage.setItem(KEY, b64e(await crypto.subtle.exportKey('raw', key))); } catch (e) {}
        start();
      } catch (e) {
        msg.textContent = 'That’s not it. Try again.';
        form.classList.remove('shake'); void form.offsetWidth; form.classList.add('shake');
        input.select();
      }
    });
  }

  if (!window.crypto || !crypto.subtle) {
    document.getElementById('view').innerHTML = '<p style="padding:40px 24px">This page needs to be opened over https.</p>';
    return;
  }
  tryStored().then(ok => ok ? start() : lock());
})();
