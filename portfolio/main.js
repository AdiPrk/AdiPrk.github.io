(() => {
  const statusEl = document.getElementById("rendererStatus");
  const container = document.getElementById("bg");

  const reduceMotion =
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  const DPR_CAP = isMobile ? 1.25 : 1.5;

  let running = true;
  let raf = 0;

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

    // Defer even more to avoid competing with first paint
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
    const count = isMobile ? 700 : 1200;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      // wide, sparse cloud
      const r = Math.pow(Math.random(), 0.7) * 9.0;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() * 2 - 1) * 3.0;

      positions[i * 3 + 0] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: isMobile ? 0.045 : 0.055,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.12,            // key: subtle
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Mouse parallax (tiny)
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
      if (!running) {
        raf = requestAnimationFrame(tick);
        return;
      }

      // Gentle motion only if allowed
      if (!reduceMotion) {
        const time = (t - t0) * 0.00006;

        px = lerp(px, mouseX, 0.04);
        py = lerp(py, mouseY, 0.04);

        camera.position.x = px * 0.35;
        camera.position.y = -py * 0.25;
        camera.lookAt(0, 0, 0);

        points.rotation.y = time;
        points.rotation.x = time * 0.5;
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
  }

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
})();
