export const pages = [
  {id:'me', section:'intro', title:'我', subtitle:'A LIFE IN PROGRESS'},
  {id:'works', title:'作品', subtitle:'SELECTED WORKS'},
  {id:'life', title:'生活', subtitle:'LIFE, UNFOLDING'},
  {id:'journal', title:'手记', subtitle:'FIELD NOTES'},
  {id:'travel', title:'足迹', subtitle:'SOMEWHERE ELSE', module:'map', roomTitle:'猪的世界足迹'},
  {id:'music', title:'音乐', subtitle:'THE SOUNDTRACK', module:'music', roomTitle:'Music of Love · 音乐墙'},
  {id:'books', title:'阅读', subtitle:'SLOW READING CLUB', module:'books', roomTitle:'老猪的读书角'},
  {id:'collection', title:'收藏抽屉', subtitle:'THE GOOD FINDS'},
  {id:'toys', title:'手办收藏', subtitle:'SMALL THINGS, BIG JOY'},
  {id:'about', title:'关于我', subtitle:'A LITTLE MORE ABOUT ME'},
  {id:'stack', title:'技术栈', subtitle:'THE TOOLBOX'},
  {id:'honors', title:'荣誉墙', subtitle:'MILESTONES'},
];

export function mountPageNavigation({getName}) {
  const main = document.querySelector('#page-content');
  const sections = [...main.children].filter(el => el.tagName === 'SECTION');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const positions = new Map();
  let current = null, pending = null, busy = false, transition = null;
  let fallbackAnimations = [], roomCleanup = null;
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function resolve(value) {
    const id = value.replace(/^#\/?/, '');
    return pages.find(p => p.id === id) || pages.find(p => p.section === id) || pages[0];
  }
  const href = id => '#/' + id;
  function refreshTitle() {
    if (current) document.title = `${current.title} — ${getName()} · 生活手册`;
  }
  function mountRoom(page) {
    const shell = document.querySelector(`#${page.id} .route-room-shell`);
    if (!shell) return;
    const frame = document.createElement('iframe');
    frame.src = `modules/${page.module}.html`;
    frame.title = page.roomTitle;
    frame.allow = 'fullscreen; autoplay';
    frame.allowFullscreen = true;
    const loading = document.createElement('div');
    loading.className = 'route-room-loading';
    loading.innerHTML = `<span class="eyebrow">${page.subtitle}</span><strong>正在翻开${page.title}…</strong>`;
    const help = document.createElement('div');
    help.className = 'route-room-status';
    help.hidden = true;
    help.innerHTML = `加载需要一点时间。<a href="modules/${page.module}.html" target="_blank" rel="noopener noreferrer">独立打开 ↗</a>`;
    shell.classList.remove('is-loaded');
    shell.replaceChildren(frame, loading, help);
    const timer = setTimeout(() => { help.hidden = false; }, 14000);
    frame.addEventListener('load', () => {
      clearTimeout(timer);
      shell.classList.add('is-loaded');
      help.hidden = true;
      if (page.module !== 'map') {
        const child = frame.contentDocument;
        const childWindow = frame.contentWindow;
        if (!child?.head || !childWindow) return;
        child.documentElement.dataset.journalRoom = page.module;
        const typeStyle = child.createElement('link');
        typeStyle.rel = 'stylesheet';
        typeStyle.href = new URL('room-typography.css', document.baseURI).href;
        typeStyle.addEventListener('load', () => {
          child.fonts.ready.then(() => {
            if (frame.isConnected) childWindow.dispatchEvent(new childWindow.Event('resize'));
          }).catch(() => {});
        }, {once:true});
        child.head.append(typeStyle);
      }
    }, {once:true});
    roomCleanup = () => { clearTimeout(timer); shell.replaceChildren(); };
  }
  function apply(page, {focus = true, restore = false} = {}) {
    if (current) positions.set(current.id, scrollY);
    roomCleanup?.();
    roomCleanup = null;
    document.querySelectorAll('dialog[open]:not(#welcome-gate)').forEach(dialog => dialog.close());
    // Preserve mounted components and content filters while keeping one page in the layout.
    for (const section of sections) section.hidden = section.id !== (page.section || page.id);
    const panel = document.querySelector('#index-panel');
    panel.hidden = true;
    document.querySelector('#index-toggle').setAttribute('aria-expanded', 'false');
    document.querySelector('#index-toggle').setAttribute('aria-label', '打开全部章节');
    current = page;
    document.body.dataset.page = page.id;
    document.querySelectorAll('a[href^="#/"]').forEach(link => {
      const active = link.hash === href(page.id);
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    if (page.module) mountRoom(page);
    main.setAttribute('aria-label', page.title);
    refreshTitle();
    scrollTo({top:restore ? positions.get(page.id) || 0 : 0, behavior:'instant'});
    if (focus) main.focus({preventScroll:true});
    document.querySelector('#route-status').textContent = `已打开${page.title}页面`;
  }
  async function drain() {
    if (busy) return;
    busy = true;
    try {
      while (pending) {
        const request = pending;
        pending = null;
        if (current?.id === request.page.id) continue;
        const backwards = pages.indexOf(request.page) < pages.indexOf(current);
        document.documentElement.dataset.turn = backwards ? 'back' : 'forward';
        main.inert = true;
        // History can change underneath the welcome dialog. Keep the gate above
        // the journal rather than capturing it in a page-turn transition.
        if (reduced.matches || document.querySelector('#welcome-gate')?.open) {
          apply(request.page, {...request.options, focus:false});
        } else if (document.startViewTransition) {
          // Animate browser snapshots; live portrait canvas keeps its correct dimensions.
          transition = document.startViewTransition(() => apply(request.page, {...request.options, focus:false}));
          await transition.finished.catch(() => {});
          transition = null;
        } else {
          const sign = backwards ? -1 : 1;
          const outgoing = main.animate([
            {opacity:1, transform:'translateX(0)'},
            {opacity:0, transform:`translateX(${sign * -20}px)`},
          ], {duration:190, easing:'ease-in', fill:'forwards'});
          fallbackAnimations = [outgoing];
          await outgoing.finished.catch(() => {});
          apply(request.page, {...request.options, focus:false});
          outgoing.cancel();
          const incoming = main.animate([
            {opacity:0, transform:`translateX(${sign * 20}px)`},
            {opacity:1, transform:'translateX(0)'},
          ], {duration:300, easing:'cubic-bezier(.2,.7,.2,1)'});
          fallbackAnimations = [incoming];
          await incoming.finished.catch(() => {});
          fallbackAnimations = [];
        }
        main.inert = false;
        if (!pending && request.options.focus !== false) main.focus({preventScroll:true});
      }
    } finally {
      main.inert = false;
      busy = false;
    }
  }
  function navigate(id, {fromHistory = false, focus = true} = {}) {
    const page = resolve(id);
    if (!fromHistory && location.hash !== href(page.id)) history.pushState(null, '', href(page.id));
    if (fromHistory && location.hash !== href(page.id)) history.replaceState(null, '', href(page.id));
    pending = {page, options:{focus, restore:fromHistory}};
    transition?.skipTransition();
    fallbackAnimations.forEach(animation => animation.cancel());
    void drain();
  }
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href^="#/"]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(link.hash);
  });
  addEventListener('hashchange', () => navigate(location.hash, {fromHistory:true}));
  document.querySelector('.skip-link').addEventListener('click', event => {
    event.preventDefault();
    main.focus({preventScroll:true});
    main.scrollIntoView({behavior:'instant', block:'start'});
  });
  const first = resolve(location.hash);
  history.replaceState(null, '', href(first.id));
  apply(first, {focus:false});
  return {navigate, refreshTitle};
}
