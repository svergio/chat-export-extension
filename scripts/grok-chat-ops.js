      list: async function (args) {
        try {
          var limit = Ops.clampLimit(args && args.limit);
          var token = args && args.cursor != null && String(args.cursor) !== '' ? String(args.cursor) : '';
          var includeProjects = !(args && args.includeProjects === false);
          var res = await apiFetch(
            '/rest/app-chat/conversations?pageSize=' +
              encodeURIComponent(String(Math.max(limit, 20))) +
              '&excludeProjects=' +
              (includeProjects ? 'false' : 'true') +
              (token ? '&pageToken=' + encodeURIComponent(token) : '')
          );
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'Grok list ' + res.status);
          if (!res.ok) await failFromResponse(res, 'list');
          var data = await res.json();
          var raw = (data && data.conversations) || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length && items.length < limit; i++) {
            if (!raw[i] || !(raw[i].conversationId || raw[i].id)) continue;
            var chat = toListChat(raw[i]);
            if (args && args.containerId && String(chat.containerId || '') !== String(args.containerId)) continue;
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          return {
            items: items,
            nextCursor: (data && data.nextPageToken) || null
          };
        } catch (err) {
          hostErr(err);
        }
      },
      get: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            if (ctx && typeof ctx.getData === 'function') {
              var live = await ctx.getData();
              return Object.assign({ platform: 'grok', url: location.href }, live || {});
            }
            rpcErr('BAD_REQUEST', 'chatId required');
          }
          if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
            var same = await ctx.getData();
            var u = findUserMeta();
            return Object.assign(
              {
                platform: 'grok',
                url: location.href,
                chatId: chatId,
                title: findTitle(),
                model: findModel(),
                userName: u.userName,
                userHandle: u.userHandle,
                userEmail: u.userEmail
              },
              same || {}
            );
          }
          var messages = await loadConversationMessages(chatId);
          var u2 = findUserMeta();
          return {
            platform: 'grok',
            url: location.origin + '/c/' + chatId,
            title: findTitle(),
            chatId: chatId,
            model: findModel(),
            userName: u2.userName,
            userHandle: u2.userHandle,
            userEmail: u2.userEmail,
            messages: messages
          };
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function () {
        try {
          return await detectGrokCapabilities();
        } catch (err) {
          hostErr(err);
        }
      },
      hostState: function () {
        var input = findComposerInput();
        return {
          generating: isGenerating(),
          composerReady: !!input && (Ops.composerReady ? Ops.composerReady(input) : true)
        };
      },
      send: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!String((args && args.text) || '').trim()) rpcErr('BAD_REQUEST', 'text is required');
          await navigateToChat(chatId);
          var turnsBefore = await submitComposerText(args.text);
          await waitAssistantReply(turnsBefore, 180000);
          return {
            platform: 'grok',
            chatId: chatId,
            title: findTitle(),
            url: location.origin + '/c/' + chatId,
            updatedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      create: async function (args) {
        try {
          var text = String((args && args.text) || '').trim();
          if (!text) rpcErr('BAD_REQUEST', 'text is required');
          await ensureNewChat();
          var turnsBefore = await submitComposerText(text);
          var chatId = await Ops.waitFor(
            function () {
              var id = currentChatId();
              if (id) return id;
              if (responseTurnCount() > turnsBefore) return currentChatId() || true;
              return null;
            },
            { timeoutMs: 90000, message: 'Grok chatId timeout' }
          );
          if (chatId === true) {
            chatId = await Ops.waitFor(currentChatId, { timeoutMs: 30000, message: 'Grok chatId timeout' });
          }
          return {
            platform: 'grok',
            chatId: String(chatId),
            title: findTitle(),
            url: location.origin + '/c/' + chatId,
            updatedAt: new Date().toISOString()
          };
        } catch (err) {
          hostErr(err);
        }
      },
      delete: async function (args) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          var res = await apiFetch('/rest/app-chat/conversations/' + encodeURIComponent(chatId), { method: 'DELETE' });
          if (res.status === 404) rpcErr('NOT_FOUND', 'conversation not found: ' + chatId);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'delete ' + res.status);
          if (!res.ok) await failFromResponse(res, 'delete');
          return { deleted: true, chatId: chatId };
        } catch (err) {
          hostErr(err);
        }
      },
      askSelection: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var selection = String((args && args.selection) || '').trim();
          var prompt = String((args && args.prompt) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!selection) rpcErr('BAD_REQUEST', 'selection required');
          if (!prompt) rpcErr('BAD_REQUEST', 'prompt required');
          var text = Ops.quoteSelectionPrompt
            ? Ops.quoteSelectionPrompt(selection, prompt)
            : '> ' + selection + '\n\n' + prompt;
          await CE.platforms.grok.ops.send({ chatId: chatId, text: text });
          var got = null;
          var deadline = Date.now() + 180000;
          while (Date.now() < deadline) {
            var cur = await CE.platforms.grok.ops.get({ chatId: chatId }, ctx);
            var msgs = (cur && cur.messages) || [];
            if (msgs.length) {
              var last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant' && !isPlaceholderAssistantText(last.text)) {
                got = cur;
                break;
              }
            }
            await Ops.sleep(400);
          }
          if (!got) rpcErr('TIMEOUT', 'Grok ask_selection reply timeout');
          var messages = (got && got.messages) || [];
          var reply = messages[messages.length - 1];
          return {
            status: 'done',
            platform: 'grok',
            chatId: chatId,
            selection: selection,
            reply: reply,
            after: messages.length - 1,
            total: messages.length
          };
        } catch (err) {
          hostErr(err);
        }
      },
      sideAsk: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          var prompt = String((args && args.prompt) || '').trim();
          if (!chatId) rpcErr('BAD_REQUEST', 'chatId required');
          if (!prompt) rpcErr('BAD_REQUEST', 'prompt required');
          var selection = String((args && args.selection) || '').trim();
          var text = selection
            ? Ops.quoteSelectionPrompt
              ? Ops.quoteSelectionPrompt(selection, prompt)
              : '> ' + selection + '\n\n' + prompt
            : prompt;
          try {
            var panel = await Ops.waitFor(
              function () {
                var dialogs = document.querySelectorAll('[role="dialog"], aside, [class*="side" i]');
                var i;
                for (i = 0; i < dialogs.length; i++) {
                  var t = (dialogs[i].textContent || '').replace(/\s+/g, ' ').trim();
                  if (/боковой чат|side chat/i.test(t)) return dialogs[i];
                }
                return null;
              },
              { timeoutMs: 4000, message: 'side chat panel not found' }
            );
            var sideInput =
              panel.querySelector('[contenteditable="true"]') || panel.querySelector('textarea');
            if (sideInput) {
              (Ops.fillRichComposer || Ops.fillEditable)(sideInput, text);
              await Ops.sleep(150);
              var sideSend = panel.querySelector('button[type="submit"], button');
              if (sideSend) Ops.clickEl(sideSend);
              await waitAssistantReply(responseTurnCount(), 120000);
              return { status: 'done', platform: 'grok', chatId: chatId, mode: 'side_panel' };
            }
          } catch (sideErr) {}
          await CE.platforms.grok.ops.send({ chatId: chatId, text: text });
          return { status: 'done', platform: 'grok', chatId: chatId, mode: 'main_fallback' };
        } catch (err) {
          hostErr(err);
        }
      },
