(function () {
  'use strict';

  var SOURCE_KEYS = /^(citations|sources|webResults|searchResults|webSearchResults|citedWebSearchResults|xposts)$/i;
  var HTTP_RE = /^https?:\/\//i;

  function fiberOf(el) {
    if (!el) return null;
    var keys = Object.keys(el);
    for (var i = 0; i < keys.length; i++) {
      if (keys[i].indexOf('__reactFiber$') === 0 || keys[i].indexOf('__reactInternalInstance$') === 0) {
        return el[keys[i]];
      }
    }
    return null;
  }

  function isCdnUrl(url) {
    if (/\.(js|css|woff2?|png|jpe?g|gif|svg|webp|ico)(\?|$)/i.test(url)) return true;
    if (/cookielaw|onetrust|google\.com\/s2\/favicons|images\.openai\.com/i.test(url)) return true;
    try {
      var h = new URL(url).hostname;
      if (/(^|\.)(grok\.com|chatgpt\.com|oaistatic\.com|gstatic\.com|auth0\.com|twimg\.com|abs\.twimg\.com)$/i.test(h)) return true;
      // Keep x.com/twitter.com status permalinks; drop pure app chrome paths later in adapters.
    } catch (e) {
      return true;
    }
    return false;
  }

  function pushUrl(url, title, out, seen) {
    if (!HTTP_RE.test(url) || seen[url] || isCdnUrl(url)) return;
    seen[url] = true;
    out.push({
      title: String(title || url).replace(/\s+/g, ' ').trim() || url,
      url: url
    });
  }

  function pushItem(item, out, seen) {
    if (!item || typeof item !== 'object') return;
    var url = item.url || item.uri || item.href || '';
    pushUrl(url, item.title || item.name || item.text || '', out, seen);
  }

  function harvestFromProps(props, out, seen) {
    if (!props || typeof props !== 'object') return;
    var response = props.response;
    if (response && typeof response === 'object') {
      var cited = response.citedWebSearchResults || [];
      var web = response.webSearchResults || [];
      var xposts = response.xposts || [];
      var i;
      for (i = 0; i < cited.length; i++) pushItem(cited[i], out, seen);
      if (!cited.length) {
        for (i = 0; i < web.length; i++) pushItem(web[i], out, seen);
      }
      for (i = 0; i < xposts.length; i++) pushItem(xposts[i], out, seen);
    }
    var keys = Object.keys(props);
    for (var k = 0; k < keys.length; k++) {
      var key = keys[k];
      var val = props[key];
      if (SOURCE_KEYS.test(key) && Array.isArray(val)) {
        for (var a = 0; a < val.length; a++) pushItem(val[a], out, seen);
      } else if (typeof val === 'string' && /^(url|href|uri)$/i.test(key)) {
        pushUrl(val, props.title || props.name || '', out, seen);
      }
    }
  }

  function harvest(el) {
    var out = [];
    var seen = Object.create(null);
    var start = el.querySelector('[data-testid="assistant-message"]') || el;
    var fiber = fiberOf(start) || fiberOf(el);
    var hops = 0;
    while (fiber && hops < 32) {
      harvestFromProps(fiber.memoizedProps, out, seen);
      fiber = fiber.return;
      hops += 1;
    }
    return out;
  }

  document.addEventListener(
    'chat-export-harvest',
    function (ev) {
      var id = ev.detail && ev.detail.turnId;
      var el = (id && document.getElementById(id)) || (ev.target && ev.target.nodeType === 1 ? ev.target : null);
      if (!el) return;
      try {
        el.setAttribute('data-ce-sources', JSON.stringify(harvest(el)));
      } catch (e) {
        el.setAttribute('data-ce-sources', '[]');
      }
    },
    true
  );
})();
