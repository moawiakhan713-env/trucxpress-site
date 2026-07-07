/* ============================================================
   TRUCXPRESS — side companion robot (vanilla Three.js port of a
   react-three-fiber RobotHero). Transparent background, docked in
   a fixed side column, rides a zig-zag path as the page scrolls,
   head follows the cursor, blinks, and shows heart-eyes on click.
   ============================================================ */
import * as THREE from 'three';

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- speckled chassis texture ---------- */
function makeSpeckleTextures() {
  const size = 512;
  const cC = document.createElement('canvas');
  const cB = document.createElement('canvas');
  cC.width = cB.width = cC.height = cB.height = size;
  const gC = cC.getContext('2d');
  const gB = cB.getContext('2d');
  gC.fillStyle = '#dcdcdc'; gC.fillRect(0, 0, size, size);
  gB.fillStyle = '#808080'; gB.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = 0.5 + Math.random() * 1.5;
    const dark = Math.random() > 0.15;
    gC.beginPath(); gC.arc(x, y, r, 0, Math.PI * 2);
    gC.fillStyle = dark ? '#222222' : '#dddddd'; gC.fill();
    gB.beginPath(); gB.arc(x, y, r, 0, Math.PI * 2);
    gB.fillStyle = dark ? '#000000' : '#ffffff'; gB.fill();
  }
  const tC = new THREE.CanvasTexture(cC);
  const tB = new THREE.CanvasTexture(cB);
  for (const t of [tC, tB]) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 3);
  }
  return { colorMap: tC, bumpMap: tB };
}

/* ---------- heart curve for the loved eyes ---------- */
class HeartCurve extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    t = t * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return target.set(x * 0.002, (y + 6) * 0.002, 0);
  }
}
const heartCurve = new HeartCurve();

/* ---------- rounded-bracket eye paths ---------- */
function eyePaths() {
  const w = 0.025, h = 0.035, r = 0.02, g = 0.005;
  const top = new THREE.CurvePath();
  top.add(new THREE.LineCurve3(new THREE.Vector3(-w, g, 0), new THREE.Vector3(-w, h - r, 0)));
  top.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-w, h - r, 0), new THREE.Vector3(-w, h, 0), new THREE.Vector3(-w + r, h, 0)));
  top.add(new THREE.LineCurve3(new THREE.Vector3(-w + r, h, 0), new THREE.Vector3(w - r, h, 0)));
  top.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(w - r, h, 0), new THREE.Vector3(w, h, 0), new THREE.Vector3(w, h - r, 0)));
  top.add(new THREE.LineCurve3(new THREE.Vector3(w, h - r, 0), new THREE.Vector3(w, g, 0)));
  const bot = new THREE.CurvePath();
  bot.add(new THREE.LineCurve3(new THREE.Vector3(-w, -g, 0), new THREE.Vector3(-w, -(h - r), 0)));
  bot.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(-w, -(h - r), 0), new THREE.Vector3(-w, -h, 0), new THREE.Vector3(-w + r, -h, 0)));
  bot.add(new THREE.LineCurve3(new THREE.Vector3(-w + r, -h, 0), new THREE.Vector3(w - r, -h, 0)));
  bot.add(new THREE.QuadraticBezierCurve3(new THREE.Vector3(w - r, -h, 0), new THREE.Vector3(w, -h, 0), new THREE.Vector3(w, -(h - r), 0)));
  bot.add(new THREE.LineCurve3(new THREE.Vector3(w, -(h - r), 0), new THREE.Vector3(w, -g, 0)));
  return { top, bot };
}

/* ---------- fresnel glass dome ---------- */
function makeGlassDome() {
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color('#00ffc6') },
      power: { value: 3.8 },
      intensity: { value: 1.2 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * mvPosition;
      }`,
    fragmentShader: `
      uniform vec3 color;
      uniform float power;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = 1.0 - max(dot(viewDir, normal), 0.0);
        fresnel = pow(fresnel, power);
        gl_FragColor = vec4(color, fresnel * intensity);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(0.30, 48, 48), mat);
}

/* ---------- ear + antenna ---------- */
function makeEar(isLeft) {
  const dir = isLeft ? -1 : 1;
  const g = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: '#f0f0f0', roughness: 0.5 });
  const ringMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.3 });
  const centerMat = new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.8 });
  const aBaseMat = new THREE.MeshStandardMaterial({ color: '#999999', roughness: 0.4, metalness: 0.5 });
  const aStickMat = new THREE.MeshStandardMaterial({ color: '#d0d0d0', roughness: 0.4, metalness: 0.2 });
  const aTipMat = new THREE.MeshBasicMaterial({ color: '#ff3366' });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.025, 24), baseMat);
  base.rotation.z = Math.PI / 2;
  g.add(base);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.008, 12, 24), ringMat);
  ring.rotation.y = Math.PI / 2;
  ring.position.x = dir * 0.012;
  g.add(ring);
  const center = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 24), centerMat);
  center.rotation.z = Math.PI / 2;
  center.position.x = dir * 0.012;
  g.add(center);

  const ant = new THREE.Group();
  ant.position.set(dir * 0.015, 0.035, 0);
  ant.rotation.x = -0.4;
  const ab = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.02, 12), aBaseMat);
  ab.position.y = 0.01;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 6), aStickMat);
  stick.position.y = 0.06;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.006, 12, 12), aTipMat);
  tip.position.y = 0.11;
  ant.add(ab, stick, tip);
  g.add(ant);
  g.scale.setScalar(1.3);
  return g;
}

/* ============================================================ */
export function initRobot(container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 50);
  camera.position.set(0, 0.25, 3.4);
  camera.lookAt(0, 0.1, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 1.15));
  const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x2a2418, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(2, 4, 3);
  scene.add(key);
  const rim = new THREE.PointLight(0xffb31a, 6, 8, 2);
  rim.position.set(-1.4, 0.6, 1.2);
  scene.add(rim);

  /* ---- robot ---- */
  const { colorMap, bumpMap } = makeSpeckleTextures();
  const chassisMat = new THREE.MeshStandardMaterial({
    color: '#c4c4c4', map: colorMap, bumpMap, bumpScale: 0.005,
    roughness: 1.0, metalness: 0.0,
  });

  const robot = new THREE.Group();      // path position
  const body = new THREE.Group();       // pointer tilt
  robot.add(body);
  scene.add(robot);

  const bodyMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.43, 48, 48, 0, Math.PI * 2, Math.PI * 0.15, Math.PI * 0.85),
    chassisMat
  );
  body.add(bodyMesh);

  const bevel = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.025, 24, 48), chassisMat);
  bevel.rotation.x = Math.PI / 2;
  bevel.position.y = 0.34;
  body.add(bevel);

  // neck lathe
  const np = { baseR: 0.215, baseH: -0.05, midR: 0.28, midH: 0.02, lipBottomR: 0.295, lipBottomH: 0.045, lipTopR: 0.27, lipTopH: 0.055, innerR: 0.10, innerDropH: 0.0 };
  const profile = [
    new THREE.Vector2(np.innerR, np.baseH),
    new THREE.Vector2(np.baseR, np.baseH),
    new THREE.Vector2(np.midR, np.midH),
    new THREE.Vector2(np.lipBottomR, np.lipBottomH),
    new THREE.Vector2(np.lipTopR, np.lipTopH),
    new THREE.Vector2(np.innerR, np.lipTopH),
    new THREE.Vector2(np.innerR, np.lipTopH - np.innerDropH),
  ];
  const neck = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), chassisMat);
  neck.position.y = 0.38;
  body.add(neck);

  // head
  const head = new THREE.Group();
  head.position.y = 0.60;
  body.add(head);

  const headMat = new THREE.MeshStandardMaterial({ color: '#111111', roughness: 1.0, metalness: 0.0 });
  head.add(new THREE.Mesh(new THREE.SphereGeometry(0.28, 48, 48), headMat));
  head.add(makeGlassDome());

  // eyes
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2, 2, 2), transparent: true });
  const heartMat = new THREE.MeshBasicMaterial({ color: '#ff3366' });
  const { top, bot } = eyePaths();
  const eyesRoot = new THREE.Group();
  eyesRoot.position.set(0, -0.02, 0.29);
  head.add(eyesRoot);

  const eyes = [];
  for (const [x, ry] of [[-0.07, -0.2], [0.07, 0.2]]) {
    const eye = new THREE.Group();
    eye.position.x = x;
    eye.rotation.y = ry;
    const normal = new THREE.Group();
    normal.add(new THREE.Mesh(new THREE.TubeGeometry(top, 20, 0.0035, 8, false), eyeMat));
    normal.add(new THREE.Mesh(new THREE.TubeGeometry(bot, 20, 0.0035, 8, false), eyeMat));
    const heart = new THREE.Mesh(new THREE.TubeGeometry(heartCurve, 64, 0.0035, 8, true), heartMat);
    heart.visible = false;
    eye.add(normal, heart);
    eyesRoot.add(eye);
    eyes.push({ group: eye, normal, heart });
  }

  const earL = makeEar(true);
  earL.position.set(-0.29, 0, 0);
  const earR = makeEar(false);
  earR.position.set(0.29, 0, 0);
  head.add(earL, earR);

  robot.scale.setScalar(0.48);

  /* ---- interaction state ---- */
  let loved = false, lovedTimer = null;
  const pointer = { x: 0, y: 0 };
  const raycaster = new THREE.Raycaster();
  const localNdc = new THREE.Vector2();
  let hovering = false;

  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;

    // hover hit-test in canvas-local coords; flip pointer-events so the
    // robot is clickable but the column never blocks page content
    const r = container.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      localNdc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(localNdc, camera);
      const hit = raycaster.intersectObject(body, true).length > 0;
      if (hit !== hovering) {
        hovering = hit;
        container.style.pointerEvents = hit ? 'auto' : 'none';
        container.style.cursor = hit ? 'pointer' : '';
      }
    } else if (hovering) {
      hovering = false;
      container.style.pointerEvents = 'none';
    }
  }, { passive: true });

  container.addEventListener('pointerdown', () => {
    if (!hovering) return;
    loved = true;
    if (lovedTimer) clearTimeout(lovedTimer);
    lovedTimer = setTimeout(() => { loved = false; }, 2000);
  });

  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  /* ---- zig-zag scroll path ---- */
  const ZIGS = 4;            // direction changes over the full page
  const X_AMP = 0.16;        // horizontal swing (world units)
  const Y_AMP = 0.62;        // vertical swing
  const target = new THREE.Vector3();

  function pathTarget() {
    const doc = document.documentElement;
    const max = Math.max(doc.scrollHeight - window.innerHeight, 1);
    const p = Math.min(window.scrollY / max, 1);
    // triangle wave for the zig-zag X, cosine bob for Y
    const t = p * ZIGS;
    const tri = 2 * Math.abs(t - Math.floor(t + 0.5));   // 1..0..1 per segment
    target.x = (tri * 2 - 1) * X_AMP;
    target.y = -Math.cos(p * Math.PI * ZIGS) * Y_AMP - 0.3;
    return p;
  }

  /* ---- loop ---- */
  const BLINK_CYCLE = 3.0, BLINK_DUR = 0.45;
  const clock = new THREE.Clock();
  let rafId = null;

  function frame() {
    if (document.hidden) { rafId = null; return; }
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.elapsedTime;

    // ride the zig-zag
    pathTarget();
    robot.position.x += (target.x - robot.position.x) * Math.min(4 * dt, 1);
    robot.position.y += (target.y + Math.sin(t * 1.6) * 0.05 - robot.position.y) * Math.min(4 * dt, 1);
    // lean into the direction of travel
    const leanZ = THREE.MathUtils.clamp((target.x - robot.position.x) * 1.4, -0.3, 0.3);
    robot.rotation.z += (leanZ - robot.rotation.z) * Math.min(5 * dt, 1);

    // pointer tracking (body tilt + head look), same feel as the original
    const tx = pointer.x, ty = -pointer.y;
    body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, -tx * 0.95, Math.min(10 * dt, 1));
    body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, -ty * 0.25, Math.min(10 * dt, 1));
    body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, -tx * 0.15, Math.min(10 * dt, 1));
    head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, tx * 1.8, Math.min(20 * dt, 1));
    head.rotation.x = THREE.MathUtils.lerp(head.rotation.x, -ty * 0.3, Math.min(20 * dt, 1));

    // blink + heart eyes
    const cycle = t % BLINK_CYCLE;
    let scaleY = 1;
    if (cycle < BLINK_DUR && !loved) {
      scaleY = Math.max(0.05, 1 - Math.sin((cycle / BLINK_DUR) * Math.PI));
    }
    for (const e of eyes) {
      e.normal.visible = !loved;
      e.heart.visible = loved;
      e.group.scale.set(1.1, 1.1 * (loved ? 1 : scaleY), 1.1);
    }

    renderer.render(scene, camera);
    rafId = requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && rafId === null) frame();
  });

  if (REDUCED) {
    // static pose, single render
    pathTarget();
    robot.position.copy(target);
    renderer.render(scene, camera);
  } else {
    frame();
  }
}
