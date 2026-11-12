import * as esbuild from 'esbuild';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let barBundle = null;

function ensureBarBundle() {
  if (barBundle) return barBundle;
  const result = esbuild.buildSync({
    entryPoints: [join(root, 'test/ce-bar-bundle-entry.js')],
    bundle: true,
    platform: 'browser',
    format: 'iife',
    target: ['chrome110'],
    jsx: 'transform',
    jsxFactory: 'h',
    jsxFragment: 'Fragment',
    write: false,
    absWorkingDir: root,
    logLevel: 'silent'
  });
  barBundle = result.outputFiles[0].text;
  return barBundle;
}

export function loadBarPage(url = 'https://chatgpt.com/', formatIds = ['md']) {
  const win = new Window({ url, innerWidth: 1024, innerHeight: 768 });
  win.localStorage.setItem('chat-export-formats', JSON.stringify(formatIds));
  win.eval(readFileSync(join(root, 'src/core.js'), 'utf8'));
  win.eval(ensureBarBundle());
  return win;
}
