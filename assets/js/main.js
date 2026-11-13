/* ============================================================
   TRUCXPRESS — interactions & scroll animation
   The home page also loads gsap + ScrollTrigger for the pinned hero.
   ============================================================ */
(function () {
  'use strict';
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- nav scroll state ---- */
  const nav = document.querySelector('.nav');
  const onScroll = () => nav && nav.classList.toggle('scrolled', window.scrollY > 24);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- mobile menu ---- */
  const toggle = document.querySelector('.nav-toggle');
  const links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => {
        links.classList.remove('open');
        toggle.classList.remove('open');
        document.body.style.overflow = '';
      })
    );
  }

  /* ---- back to top ---- */
  const toTop = document.querySelector('.to-top');
  if (toTop) {
    window.addEventListener('scroll', () => {
      toTop.classList.toggle('show', window.scrollY > 700);
    }, { passive: true });
    toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: REDUCED ? 'auto' : 'smooth' }));
  }

  /* ---- card spotlight + 3D tilt ---- */
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', `${x}px`);
      card.style.setProperty('--my', `${y}px`);
      if (finePointer && !REDUCED && !card.classList.contains('no-tilt') && !card.closest('.hiw')) {
        const rx = ((y / r.height) - 0.5) * -8;
        const ry = ((x / r.width) - 0.5) * 10;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      }
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  /* ---- scroll reveals (the motion itself is CSS: .in in style.css) ---- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      revealIO.unobserve(e.target);
      if (e.target.hasAttribute('data-stagger')) {
        Array.from(e.target.children).forEach((c, i) => { c.style.animationDelay = i * 0.1 + 's'; c.classList.add('in'); });
      } else e.target.classList.add('in');
    });
  // the huge top margin also catches anything a fast scroll or an anchor jump skipped past
  }, { rootMargin: '100000px 0px -12% 0px' });
  document.querySelectorAll('.reveal, .reveal-l, .reveal-r, [data-stagger]').forEach((el) => revealIO.observe(el));

  /* ---- home hero: pinned scroll story (GSAP is loaded on the home page only) ---- */
  if (window.gsap && window.ScrollTrigger && !REDUCED) {
    gsap.registerPlugin(ScrollTrigger);
    // keep tween clocks tied to real time so the scrub stays in step even
    // when the GPU is slow and the frame rate drops
    gsap.ticker.lagSmoothing(0);

    // cinematic pinned hero: scrub progress feeds the 3D scene via
    // window.__heroP; text phases crossfade along the same timeline.
    // Data-saver visitors keep the still poster and a normal, unpinned hero.
    const cine = document.querySelector('.hero[data-cinematic]');
    const saveData = !!(navigator.connection && navigator.connection.saveData);
    if (cine && !saveData) {
      window.__heroP = 0;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: cine,
          start: 'top top',
          end: '+=520%',
          scrub: 0.7,
          pin: true,
          onUpdate: (self) => { window.__heroP = self.progress; },
        },
      });
      tl.to('.hero .scroll-hint', { autoAlpha: 0, duration: 0.04 }, 0.02)
        .to('.hero-content', { autoAlpha: 0, y: -90, ease: 'power1.in', duration: 0.12 }, 0.05)
        .fromTo('.hero-phase.p2', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.33)
        .to('.hero-phase.p2', { autoAlpha: 0, y: -70, duration: 0.09, ease: 'power1.in' }, 0.49)
        .fromTo('.hero-phase.p3', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.1, ease: 'power2.out' }, 0.74)
        .to('.hero-phase.p3', { autoAlpha: 0, duration: 0.08 }, 0.92);

      // the 3D scene itself (bundled from src/hero.js). It starts once the page
      // has loaded and painted, so it never delays the headline; the poster
      // still covers the wait and simply stays if the scene fails.
      const start3D = () => setTimeout(() => {
        import(cine.dataset.cinematic)
          .then((m) => m.initCinematicHero(cine.querySelector('.hero-canvas')))
          .catch((e) => console.warn('3D hero disabled:', e));
      }, 150);
      if (document.readyState === 'complete') start3D();
      else window.addEventListener('load', start3D, { once: true });
    }
  }

  /* ---- How It Works: route truck, step states, tilt cards ---- */
  const hiwGrid = document.getElementById('hiw-steps');
  if (hiwGrid) {
    const hiwSteps = Array.from(hiwGrid.querySelectorAll('.step'));
    const hiwFill = document.getElementById('hiw-fill');
    const hiwTruck = document.getElementById('hiw-truck');
    const total = hiwSteps.length;
    const fourCols = () => getComputedStyle(hiwGrid).gridTemplateColumns.split(' ').length === total;

    const setStep = (idx) => {
      hiwSteps.forEach((s, i) => {
        s.classList.toggle('done', idx >= 0 && i < idx);
        s.classList.toggle('active', i === idx);
        s.querySelector('.status').textContent =
          i < idx ? 'Completed' : i === idx ? `Step ${i + 1} of ${total}` : '';
      });
      let pct = 0;
      if (idx >= 0) pct = fourCols() ? idx * (100 / total) : ((idx + 1) / total) * 100;
      hiwFill.style.width = pct + '%';
      // orb centres sit at 12.5% + n * 25% when the steps form one row
      hiwTruck.style.left = (fourCols() ? 50 / total + pct : pct) + '%';
    };
    hiwSteps.forEach((s, i) => {
      s.addEventListener('pointerenter', () => setStep(i));
      s.addEventListener('focus', () => setStep(i));
      s.addEventListener('click', () => setStep(i));
    });
    hiwGrid.addEventListener('pointerleave', () => setStep(-1));
    window.addEventListener('resize', () => setStep(hiwSteps.findIndex((s) => s.classList.contains('active'))));

    const fine = window.matchMedia('(pointer: fine)').matches;
    hiwSteps.forEach((card) => {
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        const x = e.clientX - r.left, y = e.clientY - r.top;
        card.style.setProperty('--mx', x + 'px');
        card.style.setProperty('--my', y + 'px');
        if (fine && !REDUCED) {
          card.style.transform =
            `rotateX(${((y / r.height) - 0.5) * -10}deg) rotateY(${((x / r.width) - 0.5) * 12}deg) translateY(-6px)`;
        }
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }

  /* ---- live load tracker ---- */
  const tracker = document.querySelector('#load-tracker');
  if (tracker) {
    const LOADS = [
      { id: '#PHX-4821', equip: 'Dry Van',  from: 'Phoenix, AZ',     to: 'Chicago, IL',  total: 1753, target: 0.62, dep: 'Departed 6:40 AM' },
      { id: '#DAL-1096', equip: 'Reefer',   from: 'Dallas, TX',      to: 'Atlanta, GA',  total: 781,  target: 0.44, dep: 'Departed 9:15 AM' },
      { id: '#LAX-3307', equip: 'Flatbed',  from: 'Los Angeles, CA', to: 'Seattle, WA',  total: 1135, target: 0.78, dep: 'Departed 4:05 AM' },
      { id: '#ATL-2210', equip: 'Power Only', from: 'Atlanta, GA',   to: 'New York, NY', total: 872,  target: 0.31, dep: 'Departed 11:30 AM' },
    ];
    const el = (id) => document.getElementById(id);
    const fmt = (n) => Math.round(n).toLocaleString('en-US');
    const AVG_MPH = 52;

    let loadIdx = 0, pct = 0, targetPct = 0, animStart = null, holdTimer = null, creepTimer = null, running = false;

    function setLoad(i) {
      const L = LOADS[i];
      el('trk-id').textContent = L.id;
      el('trk-equip').textContent = L.equip;
      el('trk-from').textContent = L.from;
      el('trk-to').textContent = L.to;
      el('trk-dep').textContent = L.dep;
      el('trk-total').textContent = fmt(L.total);
      pct = 0;
      targetPct = L.target;
      animStart = performance.now();
    }

    function paint() {
      const L = LOADS[loadIdx];
      const traveled = L.total * pct;
      const remaining = Math.max(L.total - traveled, 0);
      const etaH = remaining / AVG_MPH;
      const h = Math.floor(etaH), m = Math.round((etaH - h) * 60);
      el('trk-fill').style.width = (pct * 100) + '%';
      el('trk-truck').style.left = (pct * 100) + '%';
      el('trk-traveled').textContent = fmt(traveled);
      el('trk-remaining').textContent = fmt(remaining);
      el('trk-pct').textContent = Math.round(pct * 100);
      el('trk-eta').textContent = h > 0 ? `${h}h ${m}m` : `${m}m`;
    }

    function tick(now) {
      if (!running) return;
      const t = Math.min((now - animStart) / 2400, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      pct = targetPct * eased;
      paint();
      if (t < 1) {
        requestAnimationFrame(tick);
      } else if (!REDUCED) {
        // hold with a live creep, then rotate to the next load
        creepTimer = setInterval(() => {
          pct = Math.min(pct + 0.0004, 0.99);
          paint();
        }, 900);
        holdTimer = setTimeout(() => {
          clearInterval(creepTimer);
          tracker.classList.add('switching');
          setTimeout(() => {
            loadIdx = (loadIdx + 1) % LOADS.length;
            setLoad(loadIdx);
            tracker.classList.remove('switching');
            requestAnimationFrame(tick);
          }, 480);
        }, 6500);
      }
    }

    const trackerIO = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        setLoad(loadIdx);
        if (REDUCED) { pct = targetPct; paint(); return; }
        requestAnimationFrame(tick);
      } else if (!entry.isIntersecting && running) {
        running = false;
        if (holdTimer) clearTimeout(holdTimer);
        if (creepTimer) clearInterval(creepTimer);
      }
    }, { threshold: 0.35 });
    trackerIO.observe(tracker);
  }

  /* ---- footer year ---- */
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
