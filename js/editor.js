/* ============================================================
   editor.js — the code box. CodeMirror 5 (from cdnjs) when it has
   loaded, with R colouring, line numbers and bracket matching; a plain
   textarea if it has not. Either way: LR.editor(host, code, opts)
   → { get(), set(code), focus(), onRun(fn) }.  Ctrl/Cmd + Enter runs.
   ============================================================ */
(function (LR) {
  'use strict';

  LR.editor = function (host, code, opts) {
    opts = opts || {};
    var runFns = [], api;
    function fireRun() { runFns.forEach(function (f) { f(); }); }

    if (window.CodeMirror) {
      var cm = window.CodeMirror(host, {
        value: code || '', mode: 'r', lineNumbers: true, matchBrackets: true, indentUnit: 2, tabSize: 2,
        viewportMargin: Infinity, lineWrapping: true, screenReaderLabel: opts.label || 'R code',
        extraKeys: {
          'Ctrl-Enter': fireRun, 'Cmd-Enter': fireRun,
          Tab: function (c) { c.replaceSelection('  '); }
        }
      });
      api = {
        get: function () { return cm.getValue(); },
        set: function (v) { cm.setValue(v || ''); },
        focus: function () { cm.focus(); },
        refresh: function () { cm.refresh(); },
        onChange: function (f) { cm.on('change', function () { f(cm.getValue()); }); }
      };
    } else {
      var ta = LR.h('textarea', { class: 'ed-plain', spellcheck: 'false', autocapitalize: 'off', autocomplete: 'off', 'aria-label': opts.label || 'R code' });
      ta.value = code || '';
      ta.rows = Math.max(4, (code || '').split('\n').length + 1);
      ta.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); fireRun(); }
        if (e.key === 'Tab') { e.preventDefault(); var s = ta.selectionStart; ta.value = ta.value.slice(0, s) + '  ' + ta.value.slice(ta.selectionEnd); ta.selectionStart = ta.selectionEnd = s + 2; }
      });
      host.appendChild(ta);
      api = {
        get: function () { return ta.value; },
        set: function (v) { ta.value = v || ''; },
        focus: function () { ta.focus(); },
        refresh: function () {},
        onChange: function (f) { ta.addEventListener('input', function () { f(ta.value); }); }
      };
    }
    api.onRun = function (f) { runFns.push(f); };
    return api;
  };
})(window.LR);
