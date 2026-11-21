// MovingSpider runs in its own document so its pointer and keyboard handlers
// cannot affect the journal. Closing the entrance destroys that document.
function mountWelcomeGate(dialog) {
  const host = dialog.querySelector('.welcome-scene');
  const fallback = dialog.querySelector('.welcome-fallback');
  const enterButton = dialog.querySelector('#welcome-enter-fallback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null;
  let leaving = false;
  let returnFocus = null;
  let exitAnimation = null;
  let journalReady;

  function prepareJournal() {
    if (journalReady) return journalReady;
    const styles = document.querySelector('#journal-styles').content.cloneNode(true);
    const styleLoads = [...styles.querySelectorAll('link')].map(link => new Promise(resolve => {
      link.addEventListener('load', resolve, {once:true});
      link.addEventListener('error', resolve, {once:true});
    }));
    document.head.append(styles);
    journalReady = Promise.allSettled([...styleLoads, import('./app.js?v=20261121.7')]);
    return journalReady;
  }

  async function enter() {
    if (!dialog.open || leaving) return;
    leaving = true;
    enterButton.disabled = true;
    dialog.setAttribute('aria-busy', 'true');
    await prepareJournal();
    dialog.classList.add('is-entering');
    document.dispatchEvent(new Event('journal:entering'));
    if (!reduced.matches) {
      exitAnimation = dialog.animate([
        {transform:'translateY(0)', opacity:1},
        {transform:'translateY(-7vh)', opacity:0},
      ], {duration:600, easing:'cubic-bezier(.4,0,.15,1)', fill:'forwards'});
      await exitAnimation.finished.catch(() => {});
    }
    // Remove the iframe before restoring focus: no hidden animation loop remains.
    host.replaceChildren();
    frame = null;
    dialog.close();
    dialog.hidden = true;
    dialog.removeAttribute('aria-busy');
    exitAnimation?.cancel();
    exitAnimation = null;
    document.documentElement.classList.remove('welcome-open');
    dialog.classList.remove('is-entering');
    leaving = false;
    const target = returnFocus?.isConnected ? returnFocus : document.querySelector('#page-content');
    target?.focus({preventScroll:true});
    document.dispatchEvent(new Event('journal:entered'));
  }

  function revealScene(candidate) {
    if (!candidate || frame !== candidate || leaving || !dialog.open || fallback.hidden) return;
    const childButton = candidate.contentDocument?.querySelector('#enter-journal');
    // Keep the fallback usable if the scene document fails to load.
    if (!childButton) return;
    childButton.addEventListener('click', enter);
    const moveFocus = document.activeElement === enterButton;
    candidate.classList.add('is-ready');
    fallback.hidden = true;
    if (moveFocus) childButton.focus({preventScroll:true});
  }

  function open() {
    if (frame || leaving) return;
    returnFocus = document.activeElement?.closest('#replay-intro') || null;
    document.documentElement.classList.add('welcome-open');
    dialog.hidden = false;
    fallback.hidden = false;
    enterButton.disabled = false;
    // The HTML open attribute paints the entrance before the app module loads.
    // Upgrade it to a modal dialog for native focus containment and inertness.
    if (dialog.open) dialog.close();
    dialog.showModal();
    const initialFrame = host.querySelector('.welcome-frame');
    frame = initialFrame || document.createElement('iframe');
    if (!initialFrame) {
      try {
        const theme = localStorage.getItem('movingspider-theme');
        document.documentElement.dataset.theme = ['blue','rose','silver','original'].includes(theme) ? theme : 'blue';
      } catch {}
      frame.className = 'welcome-frame';
      frame.title = 'MovingSpider · Mofarigano 欢迎页';
      frame.src = 'welcome/index.html';
      host.append(frame);
    }
    const mountedFrame = frame;
    mountedFrame.addEventListener('load', () => revealScene(mountedFrame), {once:true});
    enterButton.focus({preventScroll:true});
    // The initial iframe may have already signalled during HTML parsing.
    const scene = mountedFrame.contentDocument;
    if (scene?.documentElement?.hasAttribute('data-welcome-ready') || scene?.readyState === 'complete') {
      revealScene(mountedFrame);
    }
    if (scene?.documentElement?.dataset.ready === 'true') void prepareJournal();
  }

  enterButton.addEventListener('click', enter);
  dialog.addEventListener('cancel', event => event.preventDefault());
  addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame?.contentWindow) return;
    if (event.data?.type === 'mofarigano:welcome-ready') revealScene(frame);
    if (event.data?.type === 'mofarigano:spider-ready') void prepareJournal();
    if (event.data?.type === 'mofarigano:enter') void enter();
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) exitAnimation?.finish();
  });
  open();
  document.querySelector('#replay-intro')?.addEventListener('click', open);
}

mountWelcomeGate(document.querySelector('#welcome-gate'));
