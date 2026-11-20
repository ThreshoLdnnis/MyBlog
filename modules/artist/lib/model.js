/* The model card · 猪肥羊 — Eva, opened from her cards in the row (DESIGN.md §6).

   Open — only once the row has landed (faces.state.captioned):
     0     photo        FLIP: the first frame starts as the clicked card and grows
                        into place, transform only                       1.0s inOut
     0     the rest     the other row cards drift apart — left of the click to
                        the left, right of it to the right (±.6W)       .9s inOut,
                        their images fade .6s from .15; all captions out .2s
     0     panel        appears as the row's first card (clip to the card's height),
                        then stretches to full height                   .3s fade · .9s inOut from .1
     .3    plate        opacity 0 → 1 — covers the bar and the widget  .6s ease-out
     .55   name · age · (age, corner)  --in: rise .15em + blur 12px (the hero title)  1.1s expoOut, .08 apart
     .7    label · bio lines · stat rows: rise 16px + blur 6px           .8s expoOut, .04 apart
     .9    buttons      the hero widget's entrance (y 56, scale .96)    .85s outExpo, .07 apart
     .9    close        opacity + scale .9 → 1 (never from 0)            .5s expoOut
   Close — the cross or Esc. Shorter than the way in, and not a reverse (Emil):
     the content leaves at once (.2s); the plate goes first (.35s) so the row is
     seen coming back; the panel folds back to the card (.5s inOut) and fades; the
     photo flies back into its card if it is still on screen (.7s inOut), else it
     dissolves; the other cards slide home (.7s inOut) and their captions return.
   While open the page holds still (Lenis stopped), main + the bar are inert and
   focus lives in the dialog; closing hands it back to the card.
   Reduced motion: a .2s crossfade, nothing moves. */
import { gsap, ScrollTrigger, SplitText, reduced, isMobile } from './gsap.js';
import { getScroll } from './scroll.js';

export function initModel({ root = document.querySelector('[data-model]'), faces = null } = {}) {
  if (!root) return null;
  const plate = root.querySelector('.model__plate');
  const panel = root.querySelector('[data-model-panel]');
  const frames = root.querySelector('.model__frames');
  const headLines = [...root.querySelectorAll('.model__name .line, .model__num .line')];
  const label = root.querySelector('.model__label');
  const rows = [...root.querySelectorAll('.model__specs > div')];
  const bio = root.querySelector('[data-model-bio]');
  const buttons = [...root.querySelectorAll('[data-model-btn]')];
  const closeBtn = root.querySelector('[data-model-close]');
  const scroller = root.querySelector('[data-model-scroll]');
  const outside = [document.querySelector('main'), document.querySelector('[data-header]')].filter(Boolean);
  const state = { open: false, card: null };
  let tl = null, split = null, bioLines = [];

  const anim = (on) => root.classList.toggle('is-anim', on);
  const lead = () => frames.querySelector('.model__frame:not(.is-clone)');   /* the clicked frame, first of the real set */
  const otherFrames = () => [...frames.querySelectorAll('.model__frame')].filter((f) => f !== lead());
  const content = () => [...headLines, label, ...bioLines, ...rows, ...buttons, closeBtn];
  /* the row around the clicked card */
  const rest = (card) => [...card.parentElement.querySelectorAll('.face-card')].filter((c) => c !== card);
  const parts = (cards, sel) => cards.map((c) => c.querySelector(sel));
  const centreX = (el) => { const r = el.getBoundingClientRect(); return r.left + r.width / 2; };

  /* the panel is a row card stretched to full height: its width is the row's */
  function writePanelWidth() {
    const cw = faces?.geo?.().cw;
    if (cw) root.style.setProperty('--pw', cw.toFixed(1) + 'px');
  }
  ScrollTrigger.addEventListener('refresh', () => { if (state.open) writePanelWidth(); });

  /* the transform (origin 0 0) that lays `el` exactly over `rect`, measured
     from its untransformed box — safe mid-tween */
  function flipTo(el, rect) {
    const cur = { x: gsap.getProperty(el, 'x'), y: gsap.getProperty(el, 'y'), scale: gsap.getProperty(el, 'scaleX') };
    gsap.set(el, { x: 0, y: 0, scale: 1 });
    const r = el.getBoundingClientRect();
    gsap.set(el, cur);
    return { x: rect.left - r.left, y: rect.top - r.top, scale: rect.width / r.width };
  }

  /* the rest of the row drifts apart — left of the click to the left, right of
     it to the right. One number, written as each card's `translate` by hand (no
     CSS variable to parse back), so the way home is exact. */
  const drift = { p: 0, cards: [], dx: [] };
  const writeDrift = () => drift.cards.forEach((c, i) => { c.style.translate = `${(drift.dx[i] * drift.p).toFixed(1)}px 0px`; });
  const clearDrift = () => { drift.cards.forEach((c) => c.style.removeProperty('translate')); drift.p = 0; };

  /* the panel's clip, written by hand: the browser shortens inset(a 0 a 0) to two
     values and a tweened string then loses the bottom one — so tween a number */
  const clip = { cut: 0 };
  const writeClip = () => { panel.style.clipPath = `inset(${clip.cut.toFixed(1)}px 0px ${clip.cut.toFixed(1)}px 0px)`; };
  /* how far it eats in from top and bottom to be one row card tall */
  function cardCut() {
    const ch = faces?.geo?.().ch;
    return ch ? Math.max(0, (panel.getBoundingClientRect().height - ch) / 2) : 0;
  }

  function open(card) {
    if (state.open || !card) return;
    state.open = true;
    state.card = card;
    const img = card.querySelector('img');
    const src = img.getAttribute('src');
    loopSet(src);

    writePanelWidth();
    getScroll()?.stop();
    outside.forEach((el) => { el.inert = true; });
    tl?.kill();
    gsap.set(root, { clearProps: 'opacity,visibility' });
    root.hidden = false;
    pos = target = 0;
    place();
    split?.revert();
    split = new SplitText(bio, { type: 'lines', linesClass: 'model__ln' });
    bioLines = split.lines;
    scroller.focus({ preventScroll: true });       /* arrows turn the frames; Tab reaches the panel and the close */

    if (reduced) {
      tl = gsap.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, ease: 'power1.out' });
      return;
    }

    const frame = lead();
    const from = img.getBoundingClientRect();
    const others = rest(card);
    const c0 = centreX(card), push = innerWidth * 0.6;
    img.style.visibility = 'hidden';                /* the photo IS the card now */
    gsap.set(frame, { transformOrigin: '0 0' });
    anim(true);
    tl = gsap.timeline({
      onComplete: () => {
        anim(false);
        gsap.set([frame, plate, panel], { clearProps: 'transform,opacity,visibility,clipPath' });
        gsap.set([...buttons, closeBtn], { clearProps: 'transform,opacity,visibility' });
      },
    });
    tl.fromTo(frame, flipTo(frame, from), { x: 0, y: 0, scale: 1, duration: 1, ease: 'inOut' }, 0);
    drift.cards = others;
    drift.dx = others.map((el) => (centreX(el) < c0 ? -push : push));   /* mid-close reopen: they are still on their side */
    tl.to(drift, { p: 1, duration: 0.9, ease: 'inOut', onUpdate: writeDrift }, 0);
    tl.to(parts(others, 'img'), { opacity: 0, duration: 0.6, ease: 'power2.out' }, 0.15);
    tl.to(parts([card, ...others], '.face-card__cap'), { opacity: 0, duration: 0.2, ease: 'power2.out' }, 0);
    tl.fromTo(plate, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' }, 0.3);
    if (isMobile()) {
      tl.fromTo(panel, { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expoOut' }, 0.2);
    } else {
      clip.cut = cardCut();
      writeClip();
      tl.fromTo(panel, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power2.out' }, 0);
      tl.to(clip, { cut: 0, duration: 0.9, ease: 'inOut', onUpdate: writeClip }, 0.1);
    }
    tl.fromTo(headLines, { '--in': 0 }, { '--in': 1, duration: 1.1, ease: 'expoOut', stagger: 0.08 }, 0.55);
    tl.fromTo([label, ...bioLines, ...rows], { '--in': 0 },
              { '--in': 1, duration: 0.8, ease: 'expoOut', stagger: 0.04 }, 0.7);
    tl.fromTo(buttons, { y: 56, scale: 0.96, autoAlpha: 0, transformOrigin: '0% 100%' },
              { y: 0, scale: 1, autoAlpha: 1, duration: 0.85, ease: 'outExpo', stagger: 0.07 }, 0.9);
    tl.fromTo(closeBtn, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'expoOut' }, 0.9);
  }

  function close() {
    if (!state.open) return;
    state.open = false;
    const card = state.card;
    const img = card.querySelector('img');
    const frame = lead();
    const others = rest(card);
    const caps = parts([card, ...others], '.face-card__cap');
    tl?.kill();
    target = pos;                                    /* the strip stops where it is */
    anim(false);

    const done = () => {
      root.hidden = true;
      img.style.visibility = '';
      gsap.set([root, plate, panel, frames, ...frames.children, ...content()], { clearProps: 'all' });
      clearDrift();
      gsap.set([...parts(others, 'img'), ...caps], { clearProps: 'opacity' });
      clip.cut = 0;
      outside.forEach((el) => { el.inert = false; });
      getScroll()?.start();
      card.focus({ preventScroll: true });
      tl = null;
    };

    if (reduced) {
      tl = gsap.to(root, { autoAlpha: 0, duration: 0.2, ease: 'power1.out', onComplete: done });
      return;
    }

    const fr = frame.getBoundingClientRect();
    const onScreen = fr.bottom > innerHeight * 0.5 && fr.top < innerHeight * 0.5;
    tl = gsap.timeline({ onComplete: done });
    tl.to(content(), { autoAlpha: 0, duration: 0.2, ease: 'power2.out' }, 0);
    tl.to(otherFrames(), { autoAlpha: 0, duration: 0.2, ease: 'power2.out' }, 0);
    tl.to(plate, { opacity: 0, duration: 0.35, ease: 'power2.out' }, 0);
    tl.to(drift, { p: 0, duration: 0.7, ease: 'inOut', onUpdate: writeDrift }, 0);
    tl.to(parts(others, 'img'), { opacity: 1, duration: 0.5, ease: 'power2.out' }, 0.1);
    tl.to(caps, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.5);
    if (isMobile()) {
      tl.to(panel, { autoAlpha: 0, y: 24, duration: 0.3, ease: 'power2.out' }, 0);
    } else {
      tl.to(clip, { cut: cardCut(), duration: 0.5, ease: 'inOut', onUpdate: writeClip }, 0.05);   /* from wherever it is — mid-open too */
      tl.to(panel, { autoAlpha: 0, duration: 0.2, ease: 'power2.out' }, 0.4);
    }
    if (onScreen) {
      gsap.set(frame, { transformOrigin: '0 0' });
      tl.to(frame, { ...flipTo(frame, img.getBoundingClientRect()), duration: 0.7, ease: 'inOut' }, 0);
    } else {
      img.style.visibility = '';                    /* the card comes back with the row */
      tl.to(frame, { autoAlpha: 0, duration: 0.3, ease: 'power2.out' }, 0);
    }
  }

  /* the strip (desktop): a plain smooth scroll, endless DOWNWARDS only — no
     snapping (the user, 2026-10-14: «просто плавный скролл, фиксировать не
     нужно»; «обратно — возвращаемся на первую фотографию»). The wheel moves a
     target, never above 0 — the first photo is the top stop; the strip follows
     it with a lerp and the page's own wheel factor (Lenis: lerp .07 · .85), so it
     glides with a little inertia. A copy of the set follows the real one and the
     position wraps by one set height — the seam never shows. Keys move one
     frame. A panel that overflows (low windows) keeps its own wheel. Mobile:
     native scroll, one column, no copy. */
  const GAP = 16, LERP = 0.07, MULT = 0.85;
  let pos = 0, target = 0;
  const real = () => [...frames.querySelectorAll('.model__frame:not(.is-clone)')];
  /* the clicked frame first, then the real set copied below it */
  function loopSet(src) {
    frames.querySelectorAll('.is-clone').forEach((c) => c.remove());
    const set = real();
    const match = set.find((f) => f.getAttribute('src') === src);
    if (match && match !== set[0]) frames.prepend(match);
    const copy = () => real().map((f) => {
      const c = f.cloneNode(true);
      c.classList.add('is-clone');
      c.alt = '';
      c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('loading');
      return c;
    });
    frames.append(...copy());
  }
  /* one set's height, and the scrollTop that puts the real set's first frame on the gutter */
  const setH = () => { const r = real(); return r.length * (r[0].offsetHeight + GAP); };
  const origin = () => lead().offsetTop - GAP;
  const wrap = (v, m) => ((v % m) + m) % m;
  function place() {
    if (isMobile()) { scroller.scrollTop = 0; return; }
    scroller.scrollTop = origin() + wrap(pos, setH());
  }
  gsap.ticker.add((time, dt) => {
    if (!state.open || isMobile() || Math.abs(target - pos) < 0.1) return;
    pos += (target - pos) * (1 - Math.pow(1 - LERP, dt / 16.667));
    if (Math.abs(target - pos) < 0.1) pos = target;
    place();
  });
  root.addEventListener('wheel', (e) => {
    if (!state.open || isMobile()) return;
    if (panel.contains(e.target) && panel.scrollHeight > panel.clientHeight + 1) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    target = Math.max(0, target + e.deltaY * unit * MULT);
  }, { passive: false });
  root.addEventListener('keydown', (e) => {
    if (!state.open || isMobile()) return;
    const onControl = e.target.closest('a, button');
    const step = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 }[e.key];
    if (step && !(e.key === ' ' && onControl)) {
      e.preventDefault();
      target = Math.max(0, target + step * (lead().offsetHeight + GAP));
    }
  });

  /* triggers: Eva's cards, only once the row stands */
  document.querySelectorAll('[data-model-open]').forEach((card) => {
    const go = () => { if (faces?.state?.captioned) open(card); };
    card.addEventListener('click', go);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });
  closeBtn.addEventListener('click', close);
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.open) close(); });

  /* the shortlist: one model, so the count in the bar is 0 or 1 */
  const shortlistBtn = root.querySelector('[data-shortlist]');
  const shortlistLink = document.querySelector('[data-header] a[href="#shortlist"]');
  shortlistBtn?.addEventListener('click', () => {
    const on = shortlistBtn.getAttribute('aria-pressed') !== 'true';
    shortlistBtn.setAttribute('aria-pressed', String(on));
    shortlistBtn.textContent = on ? '已加入候选名单' : '加入候选名单';
    if (shortlistLink) shortlistLink.textContent = `候选名单 (${on ? 1 : 0})`;
  });

  return { root, state, open, close, get timeline() { return tl; } };
}
