(() => {
  //const statusEl = document.getElementById("rendererStatus");
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
    //statusEl.textContent = "Background: loading…";

    const start = async () => {
      try {
        const THREE = await import("https://unpkg.com/three@0.160.0/build/three.module.js");
        init(THREE);
      } catch (e) {
        console.warn(e);
        //statusEl.textContent = "Background: disabled";
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

    // Enhanced particle system with multiple layers
    const spriteTex = makeSoftSpriteTexture(THREE);

    // Primary particle layer - detailed
    const count = isMobile ? 600 : 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const velocities = new Float32Array(count * 3);

    // Three-color gradient for rich variation
    const cool = new THREE.Color().setRGB(0.68, 0.82, 1.0); // pale blue
    const neutral = new THREE.Color().setRGB(0.75, 0.75, 1.0); // neutral
    const warm = new THREE.Color().setRGB(1.0, 0.75, 0.95); // pale pink

    for (let i = 0; i < count; i++) {
      // Enhanced distribution: more depth variation
      const r = Math.pow(Math.random(), 0.72) * 11.0;
      const a = Math.random() * Math.PI * 2;
      const y = (Math.random() * 2 - 1) * 4.0;
      const z = (Math.random() * 2 - 1) * 3.0;

      const x = Math.cos(a) * r;

      positions[i * 3 + 0] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Subtle velocity for organic motion
      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.08;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.06;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;

      // Three-point color interpolation
      const t = Math.random();
      let c;
      if (t < 0.5) {
        c = cool.clone().lerp(neutral, t * 2);
      } else {
        c = neutral.clone().lerp(warm, (t - 0.5) * 2);
      }

      c.multiplyScalar(0.80);

      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      sizes[i] = isMobile ? (0.050 + Math.random() * 0.040) : (0.055 + Math.random() * 0.045);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Primary material with enhanced opacity
    const material = new THREE.PointsMaterial({
      map: spriteTex,
      transparent: true,
      opacity: 0.12,
      vertexColors: true,
      size: isMobile ? 0.100 : 0.125,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    // Secondary far layer - subtle glow
    const farGeo = geometry.clone();
    const farMat = material.clone();
    farMat.opacity = 0.08;
    farMat.size = isMobile ? 0.070 : 0.090;

    const farPoints = new THREE.Points(farGeo, farMat);
    farPoints.scale.set(1.50, 1.25, 1.50);
    scene.add(farPoints);

    // Tertiary ultra-far layer for depth
    const ultrafarGeo = geometry.clone();
    const ultrafarMat = material.clone();
    ultrafarMat.opacity = 0.04;
    ultrafarMat.size = isMobile ? 0.045 : 0.060;

    const ultrafarPoints = new THREE.Points(ultrafarGeo, ultrafarMat);
    ultrafarPoints.scale.set(2.2, 1.8, 2.2);
    scene.add(ultrafarPoints);

    // Enhanced parallax
    let mouseX = 0, mouseY = 0;
    let px = 0, py = 0;
    let targetRotX = 0, targetRotY = 0;

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

    // statusEl.textContent = reduceMotion ? "Background: static" : "Background: active";

    // Advanced render loop with smooth easing
    const t0 = performance.now();
    const tick = (t) => {
      if (running) {
        if (!reduceMotion) {
          const time = (t - t0) * 0.00003;

          // Smoother camera movement with easing
          px = lerp(px, mouseX, 0.05);
          py = lerp(py, mouseY, 0.05);

          camera.position.x = px * 0.12;
          camera.position.y = -py * 0.06;
          camera.lookAt(0, 0, 0);

          // Enhanced rotation with varying speeds
          targetRotX = time * 0.35 + Math.sin(time * 0.5) * 0.15;
          targetRotY = time + Math.cos(time * 0.3) * 0.2;

          points.rotation.y = lerp(points.rotation.y, targetRotY, 0.08);
          points.rotation.x = lerp(points.rotation.x, targetRotX, 0.08);

          farPoints.rotation.y = -time * 0.8 + Math.sin(time * 0.4) * 0.1;
          farPoints.rotation.x = -time * 0.25 + Math.cos(time * 0.6) * 0.08;

          ultrafarPoints.rotation.y = time * 0.4 + Math.sin(time * 0.7) * 0.12;
          ultrafarPoints.rotation.x = time * 0.15 + Math.cos(time * 0.5) * 0.1;

          // Gentle camera oscillation
          camera.position.z = 10 + Math.sin(time * 0.8) * 0.3;
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

    // Enhanced radial gradient with more control points
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0.0, "rgba(255,255,255,0.98)");
    g.addColorStop(0.2, "rgba(255,255,255,0.50)");
    g.addColorStop(0.4, "rgba(255,255,255,0.20)");
    g.addColorStop(0.65, "rgba(255,255,255,0.08)");
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
