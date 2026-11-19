/* Found — detached-canvas silhouettes and living Verlet silk. No dependencies. */
(() => {
  'use strict';
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const makeCanvas = () => document.createElement('canvas');
  const point = (x, y) => ({ x, y, px: x, py: y });
  const copyAnchor = p => ({ x: p.x, y: p.y, el: p.el, u: p.u, v: p.v });

  class FoundSilk {
    constructor() {
      this.w = innerWidth; this.h = innerHeight; this.dpr = 1;
      this.ropes = []; this.anchors = []; this.knots = []; this.falling = []; this.splats = [];
      this.live = null; this.lastAnchor = null; this.time = 0; this.lastAttach = -10;
      this.lastSpinneret = null; this.lastAttachSpinneret = null;
      this.mask = makeCanvas(); this.maskCtx = this.mask.getContext('2d', { willReadFrequently: true });
      this.shadow = makeCanvas(); this.shadowCtx = this.shadow.getContext('2d');
      this.scratch = makeCanvas(); this.scratchCtx = this.scratch.getContext('2d', { willReadFrequently: true });
      this.maskPixels = null; this.anchorGrid = new Map(); this.svgImages = new WeakMap();
      this.touch = matchMedia('(hover:none) and (pointer:coarse)').matches;
      this.setPalette();
      this.bead = this.makeBead(); this.sampleTimer = 0; this.cooldown = 0;
      this.scheduleSample = () => {
        clearTimeout(this.sampleTimer);
        this.sampleTimer = setTimeout(() => this.sampleAnchors(), 80);
      };
      document.fonts?.ready.then(this.scheduleSample);
      addEventListener('load', this.scheduleSample);
      addEventListener('found:layout', this.scheduleSample);
      setTimeout(this.scheduleSample, 600);
    }

    setPalette(lightBackground = false) {
      this.palette = lightBackground
        ? {strand:'rgba(45,52,67,.72)', fibre:'rgba(55,62,76,.62)', knot:'rgba(45,52,67,.76)'}
        : {strand:'rgba(255,255,255,.75)', fibre:'rgba(245,245,245,.65)', knot:'rgba(255,255,255,.8)'};
    }

    makeBead() {
      const c = makeCanvas(); c.width = c.height = 64;
      const g = c.getContext('2d');
      let fill = g.createRadialGradient(25, 23, 2, 32, 32, 28);
      fill.addColorStop(0, 'rgba(220,242,255,.06)');
      fill.addColorStop(.60, 'rgba(190,224,255,.1)');
      fill.addColorStop(.80, 'rgba(228,244,255,.30)');
      fill.addColorStop(.94, 'rgba(255,255,255,.77)');
      fill.addColorStop(1, 'rgba(185,222,255,.08)');
      g.fillStyle = fill; g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.fill();
      fill = g.createRadialGradient(39, 44, 0, 39, 44, 16);
      fill.addColorStop(0, 'rgba(255,210,150,.45)'); fill.addColorStop(1, 'rgba(255,210,150,0)');
      g.fillStyle = fill; g.beginPath(); g.arc(37, 41, 17, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.94)';
      g.beginPath(); g.ellipse(23, 21, 7, 3.5, -.6, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.56)'; g.beginPath(); g.arc(40, 42, 2.1, 0, TAU); g.fill();
      return c;
    }

    resize(w, h, dpr = 1) {
      this.w = Math.max(1, Math.round(w)); this.h = Math.max(1, Math.round(h));
      this.dpr = Math.min(2, dpr);
      this.mask.width = this.w; this.mask.height = this.h;
      this.shadow.width = Math.ceil(this.w * this.dpr); this.shadow.height = Math.ceil(this.h * this.dpr);
      this.sampleAnchors();
    }

    start(x, y) {
      this.lastAnchor = { x, y };
      if (this.live) { this.live.dead = true; this.live.live = false; }
      this.live = null;
      this.lastAttachSpinneret = null;
      this.lastAttach = this.time;
    }
    setLiveAnchor(x, y) { this.start(x, y); }

    // Range geometry gives each glyph its actual kerning and wrapping, including
    // the transparent o that is painted by the separate foreground wordmark.
    drawTextSilhouette(el, ctx, ox, oy) {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const parent = node.parentElement;
        if (!parent || parent.closest('[aria-hidden="true"]') && !el.classList.contains('found')) continue;
        const css = getComputedStyle(parent);
        if (css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) continue;
        const size = parseFloat(css.fontSize);
        if (!size) continue;
        ctx.font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
        const fontMetric = ctx.measureText('Hg');
        const asc = fontMetric.fontBoundingBoxAscent || size * .8;
        const desc = fontMetric.fontBoundingBoxDescent || size * .2;
        for (let i = 0; i < node.length; i++) {
          const char = node.data[i];
          if (!char.trim()) continue;
          const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + 1);
          const r = range.getBoundingClientRect();
          if (!r.width || !r.height) continue;
          ctx.fillText(char, r.left - ox, r.top - oy + (r.height - asc - desc) / 2 + asc);
        }
      }
    }

    drawSvgSilhouette(el, ctx, r, ox, oy) {
      const svg = el.tagName.toLowerCase() === 'svg' ? el : el.querySelector('svg');
      if (!svg) return false;
      let record = this.svgImages.get(svg);
      if (!record) {
        const source = svg.cloneNode(true);
        const sr = svg.getBoundingClientRect();
        source.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        source.setAttribute('width', sr.width || r.width); source.setAttribute('height', sr.height || r.height);
        source.style.color = '#fff';
        const xml = new XMLSerializer().serializeToString(source).replaceAll('currentColor', '#fff');
        const img = new Image(); record = { img, ready: false }; this.svgImages.set(svg, record);
        img.onload = () => { record.ready = true; this.scheduleSample(); };
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
      }
      if (record.ready) {
        const sr = svg.getBoundingClientRect();
        ctx.drawImage(record.img, sr.left - ox, sr.top - oy, sr.width, sr.height);
      }
      return true;
    }

    sampleAnchors() {
      if (!this.mask.width || !this.mask.height) return;
      const m = this.maskCtx; m.clearRect(0, 0, this.w, this.h);
      this.anchors = []; this.anchorGrid.clear();
      const elements = [...document.querySelectorAll('[data-web-anchor]')];
      for (const el of elements) {
        if (el.closest('.over') || el.closest('[hidden]')) continue;
        const r = el.getBoundingClientRect(), css = getComputedStyle(el);
        if (!r.width || !r.height || css.display === 'none' || css.visibility === 'hidden' || Number(css.opacity) === 0) continue;
        if (r.right < 0 || r.bottom < 0 || r.left > this.w || r.top > this.h) continue;
        const ox = Math.floor(r.left - 4), oy = Math.floor(r.top - 4);
        const cw = Math.max(1, Math.ceil(r.width + 8)), ch = Math.max(1, Math.ceil(r.height + 8));
        this.scratch.width = cw; this.scratch.height = ch;
        const s = this.scratchCtx; s.fillStyle = '#fff';
        const image = el.tagName === 'IMG' ? el : null;
        let threshold = 128;
        if (image) {
          if (!image.complete || !image.naturalWidth) { image.addEventListener('load', this.scheduleSample, { once: true }); continue; }
          threshold = 140;
          const angle = parseFloat(css.rotate) || 0;
          const iw = el.offsetWidth || r.width, ih = el.offsetHeight || r.height;
          s.save(); s.translate(r.left + r.width / 2 - ox, r.top + r.height / 2 - oy);
          s.rotate(angle * Math.PI / 180); s.drawImage(image, -iw / 2, -ih / 2, iw, ih); s.restore();
        } else if (el.classList.contains('player') || el.dataset.webShape === 'box') {
          const radius = parseFloat(css.borderRadius) || 0;
          s.beginPath(); s.roundRect(r.left - ox, r.top - oy, r.width, r.height, radius); s.fill();
        } else if (!this.drawSvgSilhouette(el, s, r, ox, oy)) {
          this.drawTextSilhouette(el, s, ox, oy);
        }
        let pixels;
        try { pixels = s.getImageData(0, 0, cw, ch).data; } catch (_) { continue; }
        // Alpha is both collision geometry and the only receiver for web shadows.
        m.drawImage(this.scratch, ox, oy);
        const occupied = new Set();
        for (let y = 1; y < ch - 1; y++) {
          for (let x = 1; x < cw - 1; x++) {
            const k = (y * cw + x) * 4 + 3;
            if (pixels[k] <= threshold) continue;
            if (pixels[k - 4] > threshold && pixels[k + 4] > threshold && pixels[k - cw * 4] > threshold && pixels[k + cw * 4] > threshold) continue;
            const gx = x + ox, gy = y + oy;
            if (gx < 0 || gy < 0 || gx >= this.w || gy >= this.h) continue;
            const cell = `${Math.floor(gx / 7)},${Math.floor(gy / 7)}`;
            if (occupied.has(cell)) continue;
            occupied.add(cell);
            const p = { x: gx, y: gy, el, u: (gx - r.left) / r.width, v: (gy - r.top) / r.height };
            this.anchors.push(p);
            const gridKey = `${Math.floor(gx / 70)},${Math.floor(gy / 70)}`;
            if (!this.anchorGrid.has(gridKey)) this.anchorGrid.set(gridKey, []);
            this.anchorGrid.get(gridKey).push(p);
          }
        }
      }
      this.maskPixels = m.getImageData(0, 0, this.w, this.h).data;
      const rects = new Map();
      const refresh = p => {
        if (!p?.el?.isConnected) return;
        let r = rects.get(p.el);
        if (!r) { r = p.el.getBoundingClientRect(); rects.set(p.el, r); }
        if (r.width && r.height) { p.x = r.left + p.u * r.width; p.y = r.top + p.v * r.height; }
      };
      refresh(this.lastAnchor);
      for (const rope of this.ropes) { refresh(rope.a); if (!rope.live) refresh(rope.b); }
      for (const knot of this.knots) refresh(knot);
    }

    nearest(x, y, radius, minDistance = 0, origin = null) {
      let best = null, bd = radius * radius;
      const cells = Math.ceil(radius / 70), cx = Math.floor(x / 70), cy = Math.floor(y / 70);
      for (let gy = cy - cells; gy <= cy + cells; gy++) for (let gx = cx - cells; gx <= cx + cells; gx++) {
        const candidates = this.anchorGrid.get(`${gx},${gy}`);
        if (!candidates) continue;
        for (const p of candidates) {
          const d = (p.x - x) ** 2 + (p.y - y) ** 2;
          if (d >= bd || d < minDistance * minDistance || origin && distance(origin, p) < 54) continue;
          bd = d; best = p;
        }
      }
      return best;
    }

    makeRope(a, b, thick, live = false) {
      const length = Math.max(1, distance(a, b)), slack = 1.01 + Math.random() * .005;
      const points = Array.from({ length: 13 }, (_, i) => {
        const t = i / 12;
        return point(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * Math.min(8, length * .02));
      });
      const rope = { a: copyAnchor(a), b: copyAnchor(b), points, thick, live, length, rest: length / 12 * slack, slack,
        born: this.time, phase: Math.random() * TAU, fade: 1, dead: false, drops: [], hair: [], fluff: [] };
      this.growHair(rope);
      if (Math.random() < .4) for (let i = 0, n = 1 + Math.floor(Math.random() * 2); i < n; i++) {
        rope.fluff.push({ u: .1 + Math.random() * .8, dust: Math.random() < .45, seed: Math.random() * 20 });
      }
      this.ropes.push(rope);
      while (this.ropes.length > 140) {
        const index = this.ropes.findIndex(r => !r.live);
        if (index < 0) break;
        this.ropes.splice(index, 1);
      }
      return rope;
    }

    growHair(rope) {
      const count = Math.min(1800, Math.ceil(rope.length * 3 / 1.1 * (this.touch ? .4 : 1)));
      while (rope.hair.length < count) rope.hair.push({ u: Math.random(), len: .5 + Math.random() * 2.2, side: Math.random() < .5 ? -1 : 1, skew: Math.random() - .5 });
    }

    addDew(rope) {
      const count = Math.floor(rope.length / 55 * (.4 + Math.random()));
      for (let i = 0; i < count; i++) rope.drops.push({ u: .04 + Math.random() * .92, r: 1.6 + Math.random() * 4.6, du: 0, sliding: false });
    }

    onRope(rope, u) {
      const v = clamp(u, 0, 1) * 12, i = Math.min(11, Math.floor(v)), t = v - i;
      const a = rope.points[i], b = rope.points[i + 1];
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, dx: b.x - a.x, dy: b.y - a.y };
    }

    attach(anchor, spinneret) {
      if (!this.live || !this.lastAnchor) return;
      const old = this.lastAnchor, p = copyAnchor(anchor);
      this.live.b = copyAnchor(p); this.live.live = false;
      this.live.length = distance(old, p); this.live.rest = this.live.length / 12 * this.live.slack;
      this.addDew(this.live);
      let nearestOld = null, nearD = 288;
      for (const knot of this.knots) {
        const d = distance(knot, p);
        if (d > 35 && d < nearD && distance(knot, old) > 25) { nearestOld = knot; nearD = d; }
      }
      if (nearestOld) this.addDew(this.makeRope(p, nearestOld, .7));
      if (Math.random() < .75) {
        const adjacent = this.nearest(p.x, p.y, 204, 45, old);
        if (adjacent) this.addDew(this.makeRope(p, adjacent, .85));
      }
      p.phase = Math.random() * TAU; this.knots.push(p);
      if (this.knots.length > 140) this.knots.shift();
      this.lastAnchor = copyAnchor(p); this.live = null; this.lastAttach = this.time;
      this.lastAttachSpinneret = { x: spinneret.x, y: spinneret.y };
      this.vibrate(p.x, p.y, 60, 1.2);
    }

    update(dt, time, spinneret, pointer = {}, active = true) {
      if (!Number.isFinite(spinneret?.x) || !Number.isFinite(spinneret?.y)) return;
      this.time = time; dt = Math.min(.033, Math.max(0, dt));
      this.cooldown = Math.max(0, this.cooldown - dt);
      if (!this.lastAnchor) this.start(this.w / 2, -2);
      this.lastSpinneret = { x: spinneret.x, y: spinneret.y };
      if (!this.lastAttachSpinneret) this.lastAttachSpinneret = { ...this.lastSpinneret };
      if (!this.live) this.live = this.makeRope(this.lastAnchor, spinneret, 1.25, true);
      this.live.b.x = spinneret.x; this.live.b.y = spinneret.y;
      this.live.length = Math.max(1, distance(this.live.a, spinneret));
      this.live.rest = this.live.length / 12 * this.live.slack;
      this.growHair(this.live);
      // The spinneret must travel after each attachment. Merely being between
      // two nearby outlines must never make a resting spider alternate anchors.
      if (active && !this.cooldown && time - this.lastAttach > .24 && distance(this.lastAttachSpinneret, spinneret) >= 30 && distance(this.lastAnchor, spinneret) > 54) {
        const nearby = this.nearest(spinneret.x, spinneret.y, 70, 0, this.lastAnchor);
        if (nearby && distance(nearby, this.lastAnchor) > 54) this.attach(nearby, spinneret);
        else if (!this.anchors.length && distance(this.lastAnchor, spinneret) > 120) this.attach(spinneret, spinneret);
      }
      for (let ri = this.ropes.length - 1; ri >= 0; ri--) {
        const r = this.ropes[ri];
        if (r.dead) { r.fade -= 2.6 * dt; if (r.fade <= 0) { this.ropes.splice(ri, 1); continue; } }
        const ps = r.points;
        for (let i = 1; i < 12; i++) {
          const p = ps[i], vx = (p.x - p.px) * .975, vy = (p.y - p.py) * .975;
          p.px = p.x; p.py = p.y;
          const wind = (Math.sin(.45 * time) * .6 + Math.sin(1.3 * time + 1.7) * .4) * (.6 + .4 * Math.sin(1.1 * time + .012 * p.y + r.phase));
          p.x += vx + wind * 22 * dt * dt; p.y += vy + 110 * dt * dt;
          if (pointer.active) {
            let dx = p.x - pointer.x, dy = p.y - pointer.y, d = Math.hypot(dx, dy);
            if (d < 36 && d > .01) {
              const push = (36 - d) / d * Math.min(1, dt * 18);
              p.x += dx * push; p.y += dy * push;
            }
          }
        }
        for (let pass = 0; pass < 4; pass++) {
          ps[0].x = r.a.x; ps[0].y = r.a.y; ps[12].x = r.b.x; ps[12].y = r.b.y;
          for (let i = 0; i < 12; i++) {
            const a = ps[i], b = ps[i + 1], dx = b.x - a.x, dy = b.y - a.y;
            const length = Math.hypot(dx, dy) || .001, error = (length - r.rest) / length;
            const wa = i === 0 ? 0 : i === 11 ? 1 : .5;
            const wb = i === 11 ? 0 : i === 0 ? 1 : .5;
            a.x += dx * error * wa; a.y += dy * error * wa;
            b.x -= dx * error * wb; b.y -= dy * error * wb;
          }
        }
        ps[0].x = r.a.x; ps[0].y = r.a.y; ps[12].x = r.b.x; ps[12].y = r.b.y;
        for (let i = r.drops.length - 1; i >= 0; i--) {
          const d = r.drops[i];
          if (!d.sliding) continue;
          const p = this.onRope(r, d.u), slope = p.dy / Math.max(2, Math.hypot(p.dx, p.dy));
          d.du = (d.du + slope * 9 * dt) * .95; d.u += d.du * dt / Math.max(1, r.length / 40);
          if (d.u < .015 || d.u > .985 || Math.abs(slope) > .82 && Math.random() < dt * .8 || d.r > 4.8 && Math.random() < dt * .12) {
            this.fallDrop(r, d); r.drops.splice(i, 1);
          }
        }
      }
      for (let i = this.falling.length - 1; i >= 0; i--) {
        const d = this.falling[i], oldY = d.y;
        d.vy += 1100 * dt; d.x += d.vx * dt; d.y += d.vy * dt;
        if (!d.noSplat && d.y - d.sy > 10) {
          let hitY = null;
          for (let y = Math.max(oldY, d.sy + 10); y <= d.y; y += 3) {
            if (this.hitMask(d.x, y)) { hitY = y; break; }
          }
          if (hitY !== null) {
            this.splats.push({ x: d.x, y: hitY, r: d.r, phase: Math.random() * TAU });
            if (this.splats.length > 400) this.splats.shift();
            this.falling.splice(i, 1); continue;
          }
        }
        if (d.y > this.h + 40 || d.x < -60 || d.x > this.w + 60) this.falling.splice(i, 1);
      }
      if (this.falling.length > 800) this.falling.splice(0, this.falling.length - 800);
    }

    hitMask(x, y) {
      x = Math.round(x); y = Math.round(y);
      return this.maskPixels && x >= 0 && y >= 0 && x < this.w && y < this.h && this.maskPixels[(y * this.w + x) * 4 + 3] > 140;
    }

    fallDrop(rope, drop) {
      const p = this.onRope(rope, drop.u);
      this.falling.push({ x: p.x, y: p.y, sy: p.y, vx: (Math.random() - .5) * 30, vy: 5 + Math.random() * 25, r: drop.r });
    }

    vibrate(x, y, radius, strength) {
      const origin = { x, y };
      for (const rope of this.ropes) {
        let shaken = false;
        const nearEnd = Math.min(distance(rope.a, origin), distance(rope.b, origin)) < radius;
        for (let i = 1; i < 12; i++) {
          const p = rope.points[i], d = Math.hypot(p.x - x, p.y - y);
          const force = d < radius ? strength * (1 - d / radius) : nearEnd ? strength * .16 * Math.sin(Math.PI * i / 12) : 0;
          if (force) { p.px += (Math.random() - .5) * force * 2; p.py += (Math.random() - .5) * force * 2; shaken = true; }
        }
        if (shaken) for (const drop of rope.drops) if (Math.random() < .35) drop.sliding = true;
      }
    }

    clear(x, y) {
      const sx = Number.isFinite(x) ? x : this.live?.b.x ?? this.w / 2;
      const sy = Number.isFinite(y) ? y : this.live?.b.y ?? this.h / 2;
      this.vibrate(sx, sy, Math.max(this.w, this.h), 12);
      for (const rope of this.ropes) {
        for (const drop of rope.drops) this.fallDrop(rope, drop);
        rope.drops.length = 0; rope.live = false; rope.dead = true;
      }
      for (const s of this.splats) this.falling.push({ ...s, sy: s.y, vx: (Math.random() - .5) * 35, vy: 40, noSplat: true });
      this.splats.length = 0; this.knots.length = 0;
      const fresh = this.lastSpinneret || { x: sx, y: sy };
      this.live = null; this.lastAnchor = { ...fresh }; this.lastAttachSpinneret = { ...fresh };
      this.lastAttach = this.time; this.cooldown = .45;
    }

    trace(ctx, points) {
      ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    }

    opacity(r, time) { return r.fade * (1 - .5 * clamp((time - r.born) / 90, 0, 1)); }

    drawShadows(ctx, time) {
      const s = this.shadowCtx, d = this.dpr;
      s.setTransform(1, 0, 0, 1, 0, 0); s.clearRect(0, 0, this.shadow.width, this.shadow.height);
      s.setTransform(d, 0, 0, d, 0, 0); s.globalCompositeOperation = 'source-over';
      s.lineCap = 'round'; s.strokeStyle = 'rgba(8,14,70,.42)'; s.fillStyle = 'rgba(8,14,70,.42)';
      s.shadowColor = 'rgba(8,14,70,.42)'; s.shadowBlur = 3.5 * d;
      s.save(); s.translate(7, 11);
      for (const rope of this.ropes) {
        s.globalAlpha = this.opacity(rope, time); s.lineWidth = rope.thick;
        this.trace(s, rope.points); s.stroke();
        for (const drop of rope.drops) {
          const p = this.onRope(rope, drop.u); s.beginPath(); s.arc(p.x, p.y, drop.r * .85, 0, TAU); s.fill();
        }
      }
      s.globalAlpha = 1;
      for (const drop of this.falling) { s.beginPath(); s.arc(drop.x, drop.y, drop.r * .7, 0, TAU); s.fill(); }
      s.restore(); s.globalAlpha = 1; s.shadowBlur = 0;
      s.globalCompositeOperation = 'destination-in'; s.drawImage(this.mask, 0, 0, this.w, this.h);
      s.globalCompositeOperation = 'source-over';
      ctx.drawImage(this.shadow, 0, 0, this.w, this.h);
    }

    drawThread(ctx, r, time, hairStride) {
      const alpha = this.opacity(r, time), ps = r.points, thick = r.thick;
      if (alpha <= 0 || r.length < .5) return;
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.globalAlpha = alpha * .06; ctx.strokeStyle = '#fff'; ctx.lineWidth = thick * 4;
      this.trace(ctx, ps); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = ps[i], b = ps[i + 1], angle = Math.atan2(b.y - a.y, b.x - a.x);
        ctx.globalAlpha = alpha * .8; ctx.strokeStyle = this.palette.strand;
        ctx.lineWidth = thick * (.9 - .35 * Math.sin(Math.PI * i / 12));
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        const p = .5 + .5 * Math.sin(2 * angle + .3 * time + r.phase);
        ctx.globalAlpha = alpha * (.12 + .3 * p ** 3); ctx.strokeStyle = `hsl(${190 + 150 * p},100%,74%)`;
        ctx.lineWidth = thick * .65; ctx.stroke();
      }
      ctx.globalAlpha = alpha * .38; ctx.strokeStyle = this.palette.strand; ctx.lineWidth = .45;
      for (const side of [-1.1, .9]) {
        ctx.beginPath();
        for (let i = 0; i <= 36; i++) {
          const u = i / 36, p = this.onRope(r, u), len = Math.hypot(p.dx, p.dy) || 1;
          const wave = Math.sin(u * r.length * .16 + r.phase) * .48 + side;
          const x = p.x - p.dy / len * wave * thick, y = p.y + p.dx / len * wave * thick;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = alpha * .55; ctx.lineWidth = .35; ctx.strokeStyle = this.palette.fibre;
      ctx.beginPath();
      for (let i = 0; i < r.hair.length; i += hairStride) {
        const h = r.hair[i], p = this.onRope(r, h.u), len = Math.hypot(p.dx, p.dy) || 1;
        const nx = -p.dy / len * h.side, ny = p.dx / len * h.side;
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + (nx * h.len + p.dx / len * h.skew) * thick, p.y + (ny * h.len + p.dy / len * h.skew) * thick);
      }
      ctx.stroke();
      for (const fluff of r.fluff) {
        const p = this.onRope(r, fluff.u);
        ctx.globalAlpha = alpha * .65;
        if (fluff.dust) {
          ctx.fillStyle = '#8a7a6a';
          for (let i = 0; i < 5; i++) {
            ctx.beginPath(); ctx.arc(p.x + Math.sin(fluff.seed + i * 3.3) * 2.4, p.y + Math.cos(fluff.seed + i * 5.1) * 2, .35 + (i % 3) * .22, 0, TAU); ctx.fill();
          }
        } else {
          ctx.strokeStyle = 'rgba(240,232,220,.7)'; ctx.lineWidth = .4; ctx.beginPath();
          for (let i = 0; i < 10; i++) {
            const a = fluff.seed + i * 2.4, l = 2 + (i % 4) * .8;
            ctx.moveTo(p.x, p.y); ctx.quadraticCurveTo(p.x + Math.sin(a + .7) * l, p.y + Math.cos(a + .7) * l, p.x + Math.sin(a) * l, p.y + Math.cos(a) * l);
          }
          ctx.stroke();
        }
      }
      const glint = (time * .6 + r.phase) % 1;
      const a = this.onRope(r, Math.max(0, glint - .018)), b = this.onRope(r, Math.min(1, glint + .018));
      ctx.globalAlpha = alpha * .8; ctx.strokeStyle = '#fff'; ctx.lineWidth = thick * 1.6;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = alpha;
      for (const drop of r.drops) {
        const p = this.onRope(r, drop.u), size = drop.r * 2.25;
        ctx.drawImage(this.bead, p.x - size / 2, p.y - size / 2, size, size);
      }
    }

    draw(ctx, time = this.time) {
      ctx.save();
      this.drawShadows(ctx, time);
      const hairTotal = this.ropes.reduce((n, r) => n + r.hair.length, 0);
      const hairStride = Math.max(1, Math.ceil(hairTotal / (this.touch ? 7000 : 18000)));
      for (const rope of this.ropes) this.drawThread(ctx, rope, time, hairStride);
      ctx.globalAlpha = .55; ctx.strokeStyle = this.palette.knot; ctx.lineWidth = .35;
      ctx.beginPath();
      for (const knot of this.knots) {
        for (let i = 0; i < 30; i++) {
          const a = i * 2.39996 + knot.phase, length = 1.5 + (i * 13 % 17) * .22;
          ctx.moveTo(knot.x, knot.y); ctx.lineTo(knot.x + Math.cos(a) * length, knot.y + Math.sin(a) * length);
        }
      }
      ctx.stroke(); ctx.globalAlpha = .85;
      for (const knot of this.knots) ctx.drawImage(this.bead, knot.x - 3, knot.y - 3, 6, 6);
      ctx.globalAlpha = 1;
      for (const splat of this.splats) {
        ctx.save(); ctx.translate(splat.x, splat.y); ctx.scale(1.2, .52);
        ctx.shadowColor = 'rgba(8,14,70,.28)'; ctx.shadowBlur = 2; ctx.shadowOffsetX = 1; ctx.shadowOffsetY = 2;
        ctx.drawImage(this.bead, -splat.r, -splat.r, splat.r * 2, splat.r * 2); ctx.restore();
      }
      for (const drop of this.falling) {
        const stretch = 1 + Math.min(.65, drop.vy / 1400);
        ctx.drawImage(this.bead, drop.x - drop.r, drop.y - drop.r * stretch, drop.r * 2, drop.r * 2 * stretch);
      }
      ctx.restore();
    }

    get stats() {
      return { ropes: this.ropes.filter(r => !r.dead).length, drops: this.falling.length + this.splats.length + this.ropes.reduce((n, r) => n + r.drops.length, 0), anchors: this.anchors.length };
    }
  }
  window.FoundSilk = FoundSilk;
})();
