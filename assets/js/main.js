/* ============================================================
   TRUCXPRESS — interactions & scroll animation
   Requires: gsap.min.js + ScrollTrigger.min.js loaded first.
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
      if (finePointer && !REDUCED && card.classList.contains('tilt')) {
        const rx = ((y / r.height) - 0.5) * -8;
        const ry = ((x / r.width) - 0.5) * 10;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      }
    });
    card.addEventListener('pointerleave', () => { card.style.transform = ''; });
  });

  /* ---- GSAP scroll animations ---- */
  if (window.gsap && window.ScrollTrigger && !REDUCED) {
    gsap.registerPlugin(ScrollTrigger);
    // keep tween clocks tied to real time so intros finish even when the
    // GPU is slow (software WebGL) and the frame rate drops
    gsap.ticker.lagSmoothing(0);

    // hero intro
    const heroBits = document.querySelectorAll('.hero [data-hero], .page-hero [data-hero]');
    if (heroBits.length) {
      gsap.fromTo(heroBits,
        { y: 46, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.1, stagger: 0.13, ease: 'power3.out', delay: 0.15 }
      );
    }

    // generic reveals
    document.querySelectorAll('.reveal').forEach((el) => {
      gsap.to(el, {
        opacity: 1, y: 0, duration: 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 86%' },
      });
    });
    document.querySelectorAll('.reveal-l').forEach((el) => {
      gsap.to(el, {
        opacity: 1, x: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 84%' },
      });
    });
    document.querySelectorAll('.reveal-r').forEach((el) => {
      gsap.to(el, {
        opacity: 1, x: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 84%' },
      });
    });

    // staggered grids
    document.querySelectorAll('[data-stagger]').forEach((grid) => {
      gsap.fromTo(grid.children,
        { y: 54, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out',
          scrollTrigger: { trigger: grid, start: 'top 82%' },
        }
      );
    });

    // cinematic pinned hero: scrub progress feeds the 3D scene via
    // window.__heroP; text phases crossfade along the same timeline
    const cine = document.querySelector('.hero[data-cinematic]');
    if (cine) {
      window.__heroP = 0;
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: cine,
          start: 'top top',
          end: '+=280%',
          scrub: 0.7,
          pin: true,
          onUpdate: (self) => { window.__heroP = self.progress; },
        },
      });
      tl.to('.hero .scroll-hint', { autoAlpha: 0, duration: 0.05 }, 0.03)
        .to('.hero-content', { autoAlpha: 0, y: -90, ease: 'power1.in', duration: 0.16 }, 0.06)
        .fromTo('.hero-phase.p2', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.13, ease: 'power2.out' }, 0.28)
        .to('.hero-phase.p2', { autoAlpha: 0, y: -70, duration: 0.11, ease: 'power1.in' }, 0.5)
        .fromTo('.hero-phase.p3', { autoAlpha: 0, y: 70 }, { autoAlpha: 1, y: 0, duration: 0.13, ease: 'power2.out' }, 0.68)
        .to('.hero-phase.p3', { autoAlpha: 0, duration: 0.09 }, 0.93);
    }

    // parallax drift on decorated elements
    document.querySelectorAll('[data-parallax]').forEach((el) => {
      const depth = parseFloat(el.dataset.parallax) || 0.15;
      gsap.to(el, {
        yPercent: depth * -100, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true },
      });
    });
  } else {
    // reduced motion / no gsap: show everything
    document.querySelectorAll('.reveal, .reveal-l, .reveal-r, [data-stagger] > *').forEach((el) => {
      el.style.opacity = 1;
      el.style.transform = 'none';
    });
  }

  /* ---- animated counters ---- */
  const counters = document.querySelectorAll('[data-count]');
  if (counters.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        io.unobserve(el);
        const target = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split('.')[1] || '').length;
        const dur = 1800;
        const t0 = performance.now();
        const fmt = (v) => decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString('en-US');
        if (REDUCED) { el.textContent = fmt(target); return; }
        (function tick(now) {
          const p = Math.min((now - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = fmt(target * eased);
          if (p < 1) requestAnimationFrame(tick);
        })(t0);
      });
    }, { threshold: 0.5 });
    counters.forEach((el) => io.observe(el));
  }

  /* ---- contact form (no backend yet: builds a mailto) ---- */
  const form = document.querySelector('#contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const name = `${data.get('first_name') || ''} ${data.get('last_name') || ''}`.trim() || 'website';
      const subject = encodeURIComponent(`Dispatch inquiry from ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nPhone: ${data.get('phone')}\nEmail: ${data.get('email')}\n\n${data.get('message')}`
      );
      window.location.href = `mailto:${form.dataset.email || 'info@trucxpress.com'}?subject=${subject}&body=${body}`;
    });
  }

  /* ---- footer year ---- */
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
})();
