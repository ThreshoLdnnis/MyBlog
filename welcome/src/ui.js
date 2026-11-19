/* Image-only collection drawer and search. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const objects = [...document.querySelectorAll('.frame img.object')].map(image => ({
    image: image.id, name: image.dataset.archiveName || image.alt,
    keywords: image.dataset.keywords || image.alt
  }));
  const drawer = $('#cabinet-drawer'), drawerContent = $('#drawer-content');
  let lastFocus = null;
  const listObjects = (items, container) => {
    container.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('div'); empty.className = 'drawer-empty'; empty.setAttribute('role', 'status'); empty.setAttribute('aria-label', 'No matching objects');
      empty.innerHTML = '<svg viewBox="0 0 32 32" fill="none" aria-hidden="true"><circle cx="14" cy="14" r="9" stroke="currentColor" stroke-width="1.5"/><path d="m21 21 7 7M10 14h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
      container.append(empty); return;
    }
    for (const item of items) {
      const tile = document.createElement('figure'); tile.className = 'archive-item';
      const image = document.createElement('img'); image.src = document.getElementById(item.image).src; image.alt = item.name;
      tile.append(image); container.append(tile);
    }
  };
  const closeDrawer = () => { if (drawer.open) drawer.close(); };
  const openSection = (section) => {
    if (section === 'home') { closeDrawer(); return; }
    if (!drawer.open) lastFocus = document.activeElement;
    drawerContent.replaceChildren();
    $('#drawer-title').textContent = section === 'search' ? 'Search objects' : 'Archive';
    const list = document.createElement('div'); list.className = 'drawer-list';
    if (section === 'search') {
      const input = document.createElement('input'); input.className = 'drawer-search'; input.type = 'search'; input.setAttribute('aria-label', 'Search objects');
      input.addEventListener('input', () => { const query = input.value.trim().toLowerCase(); listObjects(objects.filter(item => `${item.name} ${item.keywords}`.toLowerCase().includes(query)), list); });
      drawerContent.append(input);
    }
    drawerContent.append(list); listObjects(objects, list);
    if (!drawer.open) drawer.showModal();
    $('#open-menu').setAttribute('aria-expanded', 'true');
    drawer.scrollTop = 0;
    if (section === 'search') requestAnimationFrame(() => $('.drawer-search')?.focus());
  };
  $('#open-search').addEventListener('click', () => openSection('search'));
  $('#open-menu').addEventListener('click', () => openSection('menu'));
  $('.drawer-close').addEventListener('click', closeDrawer);
  drawer.addEventListener('click', event => { if (event.target === drawer) { const r = drawer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeDrawer(); } });
  drawer.addEventListener('close', () => { $('#open-menu').setAttribute('aria-expanded', 'false'); if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true }); });
  document.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSection('search'); } });
  window.FoundUI = { openSection, get drawerOpen() { return drawer.open; } };
})();
