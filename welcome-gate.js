// MovingSpider runs in its own document so its pointer and keyboard handlers
// cannot affect the journal. Closing the entrance destroys that document.
export function mountWelcomeGate(dialog) {
  const host = dialog.querySelector('.welcome-scene');
  const fallback = dialog.querySelector('.welcome-fallback');
  const enterButton = dialog.querySelector('#welcome-enter-fallback');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null;
  let leaving = false;
  let returnFocus = null;
  let exitAnimation = null;

  async function enter() {
    if (!dialog.open || leaving) return;
    leaving = true;
    enterButton.disabled = true;
    dialog.classList.add('is-entering');
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
    exitAnimation?.cancel();
    exitAnimation = null;
    document.documentElement.classList.remove('welcome-open');
    dialog.classList.remove('is-entering');
    leaving = false;
    const target = returnFocus?.isConnected ? returnFocus : document.querySelector('#page-content');
    target?.focus({preventScroll:true});
    document.dispatchEvent(new Event('journal:entered'));
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
    frame = document.createElement('iframe');
    frame.className = 'welcome-frame';
    frame.title = 'MovingSpider · Mofarigano 欢迎页';
    frame.src = 'welcome/index.html';
    const mountedFrame = frame;
    mountedFrame.addEventListener('load', () => {
      if (frame !== mountedFrame || leaving || !dialog.open) return;
      const childButton = mountedFrame.contentDocument?.querySelector('#enter-journal');
      // Keep a usable entry button if the scene document could not be served.
      if (!childButton) return;
      // The scene's visual scripts may fail independently. Its real button must
      // still work even if the child entry-message script did not load.
      childButton.addEventListener('click', enter);
      const moveFocus = document.activeElement === enterButton;
      mountedFrame.classList.add('is-ready');
      fallback.hidden = true;
      if (moveFocus) childButton.focus({preventScroll:true});
    }, {once:true});
    host.replaceChildren(mountedFrame);
    enterButton.focus({preventScroll:true});
  }

  enterButton.addEventListener('click', enter);
  dialog.addEventListener('cancel', event => event.preventDefault());
  addEventListener('message', event => {
    if (event.origin === location.origin && event.source === frame?.contentWindow && event.data?.type === 'mofarigano:enter') {
      void enter();
    }
  });
  reduced.addEventListener('change', () => {
    if (reduced.matches) exitAnimation?.finish();
  });
  open();
  return {open};
}
