/* Section 2 · faces. Driven by one number: pH = how far past the end of the
   clip we are, in viewport heights (main.js). Windows live in lib/beats.js.

     blur        the footage canvas blurs (CSS, ≤16px, gated) while the light grey
                 PLATE (with its own grain) fades in over it — the footage
                 dissolves into flat light grey. (The dark blurred-frame haze this
                 replaced lives in ../new-16-backup-2026-10-14-dark-haze.)
     zoom        the footage scales 1 → 1.4 from the centre as it goes (power2.inOut)
     ring        paypath's ring, measured: a TRUE circle, 8 cards 45° apart, each
                 square and tangent (rotation = angle + 90°), the whole ring grown
                 as one (×0.5 → ×1, linear) — radius and card size together, until
                 the circle runs off the screen. It spins steadily in time only.
     words       the statement, word by word (lib/words.js)
     fold        the spin has died; slot = rank by x. All eight on ONE clock: the
                 cards first spread sideways into their columns (turning upright),
                 then the columns close into the line — a dealer laying out a row,
                 no path crossing another. On the way each square opens to 3:4.
     strip       the row travels left 1:1 with the scroll
     captions    once the row has landed: name | (age) under each card, in one
                 by one, left to right (CSS transitions keyed off --slot)

   Cards are laid out at their ROW size (3:4); on the ring they are clipped to a
   square and scaled down, so the fold is transform + clip only and the row is
   sharp. Transforms are written straight onto each card (Emil). */
import { gsap, reduced, isMobile } from './gsap.js';
import { beats } from './beats.js';
import { setVar, setClass, segT, smoothstep } from './vars.js';

const N = 8;
const GUTTER = 16, GAP = 16;
const SPIN = 4;                                   /* deg / s, steady */
const RING_R = 0.60, RING_SIDE = 0.146;           /* of B at full growth — paypath: 574 / 140 px at H 956 */
const G0 = 0.5;                                   /* the ring starts at half size */
/* every set of disjoint neighbour swaps over a row of N (34 for 8) — rowOrder */
const SWAPS = (function all(j, cur, out) {
  if (j >= N - 1) { out.push(cur); return out; }
  all(j + 1, cur, out);
  return all(j + 2, [...cur, j], out);
})(0, [], []);
const easeZoom = gsap.parseEase('power2.inOut');
const easeFold = gsap.parseEase('inOut');
const mix = (a, b, t) => a + (b - a) * t;
const rad = (d) => d * Math.PI / 180;

export function initFaces({ stage = document.querySelector('.hero__stage'), seq, words } = {}) {
  const media = stage?.querySelector('[data-hero-media]');
  const plate = stage?.querySelector('[data-haze]');
  const ring = stage?.querySelector('[data-ring]');
  const cards = ring ? [...ring.querySelectorAll('.face-card')] : [];
  if (!media || !plate || !ring || cards.length !== N) return null;
  /* the clip lives on the image, not the card, so the caption under it shows */
  const imgs = cards.map((el) => el.querySelector('img'));
  const person = cards.map((el) => el.dataset.person || '');

  const state = { pH: 0, blur: 0, zoom: 1, grow: 0, fold: 0, strip: 0, words: 0, out: 0, spin: 0, spinSpeed: SPIN, slots: [], travel: 0, captioned: false };
  const geo = {};
  let slots = cards.map((_, i) => i);
  let unwrap = new Array(N).fill(0);   /* each card's whole turns at fold start, so its angle unwinds the short way */
  const live = cards.map(() => ({ x: 0, y: 0, r: 0, s: 1, o: 0, clip: 0 }));
  const focus = cards.map((el) => Math.min(1, Math.max(0, parseFloat(el.dataset.focus ?? '0.5'))));

  /* ── geometry: everything from the viewport, re-run on refreshInit ── */
  function measure() {
    const W = document.documentElement.clientWidth, H = window.innerHeight;
    const mobile = isMobile();
    let cw = mobile ? W * 0.72 : (W - 2 * GUTTER - 3 * GAP) / 4;
    let ch = cw * 4 / 3;
    const maxH = H * (mobile ? 0.56 : 0.62);
    if (ch > maxH) { ch = maxH; cw = ch * 3 / 4; }
    const B = Math.min(H, W * 1.25);              /* the ring's base: H on desktop; a phone keeps the circle on screen */
    Object.assign(geo, {
      W, H, B, cx: W / 2, cy: H / 2, cw, ch,
      R1: RING_R * B, side1: RING_SIDE * B,
      clip0: (ch - cw) / 2,                       /* top/bottom inset that makes the 3:4 card a square */
      rowY: H / 2,
      slot: (j) => GUTTER + j * (cw + GAP) + cw / 2,
    });
    const rowW = N * cw + (N - 1) * GAP;
    state.travel = Math.max(0, rowW - (W - 2 * GUTTER));
    ring.style.setProperty('--card-w', cw.toFixed(1) + 'px');
    ring.style.setProperty('--card-h', ch.toFixed(1) + 'px');
    return { stripH: state.travel / H };
  }

  /* ── a card on the ring: one radius, one size, one rule for all eight ── */
  function ringPose(i, b, pH) {
    const g = mix(G0, 1, segT(pH, b.grow[0], b.grow[1]));
    const theta = i * 45 + state.spin;
    const R = geo.R1 * g;
    return {
      theta,
      x: geo.cx + R * Math.cos(rad(theta)),
      y: geo.cy + R * Math.sin(rad(theta)),
      r: theta + 90,
      s: (geo.side1 * g) / geo.cw,
      o: reduced ? (pH > b.ringAppear[0] ? 1 : 0) : segT(pH, b.ringAppear[0], b.ringAppear[1]),
    };
  }

  /* the row: rank by x, so no two paths cross — yet the ring stops at a TIMED
     angle, and at some angles a face would land next to itself. Rank by x only
     reverses where two ring neighbours lie on opposite arcs, so neighbours in the
     rank may trade places: they pass each other in x while still far apart in y
     (≥ .77R for the ring order in index.html, at every stop angle — a search over
     all orders). Pick the fewest swaps that leave no face twice in a row; on a
     tie, the pair farthest apart in height. */
  function rowOrder(poses) {
    const byX = poses.map((_, i) => i).sort((a, c) => poses[a].x - poses[c].x);
    let best = byX, bestKey = Infinity;
    for (const sw of SWAPS) {
      const o = byX.slice();
      let dy = Infinity;
      for (const j of sw) {
        const a = o[j], c = o[j + 1];
        dy = Math.min(dy, Math.abs(poses[a].y - poses[c].y));
        o[j] = c; o[j + 1] = a;
      }
      if (o.some((ci, k) => k > 0 && person[ci] === person[o[k - 1]])) continue;
      const key = sw.length * 1e6 - dy;
      if (key < bestKey) { bestKey = key; best = o; }
    }
    return best;
  }

  function render() {
    const b = beats(), pH = state.pH;
    /* blur + plate + zoom */
    state.blur = reduced ? (pH > 0 ? 1 : 0) : segT(pH, b.blur[0], b.blur[1]);
    state.zoom = 1 + 0.4 * easeZoom(segT(pH, b.zoom[0], b.zoom[1]));
    setVar(seq.canvas, '--b', state.blur);
    setClass(seq.canvas, 'is-blurring', state.blur > 0 && state.blur < 1);
    setClass(seq.canvas, 'is-covered', state.blur >= 1);
    setVar(media, '--zoom', state.zoom);
    setVar(plate, '--haze', state.blur);
    setClass(plate, 'is-on', state.blur > 0);

    /* words */
    state.words = reduced ? (pH > b.words[0] ? 1 : 0) : segT(pH, b.words[0], b.words[1]);
    state.out = segT(pH, b.textOut[0], b.textOut[1]);
    words?.setP(state.words);
    words?.setOut(state.out);

    /* ring → row → strip */
    state.grow = segT(pH, b.grow[0], b.grow[1]);
    const foldRaw = reduced ? 1 : segT(pH, b.fold[0], b.fold[1]);
    state.fold = foldRaw;
    state.strip = segT(pH, b.fold[1], b.fold[1] + state.travel / geo.H);
    const shift = state.travel * state.strip;
    const poses = cards.map((_, i) => ringPose(i, b, pH));

    if (foldRaw <= 0) {
      /* each card's slot is its rank by x on the still circle — but one face never
         stands twice in a row (rowOrder) */
      rowOrder(poses).forEach((ci, slot) => { slots[ci] = slot; });
      unwrap = poses.map((p) => 360 * Math.round(p.r / 360));
    }
    state.slots = slots.slice();

    /* the fold is a dealer laying out a row, all eight on one clock:
       1. the cards spread sideways into their columns, each keeping its height
          and turning upright — x order never changes (but for rowOrder's swapped
          neighbours, which pass each other far apart in height), so no paths cross;
       2. the columns then close vertically into the line — each card is alone
          in its column by now, so nothing can meet.
       Size and the square → 3:4 opening run across the whole move. */
    const e = reduced ? 1 : easeFold(foldRaw);
    const eX = reduced ? 1 : easeFold(segT(foldRaw, 0, 0.6));
    const eY = reduced ? 1 : easeFold(segT(foldRaw, 0.4, 1));
    let visible = false;
    cards.forEach((el, i) => {
      const p = poses[i], L = live[i];
      L.x = mix(p.x, geo.slot(slots[i]) - shift, eX);
      L.y = mix(p.y, geo.rowY, eY);
      L.r = mix(p.r - unwrap[i], 0, eX);
      L.s = mix(p.s, 1, e);
      L.o = Math.max(p.o, e);
      /* square on the ring, opening to 3:4. The card's data-focus (0 top · .5 centre ·
         1 bottom) decides where the square sits in the portrait — wide-angle shots
         keep the head near the top, a model lying down has it near the bottom. */
      const inset = 2 * geo.clip0 * (1 - e);
      const top = inset * focus[i], bottom = inset - top;
      L.clip = inset / 2;
      /* an off-centre square would ride off the circle: move the card back by the
         square's offset, rotated and scaled with it, so the SQUARE sits on (x, y) */
      const c = ((top - bottom) / 2) * L.s, a = rad(L.r);
      const ox = -c * Math.sin(a), oy = c * Math.cos(a);
      if (L.o > 0) visible = true;
      el.style.transform = `translate3d(${(L.x - ox - geo.cw / 2).toFixed(1)}px, ${(L.y - oy - geo.ch / 2).toFixed(1)}px, 0) rotate(${L.r.toFixed(2)}deg) scale(${L.s.toFixed(4)})`;
      el.style.opacity = L.o.toFixed(3);
      const clip = `inset(${top.toFixed(1)}px 0px ${bottom.toFixed(1)}px)`;
      if (imgs[i].__clip !== clip) { imgs[i].__clip = clip; imgs[i].style.clipPath = clip; }
      /* the visible slots ride over the ones leaving for the right */
      const z = String(16 - slots[i]);
      if (el.style.zIndex !== z) el.style.zIndex = z;
      setVar(el, '--slot', slots[i]);   /* the caption's turn in the row (style.css) */
    });
    setClass(ring, 'is-on', visible);

    /* captions: the row has landed → they come in one by one, left to right
       (CSS transitions, delay by --slot); back out of it → they leave at once.
       is-row arms their blur only near the end of the fold — no filters on the ring. */
    state.captioned = foldRaw >= 0.98;
    setClass(ring, 'is-row', foldRaw >= 0.9);
    setClass(ring, 'is-captioned', state.captioned);
  }

  /* the spin: steady in time while the ring is up; it eases to a standstill over
     the spinStop window, so the fold starts from a still circle */
  let last = 0;
  gsap.ticker.add((time) => {
    const dt = last ? time - last : 0; last = time;
    if (reduced) return;
    const b = beats();
    state.spinSpeed = SPIN * (1 - smoothstep(b.spinStop[0], b.spinStop[1], state.pH));
    if (state.pH <= b.ringAppear[0] || state.spinSpeed <= 0) return;
    /* no modulo: a wrap mid-fold would jump the unwound angle */
    state.spin += dt * state.spinSpeed;
    render();
  });

  return {
    state, cards, measure,
    update(pH) { state.pH = pH; render(); },
    live: () => live.map((L) => ({ x: +L.x.toFixed(1), y: +L.y.toFixed(1), r: +L.r.toFixed(2), s: +L.s.toFixed(4), o: +L.o.toFixed(2), clip: +L.clip.toFixed(1) })),
    geo: () => ({ ...geo, slot: undefined }),
  };
}
