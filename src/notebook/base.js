// The notebook: what a notebook keeps: page size, colours, pens and papers, and the open notebook's state (st).
// A notebook to write in by hand, like a paper notebook: pages, paper, pen (with Apple Pencil pressure), highlighter,
// an eraser you drag, a lasso to pick up strokes and move or delete them, undo and redo.
// Ported from Space (client/notebook/). Ink is drawn with perfect-freehand (MIT). Every page lives in one .notebook file
// (file.js), which the Obsidian view reads and writes.
// One of the parts of createNotebook (src/notebook/, joined in order by esbuild.config.mjs), so each part sees the
// notebook's state (st), the host element, io (what Obsidian gives it), and what the parts before it declare.
  var doc = host.ownerDocument, win = doc.defaultView || window;
  var PAGE_W = 1000, PAGE_H = 1414; // A4, in page units
  var GAP = 48; // between pages in the Scroll view
  function OFF(i) { return st && st.mode === 'scroll' ? i * (PAGE_H + GAP) : 0; }
  function minK() { return st && st.mode === 'board' ? 0.04 : 0.2; } // a whiteboard zooms much further out
  function vy() { return st.view.y + OFF(st.n) * st.view.k; } // where the page you write on starts, on screen
  var COLORS = { ink: null, blue: '#2563c9', red: '#d23c3c', green: '#1f9254', purple: '#7b4bc4', orange: '#d9782b' };
  var SIZES = { fine: 3, medium: 5, bold: 9 };
  // A pen's width is a number you chose (1 to 30), or one of the old preset names in notebooks written before.
  function sz(w) { return typeof w === 'number' ? w : SIZES[w] || 5; }
  // Colours to pick from, like a pencil case: darks first, then brights, then light ones for the highlighter
  var PALETTE = ['ink', '#5f6368', '#8b5a2b', '#d23c3c', '#e8590c', '#c99700', '#1f9254', '#0f8a7e', '#2563c9', '#4338ca', '#7b4bc4', '#c0267a',
    '#ffd43b', '#ffa94d', '#f783ac', '#69db7c', '#74c0fc', '#b197fc'];
  var SIZE_PRESETS = [2, 3.5, 5, 8, 14];
  // what you chose is kept on this device (Obsidian's local storage for this vault): each tool's width and colour, your saved widths, your recent colours
  var Pref = io.pref;
  function loadPens() { var d = { pen: { w: 5, c: 'ink' }, pencil: { w: 3, c: 'ink' }, marker: { w: 5, c: '#ffd43b' }, shape: { w: 3, c: 'ink' }, text: { w: 5, c: 'ink' } }; var j = Pref.json('pens', null); if (j) Object.keys(d).forEach(function (k) { if (j[k] && typeof j[k].w === 'number') d[k] = { w: j[k].w, c: j[k].c || d[k].c }; }); return d; }
  function savePens(p) { Pref.setJSON('pens', p); }
  function loadPresets() { var j = Pref.json('sizes', null); return Array.isArray(j) && j.length ? j.filter(function (x) { return typeof x === 'number'; }) : SIZE_PRESETS.slice(); }
  function savePresets(a) { Pref.setJSON('sizes', a); }
  function loadRecent() { var j = Pref.json('colours', null); return Array.isArray(j) && j.length ? j.slice(0, 6) : ['ink', 'blue', 'red', 'green', 'purple', 'orange']; }
  function saveRecent(a) { Pref.setJSON('colours', a); }
  var PAPERS = [['blank', 'Blank'], ['lined', 'Lined'], ['grid', 'Squared'], ['dots', 'Dots']];
  var FONT = 'system-ui, -apple-system, sans-serif';
  var st = null;

  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  // Obsidian's theme colours, as the canvas needs them (a colour it can fill with): read once, again when the look changes (refresh)
  var themed = {}, probeEl = null;
  function themeColor(name, fallback) {
    if (themed[name]) return themed[name];
    if (!probeEl) { probeEl = el('span'); probeEl.style.display = 'none'; host.append(probeEl); }
    probeEl.style.color = fallback; probeEl.style.color = 'var(' + name + ')';
    return (themed[name] = getComputedStyle(probeEl).color || fallback);
  }
  function isDark() { return doc.body.classList.contains('theme-dark'); }
  var PRINT = false; // making a PDF: light paper and dark ink, whatever the screen's theme
  // A highlighter is see-through ink that never hides what is under it: on light paper it multiplies (like a real one),
  // on dark paper it lightens, so yellow reads as yellow and not as mud.
  function accent() { return themeColor('--interactive-accent', '#2563c9'); }
  function darkPaper() { return !PRINT && isDark(); }
  function ink(c) { return COLORS[c] || (typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c) ? c : null) || (PRINT ? '#15171c' : themeColor('--text-normal', '#111')); }
  function uid() { return 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
