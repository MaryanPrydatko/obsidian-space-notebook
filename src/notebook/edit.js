// The notebook: saving, undo, resizing and moving what the lasso picked, text, shapes, selection. (Space: client/notebook/edit.js)
  // ---------- saving: the whole notebook is one file; Obsidian writes it a moment after you stop (io.changed) ----------
  function changed() {
    if (!st || st.locked) return; st.status.textContent = 'Saving'; io.changed();
    var n = st.n; clearTimeout(st.thumbT); st.thumbT = setTimeout(function () { sideThumb(n); }, 600);
  }

  // ---------- undo ----------
  function apply(op, back) {
    var S = st.page.strokes;
    if (op.t === 'add') { if (back) op.s.forEach(function (s) { var i = S.indexOf(s); if (i >= 0) S.splice(i, 1); }); else op.s.forEach(function (s) { S.push(s); }); }
    if (op.t === 'del') { if (back) op.s.forEach(function (s) { S.push(s); }); else op.s.forEach(function (s) { var i = S.indexOf(s); if (i >= 0) S.splice(i, 1); }); }
    if (op.t === 'move') { var d = back ? -1 : 1; op.s.forEach(function (s) { shift(s, op.dx * d, op.dy * d); }); }
    if (op.t === 'text') { op.s[0].text = back ? op.was : op.to; op.s[0]._b = null; }
    if (op.t === 'color') op.s.forEach(function (s, i) { s.c = back ? op.was[i] : op.to; });
    if (op.t === 'size') op.s.forEach(function (s, i) { s.w = back ? op.was[i] : op.to; s._path = null; s._b = null; });
    if (op.t === 'scale') op.s.forEach(function (s, i) { setGeom(s, back ? op.was[i] : op.to[i]); });
    if (op.t === 'paper') { st.page.paper = st.defaultPaper = back ? op.was : op.to; st.paperSel.value = st.page.paper || 'blank'; }
    if (op.t === 'swap') { var out = back ? op.made : op.gone, inn = back ? op.gone : op.made; out.forEach(function (s) { var i = S.indexOf(s); if (i >= 0) S.splice(i, 1); }); inn.forEach(function (s) { S.push(s); }); }
  }
  // ---------- resizing what the lasso picked: drag a corner; the opposite corner stays put, the shape keeps its proportions ----------
  function corners(b) { return [[b[0], b[1]], [b[2], b[1]], [b[2], b[3]], [b[0], b[3]]]; }
  function geom(s) { return s.t === 'text' ? { x: s.x, y: s.y, z: s.z || 1 } : { p: s.p.slice(), z: s.z || 1 }; }
  function setGeom(s, q) { if (q.p) s.p = q.p.slice(); else { s.x = q.x; s.y = q.y; } if (q.z && Math.abs(q.z - 1) > 0.001) s.z = +q.z.toFixed(3); else delete s.z; s._path = s._b = null; }
  function scaled(q, a, f) { if (q.p) { var p2 = q.p.slice(); for (var i = 0; i < p2.length; i += 3) { p2[i] = a[0] + (p2[i] - a[0]) * f; p2[i + 1] = a[1] + (p2[i + 1] - a[1]) * f; } return { p: p2, z: q.z * f }; } return { x: a[0] + (q.x - a[0]) * f, y: a[1] + (q.y - a[1]) * f, z: q.z * f }; }
  function shift(s, dx, dy) { if (s.t === 'text') { s.x += dx; s.y += dy; } else for (var i = 0; i < s.p.length; i += 3) { s.p[i] += dx; s.p[i + 1] += dy; } s._path = s._b = null; }
  // typing on the page: a box where you tapped; Enter makes a new line, a tap outside (or Esc) keeps it
  function typeAt(p, existing) {
    var r = st.canvas.getBoundingClientRect(), v = st.view, size = existing ? existing.w : st.size, fs = (existing ? tpx(existing) : tpx({ w: size }) * zNow()) * v.k;
    var ta = el('textarea', 'nb-type'); ta.value = existing ? existing.text : ''; ta.setAttribute('aria-label', 'Text on the page');
    ta.style.left = (r.left + v.x + (existing ? existing.x : p[0]) * v.k) + 'px'; ta.style.top = (r.top + vy() + (existing ? existing.y : p[1]) * v.k) + 'px';
    ta.style.font = '500 ' + fs + 'px ' + FONT; ta.style.color = ink(existing ? existing.c : st.color);
    if (existing) { existing.hide = true; render(); }
    doc.body.append(ta); st.typing = ta; setTimeout(function () { ta.focus(); }, 0);
    var grow = function () { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; ta.style.width = Math.max(120, Math.min(win.innerWidth - 40, ta.value.split('\n').reduce(function (m, l) { return Math.max(m, l.length); }, 4) * fs * 0.6 + 30)) + 'px'; };
    grow(); ta.oninput = grow;
    var done = false, fin = function (keep) {
      if (done || !st) return; done = true; st.typing = null; var v2 = ta.value.replace(/\s+$/, ''); ta.remove();
      if (existing) { existing.hide = false; if (keep && v2 !== existing.text) { if (v2) { var was = existing.text; existing.text = v2; existing._b = null; did({ t: 'text', s: [existing], was: was, to: v2 }); } else { st.page.strokes.splice(st.page.strokes.indexOf(existing), 1); did({ t: 'del', s: [existing] }); } } render(); return; }
      if (keep && v2) { var s = { id: uid(), t: 'text', c: st.color, w: st.size, x: p[0], y: p[1], text: v2 }; if (zNow() !== 1) s.z = +zNow().toFixed(2); st.page.strokes.push(s); did({ t: 'add', s: [s] }); }
      render();
    };
    ta.addEventListener('keydown', function (e) { e.stopPropagation(); if (e.key === 'Escape') { e.preventDefault(); fin(true); } });
    ta.addEventListener('blur', function () { fin(true); });
  }
  // clean shapes, made of the same ink (so the eraser, lasso, colours and undo treat them like any stroke)
  function shapePoints(kind, a, b, shift) {
    var x0 = a[0], y0 = a[1], x1 = b[0], y1 = b[1], pts = [], add = function (x, y) { pts.push(x, y, 0.5); };
    if (shift && (kind === 'box' || kind === 'circle')) { var m = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); x1 = x0 + Math.sign(x1 - x0 || 1) * m; y1 = y0 + Math.sign(y1 - y0 || 1) * m; }
    var seg = function (ax, ay, bx, by) { var n = Math.max(2, Math.ceil(Math.hypot(bx - ax, by - ay) / 6)); for (var i = 0; i <= n; i++) add(ax + (bx - ax) * i / n, ay + (by - ay) * i / n); };
    if (kind === 'line' || kind === 'arrow') { seg(x0, y0, x1, y1); }
    if (kind === 'box') { seg(x0, y0, x1, y0); seg(x1, y0, x1, y1); seg(x1, y1, x0, y1); seg(x0, y1, x0, y0); }
    if (kind === 'circle') { var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, rx = Math.abs(x1 - x0) / 2, ry = Math.abs(y1 - y0) / 2, n = Math.max(24, Math.round((rx + ry) / 4)); for (var i = 0; i <= n; i++) { var t = i / n * Math.PI * 2; add(cx + Math.cos(t) * rx, cy + Math.sin(t) * ry); } }
    return pts;
  }
  // Hold to snap (Apple Notes, GoodNotes): draw a rough line, box or circle and hold still, and it becomes a clean one.
  function guessShape(P) {
    var n = P.length / 3; if (n < 4) return null;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, L = 0;
    for (var i = 0; i < P.length; i += 3) { x0 = Math.min(x0, P[i]); y0 = Math.min(y0, P[i + 1]); x1 = Math.max(x1, P[i]); y1 = Math.max(y1, P[i + 1]); if (i) L += Math.hypot(P[i] - P[i - 3], P[i + 1] - P[i - 2]); }
    var W = x1 - x0, H = y1 - y0, size = Math.max(W, H), a = [P[0], P[1]], b = [P[P.length - 3], P[P.length - 2]], chord = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (size < 24) return null;
    // a line: no point far from the straight line between its ends (a trembling hand adds length, not distance)
    if (chord > 0.6 * L) { var dev = 0, ux = (b[0] - a[0]) / chord, uy = (b[1] - a[1]) / chord; for (var q = 0; q < P.length; q += 3) dev = Math.max(dev, Math.abs((P[q] - a[0]) * uy - (P[q + 1] - a[1]) * ux)); if (dev < 0.07 * chord) return { kind: 'line', a: a, b: b }; }
    if (chord > 0.3 * size || L < 2 * size || Math.min(W, H) < 0.15 * size) return null;
    var eb = 0, ec = 0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    for (var j = 0; j < P.length; j += 3) {
      var x = P[j], y = P[j + 1]; eb += Math.min(x - x0, x1 - x, y - y0, y1 - y) / size;
      ec += Math.abs(Math.hypot((x - cx) / (W / 2), (y - cy) / (H / 2)) - 1);
    }
    eb /= n; ec /= n; var box = eb / 0.05, circle = ec / 0.14;
    if (Math.min(box, circle) > 1) return null;
    return { kind: box < circle ? 'box' : 'circle', a: [x0, y0], b: [x1, y1] };
  }
  function holdArm(ev) {
    var s = st.live; if (!s || s.edge || s.snap || (s.t !== 'pen' && s.t !== 'pencil' && s.t !== 'marker')) return;
    if (st.holdAt && Math.hypot(ev.clientX - st.holdAt[0], ev.clientY - st.holdAt[1]) < 4) return; // a still hand trembles a little
    st.holdAt = [ev.clientX, ev.clientY]; clearTimeout(st.holdT); st.holdT = setTimeout(snapHold, 550);
  }
  function snapHold() {
    var s = st && st.live; if (!s || s.snap) return; var g = guessShape(s.p); if (!g) return;
    s.p = shapePoints(g.kind, g.a, g.b); s.flat = 1; s.sim = 0; s._pred = null; s._path = s._b = null; s.snap = g;
    if (onLayer(s)) renderLive(); else render();
  }
  function arrowHead(a, b) { var ang = Math.atan2(b[1] - a[1], b[0] - a[0]), L = 22, pts = []; [ang - 0.45, ang + 0.45].forEach(function (t, i) { var hx = b[0] - L * Math.cos(t), hy = b[1] - L * Math.sin(t); if (i) pts.push(b[0], b[1], 0.5); for (var k = 0; k <= 4; k++) pts.push(hx + (b[0] - hx) * k / 4, hy + (b[1] - hy) * k / 4, 0.5); }); return pts; }
  function did(op) { op.pg = st.n; st.undo.push(op); st.redo = []; changed(); syncButtons(); }
  function undo() { var op = st.undo.pop(); if (!op) return; if (op.pg != null) activate(op.pg); apply(op, true); st.redo.push(op); st.sel = null; changed(); render(); syncButtons(); }
  function redo() { var op = st.redo.pop(); if (!op) return; if (op.pg != null) activate(op.pg); apply(op, false); st.undo.push(op); changed(); render(); syncButtons(); }
  function syncButtons() { if (!st) return; st.btnUndo.disabled = !st.undo.length; st.btnRedo.disabled = !st.redo.length; st.btnDel.hidden = !(st.sel && st.sel.list.length); }

  // ---------- selection ----------
  function select(list) {
    if (!list.length) { st.sel = null; syncButtons(); render(); return; }
    var b = [Infinity, Infinity, -Infinity, -Infinity], ids = {};
    list.forEach(function (s) { var q = bounds(s); b = [Math.min(b[0], q[0]), Math.min(b[1], q[1]), Math.max(b[2], q[2]), Math.max(b[3], q[3])]; ids[s.id] = 1; });
    st.sel = { list: list, ids: ids, box: b }; syncButtons(); render();
  }
  function deleteSelection() { if (!st.sel) return; var list = st.sel.list; apply({ t: 'del', s: list }, false); did({ t: 'del', s: list }); st.sel = null; render(); syncButtons(); }

