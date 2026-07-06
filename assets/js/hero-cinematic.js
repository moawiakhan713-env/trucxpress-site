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

/* ---------- procedural semi (fallback when no GLB) ---------- */
function buildTruck(env) {
  const truck = new THREE.Group();

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
  truck.add(trailer);

  // side skirts + underride
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.55, TW - 0.2), darkTrim);
  skirt.position.set(-2.2, 0.78, 0);
  truck.add(skirt);
  const rearBar = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, TW - 0.5), darkTrim);
  rearBar.position.set(-6.75, 0.55, 0);
  truck.add(rearBar);

  // marker lights on trailer edge
  const marker = new THREE.MeshBasicMaterial({ color: 0xffb31a });
  for (let i = 0; i < 6; i++) {
    for (const z of [TW / 2 + 0.01, -TW / 2 - 0.01]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.05), marker);
      m.position.set(-6.2 + i * 1.85, 1.18, z);
      m.rotation.y = z > 0 ? 0 : Math.PI;
      truck.add(m);
    }
  }

  /* ----- tractor (front at +X) ----- */
  const tractor = new THREE.Group();
  tractor.position.x = 4.15;
  truck.add(tractor);

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
  const wheels = [];
  function wheel(x, dual) {
    for (const zs of dual ? [0.78, -0.78] : [0.85, -0.85]) {
      const wg = new THREE.Group();
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, dual ? 0.62 : 0.42, 28), tireMat);
      tire.rotation.x = Math.PI / 2;
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, (dual ? 0.62 : 0.42) + 0.02, 20), chrome);
      hub.rotation.x = Math.PI / 2;
      wg.add(tire, hub);
      wg.position.set(x, 0.53, zs);
      truck.add(wg);
      wheels.push(wg);
    }
  }
  wheel(6.1, false);                    // steer
  wheel(3.05, true); wheel(2.0, true);  // drive tandem
  wheel(-5.3, true); wheel(-6.35, true);// trailer tandem

  // taillights
  const tail = new THREE.MeshBasicMaterial({ color: 0xff2d2d });
  for (const z of [0.9, -0.9]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.22), tail);
    t.position.set(-6.81, 1.3, z);
    t.rotation.y = -Math.PI / 2;
    truck.add(t);
  }

  return { truck, wheels, headlights };
}

/* ---------- optional photoreal GLB ---------- */
function tryLoadGlb(url) {
  return fetch(url, { method: 'HEAD' })
    .then((r) => {
      if (!r.ok) throw 0;
      return new Promise((resolve, reject) => new GLTFLoader().load(url, resolve, undefined, reject));
    })
    .then((gltf) => {
      const model = gltf.scene;
      // normalize: longest axis -> X, length ~13.4, wheels on ground
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      if (size.z > size.x) model.rotation.y = Math.PI / 2;
      const box2 = new THREE.Box3().setFromObject(model);
      const s2 = box2.getSize(new THREE.Vector3());
      const scale = 13.4 / Math.max(s2.x, s2.z);
      model.scale.setScalar(scale);
      const box3 = new THREE.Box3().setFromObject(model);
      model.position.y -= box3.min.y;
      model.position.x -= (box3.min.x + box3.max.x) / 2;
      return model;
    });
}

/* ============================================================ */
export function initCinematicHero(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x5b3a28, 55, 190);

  const camera = new THREE.PerspectiveCamera(34, container.clientWidth / container.clientHeight, 0.1, 400);

  // soft studio reflections for the chrome & paint
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  /* ---- sky dome ---- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(320, 32, 24),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: { },
      vertexShader: `
        varying vec3 vPos;
        void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `
        varying vec3 vPos;
        void main() {
          float h = clamp(vPos.y / 320.0, -0.06, 1.0);
          vec3 horizon = vec3(1.00, 0.79, 0.52);
          vec3 mid     = vec3(0.86, 0.45, 0.24);
          vec3 top     = vec3(0.10, 0.13, 0.27);
          vec3 col = h < 0.16 ? mix(horizon, mid, smoothstep(-0.02, 0.16, h))
                              : mix(mid, top, smoothstep(0.16, 0.7, h));
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
  sunGlow.position.set(26, 7, -60);
  scene.add(sunGlow);
  const sunCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialGlowTexture('rgba(255,255,245,1)', 'rgba(255,220,150,0)'),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  sunCore.scale.set(16, 16, 1);
  sunCore.position.copy(sunGlow.position);
  scene.add(sunCore);

  /* ---- lights ---- */
  scene.add(new THREE.HemisphereLight(0xffc890, 0x1c1410, 0.55));
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.6);
  sun.position.set(26, 8, -40);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x8093c0, 0.35);
  fill.position.set(-14, 10, 22);
  scene.add(fill);

  /* ---- ground ---- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ color: 0x191a20, roughness: 0.32, metalness: 0.55, envMapIntensity: 0.55 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // contact shadow blob under the rig
  const blob = new THREE.Mesh(
    new THREE.PlaneGeometry(17, 4.6),
    new THREE.MeshBasicMaterial({ map: contactShadowTexture(), transparent: true, depthWrite: false, opacity: 0.85 })
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.012;
  scene.add(blob);

  /* ---- truck (GLB if provided, else procedural) ---- */
  const rig = new THREE.Group();
  scene.add(rig);
  let wheels = [], headlights = [];
  const proc = buildTruck();
  rig.add(proc.truck);
  wheels = proc.wheels;
  headlights = proc.headlights;

  tryLoadGlb('assets/models/truck.glb').then((model) => {
    rig.remove(proc.truck);
    rig.add(model);
    wheels = [];
    headlights = [];
  }).catch(() => { /* keep procedural truck */ });

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

  /* ---- camera poses ---- */
  const POSES = [
    { pos: new THREE.Vector3(1.2, 2.7, 20.6), look: new THREE.Vector3(-3.1, 3.35, 0), fov: 33 }, // side profile, truck low-right
    { pos: new THREE.Vector3(11.6, 1.35, 9.0), look: new THREE.Vector3(4.6, 1.5, 0), fov: 30 }, // front 3/4 into the sun
    { pos: new THREE.Vector3(-6.5, 5.2, 10.5), look: new THREE.Vector3(4.0, 1.2, 0), fov: 40 }, // high rear as it departs
  ];
  const cur = { pos: POSES[0].pos.clone(), look: POSES[0].look.clone(), fov: POSES[0].fov };
  const tPos = new THREE.Vector3(), tLook = new THREE.Vector3();
  const smooth = (t) => t * t * (3 - 2 * t);

  let pSm = 0;
  const clock = new THREE.Clock();
  let rafId = null;

  function frame() {
    if (document.hidden) { rafId = null; return; }
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    const p = REDUCED ? 0 : (window.__heroP || 0);
    pSm += (p - pSm) * Math.min(6 * dt, 1);

    // pose interpolation across the two segments
    let fov;
    if (pSm < 0.5) {
      const k = smooth(pSm / 0.5);
      tPos.lerpVectors(POSES[0].pos, POSES[1].pos, k);
      tLook.lerpVectors(POSES[0].look, POSES[1].look, k);
      fov = POSES[0].fov + (POSES[1].fov - POSES[0].fov) * k;
    } else {
      const k = smooth((pSm - 0.5) / 0.5);
      tPos.lerpVectors(POSES[1].pos, POSES[2].pos, k);
      tLook.lerpVectors(POSES[1].look, POSES[2].look, k);
      fov = POSES[1].fov + (POSES[2].fov - POSES[1].fov) * k;
    }

    // departure: truck pulls away toward the sun in the last stretch
    const drive = Math.max(0, (pSm - 0.68) / 0.32);
    const driveEase = drive * drive;
    rig.position.x = driveEase * 26;
    blob.position.x = rig.position.x;
    tLook.x += rig.position.x * 0.55;

    // camera with gentle parallax + idle drift
    camera.position.set(
      tPos.x + mouse.x * 0.5 + Math.sin(t * 0.16) * 0.18,
      tPos.y - mouse.y * 0.25 + Math.sin(t * 0.21) * 0.08,
      tPos.z
    );
    camera.lookAt(tLook);
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }

    // truck life: idle bob + wheels
    const speed = REDUCED ? 0 : 2.2 + driveEase * 46;
    for (const w of wheels) w.rotation.z -= (speed * dt) / 0.53;
    rig.position.y = Math.sin(t * 7) * 0.008 * (1 + driveEase * 2);

    // sun swells as the camera swings into it, headlights rise at dusk phase
    const sunBoost = 1 + Math.sin(Math.min(pSm * 2, 1) * Math.PI) * 0.55;
    sunGlow.scale.set(60 * sunBoost, 60 * sunBoost, 1);
    sunGlow.material.opacity = 0.75 + 0.25 * sunBoost;

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && rafId === null) frame();
  });
  frame();
}
