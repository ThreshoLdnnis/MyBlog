const instances = new WeakMap();
const MAX_PARTICLES = 2600;
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** Dissolve the real title glyphs locally; the original inline text owns the idle state. */
export function mountNameParticles(nameSpan, hero) {
  if (!nameSpan || !hero || !nameSpan.parentElement) return {destroy(){},refresh(){}};
  if (instances.has(nameSpan)) return instances.get(nameSpan);
  const heading = nameSpan.parentElement;
  const canvas = document.createElement('canvas');
  const source = document.createElement('canvas');
  const sampler = document.createElement('canvas');
  let ctx, sourceCtx, sampleCtx;
  try {
    ctx = canvas.getContext('2d'); sourceCtx = source.getContext('2d');
    sampleCtx = sampler.getContext('2d', {willReadFrequently:true});
  } catch { return {destroy(){},refresh(){}}; }
  if (!ctx || !sourceCtx || !sampleCtx) return {destroy(){},refresh(){}};

  const baselineProbe = document.createElement('span');
  baselineProbe.className = 'name-particle-baseline';
  baselineProbe.setAttribute('aria-hidden', 'true');
  canvas.className = 'name-particle-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  nameSpan.after(baselineProbe);
  heading.append(canvas);
  nameSpan.classList.add('name-particle-source');

  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let destroyed = false, ready = false, inView = true;
  let frame = 0, rebuildFrame = 0, lastFrame = 0;
  let width = 0, height = 0, dpr = 1, rasterScaleX = 1, rasterScaleY = 1, fontSize = 0, padding = 0;
  let particles = [], active = new Set(), previousPoint = null;
  let inkBounds = null, fingerprint = '', lastFontCheck = 0;

  function restoreDOM() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0; lastFrame = 0; previousPoint = null;
    active.clear();
    for (const particle of particles) {
      particle.x = particle.bx; particle.y = particle.by;
      particle.vx = 0; particle.vy = 0; particle.touched = 0;
    }
    nameSpan.classList.remove('is-name-particle-active');
    canvas.classList.remove('is-name-particle-active');
  }

  function styleFingerprint(style) {
    return [nameSpan.textContent,style.fontFamily,style.fontSize,style.fontWeight,style.fontStyle,
      style.fontStretch,style.fontKerning,style.fontVariantCaps,style.letterSpacing,
      style.textTransform,style.color,style.backgroundImage,style.backgroundSize].join('|');
  }

  function titlePaint(style, spanRect) {
    const top = style.getPropertyValue('--name-sky-top').trim();
    const middle = style.getPropertyValue('--name-sky-middle').trim();
    const bottom = style.getPropertyValue('--name-sky-bottom').trim();
    const textured = top && middle && bottom && style.backgroundImage !== 'none';
    if (!textured) return {fill:style.color, grain:null};
    // CSS backgrounds follow the original inline box, not the visible ink bounds.
    // Matching that box keeps the gradient stable when the DOM becomes particles.
    const fill = sourceCtx.createLinearGradient(0, padding, 0, padding + spanRect.height);
    fill.addColorStop(0, top);
    fill.addColorStop(.48, middle);
    fill.addColorStop(1, bottom);
    const grain = document.createElement('canvas');
    grain.width = grain.height = 8;
    const grainCtx = grain.getContext('2d');
    if (!grainCtx) return {fill, grain:null};
    grainCtx.scale(2, 2);
    const cream = style.getPropertyValue('--name-cream-grain').trim() || 'rgba(255,244,220,.3)';
    const fleck = grainCtx.createRadialGradient(1, 1, 0, 1, 1, .9);
    fleck.addColorStop(0, cream);
    fleck.addColorStop(.55 / .9, cream);
    fleck.addColorStop(1, 'rgba(255,244,220,0)');
    grainCtx.fillStyle = fleck;
    grainCtx.fillRect(0, 0, 4, 4);
    return {fill, grain};
  }

  function rebuild() {
    rebuildFrame = 0;
    restoreDOM(); ready = false;
    if (destroyed || motion.matches || document.hidden || !inView) return;
    try {
      const spanRect = nameSpan.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      if (spanRect.width < 2 || spanRect.height < 2 || headingRect.width < 2) return;
      const style = getComputedStyle(nameSpan);
      const textContent = nameSpan.textContent || '';
      let text = textContent.replace(/\s+/g, ' ');
      if (style.textTransform === 'uppercase') text = text.toLocaleUpperCase();
      if (style.textTransform === 'lowercase') text = text.toLocaleLowerCase();
      if (!text.trim()) return;
      fontSize = parseFloat(style.fontSize);
      if (!Number.isFinite(fontSize) || fontSize < 12) return;
      const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      if (document.fonts && !document.fonts.check(font, text)) return;
      const spacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
      // Avoid an approximate, differently tracked title on old canvas implementations.
      if (!('letterSpacing' in sourceCtx) && Math.abs(parseFloat(spacing) || 0) > .01) return;
      padding = clamp(fontSize * .48, 50, 110);
      width = Math.ceil(spanRect.width + padding * 2);
      height = Math.ceil(spanRect.height + padding * 2);
      if (width > 3600 || height > 1000) return;
      dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(4000000 / (width * height)));
      for (const surface of [canvas, source]) {
        surface.width = Math.ceil(width * dpr); surface.height = Math.ceil(height * dpr);
      }
      rasterScaleX = source.width / width; rasterScaleY = source.height / height;
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      canvas.style.left = `${spanRect.left - headingRect.left - heading.clientLeft + heading.scrollLeft - padding}px`;
      canvas.style.top = `${spanRect.top - headingRect.top - heading.clientTop + heading.scrollTop - padding}px`;
      const baseline = baselineProbe.getBoundingClientRect().top - spanRect.top + padding;
      sourceCtx.setTransform(rasterScaleX, 0, 0, rasterScaleY, 0, 0);
      sourceCtx.font = font;
      sourceCtx.textAlign = 'left'; sourceCtx.textBaseline = 'alphabetic';
      const title = titlePaint(style, spanRect);
      sourceCtx.fillStyle = title.fill;
      if ('letterSpacing' in sourceCtx) sourceCtx.letterSpacing = spacing;
      if ('fontKerning' in sourceCtx) sourceCtx.fontKerning = style.fontKerning;
      if ('fontStretch' in sourceCtx) sourceCtx.fontStretch = style.fontStretch;
      if ('fontVariantCaps' in sourceCtx) sourceCtx.fontVariantCaps = style.fontVariantCaps;
      const metrics = sourceCtx.measureText(text);
      sourceCtx.fillText(text, padding, baseline);
      if (title.grain) {
        const pattern = sourceCtx.createPattern(title.grain, 'repeat');
        if (pattern) {
          sourceCtx.save();
          sourceCtx.globalCompositeOperation = 'source-atop';
          sourceCtx.translate(padding, padding);
          sourceCtx.scale(.5, .5);
          sourceCtx.fillStyle = pattern;
          sourceCtx.fillRect(0, 0, spanRect.width * 2, spanRect.height * 2);
          sourceCtx.restore();
        }
      }
      ctx.setTransform(rasterScaleX, 0, 0, rasterScaleY, 0, 0);
      sampler.width = width; sampler.height = height;
      sampleCtx.drawImage(source, 0, 0, width, height);
      const pixels = sampleCtx.getImageData(0, 0, width, height).data;
      const left = Math.max(0, Math.floor(padding - (metrics.actualBoundingBoxLeft || 0)) - 1);
      const right = Math.min(width, Math.ceil(padding + Math.max(metrics.width, metrics.actualBoundingBoxRight || 0)) + 1);
      const top = Math.max(0, Math.floor(baseline - (metrics.actualBoundingBoxAscent || fontSize)) - 1);
      const bottom = Math.min(height, Math.ceil(baseline + (metrics.actualBoundingBoxDescent || 0)) + 1);
      inkBounds = {left, right, top, bottom};
      let cell = Math.max(3, Math.round(fontSize / 38)), tiles;
      do {
        tiles = [];
        for (let y = top; y < bottom; y += cell) {
          for (let x = left; x < right; x += cell) {
            const tileWidth = Math.min(cell, right - x), tileHeight = Math.min(cell, bottom - y);
            let found = false;
            for (let py = y; py < y + tileHeight && !found; py++) {
              for (let px = x; px < x + tileWidth; px++) {
                if (pixels[(py * width + px) * 4 + 3] > 8) { found = true; break; }
              }
            }
            if (found) tiles.push({sx:x,sy:y,w:tileWidth,h:tileHeight,bx:x+tileWidth/2,by:y+tileHeight/2});
          }
        }
        if (tiles.length > MAX_PARTICLES) cell++;
      } while (tiles.length > MAX_PARTICLES);
      particles = tiles.map(tile => ({...tile,x:tile.bx,y:tile.by,vx:0,vy:0,touched:0,spin:(Math.random()-.5)*3}));
      fingerprint = styleFingerprint(style);
      ready = particles.length > 0;
    } catch {
      ready = false; restoreDOM();
    }
  }

  function requestRebuild() {
    if (destroyed) return;
    restoreDOM(); ready = false;
    if (!rebuildFrame && !document.hidden) rebuildFrame = requestAnimationFrame(rebuild);
  }

  function paint() {
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(source, 0, 0, width, height);
    // Clear complete backing-store pixels; fractional DPR must not leave tile-edge ink.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const index of active) {
      const tile = particles[index];
      const left = Math.floor(tile.sx * rasterScaleX);
      const top = Math.floor(tile.sy * rasterScaleY);
      const right = Math.ceil((tile.sx + tile.w) * rasterScaleX);
      const bottom = Math.ceil((tile.sy + tile.h) * rasterScaleY);
      ctx.clearRect(left, top, right - left, bottom - top);
    }
    ctx.restore();
    for (const index of active) {
      const tile = particles[index];
      const distance = Math.hypot(tile.x - tile.bx, tile.y - tile.by);
      const spread = Math.min(1, distance / 70);
      const size = 1 - spread * .58;
      ctx.save();
      ctx.translate(tile.x, tile.y);
      ctx.rotate(tile.spin * spread);
      ctx.globalAlpha = 1 - spread * .23;
      ctx.drawImage(source, tile.sx*rasterScaleX, tile.sy*rasterScaleY, tile.w*rasterScaleX, tile.h*rasterScaleY,
        -tile.w*size/2, -tile.h*size/2, tile.w*size, tile.h*size);
      ctx.restore();
    }
  }

  function animate(now) {
    frame = 0;
    if (destroyed || !ready || motion.matches || document.hidden || !inView) { restoreDOM(); return; }
    const dt = Math.min((now - (lastFrame || now - 16.7)) / 1000, .034);
    lastFrame = now;
    for (const index of active) {
      const tile = particles[index];
      const age = now - tile.touched;
      const returning = age > 130;
      const spring = returning ? 68 : 2;
      const friction = Math.exp(-(returning ? 14 : 3.8) * dt);
      tile.vx = (tile.vx + (tile.bx - tile.x) * spring * dt) * friction;
      tile.vy = (tile.vy + (tile.by - tile.y) * spring * dt) * friction;
      tile.x += tile.vx * dt; tile.y += tile.vy * dt;
      const dx = tile.x - tile.bx, dy = tile.y - tile.by;
      const distance = Math.hypot(dx, dy);
      if (distance > padding * .9) {
        tile.x = tile.bx + dx / distance * padding * .9;
        tile.y = tile.by + dy / distance * padding * .9;
        tile.vx *= .5; tile.vy *= .5;
      }
      if (age > 1550 || (returning && distance < .3 && Math.hypot(tile.vx,tile.vy) < 3)) {
        tile.x = tile.bx; tile.y = tile.by; tile.vx = 0; tile.vy = 0;
        active.delete(index);
      }
    }
    if (!active.size) { restoreDOM(); return; }
    try { paint(); } catch { ready = false; restoreDOM(); return; }
    frame = requestAnimationFrame(animate);
  }

  function onPointerMove(event) {
    if (event.isPrimary === false || destroyed || motion.matches || document.hidden || !inView) return;
    if (!ready) { requestRebuild(); return; }
    const now = performance.now();
    if (now - lastFontCheck > 200) {
      lastFontCheck = now;
      if (styleFingerprint(getComputedStyle(nameSpan)) !== fingerprint) { requestRebuild(); return; }
    }
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) { requestRebuild(); return; }
    const x = (event.clientX - rect.left) * width / rect.width;
    const y = (event.clientY - rect.top) * height / rect.height;
    const radius = clamp(fontSize * .2, 26, 52);
    if (x < inkBounds.left - radius || x > inkBounds.right + radius || y < inkBounds.top - radius || y > inkBounds.bottom + radius) {
      previousPoint = null; return;
    }
    const prior = previousPoint && now - previousPoint.time < 110 ? previousPoint : {x,y,time:now-16};
    const movementX = x - prior.x, movementY = y - prior.y;
    const lengthSquared = movementX * movementX + movementY * movementY;
    const elapsed = Math.max(10, now - prior.time);
    const velocityX = clamp(movementX / elapsed, -2.5, 2.5);
    const velocityY = clamp(movementY / elapsed, -2.5, 2.5);
    previousPoint = {x,y,time:now};
    let changed = false;
    for (let index = 0; index < particles.length; index++) {
      const tile = particles[index];
      const projection = lengthSquared ? clamp(((tile.bx-prior.x)*movementX + (tile.by-prior.y)*movementY) / lengthSquared, 0, 1) : 1;
      const dx = tile.bx - (prior.x + movementX * projection);
      const dy = tile.by - (prior.y + movementY * projection);
      const distance = Math.hypot(dx,dy);
      if (distance > radius) continue;
      const strength = (1 - distance / radius) ** .6;
      const safeDistance = Math.max(distance, 1);
      if (!active.has(index)) { tile.x = tile.bx; tile.y = tile.by; tile.vx = 0; tile.vy = 0; }
      tile.vx = clamp(tile.vx + dx/safeDistance * 190*strength + velocityX*95*strength, -480, 480);
      tile.vy = clamp(tile.vy + dy/safeDistance * 190*strength + velocityY*65*strength - 60*strength, -480, 480);
      tile.touched = now;
      active.add(index); changed = true;
    }
    if (changed && !frame) {
      // Paint a valid replacement before hiding accessible, perfectly sharp DOM text.
      try { paint(); } catch { ready = false; restoreDOM(); return; }
      canvas.classList.add('is-name-particle-active');
      nameSpan.classList.add('is-name-particle-active');
      lastFrame = now;
      frame = requestAnimationFrame(animate);
    }
  }

  const onPointerDown = event => { if (event.pointerType !== 'mouse') onPointerMove(event); };
  const onPointerLeave = () => { previousPoint = null; };
  const onVisibility = () => { if (document.hidden) restoreDOM(); else requestRebuild(); };
  const onMotionChange = () => { restoreDOM(); requestRebuild(); };
  hero.addEventListener('pointermove', onPointerMove, {passive:true});
  hero.addEventListener('pointerdown', onPointerDown, {passive:true});
  hero.addEventListener('pointerleave', onPointerLeave, {passive:true});
  hero.addEventListener('pointercancel', onPointerLeave, {passive:true});
  window.addEventListener('resize', requestRebuild, {passive:true});
  document.addEventListener('visibilitychange', onVisibility);
  motion.addEventListener('change', onMotionChange);
  document.fonts?.addEventListener('loadingdone', requestRebuild);
  const textObserver = new MutationObserver(requestRebuild);
  textObserver.observe(nameSpan, {childList:true,subtree:true,characterData:true});
  const styleObserver = new MutationObserver(requestRebuild);
  styleObserver.observe(heading, {attributes:true,attributeFilter:['style','class']});
  styleObserver.observe(nameSpan, {attributes:true,attributeFilter:['style']});
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(requestRebuild) : null;
  resizeObserver?.observe(heading);
  const visibilityObserver = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    const visible = entries[0]?.isIntersecting ?? true;
    if (visible !== inView) { inView = visible; if (visible) requestRebuild(); else restoreDOM(); }
  }, {threshold:0}) : null;
  visibilityObserver?.observe(heading);
  if (document.fonts) document.fonts.ready.then(() => { if (!destroyed) requestRebuild(); });
  requestRebuild();

  const controller = {
    refresh: requestRebuild,
    destroy() {
      if (destroyed) return;
      destroyed = true; restoreDOM();
      if (rebuildFrame) cancelAnimationFrame(rebuildFrame);
      hero.removeEventListener('pointermove',onPointerMove);
      hero.removeEventListener('pointerdown',onPointerDown);
      hero.removeEventListener('pointerleave',onPointerLeave);
      hero.removeEventListener('pointercancel',onPointerLeave);
      window.removeEventListener('resize',requestRebuild);
      document.removeEventListener('visibilitychange',onVisibility);
      motion.removeEventListener('change',onMotionChange);
      document.fonts?.removeEventListener('loadingdone',requestRebuild);
      textObserver.disconnect(); styleObserver.disconnect(); resizeObserver?.disconnect(); visibilityObserver?.disconnect();
      canvas.remove(); baselineProbe.remove(); nameSpan.classList.remove('name-particle-source');
      instances.delete(nameSpan);
    }
  };
  instances.set(nameSpan,controller);
  return controller;
}
