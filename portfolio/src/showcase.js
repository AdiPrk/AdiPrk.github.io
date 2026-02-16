import * as THREE from "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.min.js";

const canvas = document.getElementById("bg-canvas");
if (!canvas) throw new Error('SHOWCASE: missing <canvas id="bg-canvas">');

// ===============================
// DPR / ZOOM LOCK
// ===============================
const BASE_DPR = window.devicePixelRatio || 1;
const FIXED_RENDER_DPR = Math.min(BASE_DPR, 1.25);

// =======================================================
// CONFIG
// =======================================================
const CONFIG = {
  // Particle count
  DENSITY_DIVISOR: 100,
  MIN_PARTICLES: 100,
  MAX_PARTICLES: 1000,

  // Depth volume
  DEPTH: 900,

  // Simulation
  FORCE: 140,
  DRAG: 0.988,
  MAX_SPEED: 520,

  // Pressure
  PRESSURE_STRENGTH: 0.18,

  // Sprite sizing (CSS px)
  MIN_POINT_PX: 1.55,
  MAX_POINT_PX: 2.35,
  Z_ALPHA_VARIATION: 0.28,
  Z_SIZE_VARIATION: 0.25,

  // Base alpha (per particle)
  BASE_ALPHA: 0.175,

  // Blending
  BLENDING: "additive", // "additive" or "normal"

  // Trails (fixed)
  TRAILS: true,
  TRAIL_DECAY: 0.995,
  TRAIL_EXPOSURE: 0.97,
  TRAIL_RES_SCALE: 0.75,

  // Section-mask gating (OPTION 4)
  TRAIL_SECTION_MIX: 0.10,
  TRAIL_SECTION_EPS: (1.0 / 255.0) * 2.0,

  // Sections
  MAX_SECTIONS: 3,

  // INTERNAL RESOLUTION CAP (fixed; NOT adaptive)
  // These are DEVICE pixels AFTER applying FIXED_RENDER_DPR.
  INTERNAL_MAX_W: 1920,
  INTERNAL_MAX_H: 1080,
};

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;

// =======================================================
// Debug HUD (optional)
// =======================================================
const DBG = {
  root: null,
  fpsEl: null,
  msEl: null,
  particlesEl: null,
  dprEl: null,
  trailEl: null,
  capEl: null,
  rtEl: null,

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
  DBG.trailEl = document.getElementById("dbg-trail");
  DBG.capEl = document.getElementById("dbg-cap");
  DBG.rtEl = document.getElementById("dbg-rt");

  if (DBG.dprEl) DBG.dprEl.textContent = `${FIXED_RENDER_DPR.toFixed(2)} (fixed)`;
}

function updateDebugHUD(dt) {
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
    if (DBG.trailEl) DBG.trailEl.textContent = CONFIG.TRAILS ? `${CONFIG.TRAIL_RES_SCALE.toFixed(2)}` : `off`;
    if (DBG.capEl) DBG.capEl.textContent = `${capScale.toFixed(3)}`;
    if (DBG.rtEl) DBG.rtEl.textContent = rtPointsMRT ? `${rtPointsMRT.width}x${rtPointsMRT.height}` : `—`;

    DBG.frames = 0;
    DBG.acc = 0;
  }
}

function setDebugHUDVisible(on) {
  const el = document.getElementById("debug-hud");
  if (!el) return;
  el.style.display = on ? "block" : "none";
}

setDebugHUDVisible(false);
window.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "`") {
    const el = document.getElementById("debug-hud");
    if (el) el.style.display = el.style.display === "none" ? "block" : "none";
  }
});

// =======================================================
// Sections (CPU packed -> uniforms)
// =======================================================
let secCount = 0;
let secTopBottom = new Float32Array(CONFIG.MAX_SECTIONS * 2);
let secColor = new Float32Array(CONFIG.MAX_SECTIONS * 4);
let secType = new Float32Array(CONFIG.MAX_SECTIONS);
let sectionMap = [];

const TYPE_DEFAULT = 0;
const TYPE_CIRCUIT = 1;
const TYPE_NETWORK = 2;
const TYPE_STREAM = 3;

function parseRGBAtoFloats(rgbaStr) {
  const m = rgbaStr.match(/rgba\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/i);
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
      type: sec.dataset.type,
      color: parseRGBAtoFloats(colorRGBA),
    });
  });

  sectionMap.sort((a, b) => a.top - b.top);
  secCount = Math.min(sectionMap.length, CONFIG.MAX_SECTIONS);

  for (let i = 0; i < secCount; i++) {
    const s = sectionMap[i];
    secTopBottom[i * 2 + 0] = s.top;
    secTopBottom[i * 2 + 1] = s.bottom;

    secColor[i * 4 + 0] = s.color.r;
    secColor[i * 4 + 1] = s.color.g;
    secColor[i * 4 + 2] = s.color.b;
    secColor[i * 4 + 3] = s.color.a;

    secType[i] = typeToCode(s.type);
  }
}

let _scrollRafPending = false;
function onScrollUpdate() {
  if (_scrollRafPending) return;
  _scrollRafPending = true;
  requestAnimationFrame(() => {
    _scrollRafPending = false;
    mapSections();
    pushSectionUniforms();
  });
}
window.addEventListener("scroll", onScrollUpdate, { passive: true });

// =======================================================
// THREE state
// =======================================================
let renderer;

let simScene, simCam, simQuad;
let renderScene, renderCam, points;

let trailScene, trailCam, trailQuad;

let particleCount = 0;

let texSize = 0;
let simPing = 0;

let initMat, simMat;
let pointsMatScreen, pointsMatMRT;

let mrtA = null;
let mrtB = null;

// Points RT (MRT): [0]=color, [1]=mask(id)
let rtPointsMRT = null;

// Trails RT (MRT): [0]=accumColor, [1]=accumMask
let rtTrailA = null;
let rtTrailB = null;
let trailPing = 0;

let trailAccMat = null;
let trailPresentMat = null;

// Internal cap + RT scale total (cap * fixed trail scale)
let capScale = 1.0;
let rtScaleTotal = 1.0;

// =======================================================
// Capabilities
// =======================================================
function assertWebGL2AndFloatRT() {
  const gl = renderer.getContext();
  const isWebGL2 = typeof WebGL2RenderingContext !== "undefined" && gl instanceof WebGL2RenderingContext;
  if (!isWebGL2) throw new Error("SHOWCASE: WebGL2 required.");

  const extColorFloat = gl.getExtension("EXT_color_buffer_float");
  if (!extColorFloat) throw new Error("SHOWCASE: EXT_color_buffer_float missing (float MRT sim needs it).");
}

function disposeRT(rt) {
  if (rt) rt.dispose();
}

// =======================================================
// INTERNAL RESOLUTION CAP HELPERS
// =======================================================
function getBasePixelSize() {
  const baseW = Math.max(1, Math.floor(window.innerWidth * FIXED_RENDER_DPR));
  const baseH = Math.max(1, Math.floor(window.innerHeight * FIXED_RENDER_DPR));
  return { baseW, baseH };
}

function computeCapScale() {
  const { baseW, baseH } = getBasePixelSize();
  const sW = CONFIG.INTERNAL_MAX_W / baseW;
  const sH = CONFIG.INTERNAL_MAX_H / baseH;
  return clamp(Math.min(1.0, sW, sH), 0.05, 1.0);
}

// =======================================================
// Shaders (NO manual #version)
// =======================================================
const SIM_COMMON = `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform float uDt;
uniform float uDepth;
uniform float uForce;
uniform float uDrag;
uniform float uMaxSpeed;
uniform float uPressure;
uniform float uScrollY;

uniform int   uSecCount;
uniform vec2  uSecTopBottom[${CONFIG.MAX_SECTIONS}];
uniform vec4  uSecColor[${CONFIG.MAX_SECTIONS}];
uniform float uSecType[${CONFIG.MAX_SECTIONS}];

uniform sampler2D uPosTex;
uniform sampler2D uVelTex;

in vec2 vUv;

float n2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0 - 2.0*f);
  float a = fract(sin(dot(i, vec2(127.1, 311.7))) * 43758.5453123);
  float b = fract(sin(dot(i + vec2(1.0, 0.0), vec2(127.1, 311.7))) * 43758.5453123);
  float c = fract(sin(dot(i + vec2(0.0, 1.0), vec2(127.1, 311.7))) * 43758.5453123);
  float d = fract(sin(dot(i + vec2(1.0, 1.0), vec2(127.1, 311.7))) * 43758.5453123);
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y) * 2.0 - 1.0;
}

float sectionTypeForAbsY(float absY) {
  for (int i = 0; i < ${CONFIG.MAX_SECTIONS}; i++) {
    if (i >= uSecCount) break;
    vec2 tb = uSecTopBottom[i];
    if (absY >= tb.x && absY < tb.y) return uSecType[i];
  }
  return 0.0;
}

vec3 fieldA(vec2 n, float t) {
  float wx = n2(n * 0.7 + vec2(t*0.15, -t*0.12));
  float wy = n2(n * 0.7 + vec2(-t*0.10, t*0.14));
  vec2 p = (n + vec2(wx, wy)*0.35) * 1.4;
  float phi = n2(p + vec2(t*0.32, -t*0.27));
  float e = 0.012;
  float dx = (n2((p + vec2(e,0.0)) + vec2(t*0.32, -t*0.27)) - phi) / e;
  float dy = (n2((p + vec2(0.0,e)) + vec2(t*0.32, -t*0.27)) - phi) / e;
  return vec3(dy, -dx, phi);
}

vec3 fieldB(vec2 n, float t) {
  vec2 p = n * 2.2;
  float phi =
    sin((p.x * 2.2 + t * 0.9) + sin(p.y * 1.7 - t * 0.6)) +
    sin((p.y * 2.0 - t * 0.8) + sin(p.x * 1.9 + t * 0.5));
  float e = 0.02;
  float phi_dx =
    (sin(((p.x+e)*2.2 + t*0.9) + sin(p.y*1.7 - t*0.6)) +
     sin((p.y*2.0 - t*0.8) + sin((p.x+e)*1.9 + t*0.5)) - phi) / e;
  float phi_dy =
    (sin((p.x*2.2 + t*0.9) + sin((p.y+e)*1.7 - t*0.6)) +
     sin(((p.y+e)*2.0 - t*0.8) + sin(p.x*1.9 + t*0.5)) - phi) / e;
  return vec3(phi_dy, -phi_dx, sin(phi));
}

vec3 fieldC(vec2 n, float t) {
  float fx = 1.0 + 0.55 * sin((n.y * 6.0 - t * 1.0) * 2.0);
  float fy = 0.40 * sin((n.x * 7.0 + t * 0.8) * 2.0) +
             0.25 * sin((n.y * 3.0 + t) * 2.0);
  float fz = sin((n.x * 4.0 + n.y * 3.0 + t * 1.3) * 1.2);
  return vec3(fx, fy, fz);
}

vec3 mixFields(vec2 n, float t, float styleKey) {
  vec3 a = fieldA(n, t);
  vec3 b = fieldB(n, t*0.9 + 3.7);
  vec3 c = fieldC(n, t);

  if (styleKey < 0.33) {
    float k = styleKey / 0.33;
    float m = k * 0.45;
    return mix(a, b, m);
  } else if (styleKey < 0.66) {
    float k = (styleKey - 0.33) / 0.33;
    float m = 0.35 + k * 0.45;
    return mix(b, a, m);
  } else {
    float k = (styleKey - 0.66) / 0.34;
    float m = 0.35 + k * 0.55;
    return mix(a, c, m);
  }
}
`;

const SIM_VS = `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const INIT_FS = `
precision highp float;

layout(location=0) out vec4 outPos;
layout(location=1) out vec4 outVel;

uniform vec2  uRes;
uniform float uDepth;
uniform float uMinSize;
uniform float uMaxSize;

in vec2 vUv;

float hash12(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  float r1 = hash12(vUv + 0.11);
  float r2 = hash12(vUv + 7.37);
  float r3 = hash12(vUv + 19.13);
  float r4 = hash12(vUv + 31.77);

  float x = r1 * uRes.x;
  float y = r2 * uRes.y;
  float z = (r3 * 2.0 - 1.0) * uDepth;
  float styleKey = fract(r4 + r1 * 0.73);

  float vx = (hash12(vUv + 101.3) * 2.0 - 1.0) * 12.0;
  float vy = (hash12(vUv + 203.9) * 2.0 - 1.0) * 12.0;

  float phase = hash12(vUv + 55.5) * 6.28318530718;
  float size  = mix(uMinSize, uMaxSize, hash12(vUv + 88.8));

  outPos = vec4(x, y, z, styleKey);
  outVel = vec4(vx, vy, phase, size);
}
`;

const SIM_FS = `
precision highp float;

layout(location=0) out vec4 outPos;
layout(location=1) out vec4 outVel;

${SIM_COMMON}

void main() {
  vec4 P = texture(uPosTex, vUv);
  vec4 V = texture(uVelTex, vUv);

  float x = P.x;
  float y = P.y;
  float z = P.z;
  float styleKey = P.w;

  float vx = V.x;
  float vy = V.y;
  float phase = V.z;
  float size = V.w;

  vec2 n = vec2(x / max(1.0, uRes.x), y / max(1.0, uRes.y)) * 2.0 - 1.0;

  float tt = uTime + phase * 0.08;
  float absY = y + uScrollY;
  float typeCode = sectionTypeForAbsY(absY);

  float gain = 1.0;
  if (typeCode == 1.0) { gain = 1.05; tt *= 0.95; }
  else if (typeCode == 2.0) { gain = 1.10; tt *= 1.08; }
  else if (typeCode == 3.0) { gain = 1.00; tt *= 0.85; }

  vec3 f = mixFields(n, tt, styleKey);
  float ax = f.x;
  float ay = f.y;
  float zz = f.z;

  if (typeCode == 3.0) {
    ax += 0.9;
    ay += 0.18 * sin((n.x * 2.6 + tt * 0.9) * 2.0);
  } else if (typeCode == 1.0) {
    float twist = 0.55 + 0.35 * sin(tt * 0.7 + (n.x * 3.0 + n.y * 2.0) * 2.0);
    float rx = -n.y * twist;
    float ry =  n.x * twist;
    ax = ax * 0.78 + rx * 0.22;
    ay = ay * 0.78 + ry * 0.22;
  } else if (typeCode == 2.0) {
    ax *= 1.25;
    ay *= 1.25;
  }

  float um = 0.85 + 0.30 * sin((fract(absY * 0.002) * 6.0 + tt * 0.25) * 2.0);
  ax *= gain * um;
  ay *= gain * um;

  vec2 pn = n * 2.2 + vec2(uTime * 0.2, -uTime * 0.18);
  float px = n2(pn);
  float py = n2(pn.yx + 17.3);
  ax += px * uPressure;
  ay += py * uPressure;

  vx = (vx + ax * uForce * uDt) * uDrag;
  vy = (vy + ay * uForce * uDt) * uDrag;

  float sp2 = vx*vx + vy*vy;
  float maxSp2 = uMaxSpeed*uMaxSpeed;
  if (sp2 > maxSp2) {
    float inv = uMaxSpeed / sqrt(sp2);
    vx *= inv;
    vy *= inv;
  }

  x += vx * uDt;
  y += vy * uDt;

  float zTarget = zz * uDepth;
  z += (zTarget - z) * (0.65 * uDt);

  if (x > uRes.x) x = 0.0;
  else if (x < 0.0) x = uRes.x;

  if (y > uRes.y) y = 0.0;
  else if (y < 0.0) y = uRes.y;

  if (z > uDepth) z = -uDepth;
  else if (z < -uDepth) z = uDepth;

  outPos = vec4(x, y, z, styleKey);
  outVel = vec4(vx, vy, phase, size);
}
`;

// ----- Points Vertex (shared) -----
const POINTS_VS = `
precision highp float;

in float aIndex;

uniform sampler2D uPosTex;
uniform sampler2D uVelTex;

uniform float uTexSize;
uniform vec2  uRes;
uniform float uDepth;

uniform float uMinPointPx;
uniform float uZSizeVar;
uniform float uFixedDPR;
uniform float uPointScale;

uniform float uScrollY;
uniform int   uSecCount;
uniform vec2  uSecTopBottom[${CONFIG.MAX_SECTIONS}];
uniform vec4  uSecColor[${CONFIG.MAX_SECTIONS}];

out vec4  vColor;
out float vDepth01;
out float vSecId;

vec2 idxToUv(float idx, float size) {
  float x = mod(idx, size);
  float y = floor(idx / size);
  return (vec2(x, y) + 0.5) / size;
}

float hash11(float x) { return fract(sin(x * 127.1) * 43758.5453123); }

float sectionIndexForAbsY(float absY) {
  for (int i = 0; i < ${CONFIG.MAX_SECTIONS}; i++) {
    if (i >= uSecCount) break;
    vec2 tb = uSecTopBottom[i];
    if (absY >= tb.x && absY < tb.y) return float(i + 1);
  }
  return 0.0;
}

vec4 sectionColorForAbsY(float absY) {
  for (int i = 0; i < ${CONFIG.MAX_SECTIONS}; i++) {
    if (i >= uSecCount) break;
    vec2 tb = uSecTopBottom[i];
    if (absY >= tb.x && absY < tb.y) return uSecColor[i];
  }
  return vec4(1.0);
}

void main() {
  vec2 uv = idxToUv(aIndex, uTexSize);

  vec4 P = texture(uPosTex, uv); // x,y,z,style
  vec4 V = texture(uVelTex, uv); // vx,vy,phase,size

  float x = P.x;
  float y = P.y;
  float z = P.z;
  float styleKey = P.w;

  float sizeCss = V.w;
  float absY = y + uScrollY;

  vec4 sc = sectionColorForAbsY(absY);
  float si = sectionIndexForAbsY(absY);
  vSecId = si / float(${CONFIG.MAX_SECTIONS + 1});

  float j = (hash11(styleKey * 999.7) - 0.5) * 0.10;
  vec3 rgb = clamp(sc.rgb + vec3(j), 0.0, 1.0);

  float z01 = (z / uDepth) * 0.5 + 0.5;
  vDepth01 = z01;

  float depthSize = mix(1.0 - uZSizeVar, 1.0 + uZSizeVar, z01);

  // Constant CSS px -> framebuffer px via fixed DPR.
  // uPointScale scales point size when rendering into downscaled RTs (for trails).
  float px = max(sizeCss * depthSize, uMinPointPx) * uFixedDPR * uPointScale;
  gl_PointSize = px;

  float nx = (x / max(1.0, uRes.x)) * 2.0 - 1.0;
  float ny = 1.0 - (y / max(1.0, uRes.y)) * 2.0;
  gl_Position = vec4(nx, ny, 0.0, 1.0);

  vColor = vec4(rgb, 1.0);
}
`;

const POINTS_FS_SCREEN = `
precision highp float;

in vec4 vColor;
in float vDepth01;

uniform float uBaseAlpha;
uniform float uZAlphaVar;

out vec4 outColor;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float r2 = dot(p,p);

  float mask = smoothstep(0.28, 0.0, r2);
  float depthFade = mix(1.0 - uZAlphaVar, 1.0 + uZAlphaVar, vDepth01);

  float a = clamp(uBaseAlpha * mask * depthFade, 0.0, 1.0);
  outColor = vec4(vColor.rgb, a);
}
`;

const POINTS_FS_MRT = `
precision highp float;

in vec4 vColor;
in float vDepth01;
in float vSecId;

uniform float uBaseAlpha;
uniform float uZAlphaVar;

layout(location=0) out vec4 outColor;
layout(location=1) out vec4 outMask;

void main() {
  vec2 p = gl_PointCoord - vec2(0.5);
  float r2 = dot(p,p);

  float mask = smoothstep(0.28, 0.0, r2);
  float depthFade = mix(1.0 - uZAlphaVar, 1.0 + uZAlphaVar, vDepth01);

  float a = clamp(uBaseAlpha * mask * depthFade, 0.0, 1.0);

  outColor = vec4(vColor.rgb * a, 1.0);
  outMask  = vec4(vSecId, a, 0.0, 1.0);
}
`;

const FSQ_VS = `
precision highp float;
in vec3 position;
out vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const TRAIL_ACC_FS = `
precision highp float;

in vec2 vUv;

uniform sampler2D uPrevColor;
uniform sampler2D uPrevMask;
uniform sampler2D uCurrColor;
uniform sampler2D uCurrMask;

uniform float uDecay;
uniform float uExposure;

uniform float uSectionMix;
uniform float uSectionEps;

layout(location=0) out vec4 outColor;
layout(location=1) out vec4 outMask;

void main() {
  vec3 prevC = texture(uPrevColor, vUv).rgb;
  vec2 prevM = texture(uPrevMask,  vUv).rg;
  vec3 currC = texture(uCurrColor, vUv).rgb;
  vec2 currM = texture(uCurrMask,  vUv).rg;

  float prevId = prevM.r;
  float currId = currM.r;

  float prevEnergy = prevM.g;
  float currEnergy = currM.g;

  float mismatch = step(uSectionEps, abs(prevId - currId));
  float hasCurr  = step(0.002, currEnergy);
  float damp = mix(1.0, uSectionMix, mismatch * hasCurr);

  vec3 col = (prevC * uDecay) * damp + currC;
  col *= uExposure;

  float nextId = mix(prevId, currId, hasCurr);
  float nextEnergy = mix(prevEnergy * uDecay, currEnergy, hasCurr);

  outColor = vec4(col, 1.0);
  outMask  = vec4(nextId, nextEnergy, 0.0, 1.0);
}
`;

const TRAIL_PRESENT_FS = `
precision highp float;
in vec2 vUv;
uniform sampler2D uTex;
out vec4 outColor;
void main() {
  vec3 col = texture(uTex, vUv).rgb;
  outColor = vec4(col, 1.0);
}
`;

// =======================================================
// Setup three + materials
// =======================================================
function setupThree() {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: "high-performance",
  });

  renderer.setClearAlpha(0);
  renderer.setPixelRatio(FIXED_RENDER_DPR);

  assertWebGL2AndFloatRT();

  simScene = new THREE.Scene();
  simCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  renderScene = new THREE.Scene();
  renderCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  const fsGeo = new THREE.PlaneGeometry(2, 2);

  initMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: SIM_VS,
    fragmentShader: INIT_FS,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uDepth: { value: CONFIG.DEPTH },
      uMinSize: { value: CONFIG.MIN_POINT_PX },
      uMaxSize: { value: CONFIG.MAX_POINT_PX },
    },
    depthTest: false,
    depthWrite: false,
  });

  simMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: SIM_VS,
    fragmentShader: SIM_FS,
    uniforms: {
      uRes: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uDt: { value: 0.016 },

      uDepth: { value: CONFIG.DEPTH },
      uForce: { value: CONFIG.FORCE },
      uDrag: { value: CONFIG.DRAG },
      uMaxSpeed: { value: CONFIG.MAX_SPEED },
      uPressure: { value: CONFIG.PRESSURE_STRENGTH },
      uScrollY: { value: 0 },

      uSecCount: { value: 0 },
      uSecTopBottom: { value: new Array(CONFIG.MAX_SECTIONS).fill(new THREE.Vector2()) },
      uSecColor: { value: new Array(CONFIG.MAX_SECTIONS).fill(new THREE.Vector4(1, 1, 1, 1)) },
      uSecType: { value: new Array(CONFIG.MAX_SECTIONS).fill(0) },

      uPosTex: { value: null },
      uVelTex: { value: null },
    },
    depthTest: false,
    depthWrite: false,
  });

  simQuad = new THREE.Mesh(fsGeo, simMat);
  simScene.add(simQuad);

  // Trails (optional)
  trailScene = new THREE.Scene();
  trailCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  trailAccMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: FSQ_VS,
    fragmentShader: TRAIL_ACC_FS,
    uniforms: {
      uPrevColor: { value: null },
      uPrevMask: { value: null },
      uCurrColor: { value: null },
      uCurrMask: { value: null },

      uDecay: { value: CONFIG.TRAIL_DECAY },
      uExposure: { value: CONFIG.TRAIL_EXPOSURE },

      uSectionMix: { value: CONFIG.TRAIL_SECTION_MIX },
      uSectionEps: { value: CONFIG.TRAIL_SECTION_EPS },
    },
    depthTest: false,
    depthWrite: false,
  });

  trailPresentMat = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: FSQ_VS,
    fragmentShader: TRAIL_PRESENT_FS,
    uniforms: { uTex: { value: null } },
    depthTest: false,
    depthWrite: false,
  });

  trailQuad = new THREE.Mesh(fsGeo, trailAccMat);
  trailScene.add(trailQuad);
}

function buildPointsMaterials() {
  const blendingMode = CONFIG.BLENDING === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending;

  const baseUniforms = {
    uPosTex: { value: null },
    uVelTex: { value: null },

    uTexSize: { value: 1.0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uDepth: { value: CONFIG.DEPTH },

    uMinPointPx: { value: CONFIG.MIN_POINT_PX },
    uZSizeVar: { value: CONFIG.Z_SIZE_VARIATION },
    uFixedDPR: { value: FIXED_RENDER_DPR },
    uPointScale: { value: 1.0 },

    uBaseAlpha: { value: CONFIG.BASE_ALPHA },
    uZAlphaVar: { value: CONFIG.Z_ALPHA_VARIATION },

    uScrollY: { value: 0 },
    uSecCount: { value: 0 },
    uSecTopBottom: { value: new Array(CONFIG.MAX_SECTIONS).fill(new THREE.Vector2()) },
    uSecColor: { value: new Array(CONFIG.MAX_SECTIONS).fill(new THREE.Vector4(1, 1, 1, 1)) },
  };

  // THREE.UniformsUtils.clone keeps it clean + avoids manual deep clone logic.
  pointsMatScreen = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: POINTS_VS,
    fragmentShader: POINTS_FS_SCREEN,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: blendingMode,
    uniforms: THREE.UniformsUtils.clone(baseUniforms),
  });

  pointsMatMRT = new THREE.RawShaderMaterial({
    glslVersion: THREE.GLSL3,
    vertexShader: POINTS_VS,
    fragmentShader: POINTS_FS_MRT,
    transparent: false,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
    uniforms: THREE.UniformsUtils.clone(baseUniforms),
  });
}

// =======================================================
// Geometry: static particle indices
// =======================================================
function buildPointsGeometry(count) {
  const geo = new THREE.BufferGeometry();

  const idx = new Float32Array(count);
  for (let i = 0; i < count; i++) idx[i] = i;

  // Position attribute is unused (we fetch from textures), but three.js expects it.
  const dummyPos = new Float32Array(count * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(dummyPos, 3));
  geo.setAttribute("aIndex", new THREE.BufferAttribute(idx, 1));
  return geo;
}

// =======================================================
// MRT helpers (r180): WebGLRenderTarget with { count }
// =======================================================
function makeMRT_Float(w, h, count = 2) {
  return new THREE.WebGLRenderTarget(w, h, {
    count,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.FloatType,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function makeMRT_ByteLinear(w, h, count = 2) {
  return new THREE.WebGLRenderTarget(w, h, {
    count,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat,
    type: THREE.UnsignedByteType,
    depthBuffer: false,
    stencilBuffer: false,
  });
}

function disposeSimTargets() {
  if (mrtA) mrtA.dispose();
  if (mrtB) mrtB.dispose();
  mrtA = null;
  mrtB = null;
}

// =======================================================
// Init sim state on GPU
// =======================================================
function initSimState() {
  simQuad.material = initMat;

  initMat.uniforms.uRes.value.set(window.innerWidth, window.innerHeight);
  initMat.uniforms.uDepth.value = CONFIG.DEPTH;
  initMat.uniforms.uMinSize.value = CONFIG.MIN_POINT_PX;
  initMat.uniforms.uMaxSize.value = CONFIG.MAX_POINT_PX;

  renderer.setRenderTarget(mrtA);
  renderer.clear(true, true, true);
  renderer.render(simScene, simCam);
  renderer.setRenderTarget(null);

  simPing = 0;
  simQuad.material = simMat;
}

// =======================================================
// Sections -> uniforms
// =======================================================
function pushSectionUniforms() {
  if (!simMat || !pointsMatScreen || !pointsMatMRT) return;

  const v2 = new Array(CONFIG.MAX_SECTIONS);
  const v4 = new Array(CONFIG.MAX_SECTIONS);
  const t = new Array(CONFIG.MAX_SECTIONS);

  for (let i = 0; i < CONFIG.MAX_SECTIONS; i++) {
    const top = i < secCount ? secTopBottom[i * 2 + 0] : 1e9;
    const bot = i < secCount ? secTopBottom[i * 2 + 1] : 1e9;

    const r = i < secCount ? secColor[i * 4 + 0] : 1;
    const g = i < secCount ? secColor[i * 4 + 1] : 1;
    const b = i < secCount ? secColor[i * 4 + 2] : 1;
    const a = i < secCount ? secColor[i * 4 + 3] : 1;

    v2[i] = new THREE.Vector2(top, bot);
    v4[i] = new THREE.Vector4(r, g, b, a);
    t[i] = i < secCount ? secType[i] : 0;
  }

  simMat.uniforms.uSecCount.value = secCount;
  simMat.uniforms.uSecTopBottom.value = v2;
  simMat.uniforms.uSecColor.value = v4;
  simMat.uniforms.uSecType.value = t;

  for (const pm of [pointsMatScreen, pointsMatMRT]) {
    pm.uniforms.uSecCount.value = secCount;
    pm.uniforms.uSecTopBottom.value = v2;
    pm.uniforms.uSecColor.value = v4;
  }
}

// =======================================================
// Trails + points RT allocation (fixed scale + cap)
// =======================================================
function allocateTrailsAndPointsRTs() {
  disposeRT(rtPointsMRT);
  disposeRT(rtTrailA);
  disposeRT(rtTrailB);
  rtPointsMRT = null;
  rtTrailA = null;
  rtTrailB = null;

  if (!CONFIG.TRAILS) {
    rtScaleTotal = 1.0;
    return;
  }

  capScale = computeCapScale();
  rtScaleTotal = capScale * CONFIG.TRAIL_RES_SCALE;

  const { baseW, baseH } = getBasePixelSize();
  const w = Math.max(2, Math.floor(baseW * rtScaleTotal));
  const h = Math.max(2, Math.floor(baseH * rtScaleTotal));

  rtPointsMRT = makeMRT_ByteLinear(w, h, 2);
  rtTrailA = makeMRT_ByteLinear(w, h, 2);
  rtTrailB = makeMRT_ByteLinear(w, h, 2);

  clearTrails();
}

function clearTrails() {
  if (!CONFIG.TRAILS || !rtTrailA || !rtTrailB) return;

  renderer.setRenderTarget(rtTrailA);
  renderer.clear(true, true, true);
  renderer.setRenderTarget(rtTrailB);
  renderer.clear(true, true, true);
  renderer.setRenderTarget(null);

  trailPing = 0;
}

// =======================================================
// Resize / Init
// =======================================================
function computeParticleCount() {
  // Keep particle count stable vs 4K by using capped effective resolution.
  const cap = computeCapScale();
  const effW = Math.max(1, Math.floor(window.innerWidth * cap));
  const effH = Math.max(1, Math.floor(window.innerHeight * cap));

  let n = Math.floor((effW * effH) / CONFIG.DENSITY_DIVISOR);
  n = clamp(n, CONFIG.MIN_PARTICLES, CONFIG.MAX_PARTICLES);
  return n;
}

function resizeRendererAndUniforms() {
  renderer.setPixelRatio(FIXED_RENDER_DPR);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  capScale = computeCapScale();

  mapSections();
  pushSectionUniforms();

  const w = window.innerWidth;
  const h = window.innerHeight;

  if (simMat) simMat.uniforms.uRes.value.set(w, h);
  if (initMat) initMat.uniforms.uRes.value.set(w, h);

  if (pointsMatScreen) pointsMatScreen.uniforms.uRes.value.set(w, h);
  if (pointsMatMRT) pointsMatMRT.uniforms.uRes.value.set(w, h);

  allocateTrailsAndPointsRTs();

  if (DBG.dprEl) DBG.dprEl.textContent = `${FIXED_RENDER_DPR.toFixed(2)} (fixed)`;
}

function init() {
  particleCount = computeParticleCount();
  texSize = Math.ceil(Math.sqrt(particleCount));

  disposeSimTargets();
  mrtA = makeMRT_Float(texSize, texSize, 2);
  mrtB = makeMRT_Float(texSize, texSize, 2);

  initSimState();

  if (points) {
    renderScene.remove(points);
    points.geometry.dispose();
  }

  buildPointsMaterials();

  const geo = buildPointsGeometry(particleCount);
  points = new THREE.Points(geo, pointsMatScreen);
  renderScene.add(points);

  for (const pm of [pointsMatScreen, pointsMatMRT]) {
    pm.uniforms.uTexSize.value = texSize;
    pm.uniforms.uDepth.value = CONFIG.DEPTH;
    pm.uniforms.uMinPointPx.value = CONFIG.MIN_POINT_PX;
    pm.uniforms.uZSizeVar.value = CONFIG.Z_SIZE_VARIATION;
    pm.uniforms.uFixedDPR.value = FIXED_RENDER_DPR;
    pm.uniforms.uBaseAlpha.value = CONFIG.BASE_ALPHA;
    pm.uniforms.uZAlphaVar.value = CONFIG.Z_ALPHA_VARIATION;
  }

  pushSectionUniforms();
  resizeRendererAndUniforms();
  clearTrails();
}

// =======================================================
// Render with option 4 section mask gating
// =======================================================
function renderWithTrails(scrollY) {
  // Render into downscaled/capped RTs. Scale point size so upsample looks consistent.
  pointsMatMRT.uniforms.uPointScale.value = rtScaleTotal;
  pointsMatMRT.uniforms.uScrollY.value = scrollY;

  points.material = pointsMatMRT;

  renderer.setRenderTarget(rtPointsMRT);
  renderer.clear(true, true, true);
  renderer.render(renderScene, renderCam);

  const prev = trailPing === 0 ? rtTrailA : rtTrailB;
  const next = trailPing === 0 ? rtTrailB : rtTrailA;

  trailAccMat.uniforms.uPrevColor.value = prev.textures[0];
  trailAccMat.uniforms.uPrevMask.value = prev.textures[1];
  trailAccMat.uniforms.uCurrColor.value = rtPointsMRT.textures[0];
  trailAccMat.uniforms.uCurrMask.value = rtPointsMRT.textures[1];

  // (Fixed config values; no adaptive changes)
  trailAccMat.uniforms.uDecay.value = CONFIG.TRAIL_DECAY;
  trailAccMat.uniforms.uExposure.value = CONFIG.TRAIL_EXPOSURE;
  trailAccMat.uniforms.uSectionMix.value = CONFIG.TRAIL_SECTION_MIX;
  trailAccMat.uniforms.uSectionEps.value = CONFIG.TRAIL_SECTION_EPS;

  trailQuad.material = trailAccMat;
  renderer.setRenderTarget(next);
  renderer.render(trailScene, trailCam);

  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);

  trailPresentMat.uniforms.uTex.value = next.textures[0];
  trailQuad.material = trailPresentMat;
  renderer.render(trailScene, trailCam);

  trailPing = 1 - trailPing;

  // Restore normal points material for next frame
  points.material = pointsMatScreen;
  pointsMatScreen.uniforms.uPointScale.value = 1.0;
}

function renderDirect(scrollY) {
  points.material = pointsMatScreen;
  pointsMatScreen.uniforms.uPointScale.value = 1.0;
  pointsMatScreen.uniforms.uScrollY.value = scrollY;

  renderer.setRenderTarget(null);
  renderer.clear(true, true, true);
  renderer.render(renderScene, renderCam);
}

// =======================================================
// Main loop (fixed-step GPU simulation)
// =======================================================
let lastTime = 0;
let acc = 0;

const FIXED_DT = 1 / 120;
const MAX_FRAME_DT = 0.10;
const MAX_STEPS_PER_FRAME = 6;

function animate(ts) {
  if (!lastTime) lastTime = ts;

  let frameDt = (ts - lastTime) / 1000;
  lastTime = ts;
  frameDt = Math.min(frameDt, MAX_FRAME_DT);

  updateDebugHUD(frameDt);

  acc += frameDt;

  const scrollY = window.scrollY;

  // Continuous uniforms
  simMat.uniforms.uTime.value = ts / 1000;

  // Sync sim params (in case you tweak CONFIG live)
  simMat.uniforms.uDepth.value = CONFIG.DEPTH;
  simMat.uniforms.uForce.value = CONFIG.FORCE;
  simMat.uniforms.uDrag.value = CONFIG.DRAG;
  simMat.uniforms.uMaxSpeed.value = CONFIG.MAX_SPEED;
  simMat.uniforms.uPressure.value = CONFIG.PRESSURE_STRENGTH;

  // Fixed timestep sim steps
  let steps = 0;
  while (acc >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
    simMat.uniforms.uDt.value = FIXED_DT;
    simMat.uniforms.uScrollY.value = scrollY;

    const src = simPing === 0 ? mrtA : mrtB;
    const dst = simPing === 0 ? mrtB : mrtA;

    simMat.uniforms.uPosTex.value = src.textures[0];
    simMat.uniforms.uVelTex.value = src.textures[1];

    renderer.setRenderTarget(dst);
    renderer.render(simScene, simCam);
    renderer.setRenderTarget(null);

    simPing = 1 - simPing;

    acc -= FIXED_DT;
    steps++;
  }

  if (acc > FIXED_DT * MAX_STEPS_PER_FRAME) acc = 0;

  // Bind latest sim textures to point materials (once per frame)
  const cur = simPing === 0 ? mrtA : mrtB;
  for (const pm of [pointsMatScreen, pointsMatMRT]) {
    pm.uniforms.uPosTex.value = cur.textures[0];
    pm.uniforms.uVelTex.value = cur.textures[1];

    pm.uniforms.uDepth.value = CONFIG.DEPTH;
    pm.uniforms.uMinPointPx.value = CONFIG.MIN_POINT_PX;
    pm.uniforms.uZSizeVar.value = CONFIG.Z_SIZE_VARIATION;
    pm.uniforms.uFixedDPR.value = FIXED_RENDER_DPR;
    pm.uniforms.uBaseAlpha.value = CONFIG.BASE_ALPHA;
    pm.uniforms.uZAlphaVar.value = CONFIG.Z_ALPHA_VARIATION;
  }

  // Render
  if (CONFIG.TRAILS && rtPointsMRT && rtTrailA && rtTrailB) renderWithTrails(scrollY);
  else renderDirect(scrollY);

  requestAnimationFrame(animate);
}

// =======================================================
// Resize listeners
// =======================================================
function onResize() {
  // Re-init on resize because particleCount + texSize depend on effective size.
  // optimize later.
  init();
}

window.addEventListener("resize", onResize);

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", onResize);
}

// =======================================================
// Start
// =======================================================
setupThree();
setupDebugHUD();
mapSections();
init();
requestAnimationFrame(animate);
