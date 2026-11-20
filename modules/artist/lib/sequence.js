/* Scroll-scrubbed hero clip as a frame sequence on <canvas>.

   Why not <video>: the title is white + mix-blend-mode:difference, and WebKit will
   not blend against a <video> layer (design-dna P13, hit on new-4 and new-5). A 2D
   canvas is an ordinary layer. The source clip (121 frames,
   24 fps) is sampled into responsive WebP stills for the site preview.

   - frame 0 loads first → `ready` (the hero intro waits on it: it is the poster);
     it is retried up to 3× — a missing poster left the canvas blank;
   - the rest wait for loadRest() (main.js: the intro has played, the first input,
     or 2.5s) — loading and decoding 120 big frames DURING the intro made Safari
     stutter; then FRAME_CONCURRENCY at a time (lib/media.js), coarse to fine (every 8th, then 4th, 2nd, all), so
     an early scroll already lands near the right picture; a failed frame is
     retried twice (300 / 900ms);
   - decode() runs one frame at a time, and seek() warms the frames just ahead of
     the playhead: Safari evicts decoded 1920px frames (121 × 8MB) and would
     otherwise decode them synchronously, mid-scrub, on the main thread;
   - seek(p) → index round(p·(n−1)); the nearest LOADED frame is drawn, and only
     when the drawn frame or the canvas size changes;
   - drawn like object-fit:cover + object-position:50% 0 (the hair stays on the top
     edge), DPR capped at 2; a ResizeObserver resizes the backing store. */
import { isMobile } from './gsap.js';
import { frameUrl, FRAME_COUNT, FRAME_CONCURRENCY } from './media.js';

const N = FRAME_COUNT;
const RETRY = [300, 900];            /* ms before each retry of a failed frame */
const AHEAD = 6;                     /* frames warmed ahead of the playhead */

function loadOrder(n) {
  const order = [], seen = new Set();
  for (const step of [8, 4, 2, 1]) {
    for (let i = 0; i < n; i += step) if (!seen.has(i)) { seen.add(i); order.push(i); }
  }
  if (!seen.has(n - 1)) order.push(n - 1);
  return order;
}

export function initSequence(canvas = document.querySelector('[data-seq]')) {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { alpha: false });
  const set = isMobile() ? 'm' : 'd';
  const frames = new Array(N).fill(null);
  const state = { index: 0, drawn: -1, loaded: 0, total: N, set };
  let size = { w: 0, h: 0 };

  /* decoding, one frame at a time: decode() only warms a frame — its promise can
     hang in a throttled / hidden tab, so each wait is capped and nothing gates on it */
  const queue = [], queued = new Set();
  let decoding = false;
  async function pump() {
    if (decoding) return;
    decoding = true;
    while (queue.length) {
      const i = queue.shift();
      queued.delete(i);
      const img = frames[i];
      if (img?.decode) await Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
    }
    decoding = false;
  }
  function warm(i) {
    if (!frames[i] || queued.has(i)) return;
    queued.add(i);
    queue.push(i);
    while (queue.length > 2 * AHEAD) queued.delete(queue.shift());   /* a fast scrub: drop the stale ones */
    pump();
  }

  /* a frame counts on `load`; a failed one is retried after each RETRY delay */
  const waiters = new Map();   /* i → [resolve] for whenLoaded(i) */
  const load = (i, retries = RETRY) => new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      frames[i] = img; state.loaded++;
      (waiters.get(i) || []).forEach((fn) => fn(img)); waiters.delete(i);
      resolve(img);
    };
    img.onerror = () => {
      if (!retries.length) return resolve(null);
      setTimeout(() => load(i, retries.slice(1)).then(resolve), retries[0]);
    };
    img.src = frameUrl(set, i);
  });
  /* another module's hook into a frame (faces.js builds its haze from the last one) */
  const whenLoaded = (i) => frames[i] ? Promise.resolve(frames[i])
    : new Promise((resolve) => waiters.set(i, [...(waiters.get(i) || []), resolve]));

  /* nearest loaded frame to the target, searching outwards */
  function nearest(i) {
    if (frames[i]) return i;
    for (let d = 1; d < N; d++) {
      if (i - d >= 0 && frames[i - d]) return i - d;
      if (i + d < N && frames[i + d]) return i + d;
    }
    return -1;
  }

  function draw(force = false) {
    const k = nearest(state.index);
    if (k < 0 || (!force && k === state.drawn)) return;
    const img = frames[k];
    const { width: cw, height: ch } = canvas;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s, h = img.naturalHeight * s;
    ctx.drawImage(img, (cw - w) / 2, 0, w, h);   /* cover, anchored to the top */
    state.drawn = k;
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (!w || !h || (w === size.w && h === size.h)) return;
    size = { w, h };
    canvas.width = w; canvas.height = h;
    draw(true);
  }
  new ResizeObserver(resize).observe(canvas);

  const ready = load(0, [300, 900, 2000]).then(() => { resize(); draw(true); warm(0); });

  /* the rest, on demand: a small pool walking the coarse-to-fine order; every
     landed frame redraws if it is now the nearest one to the current target */
  let resting = false;
  function loadRest() {
    if (resting) return;
    resting = true;
    ready.then(() => {
      const order = loadOrder(N).filter((i) => i !== 0);
      const worker = async () => {
        while (order.length) {
          const i = order.shift();
          await load(i);
          if (nearest(state.index) !== state.drawn) draw();
        }
      };
      for (let c = 0; c < FRAME_CONCURRENCY; c++) worker();
    });
  }

  const seek = (p01) => {
    const i = Math.round(Math.min(1, Math.max(0, p01)) * (N - 1));
    if (i === state.index) return;
    const dir = Math.sign(i - state.index) || 1;
    state.index = i;
    draw();
    for (let k = 1; k <= AHEAD; k++) warm(i + dir * k);   /* the frames the scrub reaches next */
  };

  return { canvas, ready, seek, state, whenLoaded, loadRest, last: N - 1 };
}
