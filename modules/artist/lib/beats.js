/* The single beat table (playbook: one table, so CSS heights and JS windows can
   never disagree). H = one viewport height. The hero runway is `heroRun`·H; the
   faces section (section 2) starts exactly where the clip ends and its windows
   are measured in H from there. applyBeats() writes the runway heights.

   Section 2 follows paypath.ai's ring, measured: one container that grows
   linearly (×0.5 → ×1 over 2H), a true circle, cards square and tangent, a
   steady spin in time. The fold into the row is ours: the spin dies first, then
   all eight cards move as one. */
import { isMobile, reduced } from './gsap.js';

const DESKTOP = {
  heroRun: 1.5,              /* the clip scrubs across this */
  /* section 2 — windows [from, to] in H from the end of the clip */
  blur:       [0, 0.6],      /* footage blur 0→16px + crossfade into the haze; veil 5%→30% */
  zoom:       [0.15, 0.9],   /* footage + haze scale 1 → 1.4 */
  ringAppear: [0.45, 0.65],  /* all eight at once, small, opacity 0 → 1 */
  grow:       [0.45, 2.45],  /* the whole ring ×0.5 → ×1, linear (R .30B → .60B) */
  spinStop:   [2.2, 2.45],   /* the spin eases to a standstill before the fold */
  words:      [1.05, 2.0],   /* the statement, word by word — starts once the ring is big enough
                                that the widest line (× · ×, lower block) clears the cards */
  textOut:    [2.05, 2.35],
  fold:       [2.45, 3.25],  /* ring → row, all cards in one move */
  tail: 0.15,                /* a breath after the strip has run out */
};
const MOBILE = { ...DESKTOP, heroRun: 1.2 };

export function beats() { return isMobile() ? MOBILE : DESKTOP; }

/* the strip leg starts where the fold ends and runs 1:1 with the scroll, so its
   length is the row's overflow in H — measured by faces.js, passed in here */
export function applyBeats({ stripH = 0 } = {}, root = document.documentElement) {
  const b = beats();
  root.style.setProperty('--run', (reduced ? 0 : b.heroRun * 100) + 'svh');
  root.style.setProperty('--faces-run', ((b.fold[1] + stripH + b.tail) * 100) + 'svh');
  return b;
}
