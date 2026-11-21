const instances = new WeakMap();
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

/** A local dissolve that disperses pixels around the pointer and keeps the lettering readable. */
export function mountTextParticles(block, textSelector, {reach = 1} = {}) {
  const text = block?.querySelector(textSelector);
  if (!text) return {destroy() {}, refresh() {}};
  if (instances.has(block)) return instances.get(block);
  const canvas = document.createElement('canvas');
  const sample = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const ink = sample.getContext('2d', {willReadFrequently: true});
  if (!ctx || !ink) return {destroy() {}, refresh() {}};
  canvas.className = 'text-particle-layer';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.hidden = true;
  block.append(canvas);
  const abort = new AbortController();
  const events = {signal: abort.signal, passive: true};
  const reduced = matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)');
  const canMask = CSS.supports('mask-image', 'radial-gradient(black, transparent)');
  const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, {granularity: 'grapheme'}) : null;
  const active = new Map();
  const padding = Math.ceil(16 * reach);
  let particles = [], frame = 0, rebuildFrame = 0, ready = false, inView = false, destroyed = false;
  let width = 0, height = 0, radius = 24, masked = false, originalMask = null, focus = null;

  function restoreMask() {
    if (!masked) return;
    for (const [name, value, priority] of originalMask) {
      if (value) text.style.setProperty(name, value, priority);
      else text.style.removeProperty(name);
    }
    masked = false;
    originalMask = null;
  }
  function reset() {
    cancelAnimationFrame(frame);
    frame = 0;
    active.clear();
    focus = null;
    canvas.hidden = true;
    restoreMask();
    ctx.clearRect(0, 0, width, height);
  }
  function rebuild() {
    rebuildFrame = 0;
    reset();
    ready = false;
    if (destroyed || reduced.matches || document.hidden || !inView) return;
    const bounds = text.getBoundingClientRect(), parent = block.getBoundingClientRect();
    if (!bounds.width || !bounds.height || bounds.width > 1800 || bounds.height > 600) return;
    const style = getComputedStyle(text), fontSize = parseFloat(style.fontSize);
    if (!fontSize || style.writingMode !== 'horizontal-tb') return;
    width = Math.ceil(bounds.width + padding * 2);
    height = Math.ceil(bounds.height + padding * 2);
    radius = clamp(fontSize * 1.3, 19, 32 * reach);
    sample.width = width; sample.height = height;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.ceil(width * dpr); canvas.height = Math.ceil(height * dpr);
    Object.assign(canvas.style, {
      width: `${width}px`, height: `${height}px`,
      left: `${bounds.left - parent.left - block.clientLeft + block.scrollLeft - padding}px`,
      top: `${bounds.top - parent.top - block.clientTop + block.scrollTop - padding}px`,
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ink.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    ink.fillStyle = style.color;
    ink.textBaseline = 'alphabetic';
    if ('fontKerning' in ink) ink.fontKerning = style.fontKerning;
    // Range boxes use the browser's actual wrapping, alignment, and letter spacing.
    // Sampling only supplies loose pixels: it never replaces the sharp DOM glyphs.
    const walker = document.createTreeWalker(text, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    let node, count = 0;
    while ((node = walker.nextNode())) {
      const parts = segmenter ? [...segmenter.segment(node.data)].map(part => ({value: part.segment, start: part.index})) : (() => {
        let start = 0;
        return [...node.data].map(value => { const part = {value, start}; start += value.length; return part; });
      })();
      for (const {value, start} of parts) {
        if (!value.trim()) continue;
        if (++count > 500) return;
        range.setStart(node, start); range.setEnd(node, start + value.length);
        const box = range.getBoundingClientRect();
        if (!box.width || !box.height) continue;
        const metrics = ink.measureText(value);
        const ascent = metrics.fontBoundingBoxAscent ?? fontSize * .8;
        const descent = metrics.fontBoundingBoxDescent ?? fontSize * .2;
        const baseline = box.top - bounds.top + (box.height - ascent - descent) / 2 + ascent;
        ink.fillText(value, box.left - bounds.left + padding, baseline + padding);
      }
    }
    const pixels = ink.getImageData(0, 0, width, height).data;
    particles = [];
    const step = Math.max(2, Math.ceil(Math.sqrt(width * height / 24000)));
    for (let y = padding; y < height - padding; y += step) {
      for (let x = padding; x < width - padding; x += step) {
        const i = (y * width + x) * 4;
        if (pixels[i + 3] < 45) continue;
        particles.push({x, y, alpha: pixels[i + 3] / 255, color: `rgb(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]})`});
      }
    }
    ready = particles.length > 0;
  }
  function refresh() {
    if (destroyed) return;
    reset(); ready = false;
    if (!rebuildFrame && !document.hidden && !reduced.matches) rebuildFrame = requestAnimationFrame(rebuild);
  }
  function envelope(age) {
    const t = clamp(age / 880, 0, 1);
    return t < .22 ? Math.sin(t / .22 * Math.PI / 2) : (1 - (t - .22) / .78) ** 2;
  }
  function paint(now) {
    frame = 0;
    if (destroyed || reduced.matches || document.hidden || !inView || !block.isConnected) { reset(); return; }
    ctx.clearRect(0, 0, width, height);
    for (const [index, particle] of active) {
      const age = now - particle.time;
      if (age >= 880) { active.delete(index); continue; }
      const spread = envelope(age), point = particles[index];
      ctx.globalAlpha = point.alpha * .8 * (1 - spread * .22);
      ctx.fillStyle = point.color;
      const size = 1.25 - spread * .25;
      ctx.fillRect(Math.round(point.x + particle.dx * spread), Math.round(point.y + particle.dy * spread), size, size);
    }
    ctx.globalAlpha = 1;
    if (focus && canMask && now - focus.time < 880) {
      if (!masked) {
        originalMask = ['mask-image', '-webkit-mask-image'].map(name => [name, text.style.getPropertyValue(name), text.style.getPropertyPriority(name)]);
        masked = true;
      }
      const alpha = 1 - envelope(now - focus.time) * .42;
      const mask = `radial-gradient(circle ${radius}px at ${focus.x - padding}px ${focus.y - padding}px, rgba(0,0,0,${alpha}) 0%, #000 100%)`;
      text.style.maskImage = mask;
      text.style.webkitMaskImage = mask;
    } else restoreMask();
    if (!active.size) { reset(); return; }
    canvas.hidden = false;
    frame = requestAnimationFrame(paint);
  }
  function stir(event) {
    if (event.isPrimary === false || destroyed || reduced.matches || document.hidden || !inView) return;
    if (!ready) { refresh(); return; }
    const bounds = text.getBoundingClientRect();
    const x = event.clientX - bounds.left + padding, y = event.clientY - bounds.top + padding;
    if (x < 0 || x > width || y < 0 || y > height) return;
    const now = performance.now();
    let touched = false;
    for (let index = 0; index < particles.length; index++) {
      const point = particles[index], dx = point.x - x, dy = point.y - y, distance = Math.hypot(dx, dy);
      if (distance > radius || active.has(index) && now - active.get(index).time < 110) continue;
      const strength = 1 - distance / radius, angle = Math.atan2(dy, dx);
      active.delete(index);
      const distanceOut = (3 + strength * 6) * reach;
      active.set(index, {time: now, dx: Math.cos(angle) * distanceOut, dy: Math.sin(angle) * distanceOut - 2});
      touched = true;
      if (active.size > 220) active.delete(active.keys().next().value);
    }
    if (touched) {
      focus = {x, y, time: now};
      if (!frame) frame = requestAnimationFrame(paint);
    }
  }
  block.addEventListener('pointermove', stir, events);
  block.addEventListener('pointerdown', stir, events);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); else refresh(); }, events);
  reduced.addEventListener('change', refresh, events);
  document.fonts?.addEventListener('loadingdone', refresh, events);
  const resize = new ResizeObserver(refresh);
  resize.observe(text); resize.observe(block);
  const content = new MutationObserver(refresh);
  content.observe(text, {childList: true, subtree: true, characterData: true});
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    if (inView) refresh(); else reset();
  });
  visibility.observe(block);
  document.fonts?.ready.then(() => { if (!destroyed) refresh(); });
  const controller = {
    refresh,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      reset(); cancelAnimationFrame(rebuildFrame);
      abort.abort(); resize.disconnect(); content.disconnect(); visibility.disconnect();
      canvas.remove(); instances.delete(block);
    },
  };
  instances.set(block, controller);
  return controller;
}
