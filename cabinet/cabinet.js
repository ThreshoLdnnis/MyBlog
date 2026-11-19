const STORAGE_KEY = 'feiyang-cabinet-v1';
const imageUrl = file => new URL(`./assets/${file}`, import.meta.url).href;
const inspirations = [
  {id:'skullpanda',name:'The Timelapse',series:'SKULLPANDA · Image of Reality',image:imageUrl('skullpanda.webp'),story:'把时间变成一件可以放在书桌上的小小艺术品。',source:'https://www.popmart.com/us/products/953'},
  {id:'hirono',name:'The Aviator',series:'HIRONO · Little Mischief',image:imageUrl('hirono.webp'),story:'纸箱做的飞机，也能装下一整个远方。',source:'https://www.popmart.com/us/products/13/HIRONO-Little-Mischief-Series'},
  {id:'labubu',name:'Soymilk',series:'LABUBU · Exciting Macaron',image:imageUrl('labubu.webp'),story:'给日常留一点柔软，也留一点不必解释的可爱。',source:'https://www.popmart.com/us/products/675/the-monsters-exciting-macaron-vinyl-face-blind-box'},
  {id:'dimoo',name:'Between Dreams and Reality',series:'DIMOO · Into the Dreamscape',image:imageUrl('dimoo.webp'),story:'在梦与现实之间，收藏一个不想长大的瞬间。',source:'https://www.popmart.com/us/products/9557/dimoo-world-into-the-dreamscape-series-figures'},
];

const MAX_ITEMS = 24;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_BACKUP_BYTES = 8 * 1024 * 1024;

function validateCollection(value) {
  if (!Array.isArray(value) || value.length > MAX_ITEMS) throw new Error('收藏格式无效，或超过 24 件上限。');
  const ids = new Set();
  return value.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item) ||
        typeof item.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(item.id) || ids.has(item.id) ||
        typeof item.name !== 'string' || !item.name.trim() || item.name.length > 60 ||
        typeof item.series !== 'string' || !item.series.trim() || item.series.length > 80 ||
        typeof item.story !== 'string' || item.story.length > 600 ||
        typeof item.image !== 'string' || item.image.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 40) {
      throw new Error('收藏字段无效，请使用此展柜导出的 JSON 备份。');
    }
    const match = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(item.image);
    if (!match || match[2].length < 16 || match[2].length % 4 !== 0) throw new Error('照片必须是有效的 JPG、PNG 或 WebP 数据。');
    let bytes;
    try { bytes = atob(match[2]); } catch { throw new Error('照片数据已损坏。'); }
    const signatureOK = match[1] === 'png' ? bytes.startsWith('\x89PNG\r\n\x1a\n') :
      match[1] === 'jpeg' ? bytes.startsWith('\xff\xd8\xff') :
      bytes.startsWith('RIFF') && bytes.slice(8,12) === 'WEBP';
    if (!signatureOK || bytes.length > MAX_IMAGE_BYTES) throw new Error('照片格式不匹配，或超过 2 MB。');
    ids.add(item.id);
    return {id:item.id,name:item.name.trim(),series:item.series.trim(),story:item.story.trim(),image:item.image};
  });
}

function readCollection() {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return {items:validateCollection(value),error:''};
  } catch { return {items:[],error:'未能读取本地收藏。请检查浏览器存储设置，或导入之前的备份。'}; }
}

/** Mount an isolated, framework-free collectible cabinet. */
export function mountCabinet(element) {
  if (!element) return;
  if (element.dataset.cabinetMounted) return;
  element.dataset.cabinetMounted = 'true';
  element.classList.add('cabinet');
  const saved = readCollection();
  let own = saved.items, mode = own.length ? 'own' : 'inspiration';
  let selected = mode === 'own' ? 0 : 1, cards = [], activeItem, returnFocus;
  let editorGeneration = 0, importGeneration = 0, destroyed = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  element.innerHTML = `
    <div class="cabinet-toolbar">
      <div class="cabinet-tabs" role="group" aria-label="手办陈列分类">
        <button type="button" data-mode="inspiration">灵感展柜</button>
        <button type="button" data-mode="own">我的收藏 <span data-own-count>0</span></button>
      </div>
      <button class="cabinet-add" type="button">添加我的手办</button>
    </div>
    <div class="cabinet-stage" tabindex="0" role="region" aria-label="立体手办卡片陈列，左右方向键切换，Enter 查看详情">
      <div class="cabinet-rail"></div>
      <div class="cabinet-empty" hidden><p>下一位小小住客，会是谁？</p><span>上传第一张手办照片，开始你的私人收藏。</span><button type="button">添加第一件收藏</button></div>
    </div>
    <div class="cabinet-caption">
      <div><span class="cabinet-edition">OBJECTS OF AFFECTION</span><h3 class="cabinet-name"></h3><p class="cabinet-series"></p></div>
      <div class="cabinet-switcher"><button type="button" class="cabinet-prev" aria-label="上一件手办">上一件</button><span class="cabinet-counter" aria-live="polite"></span><button type="button" class="cabinet-next" aria-label="下一件手办">下一件</button></div>
    </div>
    <div class="cabinet-bottom"><p class="cabinet-note" role="status" aria-live="polite">拖动探索 · 点击近看 · 灵感样例不代表已拥有</p><div class="cabinet-backup"><button type="button" class="cabinet-export">导出收藏</button><button type="button" class="cabinet-import">导入收藏</button><input type="file" class="cabinet-import-file" accept="application/json,.json" aria-label="选择手办收藏 JSON 备份" hidden></div></div>
    <dialog class="cabinet-dialog cabinet-detail" aria-label="手办收藏详情"><button type="button" class="cabinet-close" aria-label="关闭手办详情">关闭</button><div class="cabinet-detail-grid"><img class="cabinet-detail-image" alt=""><div><span class="cabinet-edition cabinet-detail-status"></span><h3 class="cabinet-detail-name"></h3><p class="cabinet-detail-series"></p><p class="cabinet-detail-story"></p><a class="cabinet-source" target="_blank" rel="noopener noreferrer">查看 POP MART 官方出处</a><button type="button" class="cabinet-remove" hidden>移出我的收藏</button><p class="cabinet-detail-error" role="alert"></p></div></div></dialog>
    <dialog class="cabinet-dialog cabinet-editor" aria-label="添加我的手办收藏"><form class="cabinet-form"><div class="cabinet-form-top"><span class="cabinet-edition">A NEW LITTLE FRIEND</span><button type="button" class="cabinet-close" aria-label="关闭添加手办">关闭</button></div><h3>让喜欢的东西，<br>有一个小小位置。</h3><label>手办名称<input name="name" maxlength="60" placeholder="例如：我的第一只小野" required></label><label>角色 / 系列<input name="series" maxlength="80" placeholder="例如：HIRONO · 小小乐园" required></label><label>收藏照片<input name="image" type="file" accept="image/jpeg,image/png,image/webp" required><small>JPG / PNG / WebP，最大 2 MB。</small></label><label>关于它的故事<textarea name="story" maxlength="600" rows="3" placeholder="第一次遇见它的时候……"></textarea></label><p class="cabinet-error" role="alert"></p><p class="cabinet-storage-note">保存在此浏览器中；可通过导出 / 导入收藏备份和转移。</p><button class="cabinet-submit" type="submit">放进我的展柜</button></form></dialog>`;
  const $ = selector => element.querySelector(selector);
  const stage = $('.cabinet-stage'), rail = $('.cabinet-rail');
  const detail = $('.cabinet-detail'), editor = $('.cabinet-editor'), form = $('.cabinet-form');
  const currentItems = () => mode === 'own' ? own : inspirations;
  const announce = text => { $('.cabinet-note').textContent = text; };

  function position() {
    const list = currentItems();
    const step = Math.min(272, stage.clientWidth * .3);
    cards.forEach((card, index) => {
      let offset = index - selected;
      // Four-item collection keeps a central object and neighboring silhouettes visible.
      const isSelected = index === selected;
      card.style.setProperty('--cab-x', `${offset * step}px`);
      card.style.setProperty('--cab-z', `${-Math.min(Math.abs(offset), 3) * 130}px`);
      card.style.setProperty('--cab-y', `${Math.min(Math.abs(offset), 3) * 13}px`);
      card.style.setProperty('--cab-turn', `${offset === 0 ? -3 : offset > 0 ? -19 : 19}deg`);
      card.style.zIndex = String(10 - Math.abs(offset));
      card.classList.toggle('is-current', isSelected);
      card.setAttribute('aria-pressed', String(isSelected));
      card.tabIndex = Math.abs(offset) <= 1 ? 0 : -1;
      card.style.visibility = Math.abs(offset) > 3 ? 'hidden' : 'visible';
    });
    const item = list[selected];
    $('.cabinet-name').textContent = item?.name || 'Your collection starts here';
    $('.cabinet-series').textContent = item?.series || '每一件喜欢，都值得被认真陈列。';
    $('.cabinet-counter').textContent = `${String(list.length ? selected + 1 : 0).padStart(2,'0')} / ${String(list.length).padStart(2,'0')}`;
    $('.cabinet-prev').disabled = $('.cabinet-next').disabled = list.length < 2;
  }

  function render() {
    const list = currentItems();
    selected = Math.max(0, Math.min(selected, list.length - 1));
    rail.replaceChildren();
    cards = list.map((item, index) => {
      const card = document.createElement('button');
      card.type = 'button'; card.className = 'cabinet-object';
      card.setAttribute('aria-label', `${item.name}，${item.series}，点击查看`);
      const img = document.createElement('img');
      img.src = item.image; img.alt = item.name; img.draggable = false; img.loading = 'lazy';
      const number = document.createElement('span');
      number.className = 'cabinet-object-number'; number.textContent = String(index + 1).padStart(2,'0');
      const badge = document.createElement('span');
      badge.className = 'cabinet-object-badge'; badge.textContent = mode === 'own' ? 'MY COLLECTION' : 'INSPIRATION';
      card.append(img, number, badge);
      card.addEventListener('click', () => {
        if (suppressClick) return;
        if (selected === index) showDetails(item, card);
        else { selected = index; position(); }
      });
      rail.append(card); return card;
    });
    $('.cabinet-empty').hidden = list.length !== 0;
    $('.cabinet-caption').hidden = !list.length;
    $('[data-own-count]').textContent = own.length;
    element.querySelectorAll('[data-mode]').forEach(tab => tab.setAttribute('aria-pressed', String(tab.dataset.mode === mode)));
    announce(mode === 'own' ? '拖动探索 · 点击近看 · 收藏保存在此浏览器' : '拖动探索 · 点击近看 · 灵感样例不代表已拥有');
    position();
  }

  function select(delta) {
    const list = currentItems();
    if (!list.length) return;
    selected = (selected + delta + list.length) % list.length;
    position();
  }

  function openDialog(dialog, origin) {
    returnFocus = origin || document.activeElement;
    dialog.showModal();
  }
  function cancelEditor() { editorGeneration++; $('.cabinet-submit').disabled = false; }
  function closeDialog(dialog) { if (dialog === editor) cancelEditor(); dialog.close(); }
  [detail,editor].forEach(dialog => {
    dialog.querySelector('.cabinet-close').addEventListener('click', () => closeDialog(dialog));
    dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog); } });
    dialog.addEventListener('close', () => { if (!dialog.open) { if (dialog === editor) cancelEditor(); returnFocus?.focus?.({preventScroll:true}); } });
  });
  editor.addEventListener('cancel', cancelEditor);

  function showDetails(item, origin) {
    activeItem = item;
    $('.cabinet-detail-error').textContent = '';
    $('.cabinet-detail-image').src = item.image;
    $('.cabinet-detail-image').alt = item.name;
    $('.cabinet-detail-name').textContent = item.name;
    $('.cabinet-detail-series').textContent = item.series;
    $('.cabinet-detail-story').textContent = item.story || '故事还在慢慢发生。';
    $('.cabinet-detail-status').textContent = mode === 'own' ? 'FROM MY COLLECTION' : 'INSPIRATION · 灵感样例';
    $('.cabinet-source').hidden = !item.source;
    if (item.source) $('.cabinet-source').href = item.source;
    $('.cabinet-remove').hidden = mode !== 'own';
    openDialog(detail, origin);
  }

  function showEditor() { cancelEditor(); form.reset(); $('.cabinet-error').textContent = ''; openDialog(editor); }
  $('.cabinet-add').addEventListener('click', showEditor);
  $('.cabinet-empty button').addEventListener('click', showEditor);
  $('.cabinet-prev').addEventListener('click', () => select(-1));
  $('.cabinet-next').addEventListener('click', () => select(1));
  element.querySelectorAll('[data-mode]').forEach(tab => tab.addEventListener('click', () => { mode = tab.dataset.mode; selected = 0; render(); }));

  $('.cabinet-remove').addEventListener('click', () => {
    if (!activeItem || mode !== 'own') return;
    const updated = own.filter(item => item.id !== activeItem.id);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); }
    catch { $('.cabinet-detail-error').textContent = '浏览器未能保存修改，请检查存储设置。'; return; }
    own = updated; closeDialog(detail); render(); $('.cabinet-add').focus();
  });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!editor.open || $('.cabinet-submit').disabled) return;
    const file = form.elements.image.files[0];
    const name = form.elements.name.value.trim(), series = form.elements.series.value.trim(), story = form.elements.story.value.trim();
    const error = $('.cabinet-error'), submit = $('.cabinet-submit');
    error.textContent = '';
    if (!name || !series || name.length > 60 || series.length > 80 || story.length > 600) { error.textContent = '请填写符合长度要求的手办名称、系列与故事。'; return; }
    if (!file || !['image/jpeg','image/png','image/webp'].includes(file.type) || file.size > MAX_IMAGE_BYTES) { error.textContent = '请选择 2 MB 以内的 JPG、PNG 或 WebP 图片。'; return; }
    if (own.length >= MAX_ITEMS) { error.textContent = '此浏览器的展柜已达 24 件，请先移除不再需要的收藏。'; return; }
    const generation = ++editorGeneration;
    const isCurrent = () => !destroyed && editor.open && generation === editorGeneration;
    submit.disabled = true;
    try {
      const dataUrl = await new Promise((resolve,reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
      if (!isCurrent()) return;
      await new Promise((resolve,reject) => { const img = new Image(); img.onload = resolve; img.onerror = reject; img.src = dataUrl; });
      if (!isCurrent()) return;
      const item = {id:globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`,name,series,story,image:dataUrl};
      const updated = validateCollection([...own,item]);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      own = updated; mode = 'own'; selected = own.length - 1;
      closeDialog(editor); render(); stage.focus();
    } catch { if (isCurrent()) error.textContent = '暂时无法保存。请试试更小的图片，并确认浏览器允许本地存储。'; }
    finally { if (isCurrent()) submit.disabled = false; }
  });

  $('.cabinet-export').addEventListener('click', () => {
    let url;
    try {
      const payload = {format:'feiyang-cabinet',version:1,items:validateCollection(own)};
      url = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url; link.download = 'feiyang-cabinet.json';
      document.body.append(link); link.click(); link.remove();
      announce(`已导出 ${own.length} 件个人收藏，请保管好 JSON 备份。`);
    } catch { announce('暂时无法导出收藏，请检查浏览器下载设置。'); }
    finally { if (url) setTimeout(() => URL.revokeObjectURL(url),1000); }
  });
  $('.cabinet-import').addEventListener('click', () => { $('.cabinet-import-file').value = ''; $('.cabinet-import-file').click(); });
  $('.cabinet-import-file').addEventListener('change', async event => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) { announce('备份过大，请选择 8 MB 以内的收藏 JSON。'); return; }
    const generation = ++importGeneration;
    const isCurrent = () => !destroyed && generation === importGeneration;
    const button = $('.cabinet-import'); button.disabled = true;
    try {
      const text = await file.text();
      if (!isCurrent()) return;
      let payload;
      try { payload = JSON.parse(text); } catch { throw new Error('无法读取 JSON，请选择此展柜导出的备份。'); }
      if (!payload || payload.format !== 'feiyang-cabinet' || payload.version !== 1) throw new Error('备份版本或格式不受支持。');
      const incoming = validateCollection(payload.items);
      await Promise.all(incoming.map(item => new Promise((resolve,reject) => { const img = new Image(); img.onload = resolve; img.onerror = () => reject(new Error('备份中的照片无法读取。')); img.src = item.image; })));
      if (!isCurrent()) return;
      const knownIds = new Set(own.map(item => item.id));
      const added = incoming.filter(item => !knownIds.has(item.id));
      const updated = validateCollection([...own,...added]);
      try { localStorage.setItem(STORAGE_KEY,JSON.stringify(updated)); } catch { throw new Error('浏览器空间不足或存储被禁用，原收藏保持不变。'); }
      own = updated; mode = 'own'; selected = 0; render();
      announce(`已导入 ${added.length} 件收藏，跳过 ${incoming.length - added.length} 件重复记录。原收藏已保留。`);
    } catch (error) { if (isCurrent()) announce(error.message || '导入失败，原收藏保持不变。'); }
    finally { if (isCurrent()) button.disabled = false; }
  });

  let drag = null, suppressClick = false;
  stage.addEventListener('pointerdown', event => {
    if (!event.isPrimary || drag || event.button !== 0 || event.target.closest('.cabinet-empty')) return;
    drag = {x:event.clientX,y:event.clientY,id:event.pointerId,moved:false};
    suppressClick = false;
  });
  stage.addEventListener('pointermove', event => {
    if (!drag) {
      if (event.pointerType === 'mouse' && !reducedMotion.matches) {
        const rect = stage.getBoundingClientRect();
        rail.style.setProperty('--cab-parallax', `${(event.clientX - rect.left - rect.width / 2) / rect.width * 6}deg`);
      }
      return;
    }
    if (event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (!drag.moved && Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) { drag = null; return; }
    if (Math.abs(dx) > 8) {
      drag.moved = true; suppressClick = true;
      if (!stage.hasPointerCapture(event.pointerId)) stage.setPointerCapture(event.pointerId);
      rail.style.setProperty('--cab-drag', `${Math.max(-110,Math.min(110,dx))}px`);
      stage.classList.add('is-dragging');
    }
  });
  function endDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const dx = event.clientX - drag.x;
    if (drag.moved && Math.abs(dx) > 35) select(dx > 0 ? -1 : 1);
    resetDrag(event);
  }
  function resetDrag(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const id = drag.id;
    drag = null;
    if (stage.hasPointerCapture(id)) stage.releasePointerCapture(id);
    rail.style.setProperty('--cab-drag','0px'); stage.classList.remove('is-dragging');
    setTimeout(() => { suppressClick = false; },0);
  }
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', resetDrag);
  stage.addEventListener('lostpointercapture', resetDrag);
  window.addEventListener('pointerup', endDrag);
  window.addEventListener('pointercancel', resetDrag);
  stage.addEventListener('pointerleave', () => { if (!drag) rail.style.setProperty('--cab-parallax','0deg'); });
  stage.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); select(event.key === 'ArrowLeft' ? -1 : 1); cards[selected]?.focus({preventScroll:true}); }
    if (event.key === 'Enter' && event.target === stage && currentItems()[selected]) showDetails(currentItems()[selected], stage);
  });
  const resize = new ResizeObserver(position); resize.observe(stage);
  render();
  if (saved.error) announce(saved.error);
  return {refresh:render,destroy(){ destroyed = true; editorGeneration++; importGeneration++; window.removeEventListener('pointerup',endDrag); window.removeEventListener('pointercancel',resetDrag); resize.disconnect(); element.replaceChildren(); delete element.dataset.cabinetMounted; }};
}
