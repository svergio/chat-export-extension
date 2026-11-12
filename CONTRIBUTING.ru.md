# Участие в разработке Chat Export

[English](CONTRIBUTING.md) | [Русский](CONTRIBUTING.ru.md)

Структура в дереве сопровождения `projects/Chat Export/`:

| Репозиторий | Путь |
|-------------|------|
| Extension | `chat-export-extension/` |
| Server | `chat-export-server/` |
| Dashboard | `chat-export-dashboard/` |
| Общие доки | `docs/` (platforms, site-maps, acceptance) |
| Wiki (GitHub) | клон `chat-export-extension.wiki/` |

В коммитах **без** `Co-authored-by`. Продуктовые PR — в `main`; тесты/hardening — сначала в `test` (см. **Тесты** и **CI и промоут** ниже).

После смены зависимостей в `package.json` или файлов в `vendor/` запустите `npm run licenses` и закоммитьте [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md), если таблица изменилась. Используется one-shot `npx license-checker` (не зависимость репозитория).

Расширенная вики: [Участие в разработке](https://github.com/svergio/chat-export-extension/wiki/Contributing-RU).

## Исследование провайдера (до кода)

**Не** правьте `content/<id>.js`, matches в манифесте и enum протокола, пока разведка не записана.

| Шаг | Действие |
|-----|----------|
| 1 | Залогиненная вкладка: snapshot/DOM-карта через Chrome DevTools (`docs/site-maps/`; макс. 2 скрина на задачу). |
| 2 | Файл `projects/Chat Export/docs/site-maps/<host>.md` — composer, список чатов, regex `chatId` в URL, переключатели модели, внутренние list/get/delete API, заметки по хрупкости (как `chatgpt.com.md`, `claude.ai.md`). |
| 3 | API-first vs DOM fallback по операциям (`list`, `get`, `exportData`, `delete` vs `create`, `send`). |
| 4 | Стабильный platform id; тот же id в протоколе, манифесте, settings и `docs/platforms.md`. |

Статический маркетинг без сессии — только HTTP/карта, без дампов всей HTML. Живой MCP-smoke — только чаты с префиксом **`[ce-test]`**; без массовых delete реальных тредов.

Правило в NodeRed: `.cursor/rules/chat-export-provider-research.mdc`.

## Новая платформа (провайдер)

Выберите стабильный **platform id** (lowercase, при необходимости с дефисом, напр. `grok-x`). Одна и та же строка везде ниже.

### По шагам

1. **Research** — раздел выше; реализация с карты сайта.
2. **Protocol** — id в `PLATFORMS` в `chat-export-server/packages/protocol/src/constants.js`; enum в JSON Schema при необходимости (`schema.js`). `npm run build` на сервере.
3. **Content script** — `CE.definePlatform({ id, hosts, ops, … })` в `content/<id>.js` (образец: `chatgpt.js`, `grok-x.js`).
4. **manifest.json** — `host_permissions`, `content_scripts.matches`, `web_accessible_resources` (узкие паттерны).
5. **UI** — CSS бара в `styles.css`; `npm run build` → `dist/shared.js`, `dist/popup.js`.
6. **Settings** — тоггл в `src/settings.js` (`PLATFORMS`, `platforms`) и списки в `background.js`, пока сборка не унифицирует.
7. **Server** — валидация по `PLATFORMS`; `platformsEnabled` в `config.json` и мосте расширения.
8. **MCP** — существующие инструменты с аргументом `platform`; новый tool только если поверхность реально другая.
9. **Dashboard (опционально)** — скин: `Skin` в `useTheme.ts`, иконки, `static/skins.css`, сборка и обновление submodule `dashboard/` на сервере.
10. **Docs** — `docs/platforms.md`, матрица в README, вики **Supported Platforms**.

### Файлы и хуки (платформа)

| Область | Путь | Что менять |
|---------|------|------------|
| Список id | `packages/protocol/src/constants.js` | `PLATFORMS` |
| RPC / schema | `packages/protocol/src/schema.js` | enum, аргументы ops |
| Реализация | `content/<platform>.js` | `CE.definePlatform`, `ops.*` |
| MV3 | `manifest.json` | permissions, content_scripts |
| Бар | `styles.css` | layout под платформу |
| Сборка | `dist/*` | `npm run build` |
| Мост | `src/settings.js`, `background.js` | `PLATFORMS`, `platforms.<id>` |
| Popup | `src/popup/main.jsx` | из settings |
| Карта сайта | `docs/site-maps/*.md` | селекторы, SPA |
| Трекер | `docs/platforms.md` | приоритет, hosts, статус |
| Конфиг сервера | `src/core/config.ts` | `platformsEnabled` |
| Hub / RPC | `browser-hub.ts`, `server-core.ts` | enablement, `callOp` |
| MCP | `src/mcp/tools.ts` | `platforms_list` |
| Скин дашборда | `useTheme.ts`, `skins.css`, `SkinIcons.tsx` | при новой теме |
| Acceptance | `docs/acceptance.md` | ручные / MCP-пробы |

MCP использует protocol id (напр. `grok-x`), не hostname. `platforms_list` мержит настройки сервера с `platformsEnabled` из handshake расширения.

## Новый язык UI (i18n)

Сейчас: **English** и **Russian**, плюс **Auto**. Паки локалей у расширения общие для popup и бара; дашборд грузит JSON по HTTP.

### Extension (popup + export bar)

| Шаг | Путь | Действие |
|-----|------|----------|
| 1 | `locales/LN_<code>.json` | Таблица строк (копия `LN_en.json`) |
| 2 | `src/i18n/index.js` | Импорт в `PACKS`; при необходимости `resolveLocale()` |
| 3 | `src/settings.js` | Код в `UI_LOCALES` |
| 4 | `src/popup/skin-icons.jsx` | `{ id: '<code>' }` в `LOCALE_OPTIONS` |
| 5 | `LN_en.json` (+ `LN_ru.json`) | Метка `lang.<code>` |
| 6–7 | popup / ExportBar | Обычно без правок сверх options |
| 8 | Сборка | `npm run build` |

Тема (`auto` / `light` / `dark`) и скины — в `skin-icons.jsx` / `settings.js`.

### Dashboard

| Шаг | Путь | Действие |
|-----|------|----------|
| 1 | `static/locales/<code>.json` | Полный набор ключей |
| 2 | `useTheme.ts` | `LocaleCode` |
| 3 | `useLocale.ts` | fetch по имени файла |
| 4 | `AppearanceControls.tsx` | пункты меню + ключи |
| 5 | `npm run build` → `public/locales/` |
| 6 | Embed на сервере | submodule / copy в `dashboard/public/` |

Ключи строк должны совпадать между языками (`createTranslator` / `t(key)`).

## Тесты (ветка `test`)

Новые и усиленные тесты сначала на **`test`**. Фичи — в `main`; после мержа синхронизируйте `main` → `test` и наращивайте покрытие. Промоут `test` → `main` только при зелёном CI на `test`.

### Adversarial (extension)

Цель: враждебные, но реалистичные входы — парсеры, settings, DOM бара, контракты провайдеров — без многоминутного fuzz и без массовых delete реальных чатов.

| Область | Примеры |
|---------|---------|
| `htmlToMarkdown` / `DOMParser` | незакрытые теги, script/style, вложенные fences, битые таблицы |
| Settings | битый storage, старые `tosVersion` / `faqVersion`, порты, UI enums |
| DOM harness | отсутствующие ноды, busy-оверлеи (только детерминированные waits) |
| Providers | start URL моста и форма `ops` для всех восьми id |

`npm test` — детерминированно, **&lt; ~15s**. Файлы: `test-html-to-markdown.js`, `test-settings.js`, `test-i18n.js`, `test-providers-contract.js`.

```bash
git fetch origin test && git checkout test
npm test
npm run test:unit
npm run test:dom
```

### Server

На ветке `test` сервера: `npm test`, `npm run test:contract`, `npm run test:all`.

Правило: `.cursor/rules/chat-export-test-branch-adversarial.mdc`.

## CI и промоут (`test` → `main`)

Workflow: `.github/workflows/build-extension.yml` на push/PR в `main` и `test`.

| Шаг | Команда | Зачем |
|-----|---------|--------|
| Install | `npm ci` | зависимости |
| Test | `npm test` | unit + DOM + adversarial + i18n |
| Audit | `npm audit --audit-level=high` | high/critical |
| Build | `npm run build` | бандлы |
| Pack | `npm run pack` | zip + verify + artifact; на `v*` — GitHub Release |

`dist-pack/` в gitignore; CI всё равно пакует. Зелёный `test` → merge в `main` для релиза.

## Чеклист двух уровневого ToS

Текст — в `LEGAL.md` и вики. При правках consent UI / storage / моста:

| Уровень | Storage / API | Кто гейтит | Без согласия блокирует |
|---------|---------------|------------|-------------------------|
| 1 — общий legal / export | `tosVersion` === `TOS_VERSION` | `hasTosConsent()` | popup, `serverOn`, WS-мост |
| 2 — Advanced MCP | `faqVersion` === `FAQ_VERSION` | `hasFaqConsent()`; мост ещё требует tier 1 + `apiKey` | `serverOn`, мост, automation |

Бамп `TOS_VERSION` / `FAQ_VERSION` только вместе с `LEGAL.md` и ключами в `LN_en.json` / `LN_ru.json`. Регрессии: `test-settings.js`, `test-i18n.js`.

## Отчёты при падении CI / MR

Не «тесты упали». Четыре блока: **что сломалось**, **почему**, **импакт**, **куда чинить**. Правило: `.cursor/rules/chat-export-mr-review-after-tests.mdc`.

## Указатели по разработке

- Extension: `npm run build`
- Server: Node 22.13+, `npm run build`, `chat-export-server start`
- Dashboard: `npm run dev`
- Платформы: `docs/platforms.md`
- Конфиг: README **Configuration** / вики Installation

Вопросы — Issues того репо, которое трогаете; security — `SECURITY.md` на server/dashboard.
