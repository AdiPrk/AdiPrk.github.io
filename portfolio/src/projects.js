// ===============================
// PROJECTS.JS (page-projects ONLY)
// ===============================

(() => {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;

  const THREE = window.THREE;
  if (!THREE) {
    console.warn("[projects.js] THREE not found. Ensure three.min.js loads before projects.js");
    return;
  }

  // -------------------------------
  // Config
  // -------------------------------
  const CONFIG = {
    DENSITY_DIVISOR: 3400,
    MIN_PARTICLES: 6000,
    MAX_PARTICLES: 20000,

    DEPTH: 800,

    // Pattern displacement magnitude (px in world-space)
    DISP_PX: 26,
    DISP_PX_NEAR: 34,

    // Global rotation
    ROT_SPEED: 0.035,
    ROT_WOBBLE: 0.25,

    // Visual
    MIN_POINT_PX: 0.9,
    BASE_ALPHA: 0.16,
    Z_ALPHA_VARIATION: 0.22,
    Z_SIZE_VARIATION: 0.26,
    BLENDING: "additive",

    // Mouse (SCREEN SPACE target + lerp)
    MOUSE_RADIUS_PX: 180,
    MOUSE_PUSH_PX: 60,
    MOUSE_PUSH_TANGENTIAL: 0.14,
    MOUSE_FOLLOW_SPEED: 20.0,
    MOUSE_RETURN_SPEED: 14.0,

    // Single pattern selection (0..6), and tuning
    PATTERN_ID: 2,
    PATTERN_SEED: 1337,
  };

  const prefersReducedMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  if (prefersReducedMotion) {
    CONFIG.MOUSE_PUSH_PX *= 0.55;
    CONFIG.MOUSE_FOLLOW_SPEED *= 0.65;
    CONFIG.MOUSE_RETURN_SPEED *= 0.75;
  }

  // -------------------------------
  // Helpers
  // -------------------------------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const TAU = Math.PI * 2;
  const lerpFactor = (speedPerSec, dt) => 1.0 - Math.exp(-speedPerSec * dt);

  // Fast trig LUT
  const SIN_LUT_BITS = 12;
  const SIN_LUT_SIZE = 1 << SIN_LUT_BITS;
  const SIN_LUT_MASK = SIN_LUT_SIZE - 1;
  const SIN_LUT = new Float32Array(SIN_LUT_SIZE);
  for (let i = 0; i < SIN_LUT_SIZE; i++) SIN_LUT[i] = Math.sin((i / SIN_LUT_SIZE) * TAU);

  function fastSin(x) {
    x %= TAU;
    if (x < 0) x += TAU;
    const f = x * (SIN_LUT_SIZE / TAU);
    const i0 = f | 0;
    const t = f - i0;
    const i1 = (i0 + 1) & SIN_LUT_MASK;
    return SIN_LUT[i0 & SIN_LUT_MASK] * (1 - t) + SIN_LUT[i1] * t;
  }
  const fastCos = (x) => fastSin(x + Math.PI * 0.5);

  function rotate2(x, y, ang) {
    const c = fastCos(ang);
    const s = fastSin(ang);
    return [x * c - y * s, x * s + y * c];
  }

  function makeRNG(seed) {
    let s = seed >>> 0;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }

  function hash32(a, b, c) {
    let x = (a * 73856093) ^ (b * 19349663) ^ (c * 83492791);
    x >>>= 0;
    x = (x ^ (x >>> 16)) >>> 0;
    x = (x * 2246822507) >>> 0;
    x = (x ^ (x >>> 13)) >>> 0;
    x = (x * 3266489909) >>> 0;
    x = (x ^ (x >>> 16)) >>> 0;
    return x >>> 0;
  }

  // -------------------------------
  // THREE.js state
  // -------------------------------
  let renderer, camera, scene, geom, mat, points;
  let positions, colors, sizes;

  let particleCount = 0;

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

  // base uniform grid (world space pixels, y = screen-down)
  let baseX = new Float32Array(0);
  let baseY = new Float32Array(0);
  let baseZ = new Float32Array(0);
  let pSize = new Float32Array(0);
  let pSeed = new Float32Array(0);
  let pHue = new Float32Array(0);

  // mouse offsets stored in WORLD space pixels
  let mOX = new Float32Array(0);
  let mOY = new Float32Array(0);

  // cached camera constants for projection math
  let camCenterX = 0;
  let camCenterY = 0;
  let camDist = 1; // camera.position.z
  let pointScale = 1; // (h/2)/tan(fov/2)

  function setupCanvasStyleFallback() {
    const cs = getComputedStyle(canvas);
    const w = parseFloat(cs.width);
    const h = parseFloat(cs.height);
    if (w && h) return;

    canvas.style.position = "fixed";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "-1";
  }

  function setupThree() {
    setupCanvasStyleFallback();

    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearAlpha(0);

    camera = new THREE.PerspectiveCamera(54, 1, 0.1, 14000);
    scene = new THREE.Scene();
  }

  function buildPoints() {
    if (points) scene.remove(points);
    if (geom) geom.dispose();
    if (mat) mat.dispose();

    geom = new THREE.BufferGeometry();

    positions = new Float32Array(particleCount * 3);
    colors = new Float32Array(particleCount * 4);
    sizes = new Float32Array(particleCount);

    const posAttr = new THREE.BufferAttribute(positions, 3);
    const colAttr = new THREE.BufferAttribute(colors, 4);
    const sizAttr = new THREE.BufferAttribute(sizes, 1);

    posAttr.setUsage(THREE.DynamicDrawUsage);
    colAttr.setUsage(THREE.DynamicDrawUsage);
    sizAttr.setUsage(THREE.DynamicDrawUsage);

    geom.setAttribute("position", posAttr);
    geom.setAttribute("color", colAttr);
    geom.setAttribute("size", sizAttr);

    mat = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: CONFIG.BLENDING === "normal" ? THREE.NormalBlending : THREE.AdditiveBlending,
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

          float px = size * 2.05 * uPixelRatio * persp;
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

          float core = smoothstep(0.12, 0.0, r2);
          float mid  = smoothstep(0.34, 0.0, r2) * 0.58;
          float halo = smoothstep(0.98, 0.0, r2) * 0.16;
          float mask = clamp(core + mid + halo, 0.0, 1.0);

          float depthFade = mix(1.0 - uDepthAlpha, 1.0 + uDepthAlpha, vDepth01);

          vec3 rgb = pow(vColor.rgb, vec3(0.93));
          gl_FragColor = vec4(rgb, vColor.a * mask * depthFade);
        }
      `,
      uniforms: {
        uPixelRatio: { value: 1.0 },
        uDepth: { value: CONFIG.DEPTH },
        uDepthAlpha: { value: CONFIG.Z_ALPHA_VARIATION },
        uPointScale: { value: 1.0 },
        uMinDist: { value: 240.0 },
        uMinPointPx: { value: CONFIG.MIN_POINT_PX },
      },
    });

    points = new THREE.Points(geom, mat);
    scene.add(points);
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

    pointScale = (h * 0.5) / Math.tan(fovRad * 0.5);
    camDist = dist;
    camCenterX = w * 0.5;
    camCenterY = h * 0.5;

    if (mat) mat.uniforms.uPointScale.value = pointScale;
  }

  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, true);
    syncCameraToPixels();
  }

  // -------------------------------
  // Particles init: jittered grid
  // -------------------------------
  function computeParticleCount() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    let n = Math.floor((w * h) / CONFIG.DENSITY_DIVISOR);
    return clamp(n, CONFIG.MIN_PARTICLES, CONFIG.MAX_PARTICLES);
  }

  function initParticles() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    const target = computeParticleCount();
    const aspect = w / Math.max(1, h);

    let cols = Math.floor(Math.sqrt(target * aspect));
    cols = clamp(cols, 40, 1400) | 0;

    let rows = Math.floor(target / Math.max(1, cols));
    rows = Math.max(1, rows) | 0;

    particleCount = cols * rows;

    baseX = new Float32Array(particleCount);
    baseY = new Float32Array(particleCount);
    baseZ = new Float32Array(particleCount);
    pSize = new Float32Array(particleCount);
    pSeed = new Float32Array(particleCount);
    pHue = new Float32Array(particleCount);

    mOX = new Float32Array(particleCount);
    mOY = new Float32Array(particleCount);

    const depth = CONFIG.DEPTH;

    const seed = hash32(w | 0, h | 0, (Date.now() / 1000) | 0);
    const rng = makeRNG(seed);

    const cellW = w / cols;
    const cellH = h / rows;

    let idx = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const jx = (rng() - 0.5) * cellW * 0.55;
        const jy = (rng() - 0.5) * cellH * 0.55;

        baseX[idx] = (c + 0.5) * cellW + jx;
        baseY[idx] = (r + 0.5) * cellH + jy;
        baseZ[idx] = (rng() * 2 - 1) * depth;

        const s = rng();
        pSeed[idx] = s;
        pSize[idx] = 0.55 + Math.pow(s, 1.6) * 1.15 + (s > 0.992 ? 1.1 : 0.0);
        pHue[idx] = 0.52 + (s - 0.5) * 0.12;

        // mouse offsets start at 0
        mOX[idx] = 0;
        mOY[idx] = 0;

        idx++;
      }
    }

    buildPoints();
    syncCameraToPixels();
  }

  // -------------------------------
  // Single pattern (cleaned)
  // -------------------------------
  const PATTERN_COUNT = 7;

  function makePatternParams() {
    const w = window.innerWidth | 0;
    const h = window.innerHeight | 0;
    const seed = hash32(w || 1, h || 1, (CONFIG.PATTERN_SEED | 0) || 1);
    const rng = makeRNG(seed);

    return {
      rot0: (rng() * 2 - 1) * Math.PI,
      rot1: (rng() * 2 - 1) * Math.PI,
      freq: 1.4 + rng() * 2.6,
      freq2: 1.4 + rng() * 2.9,
      speed: 0.06 + rng() * 0.18,
      speed2: 0.05 + rng() * 0.2,
      amp: 0.45 + rng() * 0.85,
      amp2: 0.35 + rng() * 0.95,
    };
  }

  let patternParams = makePatternParams();

  function evalPattern(x, y, t, p) {
    const a = fastSin((x * p.freq + y * (p.freq * 0.77) + t * p.speed) * TAU);
    const b = fastSin((x * p.freq2 - y * (p.freq2 * 0.91) - t * p.speed2) * TAU);
    const c = fastCos((x * (p.freq * 0.63) + y * (p.freq2 * 0.58) + t * (p.speed * 0.7)) * TAU);

    const dx = a * 0.14 + c * 0.09;
    const dy = b * 0.14 - c * 0.09;

    const band = clamp(0.5 + 0.5 * (a * 0.45 + b * 0.45 + c * 0.3), 0, 1);
    const s0 = clamp(0.5 + 0.5 * a, 0, 1);
    const s1 = clamp(0.5 + 0.5 * b, 0, 1);

    return [dx, dy, band, s0, s1];
  }

  function evalSingle(nx, ny, t) {
    const p = patternParams;

    // keep your "dual-rot" flavor
    const [x0, y0] = rotate2(nx, ny, p.rot0);
    const [x1, y1] = rotate2(nx, ny, p.rot1);

    const x = lerp(x0, x1, 0.42);
    const y = lerp(y0, y1, 0.42);

    // (kept, but now actually used for bounds safety)
    const id = clamp(CONFIG.PATTERN_ID | 0, 0, PATTERN_COUNT - 1);
    void id; // placeholder for future multi-pattern switch without lint noise

    const r = evalPattern(x, y, t, p);
    return [r[0] * p.amp, r[1] * p.amp2, r[2], r[3], r[4]];
  }

  // -------------------------------
  // Mouse input (SCREEN coordinates)
  // -------------------------------
  const mouse = { x: 0, y: 0, has: false };

  window.addEventListener(
    "pointermove",
    (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.has = true;
    },
    { passive: true }
  );
  window.addEventListener("pointerleave", () => (mouse.has = false), { passive: true });

  // -------------------------------
  // Color palette
  // -------------------------------
  function palette(h, band, s0, s1) {
    const t = clamp((h - 0.45) / 0.22, 0, 1);

    const bright = 0.68 + 0.58 * band;
    const modR = 0.9 + 0.14 * (s0 - 0.5);
    const modG = 0.9 + 0.14 * (s1 - 0.5);

    const r = lerp(0.56, 0.97, t) * bright * modR;
    const g = lerp(0.93, 0.56, t) * bright * modG;
    const b = lerp(1.0, 1.0, t) * (0.9 + 0.14 * bright);

    return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1)];
  }

  // -------------------------------
  // Projection helper (FAST)
  // -------------------------------
  function projectToScreen(x, y, z) {
    const distToCam = Math.max(1e-3, camDist - z);
    const persp = pointScale / distToCam;
    return [
      camCenterX + (x - camCenterX) * persp,
      camCenterY + (y - camCenterY) * persp,
      persp,
    ];
  }

  // -------------------------------
  // Animation
  // -------------------------------
  let lastTime = 0;
  let running = true;

  function animate(ts) {
    if (!running) return;

    if (!lastTime) lastTime = ts;
    let dt = (ts - lastTime) / 1000;
    lastTime = ts;
    dt = Math.min(dt, 0.05);

    updateDebugHUD(dt, particleCount);

    const w = window.innerWidth;
    const h = window.innerHeight;

    const depth = CONFIG.DEPTH;
    const invDepth = 1 / depth;

    const time = ts / 1000;

    const rot = time * CONFIG.ROT_SPEED + CONFIG.ROT_WOBBLE * fastSin(time * 0.12);

    const dispBase = prefersReducedMotion ? CONFIG.DISP_PX * 0.55 : CONFIG.DISP_PX;
    const dispNear = prefersReducedMotion ? CONFIG.DISP_PX_NEAR * 0.55 : CONFIG.DISP_PX_NEAR;

    // uniforms that can change
    mat.uniforms.uPixelRatio.value = renderer.getPixelRatio();
    mat.uniforms.uDepth.value = depth;
    mat.uniforms.uDepthAlpha.value = CONFIG.Z_ALPHA_VARIATION;
    mat.uniforms.uMinPointPx.value = CONFIG.MIN_POINT_PX;

    const baseA = prefersReducedMotion ? CONFIG.BASE_ALPHA * 0.7 : CONFIG.BASE_ALPHA;
    const depthAlphaVar = CONFIG.Z_ALPHA_VARIATION;

    const tFollow = lerpFactor(CONFIG.MOUSE_FOLLOW_SPEED, dt);
    const tReturn = lerpFactor(CONFIG.MOUSE_RETURN_SPEED, dt);

    const mouseHas = mouse.has;
    const mx = mouse.x;
    const my = mouse.y;

    const R = CONFIG.MOUSE_RADIUS_PX;
    const R2 = R * R;
    const pushMaxScreen = CONFIG.MOUSE_PUSH_PX;
    const swirlK = CONFIG.MOUSE_PUSH_TANGENTIAL;

    for (let i = 0; i < particleCount; i++) {
      const bx = baseX[i];
      const by = baseY[i];
      let z = baseZ[i];

      // Pattern inputs (NDC-ish)
      const nx0 = (bx / Math.max(1, w)) * 2 - 1;
      const ny0 = (by / Math.max(1, h)) * 2 - 1;
      const [nx, ny] = rotate2(nx0, ny0, rot);

      const [dxN, dyN, band, s0, s1] = evalSingle(nx, ny, time);

      // Depth wobble (visual only)
      const seed = pSeed[i];
      z += (seed - 0.5) * 18.0 * fastSin(time * 0.25 + seed * 6.0);

      const z01 = (z * invDepth) * 0.5 + 0.5;

      // world-space displacement (px)
      const ampPx = lerp(dispBase, dispNear, 1.0 - z01);
      const basePathX = bx + dxN * ampPx;
      const basePathY = by + dyN * ampPx;

      // Project current world pos (including current mouse offset) to screen for correct targeting
      const worldX = basePathX + mOX[i];
      const worldY = basePathY + mOY[i];
      const [sx, sy, persp] = projectToScreen(worldX, worldY, z);

      // Desired mouse offset (computed in SCREEN, then converted to WORLD)
      let targetOX = 0;
      let targetOY = 0;

      if (mouseHas) {
        const dxm = sx - mx;
        const dym = sy - my;
        const d2 = dxm * dxm + dym * dym;

        if (d2 < R2) {
          const d = Math.sqrt(d2) + 1e-6;
          const ux = dxm / d;
          const uy = dym / d;

          const f = 1.0 - d / R;
          const fall = f * f * (3 - 2 * f); // smoothstep-ish

          const pushS = pushMaxScreen * fall;

          let offSX = ux * pushS;
          let offSY = uy * pushS;

          if (swirlK) {
            offSX += -uy * (pushS * swirlK);
            offSY += ux * (pushS * swirlK);
          }

          const invPersp = 1.0 / Math.max(1e-6, persp);
          targetOX = offSX * invPersp;
          targetOY = offSY * invPersp;
        }
      }

      // Lerp world offsets
      const hasTarget = targetOX !== 0 || targetOY !== 0;
      const t = mouseHas && hasTarget ? tFollow : tReturn;

      mOX[i] = lerp(mOX[i], mouseHas && hasTarget ? targetOX : 0, t);
      mOY[i] = lerp(mOY[i], mouseHas && hasTarget ? targetOY : 0, t);

      // final world position
      const x = basePathX + mOX[i];
      const y = basePathY + mOY[i];

      // write buffers (flip y for camera)
      const i3 = i * 3;
      positions[i3 + 0] = x;
      positions[i3 + 1] = -y;
      positions[i3 + 2] = z;

      const [rr, gg, bb] = palette(pHue[i], band, s0, s1);

      const depthFade = lerp(1.0 - depthAlphaVar, 1.0 + depthAlphaVar, z01);
      const sparkle = 0.86 + 0.22 * (0.5 + 0.5 * fastSin(time * 0.3 + seed * 10.0));

      const i4 = i * 4;
      colors[i4 + 0] = rr;
      colors[i4 + 1] = gg;
      colors[i4 + 2] = bb;
      colors[i4 + 3] = clamp(baseA * depthFade * sparkle, 0, 1);

      const depthSize = lerp(1.0 - CONFIG.Z_SIZE_VARIATION, 1.0 + CONFIG.Z_SIZE_VARIATION, z01);
      const bandSize = 0.92 + 0.45 * band;
      sizes[i] = pSize[i] * depthSize * bandSize;
    }

    geom.attributes.position.needsUpdate = true;
    geom.attributes.color.needsUpdate = true;
    geom.attributes.size.needsUpdate = true;

    renderer.setRenderTarget(null);
    renderer.clear(true, true, true);
    renderer.render(scene, camera);

    requestAnimationFrame(animate);
  }

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) {
      lastTime = 0;
      requestAnimationFrame(animate);
    }
  });

  window.addEventListener(
    "resize",
    () => {
      resize();
      patternParams = makePatternParams();
      initParticles();
      lastTime = 0;
    },
    { passive: true }
  );

  // -------------------------------
  // Start (deduped)
  // -------------------------------
  setupThree();
  resize();
  initParticles(); // includes buildPoints + syncCameraToPixels
  setupDebugHUD();
  requestAnimationFrame(animate);
})();

// =======================================================
// Scramble Text Effect (KEEP EXACTLY AS-IS)
// =======================================================

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+";

function instantScramble(element) {
  const originalText = element.dataset.value;
  let iterations = 0;

  element.style.visibility = "visible";

  const length = originalText.length;
  const step = Math.max(1, Math.ceil(length / 15));

  const interval = setInterval(() => {
    element.innerText = originalText
      .split("")
      .map((letter, index) => {
        if (letter === " " || letter === "\n") return letter;
        if (index < iterations) return originalText[index];
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