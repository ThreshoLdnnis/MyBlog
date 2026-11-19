const mountedBooks = new WeakMap();
let bookSequence = 0;

/** Mount the diary without owning its persistence or editor. */
export function mountJournalBook(root, illustrations = []) {
  if (!root) return {setPosts() {}};
  if (mountedBooks.has(root)) return mountedBooks.get(root);

  const find = name => root.querySelector(`[data-diary-${name}]`);
  const closed = find('closed');
  const openButton = find('open');
  const reader = find('reader');
  const spread = find('spread');
  const list = find('list');
  const jump = find('jump');
  const page = find('page');
  const meta = find('meta');
  const title = find('title');
  const excerpt = find('excerpt');
  const body = find('body');
  const artwork = find('art');
  const edit = find('edit');
  const closeButton = find('close');
  const previous = find('prev');
  const next = find('next');
  const status = find('status');
  if (![closed, openButton, reader, spread, list, jump, page, meta, title, excerpt, body, edit, closeButton, previous, next].every(Boolean)) {
    return {setPosts() {}};
  }

  const document = root.ownerDocument;
  const view = document.defaultView;
  const reduced = view.matchMedia('(prefers-reduced-motion: reduce)');
  let posts = [], index = -1, opened = false;
  let animation = null, leaf = null, generation = 0, gesture = null, closingFocus = false;
  let dragPreview = null, coverGesture = null, suppressOpenUntil = 0, suppressPageUntil = 0;
  const cover = closed.querySelector('.diary-cover');
  const pose = {x:0, y:0, rx:19, ry:0, rz:-8};
  const preloadedArt = new Map();
  const snapshotScrolls = new WeakMap();
  const text = value => typeof value === 'string' ? value : '';
  const current = () => posts[index];
  const isVisible = () => root.isConnected && !document.hidden && !root.closest('[hidden], [inert]') && root.getClientRects().length > 0;
  const hasDialog = () => Boolean(document.querySelector('dialog[open]'));
  const announce = message => { if (status) status.textContent = message; };

  if (!reader.id) reader.id = `journal-book-reader-${++bookSequence}`;
  openButton.setAttribute('aria-controls', reader.id);
  title.tabIndex = -1;
  page.tabIndex = 0;
  if (!page.hasAttribute('aria-labelledby')) page.setAttribute('aria-label', '手记纸页，可上下滚动阅读');
  body.style.whiteSpace = 'pre-wrap';
  body.style.overflowWrap = 'anywhere';
  page.style.overflowY = 'auto';
  page.style.overflowWrap = 'anywhere';
  page.style.minHeight = '0';
  body.style.touchAction = 'pan-y pinch-zoom';
  page.style.touchAction = 'pan-y pinch-zoom';
  spread.style.touchAction = 'pan-y pinch-zoom';
  if (artwork) artwork.draggable = false;

  const previousGrip = document.createElement('button');
  const nextGrip = document.createElement('button');
  for (const [grip, direction, label] of [[previousGrip, -1, '向右拖动页角，或点击翻到上一页'], [nextGrip, 1, '向左拖动页角，或点击翻到下一页']]) {
    grip.type = 'button';
    grip.className = `diary-page-grip diary-page-grip-${direction < 0 ? 'previous' : 'next'}`;
    grip.dataset.diaryGrip = String(direction);
    grip.setAttribute('aria-label', label);
    grip.title = label;
    grip.innerHTML = direction < 0 ? '<span aria-hidden="true">‹</span>' : '<span aria-hidden="true">›</span>';
    spread.append(grip);
    grip.addEventListener('click', () => turnTo(index + direction));
  }

  function releaseCapture(element, pointerId) {
    try { if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId); } catch { /* The pointer may already have ended. */ }
  }

  function clearPageGesture() {
    const active = gesture;
    gesture = null;
    spread.classList.remove('is-page-dragging');
    if (active) releaseCapture(spread, active.id);
    dragPreview?.remove();
    dragPreview = null;
  }

  function clearCoverGesture() {
    const active = coverGesture;
    coverGesture = null;
    cover?.classList.remove('is-inspecting');
    if (active) releaseCapture(cover, active.id);
  }

  function stableState() {
    root.dataset.diaryState = opened ? 'open' : 'closed';
    closed.hidden = opened;
    reader.hidden = !opened;
    reader.inert = false;
    openButton.setAttribute('aria-expanded', String(opened));
  }

  function cancelMotion() {
    const restoreCoverFocus = root.dataset.diaryState === 'closing' && closingFocus && (reader.contains(document.activeElement) || document.activeElement === document.body);
    const restorePageFocus = root.dataset.diaryState === 'opening' && (root.contains(document.activeElement) || document.activeElement === document.body);
    generation++;
    animation?.cancel();
    animation = null;
    leaf?.remove();
    leaf = null;
    clearPageGesture();
    clearCoverGesture();
    stableState();
    closingFocus = false;
    if (restoreCoverFocus && isVisible() && !hasDialog()) openButton.focus({preventScroll:true});
    if (restorePageFocus) focusTitle();
  }

  function animate(element, keyframes, options, finish) {
    if (reduced.matches || !isVisible() || typeof element.animate !== 'function') {
      finish();
      return;
    }
    const token = generation;
    try {
      const running = element.animate(keyframes, options);
      animation = running;
      running.finished.then(() => {
        if (token !== generation || animation !== running) return;
        animation = null;
        // Do not leave a fill transform on live reading controls.
        running.cancel();
        finish();
      }, () => {});
    } catch {
      animation = null;
      finish();
    }
  }

  function focusTitle() {
    if (opened && isVisible() && !hasDialog()) title.focus({preventScroll:true});
  }

  function renderPage({resetScroll = true} = {}) {
    const post = current();
    const illustration = illustrations.includes(post) ? post : null;
    const label = post ? text(post.title) || '无题手记' : '空白的一页';
    title.textContent = label;
    meta.textContent = post ? [text(post.date), text(post.category), `约 ${Math.max(1, Math.ceil(text(post.body).length / 350))} 分钟`].filter(Boolean).join(' · ') : '故事，随时可以开始';
    excerpt.textContent = post ? text(post.excerpt) : '';
    excerpt.hidden = !excerpt.textContent;
    body.textContent = post ? text(post.body) || '这一页的正文，还等着你慢慢写下。' : '这里还没有手记。写下第一篇，让这本日记慢慢变厚。';
    page.classList.toggle('diary-image-page', Boolean(illustration));
    title.closest('header')?.classList.toggle('sr-only', Boolean(illustration));
    body.hidden = Boolean(illustration);
    if (artwork) {
      artwork.hidden = !illustration;
      artwork.alt = illustration?.alt || '';
      if (illustration && opened) {
        if (artwork.getAttribute('src') !== illustration.image) artwork.src = illustration.image;
      } else {
        artwork.removeAttribute('src');
      }
    }
    if (resetScroll) {
      body.scrollTop = 0;
      page.scrollTop = 0;
    }
    const editable = Boolean(post && !illustration);
    edit.hidden = !editable;
    edit.disabled = !editable;
    if (editable) {
      edit.dataset.id = post.id;
      edit.setAttribute('aria-label', `编辑手记：${label}`);
    } else {
      delete edit.dataset.id;
      edit.removeAttribute('aria-label');
    }
    previous.disabled = index <= 0;
    next.disabled = index < 0 || index >= posts.length - 1;
    previousGrip.disabled = previous.disabled;
    nextGrip.disabled = next.disabled;
    jump.disabled = !posts.length;
    jump.value = index < 0 ? '' : String(index);
    root.querySelectorAll('[data-diary-number]').forEach(node => {
      node.textContent = posts.length ? `${String(index + 1).padStart(2, '0')} / ${String(posts.length).padStart(2, '0')}` : '00 / 00';
    });
    list.querySelectorAll('[data-diary-index]').forEach(button => {
      if (Number(button.dataset.diaryIndex) === index) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (opened) announce(post ? `第 ${index + 1} 篇，共 ${posts.length} 篇。${label}` : '还没有手记，可以写下第一篇。');
    if (opened) {
      for (const adjacent of [posts[index - 1], posts[index + 1]]) {
        if (!illustrations.includes(adjacent) || preloadedArt.has(adjacent.image)) continue;
        const image = new view.Image();
        image.decoding = 'async';
        image.fetchPriority = 'low';
        image.src = adjacent.image;
        preloadedArt.set(adjacent.image, image);
      }
    }
  }

  function renderDirectory() {
    const entries = document.createDocumentFragment();
    const options = document.createDocumentFragment();
    posts.forEach((post, position) => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'diary-toc-link';
      button.dataset.diaryIndex = String(position);
      for (const [className, value] of [
        ['diary-toc-number', String(position + 1).padStart(2, '0')],
        ['diary-toc-title', text(post.title) || '无题手记'],
        ['diary-toc-date', text(post.date)],
      ]) {
        const span = document.createElement('span');
        span.className = className;
        span.textContent = value;
        button.append(span);
      }
      item.append(button);
      entries.append(item);
      const option = document.createElement('option');
      option.value = String(position);
      option.textContent = `${String(position + 1).padStart(2, '0')} · ${text(post.title) || '无题手记'}`;
      options.append(option);
    });
    if (!posts.length) {
      const item = document.createElement('li');
      item.className = 'diary-toc-empty';
      item.textContent = '第一篇，留给今天。';
      entries.append(item);
      const option = document.createElement('option');
      option.value = '';
      option.textContent = '还没有手记';
      options.append(option);
    }
    list.replaceChildren(entries);
    jump.replaceChildren(options);
  }

  function setPosts(incoming, preferredId) {
    const oldId = current()?.id;
    const oldIndex = index;
    const oldScroll = page.scrollTop;
    const directoryHadFocus = list.contains(document.activeElement);
    cancelMotion();
    // Copy the list, preserving its source order and leaving persistence to app.js.
    const writings = Array.isArray(incoming) ? incoming.filter(post => post && typeof post === 'object').map(post => ({...post})) : [];
    posts = [...illustrations, ...writings];
    const preferred = preferredId == null ? -1 : posts.findIndex(post => post.id === preferredId);
    const retained = oldId == null ? -1 : posts.findIndex(post => post.id === oldId);
    index = preferred >= 0 ? preferred : retained >= 0 ? retained : posts.length ? Math.min(Math.max(oldIndex, 0), posts.length - 1) : -1;
    renderDirectory();
    const samePost = current()?.id === oldId && oldId != null;
    renderPage({resetScroll:!samePost});
    if (samePost) page.scrollTop = oldScroll;
    if (directoryHadFocus) focusTitle();
  }

  function openBook() {
    if (opened) return;
    cancelMotion();
    opened = true;
    closed.hidden = true;
    reader.hidden = false;
    reader.inert = true;
    openButton.setAttribute('aria-expanded', 'true');
    root.dataset.diaryState = 'opening';
    renderPage({resetScroll:false});
    const cover = coverSnapshot();
    const turning = cover ? createLeaf(cover) : null;
    const finish = () => {
      turning?.remove();
      if (leaf === turning) leaf = null;
      stableState();
      if (root.contains(document.activeElement) || document.activeElement === document.body) focusTitle();
    };
    if (turning) {
      animate(turning, [{transform:'rotateY(0deg)'}, {transform:'rotateY(-178deg)'}],
        {duration:760, easing:'cubic-bezier(.22,.1,.25,1)'}, finish);
      return;
    }
    animate(reader, [
      {opacity:0, transform:'perspective(1600px) rotateY(-12deg) scale(.965)', transformOrigin:'left center'},
      {opacity:1, transform:'perspective(1600px) rotateY(0deg) scale(1)', transformOrigin:'left center'},
    ], {duration:620, easing:'cubic-bezier(.2,.72,.2,1)'}, finish);
  }

  function closeBook() {
    if (!opened) return;
    cancelMotion();
    const focusWasInside = root.contains(document.activeElement);
    closingFocus = focusWasInside;
    opened = false;
    reader.inert = true;
    root.dataset.diaryState = 'closing';
    openButton.setAttribute('aria-expanded', 'false');
    const cover = coverSnapshot();
    const turning = cover ? createLeaf(cover) : null;
    const finish = () => {
      turning?.remove();
      if (leaf === turning) leaf = null;
      stableState();
      closingFocus = false;
      announce('日记已合上。');
      if (focusWasInside && isVisible() && !hasDialog() && (root.contains(document.activeElement) || document.activeElement === document.body)) openButton.focus({preventScroll:true});
    };
    if (turning) {
      animate(turning, [{transform:'rotateY(-178deg)'}, {transform:'rotateY(0deg)'}],
        {duration:620, easing:'cubic-bezier(.3,.1,.25,1)'}, finish);
      return;
    }
    animate(reader, [
      {opacity:1, transform:'perspective(1600px) rotateY(0deg) scale(1)', transformOrigin:'left center'},
      {opacity:0, transform:'perspective(1600px) rotateY(-12deg) scale(.965)', transformOrigin:'left center'},
    ], {duration:300, easing:'ease-in'}, finish);
  }

  function coverSnapshot() {
    const cover = closed.querySelector('.diary-cover');
    if (!cover) return null;
    const clone = cover.cloneNode(true);
    for (const node of [clone, ...clone.querySelectorAll('*')]) {
      node.removeAttribute('id');
      node.removeAttribute('tabindex');
      for (const attribute of [...node.attributes]) {
        if (attribute.name.startsWith('data-')) node.removeAttribute(attribute.name);
      }
    }
    Object.assign(clone.style, {position:'absolute', inset:'0', width:'100%', height:'100%', maxWidth:'none', margin:'0', transform:'none'});
    return clone;
  }

  function createLeaf(frontContent) {
    const pageRect = page.getBoundingClientRect();
    const spreadRect = spread.getBoundingClientRect();
    if (!pageRect.width || !pageRect.height) return null;
    const turning = document.createElement('div');
    turning.className = 'diary-turn-leaf';
    turning.setAttribute('aria-hidden', 'true');
    turning.inert = true;
    Object.assign(turning.style, {
      position:'absolute', left:`${pageRect.left - spreadRect.left - spread.clientLeft + spread.scrollLeft}px`,
      top:`${pageRect.top - spreadRect.top - spread.clientTop + spread.scrollTop}px`,
      width:`${pageRect.width}px`, height:`${pageRect.height}px`, pointerEvents:'none',
      transformOrigin:'left center', transformStyle:'preserve-3d', zIndex:'5',
    });
    const front = document.createElement('div');
    front.className = 'diary-turn-front';
    front.append(frontContent);
    const back = document.createElement('div');
    back.className = 'diary-turn-back';
    turning.append(front, back);
    spread.append(turning);
    // Detached clones cannot retain scrollTop until they have layout boxes.
    for (const [node, scrollTop] of snapshotScrolls.get(frontContent) || []) node.scrollTop = scrollTop;
    leaf = turning;
    return turning;
  }

  function pageSnapshot(position = index) {
    const clone = page.cloneNode(true);
    if (position !== index) {
      const post = posts[position];
      const illustration = illustrations.includes(post) ? post : null;
      clone.classList.toggle('diary-image-page', Boolean(illustration));
      clone.querySelector('[data-diary-title]').textContent = text(post?.title) || '无题手记';
      clone.querySelector('[data-diary-meta]').textContent = [text(post?.date), text(post?.category), `约 ${Math.max(1, Math.ceil(text(post?.body).length / 350))} 分钟`].filter(Boolean).join(' · ');
      const description = clone.querySelector('[data-diary-excerpt]');
      description.textContent = text(post?.excerpt);
      description.hidden = !description.textContent;
      clone.querySelector('header')?.classList.toggle('sr-only', Boolean(illustration));
      const story = clone.querySelector('[data-diary-body]');
      story.textContent = text(post?.body) || '这一页的正文，还等着你慢慢写下。';
      story.hidden = Boolean(illustration);
      const image = clone.querySelector('[data-diary-art]');
      if (image) {
        image.hidden = !illustration;
        if (illustration) image.src = illustration.image;
        else image.removeAttribute('src');
      }
    }
    const originalNodes = [page, ...page.querySelectorAll('*')];
    const copiedNodes = [clone, ...clone.querySelectorAll('*')];
    copiedNodes.forEach((node, position) => {
      node.removeAttribute('id');
      node.removeAttribute('tabindex');
      for (const attribute of [...node.attributes]) {
        if (attribute.name.startsWith('data-') || attribute.name.startsWith('aria-')) node.removeAttribute(attribute.name);
      }
    });
    snapshotScrolls.set(clone, copiedNodes.map((node, offset) => [node, position === index ? originalNodes[offset].scrollTop : 0]));
    // The decorative snapshot never enters focus order or delegated edit handlers.
    clone.inert = true;
    clone.setAttribute('aria-hidden', 'true');
    clone.style.position = 'absolute';
    clone.style.inset = '0';
    clone.style.margin = '0';
    clone.style.width = '100%';
    clone.style.height = '100%';
    clone.style.maxHeight = 'none';
    return clone;
  }

  function turnTo(position, {focus = true} = {}) {
    if (!opened || root.dataset.diaryState !== 'open' || !Number.isInteger(position) || position < 0 || position >= posts.length || position === index) return;
    cancelMotion();
    const direction = position > index ? 1 : -1;
    const canAnimate = !reduced.matches && isVisible();
    const oldPage = canAnimate && direction > 0 ? pageSnapshot() : null;
    index = position;
    renderPage();
    if (focus) focusTitle();
    if (!canAnimate) return;

    const turning = createLeaf(oldPage || pageSnapshot());
    if (!turning) return;
    animate(turning, [
      {transform:`rotateY(${direction > 0 ? 0 : -178}deg)`},
      {transform:`rotateY(${direction > 0 ? -178 : 0}deg)`},
    ], {duration:580, easing:'cubic-bezier(.3,.1,.25,1)'}, () => {
      turning.remove();
      if (leaf === turning) leaf = null;
    });
  }

  function applyPose() {
    if (!cover) return;
    cover.style.transform = `perspective(900px) translate3d(${pose.x}px, ${pose.y}px, 0) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg)`;
  }

  function resetPose() {
    clearCoverGesture();
    Object.assign(pose, {x:0, y:0, rx:19, ry:0, rz:-8});
    applyPose();
  }

  if (cover) {
    const inspector = document.createElement('div');
    inspector.className = 'diary-inspector';
    openButton.before(inspector);
    inspector.append(openButton);
    cover.classList.add('is-inspectable');
    for (const side of ['front', 'back']) {
      const face = document.createElement('span');
      face.className = `diary-inspection-${side}`;
      face.setAttribute('aria-hidden', 'true');
      cover.append(face);
    }
    const hint = document.createElement('span');
    hint.className = 'diary-inspection-hint';
    hint.textContent = view.matchMedia('(pointer: coarse)').matches ? '拖动挪位置 · 点“翻面”看背面' : '拖动挪位置 · Shift + 拖动转动';
    inspector.append(hint);
    const controls = document.createElement('div');
    controls.className = 'diary-inspector-tools';
    for (const [label, action] of [['翻面', () => { pose.ry += 180; applyPose(); announce('已翻转封面，可再次翻面或归位。'); }], ['归位', resetPose]]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'diary-inspector-tool';
      button.textContent = label;
      button.addEventListener('click', action);
      controls.append(button);
    }
    inspector.append(controls);
    openButton.setAttribute('aria-label', '打开手记。封面可拖动挪位置；Shift 加拖动可旋转；也可使用翻面和归位按钮。');
    applyPose();
    cover.addEventListener('pointerdown', event => {
      if (opened || !event.isPrimary || event.button !== 0 || !isVisible()) return;
      suppressOpenUntil = 0;
      const bounds = closed.getBoundingClientRect(), box = cover.getBoundingClientRect();
      clearCoverGesture();
      coverGesture = {
        id:event.pointerId, x:event.clientX, y:event.clientY, start:{...pose}, rotate:event.shiftKey,
        minX:pose.x + bounds.left + 12 - box.left, maxX:pose.x + bounds.right - 12 - box.right,
        minY:pose.y + bounds.top + 8 - box.top, maxY:pose.y + bounds.bottom - 58 - box.bottom,
        moved:false,
      };
      cover.setPointerCapture(event.pointerId);
    });
    cover.addEventListener('pointermove', event => {
      const active = coverGesture;
      if (!active || active.id !== event.pointerId) return;
      const dx = event.clientX - active.x, dy = event.clientY - active.y;
      if (!active.moved && Math.hypot(dx, dy) < 5) return;
      active.moved = true;
      cover.classList.add('is-inspecting');
      if (event.cancelable) event.preventDefault();
      if (active.rotate) {
        pose.ry = active.start.ry + dx * .7;
        pose.rx = Math.max(-60, Math.min(65, active.start.rx - dy * .45));
      } else {
        pose.x = Math.max(active.minX, Math.min(active.maxX, active.start.x + dx));
        pose.y = Math.max(Math.min(active.minY, active.maxY), Math.min(Math.max(active.minY, active.maxY), active.start.y + dy));
      }
      applyPose();
    });
    const finishInspection = event => {
      if (!coverGesture || coverGesture.id !== event.pointerId) return;
      if (coverGesture.moved) suppressOpenUntil = view.performance.now() + 500;
      clearCoverGesture();
    };
    cover.addEventListener('pointerup', finishInspection);
    cover.addEventListener('pointercancel', finishInspection);
    cover.addEventListener('lostpointercapture', finishInspection);
    openButton.addEventListener('keydown', event => {
      if (opened || event.altKey || event.ctrlKey || event.metaKey) return;
      const arrows = {ArrowLeft:[-1, 0], ArrowRight:[1, 0], ArrowUp:[0, -1], ArrowDown:[0, 1]};
      if (event.key === 'Home') { event.preventDefault(); resetPose(); }
      else if (arrows[event.key]) {
        event.preventDefault();
        const [x, y] = arrows[event.key];
        if (event.shiftKey) {
          pose.ry += x * 15;
          pose.rx = Math.max(-60, Math.min(65, pose.rx - y * 10));
        } else {
          pose.x = Math.max(-closed.clientWidth * .22, Math.min(closed.clientWidth * .22, pose.x + x * 12));
          pose.y = Math.max(-36, Math.min(36, pose.y + y * 12));
        }
        applyPose();
      }
    });
  }

  openButton.addEventListener('pointerdown', () => { suppressOpenUntil = 0; });
  openButton.addEventListener('click', event => {
    if (event.detail !== 0 && view.performance.now() < suppressOpenUntil) { event.preventDefault(); return; }
    openBook();
  });
  closeButton.addEventListener('click', closeBook);
  previous.addEventListener('click', () => turnTo(index - 1));
  next.addEventListener('click', () => turnTo(index + 1));
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-diary-index]');
    if (button && list.contains(button)) turnTo(Number(button.dataset.diaryIndex));
  });
  jump.addEventListener('change', () => turnTo(Number(jump.value)));
  root.addEventListener('keydown', event => {
    if (!opened || !isVisible() || hasDialog() || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeBook();
    } else if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && view.getSelection()?.isCollapsed !== false) {
      const position = index + (event.key === 'ArrowRight' ? 1 : -1);
      if (position >= 0 && position < posts.length) {
        event.preventDefault();
        turnTo(position);
      }
    }
  });
  spread.addEventListener('click', event => {
    if (event.detail !== 0 && view.performance.now() < suppressPageUntil) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
  spread.addEventListener('pointerdown', event => {
    suppressPageUntil = 0;
    const grip = event.target.closest('[data-diary-grip]');
    if (!opened || root.dataset.diaryState !== 'open' || !event.isPrimary || event.button !== 0 || (!page.contains(event.target) && !grip)) return;
    if (!grip && event.target.closest('button, a, input, textarea, select, [contenteditable]')) return;
    if (view.getSelection()?.isCollapsed === false) return;
    const box = page.getBoundingClientRect();
    const edge = event.clientX - box.left < 25 || box.right - event.clientX < 25;
    if (event.pointerType === 'mouse' && !page.classList.contains('diary-image-page') && !grip && !edge) return;
    cancelMotion();
    gesture = {id:event.pointerId, x:event.clientX, y:event.clientY, scroll:page.scrollTop, width:box.width, progress:0, active:false};
  });
  spread.addEventListener('pointermove', event => {
    const active = gesture;
    if (!active || active.id !== event.pointerId) return;
    const dx = event.clientX - active.x, dy = event.clientY - active.y;
    if (!active.active) {
      if (Math.abs(page.scrollTop - active.scroll) > 8 || (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx))) { clearPageGesture(); return; }
      if (Math.abs(dx) < 9 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      active.direction = dx < 0 ? 1 : -1;
      active.target = index + active.direction;
      if (active.target < 0 || active.target >= posts.length) { clearPageGesture(); return; }
      active.active = true;
      spread.classList.add('is-page-dragging');
      spread.setPointerCapture(event.pointerId);
      if (!reduced.matches) {
        active.turning = createLeaf(pageSnapshot(active.direction > 0 ? index : active.target));
        if (active.turning && active.direction > 0) {
          dragPreview = document.createElement('div');
          dragPreview.className = 'diary-drag-preview';
          dragPreview.setAttribute('aria-hidden', 'true');
          dragPreview.inert = true;
          Object.assign(dragPreview.style, {
            position:'absolute', left:active.turning.style.left, top:active.turning.style.top,
            width:active.turning.style.width, height:active.turning.style.height,
          });
          dragPreview.append(pageSnapshot(active.target));
          spread.insertBefore(dragPreview, active.turning);
        }
      }
    }
    if (event.cancelable) event.preventDefault();
    active.progress = Math.max(0, Math.min(1, -dx * active.direction / (active.width * .85)));
    active.angle = active.direction > 0 ? -178 * active.progress : -178 * (1 - active.progress);
    if (active.turning) {
      active.turning.style.transform = `rotateY(${active.angle}deg)`;
      active.turning.style.setProperty('--diary-fold-shade', String(Math.sin(active.progress * Math.PI) * .22));
    }
  });
  function finishPageDrag(event, canceled = false) {
    const active = gesture;
    if (!active || active.id !== event.pointerId) return;
    gesture = null;
    spread.classList.remove('is-page-dragging');
    releaseCapture(spread, active.id);
    if (!active.active) return;
    suppressPageUntil = view.performance.now() + 500;
    const commit = !canceled && active.progress >= .28;
    if (commit) { index = active.target; renderPage(); focusTitle(); }
    const finish = () => {
      active.turning?.remove();
      if (leaf === active.turning) leaf = null;
      dragPreview?.remove();
      dragPreview = null;
    };
    if (!active.turning) { finish(); return; }
    const angle = active.direction > 0 ? (commit ? -178 : 0) : (commit ? 0 : -178);
    animate(active.turning, [{transform:`rotateY(${active.angle}deg)`}, {transform:`rotateY(${angle}deg)`}],
      {duration:Math.round(150 + Math.abs(angle - active.angle) * 1.4), easing:'cubic-bezier(.2,.7,.2,1)'}, finish);
  }
  spread.addEventListener('pointerup', event => finishPageDrag(event));
  spread.addEventListener('pointercancel', event => finishPageDrag(event, true));
  spread.addEventListener('lostpointercapture', event => {
    // Touch initially captures the image implicitly. Moving capture to the spread
    // bubbles a loss from that image; only the spread losing its own capture ends a drag.
    if (event.target === spread) finishPageDrag(event, true);
  });

  // Navigation keeps sections mounted but hides them. Cancel snapshots immediately
  // so returning to the diary always shows a stable, current page.
  const observer = new MutationObserver(() => {
    if (!isVisible()) cancelMotion();
  });
  for (let ancestor = root; ancestor; ancestor = ancestor.parentElement) {
    observer.observe(ancestor, {attributes:true, attributeFilter:['hidden', 'inert']});
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelMotion(); });
  view.addEventListener('resize', () => { cancelMotion(); resetPose(); }, {passive:true});
  reduced.addEventListener('change', cancelMotion);
  const controller = {setPosts};
  mountedBooks.set(root, controller);
  stableState();
  setPosts([]);
  return controller;
}
