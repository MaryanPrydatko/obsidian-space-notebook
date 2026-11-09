// The notebook: pages: opening one and going to one. (Space: client/notebook/pages.js; every page is in memory here)
  // ---------- pages ----------
  function loadPage(n) {
    st.n = Math.max(0, Math.min(n, st.count - 1)); st.page = st.pages[st.n]; st.sel = null;
    st.paperSel.value = st.page.paper || 'blank'; if (st.mode === 'board') fit(); showPageNo(); syncButtons(); render();
  }
  function showPageNo() { var n = here(); st.pageNo.textContent = 'Page ' + (n + 1) + ' of ' + Math.max(st.count, n + 1); st.btnPrev.disabled = n === 0; side(); }
  // Scroll view: every page, one below the other
  function loadAll(target) {
    var n = Math.max(0, Math.min(target || 0, st.count - 1)); st.n = n; st.page = st.pages[n]; st.sel = null;
    st.paperSel.value = st.page.paper || 'blank'; scrollToPage(n, true); syncButtons();
  }
  function scrollToPage(n, now) { var k = st.view.k, to = 16 - OFF(n) * k; st.seen = n; if (now) { st.view.y = to; showPageNo(); render(); return; } var from = st.view.y, t0 = performance.now(); (function step(t) { if (!st) return; var f = Math.min(1, (t - t0) / 260), e = 1 - Math.pow(1 - f, 3); st.view.y = from + (to - from) * e; render(); if (f < 1) win.requestAnimationFrame(step); else showPageNo(); })(t0); }
  // Pages view: turn to another page, with a short slide in the direction you went; past the last page, a new one
  function turn(n) {
    if (!st || n < 0) return; var dir = n > st.n ? 1 : -1;
    if (n >= st.count) { insertPage(st.count); return; }
    if (st.mode === 'scroll') { activate(n); scrollToPage(n); return; }
    loadPage(n);
    if (st.canvas.animate && !win.matchMedia('(prefers-reduced-motion: reduce)').matches) st.canvas.animate([{ transform: 'translateX(' + dir * 60 + 'px)', opacity: 0.2 }, { transform: 'none', opacity: 1 }], { duration: 220, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' });
  }
  function go(n) { if (!st) return; if (st.mode === 'scroll') { activate(n); scrollToPage(n); return; } loadPage(n); }
