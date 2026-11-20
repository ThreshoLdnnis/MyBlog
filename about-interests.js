// Original local illustrations represent interests; they are not personal photos.
export const aboutInterests = [
  ['technology', '科技创作', 'MAKE SOMETHING', '机器人与工作台上的小发明', '#d7ead7'],
  ['vibe-coding', 'Vibe Coding', 'FOLLOW THE IDEA', '戴着耳机的笔记本电脑与代码', '#e2dcf5'],
  ['hackathon', 'Hackathon', 'BUILD TOGETHER', '计时钟旁准备起飞的小火箭', '#f9d7bc'],
  ['entrepreneurship', '创业交流', 'LET’S TALK', '咖啡桌上交汇的对话与想法', '#f1e7b5'],
  ['sharing', '内容分享', 'PASS IT ON', '打开的信封、手写纸张与扩音器', '#d8eafa'],
  ['xiaohongshu', '小红书创作', 'LITTLE STORIES', '手机里的生活图文与红色爱心', '#f6d5df'],
  ['tennis', '网球', 'ONE MORE RALLY', '绿色球场上的球拍与网球', '#dce9c1'],
  ['badminton', '羽毛球', 'YOUR SERVE', '蓝色球拍与轻盈的羽毛球', '#d0e9ef'],
  ['hiking', '爬山', 'TAKE THE LONG WAY', '山峰、太阳与橙色登山背包', '#e4e9c8'],
  ['photography', '摄影', 'KEEP THIS MOMENT', '相机与留下阳光的照片', '#f4dfbd'],
  ['travel', '旅行', 'SOMEWHERE NEW', '行李箱、地球仪与纸飞机', '#d1e5f3'],
  ['food', '美食', 'SOMETHING GOOD', '冒着热气的面碗与筷子', '#f8dcc8'],
  ['pets', '宠物', 'SOFT COMPANY', '一只猫和一只狗并排坐着', '#e8dcf0'],
  ['fps', 'FPS游戏', 'ONE MORE ROUND', '游戏手柄与画面中的瞄准标记', '#d8e0f6'],
].map(([id, title, subtitle, alt, color]) => ({id, title, subtitle, alt, color}));

const instances = new WeakMap();

export function mountAboutInterests(root) {
  if (!root) return null;
  if (instances.has(root)) return instances.get(root);
  const abort = new AbortController();
  const options = {signal: abort.signal};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const headingId = `${root.id || 'about-interests'}-title`;
  const helpId = `${root.id || 'about-interests'}-help`;
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  root.classList.add('about-interests');
  root.setAttribute('aria-labelledby', headingId);
  root.removeAttribute('aria-label');
  const header = el('div', 'about-interests-header');
  const title = el('h2', 'about-hand', '个人兴趣与表达');
  title.id = headingId;
  const controls = el('div', 'about-interests-controls');
  controls.setAttribute('role', 'group');
  controls.setAttribute('aria-label', '浏览兴趣卡片');
  const prev = el('button', 'about-interests-step', '上一张');
  const next = el('button', 'about-interests-step', '下一张');
  const play = el('button', 'about-interests-play');
  for (const button of [prev, next, play]) button.type = 'button';
  controls.append(prev, next, play);
  header.append(title, controls);
  const track = el('ol', 'about-interests-track');
  track.tabIndex = 0;
  track.setAttribute('aria-label', '14 项兴趣，使用左右方向键浏览');
  track.setAttribute('aria-describedby', helpId);
  const cards = aboutInterests.map((interest, index) => {
    const item = el('li', 'about-interest-card');
    item.style.setProperty('--interest-color', interest.color);
    item.style.setProperty('--interest-tilt', `${[-1.4, 1.2, -.8, 1.6, -.5][index % 5]}deg`);
    item.style.setProperty('--interest-delay', `${-(index % 5) * 1.1}s`);
    const figure = el('div', 'about-interest-art');
    const image = el('img');
    image.src = new URL(`./assets/about-interests/${interest.id}.svg`, import.meta.url).href;
    image.alt = interest.alt;
    image.width = 480;
    image.height = 360;
    image.loading = index < 4 ? 'eager' : 'lazy';
    image.decoding = 'async';
    image.draggable = false;
    figure.append(image);
    const caption = el('div', 'about-interest-caption');
    const name = el('h3', '', interest.title);
    const subtitle = el('p', '', interest.subtitle);
    subtitle.lang = 'en';
    caption.append(name, subtitle);
    item.append(figure, caption);
    track.append(item);
    return item;
  });
  const footer = el('div', 'about-interests-footer');
  const help = el('p', '', '拖动看看，或者左右滑动');
  help.id = helpId;
  const counter = el('span', 'about-interests-counter');
  counter.setAttribute('aria-hidden', 'true');
  const status = el('span', 'about-interests-sr');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');
  footer.append(help, counter, status);
  root.replaceChildren(header, track, footer);

  let automatic = !reduced.matches, onScreen = false, hovered = false, focused = false;
  let frame = 0, last = 0, direction = 1, endWait = 0, destroyed = false, drag = null, autoPosition = 0;
  let maxScroll = 0, currentIndex = 0, offsets = [];

  function nearest() {
    let best = 0;
    for (let i = 1; i < offsets.length; i++) {
      if (Math.abs(offsets[i] - track.scrollLeft) < Math.abs(offsets[best] - track.scrollLeft)) best = i;
    }
    return best;
  }
  function update() {
    maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const rect = track.getBoundingClientRect();
    offsets = cards.map(card => Math.min(maxScroll, Math.max(0, card.getBoundingClientRect().left - rect.left + track.scrollLeft - 8)));
    currentIndex = nearest();
    prev.disabled = track.scrollLeft <= 1;
    next.disabled = track.scrollLeft >= maxScroll - 1;
    counter.textContent = `${track.scrollLeft >= maxScroll - 1 ? cards.length : currentIndex + 1} / ${cards.length}`;
  }
  function canMove() {
    return automatic && !reduced.matches && onScreen && !hovered && !focused && !drag && !document.hidden && maxScroll > 1 && root.isConnected;
  }
  function sync() {
    root.dataset.moving = String(canMove());
    play.textContent = automatic ? '暂停滚动' : '自动滚动';
    play.hidden = reduced.matches;
    if (canMove() && !frame) frame = requestAnimationFrame(tick);
    if (!canMove()) { cancelAnimationFrame(frame); frame = 0; last = 0; }
  }
  function tick(time) {
    frame = 0;
    if (destroyed || !canMove()) return;
    if (!last) autoPosition = track.scrollLeft;
    const dt = last ? Math.min(40, time - last) : 16;
    last = time;
    if (endWait > 0) endWait -= dt;
    else {
      autoPosition = Math.min(maxScroll, Math.max(0, autoPosition + direction * dt * .022));
      track.scrollLeft = autoPosition;
      if ((direction > 0 && track.scrollLeft >= maxScroll - 1) || (direction < 0 && track.scrollLeft <= 1)) {
        direction *= -1;
        endWait = 1000;
      }
    }
    frame = requestAnimationFrame(tick);
  }
  function pause() { automatic = false; sync(); }
  function moveTo(index) {
    pause();
    update();
    const position = Math.max(0, Math.min(cards.length - 1, index));
    track.scrollTo({left: offsets[position], behavior: reduced.matches ? 'instant' : 'smooth'});
    status.textContent = `${aboutInterests[position].title}，第 ${position + 1} 项，共 ${cards.length} 项`;
  }
  prev.addEventListener('click', () => moveTo(currentIndex - 1), options);
  next.addEventListener('click', () => moveTo(currentIndex + 1), options);
  play.addEventListener('click', () => { automatic = !automatic; sync(); }, options);
  track.addEventListener('scroll', update, {...options, passive: true});
  track.addEventListener('wheel', event => { if (Math.abs(event.deltaX) > 0) pause(); }, {...options, passive: true});
  track.addEventListener('keydown', event => {
    const positions = {ArrowLeft: currentIndex - 1, ArrowRight: currentIndex + 1, Home: 0, End: cards.length - 1};
    if (!(event.key in positions)) return;
    event.preventDefault();
    moveTo(positions[event.key]);
  }, options);
  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') { pause(); return; }
    if (event.button !== 0) return;
    drag = {id: event.pointerId, x: event.clientX, left: track.scrollLeft, moved: false};
    sync();
  }, options);
  track.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (!drag.moved && Math.abs(dx) < 5) return;
    if (!drag.moved) { drag.moved = true; track.setPointerCapture(event.pointerId); pause(); }
    event.preventDefault();
    track.classList.add('is-dragging');
    track.scrollLeft = drag.left - dx;
  }, options);
  function release(event) {
    if (!drag || drag.id !== event.pointerId) return;
    if (track.hasPointerCapture(event.pointerId)) track.releasePointerCapture(event.pointerId);
    drag = null;
    track.classList.remove('is-dragging');
    sync();
  }
  window.addEventListener('pointerup', release, options);
  window.addEventListener('pointercancel', release, options);
  root.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') { hovered = true; sync(); } }, options);
  root.addEventListener('pointerleave', () => { hovered = false; sync(); }, options);
  root.addEventListener('focusin', () => { focused = true; sync(); }, options);
  root.addEventListener('focusout', event => { focused = !!event.relatedTarget && root.contains(event.relatedTarget); sync(); }, options);
  document.addEventListener('visibilitychange', sync, options);
  reduced.addEventListener('change', () => { if (reduced.matches) automatic = false; sync(); }, options);
  const visible = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); sync(); }, {threshold: .05});
  visible.observe(root);
  const cardVisibility = new IntersectionObserver(entries => {
    for (const entry of entries) entry.target.classList.toggle('is-in-view', entry.isIntersecting);
  }, {root: track, threshold: .05});
  cards.forEach(card => cardVisibility.observe(card));
  const resize = new ResizeObserver(() => { update(); sync(); });
  resize.observe(track);
  update();
  sync();
  const instance = {
    pause,
    play() { if (!reduced.matches) { automatic = true; sync(); } },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      abort.abort();
      visible.disconnect(); cardVisibility.disconnect(); resize.disconnect();
      instances.delete(root);
    },
  };
  instances.set(root, instance);
  return instance;
}
