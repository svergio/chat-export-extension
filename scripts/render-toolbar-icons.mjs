import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const iconsDir = join(__dirname, '..', 'icons');
const sizes = [16, 48, 128];
const require = createRequire(import.meta.url);
const sharp = require('sharp');

const stickerSvg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <filter id="sticker" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="#FFFFFF" flood-opacity="0.9"/>
      <feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <g transform="translate(62,62) scale(2.55)" fill="none" stroke="#FFFFFF" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" filter="url(#sticker)">
    <path d="M4 20h4l10.5-10.5a2.828 2.828 0 1 0-4-4L4 16v4"/>
    <path d="M13.5 6.5l4 4"/>
    <path d="M16 22l5-5"/>
    <path d="M21 21.5V17h-4.5"/>
  </g>
</svg>`);

async function renderSvgKind(kind) {
  const svg = readFileSync(join(iconsDir, `toolbar-${kind}.svg`));
  for (const size of sizes) {
    const out = join(iconsDir, `toolbar-${kind}-${size}.png`);
    await sharp(svg, { density: Math.max(72, size * 2) })
      .resize(size, size)
      .png()
      .toFile(out);
    console.log('wrote', out);
  }
}

async function renderGrokFromBrand() {
  const markPath = join(iconsDir, 'grok-mark-black.png');
  const sticker = await sharp(stickerSvg, { density: 288 }).resize(128, 128).png().toBuffer();

  for (const size of sizes) {
    const pad = Math.round(size * 0.04);
    const markSize = size - pad * 2;
    const mark = await sharp(markPath)
      .resize(markSize, markSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    // Soft white glow + dark drop via blur layers
    const glow = await sharp(mark)
      .ensureAlpha()
      .tint('#FFFFFF')
      .blur(Math.max(1, Math.round(size * 0.04)))
      .modulate({ brightness: 1.2 })
      .png()
      .toBuffer();

    const shadow = await sharp(mark)
      .ensureAlpha()
      .tint('#000000')
      .blur(Math.max(1, Math.round(size * 0.03)))
      .png()
      .toBuffer();

    const stickerSized = await sharp(sticker).resize(size, size).png().toBuffer();

    const out = join(iconsDir, `toolbar-grok-${size}.png`);
    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      }
    })
      .composite([
        { input: glow, top: pad, left: pad, blend: 'over' },
        { input: shadow, top: pad + Math.max(1, Math.round(size * 0.02)), left: pad, blend: 'over' },
        { input: mark, top: pad, left: pad, blend: 'over' },
        { input: stickerSized, top: 0, left: 0, blend: 'over' }
      ])
      .png()
      .toFile(out);
    console.log('wrote', out);
  }
}

for (const kind of ['idle', 'x', 'chatgpt']) {
  await renderSvgKind(kind);
}
await renderGrokFromBrand();

for (const size of sizes) {
  const src = join(iconsDir, `toolbar-idle-${size}.png`);
  const dest = join(iconsDir, `icon${size}.png`);
  writeFileSync(dest, readFileSync(src));
  console.log('copied', dest);
}

// Master SVG for docs: real circle+slash mark (not Fast lightning)
writeFileSync(
  join(iconsDir, 'toolbar-grok.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <filter id="markGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="3.5" flood-color="#FFFFFF" flood-opacity="0.55"/>
      <feDropShadow dx="0" dy="2" stdDeviation="2.2" flood-color="#000000" flood-opacity="0.45"/>
    </filter>
    <filter id="sticker" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="0" stdDeviation="2.4" flood-color="#FFFFFF" flood-opacity="0.9"/>
      <feDropShadow dx="0" dy="1" stdDeviation="1.4" flood-color="#000000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <!-- Official grok.com mark: circle + diagonal slash (raster source: grok-mark-black.png) -->
  <image href="grok-mark-black.png" x="4" y="4" width="120" height="120" filter="url(#markGlow)"/>
  <g transform="translate(62,62) scale(2.55)" fill="none" stroke="#FFFFFF" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" filter="url(#sticker)">
    <path d="M4 20h4l10.5-10.5a2.828 2.828 0 1 0-4-4L4 16v4"/>
    <path d="M13.5 6.5l4 4"/>
    <path d="M16 22l5-5"/>
    <path d="M21 21.5V17h-4.5"/>
  </g>
</svg>
`
);
console.log('updated toolbar-grok.svg');
