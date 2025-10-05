(() => {
  const hero = document.querySelector('.hero');
  const bgStack = document.querySelector('.hero-bg-stack');
  let sets = Array.from(document.querySelectorAll('.hero-bg-set'));
  const canvas = document.querySelector('.hero-canvas');
  const ctx = canvas.getContext('2d');
  const cta = document.querySelector('.cta');

  // Particles setup early to avoid TDZ in resizeCanvas
  const colors = ['rgba(255,245,225,0.40)', 'rgba(236,210,170,0.34)', 'rgba(220,200,180,0.28)', 'rgba(255,255,255,0.25)'];
  const particles = [];
  function makeParticle() {
    const size = Math.random() * 3 + 1;
    return {
      x: Math.random() * canvas.clientWidth,
      y: Math.random() * canvas.clientHeight,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      r: size,
      c: colors[Math.floor(Math.random() * colors.length)],
      a: Math.random() * 0.6 + 0.2,
    };
  }
  function computeCount() {
    const area = hero.clientWidth * hero.clientHeight;
    const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const base = Math.floor(area / 30000);
    const minC = reduced ? 18 : 28;
    const maxC = reduced ? 28 : 72;
    return Math.min(maxC, Math.max(minC, base));
  }
  function configureParticles() {
    const target = computeCount();
    if (particles.length !== target) {
      particles.length = 0;
      for (let i = 0; i < target; i++) particles.push(makeParticle());
    }
  }

  // Resize canvas with DPR scaling
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    configureParticles();
  }
  window.addEventListener('resize', resizeCanvas, { passive: true });
  resizeCanvas();

  // Focus pull: reduce blur near pointer and subtly shift sharp layer
  let focusRAF = null;
  let pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
  const blurLayers = Array.from(document.querySelectorAll('.bg-blur'));
  const sharpLayers = Array.from(document.querySelectorAll('.bg-sharp'));

  function onPointerMove(ev) {
    const rect = hero.getBoundingClientRect();
    pointer.x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left;
    pointer.y = (ev.touches ? ev.touches[0].clientY : ev.clientY) - rect.top;
    if (!focusRAF) focusRAF = requestAnimationFrame(applyFocus);
  }

  function applyFocus() {
    focusRAF = null;
    const cx = pointer.x / hero.clientWidth;
    const cy = pointer.y / hero.clientHeight;

    // Subtle parallax at set level (avoid overriding layer animation)
    const isSmall = Math.min(hero.clientWidth, hero.clientHeight) < 520;
    const maxShift = isSmall ? 5 : 8; // px
    const tx = (cx - 0.5) * maxShift;
    const ty = (cy - 0.5) * maxShift;
    sets.forEach(set => {
      set.style.setProperty('--set-tx', `${tx}px`);
      set.style.setProperty('--set-ty', `${ty}px`);
    });

    // Focus ring variables
    hero.style.setProperty('--focus-x', `${pointer.x}px`);
    hero.style.setProperty('--focus-y', `${pointer.y}px`);
    const vmin = Math.min(hero.clientWidth, hero.clientHeight);
    const radiusPx = Math.round(vmin * (isSmall ? 0.46 : 0.34));
    const softnessPx = Math.round(radiusPx * 0.6);
    hero.style.setProperty('--focus-radius', `${radiusPx}px`);
    hero.style.setProperty('--focus-softness', `${softnessPx}px`);

    // Toggle focus-active class to reduce blur globally
    hero.classList.add('focus-active');
    clearTimeout(focusTimeout);
    focusTimeout = setTimeout(() => hero.classList.remove('focus-active'), 2400);

    // CTA ripple position
    cta?.style.setProperty('--mx', `${pointer.x}px`);
    cta?.style.setProperty('--my', `${pointer.y}px`);
  }
  let focusTimeout = null;
  const isTouch = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (!isTouch) {
    hero.addEventListener('mousemove', onPointerMove, { passive: true });
  } else {
    // On touch devices: keep background gently in focus, disable interactive follow
    hero.classList.add('focus-active');
    const centerX = hero.clientWidth * 0.5;
    const centerY = hero.clientHeight * 0.5;
    hero.style.setProperty('--focus-x', `${centerX}px`);
    hero.style.setProperty('--focus-y', `${centerY}px`);
    const vmin = Math.min(hero.clientWidth, hero.clientHeight);
    const radiusPx = Math.round(vmin * 0.42);
    const softnessPx = Math.round(radiusPx * 0.65);
    hero.style.setProperty('--focus-radius', `${radiusPx}px`);
    hero.style.setProperty('--focus-softness', `${softnessPx}px`);
  }

  // Image set cycling with crossfade
  let current = 0;
  function showSet(i) {
    if (!sets || sets.length === 0) return;
    sets.forEach((s, idx) => s.classList.toggle('visible', idx === i));
  }
  let cycleTimer = null;
  const cycleMs = 9000;
  function startCycle() {
    if (cycleTimer) {
      clearInterval(cycleTimer);
      cycleTimer = null;
    }
    if (!sets || sets.length <= 1) return; // only cycle if multiple sets
    cycleTimer = setInterval(() => {
      current = (current + 1) % sets.length;
      showSet(current);
    }, cycleMs);
  }

  // Dynamically load all portfolio/gallery images into hero background
  async function collectBackgroundUrls() {
    const urls = [];
    const isRealImageUrl = (u) => {
      if (!u || typeof u !== 'string') return false;
      if (u.startsWith('data:')) return false; // exclude inline SVG placeholders
      const clean = u.split('?')[0].split('#')[0].toLowerCase();
      if (clean.endsWith('.svg')) return false;
      return /(\.jpg|\.jpeg|\.png|\.webp|\.gif)$/i.test(clean) || clean.includes('/photo/');
    };

    // 1) Gallery images first (admin or file)
    try {
      const savedGallery = localStorage.getItem('galleryData');
      if (savedGallery) {
        const json = JSON.parse(savedGallery);
        const gallery = json?.gallery || [];
        for (const g of gallery) if (isRealImageUrl(g?.url)) urls.push(g.url);
      } else {
        const respG = await fetch('data/gallery.json');
        if (respG.ok) {
          const jsonG = await respG.json();
          const gallery = jsonG?.gallery || [];
          for (const g of gallery) if (isRealImageUrl(g?.url)) urls.push(g.url);
        }
      }
    } catch {}

    // 2) Portfolio images (admin or file), filter out placeholders
    try {
      const savedPortfolio = localStorage.getItem('portfolioData');
      if (savedPortfolio) {
        const arr = JSON.parse(savedPortfolio);
        if (Array.isArray(arr)) {
          for (const item of arr) if (isRealImageUrl(item?.image)) urls.push(item.image);
        }
      } else {
        const resp = await fetch('data/portfolio.json');
        if (resp.ok) {
          const json = await resp.json();
          const items = Array.isArray(json) ? json : json?.portfolioItems || [];
          for (const item of items) if (isRealImageUrl(item?.image)) urls.push(item.image);
        }
      }
    } catch {}

    // Dedupe and return
    const unique = Array.from(new Set(urls));
    return unique;
  }

  function createSet(url) {
    const set = document.createElement('div');
    set.className = 'hero-bg-set';
    const blur = document.createElement('div');
    blur.className = 'bg-layer bg-blur';
    blur.style.backgroundImage = `url("${url}")`;
    blur.style.filter = 'blur(18px) saturate(1.1)';
    blur.style.transform = 'scale(1.06)';
    const sharp = document.createElement('div');
    sharp.className = 'bg-layer bg-sharp';
    sharp.style.backgroundImage = `url("${url}")`;
    set.appendChild(blur);
    set.appendChild(sharp);
    return set;
  }

  async function buildDynamicBackground() {
    const overlay = document.querySelector('.hero-overlay');
    let urls = await collectBackgroundUrls();
    const placeholders = [
      'photo/IMG_0805.JPG',
      'photo/IMG_0806.JPG',
      'photo/IMG_0807.JPG',
      'photo/IMG_0808.JPG'
    ];
    if (!urls || urls.length === 0) urls = placeholders;

    // Remove existing static sets
    Array.from(document.querySelectorAll('.hero-bg-set')).forEach(s => s.remove());

    // Add new sets before overlay (so overlay stays above)
    for (const url of urls) {
      const set = createSet(url);
      if (overlay && overlay.parentElement === bgStack) {
        bgStack.insertBefore(set, overlay);
      } else {
        bgStack.appendChild(set);
      }
    }
    // Ensure overlay top-most
    if (overlay && overlay.parentElement === bgStack) bgStack.appendChild(overlay);

    // Refresh sets list and show first
    sets = Array.from(document.querySelectorAll('.hero-bg-set'));
    current = 0;
    showSet(current);
    startCycle();
  }

  // Kick off dynamic build
  buildDynamicBackground();

  // Bokeh particles

  let rafId = null;
  function tick() {
    rafId = requestAnimationFrame(tick);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    for (const p of particles) {
      p.x += p.vx; p.y += p.vy;
      // Gentle repulsion from pointer
      // ... rest of the particle animation logic ...
    }
  }

  tick();
})();
