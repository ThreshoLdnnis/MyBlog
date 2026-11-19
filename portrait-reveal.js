/** Fashion Web5's trailing ink/tear mask, adapted to the journal portrait. */
export function mountPortraitReveal(stage, hero) {
  if (!stage || !hero) return;
  const front = stage.querySelector('.hero-portrait');
  const back = stage.querySelector('.hero-rider');
  const canvas = document.createElement('canvas');
  canvas.className = 'hero-reveal';
  canvas.setAttribute('aria-hidden', 'true');
  stage.append(canvas);
  const mask = document.createElement('canvas');
  const buffer = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const maskCtx = mask.getContext('2d');
  const bufferCtx = buffer.getContext('2d');
  if (!ctx || !maskCtx || !bufferCtx) { canvas.remove(); return; }

  const coarse = matchMedia('(hover: none), (pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const LIFE = 1100;
  const stamps = [];
  let width = 0, height = 0, dpr = 1, ready = false;
  let previous = null, activeTouch = null, frame = 0, inView = true;
  let lastMove = performance.now(), autoLast = null, autoTime = 0, lastFrame = 0;

  function schedule() {
    if (!frame && ready && inView && !document.hidden) frame = requestAnimationFrame(render);
  }
  function resize() {
    const rect = front.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (!width || !height) return;
    dpr = Math.min(devicePixelRatio || 1, 2);
    for (const surface of [canvas, mask, buffer]) {
      surface.width = Math.max(1, Math.round(width * dpr));
      surface.height = Math.max(1, Math.round(height * dpr));
    }
    canvas.style.height = `${height}px`;
    stamps.length = 0;
    previous = autoLast = null;
    schedule();
  }
  function stamp(x, y, now) {
    const base = Math.max(width, 260) * (coarse.matches ? .15 : .12);
    const lobes = [];
    for (let i = 0, count = 3 + Math.floor(Math.random() * 3); i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * base * .45;
      lobes.push({dx: Math.cos(angle) * distance, dy: Math.sin(angle) * distance, radius: base * (.45 + Math.random() * .55)});
    }
    stamps.push({x, y, time: now, lobes});
    // Bound work for very high polling-rate mice without changing the visible trail.
    if (stamps.length > 400) stamps.splice(0, stamps.length - 400);
  }
  function pointerTo(event) {
    if (!ready || !event.isPrimary || event.target.closest('button,a,input,select,textarea')) return;
    const rect = front.getBoundingClientRect();
    const point = {x: event.clientX - rect.left, y: event.clientY - rect.top};
    if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) { previous = null; return; }
    const now = performance.now();
    if (previous) {
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      const count = Math.min(40, Math.max(1, Math.ceil(distance / (Math.max(width, 260) * .04))));
      for (let i = 1; i <= count; i++) {
        const progress = i / count;
        stamp(previous.x + (point.x - previous.x) * progress, previous.y + (point.y - previous.y) * progress, now);
      }
    } else stamp(point.x, point.y, now);
    previous = point;
    autoLast = null;
    lastMove = now;
    schedule();
  }
  function clearPointer() { previous = null; activeTouch = null; }
  hero.addEventListener('pointermove', event => {
    if (event.pointerType === 'touch' && event.pointerId !== activeTouch) return;
    pointerTo(event);
  }, {passive: true});
  hero.addEventListener('pointerdown', event => {
    if (!event.isPrimary) return;
    if (event.pointerType === 'touch') activeTouch = event.pointerId;
    pointerTo(event);
  }, {passive: true});
  hero.addEventListener('pointerleave', clearPointer);
  hero.addEventListener('pointercancel', clearPointer);
  window.addEventListener('pointerup', event => {
    if (event.pointerId === activeTouch) clearPointer();
  }, {passive: true});

  function drawImage(context, image) { context.drawImage(image, 0, 0, width, height); }
  function render(now) {
    frame = 0;
    if (!ready || !width || !height) return;
    const delta = Math.min((now - (lastFrame || now)) / 1000, .05);
    lastFrame = now;
    if (coarse.matches && !reduced.matches && now - lastMove > 2500) {
      autoTime += delta;
      const x = width * (.5 + Math.sin(autoTime * 1.3) * .28);
      const y = height * (.32 + Math.sin(autoTime * .9 + 1) * .22);
      if (!autoLast || Math.hypot(x - autoLast.x, y - autoLast.y) > width * .02) {
        stamp(x, y, now);
        autoLast = {x, y};
      }
    }
    while (stamps.length && now - stamps[0].time > LIFE) stamps.shift();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, width, height);
    drawImage(ctx, front);
    if (stamps.length) {
      maskCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      maskCtx.clearRect(0, 0, width, height);
      maskCtx.fillStyle = '#000';
      for (const mark of stamps) {
        const remaining = Math.max(0, 1 - (now - mark.time) / LIFE);
        const scale = remaining < .75 ? remaining / .75 : 1;
        for (const lobe of mark.lobes) {
          maskCtx.beginPath();
          maskCtx.arc(mark.x + lobe.dx * scale, mark.y + lobe.dy * scale, lobe.radius * Math.pow(scale, .8), 0, Math.PI * 2);
          maskCtx.fill();
        }
      }
      // Remove the person first: both cutouts have transparent, different silhouettes.
      ctx.globalCompositeOperation = 'destination-out';
      ctx.drawImage(mask, 0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      bufferCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      bufferCtx.globalCompositeOperation = 'source-over';
      bufferCtx.clearRect(0, 0, width, height);
      bufferCtx.drawImage(mask, 0, 0, width, height);
      bufferCtx.globalCompositeOperation = 'source-in';
      drawImage(bufferCtx, back);
      bufferCtx.globalCompositeOperation = 'source-over';
      ctx.drawImage(buffer, 0, 0, width, height);
    }
    if (stamps.length || (coarse.matches && !reduced.matches)) schedule();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(front);
  const visibility = new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    if (inView) { lastFrame = 0; schedule(); }
    else { cancelAnimationFrame(frame); frame = 0; clearPointer(); }
  });
  visibility.observe(hero);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
    else { lastFrame = 0; schedule(); }
  });
  for (const query of [coarse, reduced]) query.addEventListener('change', schedule);

  Promise.all([front.decode(), back.decode()]).then(() => {
    ready = true;
    resize();
    cancelAnimationFrame(frame);
    frame = 0;
    render(performance.now());
    stage.classList.add('reveal-ready');
  }).catch(() => {
    // Keep the original photograph visible if decoding fails.
    canvas.remove();
    observer.disconnect();
    visibility.disconnect();
  });
}
