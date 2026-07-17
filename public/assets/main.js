(() => {
  'use strict';

  const CONFIG = {
    accentColor: '#3B82F6',
    rotateMs: 2200
  };

  const state = { i: 0, typed: '', phase: 'typing', activeId: '' };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const headerEl = document.getElementById('ew-header');
  const heroEl = document.getElementById('ew-hero');
  const webEl = document.getElementById('ew-web');
  const typedEl = document.getElementById('ew-typed');
  const titleEl = document.getElementById('ew-title');
  const groupEl = document.getElementById('ew-group');
  const navLinks = Array.from(document.querySelectorAll('.ew-navlink'));
  const formEl = document.getElementById('ew-form');
  const sentEl = document.getElementById('ew-sent');
  const againBtn = document.getElementById('ew-again');

  function accentRGB() {
    let hex = CONFIG.accentColor.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const n = parseInt(hex, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  // ---- i18n ----
  // All strings are baked into the page server-side; the only language-
  // dependent thing left in JS is the typing rotator's word list.
  const words = JSON.parse((typedEl && typedEl.dataset.words) || '[]');

  // ---- typing rotator ----
  let typeTimer;

  function renderTyped() {
    typedEl.textContent = state.typed;
    flipAll();
  }

  function startTyping() {
    clearTimeout(typeTimer);
    // Wait two full cursor-blink cycles (2.2s) before the first keystroke.
    typeTimer = setTimeout(tick, 2200);
  }

  function tick() {
    const full = words[state.i] || '';
    let delay;
    if (state.phase === 'deleting') {
      if (state.typed.length === 0) {
        state.phase = 'typing';
        state.i = (state.i + 1) % words.length;
        delay = 260;
      } else {
        state.typed = state.typed.slice(0, -1);
        delay = 42 + Math.random() * 34;
      }
    } else {
      if (state.typed.length >= full.length) {
        state.phase = 'deleting';
        delay = CONFIG.rotateMs;
      } else {
        state.typed = full.slice(0, state.typed.length + 1);
        delay = 110 + Math.random() * 95;
      }
    }
    renderTyped();
    typeTimer = setTimeout(tick, delay);
  }

  // ---- FLIP animation: title/group glide when the hero line reflows ----
  const flipPos = {};

  // Webfont swap moves the hero after the initial baseline capture; forget
  // stale positions so the first keystroke doesn't animate the font delta.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { delete flipPos.title; delete flipPos.group; });
  }

  function flipAll() {
    flipEl(groupEl, 'group');
    flipEl(titleEl, 'title');
  }

  function flipEl(el, key) {
    if (!el) return;
    const now = { top: el.offsetTop, left: el.offsetLeft };
    const last = flipPos[key];
    flipPos[key] = now;
    if (!last) return;
    const dx = last.left - now.left;
    const dy = last.top - now.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.style.transition = 'none';
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    el.getBoundingClientRect();
    requestAnimationFrame(() => {
      el.style.transition = 'transform .5s cubic-bezier(.2,.75,.2,1)';
      el.style.transform = 'translate(0, 0)';
    });
  }

  // ---- header theme + active nav ----
  function updateHeader() {
    const probeY = headerEl.getBoundingClientRect().bottom * 0.5 || 30;
    let theme = 'dark';
    document.querySelectorAll('[data-theme]').forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top <= probeY && r.bottom > probeY) theme = s.getAttribute('data-theme') || 'dark';
    });
    const aProbe = (headerEl.getBoundingClientRect().bottom || 60) + 40;
    let active = '';
    document.querySelectorAll('section[id]').forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.top <= aProbe && r.bottom > aProbe) active = s.id;
    });
    headerEl.style.background = theme === 'light' ? '#f6f5f2' : '#050505';
    headerEl.style.color = theme === 'light' ? '#0a0a0a' : '#fff';
    if (active !== state.activeId) {
      state.activeId = active;
      navLinks.forEach(a => {
        const isActive = a.dataset.nav === active;
        a.style.color = isActive ? CONFIG.accentColor : 'inherit';
        a.style.opacity = isActive ? '1' : '.62';
      });
    }
  }

  // ---- drifting/breathing glows ----
  function startGlows() {
    const glows = Array.from(document.querySelectorAll('[data-glow]'));
    if (!glows.length || reduceMotion) return;
    glows.forEach((g, i) => {
      g.style.willChange = 'transform';
      g._cfg = {
        breatheOnly: g.hasAttribute('data-breathe-only'),
        base: g.getAttribute('data-base') || 'none',
        phase: i * 1.7,
        bSpeed: 0.95 + i * 0.12,
        bAmp: 0.22 + (i % 2) * 0.06,
        driftX: 34 + (i % 3) * 14,
        driftY: 28 + (i % 2) * 16,
        dSpeed: 0.28 + i * 0.05,
        parallax: g.hasAttribute('data-parallax') ? parseFloat(g.getAttribute('data-parallax')) : 0.34 + (i % 2) * 0.10
      };
    });
    const glowTick = (now) => {
      const t = now / 1000;
      const vh = window.innerHeight || 800;
      for (const g of glows) {
        const c = g._cfg;
        if (c.breatheOnly) {
          const s = 1 + Math.sin(t * c.bSpeed + c.phase) * c.bAmp;
          const b = c.base === 'none' ? '' : c.base + ' ';
          g.style.transform = `${b}scale(${s.toFixed(4)})`;
          continue;
        }
        const r = g.getBoundingClientRect();
        const p = Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / vh));
        const scrollDX = p * vh * c.parallax * 0.5;
        const scrollDY = p * vh * c.parallax;
        const dx = Math.sin(t * c.dSpeed + c.phase) * c.driftX + scrollDX;
        const dy = Math.cos(t * c.dSpeed * 0.8 + c.phase) * c.driftY + scrollDY;
        const scale = 1 + Math.sin(t * c.bSpeed + c.phase) * c.bAmp;
        const base = c.base === 'none' ? '' : c.base + ' ';
        g.style.transform = `${base}translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) scale(${scale.toFixed(4)})`;
      }
      requestAnimationFrame(glowTick);
    };
    requestAnimationFrame(glowTick);
  }

  // ---- hero pointer web canvas ----
  function startWeb() {
    if (!webEl || !heroEl || reduceMotion) return;
    const ctx = webEl.getContext('2d');
    const dots = new Map();
    const pointer = { x: 0, y: 0, active: false };
    let lastMove = performance.now();
    let lastT = performance.now();
    let growth = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      webEl.width = Math.round(heroEl.clientWidth * dpr);
      webEl.height = Math.round(heroEl.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    if (window.ResizeObserver) new ResizeObserver(resize).observe(heroEl);

    window.addEventListener('mousemove', (e) => {
      const r = heroEl.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      const inside = x >= 0 && y >= 0 && x <= r.width && y <= r.height;
      if (inside) {
        if (Math.hypot(x - pointer.x, y - pointer.y) > 2.5) lastMove = performance.now();
        pointer.x = x; pointer.y = y; pointer.active = true;
      } else pointer.active = false;
    }, { passive: true });
    window.addEventListener('mouseout', () => { pointer.active = false; }, { passive: true });

    const webTick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastT) / 1000);
      lastT = now;
      const w = heroEl.clientWidth, h = heroEl.clientHeight;
      ctx.clearRect(0, 0, w, h);
      const [r, g, b] = accentRGB();
      const moving = (now - lastMove) < 90;
      const target = pointer.active ? (moving ? 0.06 : 1) : 0;
      const k = target > growth ? 0.85 : (pointer.active ? 0.9 : 2.2);
      growth += (target - growth) * Math.min(1, dt * k);
      const R = 66 + growth * 270;
      const GS = 28, OFF = 14;
      if (pointer.active) {
        const { x, y } = pointer;
        const i0 = Math.floor((x - R - OFF) / GS), i1 = Math.ceil((x + R - OFF) / GS);
        const j0 = Math.floor((y - R - OFF) / GS), j1 = Math.ceil((y + R - OFF) / GS);
        for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
          const dx = OFF + GS * i, dy = OFF + GS * j;
          if (dx < 0 || dy < 0 || dx > w || dy > h) continue;
          const dist = Math.hypot(dx - x, dy - y);
          if (dist > R) continue;
          const key = i + ',' + j;
          let d = dots.get(key);
          if (!d) { d = { x: dx, y: dy, s: 0, ex: x, ey: y, p: 0 }; dots.set(key, d); }
          const p = 1 - dist / R;
          d.s = Math.max(d.s, Math.min(1, d.s + dt * 3.2 * p, p));
          d.ex = x; d.ey = y; d.p = p; d._live = true;
        }
      }
      ctx.lineWidth = 1;
      for (const [key, d] of dots) {
        const isLive = d._live;
        d._live = false;
        if (!isLive) d.s -= dt * 0.85;
        if (d.s <= 0.012) { dots.delete(key); continue; }
        const prox = 0.4 + 0.6 * (d.p || 0.4);
        const a = d.s * prox * (isLive ? (0.055 + 0.15 * growth) : 0.03);
        ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
        ctx.beginPath(); ctx.moveTo(d.ex, d.ey); ctx.lineTo(d.x, d.y); ctx.stroke();
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(0.75, a * 1.6)})`;
        ctx.beginPath(); ctx.arc(d.x, d.y, isLive ? 1.8 : 1.3, 0, 6.2832); ctx.fill();
      }
      if (pointer.active) {
        const ca = 0.22 + 0.5 * growth;
        ctx.fillStyle = `rgba(${r},${g},${b},${ca})`;
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 2.4, 0, 6.2832); ctx.fill();
        ctx.strokeStyle = `rgba(${r},${g},${b},${ca * 0.4})`;
        ctx.beginPath(); ctx.arc(pointer.x, pointer.y, 7 + growth * 6, 0, 6.2832); ctx.stroke();
      }
      requestAnimationFrame(webTick);
    };
    requestAnimationFrame(webTick);
  }

  // ---- contact form ----
  formEl.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = formEl.querySelector('button[type="submit"]');
    const errEl = document.getElementById('ew-form-err');
    errEl.style.display = 'none';
    btn.disabled = true;
    btn.style.opacity = '.6';
    const fd = new FormData(formEl);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          company: fd.get('company') || null,
          message: fd.get('message'),
          website: fd.get('website') || ''
        })
      });
      if (!res.ok) throw new Error('send failed: ' + res.status);
      formEl.reset();
      formEl.style.display = 'none';
      sentEl.style.display = 'block';
    } catch {
      errEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.style.opacity = '';
    }
  });
  againBtn.addEventListener('click', () => {
    sentEl.style.display = 'none';
    formEl.style.display = 'grid';
  });

  // Re-derive the years-of-experience count from the visitor's clock so the
  // statically rendered number self-increments on Jan 1 without a rebuild.
  function updateYears() {
    const now = new Date().getFullYear();
    document.querySelectorAll('.ew-years').forEach(el => {
      const since = parseInt(el.getAttribute('data-since'), 10);
      if (since) el.textContent = String(now - since);
    });
  }

  // ---- init ----
  updateYears();
  document.addEventListener('scroll', updateHeader, true);
  window.addEventListener('resize', updateHeader, { passive: true });

  // Language is fixed per page: / is Dutch, /en/ is English (static, crawlable,
  // rendered server-side from content/copy.json). The NL/EN toggle is a link.
  renderTyped();
  startTyping();
  updateHeader();
  startGlows();
  startWeb();
})();