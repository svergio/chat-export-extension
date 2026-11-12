# Legal Notice, Terms of Use & Privacy Policy / Правовое уведомление, Условия использования и Политика конфиденциальности

[English](#english) | [Русский](#русский)

---

## English

### 1. Open-Source MIT License Notice ("AS IS")

**Chat Export** is free and open-source software licensed under the [MIT License](LICENSE).

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

### 2. Tier 1 Terms of Use: General Export & Account Risk Disclaimer

Before using the Chat Export extension, you must acknowledge and accept the following conditions:

1. **Third-Party Web UI & Internal API Interaction:** Chat Export operates inside your logged-in browser tabs on third-party AI platforms (ChatGPT, Grok, X Grok, Claude, GitHub Copilot, Qwen, DeepSeek, Perplexity) by reading the live DOM and, where required for export completeness, reading or calling in-page web endpoints within your session context.
2. **Account Ban & Rate-Limit Risk:** Automated DOM harvesting, internal API requests, or high-frequency exports may be interpreted by third-party providers as a violation of their Terms of Service. The authors make **no guarantee** that using this extension will not trigger rate limits, CAPTCHAs, temporary suspensions, or permanent account bans. You use this extension entirely at your own risk.
3. **Personal Data Portability Only:** This tool is intended for exporting and archiving your own conversations. You are solely responsible for complying with the Terms of Service of each provider and applicable laws.
4. **UI Fragility & Bug Reporting:** Provider web interfaces change frequently without notice, which can break export or parsing at any time. If a platform adapter stops working, please report an issue on GitHub: [https://github.com/svergio/chat-export-extension/issues](https://github.com/svergio/chat-export-extension/issues).

### 3. Tier 2 Terms of Use: Advanced Mode (Local MCP Gateway & Agent Automation)

Enabling the optional **Gateway for server (MCP)** in the `Advanced` panel requires a second explicit consent:

1. **External Agent Control:** Turning on the Local MCP Gateway connects your browser profile over local loopback (`ws://127.0.0.1:8765/ws`) to your local `chat-export-server` instance. Connected MCP clients — such as Cursor, Claude Desktop, or local LLMs (e.g. `bonsai-27b`) — can list, read, export, create, send messages to, and (if explicitly permitted) delete chats inside your logged-in browser tabs.
2. **Elevated Automation Risk:** Automated prompt submission (`chat_ask`, `chats_create`, `chats_send`) and multi-tab orchestration act directly on your live user accounts. Automated writes carry a significantly higher risk of anti-bot detection, rate-limiting, or account termination by providers compared to passive manual exports.
3. **Permission Gates:**
   - Creating and sending chats (`allowCreate`) can be disabled at any time in the extension popup.
   - Project management (`allowProjects`) can be toggled independently.
   - Destructive operations (`allowDestructive` for deleting chats or projects) are **disabled by default** and require explicit confirmation on both the extension and server.
4. **Full User Responsibility:** You assume full responsibility for every action initiated by any AI agent, script, or local model connected to your local gateway.

### 4. Privacy & Local-Only Data Policy (Chrome Web Store Compliance)

- **Zero External Transmission:** Chat Export does not operate any cloud backend, analytics service, or telemetry endpoint. All exported files (Markdown, YAML, JSON, HTML, PDF) are built locally in your browser and saved directly to your device via `chrome.downloads`.
- **Optional Local Loopback Bridge:** When Advanced Mode is enabled by the user, the extension communicates exclusively with a user-hosted loopback server (`127.0.0.1` / `localhost`) authenticated by a per-profile `ceb_` token stored in `chrome.storage.local`.
- **No Credential Harvesting:** Site passwords, authentication cookies, and billing details are never collected, stored, or transmitted by the extension.

---

## Русский

### 1. Уведомление об открытой лицензии MIT («КАК ЕСТЬ»)

**Chat Export** — бесплатное программное обеспечение с открытым исходным кодом, распространяемое по лицензии [MIT License](LICENSE).

ПРОГРАММНОЕ ОБЕСПЕЧЕЧЕНИЕ ПРЕДОСТАВЛЯЕТСЯ «КАК ЕСТЬ» (AS IS), БЕЗ КАКИХ-ЛИБО ГАРАНТИЙ, ЯВНЫХ ИЛИ ПОДРАЗУМЕВАЕМЫХ, ВКЛЮЧАЯ, ПОМИМО ПРОЧЕГО, ГАРАНТИИ ТОВАРНОЙ ПРИГОДНОСТИ, СООТВЕТСТВИЯ ОПРЕДЕЛЕННОМУ НАЗНАЧЕНИЮ И НЕНАРУШЕНИЯ ПРАВ. АВТОРЫ И ПРАВООБЛАДАТЕЛИ НИ ПРИ КАКИХ ОБСТОЯТЕЛЬСТВАХ НЕ НЕСУТ ОТВЕТСТВЕННОСТИ ЗА ЛЮБЫЕ ПРЕТЕНЗИИ, УБЫТКИ ИЛИ ИНУЮ ОТВЕТСТВЕННОСТЬ, ВОЗНИКАЮЩИЕ В РЕЗУЛЬТАТЕ ИСПОЛЬЗОВАНИЯ ИЛИ НЕВОЗМОЖНОСТИ ИСПОЛЬЗОВАНИЯ ПРОГРАММНОГО ОБЕСПЕЧЕНИЯ.

### 2. Уровень 1 (Tier 1): Общие условия использования и предупреждение о риске блокировки аккаунтов

Перед началом работы с расширением Chat Export пользователь обязан ознакомиться и принять следующие условия:

1. **Взаимодействие с веб-интерфейсами и внутренними API:** Расширение Chat Export работает внутри ваших авторизованных вкладок на сторонних ИИ-платформах (ChatGPT, Grok, X Grok, Claude, GitHub Copilot, Qwen, DeepSeek, Perplexity), считывая DOM-дерево страницы и при необходимости обращаясь к внутренним веб-эндпоинтам страницы в контексте вашей сессии.
2. **Риск лимитов и блокировки (бана) аккаунта:** Автоматизированный сбор данных из DOM, обращения к внутренним API страниц или частый массовый экспорт могут быть расценены администрацией сервисов как нарушение их Пользовательского соглашения (Terms of Service). Разработчики **не дают никаких гарантий**, что использование расширения не приведет к ограничению скорости запросов (rate-limit), появлению капчи, временной заморозке или полной блокировке (бану) вашего аккаунта. Вы используете расширение исключительно на свой страх и риск.
3. **Экспорт собственных данных:** Инструмент предназначен для резервного копирования и экспорта ваших собственных диалогов (personal data portability). Вы самостоятельно несете ответственность за соблюдение правил конкретных площадок и применимого законодательства.
4. **Изменения верстки и баг-репорты:** Веб-интерфейсы ИИ-провайдеров регулярно обновляются без предупреждения, из-за чего парсер или кнопка экспорта могут перестать работать в любой момент. Если вы столкнулись с ошибкой, пожалуйста, создайте ишью на GitHub: [https://github.com/svergio/chat-export-extension/issues](https://github.com/svergio/chat-export-extension/issues).

### 3. Уровень 2 (Tier 2): Условия расширенного режима (локальный MCP-шлюз и автоматизация агентами)

Включение опционального режима **Шлюз для сервера (MCP)** в разделе `Расширенные` (`Advanced`) требует второго явного согласия пользователя:

1. **Управление со стороны внешних ИИ-агентов:** Включение локального MCP-шлюза соединяет ваш браузерный профиль по локальному интерфейсу (`ws://127.0.0.1:8765/ws`) с вашим локальным сервером `chat-export-server`. Подключенные MCP-клиенты — такие как Cursor, Claude Desktop или локальные LLM (например, `bonsai-27b`) — получают возможность просматривать список чатов, читать их содержимое, создавать новые диалоги, отправлять промпты и (если включено разрешение) удалять чаты в ваших открытых вкладках.
2. **Повышенный риск при автоматизации:** Автоматическая отправка сообщений (`chat_ask`, `chats_create`, `chats_send`) и оркестрация вкладок выполняются непосредственно от лица вашей живой учетной записи. Автоматизация записи несет существенно более высокий риск срабатывания антибот-защиты, лимитов или блокировки аккаунта со стороны провайдеров по сравнению с обычным ручным экспортом.
3. **Разграничение прав (Permission Gates):**
   - Создание чатов и отправку сообщений (`allowCreate`) можно в любой момент отключить в попапе расширения.
   - Управление проектами (`allowProjects`) переключается отдельно.
   - Деструктивные операции (`allowDestructive` — удаление чатов и проектов) **выключены по умолчанию** и требуют явного включения и подтверждения.
4. **Полная ответственность пользователя:** Вы полностью отвечаете за любые действия, выполняемые подключенными ИИ-агентами, скриптами или локальными моделями через ваш локальный шлюз.

### 4. Политика конфиденциальности и локальной обработки данных (для Chrome Web Store)

- **Отсутствие внешней передачи данных:** У Chat Export нет облачных серверов, аналитики, трекеров или телеметрии. Все файлы экспорта (Markdown, YAML, JSON, HTML, PDF) создаются локально в вашем браузере и сохраняются напрямую на ваш диск через `chrome.downloads`.
- **Опциональный локальный мост (Loopback):** При включении расширенного режима расширение обменивается данными исключительно с локальным сервером на вашем компьютере (`127.0.0.1` / `localhost`) по индивидуальному токену профиля `ceb_`, хранящемуся в `chrome.storage.local`.
- **Неприкосновенность учетных данных:** Пароли от сайтов, авторизационные cookies и платежные данные никогда не считываются, не сохраняются и не передаются расширением.
