/* No timer or automatic navigation: the visitor explicitly opens the journal. */
(() => {
  'use strict';
  const button = document.getElementById('enter-journal');
  const embedded = window.parent !== window;
  if (!embedded) button.querySelector('span').textContent = '进入主站';
  button.addEventListener('click', () => {
    if (embedded) {
      window.parent.postMessage({type:'mofarigano:enter'}, location.origin);
    } else {
      location.assign('../');
    }
  });
  // Only the scene markup and entry control are needed to display this frame.
  // Images and the spider can finish independently after the first paint.
  document.documentElement.setAttribute('data-welcome-ready', '');
  if (embedded) window.parent.postMessage({type:'mofarigano:welcome-ready'}, location.origin);
})();
