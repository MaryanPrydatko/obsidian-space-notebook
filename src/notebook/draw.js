// The notebook: drawing the page. (Space: client/notebook/draw.js)
  // ---------- drawing the page ----------
  function paper(g, kind) {
    var dark = !PRINT && isDark();
    g.fillStyle = dark ? '#1b2029' : '#fffefb'; g.fillRect(0, 0, PAGE_W, PAGE_H);
    var line = dark ? 'rgba(255,255,255,0.09)' : 'rgba(30,60,120,0.13)';
    g.strokeStyle = line; g.fillStyle = line; g.lineWidth = 1.2;
    if (kind === 'lined') { g.beginPath(); for (var y = 120; y < PAGE_H - 40; y += 40) { g.moveTo(50, y); g.lineTo(PAGE_W - 50, y); } g.stroke(); g.strokeStyle = dark ? 'rgba(255,120,120,0.18)' : 'rgba(210,60,60,0.25)'; g.beginPath(); g.moveTo(110, 40); g.lineTo(110, PAGE_H - 40); g.stroke(); }
    if (kind === 'grid') { g.beginPath(); for (var x = 50; x <= PAGE_W - 50; x += 30) { g.moveTo(x, 50); g.lineTo(x, PAGE_H - 50); } for (var y2 = 50; y2 <= PAGE_H - 50; y2 += 30) { g.moveTo(50, y2); g.lineTo(PAGE_W - 50, y2); } g.stroke(); }
    if (kind === 'dots') { g.beginPath(); for (var x3 = 50; x3 <= PAGE_W - 50; x3 += 30) for (var y3 = 50; y3 <= PAGE_H - 50; y3 += 30) { g.moveTo(x3 + 1.6, y3); g.arc(x3, y3, 1.6, 0, Math.PI * 2); } g.fill(); } // one shape, one fill: 1,300 separate fills were slow
  }
  // Drawing is the slow part on an iPad: a pencil sends about 240 points a second. So the page is drawn at most once a
  // frame, and while you write, the page as it was (paper, every other stroke) is kept as a picture and only the line
  // you are writing is drawn on top. A soft edge stands in for the blurred shadow, which was costly to repaint.
  function render() { if (!st || st.raf) return; st.raf = win.requestAnimationFrame(function () { if (!st) return; st.raf = 0; draw(); }); }
  // The line you are writing is drawn on its own layer above the page, like native apps: each pencil move redraws only
  // that line, never the page under it (copying the whole page every move is what made long writing slow on an iPad).
  // A highlighter stays on the page itself, so it blends with the ink under it as you draw.
  function onLayer(s) { return s && s.t !== 'marker'; }
  function drawLive() {
    if (!st || !st.liveC) return; var o = st.liveC, g = st.lg, dpr = win.devicePixelRatio || 1, v = st.view;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, o.width, o.height);
    if (st.live && onLayer(st.live)) { g.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * vy()); drawStroke(g, ahead(st.live)); }
    // Pencil hover (iPads that sense the tip above the glass): a dot where it will land, in the pen's colour and size
    else if (st.hover && !st.live) { g.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * vy()); g.globalAlpha = 0.55; g.fillStyle = ink(st.color); g.beginPath(); g.arc(st.hover[0], st.hover[1], Math.max(1.5 / v.k, sz(st.size) / 2), 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
  }
  // Like PencilKit, the line you are writing reaches a little past the pen: where the browser predicts it is going next.
  // Only on the live layer; the next move replaces it and the saved stroke never has it.
  function ahead(s) {
    var q = s._pred; if (!q || !q.length) return s; var P = s.p, lp = P[P.length - 1], p = P.slice();
    q.forEach(function (o) { p.push(o[0], o[1], lp); }); return { t: s.t, c: s.c, w: s.w, sim: s.sim, z: s.z, p: p };
  }
  function renderLive() { if (!st || st.lraf) return; st.lraf = win.requestAnimationFrame(function () { if (!st) return; st.lraf = 0; drawLive(); }); }
  // the page's soft shadow: blurred once, small, then just stretched under every page (blurring it each frame was slow)
  var SHADOW = null;
  function shadowSprite() {
    if (SHADOW) return SHADOW; var q = 8, pad = 12, c = el('canvas'); c.width = PAGE_W / q + 2 * pad; c.height = PAGE_H / q + 2 * pad;
    var g = c.getContext('2d'); g.shadowColor = 'rgba(0,0,0,0.16)'; g.shadowBlur = 4; g.shadowOffsetX = 10000; g.shadowOffsetY = 0.5; g.fillStyle = '#000'; g.fillRect(pad - 10000, pad, PAGE_W / q, PAGE_H / q); // only the shadow lands on the sprite
    return (SHADOW = { c: c, q: q, pad: pad });
  }
  function shade(g) { var S = shadowSprite(), e = S.pad * S.q; g.drawImage(S.c, -e, -e, PAGE_W + 2 * e, PAGE_H + 2 * e); g.fillStyle = '#fff'; g.fillRect(0, 0, PAGE_W, PAGE_H); }
  // Whiteboard: no page and no edge; the paper runs on as far as you look, and its lines thin out when you zoom far out.
  function boardPaper(g, kind, v, wCss, hCss) {
    var dark = !PRINT && isDark();
    var x0 = -v.x / v.k, y0 = -v.y / v.k, x1 = (wCss - v.x) / v.k, y1 = (hCss - v.y) / v.k;
    g.fillStyle = dark ? '#1b2029' : '#fffefb'; g.fillRect(x0, y0, x1 - x0, y1 - y0);
    if (!kind || kind === 'blank') return;
    var step = kind === 'lined' ? 40 : 30; while (step * v.k < 12) step *= 4; // far out: every fourth line, then every sixteenth
    var line = dark ? 'rgba(255,255,255,0.09)' : 'rgba(30,60,120,0.13)'; g.strokeStyle = line; g.fillStyle = line; g.lineWidth = 1.2 / Math.max(1, v.k);
    var sx = Math.floor(x0 / step) * step, sy = Math.floor(y0 / step) * step;
    g.beginPath();
    if (kind === 'dots') { var r = Math.max(1.6, 1.6 / v.k); for (var x = sx; x <= x1; x += step) for (var y = sy; y <= y1; y += step) { g.moveTo(x + r, y); g.arc(x, y, r, 0, Math.PI * 2); } g.fill(); return; }
    for (var yy = sy; yy <= y1; yy += step) { g.moveTo(x0, yy); g.lineTo(x1, yy); }
    if (kind === 'grid') for (var xx = sx; xx <= x1; xx += step) { g.moveTo(xx, y0); g.lineTo(xx, y1); }
    g.stroke();
  }
  function scene(g, dpr, v, hCss) {
    if (st.mode === 'board') {
      g.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * v.y); boardPaper(g, st.page.paper || 'dots', v, st.canvas.width / dpr, hCss);
      st.page.strokes.forEach(function (s) { if (!s.hide) drawStroke(g, s, st.sel && st.sel.ids[s.id]); });
      return;
    }
    if (st.mode === 'scroll') {
      var seen = null;
      for (var i = 0; i < st.count; i++) {
        var top = v.y + OFF(i) * v.k; if (top > hCss || top + PAGE_H * v.k < 0) continue;
        if (seen == null || Math.abs(top + PAGE_H * v.k / 2 - hCss / 2) < Math.abs(v.y + OFF(seen) * v.k + PAGE_H * v.k / 2 - hCss / 2)) seen = i;
        if (i === st.n) continue;
        var pg = st.pages[i];
        g.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * top); shade(g, v.k);
        paper(g, (pg && pg.paper) || st.defaultPaper || 'blank'); if (pg) pg.strokes.forEach(function (s2) { if (!s2.hide) drawStroke(g, s2); });
      }
      if (seen != null && seen !== st.seen) { st.seen = seen; showPageNo(); }
      var at = v.y + OFF(st.count) * v.k - GAP * v.k / 2; // under the last page: a place to add one
      if (at < hCss && at + 160 * v.k > 0) { g.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * at); g.setLineDash([12, 10]); g.strokeStyle = 'rgba(120,130,150,0.55)'; g.lineWidth = 2.5; g.strokeRect(0, 0, PAGE_W, 150); g.setLineDash([]); g.fillStyle = accent(); g.font = '600 34px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('+ Add a page', PAGE_W / 2, 75); g.textAlign = 'start'; }
    }
    g.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * vy()); shade(g, v.k);
    paper(g, st.page.paper || 'blank');
    st.page.strokes.forEach(function (s) { if (!s.hide) drawStroke(g, s, st.sel && st.sel.ids[s.id]); });
  }
  function draw() {
    if (!st) return; var c = st.canvas, g = st.g, dpr = win.devicePixelRatio || 1, v = st.view, hCss = c.height / dpr, acc = accent();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    // writing a line, a shape or a lasso: the rest of the page is the picture taken when you started
    var still = (st.live || (st.lasso && !st.moving)) && !st.erasing;
    if (still) {
      var key = c.width + 'x' + c.height + ':' + v.k + ':' + v.x + ':' + v.y + ':' + st.n + ':' + st.page.strokes.length;
      if (!st.base || st.baseKey !== key) { var b = st.base || el('canvas'); b.width = c.width; b.height = c.height; var bg = b.getContext('2d'); bg.setTransform(1, 0, 0, 1, 0, 0); bg.clearRect(0, 0, b.width, b.height); scene(bg, dpr, v, hCss); st.base = b; st.baseKey = key; }
      g.drawImage(st.base, 0, 0);
    } else { st.base = null; scene(g, dpr, v, hCss); }
    g.setTransform(dpr * v.k, 0, 0, dpr * v.k, dpr * v.x, dpr * vy());
    if (st.live && !onLayer(st.live)) drawStroke(g, st.live);
    drawLive();
    if (st.lasso && st.lasso.length > 1) { g.setLineDash([8 / v.k, 6 / v.k]); g.strokeStyle = acc; g.lineWidth = 1.5 / v.k; g.beginPath(); st.lasso.forEach(function (q, i) { if (i) g.lineTo(q[0], q[1]); else g.moveTo(q[0], q[1]); }); g.closePath(); g.stroke(); g.setLineDash([]); }
    if (st.sel && st.sel.box) { var bx = st.sel.box; g.strokeStyle = acc; g.lineWidth = 1.5 / v.k; g.setLineDash([6 / v.k, 5 / v.k]); g.strokeRect(bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1]); g.setLineDash([]);
      var hs = 11 / v.k; corners(bx).forEach(function (q) { g.fillStyle = '#fff'; g.fillRect(q[0] - hs / 2, q[1] - hs / 2, hs, hs); g.strokeRect(q[0] - hs / 2, q[1] - hs / 2, hs, hs); }); } // drag a corner to resize
    if (st.eraserAt) { g.strokeStyle = 'rgba(120,120,120,0.7)'; g.lineWidth = 1.5 / v.k; g.beginPath(); g.arc(st.eraserAt[0], st.eraserAt[1], st.eraserR, 0, Math.PI * 2); g.stroke(); }
    if (st.ruler) drawRuler(g);
  }
  // The pencil's grain, so it reads as pencil next to the pen: a small tile of speckled see-through ink in the line's
  // colour, made once per colour (the ink follows the theme, so dark has its own), and filled as a pattern fixed to the
  // page: a pencil line is still one fill, and its grain stays put while you write and when you zoom.
  var GRAIN = {};
  function grain(g, col) {
    var keep = g._grain || (g._grain = {}); if (keep[col]) return keep[col];
    var c = GRAIN[col];
    if (!c) {
      var n = 64, x = (c = GRAIN[col] = el('canvas')).getContext('2d'); c.width = c.height = n; x.fillStyle = col; x.fillRect(0, 0, n, n);
      var im = x.getImageData(0, 0, n, n), d = im.data, seed = 7;
      var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // the same grain every time
      for (var i = 3; i < d.length; i += 4) { var a = 0.55 + 0.45 * rnd(); if (rnd() < 0.24) a *= 0.3; d[i] = Math.round(d[i] * a); } // graphite on the tooth, paper in the hollows
      x.putImageData(im, 0, 0);
    }
    var pt = g.createPattern(c, 'repeat'); if (pt.setTransform) pt.setTransform(new DOMMatrix([0.7, 0, 0, 0.7, 0, 0])); // a grain 0.7 page units across
    return (keep[col] = pt);
  }
  function drawStroke(g, s, selected) {
    if (s.t === 'text') {
      var fs = tpx(s); g.fillStyle = ink(s.c); g.font = '500 ' + fs + 'px ' + FONT; g.textBaseline = 'top';
      textLines(s).forEach(function (l, i) { g.fillText(l, s.x, s.y + i * fs * 1.3); });
      if (selected) { var b = bounds(s); g.strokeStyle = accent(); g.lineWidth = 1 / st.view.k; g.strokeRect(b[0], b[1], b[2] - b[0], b[3] - b[1]); }
      return;
    }
    var path = pathOf(s);
    if (s.t === 'marker') { var dk = darkPaper(); g.globalAlpha = dk ? 0.5 : 0.45; g.globalCompositeOperation = dk ? 'screen' : 'multiply'; }
    if (s.t === 'pencil') g.globalAlpha = 0.9 - 0.5 * (s._shade || 0); // a pencil laid down shades lighter (one alpha per line: the mean lean)
    g.fillStyle = s.t === 'pencil' ? grain(g, ink(s.c)) : ink(s.c); g.fill(path); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    if (selected) { g.strokeStyle = accent(); g.lineWidth = 1 / st.view.k; g.stroke(pathOf(s)); }
  }
  function fit() {
    var r = st.canvas.getBoundingClientRect(); if (r.width < 40 || r.height < 40) { st.needFit = true; return; } st.needFit = false; var k = Math.min((r.width - 32) / PAGE_W, 1.4);
    st.k0 = k; st.view = { k: k, x: (r.width - PAGE_W * k) / 2, y: 16 };
    if (st.mode === 'board' && st.page && st.page.strokes.length) { // the whole drawing in view, with room around it
      var b = [Infinity, Infinity, -Infinity, -Infinity]; st.page.strokes.forEach(function (s) { var q = bounds(s); b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[2]); b[3] = Math.max(b[3], q[3]); });
      var k2 = Math.max(minK(), Math.min(1.4, (r.width - 80) / Math.max(200, b[2] - b[0]), (r.height - 80) / Math.max(200, b[3] - b[1])));
      st.view = { k: k2, x: r.width / 2 - k2 * (b[0] + b[2]) / 2, y: r.height / 2 - k2 * (b[1] + b[3]) / 2 };
    }
  }
  function resize() {
    if (!st) return; var r = st.canvas.getBoundingClientRect(), dpr = win.devicePixelRatio || 1;
    st.canvas.width = Math.round(r.width * dpr); st.canvas.height = Math.round(r.height * dpr); if (st.liveC) { st.liveC.width = st.canvas.width; st.liveC.height = st.canvas.height; }
    if (st.needFit) { fit(); if (st.mode === 'scroll' && !st.needFit) scrollToPage(here(), true); }
    render();
  }
  function toPage(ev) { var r = st.canvas.getBoundingClientRect(), v = st.view; return [(ev.clientX - r.left - v.x) / v.k, (ev.clientY - r.top - vy()) / v.k]; }
  // Scroll view: the page under the pointer becomes the one you write on (its strokes, its saving, its undo)
  function pageAt(ev) { var r = st.canvas.getBoundingClientRect(), gy = (ev.clientY - r.top - st.view.y) / st.view.k; return Math.max(0, Math.min(st.count - 1, Math.floor(gy / (PAGE_H + GAP)))); }
  function activate(i) {
    if (!st || i === st.n || !st.pages[i]) return;
    st.n = i; st.page = st.pages[i]; st.sel = null; st.paperSel.value = st.page.paper || 'blank'; showPageNo(); syncButtons();
  }

