/* Three texture themes, native swatch controls and a remembered preference. */
(() => {
  'use strict';
  const choices = new Set(['silver', 'rose', 'blue', 'original']);
  const storageKey = 'movingspider-theme';
  const requested = new URLSearchParams(location.search).get('theme');
  let saved;
  try { saved = localStorage.getItem(storageKey); } catch (_) {}
  const preferred = choices.has(requested) ? requested : choices.has(saved) ? saved : document.documentElement.dataset.defaultTheme || 'blue';
  const updateControls = theme => {
    document.querySelectorAll('[data-theme-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === theme));
    });
  };
  const setTheme = (theme, {remember = true, updateUrl = true} = {}) => {
    if (!choices.has(theme)) return false;
    document.documentElement.dataset.theme = theme;
    const colors = {silver:'#e5e5e5', rose:'#633547', blue:'#174b9e', original:'#1129e2'};
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
  // Runs in the head so a saved choice is applied before scene content paints.
  setTheme(preferred, {remember:false, updateUrl:false});
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
