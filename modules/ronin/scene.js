const scene = document.querySelector('.scene');
const armorLayer = document.querySelector('.figure-armor');
const language = document.querySelector('.language');
const englishCopy = {
  name: 'RONIN-X //',
  shadow: 'SHADOW',
  nightfall: 'NIGHTFALL',
  description: 'Cultivated with high-res optics and a zero-gravity frame for those who don’t just watch the future—they wield it. Shift your reality.',
  mouseHelp: 'Move the pointer or use the arrow keys to reveal the armor',
  touchHelp: 'Drag to reveal the armor',
  specs: 'Operative Specs',
  vision: 'Vision',
  visionValue: 'Dual 8K Pulse-OLED',
  nerve: 'Nerve',
  nerveValue: 'R1 · Ronin Engines',
  reflex: 'Reflex',
  reflexValue: '144Hz Low-Lag Ops',
  armor: 'Armor',
  armorValue: 'Lightweight Shadow Shell'
};
const copy = [...document.querySelectorAll('[data-copy]')].map(element => ({
  element, chinese: element.textContent
}));

language.addEventListener('click', () => {
  const useEnglish = document.documentElement.lang !== 'en';
  for (const {element, chinese} of copy) {
    element.textContent = useEnglish ? englishCopy[element.dataset.copy] : chinese;
  }
  language.textContent = useEnglish ? '中文 / EN' : 'EN / 中文';
  language.setAttribute('aria-label', useEnglish ? '切换到中文' : 'Switch to English');
  document.documentElement.lang = useEnglish ? 'en' : 'zh-CN';
});

let spotlightFrame = 0;
let spotlight = null;

function reveal(x, y) {
  spotlight = {x, y};
  if (spotlightFrame) return;
  spotlightFrame = requestAnimationFrame(() => {
    spotlightFrame = 0;
    const radius = Math.max(104, Math.min(scene.clientWidth * .21, scene.clientHeight * .39, 248));
    armorLayer.style.setProperty('--x', `${spotlight.x}px`);
    armorLayer.style.setProperty('--y', `${spotlight.y}px`);
    armorLayer.style.setProperty('--radius', `${radius}px`);
    scene.classList.add('is-revealing');
  });
}

function clearReveal() {
  cancelAnimationFrame(spotlightFrame);
  spotlightFrame = 0;
  spotlight = null;
  scene.classList.remove('is-revealing');
}

function revealAtPointer(event) {
  const rect = scene.getBoundingClientRect();
  reveal(event.clientX - rect.left, event.clientY - rect.top);
}

scene.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' || event.target.closest('button')) return;
  scene.setPointerCapture(event.pointerId);
  revealAtPointer(event);
});
scene.addEventListener('pointermove', event => {
  if (event.pointerType === 'mouse' || scene.hasPointerCapture(event.pointerId)) revealAtPointer(event);
});
scene.addEventListener('lostpointercapture', clearReveal);
scene.addEventListener('pointerleave', clearReveal);
scene.addEventListener('blur', clearReveal);

const steps = {ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1]};
scene.addEventListener('keydown', event => {
  if (event.target !== scene) return;
  if (event.key === 'Escape') {
    clearReveal();
    return;
  }
  const step = steps[event.key];
  if (!step) return;
  event.preventDefault();
  const {clientWidth: width, clientHeight: height} = scene;
  const {x, y} = spotlight ?? {x: width / 2, y: height / 2};
  reveal(
    Math.min(width, Math.max(0, x + 34 * step[0])),
    Math.min(height, Math.max(0, y + 34 * step[1]))
  );
});

const canvas = document.querySelector('.stars');
const context = canvas.getContext('2d');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let stars = [];
let width = 0;
let height = 0;
let starFrame = 0;

function drawStars(time = 0) {
  context.clearRect(0, 0, width, height);
  for (const star of stars) {
    const y = reducedMotion.matches ? star.y : (star.y + time * star.speed) % height;
    const twinkle = reducedMotion.matches ? 1 : .78 + Math.sin(star.phase + time * .0018) * .22;
    context.beginPath();
    context.fillStyle = `rgba(255, 247, 255, ${star.alpha * twinkle})`;
    context.arc(star.x, y, star.radius, 0, Math.PI * 2);
    context.fill();
  }
}

function animateStars(time) {
  drawStars(time);
  starFrame = requestAnimationFrame(animateStars);
}

function syncAnimation() {
  cancelAnimationFrame(starFrame);
  if (document.hidden) return;
  if (reducedMotion.matches) drawStars();
  else starFrame = requestAnimationFrame(animateStars);
}

if (context) {
  const resize = new ResizeObserver(() => {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    const count = Math.max(42, Math.min(140, Math.round(width * height / 7100)));
    stars = Array.from({length: count}, () => ({
      x: Math.random() * width, y: Math.random() * height,
      radius: Math.random() * 1.35 + .25, alpha: Math.random() * .6 + .18,
      phase: Math.random() * Math.PI * 2, speed: Math.random() * .027 + .014
    }));
    syncAnimation();
  });
  resize.observe(canvas);
  document.addEventListener('visibilitychange', syncAnimation);
  reducedMotion.addEventListener('change', syncAnimation);
}
