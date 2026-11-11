import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const common = {
  bundle: true,
  platform: 'browser',
  target: ['chrome110'],
  format: 'iife',
  minify: false,
  sourcemap: false,
  logLevel: 'info'
};

await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/boot.js')],
  outfile: join(root, 'dist/shared.js'),
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
});
console.log('wrote dist/shared.js');

await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/popup/main.jsx')],
  outfile: join(root, 'dist/popup.js'),
  jsx: 'transform',
  jsxFactory: 'h',
  jsxFragment: 'Fragment'
});
console.log('wrote dist/popup.js');

const backgroundOut = join(root, 'background.js');
await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/background/main.js')],
  outfile: backgroundOut
});
const banner =
  '// WS URL: ws://127.0.0.1:${port}/ws — path /ws (see src/settings.js WS_PATH). Server BrowserHub must match.\n';
writeFileSync(backgroundOut, banner + readFileSync(backgroundOut, 'utf8'));
console.log('wrote background.js');
