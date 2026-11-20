/* Screen 3 · the statement that appears word by word from blur (animos.app
   lineage, scroll-scrubbed). SplitText hands every word its index (--word);
   CSS derives each word's own 0→1 from the block's --p. The block also carries
   --out (fade + lift + blur) and two gates: .is-words while the sweep runs
   (per-word blur), .is-anim while the exit runs, .is-hidden at rest. */
import { SplitText, reduced } from './gsap.js';
import { setVar, setClass } from './vars.js';

export function initWords({ root = document.querySelector('[data-words]') } = {}) {
  if (!root) return null;
  const state = { p: 0, out: 0, n: 0 };
  let split = null;
  setClass(root, 'is-hidden', !reduced);

  document.fonts.ready.then(() => requestAnimationFrame(() => {
    split = SplitText.create(root, { type: 'words', wordsClass: 'word', propIndex: true, autoSplit: false });
    state.n = split.words.length;
    setVar(root, '--n', state.n);
  }));

  const apply = () => {
    setVar(root, '--p', state.p);
    setVar(root, '--out', state.out);
    setClass(root, 'is-words', state.p > 0 && state.p < 1);
    setClass(root, 'is-anim', state.out > 0 && state.out < 1);
    setClass(root, 'is-hidden', state.p <= 0 || state.out >= 1);
  };
  return {
    state, root,
    setP(p) { state.p = p; apply(); },
    setOut(o) { state.out = o; apply(); },
    revert() { split?.revert(); },
  };
}
