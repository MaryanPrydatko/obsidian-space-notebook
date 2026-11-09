// The notebook: making it in its view, and closing it. (Space: client/notebook/open.js)
  // ---------- mount: the notebook's toolbars and page, in the Obsidian view (host); file.js puts the pages in ----------
  function mount() {
    var w = el('div', 'nb'); w.tabIndex = -1;
    var top = el('div', 'nb-top'), title = el('input', 'nb-title'); title.value = io.title() || 'Notebook'; title.setAttribute('aria-label', 'Name of this notebook');
    var status = el('span', 'nb-status', ''), pageNo = el('span', 'nb-page');
    var prev = el('button', 'nb-b', '\u2039'), next = el('button', 'nb-b', '\u203a'), addP = el('button', 'nb-b', '+ Page');
    prev.setAttribute('aria-label', 'Previous page'); next.setAttribute('aria-label', 'Next page'); addP.title = 'A new page after this one';
    pageNo.setAttribute('role', 'button'); pageNo.tabIndex = 0; pageNo.title = 'See all pages'; pageNo.onclick = function () { overview(); };
    var paperSel = el('select', 'nb-paper'); paperSel.setAttribute('aria-label', 'Paper'); PAPERS.forEach(function (p) { var o = el('option', null, p[1]); o.value = p[0]; paperSel.append(o); });
    var delP = el('button', 'nb-b', 'Delete page'); delP.title = 'Delete this page (asks once more)';
    var viewSel = el('select', 'nb-paper nb-view'); viewSel.setAttribute('aria-label', 'How the pages show'); [['scroll', 'Scroll'], ['pages', 'Pages'], ['board', 'Whiteboard']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; viewSel.append(op); });
    var mv = Pref.get('view:' + io.id()) || Pref.get('view'), mode0 = mv === 'pages' || mv === 'board' ? mv : 'scroll'; // like GoodNotes: pages one below the other, unless you chose otherwise
    viewSel.value = mode0;
    var pdfB = el('button', 'nb-b', 'Save as PDF'); pdfB.title = 'Save this page or all pages as a PDF next to the notebook'; pdfB.onclick = function () { menu.hidden = true; pdfMenu(moreB); };
    var sideB = el('button', 'nb-b', 'Pages'); sideB.title = 'Show the pages down the side'; sideB.setAttribute('aria-pressed', 'false');
    viewSel.title = 'Scroll: pages one below the other. Pages: turn them. Whiteboard: no page edge.';
    var moreB = el('button', 'nb-b nb-more', '\u2026'); moreB.setAttribute('aria-label', 'More: paper, PDF, toolbar place, delete page'); moreB.title = 'More'; var menu = el('div', 'nb-menu glass'); menu.hidden = true;
    var dockB = el('button', 'nb-b', ''); var dockOn = Pref.get('dock') === '1';
    var setDock = function (on) { dockOn = on; w.classList.toggle('dock-bottom', on); dockB.textContent = on ? 'Toolbar at the top' : 'Toolbar at the bottom'; Pref.set('dock', on ? '1' : '0'); if (st) resize(); };
    dockB.onclick = function () { setDock(!dockOn); menu.hidden = true; };
    var row = function (label, ctl) { var r = el('label', 'nb-menu-row'); r.append(el('span', null, label), ctl); return r; };
    var fingerB = el('button', 'nb-b', Pref.get('finger') === 'write' ? 'Let my finger move the page' : 'Let my finger write'); fingerB.title = 'Once the Pencil is used a finger moves the page; this lets it write instead, or move the page again'; fingerB.onclick = function () { menu.hidden = true; setFingerWrites(!st.fingerWrites); };
    if (!win.matchMedia('(any-pointer: coarse)').matches) fingerB.hidden = true; // only a touch screen has a finger to choose for
    menu.append(row('Paper', paperSel), pdfB, fingerB, dockB, delP); /* set once per notebook, so behind More */ moreB.onclick = function () { menu.hidden = !menu.hidden; var r = moreB.getBoundingClientRect(); menu.style.top = (r.bottom + 6) + 'px'; menu.style.right = Math.max(8, win.innerWidth - r.right) + 'px'; };
    w.addEventListener('pointerdown', function (e) { if (!menu.hidden && !menu.contains(e.target) && e.target !== moreB) { menu.hidden = true; if (st && e.target === st.canvas) { e.stopPropagation(); e.preventDefault(); } } }, true);
    top.append(sideB, title, status, el('span', 'grow'), prev, pageNo, next, addP, viewSel, moreB); // Scroll, Pages or Whiteboard: always in sight; delete sits behind More
    // ---- tools: icons in one row; the pen chip (or a second tap on the active pen) opens size and colour, like GoodNotes ----
    var tools = el('div', 'nb-tools'), pens = loadPens();
    var ICON = { pen: 'M3 13l1-4 7-7 3 3-7 7-4 1zM10 3l3 3', pencil: 'M3 13l1-3.5 7.5-7.5 2.5 2.5-7.5 7.5zM4.6 11.4l7.4-7.4M3.9 10.1l2 2', marker: 'M4 11.5l2-5.5 5-4 3 3-4 5-5.5 2zM3 14h6', text: 'M3.5 4h9M8 4v9', shape: 'M2 9h6v5H2zM14.5 5.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', eraser: 'M8.6 2.6a1.4 1.4 0 0 1 2 0l2.8 2.8a1.4 1.4 0 0 1 0 2L7.8 13H4.6L2.6 11a1.4 1.4 0 0 1 0-2zM5.6 6l4.4 4.4M8 13h5.5' /* a rounded eraser with its band, on the page (it read as a razor: the owner, 8 Nov) */, lasso: 'M8 3c3.3 0 6 1.6 6 3.5S11.3 10 8 10 2 8.4 2 6.5 4.7 3 8 3zM5 9.5c-1 1.5 0 3.5 2 3.5', undo: 'M5 4L2 7l3 3M2 7h7a3.5 3.5 0 0 1 0 7H7', redo: 'M11 4l3 3-3 3M14 7H7a3.5 3.5 0 0 0 0 7h2' };
    var ico = function (d) { return '<svg viewBox="0 0 16 16" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };
    var pick = function (t) {
      st.tool = t; tools.querySelectorAll('[data-t]').forEach(function (q) { q.setAttribute('aria-pressed', q.dataset.t === t); }); st.canvas.dataset.tool = t; shapeSel.hidden = t !== 'shape'; eraseSel.hidden = t !== 'eraser';
      if (t !== 'lasso') { st.sel = null; syncButtons(); } st.eraserAt = null; if (pens[t]) { st.size = pens[t].w; st.color = pens[t].c; } showPen(); render();
    };
    var tb = function (t, label) { var b = el('button', 'nb-t nb-ico'); b.innerHTML = ico(ICON[t]); b.setAttribute('aria-label', label); b.title = label; b.dataset.t = t; b.setAttribute('aria-pressed', t === 'pen'); b.onclick = function () { if (st.tool === t && pens[t]) { togglePop(); return; } pick(t); }; tools.append(b); return b; };
    tb('pen', 'Pen (tap again for size and colour)'); tb('pencil', 'Pencil: lean it to shade (tap again for size and colour)'); tb('marker', 'Highlighter'); tb('text', 'Text'); var shb = tb('shape', 'Shape'); tb('eraser', 'Eraser'); tb('lasso', 'Lasso: circle strokes to move, resize or recolour them');
    var rulerB = el('button', 'nb-t nb-ico nb-ruler'); rulerB.innerHTML = ico('M2 11.5L11.5 2 14 4.5 4.5 14zM5 8.5l1.2 1.2M7 6.5l1.8 1.8M9 4.5l1.2 1.2'); rulerB.setAttribute('aria-label', 'Ruler: lines drawn along it run straight'); rulerB.title = 'Ruler (R): drag it to move, drag an end to turn'; rulerB.setAttribute('aria-pressed', 'false'); rulerB.onclick = function () { toggleRuler(); }; tools.append(rulerB);
    var shapeSel = el('select', 'nb-paper nb-shape'); shapeSel.setAttribute('aria-label', 'Which shape'); [['line', 'Line'], ['arrow', 'Arrow'], ['box', 'Box'], ['circle', 'Circle']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; shapeSel.append(op); });
    shapeSel.onchange = function () { st.shape = shapeSel.value; if (st.tool !== 'shape') pick('shape'); }; shb.after(shapeSel); shapeSel.hidden = true; // only while Shape is chosen
    // the eraser takes whole lines (the default, like GoodNotes) or only the part it passes over
    var eraseSel = el('select', 'nb-paper nb-erase'); eraseSel.setAttribute('aria-label', 'What the eraser takes'); [['stroke', 'Whole lines'], ['part', 'Part of a line']].forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; eraseSel.append(op); });
    var erase0 = Pref.get('erase') === 'part' ? 'part' : 'stroke'; eraseSel.value = erase0;
    eraseSel.onchange = function () { st.eraseMode = eraseSel.value; Pref.set('erase', eraseSel.value); };
    tools.querySelector('[data-t="eraser"]').after(eraseSel); eraseSel.hidden = true; // only while the eraser is chosen
    tools.append(el('span', 'nb-sep'));
    // the pen you write with now: its colour and width; tap for the full choice
    var penB = el('button', 'nb-pen'), penDot = el('span', 'nb-pen-dot'); penB.append(penDot); penB.setAttribute('aria-label', 'Size and colour'); penB.title = 'Size and colour'; penB.onclick = function () { togglePop(); }; tools.append(penB);
    var quickBox = el('span', 'nb-quick'); tools.append(quickBox); // your recent colours, one tap away
    tools.append(el('span', 'nb-sep'));
    var bu = el('button', 'nb-t nb-ico'), br = el('button', 'nb-t nb-ico'), bd = el('button', 'nb-t danger', 'Delete selection');
    bu.innerHTML = ico(ICON.undo); br.innerHTML = ico(ICON.redo); bu.setAttribute('aria-label', 'Undo'); br.setAttribute('aria-label', 'Redo'); bu.title = 'Undo (Cmd+Z)'; br.title = 'Redo (Shift+Cmd+Z)';
    bu.onclick = undo; br.onclick = redo; bd.onclick = deleteSelection; bd.hidden = true; tools.append(bu, br, bd);
    var recent = loadRecent();
    var setColor = function (c) {
      st.color = c; if (pens[st.tool]) { pens[st.tool].c = c; savePens(pens); }
      recent = [c].concat(recent.filter(function (x) { return x !== c; })).slice(0, 6); saveRecent(recent);
      if (st.sel) { var list = st.sel.list, was = list.map(function (q) { return q.c; }); apply({ t: 'color', s: list, to: c, was: was }, false); did({ t: 'color', s: list, to: c, was: was }); render(); }
      showPen();
    };
    var setSize = function (w, final) {
      st.size = w; if (pens[st.tool]) { pens[st.tool].w = w; savePens(pens); }
      if (final && st.sel) { var list = st.sel.list.filter(function (q) { return q.t !== 'text' && q.t !== 'img'; }), was = list.map(function (q) { return q.w; }); if (list.length) { apply({ t: 'size', s: list, to: w, was: was }, false); did({ t: 'size', s: list, to: w, was: was }); render(); } }
      showPen();
    };
    var pop = null, previewC = null;
    var showPen = function () {
      var c = ink(st.color), d = Math.max(6, Math.min(24, sz(st.size) * 1.7)); penDot.style.background = c; penDot.style.width = penDot.style.height = d + 'px'; penDot.style.opacity = st.tool === 'marker' ? 0.55 : st.tool === 'pencil' ? 0.8 : 1;
      quickBox.textContent = ''; recent.forEach(function (k) { var b = el('button', 'nb-sw'); b.style.background = ink(k); b.setAttribute('aria-label', 'Colour ' + k); b.dataset.c = k; b.setAttribute('aria-pressed', k === st.color); b.onclick = function () { setColor(k); }; quickBox.append(b); });
      if (pop) fillPop();
    };
    var drawPreview = function () {
      if (!previewC) return; var dpr = win.devicePixelRatio || 1, W = 240, H = 56, g = previewC.getContext('2d'); previewC.width = W * dpr; previewC.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
      var pts = []; for (var i = 0; i <= 40; i++) pts.push(16 + i * 5.2, 28 + Math.sin(i / 5) * 10, 0.5); drawStroke(g, { t: st.tool === 'marker' || st.tool === 'pencil' ? st.tool : 'pen', w: st.size, c: st.color, sim: 1, p: pts });
    };
    var fillPop = function () {
      pop.textContent = ''; var hd = el('div', 'nb-pop-h'); hd.append(el('b', null, 'Size'), el('span', 'nb-pop-v', String(sz(st.size)))); pop.append(hd);
      previewC = el('canvas', 'nb-preview'); previewC.setAttribute('aria-hidden', 'true'); pop.append(previewC); drawPreview();
      var range = el('input', 'nb-size'); range.type = 'range'; range.min = '1'; range.max = '30'; range.step = '0.5'; range.value = String(sz(st.size)); range.setAttribute('aria-label', 'Width');
      range.oninput = function () { st.size = +range.value; hd.querySelector('.nb-pop-v').textContent = range.value; drawPreview(); penDot.style.width = penDot.style.height = Math.max(6, Math.min(24, st.size * 1.7)) + 'px'; };
      range.onchange = function () { setSize(+range.value, true); }; pop.append(range);
      var pr = el('div', 'nb-presets'), presets = loadPresets(); presets.forEach(function (w) { var b = el('button', 'nb-preset'); var dt = el('span'); dt.style.width = dt.style.height = Math.max(4, Math.min(22, w * 1.6)) + 'px'; b.append(dt); b.setAttribute('aria-label', 'Width ' + w); b.setAttribute('aria-pressed', sz(st.size) === w); b.onclick = function () { setSize(w, true); }; pr.append(b); });
      var keep = el('button', 'nb-keep', 'Keep this size'); keep.onclick = function () { var w = sz(st.size), ps = loadPresets(); if (ps.indexOf(w) < 0) { ps = ps.concat(w).sort(function (a, b) { return a - b; }).slice(-6); savePresets(ps); } fillPop(); }; pr.append(keep); pop.append(pr);
      pop.append(el('div', 'nb-pop-h', 'Colour')); var grid = el('div', 'nb-palette');
      PALETTE.forEach(function (k) { var b = el('button', 'nb-sw'); b.style.background = ink(k); b.setAttribute('aria-label', 'Colour ' + k); b.dataset.c = k; b.setAttribute('aria-pressed', k === st.color); b.onclick = function () { setColor(k); }; grid.append(b); });
      var own = el('label', 'nb-own'), inp = el('input'); inp.type = 'color'; inp.value = /^#/.test(String(st.color)) ? st.color : '#2563c9'; inp.setAttribute('aria-label', 'Your own colour'); inp.onchange = function () { setColor(inp.value.toLowerCase()); }; own.append(inp, el('span', null, 'Your own')); grid.append(own); pop.append(grid);
    };
    var closePop = function () { if (pop) { pop.remove(); pop = null; previewC = null; } };
    var togglePop = function () { if (pop) { closePop(); return; } pop = el('div', 'nb-pop glass'); pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Size and colour'); fillPop(); st.w.append(pop); var r = penB.getBoundingClientRect(), dock = st.w.classList.contains('dock-bottom'); pop.style.left = Math.max(8, Math.min(win.innerWidth - 300, r.left - 120)) + 'px'; if (dock) pop.style.bottom = (win.innerHeight - r.top + 8) + 'px'; else pop.style.top = (r.bottom + 8) + 'px'; };
    // a tap outside closes it and does nothing else (it never leaves a dot on the page), as in GoodNotes
    w.addEventListener('pointerdown', function (e) { if (pop && !pop.contains(e.target) && e.target !== penB && !penB.contains(e.target) && !(e.target.closest && e.target.closest('.nb-t[data-t]'))) { closePop(); if (e.target === st.canvas) { e.stopPropagation(); e.preventDefault(); } } }, true);
    var stage = el('div', 'nb-stage'), canvas = el('canvas', 'nb-canvas'); canvas.dataset.tool = 'pen'; stage.append(canvas); var liveC = el('canvas', 'nb-live'); liveC.setAttribute('aria-hidden', 'true'); stage.append(liveC);
    var sideBox = el('div', 'nb-side'); sideBox.setAttribute('aria-label', 'Pages'); var sideList = el('div', 'nb-side-list'), sideAdd = el('button', 'nb-thumb add', '+ Page'); sideAdd.title = 'A new page at the end'; sideBox.append(sideList, sideAdd); stage.append(sideBox); sideBox.hidden = true;
    w.append(top, menu, tools, stage); host.append(w); setDock(dockOn);
    var blank = { paper: 'lined', strokes: [] };
    st = { rulerB: rulerB, eraseMode: eraseSel.value, made: [], w: w, canvas: canvas, g: canvas.getContext('2d'), liveC: liveC, lg: liveC.getContext('2d'), status: status, pageNo: pageNo, paperSel: paperSel, btnPrev: prev, btnUndo: bu, btnRedo: br, btnDel: bd, title: title, menu: menu,
      tool: 'pen', shape: 'line', color: pens.pen.c, size: pens.pen.w, undo: [], redo: [], n: 0, count: 1, mode: mode0, pages: [blank], seen: null, page: blank, penSeen: false, fingerWrites: Pref.get('finger') === 'write', btnFinger: fingerB, eraserR: 14, defaultPaper: 'lined', stage: stage, side: sideBox, btnSide: sideB, sideOn: (function () { var v = Pref.get('side'); return v ? v === '1' : win.innerWidth >= 900; })(), view: { k: 1, x: 0, y: 16 } };
    st.showPen = showPen;
    wire(canvas); side(); fit(); resize();
    showPen();
    // the view can change size without the window (a sidebar, a split): the page follows
    st.ro = new win.ResizeObserver(function () { if (st && !st.rraf) st.rraf = win.requestAnimationFrame(function () { if (st) { st.rraf = 0; resize(); } }); }); st.ro.observe(stage);
    prev.onclick = function () { if (here() > 0) turn(here() - 1); };
    next.onclick = function () { turn(here() + 1); }; // past the last page: a new one
    addP.onclick = function () { insertPage(here() + 1); }; // right after the page you are on
    sideAdd.onclick = function () { insertPage(st.count); };
    sideB.onclick = function () { st.sideOn = !st.sideOn; Pref.set('side', st.sideOn ? '1' : '0'); side(); resize(); };
    viewSel.onchange = function () {
      menu.hidden = true;
      var n = here(); Pref.set('view', viewSel.value); Pref.set('view:' + io.id(), viewSel.value);
      st.mode = viewSel.value; fit(); if (st.mode === 'scroll') loadAll(n); else { st.seen = null; loadPage(n); }
    };
    delP.onclick = function () {
      var n = here();
      if (!delP.dataset.armed) { delP.dataset.armed = '1'; delP.textContent = 'Sure? Delete page ' + (n + 1); setTimeout(function () { if (delP) { delete delP.dataset.armed; delP.textContent = 'Delete page'; } }, 3500); return; }
      delete delP.dataset.armed; delP.textContent = 'Delete page'; menu.hidden = true; deletePage(n);
    };
    // a new paper is one step of Undo, like a stroke (DESIGN.md rule 6)
    paperSel.onchange = function () { menu.hidden = true; var was = st.page.paper || 'blank'; st.page.paper = paperSel.value; st.defaultPaper = paperSel.value; did({ t: 'paper', was: was, to: paperSel.value }); render(); };
    title.onchange = function () { var v = title.value.trim(); if (v && v !== io.title()) io.rename(v); else title.value = io.title(); };
    title.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Enter') title.blur(); });
    // its keys work while the focus is in this notebook (a tap on the page puts it there); Obsidian's own keys are left alone
    w.addEventListener('keydown', function (e) {
      if (e.target === title || (e.target && /^(TEXTAREA|INPUT|SELECT)$/.test(e.target.tagName))) return; // typing is typing
      var mod = e.metaKey || e.ctrlKey, done = true;
      if (e.key === 'Escape' && st.sel) { st.sel = null; syncButtons(); render(); }
      else if (mod && !e.altKey && e.key.toLowerCase() === 'z') { if (e.shiftKey) redo(); else undo(); }
      else if (mod && !e.altKey && e.key.toLowerCase() === 'y') redo();
      else if ((e.key === 'Delete' || e.key === 'Backspace') && st.sel) deleteSelection();
      else if (!mod && !e.altKey && e.key.toLowerCase() === 'r') toggleRuler();
      else if (!mod && (e.key === 'ArrowRight' || e.key === 'PageDown')) turn(here() + 1);
      else if (!mod && (e.key === 'ArrowLeft' || e.key === 'PageUp')) { if (here() > 0) turn(here() - 1); }
      else done = false;
      if (done) { e.preventDefault(); e.stopPropagation(); }
    });
  }
  function destroy() {
    if (!st) return; var s = st;
    if (s.raf) win.cancelAnimationFrame(s.raf); if (s.rraf) win.cancelAnimationFrame(s.rraf); if (s.lraf) win.cancelAnimationFrame(s.lraf); clearTimeout(s.thumbT); clearTimeout(s.holdT);
    if (s.ro) s.ro.disconnect(); if (s.typing) s.typing.remove();
    s.w.querySelectorAll('.nb-pop, .nb-pdf').forEach(function (x) { x.remove(); }); s.w.remove(); if (probeEl) probeEl.remove(); st = null;
  }
