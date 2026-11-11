import fs from 'fs';
import path from 'path';

const root = path.dirname(path.dirname(decodeURI(new URL(import.meta.url).pathname)));

function insertChatgptHelpers(src, block) {
  const needle = '  async function chatSummary(chatId, container) {';
  if (!src.includes(needle)) throw new Error('chatSummary anchor missing in chatgpt.js');
  return src.replace(needle, block + '\n' + needle);
}

function insertGrokHelpers(src, block) {
  const needle = '  async function chatSummary(chatId, container) {';
  if (!src.includes(needle)) throw new Error('chatSummary anchor missing in grok.js');
  return src.replace(needle, block + '\n' + needle);
}

function insertOps(src, opsBlock) {
  const needle = '    ops: {\n      containers: async function (args) {';
  if (!src.includes(needle)) throw new Error('ops anchor missing');
  return src.replace(needle, '    ops: {\n' + opsBlock + '      containers: async function (args) {');
}

const chatgptHelpers = fs.readFileSync(path.join(root, 'scripts/chatgpt-chat-helpers.js'), 'utf8');
const chatgptOps = fs.readFileSync(path.join(root, 'scripts/chatgpt-chat-ops.js'), 'utf8');
const grokHelpers = fs.readFileSync(path.join(root, 'scripts/grok-chat-helpers.js'), 'utf8');
const grokOps = fs.readFileSync(path.join(root, 'scripts/grok-chat-ops.js'), 'utf8');

let cg = fs.readFileSync(path.join(root, 'content/chatgpt.js'), 'utf8');
if (!cg.includes('list: async function')) {
  cg = insertChatgptHelpers(cg, chatgptHelpers);
  cg = insertOps(cg, chatgptOps);
  fs.writeFileSync(path.join(root, 'content/chatgpt.js'), cg);
  console.log('patched chatgpt.js');
} else {
  console.log('chatgpt.js already has list op');
}

let gr = fs.readFileSync(path.join(root, 'content/grok.js'), 'utf8');
if (!gr.includes('list: async function')) {
  gr = insertGrokHelpers(gr, grokHelpers);
  gr = insertOps(gr, grokOps);
  fs.writeFileSync(path.join(root, 'content/grok.js'), gr);
  console.log('patched grok.js');
} else {
  console.log('grok.js already has list op');
}
