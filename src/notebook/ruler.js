// The notebook: the ruler, and the eraser. (Space: client/notebook/ruler.js)
  // ---------- the ruler (like Apple Notes and GoodNotes): lies on the page, a finger or the mouse moves it, its ends turn it
  // (it holds at every 15 degrees), and a line started along either edge runs straight along that edge. Never saved.
  function rulerLocal(p) { var R = st.ruler, dx = p[0] - R.x, dy = p[1] - R.y, ca = Math.cos(R.a), sa = Math.sin(R.a); return [dx * ca + dy * sa, -dx * sa + dy * ca]; }
  function rulerHit(p) { if (!st.ruler) return null; var q = rulerLocal(p), R = st.ruler; if (Math.abs(q[0]) > R.L / 2 || Math.abs(q[1]) > R.W / 2) return null; return Math.abs(q[0]) > R.L / 2 - 70 ? 'turn' : 'move'; }
  // which edge a line starting at p runs along: within a finger's width outside it, or anywhere on it with the pencil
  function rulerEdge(p, pen) {
    if (!st.ruler) return 0; var q = rulerLocal(p), R = st.ruler, reach = 26 / st.view.k;
    if (Math.abs(q[0]) > R.L / 2 + reach) return 0;
    var d = Math.abs(q[1]); if (d > R.W / 2 + reach || (!pen && d < R.W / 2 - 2)) return 0; return q[1] < 0 ? -1 : 1;
  }
  function onEdge(s, p) {
    if (!s.edge) return p; var R = st.ruler, q = rulerLocal(p), off = s.edge * (R.W / 2 + sz(s.w) / 2 + 1), ca = Math.cos(R.a), sa = Math.sin(R.a);
    return [R.x + q[0] * ca - off * sa, R.y + q[0] * sa + off * ca];
  }
  function drawRuler(g) {
    var R = st.ruler, k = st.view.k, dark = isDark(); g.save(); g.translate(R.x, R.y); g.rotate(R.a);
    g.fillStyle = dark ? 'rgba(210,220,235,0.22)' : 'rgba(40,52,70,0.13)'; g.strokeStyle = dark ? 'rgba(230,236,245,0.5)' : 'rgba(30,40,58,0.42)'; g.lineWidth = 1 / k;
    g.beginPath(); if (g.roundRect) g.roundRect(-R.L / 2, -R.W / 2, R.L, R.W, 10); else g.rect(-R.L / 2, -R.W / 2, R.L, R.W); g.fill(); g.stroke();
    g.beginPath(); for (var x = -R.L / 2 + 20, i = 0; x < R.L / 2 - 10; x += 10, i++) { var h = i % 10 === 0 ? 14 : i % 5 === 0 ? 10 : 6; g.moveTo(x, -R.W / 2); g.lineTo(x, -R.W / 2 + h); g.moveTo(x, R.W / 2); g.lineTo(x, R.W / 2 - h); } g.stroke();
    var deg = Math.round(((R.a * 180 / Math.PI) % 180 + 180) % 180); g.fillStyle = g.strokeStyle; g.font = '600 15px ' + FONT; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(deg + '°', 0, 0);
    g.restore();
  }
  function toggleRuler(on) {
    if (on == null) on = !st.ruler;
    if (on) { var r = st.canvas.getBoundingClientRect(), v = st.view, cx = (r.width / 2 - v.x) / v.k, cy = (r.height / 2 - vy()) / v.k; st.ruler = { x: cx, y: cy, a: 0, L: Math.min(760, Math.max(360, r.width * 0.7 / v.k)), W: 64 }; }
    else st.ruler = null;
    if (st.rulerB) st.rulerB.setAttribute('aria-pressed', !!st.ruler); render();
  }
  function eraseAt(p) {
    var r = st.eraserR = 14 / Math.max(0.5, st.view.k); st.eraserAt = p;
    var hit = st.page.strokes.filter(function (s) { return near(s, p[0], p[1], r); });
    hit.forEach(function (s) {
      var S = st.page.strokes, at = S.indexOf(s), pieces = st.eraseMode === 'part' && s.t !== 'text' ? cutAt(s, p, r) : [];
      if (!pieces) return; // close to it, but no point of it under the eraser
      S.splice.apply(S, [at, 1].concat(pieces));
      var mi = st.made.indexOf(s); if (mi >= 0) st.made.splice(mi, 1); else st.erasing.push(s); // a piece cut again in the same stroke of the eraser
      st.made = st.made.concat(pieces);
    });
    render();
  }
  // the part eraser: the pieces of a line either side of where it passed (null: no point of it was under the eraser)
  function cutAt(s, p, r) {
    var P = s.p, rr = r + sz(s.w) * 0.5, out = [], run = [], cut = false;
    for (var i = 0; i < P.length; i += 3) {
      if (Math.hypot(P[i] - p[0], P[i + 1] - p[1]) < rr) { cut = true; if (run.length >= 6) out.push(run); run = []; }
      else run.push(P[i], P[i + 1], P[i + 2]);
    }
    if (run.length >= 6) out.push(run);
    if (!cut) return null;
    return out.map(function (q) { var o = { id: uid(), t: s.t, c: s.c, w: s.w, sim: s.sim, p: q }; if (s.z) o.z = s.z; if (s.flat) o.flat = 1; return o; });
  }

