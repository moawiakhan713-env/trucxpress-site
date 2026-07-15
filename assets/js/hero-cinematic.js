/* ============================================================
   TRUCXPRESS — cinematic scroll hero
   Sunset-yard scene in the style of high-end scroll sites:
   photodark semi in side profile, warm horizon, glossy ground,
   and a camera that sweeps through three phases driven by the
   pinned-scroll progress that main.js writes to window.__heroP.

   Drop a photoreal model at assets/models/truck.glb and it is
   used automatically in place of the procedural truck.
   ============================================================ */
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { DRACOLoader } from '../vendor/DRACOLoader.js';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- helpers ---------- */
function radialGlowTexture(inner, outer) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 4, 128, 128, 126);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function trailerSideTexture(mirror) {
  const W = 2048, H = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');

  g.fillStyle = '#c9cfda';
  g.fillRect(0, 0, W, H);
  // vertical ribs
  for (let x = 0; x < W; x += 26) {
    g.fillStyle = 'rgba(70,80,100,0.18)';
    g.fillRect(x, 0, 3, H);
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.fillRect(x + 3, 0, 2, H);
  }
  // top and bottom rails
  g.fillStyle = '#9aa3b4';
  g.fillRect(0, 0, W, 14);
  g.fillRect(0, H - 46, W, 46);
  g.fillStyle = '#7c8598';
  g.fillRect(0, H - 46, W, 6);
  // amber accent stripe
  g.fillStyle = '#f2a41d';
  g.fillRect(0, H - 74, W, 18);

  // brand
  g.save();
  if (mirror) { g.translate(W, 0); g.scale(-1, 1); }
  g.font = 'italic 900 190px "Space Grotesk", "Arial Black", sans-serif';
  g.textBaseline = 'middle';
  const tx = 170, ty = H / 2 - 26;
  g.lineWidth = 14;
  g.strokeStyle = 'rgba(255,255,255,0.65)';
  g.strokeText('TRUCXPRESS', tx, ty);
  g.fillStyle = '#1b2438';
  g.fillText('TRUCXPRESS', tx, ty);
  g.font = '600 44px "Inter", sans-serif';
  g.fillStyle = '#5a6478';
  g.fillText('WHERE LOGISTICS MEETS RELIABILITY', tx + 8, ty + 138);
  g.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function contactShadowTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(256, 64, 8, 256, 64, 250);
  grad.addColorStop(0, 'rgba(0,0,0,0.85)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.45)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.save();
  g.translate(256, 64);
  g.scale(1, 0.25);
  g.translate(-256, -64);
  g.fillStyle = grad;
  g.beginPath();
  g.arc(256, 64, 250, 0, Math.PI * 2);
  g.fill();
  g.restore();
  return new THREE.CanvasTexture(c);
}

function dockGridTexture() {
  const S = 1024;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d');
  g.fillStyle = '#070a12';
  g.fillRect(0, 0, S, S);
  const N = 7, cell = S / N, gap = 10;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const x = i * cell + gap, y = j * cell + gap, w = cell - gap * 2;
      const grad = g.createLinearGradient(x, y, x + w, y + w);
      grad.addColorStop(0, '#141a29');
      grad.addColorStop(1, '#0b0f1a');
      g.fillStyle = grad;
      g.fillRect(x, y, w, w);
      g.strokeStyle = 'rgba(90,110,150,0.25)';
      g.lineWidth = 2;
      g.strokeRect(x, y, w, w);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(5, 3.5);
  return t;
}

function gatesTexture() {
  const W = 4096, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  // warm wall
  const wall = g.createLinearGradient(0, 0, 0, H);
  wall.addColorStop(0, '#d99976');
  wall.addColorStop(1, '#b06b4c');
  g.fillStyle = wall;
  g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(40,20,15,0.5)';
  g.fillRect(0, 0, W, 46);
  const BAYS = 10, bw = W / BAYS;
  for (let i = 0; i < BAYS; i++) {
    const x = i * bw;
    // roller door inset
    const dx = x + bw * 0.14, dw = bw * 0.72, dy = H * 0.3, dh = H * 0.66;
    const door = g.createLinearGradient(0, dy, 0, dy + dh);
    door.addColorStop(0, '#8a5340');
    door.addColorStop(1, '#5f3628');
    g.fillStyle = door;
    g.fillRect(dx, dy, dw, dh);
    g.strokeStyle = 'rgba(30,15,10,0.55)';
    g.lineWidth = 3;
    for (let s = 1; s < 9; s++) {
      g.beginPath(); g.moveTo(dx, dy + (dh / 9) * s); g.lineTo(dx + dw, dy + (dh / 9) * s); g.stroke();
    }
    g.strokeRect(dx, dy, dw, dh);
    // bay separator
    g.fillStyle = 'rgba(45,22,16,0.8)';
    g.fillRect(x, 46, 8, H);
    // big number
    g.font = '900 200px "Space Grotesk", "Arial Black", sans-serif';
    g.fillStyle = '#f7e8dc';
    g.shadowColor = 'rgba(0,0,0,0.35)';
    g.shadowBlur = 14;
    g.fillText(String(i + 1), x + bw * 0.16, H * 0.24);
    g.shadowBlur = 0;
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/* ---------- procedural semi (tractor is swapped for the GLB) ---------- */
function buildTruck(env) {
  const truck = new THREE.Group();
  const trailerG = new THREE.Group();
  trailerG.scale.setScalar(0.86);   // keep the box proportional to the tractor
  const tractor = new THREE.Group();
  tractor.position.x = 4.15;
  truck.add(trailerG, tractor);
  const tractorWheels = [];
  const trailerWheels = [];

  const paint = new THREE.MeshStandardMaterial({ color: 0x16233c, roughness: 0.32, metalness: 0.75, envMapIntensity: 1.0 });
  const darkTrim = new THREE.MeshStandardMaterial({ color: 0x0b0e15, roughness: 0.55, metalness: 0.6, envMapIntensity: 0.6 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd9dee8, roughness: 0.1, metalness: 1.0, envMapIntensity: 1.5 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x0a1220, roughness: 0.05, metalness: 0.9, envMapIntensity: 1.4 });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0c11, roughness: 0.95, metalness: 0.0 });

  /* ----- trailer (along X, rear at -X) ----- */
  const TL = 10.4, TH = 2.75, TW = 2.55;
  const sideTex = trailerSideTexture(false);
  const sideTexM = trailerSideTexture(true);
  const trailerWhite = new THREE.MeshStandardMaterial({ color: 0xc9cfda, roughness: 0.55, metalness: 0.25, envMapIntensity: 0.4 });
  const trailerSide = new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.5, metalness: 0.3, envMapIntensity: 0.45 });
  const trailerSideM = new THREE.MeshStandardMaterial({ map: sideTexM, roughness: 0.5, metalness: 0.3, envMapIntensity: 0.45 });
  const trailer = new THREE.Mesh(
    new THREE.BoxGeometry(TL, TH, TW),
    [trailerWhite, trailerWhite, trailerWhite, darkTrim, trailerSide, trailerSideM]
  );
  trailer.position.set(-1.6, 1.62 + TH / 2 - 1.05, 0);
  trailer.position.y = 1.05 + TH / 2;
  trailerG.add(trailer);

  // side skirts + underride
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.55, TW - 0.2), darkTrim);
  skirt.position.set(-2.2, 0.78, 0);
  trailerG.add(skirt);
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, TW - 0.5), darkTrim);
  rearBar.position.set(-6.75, 0.55, 0);
  trailerG.add(rearBar);

  // marker lights on trailer edge
  const marker = new THREE.MeshBasicMaterial({ color: 0xffb31a });
  for (let i = 0; i < 6; i++) {
    for (const z of [TW / 2 + 0.01, -TW / 2 - 0.01]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), marker);
      m.position.set(-6.2 + i * 1.85, 1.18, z);
      m.rotation.y = z > 0 ? 0 : Math.PI;
      trailerG.add(m);
    }
  }

  /* ----- tractor (front at +X) ----- */
  // frame
  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.32, 1.05), darkTrim);
  frame.position.set(-0.4, 0.72, 0);
  tractor.add(frame);

  // hood (slightly tapered look via two boxes)
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.98, 1.78), paint);
  hood.position.set(1.32, 1.42, 0);
  tractor.add(hood);
  const hoodTop = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.2, 1.5), paint);
  hoodTop.position.set(1.32, 1.98, 0);
  tractor.add(hoodTop);

  // cab + sleeper
  const cab = new THREE.Mesh(new THREE.BoxGeometry(1.55, 1.75, 2.15), paint);
  cab.position.set(0.05, 2.0, 0);
  tractor.add(cab);
  const sleeper = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.1, 2.05), paint);
  sleeper.position.set(-1.3, 2.15, 0);
  tractor.add(sleeper);
  // roof fairing
  const fairing = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.85, 1.95), paint);
  fairing.position.set(-1.28, 3.4, 0);
  fairing.rotation.z = -0.18;
  tractor.add(fairing);

  // windshield + side glass
  const shield = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.8, 1.9), glass);
  shield.position.set(0.86, 2.42, 0);
  shield.rotation.z = -0.22;
  tractor.add(shield);
  for (const z of [1.09, -1.09]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.62), glass);
    win.position.set(0.02, 2.35, z);
    win.rotation.y = z > 0 ? 0 : Math.PI;
    tractor.add(win);
  }

  // grille, bumper, headlights, tanks, stacks, mirrors
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.75, 1.35), chrome);
  grille.position.set(2.22, 1.35, 0);
  tractor.add(grille);
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.42, 1.95), chrome);
  bumper.position.set(2.28, 0.78, 0);
  tractor.add(bumper);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2cc });
  const headlights = [];
  for (const z of [0.72, -0.72]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.3), lightMat);
    hl.position.set(2.3, 1.05, z);
    tractor.add(hl);
    headlights.push(hl);
  }
  for (const z of [0.62, -0.62]) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.5, 20), chrome);
    tank.rotation.z = Math.PI / 2;
    tank.position.set(-0.5, 0.78, z * 1.55);
    tractor.add(tank);
  }
  for (const z of [0.95, -0.95]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 14), chrome);
    stack.position.set(-2.12, 2.6, z);
    tractor.add(stack);
  }
  for (const z of [1.18, -1.18]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.3), darkTrim);
    arm.position.set(0.75, 2.75, z);
    tractor.add(arm);
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 0.22), darkTrim);
    mir.position.set(0.75, 2.45, z + (z > 0 ? 0.12 : -0.12));
    tractor.add(mir);
  }

  /* ----- wheels ----- */
  function wheel(x, dual, group, list) {
    for (const zs of dual ? [0.78, -0.78] : [0.85, -0.85]) {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, dual ? 0.62 : 0.42, 28), tireMat);
      tire.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, (dual ? 0.62 : 0.42) + 0.02, 20), chrome);
      hub.rotation.x = Math.PI / 2;
      wg.add(tire, hub);
      wg.position.set(x, 0.53, zs);
      group.add(wg);
      list.push(wg);
    }
  }
  // tractor wheels live in world-truck coords, so park them in a holder
  const tractorRolling = new THREE.Group();
  truck.add(tractorRolling);
  wheel(6.1, false, tractorRolling, tractorWheels);                       // steer
  wheel(3.05, true, tractorRolling, tractorWheels);
  wheel(2.0, true, tractorRolling, tractorWheels);                        // drive tandem
  wheel(-5.3, true, trailerG, trailerWheels);
  wheel(-6.35, true, trailerG, trailerWheels);                            // trailer tandem

  // taillights
  const tail = new THREE.MeshBasicMaterial({ color: 0xff2d2d });
  for (const z of [0.9, -0.9]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.22), tail);
    t.position.set(-6.81, 1.3, z);
    t.rotation.y = -Math.PI / 2;
    trailerG.add(t);
  }

  return { truck, tractor, tractorRolling, trailerWheels, tractorWheels, headlights };
}

/* ---------- photoreal tractor GLB (assets/models/truck.glb) ---------- */
const GLB_ROT_Y = Math.PI / 2;   // extra yaw if the model faces the wrong way
const GLB_LENGTH = 5.6;          // target tractor length in scene units
const GLB_REAR_X = 0.9;          // where the tractor's rear lands (under trailer nose)

function loadTractorGlb(url) {
  return fetch(url, { method: 'HEAD' })
    .then((r) => {
      if (!r.ok) throw 0;
      const draco = new DRACOLoader().setDecoderPath('assets/vendor/draco/gltf/');
      const loader = new GLTFLoader().setDRACOLoader(draco);
      return new Promise((resolve, reject) => loader.load(url, resolve, undefined, reject));
    })
    .then((gltf) => {
      const model = gltf.scene;
      const holder = new THREE.Group();
      holder.add(model);
      // longest horizontal axis -> X
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (size.z > size.x) model.rotation.y = GLB_ROT_Y;
      // scale to tractor length
      const box2 = new THREE.Box3().setFromObject(model);
      const s2 = box2.getSize(new THREE.Vector3());
      const scale = GLB_LENGTH / Math.max(s2.x, s2.z);
      model.scale.setScalar(scale);
      // ground it and park its rear at the trailer nose
      const box3 = new THREE.Box3().setFromObject(model);
      model.position.y -= box3.min.y;
      model.position.x -= box3.min.x - GLB_REAR_X;
      model.traverse((o) => {
        if (o.isMesh && o.material) {
          o.material.envMapIntensity = 1.1;
        }
      });
      return holder;
    });
}

/* ============================================================
   The journey: sunset yard -> night dock grid -> numbered gates.
   Scroll progress (window.__heroP) drives the truck down the path
   and the camera through six keyframed shots while sky, fog and
   light palettes crossfade between zones.
   ============================================================ */
export function initCinematicHero(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x5b3a28, 55, 200);

  const camera = new THREE.PerspectiveCamera(34, container.clientWidth / container.clientHeight, 0.1, 500);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ---- sky dome with tweenable palette ---- */
  const skyUniforms = {
    uHorizon: { value: new THREE.Color(1.0, 0.79, 0.52) },
    uMid: { value: new THREE.Color(0.86, 0.45, 0.24) },
    uTop: { value: new THREE.Color(0.10, 0.13, 0.27) },
  };
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(380, 32, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: skyUniforms,
      vertexShader: `
        varying vec3 vPos;
        void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        uniform vec3 uHorizon; uniform vec3 uMid; uniform vec3 uTop;
        varying vec3 vPos;
        void main() {
          float h = clamp(vPos.y / 380.0, -0.06, 1.0);
          vec3 col = h < 0.16 ? mix(uHorizon, uMid, smoothstep(-0.02, 0.16, h))
                              : mix(uMid, uTop, smoothstep(0.16, 0.7, h));
          gl_FragColor = vec4(col, 1.0);
        }`,
    })
  );
  scene.add(sky);

  /* ---- sun ---- */
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialGlowTexture('rgba(255,236,200,1)', 'rgba(255,150,60,0)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.95,
  }));
  sunGlow.scale.set(60, 60, 1);
  sunGlow.position.set(26, 7, -70);
  scene.add(sunGlow);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialGlowTexture('rgba(255,255,245,1)', 'rgba(255,220,150,0)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sunCore.scale.set(16, 16, 1);
  sunCore.position.copy(sunGlow.position);
  scene.add(sunCore);

  /* ---- lights ---- */
  const hemi = new THREE.HemisphereLight(0xffc890, 0x1c1410, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.6);
  sun.position.set(26, 8, -40);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8093c0, 0.35);
  fill.position.set(-14, 10, 22);
  scene.add(fill);

  /* ---- ground ---- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(900, 700),
    new THREE.MeshStandardMaterial({ color: 0x191a20, roughness: 0.32, metalness: 0.55, envMapIntensity: 0.55 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.x = 100;
  scene.add(ground);

  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 4.6),
    new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  scene.add(blob);

  /* ---- ZONE 2: night dock-roof grid (around x = 62) ---- */
  const dock = new THREE.Mesh(
    new THREE.PlaneGeometry(95, 92),
    new THREE.MeshStandardMaterial({ map: dockGridTexture(), roughness: 0.85, metalness: 0.2, transparent: true })
  );
  dock.rotation.x = -Math.PI / 2;
  dock.position.set(76, 0.02, 0);
  scene.add(dock);
  const blockMat = new THREE.MeshStandardMaterial({ color: 0x0d1119, roughness: 0.8, metalness: 0.3 });
  for (let i = 0; i < 6; i++) {
    for (const z of [-15, 15]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(9, 3.6 + (i % 3), 9), blockMat);
      b.position.set(30 + i * 12.5, (3.6 + (i % 3)) / 2, z + (i % 2 ? 2 : -2));
      scene.add(b);
    }
  }
  // guide lane lights through the dock
  const laneMat = new THREE.MeshBasicMaterial({ color: 0x37d5ff, transparent: true, opacity: 0.35 });
  for (const z of [-2.6, 2.6]) {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(88, 0.03, 0.12), laneMat);
    lane.position.set(60, 0.03, z);
    scene.add(lane);
  }

  /* ---- ZONE 3: numbered gate bays (around x = 118) ---- */
  const gates = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 8),
    new THREE.MeshStandardMaterial({ map: gatesTexture(), roughness: 0.8, metalness: 0.05 })
  );
  gates.position.set(120, 4, -8.2);
  scene.add(gates);
  // apron in front of the gates
  const apron = new THREE.Mesh(
    new THREE.PlaneGeometry(54, 16),
    new THREE.MeshStandardMaterial({ color: 0x23252d, roughness: 0.5, metalness: 0.35 })
  );
  apron.rotation.x = -Math.PI / 2;
  apron.position.set(120, 0.015, -0.5);
  scene.add(apron);
  // parked trailers backed into a few bays
  const parkedMat = new THREE.MeshStandardMaterial({ color: 0xc4c9d4, roughness: 0.6, metalness: 0.2 });
  const parkedDark = new THREE.MeshStandardMaterial({ color: 0x101319, roughness: 0.7 });
  for (const bx of [101.5, 112.5, 133.5]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(2.3, 2.4, 7.8), parkedMat);
    t.position.set(bx, 2.15, -4.4);
    scene.add(t);
    const u = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.95, 7.4), parkedDark);
    u.position.set(bx, 0.5, -4.4);
    scene.add(u);
  }
  // warm gate spill lights
  for (const gx of [108, 120, 132]) {
    const gl = new THREE.PointLight(0xffb37a, 14, 26, 2);
    gl.position.set(gx, 5.5, -4);
    scene.add(gl);
  }

  /* ---- truck ---- */
  const rig = new THREE.Group();
  scene.add(rig);
  const proc = buildTruck();
  rig.add(proc.truck);
  let wheels = [...proc.trailerWheels, ...proc.tractorWheels];

  loadTractorGlb('assets/models/truck.glb').then((tractorModel) => {
    proc.truck.remove(proc.tractor);
    proc.truck.remove(proc.tractorRolling);
    proc.truck.add(tractorModel);
    wheels = [...proc.trailerWheels];
  }).catch(() => { /* keep procedural tractor */ });

  /* ---- interaction ---- */
  const mouse = { x: 0, y: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });

  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  /* ---- journey definition ---- */
  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
  const TRUCK_END = 118;
  const truckX = (p) => TRUCK_END * smooth(clamp01((p - 0.16) / 0.66));

  // keyframed shots; positions may reference the truck (tx)
  const SHOTS = [
    { p: 0.00, fov: 33, pos: (tx) => [1.2, 2.7, 21.8],            look: (tx) => [-2.0, 3.55, 0] },
    { p: 0.24, fov: 32, pos: (tx) => [tx + 10, 1.9, 14.5],        look: (tx) => [tx + 2, 2.2, 0] },
    { p: 0.50, fov: 38, pos: (tx) => [tx - 5, 30, 5],             look: (tx) => [tx + 8, 0, -1] },
    { p: 0.70, fov: 32, pos: (tx) => [tx + 15, 2.8, 13.5],        look: (tx) => [tx + 2.5, 2.6, -2] },
    { p: 0.88, fov: 34, pos: (tx) => [tx + 8, 1.6, 11],           look: (tx) => [tx - 0.5, 3.0, -5.5] },
    { p: 1.00, fov: 39, pos: (tx) => [tx + 2, 9.5, 20],           look: (tx) => [tx - 2, 2, -6] },
  ];

  // zone palettes: sunset yard / night dock / warm gates
  const PAL = [
    { horizon: new THREE.Color(1.00, 0.79, 0.52), mid: new THREE.Color(0.86, 0.45, 0.24), top: new THREE.Color(0.10, 0.13, 0.27),
      fog: new THREE.Color(0x5b3a28), sunI: 2.6, sunC: new THREE.Color(0xffd9a8), hemiI: 0.55, glow: 1.0 },
    { horizon: new THREE.Color(0.13, 0.17, 0.27), mid: new THREE.Color(0.05, 0.07, 0.13), top: new THREE.Color(0.01, 0.02, 0.06),
      fog: new THREE.Color(0x080b13), sunI: 0.55, sunC: new THREE.Color(0x9db4e6), hemiI: 0.35, glow: 0.08 },
    { horizon: new THREE.Color(1.00, 0.70, 0.50), mid: new THREE.Color(0.72, 0.40, 0.30), top: new THREE.Color(0.16, 0.11, 0.16),
      fog: new THREE.Color(0x6b4434), sunI: 1.5, sunC: new THREE.Color(0xffc190), hemiI: 0.6, glow: 0.45 },
  ];
  const mixed = { horizon: new THREE.Color(), mid: new THREE.Color(), top: new THREE.Color(), fog: new THREE.Color(), sunC: new THREE.Color() };

  const tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
  let pSm = 0, prevX = 0;
  const clock = new THREE.Clock();
  let rafId = null;

  // stop burning GPU once the hero is scrolled out of view
  let onScreen = true;
  new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    if (onScreen && rafId === null) frame();
  }, { threshold: 0.01 }).observe(container);

  function frame() {
    if (document.hidden || !onScreen) { rafId = null; return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    const p = REDUCED ? 0 : (window.__heroP || 0);
    pSm += (p - pSm) * Math.min(6 * dt, 1);

    // truck along the path
    const tx = truckX(pSm);
    rig.position.x = tx;
    blob.position.x = tx;
    const speed = Math.max(0, (tx - prevX) / Math.max(dt, 1e-4));
    prevX = tx;

    // camera keyframes
    let a = SHOTS[0], b = SHOTS[1];
    for (let i = 0; i < SHOTS.length - 1; i++) {
      if (pSm >= SHOTS[i].p && pSm <= SHOTS[i + 1].p) { a = SHOTS[i]; b = SHOTS[i + 1]; break; }
      if (pSm > SHOTS[SHOTS.length - 1].p) { a = b = SHOTS[SHOTS.length - 1]; }
    }
    const k = a === b ? 1 : smooth((pSm - a.p) / (b.p - a.p));
    const pa = a.pos(tx), pb = b.pos(tx), la = a.look(tx), lb = b.look(tx);
    tPos.set(pa[0] + (pb[0] - pa[0]) * k, pa[1] + (pb[1] - pa[1]) * k, pa[2] + (pb[2] - pa[2]) * k);
    tLook.set(la[0] + (lb[0] - la[0]) * k, la[1] + (lb[1] - la[1]) * k, la[2] + (lb[2] - la[2]) * k);
    const fov = a.fov + (b.fov - a.fov) * k;

    camera.position.set(
      tPos.x + mouse.x * 0.5 + Math.sin(t * 0.16) * 0.18,
      tPos.y - mouse.y * 0.25 + Math.sin(t * 0.21) * 0.08,
      tPos.z
    );
    camera.lookAt(tLook);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // zone palette mix: w0 sunset, w1 dock, w2 gates
    const w1 = smooth(clamp01((pSm - 0.26) / 0.16)) * (1 - smooth(clamp01((pSm - 0.56) / 0.14)));
    const w2 = smooth(clamp01((pSm - 0.56) / 0.14));
    const w0 = Math.max(0, 1 - w1 - w2);
    for (const key of ['horizon', 'mid', 'top', 'fog']) {
      mixed[key].setRGB(
        PAL[0][key].r * w0 + PAL[1][key].r * w1 + PAL[2][key].r * w2,
        PAL[0][key].g * w0 + PAL[1][key].g * w1 + PAL[2][key].g * w2,
        PAL[0][key].b * w0 + PAL[1][key].b * w1 + PAL[2][key].b * w2
      );
    }
    skyUniforms.uHorizon.value.copy(mixed.horizon);
    skyUniforms.uMid.value.copy(mixed.mid);
    skyUniforms.uTop.value.copy(mixed.top);
    scene.fog.color.copy(mixed.fog);
    sun.intensity = PAL[0].sunI * w0 + PAL[1].sunI * w1 + PAL[2].sunI * w2;
    mixed.sunC.setRGB(
      PAL[0].sunC.r * w0 + PAL[1].sunC.r * w1 + PAL[2].sunC.r * w2,
      PAL[0].sunC.g * w0 + PAL[1].sunC.g * w1 + PAL[2].sunC.g * w2,
      PAL[0].sunC.b * w0 + PAL[1].sunC.b * w1 + PAL[2].sunC.b * w2
    );
    sun.color.copy(mixed.sunC);
    hemi.intensity = PAL[0].hemiI * w0 + PAL[1].hemiI * w1 + PAL[2].hemiI * w2;
    const glow = PAL[0].glow * w0 + PAL[1].glow * w1 + PAL[2].glow * w2;
    sunGlow.material.opacity = 0.95 * glow;
    sunCore.material.opacity = glow;
    // sun follows the journey so it always sits near the horizon ahead
    sunGlow.position.set(26 + tx * 0.9, 7, -70);
    sunCore.position.copy(sunGlow.position);
    sun.position.set(26 + tx * 0.9, 8, -40);

    // wheels + idle bob
    const wheelSpeed = REDUCED ? 0 : Math.max(speed, 1.6 * w0);
    for (const w of wheels) w.rotation.z -= (wheelSpeed * dt) / 0.53;
    rig.position.y = Math.sin(t * 7) * 0.008 * (1 + Math.min(speed * 0.08, 2));

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && rafId === null) frame();
  });
  frame();
}
