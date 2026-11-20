/* new-16 · Sur(face) · main.js — entry. Order: eases/plugins → scroll (owner of
   Lenis) → header → sequence (frame 0 = the poster) → hero (owns the intro and the
   exit) → faces (section 2) → the model card → beats (runway heights, which need the faces row
   measured) → the two triggers. Every module is a no-op when its markup is absent. */
import { gsap, ScrollTrigger } from './lib/gsap.js';
import { initScroll, getScroll } from './lib/scroll.js';
import { initHeader } from './lib/header.js';
import { initSequence } from './lib/sequence.js';
import { initHero } from './lib/hero.js';
import { initWords } from './lib/words.js';
import { initFaces } from './lib/faces.js';
import { initModel } from './lib/model.js';
import { applyBeats } from './lib/beats.js';

ScrollTrigger.config({ ignoreMobileResize: true });
const scroll = initScroll();
const header = initHeader();
const seq = initSequence();
const hero = initHero({ header, ready: seq?.ready });
const words = initWords();

/* the clip's other 120 frames wait until the page has settled — the intro has
   played, the visitor moves first, or 2.5s pass: loading and decoding them during
   the intro made Safari stutter (lib/sequence.js) */
if (seq) {
  const firstInput = new Promise((r) => ['wheel', 'touchstart', 'keydown', 'pointerdown']
    .forEach((t) => addEventListener(t, r, { once: true, passive: true })));
  Promise.race([hero?.introDone ?? Promise.resolve(), firstInput, new Promise((r) => setTimeout(r, 2500))])
    .then(() => seq.loadRest());
}
const faces = initFaces({ seq, words });
const model = initModel({ faces });   /* Eva's card, opened from the row */

/* runway heights: the hero's from the table, section 2's from the table + the
   row's measured overflow. Re-measured before every refresh (resize). */
const remeasure = () => applyBeats(faces ? faces.measure() : {});
remeasure();
ScrollTrigger.addEventListener('refreshInit', remeasure);

/* the hero runway: progress 0→1 over --run (CSS owns the length — no second table).
   The clip scrubs linearly (it must track the finger); the type leaves at the middle. */
const OUT_AT = 0.5;
const run = { p: 0 };
const trigger = ScrollTrigger.create({
  trigger: '[data-hero]',
  start: 'top top',
  end: 'bottom bottom',
  onUpdate: (self) => {
    run.p = self.progress;
    seq?.seek(self.progress);
    hero?.setOut(self.progress >= OUT_AT);
  },
});

/* section 2: starts where the clip ends (its top meets the viewport bottom exactly
   when the hero runway is done) and hands faces.js its distance in H */
const facesRun = { pH: 0 };
const facesTrigger = faces && ScrollTrigger.create({
  trigger: '[data-faces]',
  start: 'top bottom',
  end: 'bottom bottom',
  onUpdate: (self) => {
    facesRun.pH = (self.progress * (self.end - self.start)) / window.innerHeight;
    faces.update(facesRun.pH);
  },
});
faces?.update(0);

/* dev hook (house convention): drive(y) is synchronous, state() returns numbers —
   the preview pane throttles RAF, so verification reads values back. */
const rect = (el) => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) };
};
const overlap = (a, b) => !!a && !!b && a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const lines = (el) => { const cs = getComputedStyle(el); return +(el.getBoundingClientRect().height / parseFloat(cs.lineHeight)).toFixed(2); };

window.__site = {
  gsap, ScrollTrigger, scroll, header, seq, hero, trigger, faces, facesTrigger, words, model,
  drive: (y) => { getScroll()?.scrollTo(y, { immediate: true, force: true }); ScrollTrigger.update(); },
  runLength: () => trigger.end - trigger.start,
  /* section 2 by its own clock: jump to pH viewport-heights past the end of the clip */
  driveFaces: (pH) => window.__site.drive(facesTrigger.start + pH * window.innerHeight),
  facesState: () => faces && {
    ...Object.fromEntries(Object.entries(faces.state).map(([k, v]) => [k, typeof v === 'number' ? +v.toFixed(3) : v])),
    cards: faces.live(),
    haze: document.querySelector('.faces__haze').classList.contains('is-on'),
    blurring: document.querySelector('[data-seq]').classList.contains('is-blurring'),
    covered: document.querySelector('[data-seq]').classList.contains('is-covered'),
    wordsShown: [...document.querySelectorAll('[data-words] .word')].filter((w) => +getComputedStyle(w).opacity > 0.5).length,
    wordsTotal: document.querySelectorAll('[data-words] .word').length,
    textOpacity: +(+getComputedStyle(document.querySelector('[data-words]')).opacity).toFixed(2),
  },
  state: () => {
    const q = (s) => document.querySelector(s);
    const els = { header: q('[data-header] .header__bar'), title: q('[data-hero-title]'), num: q('[data-hero-num]'),
                  about: q('[data-hero-about]'), widget: q('[data-hero-widget]') };
    const r = Object.fromEntries(Object.entries(els).map(([k, el]) => [k, rect(el)]));
    const names = Object.keys(r);
    const hits = [];
    names.forEach((a, i) => names.slice(i + 1).forEach((b) => { if (overlap(r[a], r[b])) hits.push(`${a}×${b}`); }));
    const ch = q('[data-hero-title] .char');
    return {
      W: innerWidth, H: innerHeight, y: +(window.scrollY).toFixed(1),
      p: +run.p.toFixed(3), out: hero?.state.out,
      seq: seq && { index: seq.state.index, drawn: seq.state.drawn, loaded: seq.state.loaded, total: seq.state.total, set: seq.state.set },
      charOpacity: ch ? +(+getComputedStyle(ch).opacity).toFixed(2) : null,
      lineOpacity: q('[data-hero-about] .line') ? +(+getComputedStyle(q('[data-hero-about] .line')).opacity).toFixed(2) : null,
      fonts: { face: document.documentElement.classList.contains('no-helvetica') ? 'Inter (fallback)' : 'Helvetica Neue (local)',
               fallbackLoaded: document.fonts.check('400 1em "Inter Tight"') && [...document.fonts].some((f) => f.family.includes('Inter') && f.status === 'loaded') },
      size: { title: parseFloat(getComputedStyle(els.title).fontSize), body: parseFloat(getComputedStyle(els.about).fontSize) },
      lines: { header: lines(q('.header__nav')), title: lines(els.title), about: lines(els.about) },
      blend: { title: getComputedStyle(els.title).mixBlendMode, num: getComputedStyle(els.num).mixBlendMode, about: getComputedStyle(els.about).mixBlendMode },
      rects: r, overlaps: hits,
      overflowX: document.documentElement.scrollWidth - innerWidth,
      intro: hero?.state.introRunning, anim: document.querySelectorAll('.is-anim').length,
    };
  },
};
