import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeSettings,
  normalizeExportSchemas,
  effectiveSchemaForFormat,
  DEFAULT_EXPORT_SCHEMA_ID,
  EXPORT_SCHEMA_IDS
} from '../src/settings.js';
import { renderSharegpt } from '../src/schemas/sharegpt-1/render.js';
import { DEFAULT_SCHEMA_ID, SCHEMA_IDS, normalizeSchemaId } from '../src/schemas/index.js';
import { loadChatExport } from './core-harness.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const sampleMeta = {
  platform: 'chatgpt',
  url: 'https://chatgpt.com/c/abc',
  title: 'Schema fixture',
  exported: '2026-11-12T00:00:00.000Z',
  exported_at: '2026-11-12T00:00:00.000Z',
  chat_id: 'abc',
  model: 'gpt-test'
};

const sampleMessages = [
  { role: 'user', roleTag: 'user', text: 'Hello schema' },
  { role: 'assistant', roleTag: 'assistant', text: 'Hi there' }
];

test('schema id constants', () => {
  assert.equal(DEFAULT_SCHEMA_ID, 'chat-export/1');
  assert.equal(DEFAULT_EXPORT_SCHEMA_ID, 'chat-export/1');
  assert.deepEqual([...SCHEMA_IDS].sort(), [...EXPORT_SCHEMA_IDS].sort());
  assert.equal(normalizeSchemaId('nope'), 'chat-export/1');
});

test('normalizeExportSchemas default and per-format', () => {
  const s = normalizeSettings({});
  assert.equal(s.exportSchemas.default, 'chat-export/1');
  assert.equal(s.exportSchemas.byFormat.md, null);

  const es = normalizeExportSchemas({
    default: 'sharegpt/1',
    byFormat: { json: 'chat-export/1', md: null, yaml: 'garbage/9' }
  });
  assert.equal(es.default, 'sharegpt/1');
  assert.equal(es.byFormat.json, 'chat-export/1');
  assert.equal(es.byFormat.md, null);
  assert.equal(es.byFormat.yaml, 'chat-export/1');
  assert.equal(effectiveSchemaForFormat(es, 'md'), 'sharegpt/1');
  assert.equal(effectiveSchemaForFormat(es, 'json'), 'chat-export/1');
  assert.equal(effectiveSchemaForFormat(es, 'json', 'sharegpt/1'), 'sharegpt/1');
});

test('chat-export/1 markdown and json from core builders', () => {
  const { CE } = loadChatExport();
  const md = CE.buildMarkdown(sampleMeta, sampleMessages);
  assert.match(md, /```md\nsys\n/);
  assert.match(md, /```md\nuser:\n```/);
  assert.match(md, /Hello schema/);
  const j = JSON.parse(CE.buildJson(sampleMeta, sampleMessages));
  assert.equal(j.schema, 'chat-export/1');
  assert.equal(j.messages[0].text, 'Hello schema');
});

test('sharegpt/1 json conversations parse', () => {
  const raw = renderSharegpt('json', sampleMeta, sampleMessages, {});
  const j = JSON.parse(raw);
  assert.equal(j.schema, 'sharegpt/1');
  assert.equal(j.conversations[0].from, 'human');
  assert.equal(j.conversations[0].value, 'Hello schema');
  assert.equal(j.conversations[1].from, 'gpt');
});

test('sharegpt/1 md and yaml contain markers', () => {
  const md = renderSharegpt('md', sampleMeta, sampleMessages, {});
  assert.match(md, /schema: sharegpt\/1/);
  assert.match(md, /### human/);
  const yaml = renderSharegpt('yaml', sampleMeta, sampleMessages, {});
  assert.match(yaml, /from: human/);
});

test('sharegpt/1 can reuse core html builder', () => {
  const { CE } = loadChatExport();
  const html = renderSharegpt('html', sampleMeta, sampleMessages, CE);
  assert.match(html, /<!DOCTYPE html>/i);
  assert.match(html, /Hello schema/);
});

test('manifests exist for both schemas', () => {
  for (const slug of ['chat-export-1', 'sharegpt-1']) {
    const man = JSON.parse(readFileSync(join(root, 'schemas', slug, 'manifest.json'), 'utf8'));
    assert.ok(man.id.includes('/'));
    assert.ok(man.version >= 1);
    assert.ok(man.formats.includes('md'));
    assert.ok(man.wikiSlug);
  }
});
