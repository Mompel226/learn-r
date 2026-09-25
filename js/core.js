/* ============================================================
   core.js — the small toolkit every page of Learn R uses.
   LR.h (make an element) · LR.esc · LR.md (inline markup) · LR.store
   (localStorage that never throws) · LR.qs (the query string).

   Markup in course text (LR.md):
     **bold**   __underline__ (the house style for emphasis)   *italic*
     `code`     ==highlight==   [link text](https://…)
     A blank line starts a new paragraph (LR.md(s) without {inline:true}).
   ============================================================ */
(function () {
  'use strict';
  var LR = window.LR = window.LR || {};

  LR.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  /* h('div', {class:'x', text:'…'}, [children]) — html: sets innerHTML; on*: listeners */
  LR.h = function (tag, attrs, kids) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    (kids || []).forEach(function (c) { if (c != null) el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return el;
  };

  function inline(s) {
    var codes = [];
    s = String(s).replace(/`([^`]+)`/g, function (m, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = LR.esc(s)
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/__([^_]+)__/g, '<u>$1</u>')
      .replace(/==([^=]+)==/g, '<mark>$1</mark>')
      .replace(/(^|[^\w*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    return s.replace(/\u0000(\d+)\u0000/g, function (m, i) { return '<code>' + LR.esc(codes[+i]) + '</code>'; });
  }
  LR.md = function (s, opts) {
    if (s == null) return '';
    if (opts && opts.inline) return inline(s).replace(/\n/g, '<br>');
    return String(s).split(/\n\s*\n/).map(function (p) {
      var lines = p.split('\n');
      if (lines.every(function (l) { return /^\s*[-·•] /.test(l); })) {
        return '<ul>' + lines.map(function (l) { return '<li>' + inline(l.replace(/^\s*[-·•] /, '')) + '</li>'; }).join('') + '</ul>';
      }
      return '<p>' + inline(p).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  };

  LR.store = {
    get: function (k, d) { try { var v = localStorage.getItem('learn-r.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem('learn-r.' + k, JSON.stringify(v)); } catch (e) { /* private mode: progress lives only in this tab */ } },
    del: function (k) { try { localStorage.removeItem('learn-r.' + k); } catch (e) {} }
  };

  LR.qs = function (k) { var m = new RegExp('[?&]' + k + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : null; };

  /* a tiny event hub: LR.on('r:status', fn) · LR.emit('r:status', data) */
  var subs = {};
  LR.on = function (ev, fn) { (subs[ev] = subs[ev] || []).push(fn); };
  LR.emit = function (ev, data) { (subs[ev] || []).forEach(function (fn) { try { fn(data); } catch (e) { console.error(e); } }); };

  LR.reduced = function () { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; };
})();
