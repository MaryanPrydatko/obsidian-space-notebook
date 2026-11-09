// The notebook: strokes: their outline, bounds and hit tests. (Space: client/notebook/strokes.js)
  // ---------- strokes: points [x, y, pressure, ...] in page units ----------
  // streamline pulls each point back toward the last one: 0.5 left the line about one point behind the Pencil tip,
  // which you feel as lag; the Pencil's own points are clean enough for 0.3. A mouse or a finger keeps 0.5 against jitter.
  // An iPad sends some Pencil points twice: a move repeats the last 3 or 4 points it already gave, so the line stepped
  // back over itself, and each step back left a small notch in the line (a hole where the outline folds). Such a
  // repeated point is dropped: as you write, and when an older page is drawn, so pages written before heal too.
  function again(x, y, at, n) { for (var j = Math.max(0, n - 6); j < n; j++) { var q = at(j); if (Math.abs(q[0] - x) < 0.05 && Math.abs(q[1] - y) < 0.05) return true; } return false; }
  // The hand also shakes a little: Pencil points come under a unit apart, and a tiny shake makes the line step back for
  // one point. perfect-freehand puts a round cap inside the line at every such turn back, the outline folds there, and
  // the fold is filled as a hole: a thin seam across the line, plain to see when zoomed in. A step back shorter than
  // the line is wide is shake, not a turn you made, so it is left out of the drawing (the saved points stay as written).
  function steady(pts, size) {
    var out = pts.slice(0, 1);
    for (var i = 1; i < pts.length; i++) {
      var q = pts[i], l = out[out.length - 1], dx = q[0] - l[0], dy = q[1] - l[1];
      if (out.length > 1 && i < pts.length - 1) { var k = out[out.length - 2]; if ((l[0] - k[0]) * dx + (l[1] - k[1]) * dy < 0 && Math.hypot(dx, dy) < size * 0.6) continue; }
      out.push(q);
    }
    return out;
  }
  // A point's third number is its pressure, 0 to 1. A pencil point also keeps how far the Pencil leans (its slant: 0
  // upright, 1 lying flat, in twentieths), stored as whole twos above the pressure: 0.42 is upright, 16.42 leans 0.4.
  // Every point written before is at most 1, so it reads as upright, and the loops over x and y stay as they were.
  function pack(pr, sl) { return Math.round(Math.max(0, Math.min(1, sl)) * 20) * 2 + pr; }
  function prs(v) { return v > 1 ? v - 2 * Math.floor(v / 2) : v; }
  function slant(v) { return v > 1 ? Math.floor(v / 2) / 20 : 0; }
  // how far the Pencil leans, from the event: altitudeAngle (Safari, Chrome) or tiltX and tiltY
  function slantOf(e) {
    if (e.pointerType !== 'pen') return 0; var a = e.altitudeAngle;
    if (typeof a === 'number' && a >= 0 && a <= Math.PI / 2) return 1 - a / (Math.PI / 2);
    var r = Math.PI / 180, tx = Math.tan((e.tiltX || 0) * r), ty = Math.tan((e.tiltY || 0) * r); return Math.atan(Math.hypot(tx, ty)) / (Math.PI / 2);
  }
  // A pencil held to write leans about 35 to 40 degrees from upright and draws a plain line; laid down further it shades,
  // as in Apple Notes: up to three times wider and lighter, flattest at about 15 degrees above the paper.
  function shadeOf(sl) { return Math.max(0, Math.min(1, (sl - 0.4) / 0.43)); }
  var PENCIL_K = 4.4; // the pencil's outline is worked out this much wider, and each point narrows it back by pressure and lean
  function outline(s) {
    var pts = [], p = s.p, get = function (j) { return pts[j]; }, lean = s.t === 'pencil' && !s.sim && !s.flat, shade = 0;
    for (var i = 0; i < p.length; i += 3) if (!again(p[i], p[i + 1], get, pts.length)) {
      var v = p[i + 2];
      if (lean) { var sh = shadeOf(slant(v)), w = (0.6 + 0.8 * prs(v)) * (1 + 2 * sh); shade += sh; v = (0.5 * w / PENCIL_K - 0.025) / 0.95; } // getStroke's width is linear in pressure: size * (0.5 - 0.95 * (0.5 - v))
      else v = prs(v);
      pts.push([p[i], p[i + 1], v]);
    }
    s._shade = lean && pts.length ? shade / pts.length : 0;
    var hl = s.t === 'marker', size = sz(s.w) * (hl ? 3.2 : 1.6) * (s.z || 1);
    if (!s.flat) pts = steady(pts, size); // shapes and ruler lines turn back on purpose (an arrow's head)
    if (lean) return getStroke(pts, { size: size * PENCIL_K, thinning: 0.95, smoothing: 0.6 / PENCIL_K, streamline: 0.3, simulatePressure: false, last: s !== (st && st.live), start: { cap: true, taper: 0 }, end: { cap: true, taper: 0 } });
    return getStroke(pts, { size: size, thinning: hl || s.flat ? 0 : s.sim ? 0.5 : 0.45, smoothing: 0.6, streamline: s.sim || hl ? 0.5 : 0.3, simulatePressure: !!s.sim, last: s !== (st && st.live), start: { cap: !hl, taper: 0 }, end: { cap: !hl, taper: 0 } });
  }
  function pathOf(s) {
    if (s._path) return s._path;
    var o = outline(s), d = new Path2D();
    if (o.length) { d.moveTo(o[0][0], o[0][1]); for (var i = 1; i < o.length; i++) { var a = o[i], b = o[(i + 1) % o.length]; d.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); } d.closePath(); }
    s._path = d; return d;
  }
  var TEXT_PX = { fine: 22, medium: 30, bold: 44 };
  function tpx(s) { return (typeof s.w === 'number' ? Math.round(14 + s.w * 3.2) : TEXT_PX[s.w] || 30) * (s.z || 1); }
  // On a whiteboard the pen and the text keep their size on screen at any zoom, like Freeform: a line written far out is thick enough to see.
  function zNow() { if (!st || st.mode !== 'board') return 1; var z = (st.k0 || 1) / st.view.k; return Math.abs(z - 1) < 0.15 ? 1 : Math.max(0.25, Math.min(30, z)); } // at the usual zoom, the usual size
  function textLines(s) { return String(s.text || '').split('\n'); }
  function bounds(s) {
    if (s._b) return s._b;
    if (s.t === 'text') { var fs = tpx(s), ls = textLines(s), wmax = Math.max.apply(null, ls.map(function (l) { return l.length; }).concat([1])) * fs * 0.55; return (s._b = [s.x - 6, s.y - 6, s.x + wmax + 6, s.y + ls.length * fs * 1.3 + 6]); }
    var p = s.p, x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (var i = 0; i < p.length; i += 3) { x0 = Math.min(x0, p[i]); y0 = Math.min(y0, p[i + 1]); x1 = Math.max(x1, p[i]); y1 = Math.max(y1, p[i + 1]); }
    var m = sz(s.w) * (s.t === 'pencil' ? 3.5 : 2); return (s._b = [x0 - m, y0 - m, x1 + m, y1 + m]);
  }
  function near(s, x, y, r) {
    var b = bounds(s); if (x < b[0] - r || x > b[2] + r || y < b[1] - r || y > b[3] + r) return false;
    if (s.t === 'text') return true;
    var p = s.p, rr = r + sz(s.w) * (s.t === 'marker' || s.t === 'pencil' ? 1.6 : 0.8);
    for (var i = 0; i < p.length; i += 3) { var dx = p[i] - x, dy = p[i + 1] - y; if (dx * dx + dy * dy < rr * rr) return true; }
    for (var j = 3; j < p.length; j += 3) { var ax = p[j - 3], ay = p[j - 2], bx = p[j], by = p[j + 1], vx = bx - ax, vy = by - ay, L = vx * vx + vy * vy; if (!L) continue; var t = Math.max(0, Math.min(1, ((x - ax) * vx + (y - ay) * vy) / L)), qx = ax + t * vx - x, qy = ay + t * vy - y; if (qx * qx + qy * qy < rr * rr) return true; }
    return false;
  }
  function inPoly(x, y, poly) { var c = false; for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) { var a = poly[i], b = poly[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
  function clean(s) { var z = s.z && s.z !== 1 ? { z: s.z } : {}; if (s.flat) { var c0 = Object.assign({ id: s.id, t: s.t, c: s.c, w: s.w, sim: 0, flat: 1, p: s.p.map(function (v, i) { return i % 3 === 2 ? 0.5 : Math.round(v * 10) / 10; }) }, z); return c0; }
    if (s.t === 'text') return Object.assign({ id: s.id, t: 'text', c: s.c, w: s.w, x: Math.round(s.x * 10) / 10, y: Math.round(s.y * 10) / 10, text: String(s.text || '').slice(0, 4000) }, z); return Object.assign({ id: s.id, t: s.t, c: s.c, w: s.w, sim: s.sim ? 1 : 0, p: s.p.map(function (v, i) { return i % 3 === 2 ? Math.round(v * 100) / 100 : Math.round(v * 10) / 10; }) }, z); }

