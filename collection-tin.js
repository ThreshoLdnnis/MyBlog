/* A hinged keepsake tin. Content and persistence remain owned by app.js. */
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const controllers = new WeakMap();
const labels = {探店:'A GOOD PLACE', 工具:'A USEFUL FIND', 地点:'SOMEWHERE', 物品:'LITTLE OBJECT', 语录:'WORDS TO KEEP', 说说:'A SMALL THOUGHT', 音乐:'ON REPEAT'};

function printArtwork() {
  return `<span class="tin-print" aria-hidden="true">
    <span class="tin-print-border"></span><span class="tin-print-brand">MOFARIGANO'S</span>
    <span class="tin-print-title">Little<br><em>Treasures</em></span>
    <span class="tin-print-ribbon">THE THINGS THAT MAKE A LIFE</span>
    <svg class="tin-print-sprig tin-print-sprig-left" viewBox="0 0 130 170" fill="none"><path d="M76 157C25 103 87 78 57 16M56 96C27 77 19 58 25 41M62 71C93 61 103 44 105 23" stroke="currentColor" stroke-width="3"/><g fill="currentColor"><ellipse cx="48" cy="132" rx="9" ry="22" transform="rotate(-39 48 132)"/><ellipse cx="69" cy="111" rx="9" ry="20" transform="rotate(25 69 111)"/><ellipse cx="37" cy="73" rx="8" ry="19" transform="rotate(-45 37 73)"/><ellipse cx="65" cy="53" rx="9" ry="20" transform="rotate(31 65 53)"/><ellipse cx="49" cy="32" rx="8" ry="18" transform="rotate(-35 49 32)"/><ellipse cx="92" cy="47" rx="8" ry="18" transform="rotate(35 92 47)"/></g><g fill="#a83b33"><circle cx="25" cy="35" r="7"/><circle cx="104" cy="20" r="7"/><circle cx="57" cy="13" r="7"/></g></svg>
    <svg class="tin-print-sprig tin-print-sprig-right" viewBox="0 0 130 170" fill="none"><path d="M76 157C25 103 87 78 57 16M56 96C27 77 19 58 25 41M62 71C93 61 103 44 105 23" stroke="currentColor" stroke-width="3"/><g fill="currentColor"><ellipse cx="48" cy="132" rx="9" ry="22" transform="rotate(-39 48 132)"/><ellipse cx="69" cy="111" rx="9" ry="20" transform="rotate(25 69 111)"/><ellipse cx="37" cy="73" rx="8" ry="19" transform="rotate(-45 37 73)"/><ellipse cx="65" cy="53" rx="9" ry="20" transform="rotate(31 65 53)"/><ellipse cx="49" cy="32" rx="8" ry="18" transform="rotate(-35 49 32)"/><ellipse cx="92" cy="47" rx="8" ry="18" transform="rotate(35 92 47)"/></g><g fill="#a83b33"><circle cx="25" cy="35" r="7"/><circle cx="104" cy="20" r="7"/><circle cx="57" cy="13" r="7"/></g></svg>
    <span class="tin-print-bottom">CURIOUS FINDS &amp; EVERYDAY DELIGHTS</span><span class="tin-print-star">✷</span>
  </span>`;
}

function variant(entry, image) {
  if (entry.category === '音乐') return 'record';
  if (entry.category === '工具') return 'ticket';
  if (entry.category === '物品') return 'book';
  if (image) return 'photo';
  return entry.category === '语录' ? 'quote' : 'note';
}

function card(entry, index, options) {
  const image = options.safeImage(entry.image);
  const type = variant(entry, image);
  const saved = options.saved.has(entry.id);
  const title = escape(entry.title);
  const category = escape(entry.category || '收藏');
  const label = labels[entry.category] || 'A LITTLE TREASURE';
  const visual = type === 'record'
    ? `<span class="tin-vinyl" aria-hidden="true"><span class="tin-record-label">${image ? `<img src="${escape(image)}" alt="" loading="lazy" decoding="async">` : '<span>♫</span>'}</span></span>`
    : image ? `<span class="tin-card-image"><img src="${escape(image)}" alt="" loading="lazy" decoding="async"></span>` : '';
  return `<article class="tin-card tin-card-${type} tin-slot-${index}">
    <span class="tin-fastener" aria-hidden="true"></span>
    <button type="button" class="tin-card-main" data-collection="${escape(entry.id)}" aria-label="打开收藏：${title}" aria-haspopup="dialog">
      <span class="tin-card-label">${escape(label)}</span>${visual}
      <h3>${title}</h3><p>${escape(entry.subtitle || '')}</p>
      ${type === 'ticket' ? '<span class="tin-ticket-barcode" aria-hidden="true"></span>' : ''}
    </button>
    <div class="tin-card-foot"><span>${category}</span><button type="button" class="tin-save ${saved ? 'saved' : ''}" data-save="${escape(entry.id)}" aria-label="${saved ? '取消标记' : '标记喜欢'}：${title}" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button></div>
  </article>`;
}

export function mountCollectionTin(section) {
  if (!section) return {render(){}, open(){}, destroy(){}};
  if (controllers.has(section)) return controllers.get(section);
  const scene = section.querySelector('#collection-grid');
  const status = section.querySelector('[data-tin-status]');
  const count = section.querySelector('[data-tin-count]');
  const close = section.querySelector('[data-tin-close]');
  const pageNumber = section.querySelector('[data-tin-page]');
  const pager = section.querySelector('[data-tin-pager]');
  const previous = section.querySelector('[data-tin-prev]');
  const next = section.querySelector('[data-tin-next]');
  const compact = matchMedia('(max-width: 700px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  let entries = [], options = {saved:new Set(),safeImage:()=>'',query:''}, page = 0, key = '', opened = false;
  scene.innerHTML = `<div class="tin-object">
    <div class="tin-lid">
      <button type="button" class="tin-face tin-front" data-tin-open aria-label="打开我的宝藏铁盒" aria-expanded="false" aria-controls="tin-lid-contents tin-base-contents">${printArtwork()}</button>
      <div class="tin-face tin-back"><div class="tin-tray"><span class="tin-tray-engraving" aria-hidden="true">A FEW OF MY FAVOURITE THINGS.</span><div class="tin-items" data-tin-lid></div></div></div>
    </div>
    <div class="tin-base"><div class="tin-tray"><span class="tin-tray-engraving" aria-hidden="true">KEEP WHAT YOU LOVE.</span><div class="tin-items" data-tin-base></div></div></div>
    <span class="tin-hinge tin-hinge-left" aria-hidden="true"></span><span class="tin-hinge tin-hinge-right" aria-hidden="true"></span><span class="tin-clasp" aria-hidden="true"></span>
  </div><p class="tin-open-hint"><span aria-hidden="true">✧</span> 轻轻打开，看看里面。</p>`;
  const lidItems = scene.querySelector('[data-tin-lid]');
  const baseItems = scene.querySelector('[data-tin-base]');
  const opener = scene.querySelector('[data-tin-open]');
  lidItems.id = 'tin-lid-contents'; baseItems.id = 'tin-base-contents';
  lidItems.setAttribute('aria-label','盒盖里的收藏'); baseItems.setAttribute('aria-label','盒底里的收藏');
  section.dataset.tinState = 'closed';

  function setOpen(value, focus = false, announce = true) {
    opened = Boolean(value);
    section.dataset.tinState = opened ? 'open' : 'closed';
    opener.setAttribute('aria-expanded', String(opened));
    opener.inert = opened;
    lidItems.inert = baseItems.inert = !opened;
    lidItems.setAttribute('aria-hidden',String(!opened)); baseItems.setAttribute('aria-hidden',String(!opened));
    close.hidden = !opened;
    pager.hidden = !opened || entries.length <= pageSize();
    scene.style.removeProperty('--tin-hover-x'); scene.style.removeProperty('--tin-hover-y');
    if (focus) (opened ? close : opener).focus({preventScroll:true});
    if (status && announce) status.textContent = opened ? `铁盒已打开，${entries.length} 件收藏。` : '铁盒已合上。';
  }
  const pageSize = () => compact.matches ? 4 : 6;
  function renderPage() {
    const maxPage = Math.max(0,Math.ceil(entries.length / pageSize()) - 1);
    page = Math.min(page,maxPage);
    const visible = entries.slice(page * pageSize(),(page + 1) * pageSize());
    const half = Math.ceil(visible.length / 2);
    lidItems.innerHTML = visible.slice(0,half).map((entry,index)=>card(entry,index,options)).join('');
    baseItems.innerHTML = visible.slice(half).map((entry,index)=>card(entry,index,options)).join('');
    if (!visible.length) {
      lidItems.innerHTML = `<div class="tin-empty-note"><span>ROOM FOR SOMETHING GOOD</span><h3>${options.query ? '这次还没找到。' : '下一份心动，留在这里。'}</h3><p>${options.query ? '换个关键词，或看看其他分类。' : '一张照片、一个地方，或一句舍不得忘的话。'}</p><button type="button" data-edit="collections">收藏一份心动 ＋</button></div>`;
    }
    lidItems.dataset.count = String(half); baseItems.dataset.count = String(visible.length-half);
    lidItems.inert = baseItems.inert = !opened;
    count.textContent = `${entries.length} 件心动`;
    pageNumber.textContent = `${page + 1} / ${maxPage + 1}`;
    previous.disabled = page === 0; next.disabled = page === maxPage;
    pager.hidden = !opened || maxPage === 0;
    if (status && opened) status.textContent = `${entries.length} 件收藏，当前第 ${page+1} 层，共 ${maxPage+1} 层。`;
  }
  function render(list, settings = {}) {
    const active = document.activeElement;
    const focusedSave = active?.closest?.('[data-save]');
    const focusId = section.contains(focusedSave) ? focusedSave.dataset.save : null;
    const incomingKey = list.map(entry=>entry.id).join('\u001f');
    if (incomingKey !== key || settings.query !== options.query) page = 0;
    key = incomingKey; entries = list; options = {...options,...settings};
    renderPage();
    if (focusId) [...scene.querySelectorAll('[data-save]')].find(button=>button.dataset.save===focusId)?.focus({preventScroll:true});
  }
  section.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.hasAttribute('data-tin-open')) setOpen(true,true);
    if (button.hasAttribute('data-tin-close')) setOpen(false,true);
    if (button.hasAttribute('data-tin-prev') || button.hasAttribute('data-tin-next')) {
      page += button.hasAttribute('data-tin-next') ? 1 : -1;
      page = Math.max(0,page); renderPage();
      scene.querySelector('[data-collection]')?.focus({preventScroll:true});
      scene.scrollIntoView({block:'start',behavior:reduced.matches?'instant':'smooth'});
    }
    if (button.closest('#collection-filters')) setOpen(true);
  }, {signal:abort.signal});
  section.querySelector('#collection-search').addEventListener('input',()=>setOpen(true,false,false),{signal:abort.signal});
  scene.addEventListener('pointermove', event => {
    if (opened || reduced.matches || event.pointerType !== 'mouse') return;
    const bounds = scene.getBoundingClientRect();
    scene.style.setProperty('--tin-hover-x',`${(event.clientY-bounds.top)/bounds.height*3-1.5}deg`);
    scene.style.setProperty('--tin-hover-y',`${(event.clientX-bounds.left)/bounds.width*5-2.5}deg`);
  }, {passive:true,signal:abort.signal});
  scene.addEventListener('pointerleave',()=>{scene.style.removeProperty('--tin-hover-x');scene.style.removeProperty('--tin-hover-y');},{signal:abort.signal});
  const responsive = () => { page = 0; renderPage(); };
  compact.addEventListener('change',responsive);
  setOpen(false);
  const controller = {render, open:()=>setOpen(true), destroy(){abort.abort();compact.removeEventListener('change',responsive);controllers.delete(section);}};
  controllers.set(section,controller);
  return controller;
}
