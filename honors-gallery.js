const galleries = new WeakMap();
const themes = new Set(['gold', 'jade', 'violet', 'silver', 'rose', 'blue']);
const rankThemes = {奖项:'gold', 证书:'jade', 里程碑:'violet', 入围:'blue', 排名:'silver', 荣誉:'rose', 参赛记录:'silver'};

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function button(className, text, label) {
  const node = make('button', className, text);
  node.type = 'button';
  if (label) node.setAttribute('aria-label', label);
  return node;
}

function plaque(entry, index) {
  const award = (Array.isArray(entry.award) ? entry.award : [entry.award]).filter(Boolean);
  const theme = themes.has(entry.theme) ? entry.theme : rankThemes[entry.category] || 'silver';
  const node = make('article', 'honor-plaque');
  node.dataset.tone = theme;
  node.style.setProperty('--plaque-order', index);
  if (entry.category === '参赛记录') node.dataset.layout = 'record';
  else if (entry.category === '排名') node.dataset.layout = 'rank';
  else if (award.length > 1) node.dataset.layout = 'duet';
  else if (theme === 'blue' || theme === 'violet') node.dataset.layout = 'vertical';
  else if (theme === 'rose' || theme === 'jade') node.dataset.layout = 'edition';

  const mark = make('span', 'honor-plaque-mark');
  mark.setAttribute('aria-hidden', 'true');
  const gleam = make('span', 'honor-plaque-gleam');
  gleam.setAttribute('aria-hidden', 'true');
  const header = make('header', 'honor-plaque-source');
  const subtitle = make('p', 'honor-plaque-issuer', entry.subtitle || entry.category || '荣誉');
  header.append(subtitle);
  if (entry.date) header.append(make('span', 'honor-plaque-date', entry.date));

  const title = make('h3', 'honor-plaque-title', entry.title);
  const distinctions = make('p', 'honor-plaque-distinction');
  award.forEach((label, rank) => distinctions.append(make('span', rank ? 'honor-distinction-secondary' : 'honor-distinction-main', label)));
  if (!award.length && entry.category && entry.subtitle) {
    distinctions.append(make('span', 'honor-distinction-main', entry.category));
  }
  const footer = make('footer', 'honor-plaque-footer');
  if (entry.body) footer.append(make('p', 'honor-plaque-note', entry.body));
  const edit = button('honor-plaque-edit', '编辑', '编辑荣誉：' + entry.title);
  edit.dataset.edit = 'honors';
  edit.dataset.id = entry.id;
  footer.append(edit);
  node.append(mark, gleam, header, title);
  if (distinctions.childElementCount) node.append(distinctions);
  node.append(footer);
  return node;
}

function mount(root) {
  const wide = matchMedia('(min-width: 1040px)');
  const medium = matchMedia('(min-width: 580px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const controls = make('div', 'honor-gallery-toolbar');
  const summary = make('p', 'honor-gallery-total');
  const browse = make('div', 'honor-gallery-browse');
  const hint = make('span', 'honor-gallery-hint', '横向拖动浏览');
  const previous = button('honor-gallery-arrow', '←', '上一页荣誉');
  const next = button('honor-gallery-arrow', '→', '下一页荣誉');
  const counter = make('span', 'honor-gallery-counter');
  counter.setAttribute('role', 'status');
  const track = make('div', 'honor-gallery-track');
  track.id = 'honor-track';
  track.tabIndex = 0;
  track.setAttribute('role', 'region');
  track.setAttribute('aria-label', '荣誉墙证书');
  for (const arrow of [previous, next]) arrow.setAttribute('aria-controls', track.id);
  const progress = make('div', 'honor-gallery-progress');
  progress.setAttribute('aria-hidden', 'true');
  progress.append(make('span', 'honor-gallery-progress-fill'));
  browse.append(hint, previous, counter, next);
  controls.append(summary, browse);
  root.replaceChildren(controls, track, progress);

  let entries = [], signature = '', panels = [], page = 0, pageSize = 0, pendingPage = null, drag = null;
  let illuminated = null;

  function updateControls() {
    const multipage = panels.length > 1;
    browse.hidden = progress.hidden = !multipage;
    previous.disabled = page === 0;
    next.disabled = page >= panels.length - 1;
    if (multipage) counter.textContent = (page + 1) + ' / ' + panels.length;
    progress.style.setProperty('--page', page);
    progress.style.setProperty('--pages', panels.length);
  }

  function panelStep() {
    return panels[1] ? panels[1].offsetLeft - panels[0].offsetLeft : track.clientWidth;
  }

  function goToPage(index, smooth = true) {
    if (!panels.length) return;
    const target = Math.max(0, Math.min(index, panels.length - 1));
    if (!track.clientWidth) { pendingPage = target; return; }
    pendingPage = null;
    track.scrollTo({left: target * panelStep(), behavior: smooth && !reduced.matches ? 'smooth' : 'instant'});
  }

  function render(entriesToRender, force = false) {
    const nextSignature = JSON.stringify(entriesToRender);
    if (!force && signature === nextSignature) return;
    const anchor = entries[page * pageSize]?.id;
    entries = entriesToRender;
    signature = nextSignature;
    const columns = wide.matches ? 4 : medium.matches ? 2 : 1;
    pageSize = columns * 2;
    root.style.setProperty('--honor-columns', columns);
    summary.textContent = entries.length ? entries.length + ' 项记录' : '';
    controls.hidden = !entries.length;
    track.classList.toggle('is-empty', !entries.length);
    track.tabIndex = entries.length > pageSize ? 0 : -1;
    panels = [];
    if (entries.length) {
      for (let offset = 0; offset < entries.length; offset += pageSize) {
        const panel = make('div', 'honor-gallery-panel');
        entries.slice(offset, offset + pageSize).forEach((entry, index) => panel.append(plaque(entry, index)));
        panels.push(panel);
      }
      track.replaceChildren(...panels);
    } else {
      track.replaceChildren(make('p', 'honor-gallery-empty', '这里留给下一份荣誉。'));
    }
    const anchorIndex = entries.findIndex(entry => anchor && entry.id === anchor);
    page = Math.min(anchorIndex < 0 ? page : Math.floor(anchorIndex / pageSize), Math.max(0, panels.length - 1));
    goToPage(page, false);
    updateControls();
  }

  track.addEventListener('scroll', () => {
    const step = panelStep();
    if (!step || !panels.length) return;
    const current = Math.max(0, Math.min(Math.round(track.scrollLeft / step), panels.length - 1));
    if (current === page) return;
    page = current;
    updateControls();
  }, {passive: true});
  previous.addEventListener('click', () => goToPage(page - 1));
  next.addEventListener('click', () => goToPage(page + 1));
  track.addEventListener('keydown', event => {
    if (event.target !== track) return;
    const targets = {ArrowLeft:page - 1, ArrowRight:page + 1, Home:0, End:panels.length - 1};
    if (!Object.hasOwn(targets, event.key)) return;
    event.preventDefault();
    goToPage(targets[event.key]);
  });

  function clearLight() {
    illuminated?.classList.remove('is-lit');
    illuminated = null;
  }

  track.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || panels.length < 2 || event.target.closest('button')) return;
    drag = {id:event.pointerId, x:event.clientX, left:track.scrollLeft, page, moving:false};
  });
  track.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse') return;
    if (drag && drag.id === event.pointerId) {
      if (!(event.buttons & 1)) { finishDrag(); return; }
      const delta = event.clientX - drag.x;
      if (!drag.moving && Math.abs(delta) > 6) {
        drag.moving = true;
        track.setPointerCapture(event.pointerId);
        track.classList.add('is-dragging');
        clearLight();
      }
      if (drag.moving) track.scrollLeft = drag.left - delta;
      return;
    }
    const card = event.target.closest('.honor-plaque');
    if (reduced.matches || !card) { clearLight(); return; }
    if (illuminated !== card) {
      clearLight();
      illuminated = card;
      card.classList.add('is-lit');
    }
    const rect = card.getBoundingClientRect();
    card.style.setProperty('--plate-x', (event.clientX - rect.left) + 'px');
    card.style.setProperty('--plate-y', (event.clientY - rect.top) + 'px');
  }, {passive: true});

  function finishDrag() {
    const lastDrag = drag;
    drag = null;
    if (!lastDrag?.moving) return;
    const delta = track.scrollLeft - lastDrag.left;
    const targetPage = Math.abs(delta) > 32 && page === lastDrag.page ? page + Math.sign(delta) : page;
    track.classList.remove('is-dragging');
    goToPage(targetPage);
  }

  track.addEventListener('pointerup', finishDrag);
  track.addEventListener('pointercancel', finishDrag);
  track.addEventListener('lostpointercapture', finishDrag);
  track.addEventListener('pointerleave', () => {
    clearLight();
    if (!drag?.moving) drag = null;
  });
  const relayout = () => render(entries, true);
  wide.addEventListener('change', relayout);
  medium.addEventListener('change', relayout);
  new ResizeObserver(() => {
    if (track.clientWidth) goToPage(pendingPage ?? page, false);
  }).observe(track);
  return {render};
}

export function renderHonorsGallery(section, entries) {
  const root = section?.querySelector('#honor-grid');
  if (!root) return;
  if (!galleries.has(root)) galleries.set(root, mount(root));
  galleries.get(root).render(Array.isArray(entries) ? entries : []);
}
