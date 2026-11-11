      list: async function (args) {
        try {
          var limit = Ops.clampLimit(args && args.limit);
          var offset = 0;
          if (args && args.cursor != null && String(args.cursor) !== '') {
            offset = Math.max(0, parseInt(String(args.cursor), 10) || 0);
          }
          var path =
            '/conversations?offset=' + encodeURIComponent(String(offset)) + '&limit=' + encodeURIComponent(String(limit)) + '&order=updated';
          var res = await apiFetch(path);
          if (res.status === 401 || res.status === 403) rpcErr('UNAUTHORIZED', 'ChatGPT list ' + res.status);
          if (!res.ok) await failFromResponse(res, 'list');
          var data = await res.json();
          var raw = data.items || [];
          var items = [];
          var i;
          for (i = 0; i < raw.length; i++) {
            if (!raw[i] || !raw[i].id) continue;
            var chat = toListChat(raw[i]);
            if (args && args.containerId && String(chat.containerId || '') !== String(args.containerId)) continue;
            if (Ops.matchQuery && !Ops.matchQuery(chat.title, args && args.query)) continue;
            items.push(chat);
          }
          var nextCursor = raw.length >= limit ? String(offset + raw.length) : null;
          return { items: items, nextCursor: nextCursor };
        } catch (err) {
          hostErr(err);
        }
      },
      get: async function (args, ctx) {
        try {
          var chatId = args && args.chatId ? String(args.chatId) : '';
          if (!chatId) {
            var exported = await exportDataFromApi();
            if (exported && exported.messages && exported.messages.length) {
              return Object.assign({ platform: 'chatgpt', url: location.href }, exported);
            }
            if (ctx && typeof ctx.getData === 'function') {
              var live = await ctx.getData();
              return Object.assign({ platform: 'chatgpt', url: location.href }, live || {});
            }
            rpcErr('BAD_REQUEST', 'chatId required');
          }
          try {
            var payload = await getChatPayload(chatId);
            return Object.assign(
              {
                platform: 'chatgpt',
                url: chatId === currentChatId() ? location.href : location.origin + '/c/' + chatId
              },
              payload
            );
          } catch (apiErr) {
            if (apiErr && apiErr.code === 'NOT_FOUND') throw apiErr;
            if (apiErr && apiErr.code === 'UNAUTHORIZED') throw apiErr;
            if (chatId === currentChatId() && ctx && typeof ctx.getData === 'function') {
              var onPage = await ctx.getData();
              var u = findUserMeta();
              return Object.assign(
                {
                  platform: 'chatgpt',
                  url: location.href,
                  chatId: chatId,
                  title: findTitle(),
                  model: findModel(),
                  userName: u.userName,
                  userHandle: u.userHandle,
                  userEmail: u.userEmail
                },
                onPage || {}
              );
            }
            throw apiErr;
          }
        } catch (err) {
          hostErr(err);
        }
      },
      capabilities: async function () {
        try {
          return await detectChatCapabilities();
        } catch (err) {
          hostErr(err);
        }
      },
      hostState: function () {
        var input = findComposerInput();
        return {
          generating: stopButtonVisible(),
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
          await waitAssistantTurn(turnsBefore, { timeoutMs: 180000 });
          return {
            platform: 'chatgpt',
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
          var title = Ops.testTitle ? Ops.testTitle(args && args.title) : '[ce-test] chat';
          await ensureNewChat();
          await submitComposerText(text);
          var chatId = await Ops.waitFor(
            function () {
              return currentChatId() || null;
            },
            { timeoutMs: 90000, message: 'ChatGPT chatId timeout' }
          );
          await patchTitle(chatId, title);
          return {
            platform: 'chatgpt',
            chatId: chatId,
            title: title,
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
          var res = await apiFetch('/conversation/' + encodeURIComponent(chatId), {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_visible: false })
          });
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
          var before = await CE.platforms.chatgpt.ops.get({ chatId: chatId, branch: 'active' }, ctx);
          var beforeLen = ((before && before.messages) || []).length;
          var text = Ops.quoteSelectionPrompt
            ? Ops.quoteSelectionPrompt(selection, prompt)
            : '> ' + selection + '\n\n' + prompt;
          await CE.platforms.chatgpt.ops.send({ chatId: chatId, text: text });
          var got = null;
          var deadline = Date.now() + 180000;
          while (Date.now() < deadline) {
            var cur = await CE.platforms.chatgpt.ops.get({ chatId: chatId, branch: 'active' }, ctx);
            var msgs = (cur && cur.messages) || [];
            if (msgs.length > beforeLen) {
              var last = msgs[msgs.length - 1];
              if (last && last.role === 'assistant' && !isPlaceholderAssistantText(last.text)) {
                got = cur;
                break;
              }
            }
            await Ops.sleep(400);
          }
          if (!got) rpcErr('TIMEOUT', 'ChatGPT ask_selection reply timeout');
          var messages = (got && got.messages) || [];
          var reply = null;
          var after = null;
          var i;
          for (i = messages.length - 1; i >= 0; i--) {
            if (messages[i] && messages[i].role === 'assistant' && !isPlaceholderAssistantText(messages[i].text)) {
              reply = messages[i];
              after = i;
              break;
            }
          }
          return {
            status: 'done',
            platform: 'chatgpt',
            chatId: chatId,
            selection: selection,
            reply: reply,
            after: after,
            total: messages.length
          };
        } catch (err) {
          hostErr(err);
        }
      },
