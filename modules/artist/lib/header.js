/* Header: fixed, full width on every screen. Its colours ride --pol (lib/pol.js),
   so there is no fold and no Flip here — only the entrance (beat 0 of the page
   intro): items rise 1em and fade in, .6s magic, 80ms apart. If the page is
   scrolled before that is over, the tween is killed as a whole and the items
   are settled — nothing else ever writes these transforms. */
import { gsap, reduced } from './gsap.js';

export function initHeader({ root = document.querySelector('[data-header]') } = {}) {
  if (!root) return null;
  const items = gsap.utils.toArray('[data-header-item]', root);
  let entrance = null;

  function playIntro() {
    if (reduced) return null;
    gsap.set(items, { transition: 'none' });
    entrance = gsap.fromTo(items, { y: '1em', autoAlpha: 0 }, {
      y: 0, autoAlpha: 1, duration: 0.6, ease: 'magic', stagger: 0.08,
      clearProps: 'transform,opacity,visibility',
      onComplete: () => { entrance = null; gsap.set(items, { clearProps: 'transition' }); },
    });
    return entrance;
  }

  function settleIntro() {
    if (!entrance) return;
    entrance.kill();
    entrance = null;
    gsap.set(items, { clearProps: 'transition,transform,opacity,visibility' });
  }

  return { root, items, playIntro, settleIntro };
}
