import { createLifeGalaxy, galaxyAxis } from './life-galaxy.js?v=20261121.5';

/* A scroll-grown galaxy. Content and editing remain owned by app.js. */
const mounted = new WeakMap();
const EARLIEST_YEAR = 2004;
const LATEST_YEAR = 2026;
const SVG_NS = 'http://www.w3.org/2000/svg';
const clamp = value => Math.min(1, Math.max(0, value));

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text ?? '');
  return node;
}

/** Only explicit calendar years are placed on the ruler; no dates are inferred. */
export function timelineYear(date) {
  const match = String(date ?? '').match(/(?:^|\D)((?:19|20)\d{2})(?!\d)/);
  return match ? Number(match[1]) : null;
}

export function renderLifeTimeline(root, entries, filter = '全部') {
  if (!root) return;
  let instance = mounted.get(root);
  if (!instance) {
    instance = mountLifeTimeline(root);
    mounted.set(root, instance);
  }
  instance.setEntries(entries, filter);
  return instance;
}

export function mountLifeTimeline(root) {
  const section = root.closest('section');
  const entrance = document.querySelector('#welcome-gate');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, previousTime = 0, dirty = true, destroyed = false;
  let onScreen = false, progress = 0, target = 0, length = 0;
  let nodes = [], positions = [], firstY = 0, lastY = 1, headerHeight = 80;
  let lastActiveYear = null;
  let currentRow = null;
  let lastReachedIndex = -1;
  let animationTime = 0, lastPaint = 0, intendedYear = null, intentTimer = 0;

  root.classList.add('life-timeline');
  root.classList.remove('life-has-line');
  const rail = element('aside', 'life-rail');
  rail.setAttribute('aria-label', '时间轴当前年份');
  const liveYear = element('span', 'life-rail-year', LATEST_YEAR);
  liveYear.setAttribute('aria-hidden', 'true');
  const navigation = element('div', 'life-rail-nav');
  const previous = element('button', 'life-year-step', '↓');
  const next = element('button', 'life-year-step', '↑');
  previous.type = next.type = 'button';
  previous.dataset.lifeStep = '-1'; next.dataset.lifeStep = '1';
  previous.setAttribute('aria-label', '上一年'); next.setAttribute('aria-label', '下一年');
  next.disabled = true;
  navigation.append(next, previous);
  const yearStatus = element('span', 'sr-only');
  yearStatus.setAttribute('role', 'status');
  yearStatus.setAttribute('aria-atomic', 'true');
  rail.append(liveYear, navigation, yearStatus);

  const stage = element('div', 'life-stage');
  const drawing = document.createElementNS(SVG_NS, 'svg');
  drawing.classList.add('life-line');
  drawing.setAttribute('aria-hidden', 'true');
  drawing.setAttribute('focusable', 'false');
  const galaxy = createLifeGalaxy(drawing);
  const years = element('ol', 'life-years');
  years.setAttribute('aria-label', '从 2026 回到 2004 的生活时间轴');
  stage.append(drawing, years);
  const loose = element('div', 'life-loose');
  root.replaceChildren(rail, stage, loose);

  function memory(entry, openIds) {
    const article = element('article', 'life-memory');
    const details = element('details', 'life-memory-story');
    details.dataset.id = String(entry.id ?? '');
    details.open = openIds.has(details.dataset.id);
    const summary = element('summary');
    const meta = element('span', 'life-memory-meta', [entry.date, entry.category].filter(Boolean).join(' · '));
    const title = element('h3', '', entry.title);
    summary.append(meta, title);
    if (entry.subtitle) summary.append(element('p', 'life-memory-subtitle', entry.subtitle));
    summary.append(element('span', 'life-memory-read', '读这一段'));
    details.append(summary, element('p', 'life-memory-body', entry.body || '这一段，慢慢写。'));
    const edit = element('button', 'life-memory-edit', '编辑 ↗');
    edit.type = 'button';
    edit.dataset.edit = 'timeline';
    edit.dataset.id = String(entry.id ?? '');
    edit.setAttribute('aria-label', `编辑：${entry.title ?? ''}`);
    article.append(details, edit);
    return article;
  }

  function setEntries(entries, filter = '全部') {
    const openIds = new Set([...root.querySelectorAll('details[open]')].map(node => node.dataset.id));
    const groups = new Map();
    const other = [];
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (!entry || (filter !== '全部' && entry.category !== filter)) continue;
      const year = timelineYear(entry.date);
      if (year === null || year < EARLIEST_YEAR || year > LATEST_YEAR) other.push(entry);
      else {
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(entry);
      }
    }
    const fragment = document.createDocumentFragment();
    nodes = [];
    for (let year = LATEST_YEAR; year >= EARLIEST_YEAR; year--) {
      const row = element('li', 'life-year');
      row.dataset.year = String(year);
      setAxis(row, LATEST_YEAR - year);
      const label = element('span', 'life-year-label', year);
      const tick = element('span', 'life-year-tick');
      tick.setAttribute('aria-hidden', 'true');
      row.append(label, tick);
      const content = element('div', 'life-year-content');
      if (year === EARLIEST_YEAR || year === LATEST_YEAR) {
        row.classList.add('life-year-endpoint');
        const endpoint = element('div', 'life-endpoint');
        endpoint.append(element('h3', '', year === EARLIEST_YEAR ? '出生' : '现在'));
        content.append(endpoint);
      }
      for (const entry of groups.get(year) || []) content.append(memory(entry, openIds));
      if (content.childElementCount) {
        row.classList.add('has-memory');
        row.append(content);
      }
      fragment.append(row);
      nodes.push({year, row, tick});
    }
    years.replaceChildren(fragment);
    currentRow = null;
    lastReachedIndex = -1;
    loose.replaceChildren();
    loose.hidden = !other.length;
    if (other.length) {
      loose.append(element('h3', 'life-loose-title', '另一些片段'));
      const collection = element('div', 'life-loose-entries');
      for (const entry of other) collection.append(memory(entry, openIds));
      loose.append(collection);
    }
    invalidate();
  }

  function setAxis(row, index) {
    const compact = innerWidth <= 700;
    const axis = galaxyAxis(index, LATEST_YEAR - EARLIEST_YEAR + 1, compact);
    row.style.setProperty('--life-axis', `${axis.toFixed(3)}%`);
    row.dataset.lifeSide = compact || axis <= 50 ? 'right' : 'left';
  }

  function active() {
    const covered = entrance?.open && !entrance.classList.contains('is-entering');
    return !destroyed && !document.hidden && !section?.hidden && !covered && onScreen;
  }

  function schedule() {
    if (!frame && active()) frame = requestAnimationFrame(paint);
  }

  function invalidate() {
    dirty = true;
    schedule();
  }

  function measure() {
    nodes.forEach(({row}, index) => setAxis(row, index));
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !nodes.length) return false;
    headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 80;
    positions = nodes.map(({tick}) => {
      const r = tick.getBoundingClientRect();
      return {x:r.left + r.width / 2 - bounds.left, y:r.top + r.height / 2 - bounds.top};
    });
    firstY = positions[0].y;
    lastY = positions.at(-1).y;
    length = galaxy.setGeometry(positions, bounds.width, bounds.height);
    root.classList.add('life-has-line');
    dirty = false;
    return true;
  }

  function paint(now) {
    frame = 0;
    if (!active()) { previousTime = 0; return; }
    if (dirty && !measure()) return;
    if (!positions.length || !length) return;
    const bounds = stage.getBoundingClientRect();
    const readingLine = headerHeight + (innerHeight - headerHeight) * .62;
    const stageTop = bounds.top + scrollY;
    const scrollStart = Math.max(0, stageTop + firstY - readingLine);
    const scrollEnd = Math.min(
      document.documentElement.scrollHeight - innerHeight,
      stageTop + lastY - readingLine
    );
    const scrollProgress = clamp((scrollY - scrollStart) / Math.max(1, scrollEnd - scrollStart));
    target = galaxy.progressAtY(firstY + (lastY - firstY) * scrollProgress);
    // Use the display's frame rate while scrolling and a lighter cadence at rest.
    if (!reduced.matches && progress === target && now - lastPaint < 32) { schedule(); return; }
    const dt = previousTime ? Math.min(64, now - previousTime) : 16;
    previousTime = now;
    lastPaint = now;
    const stageVisible = bounds.bottom > headerHeight && bounds.top < innerHeight;
    if (stageVisible && !reduced.matches) animationTime += dt / 1000;
    progress = reduced.matches ? target : progress + (target - progress) * (1 - Math.exp(-dt / 100));
    if (Math.abs(progress - target) < .0002) progress = target;
    const point = galaxy.paint(progress, animationTime, {reduced:reduced.matches, top:headerHeight - bounds.top, bottom:innerHeight - bounds.top});
    if (!point) return;
    const currentIndex = Math.max(0, positions.findLastIndex(({y}) => y <= point.y + 2));
    const reachedIndex = reduced.matches ? nodes.length - 1 : currentIndex;
    if (reachedIndex !== lastReachedIndex) {
      nodes.forEach(({row}, index) => row.classList.toggle('is-reached', index <= reachedIndex));
      lastReachedIndex = reachedIndex;
    }
    const current = nodes[currentIndex].year;
    if (currentRow !== nodes[currentIndex].row) {
      currentRow?.removeAttribute('aria-current');
      currentRow = nodes[currentIndex].row;
      currentRow.setAttribute('aria-current', 'date');
    }
    if (current !== lastActiveYear) {
      liveYear.textContent = String(current);
      rail.setAttribute('aria-label', `时间轴当前年份：${current}`);
      lastActiveYear = current;
      updateNavigation();
    }
    if (stageVisible && (!reduced.matches || progress !== target)) schedule();
    else previousTime = 0;
  }

  function updateNavigation() {
    const year = intendedYear ?? lastActiveYear ?? LATEST_YEAR;
    previous.disabled = year <= EARLIEST_YEAR;
    next.disabled = year >= LATEST_YEAR;
  }

  function releaseJump() {
    clearTimeout(intentTimer);
    intendedYear = null;
    updateNavigation();
  }

  function jumpYear(delta) {
    if (dirty && !measure()) return;
    if (!positions.length) return;
    intendedYear = Math.max(EARLIEST_YEAR, Math.min(LATEST_YEAR, (intendedYear ?? lastActiveYear ?? LATEST_YEAR) + delta));
    yearStatus.textContent = `前往 ${intendedYear} 年`;
    updateNavigation();
    const bounds = stage.getBoundingClientRect();
    const readingLine = headerHeight + (innerHeight - headerHeight) * .62;
    const start = Math.max(0, bounds.top + scrollY + firstY - readingLine);
    const end = Math.min(document.documentElement.scrollHeight - innerHeight, bounds.top + scrollY + lastY - readingLine);
    const fraction = (positions[LATEST_YEAR - intendedYear].y - firstY) / Math.max(1, lastY - firstY);
    scrollTo({top:start + fraction * Math.max(0, end - start), behavior:reduced.matches ? 'instant' : 'smooth'});
    clearTimeout(intentTimer);
    intentTimer = setTimeout(releaseJump, 1400);
    schedule();
  }

  const previousYear = () => jumpYear(-1);
  const nextYear = () => jumpYear(1);
  const manualScroll = event => {
    if (event.type === 'touchstart' && event.target.closest?.('.life-rail-nav')) return;
    if (intendedYear !== null) releaseJump();
  };
  previous.addEventListener('click', previousYear);
  next.addEventListener('click', nextYear);

  function visibilityChanged() {
    if (!active()) {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
    } else invalidate();
  }

  const intersection = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    visibilityChanged();
  }, {rootMargin:'80px 0px'});
  intersection.observe(root);
  const resize = new ResizeObserver(invalidate);
  resize.observe(stage);
  const header = document.querySelector('.site-header');
  if (header) resize.observe(header);
  const route = new MutationObserver(visibilityChanged);
  if (section) route.observe(section, {attributes:true, attributeFilter:['hidden']});
  if (entrance) route.observe(entrance, {attributes:true, attributeFilter:['open','class']});
  root.addEventListener('toggle', invalidate, true);
  addEventListener('scroll', schedule, {passive:true});
  addEventListener('wheel', manualScroll, {passive:true});
  addEventListener('touchstart', manualScroll, {passive:true});
  addEventListener('resize', invalidate, {passive:true});
  document.addEventListener('visibilitychange', visibilityChanged);
  reduced.addEventListener('change', invalidate);
  document.fonts?.addEventListener('loadingdone', invalidate);
  document.fonts?.ready.then(() => { if (!destroyed) invalidate(); });

  return {
    setEntries,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      clearTimeout(intentTimer);
      intersection.disconnect(); resize.disconnect(); route.disconnect();
      root.removeEventListener('toggle', invalidate, true);
      removeEventListener('scroll', schedule);
      removeEventListener('wheel', manualScroll);
      removeEventListener('touchstart', manualScroll);
      previous.removeEventListener('click', previousYear);
      next.removeEventListener('click', nextYear);
      removeEventListener('resize', invalidate);
      document.removeEventListener('visibilitychange', visibilityChanged);
      reduced.removeEventListener('change', invalidate);
      document.fonts?.removeEventListener('loadingdone', invalidate);
      mounted.delete(root);
    },
  };
}
