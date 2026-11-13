(() => {
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
    var s3, h3, v3, w3, d3, _3, g3 = u3.__k || y, k3 = t3.length;
    for (l3 = q(r3, t3, g3, l3, k3), s3 = 0; s3 < k3; s3++) null != (v3 = r3.__k[s3]) && (h3 = ~v3.__i && g3[v3.__i] || p, v3.__i = s3, _3 = z(n2, v3, h3, i3, f3, o3, e3, l3, c3, a3), w3 = v3.__e, (h3.ref != v3.ref || 8 & h3.__u) && (h3.ref && G(h3.ref, null, v3, h3), v3.ref && a3.push(v3.ref, v3.__c || w3, v3)), d3 = d3 || w3, 4 & v3.__u ? (l3 = A(v3, l3, n2, !h3.__v), h3.__e && (h3.__e = null)) : "function" == typeof v3.type && void 0 !== _3 ? l3 = _3 : w3 && (l3 = w3.nextSibling), v3.__u &= -21);
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
    var s3, p3, v3, d3, k3, b2, m3, M, C3, j2, L2, H2, q2, A3, O, P2, T3, N2, V2 = r3.type;
    if (r3.constructor !== h) return null;
    128 & u3.__u && (c3 = 32 & u3.__u, s3 = u3.__c.__z) && (r3.__u |= c3, p3 = o3 = [], 8 == s3.nodeType ? l3 = B(s3, o3) : o3.push(s3), l3 = o3[0] || l3), (s3 = n.__b) && s3(r3);
    n: if ("function" == typeof V2) {
      v3 = e3.length;
      try {
        if (M = r3.props, C3 = (s3 = V2.prototype) && s3.render, j2 = (s3 = V2.contextType) && i3[s3.__c], L2 = s3 ? j2 ? j2.props.value : s3.__ : i3, (d3 = u3.__c) ? (r3.__c = d3, 2 & d3.__g && (d3.__g |= 1)) : (C3 ? r3.__c = d3 = new V2(M, L2) : (r3.__c = d3 = new x(M, L2), d3.constructor = V2, d3.render = K), j2 && j2.sub(d3), d3.state || (d3.state = {}), d3.__n = i3, d3.__g |= 8, d3.__h = [], d3.__k = []), C3 && (d3.__s || (d3.__s = d3.state), V2.getDerivedStateFromProps && (d3.__s == d3.state && (d3.__s = _({}, d3.__s)), _(d3.__s, V2.getDerivedStateFromProps(M, d3.__s)))), k3 = d3.props, b2 = d3.state, d3.__v = r3, u3.__c) {
          if (M !== k3 && C3 && !V2.getDerivedStateFromProps && d3.componentWillReceiveProps && d3.componentWillReceiveProps(M, L2), r3.__v == u3.__v && !(8 & d3.__g) || !(4 & d3.__g) && d3.shouldComponentUpdate && false === d3.shouldComponentUpdate(M, d3.__s, L2)) {
            r3.__v != u3.__v && (d3.props = M, d3.state = d3.__s, d3.__g &= -9), r3.__e = u3.__e, r3.__k = u3.__k, r3.__k.some(function(n2) {
              n2 && (n2.__ = r3);
            }), y.push.apply(d3.__h, d3.__k), d3.__k = [], d3.__h.length && e3.push(d3), l3 = S(u3);
            break n;
          }
          d3.componentWillUpdate && d3.componentWillUpdate(M, d3.__s, L2), C3 && d3.componentDidUpdate && d3.__h.push(function() {
            d3.componentDidUpdate(k3, b2, m3);
          });
        } else C3 && !V2.getDerivedStateFromProps && d3.componentWillMount && d3.componentWillMount(), C3 && d3.componentDidMount && d3.__h.push(d3.componentDidMount);
        d3.context = L2, d3.props = M, d3.__P = t3, d3.__g &= -5, H2 = n.__r, q2 = C3 ? 25 : 0;
        do {
          d3.__g &= -9, H2 && H2(r3), s3 = d3.render(d3.props, d3.state = d3.__s, d3.context);
        } while (8 & d3.__g && ++q2 < 25);
        C3 && (y.push.apply(d3.__h, d3.__k), d3.__k = []), d3.state = d3.__s, d3.getChildContext && (i3 = _({}, i3, d3.getChildContext())), C3 && u3.__c && d3.getSnapshotBeforeUpdate && (m3 = d3.getSnapshotBeforeUpdate(k3, b2)), A3 = s3 && s3.type === $ && null == s3.key ? s3.props.children : s3, M.__P && (s3 = l3, f3 = (t3 = M.__P).namespaceURI, c3 = o3 = null, u3.props && u3.props.__P != t3 && (u3.__k.some(function(n2) {
          n2 && J(n2, n2);
        }), u3.__k = null), l3 = u3.__k ? S(u3, 0) : null), l3 = I(t3, w(A3) ? A3 : [A3], r3, u3, i3, f3, o3, e3, l3, c3, a3), M.__P && (r3.__e = null, l3 = s3), r3.__u &= -161, p3 && p3.some(g), d3.__h.length && e3.push(d3), 1 & d3.__g && (d3.__g &= -4);
      } catch (t4) {
        if (e3.length = v3, r3.__v = null, c3 || o3) if (t4 && t4.then) {
          if (r3.__u |= 128 | c3, o3) {
            for (~(T3 = o3.indexOf(l3 || void 0)) || (T3 = o3.length); (N2 = o3[T3 - 1]) && 8 == N2.nodeType; ) T3--;
            for (; T3 < o3.length; T3++) if (N2 = o3[T3]) if (o3[T3] = null, O) {
              if (N2 == P2) break;
            } else {
              if (8 != N2.nodeType) break;
              N2.data.startsWith("$s") && (P2 = B(O = N2));
            }
          }
          if (!O) {
            for (; l3 && 8 == l3.nodeType && l3.nextSibling; ) l3 = l3.nextSibling;
            O = l3;
          }
          (s3 = B(O = r3.__c.__z || (r3.__c.__z = O))) ? (r3.__e = O, l3 = s3) : r3.__e = l3, l3 = l3 && l3.nextSibling;
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
    var s3, h3, y3, _3, k3, b2, m3, M, $2 = u3.props || p, x2 = r3.props, C3 = r3.type;
    if ("svg" == C3 ? f3 = "http://www.w3.org/2000/svg" : "math" == C3 ? f3 = "http://www.w3.org/1998/Math/MathML" : f3 || (f3 = "http://www.w3.org/1999/xhtml"), o3) {
      for (s3 = 0; s3 < o3.length; s3++) if ((k3 = o3[s3]) && (C3 ? k3.localName == C3 : 3 == k3.nodeType)) {
        t3 = k3, o3[s3] = null;
        break;
      }
    }
    if (!t3) {
      if (M = a3.ownerDocument || document, !C3) return M.createTextNode(x2);
      t3 = M.createElementNS(f3, C3, x2.is ? x2 : a3), l3 && (n.__m && n.__m(r3, o3), l3 = false), o3 = null;
    }
    if (C3) {
      if (a3 = "template" == C3 && t3.content || t3, o3 = "textarea" == C3 && null != x2.defaultValue ? null : o3 && d.call(a3.childNodes), !l3 && o3) for ($2 = {}, s3 = 0; s3 < t3.attributes.length; s3++) $2[(k3 = t3.attributes[s3]).name] = k3.value;
      for (s3 in $2) k3 = $2[s3], "dangerouslySetInnerHTML" == s3 ? y3 = k3 : "children" == s3 || s3 in x2 || "value" == s3 && "defaultValue" in x2 || "checked" == s3 && "defaultChecked" in x2 || N(t3, s3, null, k3, f3);
      for (s3 in x2) k3 = x2[s3], "children" == s3 ? _3 = k3 : "dangerouslySetInnerHTML" == s3 ? h3 = k3 : "value" == s3 ? b2 = k3 : "checked" == s3 ? m3 = k3 : l3 && "function" != typeof k3 || $2[s3] === k3 || N(t3, s3, k3, $2[s3], f3);
      h3 ? (l3 || y3 && (h3.__html == y3.__html || h3.__html == t3.innerHTML) || (t3.innerHTML = h3.__html), r3.__k = []) : (y3 && (t3.textContent = ""), ("foreignObject" == C3 || "http://www.w3.org/1998/Math/MathML" == f3 && v.test(C3)) && (f3 = "http://www.w3.org/1999/xhtml"), I(a3, w(_3) ? _3 : [_3], r3, u3, i3, f3, o3, e3, o3 ? o3[0] : u3.__k && S(u3, 0), l3, c3), o3 && o3.some(g)), l3 && "textarea" != C3 || (s3 = "value", "progress" == C3 && null == b2 ? t3.removeAttribute(s3) : null == b2 || b2 === t3[s3] && ("progress" != C3 || b2) || N(t3, s3, b2, $2[s3], f3), s3 = "checked", null != m3 && m3 != t3[s3] && N(t3, s3, m3, $2[s3], f3));
    } else $2 === x2 || l3 && t3.data == x2 || (t3.data = x2);
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
  function b(n2, t3) {
    return f2 = 8, w2(function() {
      return n2;
    }, t3);
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

  // src/settings.js
  var TOS_VERSION = 1;
  var FAQ_VERSION = 2;
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
    "perplexity",
    "kimi",
    "zai",
    "minimax",
    "janitorai"
  ]);
  var EXTENSION_ONLY_PLATFORMS = Object.freeze(["janitorai"]);
  var UI_SKINS = Object.freeze([
    "chatgpt",
    "grok",
    "grok-x",
    "copilot",
    "claude",
    "qwen",
    "deepseek",
    "perplexity",
    "kimi",
    "zai",
    "minimax",
    "janitorai"
  ]);
  var UI_SCHEMES = Object.freeze(["auto", "light", "dark"]);
  var UI_LOCALES = Object.freeze(["auto", "en", "ru"]);
  var EXPORT_FORMAT_IDS = Object.freeze(["md", "yaml", "json", "html", "pdf"]);
  var EXPORT_SCHEMA_IDS = Object.freeze(["chat-export/1", "sharegpt/1"]);
  var DEFAULT_EXPORT_SCHEMA_ID = "chat-export/1";
  var SHIFT_MODES = Object.freeze(["rebind", "saveAs"]);
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
      perplexity: true,
      kimi: true,
      zai: true,
      minimax: true,
      janitorai: true
    }),
    allowCreate: true,
    allowDestructive: false,
    allowProjects: true,
    rpcTimeoutS: 60,
    tosVersion: 0,
    faqVersion: 0,
    exportSchemas: Object.freeze({
      default: DEFAULT_EXPORT_SCHEMA_ID,
      byFormat: Object.freeze({
        md: null,
        yaml: null,
        json: null,
        html: null,
        pdf: null
      })
    }),
    saveFolder: Object.freeze({ shiftMode: "rebind" }),
    ui: Object.freeze({
      skin: "auto",
      scheme: "auto",
      locale: "auto"
    })
  });
  function normalizeUi(raw) {
    const u3 = raw && typeof raw === "object" ? raw : {};
    const skin = u3.skin === "auto" || UI_SKINS.indexOf(u3.skin) >= 0 ? u3.skin : "auto";
    const scheme = UI_SCHEMES.indexOf(u3.scheme) >= 0 ? u3.scheme : "auto";
    const locale = UI_LOCALES.indexOf(u3.locale) >= 0 ? u3.locale : "auto";
    return { skin, scheme, locale };
  }
  function normalizeSchemaId(id) {
    const s3 = String(id || "").trim();
    if (EXPORT_SCHEMA_IDS.indexOf(s3) >= 0) return s3;
    return DEFAULT_EXPORT_SCHEMA_ID;
  }
  function normalizeExportSchemas(raw) {
    const src = raw && typeof raw === "object" ? raw : {};
    const def = normalizeSchemaId(src.default);
    const byFormat = {};
    const bf = src.byFormat && typeof src.byFormat === "object" ? src.byFormat : {};
    for (let i3 = 0; i3 < EXPORT_FORMAT_IDS.length; i3++) {
      const f3 = EXPORT_FORMAT_IDS[i3];
      const v3 = bf[f3];
      if (v3 == null || v3 === "" || v3 === "default") byFormat[f3] = null;
      else byFormat[f3] = normalizeSchemaId(v3);
    }
    return { default: def, byFormat };
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
      tosVersion: Number.isFinite(Number(s3.tosVersion)) ? Number(s3.tosVersion) : 0,
      faqVersion: Number.isFinite(Number(s3.faqVersion)) ? Number(s3.faqVersion) : 0,
      exportSchemas: normalizeExportSchemas(s3.exportSchemas),
      saveFolder: {
        shiftMode: SHIFT_MODES.indexOf(s3.saveFolder && s3.saveFolder.shiftMode) >= 0 ? s3.saveFolder.shiftMode : "rebind"
      },
      ui: normalizeUi(s3.ui)
    };
  }
  function resolveUiScheme(scheme, prefersDark) {
    if (scheme === "light") return "light";
    if (scheme === "dark") return "dark";
    return prefersDark ? "dark" : "light";
  }
  function hasTosConsent(settings) {
    const s3 = normalizeSettings(settings);
    return s3.tosVersion === TOS_VERSION;
  }
  function hasFaqConsent(settings) {
    const s3 = normalizeSettings(settings);
    return s3.faqVersion === FAQ_VERSION;
  }
  function reconcileSavedSettings(sent, saved) {
    const want = normalizeSettings(sent);
    const got = normalizeSettings(saved);
    if (want.tosVersion > 0 && got.tosVersion < want.tosVersion) {
      got.tosVersion = want.tosVersion;
    }
    if (want.faqVersion > 0 && got.faqVersion < want.faqVersion) {
      got.faqVersion = want.faqVersion;
    }
    return got;
  }
  function persistSaveFailed(res) {
    return !res || res.ok !== true || !res.settings;
  }

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
    "label.exportSchemas": "Export schemas",
    "label.schemaDefault": "Default schema",
    "label.schemaByFormat": "Schema per format",
    "label.schemaInherit": "Use default",
    "label.saveFolder": "Default folder",
    "label.shiftMode": "Shift + click",
    "label.schemaPerFormat": "Per format",
    "schema.inherit": "As default",
    "saveFolder.none": "Not chosen \u2014 will ask on first download",
    "saveFolder.prompt": "Access expired \u2014 restore",
    "saveFolder.unsupported": "Not supported \u2014 Chrome Downloads is used",
    "shiftMode.rebind": "Choose new default folder",
    "shiftMode.saveAs": "Ask where to save (one time)",
    "hint.shiftMode": "Normal click saves silently into the default folder.",
    "schema.chat-export/1": "chat-export \u2014 1",
    "schema.sharegpt/1": "sharegpt \u2014 1",
    "schema.hint": "Formats on the page bar stay the same. Schema controls how MD/JSON/YAML/HTML/PDF text is shaped. Default is chat-export \u2014 1.",
    "format.md": "Markdown",
    "format.yaml": "YAML",
    "format.json": "JSON",
    "format.html": "HTML",
    "format.pdf": "PDF",
    "label.tos": "Legal / Terms of Use",
    "label.faq": "Advanced Mode Terms & FAQ",
    "label.donate": "Support the project",
    "donate.hint": "Optional tip via DonationAlerts",
    "label.on": "On",
    "label.off": "Off",
    "skin.auto": "Auto (match site)",
    "skin.chatgpt": "ChatGPT",
    "skin.grok": "Grok",
    "skin.grok-x": "X Grok",
    "skin.copilot": "Copilot",
    "skin.claude": "Claude",
    "skin.qwen": "Qwen",
    "skin.deepseek": "DeepSeek",
    "skin.perplexity": "Perplexity",
    "skin.kimi": "Kimi",
    "skin.zai": "Z.ai",
    "skin.minimax": "MiniMax",
    "skin.janitorai": "JanitorAI",
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
    "platform.kimi": "Kimi",
    "platform.zai": "Z.ai",
    "platform.minimax": "MiniMax",
    "platform.janitorai": "JanitorAI",
    "section.exportSettings": "Export settings",
    "bar.pack": "Pack",
    "bar.pack.folder": "Folder",
    "bar.pack.zip": "Zip",
    "bar.format": "Export format",
    "bar.download": "Download chat",
    "bar.dl.single": "Download {fmt}. Shift: {shiftHint}",
    "bar.dl.multi": "Download {fmt}. Shift: {shiftHint}",
    "toast.saved": "Saved to \xAB{folder}\xBB: {name}",
    "toast.downloaded": "Downloaded: {name}",
    "toast.failed": "Export failed",
    "toast.regrant": "Folder access needed \u2014 click the folder button on the bar",
    "bar.folder": "Save folder",
    "bar.folder.regrant": "Restore folder access",
    "bar.folder.set": "Set folder",
    "toast.empty": "Nothing to export yet",
    "bar.shift.rebind": "new default folder",
    "bar.shift.saveAs": "ask where to save",
    "btn.generate": "Generate",
    "btn.rotate": "Rotate",
    "btn.copy": "Copy",
    "btn.continue": "Continue",
    "btn.acceptTos": "Accept & Continue",
    "btn.showExportSettings": "Export settings",
    "btn.hideExportSettings": "Hide export settings",
    "btn.chooseFolder": "Choose folder",
    "btn.changeFolder": "Change folder",
    "btn.forgetFolder": "Forget",
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
    "key.hint": "See README: ceb_ per browser; rotate invalidates old keys.",
    "key.hintId": "Id:",
    "browser.hint": "Per Chrome profile \u2014 see dashboard Browsers.",
    "tos.title": "Terms of Use & Risk Disclaimer",
    "tos.lead": "Please read and accept before using Chat Export:",
    "tos.1": 'Open-source software provided "AS IS" under the MIT License, without warranty of any kind.',
    "tos.2": "Account & ToS Risk: Chat Export interacts with third-party web UIs and internal page APIs inside your logged-in browser session. We cannot guarantee that DOM harvesting, internal API requests, or high-frequency exports will not violate provider Terms of Service or result in rate-limiting, temporary suspension, or permanent account ban. Use at your own risk.",
    "tos.3": "Local-Only Privacy: All exports are generated locally in your browser. No chat content, credentials, or analytics are transmitted to external servers.",
    "tos.4": "Provider UI updates can break parsing at any time. If something stops working, please report an issue at https://github.com/svergio/chat-export-extension/issues",
    "tos.agree": "I understand the risks and agree to the Terms of Use",
    "faq.lead": "Advanced Mode Terms (Local MCP Gateway & Agent Automation):",
    "faq.agree": "I understand the automation risks and agree to Advanced Mode Terms",
    "faq.1": "Enabling the Local MCP Gateway allows external AI agents (Cursor, Claude Desktop, LangChain-based local LLM agents, and other MCP clients) connected to 127.0.0.1 to list, read, create, send, and (if enabled) delete chats in your logged-in browser tabs.",
    "faq.2": "Higher Account Restriction Risk: Automated prompt sending (chat_ask / chats_create) and batch operations act directly on your live accounts and carry elevated risk of rate limits, CAPTCHAs, or account suspension by providers.",
    "faq.3": "Local Loopback Only: The extension and server communicate strictly over 127.0.0.1 using per-browser ceb_ tokens. Site passwords and cookies are never extracted or sent to the agent.",
    "faq.4": "Permission Gates: Creating/sending chats can be toggled off, and destructive actions (deleting chats or projects) are disabled by default and require explicit confirmation.",
    "faq.5": 'You are solely responsible for all actions performed by connected agents and for complying with provider Terms of Service. Provided "AS IS" without liability.',
    "faq.6": "If an adapter or RPC command breaks after a provider update, open an issue at https://github.com/svergio/chat-export-extension/issues",
    "folderPage.title": "Chat Export \u2014 save folder",
    "folderPage.pick": "Choose folder",
    "folderPage.grant": "Restore access to \xAB{name}\xBB",
    "folderPage.saved": "Saved to \xAB{name}\xBB",
    "folderPage.cancelled": "Cancelled. Nothing saved.",
    "folderPage.hint": "Choose or create a subfolder, for example Downloads/Chat Export. Chrome does not allow the Downloads, Desktop or Documents folder itself.",
    "folderPage.pending": "The export will be saved as soon as you choose a folder.",
    "folderPage.notPicked": "No folder chosen yet. Pick a subfolder and try again.",
    "folderPage.cancel": "Cancel export",
    "folderPage.pendingMany": "{count} exports will be saved as soon as you choose a folder.",
    "folderPage.savedMany": "Saved {count} exports to \xAB{name}\xBB"
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
    "label.exportSchemas": "\u0421\u0445\u0435\u043C\u044B \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "label.schemaDefault": "\u0421\u0445\u0435\u043C\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "label.schemaByFormat": "\u0421\u0445\u0435\u043C\u0430 \u043D\u0430 \u0444\u043E\u0440\u043C\u0430\u0442",
    "label.schemaInherit": "\u041A\u0430\u043A \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "label.saveFolder": "\u041F\u0430\u043F\u043A\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "label.shiftMode": "Shift + \u043A\u043B\u0438\u043A",
    "label.schemaPerFormat": "\u041F\u043E \u0444\u043E\u0440\u043C\u0430\u0442\u0430\u043C",
    "schema.inherit": "\u041A\u0430\u043A \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "saveFolder.none": "\u041D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u0430 \u2014 \u0441\u043F\u0440\u043E\u0441\u0438\u043C \u043F\u0440\u0438 \u043F\u0435\u0440\u0432\u043E\u043C \u0441\u043A\u0430\u0447\u0438\u0432\u0430\u043D\u0438\u0438",
    "saveFolder.prompt": "\u0414\u043E\u0441\u0442\u0443\u043F \u0438\u0441\u0442\u0451\u043A \u2014 \u0432\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C",
    "saveFolder.unsupported": "\u041D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u2014 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442\u0441\u044F \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438 Chrome",
    "shiftMode.rebind": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043D\u043E\u0432\u0443\u044E \u043F\u0430\u043F\u043A\u0443 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "shiftMode.saveAs": "\u0421\u043F\u0440\u043E\u0441\u0438\u0442\u044C, \u043A\u0443\u0434\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C (\u0440\u0430\u0437\u043E\u0432\u043E)",
    "hint.shiftMode": "\u041E\u0431\u044B\u0447\u043D\u044B\u0439 \u043A\u043B\u0438\u043A \u0442\u0438\u0445\u043E \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u0435\u0442 \u0432 \u043F\u0430\u043F\u043A\u0443 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E.",
    "schema.chat-export/1": "chat-export \u2014 1",
    "schema.sharegpt/1": "sharegpt \u2014 1",
    "schema.hint": "\u041A\u043D\u043E\u043F\u043A\u0438 \u0444\u043E\u0440\u043C\u0430\u0442\u043E\u0432 \u043D\u0430 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u044E\u0442\u0441\u044F. \u0421\u0445\u0435\u043C\u0430 \u0437\u0430\u0434\u0430\u0451\u0442, \u043A\u0430\u043A \u0432\u044B\u0433\u043B\u044F\u0434\u0438\u0442 \u0442\u0435\u043A\u0441\u0442 MD/JSON/YAML/HTML/PDF. \u0414\u0435\u0444\u043E\u043B\u0442 \u2014 chat-export \u2014 1.",
    "format.md": "Markdown",
    "format.yaml": "YAML",
    "format.json": "JSON",
    "format.html": "HTML",
    "format.pdf": "PDF",
    "label.tos": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F / \u0420\u0438\u0441\u043A\u0438",
    "label.faq": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430 \u0438 FAQ",
    "label.donate": "\u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0430\u0442\u044C \u043F\u0440\u043E\u0435\u043A\u0442",
    "donate.hint": "\u0414\u043E\u043D\u0430\u0442 \u0447\u0435\u0440\u0435\u0437 DonationAlerts (\u043F\u043E \u0436\u0435\u043B\u0430\u043D\u0438\u044E)",
    "label.on": "\u0412\u043A\u043B",
    "label.off": "\u0412\u044B\u043A\u043B",
    "skin.auto": "\u0410\u0432\u0442\u043E (\u043F\u043E \u0441\u0430\u0439\u0442\u0443)",
    "skin.chatgpt": "ChatGPT",
    "skin.grok": "Grok",
    "skin.grok-x": "X Grok",
    "skin.copilot": "Copilot",
    "skin.claude": "Claude",
    "skin.qwen": "Qwen",
    "skin.deepseek": "DeepSeek",
    "skin.perplexity": "Perplexity",
    "skin.kimi": "Kimi",
    "skin.zai": "Z.ai",
    "skin.minimax": "MiniMax",
    "skin.janitorai": "JanitorAI",
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
    "platform.kimi": "Kimi",
    "platform.zai": "Z.ai",
    "platform.minimax": "MiniMax",
    "platform.janitorai": "JanitorAI",
    "section.exportSettings": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "bar.pack": "\u0423\u043F\u0430\u043A\u043E\u0432\u043A\u0430",
    "bar.pack.folder": "\u041F\u0430\u043F\u043A\u0430",
    "bar.pack.zip": "\u0410\u0440\u0445\u0438\u0432",
    "bar.format": "\u0424\u043E\u0440\u043C\u0430\u0442 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "bar.download": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0447\u0430\u0442",
    "bar.dl.single": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C {fmt}. Shift: {shiftHint}",
    "bar.dl.multi": "\u0421\u043A\u0430\u0447\u0430\u0442\u044C {fmt}. Shift: {shiftHint}",
    "toast.saved": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u0432 \xAB{folder}\xBB: {name}",
    "toast.downloaded": "\u0421\u043A\u0430\u0447\u0430\u043D\u043E: {name}",
    "toast.failed": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435 \u0443\u0434\u0430\u043B\u0441\u044F",
    "toast.regrant": "\u041D\u0443\u0436\u0435\u043D \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043F\u0430\u043F\u043A\u0435 \u2014 \u043D\u0430\u0436\u043C\u0438 \u043A\u043D\u043E\u043F\u043A\u0443 \u043F\u0430\u043F\u043A\u0438 \u043D\u0430 \u043F\u0430\u043D\u0435\u043B\u0438",
    "bar.folder": "\u041F\u0430\u043F\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F",
    "bar.folder.regrant": "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043A \u043F\u0430\u043F\u043A\u0435",
    "bar.folder.set": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
    "toast.empty": "\u041F\u043E\u043A\u0430 \u043D\u0435\u0447\u0435\u0433\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "bar.shift.rebind": "\u043D\u043E\u0432\u0430\u044F \u043F\u0430\u043F\u043A\u0430 \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E",
    "bar.shift.saveAs": "\u0441\u043F\u0440\u043E\u0441\u0438\u0442\u044C, \u043A\u0443\u0434\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C",
    "btn.generate": "\u0421\u043E\u0437\u0434\u0430\u0442\u044C",
    "btn.rotate": "\u0421\u043C\u0435\u043D\u0438\u0442\u044C",
    "btn.copy": "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C",
    "btn.continue": "\u041F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
    "btn.acceptTos": "\u041F\u0440\u0438\u043D\u044F\u0442\u044C \u0438 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0438\u0442\u044C",
    "btn.showExportSettings": "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "btn.hideExportSettings": "\u0421\u043A\u0440\u044B\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430",
    "btn.chooseFolder": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
    "btn.changeFolder": "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
    "btn.forgetFolder": "\u0421\u0431\u0440\u043E\u0441\u0438\u0442\u044C",
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
    "key.hint": "\u0421\u043C. README: ceb_ \u043D\u0430 \u0431\u0440\u0430\u0443\u0437\u0435\u0440; \u0440\u043E\u0442\u0430\u0446\u0438\u044F \u0441\u0431\u0440\u0430\u0441\u044B\u0432\u0430\u0435\u0442 \u0441\u0442\u0430\u0440\u044B\u0435 \u043A\u043B\u044E\u0447\u0438.",
    "key.hintId": "Id:",
    "browser.hint": "\u041D\u0430 \u043F\u0440\u043E\u0444\u0438\u043B\u044C Chrome \u2014 \u0441\u043C. \u0434\u0430\u0448\u0431\u043E\u0440\u0434 Browsers.",
    "tos.title": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F \u0438 \u043F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435 \u043E \u0440\u0438\u0441\u043A\u0430\u0445",
    "tos.lead": "\u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u043E\u0437\u043D\u0430\u043A\u043E\u043C\u044C\u0442\u0435\u0441\u044C \u0438 \u043F\u0440\u0438\u043C\u0438\u0442\u0435 \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u043F\u0435\u0440\u0435\u0434 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u0435\u043C Chat Export:",
    "tos.1": "\u041F\u0440\u043E\u0433\u0440\u0430\u043C\u043C\u043D\u043E\u0435 \u043E\u0431\u0435\u0441\u043F\u0435\u0447\u0435\u043D\u0438\u0435 \u0441 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u043C \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u043C \u043A\u043E\u0434\u043E\u043C \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \xAB\u041A\u0410\u041A \u0415\u0421\u0422\u042C\xBB (AS IS) \u043F\u043E \u043B\u0438\u0446\u0435\u043D\u0437\u0438\u0438 MIT \u0431\u0435\u0437 \u043A\u0430\u043A\u0438\u0445-\u043B\u0438\u0431\u043E \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0439.",
    "tos.2": "\u0420\u0438\u0441\u043A \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0438 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430 \u0438 \u043F\u0440\u0430\u0432\u0438\u043B \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u0432 (ToS): Chat Export \u0432\u0437\u0430\u0438\u043C\u043E\u0434\u0435\u0439\u0441\u0442\u0432\u0443\u0435\u0442 \u0441 \u0432\u0435\u0431-\u0438\u043D\u0442\u0435\u0440\u0444\u0435\u0439\u0441\u0430\u043C\u0438 \u0438 \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u043C\u0438 API \u0441\u0442\u0440\u0430\u043D\u0438\u0446 \u0432 \u0432\u0430\u0448\u0435\u0439 \u0430\u043A\u0442\u0438\u0432\u043D\u043E\u0439 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043D\u043E\u0439 \u0441\u0435\u0441\u0441\u0438\u0438. \u041C\u044B \u043D\u0435 \u0433\u0430\u0440\u0430\u043D\u0442\u0438\u0440\u0443\u0435\u043C, \u0447\u0442\u043E \u0440\u0430\u0437\u0431\u043E\u0440 DOM, \u0437\u0430\u043F\u0440\u043E\u0441\u044B \u043A \u0432\u043D\u0443\u0442\u0440\u0435\u043D\u043D\u0438\u043C API \u0438\u043B\u0438 \u0447\u0430\u0441\u0442\u044B\u0439 \u044D\u043A\u0441\u043F\u043E\u0440\u0442 \u043D\u0435 \u0431\u0443\u0434\u0443\u0442 \u0440\u0430\u0441\u0446\u0435\u043D\u0435\u043D\u044B \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u0430\u043C\u0438 \u043A\u0430\u043A \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u0435 \u0438\u0445 \u043F\u0440\u0430\u0432\u0438\u043B (Terms of Service) \u0438 \u043D\u0435 \u043F\u0440\u0438\u0432\u0435\u0434\u0443\u0442 \u043A \u043B\u0438\u043C\u0438\u0442\u0430\u043C (rate-limit), \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u044B\u043C \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F\u043C \u0438\u043B\u0438 \u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u043A\u0435 (\u0431\u0430\u043D\u0443) \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430. \u0412\u044B \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0435 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435 \u043D\u0430 \u0441\u0432\u043E\u0439 \u0441\u0442\u0440\u0430\u0445 \u0438 \u0440\u0438\u0441\u043A.",
    "tos.3": "\u041B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0441\u0442\u044C \u0438 \u043F\u0440\u0438\u0432\u0430\u0442\u043D\u043E\u0441\u0442\u044C: \u0412\u0441\u0435 \u0444\u0430\u0439\u043B\u044B \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u0430 \u0444\u043E\u0440\u043C\u0438\u0440\u0443\u044E\u0442\u0441\u044F \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E \u0432 \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u0435. \u0421\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0447\u0430\u0442\u043E\u0432, \u043F\u0430\u0440\u043E\u043B\u0438 \u0438 \u0442\u0435\u043B\u0435\u043C\u0435\u0442\u0440\u0438\u044F \u043D\u0438\u043A\u0443\u0434\u0430 \u043D\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F.",
    "tos.4": "\u041E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0432\u0435\u0440\u0441\u0442\u043A\u0438 \u0441\u0430\u0439\u0442\u043E\u0432 \u043C\u043E\u0433\u0443\u0442 \u0432 \u043B\u044E\u0431\u043E\u0439 \u043C\u043E\u043C\u0435\u043D\u0442 \u043D\u0430\u0440\u0443\u0448\u0438\u0442\u044C \u0440\u0430\u0431\u043E\u0442\u0443 \u043F\u0430\u0440\u0441\u0435\u0440\u0430. \u0415\u0441\u043B\u0438 \u0447\u0442\u043E-\u0442\u043E \u043F\u0435\u0440\u0435\u0441\u0442\u0430\u043B\u043E \u0440\u0430\u0431\u043E\u0442\u0430\u0442\u044C, \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u0438\u0448\u044C\u044E: https://github.com/svergio/chat-export-extension/issues",
    "tos.agree": "\u042F \u043F\u043E\u043D\u0438\u043C\u0430\u044E \u0440\u0438\u0441\u043A\u0438 \u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u044E \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u043E\u0432\u0430\u043D\u0438\u044F",
    "faq.lead": "\u0423\u0441\u043B\u043E\u0432\u0438\u044F \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430 (\u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 MCP-\u0448\u043B\u044E\u0437 \u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u044F \u0430\u0433\u0435\u043D\u0442\u0430\u043C\u0438):",
    "faq.agree": "\u042F \u043F\u043E\u043D\u0438\u043C\u0430\u044E \u0440\u0438\u0441\u043A\u0438 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0437\u0430\u0446\u0438\u0438 \u0438 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u044E \u0443\u0441\u043B\u043E\u0432\u0438\u044F \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u043D\u043E\u0433\u043E \u0440\u0435\u0436\u0438\u043C\u0430",
    "faq.1": "\u0412\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435 \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u043E\u0433\u043E MCP-\u0448\u043B\u044E\u0437\u0430 \u043F\u043E\u0437\u0432\u043E\u043B\u044F\u0435\u0442 \u0432\u043D\u0435\u0448\u043D\u0438\u043C \u0418\u0418-\u0430\u0433\u0435\u043D\u0442\u0430\u043C (Cursor, Claude Desktop, \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u043C \u0430\u0433\u0435\u043D\u0442\u0430\u043C \u0447\u0435\u0440\u0435\u0437 LangChain \u0438 \u0434\u0440\u0443\u0433\u0438\u043C MCP-\u043A\u043B\u0438\u0435\u043D\u0442\u0430\u043C), \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0451\u043D\u043D\u044B\u043C \u043A 127.0.0.1, \u043F\u043E\u043B\u0443\u0447\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043A\u0438 \u0447\u0430\u0442\u043E\u0432, \u0447\u0438\u0442\u0430\u0442\u044C, \u0441\u043E\u0437\u0434\u0430\u0432\u0430\u0442\u044C, \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u044F\u0442\u044C \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044F \u0438 (\u0435\u0441\u043B\u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u043E) \u0443\u0434\u0430\u043B\u044F\u0442\u044C \u0447\u0430\u0442\u044B \u0432 \u0432\u0430\u0448\u0438\u0445 \u043E\u0442\u043A\u0440\u044B\u0442\u044B\u0445 \u0432\u043A\u043B\u0430\u0434\u043A\u0430\u0445.",
    "faq.2": "\u041F\u043E\u0432\u044B\u0448\u0435\u043D\u043D\u044B\u0439 \u0440\u0438\u0441\u043A \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u0439 \u0430\u043A\u043A\u0430\u0443\u043D\u0442\u0430: \u0410\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0430\u044F \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0430 \u043F\u0440\u043E\u043C\u043F\u0442\u043E\u0432 (chat_ask / chats_create) \u0438 \u043F\u0430\u043A\u0435\u0442\u043D\u044B\u0435 \u043E\u043F\u0435\u0440\u0430\u0446\u0438\u0438 \u0432\u044B\u043F\u043E\u043B\u043D\u044F\u044E\u0442\u0441\u044F \u043E\u0442 \u043B\u0438\u0446\u0430 \u0432\u0430\u0448\u0435\u0439 \u0443\u0447\u0435\u0442\u043D\u043E\u0439 \u0437\u0430\u043F\u0438\u0441\u0438 \u0438 \u043D\u0435\u0441\u0443\u0442 \u043F\u043E\u0432\u044B\u0448\u0435\u043D\u043D\u044B\u0439 \u0440\u0438\u0441\u043A \u0441\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u043D\u0438\u044F \u0430\u043D\u0442\u0438\u0444\u0440\u043E\u0434-\u0441\u0438\u0441\u0442\u0435\u043C, \u043A\u0430\u043F\u0447\u0438 \u0438\u043B\u0438 \u0431\u0430\u043D\u0430 \u0441\u043E \u0441\u0442\u043E\u0440\u043E\u043D\u044B \u043F\u0440\u043E\u0432\u0430\u0439\u0434\u0435\u0440\u043E\u0432.",
    "faq.3": "\u0422\u043E\u043B\u044C\u043A\u043E \u043B\u043E\u043A\u0430\u043B\u044C\u043D\u044B\u0439 \u043A\u043E\u043D\u0442\u0443\u0440: \u041E\u0431\u043C\u0435\u043D \u043C\u0435\u0436\u0434\u0443 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u0435\u043C \u0438 \u0441\u0435\u0440\u0432\u0435\u0440\u043E\u043C \u0438\u0434\u0435\u0442 \u0441\u0442\u0440\u043E\u0433\u043E \u0447\u0435\u0440\u0435\u0437 127.0.0.1 \u043F\u043E \u0438\u043D\u0434\u0438\u0432\u0438\u0434\u0443\u0430\u043B\u044C\u043D\u044B\u043C \u0442\u043E\u043A\u0435\u043D\u0430\u043C ceb_. \u041F\u0430\u0440\u043E\u043B\u0438 \u0438 cookies \u0441\u0430\u0439\u0442\u043E\u0432 \u043D\u0435 \u0438\u0437\u0432\u043B\u0435\u043A\u0430\u044E\u0442\u0441\u044F \u0438 \u043D\u0435 \u043F\u0435\u0440\u0435\u0434\u0430\u044E\u0442\u0441\u044F \u0430\u0433\u0435\u043D\u0442\u0443.",
    "faq.4": "\u041A\u043E\u043D\u0442\u0440\u043E\u043B\u044C \u043F\u0440\u0430\u0432: \u0421\u043E\u0437\u0434\u0430\u043D\u0438\u0435 \u0438 \u043E\u0442\u043F\u0440\u0430\u0432\u043A\u0443 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439 \u043C\u043E\u0436\u043D\u043E \u043E\u0442\u043A\u043B\u044E\u0447\u0438\u0442\u044C, \u0430 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0447\u0430\u0442\u043E\u0432 \u0438 \u043F\u0440\u043E\u0435\u043A\u0442\u043E\u0432 \u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E \u043F\u043E \u0443\u043C\u043E\u043B\u0447\u0430\u043D\u0438\u044E \u0438 \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u044F\u0432\u043D\u043E\u0433\u043E \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043D\u0438\u044F.",
    "faq.5": "\u0412\u044B \u043D\u0435\u0441\u0435\u0442\u0435 \u043F\u043E\u043B\u043D\u0443\u044E \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u044C \u0437\u0430 \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u044F \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043D\u044B\u0445 \u0430\u0433\u0435\u043D\u0442\u043E\u0432 \u0438 \u0441\u043E\u0431\u043B\u044E\u0434\u0435\u043D\u0438\u0435 \u043F\u0440\u0430\u0432\u0438\u043B \u0441\u0435\u0440\u0432\u0438\u0441\u043E\u0432 (ToS). \u041F\u041E \u043F\u0440\u0435\u0434\u043E\u0441\u0442\u0430\u0432\u043B\u044F\u0435\u0442\u0441\u044F \xAB\u041A\u0410\u041A \u0415\u0421\u0422\u042C\xBB \u0431\u0435\u0437 \u043E\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u043E\u0432.",
    "faq.6": "\u0415\u0441\u043B\u0438 \u0430\u0434\u0430\u043F\u0442\u0435\u0440 \u0438\u043B\u0438 RPC-\u043A\u043E\u043C\u0430\u043D\u0434\u0430 \u0441\u043B\u043E\u043C\u0430\u043B\u0438\u0441\u044C \u043F\u043E\u0441\u043B\u0435 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u044F \u0441\u0430\u0439\u0442\u0430, \u0441\u043E\u043E\u0431\u0449\u0438\u0442\u0435 \u0432 \u0438\u0448\u044C\u044E: https://github.com/svergio/chat-export-extension/issues",
    "folderPage.title": "Chat Export \u2014 \u043F\u0430\u043F\u043A\u0430 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u044F",
    "folderPage.pick": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u043F\u0430\u043F\u043A\u0443",
    "folderPage.grant": "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0434\u043E\u0441\u0442\u0443\u043F \u043A \xAB{name}\xBB",
    "folderPage.saved": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u0432 \xAB{name}\xBB",
    "folderPage.cancelled": "\u041E\u0442\u043C\u0435\u043D\u0435\u043D\u043E. \u041D\u0438\u0447\u0435\u0433\u043E \u043D\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E.",
    "folderPage.hint": "\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u043B\u0438 \u0441\u043E\u0437\u0434\u0430\u0439\u0442\u0435 \u043F\u043E\u0434\u043F\u0430\u043F\u043A\u0443, \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438/Chat Export. Chrome \u043D\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0430\u0435\u0442 \u0432\u044B\u0431\u0440\u0430\u0442\u044C \u0441\u0430\u043C\u0438 \u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0438, \u0420\u0430\u0431\u043E\u0447\u0438\u0439 \u0441\u0442\u043E\u043B \u0438\u043B\u0438 \u0414\u043E\u043A\u0443\u043C\u0435\u043D\u0442\u044B.",
    "folderPage.pending": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0441\u044F \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u0432\u044B\u0431\u043E\u0440\u0430 \u043F\u0430\u043F\u043A\u0438.",
    "folderPage.notPicked": "\u041F\u0430\u043F\u043A\u0430 \u043F\u043E\u043A\u0430 \u043D\u0435 \u0432\u044B\u0431\u0440\u0430\u043D\u0430. \u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u043F\u043E\u0434\u043F\u0430\u043F\u043A\u0443 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.",
    "folderPage.cancel": "\u041E\u0442\u043C\u0435\u043D\u0438\u0442\u044C \u044D\u043A\u0441\u043F\u043E\u0440\u0442",
    "folderPage.pendingMany": "\u042D\u043A\u0441\u043F\u043E\u0440\u0442\u043E\u0432 \u0432 \u043E\u0447\u0435\u0440\u0435\u0434\u0438: {count}. \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u043C \u0441\u0440\u0430\u0437\u0443 \u043F\u043E\u0441\u043B\u0435 \u0432\u044B\u0431\u043E\u0440\u0430 \u043F\u0430\u043F\u043A\u0438.",
    "folderPage.savedMany": "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u044D\u043A\u0441\u043F\u043E\u0440\u0442\u043E\u0432: {count} \u0432 \xAB{name}\xBB"
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
  function tosKeys() {
    return ["tos.1", "tos.2", "tos.3", "tos.4"];
  }
  function faqKeys() {
    return ["faq.1", "faq.2", "faq.3", "faq.4", "faq.5", "faq.6"];
  }

  // src/popup/skin-icons.jsx
  function IconChatGpt({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" }));
  }
  function IconGrok({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("g", { transform: "scale(0.046875)" }, /* @__PURE__ */ k("path", { d: "M210.484 312.759L343.465 210.383C349.984 205.364 359.302 207.322 362.408 215.117C378.758 256.231 371.454 305.64 338.925 339.563C306.397 373.487 261.137 380.927 219.768 363.983L174.577 385.803C239.394 432.008 318.104 420.581 367.289 369.251C406.303 328.564 418.386 273.104 407.088 223.091L407.19 223.198C390.807 149.726 411.218 120.359 453.03 60.3072C454.02 58.8833 455.01 57.4595 456 56L400.978 113.382V113.204L210.45 312.794" }), /* @__PURE__ */ k("path", { d: "M183.042 337.641C136.519 291.294 144.54 219.567 184.236 178.203C213.59 147.59 261.683 135.096 303.666 153.464L348.755 131.75C340.632 125.627 330.221 119.042 318.275 114.414C264.277 91.2407 199.63 102.774 155.735 148.516C113.513 192.549 100.236 260.254 123.036 318.027C140.069 361.206 112.148 391.748 84.0229 422.575C74.0561 433.503 64.0553 444.431 56 456L183.007 337.677" })));
  }
  function IconX({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z" }));
  }
  var CLAUDE_SPARK_PATH = "M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z";
  function IconClaude({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 248 248", width: s3, height: s3, fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { fill: "currentColor", d: CLAUDE_SPARK_PATH }));
  }
  function IconCopilot({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z" }));
  }
  function IconQwen({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M23.919 14.545 20.817 9.17l1.47-2.544a.56.56 0 0 0 0-.566l-1.633-2.83a.57.57 0 0 0-.49-.283h-6.207L12.487.402a.57.57 0 0 0-.49-.284H8.732a.56.56 0 0 0-.49.284L5.139 5.775h-2.94a.56.56 0 0 0-.49.284L.077 8.887a.56.56 0 0 0 0 .567L3.18 14.83l-1.47 2.545a.56.56 0 0 0 0 .566l1.634 2.83a.57.57 0 0 0 .49.283h6.205l1.47 2.545a.57.57 0 0 0 .49.284h3.266a.57.57 0 0 0 .49-.284l3.104-5.375h2.94a.57.57 0 0 0 .49-.283l1.634-2.828a.55.55 0 0 0-.004-.568M8.733.686l1.634 2.828-1.634 2.828H21.8L20.164 9.17H7.425L5.63 6.06Zm1.306 19.801-6.205-.002 1.634-2.83h3.265L2.201 6.344h3.267q3.182 5.517 6.367 11.032zm10.124-5.66L18.53 12l-6.532 11.315-1.634-2.83c2.129-3.673 4.25-7.351 6.373-11.028h3.592l3.102 5.374z" }));
  }
  function IconDeepSeek({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M23.748 4.651c-.254-.124-.364.113-.512.233-.051.04-.094.09-.137.137-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.155-.708-.311-.955-.65-.172-.24-.219-.509-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.094.172.187.129.323-.082.28-.18.553-.266.833-.055.179-.137.218-.328.14a5.5 5.5 0 0 1-1.737-1.179c-.857-.828-1.631-1.743-2.597-2.46a12 12 0 0 0-.689-.47c-.985-.957.13-1.743.387-1.836.27-.098.094-.433-.778-.428-.872.003-1.67.295-2.687.685a3 3 0 0 1-.465.136 9.6 9.6 0 0 0-2.883-.101c-1.885.21-3.39 1.1-4.497 2.622C.082 8.776-.231 10.854.152 13.02c.403 2.284 1.568 4.175 3.36 5.653 1.857 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.132-.284 4.994-1.86.47.234.962.328 1.78.398.629.058 1.235-.031 1.705-.129.735-.155.684-.836.418-.961-2.155-1.004-1.682-.595-2.112-.926 1.095-1.295 2.768-3.598 3.284-6.733.05-.346.115-.834.108-1.114-.004-.171.035-.238.23-.257a4.2 4.2 0 0 0 1.545-.475c1.397-.763 1.96-2.016 2.093-3.517.02-.23-.004-.467-.247-.588M11.58 18.168c-2.088-1.642-3.101-2.183-3.52-2.16-.39.024-.32.472-.234.763.09.288.207.487.371.74.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.168-1.361-.801-2.5-1.86-3.301-3.306-.775-1.393-1.225-2.888-1.299-4.482-.02-.385.094-.522.477-.592a4.7 4.7 0 0 1 1.53-.038c2.131.311 3.946 1.264 5.467 2.774.868.86 1.525 1.887 2.202 2.89.72 1.066 1.494 2.082 2.48 2.915.348.291.626.513.892.677-.802.09-2.14.109-3.055-.615zm1.001-6.44a.306.306 0 0 1 .415-.287.3.3 0 0 1 .113.074.3.3 0 0 1 .086.214c0 .17-.136.307-.308.307a.303.303 0 0 1-.306-.307m3.11 1.596c-.2.081-.4.151-.591.16a1.25 1.25 0 0 1-.798-.254c-.274-.23-.47-.358-.551-.758a1.7 1.7 0 0 1 .015-.588c.07-.327-.007-.537-.238-.727-.188-.156-.426-.199-.689-.199a.6.6 0 0 1-.254-.078.253.253 0 0 1-.114-.358 1 1 0 0 1 .192-.21c.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.392.451.462.576.685.915.176.264.336.536.446.848.066.194-.02.353-.25.45" }));
  }
  function IconPerplexity({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M22.3977 7.0896h-2.3106V.0676l-7.5094 6.3542V.1577h-1.1554v6.1966L4.4904 0v7.0896H1.6023v10.3976h2.8882V24l6.932-6.3591v6.2005h1.1554v-6.0469l6.9318 6.1807v-6.4879h2.8882V7.0896zm-3.4657-4.531v4.531h-5.355l5.355-4.531zm-13.2862.0676 4.8691 4.4634H5.6458V2.6262zM2.7576 16.332V8.245h7.8476l-6.1149 6.1147v1.9723H2.7576zm2.8882 5.0404v-3.8852h.0001v-2.6488l5.7763-5.7764v7.0111l-5.7764 5.2993zm12.7086.0248-5.7766-5.1509V9.0618l5.7766 5.7766v6.5588zm2.8882-5.0652h-1.733v-1.9723L13.3948 8.245h7.8478v8.087z" }));
  }
  function IconKimi({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M21.765.351C22.998.351 24 1.353 24 2.586S22.998 4.82 21.765 4.82h-1.974c-.15 0-.26-.12-.26-.26V2.586A2.237 2.237 0 0 1 21.765.35M9.41 13.388l8.447-8.377c.16-.16.07-.471-.14-.471h-4.55s-.1.02-.14.06l-9.099 9.029c-.14.14-.35.02-.35-.21V4.81c0-.15-.1-.27-.221-.27H.22c-.12 0-.22.12-.22.27v18.57c0 .15.1.27.22.27h3.137c.12 0 .22-.12.22-.27v-3.79c0-.08.03-.16.08-.21l2.826-2.796c.07-.07.16-.08.241-.03l7.546 5.551a8.9 8.9 0 0 0 4.018 1.493c.12.01.23-.11.23-.27V19.76c0-.14-.08-.25-.19-.26a5.8 5.8 0 0 1-2.355-.942l-6.533-4.73c-.14-.09-.15-.32-.03-.441" }));
  }
  function IconZai({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M12.606 1.806l-1.677 2.388c-0.258 0.374-0.697 0.606-1.161 0.606h-9.162V1.794C0.594 1.806 12.606 1.806 12.606 1.806zM24 1.806L9.6 22.206 0 22.206 14.4 1.806zM11.394 22.206l1.69-2.4c0.258-0.374 0.697-0.606 1.161-0.606h9.149v3.006H11.394z" }));
  }
  function IconMinimax({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M11.43 3.92a.86.86 0 1 0-1.718 0v14.236a1.999 1.999 0 0 1-3.997 0V9.022a.86.86 0 1 0-1.718 0v3.87a1.999 1.999 0 0 1-3.997 0V11.49a.57.57 0 0 1 1.139 0v1.404a.86.86 0 0 0 1.719 0V9.022a1.999 1.999 0 0 1 3.997 0v9.134a.86.86 0 0 0 1.719 0V3.92a1.998 1.998 0 1 1 3.996 0v11.788a.57.57 0 1 1-1.139 0zm10.572 3.105a2 2 0 0 0-1.999 1.997v7.63a.86.86 0 0 1-1.718 0V3.923a1.999 1.999 0 0 0-3.997 0v16.16a.86.86 0 0 1-1.719 0V18.08a.57.57 0 1 0-1.138 0v2a1.998 1.998 0 0 0 3.996 0V3.92a.86.86 0 0 1 1.719 0v12.73a1.999 1.999 0 0 0 3.996 0V9.023a.86.86 0 1 1 1.72 0v6.686a.57.57 0 0 0 1.138 0V9.022a2 2 0 0 0-1.998-1.997" }));
  }
  function IconJanitorai({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { transform: "scale(0.2857142857142857) translate(-184.237383 1.329048)", d: "M255.699 38.8616C255.546 32.627 253.532 26.866 250.217 22.1046C250.166 22.0345 250.107 21.9556 250.039 21.8679C250.039 21.8679 250.047 21.8679 250.064 21.8679C249.826 21.4996 249.58 21.1313 249.325 20.763C248.279 19.3162 248.789 17.843 248.866 16.3436C249.095 12.2135 249.554 8.08338 248.228 4.03223C247.744 2.53277 246.673 2.42756 245.475 2.92738C241.829 4.47945 238.871 7.00482 236.628 10.2668C236.611 10.3019 236.594 10.3282 236.577 10.3457C236.22 10.8455 235.582 11.056 235.021 10.8718C232.242 10.0037 229.31 9.53025 226.251 9.53025C223.242 9.53025 220.361 9.97746 217.658 10.8193C217.098 11.0034 216.486 10.793 216.129 10.2931V10.2668C213.885 7.00482 210.927 4.47945 207.281 2.92738C206.083 2.42756 205.012 2.53277 204.528 4.03223C203.202 8.08338 203.635 12.2135 203.865 16.3436C203.941 17.6063 204.324 18.8689 203.814 20.1053C201.621 22.736 199.837 25.7612 198.638 29.0757C197.44 32.3639 196.777 35.889 196.777 39.5982C196.777 39.7034 196.777 39.8086 196.777 39.9138C196.777 39.9665 196.777 40.0104 196.777 40.0454C196.726 44.5964 197.72 48.8054 199.582 52.4093C203.355 59.8277 210.723 64.6417 220.004 64.7206C220.123 64.7206 220.242 64.7206 220.361 64.7206C220.693 64.6943 221.457 64.6417 222.248 64.5365C232.191 63.379 240.325 55.8291 242.211 45.5697C244.353 33.9423 236.653 23.7093 224.593 24.6037C215.823 25.2614 209.551 33.5214 211.029 42.4392C211.794 47.0165 214.24 48.9933 215.132 49.7466C216.495 50.8965 219.849 52.1344 223.291 51.588C224.949 51.325 230.024 50.5416 231.375 44.9646C231.962 42.8338 231.452 40.098 229.795 38.3881C228.163 36.6782 226.349 35.9037 223.801 36.3304C223.58 36.3657 223.419 36.4333 223.166 36.5203C220.259 37.52 220.718 41.7553 223.981 41.8605C224.05 41.8605 224.118 41.8605 224.185 41.8605C224.338 41.8605 224.517 41.8342 224.67 41.8079C225.715 41.6238 226.557 42.676 226.174 43.9124C226.106 44.1055 226.013 44.2807 225.894 44.4385C225.027 45.6486 223.038 45.8854 221.61 45.5434C218.423 44.7805 217.123 40.7293 218.78 36.9939C220.285 33.653 224.185 32.1009 227.704 32.7059C230.916 33.1005 234.205 36.6519 234.664 40.4926C235.965 51.436 225.664 58.6176 216.409 55.5661C208.531 52.9354 204.375 44.8857 206.083 36.4151C208.556 24.025 219.545 17.8167 230.508 20.1316C245.449 23.3147 250.217 39.0984 244.71 51.7254C241.88 58.223 236.73 62.3531 230.942 65.8518C228.953 67.0619 227.296 68.3509 225.996 69.6925C222.707 73.1387 222.459 75.7898 222.654 76.9736C222.821 77.9919 223.385 78.3586 223.837 78.5325C224.189 78.668 224.496 78.734 224.871 78.6382C225.608 78.503 226.362 78.0001 226.861 76.3159C227.488 74.1991 230.942 71.3177 236.908 68.4561C249.019 63.0897 255.775 51.8306 255.699 39.9402C255.699 39.8176 255.699 39.7034 255.699 39.5982C255.699 39.3527 255.699 39.1073 255.699 38.8616Z" }));
  }
  function IconSun({ size }) {
    const s3 = size || 14;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 16 16", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M8 12a4 4 0 1 1 0-8 4 4 0 0 1 0 8Zm0-1.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Zm5.657-8.157a.75.75 0 0 1 0 1.061l-1.061 1.06a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734l1.06-1.06a.75.75 0 0 1 1.06 0Zm-9.193 9.193a.75.75 0 0 1 0 1.06l-1.06 1.061a.75.75 0 1 1-1.061-1.06l1.06-1.061a.75.75 0 0 1 1.061 0ZM8 0a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V.75A.75.75 0 0 1 8 0ZM3 8a.75.75 0 0 1-.75.75H.75a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 3 8Zm13 0a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 16 8Zm-8 5a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 8 13Zm3.536-1.464a.75.75 0 0 1 1.06 0l1.061 1.06a.75.75 0 0 1-1.06 1.061l-1.061-1.06a.75.75 0 0 1 0-1.061ZM2.343 2.343a.75.75 0 0 1 1.061 0l1.06 1.061a.751.751 0 0 1-.018 1.042.751.751 0 0 1-1.042.018l-1.06-1.06a.75.75 0 0 1 0-1.06Z" }));
  }
  function IconMoon({ size }) {
    const s3 = size || 14;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 16 16", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M9.598 1.591a.749.749 0 0 1 .785-.175 7.001 7.001 0 1 1-8.967 8.967.75.75 0 0 1 .961-.96 5.5 5.5 0 0 0 7.046-7.046.75.75 0 0 1 .175-.786Zm1.616 1.945a7 7 0 0 1-7.678 7.678 5.499 5.499 0 1 0 7.678-7.678Z" }));
  }
  function IconAuto({ size }) {
    const s3 = size || 14;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 16 16", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M14.25 1c.966 0 1.75.784 1.75 1.75v7.5A1.75 1.75 0 0 1 14.25 12h-3.727c.099 1.041.52 1.872 1.292 2.757A.752.752 0 0 1 11.25 16h-6.5a.75.75 0 0 1-.565-1.243c.772-.885 1.192-1.716 1.292-2.757H1.75A1.75 1.75 0 0 1 0 10.25v-7.5C0 1.784.784 1 1.75 1ZM1.75 2.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25ZM9.018 12H6.982a5.72 5.72 0 0 1-.765 2.5h3.566a5.72 5.72 0 0 1-.765-2.5Z" }));
  }
  function IconChevron({ size }) {
    const s3 = size || 12;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 16 16", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M12.78 5.22a.749.749 0 0 1 0 1.06l-4.25 4.25a.749.749 0 0 1-1.06 0L3.22 6.28a.749.749 0 1 1 1.06-1.06L8 8.939l3.72-3.719a.749.749 0 0 1 1.06 0Z" }));
  }
  function IconSkinAuto({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 16 16", width: s3, height: s3, fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ k("circle", { cx: "8", cy: "8", r: "6.25", stroke: "currentColor", "stroke-width": "1.25", opacity: "0.45" }), /* @__PURE__ */ k(
      "path",
      {
        d: "M8 1.75a6.25 6.25 0 0 1 0 12.5Z",
        fill: "currentColor"
      }
    ));
  }
  var SKIN_OPTIONS = [
    { id: "auto", Icon: IconSkinAuto },
    { id: "chatgpt", Icon: IconChatGpt },
    { id: "grok", Icon: IconGrok },
    { id: "grok-x", Icon: IconX },
    { id: "copilot", Icon: IconCopilot },
    { id: "claude", Icon: IconClaude },
    { id: "qwen", Icon: IconQwen },
    { id: "deepseek", Icon: IconDeepSeek },
    { id: "perplexity", Icon: IconPerplexity },
    { id: "kimi", Icon: IconKimi },
    { id: "zai", Icon: IconZai },
    { id: "minimax", Icon: IconMinimax },
    { id: "janitorai", Icon: IconJanitorai }
  ];
  var PLATFORM_ICONS = Object.fromEntries(SKIN_OPTIONS.map((o3) => [o3.id, o3.Icon]));
  var SCHEME_OPTIONS = [
    { id: "auto", Icon: IconAuto },
    { id: "light", Icon: IconSun },
    { id: "dark", Icon: IconMoon }
  ];
  var LOCALE_OPTIONS = [
    { id: "auto" },
    { id: "en" },
    { id: "ru" }
  ];

  // src/hostSkin.js
  function toolbarKindFromUrl(url) {
    if (!url) return "idle";
    try {
      const u3 = new URL(url);
      const host = (u3.hostname || "").toLowerCase();
      const path = u3.pathname || "";
      if (host === "grok.com" || host.endsWith(".grok.com")) return "grok";
      if (host === "chatgpt.com" || host === "chat.openai.com" || host.endsWith(".chatgpt.com")) {
        return "chatgpt";
      }
      if (host === "github.com" || host.endsWith(".github.com")) {
        if (path === "/" || /^\/copilot(?:\/|$)/i.test(path)) return "copilot";
        return "idle";
      }
      if (host === "x.com" || host === "twitter.com" || host.endsWith(".x.com") || host.endsWith(".twitter.com")) {
        if (/^\/i\/grok(?:\/|$)/i.test(path)) return "x";
        return "idle";
      }
      if (host === "claude.ai" || host.endsWith(".claude.ai")) return "claude";
      if (host === "chat.qwen.ai" || host.endsWith(".qwen.ai")) return "qwen";
      if (host === "chat.deepseek.com" || host.endsWith(".deepseek.com")) return "deepseek";
      if (host === "perplexity.ai" || host === "www.perplexity.ai" || host.endsWith(".perplexity.ai")) {
        return "perplexity";
      }
      if (host === "kimi.com" || host === "www.kimi.com" || host.endsWith(".kimi.com")) return "kimi";
      if (host === "chat.z.ai" || host.endsWith(".z.ai")) return "zai";
      if (host === "agent.minimax.io") return "minimax";
      if (host === "janitorai.com" || host === "www.janitorai.com" || host.endsWith(".janitorai.com")) {
        return "janitorai";
      }
    } catch (e3) {
    }
    return "idle";
  }
  function toolbarKindToSkinId(kind) {
    if (!kind || kind === "idle") return null;
    if (kind === "x") return "grok-x";
    return kind;
  }

  // src/skinResolve.js
  var SKIN_AUTO_FALLBACK = "chatgpt";
  function resolvedSkinFromUrl(url) {
    const kind = toolbarKindFromUrl(url);
    const mapped = toolbarKindToSkinId(kind);
    const skin = mapped || SKIN_AUTO_FALLBACK;
    if (UI_SKINS.indexOf(skin) >= 0) return skin;
    return SKIN_AUTO_FALLBACK;
  }
  function dataSkinFromSettingAndUrl(uiSkin, url) {
    if (uiSkin === "auto") return resolvedSkinFromUrl(url);
    if (UI_SKINS.indexOf(uiSkin) >= 0) return uiSkin;
    return SKIN_AUTO_FALLBACK;
  }
  function tabUrl(tab) {
    return tab && typeof tab.url === "string" ? tab.url : "";
  }
  function queryActiveTabUrlFromNormalWindow() {
    return new Promise(function(resolve) {
      chrome.windows.getLastFocused({ windowTypes: ["normal"] }, function(win) {
        void chrome.runtime.lastError;
        const query = win && win.id != null ? { active: true, windowId: win.id } : { active: true, lastFocusedWindow: true };
        chrome.tabs.query(query, function(tabs) {
          void chrome.runtime.lastError;
          resolve(tabUrl(tabs && tabs[0]));
        });
      });
    });
  }
  function queryActiveTabUrlForPopup() {
    return queryActiveTabUrlFromNormalWindow();
  }
  async function resolveUiDataSkinForPopup(ui) {
    const setting = ui && ui.skin || "auto";
    if (setting !== "auto") return dataSkinFromSettingAndUrl(setting, "");
    const url = await queryActiveTabUrlForPopup();
    return resolvedSkinFromUrl(url);
  }

  // src/popup/main.jsx
  var ISSUES_URL = "https://github.com/svergio/chat-export-extension/issues";
  var DONATE_URL = "https://www.donationalerts.com/r/svwergio_mel";
  function renderWithIssuesLink(text) {
    const s3 = String(text || "");
    const idx = s3.indexOf(ISSUES_URL);
    if (idx < 0) return s3;
    const before = s3.slice(0, idx);
    const after = s3.slice(idx + ISSUES_URL.length);
    return [
      before,
      /* @__PURE__ */ k("a", { class: "ce-link", href: ISSUES_URL, target: "_blank", rel: "noreferrer" }, ISSUES_URL),
      after
    ];
  }
  function statusState(status) {
    return status && status.state || "offline";
  }
  function statusTone(status) {
    const state = statusState(status);
    if (state === "connected") return "ok";
    if (state === "connecting") return "warn";
    if (state === "auth_failed") return "danger";
    return "muted";
  }
  function sendBridge(action, extra) {
    return new Promise(function(resolve) {
      chrome.runtime.sendMessage(Object.assign({ type: "ce-bridge", action }, extra || {}), function(res) {
        void chrome.runtime.lastError;
        resolve(res || { ok: false });
      });
    });
  }
  function usePrefersDark() {
    const [dark, setDark] = d2(function() {
      return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
    });
    A2(function() {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      function onChange(ev) {
        setDark(!!ev.matches);
      }
      if (mq.addEventListener) mq.addEventListener("change", onChange);
      else mq.addListener(onChange);
      setDark(!!mq.matches);
      return function() {
        if (mq.removeEventListener) mq.removeEventListener("change", onChange);
        else mq.removeListener(onChange);
      };
    }, []);
    return dark;
  }
  function applyDocumentTheme(dataSkin, scheme, prefersDark) {
    const resolved = resolveUiScheme(scheme, prefersDark);
    const root = document.documentElement;
    root.dataset.skin = dataSkin || SKIN_AUTO_FALLBACK;
    root.dataset.scheme = resolved;
    root.style.colorScheme = resolved;
  }
  function Switch({ on, disabled, onClick, label, onLabel, offLabel }) {
    return /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-switch" + (on ? " is-on" : ""),
        disabled,
        "aria-pressed": on,
        "aria-label": label,
        onClick
      },
      /* @__PURE__ */ k("span", { class: "ce-switch-track", "aria-hidden": "true" }, /* @__PURE__ */ k("span", { class: "ce-switch-knob" })),
      /* @__PURE__ */ k("span", { class: "ce-switch-label" }, on ? onLabel : offLabel)
    );
  }
  function SelectMenu({ label, valueLabel, leading, open, setOpen, disabled, children, ariaLabel }) {
    const rootRef = T2(null);
    A2(() => {
      if (!open) return void 0;
      function onDoc(ev) {
        if (rootRef.current && !rootRef.current.contains(ev.target)) setOpen(false);
      }
      function onKey(ev) {
        if (ev.key === "Escape") setOpen(false);
      }
      document.addEventListener("mousedown", onDoc, true);
      document.addEventListener("keydown", onKey, true);
      return () => {
        document.removeEventListener("mousedown", onDoc, true);
        document.removeEventListener("keydown", onKey, true);
      };
    }, [open, setOpen]);
    return /* @__PURE__ */ k("div", { class: "ce-row ce-select-row", ref: rootRef }, /* @__PURE__ */ k("span", null, label), /* @__PURE__ */ k("div", { class: "ce-select" + (open ? " is-open" : "") }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-select-btn",
        disabled,
        "aria-haspopup": "listbox",
        "aria-expanded": open ? "true" : "false",
        "aria-label": ariaLabel || label,
        onClick: () => setOpen(!open)
      },
      leading ? /* @__PURE__ */ k("span", { class: "ce-select-leading" }, leading) : null,
      /* @__PURE__ */ k("span", { class: "ce-select-value" }, valueLabel),
      /* @__PURE__ */ k(IconChevron, { size: 12 })
    ), open ? /* @__PURE__ */ k("div", { class: "ce-select-menu", role: "listbox", "aria-label": ariaLabel || label }, children) : null));
  }
  function StatusDot({ status, label }) {
    const tone = statusTone(status);
    const detail = status && status.detail ? String(status.detail) : "";
    const title = detail ? label + " \u2014 " + detail : label;
    return /* @__PURE__ */ k(
      "span",
      {
        class: "ce-dot ce-dot--" + tone,
        role: "status",
        "aria-label": label,
        title
      }
    );
  }
  function ToneLine({ tone, text }) {
    if (!text) return null;
    return /* @__PURE__ */ k("p", { class: "ce-tone ce-tone--" + (tone || "muted") }, text);
  }
  function IconFolder({ size = 14 }) {
    return /* @__PURE__ */ k("svg", { width: size, height: size, viewBox: "0 0 16 16", fill: "none", "aria-hidden": "true" }, /* @__PURE__ */ k(
      "path",
      {
        d: "M2 4.5A1.5 1.5 0 0 1 3.5 3H6l1.5 1.5H12.5A1.5 1.5 0 0 1 14 6v6.5A1.5 1.5 0 0 1 12.5 14h-9A1.5 1.5 0 0 1 2 12.5v-8Z",
        stroke: "currentColor",
        "stroke-width": "1.25",
        "stroke-linejoin": "round"
      }
    ));
  }
  function PrimaryTosConsent({ onAccept, busy, t: t3, localeSetting, onSetLocale }) {
    const [checked, setChecked] = d2(false);
    const currentLoc = localeSetting || "auto";
    return /* @__PURE__ */ k("div", { class: "ce-wrap" }, /* @__PURE__ */ k("section", { class: "ce-card ce-tos-card" }, /* @__PURE__ */ k("header", { class: "ce-head" }, /* @__PURE__ */ k("h1", null, t3("app.title")), /* @__PURE__ */ k("div", { class: "ce-lang-pills", role: "group", "aria-label": t3("label.language") }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-lang-pill" + (currentLoc === "auto" ? " is-active" : ""),
        disabled: busy,
        onClick: () => onSetLocale("auto")
      },
      t3("lang.auto")
    ), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-lang-pill" + (currentLoc === "en" ? " is-active" : ""),
        disabled: busy,
        onClick: () => onSetLocale("en")
      },
      "EN"
    ), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-lang-pill" + (currentLoc === "ru" ? " is-active" : ""),
        disabled: busy,
        onClick: () => onSetLocale("ru")
      },
      "RU"
    ))), /* @__PURE__ */ k("h2", null, t3("tos.title")), /* @__PURE__ */ k("div", { class: "ce-faq-compact ce-tos-body" }, /* @__PURE__ */ k("p", { class: "ce-lead" }, t3("tos.lead")), /* @__PURE__ */ k("ul", null, tosKeys().map(function(key) {
      return /* @__PURE__ */ k("li", { key }, renderWithIssuesLink(t3(key)));
    })), /* @__PURE__ */ k("label", { class: "ce-check", htmlFor: "ce-tos-agree" }, /* @__PURE__ */ k(
      "input",
      {
        id: "ce-tos-agree",
        name: "ce-tos-agree",
        type: "checkbox",
        checked,
        onChange: (e3) => setChecked(e3.currentTarget.checked)
      }
    ), /* @__PURE__ */ k("span", null, t3("tos.agree"))), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-btn ce-btn--primary",
        disabled: !checked || busy,
        onClick: () => onAccept()
      },
      t3("btn.acceptTos")
    ))));
  }
  function AdvancedFaqConsent({ consented, onConsent, busy, t: t3 }) {
    const [checked, setChecked] = d2(false);
    if (consented) return null;
    return /* @__PURE__ */ k("div", { class: "ce-faq-compact" }, /* @__PURE__ */ k("p", { class: "ce-lead" }, t3("faq.lead")), /* @__PURE__ */ k("ul", null, faqKeys().map(function(key) {
      return /* @__PURE__ */ k("li", { key }, renderWithIssuesLink(t3(key)));
    })), /* @__PURE__ */ k("label", { class: "ce-check", htmlFor: "ce-faq-agree" }, /* @__PURE__ */ k(
      "input",
      {
        id: "ce-faq-agree",
        name: "ce-faq-agree",
        type: "checkbox",
        checked,
        onChange: (e3) => setChecked(e3.currentTarget.checked)
      }
    ), /* @__PURE__ */ k("span", null, t3("faq.agree"))), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-btn ce-btn--primary",
        disabled: !checked || busy,
        onClick: () => onConsent()
      },
      t3("btn.continue")
    ));
  }
  function App() {
    const [ready, setReady] = d2(false);
    const [settings, setSettings] = d2(normalizeSettings(DEFAULT_SETTINGS));
    const [status, setStatus] = d2({ state: "offline", detail: "" });
    const [browserId, setBrowserId] = d2("");
    const [tone, setTone] = d2({ kind: "", text: "" });
    const [busy, setBusy] = d2(false);
    const [exportOpen, setExportOpen] = d2(false);
    const [advancedOpen, setAdvancedOpen] = d2(false);
    const [skinOpen, setSkinOpen] = d2(false);
    const [schemeOpen, setSchemeOpen] = d2(false);
    const [localeOpen, setLocaleOpen] = d2(false);
    const [shiftOpen, setShiftOpen] = d2(false);
    const [schemaDefaultOpen, setSchemaDefaultOpen] = d2(false);
    const [formatMenuOpen, setFormatMenuOpen] = d2(null);
    const [folderStatus, setFolderStatus] = d2({ state: "none", name: null });
    const [resolvedDataSkin, setResolvedDataSkin] = d2(SKIN_AUTO_FALLBACK);
    const prefersDark = usePrefersDark();
    const ui = settings.ui || { skin: "auto", scheme: "auto", locale: "auto" };
    const localeCode = resolveLocale(ui.locale);
    const t3 = w2(() => createTranslator(localeCode), [localeCode]);
    const refresh = b(async () => {
      const res = await sendBridge("getState");
      if (res && res.ok) {
        setSettings(normalizeSettings(res.settings));
        setStatus(res.status || { state: "offline" });
        setBrowserId(res.browserId || "");
      }
      setReady(true);
    }, []);
    A2(() => {
      refresh();
      const onChanged = (changes, area) => {
        if (area !== "local") return;
        if (changes["ce.bridgeStatus"] && changes["ce.bridgeStatus"].newValue) {
          setStatus(changes["ce.bridgeStatus"].newValue);
        }
        if (changes["ce.settings"] && changes["ce.settings"].newValue) {
          setSettings(normalizeSettings(changes["ce.settings"].newValue));
        }
      };
      chrome.storage.onChanged.addListener(onChanged);
      return () => chrome.storage.onChanged.removeListener(onChanged);
    }, [refresh]);
    A2(() => {
      let cancelled = false;
      resolveUiDataSkinForPopup(ui).then(function(dataSkin) {
        if (cancelled) return;
        setResolvedDataSkin(dataSkin);
        applyDocumentTheme(dataSkin, ui.scheme, prefersDark);
      });
      return function() {
        cancelled = true;
      };
    }, [ui.skin, ui.scheme, prefersDark]);
    const refreshFolderStatus = b(async function() {
      const res = await sendBridge("folderStatus");
      if (res && res.ok && res.state) {
        setFolderStatus({ state: res.state, name: res.name || null });
      } else if (res && res.ok) {
        setFolderStatus({ state: "none", name: null });
      } else {
        setFolderStatus({ state: "unsupported", name: null });
      }
    }, []);
    A2(() => {
      refreshFolderStatus();
      function onMessage(msg) {
        if (msg && msg.type === "ce-folder-changed") {
          setFolderStatus({
            state: msg.state || "none",
            name: msg.name != null ? msg.name : null
          });
        }
      }
      chrome.runtime.onMessage.addListener(onMessage);
      return function() {
        chrome.runtime.onMessage.removeListener(onMessage);
      };
    }, [refreshFolderStatus]);
    async function persist(next) {
      const prev = settings;
      const normalized = normalizeSettings(next);
      if (normalized.serverOn && (!hasTosConsent(normalized) || !hasFaqConsent(normalized))) {
        normalized.serverOn = false;
      }
      setSettings(normalized);
      setBusy(true);
      const res = await sendBridge("saveSettings", { settings: normalized });
      setBusy(false);
      if (persistSaveFailed(res)) {
        setSettings(prev);
        setTone({ kind: "danger", text: t3("test.fail") });
        return null;
      }
      let saved = reconcileSavedSettings(normalized, res.settings);
      if ((normalized.tosVersion || 0) !== (saved.tosVersion || 0) || (normalized.faqVersion || 0) !== (saved.faqVersion || 0)) {
        await writeSettingsLocal(saved);
      }
      setSettings(saved);
      const st = await sendBridge("getState");
      if (st && st.status) setStatus(st.status);
      if (st && st.ok && st.settings) {
        saved = reconcileSavedSettings(normalized, st.settings);
        setSettings(saved);
      }
      return saved;
    }
    function writeSettingsLocal(settingsObj) {
      return new Promise(function(resolve) {
        chrome.storage.local.set({ [STORAGE_KEYS.settings]: normalizeSettings(settingsObj) }, function() {
          resolve();
        });
      });
    }
    async function onAcceptTos() {
      setBusy(true);
      const saved = await persist(Object.assign({}, settings, { tosVersion: TOS_VERSION }));
      setBusy(false);
      if (saved && !hasTosConsent(saved)) {
        const forced = reconcileSavedSettings(
          { tosVersion: TOS_VERSION },
          saved
        );
        await writeSettingsLocal(forced);
        setSettings(forced);
      }
    }
    async function onConsent() {
      setBusy(true);
      const ensured = await sendBridge("ensureKey");
      const base = Object.assign({}, settings, {
        tosVersion: TOS_VERSION,
        faqVersion: FAQ_VERSION,
        apiKey: ensured && ensured.settings && ensured.settings.apiKey || settings.apiKey
      });
      const saved = await persist(base);
      setBusy(false);
      if (saved && (!hasTosConsent(saved) || !hasFaqConsent(saved))) {
        const forced = reconcileSavedSettings(base, saved);
        await writeSettingsLocal(forced);
        setSettings(forced);
      }
    }
    async function onGenerateKey() {
      setBusy(true);
      setTone({ kind: "muted", text: "" });
      const res = await sendBridge("rotateKey");
      setBusy(false);
      if (res && res.ok) {
        setSettings(normalizeSettings(res.settings));
        setTone({ kind: "ok", text: t3("key.generated") });
      } else {
        setTone({ kind: "danger", text: res && res.detail || t3("key.generateFailed") });
      }
    }
    async function onCopyKey() {
      const key = (settings.apiKey || "").trim();
      if (!key) return;
      try {
        await navigator.clipboard.writeText(key);
        setTone({ kind: "ok", text: t3("key.copied") });
      } catch (e3) {
        setTone({ kind: "danger", text: t3("key.copyFailed") });
      }
    }
    async function onTest() {
      setTone({ kind: "muted", text: t3("test.testing") });
      setBusy(true);
      await sendBridge("ensureKey");
      const res = await sendBridge("testConnection");
      setBusy(false);
      if (res && res.ok) setTone({ kind: "ok", text: t3("test.ok") });
      else setTone({ kind: "danger", text: res && res.detail || t3("test.fail") });
      await refresh();
    }
    function setUi(patch) {
      const nextUi = Object.assign({}, settings.ui || {}, patch);
      persist(Object.assign({}, settings, { ui: nextUi }));
    }
    function closeMenusExcept(which) {
      setSkinOpen(which === "skin");
      setSchemeOpen(which === "scheme");
      setLocaleOpen(which === "locale");
      setShiftOpen(which === "shift");
      setSchemaDefaultOpen(which === "schemaDefault");
      setFormatMenuOpen(which && String(which).indexOf("fmt:") === 0 ? String(which).slice(4) : null);
    }
    async function onFolderPick(mode) {
      await sendBridge("folderPick", { mode });
    }
    async function onFolderForget() {
      const res = await sendBridge("folderForget");
      if (res && res.ok) {
        setFolderStatus({ state: "none", name: null });
      } else {
        await refreshFolderStatus();
      }
    }
    function folderPathDisplay() {
      const state = folderStatus.state || "none";
      if (state === "granted" || state === "prompt") {
        const name = folderStatus.name ? String(folderStatus.name) : "";
        return name ? "\u2026/" + name : "\u2026/";
      }
      return "";
    }
    function folderPathPlaceholder() {
      const state = folderStatus.state || "none";
      if (state === "unsupported") return t3("saveFolder.unsupported");
      if (state === "none") return t3("saveFolder.none");
      return "";
    }
    function onFolderPathActivate() {
      if (!folderPickable || busy) return;
      if (folderState === "none") onFolderPick("pick");
      else onFolderPick(folderState === "prompt" ? "grant" : "rebind");
    }
    if (!ready) {
      return /* @__PURE__ */ k("div", { class: "ce-wrap" }, t3("app.loading"));
    }
    if (!hasTosConsent(settings)) {
      return /* @__PURE__ */ k(
        PrimaryTosConsent,
        {
          onAccept: onAcceptTos,
          busy,
          t: t3,
          localeSetting: ui.locale || "auto",
          onSetLocale: (loc) => setUi({ locale: loc })
        }
      );
    }
    const consented = hasFaqConsent(settings);
    const statusLabel = t3("status." + statusState(status));
    const skinOpt = SKIN_OPTIONS.find((o3) => o3.id === ui.skin) || SKIN_OPTIONS[0];
    const SkinIcon = skinOpt.Icon;
    const skinValueLabel = ui.skin === "auto" ? /* @__PURE__ */ k($, null, t3("skin.auto"), /* @__PURE__ */ k("span", { class: "ce-skin-auto-resolve" }, " \u2014 ", t3("skin." + resolvedDataSkin))) : t3("skin." + skinOpt.id);
    const gatewayOn = !!settings.serverOn;
    const shiftMode = settings.saveFolder && settings.saveFolder.shiftMode || "rebind";
    const schemaDefault = settings.exportSchemas && settings.exportSchemas.default || "chat-export/1";
    const folderState = folderStatus.state || "none";
    const folderPickable = folderState !== "unsupported";
    const folderPathValue = folderPathDisplay();
    const folderPathEmpty = !folderPathValue;
    const folderPathTitle = folderPathEmpty ? folderPathPlaceholder() : folderPathValue;
    return /* @__PURE__ */ k("div", { class: "ce-wrap" }, /* @__PURE__ */ k("section", { class: "ce-card" }, /* @__PURE__ */ k("header", { class: "ce-head" }, /* @__PURE__ */ k("h1", null, t3("app.title")), gatewayOn ? /* @__PURE__ */ k(StatusDot, { status, label: statusLabel }) : null), /* @__PURE__ */ k("h2", null, t3("label.platforms")), /* @__PURE__ */ k("div", { class: "ce-platforms" }, PLATFORMS.map(function(id) {
      const on = settings.platforms[id] !== false;
      const label = t3("platform." + id);
      const PlatIcon = PLATFORM_ICONS[id];
      return /* @__PURE__ */ k("label", { key: id, class: "ce-row" }, /* @__PURE__ */ k("span", { class: "ce-platform-label" }, PlatIcon ? /* @__PURE__ */ k(PlatIcon, { size: 14 }) : null, label), /* @__PURE__ */ k(
        Switch,
        {
          on,
          disabled: busy,
          label,
          onLabel: t3("label.on"),
          offLabel: t3("label.off"),
          onClick: () => {
            const platforms = Object.assign({}, settings.platforms, { [id]: !on });
            persist(Object.assign({}, settings, { platforms }));
          }
        }
      ));
    })), /* @__PURE__ */ k("div", { class: "ce-appearance" }, /* @__PURE__ */ k(
      SelectMenu,
      {
        label: t3("label.style"),
        ariaLabel: t3("label.style"),
        disabled: busy,
        open: skinOpen,
        setOpen: (v3) => v3 ? closeMenusExcept("skin") : setSkinOpen(false),
        leading: /* @__PURE__ */ k(SkinIcon, { size: 15 }),
        valueLabel: skinValueLabel
      },
      SKIN_OPTIONS.map(function(opt) {
        const active = ui.skin === opt.id;
        return /* @__PURE__ */ k(
          "button",
          {
            key: opt.id,
            type: "button",
            role: "option",
            "aria-selected": active ? "true" : "false",
            class: "ce-select-item" + (active ? " is-active" : ""),
            onClick: () => {
              setUi({ skin: opt.id });
              setSkinOpen(false);
            }
          },
          /* @__PURE__ */ k(opt.Icon, { size: 15 }),
          /* @__PURE__ */ k("span", null, t3("skin." + opt.id))
        );
      })
    ), /* @__PURE__ */ k(
      SelectMenu,
      {
        label: t3("label.theme"),
        ariaLabel: t3("label.theme"),
        disabled: busy,
        open: schemeOpen,
        setOpen: (v3) => v3 ? closeMenusExcept("scheme") : setSchemeOpen(false),
        valueLabel: t3("theme." + (ui.scheme || "auto"))
      },
      SCHEME_OPTIONS.map(function(opt) {
        const active = ui.scheme === opt.id;
        return /* @__PURE__ */ k(
          "button",
          {
            key: opt.id,
            type: "button",
            role: "option",
            "aria-selected": active ? "true" : "false",
            class: "ce-select-item" + (active ? " is-active" : ""),
            onClick: () => {
              setUi({ scheme: opt.id });
              setSchemeOpen(false);
            }
          },
          /* @__PURE__ */ k("span", null, t3("theme." + opt.id))
        );
      })
    ), /* @__PURE__ */ k(
      SelectMenu,
      {
        label: t3("label.language"),
        ariaLabel: t3("label.language"),
        disabled: busy,
        open: localeOpen,
        setOpen: (v3) => v3 ? closeMenusExcept("locale") : setLocaleOpen(false),
        valueLabel: t3("lang." + (ui.locale || "auto"))
      },
      LOCALE_OPTIONS.map(function(opt) {
        const active = (ui.locale || "auto") === opt.id;
        return /* @__PURE__ */ k(
          "button",
          {
            key: opt.id,
            type: "button",
            role: "option",
            "aria-selected": active ? "true" : "false",
            class: "ce-select-item" + (active ? " is-active" : ""),
            onClick: () => {
              setUi({ locale: opt.id });
              setLocaleOpen(false);
            }
          },
          /* @__PURE__ */ k("span", null, t3("lang." + opt.id))
        );
      })
    )), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-advanced-toggle" + (exportOpen ? " is-open" : ""),
        "aria-expanded": exportOpen ? "true" : "false",
        onClick: () => setExportOpen(!exportOpen)
      },
      /* @__PURE__ */ k(IconChevron, { size: 12 }),
      /* @__PURE__ */ k("span", null, exportOpen ? t3("btn.hideExportSettings") : t3("btn.showExportSettings"))
    ), exportOpen ? /* @__PURE__ */ k("div", { class: "ce-advanced-panel ce-export-panel" }, /* @__PURE__ */ k("div", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.saveFolder")), /* @__PURE__ */ k("div", { class: "ce-save-folder" }, /* @__PURE__ */ k(
      "div",
      {
        class: "ce-save-folder-path" + (folderState === "prompt" ? " is-warn" : "") + (folderPathEmpty ? " is-empty" : "") + (folderPickable && !busy ? " is-clickable" : ""),
        role: folderPickable ? "button" : void 0,
        tabIndex: folderPickable && !busy ? 0 : void 0,
        title: folderPathTitle,
        onClick: () => onFolderPathActivate(),
        onKeyDown: (e3) => {
          if (!folderPickable || busy) return;
          if (e3.key === "Enter" || e3.key === " ") {
            e3.preventDefault();
            onFolderPathActivate();
          }
        }
      },
      /* @__PURE__ */ k("span", { class: "ce-save-folder-path-icon" }, /* @__PURE__ */ k(IconFolder, { size: 14 })),
      /* @__PURE__ */ k(
        "input",
        {
          id: "ce-save-folder-path",
          name: "ce-save-folder-path",
          type: "text",
          readOnly: true,
          tabIndex: -1,
          value: folderPathValue,
          placeholder: folderPathPlaceholder()
        }
      )
    ), folderState === "prompt" ? /* @__PURE__ */ k("p", { class: "ce-hint ce-save-folder-prompt" }, t3("saveFolder.prompt")) : null, folderPickable ? /* @__PURE__ */ k("div", { class: "ce-save-folder-actions" }, folderState === "none" ? /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-btn ce-btn--solid",
        disabled: busy,
        onClick: () => onFolderPick("pick")
      },
      t3("btn.chooseFolder")
    ) : /* @__PURE__ */ k($, null, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-btn ce-btn--solid",
        disabled: busy,
        onClick: () => onFolderPick(folderState === "prompt" ? "grant" : "rebind")
      },
      t3("btn.changeFolder")
    ), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-btn",
        disabled: busy,
        onClick: () => onFolderForget()
      },
      t3("btn.forgetFolder")
    ))) : null)), /* @__PURE__ */ k(
      SelectMenu,
      {
        label: t3("label.shiftMode"),
        ariaLabel: t3("label.shiftMode"),
        disabled: busy,
        open: shiftOpen,
        setOpen: (v3) => v3 ? closeMenusExcept("shift") : setShiftOpen(false),
        valueLabel: t3("shiftMode." + shiftMode)
      },
      SHIFT_MODES.map(function(id) {
        const active = shiftMode === id;
        return /* @__PURE__ */ k(
          "button",
          {
            key: id,
            type: "button",
            role: "option",
            "aria-selected": active ? "true" : "false",
            class: "ce-select-item" + (active ? " is-active" : ""),
            onClick: () => {
              const saveFolder = Object.assign({}, settings.saveFolder || {}, { shiftMode: id });
              persist(Object.assign({}, settings, { saveFolder }));
              setShiftOpen(false);
            }
          },
          /* @__PURE__ */ k("span", null, t3("shiftMode." + id))
        );
      })
    ), /* @__PURE__ */ k("p", { class: "ce-hint ce-hint--tight" }, t3("hint.shiftMode")), /* @__PURE__ */ k(
      SelectMenu,
      {
        label: t3("label.schemaDefault"),
        ariaLabel: t3("label.schemaDefault"),
        disabled: busy,
        open: schemaDefaultOpen,
        setOpen: (v3) => v3 ? closeMenusExcept("schemaDefault") : setSchemaDefaultOpen(false),
        valueLabel: t3("schema." + schemaDefault)
      },
      EXPORT_SCHEMA_IDS.map(function(id) {
        const active = schemaDefault === id;
        return /* @__PURE__ */ k(
          "button",
          {
            key: id,
            type: "button",
            role: "option",
            "aria-selected": active ? "true" : "false",
            class: "ce-select-item" + (active ? " is-active" : ""),
            onClick: () => {
              const exportSchemas = normalizeExportSchemas(
                Object.assign({}, settings.exportSchemas, { default: id })
              );
              persist(Object.assign({}, settings, { exportSchemas }));
              setSchemaDefaultOpen(false);
            }
          },
          /* @__PURE__ */ k("span", null, t3("schema." + id))
        );
      })
    ), /* @__PURE__ */ k("div", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.schemaPerFormat")), EXPORT_FORMAT_IDS.map(function(fmt) {
      const cur = settings.exportSchemas && settings.exportSchemas.byFormat && settings.exportSchemas.byFormat[fmt];
      const menuKey = "fmt:" + fmt;
      const open = formatMenuOpen === fmt;
      return /* @__PURE__ */ k(
        SelectMenu,
        {
          key: fmt,
          label: t3("format." + fmt),
          ariaLabel: t3("format." + fmt),
          disabled: busy,
          open,
          setOpen: (v3) => v3 ? closeMenusExcept(menuKey) : setFormatMenuOpen(null),
          valueLabel: cur ? t3("schema." + cur) : t3("schema.inherit")
        },
        /* @__PURE__ */ k(
          "button",
          {
            type: "button",
            role: "option",
            "aria-selected": !cur ? "true" : "false",
            class: "ce-select-item" + (!cur ? " is-active" : ""),
            onClick: () => {
              const byFormat = Object.assign(
                {},
                settings.exportSchemas && settings.exportSchemas.byFormat || {},
                { [fmt]: null }
              );
              const exportSchemas = normalizeExportSchemas(
                Object.assign({}, settings.exportSchemas, { byFormat })
              );
              persist(Object.assign({}, settings, { exportSchemas }));
              setFormatMenuOpen(null);
            }
          },
          /* @__PURE__ */ k("span", null, t3("schema.inherit"))
        ),
        EXPORT_SCHEMA_IDS.map(function(id) {
          const active = cur === id;
          return /* @__PURE__ */ k(
            "button",
            {
              key: id,
              type: "button",
              role: "option",
              "aria-selected": active ? "true" : "false",
              class: "ce-select-item" + (active ? " is-active" : ""),
              onClick: () => {
                const byFormat = Object.assign(
                  {},
                  settings.exportSchemas && settings.exportSchemas.byFormat || {},
                  { [fmt]: id }
                );
                const exportSchemas = normalizeExportSchemas(
                  Object.assign({}, settings.exportSchemas, { byFormat })
                );
                persist(Object.assign({}, settings, { exportSchemas }));
                setFormatMenuOpen(null);
              }
            },
            /* @__PURE__ */ k("span", null, t3("schema." + id))
          );
        })
      );
    }))) : null, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-advanced-toggle" + (advancedOpen ? " is-open" : ""),
        "aria-expanded": advancedOpen ? "true" : "false",
        onClick: () => setAdvancedOpen(!advancedOpen)
      },
      /* @__PURE__ */ k(IconChevron, { size: 12 }),
      /* @__PURE__ */ k("span", null, advancedOpen ? t3("btn.hideAdvanced") : t3("btn.showAdvanced"))
    ), advancedOpen ? /* @__PURE__ */ k("div", { class: "ce-advanced-panel" }, /* @__PURE__ */ k(AdvancedFaqConsent, { consented, onConsent, busy, t: t3 }), /* @__PURE__ */ k("label", { class: "ce-row" }, /* @__PURE__ */ k("span", null, t3("label.gateway")), /* @__PURE__ */ k(
      Switch,
      {
        on: settings.serverOn,
        disabled: busy || !consented,
        label: t3("label.gateway"),
        onLabel: t3("label.on"),
        offLabel: t3("label.off"),
        onClick: async () => {
          if (!consented) return;
          const turningOn = !settings.serverOn;
          let next = Object.assign({}, settings, { serverOn: turningOn });
          if (turningOn) {
            const ensured = await sendBridge("ensureKey");
            if (ensured && ensured.settings) {
              next = Object.assign({}, next, ensured.settings, { serverOn: true });
            }
          }
          await persist(next);
        }
      }
    )), /* @__PURE__ */ k("div", { class: "ce-host-port" }, /* @__PURE__ */ k("label", { class: "ce-field", htmlFor: "ce-host" }, /* @__PURE__ */ k("span", null, t3("label.host")), /* @__PURE__ */ k(
      "input",
      {
        id: "ce-host",
        name: "ce-host",
        type: "text",
        spellcheck: false,
        value: settings.host,
        placeholder: "127.0.0.1",
        onChange: (e3) => setSettings(Object.assign({}, settings, { host: e3.currentTarget.value })),
        onBlur: () => persist(settings)
      }
    )), /* @__PURE__ */ k("label", { class: "ce-field", htmlFor: "ce-port" }, /* @__PURE__ */ k("span", null, t3("label.port")), /* @__PURE__ */ k(
      "input",
      {
        id: "ce-port",
        name: "ce-port",
        type: "number",
        min: "1",
        max: "65535",
        value: settings.port,
        placeholder: "8765",
        onChange: (e3) => setSettings(
          normalizeSettings(
            Object.assign({}, settings, { port: Number(e3.currentTarget.value) })
          )
        ),
        onBlur: () => persist(settings)
      }
    ))), /* @__PURE__ */ k("label", { class: "ce-field", htmlFor: "ce-browser-label" }, /* @__PURE__ */ k("span", null, t3("label.browserLabel")), /* @__PURE__ */ k(
      "input",
      {
        id: "ce-browser-label",
        name: "ce-browser-label",
        type: "text",
        value: settings.browserLabel,
        onChange: (e3) => setSettings(Object.assign({}, settings, { browserLabel: e3.currentTarget.value })),
        onBlur: () => persist(settings)
      }
    )), /* @__PURE__ */ k("label", { class: "ce-field", htmlFor: "ce-browser-id" }, /* @__PURE__ */ k("span", null, t3("label.browserId")), /* @__PURE__ */ k(
      "input",
      {
        id: "ce-browser-id",
        name: "ce-browser-id",
        type: "text",
        readOnly: true,
        spellcheck: false,
        value: browserId || "\u2014"
      }
    ), /* @__PURE__ */ k("p", { class: "ce-hint" }, t3("browser.hint"))), /* @__PURE__ */ k("div", { class: "ce-field" }, /* @__PURE__ */ k("label", { htmlFor: "ce-gateway-token" }, t3("label.gatewayToken")), /* @__PURE__ */ k(
      "input",
      {
        id: "ce-gateway-token",
        name: "ce-gateway-token",
        type: "text",
        autocomplete: "off",
        spellcheck: false,
        readOnly: true,
        value: settings.apiKey,
        placeholder: t3("key.placeholder")
      }
    ), /* @__PURE__ */ k("div", { class: "ce-actions ce-actions--tight" }, /* @__PURE__ */ k("button", { type: "button", class: "ce-btn", disabled: busy || !consented, onClick: onGenerateKey }, settings.apiKey ? t3("btn.rotate") : t3("btn.generate")), /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-btn",
        disabled: busy || !settings.apiKey.trim(),
        onClick: onCopyKey
      },
      t3("btn.copy")
    ))), /* @__PURE__ */ k("div", { class: "ce-test-row" }, /* @__PURE__ */ k(
      "button",
      {
        type: "button",
        class: "ce-btn ce-btn--solid",
        disabled: busy || !consented,
        onClick: onTest
      },
      t3("test.connection")
    ), /* @__PURE__ */ k(ToneLine, { tone: tone.kind, text: tone.text })), /* @__PURE__ */ k("h2", null, t3("label.permissions")), /* @__PURE__ */ k("label", { class: "ce-row" }, /* @__PURE__ */ k("span", null, t3("label.allowCreate")), /* @__PURE__ */ k(
      Switch,
      {
        on: settings.allowCreate,
        disabled: busy,
        label: t3("label.allowCreate"),
        onLabel: t3("label.on"),
        offLabel: t3("label.off"),
        onClick: () => persist(Object.assign({}, settings, { allowCreate: !settings.allowCreate }))
      }
    )), /* @__PURE__ */ k("label", { class: "ce-row" }, /* @__PURE__ */ k("span", null, t3("label.allowProjects")), /* @__PURE__ */ k(
      Switch,
      {
        on: settings.allowProjects,
        disabled: busy,
        label: t3("label.allowProjects"),
        onLabel: t3("label.on"),
        offLabel: t3("label.off"),
        onClick: () => persist(Object.assign({}, settings, { allowProjects: !settings.allowProjects }))
      }
    )), /* @__PURE__ */ k("label", { class: "ce-row" }, /* @__PURE__ */ k("span", null, t3("label.destructive")), /* @__PURE__ */ k(
      Switch,
      {
        on: settings.allowDestructive,
        disabled: busy,
        label: t3("label.destructive"),
        onLabel: t3("label.on"),
        offLabel: t3("label.off"),
        onClick: () => persist(Object.assign({}, settings, { allowDestructive: !settings.allowDestructive }))
      }
    )), /* @__PURE__ */ k("label", { class: "ce-field", htmlFor: "ce-rpc-timeout" }, /* @__PURE__ */ k("span", null, t3("label.rpcTimeout")), /* @__PURE__ */ k(
      "input",
      {
        id: "ce-rpc-timeout",
        name: "ce-rpc-timeout",
        type: "number",
        min: "5",
        max: "600",
        value: settings.rpcTimeoutS,
        onChange: (e3) => setSettings(
          normalizeSettings(
            Object.assign({}, settings, { rpcTimeoutS: Number(e3.currentTarget.value) })
          )
        ),
        onBlur: () => persist(settings)
      }
    )), /* @__PURE__ */ k("details", { class: "ce-more" }, /* @__PURE__ */ k("summary", null, t3("label.faq")), /* @__PURE__ */ k("ul", null, faqKeys().map(function(key) {
      return /* @__PURE__ */ k("li", { key }, renderWithIssuesLink(t3(key)));
    })))) : null, /* @__PURE__ */ k("details", { class: "ce-more ce-more--footer" }, /* @__PURE__ */ k("summary", null, t3("label.tos")), /* @__PURE__ */ k("ul", null, tosKeys().map(function(key) {
      return /* @__PURE__ */ k("li", { key }, renderWithIssuesLink(t3(key)));
    }))), /* @__PURE__ */ k("p", { class: "ce-donate" }, /* @__PURE__ */ k(
      "a",
      {
        class: "ce-link ce-donate-link",
        href: DONATE_URL,
        target: "_blank",
        rel: "noopener noreferrer nofollow",
        onClick: (e3) => {
          e3.preventDefault();
          try {
            chrome.tabs.create({ url: DONATE_URL, active: true });
          } catch (_3) {
          }
          window.close();
        }
      },
      t3("label.donate")
    ), /* @__PURE__ */ k("span", { class: "ce-donate-hint" }, t3("donate.hint")))));
  }
  Q(/* @__PURE__ */ k(App, null), document.getElementById("app"));
})();
