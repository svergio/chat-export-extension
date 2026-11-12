import test from 'node:test';
import assert from 'node:assert/strict';
import { loadChatExport } from './core-harness.js';

test('htmlToMarkdown hostile inputs', () => {
  const { CE } = loadChatExport();
  const md = CE.htmlToMarkdown;

  assert.equal(md(null), '');
  assert.equal(md(''), '');
  assert.equal(md('   \n\t  '), '');
  assert.equal(md('plain text only'), 'plain text only');

  const nested = md('<div><p>hello <strong>world</strong><div>unclosed');
  assert.match(nested, /hello/);
  assert.match(nested, /\*\*world\*\*/);

  const scriptStripped = md('<p>ok</p><script>alert(1)</script><style>.x{}</style><iframe src=x></iframe>');
  assert.doesNotMatch(scriptStripped, /alert|\.x|iframe/i);
  assert.match(scriptStripped, /ok/);

  const fence = md('<pre><code class="language-js">```not fence```\nline2</code></pre>');
  assert.match(fence, /```js/);
  assert.match(fence, /not fence/);

  const table = md('<table><tr><th>A</th></tr><tr><td>1</td><td orphan</tr></table>');
  assert.match(table, /A/);
  assert.match(table, /1/);

  const link = md('<a href="https://ex.com/path(with)p">label\nbreak</a>');
  assert.match(link, /\[labelbreak\]\(https:\/\/ex\.com\/path\(with\)p\)/);

  const stringPath = md('<p>string <em>path</em></p>');
  assert.match(stringPath, /\*path\*/);
});

test('htmlToMarkdown element node path', () => {
  const { win, CE } = loadChatExport();
  win.document.body.innerHTML = '<article><h2>Title</h2><p>Body</p></article>';
  const out = CE.htmlToMarkdown(win.document.body);
  assert.match(out, /## Title/);
  assert.match(out, /Body/);
});
