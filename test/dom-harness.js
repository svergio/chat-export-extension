import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadFixture(name) {
  const html = readFileSync(join(root, 'fixtures/dom', name), 'utf8');
  const win = new Window();
  win.document.write(html);
  return win;
}
