/* Three texture themes, native swatch controls and a remembered preference. */
(() => {
  'use strict';
  const choices = new Set(['silver', 'rose', 'blue', 'original']);
  const root = document.documentElement;
  const storageKey = root.hasAttribute('data-project-preview') ? 'movingspider-preview-theme' : 'movingspider-theme';
  const colors = {silver:'#e5e5e5', rose:'#633547', blue:'#174b9e', original:'#1129e2'};
  const requested = new URLSearchParams(location.search).get('theme');
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch (_) {}
  const preferred = choices.has(requested) ? requested : choices.has(saved) ? saved : root.dataset.defaultTheme || 'blue';
  let canLoadTexture = false;
  let activeTexture;

  function loadTexture(theme) {
    if (!canLoadTexture || theme === 'original' || activeTexture) return;
    const image = new Image();
    activeTexture = image;
    image.fetchPriority = 'low';
    image.decoding = 'async';
    image.src = `assets/backgrounds/${theme}.webp`;
    image.decode().then(() => {
      if (activeTexture !== image) return;
      root.style.setProperty('--texture-full', `url("${image.src}")`);
      root.setAttribute('data-texture-ready', '');
    }).catch(() => {
      if (activeTexture === image) activeTexture = null;
    });
  }

  function enableTextures() {
    if (canLoadTexture) return;
    canLoadTexture = true;
    loadTexture(root.dataset.theme);
  }
  const updateControls = theme => {
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  };
  const setTheme = (theme, {remember = true, updateUrl = true} = {}) => {
    if (!choices.has(theme)) return false;
    if (root.dataset.theme !== theme) {
      root.removeAttribute('data-texture-ready');
      root.style.removeProperty('--texture-full');
      activeTexture = null;
      root.dataset.theme = theme;
    }
    loadTexture(theme);
    document.querySelector('meta[name="theme-color"]').setAttribute('content', colors[theme]);
    updateControls(theme);
    if (remember) { try { localStorage.setItem(storageKey, theme); } catch (_) {} }
    if (updateUrl) {
      try {
        const url = new URL(location.href);url.searchParams.set('theme', theme);
        history.replaceState(history.state, '', url);
      } catch (_) {}
    }
    document.dispatchEvent(new CustomEvent('found:theme', {detail:{theme}}));
    return true;
  };
  setTheme(preferred, {remember:false, updateUrl:false});
  document.addEventListener('found:spider-ready', enableTextures, {once:true});
  // Keep the full texture available if animation code or its sprite fails.
  window.addEventListener('load', enableTextures, {once:true});
  const bindControls = () => {
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.addEventListener('click', () => setTheme(button.dataset.themeChoice));
    });
    updateControls(document.documentElement.dataset.theme);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bindControls, {once:true});
  else bindControls();
  window.FoundTheme = {set: setTheme, get current(){return document.documentElement.dataset.theme;}};
})();
