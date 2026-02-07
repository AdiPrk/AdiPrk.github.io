const canvas = document.getElementById("bg-canvas");

// =======================================================
// CONFIG — Showcase preset
// =======================================================
const CONFIG = {
  // Particle count
  DENSITY_DIVISOR: 110,
  MIN_PARTICLES: 15000,
  MAX_PARTICLES: 120000,

  // "3D" depth volume
  DEPTH: 900,

  // Flow integration
  FORCE: 150,
  DRAG: 0.986,
  MAX_SPEED: 520,

  // Anti-clump "pressure" (noise-based)
  PRESSURE_STRENGTH: 0.20,

  // Sprite sizing
  MIN_POINT_PX: 0.95,
  Z_ALPHA_VARIATION: 0.28,
  Z_SIZE_VARIATION: 0.25,

  // Camera
  FOV_DEG: 52,

  // Trails
  TRAILS: true,
  TRAIL_DECAY: 0.955,
  TRAIL_EXPOSURE: 0.98,
  TRAIL_RES_SCALE: 0.75,

  // While scrolling: slightly faster decay + clear on fast scroll to avoid boundary smear
  SCROLL_DECAY_BOOST: 0.86,
  SCROLL_CLEAR_THRESHOLD: 120,

  // Field tuning per showcase section type
  TYPE_GAIN: { circuit: 1.05, network: 1.10, stream: 1.00, default: 1.0 },

  // Flow field domain scaling
  FIELD_SCALE: 1.0,

  // Base particle alpha (energy into trails)
  BASE_ALPHA: 0.20,

  // Blending
  BLENDING: "additive",
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// =======================================================
// Showcase sections — cache parsed colors once
// =======================================================
let sectionMap = [];

function parseRGBAtoFloats(rgbaStr) {
  const m = rgbaStr.match(
    /rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/i
  );
  if (!m) return { r: 1, g: 1, b: 1, a: 1 };
  return {
    r: clamp(parseFloat(m[1]) / 255, 0, 1),
    g: clamp(parseFloat(m[2]) / 255, 0, 1),
    b: clamp(parseFloat(m[3]) / 255, 0, 1),
    a: clamp(parseFloat(m[4]), 0, 1),
  };
}

function mapSections() {
  sectionMap = [];
  const sections = document.querySelectorAll(".showcase-section");
  sections.forEach((sec, idx) => {
    const rect = sec.getBoundingClientRect();
    const colorRGBA = `rgba(${sec.dataset.color}, 1)`;
    sectionMap.push({
      index: idx,
      top: rect.top + window.scrollY,
      bottom: rect.top + window.scrollY + rect.height,
      height: rect.height,
      type: sec.dataset.type,
      color: parseRGBAtoFloats(colorRGBA),
    });
  });
}

// =======================================================
// Hash + noise helpers (fast, deterministic)
// =======================================================
function hash11(x) {
  const s = Math.sin(x * 127.1) * 43758.5453123;
  return s - Math.floor(s);
}
function hash21(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
function noise2(x, y) {
  return (
    Math.sin(x * 1.31 + y * 2.17) * 0.52 +
    Math.sin(x * 2.11 - y * 1.63) * 0.33 +
    Math.sin((x + y) * 1.07) * 0.15
  );
}

// =======================================================
// Flow field (NO allocations in hot path)
// =======================================================
const _F1 = { ax: 0, ay: 0, zz: 0 };
const _F2 = { ax: 0, ay: 0, zz: 0 };
const _F3 = { ax: 0, ay: 0, zz: 0 };
const _FT = { ax: 0, ay: 0, zz: 0 };

function curlField_out(out, x, y, t, scale) {
  const wx = noise2(x * 0.7 + t * 0.15, y * 0.7 - t * 0.12);
  const wy = noise2(x * 0.7 - t * 0.10, y * 0.7 + t * 0.14);

  const X = (x + wx * 0.35) * scale;
  const Y = (y + wy * 0.35) * scale;

  const e = 0.0042;

  const phi = noise2(X + t * 0.32, Y - t * 0.27);
  const phi_dx = (noise2((X + e) + t * 0.32, Y - t * 0.27) - phi) / e;
  const phi_dy = (noise2(X + t * 0.32, (Y + e) - t * 0.27) - phi) / e;

  out.ax = phi_dy;
  out.ay = -phi_dx;
  out.zz = phi;
}

function curlFieldFilaments_out(out, x, y, t, scale) {
  const X = x * scale;
  const Y = y * scale;
  const e = 0.0035;

  const phi =
    Math.sin((X * 2.2 + t * 0.9) + Math.sin(Y * 1.7 - t * 0.6)) +
    Math.sin((Y * 2.0 - t * 0.8) + Math.sin(X * 1.9 + t * 0.5));

  const phi_dx =
    (Math.sin(((X + e) * 2.2 + t * 0.9) + Math.sin(Y * 1.7 - t * 0.6)) +
      Math.sin((Y * 2.0 - t * 0.8) + Math.sin((X + e) * 1.9 + t * 0.5)) -
      phi) /
    e;

  const phi_dy =
    (Math.sin((X * 2.2 + t * 0.9) + Math.sin((Y + e) * 1.7 - t * 0.6)) +
      Math.sin(((Y + e) * 2.0 - t * 0.8) + Math.sin(X * 1.9 + t * 0.5)) -
      phi) /
    e;

  out.ax = phi_dy;
  out.ay = -phi_dx;
  out.zz = Math.sin(phi);
}

function waveField_out(out, x, y, t) {
  out.ax = 1.0 + 0.55 * Math.sin((y * 6.0 - t * 1.0) * 2.0);
  out.ay =
    0.40 * Math.sin((x * 7.0 + t * 0.8) * 2.0) +
    0.25 * Math.sin((y * 3.0 + t) * 2.0);
  out.zz = Math.sin((x * 4.0 + y * 3.0 + t * 1.3) * 1.2);
}

function mixField_out(out, a, b, t) {
  out.ax = lerp(a.ax, b.ax, t);
  out.ay = lerp(a.ay, b.ay, t);
  out.zz = lerp(a.zz, b.zz, t);
}

function sectionField_out(out, type, nx, ny, u, t, styleKey) {
  const gain = CONFIG.TYPE_GAIN[type] ?? CONFIG.TYPE_GAIN.default;

  let sA = 1.4,
    sB = 2.2;
  let tt = t;

  if (type === "circuit") {
    sA = 1.8;
    sB = 2.6;
    tt = t * 0.95;
  } else if (type === "network") {
    sA = 2.4;
    sB = 3.3;
    tt = t * 1.08;
  } else if (type === "stream") {
    sA = 1.2;
    sB = 1.8;
    tt = t * 0.85;
  }

  curlField_out(_F1, nx, ny, tt, sA * CONFIG.FIELD_SCALE);
  curlFieldFilaments_out(_F2, nx, ny, tt * 0.9 + 3.7, sB * CONFIG.FIELD_SCALE);
  waveField_out(_F3, nx, ny, tt);

  if (styleKey < 0.33) {
    const k = styleKey / 0.33;
    mixField_out(_FT, _F1, _F2, k * 0.45);
  } else if (styleKey < 0.66) {
    const k = (styleKey - 0.33) / 0.33;
    mixField_out(_FT, _F2, _F1, 0.35 + k * 0.45);
  } else {
    const k = (styleKey - 0.66) / 0.34;
    mixField_out(_FT, _F1, _F3, 0.35 + k * 0.55);
  }

  // copy to out (so later edits don't corrupt temp reuse)
  out.ax = _FT.ax;
  out.ay = _FT.ay;
  out.zz = _FT.zz;

  if (type === "stream") {
    out.ax += 0.9;
    out.ay += 0.18 * Math.sin((nx * 2.6 + tt * 0.9) * 2.0);
  } else if (type === "circuit") {
    const twist = 0.55 + 0.35 * Math.sin(tt * 0.7 + (nx * 3.0 + ny * 2.0) * 2.0);
    const rx = -ny * twist;
    const ry = nx * twist;
    out.ax = out.ax * 0.78 + rx * 0.22;
    out.ay = out.ay * 0.78 + ry * 0.22;
  } else if (type === "network") {
    out.ax *= 1.25;
    out.ay *= 1.25;
  }

  const um = 0.85 + 0.30 * Math.sin((u * 6.0 + tt * 0.25) * 2.0);
  out.ax *= gain * um;
  out.ay *= gain * um;
}

// =======================================================
// Particles
// =======================================================
let particlesArray = [];
const DEFAULT_COLOR = { r: 1, g: 1, b: 1, a: 1 };

class Particle {
  constructor(w, h, id) {
    this.id = id;
    this.x = Math.random() * w;
    this.y = Math.random() * h;

    this.vx = (Math.random() * 2 - 1) * 12;
    this.vy = (Math.random() * 2 - 1) * 12;

    this.z = (Math.random() * 2 - 1) * CONFIG.DEPTH;

    this.size = 0.55 + hash11(id * 1.37) * 0.75;
    this.density = 1 + hash11(id * 9.13) * 30;

    // cached classification
    this._type = "default";
    this._section = null;
    this._color = DEFAULT_COLOR;
    this._absY = 0;

    // per-particle style variance
    this.styleKey = hash11(id * 3.71);
    this.phase = hash11(id * 5.19) * Math.PI * 2;

    // PRECOMPUTE stable color jitter once (was per-frame)
    this.jitter = (hash21(id * 0.17, id * 0.31) - 0.5) * 0.10;
  }

  wrap(w, h) {
    if (this.x > w) this.x = 0;
    else if (this.x < 0) this.x = w;

    if (this.y > h) this.y = 0;
    else if (this.y < 0) this.y = h;

    const d = CONFIG.DEPTH;
    if (this.z > d) this.z = -d;
    else if (this.z < -d) this.z = d;
  }

  update(dt, w, h, t, invW, invH) {
    const nx = this.x * invW * 2 - 1;
    const ny = this.y * invH * 2 - 1;

    let type = "default";
    let u = 0.5;

    const sec = this._section;
    if (sec) {
      type = sec.type || "default";
      u = clamp((this._absY - sec.top) / Math.max(1, sec.height), 0, 1);
    }

    // NO ALLOC: writes into _FT
    sectionField_out(_FT, type, nx, ny, u, t + this.phase * 0.08, this.styleKey);

    const px = noise2(nx * 2.2 + t * 0.2, ny * 2.2 - t * 0.18);
    const py = noise2(nx * 2.2 - t * 0.18, ny * 2.2 + t * 0.2);

    const ax = _FT.ax + px * CONFIG.PRESSURE_STRENGTH;
    const ay = _FT.ay + py * CONFIG.PRESSURE_STRENGTH;

    this.vx = (this.vx + ax * CONFIG.FORCE * dt) * CONFIG.DRAG;
    this.vy = (this.vy + ay * CONFIG.FORCE * dt) * CONFIG.DRAG;

    const sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (sp > CONFIG.MAX_SPEED) {
      const s = CONFIG.MAX_SPEED / sp;
      this.vx *= s;
      this.vy *= s;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const zTarget = _FT.zz * CONFIG.DEPTH;
    this.z += (zTarget - this.z) * (0.65 * dt);

    this.wrap(w, h);
  }
}

// =======================================================
// THREE.js (Points + trails pipeline)
// =======================================================
let renderer, camera;
let pointsScene, pointsGeom, pointsMat, points;

// trails
let trailScene, trailCam, trailMat, trailQuad;
let rtPoints, rtA, rtB;
let ping = 0;

// buffers
let positions, colors, sizes;

// HOT PATH: manual projection cache
let M = new Float32Array(16);
let halfH = 0;

function updateCombinedMatrixCache() {
  const p = camera.projectionMatrix.elements;
  const v = camera.matrixWorldInverse.elements;

  for (let col = 0; col < 4; col++) {
    const vc0 = v[col * 4 + 0];
    const vc1 = v[col * 4 + 1];
    const vc2 = v[col * 4 + 2];
    const vc3 = v[col * 4 + 3];

    M[col * 4 + 0] = p[0] * vc0 + p[4] * vc1 + p[8] * vc2 + p[12] * vc3;
    M[col * 4 + 1] = p[1] * vc0 + p[5] * vc1 + p[9] * vc2 + p[13] * vc3;
    M[col * 4 + 2] = p[2] * vc0 + p[6] * vc1 + p[10] * vc2 + p[14] * vc3;
    M[col * 4 + 3] = p[3] * vc0 + p[7] * vc1 + p[11] * vc2 + p[15] * vc3;
  }

  halfH = window.innerHeight * 0.5;
}

function projectScreenY_fast(worldX, screenDownY, worldZ) {
  const wx = worldX;
  const wy = -screenDownY;
  const wz = worldZ;

  const clipY = M[1] * wx + M[5] * wy + M[9] * wz + M[13];
  const clipW = M[3] * wx + M[7] * wy + M[11] * wz + M[15];

  const ndcY = clipY / clipW;
  return (-ndcY * halfH) + halfH;
}

function classifyParticleByScreen(p, scrollY) {
  const sy = projectScreenY_fast(p.x, p.y, p.z);
  p._absY = sy + scrollY;

  const absoluteY = p._absY;

  for (let i = 0; i < sectionMap.length; i++) {
    const sec = sectionMap[i];
    if (absoluteY >= sec.top && absoluteY < sec.bottom) {
      p._section = sec;
      p._type = sec.type;
      p._color = sec.color;
      return;
    }
  }

  p._section = null;
  p._type = "default";
  p._color = DEFAULT_COLOR; // NO alloc
}

function setupThree() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearAlpha(0);

  camera = new THREE.PerspectiveCamera(CONFIG.FOV_DEG, 1, 0.1, 12000);

  pointsScene = new THREE.Scene();

  buildPoints();
  if (CONFIG.TRAILS) buildTrailsPipeline();
}

function buildPoints() {
  pointsGeom = new THREE.BufferGeometry();

  const n = particlesArray.length;
  positions = new Float32Array(n * 3);
  colors = new Float32Array(n * 4);
  sizes = new Float32Array(n);

  pointsGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pointsGeom.setAttribute("color", new THREE.BufferAttribute(colors, 4));
  pointsGeom.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

  const blendingMode =
    CONFIG.BLENDING === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending;

  pointsMat = new THREE.ShaderMaterial({
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: blendingMode,
    vertexShader: `
      attribute float size;
      attribute vec4 color;
      varying vec4 vColor;
      varying float vDepth01;

      uniform float uPixelRatio;
      uniform float uDepth;
      uniform float uPointScale;
      uniform float uMinDist;
      uniform float uMinPointPx;

      void main() {
        vColor = color;
        vDepth01 = (position.z / uDepth) * 0.5 + 0.5;

        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;

        float dist = max(uMinDist, -mv.z);
        float persp = uPointScale / dist;

        float px = size * 2.0 * uPixelRatio * persp;
        float minPx = uMinPointPx * uPixelRatio;

        gl_PointSize = max(px, minPx);
      }
    `,
    fragmentShader: `
      varying vec4 vColor;
      varying float vDepth01;
      uniform float uDepthAlpha;

      void main() {
        vec2 p = gl_PointCoord - vec2(0.5);
        float r2 = dot(p,p);

        float core = smoothstep(0.18, 0.0, r2);
        float halo = smoothstep(0.55, 0.0, r2) * 0.55;
        float spark = smoothstep(0.08, 0.0, r2) * 0.45;
        float mask = clamp(core + halo + spark, 0.0, 1.0);

        float depthFade = mix(1.0 - uDepthAlpha, 1.0 + uDepthAlpha, vDepth01);
        gl_FragColor = vec4(vColor.rgb, vColor.a * mask * depthFade);
      }
    `,
    uniforms: {
      uPixelRatio: { value: 1.0 },
      uDepth: { value: CONFIG.DEPTH },
      uDepthAlpha: { value: CONFIG.Z_ALPHA_VARIATION },
      uPointScale: { value: 1.0 },
      uMinDist: { value: 220.0 },
      uMinPointPx: { value: CONFIG.MIN_POINT_PX },
    },
  });

  points = new THREE.Points(pointsGeom, pointsMat);
  pointsScene.add(points);
}

function buildTrailsPipeline() {
  trailScene = new THREE.Scene();
  trailCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const geo = new THREE.PlaneGeometry(2, 2);

  trailMat = new THREE.ShaderMaterial({
    transparent: false,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uPrev: { value: null },
      uCurr: { value: null },
      uDecay: { value: CONFIG.TRAIL_DECAY },
      uExposure: { value: CONFIG.TRAIL_EXPOSURE },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D uPrev;
      uniform sampler2D uCurr;
      uniform float uDecay;
      uniform float uExposure;

      void main() {
        vec3 prev = texture2D(uPrev, vUv).rgb;
        vec3 curr = texture2D(uCurr, vUv).rgb;

        vec3 col = prev * uDecay + curr;
        col *= uExposure;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  trailQuad = new THREE.Mesh(geo, trailMat);
  trailScene.add(trailQuad);

  allocateTrailRTs();
}

function allocateTrailRTs() {
  const pr = renderer.getPixelRatio();
  const w = Math.max(2, Math.floor(window.innerWidth * pr * CONFIG.TRAIL_RES_SCALE));
  const h = Math.max(2, Math.floor(window.innerHeight * pr * CONFIG.TRAIL_RES_SCALE));

  const opts = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  };

  if (rtPoints) rtPoints.dispose();
  if (rtA) rtA.dispose();
  if (rtB) rtB.dispose();

  rtPoints = new THREE.WebGLRenderTarget(w, h, opts);
  rtA = new THREE.WebGLRenderTarget(w, h, opts);
  rtB = new THREE.WebGLRenderTarget(w, h, opts);

  clearTrails();
}

function clearTrails() {
  if (!CONFIG.TRAILS) return;
  renderer.setRenderTarget(rtA);
  renderer.clear(true, true, true);
  renderer.setRenderTarget(rtB);
  renderer.clear(true, true, true);
  renderer.setRenderTarget(null);
  ping = 0;
}

function syncCameraToPixels() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;

  const fovRad = (camera.fov * Math.PI) / 180;
  const dist = (h * 0.5) / Math.tan(fovRad * 0.5);

  camera.position.set(w * 0.5, -h * 0.5, dist);
  camera.lookAt(w * 0.5, -h * 0.5, 0);
  camera.updateProjectionMatrix();

  pointsMat.uniforms.uPointScale.value = (h * 0.5) / Math.tan(fovRad * 0.5);

  updateCombinedMatrixCache();
}

// =======================================================
// Resize / Init
// =======================================================
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  syncCameraToPixels();
  if (CONFIG.TRAILS) allocateTrailRTs();
  mapSections();
}

function init() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  particlesArray = [];
  let n = Math.floor((w * h) / CONFIG.DENSITY_DIVISOR);
  n = clamp(n, CONFIG.MIN_PARTICLES, CONFIG.MAX_PARTICLES);

  for (let i = 0; i < n; i++) particlesArray.push(new Particle(w, h, i));

  mapSections();

  if (points) pointsScene.remove(points);
  buildPoints();

  updateCombinedMatrixCache();
  const scrollY = window.scrollY;
  for (let i = 0; i < particlesArray.length; i++) classifyParticleByScreen(particlesArray[i], scrollY);

  clearTrails();
}

// =======================================================
// Scroll update (rAF debounced)
// =======================================================
let _scrollRafPending = false;
function onScrollUpdate() {
  if (_scrollRafPending) return;
  _scrollRafPending = true;
  requestAnimationFrame(() => {
    _scrollRafPending = false;
    mapSections();
  });
}

// =======================================================
// Animation
// =======================================================
let lastTime = 0;
let lastScrollY = window.scrollY;
let scrollBoostTimer = 0;

function animate(timeStamp) {
  if (!lastTime) lastTime = timeStamp;
  let dt = (timeStamp - lastTime) / 1000;
  lastTime = timeStamp;
  dt = Math.min(dt, 0.08);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const t = timeStamp / 1000;

  // cache frequently used values ONCE per frame
  const scrollY = window.scrollY;
  const invW = 1 / Math.max(1, w);
  const invH = 1 / Math.max(1, h);

  updateCombinedMatrixCache();

  // scrolling trail cleanup
  if (CONFIG.TRAILS) {
    const d = scrollY - lastScrollY;
    lastScrollY = scrollY;

    const ad = Math.abs(d);
    if (ad > 0.5) {
      scrollBoostTimer = 0.18;
      if (ad > CONFIG.SCROLL_CLEAR_THRESHOLD) clearTrails();
    }
    if (scrollBoostTimer > 0) scrollBoostTimer -= dt;
  }

  // uniforms
  pointsMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  pointsMat.uniforms.uDepth.value = CONFIG.DEPTH;
  pointsMat.uniforms.uDepthAlpha.value = CONFIG.Z_ALPHA_VARIATION;
  pointsMat.uniforms.uMinPointPx.value = CONFIG.MIN_POINT_PX;

  const baseA = CONFIG.BASE_ALPHA;
  const depthAlphaVar = CONFIG.Z_ALPHA_VARIATION;
  const invDepth = 1 / CONFIG.DEPTH;

  // SINGLE PASS: classify -> update -> write buffers
  for (let i = 0; i < particlesArray.length; i++) {
    const p = particlesArray[i];

    classifyParticleByScreen(p, scrollY);
    p.update(dt, w, h, t, invW, invH);

    // world position (y flipped)
    const i3 = i * 3;
    positions[i3 + 0] = p.x;
    positions[i3 + 1] = -p.y;
    positions[i3 + 2] = p.z;

    // stable jitter (precomputed)
    const cr = clamp(p._color.r + p.jitter, 0, 1);
    const cg = clamp(p._color.g + p.jitter, 0, 1);
    const cb = clamp(p._color.b + p.jitter, 0, 1);

    const z01 = (p.z * invDepth) * 0.5 + 0.5;
    const depthFade = lerp(1.0 - depthAlphaVar, 1.0 + depthAlphaVar, z01);

    const i4 = i * 4;
    colors[i4 + 0] = cr;
    colors[i4 + 1] = cg;
    colors[i4 + 2] = cb;
    colors[i4 + 3] = clamp(baseA * depthFade, 0, 1);

    const depthSize = lerp(
      1.0 - CONFIG.Z_SIZE_VARIATION,
      1.0 + CONFIG.Z_SIZE_VARIATION,
      z01
    );
    sizes[i] = p.size * depthSize;
  }

  pointsGeom.attributes.position.needsUpdate = true;
  pointsGeom.attributes.color.needsUpdate = true;
  pointsGeom.attributes.size.needsUpdate = true;

  // render
  if (CONFIG.TRAILS) {
    // 1) points -> rtPoints
    renderer.setRenderTarget(rtPoints);
    renderer.clear(true, true, true);
    renderer.render(pointsScene, camera);

    // 2) accumulate ping-pong
    const prev = ping === 0 ? rtA : rtB;
    const next = ping === 0 ? rtB : rtA;

    const decay = scrollBoostTimer > 0 ? CONFIG.SCROLL_DECAY_BOOST : CONFIG.TRAIL_DECAY;

    trailMat.uniforms.uPrev.value = prev.texture;
    trailMat.uniforms.uCurr.value = rtPoints.texture;
    trailMat.uniforms.uDecay.value = decay;
    trailMat.uniforms.uExposure.value = CONFIG.TRAIL_EXPOSURE;

    renderer.setRenderTarget(next);
    renderer.render(trailScene, trailCam);

    // 3) draw accumulation to screen
    trailMat.uniforms.uPrev.value = next.texture;
    trailMat.uniforms.uCurr.value = next.texture;
    trailMat.uniforms.uDecay.value = 1.0;
    trailMat.uniforms.uExposure.value = 1.0;

    renderer.setRenderTarget(null);
    renderer.render(trailScene, trailCam);

    // restore
    trailMat.uniforms.uDecay.value = CONFIG.TRAIL_DECAY;
    trailMat.uniforms.uExposure.value = CONFIG.TRAIL_EXPOSURE;

    ping = 1 - ping;
  } else {
    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(pointsScene, camera);
  }

  requestAnimationFrame(animate);
}

// =======================================================
// Event listeners
// =======================================================
window.addEventListener("resize", () => {
  resize();
  init();
});

window.addEventListener("scroll", onScrollUpdate, { passive: true });

// =======================================================
// Start
// =======================================================
setupThree();
resize();
init();
requestAnimationFrame(animate);

// =======================================================
// KEEP YOUR SCRAMBLE TEXT EFFECT EXACTLY AS-IS BELOW HERE
// =======================================================

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+";

function instantScramble(element) {
  // 1. Setup
  const originalText = element.dataset.value;
  let iterations = 0;

  // 2. Make visible immediately
  element.style.visibility = "visible";

  // 3. Adaptive Speed:
  const length = originalText.length;
  const step = Math.max(1, Math.ceil(length / 15));

  const interval = setInterval(() => {
    element.innerText = originalText
      .split("")
      .map((letter, index) => {
        if (letter === " " || letter === "\n") return letter;

        if (index < iterations) {
          return originalText[index];
        }
        return chars[Math.floor(Math.random() * chars.length)];
      })
      .join("");

    if (iterations >= length) {
      clearInterval(interval);
      element.innerText = originalText;
    }

    iterations += step;
  }, 20);
}

// Observer Logic
document.addEventListener("DOMContentLoaded", () => {
  const targets = document.querySelectorAll(
    "h1, h2, h3, p:not(.link-text), .tags span, .showcase-btn, .contact-btn, .bio-text"
  );

  targets.forEach((el) => {
    el.dataset.value = el.innerText;
    el.style.visibility = "hidden";
  });

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target;
          instantScramble(target);
          observer.unobserve(target);
        }
      });
    },
    { threshold: 0.1 }
  );

  targets.forEach((el) => observer.observe(el));
});
