import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const version = String(pkg.version || '0.0.0');
const outName = `chat-export-extension-${version}.zip`;
const outDir = join(root, 'dist-pack');
const outPath = join(outDir, outName);

const required = [
  'manifest.json',
  'background.js',
  'popup.html',
  'popup.css',
  'styles.css',
  'dist',
  'content',
  'vendor',
  'icons',
  'locales'
];

const optional = ['shared.js', 'popup.js'];

for (const rel of required) {
  if (!existsSync(join(root, rel))) {
    console.error(`pack: missing required path: ${rel}`);
    process.exit(1);
  }
}

const entries = [...required, ...optional.filter((rel) => existsSync(join(root, rel)))];

mkdirSync(outDir, { recursive: true });
rmSync(outPath, { force: true });

const zip = spawnSync('zip', ['-r', '-q', outPath, ...entries, '-x', '*/.DS_Store', '-x', '**/.DS_Store'], {
  cwd: root,
  stdio: 'inherit'
});

if (zip.status !== 0) {
  console.error('pack: zip failed');
  process.exit(zip.status || 1);
}

console.log(`wrote ${outPath}`);
