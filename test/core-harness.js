import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Window } from 'happy-dom';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

export function loadChatExport(url = 'https://chatgpt.com/') {
  const win = new Window({ url });
  const code = readFileSync(join(root, 'src/core.js'), 'utf8');
  win.eval(code);
  return { win, CE: win.ChatExport };
}
