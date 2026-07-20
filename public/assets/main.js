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
  const typedEl = document.getElementById('ew-typed');
  const titleEl = document.getElementById('ew-title');
  const groupEl = document.getElementById('ew-group');
  const navLinks = Array.from(document.querySelectorAll('.ew-navlink'));
  const formEl = document.getElementById('ew-form');
  const sentEl = document.getElementById('ew-sent');
  const againBtn = document.getElementById('ew-again');

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

  // ---- hero galaxy (Spline) ----
  // Replaces the old pointer canvas with an interactive 3D galaxy, but only on
  // capable viewports: reduced-motion and phones keep the dot-grid fallback and
  // never download the ~2 MB WebGL runtime. The viewer bundle is self-hosted in
  // assets/spline/ (no third-party CDN at page load).
  function startSpline() {
    const viewer = document.getElementById('ew-spline');
    if (!viewer || !heroEl || reduceMotion) return;
    if (!window.matchMedia('(min-width: 861px)').matches) return; // phones keep the dot grid

    // main.js and the viewer bundle share the assets/ dir; derive the URL from
    // this script's own src so it resolves for both / and /en/. Find it by id
    // (robust to the ?v= cache-bust query and the minified main.min.js name;
    // an endsWith("main.js") match breaks on both).
    const self = document.getElementById('ew-main')
      || document.querySelector('script[src*="main.min.js"], script[src*="main.js"]');
    const src = new URL('spline/spline-viewer.js', self ? self.src : location.href).href;

    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      heroEl.classList.add('ew-spline-active'); // fades in the galaxy, hides the dot grid
    };
    // The scene renders at its native resolution (no up-scaling — that blurs it).
    // Note: the "Built with Spline" badge is baked into the WebGL render, not the
    // DOM, so it can't be removed here — that needs a paid Spline plan.

    const script = document.createElement('script');
    script.type = 'module';
    script.src = src;
    script.onload = () => {
      // Reveal once the scene is ready. Listen for both the public and runtime
      // events; as a backstop, reveal after 6 s only if a canvas actually
      // rendered, so a failed load leaves the dot-grid fallback in place.
      viewer.addEventListener('load', reveal);
      viewer.addEventListener('load-complete', reveal);
      setTimeout(() => {
        if (viewer.shadowRoot && viewer.shadowRoot.querySelector('canvas')) reveal();
      }, 6000);
    };
    document.head.appendChild(script);
  }

  // ---- starfield ----
  // Faint, sparse stars painted over each black host (.ew-stars canvas): the
  // diensten and over-ons sections each have their own, and the contact section +
  // footer share one continuous field via the .ew-starfield wrapper. The whole
  // field parallaxes vertically with scroll — bigger/nearer stars drift faster —
  // and a handful of stars per field slowly orbit the field's centre, like a
  // galaxy's coherent rotation. Only fields near the viewport redraw. Skipped
  // entirely under prefers-reduced-motion.
  function startStarfields() {
    if (reduceMotion) return;
    const PARALLAX = 0.12; // scroll offset → star drift, before the per-star depth factor
    const pickColor = () => {
      const r = Math.random(); // white → light-blue → blue → purple → magenta
      return r < 0.42 ? '214,226,255' : r < 0.66 ? '147,197,253'
           : r < 0.82 ? '96,165,250' : r < 0.93 ? '168,85,247' : '232,121,249';
    };
    const wrap = (v, h) => ((v % h) + h) % h; // keep parallaxed stars inside the frame

    const fields = [];
    document.querySelectorAll('canvas.ew-stars').forEach((cv) => {
      const host = cv.parentElement;
      if (!host) return;
      const f = { cv, host, ctx: cv.getContext('2d'), w: 0, h: 0, stars: [] };
      f.init = () => {
        const dpr = window.devicePixelRatio || 1;
        f.w = host.clientWidth; f.h = host.clientHeight;
        if (!f.w || !f.h) return;
        cv.width = Math.round(f.w * dpr); cv.height = Math.round(f.h * dpr);
        f.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const n = Math.round(f.w * f.h / 2000);
        f.stars = [];
        for (let i = 0; i < n; i++) {
          const r = Math.random() < 0.9 ? 0.3 + Math.random() * 0.4 : 0.7 + Math.random() * 0.35;
          f.stars.push({
            x: Math.random() * f.w, y: Math.random() * f.h, r,
            a: 0.12 + Math.random() * 0.5, c: pickColor(),
            // Depth: nearer (bigger) stars drift faster on scroll, so it reads as
            // motion through 3D space, not a flat slide.
            m: 0.3 + (r - 0.3) * 1.7, mover: false
          });
        }
        // Promote just a few stars to slow orbiters about the field centre. A flat
        // rotation curve (angular speed ∝ 1/radius) keeps every orbiter's pace
        // gentle regardless of how far out it sits — a coherent galactic swirl.
        const cx = f.w / 2, cy = f.h / 2, R = Math.min(f.w, f.h);
        const nMove = Math.min(24, Math.max(8, Math.round(f.w * f.h / 100000)));
        for (let i = 0; i < nMove && i < f.stars.length; i++) {
          const s = f.stars[i];
          s.mover = true; s.cx = cx; s.cy = cy;
          s.rad = R * (0.12 + Math.random() * 0.32);
          s.ang = Math.random() * 6.2832;
          s.spd = (5 + Math.random() * 4) / s.rad; // rad/s, all same direction
          s.a = Math.min(0.9, s.a + 0.2);          // a touch brighter so the drift reads
        }
      };
      f.init();
      fields.push(f);
    });
    if (!fields.length) return;

    // One rAF loop drives both the scroll parallax and the orbiters. Off-screen
    // fields are skipped (no draw, orbiters effectively pause), so cost stays tied
    // to whatever black section is actually on screen.
    let last = 0;
    const frame = (ts) => {
      const dt = last ? Math.min(0.1, (ts - last) / 1000) : 0; // clamp tab-switch jumps
      last = ts;
      for (const f of fields) {
        if (!f.h) continue;
        const rect = f.host.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) continue; // off-screen: skip
        const pv = -rect.top * PARALLAX; // 0 as the field top meets the viewport top
        const ctx = f.ctx;
        ctx.clearRect(0, 0, f.w, f.h);
        for (const s of f.stars) {
          let x = s.x, y = s.y;
          if (s.mover) {
            s.ang += s.spd * dt;
            x = s.cx + Math.cos(s.ang) * s.rad;
            y = s.cy + Math.sin(s.ang) * s.rad;
          }
          ctx.fillStyle = `rgba(${s.c},${s.a})`;
          ctx.beginPath();
          ctx.arc(x, wrap(y + pv * s.m, f.h), s.r, 0, 6.2832);
          ctx.fill();
        }
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    window.addEventListener('resize', () => { fields.forEach(f => f.init()); }, { passive: true });
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

  // ---- werkwijze: scroll-driven timeline fill ----
  // The blue line grows on scroll and each dot colours the instant the line
  // tip reaches it. Width is computed in px from the real track width so the
  // line tip and the dot thresholds coincide exactly.
  function startTimeline() {
    const track = document.querySelector('.wp-track');
    if (!track) return;
    const fillEl = track.querySelector('.wp-line-fill');
    const nodes = Array.from(track.querySelectorAll('.wp-node'));
    const fullWidth = () => {
      const colw = (track.clientWidth - 140) / 6; // 140 = 5 gaps × 28px
      return 5 * (colw + 28);                      // ends on the last dot
    };
    if (reduceMotion) {
      // Respect the reduced-motion policy: show the completed line at once.
      fillEl.style.width = fullWidth().toFixed(1) + 'px';
      nodes.forEach(n => n.classList.add('on'));
      track.classList.add('done');
      return;
    }
    function update() {
      const vh = window.innerHeight || 800;
      const r = track.getBoundingClientRect();
      // progress 0..1: starts when the track reaches ~82% viewport height,
      // fills over 55vh.
      const p = Math.max(0, Math.min(1, (vh * 0.82 - r.top) / (vh * 0.55)));
      fillEl.style.width = (p * fullWidth()).toFixed(1) + 'px';
      nodes.forEach((n, i) => n.classList.toggle('on', p >= i / 5 - 0.001));
      track.classList.toggle('done', p >= 0.995);
    }
    document.addEventListener('scroll', update, true);
    window.addEventListener('resize', update, { passive: true });
    update();
  }

  // ---- faq accordion ----
  // One item open at a time; clicking the open item closes it (all-closed is
  // allowed). The first item starts open (server-rendered).
  function startFaq() {
    document.querySelectorAll('.faq-acc .faq-q').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const wasOpen = item.classList.contains('open');
        item.closest('.faq-acc').querySelectorAll('.faq-item.open').forEach(o => {
          o.classList.remove('open');
          o.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) { item.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  // ---- smooth wheel scroll ----
  // Native mouse-wheel scrolling steps one notch (~100px) per event, so anything
  // driven by scroll position (the starfield/glow parallax) jumps instead of
  // gliding; trackpads already stream small deltas and feel smooth. We intercept
  // wheel input and animate window scroll toward an accumulated target with an
  // exponential ease, so every peripheral scrolls smoothly. Keyboard, scrollbar
  // drag and touch stay native (no wheel event); anchor links keep CSS
  // scroll-behavior:smooth because our per-frame writes use behavior:'instant'.
  function startSmoothScroll() {
    if (reduceMotion) return;
    const RATE = 12;         // ease rate (1/s): higher = snappier, lower = longer glide
    const LINE = 40;         // px per wheel "line" (deltaMode 1)
    const doc = document.documentElement;
    const maxY = () => doc.scrollHeight - window.innerHeight;
    let target = window.scrollY;
    let current = window.scrollY;
    let running = false;
    let last = 0;

    const step = (ts) => {
      if (!running) return;
      const dt = last ? Math.min(0.05, (ts - last) / 1000) : 0.016;
      last = ts;
      const diff = target - current;
      if (Math.abs(diff) < 0.5) {
        current = target;
        window.scrollTo({ top: current, behavior: 'instant' });
        running = false; last = 0;
        return;
      }
      current += diff * (1 - Math.exp(-dt * RATE));
      window.scrollTo({ top: current, behavior: 'instant' });
      requestAnimationFrame(step);
    };

    // Walk up from the wheel target: if an ancestor (or a textarea) can still
    // scroll in the wheel's direction, let the browser handle it natively and
    // don't hijack the page.
    const innerScrollable = (el, dir) => {
      while (el && el !== doc && el !== document.body) {
        // Cheap overflow test first; only resolve styles for elements that
        // actually overflow, so the common (non-scrolling) ancestor chain
        // costs no getComputedStyle on this per-wheel hot path.
        if (el.scrollHeight > el.clientHeight + 1) {
          const canScroll = el.tagName === 'TEXTAREA' ||
            /(auto|scroll)/.test(getComputedStyle(el).overflowY);
          if (canScroll) {
            const atTop = el.scrollTop <= 0;
            const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
            if (!((dir < 0 && atTop) || (dir > 0 && atBottom))) return true;
          }
        }
        el = el.parentElement;
      }
      return false;
    };

    window.addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;                                   // pinch-zoom
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;     // horizontal intent
      if (!e.deltaY) return;
      if (innerScrollable(e.target, e.deltaY)) return;         // let inner areas scroll
      e.preventDefault();
      if (!running) { current = target = window.scrollY; }     // re-seed from live position
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= LINE;                        // lines → px
      else if (e.deltaMode === 2) d *= window.innerHeight;     // pages → px
      target = Math.max(0, Math.min(maxY(), target + d));
      if (!running) { running = true; requestAnimationFrame(step); }
    }, { passive: false });

    // When scroll moves by any non-wheel means while we're idle (scrollbar,
    // keyboard, anchor click), resync so the next wheel starts from there.
    window.addEventListener('scroll', () => {
      if (!running) { current = target = window.scrollY; }
    }, { passive: true });

    // Anchor click → release control so CSS scroll-behavior:smooth runs cleanly.
    document.addEventListener('click', (e) => {
      const a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a) { running = false; last = 0; }
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
  startSpline();
  startStarfields();
  startTimeline();
  startFaq();
  startSmoothScroll();
})();