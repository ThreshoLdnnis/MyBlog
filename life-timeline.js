/* A quiet, scroll-grown year line. Content and editing remain owned by app.js. */
const mounted = new WeakMap();
const FIRST_YEAR = 2004;
const LAST_YEAR = 2026;
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
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0, previousTime = 0, dirty = true, destroyed = false;
  let onScreen = false, progress = 0, target = 0, length = 0;
  let nodes = [], positions = [], firstY = 0, lastY = 1, headerHeight = 80;
  let lastActiveYear = null;

  root.classList.add('life-timeline');
  root.classList.remove('life-has-line');
  const rail = element('aside', 'life-rail');
  rail.setAttribute('aria-label', '时间轴当前年份');
  const liveYear = element('span', 'life-rail-year', FIRST_YEAR);
  liveYear.setAttribute('aria-hidden', 'true');
  rail.append(liveYear);

  const stage = element('div', 'life-stage');
  const drawing = document.createElementNS(SVG_NS, 'svg');
  drawing.classList.add('life-line');
  drawing.setAttribute('aria-hidden', 'true');
  drawing.setAttribute('focusable', 'false');
  const track = document.createElementNS(SVG_NS, 'path');
  track.classList.add('life-line-track');
  const growing = document.createElementNS(SVG_NS, 'path');
  growing.classList.add('life-line-growing');
  growing.setAttribute('pathLength', '1');
  const tipHalo = document.createElementNS(SVG_NS, 'circle');
  tipHalo.classList.add('life-line-halo');
  tipHalo.setAttribute('r', '10');
  const tip = document.createElementNS(SVG_NS, 'circle');
  tip.classList.add('life-line-tip');
  tip.setAttribute('r', '3.5');
  drawing.append(track, growing, tipHalo, tip);
  const years = element('ol', 'life-years');
  years.setAttribute('aria-label', '2004 至 2026 的生活时间轴');
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
      if (year === null || year < FIRST_YEAR || year > LAST_YEAR) other.push(entry);
      else {
        if (!groups.has(year)) groups.set(year, []);
        groups.get(year).push(entry);
      }
    }
    const fragment = document.createDocumentFragment();
    nodes = [];
    for (let year = FIRST_YEAR; year <= LAST_YEAR; year++) {
      const row = element('li', 'life-year');
      row.dataset.year = String(year);
      const label = element('span', 'life-year-label', year);
      const tick = element('span', 'life-year-tick');
      tick.setAttribute('aria-hidden', 'true');
      row.append(label, tick);
      const content = element('div', 'life-year-content');
      if (year === FIRST_YEAR || year === LAST_YEAR) {
        row.classList.add('life-year-endpoint');
        const endpoint = element('div', 'life-endpoint');
        endpoint.append(element('h3', '', year === FIRST_YEAR ? '出生' : '现在'));
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

  function active() {
    return !destroyed && !document.hidden && !section?.hidden && onScreen;
  }

  function schedule() {
    if (!frame && active()) frame = requestAnimationFrame(paint);
  }

  function invalidate() {
    dirty = true;
    schedule();
  }

  function measure() {
    const bounds = stage.getBoundingClientRect();
    if (!bounds.width || !bounds.height || !nodes.length) return false;
    headerHeight = document.querySelector('.site-header')?.getBoundingClientRect().height || 80;
    drawing.setAttribute('viewBox', `0 0 ${bounds.width} ${bounds.height}`);
    positions = nodes.map(({tick}) => {
      const r = tick.getBoundingClientRect();
      return {x:r.left + r.width / 2 - bounds.left, y:r.top + r.height / 2 - bounds.top};
    });
    firstY = positions[0].y;
    lastY = positions.at(-1).y;
    let path = `M ${positions[0].x} ${firstY}`;
    for (let i = 1; i < positions.length; i++) {
      const a = positions[i - 1], b = positions[i], dy = b.y - a.y;
      const bend = Math.min(12, bounds.width * .035) * (i % 2 ? 1 : -1);
      path += ` C ${a.x + bend} ${a.y + dy / 3}, ${b.x - bend} ${b.y - dy / 3}, ${b.x} ${b.y}`;
    }
    track.setAttribute('d', path);
    growing.setAttribute('d', path);
    length = growing.getTotalLength();
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
    target = clamp((scrollY - scrollStart) / Math.max(1, scrollEnd - scrollStart));
    const dt = previousTime ? Math.min(64, now - previousTime) : 16;
    previousTime = now;
    progress = reduced.matches ? target : progress + (target - progress) * (1 - Math.exp(-dt / 100));
    if (Math.abs(progress - target) < .0002) progress = target;
    growing.style.strokeDashoffset = String(1 - (reduced.matches ? 1 : progress));
    const point = growing.getPointAtLength(length * progress);
    for (const dot of [tipHalo, tip]) {
      dot.setAttribute('cx', String(point.x));
      dot.setAttribute('cy', String(point.y));
    }
    let current = FIRST_YEAR;
    nodes.forEach(({year, row}, index) => {
      const reached = positions[index].y <= point.y + 2;
      row.classList.toggle('is-reached', reached || reduced.matches);
      if (reached) current = year;
    });
    if (current !== lastActiveYear) {
      liveYear.textContent = String(current);
      lastActiveYear = current;
    }
    if (progress !== target) schedule();
    else previousTime = 0;
  }

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
  root.addEventListener('toggle', invalidate, true);
  addEventListener('scroll', schedule, {passive:true});
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
      intersection.disconnect(); resize.disconnect(); route.disconnect();
      root.removeEventListener('toggle', invalidate, true);
      removeEventListener('scroll', schedule);
      removeEventListener('resize', invalidate);
      document.removeEventListener('visibilitychange', visibilityChanged);
      reduced.removeEventListener('change', invalidate);
      document.fonts?.removeEventListener('loadingdone', invalidate);
      mounted.delete(root);
    },
  };
}
