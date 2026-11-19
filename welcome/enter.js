/* No timer or automatic navigation: the visitor explicitly opens the journal. */
(() => {
  'use strict';
  const button = document.getElementById('enter-journal');
  if (window.parent === window) button.querySelector('span').textContent = '进入主站';
  button.addEventListener('click', () => {
    if (window.parent !== window) {
      window.parent.postMessage({type:'mofarigano:enter'}, location.origin);
    } else {
      location.assign('../');
    }
  });
})();
