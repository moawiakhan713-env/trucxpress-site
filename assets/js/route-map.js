/* ============================================================
   TRUCXPRESS — US dispatch route map
   Dot-matrix USA with the Phoenix hub and freight lanes arcing
   to major cities. Plain 2D canvas with a hand-rolled perspective
   camera: no 3D library. Draws only while it is on screen.
   Mounts into #route-map.
   ============================================================ */
(function () {
  'use strict';
  const box = document.getElementById('route-map');
  if (!box) return;
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const US_OUTLINE = [
    [-124.7, 48.4], [-124.1, 46.9], [-124.4, 43.3], [-124.2, 41.9], [-123.8, 39.8],
    [-122.5, 37.8], [-121.9, 36.6], [-120.6, 34.6], [-118.4, 34.0], [-117.1, 32.5],
    [-114.7, 32.7], [-111.0, 31.3], [-108.2, 31.3], [-106.5, 31.8], [-104.9, 30.6],
    [-103.2, 29.0], [-102.4, 29.8], [-101.4, 29.8], [-99.5, 27.5], [-97.1, 25.9],
    [-97.4, 27.8], [-96.6, 28.7], [-94.7, 29.3], [-93.2, 29.8], [-91.0, 29.2],
    [-89.4, 28.9], [-89.6, 30.2], [-87.5, 30.3], [-85.4, 29.7], [-84.0, 30.1],
    [-82.7, 27.5], [-81.8, 26.1], [-80.0, 25.2], [-80.0, 26.8], [-81.2, 29.7],
    [-81.5, 30.7], [-80.8, 32.0], [-79.0, 33.8], [-75.5, 35.2], [-76.0, 37.2],
    [-75.0, 38.9], [-74.0, 40.7], [-71.9, 41.3], [-70.0, 41.7], [-70.8, 42.9],
    [-68.9, 44.3], [-67.0, 44.8], [-69.2, 47.4], [-71.5, 45.0], [-75.0, 44.8],
    [-76.8, 43.6], [-79.0, 43.3], [-79.0, 42.5], [-82.5, 41.7], [-83.1, 42.3],
    [-82.4, 43.0], [-84.7, 45.8], [-88.0, 48.0], [-89.5, 48.0], [-95.2, 49.0],
    [-104.0, 49.0], [-110.0, 49.0], [-122.7, 49.0],
  ];
  const CITIES = {
    phoenix: [-112.07, 33.45], losangeles: [-118.24, 34.05], seattle: [-122.33, 47.60],
    denver: [-104.99, 39.74], dallas: [-96.80, 32.78], chicago: [-87.63, 41.88],
    atlanta: [-84.39, 33.75], miami: [-80.19, 25.76], newyork: [-74.00, 40.71],
  };
  const LANES = [
    ['phoenix', 'losangeles'], ['phoenix', 'seattle'], ['phoenix', 'denver'],
    ['phoenix', 'dallas'], ['phoenix', 'chicago'], ['phoenix', 'atlanta'],
    ['phoenix', 'newyork'], ['dallas', 'miami'], ['chicago', 'newyork'],
  ];

  // lon/lat -> flat map units (x right, z toward the viewer)
  const S = 0.25;
  const flat = (lon, lat) => [(lon + 98) * 0.777 * S, -(lat - 38) * S];
  const inside = (x, y) => {
    let hit = false;
    for (let i = 0, j = US_OUTLINE.length - 1; i < US_OUTLINE.length; j = i++) {
      const [xi, yi] = US_OUTLINE[i], [xj, yj] = US_OUTLINE[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };

  /* ---- static geometry, in map space ---- */
  const dots = [];
  for (let lon = -125; lon <= -66.5; lon += 0.21 / 0.777) {
    for (let lat = 25; lat <= 49.5; lat += 0.21) {
      if (inside(lon, lat)) dots.push(flat(lon, lat));
    }
  }
  const city = {};
  for (const name in CITIES) city[name] = flat(CITIES[name][0], CITIES[name][1]);

  const lanes = LANES.map(([a, b]) => {
    const [ax, az] = city[a], [bx, bz] = city[b];
    const lift = 0.45 + Math.hypot(bx - ax, bz - az) * 0.16;
    const pts = [];
    for (let i = 0; i <= 40; i++) {            // quadratic bezier, apex lifted off the map
      const u = i / 40, k = 1 - u;
      pts.push([k * k * ax + 2 * k * u * (ax + bx) / 2 + u * u * bx, 2 * k * u * lift + 0.03, k * k * az + 2 * k * u * (az + bz) / 2 + u * u * bz]);
    }
    return pts;
  });
  const pulses = [];
  lanes.forEach((pts) => { for (let k = 0; k < 2; k++) pulses.push({ pts, offset: Math.random(), speed: 0.1 + Math.random() * 0.1 }); });
  const dust = Array.from({ length: 180 }, () => [(Math.random() - 0.5) * 26, Math.random() * 13 - 6, (Math.random() - 0.5) * 26]);

  /* ---- camera: eye (0, 5.6, 8.2) looking at (0, -0.4, 0), 42 degree vertical fov ---- */
  const EYE = [0, 5.6, 8.2];
  const fl = Math.hypot(6, 8.2);
  const FWD = [0, -6 / fl, -8.2 / fl];          // forward
  const UP = [0, 8.2 / fl, -6 / fl];            // up (right is +x)
  const TILT = 6 / fl;                          // how much flat circles are squashed
  const MAP_Y = -0.6;

  const canvas = document.createElement('canvas');
  const g = canvas.getContext('2d');
  box.appendChild(canvas);
  canvas.style.cssText = 'width:100%;height:100%;display:block';
  let W = 0, H = 0, F = 0, dpr = 1;
  function resize() {
    const w = box.clientWidth, h = box.clientHeight;
    if (!w || !h) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = w; H = h; F = (h / 2) / Math.tan((42 * Math.PI / 180) / 2);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
  }

  let rotX = 0, rotY = 0, sx = 0, sy = 0, sc = 0;
  // map-space point -> screen (sx, sy) and pixels-per-unit (sc); false if behind the camera
  function project(x, y, z, world) {
    if (!world) {
      const cy = Math.cos(rotY), sn = Math.sin(rotY);
      const x1 = x * cy + z * sn, z1 = -x * sn + z * cy;
      const cx = Math.cos(rotX), sxn = Math.sin(rotX);
      x = x1; const y1 = y * cx - z1 * sxn; z = y * sxn + z1 * cx; y = y1 + MAP_Y;
    }
    const dx = x - EYE[0], dy = y - EYE[1], dz = z - EYE[2];
    const depth = dy * FWD[1] + dz * FWD[2];
    if (depth < 0.1) return false;
    sc = F / depth;
    sx = W / 2 + dx * sc;
    sy = H / 2 - (dy * UP[1] + dz * UP[2]) * sc;
    return true;
  }

  const glow = (() => {                         // soft amber sprite for the lane pulses
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const cg = c.getContext('2d');
    const grad = cg.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,220,140,1)');
    grad.addColorStop(1, 'rgba(255,179,26,0)');
    cg.fillStyle = grad;
    cg.fillRect(0, 0, 64, 64);
    return c;
  })();

  const mouse = { x: 0, y: 0 };
  box.addEventListener('pointermove', (e) => {
    const r = box.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });

  function draw(t) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    rotY += (mouse.x * 0.22 - rotY) * 0.05;
    rotX += (mouse.y * 0.1 - rotX) * 0.05;

    // drifting dust
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = 'rgba(138,233,255,0.5)';
    const da = t * 0.015, dc = Math.cos(da), ds = Math.sin(da);
    for (const [x, y, z] of dust) {
      if (!project(x * dc + z * ds, y, -x * ds + z * dc, true)) continue;
      const s = Math.max(0.046 * sc, 1);
      g.fillRect(sx - s / 2, sy - s / 2, s, s);
    }

    // dot-matrix map
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(55,80,122,0.75)';
    g.beginPath();
    for (const [x, z] of dots) {
      if (!project(x, 0, z)) continue;
      const r = 0.052 * sc;
      g.moveTo(sx + r, sy);
      g.ellipse(sx, sy, r, r * TILT, 0, 0, 6.2832);
    }
    g.fill();

    // freight lanes
    g.globalCompositeOperation = 'lighter';
    g.strokeStyle = 'rgba(55,213,255,0.32)';
    g.lineCap = 'round';
    for (const pts of lanes) {
      g.beginPath();
      let w = 1;
      pts.forEach(([x, y, z], i) => {
        if (!project(x, y, z)) return;
        if (i === 0) { g.moveTo(sx, sy); w = Math.max(0.024 * sc, 1); } else g.lineTo(sx, sy);
      });
      g.lineWidth = w;
      g.stroke();
    }

    // hub ring + cities
    g.globalCompositeOperation = 'source-over';
    const [hx, hz] = city.phoenix;
    if (project(hx, 0.04, hz)) {
      const p = (t * 0.6) % 1, r = 0.18 * (1 + p * 2.2) * sc;
      g.strokeStyle = `rgba(255,179,26,${(1 - p) * 0.8})`;
      g.lineWidth = Math.max(0.04 * (1 + p * 2.2) * sc, 1);
      g.beginPath();
      g.ellipse(sx, sy, r, r * TILT, 0, 0, 6.2832);
      g.stroke();
    }
    for (const name in city) {
      const hub = name === 'phoenix';
      if (!project(city[name][0], 0.05, city[name][1])) continue;
      g.fillStyle = hub ? '#ffb31a' : '#8ae9ff';
      g.beginPath();
      g.arc(sx, sy, (hub ? 0.13 : 0.075) * sc, 0, 6.2832);
      g.fill();
    }

    // light pulses travelling along the lanes
    g.globalCompositeOperation = 'lighter';
    for (const p of pulses) {
      const u = (t * p.speed + p.offset) % 1;
      const f = u * 40, i = Math.min(Math.floor(f), 39), k = f - i;
      const a = p.pts[i], b = p.pts[i + 1];
      if (!project(a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k)) continue;
      const s = 0.3 * sc;
      g.globalAlpha = Math.sin(u * Math.PI);
      g.drawImage(glow, sx - s / 2, sy - s / 2, s, s);
    }
    g.globalAlpha = 1;
  }

  /* ---- run only while visible ---- */
  let visible = false, raf = null;
  const t0 = performance.now();
  function loop(now) {
    raf = null;
    if (!visible || document.hidden) return;
    draw(REDUCED ? 0 : (now - t0) / 1000);
    if (!REDUCED) raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (raf === null && visible) raf = requestAnimationFrame(loop); };
  window.addEventListener('resize', () => { resize(); kick(); });
  document.addEventListener('visibilitychange', kick);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !W) resize();
    kick();
  }, { rootMargin: '100px' }).observe(box);
})();
