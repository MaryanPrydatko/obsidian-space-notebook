// The notebook: the pages down the side. (Space: client/notebook/side.js)
  // ---------- the pages down the side, like GoodNotes: where you are, a tap to go anywhere, + to add one ----------
  function side() {
    if (!st) return; var bar = st.side; if (!bar) return;
    var on = st.sideOn; st.stage.classList.toggle('with-side', on); st.btnSide.setAttribute('aria-pressed', on);
    if (!on) { bar.hidden = true; return; } bar.hidden = false;
    var list = bar.querySelector('.nb-side-list'), at = here();
    if (list.children.length !== st.count) {
      list.textContent = '';
      for (var i = 0; i < st.count; i++) (function (n) {
        var b = el('button', 'nb-thumb'), c = el('canvas'); c.width = 120; c.height = Math.round(120 * PAGE_H / PAGE_W);
        b.append(c, el('span', null, String(n + 1))); b.setAttribute('aria-label', 'Page ' + (n + 1)); b.onclick = function () { if (n !== here()) go(n); }; list.append(b);
        sideThumb(n);
      })(i);
    }
    [].forEach.call(list.children, function (b, i) { b.classList.toggle('on', i === at); });
    var cur = list.children[at]; if (cur && cur.scrollIntoView) { cur.scrollIntoView({ block: 'nearest' }); }
  }
  // the page you are on: in Scroll view the one in sight, else the one open
  function here() { return st.mode === 'scroll' && st.seen != null ? st.seen : st.n; }
  function sideThumb(n) {
    if (!st || !st.side || !st.sideOn) return; var b = st.side.querySelector('.nb-side-list').children[n]; if (!b) return;
    if (st.pages[n]) thumb(b.querySelector('canvas'), st.pages[n]);
  }
  function blankPage() { return { paper: st.defaultPaper || (st.page && st.page.paper) || 'lined', strokes: [] }; }
  // a new page goes in right after the one you are on (or wherever you say), and the ones after it move down one
  function insertPage(n) {
    if (!st || st.locked) return; n = Math.max(0, Math.min(n, st.count));
    st.pages.splice(n, 0, blankPage()); st.count = st.pages.length;
    [st.undo, st.redo].forEach(function (L) { L.forEach(function (op) { if (op.pg != null && op.pg >= n) op.pg++; }); });
    if (st.n >= n) st.n++;
    if (st.seen != null && st.seen >= n) st.seen++;
    st.page = st.pages[st.n];
    changed();
    if (st.side) st.side.querySelector('.nb-side-list').textContent = '';
    if (st.mode === 'scroll') { activate(n); scrollToPage(n); } else turn(n);
    side();
  }
  // a page goes (after you said so twice), and the ones after it move up one; undo starts again
  function deletePage(n) {
    if (!st || st.locked) return; st.pages.splice(n, 1); if (!st.pages.length) st.pages.push(blankPage());
    st.count = st.pages.length; st.undo = []; st.redo = []; st.sel = null; st.n = Math.min(st.n, st.count - 1); st.page = st.pages[st.n];
    changed();
    if (st.side) st.side.querySelector('.nb-side-list').textContent = '';
    var to = Math.min(n, st.count - 1); if (st.mode === 'scroll') loadAll(to); else loadPage(to);
  }
