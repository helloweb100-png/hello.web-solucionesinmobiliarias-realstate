/* ==========================================================================
   SOLUCIONES INMOBILIARIAS REAL ESTATE  ·  app.js
   JavaScript puro. Lenis (scroll suave) es opcional: si el CDN no carga,
   el sitio sigue funcionando con el scroll nativo.
   Arquitectura: un único ciclo requestAnimationFrame ejecuta todas las
   "tareas" de scroll (cada módulo mide una vez y solo lee window.scrollY),
   y IntersectionObserver activa/desactiva lo que no está en pantalla.
   Índice
     01 Utilidades            08 Hero (partículas, stage, tilt)   15 Zonas / mapa
     02 Motor de scroll       09 Strip (marquee)                  16 Proceso
     03 Loader                10 Expand                           17 Números y parallax
     04 Texto dividido        11 Manifiesto                       18 FAQ
     05 Reveal y contadores   12 Tabs de propiedades              19 Formulario a WhatsApp
     06 Header y menú         13 Galerías y lightbox              20 Footer, WhatsApp, arranque
     07 Anclas                14 Acordeón, bento, magnéticos
   ========================================================================== */
(() => {
  'use strict';

  /* 01 · UTILIDADES ------------------------------------------------------- */
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const map = (v, a, b, c, d) => c + (d - c) * clamp((v - a) / (b - a));
  const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const nf = new Intl.NumberFormat('es-MX');
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const WA_PHONE = '529984747876';
  const waLink = (text) => `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(text)}`;

  /** Observa un elemento y mantiene `state.on` según esté (casi) en pantalla. */
  function watch(el, margin = '120px') {
    const state = { on: false };
    if (!el) return state;
    new IntersectionObserver((es) => { state.on = es[es.length - 1].isIntersecting; }, { rootMargin: `${margin} 0px` }).observe(el);
    return state;
  }

  /* 02 · MOTOR DE SCROLL -------------------------------------------------- */
  const S = { y: 0, vy: 0, dir: 1, vh: innerHeight, vw: innerWidth, docH: 0 };
  const tasks = [];
  const measures = [];
  let lenis = null;

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  function initScroll() {
    if (window.Lenis && !REDUCED) {
      lenis = new window.Lenis({
        duration: 1.3,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 0.9,
        touchMultiplier: 1.15,
      });
      lenis.stop(); // bloqueado hasta que termine el loader
    } else {
      root.style.overflow = 'hidden';
    }
    const frame = (t) => {
      if (lenis) lenis.raf(t);
      const y = window.scrollY;
      S.vy = y - S.y;
      if (S.vy) S.dir = S.vy > 0 ? 1 : -1;
      S.y = y;
      for (let i = 0; i < tasks.length; i++) tasks[i](S, t);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);

    const remeasure = () => { S.vw = innerWidth; S.vh = innerHeight; S.docH = root.scrollHeight; measures.forEach((m) => m()); };
    const remeasureSoon = debounce(remeasure, 140);
    addEventListener('resize', remeasureSoon);
    addEventListener('load', remeasureSoon);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(remeasureSoon);
    if ('ResizeObserver' in window) new ResizeObserver(remeasureSoon).observe(document.body);
    remeasure();
  }
  const stopScroll = () => { if (lenis) lenis.stop(); else root.style.overflow = 'hidden'; };
  const startScroll = () => { if (lenis) lenis.start(); else root.style.overflow = ''; };

  function scrollToEl(el, extra = 0) {
    let offset = extra;
    if (el.classList.contains('prop')) { const tabs = $('[data-ptabs]'); offset -= (tabs ? tabs.offsetHeight : 56) + 6; }
    if (lenis) lenis.scrollTo(el, { offset, duration: 1.7, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + offset, behavior: REDUCED ? 'auto' : 'smooth' });
  }

  /* 03 · LOADER ----------------------------------------------------------- */
  function runLoader() {
    const loader = $('#loader');
    const pctEl = $('[data-loader-pct]');
    const barEl = $('[data-loader-bar]');
    const statusEl = $('[data-loader-status]');
    const MIN = REDUCED ? 450 : 2400;
    const t0 = performance.now();
    let ready = false, shown = 0, done = false;

    const waitImg = (img) => new Promise((res) => {
      if (img.complete && img.naturalWidth) return res();
      img.addEventListener('load', res, { once: true });
      img.addEventListener('error', res, { once: true });
    });
    const critical = $$('.frame img, .hdr-brand img, .loader-mark').slice(0, 5).map((i) => (i.decode ? i.decode().catch(() => {}) : waitImg(i)));
    Promise.race([
      Promise.all([document.fonts ? document.fonts.ready : null, ...critical]),
      new Promise((r) => setTimeout(r, 6500)),
    ]).then(() => { ready = true; });

    const phases = [[0, 'Cargando portafolio'], [36, 'Sincronizando zonas'], [70, 'Preparando tu visita'], [97, 'Bienvenido']];
    let phase = -1;

    const tick = (now) => {
      if (done) return;
      const timeP = clamp((now - t0) / MIN);
      const want = Math.min(ready ? 100 : 88, easeOutCubic(timeP) * 100);
      shown += (want - shown) * 0.1;
      if (ready && timeP >= 1 && shown > 99.4) shown = 100;
      const p = Math.round(shown);
      pctEl.textContent = p;
      barEl.style.transform = `scaleX(${shown / 100})`;
      let k = 0; phases.forEach(([from], i) => { if (p >= from) k = i; });
      if (k !== phase) { phase = k; statusEl.textContent = phases[k][1]; }
      if (shown >= 100) return finish();
      requestAnimationFrame(tick);
    };

    function finish() {
      done = true;
      pctEl.textContent = '100';
      barEl.style.transform = 'scaleX(1)';
      setTimeout(() => {
        loader.classList.add('is-done');
        setTimeout(() => {           // el hero entra cuando las cortinas ya se están abriendo
          root.classList.add('is-ready');
          startScroll();
          document.dispatchEvent(new CustomEvent('site:ready'));
          if (location.hash.length > 1) { const t = $(location.hash); if (t) setTimeout(() => scrollToEl(t), 300); }
        }, REDUCED ? 0 : 650);
        setTimeout(() => { loader.hidden = true; }, REDUCED ? 50 : 2000);
      }, REDUCED ? 0 : 380);
    }
    requestAnimationFrame(tick);
  }

  /* 04 · TEXTO DIVIDIDO POR PALABRAS ------------------------------------- */
  function splitWords(el, cls = 'wi') {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            const wi = document.createElement('span'); wi.className = cls; wi.style.setProperty('--i', i++); wi.textContent = part;
            w.appendChild(wi); frag.appendChild(w);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1 && !n.classList.contains('br')) walk(n);
      });
    };
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    walk(el);
    el.classList.add('is-split');
    return i;
  }

  /* 05 · REVEAL Y CONTADORES --------------------------------------------- */
  function initReveals() {
    $$('[data-split]').forEach((el) => {
      splitWords(el);
      const d = parseFloat(el.dataset.splitDelay);
      if (d) el.style.setProperty('--sd', `${d}s`);
    });
    if (REDUCED) return;
    const reveal = (el) => {
      el.classList.add('in');
      if (!el.hasAttribute('data-split')) {
        const d = parseFloat(el.style.getPropertyValue('--d')) || 0;
        // libera la clase al terminar para no interferir con los hover/transition propios del elemento
        setTimeout(() => el.classList.remove('rv', 'rv-l', 'rv-r', 'rv-z', 'in'), (1.5 + d) * 1000);
      }
    };
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    $$('.rv, .rv-l, .rv-r, .rv-z, [data-split]').forEach((el) => {
      if (el.closest('[data-hero]')) return;
      io.observe(el);
    });
    // el hero se revela cuando termina el loader
    document.addEventListener('site:ready', () => {
      $$('[data-hero] [data-split]').forEach((el) => el.classList.add('in'));
    }, { once: true });
  }

  function countUp(el, to, { decimals = 0, dur = 2000, fmt = (n) => nf.format(n) } = {}) {
    if (REDUCED) { el.textContent = fmt(to); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / dur);
      const v = to * easeOutExpo(p);
      el.textContent = fmt(decimals ? +v.toFixed(decimals) : Math.round(v));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function initCounters() {
    const targets = [];
    $$('[data-count]').forEach((el) => {
      const to = parseFloat(el.dataset.count), decimals = parseInt(el.dataset.decimals || '0', 10);
      targets.push({ el, run: () => countUp(el, to, { decimals, fmt: (n) => (decimals ? n.toFixed(decimals) : nf.format(n)) }), init: () => { el.textContent = decimals ? (0).toFixed(decimals) : '0'; } });
    });
    $$('strong[data-price]').forEach((el) => {
      const to = parseInt(el.dataset.price, 10);
      const node = el.firstChild;
      const span = document.createElement('span'); span.className = 'pv'; span.textContent = node.textContent.trim() + ' ';
      el.replaceChild(span, node);
      targets.push({ el, run: () => countUp(span, to, { dur: 2200, fmt: (n) => '$' + nf.format(n) + ' ' }), init: () => { span.textContent = '$0 '; } });
    });
    if (REDUCED) return;
    targets.forEach((t) => t.init());
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (!e.isIntersecting) return; const t = targets.find((x) => x.el === e.target); if (t) t.run(); io.unobserve(e.target); });
    }, { threshold: 0.5 });
    targets.forEach((t) => io.observe(t.el));
  }

  /* 06 · HEADER Y MENÚ ---------------------------------------------------- */
  let menuOpen = false;
  let openMenu = () => {}, closeMenu = () => {};
  function initHeader() {
    const hdr = $('[data-header]');
    const bar = $('[data-progress]');
    let acc = 0, hidden = false;
    tasks.push((s) => {
      bar.style.transform = `scaleX(${clamp(s.y / Math.max(1, s.docH - s.vh))})`;
      hdr.classList.toggle('is-stuck', s.y > 24);
      if (menuOpen) return;
      if ((s.vy > 0) !== (acc > 0)) acc = 0;
      acc += s.vy;
      if (!hidden && acc > 70 && s.y > 520) { hidden = true; hdr.classList.add('is-hidden'); root.classList.add('hdr-off'); }
      else if (hidden && (acc < -28 || s.y < 480)) { hidden = false; hdr.classList.remove('is-hidden'); root.classList.remove('hdr-off'); }
    });

    // enlace activo según la sección visible
    const links = $$('.hdr-nav a');
    const ids = links.map((a) => a.getAttribute('href'));
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${e.target.id}`)); });
    }, { rootMargin: '-42% 0px -55% 0px' });
    ids.forEach((id) => { const el = $(id); if (el) io.observe(el); });

    // menú móvil
    const menu = $('#menu'), btn = $('[data-menu-toggle]');
    $$('[data-menu-link]', menu).forEach((a, i) => a.style.setProperty('--i', i));
    openMenu = () => {
      menuOpen = true; menu.hidden = false; root.classList.add('menu-open');
      btn.setAttribute('aria-expanded', 'true'); btn.setAttribute('aria-label', 'Cerrar menú');
      stopScroll();
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      setTimeout(() => { const f = $('a', menu); if (f) f.focus({ preventScroll: true }); }, 500);
    };
    closeMenu = () => {
      if (!menuOpen) return;
      menuOpen = false; menu.classList.remove('is-open'); root.classList.remove('menu-open');
      btn.setAttribute('aria-expanded', 'false'); btn.setAttribute('aria-label', 'Abrir menú');
      startScroll();
      setTimeout(() => { if (!menuOpen) menu.hidden = true; }, 1000);
    };
    btn.addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    matchMedia('(min-width:1024px)').addEventListener('change', (m) => { if (m.matches) closeMenu(); });
  }

  /* 07 · ANCLAS ----------------------------------------------------------- */
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const el = $(id);
      if (!el) return;
      e.preventDefault();
      const wasOpen = menuOpen;
      closeMenu();
      setTimeout(() => scrollToEl(el), wasOpen ? 420 : 0);
    });
  }

  /* 08 · HERO ------------------------------------------------------------- */
  function initHero() {
    const hero = $('[data-hero]');
    if (!hero) return;
    const vis = watch(hero, '0px');
    const copy = $('[data-hero-copy]'), stage = $('[data-hero-stage]'), tilt = $('[data-stage-tilt]');

    /* Parallax de salida (usa `translate` para no chocar con las transiciones de entrada) */
    if (!REDUCED) {
      tasks.push((s) => {
        if (!vis.on || s.y > s.vh * 1.2) return;
        const p = clamp(s.y / (s.vh * 0.9));
        copy.style.transform = `translate3d(0,${s.y * 0.16}px,0)`;
        copy.style.opacity = String(1 - p * 0.9);
        stage.style.translate = `0 ${-s.y * 0.07}px`;
      });
    }

    /* Inclinación 3D con el mouse (spring por lerp) */
    if (FINE && !REDUCED) {
      let tx = 0, ty = 0, cx = 0, cy = 0;
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      });
      hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; });
      tasks.push(() => {
        if (!vis.on) return;
        cx = lerp(cx, tx, 0.06); cy = lerp(cy, ty, 0.06);
        tilt.style.setProperty('--ry', `${cx * 9}deg`);
        tilt.style.setProperty('--rx', `${-cy * 7}deg`);
      });
    }

    /* Mazo de fotos que rota solo */
    const frames = $$('[data-frames] .frame');
    const cap = $('[data-frame-cap]'), capTxt = $('.stage-cap-txt', cap), capName = $('[data-cap-name]'), capPrice = $('[data-cap-price]');
    const n = frames.length;
    let head = 0, timer = null;
    const place = (animate = true) => {
      frames.forEach((f, i) => {
        const pos = (i - head + n) % n;
        const was = parseInt(f.dataset.pos, 10);
        if (animate && was === n - 1 && pos === n - 2) { // el que salió regresa por detrás sin cruzar el mazo
          f.style.transition = 'opacity 1.2s var(--ease), filter 1.2s var(--ease)';
          f.dataset.pos = pos;
          requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = ''; }));
        } else f.dataset.pos = pos;
      });
      const front = frames[head];
      capTxt.classList.add('is-swap');
      setTimeout(() => {
        capName.textContent = front.dataset.name;
        capPrice.textContent = front.dataset.price;
        cap.setAttribute('href', front.dataset.href);
        capTxt.classList.remove('is-swap');
      }, 280);
    };
    const next = () => { head = (head + 1) % n; place(); };
    const start = () => { if (REDUCED || timer) return; timer = setInterval(() => { if (vis.on && !document.hidden) next(); }, 4800); };
    start();
    stage.addEventListener('pointerenter', () => { clearInterval(timer); timer = null; });
    stage.addEventListener('pointerleave', start);

    initHeroFX(hero, vis);
  }

  function initHeroFX(hero, vis) {
    const c = $('[data-hero-fx]');
    if (!c || REDUCED) return;
    const ctx = c.getContext('2d');
    let W = 0, H = 0, parts = [];
    const mouse = { x: -999, y: -999 };
    // sprite de brillo dorado, se dibuja una vez y se reutiliza
    const glow = document.createElement('canvas'); glow.width = glow.height = 64;
    const g = glow.getContext('2d'), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,241,184,.95)'); grad.addColorStop(0.25, 'rgba(246,215,119,.45)'); grad.addColorStop(1, 'rgba(224,178,76,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 64);

    const spawn = (anywhere = true) => {
      const z = Math.random();
      return { x: Math.random() * W, y: anywhere ? Math.random() * H : H + 12, vx: (Math.random() - 0.5) * 0.16, vy: -(0.04 + Math.random() * 0.2), r: 0.5 + z * 1.7, a: 0.25 + z * 0.7, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.3 };
    };
    const resize = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2), r = c.getBoundingClientRect();
      W = r.width; H = r.height; c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = clamp(Math.round((W * H) / 15000), 30, 92);
      while (parts.length < count) parts.push(spawn());
      parts.length = count;
    };
    measures.push(resize);
    if (FINE) {
      hero.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      hero.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    }
    const LINK = 112, LINK2 = LINK * LINK, MOUSE2 = 150 * 150;
    tasks.push((s, t) => {
      if (!vis.on || !W) return;
      ctx.clearRect(0, 0, W, H);
      const len = parts.length;
      for (let i = 0; i < len; i++) {
        const p = parts[i];
        p.x += p.vx; p.y += p.vy;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < MOUSE2) { const d = Math.sqrt(d2) || 1, f = (1 - d / 150) * 1.4; p.x += (dx / d) * f; p.y += (dy / d) * f; }
        if (p.y < -14 || p.x < -14 || p.x > W + 14) Object.assign(p, spawn(false));
        const tw = 0.55 + 0.45 * Math.sin(t * 0.001 * p.s + p.p);
        ctx.globalAlpha = p.a * tw;
        const sz = p.r * 7;
        ctx.drawImage(glow, p.x - sz, p.y - sz, sz * 2, sz * 2);
      }
      ctx.lineWidth = 0.7;
      for (let i = 0; i < len; i++) {
        const a = parts[i];
        for (let j = i + 1; j < len; j++) {
          const b = parts[j], dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy;
          if (d2 < LINK2) {
            ctx.globalAlpha = (1 - d2 / LINK2) * 0.2;
            ctx.strokeStyle = '#f6d777';
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const mx = a.x - mouse.x, my = a.y - mouse.y, md = mx * mx + my * my;
        if (md < MOUSE2) {
          ctx.globalAlpha = (1 - md / MOUSE2) * 0.5;
          ctx.strokeStyle = '#fff1b8';
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    });
  }

  /* 09 · STRIP (marquee reactivo al scroll) ------------------------------- */
  function initMarquee() {
    const wrap = $('[data-marquee]'), track = $('[data-marquee-track]');
    if (!wrap || REDUCED) return;
    const list = track.firstElementChild;
    let w = 0, x = 0;
    const build = () => {
      $$('.strip-list[aria-hidden="true"]', track).forEach((n) => n.remove());
      w = list.getBoundingClientRect().width;
      const need = Math.ceil((innerWidth * 2) / Math.max(w, 1)) + 1;
      for (let i = 0; i < need; i++) { const c = list.cloneNode(true); c.setAttribute('aria-hidden', 'true'); track.appendChild(c); }
    };
    measures.push(build);
    const vis = watch(wrap, '0px');
    tasks.push((s) => {
      if (!vis.on || !w) return;
      x -= (0.7 + Math.min(Math.abs(s.vy) * 0.45, 14)) * (s.dir >= 0 ? 1 : -1);
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  }

  /* 10 · EXPAND (la imagen se abre en grande con el scroll) --------------- */
  function initExpand() {
    const sec = $('[data-expand]');
    if (!sec || REDUCED) return;
    const media = $('[data-expand-media]'), img = $('img', media), copy = $('[data-expand-copy]'), words = $('.expand-words', sec), shade = $('.expand-shade', sec);
    let top = 0, h = 0, it0 = 0, ix0 = 0, rad0 = 0, last = -1;
    const measure = () => {
      const r = sec.getBoundingClientRect(); top = r.top + window.scrollY; h = sec.offsetHeight;
      const cs = getComputedStyle(sec);
      it0 = parseFloat(cs.getPropertyValue('--it0')); ix0 = parseFloat(cs.getPropertyValue('--ix0')); rad0 = parseFloat(cs.getPropertyValue('--rad0'));
      last = -1;
    };
    measures.push(measure);
    const vis = watch(sec, '0px');
    tasks.push((s) => {
      if (!vis.on) return;
      const p = clamp((s.y - top) / Math.max(1, h - s.vh));
      if (Math.abs(p - last) < 0.0004) return;
      last = p;
      const e = easeInOutCubic(clamp(p / 0.68));
      const it = it0 * (1 - e), ix = ix0 * (1 - e);
      media.style.clipPath = `inset(${it}% ${ix}% ${it}% ${ix}% round ${rad0 * (1 - e)}px)`;
      img.style.transform = `scale(${lerp(1.32, 1, e)})`;
      shade.style.opacity = String(lerp(1, 0.94, e));
      words.style.setProperty('--hw', `${(s.vw * (1 - (2 * ix) / 100)) / 2}px`);
      words.style.setProperty('--hh', `${(s.vh * (1 - (2 * it) / 100)) / 2}px`);
      words.style.opacity = String(1 - clamp((e - 0.62) / 0.3));
      const co = clamp((p - 0.7) / 0.2);
      copy.style.setProperty('--co', co);
      copy.classList.toggle('is-on', co > 0.6);
    });
  }

  /* 11 · MANIFIESTO (palabras que se encienden) --------------------------- */
  function initManifesto() {
    const sec = $('[data-manifesto]'), text = $('[data-words]');
    if (!sec || !text) return;
    const words = [];
    const walk = (node, gold) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.className = 'mw' + (gold ? ' is-gold' : ''); s.textContent = part;
            words.push(s); frag.appendChild(s);
          });
          node.replaceChild(frag, n);
        } else if (n.nodeType === 1) walk(n, gold || n.tagName === 'B');
      });
    };
    text.setAttribute('aria-label', text.textContent.replace(/\s+/g, ' ').trim());
    walk(text, false);
    if (REDUCED) { words.forEach((w) => w.classList.add('is-lit')); return; }
    let top = 0, h = 0, lit = 0;
    measures.push(() => { const r = sec.getBoundingClientRect(); top = r.top + window.scrollY; h = sec.offsetHeight; });
    const vis = watch(sec, '0px');
    tasks.push((s) => {
      if (!vis.on) return;
      const p = clamp((s.y - top) / Math.max(1, h - s.vh));
      const target = Math.round(map(p, 0.06, 0.82, 0, words.length));
      if (target === lit) return;
      for (let i = Math.min(lit, target); i < Math.max(lit, target); i++) words[i].classList.toggle('is-lit', target > lit);
      lit = target;
    });
  }

  /* 12 · TABS DE PROPIEDADES --------------------------------------------- */
  function initPropTabs() {
    const bar = $('[data-ptabs]');
    if (!bar) return;
    const tabs = $$('.ptab', bar), ind = $('[data-ptabs-ind]', bar), scroller = $('.ptabs-in', bar);
    const props = tabs.map((t) => document.getElementById(t.dataset.ptab));
    let current = null, first = true;
    const setActive = (id) => {
      current = id;
      tabs.forEach((t) => { const on = t.dataset.ptab === id; t.classList.toggle('is-on', on); if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
      const t = tabs.find((x) => x.dataset.ptab === id);
      if (!t) return;
      if (first) { ind.style.transition = 'none'; }
      ind.style.width = `${t.offsetWidth}px`;
      ind.style.transform = `translateX(${t.offsetLeft}px)`;
      ind.style.opacity = '1';
      if (first) { void ind.offsetWidth; ind.style.transition = ''; first = false; }
      if (scroller.scrollWidth > scroller.clientWidth) scroller.scrollTo({ left: t.offsetLeft - (scroller.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
    };
    const io = new IntersectionObserver((es) => { es.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); }); }, { rootMargin: '-38% 0px -56% 0px' });
    props.forEach((p) => p && io.observe(p));
    measures.push(() => { if (current) { first = true; setActive(current); } });
  }

  /* 13 · GALERÍAS Y LIGHTBOX ---------------------------------------------- */
  const lightbox = (() => {
    const el = $('[data-lb]');
    if (!el) return { open() {} };
    const img = $('[data-lb-img]', el), thumbsEl = $('[data-lb-thumbs]', el), bar = $('[data-lb-bar]', el);
    const nameEl = $('[data-lb-name]', el), labelEl = $('[data-lb-label]', el), stage = $('[data-lb-stage]', el);
    let items = [], idx = 0, opener = null, isOpen = false, swapId = 0;

    const preload = (i) => { const it = items[(i + items.length) % items.length]; if (it && !it.loaded) { const im = new Image(); im.src = it.src; it.loaded = true; } };
    function show(i, instant = false) {
      idx = (i + items.length) % items.length;
      const it = items[idx], id = ++swapId;
      const apply = () => {
        if (id !== swapId) return;
        const im = new Image();
        im.onload = () => { if (id !== swapId) return; img.src = it.src; img.alt = it.alt; img.classList.remove('is-out'); };
        im.src = it.src;
      };
      if (instant) apply(); else { img.classList.add('is-out'); setTimeout(apply, 220); }
      labelEl.textContent = it.label;
      bar.parentElement.style.setProperty('--lp', (idx + 1) / items.length);
      bar.style.setProperty('--lp', (idx + 1) / items.length);
      $$('button', thumbsEl).forEach((b, k) => {
        b.classList.toggle('is-active', k === idx);
        if (k === idx) thumbsEl.scrollTo({ left: b.offsetLeft - (thumbsEl.clientWidth - b.offsetWidth) / 2, behavior: 'smooth' });
      });
      preload(idx + 1); preload(idx - 1);
    }
    function open(gallery, index = 0, from = null) {
      items = gallery.slides.map((s, k) => ({ src: s.dataset.full, label: s.dataset.label, alt: $('img', s).alt, thumb: gallery.thumbs[k] ? $('img', gallery.thumbs[k]).src : '' }));
      nameEl.textContent = gallery.name;
      thumbsEl.innerHTML = '';
      items.forEach((it, k) => {
        const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', `Ver foto: ${it.label}`);
        const im = document.createElement('img'); im.src = it.thumb; im.alt = ''; b.appendChild(im);
        b.addEventListener('click', () => show(k)); thumbsEl.appendChild(b);
      });
      opener = from || document.activeElement; isOpen = true;
      el.hidden = false; root.classList.add('lb-open'); stopScroll();
      show(index, true);
      requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-open')));
      setTimeout(() => { const c = $('.lb-btn', el); if (c) c.focus({ preventScroll: true }); }, 60);
    }
    function close() {
      if (!isOpen) return;
      isOpen = false; el.classList.remove('is-open'); root.classList.remove('lb-open'); startScroll();
      setTimeout(() => { if (!isOpen) el.hidden = true; }, 600);
      if (opener && opener.focus) opener.focus({ preventScroll: true });
    }
    $$('[data-lb-close]', el).forEach((b) => b.addEventListener('click', close));
    $('[data-lb-prev]', el).addEventListener('click', () => show(idx - 1));
    $('[data-lb-next]', el).addEventListener('click', () => show(idx + 1));
    addEventListener('keydown', (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(idx + 1);
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'Tab') { // trampa de foco
        const f = $$('button', el).filter((b) => b.offsetParent !== null);
        if (!f.length) return;
        const a = f[0], z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
      }
    });
    // gestos: deslizar para cambiar o cerrar
    let sx = 0, sy = 0, down = false;
    stage.addEventListener('pointerdown', (e) => { down = true; sx = e.clientX; sy = e.clientY; });
    stage.addEventListener('pointerup', (e) => {
      if (!down) return; down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy)) show(idx + (dx < 0 ? 1 : -1));
      else if (dy > 110 && Math.abs(dy) > Math.abs(dx)) close();
    });
    stage.addEventListener('pointercancel', () => { down = false; });
    return { open };
  })();

  class Gallery {
    constructor(root) {
      this.root = root;
      this.name = root.dataset.name || 'Galería';
      this.stage = $('.pg-stage', root);
      this.slides = $$('.pg-slide', root);
      this.thumbs = $$('.pg-thumb', root);
      this.thumbsEl = $('.pg-thumbs', root);
      this.label = $('[data-pg-label]', root);
      this.bar = $('.pg-bar', root);
      this.n = this.slides.length;
      this.i = 0; this.timer = null; this.inView = false; this.paused = REDUCED;
      this.ensure(1);
      $('.pg-prev', root).addEventListener('click', () => { this.userGo(this.i - 1); });
      $('.pg-next', root).addEventListener('click', () => { this.userGo(this.i + 1); });
      $('.pg-zoom', root).addEventListener('click', (e) => { e.stopPropagation(); lightbox.open(this, this.i, e.currentTarget); });
      this.thumbs.forEach((t, k) => t.addEventListener('click', () => this.userGo(k)));
      this.stage.addEventListener('click', (e) => { if (e.target.closest('.pg-nav, .pg-zoom')) return; if (this.moved) return; lightbox.open(this, this.i, this.stage); });
      this.stage.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { e.preventDefault(); this.userGo(this.i + 1); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); this.userGo(this.i - 1); }
        else if (e.key === 'Enter') lightbox.open(this, this.i, this.stage);
      });
      // deslizar con el dedo
      let sx = 0, sy = 0;
      this.stage.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; this.moved = false; });
      this.stage.addEventListener('pointerup', (e) => {
        const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) { this.moved = true; this.userGo(this.i + (dx < 0 ? 1 : -1)); setTimeout(() => { this.moved = false; }, 50); }
      });
      new IntersectionObserver((es) => { this.inView = es[0].isIntersecting; this.inView ? this.play() : this.stop(); }, { threshold: 0.4 }).observe(this.stage);
    }
    ensure(i) {
      const img = $('img', this.slides[(i + this.n) % this.n]);
      if (img && img.dataset.src) { img.srcset = img.dataset.srcset; img.src = img.dataset.src; img.removeAttribute('data-src'); img.removeAttribute('data-srcset'); }
    }
    go(i) {
      const n = this.n; i = (i + n) % n;
      this.ensure(i); this.ensure(i + 1);
      this.slides[this.i].classList.remove('is-active');
      this.slides[i].classList.add('is-active');
      this.thumbs[this.i].classList.remove('is-active');
      this.thumbs[i].classList.add('is-active');
      const t = this.thumbs[i];
      this.thumbsEl.scrollTo({ left: t.offsetLeft - (this.thumbsEl.clientWidth - t.offsetWidth) / 2, behavior: 'smooth' });
      this.label.textContent = this.slides[i].dataset.label;
      this.i = i;
    }
    userGo(i) { this.paused = true; this.stop(); this.go(i); }
    play() {
      if (this.paused || !this.inView) return;
      this.stop();
      this.bar.classList.remove('is-run'); void this.bar.offsetWidth; this.bar.classList.add('is-run');
      this.timer = setTimeout(() => { this.go(this.i + 1); this.play(); }, 5600);
    }
    stop() { clearTimeout(this.timer); this.bar.classList.remove('is-run'); }
  }

  function initGalleries() {
    $$('[data-gallery]').forEach((g) => {
      const gal = new Gallery(g);
      const btn = $('[data-open-gallery]', g.closest('.prop'));
      if (btn) btn.addEventListener('click', (e) => lightbox.open(gal, gal.i, e.currentTarget));
    });
  }

  /* 14 · ACORDEÓN, BENTO, MAGNÉTICOS -------------------------------------- */
  function initAccordion() {
    const acc = $('[data-acc]');
    if (!acc) return;
    const items = $$('.acc-i', acc);
    const open = (it) => items.forEach((x) => x.classList.toggle('is-open', x === it));
    items.forEach((it) => {
      it.addEventListener('click', () => open(it));
      it.addEventListener('focus', () => open(it));
      it.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(it); } });
      if (FINE) it.addEventListener('mouseenter', () => { if (matchMedia('(min-width:900px)').matches) open(it); });
    });
  }

  function initSpotlight() {
    if (!FINE) return;
    $$('[data-spot]').forEach((c) => {
      c.addEventListener('pointermove', (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty('--mx', `${e.clientX - r.left}px`);
        c.style.setProperty('--my', `${e.clientY - r.top}px`);
      });
    });
  }

  function initMagnetic() {
    if (!FINE || REDUCED) return;
    $$('[data-magnetic]').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * 0.22, y = (e.clientY - (r.top + r.height / 2)) * 0.32;
        b.style.translate = `${x}px ${y}px`;
      });
      b.addEventListener('pointerleave', () => { b.style.translate = ''; });
    });
  }

  /* 15 · ZONAS Y MAPA ----------------------------------------------------- */
  function initZones() {
    const list = $('[data-zones]');
    if (!list) return;
    const frame = $('[data-zone-map]'), label = $('[data-zone-label]'), prop = $('[data-zone-prop]'), gmaps = $('[data-zone-gmaps]');
    const btns = $$('.zone', list);
    const select = (b, focus = false) => {
      btns.forEach((x) => { const on = x === b; x.classList.toggle('is-on', on); x.setAttribute('aria-selected', on); x.tabIndex = on ? 0 : -1; });
      const q = b.dataset.q;
      frame.classList.add('is-load');
      frame.src = `https://www.google.com/maps?q=${encodeURIComponent(q)}&output=embed&hl=es`;
      label.textContent = b.dataset.name;
      prop.setAttribute('href', b.dataset.link);
      gmaps.setAttribute('href', `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`);
      if (focus) b.focus();
    };
    frame.addEventListener('load', () => frame.classList.remove('is-load'));
    btns.forEach((b, i) => {
      b.tabIndex = b.classList.contains('is-on') ? 0 : -1;
      b.addEventListener('click', () => select(b));
      b.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select(btns[(i + 1) % btns.length], true); }
        else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select(btns[(i - 1 + btns.length) % btns.length], true); }
      });
    });
  }

  /* 16 · PROCESO (línea que se dibuja con el scroll) ----------------------- */
  function initFlow() {
    const sec = $('[data-flow]');
    if (!sec) return;
    const steps = $$('[data-step]', sec), line = $('[data-flow-line]', sec), ol = $('[data-steps]', sec);
    if (REDUCED) { steps.forEach((s) => s.classList.add('is-on')); line.style.setProperty('--lp', 1); return; }
    let top = 0, h = 0, tops = [];
    measures.push(() => {
      const r = ol.getBoundingClientRect(); top = r.top + window.scrollY; h = r.height;
      tops = steps.map((s) => s.getBoundingClientRect().top + window.scrollY + 40);
    });
    const vis = watch(sec, '0px');
    tasks.push((s) => {
      if (!vis.on) return;
      const mark = s.y + s.vh * 0.58;
      line.style.setProperty('--lp', clamp((mark - top - 30) / Math.max(1, h - 60)).toFixed(4));
      steps.forEach((st, i) => st.classList.toggle('is-on', mark > tops[i]));
    });
  }

  /* 17 · PARALLAX GENÉRICO ------------------------------------------------- */
  function initParallax() {
    if (REDUCED) return;
    $$('[data-par]').forEach((el) => {
      const k = parseFloat(el.dataset.par) || 0.1;
      let c = 0;
      const parent = el.parentElement;
      measures.push(() => { const r = parent.getBoundingClientRect(); c = r.top + window.scrollY + r.height / 2; });
      const vis = watch(parent, '200px');
      tasks.push((s) => { if (!vis.on) return; el.style.transform = `translate3d(0,${(s.y + s.vh / 2 - c) * k}px,0)`; });
    });
    const word = $('[data-ftr-word]');
    if (word) {
      let top = 0, h = 0;
      measures.push(() => { const r = word.parentElement.getBoundingClientRect(); top = r.top + window.scrollY; h = r.height; });
      const vis = watch(word.parentElement, '100px');
      tasks.push((s) => {
        if (!vis.on) return;
        const p = clamp((s.y + s.vh - top) / (s.vh * 0.9 + h * 0.3));
        word.style.transform = `translate3d(0,${(1 - p) * 70}px,0)`;
      });
    }
  }

  /* 18 · FAQ -------------------------------------------------------------- */
  function initFaq() {
    const root_ = $('[data-faq]');
    if (!root_) return;
    const items = $$('.qa', root_);
    items.forEach((it) => {
      const btn = $('.qa-q', it);
      btn.addEventListener('click', () => {
        const open = !it.classList.contains('is-open');
        items.forEach((x) => { x.classList.remove('is-open'); $('.qa-q', x).setAttribute('aria-expanded', 'false'); });
        if (open) { it.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
      });
    });
  }

  /* 19 · FORMULARIO A WHATSAPP -------------------------------------------- */
  function initForm() {
    const form = $('[data-form]');
    if (!form) return;
    const ok = $('[data-form-ok]', form);
    const field = (name) => form.elements[name];
    const setErr = (name, msg) => {
      const f = field(name), box = f.closest('.field'), err = $(`#f-${name}-err`, form);
      box.classList.toggle('has-err', !!msg);
      if (err) err.textContent = msg || '';
      f.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    ['name', 'prop'].forEach((n) => field(n).addEventListener('input', () => setErr(n, '')));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = field('name').value.trim(), prop = field('prop').value, phone = field('phone').value.trim(), pay = field('pay').value, msg = field('msg').value.trim();
      let bad = false;
      if (name.length < 2) { setErr('name', 'Escribe tu nombre para poder saludarte.'); bad = true; } else setErr('name', '');
      if (!prop) { setErr('prop', 'Elige la casa que te interesa o pide asesoría.'); bad = true; } else setErr('prop', '');
      if (bad) { ok.textContent = ''; const first = form.querySelector('.has-err input, .has-err select'); if (first) first.focus(); return; }
      const lines = [`Hola, soy ${name}.`, `Estoy listo para conocer: ${prop}.`];
      if (pay) lines.push(`Forma de pago que me interesa: ${pay}.`);
      if (msg) lines.push(msg);
      if (phone) lines.push(`Mi teléfono: ${phone}.`);
      lines.push('¿Podemos agendar una visita?');
      ok.textContent = 'Abriendo WhatsApp con tu mensaje listo...';
      // enlace temporal: abre WhatsApp en pestaña nueva sin perder el gesto del usuario
      const a = document.createElement('a');
      a.href = waLink(lines.join('\n')); a.target = '_blank'; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => { ok.textContent = 'Si WhatsApp no se abrió, toca de nuevo el botón.'; }, 4000);
    });
  }

  /* 20 · WHATSAPP FLOTANTE Y ARRANQUE ------------------------------------- */
  function initFloat() {
    const wa = $('[data-wa]');
    if (!wa || REDUCED) return;
    document.addEventListener('site:ready', () => {
      setTimeout(() => { wa.classList.add('is-tip'); setTimeout(() => wa.classList.remove('is-tip'), 6500); }, 7000);
    }, { once: true });
  }

  function boot() {
    root.classList.add('js');
    initScroll();
    initReveals();
    initCounters();
    initHeader();
    initAnchors();
    initHero();
    initMarquee();
    initExpand();
    initManifesto();
    initPropTabs();
    initGalleries();
    initAccordion();
    initSpotlight();
    initMagnetic();
    initZones();
    initFlow();
    initParallax();
    initFaq();
    initForm();
    initFloat();
    runLoader();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
