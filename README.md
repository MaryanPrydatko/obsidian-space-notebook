# Space Notebook

A handwriting notebook for Obsidian, ported from the notebook in Space: A4 pages, paper (blank, lined, squared, dots),
pen with pressure, pencil, highlighter, eraser, lasso (move, recolour, resize, delete), text, shapes, ruler, undo and
redo, a pages sidebar, Scroll / Pages / Whiteboard views, and PDF export.

## Install

Not in the community plugin list yet. Either:

- With [BRAT](https://github.com/TfTHacker/obsidian42-brat): Add beta plugin, paste `MaryanPrydatko/obsidian-space-notebook`.
- By hand: download `main.js`, `manifest.json` and `styles.css` from the [latest release](https://github.com/MaryanPrydatko/obsidian-space-notebook/releases/latest) into `<vault>/.obsidian/plugins/space-notebook/`, then turn on Space Notebook in Settings, Community plugins.

Works on desktop, iPad and iPhone. With BRAT on a phone or iPad, add it there too.

## Files

Each notebook is one `.notebook` file: compact JSON, `{ "v": 1, "paper": "lined", "pages": [{ "paper": "lined", "strokes": [...] }] }`.
A stroke is `{ id, t, c, w, sim, p: [x, y, pressure, ...] }` in page units (a page is 1000 x 1414), rounded to a tenth.
Run the command **New notebook** to make `Untitled notebook.notebook` in the folder of the file you are in.
A file that does not read as a notebook opens empty and is never written over.

## Use

- Pen, pencil (lean the Pencil to shade), highlighter, text, shape, eraser (whole lines or part), lasso, ruler (R).
- Tap the active pen again for size and colour. Your pens, colours and view are kept per device.
- Cmd+Z / Shift+Cmd+Z, Delete removes the selection, arrow keys turn pages.
- Trackpad: scroll to move, pinch (or Cmd + scroll) to zoom. The whiteboard zooms out to 4%.
- Touch: a finger writes until the Pencil is used, then fingers pan and pinch; two-finger tap undoes, three redoes.
- More (...): paper, Save as PDF (this page or all pages, saved next to the notebook), toolbar at the bottom, delete page.

## Develop

```
npm install
npm run build    # typecheck and bundle main.js
npm run dev      # rebuild on change
OBSIDIAN_VAULT=~/path/to/vault npm run deploy   # build and copy main.js, manifest.json, styles.css into the vault's plugins/space-notebook/
```

`src/notebook/*.js` are Space's notebook parts (`client/notebook/`), kept close to the original so they can be compared.
`esbuild.config.mjs` joins them in order inside one function, as Space's `build.mjs` does, so every open notebook has its
own state. `file.js` replaces Space's `api.js` (the D1 `ink` rows) with the one file. `src/view.ts` is the Obsidian
`TextFileView` around it.

Not ported yet: pictures on a page, PDF import, the iPad measuring probe. Live sync is dropped (Syncthing syncs the files).

Mobile works through Pointer Events, no Node APIs, and `touch-action: none` on the page.

## Licence

MIT. Ink outlines by [perfect-freehand](https://github.com/steveruizok/perfect-freehand) 1.2.2, MIT, Copyright (c) 2021
Stephen Ruiz Ltd; its licence is kept at the top of `main.js`.
