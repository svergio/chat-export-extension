[English](README.md) | [Русский](README.ru.md) · [![Поддержать на DonationAlerts](https://img.shields.io/badge/Поддержать-DonationAlerts-orange)](https://www.donationalerts.com/r/svwergio_mel) · [![chat-export-server MCP server](https://glama.ai/mcp/servers/svergio/chat-export-server/badges/score.svg)](https://glama.ai/mcp/servers/svergio/chat-export-server) · [![MCP Servers](https://img.shields.io/badge/MCP_Servers-listed-2563eb)](https://mcpservers.org/ru/)

# Chat Export — расширение Chrome

<p align="center">
  <img src="docs/media/demo-export.gif" alt="Экспорт на ChatGPT, Grok и Claude — формат и скачивание" width="720" />
</p>

Экспорт и управление **веб-чатами** на восьми площадках (ChatGPT, Grok, X Grok, Claude, GitHub Copilot, Qwen, DeepSeek, Perplexity) — в вашем браузере, под вашими правилами. Расширение добавляет панель экспорта на сайтах провайдеров, скачивает **Markdown, YAML, JSON, HTML и PDF** локально и подключается к [локальному MCP-серверу](https://github.com/svergio/chat-export-server), чтобы агенты (Cursor и др.) могли листать, экспортировать, создавать чаты и задавать вопросы **без API-ключей** вендоров.

**Чем отличается от официального экспорта ChatGPT:** у OpenAI это один zip *всех* чатов в JSON после запроса и ожидания. Здесь — экспорт *текущего* чата в Markdown или PDF (и YAML/JSON/HTML) в один клик: без выгрузки всего аккаунта и без ожидания bulk-архива. Тот же локальный сценарий «один чат — один файл» на остальных семи площадках.

**Без сети, без аналитики, только локально.** Экспорт и опциональный MCP-мост остаются на вашей машине (`chrome.downloads` + `127.0.0.1`). Расширение не «звонит домой» и не содержит телеметрии.

## Автономный продукт

Три публичных репозитория (extension, server, dashboard). Ручной экспорт — только расширение. MCP и автоматизация — `chat-export-server` и **мост расширения** в вкладках Chrome, **без** Chrome DevTools MCP. Сервер можно поднять **нативно**, в **Docker / Colima** или **Kubernetes**. Cursor, Open WebUI и локальные LLM (например Bonsai-27B) — **опциональные внешние MCP-клиенты**.

**Zip для установки:** [chat-export-extension-2.0.5.zip](https://github.com/svergio/chat-export-extension/releases/download/v2.0.5/chat-export-extension-2.0.5.zip) — распакуйте, затем Chrome → режим разработчика → **Загрузить распакованное**. Релиз: [v2.0.5](https://github.com/svergio/chat-export-extension/releases/tag/v2.0.5).

## Проблема

Официальные интерфейсы удобны для диалога, но слабы для **архивации**, **пакетного экспорта** и **оркестрации агентами**. Копипаста не масштабируется на восемь платформ; облачные API — отдельная оплата и комплаенс.

## Что вы получаете

| Платформа | Хосты | Панель экспорта | MCP через сервер |
|-----------|-------|-----------------|------------------|
| ChatGPT | `chatgpt.com` | Да | Да |
| Grok | `grok.com` | Да | Да |
| X Grok | `x.com/i/grok` | Да | Да |
| Claude | `claude.ai` | Да | Да |
| GitHub Copilot Chat | `github.com/copilot*` | Да | Да |
| Qwen | `chat.qwen.ai` | Да | Да |
| DeepSeek | `chat.deepseek.com` | Да | Да |
| Perplexity | `perplexity.ai` | Да | Да |

Разбор DOM — в расширении; автоматизация и MCP — в [локальном сервере](https://github.com/svergio/chat-export-server). Опционально — [дашборд](https://github.com/svergio/chat-export-dashboard).

## Как это устроено

Установите расширение Chrome для экспорта текущего чата в Markdown, PDF и другие форматы с восьми веб-площадок — файлы сохраняются локально, без обращений в сеть. Включите **мост браузера** в попапе, если нужен доступ агента к тем же вкладкам под вашей сессией: WebSocket на **chat-export-server** на `127.0.0.1` (токен `ceb_`). Любой MCP-клиент подключается к `http://127.0.0.1:8765/mcp` с ключом `cem_`/`cek_`. Опциональный **дашборд** на том же хосте показывает очереди, браузеры и токены.

Сервер можно поднять **нативно**, в **Docker / Colima** или **Kubernetes** — см. README сервера и вики. Диаграммы стека, потоки данных и варианты деплоя: **[Вики — Архитектура](https://github.com/svergio/chat-export-extension/wiki/Architecture-RU)**. Инструкции: [Установка и быстрый старт](https://github.com/svergio/chat-export-extension/wiki/Installation-and-Quickstart-RU) · [Сценарии использования](https://github.com/svergio/chat-export-extension/wiki/Use-Cases-RU) · [Нативный / Docker / K8s](https://github.com/svergio/chat-export-extension/wiki/Native-and-Kubernetes-Deployment-RU) · двухуровневое соглашение в [LEGAL.md](LEGAL.md).

## Быстрый старт (3 шага)

1. **Установите расширение** — `chrome://extensions` → режим разработчика → **Загрузить распакованное** → эта папка. Обновите вкладки провайдеров после перезагрузки расширения.
2. **Запустите сервер** (для MCP) — клонируйте [chat-export-server](https://github.com/svergio/chat-export-server), `npm install && npm run build`, `chat-export-server key new`, `chat-export-server start` (по умолчанию `http://127.0.0.1:8765`).
3. **Настройте агента** — MCP `http://127.0.0.1:8765/mcp`, заголовок `Authorization: Bearer <ключ>`. Вызовите `browsers_bind` для вашего профиля Chrome.

Подробнее в [вики](https://github.com/svergio/chat-export-extension/wiki).

## Настройка

Мост браузера настраивается здесь; MCP-ключи и каталог данных — в [chat-export-server](https://github.com/svergio/chat-export-server).

### Попап и параметры (`src/settings.js`)

Хранение: `chrome.storage.local`, ключ `ce.settings`.

| Параметр | По умолчанию | Назначение |
|----------|--------------|------------|
| `serverOn` | `false` | Включить WebSocket-мост |
| `host` | `127.0.0.1` | Хост сервера |
| `port` | `8765` | Порт сервера |
| `apiKey` | пусто | Токен шлюза `ceb_…` с сервера или дашборда |
| `browserLabel` | `Chrome` | Подпись в дашборде / `browsers_list` |
| `platforms.*` | все вкл. | Платформы: `chatgpt`, `grok`, `grok-x`, `copilot`, `claude`, `qwen`, `deepseek`, `perplexity` |
| `allowCreate` | `true` | Создание/отправка через MCP |
| `allowDestructive` | `false` | Удаление (нужно и на сервере) |
| `allowProjects` | `true` | Инструменты проектов |
| `rpcTimeoutS` | `60` | Таймаут RPC (сек.) |

**Базовый** режим: форматы и мост. **Дополнительно**: хост, порт, `ceb_`, матрица платформ, права.

### Подключение к серверу

1. Запустите сервер на `http://127.0.0.1:8765`.
2. Получите **`ceb_`** (`chat-export-server browser enroll` или дашборд **Браузеры**).
3. Попап → Дополнительно → токен, хост, порт, включите мост.
4. Откройте вкладки провайдеров под своей учёткой.

### Два профиля Chrome

До **двух** профилей с отдельными `ceb_` и очередями. Второй профиль: то же расширение, новый `ceb_` в [дашборде](https://github.com/svergio/chat-export-dashboard).

MCP и `~/.chat-export`: [README сервера — Configuration](https://github.com/svergio/chat-export-server#configuration).

## Панель экспорта (без сервера)

1. Откройте сайт провайдера и обновите вкладку после обновления расширения.
2. Выберите форматы (MD / YAML / JSON / HTML / PDF). При нескольких форматах — **Папка** или **Архив**.
3. Иконка загрузки — тихое сохранение в «Загрузки» (Shift/Cmd = «Сохранить как»). Имя: `{platform}-{title}-{date}.{ext}`.

**Как выглядит текст (семантика):** Дефолт-схема `chat-export/1` — MD-фенсы `` ```md `` (`sys` / `user:` / `assistant:` / `sources`); JSON `schema: chat-export/1` и `messages[{ role, role_tag, text, … }]`. Опционально `sharegpt/1` — ShareGPT `conversations[{ from, value }]`. Схема выбирается в попапе (Расширенные); панель на странице только форматы. Хаб и мини-страницы: **[Вики — Форматы экспорта](https://github.com/svergio/chat-export-extension/wiki/Export-Formats-RU)**.


## Безопасность

- Всё работает **только локально**. Без телеметрии в описанном контуре.
- Доступ только к **вашей** сессии; пароли сайтов сервер не получает.
- Мост браузера: `ceb_`; MCP: `cem_`/`cek_`. Не коммитьте ключи.
- Деструктивные операции выключены по умолчанию (`allowDestructive`, `confirm: true`).
- Модель угроз: [SECURITY.md](https://github.com/svergio/chat-export-server/blob/main/SECURITY.md) сервера.

## Честно: ToS и хрупкость

**Двухуровневое пользовательское соглашение ([LEGAL.md](LEGAL.md)).** Так как Chat Export взаимодействует с веб-интерфейсами и внутренними API страниц в вашей активной сессии, в расширении предусмотрено двухэтапное согласие с условиями:
1. **Уровень 1 (Общие условия и предупреждение о рисках)** при первом открытии попапа — уведомляет о поставке ПО «КАК ЕСТЬ» по лицензии MIT и предупреждает о риске лимитов или блокировки аккаунта со стороны провайдеров при сборе DOM или запросах к внутренним API.
2. **Уровень 2 (Расширенный режим / локальный MCP-шлюз)** при открытии раздела `Расширенные` — охватывает управление вкладками через внешние ИИ-агенты (Cursor, Claude Desktop и локальные LLM, включая `bonsai-27b`, через [chat-export-server](https://github.com/svergio/chat-export-server)). Создание и особенно удаление консервативны по умолчанию: `allowDestructive` в расширении выключен (`false`), сервер согласован, удаление требует `confirm: true`.

**Хрупкость.** Экспорт и автоматизация читают живой DOM (иногда in-page API). Редизайн сайта может сломать content script overnight. Пишите в [issues](https://github.com/svergio/chat-export-extension/issues); чеклисты платформ и локалей — в [CONTRIBUTING.md](CONTRIBUTING.md).

## Соседние репозитории

| Репозиторий | Роль |
|-------------|------|
| [chat-export-extension](https://github.com/svergio/chat-export-extension) (этот) | MV3, content scripts, WS |
| [chat-export-server](https://github.com/svergio/chat-export-server) | MCP, очереди, кеш (в каталогах [MCP Servers](https://mcpservers.org/ru/) и [Glama](https://glama.ai/mcp/servers/svergio/chat-export-server)) |
| [chat-export-dashboard](https://github.com/svergio/chat-export-dashboard) | Веб-UI оператора |
| [Wiki](https://github.com/svergio/chat-export-extension/wiki) | Установка, инструменты, FAQ |

## Поддержка проекта

Проект бесплатный и с открытым кодом:

- **Донат (фиат):** [DonationAlerts — svwergio_mel](https://www.donationalerts.com/r/svwergio_mel)

Донаты добровольны и без возврата; не покупают приватную поддержку.

## Участие в разработке

Новые платформы и языки UI: [CONTRIBUTING.ru.md](CONTRIBUTING.ru.md) · [CONTRIBUTING.md](CONTRIBUTING.md) · [вики](https://github.com/svergio/chat-export-extension/wiki/Contributing-RU).

## Зависимости

| Слой | Стек |
| --- | --- |
| Расширение (этот репозиторий) | MV3 + **Preact** (esbuild); PDF в `vendor/` |
| Опциональный сервер | [chat-export-server](https://github.com/svergio/chat-export-server) — Node 22, MCP SDK, `ws`, Zod, `@chat-export/protocol` |
| Опциональный dashboard | [chat-export-dashboard](https://github.com/svergio/chat-export-dashboard) — React 19, `/dashboard/` |

**Связка:** расширение ↔ WebSocket сервера (`/ws`, токен `ceb_`) ↔ MCP (`/mcp`) ↔ dashboard (`/dashboard/api`). Схемы протокола — в сервере, `packages/protocol/`.

Сторонние лицензии: [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md); обновление: `npm run licenses`.

**Не обязательны:** Cursor, Open WebUI, BibLLMsteak, Bonsai-27B, дерево NodeRed — только примеры MCP-клиентов или внутренняя документация. Три публичных репозитория на GitHub — ядро продукта; см. [вики расширения](https://github.com/svergio/chat-export-extension/wiki).

## Лицензия

См. [LICENSE](LICENSE).
