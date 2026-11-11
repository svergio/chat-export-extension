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
  var FAQ_VERSION = 1;
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
  function resolveUiScheme(scheme, prefersDark) {
    if (scheme === "light") return "light";
    if (scheme === "dark") return "dark";
    return prefersDark ? "dark" : "light";
  }
  function hasFaqConsent(settings) {
    const s3 = normalizeSettings(settings);
    return s3.faqVersion === FAQ_VERSION;
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
    "label.faq": "FAQ",
    "label.on": "On",
    "label.off": "Off",
    "skin.chatgpt": "ChatGPT",
    "skin.grok": "Grok",
    "skin.grok-x": "X Grok",
    "skin.copilot": "Copilot",
    "skin.claude": "Claude",
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
  function faqKeys() {
    return ["faq.1", "faq.2", "faq.3", "faq.4", "faq.5"];
  }

  // src/popup/skin-icons.jsx
  function IconChatGpt({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" }));
  }
  function IconGrok({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 512 512", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M210.484 312.759L343.465 210.383C349.984 205.364 359.302 207.322 362.408 215.117C378.758 256.231 371.454 305.64 338.925 339.563C306.397 373.487 261.137 380.927 219.768 363.983L174.577 385.803C239.394 432.008 318.104 420.581 367.289 369.251C406.303 328.564 418.386 273.104 407.088 223.091L407.19 223.198C390.807 149.726 411.218 120.359 453.03 60.3072C454.02 58.8833 455.01 57.4595 456 56L400.978 113.382V113.204L210.45 312.794" }), /* @__PURE__ */ k("path", { d: "M183.042 337.641C136.519 291.294 144.54 219.567 184.236 178.203C213.59 147.59 261.683 135.096 303.666 153.464L348.755 131.75C340.632 125.627 330.221 119.042 318.275 114.414C264.277 91.2407 199.63 102.774 155.735 148.516C113.513 192.549 100.236 260.254 123.036 318.027C140.069 361.206 112.148 391.748 84.0229 422.575C74.0561 433.503 64.0553 444.431 56 456L183.007 337.677" }));
  }
  function IconX({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" }));
  }
  function IconClaude({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 100 100", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" }));
  }
  function IconCopilot({ size }) {
    const s3 = size || 16;
    return /* @__PURE__ */ k("svg", { viewBox: "0 0 24 24", width: s3, height: s3, fill: "currentColor", "aria-hidden": "true" }, /* @__PURE__ */ k("path", { d: "M23.922 16.997C23.061 18.492 18.063 22.02 12 22.02 5.937 22.02.939 18.492.078 16.997A.641.641 0 0 1 0 16.741v-2.869a.883.883 0 0 1 .053-.22c.372-.935 1.347-2.292 2.605-2.656.167-.429.414-1.055.644-1.517a10.098 10.098 0 0 1-.052-1.086c0-1.331.282-2.499 1.132-3.368.397-.406.89-.717 1.474-.952C7.255 2.937 9.248 1.98 11.978 1.98c2.731 0 4.767.957 6.166 2.093.584.235 1.077.546 1.474.952.85.869 1.132 2.037 1.132 3.368 0 .368-.014.733-.052 1.086.23.462.477 1.088.644 1.517 1.258.364 2.233 1.721 2.605 2.656a.841.841 0 0 1 .053.22v2.869a.641.641 0 0 1-.078.256Zm-11.75-5.992h-.344a4.359 4.359 0 0 1-.355.508c-.77.947-1.918 1.492-3.508 1.492-1.725 0-2.989-.359-3.782-1.259a2.137 2.137 0 0 1-.085-.104L4 11.746v6.585c1.435.779 4.514 2.179 8 2.179 3.486 0 6.565-1.4 8-2.179v-6.585l-.098-.104s-.033.045-.085.104c-.793.9-2.057 1.259-3.782 1.259-1.59 0-2.738-.545-3.508-1.492a4.359 4.359 0 0 1-.355-.508Zm2.328 3.25c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm-5 0c.549 0 1 .451 1 1v2c0 .549-.451 1-1 1-.549 0-1-.451-1-1v-2c0-.549.451-1 1-1Zm3.313-6.185c.136 1.057.403 1.913.878 2.497.442.544 1.134.938 2.344.938 1.573 0 2.292-.337 2.657-.751.384-.435.558-1.15.558-2.361 0-1.14-.243-1.847-.705-2.319-.477-.488-1.319-.862-2.824-1.025-1.487-.161-2.192.138-2.533.529-.269.307-.437.808-.438 1.578v.021c0 .265.021.562.063.893Zm-1.626 0c.042-.331.063-.628.063-.894v-.02c-.001-.77-.169-1.271-.438-1.578-.341-.391-1.046-.69-2.533-.529-1.505.163-2.347.537-2.824 1.025-.462.472-.705 1.179-.705 2.319 0 1.211.175 1.926.558 2.361.365.414 1.084.751 2.657.751 1.21 0 1.902-.394 2.344-.938.475-.584.742-1.44.878-2.497Z" }));
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
  var SKIN_OPTIONS = [
    { id: "chatgpt", Icon: IconChatGpt },
    { id: "grok", Icon: IconGrok },
    { id: "grok-x", Icon: IconX },
    { id: "copilot", Icon: IconCopilot },
    { id: "claude", Icon: IconClaude }
  ];
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

  // src/popup/main.jsx
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
  function applyDocumentTheme(skin, scheme, prefersDark) {
    const resolved = resolveUiScheme(scheme, prefersDark);
    const root = document.documentElement;
    root.dataset.skin = skin || "chatgpt";
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
  function AdvancedFaqConsent({ consented, onConsent, busy, t: t3 }) {
    const [checked, setChecked] = d2(false);
    if (consented) return null;
    return /* @__PURE__ */ k("div", { class: "ce-faq-compact" }, /* @__PURE__ */ k("p", { class: "ce-lead" }, t3("faq.lead")), /* @__PURE__ */ k("ul", null, faqKeys().map(function(key) {
      return /* @__PURE__ */ k("li", { key }, t3(key));
    })), /* @__PURE__ */ k("label", { class: "ce-check" }, /* @__PURE__ */ k("input", { type: "checkbox", checked, onChange: (e3) => setChecked(e3.currentTarget.checked) }), /* @__PURE__ */ k("span", null, t3("faq.agree"))), /* @__PURE__ */ k(
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
    const [advancedOpen, setAdvancedOpen] = d2(false);
    const [skinOpen, setSkinOpen] = d2(false);
    const [schemeOpen, setSchemeOpen] = d2(false);
    const [localeOpen, setLocaleOpen] = d2(false);
    const prefersDark = usePrefersDark();
    const ui = settings.ui || { skin: "chatgpt", scheme: "auto", locale: "auto" };
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
      applyDocumentTheme(ui.skin, ui.scheme, prefersDark);
    }, [ui.skin, ui.scheme, prefersDark]);
    async function persist(next) {
      const normalized = normalizeSettings(next);
      if (normalized.serverOn && !hasFaqConsent(normalized)) normalized.serverOn = false;
      setSettings(normalized);
      setBusy(true);
      await sendBridge("saveSettings", { settings: normalized });
      setBusy(false);
      const st = await sendBridge("getState");
      if (st && st.status) setStatus(st.status);
    }
    async function onConsent() {
      setBusy(true);
      const ensured = await sendBridge("ensureKey");
      const base = Object.assign({}, settings, {
        faqVersion: FAQ_VERSION,
        apiKey: ensured && ensured.settings && ensured.settings.apiKey || settings.apiKey
      });
      await persist(base);
      setBusy(false);
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
    }
    if (!ready) {
      return /* @__PURE__ */ k("div", { class: "ce-wrap" }, t3("app.loading"));
    }
    const consented = hasFaqConsent(settings);
    const statusLabel = t3("status." + statusState(status));
    const skinOpt = SKIN_OPTIONS.find((o3) => o3.id === ui.skin) || SKIN_OPTIONS[0];
    const SkinIcon = skinOpt.Icon;
    const gatewayOn = !!settings.serverOn;
    return /* @__PURE__ */ k("div", { class: "ce-wrap" }, /* @__PURE__ */ k("section", { class: "ce-card" }, /* @__PURE__ */ k("header", { class: "ce-head" }, /* @__PURE__ */ k("h1", null, t3("app.title")), gatewayOn ? /* @__PURE__ */ k(StatusDot, { status, label: statusLabel }) : null), /* @__PURE__ */ k("h2", null, t3("label.platforms")), /* @__PURE__ */ k("div", { class: "ce-platforms" }, PLATFORMS.map(function(id) {
      const on = settings.platforms[id] !== false;
      const label = t3("platform." + id);
      return /* @__PURE__ */ k("label", { key: id, class: "ce-row" }, /* @__PURE__ */ k("span", null, label), /* @__PURE__ */ k(
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
        valueLabel: t3("skin." + skinOpt.id)
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
    )), /* @__PURE__ */ k("div", { class: "ce-host-port" }, /* @__PURE__ */ k("label", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.host")), /* @__PURE__ */ k(
      "input",
      {
        type: "text",
        spellcheck: false,
        value: settings.host,
        placeholder: "127.0.0.1",
        onChange: (e3) => setSettings(Object.assign({}, settings, { host: e3.currentTarget.value })),
        onBlur: () => persist(settings)
      }
    )), /* @__PURE__ */ k("label", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.port")), /* @__PURE__ */ k(
      "input",
      {
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
    ))), /* @__PURE__ */ k("label", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.browserLabel")), /* @__PURE__ */ k(
      "input",
      {
        type: "text",
        value: settings.browserLabel,
        onChange: (e3) => setSettings(Object.assign({}, settings, { browserLabel: e3.currentTarget.value })),
        onBlur: () => persist(settings)
      }
    )), /* @__PURE__ */ k("label", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.browserId")), /* @__PURE__ */ k("input", { type: "text", readOnly: true, spellcheck: false, value: browserId || "\u2014" }), /* @__PURE__ */ k("p", { class: "ce-hint" }, t3("browser.hint"))), /* @__PURE__ */ k("div", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.gatewayToken")), /* @__PURE__ */ k(
      "input",
      {
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
    )), /* @__PURE__ */ k("p", { class: "ce-hint" }, t3("key.hint"), browserId ? " " + t3("key.hintId") + " " + browserId : "")), /* @__PURE__ */ k("div", { class: "ce-test-row" }, /* @__PURE__ */ k(
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
    )), /* @__PURE__ */ k("label", { class: "ce-field" }, /* @__PURE__ */ k("span", null, t3("label.rpcTimeout")), /* @__PURE__ */ k(
      "input",
      {
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
      return /* @__PURE__ */ k("li", { key }, t3(key));
    })))) : null));
  }
  Q(/* @__PURE__ */ k(App, null), document.getElementById("app"));
})();
