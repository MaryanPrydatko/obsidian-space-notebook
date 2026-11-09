// The notebook: pointers: the pencil writes, fingers move and zoom. (Space: client/notebook/pointers.js)
  // ---------- pointers: the pencil writes, fingers move and zoom the page (once a pencil has been used) ----------
  function wire(c) {
    var touches = {}, pinch = null, tap = null, held = {}, penId = null, penUpAt = 0;
    // Like GoodNotes: tap with two fingers to undo, three to redo. Palm rejection: while the pencil is down (and a moment
    // after), a hand on the glass does nothing at all: it never pans, never ends or erases what the pencil writes.
    // (not by contact size: on an iPad a fingertip often reports as wide as a palm, and pinching to zoom stopped working)
    var capture = function (c, ev) { try { c.setPointerCapture(ev.pointerId); } catch (e) { /* not an active pointer */ } };
    var palm = function (ev) { return ev.pointerType === 'touch' && (penId != null || Date.now() - penUpAt < 150); };
    c.addEventListener('pointerdown', function (ev) {
      if (palm(ev)) { ev.preventDefault(); return; }
      io.activate(); if (doc.activeElement !== st.w && !(st.typing && st.typing === doc.activeElement)) st.w.focus({ preventScroll: true }); // the canvas keeps the mouse from making this tab the one you work in
      st.hover = null;
      if (ev.pointerType === 'pen') { st.penSeen = true; penId = ev.pointerId; if (pinch || Object.keys(touches).length) { pinch = null; touches = {}; held = {}; tap = null; } } // the pencil lands: a hand that was moving the page stops
      var finger = ev.pointerType === 'touch';
      if (st.ruler && ev.pointerType !== 'pen' && ev.button <= 0 && !Object.keys(touches).length && !st.rulerDrag) {
        var rp = toPage(ev), rh = rulerHit(rp);
        if (rh) { ev.preventDefault(); capture(c, ev); st.rulerDrag = { how: rh, from: rp, was: Object.assign({}, st.ruler), pid: ev.pointerId }; return; }
      }
      if (finger) {
        if (!Object.keys(touches).length) tap = { t: Date.now(), n: 0, moved: false };
        touches[ev.pointerId] = [ev.clientX, ev.clientY]; held[ev.pointerId] = [ev.clientX, ev.clientY];
        if (tap) tap.n = Math.max(tap.n, Object.keys(touches).length);
      }
      if (finger && ((st.penSeen && !st.fingerWrites) || Object.keys(touches).length > 1)) {
        if (st.live) { st.live = null; } // a second finger: that was a pinch, not writing
        else if (Object.keys(touches).length === 1) fingerTold(); // the first time a finger moves the page instead of writing, it says why (once)
        var ks = Object.keys(touches); if (ks.length >= 2) { var a = touches[ks[0]], b = touches[ks[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], v: Object.assign({}, st.view) }; } else pinch = { t0: Date.now(), pan: [ev.clientX, ev.clientY], v: Object.assign({}, st.view) };
        capture(c, ev); render(); return;
      }
      if (ev.button > 0) return;
      if (st.mode === 'scroll') {
        var gy0 = (ev.clientY - c.getBoundingClientRect().top - st.view.y) / st.view.k; // the + under the last page
        if (gy0 > OFF(st.count) - GAP / 2 && gy0 < OFF(st.count) - GAP / 2 + 150) { ev.preventDefault(); insertPage(st.count); return; }
        activate(pageAt(ev));
      }
      capture(c, ev); ev.preventDefault();
      var p = toPage(ev), pr = ev.pointerType === 'pen' && ev.pressure > 0 ? ev.pressure : 0.5;
      if (st.sel && st.sel.box && (st.tool === 'lasso' || st.sel)) {
        var cs = corners(st.sel.box), hit = -1, tol = 16 / st.view.k; cs.forEach(function (q, i) { if (Math.abs(p[0] - q[0]) < tol && Math.abs(p[1] - q[1]) < tol) hit = i; });
        if (hit >= 0) { st.scaling = { a: cs[(hit + 2) % 4], c: cs[hit], was: st.sel.list.map(geom) }; return; }
      }
      if (st.tool === 'lasso') {
        if (st.sel && p[0] > st.sel.box[0] && p[0] < st.sel.box[2] && p[1] > st.sel.box[1] && p[1] < st.sel.box[3]) { st.moving = { from: p, dx: 0, dy: 0 }; return; }
        st.sel = null; st.lasso = [p]; render(); return;
      }
      if (st.tool === 'eraser') { st.erasing = []; st.made = []; eraseAt(p); return; }
      if (st.tool === 'shape') { st.shaping = { from: p }; st.live = { id: uid(), t: 'pen', c: st.color, w: st.size, sim: 0, p: shapePoints(st.shape, p, p), flat: 1 }; if (zNow() !== 1) st.live.z = +zNow().toFixed(2); render(); return; }
      if (st.tool === 'text' && st.typing) { ev.preventDefault(); if (doc.activeElement && doc.activeElement.blur) doc.activeElement.blur(); return; } // a tap outside finishes the typing, nothing more
      if (st.tool === 'text') { var hitT = st.page.strokes.filter(function (s) { return s.t === 'text' && near(s, p[0], p[1], 2); }).pop(); typeAt(p, hitT); return; }
      // the browser cut the last line short (a system gesture: Scribble, a long press) while the pencil kept going: when the
      // pencil lands again within a moment where that line stopped, it is the same line, not a new one with a gap
      if (ev.pointerType === 'pen' && st.cut && Date.now() - st.cut.at < 250 && st.cut.s.t === st.tool) {
        var cs = st.cut.s, lx = cs.p[cs.p.length - 3], ly = cs.p[cs.p.length - 2]; st.cut = null;
        if (Math.hypot(p[0] - lx, p[1] - ly) < 40 / st.view.k) {
          var ci = st.page.strokes.indexOf(cs); if (ci >= 0) st.page.strokes.splice(ci, 1);
          var lu = st.undo[st.undo.length - 1]; if (lu && lu.t === 'add' && lu.s[0] === cs) st.undo.pop();
          cs._path = null; st.live = cs; st.livePid = ev.pointerId; addPoint(cs, p, ev); render(); return;
        }
      }
      st.cut = null;
      st.live = { id: uid(), t: st.tool, c: st.color, w: st.size, sim: ev.pointerType !== 'pen', p: [p[0], p[1], st.tool === 'pencil' && ev.pointerType === 'pen' ? pack(pr, slantOf(ev)) : pr] }; st.livePid = ev.pointerId; if (zNow() !== 1) st.live.z = +zNow().toFixed(2);
      if (st.ruler && (st.tool === 'pen' || st.tool === 'pencil' || st.tool === 'marker')) { st.live.edge = rulerEdge(p, ev.pointerType === 'pen'); if (st.live.edge) { var ep = onEdge(st.live, p); st.live.p[0] = ep[0]; st.live.p[1] = ep[1]; } }
      render();
    });
    c.addEventListener('pointermove', function (ev) {
      if (ev.pointerType === 'pen' && !ev.buttons && !st.live && (st.tool === 'pen' || st.tool === 'pencil' || st.tool === 'marker')) { st.hover = toPage(ev); renderLive(); return; }
      if (st.hover) { st.hover = null; renderLive(); }
      if (st.rulerDrag && ev.pointerId === st.rulerDrag.pid) {
        var RD = st.rulerDrag, rq = toPage(ev), R = st.ruler;
        if (RD.how === 'move') { R.x = RD.was.x + rq[0] - RD.from[0]; R.y = RD.was.y + rq[1] - RD.from[1]; }
        else { var a = RD.was.a + Math.atan2(rq[1] - RD.was.y, rq[0] - RD.was.x) - Math.atan2(RD.from[1] - RD.was.y, RD.from[0] - RD.was.x), step = Math.PI / 12, nearA = Math.round(a / step) * step; R.a = Math.abs(a - nearA) < 0.05 ? nearA : a; }
        render(); return;
      }
      if (ev.pointerType === 'touch' && !touches[ev.pointerId] && (st.live || penId != null)) return; // a palm while writing
      if (ev.pointerType === 'touch' && touches[ev.pointerId]) {
        touches[ev.pointerId] = [ev.clientX, ev.clientY];
        var h0 = held[ev.pointerId]; if (h0 && Math.hypot(ev.clientX - h0[0], ev.clientY - h0[1]) > 12) { delete held[ev.pointerId]; if (tap) tap.moved = true; }
        if (pinch) {
          var ks = Object.keys(touches);
          if (pinch.pan && ks.length === 1) { st.view = { k: pinch.v.k, x: pinch.v.x + ev.clientX - pinch.pan[0], y: pinch.v.y + ev.clientY - pinch.pan[1] }; render(); return; }
          if (pinch.d && ks.length >= 2) { var a = touches[ks[0]], b = touches[ks[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]), m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], r = c.getBoundingClientRect(), k = Math.max(minK(), Math.min(5, pinch.v.k * d / pinch.d)), f = k / pinch.v.k; st.view = { k: k, x: m[0] - r.left - f * (pinch.m[0] - r.left - pinch.v.x), y: m[1] - r.top - f * (pinch.m[1] - r.top - pinch.v.y) }; render(); return; }
          return;
        }
      }
      var events = ev.getCoalescedEvents ? ev.getCoalescedEvents() : [ev]; if (!events.length) events = [ev];
      if (st.shaping && st.live) { var to = toPage(ev); st.live.p = shapePoints(st.shape, st.shaping.from, to, ev.shiftKey); if (st.shape === 'arrow') st.live.p = st.live.p.concat(arrowHead(st.shaping.from, to)); st.live._path = st.live._b = null; renderLive(); return; }
      if (st.live && st.live.snap) { if (st.livePid != null && ev.pointerId !== st.livePid) return; if (st.live.snap.kind === 'line') { st.live.p = shapePoints('line', st.live.snap.a, toPage(ev)); st.live._path = st.live._b = null; if (onLayer(st.live)) renderLive(); else render(); } return; }
      if (st.live) { if (st.livePid != null && ev.pointerId !== st.livePid) return; holdArm(ev); events.forEach(function (e2) { addPoint(st.live, onEdge(st.live, toPage(e2)), e2); }); st.live._path = null; st.live._pred = ev.pointerType === 'pen' && ev.getPredictedEvents ? ev.getPredictedEvents().map(function (e3) { return onEdge(st.live, toPage(e3)); }) : null; if (onLayer(st.live)) renderLive(); else render(); return; }
      var p = toPage(ev);
      if (st.erasing) { events.forEach(function (e2) { eraseAt(toPage(e2)); }); return; }
      if (st.tool === 'eraser') { st.eraserAt = p; render(); }
      if (st.lasso) { st.lasso.push(p); render(); return; }
      if (st.scaling) {
        var S2 = st.scaling, ax = S2.c[0] - S2.a[0], ay = S2.c[1] - S2.a[1], f = Math.max(0.05, Math.min(20, ((p[0] - S2.a[0]) * ax + (p[1] - S2.a[1]) * ay) / Math.max(1, ax * ax + ay * ay)));
        st.sel.list.forEach(function (s2, i) { setGeom(s2, scaled(S2.was[i], S2.a, f)); }); S2.f = f; select(st.sel.list); return;
      }
      if (st.moving) { var dx = p[0] - st.moving.from[0], dy = p[1] - st.moving.from[1]; st.sel.list.forEach(function (s) { shift(s, dx, dy); }); st.moving.dx += dx; st.moving.dy += dy; st.moving.from = p; select(st.sel.list); }
    });
    var up = function (ev) {
      if (st.holdT && (!st.live || ev.pointerId === st.livePid)) { clearTimeout(st.holdT); st.holdT = 0; st.holdAt = null; }
      if (st.rulerDrag && ev.pointerId === st.rulerDrag.pid) { st.rulerDrag = null; render(); return; }
      if (ev.pointerType === 'pen' && ev.pointerId === penId) { penId = null; penUpAt = Date.now(); }
      if (ev.pointerType === 'touch' && !touches[ev.pointerId]) return; // a palm that was ignored lifts: nothing to do
      if (st.live && st.livePid != null && ev.pointerId !== st.livePid) return; // only the hand that writes ends the stroke
      if (ev.pointerType === 'touch') {
        delete touches[ev.pointerId]; delete held[ev.pointerId];
        if (!Object.keys(touches).length && tap) { var tp = tap; tap = null; if (!tp.moved && tp.n >= 2 && Date.now() - tp.t < 400) { pinch = null; st.live = null; if (tp.n === 2) undo(); else redo(); return; } }
        if (pinch) {
          var pn = pinch; if (!Object.keys(touches).length) pinch = null;
          if (pn.pan && st.mode === 'pages' && Date.now() - pn.t0 < 500) { var sdx = ev.clientX - pn.pan[0], sdy = ev.clientY - pn.pan[1]; if (Math.abs(sdx) > 90 && Math.abs(sdx) > 2 * Math.abs(sdy)) { st.view = pn.v; if (sdx < 0) turn(st.n + 1); else if (st.n > 0) turn(st.n - 1); else render(); } }
          return;
        }
      }
      if (st.shaping) { st.shaping = null; var sh = st.live; st.live = null; var bb = bounds(sh); if (bb[2] - bb[0] > 30 || bb[3] - bb[1] > 30) { sh._path = sh._b = null; st.page.strokes.push(sh); did({ t: 'add', s: [sh] }); } render(); return; }
      if (st.live) { var s = st.live; st.live = null; st.livePid = null; if (s.p.length >= 6 || s.t === 'pen' || s.t === 'pencil') { st.page.strokes.push(s); did({ t: 'add', s: [s] }); if (ev.type === 'pointercancel' && ev.pointerType === 'pen') st.cut = { s: s, at: Date.now() }; } render(); return; }
      if (st.erasing) { var gone = st.erasing, made = st.made || []; st.erasing = null; st.made = []; if (st.heldErase) { st.heldErase = false; st.eraserAt = null; } if (made.length) did({ t: 'swap', gone: gone, made: made }); else if (gone.length) did({ t: 'del', s: gone }); render(); return; }
      if (st.lasso) { var poly = st.lasso; st.lasso = null; select(poly.length > 2 ? st.page.strokes.filter(function (s) { if (s.t === 'text') { var b = bounds(s); return inPoly((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, poly); } var hits = 0, n = 0; for (var i = 0; i < s.p.length; i += 3) { n++; if (inPoly(s.p[i], s.p[i + 1], poly)) hits++; } return n && hits / n > 0.6; }) : []); return; }
      if (st.scaling) { var sc = st.scaling; st.scaling = null; if (sc.f && Math.abs(sc.f - 1) > 0.005) did({ t: 'scale', s: st.sel.list.slice(), was: sc.was, to: st.sel.list.map(geom) }); render(); return; }
      if (st.moving) { var mv = st.moving; st.moving = null; if (mv.dx || mv.dy) did({ t: 'move', s: st.sel.list.slice(), dx: mv.dx, dy: mv.dy }); }
    };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    // iOS: a pencil touch is a pointer and a touch; the touch side is kept from the browser's own gestures (scroll, the
    // long-press callout, Scribble), which otherwise cancel the stroke mid-line. Fingers keep their pinch and pan.
    var stylus = function (e) { for (var i = 0; i < e.touches.length; i++) if (e.touches[i].touchType === 'stylus') { e.preventDefault(); return; } };
    c.addEventListener('touchstart', stylus, { passive: false }); c.addEventListener('touchmove', stylus, { passive: false });
    c.addEventListener('pointerleave', function () { if (st && st.hover) { st.hover = null; renderLive(); } if (st && st.eraserAt) { st.eraserAt = null; render(); } });
    c.addEventListener('wheel', function (ev) {
      ev.preventDefault(); var r = c.getBoundingClientRect(), v = st.view;
      if (ev.ctrlKey || ev.metaKey) { var k = Math.max(minK(), Math.min(5, v.k * Math.pow(2, -Math.max(-12, Math.min(12, ev.deltaY)) * 0.01))), f = k / v.k, mx = ev.clientX - r.left, my = ev.clientY - r.top; st.view = { k: k, x: mx - f * (mx - v.x), y: my - f * (my - v.y) }; }
      else if (st.mode === 'pages' && Math.abs(ev.deltaX) > Math.abs(ev.deltaY) * 1.5 && PAGE_W * v.k <= c.getBoundingClientRect().width) {
        var now = Date.now(); if (now - (st.swAt || 0) > 300) st.swX = 0; st.swAt = now; st.swX += ev.deltaX;
        if (Math.abs(st.swX) > 140 && now - (st.turnedAt || 0) > 700) { st.turnedAt = now; var dn = st.swX > 0 ? 1 : -1; st.swX = 0; if (st.n + dn >= 0) turn(st.n + dn); }
        return;
      }
      else st.view = { k: v.k, x: v.x - (ev.shiftKey ? ev.deltaY : ev.deltaX), y: v.y - (ev.shiftKey ? 0 : ev.deltaY) };
      render();
    }, { passive: false });
    c.addEventListener('touchstart', function (e) { e.preventDefault(); }, { passive: false }); // no page scroll or zoom under the pencil
  }
  // A finger writes until the Pencil is used, then it moves the page. The first time that happens on this device, one quiet
  // line says so, with a way back (interaction walk 8 Nov, I14: the change came without a word); More keeps the choice after.
  function fingerTold() {
    if (Pref.get('finger-told') || st.stage.querySelector('.nb-say')) return;
    Pref.set('finger-told', '1');
    var say = el('div', 'nb-say glass'), back = el('button', 'nb-b', 'Let my finger write'); say.setAttribute('role', 'status');
    back.onclick = function () { setFingerWrites(true); say.remove(); };
    say.append(el('span', null, 'Your finger moves the page now; the Pencil writes.'), back); st.stage.append(say);
    setTimeout(function () { say.remove(); }, 8000);
  }
  function setFingerWrites(on) { st.fingerWrites = on; Pref.set('finger', on ? 'write' : ''); if (st.btnFinger) st.btnFinger.textContent = on ? 'Let my finger move the page' : 'Let my finger write'; }
  // A pencil point: Safari reports some in-between points with no pressure, which made the line jump thicker and
  // left notches. Those keep the last pressure; pressure changes are smoothed; points closer than half a unit are skipped.
  // A pencil point keeps the Pencil's lean too, smoothed the same way (see pack in strokes.js).
  function addPoint(s, q, e2) {
    var P = s.p, n = P.length, lx = P[n - 3], ly = P[n - 2], lv = P[n - 1], lp = prs(lv);
    if (Math.hypot(q[0] - lx, q[1] - ly) < 0.6 || again(q[0], q[1], function (j) { return [P[j * 3], P[j * 3 + 1]]; }, n / 3)) return;
    var real = e2.pointerType === 'pen' && e2.pressure > 0, raw = real ? e2.pressure : (s.sim ? 0.5 : lp), pr = s.sim ? 0.5 : lp + (raw - lp) * 0.35;
    if (s.t === 'pencil' && !s.sim) { var ls = slant(lv); pr = pack(pr, ls + ((real ? slantOf(e2) : ls) - ls) * 0.35); }
    P.push(q[0], q[1], pr);
  }
