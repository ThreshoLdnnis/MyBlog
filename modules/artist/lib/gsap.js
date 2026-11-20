/* GSAP + plugins from the CDN globals (loaded with <script defer> before main.js),
   registered once. Copied from new-14, trimmed to what this page uses
   (ScrollTrigger + SplitText + CustomEase; no Flip). The named eases are the
   CSS eases, so the JS and CSS halves of one motion share a curve. */
const { gsap, ScrollTrigger, SplitText, CustomEase } = window;

if (!gsap) throw new Error('gsap missing — check the CDN <script> order in index.html');
gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

CustomEase.create('magic',   '0.33, 0, 0, 1');     // --ease-magic
CustomEase.create('outExpo', '0.19, 1, 0.22, 1');   // --ease-out-expo
CustomEase.create('expoOut', '0.16, 1, 0.3, 1');    // --ease-expo (house blur-reveal curve)
CustomEase.create('inOut',   '0.77, 0, 0.175, 1');  // Emil's strong ease-in-out: on-screen movement (the ring → row fold)

export const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const isMobile = () => matchMedia('(max-width: 767px)').matches;

export { gsap, ScrollTrigger, SplitText, CustomEase };
