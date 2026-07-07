/* ============================================================
   TRUCXPRESS — Three.js scenes
   - initHighwayScene(): night-highway hero with a stylized semi
   - initRouteMap():     US dispatch route map (about visual)
   - initParticleHero(): lightweight particle field for page heros
   ============================================================ */
import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(window.devicePixelRatio || 1, 2);

/* ---------- shared helpers ---------- */

function makeRenderer(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(DPR);
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  return renderer;
}

function autoResize(container, camera, renderer) {
  const onResize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  window.addEventListener('resize', onResize);
  return onResize;
}

/* Runs the loop only while the canvas is on screen & tab visible. */
function runLoop(container, tick) {
  let visible = true, rafId = null;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && rafId === null) loop();
  }, { threshold: 0.02 });
  io.observe(container);

  const clock = new THREE.Clock();
  function loop() {
    if (!visible || document.hidden) { rafId = null; return; }
    tick(clock.getDelta(), clock.elapsedTime);
    rafId = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && visible && rafId === null) loop();
  });
  loop();
}

function starField(count, spread, size, color, opacity) {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * spread;
    pos[i * 3 + 1] = Math.random() * spread * 0.5;
    pos[i * 3 + 2] = (Math.random() - 0.5) * spread;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color, size, sizeAttenuation: true, transparent: true, opacity,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  return new THREE.Points(geo, mat);
}

/* ============================================================
   1. NIGHT-HIGHWAY HERO
   ============================================================ */
export function initHighwayScene(container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x04060d, 26, 120);

  const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 300);
  const CAM_BASE = new THREE.Vector3(6.2, 3.4, 11.5);
  camera.position.copy(CAM_BASE);

  const renderer = makeRenderer(container);
  autoResize(container, camera, renderer);

  /* ---- lights ---- */
  scene.add(new THREE.HemisphereLight(0x223355, 0x05070f, 0.85));
  const moon = new THREE.DirectionalLight(0x8fb6ff, 0.5);
  moon.position.set(-14, 22, -10);
  scene.add(moon);
  const warmFill = new THREE.PointLight(0xffb31a, 18, 30, 1.8);
  warmFill.position.set(2, 3.5, 4);
  scene.add(warmFill);

  /* ---- road ---- */
  const ROAD_LEN = 260;
  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(16, ROAD_LEN),
    new THREE.MeshStandardMaterial({ color: 0x0b0e18, roughness: 0.92, metalness: 0.1 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.z = -ROAD_LEN / 2 + 30;
  scene.add(road);

  // shoulder ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, ROAD_LEN),
    new THREE.MeshStandardMaterial({ color: 0x05070f, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.02, -ROAD_LEN / 2 + 30);
  scene.add(ground);

  /* ---- glowing edge lines ---- */
  const edgeMatAmber = new THREE.MeshBasicMaterial({ color: 0xffb31a });
  const edgeMatCyan = new THREE.MeshBasicMaterial({ color: 0x37d5ff });
  const edgeGeo = new THREE.BoxGeometry(0.14, 0.03, ROAD_LEN);
  const edgeL = new THREE.Mesh(edgeGeo, edgeMatAmber);
  edgeL.position.set(-7.6, 0.02, -ROAD_LEN / 2 + 30);
  const edgeR = new THREE.Mesh(edgeGeo, edgeMatCyan);
  edgeR.position.set(7.6, 0.02, -ROAD_LEN / 2 + 30);
  scene.add(edgeL, edgeR);

  /* ---- moving lane dashes (2 dashed lines -> 3 lanes) ---- */
  const DASHES = 36, DASH_GAP = 8;
  const dashGeo = new THREE.BoxGeometry(0.18, 0.02, 3.2);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xcfd6e8, transparent: true, opacity: 0.65 });
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, DASHES * 2);
  const dashDummy = new THREE.Object3D();
  scene.add(dashes);
  const dashOffsets = [];
  for (let i = 0; i < DASHES * 2; i++) {
    const lane = i < DASHES ? -2.6 : 2.6;
    const z = -(i % DASHES) * DASH_GAP + 30;
    dashOffsets.push({ lane, z });
  }

  /* ---- stylized semi truck ---- */
  const truck = new THREE.Group();

  const paint = new THREE.MeshStandardMaterial({ color: 0xff9a1a, roughness: 0.35, metalness: 0.55 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x11141f, roughness: 0.6, metalness: 0.6 });
  const boxWhite = new THREE.MeshStandardMaterial({ color: 0xb9c2d4, roughness: 0.5, metalness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x0a1626, roughness: 0.1, metalness: 0.9 });

  // trailer
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.7, 8.2), boxWhite);
  trailer.position.set(0, 2.05, 1.6);
  truck.add(trailer);
  // trailer side accent stripe
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(2.57, 0.34, 8.22),
    new THREE.MeshStandardMaterial({ color: 0xff9a1a, roughness: 0.4, metalness: 0.4, emissive: 0x3a2000 })
  );
  stripe.position.set(0, 1.15, 1.6);
  truck.add(stripe);
  // chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.5, 10.6), darkMetal);
  chassis.position.set(0, 0.62, 0.7);
  truck.add(chassis);
  // cab
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.45, 2.15, 2.2), paint);
  cab.position.set(0, 1.85, -4.35);
  truck.add(cab);
  // cab roof fairing
  const fairing = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.8, 1.4), paint);
  fairing.position.set(0, 3.2, -3.95);
  fairing.rotation.x = 0.22;
  truck.add(fairing);
  // windshield
  const shield = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.85, 0.1), glassMat);
  shield.position.set(0, 2.25, -5.42);
  shield.rotation.x = -0.12;
  truck.add(shield);
  // bumper / grille
  const grille = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 0.28), darkMetal);
  grille.position.set(0, 0.85, -5.5);
  truck.add(grille);
  // exhaust stacks
  const stackGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.4, 10);
  const stackMat = new THREE.MeshStandardMaterial({ color: 0x8a93a8, roughness: 0.25, metalness: 0.95 });
  const stackL = new THREE.Mesh(stackGeo, stackMat); stackL.position.set(-1.05, 2.2, -3.15);
  const stackR = new THREE.Mesh(stackGeo, stackMat); stackR.position.set(1.05, 2.2, -3.15);
  truck.add(stackL, stackR);

  // wheels
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 20);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0a0c14, roughness: 0.85 });
  const hubGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.47, 12);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0x828da3, roughness: 0.3, metalness: 0.9 });
  const wheelZ = [-4.6, -2.5, 3.4, 4.6];
  for (const z of wheelZ) {
    for (const x of [-1.15, 1.15]) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(wheelGeo, wheelMat));
      w.add(new THREE.Mesh(hubGeo, hubMat));
      w.rotation.z = Math.PI / 2;
      w.position.set(x, 0.55, z);
      truck.add(w);
      wheels.push(w);
    }
  }

  // headlights
  const headGeo = new THREE.SphereGeometry(0.13, 12, 12);
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff3cf });
  for (const x of [-0.85, 0.85]) {
    const bulb = new THREE.Mesh(headGeo, headMat);
    bulb.position.set(x, 1.0, -5.62);
    truck.add(bulb);
    const beam = new THREE.SpotLight(0xffe9b0, 60, 40, 0.42, 0.5, 1.6);
    beam.position.set(x, 1.0, -5.6);
    const tgt = new THREE.Object3D();
    tgt.position.set(x * 1.6, 0, -30);
    truck.add(tgt);
    beam.target = tgt;
    truck.add(beam);
    // visible light cone
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.7, 9, 20, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe9b0, transparent: true, opacity: 0.05,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      })
    );
    cone.rotation.x = Math.PI / 2 - 0.05;
    cone.position.set(x, 0.85, -10);
    truck.add(cone);
  }

  // taillights + trailer markers
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2d2d });
  for (const x of [-1.05, 1.05]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.06), tailMat);
    t.position.set(x, 0.95, 5.72);
    truck.add(t);
  }
  const markMat = new THREE.MeshBasicMaterial({ color: 0xffb31a });
  for (let i = 0; i < 5; i++) {
    for (const x of [-1.29, 1.29]) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), markMat);
      m.position.set(x, 3.32, -1.6 + i * 1.6);
      truck.add(m);
    }
  }

  truck.position.set(-2.6, 0, 0);
  scene.add(truck);

  /* ---- distant city glow ---- */
  const glowTex = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(128, 128, 6, 128, 128, 120);
    grad.addColorStop(0, 'rgba(255,170,60,0.85)');
    grad.addColorStop(0.4, 'rgba(120,90,180,0.28)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 128);
    return new THREE.CanvasTexture(c);
  })();
  const cityGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTex, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  cityGlow.scale.set(90, 34, 1);
  cityGlow.position.set(0, 6, -110);
  scene.add(cityGlow);

  /* ---- stars & speed streaks ---- */
  const stars = starField(500, 240, 0.4, 0x9db8ff, 0.8);
  stars.position.y = 20;
  scene.add(stars);

  const STREAKS = 140;
  const streakGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(STREAKS * 3);
  for (let i = 0; i < STREAKS; i++) {
    sPos[i * 3] = (Math.random() - 0.5) * 60;
    sPos[i * 3 + 1] = Math.random() * 10 + 0.3;
    sPos[i * 3 + 2] = -Math.random() * 160 + 20;
  }
  streakGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const streaks = new THREE.Points(streakGeo, new THREE.PointsMaterial({
    color: 0x6fd8ff, size: 0.22, transparent: true, opacity: 0.5,
    depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(streaks);

  /* ---- interaction state ---- */
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  const SPEED = REDUCED ? 0 : 26; // world units / s toward camera

  runLoop(container, (dt, t) => {
    dt = Math.min(dt, 0.05);

    // road dashes scroll toward camera
    for (let i = 0; i < dashOffsets.length; i++) {
      const d = dashOffsets[i];
      d.z += SPEED * dt;
      if (d.z > 34) d.z -= DASHES * DASH_GAP;
      dashDummy.position.set(d.lane, 0.02, d.z);
      dashDummy.updateMatrix();
      dashes.setMatrixAt(i, dashDummy.matrix);
    }
    dashes.instanceMatrix.needsUpdate = true;

    // speed streaks
    const p = streakGeo.attributes.position.array;
    for (let i = 0; i < STREAKS; i++) {
      p[i * 3 + 2] += SPEED * 1.4 * dt;
      if (p[i * 3 + 2] > 24) p[i * 3 + 2] = -160;
    }
    streakGeo.attributes.position.needsUpdate = true;

    // truck life: wheel spin + suspension bob + subtle sway
    if (!REDUCED) {
      for (const w of wheels) w.rotation.x -= SPEED * dt / 0.55;
      truck.position.y = Math.sin(t * 9) * 0.025;
      truck.rotation.z = Math.sin(t * 1.4) * 0.006;
      truck.rotation.y = Math.sin(t * 0.5) * 0.012;
    }

    stars.rotation.y = t * 0.004;

    // camera: mouse parallax + gentle drift + scroll pull-back
    const scroll = Math.min(window.scrollY / window.innerHeight, 1.4);
    const tx = CAM_BASE.x + mouse.x * 1.4 + Math.sin(t * 0.18) * 0.5;
    const ty = CAM_BASE.y - mouse.y * 0.7 + scroll * 3.2;
    const tz = CAM_BASE.z + scroll * 6;
    camera.position.x += (tx - camera.position.x) * 0.045;
    camera.position.y += (ty - camera.position.y) * 0.045;
    camera.position.z += (tz - camera.position.z) * 0.045;
    camera.lookAt(-1.2, 1.6 + scroll * -0.8, -6);

    renderer.render(scene, camera);
  });
}

/* ============================================================
   2. US DISPATCH ROUTE MAP (about visual)
   Dot-matrix USA, Phoenix hub, freight lanes arcing to major
   cities with light pulses traveling along them.
   ============================================================ */
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
  phoenix: [-112.07, 33.45],
  losangeles: [-118.24, 34.05],
  seattle: [-122.33, 47.60],
  denver: [-104.99, 39.74],
  dallas: [-96.80, 32.78],
  chicago: [-87.63, 41.88],
  atlanta: [-84.39, 33.75],
  miami: [-80.19, 25.76],
  newyork: [-74.00, 40.71],
};

function projectUS(lon, lat, s = 0.25) {
  return [ (lon + 98) * 0.777 * s, -(lat - 38) * s ];
}

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

export function initRouteMap(container) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 5.6, 8.2);
  camera.lookAt(0, -0.4, 0);

  const renderer = makeRenderer(container);
  autoResize(container, camera, renderer);

  const map = new THREE.Group();
  map.position.y = -0.6;
  scene.add(map);

  /* ---- dot-matrix USA ---- */
  const dots = [];
  const STEP = 0.21;
  for (let lon = -125; lon <= -66.5; lon += STEP / (0.777 * 0.25) * 0.25) {
    for (let lat = 25; lat <= 49.5; lat += STEP / 0.25 * 0.25) {
      if (pointInPolygon(lon, lat, US_OUTLINE)) {
        const [x, z] = projectUS(lon, lat);
        dots.push(x, 0, z);
      }
    }
  }
  const dotGeo = new THREE.CircleGeometry(0.052, 6);
  dotGeo.rotateX(-Math.PI / 2);
  const dotMesh = new THREE.InstancedMesh(
    dotGeo,
    new THREE.MeshBasicMaterial({ color: 0x37507a, transparent: true, opacity: 0.75 }),
    dots.length / 3
  );
  const dum = new THREE.Object3D();
  for (let i = 0; i < dots.length / 3; i++) {
    dum.position.set(dots[i * 3], 0, dots[i * 3 + 2]);
    dum.updateMatrix();
    dotMesh.setMatrixAt(i, dum.matrix);
  }
  map.add(dotMesh);

  /* ---- cities ---- */
  const cityPos = {};
  const cityMat = new THREE.MeshBasicMaterial({ color: 0x8ae9ff });
  const hubMat = new THREE.MeshBasicMaterial({ color: 0xffb31a });
  for (const [name, [lon, lat]] of Object.entries(CITIES)) {
    const [x, z] = projectUS(lon, lat);
    cityPos[name] = new THREE.Vector3(x, 0.03, z);
    const isHub = name === 'phoenix';
    const m = new THREE.Mesh(new THREE.SphereGeometry(isHub ? 0.13 : 0.075, 12, 12), isHub ? hubMat : cityMat);
    m.position.set(x, 0.05, z);
    map.add(m);
  }
  // pulsing ring on the Phoenix hub
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.16, 0.2, 32),
    new THREE.MeshBasicMaterial({ color: 0xffb31a, transparent: true, side: THREE.DoubleSide })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.copy(cityPos.phoenix).setY(0.04);
  map.add(ring);

  /* ---- freight lanes ---- */
  const LANES = [
    ['phoenix', 'losangeles'], ['phoenix', 'seattle'], ['phoenix', 'denver'],
    ['phoenix', 'dallas'], ['phoenix', 'chicago'], ['phoenix', 'atlanta'],
    ['phoenix', 'newyork'], ['dallas', 'miami'], ['chicago', 'newyork'],
  ];
  const pulses = [];
  const laneMat = new THREE.MeshBasicMaterial({
    color: 0x37d5ff, transparent: true, opacity: 0.32,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const pulseTex = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    grad.addColorStop(0, 'rgba(255,220,140,1)');
    grad.addColorStop(1, 'rgba(255,179,26,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  })();
  for (const [a, b] of LANES) {
    const pa = cityPos[a], pb = cityPos[b];
    const mid = pa.clone().add(pb).multiplyScalar(0.5);
    mid.y = 0.45 + pa.distanceTo(pb) * 0.16;
    const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
    map.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.012, 6, false), laneMat));
    for (let k = 0; k < 2; k++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: pulseTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      sp.scale.set(0.3, 0.3, 1);
      map.add(sp);
      pulses.push({ sprite: sp, curve, offset: Math.random(), speed: 0.1 + Math.random() * 0.1 });
    }
  }

  /* ---- ambience ---- */
  const dust = starField(180, 26, 0.12, 0x8ae9ff, 0.5);
  dust.position.y = -6;
  scene.add(dust);

  const mouse = { x: 0, y: 0 };
  container.addEventListener('pointermove', (e) => {
    const r = container.getBoundingClientRect();
    mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.y = ((e.clientY - r.top) / r.height) * 2 - 1;
  }, { passive: true });

  const v = new THREE.Vector3();
  runLoop(container, (dt, t) => {
    const speed = REDUCED ? 0 : 1;
    for (const p of pulses) {
      const u = (t * p.speed * speed + p.offset) % 1;
      p.curve.getPoint(u, v);
      p.sprite.position.copy(v);
      p.sprite.material.opacity = Math.sin(u * Math.PI);
    }
    const ringP = (t * 0.6) % 1;
    ring.scale.setScalar(1 + ringP * 2.2);
    ring.material.opacity = (1 - ringP) * 0.8;
    map.rotation.y += (mouse.x * 0.22 - map.rotation.y) * 0.05;
    map.rotation.x += (mouse.y * 0.1 - map.rotation.x) * 0.05;
    dust.rotation.y = t * 0.015 * speed;
    renderer.render(scene, camera);
  });
}

/* legacy name used by existing pages */
export const initCargoScene = initRouteMap;

/* ============================================================
   3. LIGHT PARTICLE HERO (inner pages)
   ============================================================ */
export function initParticleHero(container) {
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x04060d, 10, 70);
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 120);
  camera.position.set(0, 3.4, 14);

  const renderer = makeRenderer(container);
  autoResize(container, camera, renderer);

  // neon grid floor
  const grid = new THREE.GridHelper(140, 70, 0xffb31a, 0x1c2440);
  grid.material.transparent = true;
  grid.material.opacity = 0.4;
  scene.add(grid);

  const stars = starField(420, 130, 0.32, 0x9db8ff, 0.75);
  scene.add(stars);
  const embers = starField(140, 60, 0.4, 0xffb31a, 0.7);
  embers.position.y = -4;
  scene.add(embers);

  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  runLoop(container, (dt, t) => {
    const speed = REDUCED ? 0 : 1;
    grid.position.z = (t * 3.2 * speed) % 2;
    stars.rotation.y = t * 0.008 * speed;
    embers.rotation.y = -t * 0.02 * speed;
    camera.position.x += (mouse.x * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (3.4 - mouse.y * 0.8 - camera.position.y) * 0.04;
    camera.lookAt(0, 1.6, 0);
    renderer.render(scene, camera);
  });
}
