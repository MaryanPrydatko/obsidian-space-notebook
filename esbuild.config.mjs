// Builds main.js. The notebook itself is Space's notebook (client/notebook/ in Space), kept as its parts and joined in
// order inside one function, as Space's build.mjs does, so each open notebook has its own state (st).
import { build, context } from 'esbuild';
import { readFileSync } from 'node:fs';

const PARTS = ['base', 'strokes', 'draw', 'edit', 'pointers', 'ruler', 'export', 'side', 'pages', 'open', 'file'].map((p) => 'src/notebook/' + p + '.js');
const LICENSE = readFileSync('node_modules/perfect-freehand/LICENSE', 'utf8').trim();

const joinParts = {
  name: 'notebook-core',
  setup(b) {
    b.onResolve({ filter: /^notebook-core$/ }, () => ({ path: 'notebook-core', namespace: 'nb' }));
    b.onLoad({ filter: /.*/, namespace: 'nb' }, () => ({
      contents: "import { getStroke } from 'perfect-freehand';\nexport function createNotebook(host, io) {\n" + PARTS.map((f) => readFileSync(f, 'utf8')).join('\n') + '\n}\n',
      loader: 'js',
      resolveDir: '.',
      watchFiles: PARTS,
    }));
  },
};

const options = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'main.js',
  format: 'cjs',
  platform: 'browser',
  target: 'es2018',
  external: ['obsidian', 'electron', '@codemirror/*', '@lezer/*'],
  plugins: [joinParts],
  banner: { js: '/*! Space Notebook. Ink by perfect-freehand 1.2.2 (https://github.com/steveruizok/perfect-freehand):\n' + LICENSE + '\n*/' },
  logLevel: 'info',
  sourcemap: process.argv.includes('--watch') ? 'inline' : false,
  minify: !process.argv.includes('--watch'),
};

if (process.argv.includes('--watch')) await (await context(options)).watch();
else await build(options);
