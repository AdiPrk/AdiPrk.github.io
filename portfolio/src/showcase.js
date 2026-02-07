// ===============================
// SHOWCASE.JS (page-showcase ONLY)
// ===============================

const canvas = document.getElementById("bg-canvas");

// =======================================================
// CONFIG — Showcase preset
// =======================================================
const CONFIG = {
  // Particle count
  DENSITY_DIVISOR: 110,
  MIN_PARTICLES: 30000,
  MAX_PARTICLES: 800000,

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
  BASE_ALPHA: 0.07,

  // Blending
  BLENDING: "additive",

  // =======================================================
  // PERF: grid sampling for expensive noise
  // =======================================================
  FIELD_GRID_W: 128,
  FIELD_GRID_H: 72,
  GRID_UPDATE_EVERY_FRAMES: 2,

  // How often we recompute screen-projection + section lookup
  CLASSIFY_EVERY_FRAMES: 6,
  CLASSIFY_SCROLL_BOOST_SECONDS: 0.25,
  CLASSIFY_SCROLL_BOOST_EVERY_FRAMES: 2,
};

// =======================================================
// Debug HUD
// =======================================================
const DBG = {
  root: null,
  fpsEl: null,
  msEl: null,
  particlesEl: null,
  dprEl: null,

  acc: 0,
  frames: 0,
  fpsSmooth: 0,
  msSmooth: 0,
  updateEvery: 0.25,
};

function setupDebugHUD() {
  DBG.root = document.getElementById("debug-hud");
  if (!DBG.root) return;

  DBG.fpsEl = document.getElementById("dbg-fps");
  DBG.msEl = document.getElementById("dbg-ms");
  DBG.particlesEl = document.getElementById("dbg-particles");
  DBG.dprEl = document.getElementById("dbg-dpr");

  if (DBG.particlesEl) DBG.particlesEl.textContent = `${particleCount.toLocaleString()}`;
  if (DBG.dprEl) DBG.dprEl.textContent = `${(window.devicePixelRatio || 1).toFixed(2)}`;
}

function updateDebugHUD(dt, particleCount) {
  if (!DBG.root) return;

  DBG.acc += dt;
  DBG.frames++;

  const ms = dt * 1000;
  DBG.msSmooth = DBG.msSmooth ? (DBG.msSmooth * 0.9 + ms * 0.1) : ms;

  if (DBG.acc >= DBG.updateEvery) {
    const fps = DBG.frames / DBG.acc;
    DBG.fpsSmooth = DBG.fpsSmooth ? (DBG.fpsSmooth * 0.85 + fps * 0.15) : fps;

    if (DBG.fpsEl) DBG.fpsEl.textContent = `${DBG.fpsSmooth.toFixed(1)}`;
    if (DBG.msEl) DBG.msEl.textContent = `${DBG.msSmooth.toFixed(1)} ms`;
    if (DBG.particlesEl) DBG.particlesEl.textContent = `${particleCount.toLocaleString()}`;

    DBG.frames = 0;
    DBG.acc = 0;
  }
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// =======================================================
// Fast sin LUT (replaces per-particle Math.sin calls)
// =======================================================
const TAU = Math.PI * 2;
const SIN_LUT_BITS = 12;                 // 4096 entries
const SIN_LUT_SIZE = 1 << SIN_LUT_BITS;
const SIN_LUT_MASK = SIN_LUT_SIZE - 1;
const SIN_LUT = new Float32Array(SIN_LUT_SIZE);

(function initSinLUT() {
  for (let i = 0; i < SIN_LUT_SIZE; i++) {
    SIN_LUT[i] = Math.sin((i / SIN_LUT_SIZE) * TAU);
  }
})();

function fastSin(x) {
  x = x % TAU;
  if (x < 0) x += TAU;

  const f = x * (SIN_LUT_SIZE / TAU);
  const i0 = f | 0;
  const t = f - i0;
  const i1 = (i0 + 1) & SIN_LUT_MASK;
  return SIN_LUT[i0 & SIN_LUT_MASK] * (1 - t) + SIN_LUT[i1] * t;
}

// =======================================================
// Showcase sections — packed arrays
// =======================================================
let sectionMap = [];

let secTops = new Float32Array(0);
let secBottoms = new Float32Array(0);
let secHeights = new Float32Array(0);
let secTypeCode = new Uint8Array(0);
let secColors = new Float32Array(0); // r,g,b,a per section
let secCount = 0;

const TYPE_DEFAULT = 0;
const TYPE_CIRCUIT = 1;
const TYPE_NETWORK = 2;
const TYPE_STREAM = 3;

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

function typeToCode(type) {
  if (type === "circuit") return TYPE_CIRCUIT;
  if (type === "network") return TYPE_NETWORK;
  if (type === "stream") return TYPE_STREAM;
  return TYPE_DEFAULT;
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

  sectionMap.sort((a, b) => a.top - b.top);

  secCount = sectionMap.length;
  secTops = new Float32Array(secCount);
  secBottoms = new Float32Array(secCount);
  secHeights = new Float32Array(secCount);
  secTypeCode = new Uint8Array(secCount);
  secColors = new Float32Array(secCount * 4);

  for (let i = 0; i < secCount; i++) {
    const s = sectionMap[i];
    secTops[i] = s.top;
    secBottoms[i] = s.bottom;
    secHeights[i] = s.height;
    secTypeCode[i] = typeToCode(s.type);

    const i4 = i * 4;
    secColors[i4 + 0] = s.color.r;
    secColors[i4 + 1] = s.color.g;
    secColors[i4 + 2] = s.color.b;
    secColors[i4 + 3] = s.color.a;
  }
}

function findSectionIndex(absY) {
  let lo = 0;
  let hi = secCount - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >>> 1;
    const top = secTops[mid];
    const bot = secBottoms[mid];
    if (absY < top) hi = mid - 1;
    else if (absY >= bot) lo = mid + 1;
    else return mid;
  }
  return -1;
}

// =======================================================
// Noise helpers (used in GRID build only now for pressure)
// =======================================================
function noise2(x, y) {
  return (
    Math.sin(x * 1.31 + y * 2.17) * 0.52 +
    Math.sin(x * 2.11 - y * 1.63) * 0.33 +
    Math.sin((x + y) * 1.07) * 0.15
  );
}

// =======================================================
// Base field grid + pressure grid
// Store per cell: f1(ax,ay,zz), f2(ax,ay,zz), f3(ax,ay,zz), pressure(px,py)
// Total floats per cell = 11
// =======================================================
let fieldGridW = 0;
let fieldGridH = 0;
let baseFieldGrid = new Float32Array(0);
let gridFrameCounter = 0;

let _f1x = 0, _f1y = 0, _f1z = 0;
let _f2x = 0, _f2y = 0, _f2z = 0;
let _f3x = 0, _f3y = 0, _f3z = 0;

function ensureGrids() {
  fieldGridW = CONFIG.FIELD_GRID_W | 0;
  fieldGridH = CONFIG.FIELD_GRID_H | 0;
  const cells = fieldGridW * fieldGridH;
  const need = cells * 11;
  if (baseFieldGrid.length !== need) baseFieldGrid = new Float32Array(need);
}

function curlField_eval(nx, ny, t, scale) {
  const wx = noise2(nx * 0.7 + t * 0.15, ny * 0.7 - t * 0.12);
  const wy = noise2(nx * 0.7 - t * 0.10, ny * 0.7 + t * 0.14);

  const X = (nx + wx * 0.35) * scale;
  const Y = (ny + wy * 0.35) * scale;

  const e = 0.0042;

  const phi = noise2(X + t * 0.32, Y - t * 0.27);
  const phi_dx = (noise2((X + e) + t * 0.32, Y - t * 0.27) - phi) / e;
  const phi_dy = (noise2(X + t * 0.32, (Y + e) - t * 0.27) - phi) / e;

  _f1x = phi_dy;
  _f1y = -phi_dx;
  _f1z = phi;
}

function curlFieldFilaments_eval(nx, ny, t, scale) {
  const X = nx * scale;
  const Y = ny * scale;
  const e = 0.0035;

  const phi =
    Math.sin((X * 2.2 + t * 0.9) + Math.sin(Y * 1.7 - t * 0.6)) +
    Math.sin((Y * 2.0 - t * 0.8) + Math.sin(X * 1.9 + t * 0.5));

  const phi_dx =
    (Math.sin(((X + e) * 2.2 + t * 0.9) + Math.sin(Y * 1.7 - t * 0.6)) +
      Math.sin((Y * 2.0 - t * 0.8) + Math.sin((X + e) * 1.9 + t * 0.5)) -
      phi) / e;

  const phi_dy =
    (Math.sin((X * 2.2 + t * 0.9) + Math.sin((Y + e) * 1.7 - t * 0.6)) +
      Math.sin(((Y + e) * 2.0 - t * 0.8) + Math.sin(X * 1.9 + t * 0.5)) -
      phi) / e;

  _f2x = phi_dy;
  _f2y = -phi_dx;
  _f2z = Math.sin(phi);
}

function waveField_eval(nx, ny, t) {
  _f3x = 1.0 + 0.55 * Math.sin((ny * 6.0 - t * 1.0) * 2.0);
  _f3y =
    0.40 * Math.sin((nx * 7.0 + t * 0.8) * 2.0) +
    0.25 * Math.sin((ny * 3.0 + t) * 2.0);
  _f3z = Math.sin((nx * 4.0 + ny * 3.0 + t * 1.3) * 1.2);
}

function buildBaseFieldGrid(timeSec) {
  const W = fieldGridW, H = fieldGridH;
  const invWm1 = 1 / Math.max(1, W - 1);
  const invHm1 = 1 / Math.max(1, H - 1);

  const sA = 1.4 * CONFIG.FIELD_SCALE;
  const sB = 2.2 * CONFIG.FIELD_SCALE;
  const tt = timeSec;

  const pA = tt * 0.2;
  const pB = tt * 0.18;

  let idx = 0;
  for (let j = 0; j < H; j++) {
    const ny = (j * invHm1) * 2 - 1;
    for (let i = 0; i < W; i++) {
      const nx = (i * invWm1) * 2 - 1;

      curlField_eval(nx, ny, tt, sA);
      const f1x = _f1x, f1y = _f1y, f1z = _f1z;

      curlFieldFilaments_eval(nx, ny, tt * 0.9 + 3.7, sB);
      const f2x = _f2x, f2y = _f2y, f2z = _f2z;

      waveField_eval(nx, ny, tt);
      const f3x = _f3x, f3y = _f3y, f3z = _f3z;

      const px = noise2(nx * 2.2 + pA, ny * 2.2 - pB);
      const py = noise2(nx * 2.2 - pB, ny * 2.2 + pA);

      baseFieldGrid[idx++] = f1x; baseFieldGrid[idx++] = f1y; baseFieldGrid[idx++] = f1z;
      baseFieldGrid[idx++] = f2x; baseFieldGrid[idx++] = f2y; baseFieldGrid[idx++] = f2z;
      baseFieldGrid[idx++] = f3x; baseFieldGrid[idx++] = f3y; baseFieldGrid[idx++] = f3z;
      baseFieldGrid[idx++] = px;  baseFieldGrid[idx++] = py;
    }
  }
}

// sample 11 floats with bilinear filtering
function sampleBaseField11(out11, nx, ny) {
  const W = fieldGridW, H = fieldGridH;

  let fx = (nx * 0.5 + 0.5) * (W - 1);
  let fy = (ny * 0.5 + 0.5) * (H - 1);

  fx = clamp(fx, 0, W - 1);
  fy = clamp(fy, 0, H - 1);

  const x0 = fx | 0;
  const y0 = fy | 0;
  const x1 = x0 < W - 1 ? x0 + 1 : x0;
  const y1 = y0 < H - 1 ? y0 + 1 : y0;

  const tx = fx - x0;
  const ty = fy - y0;

  const w00 = (1 - tx) * (1 - ty);
  const w10 = tx * (1 - ty);
  const w01 = (1 - tx) * ty;
  const w11 = tx * ty;

  const base00 = (y0 * W + x0) * 11;
  const base10 = (y0 * W + x1) * 11;
  const base01 = (y1 * W + x0) * 11;
  const base11 = (y1 * W + x1) * 11;

  for (let k = 0; k < 11; k++) {
    out11[k] =
      baseFieldGrid[base00 + k] * w00 +
      baseFieldGrid[base10 + k] * w10 +
      baseFieldGrid[base01 + k] * w01 +
      baseFieldGrid[base11 + k] * w11;
  }
}

// =======================================================
// Particles — SoA typed arrays
// =======================================================
let particleCount = 0;

let pX = new Float32Array(0);
let pY = new Float32Array(0);
let pZ = new Float32Array(0);
let pVX = new Float32Array(0);
let pVY = new Float32Array(0);

let pSize = new Float32Array(0);
let pStyleKey = new Float32Array(0);
let pPhase = new Float32Array(0);
let pJitter = new Float32Array(0);

// cached classification
let pSecIndex = new Int16Array(0); // -1 none
let pU = new Float32Array(0);
let pType = new Uint8Array(0);

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

// projection cache
let M = new Float32Array(16);
let halfH = 0;
let combinedMatrixValid = false;

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
  combinedMatrixValid = true;
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

  const n = particleCount;
  positions = new Float32Array(n * 3);
  colors = new Float32Array(n * 4);
  sizes = new Float32Array(n);

  const posAttr = new THREE.BufferAttribute(positions, 3);
  const colAttr = new THREE.BufferAttribute(colors, 4);
  const sizAttr = new THREE.BufferAttribute(sizes, 1);

  posAttr.setUsage(THREE.DynamicDrawUsage);
  colAttr.setUsage(THREE.DynamicDrawUsage);
  sizAttr.setUsage(THREE.DynamicDrawUsage);

  pointsGeom.setAttribute("position", posAttr);
  pointsGeom.setAttribute("color", colAttr);
  pointsGeom.setAttribute("size", sizAttr);

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

  combinedMatrixValid = false;
}

// =======================================================
// Resize / Init
// =======================================================
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  syncCameraToPixels();
  if (CONFIG.TRAILS) allocateTrailRTs();
  mapSections();
  ensureGrids();
}

function init() {
  const w = window.innerWidth;
  const h = window.innerHeight;

  let n = Math.floor((w * h) / CONFIG.DENSITY_DIVISOR);
  n = clamp(n, CONFIG.MIN_PARTICLES, CONFIG.MAX_PARTICLES);
  particleCount = n;

  pX = new Float32Array(n);
  pY = new Float32Array(n);
  pZ = new Float32Array(n);
  pVX = new Float32Array(n);
  pVY = new Float32Array(n);

  pSize = new Float32Array(n);
  pStyleKey = new Float32Array(n);
  pPhase = new Float32Array(n);
  pJitter = new Float32Array(n);

  pSecIndex = new Int16Array(n);
  pU = new Float32Array(n);
  pType = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    pX[i] = Math.random() * w;
    pY[i] = Math.random() * h;
    pVX[i] = (Math.random() * 2 - 1) * 12;
    pVY[i] = (Math.random() * 2 - 1) * 12;
    pZ[i] = (Math.random() * 2 - 1) * CONFIG.DEPTH;

    pSize[i] = 0.55 + (Math.sin(i * 1.37 * 127.1) * 43758.5453123 % 1) * 0.75;
    pStyleKey[i] = (Math.sin(i * 3.71 * 127.1) * 43758.5453123 % 1 + 1) % 1;
    pPhase[i] = ((Math.sin(i * 5.19 * 127.1) * 43758.5453123 % 1 + 1) % 1) * TAU;
    pJitter[i] = (((Math.sin(i * 0.17 * 127.1 + i * 0.31 * 311.7) * 43758.5453123) % 1) - 0.5) * 0.10;

    pSecIndex[i] = -1;
    pU[i] = 0.5;
    pType[i] = TYPE_DEFAULT;
  }

  mapSections();
  ensureGrids();

  if (points) pointsScene.remove(points);
  buildPoints();

  combinedMatrixValid = false;
  gridFrameCounter = 0;
  classifyFrameCounter = 0;
  classifyScrollBoostTimer = 0;

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

let classifyFrameCounter = 0;
let classifyScrollBoostTimer = 0;

const _s11 = new Float32Array(11);

function animate(timeStamp) {
  if (!lastTime) lastTime = timeStamp;
  let dt = (timeStamp - lastTime) / 1000;
  lastTime = timeStamp;
  dt = Math.min(dt, 0.08);

  updateDebugHUD(dt, particleCount);

  const w = window.innerWidth;
  const h = window.innerHeight;
  const t = timeStamp / 1000;

  const scrollY = window.scrollY;
  const invW = 1 / Math.max(1, w);
  const invH = 1 / Math.max(1, h);

  if (!combinedMatrixValid) updateCombinedMatrixCache();

  gridFrameCounter++;
  if (gridFrameCounter >= CONFIG.GRID_UPDATE_EVERY_FRAMES) {
    gridFrameCounter = 0;
    buildBaseFieldGrid(t);
  }

  if (CONFIG.TRAILS) {
    const d = scrollY - lastScrollY;
    lastScrollY = scrollY;

    const ad = Math.abs(d);
    if (ad > 0.5) {
      scrollBoostTimer = 0.18;
      classifyScrollBoostTimer = CONFIG.CLASSIFY_SCROLL_BOOST_SECONDS;
      if (ad > CONFIG.SCROLL_CLEAR_THRESHOLD) clearTrails();
    }
    if (scrollBoostTimer > 0) scrollBoostTimer -= dt;
    if (classifyScrollBoostTimer > 0) classifyScrollBoostTimer -= dt;
  } else {
    lastScrollY = scrollY;
    if (classifyScrollBoostTimer > 0) classifyScrollBoostTimer -= dt;
  }

  classifyFrameCounter++;
  const classifyEvery = classifyScrollBoostTimer > 0
    ? CONFIG.CLASSIFY_SCROLL_BOOST_EVERY_FRAMES
    : CONFIG.CLASSIFY_EVERY_FRAMES;

  const doClassifyThisFrame = (classifyFrameCounter % classifyEvery) === 0;

  pointsMat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
  pointsMat.uniforms.uDepth.value = CONFIG.DEPTH;
  pointsMat.uniforms.uDepthAlpha.value = CONFIG.Z_ALPHA_VARIATION;
  pointsMat.uniforms.uMinPointPx.value = CONFIG.MIN_POINT_PX;

  const depth = CONFIG.DEPTH;
  const invDepth = 1 / depth;

  const baseA = CONFIG.BASE_ALPHA;
  const depthAlphaVar = CONFIG.Z_ALPHA_VARIATION;

  const force = CONFIG.FORCE;
  const drag = CONFIG.DRAG;
  const maxSp = CONFIG.MAX_SPEED;
  const maxSp2 = maxSp * maxSp;

  const pressureStrength = CONFIG.PRESSURE_STRENGTH;

  for (let i = 0; i < particleCount; i++) {
    let x = pX[i];
    let y = pY[i];
    let z = pZ[i];
    let vx = pVX[i];
    let vy = pVY[i];

    if (doClassifyThisFrame) {
      const sy = projectScreenY_fast(x, y, z);
      const absY = sy + scrollY;
      const si = findSectionIndex(absY);

      pSecIndex[i] = si;
      if (si >= 0) {
        pType[i] = secTypeCode[si];
        const hh = secHeights[si] > 1 ? secHeights[si] : 1;
        pU[i] = clamp((absY - secTops[si]) / hh, 0, 1);
      } else {
        pType[i] = TYPE_DEFAULT;
        pU[i] = 0.5;
      }
    }

    const typeCode = pType[i];
    const u = pU[i];

    const nx = x * invW * 2 - 1;
    const ny = y * invH * 2 - 1;

    let ax, ay, zz, px, py;
    sampleBaseField11(_s11, nx, ny);

    const f1x = _s11[0], f1y = _s11[1], f1z = _s11[2];
    const f2x = _s11[3], f2y = _s11[4], f2z = _s11[5];
    const f3x = _s11[6], f3y = _s11[7], f3z = _s11[8];
    px = _s11[9];
    py = _s11[10];

    const styleKey = pStyleKey[i];

    if (styleKey < 0.33) {
      const k = styleKey / 0.33;
      const ttMix = k * 0.45;
      ax = lerp(f1x, f2x, ttMix);
      ay = lerp(f1y, f2y, ttMix);
      zz = lerp(f1z, f2z, ttMix);
    } else if (styleKey < 0.66) {
      const k = (styleKey - 0.33) / 0.33;
      const ttMix = 0.35 + k * 0.45;
      ax = lerp(f2x, f1x, ttMix);
      ay = lerp(f2y, f1y, ttMix);
      zz = lerp(f2z, f1z, ttMix);
    } else {
      const k = (styleKey - 0.66) / 0.34;
      const ttMix = 0.35 + k * 0.55;
      ax = lerp(f1x, f3x, ttMix);
      ay = lerp(f1y, f3y, ttMix);
      zz = lerp(f1z, f3z, ttMix);
    }

    const phase = pPhase[i];
    let tt = t + phase * 0.08;

    let gain = CONFIG.TYPE_GAIN.default;
    if (typeCode === TYPE_CIRCUIT) { gain = CONFIG.TYPE_GAIN.circuit; tt *= 0.95; }
    else if (typeCode === TYPE_NETWORK) { gain = CONFIG.TYPE_GAIN.network; tt *= 1.08; }
    else if (typeCode === TYPE_STREAM) { gain = CONFIG.TYPE_GAIN.stream; tt *= 0.85; }

    if (typeCode === TYPE_STREAM) {
      ax += 0.9;
      ay += 0.18 * fastSin((nx * 2.6 + tt * 0.9) * 2.0);
    } else if (typeCode === TYPE_CIRCUIT) {
      const twist = 0.55 + 0.35 * fastSin(tt * 0.7 + (nx * 3.0 + ny * 2.0) * 2.0);
      const rx = -ny * twist;
      const ry = nx * twist;
      ax = ax * 0.78 + rx * 0.22;
      ay = ay * 0.78 + ry * 0.22;
    } else if (typeCode === TYPE_NETWORK) {
      ax *= 1.25;
      ay *= 1.25;
    }

    const um = 0.85 + 0.30 * fastSin((u * 6.0 + tt * 0.25) * 2.0);
    ax *= gain * um;
    ay *= gain * um;

    ax += px * pressureStrength;
    ay += py * pressureStrength;

    vx = (vx + ax * force * dt) * drag;
    vy = (vy + ay * force * dt) * drag;

    const sp2 = vx * vx + vy * vy;
    if (sp2 > maxSp2) {
      const inv = maxSp / Math.sqrt(sp2);
      vx *= inv;
      vy *= inv;
    }

    x += vx * dt;
    y += vy * dt;

    const zTarget = zz * depth;
    z += (zTarget - z) * (0.65 * dt);

    if (x > w) x = 0;
    else if (x < 0) x = w;

    if (y > h) y = 0;
    else if (y < 0) y = h;

    if (z > depth) z = -depth;
    else if (z < -depth) z = depth;

    pX[i] = x; pY[i] = y; pZ[i] = z;
    pVX[i] = vx; pVY[i] = vy;

    const i3 = i * 3;
    positions[i3 + 0] = x;
    positions[i3 + 1] = -y;
    positions[i3 + 2] = z;

    let cr = 1, cg = 1, cb = 1;
    const si = pSecIndex[i];
    if (si >= 0) {
      const s4 = si * 4;
      cr = secColors[s4 + 0];
      cg = secColors[s4 + 1];
      cb = secColors[s4 + 2];
    }

    const jitter = pJitter[i];
    const rr = clamp(cr + jitter, 0, 1);
    const gg = clamp(cg + jitter, 0, 1);
    const bb = clamp(cb + jitter, 0, 1);

    const z01 = (z * invDepth) * 0.5 + 0.5;
    const depthFade = lerp(1.0 - depthAlphaVar, 1.0 + depthAlphaVar, z01);

    const i4 = i * 4;
    colors[i4 + 0] = rr;
    colors[i4 + 1] = gg;
    colors[i4 + 2] = bb;
    colors[i4 + 3] = clamp(baseA * depthFade, 0, 1);

    const depthSize = lerp(
      1.0 - CONFIG.Z_SIZE_VARIATION,
      1.0 + CONFIG.Z_SIZE_VARIATION,
      z01
    );
    sizes[i] = pSize[i] * depthSize;
  }

  pointsGeom.attributes.position.needsUpdate = true;
  pointsGeom.attributes.color.needsUpdate = true;
  pointsGeom.attributes.size.needsUpdate = true;

  if (CONFIG.TRAILS) {
    renderer.setRenderTarget(rtPoints);
    renderer.clear(true, true, true);
    renderer.render(pointsScene, camera);

    const prev = ping === 0 ? rtA : rtB;
    const next = ping === 0 ? rtB : rtA;

    //const decay = scrollBoostTimer > 0 ? CONFIG.SCROLL_DECAY_BOOST : CONFIG.TRAIL_DECAY;
    const decay = CONFIG.TRAIL_DECAY;

    trailMat.uniforms.uPrev.value = prev.texture;
    trailMat.uniforms.uCurr.value = rtPoints.texture;
    trailMat.uniforms.uDecay.value = decay;
    trailMat.uniforms.uExposure.value = CONFIG.TRAIL_EXPOSURE;

    renderer.setRenderTarget(next);
    renderer.render(trailScene, trailCam);

    trailMat.uniforms.uPrev.value = next.texture;
    trailMat.uniforms.uCurr.value = next.texture;
    trailMat.uniforms.uDecay.value = 1.0;
    trailMat.uniforms.uExposure.value = 1.0;

    renderer.setRenderTarget(null);
    renderer.render(trailScene, trailCam);

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

function setDebugHUDVisible(on) {
  const el = document.getElementById("debug-hud");
  if (!el) return;
  el.style.display = on ? "block" : "none";
}

setDebugHUDVisible(false);

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (k === "`") {
    const el = document.getElementById("debug-hud");
    if (el) el.style.display = (el.style.display === "none") ? "block" : "none";
  }
});

// =======================================================
// Start
// =======================================================
setupThree();
resize();
init();
requestAnimationFrame(animate);
setupDebugHUD();

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
