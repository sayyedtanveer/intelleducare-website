(() => {
  'use strict';

  const host = document.getElementById('heroArt');
  const canvas = document.getElementById('hero3dCanvas');
  const hero = document.getElementById('home');
  if (!host || !canvas || !hero) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let renderer, scene, camera, root, orbitalGroup, cards = [], resizeObserver, intersectionObserver;
  let animationFrame = 0, isVisible = false, disposed = false;
  let lastTime = 0, pointerX = 0, pointerY = 0, scrollMotion = 0;
  const baseFov = 42;
  const mobile = () => window.matchMedia('(max-width: 700px)').matches;

  function fallback() {
    host.classList.add('hero-3d-fallback');
    canvas.hidden = true;
  }

  function labelTexture(THREE, title, subtitle, symbol) {
    const documentCanvas = document.createElement('canvas');
    documentCanvas.width = 640;
    documentCanvas.height = 280;
    const ctx = documentCanvas.getContext('2d');
    const radius = 28;
    const gradient = ctx.createLinearGradient(0, 0, 640, 280);
    gradient.addColorStop(0, 'rgba(18, 75, 135, .94)');
    gradient.addColorStop(1, 'rgba(4, 20, 48, .90)');
    ctx.clearRect(0, 0, 640, 280);
    ctx.beginPath();
    ctx.moveTo(radius, 0); ctx.lineTo(640 - radius, 0); ctx.quadraticCurveTo(640, 0, 640, radius);
    ctx.lineTo(640, 280 - radius); ctx.quadraticCurveTo(640, 280, 640 - radius, 280);
    ctx.lineTo(radius, 280); ctx.quadraticCurveTo(0, 280, 0, 280 - radius); ctx.lineTo(0, radius); ctx.quadraticCurveTo(0, 0, radius, 0);
    ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    ctx.strokeStyle = 'rgba(104, 225, 255, .92)'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 255, 255, .16)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(30, 20); ctx.lineTo(610, 20); ctx.stroke();
    ctx.fillStyle = '#ffad4a'; ctx.beginPath(); ctx.arc(58, 72, 26, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#06203d'; ctx.font = 'bold 29px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(symbol, 58, 73);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff'; ctx.font = '700 37px Arial'; ctx.fillText(title.toUpperCase(), 98, 83, 505);
    ctx.fillStyle = '#b8e9ff'; ctx.font = '500 24px Arial'; ctx.fillText(subtitle, 34, 154, 560);
    ctx.fillStyle = 'rgba(93, 220, 255, .16)'; ctx.fillRect(34, 192, 570, 2);
    for (let i = 0; i < 7; i += 1) {
      ctx.fillStyle = i < 5 ? 'rgba(81, 207, 255, .85)' : 'rgba(81, 207, 255, .28)';
      ctx.fillRect(34 + i * 21, 215, 13, 11 + (i % 3) * 5);
    }
    const texture = new THREE.CanvasTexture(documentCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }

  function worldPosition(THREE, nx, ny, z = 0) {
    const distance = camera.position.z - z;
    const visibleHeight = 2 * distance * Math.tan(THREE_PI / 360 * baseFov);
    const visibleWidth = visibleHeight * camera.aspect;
    return new THREE.Vector3((nx - 0.5) * visibleWidth, (0.5 - ny) * visibleHeight, z);
  }

  // Loaded dynamically so the regular website and its contact form remain usable if the CDN is unavailable.
  let THREE_PI = Math.PI;
  async function boot() {
    try {
      const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js');
      if (disposed || !window.WebGLRenderingContext) { fallback(); return; }

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(baseFov, Math.max(host.clientWidth, 1) / Math.max(host.clientHeight, 1), 0.1, 100);
      camera.position.set(0, 0, mobile() ? 10 : 15);
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.25 : 1.65));
      renderer.setSize(host.clientWidth, host.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;

      scene.add(new THREE.AmbientLight(0x8bbfff, 1.25));
      const cyanLight = new THREE.PointLight(0x27cfff, 36, 25);
      cyanLight.position.set(0, 1.3, 5);
      scene.add(cyanLight);
      const goldLight = new THREE.PointLight(0xff9d3b, 20, 18);
      goldLight.position.set(4, -1.5, 3);
      scene.add(goldLight);

      root = new THREE.Group();
      scene.add(root);
      const focalX = mobile() ? 0.50 : 0.625;
      const focalY = mobile() ? 0.27 : 0.265;
      const center = worldPosition(THREE, focalX, focalY, 0);
      orbitalGroup = new THREE.Group();
      orbitalGroup.position.copy(center);
      root.add(orbitalGroup);

      const radius = camera.position.z * (mobile() ? 0.205 : 0.222);
      const makeRing = (ringRadius, tube, color, opacity, tiltX, tiltY, tiltZ) => {
        const geometry = new THREE.TorusGeometry(ringRadius, tube, 12, 180);
        const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.set(tiltX, tiltY, tiltZ);
        orbitalGroup.add(mesh);
        return mesh;
      };
      const ringA = makeRing(radius * 1.00, radius * 0.012, 0x36dfff, 0.82, Math.PI / 2.95, 0.08, -0.12);
      const ringB = makeRing(radius * 1.10, radius * 0.009, 0xffa640, 0.72, Math.PI / 2.82, -0.12, 0.28);
      const ringC = makeRing(radius * 0.83, radius * 0.006, 0x7cb7ff, 0.52, Math.PI / 2.72, 0.22, -0.25);

      // Glowing nodes travel along the orbit paths so there is genuine depth and perspective, not just a flat animation.
      const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xdaf8ff, transparent: true, opacity: 0.98 });
      const nodeGlowMaterial = new THREE.MeshBasicMaterial({ color: 0x20cfff, transparent: true, opacity: 0.25 });
      const nodes = [];
      const nodeCount = mobile() ? 4 : 7;
      for (let i = 0; i < nodeCount; i += 1) {
        const angle = (i / nodeCount) * Math.PI * 2;
        const node = new THREE.Group();
        const bead = new THREE.Mesh(new THREE.SphereGeometry(radius * (i % 3 === 0 ? 0.028 : 0.016), 16, 12), nodeMaterial.clone());
        const glow = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.06, 12, 10), nodeGlowMaterial.clone());
        node.add(glow, bead);
        node.position.set(Math.cos(angle) * radius * (i % 2 ? 1.11 : 0.90), Math.sin(angle) * radius * 0.43, Math.sin(angle) * radius * 0.30);
        orbitalGroup.add(node);
        nodes.push(node);
      }

      // A three-dimensional point field adds foreground/background parallax around the students and globe.
      const particleCount = mobile() ? 38 : 95;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      for (let i = 0; i < particleCount; i += 1) {
        const theta = Math.random() * Math.PI * 2;
        const u = Math.random() * 2 - 1;
        const radial = radius * (0.9 + Math.random() * 0.75);
        const planar = Math.sqrt(1 - u * u);
        positions[i * 3] = Math.cos(theta) * planar * radial;
        positions[i * 3 + 1] = u * radial * 0.86;
        positions[i * 3 + 2] = Math.sin(theta) * planar * radial * 0.43;
        const gold = Math.random() > 0.80;
        colors[i * 3] = gold ? 1 : 0.20;
        colors[i * 3 + 1] = gold ? 0.62 : 0.80;
        colors[i * 3 + 2] = gold ? 0.28 : 1;
      }
      const particleGeometry = new THREE.BufferGeometry();
      particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const particleMaterial = new THREE.PointsMaterial({ size: mobile() ? 0.055 : 0.065, vertexColors: true, transparent: true, opacity: 0.82, sizeAttenuation: true, blending: THREE.AdditiveBlending, depthWrite: false });
      const particles = new THREE.Points(particleGeometry, particleMaterial);
      orbitalGroup.add(particles);

      // These floating glass panels use real 3D geometry and rendered text textures.
      const addGlassCard = (nx, ny, title, subtitle, symbol, tilt = 0) => {
        const isMobile = mobile();
        const width = radius * (isMobile ? 0.77 : 0.59);
        const height = width * 0.435;
        const group = new THREE.Group();
        const bodyGeometry = new THREE.BoxGeometry(width, height, radius * 0.035);
        const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x123965, metalness: 0.45, roughness: 0.23, transmission: 0.06, transparent: true, opacity: 0.60, clearcoat: 1, side: THREE.DoubleSide });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        group.add(body);
        const surface = new THREE.Mesh(new THREE.PlaneGeometry(width * 0.975, height * 0.93), new THREE.MeshBasicMaterial({ map: labelTexture(THREE, title, subtitle, symbol), transparent: true, opacity: 0.93, side: THREE.DoubleSide, depthWrite: false }));
        surface.position.z = radius * 0.02;
        group.add(surface);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeometry), new THREE.LineBasicMaterial({ color: 0x69e7ff, transparent: true, opacity: 0.9 }));
        group.add(edges);
        const glow = new THREE.PointLight(0x2abfff, 1.2, radius * 1.6);
        glow.position.set(-width * 0.4, height * 0.65, radius * 0.15);
        group.add(glow);
        group.position.copy(worldPosition(THREE, nx, ny, radius * 0.38));
        group.rotation.set(-0.03, tilt, tilt * 0.25);
        group.userData = { baseY: group.position.y, phase: Math.random() * Math.PI * 2, baseX: group.position.x, nx, ny, tilt, desktopOnly: false };
        root.add(group);
        cards.push(group);
      };
     const isMobile = mobile();

if (isMobile) {
  addGlassCard(0.30, 0.12, 'HSC Science', 'Concepts and practical learning', 'S', -0.04);
  addGlassCard(0.72, 0.12, 'Career Guidance', 'Discover your next step', '↗', 0.04);
} else {
  addGlassCard(0.435, 0.205, 'HSC Science', 'Concepts and practical learning', 'S', -0.10);
  addGlassCard(0.855, 0.205, 'Career Guidance', 'Discover your next step', '↗', 0.08);
}
      host.classList.add('hero-3d-ready');
      const clock = new THREE.Clock();
      const animate = () => {
        animationFrame = 0;
        if (disposed || !renderer || !scene || !camera) return;
        const dt = Math.min(clock.getDelta(), 0.04);
        lastTime += dt;
        if (!reducedMotion) {
          orbitalGroup.rotation.y += dt * 0.075;
          orbitalGroup.rotation.z += dt * 0.018;
          ringA.rotation.z += dt * 0.018;
          ringB.rotation.y += dt * 0.022;
          ringC.rotation.z -= dt * 0.012;
          particles.rotation.y -= dt * 0.016;
          nodes.forEach((node, i) => {
            node.position.x = Math.cos(lastTime * (0.26 + i * 0.012) + i) * radius * (i % 2 ? 1.11 : 0.90);
            node.position.y = Math.sin(lastTime * (0.35 + i * 0.01) + i) * radius * 0.43;
            node.position.z = Math.cos(lastTime * 0.28 + i * 1.7) * radius * 0.30;
          });
          cards.forEach((card) => {
            card.position.y = card.userData.baseY + Math.sin(lastTime * 0.62 + card.userData.phase) * radius * 0.035;
            card.rotation.y += (card.userData.tilt || 0) * dt * 0.02 + Math.sin(lastTime * 0.4 + card.userData.phase) * dt * 0.025;
          });
          root.rotation.x += ((pointerY * 0.035) + scrollMotion * 0.05 - root.rotation.x) * Math.min(1, dt * 1.7);
          root.rotation.y += ((pointerX * 0.045) - root.rotation.y) * Math.min(1, dt * 1.7);
        }
        renderer.render(scene, camera);
        if (!reducedMotion && isVisible && !document.hidden && !disposed) {
          animationFrame = window.requestAnimationFrame(animate);
        }
      };
      const requestRender = () => {
        if (!animationFrame && isVisible && !disposed) animationFrame = window.requestAnimationFrame(animate);
      };
      const resize = () => {
        if (!renderer || !camera) return;
        const width = Math.max(host.clientWidth, 1);
        const height = Math.max(host.clientHeight, 1);
        camera.aspect = width / height;
        const nextMobile = mobile();
        camera.position.z = nextMobile ? 10 : 15;
        camera.updateProjectionMatrix();
        const updatedCenter = worldPosition(THREE, focalX, focalY, 0);
        orbitalGroup.position.copy(updatedCenter);
        cards.forEach((card) => {
          card.position.copy(worldPosition(THREE, card.userData.nx, card.userData.ny, radius * 0.38));
          card.userData.baseY = card.position.y;
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile() ? 1.25 : 1.65));
        renderer.setSize(width, height, false);
        requestRender();
      };
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      window.addEventListener('resize', resize, { passive: true });
      window.addEventListener('pointermove', (event) => {
        if (reducedMotion || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
        pointerX = Math.max(-1, Math.min(1, (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2));
        pointerY = Math.max(-1, Math.min(1, (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2));
        requestRender();
      }, { passive: true });
      window.addEventListener('scroll', () => {
        const bounds = hero.getBoundingClientRect();
        scrollMotion = Math.max(-1, Math.min(1, -bounds.top / Math.max(bounds.height, 1)));
        requestRender();
      }, { passive: true });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && animationFrame) { window.cancelAnimationFrame(animationFrame); animationFrame = 0; }
        else requestRender();
      });
      intersectionObserver = new IntersectionObserver((entries) => {
        isVisible = entries[0]?.isIntersecting === true;
        if (isVisible) requestRender();
        else if (animationFrame) { window.cancelAnimationFrame(animationFrame); animationFrame = 0; }
      }, { threshold: 0.02 });
      intersectionObserver.observe(hero);
      if (reducedMotion) renderer.render(scene, camera);
      else requestRender();

      window.addEventListener('pagehide', () => {
        disposed = true;
        if (animationFrame) window.cancelAnimationFrame(animationFrame);
        if (intersectionObserver) intersectionObserver.disconnect();
        if (resizeObserver) resizeObserver.disconnect();
        renderer?.dispose();
      }, { once: true });
    } catch (error) {
      console.warn('The immersive 3D layer could not be loaded; using the visual fallback.', error);
      fallback();
    }
  }

  boot();
})();
