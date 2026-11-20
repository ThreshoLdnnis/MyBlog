/* Memoised writers for the motion contract: JS writes 0→1 custom properties ON
   the element (never :root), rounded to 3dp, skipped when unchanged; state
   classes toggled once per crossing. (new-9 main.js:107-120 pattern.) */
export const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const segT = (p, a, b) => clamp01((p - a) / (b - a));
export const smoothstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export function setVar(el, name, v, unit = '') {
  if (!el) return;
  const s = (+v).toFixed(3) + unit;
  const memo = el.__vars || (el.__vars = {});
  if (memo[name] === s) return;
  memo[name] = s;
  el.style.setProperty(name, s);
}

export function setClass(el, cls, on) {
  if (!el) return;
  const memo = el.__cls || (el.__cls = {});
  if (memo[cls] === on) return;
  memo[cls] = on;
  el.classList.toggle(cls, on);
}

/* a 0→1 proxy for GSAP: tween `p.v`, the onUpdate writes the var + gates the
   blur class while the value is strictly between 0 and 1 */
export function prop(el, name, { anim = null } = {}) {
  const p = { v: 0 };
  p.apply = () => {
    setVar(el, name, p.v);
    if (anim) setClass(el, anim, p.v > 0 && p.v < 1);
  };
  return p;
}
