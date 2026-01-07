(() => {
  const statusEl = document.getElementById("rendererStatus");
  const container = document.getElementById("bg");

  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const DPR_CAP = isMobile ? 1.25 : 1.5;

  let running = true;

  // Lazy load: only start when hero is visible
  const hero = document.getElementById("top");
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        boot();
      }
    },
    { threshold: 0.15 }
  );
  io.observe(hero);

  document.addEventListener("visibilitychange", () => {
    running = document.visibilityState === "visible";
  });

  async function boot() {
    statusEl.textContent = "Background: loading…";

    const start = async () => {
      try {
        const THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
        init(THREE);
      } catch (e) {
        console.warn(e);
        statusEl.textContent = "Background: disabled";
      }
    };

    if ("requestIdleCallback" in window) requestIdleCallback(start, { timeout: 1200 });
    else setTimeout(start, 0);
  }

  function init(THREE) {
    // Scene + camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
    camera.position.set(0, 0, 10);

    // WebGL renderer (fast + reliable)
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    container.appendChild(renderer.domElement);

    // Subtle particles
    // 1) Make a soft circular sprite texture (fixes square points)
    const spriteTex = makeSoftSpriteTexture(THREE);

    // 2) Build geometry with per-particle color + size
    const count = isMobile ? 520 : 900; // calmer than before
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Two low-saturation tints (cool -> warm)
    const cool = new THREE.Color().setRGB(0.72, 0.82, 1.0); // pale blue
    const warm = new THREE.Color().setRGB(1.0, 0.72, 0.90); // pale pink

    for (let i = 0; i < count; i++) {
      // Spread: wide, sparse cloud with fewer near center
      const r = Math.pow(Math.random(), 0.78) * 10.0;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() * 2 - 1) * 3.4;

      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Color variation (subtle)
      const t = Math.random();
      const c = cool.clone().lerp(warm, t);

      // Desaturate and dim further so it stays background
      c.multiplyScalar(0.75);

      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      // Size variation (small, subtle)
      sizes[i] = isMobile ? (0.045 + Math.random() * 0.030) : (0.050 + Math.random() * 0.035);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1)); // not used by PointsMaterial, but left for future shader upgrade

    // 3) Use PointsMaterial with a sprite map so points become soft circles
    const material = new THREE.PointsMaterial({
      map: spriteTex,
      transparent: true,
      opacity: 0.1,
      vertexColors: true,
      size: isMobile ? 0.090 : 0.110,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const farGeo = geometry.clone();
    const farMat = material.clone();
    farMat.opacity = 0.07;
    farMat.size = isMobile ? 0.060 : 0.075;

    const farPoints = new THREE.Points(farGeo, farMat);
    farPoints.scale.set(1.35, 1.15, 1.35);
    scene.add(farPoints);

    // Tiny parallax
    let mouseX = 0, mouseY = 0;
    let px = 0, py = 0;

    window.addEventListener(
      "mousemove",
      (e) => {
        const nx = (e.clientX / window.innerWidth) * 2 - 1;
        const ny = (e.clientY / window.innerHeight) * 2 - 1;
        mouseX = clamp(nx, -1, 1);
        mouseY = clamp(ny, -1, 1);
      },
      { passive: true }
    );

    // Resize
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;

      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();

      renderer.setSize(w, h, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    };
    window.addEventListener("resize", onResize, { passive: true });
    onResize();

    statusEl.textContent = reduceMotion ? "Background: static" : "Background: active";

    // Render loop
    const t0 = performance.now();
    const tick = (t) => {
      // keep a single RAF running; just skip updates when hidden
      if (running) {
        if (!reduceMotion) {
          const time = (t - t0) * 0.00003;

          px = lerp(px, mouseX, 0.04);
          py = lerp(py, mouseY, 0.04);

          camera.position.x = px * 0.1;
          camera.position.y = -py * 0.05;
          camera.lookAt(0, 0, 0);

          points.rotation.y = time;
          points.rotation.x = time * 0.35;
          farPoints.rotation.y = -time * 0.8;
          farPoints.rotation.x = -time * 0.25;
        }

        renderer.render(scene, camera);
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

    function makeSoftSpriteTexture(THREE) {
    const c = document.createElement("canvas");
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext("2d");

    // Radial gradient: bright center -> soft edge
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0.0, "rgba(255,255,255,0.95)");
    g.addColorStop(0.25, "rgba(255,255,255,0.35)");
    g.addColorStop(0.55, "rgba(255,255,255,0.12)");
    g.addColorStop(1.0, "rgba(255,255,255,0.0)");

    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
  }

})();
