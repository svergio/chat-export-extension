import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'icons');
const sizes = [16, 32, 48, 128];
const kinds = [
  'idle',
  'chatgpt',
  'grok',
  'x',
  'copilot',
  'claude',
  'qwen',
  'deepseek',
  'perplexity',
  'kimi',
  'zai',
  'minimax',
  'janitorai'
];
const require = createRequire(import.meta.url);
const sharp = require('sharp');

async function renderSvgKind(kind) {
  const svg = readFileSync(join(iconsDir, `toolbar-${kind}.svg`));
  for (const size of sizes) {
    const pad = Math.round(size * 0.08);
    const inner = size - pad * 2;
    const logo = await sharp(svg, { density: Math.max(72, inner * 3) })
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    const out = join(iconsDir, `toolbar-${kind}-${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([{ input: logo, gravity: 'center' }])
      .png()
      .toFile(out);
    console.log('wrote', out);
  }
}

for (const kind of kinds) {
  await renderSvgKind(kind);
}

for (const size of sizes) {
  const src = join(iconsDir, `toolbar-idle-${size}.png`);
  const dest = join(iconsDir, `icon${size}.png`);
  writeFileSync(dest, readFileSync(src));
  console.log('copied', dest);
}
