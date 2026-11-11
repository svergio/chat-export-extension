(function (global) {
  'use strict';

  var BAR_ATTR = 'data-chat-export-bar';
  var EXT_VERSION = '1.8.3';
  var HTTP_RE = /^https?:\/\//i;
  var URL_KEYS = /^(url|uri|href|link|sourceUrl|canonicalUrl|webUrl|targetUrl)$/i;
  var TITLE_KEYS = /^(title|name|label|text|snippet|domain|publisher|siteName)$/i;
  var SOURCE_KEYS = /^(citations|sources|webResults|searchResults|webSearchResults|citedWebSearchResults|xposts|references|results|items|links|webPages|cards)$/i;

  function isSkippableHref(href) {
    if (!href) return true;
    var h = String(href).trim();
    if (!h) return true;
    if (/^javascript:/i.test(h)) return true;
    if (/^data:/i.test(h)) return true;
    if (h === '#') return true;
    if (h.charAt(0) === '#' && h.length > 1) return true;
    return false;
  }

  function absUrl(href) {
    try {
      return new URL(href, location.href).href;
    } catch (e) {
      return href;
    }
  }

  function isNoiseUrl(url) {
    if (!url || isSkippableHref(url)) return true;
    if (!HTTP_RE.test(url)) return true;
    if (/\.(js|css|woff2?|map|png|jpe?g|gif|svg|webp|ico|avif)(\?|$)/i.test(url)) return true;
    if (/\/_next\/|\/static\/chunks\/|\/assets\/media\//i.test(url)) return true;
    if (/googleapis\.com|gstatic\.com|google-analytics|doubleclick\.net/i.test(url)) return true;
    if (/cookielaw\.org|onetrust\.com|cookiepedia\.co/i.test(url)) return true;
    if (/google\.com\/s2\/favicons|images\.openai\.com\/static-rsc/i.test(url)) return true;
    return false;
  }

  function extractHttpUrl(str) {
    var s = String(str || '');
    var m = s.match(/https?:\/\/[^\s<>"']+/i);
    if (!m) return '';
    return m[0].replace(/[),.;:]+$/, '');
  }

  function cleanSourceUrl(url) {
    try {
      var u = new URL(url);
      if (u.searchParams.get('utm_source') === 'chatgpt.com') u.searchParams.delete('utm_source');
      return u.href;
    } catch (e) {
      return url;
    }
  }

  function urlFromFaviconSrc(src) {
    if (!src) return '';
    try {
      var u = new URL(src, location.href);
      var raw = u.searchParams.get('url') || u.searchParams.get('domain') || '';
      if (!raw) {
        var m = String(src).match(/[?&](?:url|domain)=([^&]+)/i);
        if (m) raw = decodeURIComponent(m[1].replace(/\+/g, ' '));
      }
      if (!raw) return '';
      if (HTTP_RE.test(raw)) return cleanSourceUrl(raw);
      if (raw.indexOf('.') !== -1 && !/gstatic|google\.com|grok\.com|openai\.com|chatgpt\.com/i.test(raw)) {
        return 'https://' + raw.replace(/^\/\//, '');
      }
    } catch (e) {}
    return '';
  }

  function citationTitle(el) {
    if (!el) return '';
    var t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    t = t.replace(/\s*\+\d+\s*$/, '').trim();
    if (t && t.length < 180) return t;
    var aria = el.getAttribute('aria-label') || '';
    var labeled = aria.split(',')[0].replace(/\s+/g, ' ').trim();
    return labeled;
  }

  function isCitationEl(el) {
    if (!el || el.nodeType !== 1) return false;
    var testid = el.getAttribute('data-testid') || '';
    if (/citation/i.test(testid)) return true;
    var role = el.getAttribute('role') || '';
    if (role === 'link') return true;
    var cls = String(el.className || '');
    var hasFav = false;
    try {
      hasFav = !!el.querySelector(
        'img[src*="favicon"], img[src*="favicons"], img[src*="Favicon"]'
      );
    } catch (e) {}
    if (hasFav && (role === 'button' || /\b(Trigger-|Pill-|Favicon)/.test(cls))) return true;
    return false;
  }

  function resolveHref(el) {
    if (!el || el.nodeType !== 1) return '';
    var named = el.getAttribute('href') || el.getAttribute('data-url') || el.getAttribute('data-href') || '';
    if (named && HTTP_RE.test(named.trim())) return cleanSourceUrl(absUrl(named.trim()));
    var fromAttr = httpFromAttrs(el);
    if (fromAttr) return cleanSourceUrl(absUrl(fromAttr));
    var aria = extractHttpUrl(el.getAttribute('aria-label') || el.getAttribute('title') || '');
    if (aria) return cleanSourceUrl(absUrl(aria));
    var img = null;
    try {
      img = el.querySelector && el.querySelector('img[src*="favicon"], img[src*="favicons"]');
    } catch (e) {}
    if (img) {
      var fav = urlFromFaviconSrc(img.getAttribute('src') || img.src || '');
      if (fav) return fav;
    }
    return '';
  }

  function collectFaviconSources(root) {
    if (!root) return [];
    var raw = [];
    var imgs = root.querySelectorAll('img[src*="favicon"], img[src*="favicons"]');
    for (var i = 0; i < imgs.length; i++) {
      var url = urlFromFaviconSrc(imgs[i].getAttribute('src') || imgs[i].src || '');
      if (!url) continue;
      raw.push({
        title: citationTitle(imgs[i].closest('a, [data-testid*="citation" i], [role="button"], [role="link"]') || imgs[i].parentElement) || url,
        url: url
      });
    }
    var cites = root.querySelectorAll('[data-testid*="citation" i], a[data-testid*="citation" i]');
    for (var c = 0; c < cites.length; c++) {
      var href = resolveHref(cites[c]);
      if (!href) continue;
      raw.push({
        title: citationTitle(cites[c]) || href,
        url: href
      });
    }
    return dedupeSources(raw);
  }

  function isCitationish(el) {
    return isCitationEl(el);
  }

  function httpFromAttrs(el) {
    if (!el || !el.attributes) return '';
    var named = el.getAttribute('href') || el.getAttribute('data-url') || el.getAttribute('data-href') || '';
    if (named && HTTP_RE.test(named.trim())) return named.trim();
    for (var i = 0; i < el.attributes.length; i++) {
      var val = (el.attributes[i].value || '').trim();
      if (HTTP_RE.test(val)) return val;
      var embedded = extractHttpUrl(val);
      if (embedded) return embedded;
    }
    return '';
  }

  function collectLinks(root) {
    if (!root) return [];
    var out = [];
    var seen = Object.create(null);

    function push(el, href) {
      if (isSkippableHref(href) || isNoiseUrl(href)) return;
      var url = absUrl(href);
      if (seen[url]) return;
      seen[url] = true;
      out.push({
        text: ((el && el.textContent) || '').replace(/\s+/g, ' ').trim() || url,
        href: url
      });
    }

    var nodes = root.querySelectorAll(
      'a[href], a[data-testid*="citation" i], [role="link"], [data-url], [data-href], [data-testid*="citation" i]'
    );
    for (var i = 0; i < nodes.length; i++) {
      var href = resolveHref(nodes[i]) || httpFromAttrs(nodes[i]);
      if (href) push(nodes[i], href);
    }

    var extra = root.querySelectorAll(
      '[data-testid*="citation" i], [aria-label*="citation" i], [aria-label*="source" i], [data-testid*="source" i]'
    );
    for (var e = 0; e < extra.length; e++) {
      var h2 = httpFromAttrs(extra[e]);
      if (h2) push(extra[e], h2);
    }

    return out;
  }

  function dedupeSources(items) {
    var out = [];
    var seen = Object.create(null);
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !it.url) continue;
      if (isSkippableHref(it.url) || isNoiseUrl(it.url)) continue;
      var url = absUrl(it.url);
      if (seen[url]) continue;
      seen[url] = true;
      out.push({
        title: (it.title || url).replace(/\s+/g, ' ').trim() || url,
        url: url
      });
    }
    return out;
  }

  function reactExpando(el, prefix) {
    if (!el) return null;
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf(prefix) === 0) return el[keys[i]];
    }
    return null;
  }

  function reactFiber(el) {
    return reactExpando(el, '__reactFiber$') || reactExpando(el, '__reactInternalInstance$');
  }

  function reactProps(el) {
    return reactExpando(el, '__reactProps$');
  }

  function collectSourcesFromValue(val, out, depth, bag) {
    if (val == null || depth > 8) return;
    if (typeof val === 'string') {
      if (HTTP_RE.test(val) && !isNoiseUrl(val) && !bag.seen[val]) {
        bag.seen[val] = true;
        out.push({ title: val, url: val });
      }
      return;
    }
    if (typeof val !== 'object') return;
    if (val instanceof Node) return;
    if (val.$$typeof) return;
    if (typeof val.tag === 'number' && val.stateNode && val.return) return;
    try {
      if (bag.objs.has(val)) return;
      bag.objs.add(val);
    } catch (e) {
      return;
    }

    if (Array.isArray(val)) {
      for (var i = 0; i < val.length; i++) collectSourcesFromValue(val[i], out, depth + 1, bag);
      return;
    }

    var url = '';
    var title = '';
    var keys = Object.keys(val);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var v = val[key];
      if (typeof v === 'string') {
        if (URL_KEYS.test(key) && HTTP_RE.test(v) && !isNoiseUrl(v)) url = v;
        else if (TITLE_KEYS.test(key) && v.length && v.length < 240 && !title) title = v;
      }
    }
    if (url && !bag.seen[url]) {
      bag.seen[url] = true;
      out.push({ title: title || url, url: url });
    }

    for (var k2 = 0; k2 < keys.length; k2++) {
      var key2 = keys[k2];
      var v2 = val[key2];
      if (!v2 || typeof v2 !== 'object') continue;
      if (SOURCE_KEYS.test(key2) || Array.isArray(v2)) {
        collectSourcesFromValue(v2, out, depth + 1, bag);
      } else if (v2.url || v2.href || v2.uri) {
        collectSourcesFromValue(v2, out, depth + 1, bag);
      } else if (objectHasSourceKey(v2)) {
        collectSourcesFromValue(v2, out, depth + 1, bag);
      }
    }
  }

  function objectHasSourceKey(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    try {
      var ks = Object.keys(obj);
      for (var i = 0; i < ks.length; i++) {
        if (SOURCE_KEYS.test(ks[i])) return true;
      }
    } catch (e) {
      return false;
    }
    return false;
  }

  function collectSourcesFromFiber(el) {
    var out = [];
    var bag = { seen: Object.create(null), objs: typeof WeakSet === 'function' ? new WeakSet() : { has: function () { return false; }, add: function () {} } };
    var props = reactProps(el);
    if (props) collectSourcesFromValue(props, out, 0, bag);
    var fiber = reactFiber(el);
    var hops = 0;
    while (fiber && hops < 28) {
      if (fiber.memoizedProps) collectSourcesFromValue(fiber.memoizedProps, out, 0, bag);
      fiber = fiber.return;
      hops += 1;
    }
    return dedupeSources(out);
  }

  function snapshotHttpMap() {
    var map = Object.create(null);
    var nodes = document.querySelectorAll('a[href], [role="link"], [data-url], [data-href]');
    for (var i = 0; i < nodes.length; i++) {
      var href = httpFromAttrs(nodes[i]);
      if (isSkippableHref(href) || isNoiseUrl(href)) continue;
      var url = absUrl(href);
      map[url] = ((nodes[i].textContent || '').replace(/\s+/g, ' ').trim() || url);
    }
    return map;
  }

  function closeOverlays() {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }));
  }

  function waitMs(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function findSourcesTrigger(turn) {
    if (!turn) return null;
    var btn =
      turn.querySelector('button[aria-label="citation.sources-pill-sources"]') ||
      turn.querySelector('button[aria-label*="sources-pill" i]') ||
      turn.querySelector('button[aria-label*="citation.sources" i]');
    if (btn) return btn;
    var fallback = turn.querySelector('button[aria-label*="source" i], button[aria-label*="citation" i]');
    if (fallback && fallback.tagName === 'BUTTON' && !fallback.getAttribute('href')) return fallback;
    return null;
  }

  function scrapeSourcesPill(turn) {
    var trigger = findSourcesTrigger(turn);
    if (!trigger) return Promise.resolve([]);
    var before = snapshotHttpMap();
    try {
      trigger.click();
    } catch (e) {
      return Promise.resolve([]);
    }

    var tries = 0;
    function tick() {
      tries += 1;
      var after = snapshotHttpMap();
      var found = [];
      for (var url in after) {
        if (!Object.prototype.hasOwnProperty.call(after, url)) continue;
        if (before[url]) continue;
        found.push({ title: after[url], url: url });
      }
      if (!found.length) {
        var dialog = document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper]');
        if (dialog) {
          var links = collectLinks(dialog);
          for (var L = 0; L < links.length; L++) {
            found.push({ title: links[L].text, url: links[L].href });
          }
        }
      }
      if (found.length || tries >= 18) {
        closeOverlays();
        if (trigger.getAttribute('aria-expanded') === 'true') {
          try {
            trigger.click();
          } catch (e2) {}
        }
        return waitMs(80).then(function () {
          return dedupeSources(found);
        });
      }
      return waitMs(70).then(tick);
    }
    return waitMs(60).then(tick);
  }

  function escapeMdText(text) {
    return String(text || '').replace(/\u00a0/g, ' ');
  }

  function codeFence(lang, body) {
    var text = String(body == null ? '' : body).replace(/\n+$/, '');
    var ticks = 3;
    var runs = text.match(/`{3,}/g);
    if (runs) {
      for (var i = 0; i < runs.length; i++) {
        if (runs[i].length >= ticks) ticks = runs[i].length + 1;
      }
    }
    var fence = Array(ticks + 1).join('`');
    var info = String(lang || '').replace(/[`\r\n]+/g, ' ').trim();
    return fence + info + '\n' + text + '\n' + fence;
  }

  function mdLabeledFence(label, body) {
    var name = String(label || '').replace(/[`\r\n]+/g, ' ').trim();
    var text = String(body == null ? '' : body).replace(/^\n+/, '').replace(/\n+$/, '');
    var inner = name ? (text ? name + '\n' + text : name) : text;
    return codeFence('md', inner);
  }

  function roleMarker(label) {
    var name = String(label || 'user').replace(/[`\r\n]+/g, ' ').trim();
    if (name.charAt(name.length - 1) !== ':') name += ':';
    return mdLabeledFence(name, '');
  }

  function modelFenceTag(model, fallback) {
    var fb = String(fallback || 'assistant').replace(/[^a-z0-9+._-]+/gi, '') || 'assistant';
    var raw = String(model || '').trim();
    if (!raw) return fb;
    var afterColon = raw.split(/[:：]/);
    if (afterColon.length > 1) raw = afterColon.slice(1).join(':').trim() || raw;
    var lower = raw.toLowerCase().replace(/\s+/g, ' ').trim();
    var named = {
      'быстрый': fb + '-fast',
      'fast': fb + '-fast',
      'эксперт': fb + '-expert',
      'expert': fb + '-expert',
      'авто': fb + '-auto',
      'auto': fb + '-auto',
      'heavy': fb + '-heavy',
      'grok bot': fb,
      'bot': fb
    };
    if (named[lower]) return named[lower];
    var slug = lower
      .replace(/^(модель|model)\s+/i, '')
      .replace(/[^a-z0-9+._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    if (!slug || slug.length > 48) return fb;
    if (slug === fb || slug.indexOf(fb) === 0) return slug;
    return fb + '-' + slug;
  }

  function htmlToMarkdown(root) {
    if (!root) return '';
    if (typeof root === 'string') {
      var wrap = document.createElement('div');
      wrap.innerHTML = root;
      return htmlToMarkdown(wrap).trim();
    }

    function walk(node, ctx) {
      if (!node) return '';
      if (node.nodeType === 3) {
        var t = node.nodeValue || '';
        if (ctx.pre) return t;
        return t.replace(/\s+/g, ' ');
      }
      if (node.nodeType !== 1) return '';

      var el = node;
      var tag = el.tagName.toLowerCase();

      if (tag === 'script' || tag === 'style' || tag === 'noscript' || tag === 'svg') {
        return '';
      }

      if (tag === 'br') return '\n';
      if (tag === 'hr') return '\n\n---\n\n';

      if (tag === 'a' || el.getAttribute('role') === 'link' || isCitationEl(el)) {
        var href = resolveHref(el);
        var label = citationTitle(el) || inlineChildren(el, ctx).trim();
        if (!href || isSkippableHref(href) || isNoiseUrl(href)) return label;
        if (!label) label = href;
        return '[' + label + '](' + href + ')';
      }

      if (tag === 'img') {
        var src = el.getAttribute('src') || el.src || '';
        var alt = (el.getAttribute('alt') || '').trim();
        var fav = urlFromFaviconSrc(src);
        if (fav) {
          if (el.closest('a, [data-testid*="citation" i]')) return '';
          var title = citationTitle(el.parentElement) || alt || fav;
          return '[' + title + '](' + fav + ')';
        }
        if (/images\.openai\.com\/static-rsc|search-image/i.test(src + ' ' + (el.className || ''))) {
          var card = el.parentElement;
          var hops = 0;
          var cardHref = '';
          while (card && hops < 8 && !cardHref) {
            cardHref = resolveHref(card);
            card = card.parentElement;
            hops += 1;
          }
          if (cardHref) return '[' + (alt || cardHref) + '](' + cardHref + ')';
        }
        if (!src) return '';
        return '![' + (alt || 'image') + '](' + absUrl(src) + ')';
      }

      if (tag === 'code' && el.parentElement && el.parentElement.tagName.toLowerCase() !== 'pre') {
        return '`' + el.textContent.replace(/`/g, '\\`') + '`';
      }

      if (tag === 'pre') {
        var codeEl = el.querySelector('code');
        var lang = '';
        if (codeEl && codeEl.className) {
          var m = String(codeEl.className).match(/language-([a-zA-Z0-9_+-]+)/);
          if (m) lang = m[1];
        }
        var codeText = (codeEl || el).textContent || '';
        return '\n\n```' + lang + '\n' + codeText.replace(/\n+$/, '') + '\n```\n\n';
      }

      if (tag === 'strong' || tag === 'b') {
        return '**' + inlineChildren(el, ctx).trim() + '**';
      }
      if (tag === 'em' || tag === 'i') {
        return '*' + inlineChildren(el, ctx).trim() + '*';
      }
      if (tag === 'del' || tag === 's') {
        return '~~' + inlineChildren(el, ctx).trim() + '~~';
      }

      if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5' || tag === 'h6') {
        var level = Number(tag.charAt(1));
        return '\n\n' + Array(level + 1).join('#') + ' ' + blockChildren(el, ctx).trim() + '\n\n';
      }

      if (tag === 'p' || tag === 'div' || tag === 'section' || tag === 'article') {
        var body = blockChildren(el, ctx).trim();
        if (!body) return '';
        return '\n\n' + body + '\n\n';
      }

      if (tag === 'blockquote') {
        var q = blockChildren(el, ctx).trim().split('\n').map(function (line) {
          return '> ' + line;
        }).join('\n');
        return '\n\n' + q + '\n\n';
      }

      if (tag === 'ul' || tag === 'ol') {
        var items = [];
        var lis = el.children;
        var idx = 0;
        for (var i = 0; i < lis.length; i++) {
          if (lis[i].tagName && lis[i].tagName.toLowerCase() === 'li') {
            idx += 1;
            var bullet = tag === 'ol' ? idx + '. ' : '- ';
            var liText = blockChildren(lis[i], ctx).trim().replace(/\n/g, '\n  ');
            items.push(bullet + liText);
          }
        }
        return '\n\n' + items.join('\n') + '\n\n';
      }

      if (tag === 'li') {
        return blockChildren(el, ctx);
      }

      if (tag === 'table') {
        return '\n\n' + tableToMd(el) + '\n\n';
      }

      return blockChildren(el, ctx);
    }

    function inlineChildren(el, ctx) {
      var s = '';
      for (var i = 0; i < el.childNodes.length; i++) {
        s += walk(el.childNodes[i], ctx);
      }
      return s;
    }

    function blockChildren(el, ctx) {
      return inlineChildren(el, ctx);
    }

    function tableToMd(table) {
      var rows = [];
      var trs = table.querySelectorAll('tr');
      for (var r = 0; r < trs.length; r++) {
        var cells = trs[r].querySelectorAll('th,td');
        var cols = [];
        for (var c = 0; c < cells.length; c++) {
          cols.push(blockChildren(cells[c], {}).replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim());
        }
        if (cols.length) rows.push(cols);
      }
      if (!rows.length) return '';
      var width = rows[0].length;
      var lines = [];
      lines.push('| ' + rows[0].join(' | ') + ' |');
      var sep = [];
      for (var i = 0; i < width; i++) sep.push('---');
      lines.push('| ' + sep.join(' | ') + ' |');
      for (var j = 1; j < rows.length; j++) {
        while (rows[j].length < width) rows[j].push('');
        lines.push('| ' + rows[j].join(' | ') + ' |');
      }
      return lines.join('\n');
    }

    return escapeMdText(walk(root, {})).replace(/\n{3,}/g, '\n\n').trim();
  }

  function yamlEscape(str) {
    var s = String(str == null ? '' : str);
    if (s === '') return "''";
    if (/^[\w.@+-]+$/.test(s) && !/^(true|false|null|yes|no|on|off)$/i.test(s) && !/^\d/.test(s)) {
      return s;
    }
    return "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
  }

  function yamlBlock(indent, key, value) {
    var s = String(value == null ? '' : value);
    var pad = Array(indent + 1).join(' ');
    if (!/\n/.test(s)) {
      return pad + key + ': ' + yamlEscape(s);
    }
    var out = [pad + key + ': |'];
    var parts = s.replace(/\n$/, '').split('\n');
    for (var i = 0; i < parts.length; i++) {
      out.push(pad + '  ' + parts[i]);
    }
    return out.join('\n');
  }

  function yamlDump(meta, messages) {
    var lines = [];
    var keys = ['platform', 'url', 'title', 'exported_at', 'chat_id', 'model', 'user_name', 'user_handle', 'user_email'];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (meta[k] == null || meta[k] === '') continue;
      lines.push(k + ': ' + yamlEscape(meta[k]));
    }
    lines.push('messages:');
    if (!messages || !messages.length) {
      lines.push('  []');
      return lines.join('\n') + '\n';
    }
    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      lines.push('  - role: ' + yamlEscape(msg.role));
      lines.push(yamlBlock(4, 'text', msg.text || ''));
      if (msg.links && msg.links.length) {
        lines.push('    links:');
        for (var L = 0; L < msg.links.length; L++) {
          lines.push('      - text: ' + yamlEscape(msg.links[L].text));
          lines.push('        href: ' + yamlEscape(msg.links[L].href));
        }
      }
      if (msg.sources && msg.sources.length) {
        lines.push('    sources:');
        for (var S = 0; S < msg.sources.length; S++) {
          lines.push('      - title: ' + yamlEscape(msg.sources[S].title));
          lines.push('        url: ' + yamlEscape(msg.sources[S].url));
        }
      }
    }
    return lines.join('\n') + '\n';
  }

  function buildMarkdown(meta, messages) {
    var parts = [];
    var sysLines = [];
    var sysOrder = ['platform', 'url', 'title', 'exported', 'chat_id', 'model', 'user_name', 'user_handle', 'user_email'];
    for (var i = 0; i < sysOrder.length; i++) {
      var key = sysOrder[i];
      if (meta[key] == null || meta[key] === '') continue;
      sysLines.push(key + ': ' + meta[key]);
    }
    parts.push(mdLabeledFence('sys', sysLines.join('\n')));
    parts.push('');

    for (var m = 0; m < messages.length; m++) {
      var msg = messages[m];
      var roleTag = msg.roleTag || msg.role || 'user';
      parts.push(roleMarker(roleTag));
      parts.push('');
      parts.push((msg.text || '').trim());
      parts.push('');

      if (msg.sources && msg.sources.length) {
        var srcLines = [];
        for (var s = 0; s < msg.sources.length; s++) {
          var src = msg.sources[s];
          srcLines.push((s + 1) + '. [' + src.title + '](' + src.url + ')');
        }
        parts.push(mdLabeledFence('sources', srcLines.join('\n')));
        parts.push('');
      }
    }

    return parts.join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n+$/, '') + '\n';
  }

  var FORMAT_IDS = ['md', 'yaml', 'json', 'html', 'pdf'];
  var FORMAT_LABEL = { md: 'MD', yaml: 'YAML', json: 'JSON', html: 'HTML', pdf: 'PDF', zip: 'ZIP' };
  // showSaveFilePicker reject MIME with parameters AND some unregistered types
  // (text/markdown, text/yaml). Blob types may keep charset; picker keys must not.
  var PICKER_MIME = {
    md: 'text/plain',
    yaml: 'text/plain',
    json: 'application/json',
    html: 'text/html',
    pdf: 'application/pdf',
    zip: 'application/zip'
  };
  var BLOB_MIME = {
    md: 'text/markdown;charset=utf-8',
    yaml: 'text/yaml;charset=utf-8',
    json: 'application/json;charset=utf-8',
    html: 'text/html;charset=utf-8',
    pdf: 'application/pdf',
    zip: 'application/zip'
  };
  var FORMAT_STORE = 'chat-export-formats';
  var PACK_STORE = 'chat-export-pack';
  var DIR_DB_NAME = 'chat-export-fs';
  var DIR_DB_STORE = 'handles';
  var DIR_DB_KEY = 'folder';
  var CRC32_TABLE = (function () {
    var table = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c >>> 0;
    }
    return table;
  })();

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function mdInline(s) {
    var out = escapeHtml(s);
    out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
    out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1 ($2)</a>');
    return out;
  }

  function mdToHtml(md) {
    var src = String(md || '').replace(/\r\n/g, '\n').trim();
    if (!src) return '';
    var lines = src.split('\n');
    var html = [];
    var i = 0;
    function flushPara(buf) {
      var t = buf.join(' ').trim();
      if (t) html.push('<p>' + mdInline(t) + '</p>');
    }
    while (i < lines.length) {
      var line = lines[i];
      if (/^```/.test(line)) {
        var lang = escapeHtml(line.slice(3).trim());
        var code = [];
        i += 1;
        while (i < lines.length && !/^```/.test(lines[i])) {
          code.push(lines[i]);
          i += 1;
        }
        html.push('<pre><code' + (lang ? ' class="language-' + lang + '"' : '') + '>' + escapeHtml(code.join('\n')) + '</code></pre>');
        i += 1;
        continue;
      }
      if (/^#{1,6}\s/.test(line)) {
        var lvl = line.match(/^#+/)[0].length;
        html.push('<h' + (lvl + 1) + '>' + mdInline(line.replace(/^#{1,6}\s+/, '')) + '</h' + (lvl + 1) + '>');
        i += 1;
        continue;
      }
      if (/^\s*\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?\s*[-:| ]+\|\s*$/.test(lines[i + 1])) {
        var rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) {
          if (/^\s*\|?\s*[-:| ]+\|\s*$/.test(lines[i])) {
            i += 1;
            continue;
          }
          var cells = lines[i].replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|');
          rows.push(cells.map(function (c) { return mdInline(c.trim()); }));
          i += 1;
        }
        if (rows.length) {
          var thead = '<tr>' + rows[0].map(function (c) { return '<th>' + c + '</th>'; }).join('') + '</tr>';
          var tbody = rows.slice(1).map(function (r) {
            return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>';
          }).join('');
          html.push('<table><thead>' + thead + '</thead><tbody>' + tbody + '</tbody></table>');
        }
        continue;
      }
      if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
        var ordered = /^\s*\d+\.\s+/.test(line);
        var items = [];
        while (i < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i]) : /^\s*[-*]\s+/.test(lines[i]))) {
          items.push('<li>' + mdInline(lines[i].replace(/^\s*([-*]|\d+\.)\s+/, '')) + '</li>');
          i += 1;
        }
        html.push((ordered ? '<ol>' : '<ul>') + items.join('') + (ordered ? '</ol>' : '</ul>'));
        continue;
      }
      if (/^---+$/.test(line.trim())) {
        html.push('<hr>');
        i += 1;
        continue;
      }
      if (!line.trim()) {
        i += 1;
        continue;
      }
      var para = [line];
      i += 1;
      while (i < lines.length && lines[i].trim() && !/^```/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])) {
        para.push(lines[i]);
        i += 1;
      }
      flushPara(para);
    }
    return html.join('\n');
  }

  function roleHeading(msg) {
    var tag = msg.roleTag || msg.role || 'user';
    if (tag === 'grok') return 'Grok';
    if (tag === 'chatgpt') return 'ChatGPT';
    if (tag === 'copilot') return 'Copilot';
    if (tag === 'claude') return 'Claude';
    if (tag === 'assistant') return 'Assistant';
    if (tag === 'user') return 'User';
    return tag;
  }

  function compactMeta(meta) {
    var keys = ['platform', 'url', 'title', 'exported_at', 'exported', 'chat_id', 'model', 'user_name', 'user_handle', 'user_email'];
    var out = {};
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (meta[k] == null || meta[k] === '') continue;
      if (k === 'exported') {
        if (!out.exported_at) out.exported_at = meta[k];
        continue;
      }
      out[k] = meta[k];
    }
    return out;
  }

  function buildJson(meta, messages) {
    var info = compactMeta(meta);
    var payload = { schema: 'chat-export/1' };
    var infoKeys = Object.keys(info);
    for (var i = 0; i < infoKeys.length; i++) {
      payload[infoKeys[i]] = info[infoKeys[i]];
    }
    payload.messages = (messages || []).map(function (msg) {
      var m = {
        role: msg.role,
        role_tag: msg.roleTag || msg.role,
        text: msg.text || ''
      };
      if (msg.links && msg.links.length) m.links = msg.links;
      if (msg.sources && msg.sources.length) m.sources = msg.sources;
      return m;
    });
    return JSON.stringify(payload, null, 2) + '\n';
  }

  function buildHtml(meta, messages) {
    var info = compactMeta(meta);
    var dts = Object.keys(info).map(function (k) {
      var val = String(info[k]);
      if (/^https?:\/\//i.test(val)) {
        return '<div><dt>' + escapeHtml(k) + '</dt><dd><a href="' + escapeHtml(val) + '">' + escapeHtml(val) + '</a></dd></div>';
      }
      return '<div><dt>' + escapeHtml(k) + '</dt><dd>' + escapeHtml(val) + '</dd></div>';
    }).join('');
    var body = (messages || []).map(function (msg) {
      var role = roleHeading(msg);
      var inner = mdToHtml(msg.text || '');
      var sources = '';
      if (msg.sources && msg.sources.length) {
        var lis = msg.sources.map(function (src) {
          var title = src.title || src.url;
          return '<li><a href="' + escapeHtml(src.url) + '">' + escapeHtml(title) + ' (' + escapeHtml(src.url) + ')</a></li>';
        }).join('');
        sources = '<h3>Sources</h3><ol>' + lis + '</ol>';
      }
      return '<section data-role="' + escapeHtml(msg.role || '') + '"><h2>' + escapeHtml(role) + '</h2>' + inner + sources + '</section>';
    }).join('\n');
    var title = info.title || 'chat';
    return (
      '<!DOCTYPE html>\n<html lang="">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' +
      escapeHtml(title) +
      '</title>\n<style>\nbody{font:16px/1.5 system-ui,-apple-system,sans-serif;max-width:44rem;margin:2rem auto;padding:0 1.25rem;color:#111}\nheader{margin-bottom:2rem}\ndl{display:grid;grid-template-columns:8rem 1fr;gap:.35rem 1rem}dt{font-weight:600;color:#444}dd{margin:0}\nsection{margin:1.75rem 0;padding-top:1rem;border-top:1px solid #ddd}\nh1{font-size:1.6rem}h2{font-size:1.2rem}h3{font-size:1rem}\npre{overflow:auto;padding:.75rem 1rem;background:#f5f5f5}code{font-family:ui-monospace,monospace;font-size:.9em}\ntable{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.4rem .55rem;text-align:left}\na{overflow-wrap:anywhere}\n@media print{body{margin:0;max-width:none}}\n</style>\n</head>\n<body>\n<article>\n<header>\n<h1>' +
      escapeHtml(title) +
      '</h1>\n<dl>' + dts + '</dl>\n</header>\n' +
      body +
      '\n</article>\n</body>\n</html>\n'
    );
  }

  function wrapPdfLines(font, text, size, maxWidth) {
    var lines = [];
    var paragraphs = String(text == null ? '' : text).replace(/\r/g, '').replace(/\t/g, ' ').split('\n');
    for (var p = 0; p < paragraphs.length; p++) {
      var para = paragraphs[p];
      if (!para) {
        lines.push('');
        continue;
      }
      var words = para.split(/\s+/);
      var current = '';
      for (var w = 0; w < words.length; w++) {
        var word = words[w];
        var next = current ? current + ' ' + word : word;
        if (font.widthOfTextAtSize(next, size) <= maxWidth) {
          current = next;
        } else {
          if (current) lines.push(current);
          if (font.widthOfTextAtSize(word, size) <= maxWidth) {
            current = word;
          } else {
            var chunk = '';
            for (var ci = 0; ci < word.length; ci++) {
              var trial = chunk + word.charAt(ci);
              if (font.widthOfTextAtSize(trial, size) <= maxWidth) chunk = trial;
              else {
                if (chunk) lines.push(chunk);
                chunk = word.charAt(ci);
              }
            }
            current = chunk;
          }
        }
      }
      if (current) lines.push(current);
    }
    return lines;
  }

  var pdfFontCache = null;

  function loadPdfFontBytes() {
    if (pdfFontCache) return Promise.resolve(pdfFontCache);
    if (!global.chrome || !chrome.runtime || !chrome.runtime.getURL) {
      return Promise.reject(new Error('PDF font: no chrome.runtime'));
    }
    return fetch(chrome.runtime.getURL('vendor/NotoSans-Regular.ttf')).then(function (res) {
      if (!res.ok) throw new Error('PDF font HTTP ' + res.status);
      return res.arrayBuffer();
    }).then(function (ab) {
      pdfFontCache = ab;
      return ab;
    });
  }

  function buildPdf(meta, messages) {
    var PDFLib = global.PDFLib;
    if (!PDFLib || !PDFLib.PDFDocument) {
      return Promise.reject(new Error('PDFLib missing'));
    }
    var info = compactMeta(meta);
    return loadPdfFontBytes().then(function (fontBytes) {
      return PDFLib.PDFDocument.create().then(function (doc) {
        if (global.fontkit) doc.registerFontkit(global.fontkit);
        return doc.embedFont(fontBytes, { subset: true }).then(function (font) {
          var margin = 48;
          var size = { title: 18, head: 13, body: 11, meta: 9 };
          var lineGap = 4;
          var page = doc.addPage();
          var width = page.getSize().width;
          var height = page.getSize().height;
          var maxWidth = width - margin * 2;
          var y = height - margin;
          var rgb = PDFLib.rgb;

          function newPage() {
            page = doc.addPage();
            width = page.getSize().width;
            height = page.getSize().height;
            maxWidth = width - margin * 2;
            y = height - margin;
          }

          function ensure(h) {
            if (y - h < margin) newPage();
          }

          function drawLines(arr, fontSize, color) {
            var lh = fontSize + lineGap;
            for (var i = 0; i < arr.length; i++) {
              ensure(lh);
              if (arr[i]) {
                page.drawText(arr[i], {
                  x: margin,
                  y: y - fontSize,
                  size: fontSize,
                  font: font,
                  color: color || rgb(0.08, 0.08, 0.08)
                });
              }
              y -= lh;
            }
          }

          function block(text, fontSize) {
            drawLines(wrapPdfLines(font, text, fontSize, maxWidth), fontSize);
          }

          block(info.title || 'chat', size.title);
          y -= 6;
          var metaKeys = Object.keys(info);
          for (var mi = 0; mi < metaKeys.length; mi++) {
            if (metaKeys[mi] === 'title') continue;
            block(metaKeys[mi] + ': ' + info[metaKeys[mi]], size.meta);
          }
          y -= 8;

          for (var m = 0; m < (messages || []).length; m++) {
            var msg = messages[m];
            y -= 6;
            ensure(size.head + 8);
            page.drawLine({
              start: { x: margin, y: y },
              end: { x: width - margin, y: y },
              thickness: 0.5,
              color: rgb(0.75, 0.75, 0.75)
            });
            y -= 10;
            block(roleHeading(msg), size.head);
            y -= 2;
            block(msg.text || '', size.body);
            if (msg.sources && msg.sources.length) {
              y -= 4;
              block('Sources', size.head);
              for (var s = 0; s < msg.sources.length; s++) {
                var src = msg.sources[s];
                block((s + 1) + '. ' + (src.title || src.url) + ' ' + src.url, size.body);
              }
            }
          }

          if (info.title) doc.setTitle(String(info.title));
          if (info.platform) doc.setSubject('chat-export ' + info.platform);
          doc.setCreator('Chat Export');
          return doc.save();
        });
      });
    });
  }

  function slugTitle(title) {
    var t = String(title || 'chat')
      .replace(/[\/\\?%*:|"<>]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
    if (!t) t = 'chat';
    if (t.length > 80) t = t.slice(0, 80);
    return t;
  }

  function dateStamp(d) {
    var x = d || new Date();
    var y = x.getFullYear();
    var m = String(x.getMonth() + 1).padStart(2, '0');
    var day = String(x.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function fallbackAnchorDownload(filename, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(url);
      a.remove();
    }, 1500);
  }

  function bytesToBase64(bytes) {
    var chunk = 0x8000;
    var parts = [];
    for (var i = 0; i < bytes.length; i += chunk) {
      parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + chunk)));
    }
    return btoa(parts.join(''));
  }

  function downloadBlob(filename, data, mime) {
    var send = function (u8) {
      if (!u8 || !u8.length) {
        fallbackAnchorDownload(filename, data, mime);
        return;
      }
      if (!global.chrome || !chrome.runtime || !chrome.runtime.sendMessage) {
        fallbackAnchorDownload(filename, u8, mime);
        return;
      }
      chrome.runtime.sendMessage(
        {
          type: 'chat-export-download',
          filename: String(filename || 'chat').replace(/\\/g, '/').replace(/^\/+/, ''),
          mime: mime || 'application/octet-stream',
          b64: bytesToBase64(u8)
        },
        function (res) {
          if (chrome.runtime.lastError || !res || !res.ok) {
            fallbackAnchorDownload(filename, u8, mime);
          }
        }
      );
    };
    if (typeof Blob !== 'undefined' && data instanceof Blob) {
      data.arrayBuffer().then(function (ab) {
        send(new Uint8Array(ab));
      });
      return;
    }
    send(toUint8(data));
  }

  function toUint8(data) {
    if (data instanceof Uint8Array) return data;
    if (data instanceof ArrayBuffer) return new Uint8Array(data);
    if (typeof data === 'string') return new TextEncoder().encode(data);
    return new Uint8Array(data || []);
  }

  function crc32Bytes(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
      c = CRC32_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  }

  function concatUint8(chunks) {
    var len = 0;
    for (var i = 0; i < chunks.length; i++) len += chunks[i].length;
    var out = new Uint8Array(len);
    var o = 0;
    for (var j = 0; j < chunks.length; j++) {
      out.set(chunks[j], o);
      o += chunks[j].length;
    }
    return out;
  }

  function dosDateTime(d) {
    var x = d || new Date();
    return {
      time: (x.getHours() << 11) | (x.getMinutes() << 5) | (x.getSeconds() >> 1),
      date: ((x.getFullYear() - 1980) << 9) | ((x.getMonth() + 1) << 5) | x.getDate()
    };
  }

  function zipStore(files) {
    var enc = new TextEncoder();
    var localParts = [];
    var centralParts = [];
    var offset = 0;
    var now = dosDateTime();
    for (var i = 0; i < files.length; i++) {
      var nameBytes = enc.encode(String(files[i].filename || 'file').replace(/\\/g, '/'));
      var data = toUint8(files[i].data);
      var crc = crc32Bytes(data);
      var local = new Uint8Array(30 + nameBytes.length + data.length);
      var dv = new DataView(local.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);
      dv.setUint16(6, 0x0800, true);
      dv.setUint16(8, 0, true);
      dv.setUint16(10, now.time, true);
      dv.setUint16(12, now.date, true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, data.length, true);
      dv.setUint32(22, data.length, true);
      dv.setUint16(26, nameBytes.length, true);
      dv.setUint16(28, 0, true);
      local.set(nameBytes, 30);
      local.set(data, 30 + nameBytes.length);

      var central = new Uint8Array(46 + nameBytes.length);
      var cv = new DataView(central.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, now.time, true);
      cv.setUint16(14, now.date, true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, data.length, true);
      cv.setUint32(24, data.length, true);
      cv.setUint16(28, nameBytes.length, true);
      cv.setUint16(30, 0, true);
      cv.setUint16(32, 0, true);
      cv.setUint16(34, 0, true);
      cv.setUint16(36, 0, true);
      cv.setUint32(38, 0, true);
      cv.setUint32(42, offset, true);
      central.set(nameBytes, 46);

      offset += local.length;
      localParts.push(local);
      centralParts.push(central);
    }
    var centralSize = 0;
    for (var c = 0; c < centralParts.length; c++) centralSize += centralParts[c].length;
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, offset, true);
    ev.setUint16(20, 0, true);
    return concatUint8(localParts.concat(centralParts, [eocd]));
  }

  function pickerAcceptMime(ext) {
    var raw = String(PICKER_MIME[ext] || 'text/plain');
    var semi = raw.indexOf(';');
    var bare = (semi >= 0 ? raw.slice(0, semi) : raw).trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(bare)) {
      return 'text/plain';
    }
    return bare;
  }

  function pickerTypes(ext) {
    var mime = pickerAcceptMime(ext);
    var accept = {};
    accept[mime] = ['.' + ext];
    return [{ description: FORMAT_LABEL[ext] || ext.toUpperCase(), accept: accept }];
  }

  function writeFileHandle(handle, data, mime) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: mime || 'text/plain;charset=utf-8' });
    return handle.createWritable().then(function (writable) {
      return writable.write(blob).then(function () {
        return writable.close();
      });
    });
  }

  function writeToDirectory(dirHandle, filename, data, mime) {
    return dirHandle.getFileHandle(filename, { create: true }).then(function (handle) {
      return writeFileHandle(handle, data, mime);
    });
  }

  function writeToSubdirectory(parentDir, folderName, files) {
    return parentDir.getDirectoryHandle(folderName, { create: true }).then(function (sub) {
      var chain = Promise.resolve();
      files.forEach(function (f) {
        chain = chain.then(function () {
          return writeToDirectory(sub, f.filename, f.data, f.mime);
        });
      });
      return chain;
    });
  }

  function wantsPathPicker(ev) {
    return !!(ev && (ev.shiftKey || ev.ctrlKey || ev.metaKey));
  }

  function loadPack() {
    try {
      var v = localStorage.getItem(PACK_STORE);
      if (v === 'folder' || v === 'zip') return v;
    } catch (e) {}
    return 'zip';
  }

  function savePack(v) {
    try {
      localStorage.setItem(PACK_STORE, v === 'folder' ? 'folder' : 'zip');
    } catch (e) {}
  }

  function openDirDb() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) {
        reject(new Error('no indexedDB'));
        return;
      }
      var req = indexedDB.open(DIR_DB_NAME, 1);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DIR_DB_STORE)) db.createObjectStore(DIR_DB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  function saveDirHandle(handle) {
    if (!handle) return Promise.resolve();
    return openDirDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DIR_DB_STORE, 'readwrite');
        tx.objectStore(DIR_DB_STORE).put(handle, DIR_DB_KEY);
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    }).catch(function () {});
  }

  function loadDirHandle() {
    return openDirDb().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DIR_DB_STORE, 'readonly');
        var req = tx.objectStore(DIR_DB_STORE).get(DIR_DB_KEY);
        req.onsuccess = function () { db.close(); resolve(req.result || null); };
        req.onerror = function () { db.close(); reject(req.error); };
      });
    }).catch(function () { return null; });
  }

  function normalizeFormats(formats) {
    var src = Array.isArray(formats) ? formats : [formats || 'md'];
    var out = [];
    for (var i = 0; i < FORMAT_IDS.length; i++) {
      if (src.indexOf(FORMAT_IDS[i]) >= 0) out.push(FORMAT_IDS[i]);
    }
    return out.length ? out : ['md'];
  }

  function loadFormats() {
    try {
      var raw = localStorage.getItem(FORMAT_STORE);
      var arr = JSON.parse(raw);
      if (Array.isArray(arr)) return normalizeFormats(arr);
    } catch (e) {}
    return ['md'];
  }

  function saveFormats(arr) {
    try {
      localStorage.setItem(FORMAT_STORE, JSON.stringify(normalizeFormats(arr)));
    } catch (e) {}
  }

  function formatPillLabel(selected) {
    var list = normalizeFormats(selected);
    if (list.length === 1) return FORMAT_LABEL[list[0]] || 'MD';
    return (FORMAT_LABEL[list[0]] || 'MD') + '+';
  }

  function showSavePicker(suggestedName, ext) {
    var pickerOpts = { suggestedName: suggestedName, types: pickerTypes(ext) };
    try {
      return window.showSaveFilePicker(pickerOpts);
    } catch (err) {
      if (!err || String(err.message || '').indexOf('Invalid type') < 0) throw err;
      return window.showSaveFilePicker({ suggestedName: suggestedName });
    }
  }

  function openPathPicker(formats, suggestedBase, pack) {
    var list = normalizeFormats(formats);
    var hasSave = typeof window.showSaveFilePicker === 'function';
    var hasDir = typeof window.showDirectoryPicker === 'function';
    if (!hasSave && !hasDir) return Promise.resolve(null);

    var multi = list.length > 1;
    if (multi && pack === 'folder') {
      if (!hasDir) return Promise.resolve(null);
      return window.showDirectoryPicker({ mode: 'readwrite' }).then(function (dir) {
        saveDirHandle(dir);
        return { kind: 'dir', dir: dir };
      });
    }

    var ext = multi ? 'zip' : list[0];
    if (!hasSave) {
      if (!hasDir) return Promise.resolve(null);
      return window.showDirectoryPicker({ mode: 'readwrite' }).then(function (dir) {
        return { kind: 'dir', dir: dir, asZip: multi };
      });
    }
    return showSavePicker(suggestedBase + '.' + ext, ext).then(function (handle) {
      var handles = {};
      handles[ext] = handle;
      return { kind: 'files', handles: handles };
    });
  }

  function buildExportFiles(base, metaMd, metaYaml, messages, formats) {
    var list = normalizeFormats(formats);
    var jobs = list.map(function (ext) {
      if (ext === 'md') {
        return Promise.resolve({
          ext: 'md',
          filename: base + '.md',
          data: buildMarkdown(metaMd, messages),
          mime: BLOB_MIME.md
        });
      }
      if (ext === 'yaml') {
        return Promise.resolve({
          ext: 'yaml',
          filename: base + '.yaml',
          data: yamlDump(metaYaml, messages),
          mime: BLOB_MIME.yaml
        });
      }
      if (ext === 'json') {
        return Promise.resolve({
          ext: 'json',
          filename: base + '.json',
          data: buildJson(metaYaml, messages),
          mime: BLOB_MIME.json
        });
      }
      if (ext === 'html') {
        return Promise.resolve({
          ext: 'html',
          filename: base + '.html',
          data: buildHtml(metaYaml, messages),
          mime: BLOB_MIME.html
        });
      }
      if (ext === 'pdf') {
        return buildPdf(metaYaml, messages).then(function (bytes) {
          return {
            ext: 'pdf',
            filename: base + '.pdf',
            data: bytes,
            mime: BLOB_MIME.pdf
          };
        });
      }
      return Promise.resolve(null);
    });
    return Promise.all(jobs).then(function (files) {
      return files.filter(Boolean);
    });
  }

  function buildExportBundle(opts) {
    var platform = opts.platform;
    var title = opts.title || document.title || 'chat';
    var formats = normalizeFormats(opts.formats);
    var messages = opts.messages || [];
    var url = opts.url || location.href;
    var now = new Date();
    var metaMd = {
      platform: platform,
      url: url,
      title: title,
      exported: now.toISOString(),
      chat_id: opts.chatId || '',
      model: opts.model || '',
      user_name: opts.userName || '',
      user_handle: opts.userHandle || '',
      user_email: opts.userEmail || ''
    };
    var metaYaml = {
      platform: platform,
      url: url,
      title: title,
      exported_at: now.toISOString(),
      chat_id: opts.chatId || '',
      model: opts.model || '',
      user_name: opts.userName || '',
      user_handle: opts.userHandle || '',
      user_email: opts.userEmail || ''
    };
    var base = platform + '-' + slugTitle(title) + '-' + dateStamp(now);
    return buildExportFiles(base, metaMd, metaYaml, messages, formats).then(function (files) {
      return { base: base, files: files };
    });
  }

  function exportConversation(opts) {
    var formats = normalizeFormats(opts.formats);
    var pack = formats.length > 1 ? (opts.pack === 'folder' ? 'folder' : 'zip') : 'file';
    return buildExportBundle(opts).then(function (bundle) {
      var base = bundle.base;
      var files = bundle.files;
      var picked = opts.picked;
      var wantZip = pack === 'zip' || (picked && picked.asZip) || (picked && picked.handles && picked.handles.zip);

      if (picked && picked.kind === 'dir' && picked.dir) {
        if (wantZip && pack !== 'folder') {
          return writeToDirectory(picked.dir, base + '.zip', zipStore(files), BLOB_MIME.zip);
        }
        return writeToSubdirectory(picked.dir, base, files);
      }
      if (picked && picked.kind === 'files' && picked.handles) {
        if (picked.handles.zip) {
          return writeFileHandle(picked.handles.zip, zipStore(files), BLOB_MIME.zip);
        }
        var fileChain = Promise.resolve();
        files.forEach(function (f) {
          var handle = picked.handles[f.ext];
          if (!handle) return;
          fileChain = fileChain.then(function () {
            return writeFileHandle(handle, f.data, f.mime);
          });
        });
        return fileChain;
      }
      if (files.length > 1) {
        downloadBlob(base + '.zip', zipStore(files), BLOB_MIME.zip);
        return;
      }
      files.forEach(function (f, i) {
        setTimeout(function () {
          downloadBlob(f.filename, f.data, f.mime);
        }, i * 250);
      });
    });
  }

  function sleep(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function findOverflowScroller(fromEl) {
    var n = fromEl;
    while (n && n !== document.body) {
      var s = window.getComputedStyle(n);
      var oy = s.overflowY;
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
        n.clientHeight > 100 &&
        n.scrollHeight > n.clientHeight + 8
      ) {
        return n;
      }
      n = n.parentElement;
    }

    var sel = document.querySelectorAll('.thread-scroll-container, [class*="overflow-y-auto"]');
    var best = null;
    var bestH = 0;
    for (var i = 0; i < sel.length; i++) {
      var el = sel[i];
      if (el.clientHeight <= 100) continue;
      var cs = window.getComputedStyle(el);
      var ov = cs.overflowY;
      if (ov !== 'auto' && ov !== 'scroll' && ov !== 'overlay') continue;
      if (el.scrollHeight >= bestH) {
        bestH = el.scrollHeight;
        best = el;
      }
    }
    return best;
  }

  function yInScroller(scroller, el) {
    if (!scroller || !el || !el.getBoundingClientRect) return 0;
    var er = el.getBoundingClientRect();
    var sr = scroller.getBoundingClientRect();
    return er.top - sr.top + scroller.scrollTop;
  }

  function isShowMoreButton(btn, scroller) {
    if (!btn || !btn.tagName || btn.tagName.toLowerCase() !== 'button') return false;
    if (scroller && !scroller.contains(btn)) return false;
    if (btn.closest('form, [data-composer-footer-responsive], [class*="ComposerLayout"], [data-chat-export-bar], [data-chat-export-menu]')) {
      return false;
    }
    var blob = ((btn.getAttribute('aria-label') || '') + ' ' + (btn.textContent || '')).replace(/\s+/g, ' ').trim();
    if (!/показать ещё|show more|see more|read more|show full/i.test(blob)) return false;
    var cs = window.getComputedStyle(btn);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    var op = parseFloat(cs.opacity);
    if (!isNaN(op) && op < 0.2) return false;
    var r = btn.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return false;
    return true;
  }

  function expandShowMore(root) {
    if (!root) return 0;
    var btns = root.querySelectorAll('button');
    var n = 0;
    for (var i = 0; i < btns.length; i++) {
      if (!isShowMoreButton(btns[i], root)) continue;
      try {
        btns[i].click();
        n++;
      } catch (e) {}
    }
    return n;
  }

  function defaultTurnNodes(root) {
    if (!root) return [];
    var list = root.querySelectorAll(
      '[id^="response-"], [data-testid^="conversation-turn-"], [data-message-author-role], [class*="bg-user-message"], [class*="MarkdownRoot"], [data-markdown-text-style]'
    );
    return Array.prototype.slice.call(list);
  }

  function defaultKeyOf(el, i) {
    var id =
      (el.id && String(el.id)) ||
      el.getAttribute('data-message-id') ||
      el.getAttribute('data-testid') ||
      el.getAttribute('data-turn-id') ||
      '';
    if (id) return id;
    var t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 96);
    return t || 'n' + i;
  }

  function looksVirtualized(scroller) {
    if (!scroller) return false;
    return !!scroller.querySelector(
      '[data-virtualized-turn-content], [data-index], [data-item-index], [data-virtuoso-scroller]'
    );
  }

  function hydrateTranscript(opts) {
    opts = opts || {};
    var scroller = opts.scroller || findOverflowScroller(opts.fromEl);
    var empty = { scroller: scroller || null, items: {}, order: [] };
    if (!scroller) return Promise.resolve(empty);

    var maxSteps = opts.maxSteps || 80;
    var delay = opts.delay || 400;
    var downDelay = opts.downDelay || 160;
    var nodesOf = opts.nodes || function () {
      return defaultTurnNodes(scroller);
    };
    var keyOf = opts.keyOf || defaultKeyOf;
    var capture = opts.capture;
    var items = {};
    var savedTop = scroller.scrollTop;

    function ingest() {
      var nodes = nodesOf() || [];
      var added = 0;
      for (var i = 0; i < nodes.length; i++) {
        var el = nodes[i];
        if (!el) continue;
        var k = keyOf(el, i);
        if (!k) continue;
        var y = yInScroller(scroller, el);
        var payload = capture ? capture(el) : { text: (el.innerText || el.textContent || '').trim() };
        var prev = items[k];
        if (!prev) {
          items[k] = { y: y, payload: payload };
          added++;
        } else {
          if (y >= 0 && (prev.y === undefined || y < prev.y)) prev.y = y;
          var nextLen = payload && payload.text ? String(payload.text).length : 0;
          var prevLen = prev.payload && prev.payload.text ? String(prev.payload.text).length : 0;
          var nextSrc = payload && payload.sources ? payload.sources.length : 0;
          var prevSrc = prev.payload && prev.payload.sources ? prev.payload.sources.length : 0;
          if (nextLen > prevLen || nextSrc > prevSrc) prev.payload = payload;
        }
      }
      return added;
    }

    function fireScroll() {
      try {
        scroller.dispatchEvent(new Event('scroll', { bubbles: true }));
      } catch (e) {}
    }

    function itemCount() {
      var n = 0;
      for (var k in items) {
        if (Object.prototype.hasOwnProperty.call(items, k)) n++;
      }
      return n;
    }

    function stepUp(i, stable) {
      if (i >= maxSteps) return Promise.resolve();
      ingest();
      expandShowMore(scroller);
      var hBefore = scroller.scrollHeight;
      var countBefore = itemCount();
      var atTop = scroller.scrollTop <= 2;
      if (!atTop) {
        if (!looksVirtualized(scroller) && scroller.scrollTop > scroller.clientHeight * 2) {
          scroller.scrollTop = 0;
        } else {
          scroller.scrollTop = Math.max(0, scroller.scrollTop - Math.max(48, scroller.clientHeight * 0.9));
        }
        fireScroll();
      } else {
        fireScroll();
      }
      return sleep(delay).then(function () {
        var added = ingest();
        var grew = scroller.scrollHeight > hBefore + 8 || itemCount() > countBefore;
        var stillTop = scroller.scrollTop <= 2;
        if (stillTop && !added && !grew) {
          stable += 1;
          if (stable >= 3) return;
        } else {
          stable = 0;
        }
        return stepUp(i + 1, stable);
      });
    }

    function stepDown(i, stable) {
      if (i >= maxSteps) return Promise.resolve();
      ingest();
      expandShowMore(scroller);
      var hBefore = scroller.scrollHeight;
      var countBefore = itemCount();
      var atBot = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      if (!atBot) {
        scroller.scrollTop = Math.min(
          scroller.scrollHeight,
          scroller.scrollTop + Math.max(48, scroller.clientHeight * 0.9)
        );
        fireScroll();
      }
      return sleep(downDelay).then(function () {
        var added = ingest();
        var grew = scroller.scrollHeight > hBefore + 8 || itemCount() > countBefore;
        var stillBot = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
        if (stillBot && !added && !grew) {
          stable += 1;
          if (stable >= 2) return;
        } else {
          stable = 0;
        }
        return stepDown(i + 1, stable);
      });
    }

    ingest();
    var needDown = looksVirtualized(scroller);

    return stepUp(0, 0)
      .then(function () {
        expandShowMore(scroller);
        ingest();
        needDown =
          looksVirtualized(scroller) ||
          scroller.scrollHeight > scroller.clientHeight + 80 ||
          (nodesOf() || []).length + 1 < itemCount();
        if (!needDown) return;
        return stepDown(0, 0);
      })
      .then(function () {
        expandShowMore(scroller);
        return sleep(220);
      })
      .then(function () {
        ingest();
        try {
          scroller.scrollTop = savedTop;
          fireScroll();
        } catch (e) {}
        var order = [];
        for (var k in items) {
          if (Object.prototype.hasOwnProperty.call(items, k)) order.push(k);
        }
        order.sort(function (a, b) {
          return (items[a].y || 0) - (items[b].y || 0);
        });
        return { scroller: scroller, items: items, order: order };
      });
  }

  function nativeButtonClass(fromEl) {
    if (!fromEl) return '';
    return String(fromEl.className || '').trim();
  }

  function luminanceFromCssColor(css) {
    if (!css || typeof css !== 'string') return null;
    var m = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (!m) {
      m = css.match(/rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)/i);
    }
    if (!m) return null;
    var r = Number(m[1]) / 255;
    var g = Number(m[2]) / 255;
    var b = Number(m[3]) / 255;
    function lin(c) {
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    }
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }

  function prefersDarkScheme() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    } catch (e) {
      return false;
    }
  }

  function detectHostScheme(platform) {
    var html = document.documentElement;
    var body = document.body;
    var cls = String((html && html.className) || '');
    var mode;

    if (platform === 'chatgpt') {
      var dataTheme = (html && html.getAttribute('data-theme')) || '';
      if (dataTheme === 'dark' || /\bdark\b/.test(cls)) return 'dark';
      if (dataTheme === 'light' || /\blight\b/.test(cls)) return 'light';
      try {
        var chatCs = getComputedStyle(html).colorScheme || '';
        if (/\bdark\b/i.test(chatCs)) return 'dark';
        if (/\blight\b/i.test(chatCs)) return 'light';
      } catch (eChat) {
        /* ignore */
      }
      return prefersDarkScheme() ? 'dark' : 'light';
    }

    if (platform === 'grok') {
      if (/\bdark\b/.test(cls)) return 'dark';
      if (/\blight\b/.test(cls)) return 'light';
      try {
        var cs = getComputedStyle(html).colorScheme || '';
        if (/\bdark\b/i.test(cs)) return 'dark';
        if (/\blight\b/i.test(cs)) return 'light';
      } catch (e2) {
        /* ignore */
      }
      return prefersDarkScheme() ? 'dark' : 'light';
    }

    if (platform === 'grok-x') {
      try {
        var bg = (body && (body.style.backgroundColor || getComputedStyle(body).backgroundColor)) || '';
        var lum = luminanceFromCssColor(bg);
        if (lum != null) return lum < 0.45 ? 'dark' : 'light';
      } catch (e3) {
        /* ignore */
      }
      if (html && html.style && /background/i.test(html.getAttribute('style') || '')) {
        var hl = luminanceFromCssColor(getComputedStyle(html).backgroundColor);
        if (hl != null) return hl < 0.45 ? 'dark' : 'light';
      }
      return prefersDarkScheme() ? 'dark' : 'light';
    }

    if (platform === 'copilot') {
      mode = (html && html.getAttribute('data-color-mode')) || '';
      if (mode === 'dark') return 'dark';
      if (mode === 'light') return 'light';
      if (mode === 'auto') {
        return prefersDarkScheme() ? 'dark' : 'light';
      }
      if (/\bdark\b/.test(cls)) return 'dark';
      if (/\blight\b/.test(cls)) return 'light';
      return prefersDarkScheme() ? 'dark' : 'light';
    }

    if (platform === 'claude') {
      mode = (html && html.getAttribute('data-mode')) || '';
      if (mode === 'dark') return 'dark';
      if (mode === 'light') return 'light';
      return prefersDarkScheme() ? 'dark' : 'light';
    }

    return prefersDarkScheme() ? 'dark' : 'light';
  }

  function watchHostScheme(platform, onChange) {
    var last = detectHostScheme(platform);
    if (typeof onChange === 'function') onChange(last);

    function emit() {
      var next = detectHostScheme(platform);
      if (next === last) return;
      last = next;
      if (typeof onChange === 'function') onChange(next);
    }

    var mo = new MutationObserver(emit);
    try {
      mo.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [
          'class',
          'style',
          'data-theme',
          'data-color-mode',
          'data-mode',
          'data-light-theme',
          'data-dark-theme'
        ]
      });
      if (document.body) {
        mo.observe(document.body, {
          attributes: true,
          attributeFilter: ['class', 'style']
        });
      }
    } catch (e4) {
      /* ignore */
    }

    var mq = null;
    function onMq() {
      emit();
    }
    try {
      mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.addEventListener) mq.addEventListener('change', onMq);
      else if (mq.addListener) mq.addListener(onMq);
    } catch (e5) {
      mq = null;
    }

    return function stop() {
      try {
        mo.disconnect();
      } catch (e6) {
        /* ignore */
      }
      if (!mq) return;
      try {
        if (mq.removeEventListener) mq.removeEventListener('change', onMq);
        else if (mq.removeListener) mq.removeListener(onMq);
      } catch (e7) {
        /* ignore */
      }
    };
  }

  function chevronSvg() {
    return (
      '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" ' +
      'stroke-linecap="round" stroke-linejoin="round" class="chat-export-chevron" width="16" height="16" aria-hidden="true">' +
      '<polyline points="4,6 8,10 12,6"></polyline></svg>'
    );
  }

  function downloadSvg() {
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true">' +
      '<path d="M12 4v12"></path>' +
      '<polyline points="7,11 12,16 17,11"></polyline>' +
      '<path d="M5 20h14"></path>' +
      '</svg>'
    );
  }


  function firstChildClass(el, tagName) {
    if (!el) return '';
    var kids = el.children;
    for (var i = 0; i < kids.length; i++) {
      if (!tagName || kids[i].tagName === tagName) {
        return String(kids[i].className || '').trim();
      }
    }
    return '';
  }

  function observe(callback) {
    var scheduled = false;
    function run() {
      scheduled = false;
      callback();
    }
    function kick() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(run);
    }
    var mo = new MutationObserver(kick);
    mo.observe(document.documentElement, { childList: true, subtree: true });
    kick();
    return mo;
  }

  global.ChatExport = {
    EXT_VERSION: EXT_VERSION,
    BAR_ATTR: BAR_ATTR,
    FORMAT_IDS: FORMAT_IDS,
    FORMAT_LABEL: FORMAT_LABEL,
    absUrl: absUrl,
    isSkippableHref: isSkippableHref,
    isNoiseUrl: isNoiseUrl,
    collectLinks: collectLinks,
    collectSourcesFromFiber: collectSourcesFromFiber,
    collectFaviconSources: collectFaviconSources,
    scrapeSourcesPill: scrapeSourcesPill,
    findSourcesTrigger: findSourcesTrigger,
    dedupeSources: dedupeSources,
    htmlToMarkdown: htmlToMarkdown,
    buildMarkdown: buildMarkdown,
    modelFenceTag: modelFenceTag,
    buildJson: buildJson,
    buildHtml: buildHtml,
    buildPdf: buildPdf,
    yamlDump: yamlDump,
    buildExportBundle: buildExportBundle,
    exportConversation: exportConversation,
    downloadBlob: downloadBlob,
    zipStore: zipStore,
    downloadSvg: downloadSvg,
    chevronSvg: chevronSvg,
    nativeButtonClass: nativeButtonClass,
    detectHostScheme: detectHostScheme,
    watchHostScheme: watchHostScheme,
    firstChildClass: firstChildClass,
    loadFormats: loadFormats,
    saveFormats: saveFormats,
    normalizeFormats: normalizeFormats,
    formatPillLabel: formatPillLabel,
    loadPack: loadPack,
    savePack: savePack,
    loadDirHandle: loadDirHandle,
    openPathPicker: openPathPicker,
    wantsPathPicker: wantsPathPicker,
    observe: observe,
    findOverflowScroller: findOverflowScroller,
    hydrateTranscript: hydrateTranscript,
    slugTitle: slugTitle,
    dateStamp: dateStamp,
    injectBar: null,
    definePlatform: null,
    platforms: {},
    dispatchRpc: null,
    RPC_TYPE: 'chat-export-rpc',
    isPlatformEnabled: null,
    onPlatformSettings: null
  };
})(typeof window !== 'undefined' ? window : globalThis);
