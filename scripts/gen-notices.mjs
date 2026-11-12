import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const productLicense = pkg.license || 'MIT';

const vendored = [
  { name: 'pdf-lib (bundled UMD)', path: 'vendor/pdf-lib.min.js', license: 'Apache-2.0' },
  { name: 'fontkit (bundled UMD)', path: 'vendor/fontkit.umd.min.js', license: 'MIT' },
  { name: 'Noto Sans (font)', path: 'vendor/NotoSans-Regular.ttf', license: 'OFL-1.1' }
];

const lc = spawnSync('npx', ['--yes', 'license-checker', '--production', '--json'], {
  cwd: root,
  encoding: 'utf8',
  maxBuffer: 8 * 1024 * 1024
});

if (lc.status !== 0) {
  console.error(lc.stderr?.trim() || 'license-checker failed');
  process.exit(lc.status || 1);
}

const tree = JSON.parse(lc.stdout);
const direct = Object.keys(pkg.dependencies || {}).sort();

function licenseFor(dep) {
  const key = Object.keys(tree).find((k) => {
    const at = k.lastIndexOf('@');
    return at > 0 && k.slice(0, at) === dep;
  });
  return key ? String(tree[key].licenses || 'UNKNOWN') : 'UNKNOWN';
}

const npmRows = direct.map((d) => `| \`${d}\` | ${licenseFor(d)} | npm runtime |`);
const vendRows = vendored.map((v) => `| ${v.name} | ${v.license} | \`${v.path}\` (shipped in extension zip) |`);

const body = `# Third-party notices

Chat Export Extension is licensed under the [MIT License](./LICENSE).

This file lists **direct runtime** npm dependencies and **vendored** assets shipped in the packed extension (no \`node_modules\` in release zips). Dev-only build tools (\`esbuild\`, \`happy-dom\`, \`sharp\`) are omitted.

Regenerate: \`npm run licenses\` (uses \`npx license-checker\`; not added as a repo dependency).

## npm runtime dependencies

| Package | License | Notes |
| --- | --- | --- |
${npmRows.join('\n')}

## Vendored in \`vendor/\` (PDF export)

| Component | License | Location |
| --- | --- | --- |
${vendRows.join('\n')}

## Optional integrations (not dependencies)

Cursor, Claude Desktop, Open WebUI, local LLM stacks (e.g. Bonsai-27B), BibLLMsteak, and the NodeRed maintainer workspace are **optional** MCP clients or docs only. The extension runs standalone in Chrome without them.

---

_Generated for ${pkg.name}@${pkg.version}. Product license: ${productLicense}._
`;

const out = join(root, 'THIRD_PARTY_NOTICES.md');
writeFileSync(out, body);
console.log(`wrote ${out}`);
