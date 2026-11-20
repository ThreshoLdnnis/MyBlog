/* Hero · Sur(face).

   Intro (timed, after fonts.ready ∧ frame 0 of the sequence; 4s failsafe):
     0     footage  --in   opacity 0→1, scale 1.06→1 (top-anchored)  1.6s expoOut
     .1    header bar      y 1em → 0 + fade                        .6s magic (lib/header.js)
     .2    title + number chars --in   blur 12px → 0, y .15em → 0  1.1s expoOut, stagger .04
     .6    copy lines + widget blocks  y 56 → 0, scale .96 → 1      .85s outExpo, stagger .07
           (the new-14 widget group entrance, values as approved)

   Exit (the user's call: «исчезают по аналогичной анимации на середине прокрутки»):
     the same moves played backwards on the title, the number and the copy — a
     timed timeline, play() when the clip passes its middle, reverse() when it
     comes back (the new-14 threshold + reverse pattern; a scrubbed wipe read as
     cheap). Header and widget never leave.
   Blur exists only while the type carries .is-anim. Reduced motion: rest state. */
import { gsap, SplitText, reduced } from './gsap.js';

export function initHero({ root = document.querySelector('[data-hero]'), header = null, ready = Promise.resolve() } = {}) {
  if (!root) return null;
  const media = root.querySelector('[data-hero-media]');
  const type = [root.querySelector('[data-hero-title]'), root.querySelector('[data-hero-num]')].filter(Boolean);
  const lines = [...root.querySelectorAll('[data-hero-about] .line')];
  const widget = [...root.querySelectorAll('[data-hero-widget] > *')];
  const chrome = [header?.root, root].filter(Boolean);
  const state = { introRunning: false, started: false, out: false };
  let splits = [], intro = null, exit = null;
  /* resolves once the page is settled: the intro has played (or was skipped) —
     main.js holds the rest of the clip's frames until then */
  let settled;
  const introDone = new Promise((r) => { settled = r; });

  const show = () => gsap.set(chrome, { visibility: 'visible' });
  const chars = () => splits.flatMap((s) => s.chars);
  const anim = (on) => type.forEach((el) => el.classList.toggle('is-anim', on));

  function buildExit() {
    exit = gsap.timeline({
      paused: true,
      onStart: () => anim(true),
      onComplete: () => anim(false),
      onReverseComplete: () => {
        anim(false);
        gsap.set(lines, { clearProps: 'transform,opacity,visibility' });
      },
    });
    exit.to(chars(), { '--in': 0, duration: 1.1, ease: 'expoOut', stagger: 0.04 }, 0);
    exit.to(lines, { y: 56, scale: 0.96, autoAlpha: 0, transformOrigin: '0% 100%', duration: 0.85, ease: 'outExpo', stagger: 0.07 }, 0.1);
  }

  /* animate:false is the failsafe — the same split and exit, no intro */
  function start({ animate = true } = {}) {
    if (state.started) return;
    state.started = true;
    splits = type.map((el) => new SplitText(el, { type: 'chars', charsClass: 'char', tag: 'span' }));
    if (reduced) { show(); settled(); return; }
    if (!animate) {
      show();
      buildExit();
      if (state.out) setOut(true, true);
      settled();
      return;
    }

    const group = [...lines, ...widget];
    state.introRunning = true;
    gsap.set(media, { '--in': 0 });
    gsap.set(chars(), { '--in': 0 });
    gsap.set(group, { y: 56, scale: 0.96, autoAlpha: 0, transformOrigin: '0% 100%' });
    anim(true);

    intro = gsap.timeline({
      onComplete: () => {
        state.introRunning = false;
        anim(false);
        gsap.set(group, { clearProps: 'transform,opacity,visibility' });
        settled();
      },
    });
    intro.to(media, { '--in': 1, duration: 1.6, ease: 'expoOut' }, 0);
    intro.add(() => header?.playIntro(), 0.1);
    intro.to(chars(), { '--in': 1, duration: 1.1, ease: 'expoOut', stagger: 0.04 }, 0.2);
    intro.to(group, { y: 0, scale: 1, autoAlpha: 1, duration: 0.85, ease: 'outExpo', stagger: 0.07 }, 0.6);
    show(); /* after the first values are written — no flash of the rested state */
    buildExit();
    if (state.out) setOut(true, true);   /* the page was reloaded past the middle */
  }

  /* past the middle of the clip → out; back before it → in */
  function setOut(on, force = false) {
    if (on === state.out && !force) return;
    state.out = on;
    if (!exit || reduced) return;
    if (intro?.isActive()) intro.progress(1);   /* settle the intro first — one owner per property */
    if (on) exit.play(); else exit.reverse();
  }

  Promise.all([document.fonts.ready, ready.catch(() => {})]).then(() => requestAnimationFrame(() => start()));

  /* failsafe: a stalled font or frame never leaves the hero hidden */
  let failsafe;
  const arm = () => { failsafe = setTimeout(() => {
    if (state.started) return;
    if (document.hidden) return arm();
    start({ animate: false });
  }, 4000); };
  arm();

  return {
    state, setOut, introDone,
    get intro() { return intro; },
    get exit() { return exit; },
    revert() { clearTimeout(failsafe); intro?.kill(); exit?.kill(); splits.forEach((s) => s.revert()); },
  };
}
