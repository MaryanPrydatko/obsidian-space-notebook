// The notebook: its file. (In Space, client/notebook/api.js kept each page as a row behind /api/ink.)
// One .notebook file holds the whole notebook as compact JSON: { v: 1, paper, pages: [{ paper, strokes }] }, each stroke
// as clean() leaves it (points rounded to a tenth of a unit, pressure to a hundredth). Syncthing carries the file between
// devices, so there is no live sync here: when the file changes on disk, Obsidian hands it in again (load, not clear).
  function parse(text) {
    if (!text || !text.trim()) return { v: 1, paper: 'lined', pages: [{ paper: 'lined', strokes: [] }] }; // a new, empty file
    var j = JSON.parse(text);
    if (!j || !Array.isArray(j.pages)) throw new Error('not a notebook');
    var pages = j.pages.map(function (p) { return { paper: (p && p.paper) || j.paper || 'lined', strokes: p && Array.isArray(p.strokes) ? p.strokes.filter(function (s) { return s && (s.t === 'text' ? typeof s.text === 'string' : Array.isArray(s.p)); }) : [] }; });
    if (!pages.length) pages.push({ paper: j.paper || 'lined', strokes: [] });
    return { v: 1, paper: j.paper || 'lined', pages: pages };
  }
  // clear: another file (or the first one) opens in this view; else the same file changed on disk
  function load(text, clear) {
    if (!st) return;
    if (!clear && text === st.lastText) return; // what was just written, read back
    var nb;
    try { nb = parse(text); } catch (e) {
      // a file that does not read as a notebook is never written over: it shows empty and stays as it was
      st.locked = true; st.lockedText = text; st.pages = [{ paper: 'blank', strokes: [] }]; st.count = 1; st.n = 0; st.page = st.pages[0]; st.undo = []; st.redo = [];
      st.status.textContent = 'This file did not open as a notebook, so it is kept as it was.'; if (st.side) st.side.querySelector('.nb-side-list').textContent = ''; loadPage(0); return;
    }
    var v0 = Object.assign({}, st.view), at = here();
    st.locked = false; st.lockedText = null; st.lastText = text;
    st.pages = nb.pages; st.count = nb.pages.length; st.defaultPaper = nb.paper;
    st.undo = []; st.redo = []; st.sel = null; st.live = null; st.lasso = null; st.moving = null; st.scaling = null; st.erasing = null;
    if (st.side) st.side.querySelector('.nb-side-list').textContent = '';
    st.status.textContent = '';
    if (clear) { st.title.value = io.title() || 'Notebook'; fit(); if (st.mode === 'scroll') loadAll(0); else loadPage(0); return; }
    if (st.mode === 'scroll') loadAll(Math.min(at, st.count - 1)); else loadPage(Math.min(st.n, st.count - 1));
    st.view = v0; render(); // your view stays where it is
  }
  function serialize() {
    if (!st) return '';
    if (st.locked) return st.lockedText;
    var text = JSON.stringify({ v: 1, paper: st.defaultPaper || 'lined', pages: st.pages.map(function (p) { return { paper: p.paper || 'blank', strokes: p.strokes.map(clean) }; }) });
    st.lastText = text; return text;
  }

  mount();
  return {
    load: load,
    serialize: serialize,
    destroy: destroy,
    // the look changed (light or dark, a theme): colours are read again and every page drawn again
    refresh: function () { if (!st) return; themed = {}; GRAIN = {}; st.g._grain = null; st.lg._grain = null; st.baseKey = null; if (st.base) st.base.getContext('2d')._grain = null; if (st.side) st.side.querySelector('.nb-side-list').textContent = ''; side(); st.showPen(); render(); },
    saved: function () { if (st && st.status.textContent === 'Saving') st.status.textContent = 'Saved'; },
    renamed: function () { if (st) st.title.value = io.title() || 'Notebook'; },
    pdf: function (all) { return pdfOf(all); },
    draw: function () { if (st) draw(); },
    _st: function () { return st; },
    _toPage: function (p) { return [st.view.x + p[0] * st.view.k, vy() + p[1] * st.view.k]; },
  };
