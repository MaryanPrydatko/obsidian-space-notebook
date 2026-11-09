// The notebook: all pages at a glance, and a PDF of the notebook. (Space: client/notebook/export.js)
  // ---------- all pages at a glance: tap one to open it ----------
  function thumb(c, page) { c.getContext('2d').setTransform(1, 0, 0, 1, 0, 0); c.getContext('2d').clearRect(0, 0, c.width, c.height); var g = c.getContext('2d'), k = c.width / PAGE_W; g.setTransform(k, 0, 0, k, 0, 0); paper(g, page.paper || 'blank'); (page.strokes || []).forEach(function (s) { if (s.t === 'text') { var fs = tpx(s); g.fillStyle = ink(s.c); g.font = '500 ' + fs + 'px ' + FONT; g.textBaseline = 'top'; textLines(s).forEach(function (l, i) { g.fillText(l, s.x, s.y + i * fs * 1.3); }); return; } g.globalAlpha = s.t === 'marker' ? 0.35 : s.t === 'pencil' ? 0.8 : 1; g.fillStyle = ink(s.c); g.fill(pathOf(s)); }); g.globalAlpha = 1; }
  function overview() {
    if (!st) return; var old = st.w.querySelector('.nb-over'); if (old) { old.remove(); return; }
    var box = el('div', 'nb-over'), grid = el('div', 'nb-grid'); box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'All pages');
    var head = el('div', 'nb-over-head'); head.append(el('strong', null, 'Pages')); var x = el('button', 'nb-b', 'Close'); x.onclick = function () { box.remove(); }; head.append(x);
    box.append(head, grid); st.w.querySelector('.nb-stage').append(box);
    var count = st.count;
    for (var i = 0; i < count; i++) (function (n) {
      var b = el('button', 'nb-thumb' + (n === st.n ? ' on' : '')), c = el('canvas'); c.width = 200; c.height = Math.round(200 * PAGE_H / PAGE_W);
      b.append(c, el('span', null, String(n + 1))); b.setAttribute('aria-label', 'Page ' + (n + 1)); b.onclick = function () { box.remove(); go(n); }; grid.append(b);
      thumb(c, st.pages[n]);
    })(i);
    var add = el('button', 'nb-thumb add', '+ Page'); add.onclick = function () { box.remove(); insertPage(st.count); }; grid.append(add);
  }

  // ---------- a PDF of this page or of all of them: each page drawn sharp (about 240 dpi) and put in a real PDF file ----------
  // No library: the PDF is a handful of objects, one picture per page, squeezed with the browser's own deflate.
  function pageCanvas(page) {
    var q = 2, bx = null, W = PAGE_W, H = PAGE_H;
    if (st.mode === 'board') { // a whiteboard: the page is what is drawn on it, with a margin
      bx = [Infinity, Infinity, -Infinity, -Infinity]; page.strokes.forEach(function (s0) { var b = bounds(s0); bx = [Math.min(bx[0], b[0]), Math.min(bx[1], b[1]), Math.max(bx[2], b[2]), Math.max(bx[3], b[3])]; });
      if (!isFinite(bx[0])) bx = [0, 0, PAGE_W, PAGE_H]; bx = [bx[0] - 60, bx[1] - 60, bx[2] + 60, bx[3] + 60]; W = bx[2] - bx[0]; H = bx[3] - bx[1];
      q = Math.min(2, 4000 / Math.max(W, H));
    }
    var c = el('canvas'); c.width = Math.round(W * q); c.height = Math.round(H * q);
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
    PRINT = true;
    try {
      if (bx) { g.setTransform(q, 0, 0, q, -bx[0] * q, -bx[1] * q); boardPaper(g, page.paper || 'blank', { k: q, x: -bx[0] * q, y: -bx[1] * q }, c.width, c.height); }
      else { g.setTransform(q, 0, 0, q, 0, 0); paper(g, page.paper || 'blank'); }
      page.strokes.forEach(function (s0) { if (!s0.hide) drawStroke(g, s0); });
    } finally { PRINT = false; }
    return { c: c, w: W, h: H };
  }
  function deflate(bytes) {
    if (!win.CompressionStream) return Promise.resolve(null);
    var cs = new win.CompressionStream('deflate'), w = cs.writable.getWriter(); w.write(bytes); w.close();
    return new Response(cs.readable).arrayBuffer().then(function (b) { return new Uint8Array(b); });
  }
  function pageImage(page) {
    var pc = pageCanvas(page), c = pc.c, d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data, rgb = new Uint8Array(c.width * c.height * 3);
    for (var i = 0, j = 0; i < d.length; i += 4) { rgb[j++] = d[i]; rgb[j++] = d[i + 1]; rgb[j++] = d[i + 2]; }
    return deflate(rgb).then(function (z) {
      if (z) return { w: c.width, h: c.height, pw: pc.w, ph: pc.h, data: z, filter: 'FlateDecode' };
      return new Promise(function (done) { c.toBlob(function (b) { b.arrayBuffer().then(function (a) { done({ w: c.width, h: c.height, pw: pc.w, ph: pc.h, data: new Uint8Array(a), filter: 'DCTDecode' }); }); }, 'image/jpeg', 0.92); });
    });
  }
  function makePdf(imgs) {
    var parts = [], offs = [], len = 0, enc = new TextEncoder();
    var add = function (x) { var b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
    var obj = function (n, body) { offs[n] = len; add(n + ' 0 obj\n'); body(); add('\nendobj\n'); };
    add('%PDF-1.4\n%âãÏÓ\n');
    var kids = imgs.map(function (_, i) { return (3 + i * 3) + ' 0 R'; }).join(' ');
    obj(1, function () { add('<< /Type /Catalog /Pages 2 0 R >>'); });
    obj(2, function () { add('<< /Type /Pages /Kids [' + kids + '] /Count ' + imgs.length + ' >>'); });
    imgs.forEach(function (im, i) {
      var n = 3 + i * 3, pw = 595.28, ph = +(pw * im.ph / im.pw).toFixed(2), draw = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q';
      obj(n, function () { add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 ' + (n + 2) + ' 0 R >> >> /Contents ' + (n + 1) + ' 0 R >>'); });
      obj(n + 1, function () { add('<< /Length ' + draw.length + ' >>\nstream\n' + draw + '\nendstream'); });
      obj(n + 2, function () { add('<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /' + im.filter + ' /Length ' + im.data.length + ' >>\nstream\n'); add(im.data); add('\nendstream'); });
    });
    var x = len, total = 3 + imgs.length * 3; add('xref\n0 ' + total + '\n0000000000 65535 f \n');
    for (var k = 1; k < total; k++) add(String(offs[k]).padStart(10, '0') + ' 00000 n \n');
    add('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + x + '\n%%EOF\n');
    return new Blob(parts, { type: 'application/pdf' });
  }
  // the PDF of this page (the one in view) or of all pages; Obsidian keeps it next to the notebook (io.savePdf)
  function pdfOf(all) {
    var here0 = here(), list = all ? st.pages.slice() : [st.pages[here0]], out = [], chain = Promise.resolve();
    list.forEach(function (pg) { chain = chain.then(function () { return pageImage(pg).then(function (im) { out.push(im); }); }); });
    return chain.then(function () { return { blob: makePdf(out), pages: out.length, page: here0 }; });
  }
  function exportPdf(all) {
    if (!st) return; var s0 = st, name = io.title() || 'Notebook';
    s0.status.textContent = 'Making the PDF';
    pdfOf(all).then(function (r) {
      return io.savePdf(name + (all ? '' : ' (page ' + (r.page + 1) + ')'), r.blob).then(function (path) { if (st === s0) s0.status.textContent = 'PDF saved, ' + r.pages + (r.pages === 1 ? ' page' : ' pages') + ': ' + path; });
    }).catch(function (e) { if (st === s0) s0.status.textContent = 'Could not make the PDF: ' + e.message; });
  }
  function pdfMenu(btn) {
    var old = st.w.querySelector('.nb-pdf'); if (old) { old.remove(); return; }
    var m = el('div', 'nb-pdf glass'), one = el('button', 'nb-b', 'This page'), all = el('button', 'nb-b', 'All ' + st.count + ' pages');
    one.onclick = function () { m.remove(); exportPdf(false); }; all.onclick = function () { m.remove(); exportPdf(true); };
    m.append(el('span', null, 'Save as PDF'), one, all); st.w.append(m);
    var r = btn.getBoundingClientRect(); m.style.top = (r.bottom + 6) + 'px'; m.style.right = Math.max(8, win.innerWidth - r.right) + 'px';
    setTimeout(function () { doc.addEventListener('pointerdown', function off(ev) { if (!m.contains(ev.target) && ev.target !== btn) { m.remove(); doc.removeEventListener('pointerdown', off, true); } }, true); }, 0);
  }

