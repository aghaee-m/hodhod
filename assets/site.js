// «هدهد» website: menu, release times in the visitor's own time zone, episode status, the listen buttons, the player,
// share. No tracking, no cookies, no storage, no network requests of its own.
(() => {
  const T = window.HUDHUD_TEXT || {};
  const fa = s => String(s).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);
  // the build keeps a number with its word (no-break spaces); text written here does the same
  const keep = s => String(s).replace(/([۰-۹]) (?=\S)/g, '$1 ').replace(/(\S) (?=[۰-۹])/g, '$1 ');
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // menu (phones): opens over the page with a scrim; closes on the button, a link, a tap outside it, or Escape
  const btn = document.querySelector('.menu-btn'), nav = document.getElementById('nav');
  if (btn && nav) {
    const label = btn.querySelector('.menu-label');
    const set = open => {
      nav.classList.toggle('open', open);
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.classList.toggle('menu-open', open);
      if (label) label.textContent = open ? (T.close || '') : (T.menu || '');
    };
    btn.addEventListener('click', () => set(!nav.classList.contains('open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('click', e => {
      if (nav.classList.contains('open') && !nav.contains(e.target) && !btn.contains(e.target)) set(false);
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && nav.classList.contains('open')) { set(false); btn.focus(); }
    });
    // keyboard focus leaving the open menu closes it, so focus never lands on a link hidden behind it (WCAG 2.4.11);
    // a tap has no relatedTarget, and the click handler above covers it
    const leave = e => {
      if (nav.classList.contains('open') && e.relatedTarget && !nav.contains(e.relatedTarget) && !btn.contains(e.relatedTarget)) set(false);
    };
    nav.addEventListener('focusout', leave);
    btn.addEventListener('focusout', leave);
    // addListener: Safari 13 and older (iOS 12 and 13) have no addEventListener on a MediaQueryList
    const wide = matchMedia('(min-width: 980px)'), onWide = m => { if (m.matches) set(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide); else if (wide.addListener) wide.addListener(onWide);
  }
  // the products menu, once the brand has several products (on a phone it is a plain group inside the menu)
  $$('.nav-group').forEach(group => {
    const b = group.querySelector('.nav-group-btn');
    if (!b) return;
    const set = open => { group.classList.toggle('open', open); b.setAttribute('aria-expanded', open ? 'true' : 'false'); };
    b.addEventListener('click', () => set(!group.classList.contains('open')));
    document.addEventListener('click', e => { if (!group.contains(e.target)) set(false); });
    group.addEventListener('keydown', e => { if (e.key === 'Escape' && group.classList.contains('open')) { set(false); b.focus(); } });
    group.addEventListener('focusout', e => { if (!group.contains(e.relatedTarget)) set(false); });
  });

  // release times and status
  const now = Date.now();
  const zone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();
  const inTehran = zone === 'Asia/Tehran';
  const dayFmt = new Intl.DateTimeFormat('fa-IR', { weekday: 'long' });
  // the zone's name or offset is shown with the time, so a browser that has the offset wrong cannot pass unnoticed
  const timeFmt = new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZoneName: 'short' });
  const tehranDay = t => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tehran' }).format(t);
  $$('[data-local]').forEach(el => {
    const t = new Date(el.dataset.local);
    // no line when the browser does not know its time zone: its offset may then be wrong (Windows zones ICU lacks)
    if (inTehran || !zone || isNaN(t)) return;
    el.textContent = keep((T.local || '').replace('{day}', dayFmt.format(t)).replace('{time}', timeFmt.format(t)));
    el.hidden = false;
  });
  // «منتشر شد» (and a gold knot) only for an episode the build knows is out (data-ready) once its time has come;
  // without it, a time that has passed still reads «به‌زودی»
  $$('[data-status]').forEach(el => {
    const t = new Date(el.dataset.status);
    if (isNaN(t)) return;
    let state = 'soon';
    if (t.getTime() <= now) state = el.hasAttribute('data-ready') ? 'out' : 'soon';
    else if (tehranDay(t) === tehranDay(new Date(now))) state = 'today';
    el.dataset.state = state;
    el.textContent = T[state] || '';
  });
  $$('[data-knot]').forEach(el => { if (el.hasAttribute('data-ready') && new Date(el.dataset.knot).getTime() <= now) el.classList.add('done'); });
  // the waiting line of an episode whose MP3 is not in this build yet: after its time, «soon» instead of a past date
  $$('[data-late]').forEach(el => { const t = new Date(el.dataset.at).getTime(); if (!isNaN(t) && t <= now) el.textContent = keep(el.dataset.late); });
  $$('[data-countdown]').forEach(el => {
    const t = new Date(el.dataset.countdown).getTime();
    const tick = () => {
      const left = t - Date.now();
      if (left <= 0 || left > 2 * 864e5) { el.hidden = true; return; }
      const h = Math.floor(left / 36e5), m = Math.floor(left % 36e5 / 6e4);
      el.textContent = keep((T.countdown || '').replace('{left}', (h ? fa(h) + ' ساعت و ' : '') + fa(m) + ' دقیقه'));
      el.hidden = false;
    };
    tick(); setInterval(tick, 30000);
  });
  // a listen button of an episode the build has the MP3 of: «صفحه‌ی قسمت N» until its hour, then «قسمت N را گوش کنید»
  // to the player (also on a page left open across the hour)
  $$('[data-listen]').forEach(a => {
    const t = new Date(a.dataset.listen).getTime();
    if (isNaN(t)) return;
    const go = () => {
      a.setAttribute('href', a.dataset.href);
      const s = a.querySelector('span'); if (s) s.textContent = keep(a.dataset.text);
      const i = a.querySelector('svg'); if (i) i.hidden = false;
    };
    if (t <= Date.now()) go(); else if (t - Date.now() < 2 * 864e5) setTimeout(go, t - Date.now() + 1000);
  });

  // player: progressive enhancement of a native <audio>
  const clock = s => { if (!isFinite(s)) return '--:--'; s = Math.floor(s); return fa(Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0')); };
  $$('[data-player]').forEach(box => {
    const audio = box.querySelector('audio'), ui = box.querySelector('.player-ui');
    if (!audio || !ui) return;
    audio.controls = false; audio.hidden = true;
    // the player opens at the release time; before it, the waiting line (pushed early, the episode still starts at its hour)
    const gate = box.querySelector('.player-gate'), from = new Date(box.dataset.from).getTime();
    const open = () => { ui.hidden = false; if (gate) gate.hidden = true; };
    if (!isNaN(from) && from > Date.now()) {
      if (gate) gate.hidden = false;
      if (from - Date.now() < 2 * 864e5) setTimeout(open, from - Date.now() + 1000);
    } else open();
    const play = ui.querySelector('[data-play]'), seek = ui.querySelector('[data-seek]'),
          cur = ui.querySelector('[data-cur]'), dur = ui.querySelector('[data-dur]'), speed = ui.querySelector('[data-speed]'),
          rate = ui.querySelector('[data-rate]');
    const rates = [1, 1.25, 1.5, 0.75]; let ri = 0;
    play.addEventListener('click', () => { audio.paused ? audio.play() : audio.pause(); });
    audio.addEventListener('play', () => { box.classList.add('playing'); play.setAttribute('aria-label', T.pause || ''); });
    audio.addEventListener('pause', () => { box.classList.remove('playing'); play.setAttribute('aria-label', T.play || ''); });
    audio.addEventListener('loadedmetadata', () => { dur.textContent = clock(audio.duration); });
    audio.addEventListener('timeupdate', () => {
      cur.textContent = clock(audio.currentTime);
      if (audio.duration) { seek.value = (audio.currentTime / audio.duration * 100).toFixed(1); seek.setAttribute('aria-valuetext', clock(audio.currentTime)); }
    });
    seek.addEventListener('input', () => { if (audio.duration) audio.currentTime = seek.value / 100 * audio.duration; });
    // the visible rate is the button's name, so a screen reader hears the new one
    speed.addEventListener('click', () => { ri = (ri + 1) % rates.length; audio.playbackRate = rates[ri]; (rate || speed).textContent = fa(String(rates[ri])).replace('.', '٫') + '×'; });
  });

  // share: the system share sheet, or copy the address (the confirmation is announced)
  $$('[data-share]').forEach(b => {
    b.hidden = false;
    const s = b.querySelector('span');
    if (s) s.setAttribute('aria-live', 'polite');
    b.addEventListener('click', async () => {
      const data = { title: document.title, url: location.href };
      try {
        if (navigator.share) { await navigator.share(data); return; }
        await navigator.clipboard.writeText(location.href);
        if (s) s.textContent = T.copied || '';
      } catch (e) { /* the visitor closed the share sheet */ }
    });
  });

  // screenshot helper for the build's own checks (build.py --shots): #measure writes the page height, #y=N scrolls
  const h = location.hash;
  if (h === '#measure') window.addEventListener('load', () => { document.documentElement.dataset.h = document.documentElement.scrollHeight; });
  const y = /^#y=(\d+)$/.exec(h);
  if (y) window.addEventListener('load', () => window.scrollTo({ top: +y[1], behavior: 'instant' }));
})();
