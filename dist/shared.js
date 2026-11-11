(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/core.js
  (function(global) {
    "use strict";
    var BAR_ATTR = "data-chat-export-bar";
    var EXT_VERSION = "1.8.3";
    var HTTP_RE = /^https?:\/\//i;
    var URL_KEYS = /^(url|uri|href|link|sourceUrl|canonicalUrl|webUrl|targetUrl)$/i;
    var TITLE_KEYS = /^(title|name|label|text|snippet|domain|publisher|siteName)$/i;
    var SOURCE_KEYS = /^(citations|sources|webResults|searchResults|webSearchResults|citedWebSearchResults|xposts|references|results|items|links|webPages|cards)$/i;
    function isSkippableHref(href) {
      if (!href) return true;
      var h3 = String(href).trim();
      if (!h3) return true;
      if (/^javascript:/i.test(h3)) return true;
      if (/^data:/i.test(h3)) return true;
      if (h3 === "#") return true;
      if (h3.charAt(0) === "#" && h3.length > 1) return true;
      return false;
    }
    function absUrl(href) {
      try {
        return new URL(href, location.href).href;
      } catch (e3) {
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
      var s3 = String(str || "");
      var m3 = s3.match(/https?:\/\/[^\s<>"']+/i);
      if (!m3) return "";
      return m3[0].replace(/[),.;:]+$/, "");
    }
    function cleanSourceUrl(url) {
      try {
        var u3 = new URL(url);
        if (u3.searchParams.get("utm_source") === "chatgpt.com") u3.searchParams.delete("utm_source");
        return u3.href;
      } catch (e3) {
        return url;
      }
    }
    function urlFromFaviconSrc(src) {
      if (!src) return "";
      try {
        var u3 = new URL(src, location.href);
        var raw = u3.searchParams.get("url") || u3.searchParams.get("domain") || "";
        if (!raw) {
          var m3 = String(src).match(/[?&](?:url|domain)=([^&]+)/i);
          if (m3) raw = decodeURIComponent(m3[1].replace(/\+/g, " "));
        }
        if (!raw) return "";
        if (HTTP_RE.test(raw)) return cleanSourceUrl(raw);
        if (raw.indexOf(".") !== -1 && !/gstatic|google\.com|grok\.com|openai\.com|chatgpt\.com/i.test(raw)) {
          return "https://" + raw.replace(/^\/\//, "");
        }
      } catch (e3) {
      }
      return "";
    }
    function citationTitle(el) {
      if (!el) return "";
      var t3 = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
      t3 = t3.replace(/\s*\+\d+\s*$/, "").trim();
      if (t3 && t3.length < 180) return t3;
      var aria = el.getAttribute("aria-label") || "";
      var labeled = aria.split(",")[0].replace(/\s+/g, " ").trim();
      return labeled;
    }
    function isCitationEl(el) {
      if (!el || el.nodeType !== 1) return false;
      var testid = el.getAttribute("data-testid") || "";
      if (/citation/i.test(testid)) return true;
      var role = el.getAttribute("role") || "";
      if (role === "link") return true;
      var cls = String(el.className || "");
      var hasFav = false;
      try {
        hasFav = !!el.querySelector(
          'img[src*="favicon"], img[src*="favicons"], img[src*="Favicon"]'
        );
      } catch (e3) {
      }
      if (hasFav && (role === "button" || /\b(Trigger-|Pill-|Favicon)/.test(cls))) return true;
      return false;
    }
    function resolveHref(el) {
      if (!el || el.nodeType !== 1) return "";
      var named = el.getAttribute("href") || el.getAttribute("data-url") || el.getAttribute("data-href") || "";
      if (named && HTTP_RE.test(named.trim())) return cleanSourceUrl(absUrl(named.trim()));
      var fromAttr = httpFromAttrs(el);
      if (fromAttr) return cleanSourceUrl(absUrl(fromAttr));
      var aria = extractHttpUrl(el.getAttribute("aria-label") || el.getAttribute("title") || "");
      if (aria) return cleanSourceUrl(absUrl(aria));
      var img = null;
      try {
        img = el.querySelector && el.querySelector('img[src*="favicon"], img[src*="favicons"]');
      } catch (e3) {
      }
      if (img) {
        var fav = urlFromFaviconSrc(img.getAttribute("src") || img.src || "");
        if (fav) return fav;
      }
      return "";
    }
    function collectFaviconSources(root) {
      if (!root) return [];
      var raw = [];
      var imgs = root.querySelectorAll('img[src*="favicon"], img[src*="favicons"]');
      for (var i3 = 0; i3 < imgs.length; i3++) {
        var url = urlFromFaviconSrc(imgs[i3].getAttribute("src") || imgs[i3].src || "");
        if (!url) continue;
        raw.push({
          title: citationTitle(imgs[i3].closest('a, [data-testid*="citation" i], [role="button"], [role="link"]') || imgs[i3].parentElement) || url,
          url
        });
      }
      var cites = root.querySelectorAll('[data-testid*="citation" i], a[data-testid*="citation" i]');
      for (var c3 = 0; c3 < cites.length; c3++) {
        var href = resolveHref(cites[c3]);
        if (!href) continue;
        raw.push({
          title: citationTitle(cites[c3]) || href,
          url: href
        });
      }
      return dedupeSources(raw);
    }
    function isCitationish(el) {
      return isCitationEl(el);
    }
    function httpFromAttrs(el) {
      if (!el || !el.attributes) return "";
      var named = el.getAttribute("href") || el.getAttribute("data-url") || el.getAttribute("data-href") || "";
      if (named && HTTP_RE.test(named.trim())) return named.trim();
      for (var i3 = 0; i3 < el.attributes.length; i3++) {
        var val = (el.attributes[i3].value || "").trim();
        if (HTTP_RE.test(val)) return val;
        var embedded = extractHttpUrl(val);
        if (embedded) return embedded;
      }
      return "";
    }
    function collectLinks(root) {
      if (!root) return [];
      var out = [];
      var seen = /* @__PURE__ */ Object.create(null);
      function push(el, href2) {
        if (isSkippableHref(href2) || isNoiseUrl(href2)) return;
        var url = absUrl(href2);
        if (seen[url]) return;
        seen[url] = true;
        out.push({
          text: (el && el.textContent || "").replace(/\s+/g, " ").trim() || url,
          href: url
        });
      }
      var nodes = root.querySelectorAll(
        'a[href], a[data-testid*="citation" i], [role="link"], [data-url], [data-href], [data-testid*="citation" i]'
      );
      for (var i3 = 0; i3 < nodes.length; i3++) {
        var href = resolveHref(nodes[i3]) || httpFromAttrs(nodes[i3]);
        if (href) push(nodes[i3], href);
      }
      var extra = root.querySelectorAll(
        '[data-testid*="citation" i], [aria-label*="citation" i], [aria-label*="source" i], [data-testid*="source" i]'
      );
      for (var e3 = 0; e3 < extra.length; e3++) {
        var h22 = httpFromAttrs(extra[e3]);
        if (h22) push(extra[e3], h22);
      }
      return out;
    }
    function dedupeSources(items) {
      var out = [];
      var seen = /* @__PURE__ */ Object.create(null);
      for (var i3 = 0; i3 < items.length; i3++) {
        var it = items[i3];
        if (!it || !it.url) continue;
        if (isSkippableHref(it.url) || isNoiseUrl(it.url)) continue;
        var url = absUrl(it.url);
        if (seen[url]) continue;
        seen[url] = true;
        out.push({
          title: (it.title || url).replace(/\s+/g, " ").trim() || url,
          url
        });
      }
      return out;
    }
    function reactExpando(el, prefix) {
      if (!el) return null;
      var keys = Object.keys(el);
      for (var i3 = 0; i3 < keys.length; i3++) {
        if (keys[i3].indexOf(prefix) === 0) return el[keys[i3]];
      }
      return null;
    }
    function reactFiber(el) {
      return reactExpando(el, "__reactFiber$") || reactExpando(el, "__reactInternalInstance$");
    }
    function reactProps(el) {
      return reactExpando(el, "__reactProps$");
    }
    function collectSourcesFromValue(val, out, depth, bag) {
      if (val == null || depth > 8) return;
      if (typeof val === "string") {
        if (HTTP_RE.test(val) && !isNoiseUrl(val) && !bag.seen[val]) {
          bag.seen[val] = true;
          out.push({ title: val, url: val });
        }
        return;
      }
      if (typeof val !== "object") return;
      if (val instanceof Node) return;
      if (val.$$typeof) return;
      if (typeof val.tag === "number" && val.stateNode && val.return) return;
      try {
        if (bag.objs.has(val)) return;
        bag.objs.add(val);
      } catch (e3) {
        return;
      }
      if (Array.isArray(val)) {
        for (var i3 = 0; i3 < val.length; i3++) collectSourcesFromValue(val[i3], out, depth + 1, bag);
        return;
      }
      var url = "";
      var title = "";
      var keys = Object.keys(val);
      for (var k3 = 0; k3 < keys.length; k3++) {
        var key = keys[k3];
        var v3 = val[key];
        if (typeof v3 === "string") {
          if (URL_KEYS.test(key) && HTTP_RE.test(v3) && !isNoiseUrl(v3)) url = v3;
          else if (TITLE_KEYS.test(key) && v3.length && v3.length < 240 && !title) title = v3;
        }
      }
      if (url && !bag.seen[url]) {
        bag.seen[url] = true;
        out.push({ title: title || url, url });
      }
      for (var k22 = 0; k22 < keys.length; k22++) {
        var key2 = keys[k22];
        var v22 = val[key2];
        if (!v22 || typeof v22 !== "object") continue;
        if (SOURCE_KEYS.test(key2) || Array.isArray(v22)) {
          collectSourcesFromValue(v22, out, depth + 1, bag);
        } else if (v22.url || v22.href || v22.uri) {
          collectSourcesFromValue(v22, out, depth + 1, bag);
        } else if (objectHasSourceKey(v22)) {
          collectSourcesFromValue(v22, out, depth + 1, bag);
        }
      }
    }
    function objectHasSourceKey(obj) {
      if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false;
      try {
        var ks = Object.keys(obj);
        for (var i3 = 0; i3 < ks.length; i3++) {
          if (SOURCE_KEYS.test(ks[i3])) return true;
        }
      } catch (e3) {
        return false;
      }
      return false;
    }
    function collectSourcesFromFiber(el) {
      var out = [];
      var bag = { seen: /* @__PURE__ */ Object.create(null), objs: typeof WeakSet === "function" ? /* @__PURE__ */ new WeakSet() : { has: function() {
        return false;
      }, add: function() {
      } } };
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
      var map = /* @__PURE__ */ Object.create(null);
      var nodes = document.querySelectorAll('a[href], [role="link"], [data-url], [data-href]');
      for (var i3 = 0; i3 < nodes.length; i3++) {
        var href = httpFromAttrs(nodes[i3]);
        if (isSkippableHref(href) || isNoiseUrl(href)) continue;
        var url = absUrl(href);
        map[url] = (nodes[i3].textContent || "").replace(/\s+/g, " ").trim() || url;
      }
      return map;
    }
    function closeOverlays() {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true }));
    }
    function waitMs(ms) {
      return new Promise(function(resolve) {
        setTimeout(resolve, ms);
      });
    }
    function findSourcesTrigger(turn) {
      if (!turn) return null;
      var btn = turn.querySelector('button[aria-label="citation.sources-pill-sources"]') || turn.querySelector('button[aria-label*="sources-pill" i]') || turn.querySelector('button[aria-label*="citation.sources" i]');
      if (btn) return btn;
      var fallback = turn.querySelector('button[aria-label*="source" i], button[aria-label*="citation" i]');
      if (fallback && fallback.tagName === "BUTTON" && !fallback.getAttribute("href")) return fallback;
      return null;
    }
    function scrapeSourcesPill(turn) {
      var trigger = findSourcesTrigger(turn);
      if (!trigger) return Promise.resolve([]);
      var before = snapshotHttpMap();
      try {
        trigger.click();
      } catch (e3) {
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
          found.push({ title: after[url], url });
        }
        if (!found.length) {
          var dialog = document.querySelector('[role="dialog"], [data-radix-popper-content-wrapper]');
          if (dialog) {
            var links = collectLinks(dialog);
            for (var L2 = 0; L2 < links.length; L2++) {
              found.push({ title: links[L2].text, url: links[L2].href });
            }
          }
        }
        if (found.length || tries >= 18) {
          closeOverlays();
          if (trigger.getAttribute("aria-expanded") === "true") {
            try {
              trigger.click();
            } catch (e22) {
            }
          }
          return waitMs(80).then(function() {
            return dedupeSources(found);
          });
        }
        return waitMs(70).then(tick);
      }
      return waitMs(60).then(tick);
    }
    function escapeMdText(text) {
      return String(text || "").replace(/\u00a0/g, " ");
    }
    function codeFence(lang, body) {
      var text = String(body == null ? "" : body).replace(/\n+$/, "");
      var ticks = 3;
      var runs = text.match(/`{3,}/g);
      if (runs) {
        for (var i3 = 0; i3 < runs.length; i3++) {
          if (runs[i3].length >= ticks) ticks = runs[i3].length + 1;
        }
      }
      var fence = Array(ticks + 1).join("`");
      var info = String(lang || "").replace(/[`\r\n]+/g, " ").trim();
      return fence + info + "\n" + text + "\n" + fence;
    }
    function mdLabeledFence(label, body) {
      var name = String(label || "").replace(/[`\r\n]+/g, " ").trim();
      var text = String(body == null ? "" : body).replace(/^\n+/, "").replace(/\n+$/, "");
      var inner = name ? text ? name + "\n" + text : name : text;
      return codeFence("md", inner);
    }
    function roleMarker(label) {
      var name = String(label || "user").replace(/[`\r\n]+/g, " ").trim();
      if (name.charAt(name.length - 1) !== ":") name += ":";
      return mdLabeledFence(name, "");
    }
    function modelFenceTag(model, fallback) {
      var fb = String(fallback || "assistant").replace(/[^a-z0-9+._-]+/gi, "") || "assistant";
      var raw = String(model || "").trim();
      if (!raw) return fb;
      var afterColon = raw.split(/[:：]/);
      if (afterColon.length > 1) raw = afterColon.slice(1).join(":").trim() || raw;
      var lower = raw.toLowerCase().replace(/\s+/g, " ").trim();
      var named = {
        "\u0431\u044B\u0441\u0442\u0440\u044B\u0439": fb + "-fast",
        "fast": fb + "-fast",
        "\u044D\u043A\u0441\u043F\u0435\u0440\u0442": fb + "-expert",
        "expert": fb + "-expert",
        "\u0430\u0432\u0442\u043E": fb + "-auto",
        "auto": fb + "-auto",
        "heavy": fb + "-heavy",
        "grok bot": fb,
        "bot": fb
      };
      if (named[lower]) return named[lower];
      var slug = lower.replace(/^(модель|model)\s+/i, "").replace(/[^a-z0-9+._-]+/g, "-").replace(/^-+|-+$/g, "");
      if (!slug || slug.length > 48) return fb;
      if (slug === fb || slug.indexOf(fb) === 0) return slug;
      return fb + "-" + slug;
    }
    function htmlToMarkdown(root) {
      if (!root) return "";
      if (typeof root === "string") {
        var doc = new DOMParser().parseFromString(root, "text/html");
        return htmlToMarkdown(doc.body || doc.documentElement).trim();
      }
      function walk(node, ctx) {
        if (!node) return "";
        if (node.nodeType === 3) {
          var t3 = node.nodeValue || "";
          if (ctx.pre) return t3;
          return t3.replace(/\s+/g, " ");
        }
        if (node.nodeType !== 1) return "";
        var el = node;
        var tag = el.tagName.toLowerCase();
        if (tag === "script" || tag === "style" || tag === "noscript" || tag === "svg") {
          return "";
        }
        if (tag === "br") return "\n";
        if (tag === "hr") return "\n\n---\n\n";
        if (tag === "a" || el.getAttribute("role") === "link" || isCitationEl(el)) {
          var href = resolveHref(el);
          var label = citationTitle(el) || inlineChildren(el, ctx).trim();
          if (!href || isSkippableHref(href) || isNoiseUrl(href)) return label;
          if (!label) label = href;
          return "[" + label + "](" + href + ")";
        }
        if (tag === "img") {
          var src = el.getAttribute("src") || el.src || "";
          var alt = (el.getAttribute("alt") || "").trim();
          var fav = urlFromFaviconSrc(src);
          if (fav) {
            if (el.closest('a, [data-testid*="citation" i]')) return "";
            var title = citationTitle(el.parentElement) || alt || fav;
            return "[" + title + "](" + fav + ")";
          }
          if (/images\.openai\.com\/static-rsc|search-image/i.test(src + " " + (el.className || ""))) {
            var card = el.parentElement;
            var hops = 0;
            var cardHref = "";
            while (card && hops < 8 && !cardHref) {
              cardHref = resolveHref(card);
              card = card.parentElement;
              hops += 1;
            }
            if (cardHref) return "[" + (alt || cardHref) + "](" + cardHref + ")";
          }
          if (!src) return "";
          return "![" + (alt || "image") + "](" + absUrl(src) + ")";
        }
        if (tag === "code" && el.parentElement && el.parentElement.tagName.toLowerCase() !== "pre") {
          return "`" + el.textContent.replace(/`/g, "\\`") + "`";
        }
        if (tag === "pre") {
          var codeEl = el.querySelector("code");
          var lang = "";
          if (codeEl && codeEl.className) {
            var m3 = String(codeEl.className).match(/language-([a-zA-Z0-9_+-]+)/);
            if (m3) lang = m3[1];
          }
          var codeText = (codeEl || el).textContent || "";
          return "\n\n```" + lang + "\n" + codeText.replace(/\n+$/, "") + "\n```\n\n";
        }
        if (tag === "strong" || tag === "b") {
          return "**" + inlineChildren(el, ctx).trim() + "**";
        }
        if (tag === "em" || tag === "i") {
          return "*" + inlineChildren(el, ctx).trim() + "*";
        }
        if (tag === "del" || tag === "s") {
          return "~~" + inlineChildren(el, ctx).trim() + "~~";
        }
        if (tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4" || tag === "h5" || tag === "h6") {
          var level = Number(tag.charAt(1));
          return "\n\n" + Array(level + 1).join("#") + " " + blockChildren(el, ctx).trim() + "\n\n";
        }
        if (tag === "p" || tag === "div" || tag === "section" || tag === "article") {
          var body = blockChildren(el, ctx).trim();
          if (!body) return "";
          return "\n\n" + body + "\n\n";
        }
        if (tag === "blockquote") {
          var q3 = blockChildren(el, ctx).trim().split("\n").map(function(line) {
            return "> " + line;
          }).join("\n");
          return "\n\n" + q3 + "\n\n";
        }
        if (tag === "ul" || tag === "ol") {
          var items = [];
          var lis = el.children;
          var idx = 0;
          for (var i3 = 0; i3 < lis.length; i3++) {
            if (lis[i3].tagName && lis[i3].tagName.toLowerCase() === "li") {
              idx += 1;
              var bullet = tag === "ol" ? idx + ". " : "- ";
              var liText = blockChildren(lis[i3], ctx).trim().replace(/\n/g, "\n  ");
              items.push(bullet + liText);
            }
          }
          return "\n\n" + items.join("\n") + "\n\n";
        }
        if (tag === "li") {
          return blockChildren(el, ctx);
        }
        if (tag === "table") {
          return "\n\n" + tableToMd(el) + "\n\n";
        }
        return blockChildren(el, ctx);
      }
      function inlineChildren(el, ctx) {
        var s3 = "";
        for (var i3 = 0; i3 < el.childNodes.length; i3++) {
          s3 += walk(el.childNodes[i3], ctx);
        }
        return s3;
      }
      function blockChildren(el, ctx) {
        return inlineChildren(el, ctx);
      }
      function tableToMd(table) {
        var rows = [];
        var trs = table.querySelectorAll("tr");
        for (var r3 = 0; r3 < trs.length; r3++) {
          var cells = trs[r3].querySelectorAll("th,td");
          var cols = [];
          for (var c3 = 0; c3 < cells.length; c3++) {
            cols.push(blockChildren(cells[c3], {}).replace(/\|/g, "\\|").replace(/\n+/g, " ").trim());
          }
          if (cols.length) rows.push(cols);
        }
        if (!rows.length) return "";
        var width = rows[0].length;
        var lines = [];
        lines.push("| " + rows[0].join(" | ") + " |");
        var sep = [];
        for (var i3 = 0; i3 < width; i3++) sep.push("---");
        lines.push("| " + sep.join(" | ") + " |");
        for (var j3 = 1; j3 < rows.length; j3++) {
          while (rows[j3].length < width) rows[j3].push("");
          lines.push("| " + rows[j3].join(" | ") + " |");
        }
        return lines.join("\n");
      }
      return escapeMdText(walk(root, {})).replace(/\n{3,}/g, "\n\n").trim();
    }
    function yamlEscape(str) {
      var s3 = String(str == null ? "" : str);
      if (s3 === "") return "''";
      if (/^[\w.@+-]+$/.test(s3) && !/^(true|false|null|yes|no|on|off)$/i.test(s3) && !/^\d/.test(s3)) {
        return s3;
      }
      return "'" + s3.replace(/\\/g, "\\\\").replace(/'/g, "''") + "'";
    }
    function yamlBlock(indent, key, value) {
      var s3 = String(value == null ? "" : value);
      var pad = Array(indent + 1).join(" ");
      if (!/\n/.test(s3)) {
        return pad + key + ": " + yamlEscape(s3);
      }
      var out = [pad + key + ": |"];
      var parts = s3.replace(/\n$/, "").split("\n");
      for (var i3 = 0; i3 < parts.length; i3++) {
        out.push(pad + "  " + parts[i3]);
      }
      return out.join("\n");
    }
    function yamlDump(meta, messages) {
      var lines = [];
      var keys = ["platform", "url", "title", "exported_at", "chat_id", "model", "user_name", "user_handle", "user_email"];
      for (var i3 = 0; i3 < keys.length; i3++) {
        var k3 = keys[i3];
        if (meta[k3] == null || meta[k3] === "") continue;
        lines.push(k3 + ": " + yamlEscape(meta[k3]));
      }
      lines.push("messages:");
      if (!messages || !messages.length) {
        lines.push("  []");
        return lines.join("\n") + "\n";
      }
      for (var m3 = 0; m3 < messages.length; m3++) {
        var msg = messages[m3];
        lines.push("  - role: " + yamlEscape(msg.role));
        lines.push(yamlBlock(4, "text", msg.text || ""));
        if (msg.links && msg.links.length) {
          lines.push("    links:");
          for (var L2 = 0; L2 < msg.links.length; L2++) {
            lines.push("      - text: " + yamlEscape(msg.links[L2].text));
            lines.push("        href: " + yamlEscape(msg.links[L2].href));
          }
        }
        if (msg.sources && msg.sources.length) {
          lines.push("    sources:");
          for (var S2 = 0; S2 < msg.sources.length; S2++) {
            lines.push("      - title: " + yamlEscape(msg.sources[S2].title));
            lines.push("        url: " + yamlEscape(msg.sources[S2].url));
          }
        }
      }
      return lines.join("\n") + "\n";
    }
    function buildMarkdown(meta, messages) {
      var parts = [];
      var sysLines = [];
      var sysOrder = ["platform", "url", "title", "exported", "chat_id", "model", "user_name", "user_handle", "user_email"];
      for (var i3 = 0; i3 < sysOrder.length; i3++) {
        var key = sysOrder[i3];
        if (meta[key] == null || meta[key] === "") continue;
        sysLines.push(key + ": " + meta[key]);
      }
      parts.push(mdLabeledFence("sys", sysLines.join("\n")));
      parts.push("");
      for (var m3 = 0; m3 < messages.length; m3++) {
        var msg = messages[m3];
        var roleTag = msg.roleTag || msg.role || "user";
        parts.push(roleMarker(roleTag));
        parts.push("");
        parts.push((msg.text || "").trim());
        parts.push("");
        if (msg.sources && msg.sources.length) {
          var srcLines = [];
          for (var s3 = 0; s3 < msg.sources.length; s3++) {
            var src = msg.sources[s3];
            srcLines.push(s3 + 1 + ". [" + src.title + "](" + src.url + ")");
          }
          parts.push(mdLabeledFence("sources", srcLines.join("\n")));
          parts.push("");
        }
      }
      return parts.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\n+$/, "") + "\n";
    }
    var FORMAT_IDS = ["md", "yaml", "json", "html", "pdf"];
    var FORMAT_LABEL = { md: "MD", yaml: "YAML", json: "JSON", html: "HTML", pdf: "PDF", zip: "ZIP" };
    var PICKER_MIME = {
      md: "text/plain",
      yaml: "text/plain",
      json: "application/json",
      html: "text/html",
      pdf: "application/pdf",
      zip: "application/zip"
    };
    var BLOB_MIME = {
      md: "text/markdown;charset=utf-8",
      yaml: "text/yaml;charset=utf-8",
      json: "application/json;charset=utf-8",
      html: "text/html;charset=utf-8",
      pdf: "application/pdf",
      zip: "application/zip"
    };
    var FORMAT_STORE = "chat-export-formats";
    var PACK_STORE = "chat-export-pack";
    var DIR_DB_NAME = "chat-export-fs";
    var DIR_DB_STORE = "handles";
    var DIR_DB_KEY = "folder";
    var CRC32_TABLE = (function() {
      var table = new Uint32Array(256);
      for (var n2 = 0; n2 < 256; n2++) {
        var c3 = n2;
        for (var k3 = 0; k3 < 8; k3++) {
          c3 = c3 & 1 ? 3988292384 ^ c3 >>> 1 : c3 >>> 1;
        }
        table[n2] = c3 >>> 0;
      }
      return table;
    })();
    function escapeHtml(s3) {
      return String(s3 == null ? "" : s3).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    }
    function mdInline(s3) {
      var out = escapeHtml(s3);
      out = out.replace(/`([^`]+)`/g, "<code>$1</code>");
      out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
      out = out.replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1 ($2)</a>');
      return out;
    }
    function mdToHtml(md) {
      var src = String(md || "").replace(/\r\n/g, "\n").trim();
      if (!src) return "";
      var lines = src.split("\n");
      var html = [];
      var i3 = 0;
      function flushPara(buf) {
        var t3 = buf.join(" ").trim();
        if (t3) html.push("<p>" + mdInline(t3) + "</p>");
      }
      while (i3 < lines.length) {
        var line = lines[i3];
        if (/^```/.test(line)) {
          var lang = escapeHtml(line.slice(3).trim());
          var code = [];
          i3 += 1;
          while (i3 < lines.length && !/^```/.test(lines[i3])) {
            code.push(lines[i3]);
            i3 += 1;
          }
          html.push("<pre><code" + (lang ? ' class="language-' + lang + '"' : "") + ">" + escapeHtml(code.join("\n")) + "</code></pre>");
          i3 += 1;
          continue;
        }
        if (/^#{1,6}\s/.test(line)) {
          var lvl = line.match(/^#+/)[0].length;
          html.push("<h" + (lvl + 1) + ">" + mdInline(line.replace(/^#{1,6}\s+/, "")) + "</h" + (lvl + 1) + ">");
          i3 += 1;
          continue;
        }
        if (/^\s*\|.+\|\s*$/.test(line) && i3 + 1 < lines.length && /^\s*\|?\s*[-:| ]+\|\s*$/.test(lines[i3 + 1])) {
          var rows = [];
          while (i3 < lines.length && /^\s*\|/.test(lines[i3])) {
            if (/^\s*\|?\s*[-:| ]+\|\s*$/.test(lines[i3])) {
              i3 += 1;
              continue;
            }
            var cells = lines[i3].replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|");
            rows.push(cells.map(function(c3) {
              return mdInline(c3.trim());
            }));
            i3 += 1;
          }
          if (rows.length) {
            var thead = "<tr>" + rows[0].map(function(c3) {
              return "<th>" + c3 + "</th>";
            }).join("") + "</tr>";
            var tbody = rows.slice(1).map(function(r3) {
              return "<tr>" + r3.map(function(c3) {
                return "<td>" + c3 + "</td>";
              }).join("") + "</tr>";
            }).join("");
            html.push("<table><thead>" + thead + "</thead><tbody>" + tbody + "</tbody></table>");
          }
          continue;
        }
        if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
          var ordered = /^\s*\d+\.\s+/.test(line);
          var items = [];
          while (i3 < lines.length && (ordered ? /^\s*\d+\.\s+/.test(lines[i3]) : /^\s*[-*]\s+/.test(lines[i3]))) {
            items.push("<li>" + mdInline(lines[i3].replace(/^\s*([-*]|\d+\.)\s+/, "")) + "</li>");
            i3 += 1;
          }
          html.push((ordered ? "<ol>" : "<ul>") + items.join("") + (ordered ? "</ol>" : "</ul>"));
          continue;
        }
        if (/^---+$/.test(line.trim())) {
          html.push("<hr>");
          i3 += 1;
          continue;
        }
        if (!line.trim()) {
          i3 += 1;
          continue;
        }
        var para = [line];
        i3 += 1;
        while (i3 < lines.length && lines[i3].trim() && !/^```/.test(lines[i3]) && !/^#{1,6}\s/.test(lines[i3]) && !/^\s*[-*]\s+/.test(lines[i3]) && !/^\s*\d+\.\s+/.test(lines[i3])) {
          para.push(lines[i3]);
          i3 += 1;
        }
        flushPara(para);
      }
      return html.join("\n");
    }
    function roleHeading(msg) {
      var tag = msg.roleTag || msg.role || "user";
      if (tag === "grok") return "Grok";
      if (tag === "chatgpt") return "ChatGPT";
      if (tag === "copilot") return "Copilot";
      if (tag === "claude") return "Claude";
      if (tag === "assistant") return "Assistant";
      if (tag === "user") return "User";
      return tag;
    }
    function compactMeta(meta) {
      var keys = ["platform", "url", "title", "exported_at", "exported", "chat_id", "model", "user_name", "user_handle", "user_email"];
      var out = {};
      for (var i3 = 0; i3 < keys.length; i3++) {
        var k3 = keys[i3];
        if (meta[k3] == null || meta[k3] === "") continue;
        if (k3 === "exported") {
          if (!out.exported_at) out.exported_at = meta[k3];
          continue;
        }
        out[k3] = meta[k3];
      }
      return out;
    }
    function buildJson(meta, messages) {
      var info = compactMeta(meta);
      var payload = { schema: "chat-export/1" };
      var infoKeys = Object.keys(info);
      for (var i3 = 0; i3 < infoKeys.length; i3++) {
        payload[infoKeys[i3]] = info[infoKeys[i3]];
      }
      payload.messages = (messages || []).map(function(msg) {
        var m3 = {
          role: msg.role,
          role_tag: msg.roleTag || msg.role,
          text: msg.text || ""
        };
        if (msg.links && msg.links.length) m3.links = msg.links;
        if (msg.sources && msg.sources.length) m3.sources = msg.sources;
        return m3;
      });
      return JSON.stringify(payload, null, 2) + "\n";
    }
    function buildHtml(meta, messages) {
      var info = compactMeta(meta);
      var dts = Object.keys(info).map(function(k3) {
        var val = String(info[k3]);
        if (/^https?:\/\//i.test(val)) {
          return "<div><dt>" + escapeHtml(k3) + '</dt><dd><a href="' + escapeHtml(val) + '">' + escapeHtml(val) + "</a></dd></div>";
        }
        return "<div><dt>" + escapeHtml(k3) + "</dt><dd>" + escapeHtml(val) + "</dd></div>";
      }).join("");
      var body = (messages || []).map(function(msg) {
        var role = roleHeading(msg);
        var inner = mdToHtml(msg.text || "");
        var sources = "";
        if (msg.sources && msg.sources.length) {
          var lis = msg.sources.map(function(src) {
            var title2 = src.title || src.url;
            return '<li><a href="' + escapeHtml(src.url) + '">' + escapeHtml(title2) + " (" + escapeHtml(src.url) + ")</a></li>";
          }).join("");
          sources = "<h3>Sources</h3><ol>" + lis + "</ol>";
        }
        return '<section data-role="' + escapeHtml(msg.role || "") + '"><h2>' + escapeHtml(role) + "</h2>" + inner + sources + "</section>";
      }).join("\n");
      var title = info.title || "chat";
      return '<!DOCTYPE html>\n<html lang="">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + escapeHtml(title) + "</title>\n<style>\nbody{font:16px/1.5 system-ui,-apple-system,sans-serif;max-width:44rem;margin:2rem auto;padding:0 1.25rem;color:#111}\nheader{margin-bottom:2rem}\ndl{display:grid;grid-template-columns:8rem 1fr;gap:.35rem 1rem}dt{font-weight:600;color:#444}dd{margin:0}\nsection{margin:1.75rem 0;padding-top:1rem;border-top:1px solid #ddd}\nh1{font-size:1.6rem}h2{font-size:1.2rem}h3{font-size:1rem}\npre{overflow:auto;padding:.75rem 1rem;background:#f5f5f5}code{font-family:ui-monospace,monospace;font-size:.9em}\ntable{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.4rem .55rem;text-align:left}\na{overflow-wrap:anywhere}\n@media print{body{margin:0;max-width:none}}\n</style>\n</head>\n<body>\n<article>\n<header>\n<h1>" + escapeHtml(title) + "</h1>\n<dl>" + dts + "</dl>\n</header>\n" + body + "\n</article>\n</body>\n</html>\n";
    }
    function wrapPdfLines(font, text, size, maxWidth) {
      var lines = [];
      var paragraphs = String(text == null ? "" : text).replace(/\r/g, "").replace(/\t/g, " ").split("\n");
      for (var p3 = 0; p3 < paragraphs.length; p3++) {
        var para = paragraphs[p3];
        if (!para) {
          lines.push("");
          continue;
        }
        var words = para.split(/\s+/);
        var current = "";
        for (var w4 = 0; w4 < words.length; w4++) {
          var word = words[w4];
          var next = current ? current + " " + word : word;
          if (font.widthOfTextAtSize(next, size) <= maxWidth) {
            current = next;
          } else {
            if (current) lines.push(current);
            if (font.widthOfTextAtSize(word, size) <= maxWidth) {
              current = word;
            } else {
              var chunk = "";
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
        return Promise.reject(new Error("PDF font: no chrome.runtime"));
      }
      return fetch(chrome.runtime.getURL("vendor/NotoSans-Regular.ttf")).then(function(res) {
        if (!res.ok) throw new Error("PDF font HTTP " + res.status);
        return res.arrayBuffer();
      }).then(function(ab) {
        pdfFontCache = ab;
        return ab;
      });
    }
    function buildPdf(meta, messages) {
      var PDFLib = global.PDFLib;
      if (!PDFLib || !PDFLib.PDFDocument) {
        return Promise.reject(new Error("PDFLib missing"));
      }
      var info = compactMeta(meta);
      return loadPdfFontBytes().then(function(fontBytes) {
        return PDFLib.PDFDocument.create().then(function(doc) {
          if (global.fontkit) doc.registerFontkit(global.fontkit);
          return doc.embedFont(fontBytes, { subset: true }).then(function(font) {
            var margin = 48;
            var size = { title: 18, head: 13, body: 11, meta: 9 };
            var lineGap = 4;
            var page = doc.addPage();
            var width = page.getSize().width;
            var height = page.getSize().height;
            var maxWidth = width - margin * 2;
            var y3 = height - margin;
            var rgb = PDFLib.rgb;
            function newPage() {
              page = doc.addPage();
              width = page.getSize().width;
              height = page.getSize().height;
              maxWidth = width - margin * 2;
              y3 = height - margin;
            }
            function ensure(h3) {
              if (y3 - h3 < margin) newPage();
            }
            function drawLines(arr, fontSize, color) {
              var lh = fontSize + lineGap;
              for (var i3 = 0; i3 < arr.length; i3++) {
                ensure(lh);
                if (arr[i3]) {
                  page.drawText(arr[i3], {
                    x: margin,
                    y: y3 - fontSize,
                    size: fontSize,
                    font,
                    color: color || rgb(0.08, 0.08, 0.08)
                  });
                }
                y3 -= lh;
              }
            }
            function block(text, fontSize) {
              drawLines(wrapPdfLines(font, text, fontSize, maxWidth), fontSize);
            }
            block(info.title || "chat", size.title);
            y3 -= 6;
            var metaKeys = Object.keys(info);
            for (var mi = 0; mi < metaKeys.length; mi++) {
              if (metaKeys[mi] === "title") continue;
              block(metaKeys[mi] + ": " + info[metaKeys[mi]], size.meta);
            }
            y3 -= 8;
            for (var m3 = 0; m3 < (messages || []).length; m3++) {
              var msg = messages[m3];
              y3 -= 6;
              ensure(size.head + 8);
              page.drawLine({
                start: { x: margin, y: y3 },
                end: { x: width - margin, y: y3 },
                thickness: 0.5,
                color: rgb(0.75, 0.75, 0.75)
              });
              y3 -= 10;
              block(roleHeading(msg), size.head);
              y3 -= 2;
              block(msg.text || "", size.body);
              if (msg.sources && msg.sources.length) {
                y3 -= 4;
                block("Sources", size.head);
                for (var s3 = 0; s3 < msg.sources.length; s3++) {
                  var src = msg.sources[s3];
                  block(s3 + 1 + ". " + (src.title || src.url) + " " + src.url, size.body);
                }
              }
            }
            if (info.title) doc.setTitle(String(info.title));
            if (info.platform) doc.setSubject("chat-export " + info.platform);
            doc.setCreator("Chat Export");
            return doc.save();
          });
        });
      });
    }
    function slugTitle(title) {
      var t3 = String(title || "chat").replace(/[\/\\?%*:|"<>]/g, "").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
      if (!t3) t3 = "chat";
      if (t3.length > 80) t3 = t3.slice(0, 80);
      return t3;
    }
    function dateStamp(d3) {
      var x4 = d3 || /* @__PURE__ */ new Date();
      var y3 = x4.getFullYear();
      var m3 = String(x4.getMonth() + 1).padStart(2, "0");
      var day = String(x4.getDate()).padStart(2, "0");
      return y3 + "-" + m3 + "-" + day;
    }
    function fallbackAnchorDownload(filename, data, mime) {
      var blob = data instanceof Blob ? data : new Blob([data], { type: mime || "text/plain;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a3 = document.createElement("a");
      a3.href = url;
      a3.download = filename;
      a3.style.display = "none";
      document.body.appendChild(a3);
      a3.click();
      setTimeout(function() {
        URL.revokeObjectURL(url);
        a3.remove();
      }, 1500);
    }
    function bytesToBase64(bytes) {
      var chunk = 32768;
      var parts = [];
      for (var i3 = 0; i3 < bytes.length; i3 += chunk) {
        parts.push(String.fromCharCode.apply(null, bytes.subarray(i3, i3 + chunk)));
      }
      return btoa(parts.join(""));
    }
    function downloadBlob(filename, data, mime) {
      var send = function(u8) {
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
            type: "chat-export-download",
            filename: String(filename || "chat").replace(/\\/g, "/").replace(/^\/+/, ""),
            mime: mime || "application/octet-stream",
            b64: bytesToBase64(u8)
          },
          function(res) {
            if (chrome.runtime.lastError || !res || !res.ok) {
              fallbackAnchorDownload(filename, u8, mime);
            }
          }
        );
      };
      if (typeof Blob !== "undefined" && data instanceof Blob) {
        data.arrayBuffer().then(function(ab) {
          send(new Uint8Array(ab));
        });
        return;
      }
      send(toUint8(data));
    }
    function toUint8(data) {
      if (data instanceof Uint8Array) return data;
      if (data instanceof ArrayBuffer) return new Uint8Array(data);
      if (typeof data === "string") return new TextEncoder().encode(data);
      return new Uint8Array(data || []);
    }
    function crc32Bytes(bytes) {
      var c3 = 4294967295;
      for (var i3 = 0; i3 < bytes.length; i3++) {
        c3 = CRC32_TABLE[(c3 ^ bytes[i3]) & 255] ^ c3 >>> 8;
      }
      return (c3 ^ 4294967295) >>> 0;
    }
    function concatUint8(chunks) {
      var len = 0;
      for (var i3 = 0; i3 < chunks.length; i3++) len += chunks[i3].length;
      var out = new Uint8Array(len);
      var o3 = 0;
      for (var j3 = 0; j3 < chunks.length; j3++) {
        out.set(chunks[j3], o3);
        o3 += chunks[j3].length;
      }
      return out;
    }
    function dosDateTime(d3) {
      var x4 = d3 || /* @__PURE__ */ new Date();
      return {
        time: x4.getHours() << 11 | x4.getMinutes() << 5 | x4.getSeconds() >> 1,
        date: x4.getFullYear() - 1980 << 9 | x4.getMonth() + 1 << 5 | x4.getDate()
      };
    }
    function zipStore(files) {
      var enc = new TextEncoder();
      var localParts = [];
      var centralParts = [];
      var offset = 0;
      var now = dosDateTime();
      for (var i3 = 0; i3 < files.length; i3++) {
        var nameBytes = enc.encode(String(files[i3].filename || "file").replace(/\\/g, "/"));
        var data = toUint8(files[i3].data);
        var crc = crc32Bytes(data);
        var local = new Uint8Array(30 + nameBytes.length + data.length);
        var dv = new DataView(local.buffer);
        dv.setUint32(0, 67324752, true);
        dv.setUint16(4, 20, true);
        dv.setUint16(6, 2048, true);
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
        cv.setUint32(0, 33639248, true);
        cv.setUint16(4, 20, true);
        cv.setUint16(6, 20, true);
        cv.setUint16(8, 2048, true);
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
      for (var c3 = 0; c3 < centralParts.length; c3++) centralSize += centralParts[c3].length;
      var eocd = new Uint8Array(22);
      var ev = new DataView(eocd.buffer);
      ev.setUint32(0, 101010256, true);
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
      var raw = String(PICKER_MIME[ext] || "text/plain");
      var semi = raw.indexOf(";");
      var bare = (semi >= 0 ? raw.slice(0, semi) : raw).trim().toLowerCase();
      if (!/^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(bare)) {
        return "text/plain";
      }
      return bare;
    }
    function pickerTypes(ext) {
      var mime = pickerAcceptMime(ext);
      var accept = {};
      accept[mime] = ["." + ext];
      return [{ description: FORMAT_LABEL[ext] || ext.toUpperCase(), accept }];
    }
    function writeFileHandle(handle, data, mime) {
      var blob = data instanceof Blob ? data : new Blob([data], { type: mime || "text/plain;charset=utf-8" });
      return handle.createWritable().then(function(writable) {
        return writable.write(blob).then(function() {
          return writable.close();
        });
      });
    }
    function writeToDirectory(dirHandle, filename, data, mime) {
      return dirHandle.getFileHandle(filename, { create: true }).then(function(handle) {
        return writeFileHandle(handle, data, mime);
      });
    }
    function writeToSubdirectory(parentDir, folderName, files) {
      return parentDir.getDirectoryHandle(folderName, { create: true }).then(function(sub) {
        var chain = Promise.resolve();
        files.forEach(function(f3) {
          chain = chain.then(function() {
            return writeToDirectory(sub, f3.filename, f3.data, f3.mime);
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
        var v3 = localStorage.getItem(PACK_STORE);
        if (v3 === "folder" || v3 === "zip") return v3;
      } catch (e3) {
      }
      return "zip";
    }
    function savePack(v3) {
      try {
        localStorage.setItem(PACK_STORE, v3 === "folder" ? "folder" : "zip");
      } catch (e3) {
      }
    }
    function openDirDb() {
      return new Promise(function(resolve, reject) {
        if (!global.indexedDB) {
          reject(new Error("no indexedDB"));
          return;
        }
        var req = indexedDB.open(DIR_DB_NAME, 1);
        req.onupgradeneeded = function() {
          var db = req.result;
          if (!db.objectStoreNames.contains(DIR_DB_STORE)) db.createObjectStore(DIR_DB_STORE);
        };
        req.onsuccess = function() {
          resolve(req.result);
        };
        req.onerror = function() {
          reject(req.error);
        };
      });
    }
    function saveDirHandle(handle) {
      if (!handle) return Promise.resolve();
      return openDirDb().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction(DIR_DB_STORE, "readwrite");
          tx.objectStore(DIR_DB_STORE).put(handle, DIR_DB_KEY);
          tx.oncomplete = function() {
            db.close();
            resolve();
          };
          tx.onerror = function() {
            db.close();
            reject(tx.error);
          };
        });
      }).catch(function() {
      });
    }
    function loadDirHandle() {
      return openDirDb().then(function(db) {
        return new Promise(function(resolve, reject) {
          var tx = db.transaction(DIR_DB_STORE, "readonly");
          var req = tx.objectStore(DIR_DB_STORE).get(DIR_DB_KEY);
          req.onsuccess = function() {
            db.close();
            resolve(req.result || null);
          };
          req.onerror = function() {
            db.close();
            reject(req.error);
          };
        });
      }).catch(function() {
        return null;
      });
    }
    function normalizeFormats(formats) {
      var src = Array.isArray(formats) ? formats : [formats || "md"];
      var out = [];
      for (var i3 = 0; i3 < FORMAT_IDS.length; i3++) {
        if (src.indexOf(FORMAT_IDS[i3]) >= 0) out.push(FORMAT_IDS[i3]);
      }
      return out.length ? out : ["md"];
    }
    function loadFormats() {
      try {
        var raw = localStorage.getItem(FORMAT_STORE);
        var arr = JSON.parse(raw);
        if (Array.isArray(arr)) return normalizeFormats(arr);
      } catch (e3) {
      }
      return ["md"];
    }
    function saveFormats(arr) {
      try {
        localStorage.setItem(FORMAT_STORE, JSON.stringify(normalizeFormats(arr)));
      } catch (e3) {
      }
    }
    function formatPillLabel(selected) {
      var list = normalizeFormats(selected);
      if (list.length === 1) return FORMAT_LABEL[list[0]] || "MD";
      return (FORMAT_LABEL[list[0]] || "MD") + "+";
    }
    function showSavePicker(suggestedName, ext) {
      var pickerOpts = { suggestedName, types: pickerTypes(ext) };
      try {
        return window.showSaveFilePicker(pickerOpts);
      } catch (err) {
        if (!err || String(err.message || "").indexOf("Invalid type") < 0) throw err;
        return window.showSaveFilePicker({ suggestedName });
      }
    }
    function openPathPicker(formats, suggestedBase, pack) {
      var list = normalizeFormats(formats);
      var hasSave = typeof window.showSaveFilePicker === "function";
      var hasDir = typeof window.showDirectoryPicker === "function";
      if (!hasSave && !hasDir) return Promise.resolve(null);
      var multi = list.length > 1;
      if (multi && pack === "folder") {
        if (!hasDir) return Promise.resolve(null);
        return window.showDirectoryPicker({ mode: "readwrite" }).then(function(dir) {
          saveDirHandle(dir);
          return { kind: "dir", dir };
        });
      }
      var ext = multi ? "zip" : list[0];
      if (!hasSave) {
        if (!hasDir) return Promise.resolve(null);
        return window.showDirectoryPicker({ mode: "readwrite" }).then(function(dir) {
          return { kind: "dir", dir, asZip: multi };
        });
      }
      return showSavePicker(suggestedBase + "." + ext, ext).then(function(handle) {
        var handles = {};
        handles[ext] = handle;
        return { kind: "files", handles };
      });
    }
    function buildExportFiles(base, metaMd, metaYaml, messages, formats) {
      var list = normalizeFormats(formats);
      var jobs = list.map(function(ext) {
        if (ext === "md") {
          return Promise.resolve({
            ext: "md",
            filename: base + ".md",
            data: buildMarkdown(metaMd, messages),
            mime: BLOB_MIME.md
          });
        }
        if (ext === "yaml") {
          return Promise.resolve({
            ext: "yaml",
            filename: base + ".yaml",
            data: yamlDump(metaYaml, messages),
            mime: BLOB_MIME.yaml
          });
        }
        if (ext === "json") {
          return Promise.resolve({
            ext: "json",
            filename: base + ".json",
            data: buildJson(metaYaml, messages),
            mime: BLOB_MIME.json
          });
        }
        if (ext === "html") {
          return Promise.resolve({
            ext: "html",
            filename: base + ".html",
            data: buildHtml(metaYaml, messages),
            mime: BLOB_MIME.html
          });
        }
        if (ext === "pdf") {
          return buildPdf(metaYaml, messages).then(function(bytes) {
            return {
              ext: "pdf",
              filename: base + ".pdf",
              data: bytes,
              mime: BLOB_MIME.pdf
            };
          });
        }
        return Promise.resolve(null);
      });
      return Promise.all(jobs).then(function(files) {
        return files.filter(Boolean);
      });
    }
    function buildExportBundle(opts) {
      var platform = opts.platform;
      var title = opts.title || document.title || "chat";
      var formats = normalizeFormats(opts.formats);
      var messages = opts.messages || [];
      var url = opts.url || location.href;
      var now = /* @__PURE__ */ new Date();
      var metaMd = {
        platform,
        url,
        title,
        exported: now.toISOString(),
        chat_id: opts.chatId || "",
        model: opts.model || "",
        user_name: opts.userName || "",
        user_handle: opts.userHandle || "",
        user_email: opts.userEmail || ""
      };
      var metaYaml = {
        platform,
        url,
        title,
        exported_at: now.toISOString(),
        chat_id: opts.chatId || "",
        model: opts.model || "",
        user_name: opts.userName || "",
        user_handle: opts.userHandle || "",
        user_email: opts.userEmail || ""
      };
      var base = platform + "-" + slugTitle(title) + "-" + dateStamp(now);
      return buildExportFiles(base, metaMd, metaYaml, messages, formats).then(function(files) {
        return { base, files };
      });
    }
    function exportConversation(opts) {
      var formats = normalizeFormats(opts.formats);
      var pack = formats.length > 1 ? opts.pack === "folder" ? "folder" : "zip" : "file";
      return buildExportBundle(opts).then(function(bundle) {
        var base = bundle.base;
        var files = bundle.files;
        var picked = opts.picked;
        var wantZip = pack === "zip" || picked && picked.asZip || picked && picked.handles && picked.handles.zip;
        if (picked && picked.kind === "dir" && picked.dir) {
          if (wantZip && pack !== "folder") {
            return writeToDirectory(picked.dir, base + ".zip", zipStore(files), BLOB_MIME.zip);
          }
          return writeToSubdirectory(picked.dir, base, files);
        }
        if (picked && picked.kind === "files" && picked.handles) {
          if (picked.handles.zip) {
            return writeFileHandle(picked.handles.zip, zipStore(files), BLOB_MIME.zip);
          }
          var fileChain = Promise.resolve();
          files.forEach(function(f3) {
            var handle = picked.handles[f3.ext];
            if (!handle) return;
            fileChain = fileChain.then(function() {
              return writeFileHandle(handle, f3.data, f3.mime);
            });
          });
          return fileChain;
        }
        if (files.length > 1) {
          downloadBlob(base + ".zip", zipStore(files), BLOB_MIME.zip);
          return;
        }
        files.forEach(function(f3, i3) {
          setTimeout(function() {
            downloadBlob(f3.filename, f3.data, f3.mime);
          }, i3 * 250);
        });
      });
    }
    function sleep2(ms) {
      return new Promise(function(resolve) {
        setTimeout(resolve, ms);
      });
    }
    function findOverflowScroller(fromEl) {
      var n2 = fromEl;
      while (n2 && n2 !== document.body) {
        var s3 = window.getComputedStyle(n2);
        var oy = s3.overflowY;
        if ((oy === "auto" || oy === "scroll" || oy === "overlay") && n2.clientHeight > 100 && n2.scrollHeight > n2.clientHeight + 8) {
          return n2;
        }
        n2 = n2.parentElement;
      }
      var sel = document.querySelectorAll('.thread-scroll-container, [class*="overflow-y-auto"]');
      var best = null;
      var bestH = 0;
      for (var i3 = 0; i3 < sel.length; i3++) {
        var el = sel[i3];
        if (el.clientHeight <= 100) continue;
        var cs = window.getComputedStyle(el);
        var ov = cs.overflowY;
        if (ov !== "auto" && ov !== "scroll" && ov !== "overlay") continue;
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
      if (!btn || !btn.tagName || btn.tagName.toLowerCase() !== "button") return false;
      if (scroller && !scroller.contains(btn)) return false;
      if (btn.closest('form, [data-composer-footer-responsive], [class*="ComposerLayout"], [data-chat-export-bar], [data-chat-export-menu]')) {
        return false;
      }
      var blob = ((btn.getAttribute("aria-label") || "") + " " + (btn.textContent || "")).replace(/\s+/g, " ").trim();
      if (!/показать ещё|show more|see more|read more|show full/i.test(blob)) return false;
      var cs = window.getComputedStyle(btn);
      if (cs.display === "none" || cs.visibility === "hidden") return false;
      var op = parseFloat(cs.opacity);
      if (!isNaN(op) && op < 0.2) return false;
      var r3 = btn.getBoundingClientRect();
      if (r3.width < 4 || r3.height < 4) return false;
      return true;
    }
    function expandShowMore(root) {
      if (!root) return 0;
      var btns = root.querySelectorAll("button");
      var n2 = 0;
      for (var i3 = 0; i3 < btns.length; i3++) {
        if (!isShowMoreButton(btns[i3], root)) continue;
        try {
          btns[i3].click();
          n2++;
        } catch (e3) {
        }
      }
      return n2;
    }
    function defaultTurnNodes(root) {
      if (!root) return [];
      var list = root.querySelectorAll(
        '[id^="response-"], [data-testid^="conversation-turn-"], [data-message-author-role], [class*="bg-user-message"], [class*="MarkdownRoot"], [data-markdown-text-style]'
      );
      return Array.prototype.slice.call(list);
    }
    function defaultKeyOf(el, i3) {
      var id = el.id && String(el.id) || el.getAttribute("data-message-id") || el.getAttribute("data-testid") || el.getAttribute("data-turn-id") || "";
      if (id) return id;
      var t3 = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 96);
      return t3 || "n" + i3;
    }
    function looksVirtualized(scroller) {
      if (!scroller) return false;
      return !!scroller.querySelector(
        "[data-virtualized-turn-content], [data-index], [data-item-index], [data-virtuoso-scroller]"
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
      var nodesOf = opts.nodes || function() {
        return defaultTurnNodes(scroller);
      };
      var keyOf = opts.keyOf || defaultKeyOf;
      var capture = opts.capture;
      var items = {};
      var savedTop = scroller.scrollTop;
      function ingest() {
        var nodes = nodesOf() || [];
        var added = 0;
        for (var i3 = 0; i3 < nodes.length; i3++) {
          var el = nodes[i3];
          if (!el) continue;
          var k3 = keyOf(el, i3);
          if (!k3) continue;
          var y3 = yInScroller(scroller, el);
          var payload = capture ? capture(el) : { text: (el.innerText || el.textContent || "").trim() };
          var prev = items[k3];
          if (!prev) {
            items[k3] = { y: y3, payload };
            added++;
          } else {
            if (y3 >= 0 && (prev.y === void 0 || y3 < prev.y)) prev.y = y3;
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
          scroller.dispatchEvent(new Event("scroll", { bubbles: true }));
        } catch (e3) {
        }
      }
      function itemCount() {
        var n2 = 0;
        for (var k3 in items) {
          if (Object.prototype.hasOwnProperty.call(items, k3)) n2++;
        }
        return n2;
      }
      function stepUp(i3, stable) {
        if (i3 >= maxSteps) return Promise.resolve();
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
        return sleep2(delay).then(function() {
          var added = ingest();
          var grew = scroller.scrollHeight > hBefore + 8 || itemCount() > countBefore;
          var stillTop = scroller.scrollTop <= 2;
          if (stillTop && !added && !grew) {
            stable += 1;
            if (stable >= 3) return;
          } else {
            stable = 0;
          }
          return stepUp(i3 + 1, stable);
        });
      }
      function stepDown(i3, stable) {
        if (i3 >= maxSteps) return Promise.resolve();
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
        return sleep2(downDelay).then(function() {
          var added = ingest();
          var grew = scroller.scrollHeight > hBefore + 8 || itemCount() > countBefore;
          var stillBot = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
          if (stillBot && !added && !grew) {
            stable += 1;
            if (stable >= 2) return;
          } else {
            stable = 0;
          }
          return stepDown(i3 + 1, stable);
        });
      }
      ingest();
      var needDown = looksVirtualized(scroller);
      return stepUp(0, 0).then(function() {
        expandShowMore(scroller);
        ingest();
        needDown = looksVirtualized(scroller) || scroller.scrollHeight > scroller.clientHeight + 80 || (nodesOf() || []).length + 1 < itemCount();
        if (!needDown) return;
        return stepDown(0, 0);
      }).then(function() {
        expandShowMore(scroller);
        return sleep2(220);
      }).then(function() {
        ingest();
        try {
          scroller.scrollTop = savedTop;
          fireScroll();
        } catch (e3) {
        }
        var order = [];
        for (var k3 in items) {
          if (Object.prototype.hasOwnProperty.call(items, k3)) order.push(k3);
        }
        order.sort(function(a3, b3) {
          return (items[a3].y || 0) - (items[b3].y || 0);
        });
        return { scroller, items, order };
      });
    }
    function nativeButtonClass(fromEl) {
      if (!fromEl) return "";
      return String(fromEl.className || "").trim();
    }
    function luminanceFromCssColor(css) {
      if (!css || typeof css !== "string") return null;
      var m3 = css.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (!m3) {
        m3 = css.match(/rgba?\(\s*(\d+)\s+(\d+)\s+(\d+)/i);
      }
      if (!m3) return null;
      var r3 = Number(m3[1]) / 255;
      var g3 = Number(m3[2]) / 255;
      var b3 = Number(m3[3]) / 255;
      function lin(c3) {
        return c3 <= 0.03928 ? c3 / 12.92 : Math.pow((c3 + 0.055) / 1.055, 2.4);
      }
      return 0.2126 * lin(r3) + 0.7152 * lin(g3) + 0.0722 * lin(b3);
    }
    function prefersDarkScheme() {
      try {
        return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
      } catch (e3) {
        return false;
      }
    }
    function detectHostScheme(platform) {
      var html = document.documentElement;
      var body = document.body;
      var cls = String(html && html.className || "");
      var mode;
      if (platform === "chatgpt") {
        var dataTheme = html && html.getAttribute("data-theme") || "";
        if (dataTheme === "dark" || /\bdark\b/.test(cls)) return "dark";
        if (dataTheme === "light" || /\blight\b/.test(cls)) return "light";
        try {
          var chatCs = getComputedStyle(html).colorScheme || "";
          if (/\bdark\b/i.test(chatCs)) return "dark";
          if (/\blight\b/i.test(chatCs)) return "light";
        } catch (eChat) {
        }
        return prefersDarkScheme() ? "dark" : "light";
      }
      if (platform === "grok") {
        if (/\bdark\b/.test(cls)) return "dark";
        if (/\blight\b/.test(cls)) return "light";
        try {
          var cs = getComputedStyle(html).colorScheme || "";
          if (/\bdark\b/i.test(cs)) return "dark";
          if (/\blight\b/i.test(cs)) return "light";
        } catch (e22) {
        }
        return prefersDarkScheme() ? "dark" : "light";
      }
      if (platform === "grok-x") {
        try {
          var bg = body && (body.style.backgroundColor || getComputedStyle(body).backgroundColor) || "";
          var lum = luminanceFromCssColor(bg);
          if (lum != null) return lum < 0.45 ? "dark" : "light";
        } catch (e3) {
        }
        if (html && html.style && /background/i.test(html.getAttribute("style") || "")) {
          var hl = luminanceFromCssColor(getComputedStyle(html).backgroundColor);
          if (hl != null) return hl < 0.45 ? "dark" : "light";
        }
        return prefersDarkScheme() ? "dark" : "light";
      }
      if (platform === "copilot") {
        mode = html && html.getAttribute("data-color-mode") || "";
        if (mode === "dark") return "dark";
        if (mode === "light") return "light";
        if (mode === "auto") {
          return prefersDarkScheme() ? "dark" : "light";
        }
        if (/\bdark\b/.test(cls)) return "dark";
        if (/\blight\b/.test(cls)) return "light";
        return prefersDarkScheme() ? "dark" : "light";
      }
      if (platform === "claude") {
        mode = html && html.getAttribute("data-mode") || "";
        if (mode === "dark") return "dark";
        if (mode === "light") return "light";
        return prefersDarkScheme() ? "dark" : "light";
      }
      return prefersDarkScheme() ? "dark" : "light";
    }
    function watchHostScheme(platform, onChange) {
      var last = detectHostScheme(platform);
      if (typeof onChange === "function") onChange(last);
      function emit2() {
        var next = detectHostScheme(platform);
        if (next === last) return;
        last = next;
        if (typeof onChange === "function") onChange(next);
      }
      var mo = new MutationObserver(emit2);
      try {
        mo.observe(document.documentElement, {
          attributes: true,
          attributeFilter: [
            "class",
            "style",
            "data-theme",
            "data-color-mode",
            "data-mode",
            "data-light-theme",
            "data-dark-theme"
          ]
        });
        if (document.body) {
          mo.observe(document.body, {
            attributes: true,
            attributeFilter: ["class", "style"]
          });
        }
      } catch (e4) {
      }
      var mq = null;
      function onMq() {
        emit2();
      }
      try {
        mq = window.matchMedia("(prefers-color-scheme: dark)");
        if (mq.addEventListener) mq.addEventListener("change", onMq);
        else if (mq.addListener) mq.addListener(onMq);
      } catch (e5) {
        mq = null;
      }
      return function stop() {
        try {
          mo.disconnect();
        } catch (e6) {
        }
        if (!mq) return;
        try {
          if (mq.removeEventListener) mq.removeEventListener("change", onMq);
          else if (mq.removeListener) mq.removeListener(onMq);
        } catch (e7) {
        }
      };
    }
    function chevronSvg() {
      return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" class="chat-export-chevron" width="16" height="16" aria-hidden="true"><polyline points="4,6 8,10 12,6"></polyline></svg>';
    }
    function downloadSvg() {
      return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20" aria-hidden="true"><path d="M12 4v12"></path><polyline points="7,11 12,16 17,11"></polyline><path d="M5 20h14"></path></svg>';
    }
    function firstChildClass(el, tagName) {
      if (!el) return "";
      var kids = el.children;
      for (var i3 = 0; i3 < kids.length; i3++) {
        if (!tagName || kids[i3].tagName === tagName) {
          return String(kids[i3].className || "").trim();
        }
      }
      return "";
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
      EXT_VERSION,
      BAR_ATTR,
      FORMAT_IDS,
      FORMAT_LABEL,
      absUrl,
      isSkippableHref,
      isNoiseUrl,
      collectLinks,
      collectSourcesFromFiber,
      collectFaviconSources,
      scrapeSourcesPill,
      findSourcesTrigger,
      dedupeSources,
      htmlToMarkdown,
      buildMarkdown,
      modelFenceTag,
      buildJson,
      buildHtml,
      buildPdf,
      yamlDump,
      buildExportBundle,
      exportConversation,
      downloadBlob,
      zipStore,
      downloadSvg,
      chevronSvg,
      nativeButtonClass,
      detectHostScheme,
      watchHostScheme,
      firstChildClass,
      loadFormats,
      saveFormats,
      normalizeFormats,
      formatPillLabel,
      loadPack,
      savePack,
      loadDirHandle,
      openPathPicker,
      wantsPathPicker,
      observe,
      findOverflowScroller,
      hydrateTranscript,
      slugTitle,
      dateStamp,
      injectBar: null,
      definePlatform: null,
      platforms: {},
      dispatchRpc: null,
      RPC_TYPE: "chat-export-rpc",
      isPlatformEnabled: null,
      onPlatformSettings: null
    };
  })(typeof window !== "undefined" ? window : globalThis);

  // node_modules/preact/dist/preact.mjs
  var n;
  var t;
  var r;
  var u;
  var i;
  var f;
  var o;
  var e;
  var l;
  var c;
  var a;
  var s;
  var h = /* @__PURE__ */ Symbol.for("pv");
  var p = {};
  var y = [];
  var v = /^m(i|n|o|s|text|space)$/;
  var w = Array.isArray;
  var d = y.slice;
  var _ = Object.assign;
  function g(n2) {
    n2 && n2.parentNode && n2.remove();
  }
  function k(n2, t3, r3) {
    var u3, i3, f3, o3 = {}, e3 = arguments.length;
    for (f3 in t3) "key" == f3 ? u3 = t3[f3] : "ref" == f3 && "function" != typeof n2 ? i3 = t3[f3] : o3[f3] = t3[f3];
    return e3 > 2 && (o3.children = e3 > 3 ? d.call(arguments, 2) : r3), m(n2, o3, u3, i3, null);
  }
  function m(r3, u3, i3, f3, o3) {
    var e3 = { type: r3, props: u3, key: i3, ref: f3, __k: null, __: null, __b: 0, __e: null, __c: null, constructor: h, __v: o3 || ++t, __i: -1, __u: 0 };
    return !o3 && n.vnode && n.vnode(e3), e3;
  }
  function $(n2) {
    return n2.children;
  }
  function x(n2, t3) {
    this.props = n2, this.context = t3, this.__g = 0;
  }
  function S(n2, t3) {
    if (null == t3) return n2.__ && S(n2.__, n2.__i + 1);
    for (var r3; t3 < n2.__k.length; t3++) if ((r3 = n2.__k[t3]) && r3.__e) return r3.__e;
    return "function" != typeof n2.type || n2.props.__P ? null : S(n2);
  }
  function C(t3) {
    var r3, u3 = t3.__v, i3 = u3.__e, f3 = [], o3 = [], e3 = t3.__P;
    e3 && ((r3 = _({ constructor: h }, u3)).__v = u3.__v + 1, n.vnode && n.vnode(r3), z(e3, r3, u3, t3.__n, e3.namespaceURI, 32 & u3.__u ? [i3] : null, f3, i3 || S(u3), 32 & u3.__u, o3), r3.__v = u3.__v, r3.__.__k[r3.__i] = r3, E(f3, r3, o3), u3.__ = u3.__e = null, r3.__e != i3 && j(r3));
  }
  function j(n2) {
    if ((n2 = n2.__) && n2.__c && !n2.props.__P) return n2.__e = null, n2.__k.some(function(t3) {
      return t3 && (n2.__e = t3.__e);
    }), j(n2);
  }
  function L(t3) {
    (8 & t3.__g || (t3.__g |= 8, u.push(t3), f++)) && i == n.debounceRendering || ((i = n.debounceRendering) || queueMicrotask)(H);
  }
  function H() {
    try {
      for (var n2, t3 = 1; u.length; ) u.length > t3 && u.sort(o), n2 = u.shift(), t3 = u.length, 8 & n2.__g && C(n2);
    } finally {
      (f = u.length) && (i || queueMicrotask)(H);
    }
  }
  function I(n2, t3, r3, u3, i3, f3, o3, e3, l3, c3, a3) {
    var s3, h3, v3, w4, d3, _3, g3 = u3.__k || y, k3 = t3.length;
    for (l3 = q(r3, t3, g3, l3, k3), s3 = 0; s3 < k3; s3++) null != (v3 = r3.__k[s3]) && (h3 = ~v3.__i && g3[v3.__i] || p, v3.__i = s3, _3 = z(n2, v3, h3, i3, f3, o3, e3, l3, c3, a3), w4 = v3.__e, (h3.ref != v3.ref || 8 & h3.__u) && (h3.ref && G(h3.ref, null, v3, h3), v3.ref && a3.push(v3.ref, v3.__c || w4, v3)), d3 = d3 || w4, 4 & v3.__u ? (l3 = A(v3, l3, n2, !h3.__v), h3.__e && (h3.__e = null)) : "function" == typeof v3.type && void 0 !== _3 ? l3 = _3 : w4 && (l3 = w4.nextSibling), v3.__u &= -21);
    return r3.__e = d3, l3;
  }
  function q(n2, t3, r3, u3, i3) {
    var f3, o3, e3, l3, c3, a3, s3, p3, y3, v3 = r3.length, d3 = v3, _3 = 0, g3 = 0, k3 = n2.__k = Array(i3);
    for (f3 = 0; f3 < i3; f3++) null != (o3 = t3[f3]) && "boolean" != typeof o3 && "function" != typeof o3 ? ("object" != typeof o3 || o3.constructor === String ? o3 = k3[f3] = m(null, o3) : w(o3) ? o3 = k3[f3] = m($, { children: o3 }) : o3.constructor === h && o3.__b ? o3 = k3[f3] = m(o3.type, o3.props, o3.key, o3.ref, o3.__v) : k3[f3] = o3, l3 = f3 + _3, o3.__ = n2, o3.__b = n2.__b + 1, e3 = null, ~(c3 = o3.__i = P(o3, r3, l3, d3)) && (d3--, (e3 = r3[c3]) && (e3.__u |= 2)), e3 && e3.__v ? (o3.__u |= 16, c3 == l3 - 1 ? _3-- : c3 == l3 + 1 ? _3++ : c3 != l3 && (c3 > l3 ? _3-- : _3++, g3 = 1)) : (~c3 || (i3 > v3 ? _3-- : i3 < v3 && _3++), "function" != typeof o3.type && (o3.__u |= 4))) : k3[f3] = null;
    if (g3) {
      for (a3 = [], s3 = [], f3 = 0; f3 < i3; f3++) if ((o3 = k3[f3]) && 16 & o3.__u) {
        for (_3 = 0, p3 = a3.length; _3 < p3; ) a3[y3 = _3 + p3 >> 1] < o3.__i ? _3 = y3 + 1 : p3 = y3;
        a3[_3] = o3.__i, s3[f3] = _3 + 1;
      }
      for (_3 = a3.length; f3--; ) s3[f3] && (s3[f3] == _3 ? _3-- : k3[f3].__u |= 4);
    }
    if (d3) for (f3 = 0; f3 < v3; f3++) !(e3 = r3[f3]) || 2 & e3.__u || (e3.__e == u3 && (u3 = S(e3)), J(e3, e3));
    return u3;
  }
  function A(n2, t3, r3, u3) {
    var i3, f3, o3, e3;
    if ("function" == typeof n2.type) {
      if (n2.props.__P) return t3;
      if (i3 = n2.__k) for (f3 = 0; f3 < i3.length; f3++) i3[f3] && (i3[f3].__ = n2, t3 = A(i3[f3], t3, r3, false));
      return t3;
    }
    for (t3 && !t3.parentNode && (t3 = S(n2)) && !t3.parentNode && (t3 = null), o3 = n2.__e, e3 = t3; e3 && 8 == e3.nodeType; ) e3 = e3.nextSibling;
    for (o3 != e3 && (!u3 && r3.moveBefore && o3.parentNode ? r3.moveBefore(o3, t3) : r3.insertBefore(o3, t3 || null)), t3 = o3; (t3 = t3 && t3.nextSibling) && 8 == t3.nodeType && !t3.data.startsWith("$s"); ) ;
    return t3;
  }
  function O(n2, t3) {
    return t3 = t3 || [], null != n2 && "boolean" != typeof n2 && (w(n2) ? n2.some(function(n3) {
      O(n3, t3);
    }) : t3.push(n2)), t3;
  }
  function P(n2, t3, r3, u3) {
    var i3, f3 = n2.key, o3 = n2.type, e3 = t3[r3], l3 = e3 && !(2 & e3.__u);
    if (null === e3 && null == f3 || l3 && f3 == e3.key && o3 == e3.type) return r3;
    if (u3 > (l3 ? 1 : 0)) {
      for (i3 = r3 - 1; i3 >= 0; i3--) if ((e3 = t3[i3]) && !(2 & e3.__u) && f3 == e3.key && o3 == e3.type) return i3;
      for (i3 = r3 + 1; i3 < t3.length; i3++) if ((e3 = t3[i3]) && !(2 & e3.__u) && f3 == e3.key && o3 == e3.type) return i3;
    }
    return -1;
  }
  function T(n2, t3, r3) {
    null == r3 && (r3 = ""), "-" == t3[0] ? n2.setProperty(t3, r3) : n2[t3] = r3;
  }
  function N(n2, t3, r3, u3, i3) {
    var f3, o3;
    if ("style" == t3) if ("string" == typeof r3) n2.style.cssText = r3;
    else {
      if ("string" == typeof u3 && (n2.style.cssText = u3 = ""), u3) for (t3 in u3) r3 && t3 in r3 || T(n2.style, t3);
      if (r3) for (t3 in r3) u3 && r3[t3] == u3[t3] || T(n2.style, t3, r3[t3]);
    }
    else if ("o" == t3[0] && "n" == t3[1]) "function" != typeof r3 && (r3 = null), "function" != typeof u3 && (u3 = null), (n2.__e || (n2.__e = {}))[t3] = r3, r3 && u3 || (o3 = a[t3] || (a[t3] = V(t3)), (n2.__a || (n2.__a = {}))[t3] = c, f3 = t3 != (t3 = t3.replace(l, "$1")), (t3 = t3.slice(2))[0] < "a" && (t3 = t3.toLowerCase()), r3 ? n2.addEventListener(t3, o3, f3) : n2.removeEventListener(t3, o3, f3));
    else {
      if ("http://www.w3.org/2000/svg" == i3) t3 = t3.replace(/xlink(H|:h)/, "h").replace(/sName$/, "s");
      else if ("width" != t3 && "height" != t3 && "href" != t3 && "list" != t3 && "form" != t3 && "tabIndex" != t3 && "download" != t3 && "rowSpan" != t3 && "colSpan" != t3 && "role" != t3 && "popover" != t3 && t3 in n2) try {
        return void (n2[t3] = null == r3 ? "" : r3);
      } catch (n3) {
      }
      if ("function" == typeof r3) return;
      null == r3 || false === r3 && "-" != t3[4] ? n2.removeAttribute(t3) : n2.setAttribute(t3, "popover" == t3 && 1 == r3 ? "" : r3);
    }
  }
  function V(t3) {
    return function(r3) {
      var u3 = this.__e;
      if (u3) {
        if (u3 = u3[t3], null == r3[e]) r3[e] = c++;
        else if (r3[e] < this.__a[t3]) return;
        return u3(n.event ? n.event(r3) : r3);
      }
    };
  }
  function z(t3, r3, u3, i3, f3, o3, e3, l3, c3, a3) {
    var s3, p3, v3, d3, k3, b3, m3, M2, C3, j3, L2, H3, q3, A3, O2, P4, T3, N2, V2 = r3.type;
    if (r3.constructor !== h) return null;
    128 & u3.__u && (c3 = 32 & u3.__u, s3 = u3.__c.__z) && (r3.__u |= c3, p3 = o3 = [], 8 == s3.nodeType ? l3 = B(s3, o3) : o3.push(s3), l3 = o3[0] || l3), (s3 = n.__b) && s3(r3);
    n: if ("function" == typeof V2) {
      v3 = e3.length;
      try {
        if (M2 = r3.props, C3 = (s3 = V2.prototype) && s3.render, j3 = (s3 = V2.contextType) && i3[s3.__c], L2 = s3 ? j3 ? j3.props.value : s3.__ : i3, (d3 = u3.__c) ? (r3.__c = d3, 2 & d3.__g && (d3.__g |= 1)) : (C3 ? r3.__c = d3 = new V2(M2, L2) : (r3.__c = d3 = new x(M2, L2), d3.constructor = V2, d3.render = K), j3 && j3.sub(d3), d3.state || (d3.state = {}), d3.__n = i3, d3.__g |= 8, d3.__h = [], d3.__k = []), C3 && (d3.__s || (d3.__s = d3.state), V2.getDerivedStateFromProps && (d3.__s == d3.state && (d3.__s = _({}, d3.__s)), _(d3.__s, V2.getDerivedStateFromProps(M2, d3.__s)))), k3 = d3.props, b3 = d3.state, d3.__v = r3, u3.__c) {
          if (M2 !== k3 && C3 && !V2.getDerivedStateFromProps && d3.componentWillReceiveProps && d3.componentWillReceiveProps(M2, L2), r3.__v == u3.__v && !(8 & d3.__g) || !(4 & d3.__g) && d3.shouldComponentUpdate && false === d3.shouldComponentUpdate(M2, d3.__s, L2)) {
            r3.__v != u3.__v && (d3.props = M2, d3.state = d3.__s, d3.__g &= -9), r3.__e = u3.__e, r3.__k = u3.__k, r3.__k.some(function(n2) {
              n2 && (n2.__ = r3);
            }), y.push.apply(d3.__h, d3.__k), d3.__k = [], d3.__h.length && e3.push(d3), l3 = S(u3);
            break n;
          }
          d3.componentWillUpdate && d3.componentWillUpdate(M2, d3.__s, L2), C3 && d3.componentDidUpdate && d3.__h.push(function() {
            d3.componentDidUpdate(k3, b3, m3);
          });
        } else C3 && !V2.getDerivedStateFromProps && d3.componentWillMount && d3.componentWillMount(), C3 && d3.componentDidMount && d3.__h.push(d3.componentDidMount);
        d3.context = L2, d3.props = M2, d3.__P = t3, d3.__g &= -5, H3 = n.__r, q3 = C3 ? 25 : 0;
        do {
          d3.__g &= -9, H3 && H3(r3), s3 = d3.render(d3.props, d3.state = d3.__s, d3.context);
        } while (8 & d3.__g && ++q3 < 25);
        C3 && (y.push.apply(d3.__h, d3.__k), d3.__k = []), d3.state = d3.__s, d3.getChildContext && (i3 = _({}, i3, d3.getChildContext())), C3 && u3.__c && d3.getSnapshotBeforeUpdate && (m3 = d3.getSnapshotBeforeUpdate(k3, b3)), A3 = s3 && s3.type === $ && null == s3.key ? s3.props.children : s3, M2.__P && (s3 = l3, f3 = (t3 = M2.__P).namespaceURI, c3 = o3 = null, u3.props && u3.props.__P != t3 && (u3.__k.some(function(n2) {
          n2 && J(n2, n2);
        }), u3.__k = null), l3 = u3.__k ? S(u3, 0) : null), l3 = I(t3, w(A3) ? A3 : [A3], r3, u3, i3, f3, o3, e3, l3, c3, a3), M2.__P && (r3.__e = null, l3 = s3), r3.__u &= -161, p3 && p3.some(g), d3.__h.length && e3.push(d3), 1 & d3.__g && (d3.__g &= -4);
      } catch (t4) {
        if (e3.length = v3, r3.__v = null, c3 || o3) if (t4 && t4.then) {
          if (r3.__u |= 128 | c3, o3) {
            for (~(T3 = o3.indexOf(l3 || void 0)) || (T3 = o3.length); (N2 = o3[T3 - 1]) && 8 == N2.nodeType; ) T3--;
            for (; T3 < o3.length; T3++) if (N2 = o3[T3]) if (o3[T3] = null, O2) {
              if (N2 == P4) break;
            } else {
              if (8 != N2.nodeType) break;
              N2.data.startsWith("$s") && (P4 = B(O2 = N2));
            }
          }
          if (!O2) {
            for (; l3 && 8 == l3.nodeType && l3.nextSibling; ) l3 = l3.nextSibling;
            O2 = l3;
          }
          (s3 = B(O2 = r3.__c.__z || (r3.__c.__z = O2))) ? (r3.__e = O2, l3 = s3) : r3.__e = l3, l3 = l3 && l3.nextSibling;
        } else o3 && o3.some(g);
        else r3.__e = u3.__e;
        r3.__k || (r3.__k = u3.__k || []), t4 && t4.then || D(r3), n.__e(t4, r3, u3);
      }
    } else l3 = r3.__e = F(u3.__e, r3, u3, i3, f3, o3, e3, c3, a3, t3);
    return (s3 = n.diffed) && s3(r3), l3;
  }
  function B(n2, t3) {
    if (n2 && 8 == n2.nodeType && n2.data.startsWith("$s")) for (var r3 = 1; n2 = n2.nextSibling; ) {
      if (8 == n2.nodeType) {
        if (n2.data.startsWith("$s")) r3++;
        else if (n2.data.startsWith("/$s") && !--r3) return n2;
      }
      t3 && t3.push(n2);
    }
  }
  function D(n2) {
    n2 && (n2.__c && (n2.__c.__g |= 4), n2.__k && n2.__k.some(D));
  }
  function E(t3, r3, u3) {
    for (var i3 = 0; i3 < u3.length; ) G(u3[i3++], u3[i3++], u3[i3++]);
    n.__c && n.__c(r3, t3), t3.some(function(r4) {
      try {
        t3 = r4.__h, r4.__h = [], t3.some(function(n2) {
          n2.call(r4);
        });
      } catch (t4) {
        n.__e(t4, r4.__v);
      }
    });
  }
  function F(t3, r3, u3, i3, f3, o3, e3, l3, c3, a3) {
    var s3, h3, y3, _3, k3, b3, m3, M2, $3 = u3.props || p, x4 = r3.props, C3 = r3.type;
    if ("svg" == C3 ? f3 = "http://www.w3.org/2000/svg" : "math" == C3 ? f3 = "http://www.w3.org/1998/Math/MathML" : f3 || (f3 = "http://www.w3.org/1999/xhtml"), o3) {
      for (s3 = 0; s3 < o3.length; s3++) if ((k3 = o3[s3]) && (C3 ? k3.localName == C3 : 3 == k3.nodeType)) {
        t3 = k3, o3[s3] = null;
        break;
      }
    }
    if (!t3) {
      if (M2 = a3.ownerDocument || document, !C3) return M2.createTextNode(x4);
      t3 = M2.createElementNS(f3, C3, x4.is ? x4 : a3), l3 && (n.__m && n.__m(r3, o3), l3 = false), o3 = null;
    }
    if (C3) {
      if (a3 = "template" == C3 && t3.content || t3, o3 = "textarea" == C3 && null != x4.defaultValue ? null : o3 && d.call(a3.childNodes), !l3 && o3) for ($3 = {}, s3 = 0; s3 < t3.attributes.length; s3++) $3[(k3 = t3.attributes[s3]).name] = k3.value;
      for (s3 in $3) k3 = $3[s3], "dangerouslySetInnerHTML" == s3 ? y3 = k3 : "children" == s3 || s3 in x4 || "value" == s3 && "defaultValue" in x4 || "checked" == s3 && "defaultChecked" in x4 || N(t3, s3, null, k3, f3);
      for (s3 in x4) k3 = x4[s3], "children" == s3 ? _3 = k3 : "dangerouslySetInnerHTML" == s3 ? h3 = k3 : "value" == s3 ? b3 = k3 : "checked" == s3 ? m3 = k3 : l3 && "function" != typeof k3 || $3[s3] === k3 || N(t3, s3, k3, $3[s3], f3);
      h3 ? (l3 || y3 && (h3.__html == y3.__html || h3.__html == t3.innerHTML) || (t3.innerHTML = h3.__html), r3.__k = []) : (y3 && (t3.textContent = ""), ("foreignObject" == C3 || "http://www.w3.org/1998/Math/MathML" == f3 && v.test(C3)) && (f3 = "http://www.w3.org/1999/xhtml"), I(a3, w(_3) ? _3 : [_3], r3, u3, i3, f3, o3, e3, o3 ? o3[0] : u3.__k && S(u3, 0), l3, c3), o3 && o3.some(g)), l3 && "textarea" != C3 || (s3 = "value", "progress" == C3 && null == b3 ? t3.removeAttribute(s3) : null == b3 || b3 === t3[s3] && ("progress" != C3 || b3) || N(t3, s3, b3, $3[s3], f3), s3 = "checked", null != m3 && m3 != t3[s3] && N(t3, s3, m3, $3[s3], f3));
    } else $3 === x4 || l3 && t3.data == x4 || (t3.data = x4);
    return t3;
  }
  function G(t3, r3, u3, i3) {
    try {
      "function" == typeof t3 ? r3 ? r3.__x = t3(r3) || 1 : i3 && (i3 = i3.__c || i3.__e) && (r3 = i3.__x) && (i3.__x = null, "function" == typeof r3 ? r3() : t3(null)) : t3.current = r3;
    } catch (t4) {
      n.__e(t4, u3);
    }
  }
  function J(t3, r3, u3) {
    var i3, f3, o3, e3;
    if (n.unmount && n.unmount(t3), !(i3 = t3.ref) || i3.current && i3.current != t3.__e || G(i3, null, r3, t3), i3 = t3.__c) {
      if (i3.componentWillUnmount) try {
        i3.componentWillUnmount();
      } catch (t4) {
        n.__e(t4, r3);
      }
      i3.__P = i3.__n = null;
    }
    if (i3 = t3.__k) for (e3 = 0; e3 < i3.length; e3++) i3[e3] && J(i3[e3], r3, "function" != typeof t3.type || u3 && !t3.props.__P);
    !u3 && (i3 = t3.__c) && (i3 = i3.__z) && (f3 = B(i3, o3 = [])) && (i3 == t3.__e && o3.some(g), g(f3), g(i3)), u3 || g(t3.__e), t3.__e = t3.__c = t3.__ = null;
  }
  function K(n2, t3, r3) {
    return this.constructor(n2, r3);
  }
  function Q(t3, r3) {
    var u3, i3, f3, o3;
    n.__ && n.__(t3, r3), 9 == r3.nodeType && (r3 = r3.documentElement), i3 = (u3 = t3 && 32 & t3.__u) ? null : r3.__k, r3.__k = m($, { children: [t3] }), f3 = [], o3 = [], z(r3, r3.__k, i3 || p, p, r3.namespaceURI, i3 ? null : r3.firstChild ? d.call(r3.childNodes) : null, f3, i3 ? i3.__e : r3.firstChild, u3, o3), E(f3, r3.__k, o3), r3.__k.props.children = null;
  }
  function W(n2) {
    return n2.children;
  }
  function X(n2, t3) {
    return m(W, { __P: t3, children: n2 });
  }
  n = { __e: function(n2, t3, r3, u3) {
    for (var i3, o3, e3; t3 = t3.__; ) if ((i3 = t3.__c) && !(1 & i3.__g)) {
      i3.__g |= 4;
      try {
        if ((e3 = (o3 = i3.constructor) && o3.getDerivedStateFromError) && i3.setState(o3.getDerivedStateFromError(n2)), i3.componentDidCatch && (i3.componentDidCatch(n2, u3 || {}), e3 = 1), e3 && 8 & i3.__g) return void (i3.__g |= 2);
      } catch (t4) {
        n2 = t4;
      }
    }
    throw f = 0, n2;
  } }, t = 0, r = function(n2) {
    return null != n2 && n2.constructor === h;
  }, x.prototype.setState = function(n2, t3) {
    var r3 = this.__s;
    r3 && r3 != this.state || (r3 = this.__s = _({}, this.state)), "function" == typeof n2 && (n2 = n2(_({}, r3), this.props)), n2 && (_(r3, n2), this.__v && (t3 && this.__k.push(t3), L(this)));
  }, x.prototype.forceUpdate = function(n2) {
    this.__v && (this.__g |= 4, n2 && this.__h.push(n2), L(this));
  }, x.prototype.render = $, u = [], f = 0, o = function(n2, t3) {
    return n2.__v.__b - t3.__v.__b;
  }, e = /* @__PURE__ */ Symbol(), l = /(PointerCapture)$|Capture$/i, c = 0, a = {}, s = 0;

  // node_modules/preact/hooks/dist/hooks.mjs
  var t2;
  var r2;
  var u2;
  var i2;
  var o2 = Object.is;
  var f2 = 0;
  var c2 = [];
  var e2 = [];
  var a2 = n;
  var v2 = a2.__b;
  var l2 = a2.__r;
  var m2 = a2.diffed;
  var h2 = a2.__c;
  var s2 = a2.unmount;
  var p2 = a2.__;
  function y2(n2, t3) {
    a2.__h && a2.__h(r2, n2, f2 || t3), f2 = 0;
    var u3 = r2.__H || (r2.__H = { __: [], __h: [] });
    return n2 >= u3.__.length && u3.__.push({}), u3.__[n2];
  }
  function d2(n2) {
    return f2 = 1, _2(G2, n2);
  }
  function _2(n2, u3, i3) {
    var f3 = y2(t2++, 2);
    if (f3.t = n2, !f3.__c && (f3.__ = [i3 ? i3(u3) : G2(void 0, u3), function(n3) {
      var t3 = (f3.__N || f3.__)[0], r3 = f3.t(t3, n3);
      o2(t3, r3) || (f3.__N = [r3, f3.__[1]], f3.__c.setState({}));
    }], f3.__c = r2, !r2.__f)) {
      r2.__f = true;
      var c3 = r2.shouldComponentUpdate;
      r2.shouldComponentUpdate = function(n3, t3, r3) {
        var u4 = this.__H;
        if (!u4) return true;
        var i4 = false, f4 = this.props != n3;
        if (u4.__.some(function(n4) {
          n4.__N && (i4 = true, o2(n4.__[0], n4.__N[0]) || (f4 = true));
        }), c3) {
          var e3 = c3.call(this, n3, t3, r3);
          return i4 ? e3 || f4 : e3;
        }
        return !i4 || f4;
      };
    }
    return f3.__;
  }
  function A2(n2, u3) {
    var i3 = y2(t2++, 3);
    !a2.__s && E2(i3.__H, u3) && (i3.__P = true, i3.__ = n2, i3.u = u3, r2.__H.__h.push(i3));
  }
  function T2(n2) {
    return f2 = 5, w2(function() {
      return { current: n2 };
    }, []);
  }
  function w2(n2, r3) {
    var u3 = y2(t2++, 7);
    return E2(u3.__H, r3) && (u3.__ = n2(), u3.__H = r3), u3.__;
  }
  function g2() {
    var n2;
    do {
      for (; n2 = e2.shift(); ) try {
        C2(n2);
      } catch (t4) {
        a2.__e(t4, { __: (n2 = n2.__P) && n2.__v });
      }
      for (; n2 = c2.shift(); ) {
        var t3 = n2.__H;
        if (n2.__P && t3) try {
          t3.__h.some(C2), t3.__h.some(D2), t3.__h = [];
        } catch (r3) {
          t3.__h = [], a2.__e(r3, n2.__v);
        }
      }
    } while (e2.length);
  }
  a2.__b = function(n2) {
    r2 = null, v2 && v2(n2);
  }, a2.__ = function(n2, t3) {
    n2 && t3.__k && t3.__k.__m && (n2.__m = t3.__k.__m), p2 && p2(n2, t3);
  }, a2.__r = function(n2) {
    l2 && l2(n2), t2 = 0;
    var i3 = (r2 = n2.__c).__H;
    i3 && (u2 == r2 ? r2.__h = [] : (i3.__h.some(C2), i3.__h.some(D2), t2 = 0), i3.__h = [], i3.__.some(function(n3) {
      n3.__N && (n3.__ = n3.__N), n3.u = n3.__N = void 0;
    })), u2 = r2;
  }, a2.diffed = function(n2) {
    m2 && m2(n2);
    var t3 = n2.__c;
    t3 && t3.__H && (t3.__H.__h.length && B2(c2.push(t3)), t3.__H.__.some(function(n3) {
      n3.u && (n3.__H = n3.u);
    })), u2 = r2 = null;
  }, a2.__c = function(n2, t3) {
    t3.some(function(n3) {
      try {
        n3.__h.some(C2), n3.__h = n3.__h.filter(function(n4) {
          return !n4.__ || D2(n4);
        });
      } catch (t4) {
        n3.__h = [function() {
          throw t4;
        }];
      }
    }), h2 && h2(n2, t3);
  }, a2.unmount = function(n2) {
    s2 && s2(n2);
    var t3, r3, u3 = n2.__c;
    u3 && u3.__H && (u3.__H.__.some(function(u4) {
      try {
        if (u4.__P && u4.__c) {
          if (void 0 === r3) {
            for (r3 = n2.__; r3 && (!r3.__c || !r3.__c.__P); ) r3 = r3.__;
            r3 = r3 && r3.__c;
          }
          u4.__P = r3, B2(e2.push(u4));
        } else C2(u4);
      } catch (n3) {
        t3 = n3;
      }
    }), u3.__H = void 0, t3 && a2.__e(t3, u3.__v));
  };
  var k2 = "function" == typeof requestAnimationFrame;
  function z2(n2) {
    var t3, r3 = function() {
      clearTimeout(u3), k2 && cancelAnimationFrame(t3), setTimeout(n2);
    }, u3 = setTimeout(r3, 35);
    k2 && (t3 = requestAnimationFrame(r3));
  }
  function B2(n2) {
    1 != n2 && i2 == a2.requestAnimationFrame || ((i2 = a2.requestAnimationFrame) || z2)(g2);
  }
  function C2(n2) {
    var t3 = r2, u3 = n2.__c;
    "function" == typeof u3 && (n2.__c = void 0, u3()), r2 = t3;
  }
  function D2(n2) {
    var t3 = r2;
    n2.__c = n2.__(), r2 = t3;
  }
  function E2(n2, t3) {
    return !n2 || n2.length != t3.length || t3.some(function(t4, r3) {
      return !o2(t4, n2[r3]);
    });
  }
  function G2(n2, t3) {
    return "function" == typeof t3 ? t3(n2) : t3;
  }

  // node_modules/preact/compat/dist/compat.mjs
  var w3 = Object.assign;
  var x3 = /^(-|f[lo].*[^se]$|g.{5,}[^ps]$|z|o[pr]|(W.{5})?[lL]i.*(t|mp)$|an|(bo|s).{4}Im|sca|m.{6}[ds]|ta|c.*[st]$|wido|ini|asp|fill|st)/;
  function U2(n2, t3) {
    var e3 = X(n2, t3);
    return e3.containerInfo = t3, e3;
  }
  var P3 = /* @__PURE__ */ Symbol.for("react.element");
  var $2 = /^(?:accent|alignment|arabic|baseline|cap|clip(?!PathU)|color|dominant|fill|flood|font|glyph(?!R)|horiz|image(?!S)|letter|lighting|marker(?!H|W|U)|overline|paint|pointer|shape|stop|strikethrough|stroke|text(?!L)|transform|underline|unicode|units|v|vector|vert|word|writing|x(?!C))[A-Z]/;
  var z3 = /[A-Z0-9]/g;
  var H2 = typeof document < "u";
  var Y = function(n2) {
    return /fil|che|rad/.test(n2);
  };
  x.prototype.isReactComponent = true, ["componentWillMount", "componentWillReceiveProps", "componentWillUpdate"].forEach(function(n2) {
    Object.defineProperty(x.prototype, n2, { configurable: true, get: function() {
      return this["UNSAFE_" + n2];
    }, set: function(t3) {
      Object.defineProperty(this, n2, { configurable: true, writable: true, value: t3 });
    } });
  });
  var J2 = n.event;
  n.event = function(n2) {
    return J2 && (n2 = J2(n2)), n2.persist = function() {
    }, n2.isPropagationStopped = function() {
      return this.cancelBubble;
    }, n2.isDefaultPrevented = function() {
      return this.defaultPrevented;
    }, n2.nativeEvent = n2;
  };
  var K2 = { configurable: true, get: function() {
    return this.class;
  } };
  var Q2 = n.vnode;
  n.vnode = function(t3) {
    if ("string" == typeof t3.type) !(function(t4) {
      var e4 = t4.props, r4 = t4.type, u3 = {}, i3 = -1 == r4.indexOf("-");
      for (var o3 in e4) {
        var f3 = e4[o3];
        if (!("value" == o3 && "defaultValue" in e4 && null == f3 || H2 && "children" == o3 && "noscript" == r4 || "class" == o3 || "className" == o3)) {
          if ("style" == o3 && f3 && f3.constructor == Object) {
            var l3 = void 0;
            for (var a3 in f3) "number" != typeof f3[a3] || x3.test(a3) || (l3 || (l3 = f3 = w3({}, f3)), f3[a3] += "px");
          } else if ("defaultValue" == o3 && "value" in e4 && null == e4.value) o3 = "value";
          else if ("download" == o3 && true === f3) f3 = "";
          else if ("translate" == o3 && "no" === f3) f3 = false;
          else if ("o" == o3[0] && "n" == o3[1]) {
            var c3 = o3.toLowerCase();
            "ondoubleclick" == c3 ? o3 = "ondblclick" : "onchange" != c3 || "input" != r4 && "textarea" != r4 || Y(e4.type) ? "onfocus" == c3 ? o3 = "onfocusin" : "onblur" == c3 && (o3 = "onfocusout") : c3 = o3 = "oninput", "oninput" == c3 && u3[o3 = c3] && (o3 = "oninputCapture");
          } else i3 && $2.test(o3) ? o3 = o3.replace(z3, "-$&").toLowerCase() : null === f3 && (f3 = void 0);
          u3[o3] = f3;
        }
      }
      if ("select" == r4) {
        var s3 = null != u3.defaultValue ? u3.defaultValue : u3.multiple && Array.isArray(u3.value) ? u3.value : null;
        null != s3 && (u3.value = O(e4.children).forEach(function(n2) {
          n2.props.selected = u3.multiple ? -1 != s3.indexOf(n2.props.value) : s3 == n2.props.value;
        }));
      }
      e4.class && !e4.className ? (u3.class = e4.class, Object.defineProperty(u3, "className", K2)) : e4.className && (u3.class = u3.className = e4.className), t4.props = u3;
    })(t3);
    else if ("function" == typeof t3.type && ("ref" in t3.props && "prototype" in t3.type && t3.type.prototype.render && (t3.ref = t3.props.ref, delete t3.props.ref), t3.type.defaultProps)) {
      var e3 = w3({}, t3.props);
      for (var r3 in t3.type.defaultProps) void 0 === e3[r3] && (e3[r3] = t3.type.defaultProps[r3]);
      t3.props = e3;
    }
    t3.ref && !("ref" in t3.props) && Object.defineProperty(t3.props, "ref", { value: t3.ref, configurable: true, writable: true }), t3.$$typeof = P3, Q2 && Q2(t3);
  };

  // locales/LN_en.json
  var LN_en_default = {
    "app.title": "Chat Export",
    "app.titleServer": "Chat Export Server",
    "app.loading": "Loading\u2026",
    "status.connected": "Connected",
    "status.offline": "Offline",
    "status.connecting": "Connecting\u2026",
    "status.auth_failed": "Auth failed",
    "label.style": "Style",
    "label.theme": "Theme",
    "label.language": "Language",
    "label.server": "Server",
    "label.gateway": "Gateway for server (MCP)",
    "label.host": "IP / Host",
    "label.port": "Port",
    "label.apiKey": "API key (this browser)",
    "label.gatewayToken": "Browser gateway token (ceb_\u2026)",
    "label.permissions": "Automation permissions",
    "label.allowCreate": "Allow creating and sending chats",
    "label.allowProjects": "Allow project management",
    "label.rpcTimeout": "Operation timeout (sec)",
    "label.browserLabel": "Browser label",
    "label.browserId": "Browser id (per Chrome profile)",
    "label.platforms": "Platforms",
    "label.destructive": "Allow deleting chats and projects",
    "label.faq": "FAQ",
    "label.on": "On",
    "label.off": "Off",
    "skin.chatgpt": "ChatGPT",
    "skin.grok": "Grok",
    "skin.grok-x": "X Grok",
    "skin.copilot": "Copilot",
    "skin.claude": "Claude",
    "skin.qwen": "Qwen",
    "skin.deepseek": "DeepSeek",
    "skin.perplexity": "Perplexity",
    "theme.auto": "System",
    "theme.light": "Light",
    "theme.dark": "Dark",
    "lang.auto": "Auto",
    "lang.en": "English",
    "lang.ru": "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    "platform.chatgpt": "ChatGPT",
    "platform.grok": "Grok",
    "platform.grok-x": "X Grok",
    "platform.copilot": "Copilot",
    "platform.claude": "Claude",
    "platform.qwen": "Qwen",
    "platform.deepseek": "DeepSeek",
    "platform.perplexity": "Perplexity",
    "bar.pack": "Pack",
    "bar.pack.folder": "Folder",
    "bar.pack.zip": "Zip",
    "bar.format": "Export format",
    "bar.download": "Download chat",
    "bar.dl.single": "Click: Downloads. Shift or Ctrl: choose path",
    "bar.dl.multi": "Click: export. Shift or Ctrl: choose save location",
    "btn.generate": "Generate",
    "btn.rotate": "Rotate",
    "btn.copy": "Copy",
    "btn.continue": "Continue",
    "btn.showAdvanced": "Advanced",
    "btn.hideAdvanced": "Hide advanced",
    "test.connection": "Test connection",
    "test.ok": "OK \xB7 passed",
    "test.fail": "Failed",
    "test.testing": "Testing\u2026",
    "key.generated": "Key generated",
    "key.generateFailed": "Key generate failed",
    "key.copied": "Key copied",
    "key.copyFailed": "Copy failed",
    "key.placeholder": "Generate ceb_ token\u2026",
    "key.hint": "The extension mints a ceb_ token per browser. Legacy cek_ tokens still work. On connect the token is enrolled on the local server.",
    "key.hintId": "Id:",
    "browser.hint": "Each Chrome profile needs its own ceb_ token and shows up separately on the dashboard Browsers page.",
    "faq.lead": "Before connecting the local server, read the FAQ:",
    "faq.agree": "I understand and agree",
    "faq.1": "The extension and server run only locally on your computer. No telemetry, no external servers, data is not sent anywhere.",
    "faq.2": "Only your chats from your logged-in browser session are exported. Site passwords and cookies are not read by the server and are not sent to the agent.",
    "faq.3": "The key is generated by the extension (one per browser/profile). The server stores a key pack locally on 127.0.0.1. Do not publish keys.",
    "faq.4": "Delete is off by default and requires confirmation.",
    "faq.5": "For exporting your own data (personal data portability). You are responsible for complying with service ToS. This is not legal advice."
  };

  // locales/LN_ru.json
  var LN_ru_default = {
    "app.title": "Chat Export",
    "app.titleServer": "Chat Export Server",
    "app.loading": "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026",
    "status.connected": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E",
    "status.offline": "\u041E\u0444\u043B\u0430\u0439\u043D",
    "status.connecting": "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u2026",
    "status.auth_failed": "\u041E\u0448\u0438\u0431\u043A\u0430 \u0430\u0432\u0442\u043E\u0440\u0438\u0437\u0430\u0446\u0438\u0438",
    "label.style": "\u0421\u0442\u0438\u043B\u044C",
    "label.theme": "\u0422\u0435\u043C\u0430",
    "label.language": "\u042F\u0437\u044B\u043A",
    "label.server": "\u0421\u0435\u0440\u0432\u0435\u0440",
    "label.gateway": "\u0428\u043B\u044E\u0437 \u0434\u043B\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u0430 (MCP)",
    "label.host": "IP / Host",
    "label.port": "\u041F\u043E\u0440\u0442",
    "label.apiKey": "API-\u043A\u043B\u044E\u0447 (\u044D\u0442\u043E\u0442 \u0431\u0440\u0430\u0443\u0437\u0435\u0440)",
    "label.gatewayToken": "\u0422\u043E\u043A\u0435\u043D \u0448\u043B\u044E\u0437\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 (ceb_\u2026)",
    "label.permissions": "\u0420\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438",
    "label.allowCreate": "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0441\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0443 \u0447\u0430\u0442\u043E\u0432",
    "label.allowProjects": "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0443\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0435\u043A\u0442\u0430\u043C\u0438",
    "label.rpcTimeout": "\u0422\u0430\u0439\u043C\u0430\u0443\u0442 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0439 (\u0441\u0435\u043A)",
    "label.browserLabel": "\u041C\u0435\u0442\u043A\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430",
    "label.browserId": "Id \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0430 (\u043D\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044C Chrome)",
    "label.platforms": "\u041F\u043B\u0430\u0442\u0444\u043E\u0440\u043C\u044B",
    "label.destructive": "\u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u044C \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u043E\u0432 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432",
    "label.faq": "FAQ",
    "label.on": "\u0412\u043A\u043B",
    "label.off": "\u0412\u044B\u043A\u043B",
    "skin.chatgpt": "ChatGPT",
    "skin.grok": "Grok",
    "skin.grok-x": "X Grok",
    "skin.copilot": "Copilot",
    "skin.claude": "Claude",
    "skin.qwen": "Qwen",
    "skin.deepseek": "DeepSeek",
    "skin.perplexity": "Perplexity",
    "theme.auto": "\u0421\u0438\u0441\u0442\u0435\u043C\u043D\u044B\u0439",
    "theme.light": "\u0421\u0432\u0435\u0442\u043B\u0430\u044F",
    "theme.dark": "\u0422\u0451\u043C\u043D\u0430\u044F",
    "lang.auto": "\u0410\u0432\u0442\u043E",
    "lang.en": "English",
    "lang.ru": "\u0420\u0443\u0441\u0441\u043A\u0438\u0439",
    "platform.chatgpt": "ChatGPT",
    "platform.grok": "Grok",
    "platform.grok-x": "X Grok",
    "platform.copilot": "Copilot",
    "platform.claude": "Claude",
    "platform.qwen": "Qwen",
    "platform.deepseek": "DeepSeek",
    "platform.perplexity": "Perplexity",
    "bar.pack": "\u0423\u043F\u0430\u043A\u043E\u0432\u043A\u0430",
    "bar.pack.folder": "\u041F\u0430\u043F\u043A\u0430",
    "bar.pack.zip": "\u0410\u0440\u0445\u0438\u0432",
    "bar.format": "\u0424\u043E\u0440\u043C\u0430\u0442 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "bar.download": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0447\u0430\u0442",
    "bar.dl.single": "\u041A\u043B\u0438\u043A: \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438. Shift \u0438\u043B\u0438 Ctrl: \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0443\u0442\u044C",
    "bar.dl.multi": "\u041A\u043B\u0438\u043A: \u044D\u043A\u0441\u043F\u043E\u0440\u0442. Shift \u0438\u043B\u0438 Ctrl: \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u043C\u0435\u0441\u0442\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F",
    "btn.generate": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C",
    "btn.rotate": "\u0421\u043C\u0435\u043D\u0438\u0442\u044C",
    "btn.copy": "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "btn.continue": "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
    "btn.showAdvanced": "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435",
    "btn.hideAdvanced": "\u0421\u043A\u0440\u044B\u0442\u044C \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u044B\u0435",
    "test.connection": "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u0435",
    "test.ok": "OK \xB7 \u043F\u0440\u043E\u0439\u0434\u0435\u043D\u043E",
    "test.fail": "\u041E\u0448\u0438\u0431\u043A\u0430",
    "test.testing": "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430\u2026",
    "key.generated": "\u041A\u043B\u044E\u0447 \u0441\u043E\u0437\u0434\u0430\u043D",
    "key.generateFailed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043E\u0437\u0434\u0430\u0442\u044C \u043A\u043B\u044E\u0447",
    "key.copied": "\u041A\u043B\u044E\u0447 \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u043D",
    "key.copyFailed": "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0441\u043A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "key.placeholder": "\u0421\u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0439\u0442\u0435 \u0442\u043E\u043A\u0435\u043D ceb_\u2026",
    "key.hint": "\u0422\u043E\u043A\u0435\u043D ceb_ \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u0432 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0438 (\u043D\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0441\u0432\u043E\u0439). \u0421\u0442\u0430\u0440\u044B\u0435 cek_ \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0440\u0430\u0431\u043E\u0447\u0438\u043C\u0438. \u041F\u0440\u0438 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0438 \u0442\u043E\u043A\u0435\u043D \u0440\u0435\u0433\u0438\u0441\u0442\u0440\u0438\u0440\u0443\u0435\u0442\u0441\u044F \u043D\u0430 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u043C \u0441\u0435\u0440\u0432\u0435\u0440\u0435.",
    "key.hintId": "Id:",
    "browser.hint": "\u0423 \u043A\u0430\u0436\u0434\u043E\u0433\u043E \u043F\u0440\u043E\u0444\u0438\u043B\u044F Chrome \u0441\u0432\u043E\u0439 \u0442\u043E\u043A\u0435\u043D ceb_ \u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F \u0441\u0442\u0440\u043E\u043A\u0430 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 Browsers \u0432 \u0434\u0430\u0448\u0431\u043E\u0440\u0434\u0435.",
    "faq.lead": "\u041F\u0435\u0440\u0435\u0434 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435\u043C \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0439\u0442\u0435 FAQ:",
    "faq.agree": "\u041F\u043E\u043D\u0438\u043C\u0430\u044E \u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u0435\u043D",
    "faq.1": "\u0420\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u0438 \u0441\u0435\u0440\u0432\u0435\u0440 \u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u0442\u043E\u043B\u044C\u043A\u043E \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u043D\u0430 \u0432\u0430\u0448\u0435\u043C \u043A\u043E\u043C\u043F\u044C\u044E\u0442\u0435\u0440\u0435. \u041D\u0435\u0442 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u0438, \u043D\u0435\u0442 \u0432\u043D\u0435\u0448\u043D\u0438\u0445 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u0432, \u0434\u0430\u043D\u043D\u044B\u0435 \u043D\u0438\u043A\u0443\u0434\u0430 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F.",
    "faq.2": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u0442\u043E\u043B\u044C\u043A\u043E \u0432\u0430\u0448\u0438 \u0447\u0430\u0442\u044B \u0438\u0437 \u0432\u0430\u0448\u0435\u0439 \u0437\u0430\u043B\u043E\u0433\u0438\u043D\u0435\u043D\u043D\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438 \u0432 \u0432\u0430\u0448\u0435\u043C \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435. \u041F\u0430\u0440\u043E\u043B\u0438 \u0438 cookies \u0441\u0430\u0439\u0442\u043E\u0432 \u043D\u0435 \u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C \u0438 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u044E\u0442\u0441\u044F \u0430\u0433\u0435\u043D\u0442\u0443.",
    "faq.3": "\u041A\u043B\u044E\u0447 \u0433\u0435\u043D\u0435\u0440\u0438\u0440\u0443\u0435\u0442 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 (\u043D\u0430 \u043A\u0430\u0436\u0434\u044B\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440/\u043F\u0440\u043E\u0444\u0438\u043B\u044C \u0441\u0432\u043E\u0439). \u0421\u0435\u0440\u0432\u0435\u0440 \u0445\u0440\u0430\u043D\u0438\u0442 \u043F\u0430\u043A \u043A\u043B\u044E\u0447\u0435\u0439 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u043D\u0430 127.0.0.1. \u041D\u0435 \u043F\u0443\u0431\u043B\u0438\u043A\u0443\u0439\u0442\u0435 \u043A\u043B\u044E\u0447\u0438.",
    "faq.4": "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0438 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F.",
    "faq.5": "\u0418\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435 \u0434\u043B\u044F \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 \u0441\u043E\u0431\u0441\u0442\u0432\u0435\u043D\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 (personal data portability). \u0412\u044B \u043E\u0442\u0432\u0435\u0447\u0430\u0435\u0442\u0435 \u0437\u0430 \u0441\u043E\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u0438\u043B \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u0432 (ToS). \u042D\u0442\u043E \u043D\u0435 \u044E\u0440\u0438\u0434\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043A\u043E\u043D\u0441\u0443\u043B\u044C\u0442\u0430\u0446\u0438\u044F."
  };

  // src/i18n/index.js
  var LOCALES = Object.freeze(["auto", "en", "ru"]);
  var PACKS = Object.freeze({
    en: LN_en_default,
    ru: LN_ru_default
  });
  function detectBrowserLocale() {
    let raw = "";
    try {
      if (typeof chrome !== "undefined" && chrome.i18n && typeof chrome.i18n.getUILanguage === "function") {
        raw = String(chrome.i18n.getUILanguage() || "");
      }
    } catch (e3) {
      raw = "";
    }
    if (!raw && typeof navigator !== "undefined") {
      raw = String(navigator.language || navigator.userLanguage || "");
    }
    const low = raw.toLowerCase();
    if (low.indexOf("ru") === 0) return "ru";
    return "en";
  }
  function resolveLocale(localeSetting) {
    if (localeSetting === "en" || localeSetting === "ru") return localeSetting;
    return detectBrowserLocale();
  }
  function createTranslator(localeCode) {
    const code = localeCode === "ru" ? "ru" : "en";
    const pack = PACKS[code] || PACKS.en;
    const fallback = PACKS.en;
    return function t3(key) {
      const k3 = String(key || "");
      if (Object.prototype.hasOwnProperty.call(pack, k3) && pack[k3] != null) return String(pack[k3]);
      if (Object.prototype.hasOwnProperty.call(fallback, k3) && fallback[k3] != null) return String(fallback[k3]);
      return k3;
    };
  }

  // src/settings.js
  var DEFAULT_HOST = "127.0.0.1";
  var DEFAULT_PORT = 8765;
  var PLATFORMS = Object.freeze([
    "chatgpt",
    "grok",
    "grok-x",
    "copilot",
    "claude",
    "qwen",
    "deepseek",
    "perplexity"
  ]);
  var UI_SKINS = Object.freeze([
    "chatgpt",
    "grok",
    "grok-x",
    "copilot",
    "claude",
    "qwen",
    "deepseek",
    "perplexity"
  ]);
  var UI_SCHEMES = Object.freeze(["auto", "light", "dark"]);
  var UI_LOCALES = Object.freeze(["auto", "en", "ru"]);
  var STORAGE_KEYS = Object.freeze({
    browserId: "ce.browserId",
    settings: "ce.settings",
    status: "ce.bridgeStatus"
  });
  var DEFAULT_SETTINGS = Object.freeze({
    serverOn: false,
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    apiKey: "",
    browserLabel: "Chrome",
    platforms: Object.freeze({
      chatgpt: true,
      grok: true,
      "grok-x": true,
      copilot: true,
      claude: true,
      qwen: true,
      deepseek: true,
      perplexity: true
    }),
    allowCreate: true,
    allowDestructive: false,
    allowProjects: true,
    rpcTimeoutS: 60,
    faqVersion: 0,
    ui: Object.freeze({
      skin: "chatgpt",
      scheme: "auto",
      locale: "auto"
    })
  });
  function normalizeUi(raw) {
    const u3 = raw && typeof raw === "object" ? raw : {};
    const skin = UI_SKINS.indexOf(u3.skin) >= 0 ? u3.skin : "chatgpt";
    const scheme = UI_SCHEMES.indexOf(u3.scheme) >= 0 ? u3.scheme : "auto";
    const locale = UI_LOCALES.indexOf(u3.locale) >= 0 ? u3.locale : "auto";
    return { skin, scheme, locale };
  }
  function normalizeSettings(raw) {
    const s3 = raw && typeof raw === "object" ? raw : {};
    const platforms = {};
    for (let i3 = 0; i3 < PLATFORMS.length; i3++) {
      const id = PLATFORMS[i3];
      const v3 = s3.platforms && typeof s3.platforms === "object" ? s3.platforms[id] : void 0;
      platforms[id] = v3 === false ? false : true;
    }
    const port = Number(s3.port);
    const rpcRaw = Number(s3.rpcTimeoutS);
    const host = typeof s3.host === "string" && s3.host.trim() ? s3.host.trim() : DEFAULT_HOST;
    return {
      serverOn: !!s3.serverOn,
      host,
      port: Number.isFinite(port) && port > 0 && port < 65536 ? Math.floor(port) : DEFAULT_PORT,
      apiKey: typeof s3.apiKey === "string" ? s3.apiKey : "",
      browserLabel: typeof s3.browserLabel === "string" && s3.browserLabel.trim() ? s3.browserLabel.trim() : "Chrome",
      platforms,
      allowCreate: s3.allowCreate === false ? false : true,
      allowDestructive: !!s3.allowDestructive,
      allowProjects: s3.allowProjects === false ? false : true,
      rpcTimeoutS: Number.isFinite(rpcRaw) && rpcRaw >= 5 && rpcRaw <= 600 ? Math.floor(rpcRaw) : 60,
      faqVersion: Number.isFinite(Number(s3.faqVersion)) ? Number(s3.faqVersion) : 0,
      ui: normalizeUi(s3.ui)
    };
  }
  function isPlatformEnabledIn(settings, platformId) {
    const s3 = normalizeSettings(settings);
    return s3.platforms[platformId] !== false;
  }

  // src/platformGate.js
  var cache = normalizeSettings(DEFAULT_SETTINGS);
  var listeners = [];
  function isPlatformEnabled(id) {
    return isPlatformEnabledIn(cache, id);
  }
  function getPlatformSettings() {
    return cache;
  }
  function onPlatformSettings(fn) {
    if (typeof fn === "function") listeners.push(fn);
    return function() {
      listeners = listeners.filter(function(x4) {
        return x4 !== fn;
      });
    };
  }
  function emit() {
    for (let i3 = 0; i3 < listeners.length; i3++) listeners[i3](cache);
  }
  function applyRaw(raw) {
    cache = normalizeSettings(raw || DEFAULT_SETTINGS);
    emit();
  }
  function installPlatformGate() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      applyRaw(DEFAULT_SETTINGS);
      return;
    }
    chrome.storage.local.get([STORAGE_KEYS.settings], function(got) {
      applyRaw(got && got[STORAGE_KEYS.settings]);
    });
    chrome.storage.onChanged.addListener(function(changes, area) {
      if (area !== "local") return;
      if (!changes[STORAGE_KEYS.settings]) return;
      applyRaw(changes[STORAGE_KEYS.settings].newValue);
    });
  }

  // src/ui/ExportBar.jsx
  function Chevron({ className }) {
    return /* @__PURE__ */ k(
      "svg",
      {
        viewBox: "0 0 16 16",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "2.25",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        class: className || "chat-export-chevron",
        width: "16",
        height: "16",
        "aria-hidden": "true"
      },
      /* @__PURE__ */ k("polyline", { points: "4,6 8,10 12,6" })
    );
  }
  function cdsButtonParts(btn) {
    if (!btn || !btn.querySelector) return null;
    const paint = btn.querySelector('[data-cds-part="paint"]');
    if (!paint) return null;
    const paintWrap = paint.parentElement && paint.parentElement.tagName === "SPAN" ? paint.parentElement : null;
    const content = Array.from(btn.children).find(
      (c3) => c3.tagName === "SPAN" && c3 !== paintWrap && !c3.querySelector('[data-cds-part="paint"]')
    );
    return {
      paintWrapClass: paintWrap ? String(paintWrap.className || "").trim() : "",
      paintClass: String(paint.className || "").trim(),
      contentClass: content ? String(content.className || "").trim() : "inline-flex min-w-0 items-center gap-1"
    };
  }
  function CdsPaint({ parts }) {
    if (!parts || !parts.paintWrapClass) return null;
    return /* @__PURE__ */ k("span", { "aria-hidden": "true", class: parts.paintWrapClass }, /* @__PURE__ */ k("span", { "data-cds-part": "paint", class: parts.paintClass || void 0 }));
  }
  function FormatMenu({
    platform,
    scheme,
    open,
    formats,
    packMode,
    formatBtnRef,
    onToggleFormat,
    onPack,
    onClose,
    t: t3
  }) {
    const menuRef = T2(null);
    const CE2 = window.ChatExport;
    A2(() => {
      if (!open) return void 0;
      const menu = menuRef.current;
      if (!menu) return void 0;
      function place() {
        const btn = formatBtnRef.current;
        if (!btn || !menu) return;
        const r3 = btn.getBoundingClientRect();
        const h3 = menu.offsetHeight || 160;
        const w4 = menu.offsetWidth || 220;
        const gap = 8;
        let left = r3.left;
        if (left + w4 > window.innerWidth - 8) left = Math.max(8, window.innerWidth - w4 - 8);
        if (left < 8) left = 8;
        const spaceBelow = window.innerHeight - r3.bottom;
        const spaceAbove = r3.top;
        const preferBelow = platform === "claude" || spaceBelow >= h3 + gap || spaceBelow >= spaceAbove;
        let top;
        if (preferBelow && spaceBelow >= h3 + gap) {
          top = r3.bottom + gap;
        } else if (spaceAbove >= h3 + gap) {
          top = r3.top - h3 - gap;
        } else if (spaceBelow >= spaceAbove) {
          top = Math.min(r3.bottom + gap, window.innerHeight - h3 - 8);
        } else {
          top = Math.max(8, r3.top - h3 - gap);
        }
        menu.style.position = "fixed";
        menu.style.left = left + "px";
        menu.style.top = Math.max(8, top) + "px";
        menu.style.bottom = "auto";
        menu.style.zIndex = "2147483646";
      }
      place();
      requestAnimationFrame(place);
      function onDoc(ev) {
        const btn = formatBtnRef.current;
        if (menu.contains(ev.target) || btn && btn.contains(ev.target)) return;
        onClose();
      }
      function onScroll() {
        place();
      }
      document.addEventListener("click", onDoc, true);
      window.addEventListener("resize", onScroll);
      window.addEventListener("scroll", onScroll, true);
      return () => {
        document.removeEventListener("click", onDoc, true);
        window.removeEventListener("resize", onScroll);
        window.removeEventListener("scroll", onScroll, true);
      };
    }, [open, formats, packMode, formatBtnRef, onClose, platform]);
    if (!open) return null;
    const ids = CE2.FORMAT_IDS;
    const labels = CE2.FORMAT_LABEL;
    return U2(
      /* @__PURE__ */ k(
        "div",
        {
          ref: menuRef,
          class: "chat-export-menu",
          "data-chat-export-menu": platform,
          "data-ce-scheme": scheme || "dark",
          role: "menu"
        },
        ids.map((value) => {
          const on = formats.indexOf(value) >= 0;
          return /* @__PURE__ */ k(
            "button",
            {
              type: "button",
              role: "menuitemcheckbox",
              "aria-checked": on ? "true" : "false",
              class: "chat-export-menu-item" + (on ? " is-active" : ""),
              "data-format": value,
              onClick: (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                onToggleFormat(value);
              }
            },
            /* @__PURE__ */ k("span", null, labels[value]),
            on ? /* @__PURE__ */ k("span", { class: "chat-export-check", "aria-hidden": "true" }, "\u2713") : null
          );
        }),
        formats.length > 1 ? /* @__PURE__ */ k("div", null, /* @__PURE__ */ k("div", { class: "chat-export-menu-sep" }), /* @__PURE__ */ k("div", { class: "chat-export-pack", role: "radiogroup", "aria-label": t3("bar.pack") }, [
          { id: "folder", label: t3("bar.pack.folder") },
          { id: "zip", label: t3("bar.pack.zip") }
        ].map((spec) => /* @__PURE__ */ k(
          "button",
          {
            type: "button",
            role: "radio",
            "aria-checked": packMode === spec.id ? "true" : "false",
            class: "chat-export-pack-btn" + (packMode === spec.id ? " is-active" : ""),
            "data-pack": spec.id,
            onClick: (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              onPack(spec.id);
            }
          },
          spec.label
        )))) : null
      ),
      document.body
    );
  }
  function ExportBarInner({ options }) {
    const CE2 = window.ChatExport;
    const platform = options.platform || "chat";
    const formatBtnRef = T2(null);
    const dlBtnRef = T2(null);
    const [formats, setFormats] = d2(() => CE2.loadFormats());
    const [packMode, setPackMode] = d2(() => CE2.loadPack());
    const [menuOpen, setMenuOpen] = d2(false);
    const [busy, setBusy] = d2(false);
    const [superLook, setSuperLook] = d2(false);
    const [scheme, setScheme] = d2(
      () => typeof CE2.detectHostScheme === "function" ? CE2.detectHostScheme(platform) : "dark"
    );
    const [localeCode, setLocaleCode] = d2(() => resolveLocale(getPlatformSettings().ui.locale));
    const cachedDirRef = T2(null);
    const cachedDirOkRef = T2(false);
    const lastIntentRef = T2(0);
    const t3 = w2(() => createTranslator(localeCode), [localeCode]);
    A2(() => {
      return onPlatformSettings((settings) => {
        setLocaleCode(resolveLocale(settings.ui.locale));
      });
    }, []);
    A2(() => {
      if (typeof CE2.watchHostScheme !== "function") return void 0;
      return CE2.watchHostScheme(platform, setScheme);
    }, [platform]);
    const nativeClass = options.nativeClass || CE2.nativeButtonClass(options.nativeFrom);
    const nativeIconClass = options.nativeIconClass || CE2.nativeButtonClass(options.nativeIconFrom) || nativeClass;
    const cdsFmt = cdsButtonParts(options.nativeFrom);
    const cdsIcon = cdsButtonParts(options.nativeIconFrom) || cdsFmt;
    let formatLabelClass = "";
    let formatChevronClass = "";
    let iconWrapClass = "";
    if (!cdsFmt && options.nativeFrom) {
      formatLabelClass = CE2.firstChildClass(options.nativeFrom, "SPAN") || "";
      const nativeSpans = options.nativeFrom.querySelectorAll(":scope > span");
      if (nativeSpans.length > 1) formatChevronClass = String(nativeSpans[1].className || "").trim();
    }
    if (!cdsIcon) {
      iconWrapClass = CE2.firstChildClass(options.nativeIconFrom, "SPAN") || "";
    }
    function resolveDownloadSvg() {
      if (typeof options.downloadSvg === "function") return options.downloadSvg();
      if (typeof options.downloadSvg === "string" && options.downloadSvg) return options.downloadSvg;
      return CE2.downloadSvg();
    }
    function dlTitle() {
      if (formats.length > 1) return t3("bar.dl.multi");
      return t3("bar.dl.single");
    }
    A2(() => {
      CE2.loadDirHandle().then((h3) => {
        cachedDirRef.current = h3 || null;
        cachedDirOkRef.current = false;
        if (!h3 || typeof h3.queryPermission !== "function") return;
        return h3.queryPermission({ mode: "readwrite" }).then((state) => {
          cachedDirOkRef.current = state === "granted";
        });
      });
    }, []);
    A2(() => {
      const btn = dlBtnRef.current;
      if (!btn) return void 0;
      function onKey(ev) {
        if (!btn.matches(":hover")) return;
        setSuperLook(CE2.wantsPathPicker(ev));
      }
      window.addEventListener("keydown", onKey, true);
      window.addEventListener("keyup", onKey, true);
      return () => {
        window.removeEventListener("keydown", onKey, true);
        window.removeEventListener("keyup", onKey, true);
      };
    }, []);
    function toggleFormat(id) {
      let next = formats.slice();
      const idx = next.indexOf(id);
      if (idx >= 0) {
        if (next.length === 1) return;
        next.splice(idx, 1);
      } else {
        next.push(id);
        next = CE2.normalizeFormats(next);
      }
      CE2.saveFormats(next);
      setFormats(next);
    }
    function setPack(id) {
      const v3 = id === "folder" ? "folder" : "zip";
      CE2.savePack(v3);
      setPackMode(v3);
    }
    function runDownload(ev, forcePick) {
      ev.preventDefault();
      ev.stopPropagation();
      setMenuOpen(false);
      if (busy) return;
      const now = Date.now();
      if (now - lastIntentRef.current < 400) return;
      lastIntentRef.current = now;
      const selected = formats.slice();
      const pack = selected.length > 1 ? packMode : "file";
      const shiftPick = forcePick || CE2.wantsPathPicker(ev);
      const useCachedFolder = pack === "folder" && cachedDirOkRef.current && cachedDirRef.current && !shiftPick;
      const pickPath = shiftPick || pack === "folder" && !useCachedFolder;
      const suggestedBase = (options.platform || "chat") + "-" + CE2.slugTitle(document.title || "chat") + "-" + CE2.dateStamp();
      const pickerPack = pack === "folder" ? "folder" : selected.length > 1 ? "zip" : "file";
      let pickedPromise = Promise.resolve(null);
      if (useCachedFolder) {
        pickedPromise = Promise.resolve({ kind: "dir", dir: cachedDirRef.current });
      } else if (pickPath) {
        try {
          pickedPromise = CE2.openPathPicker(selected, suggestedBase, pickerPack).then((picked) => {
            if (picked && picked.kind === "dir" && picked.dir) {
              cachedDirRef.current = picked.dir;
              cachedDirOkRef.current = true;
            }
            return picked;
          });
        } catch (err) {
          console.error("[chat-export]", err);
          pickedPromise = Promise.resolve(null);
        }
      }
      setBusy(true);
      Promise.all([pickedPromise, Promise.resolve().then(() => options.getData())]).then((pair) => {
        const picked = pair[0];
        const payload = pair[1];
        if (!payload || !payload.messages || !payload.messages.length) return;
        return CE2.exportConversation({
          platform: options.platform,
          title: payload.title,
          chatId: payload.chatId,
          model: payload.model,
          userName: payload.userName,
          userHandle: payload.userHandle,
          userEmail: payload.userEmail,
          messages: payload.messages,
          formats: selected,
          pack,
          picked
        });
      }).catch((err) => {
        if (err && err.name === "AbortError") return;
        console.error("[chat-export]", err);
      }).then(() => {
        setBusy(false);
      });
    }
    const mod = options.modifier || "";
    const barClass = "chat-export-bar" + (mod ? " chat-export-bar--" + mod.replace(/\s+/g, " chat-export-bar--") : "");
    const pillLabel = CE2.formatPillLabel(formats);
    const iconHtml = resolveDownloadSvg();
    const formatBtnClass = (nativeClass || "") + (menuOpen ? " is-open" : "");
    const dlClass = (nativeIconClass || "") + " chat-export-dl" + (superLook ? " is-super" : "");
    return /* @__PURE__ */ k(
      "div",
      {
        class: barClass,
        "data-chat-export-bar": platform,
        "data-chat-export-v": CE2.EXT_VERSION,
        "data-ce-scheme": scheme || "dark"
      },
      /* @__PURE__ */ k(
        "button",
        {
          ref: formatBtnRef,
          type: "button",
          class: ("chat-export-fmt " + formatBtnClass).trim(),
          "aria-label": t3("bar.format"),
          "aria-haspopup": "menu",
          "aria-expanded": menuOpen ? "true" : "false",
          onClick: (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            setMenuOpen(!menuOpen);
          }
        },
        /* @__PURE__ */ k(CdsPaint, { parts: cdsFmt }),
        cdsFmt ? /* @__PURE__ */ k("span", { class: cdsFmt.contentClass || "inline-flex min-w-0 items-center gap-1" }, /* @__PURE__ */ k("span", { class: "chat-export-format-text" }, pillLabel), /* @__PURE__ */ k(Chevron, null)) : /* @__PURE__ */ k($, null, /* @__PURE__ */ k("span", { class: "chat-export-format-text" + (formatLabelClass ? " " + formatLabelClass : "") }, pillLabel), formatChevronClass ? /* @__PURE__ */ k("span", { class: formatChevronClass, "aria-hidden": "true" }, /* @__PURE__ */ k(Chevron, null)) : /* @__PURE__ */ k(Chevron, null))
      ),
      /* @__PURE__ */ k(
        "button",
        {
          ref: dlBtnRef,
          type: "button",
          class: dlClass.trim(),
          "aria-label": t3("bar.download"),
          "aria-busy": busy ? "true" : void 0,
          disabled: busy,
          title: dlTitle(),
          onPointerEnter: (ev) => setSuperLook(CE2.wantsPathPicker(ev)),
          onPointerMove: (ev) => setSuperLook(CE2.wantsPathPicker(ev)),
          onPointerDown: (ev) => setSuperLook(CE2.wantsPathPicker(ev)),
          onPointerLeave: () => setSuperLook(false),
          onClick: (ev) => runDownload(ev, false),
          onContextMenu: (ev) => {
            if (ev.ctrlKey || ev.metaKey) runDownload(ev, true);
          }
        },
        /* @__PURE__ */ k(CdsPaint, { parts: cdsIcon }),
        cdsIcon ? /* @__PURE__ */ k(
          "span",
          {
            class: cdsIcon.contentClass || "inline-flex min-w-0 items-center gap-1",
            "aria-hidden": "true",
            dangerouslySetInnerHTML: { __html: iconHtml }
          }
        ) : iconWrapClass ? /* @__PURE__ */ k(
          "span",
          {
            class: iconWrapClass,
            "aria-hidden": "true",
            dangerouslySetInnerHTML: { __html: iconHtml }
          }
        ) : /* @__PURE__ */ k("span", { dangerouslySetInnerHTML: { __html: iconHtml } })
      ),
      /* @__PURE__ */ k(
        FormatMenu,
        {
          platform,
          scheme,
          open: menuOpen,
          formats,
          packMode,
          formatBtnRef,
          onToggleFormat: toggleFormat,
          onPack: setPack,
          onClose: () => setMenuOpen(false),
          t: t3
        }
      )
    );
  }
  function injectBar(anchor, options) {
    if (!anchor) return null;
    const CE2 = window.ChatExport;
    const opts = options || {};
    const platform = opts.platform || "chat";
    const existing = document.querySelector("[" + CE2.BAR_ATTR + '="' + platform + '"]');
    if (existing) {
      const sameVer = existing.getAttribute("data-chat-export-v") === CE2.EXT_VERSION;
      if (existing.isConnected && anchor.contains(existing) && sameVer) return existing;
      const host2 = existing.parentElement;
      existing.remove();
      if (host2 && host2.getAttribute("data-ce-host") === platform) host2.remove();
    }
    const staleMenu = document.querySelector('[data-chat-export-menu="' + platform + '"]');
    if (staleMenu) staleMenu.remove();
    const host = document.createElement("div");
    host.setAttribute("data-ce-host", platform);
    host.style.display = "contents";
    if (opts.insertAfter && opts.insertAfter.parentNode) {
      opts.insertAfter.parentNode.insertBefore(host, opts.insertAfter.nextSibling);
    } else if (opts.beforeChild && opts.beforeChild.parentNode) {
      opts.beforeChild.parentNode.insertBefore(host, opts.beforeChild);
    } else if (opts.placement === "prepend") {
      anchor.insertBefore(host, anchor.firstChild);
    } else if (opts.placement === "before" && anchor.parentNode) {
      anchor.parentNode.insertBefore(host, anchor);
    } else {
      anchor.appendChild(host);
    }
    Q(k(ExportBarInner, { options: opts }), host);
    return host.querySelector("[" + CE2.BAR_ATTR + '="' + platform + '"]') || host;
  }

  // src/definePlatform.js
  var OP_HOOKS = [
    "list",
    "get",
    "create",
    "delete",
    "capabilities",
    "send",
    "containers",
    "containerChats",
    "containerCreate",
    "containerDelete",
    "containerMoveChat",
    "askSelection",
    "sideAsk",
    "hostState"
  ];
  var SUBMIT_HOOKS = ["create", "send", "askSelection", "sideAsk"];
  function removeBar(CE2, id) {
    const existing = document.querySelector("[" + CE2.BAR_ATTR + '="' + id + '"]');
    if (!existing) return;
    const host = existing.parentElement;
    existing.remove();
    if (host && host.getAttribute("data-ce-host") === id) host.remove();
  }
  function definePlatform(spec) {
    const CE2 = window.ChatExport;
    if (!CE2 || !spec || !spec.id) return;
    const id = spec.id;
    const modifier = spec.modifier || id;
    const fenceFallback = spec.fenceTag || id;
    function messagesFromHydrate(res, modelName, scroller) {
      const assistantTag = CE2.modelFenceTag(modelName, fenceFallback);
      const root = res && res.scroller || scroller || document;
      const turns = typeof spec.turns === "function" ? spec.turns(root) : [];
      const live = [];
      for (let i3 = 0; i3 < turns.length; i3++) {
        const msg = spec.capture(turns[i3], assistantTag);
        if (msg) live.push(msg);
      }
      if (!res || !res.items) return live;
      const captured = [];
      const order = res.order || [];
      for (let i3 = 0; i3 < order.length; i3++) {
        const row = res.items[order[i3]];
        if (row && row.payload && row.payload.role) captured.push(row.payload);
      }
      return captured.length > live.length ? captured : live;
    }
    function currentChatId() {
      return typeof spec.chatId === "function" && spec.chatId() || "";
    }
    function getDataFromDom() {
      const user = typeof spec.user === "function" && spec.user() || {};
      const model = typeof spec.model === "function" && spec.model() || "";
      const scroller = typeof spec.scroller === "function" && spec.scroller() || null;
      const assistantTag = CE2.modelFenceTag(model, fenceFallback);
      const keyOf = typeof spec.turnKey === "function" ? spec.turnKey : function(el, i3) {
        return el && (el.id || el.getAttribute("data-message-id") || el.getAttribute("data-testid") || (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 96)) || "n" + i3;
      };
      var hydrateOpts = {
        scroller,
        fromEl: scroller,
        nodes: function() {
          return typeof spec.turns === "function" ? spec.turns(scroller) : [];
        },
        keyOf,
        capture: function(el) {
          return spec.capture(el, assistantTag);
        }
      };
      if (spec.maxSteps) hydrateOpts.maxSteps = spec.maxSteps;
      return CE2.hydrateTranscript(hydrateOpts).then(function(res) {
        return {
          title: typeof spec.title === "function" && spec.title() || "chat",
          chatId: currentChatId(),
          model,
          userName: user.userName || "",
          userHandle: user.userHandle || "",
          userEmail: user.userEmail || "",
          messages: messagesFromHydrate(res, model, res && res.scroller || scroller)
        };
      });
    }
    function getData() {
      if (typeof spec.exportData === "function") {
        return Promise.resolve().then(function() {
          return spec.exportData();
        }).then(function(fromApi) {
          const apiOnly = spec.exportDomFallback === false;
          if (fromApi && Array.isArray(fromApi.messages) && (fromApi.messages.length || apiOnly)) {
            const user = typeof spec.user === "function" && spec.user() || {};
            return Object.assign(
              {
                title: typeof spec.title === "function" && spec.title() || "chat",
                chatId: currentChatId(),
                model: typeof spec.model === "function" && spec.model() || "",
                userName: user.userName || "",
                userHandle: user.userHandle || "",
                userEmail: user.userEmail || ""
              },
              fromApi
            );
          }
          return getDataFromDom();
        }).catch(function(err) {
          if (spec.exportDomFallback === false) throw err;
          return getDataFromDom();
        });
      }
      return getDataFromDom();
    }
    const ops = {};
    const specOps = spec.ops || {};
    for (const name of OP_HOOKS) {
      if (typeof specOps[name] === "function") ops[name] = specOps[name];
    }
    function lastAssistantTurn() {
      if (typeof spec.turns !== "function" || typeof spec.capture !== "function") return null;
      try {
        const turns = spec.turns(document) || [];
        for (let i3 = turns.length - 1; i3 >= 0; i3--) {
          const msg = spec.capture(turns[i3], fenceFallback);
          if (!msg) continue;
          return msg.role === "assistant" ? turns[i3] : null;
        }
      } catch (e3) {
      }
      return null;
    }
    const Ops = CE2.Ops || {};
    if (typeof Ops.guardBusy === "function") {
      for (const name of SUBMIT_HOOKS) {
        const run = ops[name];
        if (!run) continue;
        ops[name] = function(args, ctx) {
          return Ops.guardBusy(function() {
            return run(args, ctx);
          }, lastAssistantTurn);
        };
      }
    }
    if (ops.hostState && typeof Ops.buildHostState === "function") {
      const probe = ops.hostState;
      ops.hostState = async function(args, ctx) {
        const state = await probe(args, ctx) || {};
        const wanted = args && args.chatId ? String(args.chatId) : "";
        if (wanted && wanted !== currentChatId()) state.generating = false;
        return Ops.buildHostState(id, state, lastAssistantTurn());
      };
    }
    CE2.platforms[id] = { id, getData, chatId: currentChatId, ops };
    function mount() {
      if (typeof CE2.isPlatformEnabled === "function" && !CE2.isPlatformEnabled(id)) {
        removeBar(CE2, id);
        return;
      }
      if (typeof spec.active === "function" && !spec.active()) return;
      const found = typeof spec.composer === "function" ? spec.composer() : null;
      if (!found || !found.el) return;
      const existing = document.querySelector("[" + CE2.BAR_ATTR + '="' + id + '"]');
      const sameVer = existing && existing.getAttribute("data-chat-export-v") === CE2.EXT_VERSION;
      const existingOk = existing && existing.isConnected && sameVer && found.el.contains(existing) && existing.getBoundingClientRect().width > 0;
      if (existingOk) return;
      if (existing) removeBar(CE2, id);
      const nativeFrom = found.nativeFrom || null;
      const nativeIconFrom = found.nativeIconFrom || null;
      CE2.injectBar(found.el, {
        platform: id,
        modifier,
        insertAfter: found.insertAfter || null,
        beforeChild: found.beforeChild || null,
        placement: found.placement,
        nativeFrom,
        nativeClass: found.nativeClass || (nativeFrom ? String(nativeFrom.className || "").trim() : ""),
        nativeIconFrom,
        nativeIconClass: found.nativeIconClass || (nativeIconFrom ? String(nativeIconFrom.className || "").trim() : ""),
        downloadSvg: found.downloadSvg || spec.downloadSvg,
        getData
      });
    }
    CE2.observe(mount);
    if (typeof CE2.onPlatformSettings === "function") {
      CE2.onPlatformSettings(function() {
        mount();
      });
    }
    return mount;
  }

  // src/rpc.js
  var RPC_TYPE = "chat-export-rpc";
  var PING_TYPE = "chat-export-ping";
  var ERROR_CODES = [
    "PLATFORM_DISABLED",
    "NOT_BOUND",
    "CONFIRM_REQUIRED",
    "DESTRUCTIVE_DISABLED",
    "UNAUTHORIZED",
    "TIMEOUT",
    "HOST_ERROR",
    "NOT_FOUND",
    "BAD_REQUEST",
    "OPTION_NOT_FOUND",
    "OPTION_LOCKED",
    "ATTACH_UNSUPPORTED",
    "FILE_NOT_ALLOWED",
    "FILE_TOO_LARGE",
    "ATTACH_TIMEOUT",
    "INVALID_ARGS",
    "PLATFORM_BUSY",
    "RATE_LIMIT"
  ];
  var RETRYABLE_CODES = ["PLATFORM_BUSY", "RATE_LIMIT"];
  var OP_HOOK = {
    "chats.list": "list",
    "chats.get": "get",
    "chats.export": null,
    "chats.create": "create",
    "chats.delete": "delete",
    "chats.send": "send",
    "platform.capabilities": "capabilities",
    "containers.list": "containers",
    "containers.chats": "containerChats",
    "containers.create": "containerCreate",
    "containers.delete": "containerDelete",
    "containers.move_chat": "containerMoveChat",
    "chats.ask_selection": "askSelection",
    "chats.side_ask": "sideAsk",
    "platform.host_state": "hostState"
  };
  var RpcError = class extends Error {
    constructor(code, message, details) {
      super(message);
      this.code = code;
      if (details) this.details = details;
    }
  };
  function ok(id, data) {
    return { id, ok: true, data };
  }
  function fail(id, code, message, details) {
    const error = { code, message: String(message || code) };
    if (RETRYABLE_CODES.indexOf(code) >= 0) details = Object.assign({}, details, { retryable: true });
    if (details && typeof details === "object") error.details = details;
    return { id, ok: false, error };
  }
  function bytesToB64(bytes) {
    let bin = "";
    const step = 32768;
    for (let i3 = 0; i3 < bytes.length; i3 += step) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i3, i3 + step));
    }
    return btoa(bin);
  }
  function toProtocolFile(f3) {
    const file = { name: f3.filename, mime: f3.mime };
    if (typeof f3.data === "string") file.text = f3.data;
    else file.b64 = bytesToB64(f3.data instanceof Uint8Array ? f3.data : new Uint8Array(f3.data));
    return file;
  }
  function normalizePayload(platform, raw) {
    const p3 = raw || {};
    const out = {
      platform,
      url: p3.url || location.href,
      title: p3.title || "chat",
      chatId: p3.chatId || "",
      model: p3.model || "",
      userName: p3.userName || "",
      userHandle: p3.userHandle || "",
      userEmail: p3.userEmail || "",
      messages: Array.isArray(p3.messages) ? p3.messages : []
    };
    if (p3.branch === "all" || p3.branch === "active") out.branch = p3.branch;
    return out;
  }
  function loadPayload(entry, args, ctx) {
    const chatId = args && args.chatId || "";
    const branch = args && args.branch ? String(args.branch) : "active";
    if (entry.ops.get) return Promise.resolve(entry.ops.get({ chatId, branch }, ctx));
    if (!chatId || chatId === entry.chatId()) return entry.getData();
    throw new RpcError("HOST_ERROR", "not implemented");
  }
  function exportChat(CE2, entry, args, ctx) {
    const formats = Array.isArray(args.formats) ? args.formats : [];
    if (!formats.length) throw new RpcError("BAD_REQUEST", "formats must be a non-empty array");
    return Promise.resolve(loadPayload(entry, args, ctx)).then(function(raw) {
      const payload = normalizePayload(entry.id, raw);
      return CE2.buildExportBundle(Object.assign({}, payload, { formats })).then(function(bundle) {
        return { files: bundle.files.map(toProtocolFile), payload };
      });
    });
  }
  function runOp(CE2, entry, op, args) {
    const ctx = { platform: entry.id, getData: entry.getData, chatId: entry.chatId, CE: CE2 };
    if (op === "chats.export") return exportChat(CE2, entry, args, ctx);
    if (op === "chats.get") {
      return Promise.resolve(loadPayload(entry, args, ctx)).then(function(raw) {
        return normalizePayload(entry.id, raw);
      });
    }
    const hook = entry.ops[OP_HOOK[op]];
    if (!hook) {
      if (op === "containers.list" || op === "containers.chats") {
        return { items: [], nextCursor: null };
      }
      if (op === "containers.create" || op === "containers.delete" || op === "containers.move_chat") {
        throw new RpcError("HOST_ERROR", "not implemented");
      }
      if (op === "chats.side_ask") {
        throw new RpcError("HOST_ERROR", "side chat is only supported on grok");
      }
      throw new RpcError("HOST_ERROR", "not implemented");
    }
    return hook(args, ctx);
  }
  function dispatchRpc(msg) {
    const CE2 = window.ChatExport;
    const id = String(msg && msg.id || "");
    const op = msg && msg.op;
    const platform = msg && msg.platform;
    const args = msg && msg.args || {};
    if (!Object.prototype.hasOwnProperty.call(OP_HOOK, op)) {
      return Promise.resolve(fail(id, "BAD_REQUEST", "unknown op: " + op));
    }
    if (CE2 && typeof CE2.isPlatformEnabled === "function" && !CE2.isPlatformEnabled(platform)) {
      return Promise.resolve(fail(id, "PLATFORM_DISABLED", "platform " + platform + " is disabled"));
    }
    const entry = CE2 && CE2.platforms[platform];
    if (!entry) {
      return Promise.resolve(fail(id, "NOT_FOUND", "platform " + platform + " is not loaded in this tab"));
    }
    return Promise.resolve().then(function() {
      return runOp(CE2, entry, op, args);
    }).then(
      function(data) {
        return ok(id, data);
      },
      function(err) {
        const code = err && ERROR_CODES.indexOf(err.code) >= 0 ? err.code : "HOST_ERROR";
        return fail(id, code, err && err.message || err, err && err.details);
      }
    );
  }
  function installRpcListener() {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.onMessage) return;
    const gen = (Number(window.__chatExportRpcGen) || 0) + 1;
    window.__chatExportRpcGen = gen;
    chrome.runtime.onMessage.addListener(function(msg, _sender, sendResponse) {
      if (!msg || window.__chatExportRpcGen !== gen) return false;
      if (msg.type === PING_TYPE) {
        const CE2 = window.ChatExport;
        sendResponse({ ok: true, platforms: CE2 && CE2.platforms ? Object.keys(CE2.platforms) : [] });
        return false;
      }
      if (msg.type !== RPC_TYPE) return false;
      dispatchRpc(msg).then(sendResponse);
      return true;
    });
  }

  // src/ops/helpers.js
  var helpers_exports = {};
  __export(helpers_exports, {
    OPS_CONST: () => OPS_CONST,
    buildHostState: () => buildHostState,
    clampLimit: () => clampLimit,
    classifyBusyText: () => classifyBusyText,
    clickEl: () => clickEl,
    closeMenu: () => closeMenu,
    composerReady: () => composerReady,
    detectBusyBanner: () => detectBusyBanner,
    dispatchEnter: () => dispatchEnter,
    ensureComposerSubmitted: () => ensureComposerSubmitted,
    fillEditable: () => fillEditable,
    fillRichComposer: () => fillRichComposer,
    findBusyBanners: () => findBusyBanners,
    findStopControl: () => findStopControl,
    guardBusy: () => guardBusy,
    hostErr: () => hostErr,
    locateMenuRoot: () => locateMenuRoot,
    matchOption: () => matchOption,
    matchQuery: () => matchQuery,
    normalizeId: () => normalizeId,
    openMenu: () => openMenu,
    pickMenuItem: () => pickMenuItem,
    quoteSelectionPrompt: () => quoteSelectionPrompt,
    readMenuItems: () => readMenuItems,
    setFileInputFiles: () => setFileInputFiles,
    setNativeValue: () => setNativeValue,
    sleep: () => sleep,
    softNavigate: () => softNavigate,
    testTitle: () => testTitle,
    throwBusy: () => throwBusy,
    toIso: () => toIso,
    waitAttachChips: () => waitAttachChips,
    waitFor: () => waitFor
  });

  // src/ops/menu.js
  var ITEM_ROLES = ["menuitem", "menuitemcheckbox", "menuitemradio", "option"];
  function pageView(doc) {
    return doc && doc.defaultView || (typeof window !== "undefined" ? window : null);
  }
  function isVisible(el) {
    if (!el || !el.isConnected) return false;
    var r3 = el.getBoundingClientRect();
    if (r3.width <= 0 || r3.height <= 0) return false;
    var st = pageView(el.ownerDocument);
    if (st && st.getComputedStyle) {
      var cs = st.getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false;
    }
    return true;
  }
  function itemLabel(el) {
    var bits = [];
    var aria = el.getAttribute("aria-label");
    if (aria) bits.push(aria.trim());
    var labelled = el.getAttribute("aria-labelledby");
    if (labelled && el.ownerDocument) {
      var parts = labelled.split(/\s+/);
      for (var i3 = 0; i3 < parts.length; i3++) {
        var ref = el.ownerDocument.getElementById(parts[i3]);
        if (ref) bits.push((ref.textContent || "").replace(/\s+/g, " ").trim());
      }
    }
    bits.push((el.textContent || "").replace(/\s+/g, " ").trim());
    return bits.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  }
  function isLockedItem(el, label) {
    if (!el) return false;
    if (el.getAttribute("data-locked") === "true" || el.getAttribute("aria-disabled") === "true") {
      var t3 = (label || "").toLowerCase();
      if (/pro\+|max|upgrade|premium|премиум|перейти на/i.test(t3)) return true;
    }
    var t22 = (label || "").toLowerCase();
    if (/\b(pro\+|pro plus|max only|agent upgrade|upgrade)\b/i.test(t22)) return true;
    if (/перейти на grok\.com/i.test(t22)) return true;
    var cls = String(el.className || "");
    if (/\blocked\b|\bdisabled\b/i.test(cls) && el.getAttribute("aria-disabled") === "true") {
      if (/pro|max|upgrade|premium/i.test(t22)) return true;
    }
    return el.getAttribute("data-ce-locked") === "true";
  }
  function menuItemNodes(root) {
    var out = [];
    var seen = /* @__PURE__ */ new Set();
    function add(el) {
      if (!el || seen.has(el)) return;
      seen.add(el);
      out.push(el);
    }
    var i3;
    var role;
    var nodes = root.querySelectorAll("[role]");
    for (i3 = 0; i3 < nodes.length; i3++) {
      role = (nodes[i3].getAttribute("role") || "").toLowerCase();
      if (ITEM_ROLES.indexOf(role) >= 0) add(nodes[i3]);
    }
    var lis = root.querySelectorAll('li[class*="ActionList-ActionListItem" i], li.prc-ActionList-ActionListItem');
    for (i3 = 0; i3 < lis.length; i3++) add(lis[i3]);
    if (root.getAttribute && ITEM_ROLES.indexOf((root.getAttribute("role") || "").toLowerCase()) >= 0) {
      add(root);
    }
    return out;
  }
  function locateMenuRoot(doc, trigger) {
    if (!doc) return null;
    if (trigger) {
      var controls = trigger.getAttribute("aria-controls");
      if (controls) {
        var ids = String(controls).split(/\s+/);
        for (var c3 = 0; c3 < ids.length; c3++) {
          var linked = doc.getElementById(ids[c3]);
          if (linked && linked.isConnected) return linked;
        }
      }
      var expanded = trigger.getAttribute("aria-expanded");
      if (expanded === "true") {
        var next = trigger.nextElementSibling;
        if (next && (next.querySelector("li") || next.getAttribute("role") === "menu")) return next;
      }
    }
    var menus = doc.querySelectorAll('[role="menu"], [role="listbox"]');
    var i3;
    for (i3 = menus.length - 1; i3 >= 0; i3--) {
      if (isVisible(menus[i3])) return menus[i3];
    }
    var portals = doc.querySelectorAll(
      '#__primerPortalRoot__, [id*="primer-portal" i], [data-portal], [data-radix-popper-content-wrapper]'
    );
    for (i3 = portals.length - 1; i3 >= 0; i3--) {
      if (!portals[i3].querySelector) continue;
      var portalMenu = portals[i3].querySelector(
        '[role="menu"], [role="listbox"], [data-testid="action-list"], ul[class*="ActionList" i]'
      );
      if (portalMenu && (isVisible(portalMenu) || portalMenu.querySelector("li"))) return portalMenu;
      if (portals[i3].querySelector("li") && isVisible(portals[i3])) return portals[i3];
    }
    var overlays = doc.querySelectorAll(
      '[data-testid="action-list"], [class*="ActionList" i], ul.prc-ActionList-ActionList'
    );
    for (i3 = overlays.length - 1; i3 >= 0; i3--) {
      if (!isVisible(overlays[i3]) && !overlays[i3].querySelector("li")) continue;
      var inner = overlays[i3].querySelector('[role="menu"], [role="listbox"], ul');
      if (inner && (isVisible(inner) || inner.querySelector("li"))) return inner;
      if (overlays[i3].querySelector("li")) return overlays[i3];
    }
    return null;
  }
  async function openMenu(trigger, opts) {
    opts = opts || {};
    if (!trigger) throw new Error("menu trigger missing");
    var doc = trigger.ownerDocument;
    var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 1e4;
    var attempts = opts.retries != null ? opts.retries : 2;
    var a3;
    var lastErr = null;
    for (a3 = 0; a3 <= attempts; a3++) {
      if (a3 > 0) closeMenu(doc);
      clickEl(trigger);
      try {
        return await waitFor(
          function() {
            return locateMenuRoot(doc, trigger);
          },
          Object.assign({}, opts, {
            timeoutMs: Math.floor(timeoutMs / (attempts + 1)) + (a3 === attempts ? 2e3 : 0),
            message: opts.message || "menu did not open"
          })
        );
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error("menu did not open");
  }
  function readMenuItems(root) {
    if (!root) return [];
    var nodes = menuItemNodes(root);
    var items = [];
    var i3;
    var el;
    var role;
    var label;
    var checked;
    for (i3 = 0; i3 < nodes.length; i3++) {
      el = nodes[i3];
      role = (el.getAttribute("role") || "").toLowerCase();
      if (!role && el.tagName === "LI") role = "menuitem";
      label = itemLabel(el);
      checked = null;
      if (role === "menuitemcheckbox" || role === "menuitemradio" || role === "option") {
        var ac = el.getAttribute("aria-checked");
        if (ac === "true" || ac === "false") checked = ac === "true";
        else if (el.getAttribute("aria-selected") === "true") checked = true;
      }
      var disabled = el.getAttribute("aria-disabled") === "true" || el.hasAttribute("disabled") || el.getAttribute("data-disabled") === "true";
      items.push({
        el,
        role,
        label,
        checked,
        disabled,
        locked: isLockedItem(el, label)
      });
    }
    return items;
  }
  function matchMenuItem(item, matcher) {
    if (typeof matcher === "function") return !!matcher(item);
    if (matcher instanceof RegExp) return matcher.test(item.label || "");
    var m3 = String(matcher || "").trim().toLowerCase();
    if (!m3) return false;
    var label = String(item.label || "").toLowerCase();
    return label === m3 || label.indexOf(m3) >= 0;
  }
  function pickMenuItem(root, matcher, opts) {
    opts = opts || {};
    var maxScroll = opts.maxScroll != null ? opts.maxScroll : 40;
    var s3;
    for (s3 = 0; s3 <= maxScroll; s3++) {
      var items = readMenuItems(root);
      var i3;
      for (i3 = 0; i3 < items.length; i3++) {
        if (items[i3].disabled) continue;
        if (matchMenuItem(items[i3], matcher)) {
          try {
            if (items[i3].el.scrollIntoView) items[i3].el.scrollIntoView({ block: "nearest" });
          } catch (e3) {
          }
          clickEl(items[i3].el);
          return items[i3];
        }
      }
      var scroller = root.scrollHeight > root.clientHeight + 4 && root || root.querySelector('[style*="overflow"], [class*="Scroll" i], ul') || root;
      if (scroller && scroller.scrollTop != null) {
        var before = scroller.scrollTop;
        scroller.scrollTop = before + Math.max(48, Math.floor((scroller.clientHeight || 120) * 0.8));
        if (scroller.scrollTop === before) break;
      } else {
        break;
      }
    }
    return null;
  }
  function closeMenu(doc) {
    doc = doc || (typeof document !== "undefined" ? document : null);
    if (!doc) return;
    var view = pageView(doc);
    var keyInit = { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true, cancelable: true };
    var target = doc.body || doc.documentElement;
    try {
      target.dispatchEvent(new view.KeyboardEvent("keydown", keyInit));
      target.dispatchEvent(new view.KeyboardEvent("keyup", keyInit));
    } catch (e3) {
      target.dispatchEvent(new KeyboardEvent("keydown", keyInit));
      target.dispatchEvent(new KeyboardEvent("keyup", keyInit));
    }
  }

  // src/ops/files.js
  function b64ToBytes(b64) {
    var bin = atob(String(b64 || ""));
    var out = new Uint8Array(bin.length);
    var i3;
    for (i3 = 0; i3 < bin.length; i3++) out[i3] = bin.charCodeAt(i3);
    return out;
  }
  function assignInputFiles(input, fileList) {
    try {
      input.files = fileList;
      if (input.files && input.files.length) return;
    } catch (e3) {
    }
    try {
      Object.defineProperty(input, "files", { configurable: true, writable: true, value: fileList });
    } catch (e22) {
      hostErr("ATTACH_UNSUPPORTED", e22 && e22.message || "cannot set file input");
    }
  }
  function setFileInputFiles(input, wireFiles) {
    if (!input || String(input.type || "").toLowerCase() !== "file") {
      hostErr("ATTACH_UNSUPPORTED", "file input not found");
    }
    var list = Array.isArray(wireFiles) ? wireFiles : [];
    if (!list.length) return 0;
    var doc = input.ownerDocument;
    var view = doc.defaultView || window;
    if (!view || !view.File || !view.DataTransfer) {
      hostErr("ATTACH_UNSUPPORTED", "File/DataTransfer unavailable");
    }
    var dt = new view.DataTransfer();
    var i3;
    var wf;
    var bytes;
    var file;
    for (i3 = 0; i3 < list.length; i3++) {
      wf = list[i3] || {};
      bytes = b64ToBytes(wf.b64);
      if (wf.size != null && Number(wf.size) >= 0 && bytes.length > Number(wf.size)) {
        hostErr("FILE_TOO_LARGE", wf.name || "file");
      }
      file = new view.File([bytes], wf.name || "upload.bin", { type: wf.mime || "application/octet-stream" });
      dt.items.add(file);
    }
    assignInputFiles(input, dt.files);
    try {
      input.dispatchEvent(new view.Event("input", { bubbles: true }));
      input.dispatchEvent(new view.Event("change", { bubbles: true }));
    } catch (e3) {
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return dt.files.length;
  }
  function countAttachChips(root) {
    if (!root || !root.querySelectorAll) return 0;
    var sel = [
      '[data-testid*="attach" i]:not(button):not(input)',
      '[data-testid*="file-chip" i]',
      '[data-testid*="composer-attachment" i]',
      '[class*="AttachmentChip" i]',
      '[class*="attachment-chip" i]',
      '[class*="file-chip" i]',
      '[aria-label*="attached file" i]',
      '[aria-label*="\u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B" i]'
    ].join(",");
    var nodes = root.querySelectorAll(sel);
    var n2 = 0;
    var i3;
    for (i3 = 0; i3 < nodes.length; i3++) {
      if (nodes[i3].tagName === "INPUT") continue;
      if (nodes[i3].getAttribute && nodes[i3].getAttribute("role") === "progressbar") continue;
      n2++;
    }
    return n2;
  }
  function inputHasFiles(input, n2, names) {
    if (!input || !input.files) return false;
    if (input.files.length < n2) return false;
    if (!names || !names.length) return true;
    var have = {};
    var i3;
    for (i3 = 0; i3 < input.files.length; i3++) have[String(input.files[i3].name || "").toLowerCase()] = true;
    for (i3 = 0; i3 < names.length; i3++) {
      if (!have[String(names[i3] || "").toLowerCase()]) return false;
    }
    return true;
  }
  function rootHasFileNames(root, names) {
    if (!root || !names || !names.length) return false;
    var text = String(root.textContent || "").toLowerCase();
    var i3;
    for (i3 = 0; i3 < names.length; i3++) {
      if (text.indexOf(String(names[i3] || "").toLowerCase()) < 0) return false;
    }
    return true;
  }
  function waitAttachChips(composer, expectedCount, opts) {
    opts = opts || {};
    var n2 = Math.max(0, Number(expectedCount) || 0);
    if (n2 === 0) return Promise.resolve(0);
    var root = composer && composer.querySelectorAll ? composer : document;
    var names = Array.isArray(opts.names) ? opts.names : null;
    var fileInput = opts.fileInput || null;
    var baseMs = opts.timeoutMs != null ? opts.timeoutMs : Math.min(12e4, 45e3 + n2 * 2e4);
    return waitFor(
      function() {
        if (fileInput && inputHasFiles(fileInput, n2, names)) {
          var chipsReady = countAttachChips(root) >= n2 || rootHasFileNames(root, names);
          var spinners = root.querySelectorAll(
            '[role="progressbar"], [data-testid*="spinner" i], [class*="spinner" i]'
          );
          if (chipsReady && (spinners.length === 0 || opts.allowSpinner)) return n2;
          if (inputHasFiles(fileInput, n2, names) && (spinners.length === 0 || opts.allowSpinner)) return n2;
        }
        var chips = countAttachChips(root);
        if (names && rootHasFileNames(root, names) && chips >= 1) chips = Math.max(chips, names.length);
        var busy = root.querySelectorAll('[role="progressbar"], [data-testid*="spinner" i], [class*="spinner" i]');
        if (chips >= n2 && busy.length === 0) return chips;
        if (chips >= n2 && opts.allowSpinner) return chips;
        return null;
      },
      {
        timeoutMs: baseMs,
        intervalMs: opts.intervalMs != null ? opts.intervalMs : 250,
        message: opts.message || "ATTACH_TIMEOUT"
      }
    );
  }

  // src/ops/options.js
  var WELL_KNOWN = [
    [/(размышлен|thinking)/i, "thinking"],
    [/(быстр|fast)/i, "fast"],
    [/(глубок[\s\S]*?исслед|deep[\s-]*research)/i, "deep-research"],
    [/(^ask\b|спроси)/i, "ask"],
    [/(agent)/i, "agent"],
    [/(авто|auto)/i, "auto"],
    [/(эксперт|expert)/i, "expert"],
    [/(тяжёл|heavy)/i, "heavy"],
    [/(build)/i, "build"],
    [/(^think\b|мысл)/i, "think"],
    [/(^efficiency\b|efficiency)/i, "efficiency"],
    [/(^balance\b|balance)/i, "balance"],
    [/(^intelligence\b|intelligence)/i, "intelligence"],
    [/(сфокусир|focused)/i, "focused"]
  ];
  function stripDiacritics(s3) {
    try {
      return String(s3).normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
    } catch (e3) {
      return String(s3);
    }
  }
  function normalizeId(label) {
    var raw = String(label == null ? "" : label).trim();
    if (!raw) return "";
    var i3;
    for (i3 = 0; i3 < WELL_KNOWN.length; i3++) {
      if (WELL_KNOWN[i3][0].test(raw)) return WELL_KNOWN[i3][1];
    }
    return stripDiacritics(raw).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function normToken(s3) {
    return stripDiacritics(String(s3 || "")).trim().toLowerCase();
  }
  function matchOption(options, wanted) {
    if (!wanted && wanted !== 0) return null;
    if (!Array.isArray(options) || !options.length) return null;
    var w4 = normToken(wanted);
    var slug = normalizeId(wanted);
    var i3;
    var opt;
    for (i3 = 0; i3 < options.length; i3++) {
      opt = options[i3];
      if (!opt) continue;
      if (normToken(opt.id) === w4 || normToken(opt.label) === w4) return opt;
      if (slug && (normToken(opt.id) === slug || normalizeId(opt.label) === slug)) return opt;
    }
    for (i3 = 0; i3 < options.length; i3++) {
      opt = options[i3];
      if (!opt) continue;
      if (w4 && normToken(opt.label).indexOf(w4) >= 0) return opt;
      if (slug && normalizeId(opt.label).indexOf(slug) >= 0) return opt;
    }
    return null;
  }

  // src/ops/helpers.js
  var LIST_LIMIT_MAX = 100;
  var LIST_LIMIT_DEFAULT = 20;
  var TEST_PREFIX = "[ce-test]";
  function sleep(ms) {
    return new Promise(function(resolve) {
      setTimeout(resolve, Math.max(0, Number(ms) || 0));
    });
  }
  function clampLimit(n2) {
    var v3 = Number(n2);
    if (!Number.isFinite(v3) || v3 < 1) return LIST_LIMIT_DEFAULT;
    return Math.min(LIST_LIMIT_MAX, Math.floor(v3));
  }
  function matchQuery(title, query) {
    var q3 = String(query || "").trim().toLowerCase();
    if (!q3) return true;
    return String(title || "").toLowerCase().indexOf(q3) >= 0;
  }
  function toIso(value) {
    if (value == null || value === "") return null;
    if (typeof value === "number" && Number.isFinite(value)) {
      var ms = value < 1e12 ? value * 1e3 : value;
      var d3 = new Date(ms);
      return Number.isNaN(d3.getTime()) ? null : d3.toISOString();
    }
    var s3 = String(value).trim();
    if (!s3) return null;
    if (/^\d+(\.\d+)?$/.test(s3)) return toIso(Number(s3));
    var d22 = new Date(s3);
    return Number.isNaN(d22.getTime()) ? null : d22.toISOString();
  }
  function testTitle(title) {
    var t3 = String(title || "").trim();
    if (!t3) return TEST_PREFIX + " chat";
    if (t3.indexOf(TEST_PREFIX) === 0) return t3;
    return TEST_PREFIX + " " + t3;
  }
  function quoteSelectionPrompt(selection, prompt) {
    var sel = String(selection || "").trim();
    var q3 = String(prompt || "").trim();
    if (!sel) return q3;
    var quoted = sel.split(/\r?\n/).map(function(line) {
      return "> " + line;
    }).join("\n");
    if (!q3) return quoted;
    return quoted + "\n\n" + q3;
  }
  function waitFor(check, opts) {
    opts = opts || {};
    var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 3e4;
    var intervalMs = opts.intervalMs != null ? opts.intervalMs : 200;
    var started = Date.now();
    return new Promise(function(resolve, reject) {
      function tick() {
        var v3;
        try {
          v3 = check();
        } catch (err) {
          reject(err);
          return;
        }
        if (v3) {
          resolve(v3);
          return;
        }
        if (Date.now() - started >= timeoutMs) {
          reject(new Error(opts.message || "timeout"));
          return;
        }
        setTimeout(tick, intervalMs);
      }
      tick();
    });
  }
  function setNativeValue(el, value) {
    if (!el) return;
    var view = el.ownerDocument.defaultView || window;
    var proto = el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    var desc = Object.getOwnPropertyDescriptor(proto, "value");
    try {
      if (desc && desc.set) desc.set.call(el, value);
      else el.value = value;
    } catch (e3) {
      try {
        el.value = value;
      } catch (e22) {
      }
    }
    try {
      el.dispatchEvent(new view.Event("input", { bubbles: true }));
      el.dispatchEvent(new view.Event("change", { bubbles: true }));
    } catch (e3) {
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
  function fillEditable(el, text) {
    if (!el) throw new Error("composer not found");
    var value = String(text == null ? "" : text);
    var view = el.ownerDocument.defaultView || window;
    try {
      el.focus();
    } catch (e3) {
    }
    if (el.isContentEditable || el.getAttribute("contenteditable") === "true") {
      el.textContent = value;
      try {
        el.dispatchEvent(
          new view.InputEvent("input", {
            bubbles: true,
            cancelable: true,
            data: value,
            inputType: "insertText"
          })
        );
      } catch (e22) {
        el.dispatchEvent(new view.Event("input", { bubbles: true }));
      }
      return;
    }
    setNativeValue(el, value);
  }
  function selectEditableContents(el) {
    try {
      var view = el.ownerDocument.defaultView || window;
      var sel = view.getSelection();
      var range = el.ownerDocument.createRange();
      range.selectNodeContents(el);
      sel.removeAllRanges();
      sel.addRange(range);
      return true;
    } catch (e3) {
      return false;
    }
  }
  function editableHasText(el, value) {
    var cur = String(el && (el.innerText || el.textContent) || "").replace(/\u00a0/g, " ").trim();
    var want = String(value || "").replace(/\u00a0/g, " ").trim();
    if (!want) return !!cur;
    if (cur === want) return true;
    return cur.indexOf(want.slice(0, Math.min(24, want.length))) >= 0;
  }
  function fillRichComposer(el, text) {
    if (!el) throw new Error("composer not found");
    var value = String(text == null ? "" : text);
    var view = el.ownerDocument.defaultView || window;
    try {
      el.focus();
    } catch (e3) {
    }
    selectEditableContents(el);
    try {
      var dt = new view.DataTransfer();
      dt.setData("text/plain", value);
      var pasteEv;
      try {
        pasteEv = new view.ClipboardEvent("paste", {
          bubbles: true,
          cancelable: true,
          clipboardData: dt
        });
      } catch (ePaste) {
        pasteEv = new view.Event("paste", { bubbles: true, cancelable: true });
        try {
          Object.defineProperty(pasteEv, "clipboardData", { value: dt });
        } catch (eProp) {
        }
      }
      el.dispatchEvent(pasteEv);
    } catch (e22) {
    }
    if (editableHasText(el, value)) return "paste";
    try {
      el.dispatchEvent(
        new view.InputEvent("beforeinput", {
          bubbles: true,
          cancelable: true,
          data: value,
          inputType: "insertFromPaste"
        })
      );
      el.dispatchEvent(
        new view.InputEvent("input", {
          bubbles: true,
          cancelable: true,
          data: value,
          inputType: "insertFromPaste"
        })
      );
    } catch (e3) {
    }
    if (editableHasText(el, value)) return "beforeinput";
    try {
      selectEditableContents(el);
      if (el.ownerDocument.execCommand("insertText", false, value) && editableHasText(el, value)) {
        return "execCommand";
      }
    } catch (e4) {
    }
    fillEditable(el, value);
    return editableHasText(el, value) ? "textContent" : "failed";
  }
  function clickEl(el) {
    if (!el) throw new Error("click target missing");
    var view = el.ownerDocument.defaultView || window;
    var ME = view.MouseEvent || MouseEvent;
    var PE = view.PointerEvent || null;
    if (typeof el.scrollIntoView === "function") {
      try {
        el.scrollIntoView({ block: "nearest", inline: "nearest" });
      } catch (e3) {
      }
    }
    var rect = el.getBoundingClientRect();
    var x4 = rect.left + Math.max(1, Math.min(rect.width / 2, 12));
    var y3 = rect.top + Math.max(1, Math.min(rect.height / 2, 12));
    var down = {
      bubbles: true,
      cancelable: true,
      view,
      clientX: x4,
      clientY: y3,
      screenX: x4,
      screenY: y3,
      button: 0,
      buttons: 1,
      detail: 1,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true
    };
    var up = Object.assign({}, down, { buttons: 0 });
    if (PE) el.dispatchEvent(new PE("pointerdown", down));
    el.dispatchEvent(new ME("mousedown", down));
    if (PE) el.dispatchEvent(new PE("pointerup", up));
    el.dispatchEvent(new ME("mouseup", up));
    el.dispatchEvent(new ME("click", up));
  }
  function dispatchEnter(el) {
    if (!el) return;
    var view = el.ownerDocument.defaultView || window;
    try {
      el.focus();
    } catch (e3) {
    }
    var init = {
      key: "Enter",
      code: "Enter",
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
      view
    };
    try {
      el.dispatchEvent(new view.KeyboardEvent("keydown", init));
      el.dispatchEvent(new view.KeyboardEvent("keypress", init));
      el.dispatchEvent(new view.KeyboardEvent("keyup", init));
    } catch (e22) {
      el.dispatchEvent(new KeyboardEvent("keydown", init));
      el.dispatchEvent(new KeyboardEvent("keyup", init));
    }
  }
  async function ensureComposerSubmitted(opts) {
    opts = opts || {};
    var send = opts.send;
    var input = opts.input;
    var isDone = opts.isDone;
    if (typeof isDone !== "function") throw new Error("isDone required");
    var timeoutMs = opts.timeoutMs != null ? opts.timeoutMs : 5e3;
    if (send) clickEl(send);
    try {
      await waitFor(isDone, { timeoutMs: 1200, intervalMs: 100, message: "click submit pending" });
      return "click";
    } catch (e1) {
    }
    if (input) dispatchEnter(input);
    if (send && !(send.disabled || send.getAttribute("aria-disabled") === "true")) {
      clickEl(send);
    }
    await waitFor(isDone, {
      timeoutMs,
      intervalMs: 150,
      message: opts.message || "composer submit failed"
    });
    return "retry";
  }
  function softNavigate(path) {
    var url = path;
    if (path.indexOf("http") !== 0) {
      url = location.origin + (path.charAt(0) === "/" ? path : "/" + path);
    }
    if (location.href === url) return;
    history.pushState({}, "", url);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }
  var OPS_CONST = Object.freeze({
    LIST_LIMIT_MAX,
    LIST_LIMIT_DEFAULT,
    TEST_PREFIX
  });
  function hostErr(code, message, details) {
    var CE2 = typeof window !== "undefined" && window.ChatExport;
    if (CE2 && typeof CE2.RpcError === "function") {
      throw new CE2.RpcError(code, message, details);
    }
    var err = new Error(message);
    err.code = code;
    if (details) err.details = details;
    throw err;
  }
  var RATE_LIMIT_RE = /rate.?limit|too many (requests|messages)|usage limit|message limit|limit reached|reached (your|the) (\w+ )?(limit|cap)|quota|слишком много (запросов|сообщений)|лимит (запросов|сообщений)|достигнут\S* (\S+ )?лимит|превышен\S* (\S+ )?лимит/i;
  var PLATFORM_BUSY_RE = /heavy (load|usage|traffic)|high demand|(at|over) capacity|overloaded|temporarily unavailable|service unavailable|something went wrong|try again (later|in|shortly|soon)|перегруж|высок\S* нагрузк|временно недоступ|попробуйте (\S+ )?(позже|снова|ещ[её] раз)|что-то пошло не так/i;
  var BANNER_SELECTOR = [
    '[role="alert"]',
    '[role="alertdialog"]',
    '[role="status"]',
    '[aria-live="assertive"]',
    '[aria-live="polite"]',
    "[data-sonner-toast]",
    '[data-testid*="toast" i]',
    '[data-testid*="error" i]',
    '[data-testid*="banner" i]',
    '[class*="toast" i]',
    '[class*="banner" i]',
    '[class*="error" i]'
  ].join(",");
  var BANNER_TEXT_MAX = 400;
  var OWN_UI_SELECTOR = "[data-chat-export-bar], [data-ce-host]";
  var BUSY_OVERRIDABLE = [void 0, null, "", "HOST_ERROR", "TIMEOUT", "NOT_FOUND", "ATTACH_TIMEOUT"];
  function bannerText(el) {
    return String(el && (el.innerText || el.textContent) || "").replace(/\s+/g, " ").trim();
  }
  function bannerVisible(el) {
    if (el.hidden || el.getAttribute("aria-hidden") === "true") return false;
    if (typeof el.checkVisibility === "function") {
      try {
        return el.checkVisibility();
      } catch (e3) {
      }
    }
    return true;
  }
  function insideHit(hits, el) {
    for (var i3 = 0; i3 < hits.length; i3++) {
      if (hits[i3].el === el || hits[i3].el.contains(el)) return true;
    }
    return false;
  }
  function classifyBusyText(text) {
    var t3 = String(text || "");
    if (!t3 || t3.length > BANNER_TEXT_MAX) return null;
    if (RATE_LIMIT_RE.test(t3)) return "RATE_LIMIT";
    if (PLATFORM_BUSY_RE.test(t3)) return "PLATFORM_BUSY";
    return null;
  }
  function findBusyBanners(root, extra) {
    root = root || document;
    var nodes = Array.prototype.slice.call(root.querySelectorAll(BANNER_SELECTOR));
    if (extra) nodes = nodes.concat(Array.isArray(extra) ? extra : [extra]);
    var out = [];
    for (var i3 = 0; i3 < nodes.length; i3++) {
      var el = nodes[i3];
      if (!el || insideHit(out, el)) continue;
      if (el.closest && el.closest(OWN_UI_SELECTOR)) continue;
      if (!bannerVisible(el)) continue;
      var text = bannerText(el);
      var code = classifyBusyText(text);
      if (code) out.push({ el, code, text });
    }
    return out;
  }
  function detectBusyBanner(root, extra) {
    var hits = findBusyBanners(root, extra);
    for (var i3 = 0; i3 < hits.length; i3++) if (hits[i3].code === "RATE_LIMIT") return hits[i3];
    return hits[0] || null;
  }
  function throwBusy(hit) {
    hostErr(hit.code, hit.text, { retryable: true, banner: hit.text });
  }
  async function guardBusy(run, candidates) {
    var collect = typeof candidates === "function" ? candidates : function() {
      return null;
    };
    var before = findBusyBanners(document, collect()).map(function(h3) {
      return h3.el;
    });
    function fresh() {
      var hits = findBusyBanners(document, collect()).filter(function(h3) {
        return before.indexOf(h3.el) < 0;
      });
      for (var i3 = 0; i3 < hits.length; i3++) if (hits[i3].code === "RATE_LIMIT") return hits[i3];
      return hits[0] || null;
    }
    var result;
    try {
      result = await run();
    } catch (err) {
      var hit = BUSY_OVERRIDABLE.indexOf(err && err.code) >= 0 ? fresh() : null;
      if (hit) throwBusy(hit);
      throw err;
    }
    var after = fresh();
    if (after) throwBusy(after);
    return result;
  }
  var STOP_LABEL_RE = /^(stop|cancel response|останов\S*|прерв\S*|стоп)(\s|$)/i;
  function findStopControl(root) {
    root = root || document;
    var btns = root.querySelectorAll('button, [role="button"]');
    for (var i3 = 0; i3 < btns.length; i3++) {
      var b3 = btns[i3];
      if (b3.closest && b3.closest(OWN_UI_SELECTOR)) continue;
      var testId = b3.getAttribute("data-testid") || "";
      var label = (b3.getAttribute("aria-label") || b3.getAttribute("title") || "").trim();
      if (!/stop/i.test(testId) && !STOP_LABEL_RE.test(label)) continue;
      if (b3.disabled || b3.getAttribute("aria-disabled") === "true" || !bannerVisible(b3)) continue;
      return b3;
    }
    return null;
  }
  function composerReady(el) {
    if (!el || !el.isConnected) return false;
    if (el.disabled || el.readOnly) return false;
    if (el.getAttribute("aria-disabled") === "true") return false;
    if (el.getAttribute("contenteditable") === "false") return false;
    return true;
  }
  function buildHostState(platform, state, candidates) {
    var hit = detectBusyBanner(document, candidates || null);
    return {
      platform,
      generating: !!(state && state.generating),
      busy: !!hit,
      banner: hit ? hit.text : null,
      composerReady: !!(state && state.composerReady)
    };
  }

  // src/boot.js
  var CE = window.ChatExport;
  if (CE) {
    CE.injectBar = injectBar;
    CE.definePlatform = definePlatform;
    CE.dispatchRpc = dispatchRpc;
    CE.RpcError = RpcError;
    CE.Ops = helpers_exports;
    CE.isPlatformEnabled = isPlatformEnabled;
    CE.onPlatformSettings = onPlatformSettings;
    installPlatformGate();
    installRpcListener();
  }
})();
