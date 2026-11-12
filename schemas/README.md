# Export schemas

Schema id: `{name}/{version}` (display: `{name} — {version}`). Default: `chat-export/1`.

## Layout

```text
schemas/<name>-<version>/
  manifest.json   # id, name, version, title{en,ru}, formats[], wikiSlug, description{en,ru}
```

Renderers live under `src/schemas/` and are registered in `src/schemas/index.js` (bundled into `dist/shared.js`).

## Publishing a new schema

1. Add `schemas/<slug>/manifest.json` with stable `id` (`name/version`).
2. Implement renderers in `src/schemas/<slug>/render.js` for all of `md|yaml|json|html|pdf`.
3. Register in `src/schemas/index.js` (`SCHEMA_IDS` + pack map).
4. Add `schema.id.<id>` labels in `locales/LN_en.json` and `LN_ru.json`.
5. Wiki mini EN+RU (`Export-Schema-<slug>.md`) linked from Export-Formats hub.
6. Fixture + parse tests in `test/test-export-schemas.js`.
7. Protocol/server: extend `EXPORT_SCHEMAS` if the id is shipped.

No schema without a parse test. Keep `npm test` under ~15s.
