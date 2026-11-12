import chatExportManifest from '../../schemas/chat-export-1/manifest.json' with { type: 'json' };
import sharegptManifest from '../../schemas/sharegpt-1/manifest.json' with { type: 'json' };
import { renderSharegpt } from './sharegpt-1/render.js';

export const DEFAULT_SCHEMA_ID = 'chat-export/1';

export const SCHEMA_IDS = Object.freeze(['chat-export/1', 'sharegpt/1']);

export const SCHEMA_MANIFESTS = Object.freeze({
  'chat-export/1': chatExportManifest,
  'sharegpt/1': sharegptManifest
});

const FORMAT_KEYS = ['md', 'yaml', 'json', 'html', 'pdf'];

export function normalizeSchemaId(id) {
  const s = String(id || '').trim();
  if (SCHEMA_IDS.indexOf(s) >= 0) return s;
  return DEFAULT_SCHEMA_ID;
}

export function normalizeExportSchemas(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const def = normalizeSchemaId(src.default);
  const byFormat = {};
  const bf = src.byFormat && typeof src.byFormat === 'object' ? src.byFormat : {};
  for (let i = 0; i < FORMAT_KEYS.length; i++) {
    const f = FORMAT_KEYS[i];
    const v = bf[f];
    if (v == null || v === '' || v === 'default') {
      byFormat[f] = null;
    } else {
      byFormat[f] = normalizeSchemaId(v);
    }
  }
  return { default: def, byFormat: byFormat };
}

export function effectiveSchemaForFormat(exportSchemas, format, overrideSchema) {
  if (overrideSchema) return normalizeSchemaId(overrideSchema);
  const es = normalizeExportSchemas(exportSchemas);
  const f = String(format || '');
  if (es.byFormat[f]) return es.byFormat[f];
  return es.default;
}

export function listSchemaOptions(locale) {
  const loc = locale === 'ru' ? 'ru' : 'en';
  return SCHEMA_IDS.map(function (id) {
    const m = SCHEMA_MANIFESTS[id];
    const title =
      (m && m.title && (m.title[loc] || m.title.en)) || id.replace('/', ' — ');
    return { id: id, title: title, manifest: m };
  });
}

function renderChatExport(format, meta, messages, ce) {
  if (format === 'md') return ce.buildMarkdown(meta, messages);
  if (format === 'yaml') return ce.yamlDump(meta, messages);
  if (format === 'json') return ce.buildJson(meta, messages);
  if (format === 'html') return ce.buildHtml(meta, messages);
  if (format === 'pdf') return ce.buildPdf(meta, messages);
  throw new Error('unsupported format: ' + format);
}

export function renderWithSchema(schemaId, format, meta, messages, ce) {
  const id = normalizeSchemaId(schemaId);
  if (id === 'sharegpt/1') return renderSharegpt(format, meta, messages, ce);
  return renderChatExport(format, meta, messages, ce);
}

export function installSchemas(CE) {
  if (!CE) return;
  CE.DEFAULT_SCHEMA_ID = DEFAULT_SCHEMA_ID;
  CE.SCHEMA_IDS = SCHEMA_IDS;
  CE.SCHEMA_MANIFESTS = SCHEMA_MANIFESTS;
  CE.normalizeSchemaId = normalizeSchemaId;
  CE.normalizeExportSchemas = normalizeExportSchemas;
  CE.effectiveSchemaForFormat = effectiveSchemaForFormat;
  CE.listSchemaOptions = listSchemaOptions;
  CE.renderWithSchema = function (schemaId, format, meta, messages) {
    return renderWithSchema(schemaId, format, meta, messages, CE);
  };
}
