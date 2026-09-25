/* ============================================================
   blocks.js — everything a stage is made of. A stage is a list of
   blocks; LR.blocks[type](spec, ctx) returns an element.

   Reading:  goal · text · concept · analogy · note · interpret (opens
             after the student has tried) · example (code to read) · frames
   Doing:    exercise (write R, Run, Check) · mcq · rplot (a graph R draws
             from pickers) · rtable (a table R works out) · filltable
             (the student fills in numbers R checks) · rquiz (dropdown
             answers whose key R works out from the data)

   A block with gate:true must be passed before the stage's "Continue"
   appears. ctx.pass(id) records it; ctx.passed(id) reads it.
   ============================================================ */
(function (LR) {
  'use strict';
  var h = LR.h, md = LR.md, esc = LR.esc;
  var B = LR.blocks = {};

  function box(cls, label, body) {
    var el = h('div', { class: 'blk ' + cls });
    if (label) el.appendChild(h('div', { class: 'blk__k', text: label }));
    if (body != null) el.appendChild(typeof body === 'string' ? h('div', { class: 'prose', html: body }) : body);
    return el;
  }

  B.goal = function (s) { return box('blk--goal', 'Goal', md(s.md || s.text, { inline: true })); };
  B.text = function (s) { return h('div', { class: 'blk blk--text prose', html: md(s.md) }); };
  B.concept = function (s) { return box('blk--concept', s.title || 'The idea', md(s.md)); };
  B.analogy = function (s) { return box('blk--analogy', 'Analogy' + (s.title ? ' · ' + s.title : ''), md(s.md)); };
  /* a note may carry files to download: files:[{ href, name (saved as), label, size }] */
  B.note = function (s) {
    var el = box('blk--note', s.title || null, md(s.md));
    if (s.files) {
      var ul = h('ul', { class: 'dl' });
      s.files.forEach(function (f) {
        ul.appendChild(h('li', {}, [h('a', { href: f.href, download: f.name || '', text: '⬇ ' + (f.label || f.name) }), f.size ? ' (' + f.size + ')' : null]));
      });
      el.appendChild(h('div', { class: 'prose' }, [ul]));
    }
    return el;
  };
  B.extension = function (s, ctx) {
    var el = box('blk--ext', 'Extension' + (s.title ? ' · ' + s.title : ''), null);
    if (s.md) el.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    (s.blocks || []).forEach(function (b) { el.appendChild(ctx.render(b)); });
    return el;
  };
  B.frames = function (s) {
    var ul = h('ul', { class: 'frames' });
    s.items.forEach(function (t) { ul.appendChild(h('li', { html: md(String(t).replace(/_{3,}/g, '\u0007'), { inline: true }).replace(/\u0007/g, '<span class="gap"></span>') })); });
    return box('blk--frames', s.title || 'Sentence frames: start your sentences like this', ul);
  };
  B.example = function (s) {
    var el = box('blk--example', s.title || 'Example', null);
    el.appendChild(h('pre', { class: 'code' }, [h('code', { text: s.code })]));
    if (s.md) el.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    return el;
  };
  B.interpret = function (s) {
    var d = h('details', { class: 'blk blk--interpret' });
    d.appendChild(h('summary', { html: '<span class="blk__k">' + esc(s.title || 'What it means') + '</span><span class="blk__open">Open after you have tried</span>' }));
    d.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    return d;
  };

  /* ---------- output from R: text, errors and graphs ---------- */
  function showOut(host, res) {
    host.innerHTML = '';
    var txt = res.out.filter(function (o) { return o.type === 'stdout'; }).map(function (o) { return o.data; }).join('\n');
    var err = res.out.filter(function (o) { return o.type === 'stderr'; }).map(function (o) { return o.data; }).join('\n');
    if (txt) host.appendChild(h('pre', { class: 'out', text: txt }));
    if (err) host.appendChild(h('pre', { class: 'out out--err', text: err }));
    if (res.images && res.images.length) { var g = h('div', { class: 'out-plots' }); LR.R.images(res.images, g); host.appendChild(g); }
    if (!txt && !err && !(res.images && res.images.length)) host.appendChild(h('p', { class: 'out-none', text: 'The code ran. It printed nothing.' }));
  }
  LR.showOut = showOut;

  /* R draws at the width the graph will be shown, so its text stays readable on a phone
     (a 620-px graph shrunk to 300 px would have 6-px labels) */
  function plotSize(host, w, hh) {
    w = w || 560; hh = hh || 380;
    var cw = host && host.clientWidth ? host.clientWidth : w;
    var W = Math.round(Math.min(w, Math.max(300, cw)));
    return { w: W, h: Math.round(hh * Math.max(0.78, W / w)) };
  }
  LR.plotSize = plotSize;

  function whenR(btns) {
    btns.forEach(function (b) { b.disabled = true; b.dataset.label = b.textContent; b.textContent = 'Waiting for R…'; });
    LR.R.ready.then(function () { btns.forEach(function (b) { b.disabled = false; b.textContent = b.dataset.label; }); },
      function () { btns.forEach(function (b) { b.textContent = 'R did not start'; }); });
  }

  /* ---------- exercise: write R, run it, check it ---------- */
  B.exercise = function (s, ctx) {
    var el = h('div', { class: 'blk blk--exercise' + (s.gate ? ' is-gate' : '') });
    el.appendChild(h('div', { class: 'blk__k', text: s.title || 'Your turn' }));
    if (s.task) el.appendChild(h('div', { class: 'prose', html: md(s.task) }));
    var edHost = h('div', { class: 'ed' });
    el.appendChild(edHost);
    var saved = ctx.getCode(s.id);
    var ed = LR.editor(edHost, saved != null ? saved : s.code, { label: 'R code for: ' + (s.title || 'your turn') });
    ed.onChange(function (v) { ctx.setCode(s.id, v); });

    var run = h('button', { type: 'button', class: 'btn btn--run', text: '▶ Run' });
    var chk = s.check ? h('button', { type: 'button', class: 'btn btn--check', text: '✓ Check my answer' }) : null;
    var reset = h('button', { type: 'button', class: 'btn btn--ghost', text: '↺ Start again' });
    var bar = h('div', { class: 'ex-bar' }, [run, chk, reset]);
    var hintBtn = null, hintBox = null;
    if (s.hint) {
      hintBtn = h('button', { type: 'button', class: 'btn btn--ghost', text: 'Hint', 'aria-expanded': 'false' });
      hintBox = h('div', { class: 'ex-hint prose', hidden: true, html: md(s.hint) });
      bar.appendChild(hintBtn);
      hintBtn.addEventListener('click', function () { var o = hintBox.hidden; hintBox.hidden = !o; hintBtn.setAttribute('aria-expanded', String(o)); });
    }
    bar.appendChild(h('span', { class: 'ex-keys', text: 'Ctrl + Enter runs' }));
    el.appendChild(bar);
    if (hintBox) el.appendChild(hintBox);
    var fb = h('div', { class: 'ex-fb', role: 'status' });
    var out = h('div', { class: 'ex-out', 'aria-live': 'polite' });
    el.appendChild(fb);
    el.appendChild(out);
    if (s.gate && ctx.passed(s.id)) fb.appendChild(h('p', { class: 'fb fb--ok', html: '✔ Done. ' + md(s.pass || 'You passed this one.', { inline: true }) }));

    function doRun(thenCheck) {
      run.disabled = true; if (chk) chk.disabled = true;
      fb.innerHTML = '';
      out.innerHTML = '<p class="out-wait">R is running your code…</p>';
      var needs = s.needsData ? ctx.dataReady() : Promise.resolve();
      return needs.then(function () { return LR.R.run(ed.get(), plotSize(out, s.w, s.h)); }).then(function (res) {
        showOut(out, res);
        if (!thenCheck) return null;
        if (!res.ok) { fb.appendChild(h('p', { class: 'fb fb--no', text: '✘ Your code stopped with an error (in red below). Fix that first, then check again.' })); return null; }
        return LR.R.check(s.check).then(function (r) {
          if (r === 'PASS') {
            fb.appendChild(h('p', { class: 'fb fb--ok', html: '✔ Correct. ' + md(s.pass || '', { inline: true }) }));
            if (s.gate) ctx.pass(s.id);
          } else {
            fb.appendChild(h('p', { class: 'fb fb--no', html: '✘ Not yet. ' + md(r, { inline: true }) }));
          }
        });
      }, function (e) {
        out.innerHTML = '';
        fb.appendChild(h('p', { class: 'fb fb--no', text: e && e.message ? e.message : 'Something went wrong. Reload the page.' }));
      }).then(function () { run.disabled = false; if (chk) chk.disabled = false; });
    }
    run.addEventListener('click', function () { doRun(false); });
    if (chk) chk.addEventListener('click', function () { doRun(true); });
    ed.onRun(function () { doRun(false); });
    reset.addEventListener('click', function () { ed.set(s.code); ctx.setCode(s.id, null); fb.innerHTML = ''; out.innerHTML = ''; ed.focus(); });
    whenR([run].concat(chk ? [chk] : []));
    el._refresh = function () { ed.refresh(); };
    return el;
  };

  /* ---------- multiple choice ---------- */
  B.mcq = function (s, ctx) {
    var el = h('div', { class: 'blk blk--mcq' + (s.gate ? ' is-gate' : '') });
    el.appendChild(h('div', { class: 'blk__k', text: s.title || 'Quick question' }));
    el.appendChild(h('p', { class: 'mcq__q', html: md(s.q, { inline: true }) }));
    if (s.visual) el.appendChild(ctx.render(s.visual));
    var list = h('div', { class: 'mcq__opts', role: 'group' });
    var fb = h('div', { class: 'ex-fb', role: 'status' });
    var order = s.keepOrder ? s.opts.map(function (o, i) { return i; }) : LR.shuffle(s.opts.map(function (o, i) { return i; }));
    order.forEach(function (i) {
      var o = s.opts[i];
      var b = h('button', { type: 'button', class: 'mcq__opt', html: md(o.t, { inline: true }) });
      b.addEventListener('click', function () {
        fb.innerHTML = '';
        if (o.ok) {
          b.classList.add('is-ok');
          list.querySelectorAll('button').forEach(function (x) { x.disabled = true; });
          fb.appendChild(h('p', { class: 'fb fb--ok', html: '✔ ' + md(o.why || 'Correct.', { inline: true }) }));
          if (s.gate) ctx.pass(s.id);
        } else {
          b.classList.add('is-no'); b.disabled = true;
          fb.appendChild(h('p', { class: 'fb fb--no', html: '✘ ' + md(o.why || 'Not this one. Try again.', { inline: true }) }));
        }
      });
      list.appendChild(b);
    });
    el.appendChild(list);
    el.appendChild(fb);
    if (s.gate && ctx.passed(s.id)) fb.appendChild(h('p', { class: 'fb fb--ok', text: '✔ You answered this one.' }));
    return el;
  };

  /* ---------- a graph R draws from the student's choices ---------- */
  function pickerOptions(p, ctx) {
    if (p.values) return Promise.resolve(p.values);
    return ctx.dataReady().then(function () { return LR.R.json(p.from); });
  }
  function fill(tpl, vals) { return tpl.replace(/\{\{(\w+)\}\}/g, function (m, k) { return vals[k]; }); }

  B.rplot = function (s, ctx) {
    var el = h('div', { class: 'blk blk--rplot' });
    if (s.title) el.appendChild(h('div', { class: 'blk__k', text: s.title }));
    if (s.md) el.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    var row = h('div', { class: 'pickers' });
    var plot = h('div', { class: 'rplot-host', 'aria-live': 'polite' }, [h('p', { class: 'out-wait', text: 'R is drawing the graph…' })]);
    el.appendChild(row); el.appendChild(plot);
    if (s.caption) el.appendChild(h('p', { class: 'rplot-cap', html: md(s.caption, { inline: true }) }));
    var vals = {}, sels = [];
    function draw() {
      plot.innerHTML = '<p class="out-wait">R is drawing the graph…</p>';
      ctx.dataReady().then(function () { return LR.R.plot(fill(s.code, vals), plotSize(plot, s.w || 620, s.h || 400)); }).then(function (res) {
        showOut(plot, res);
      }, function (e) { plot.innerHTML = ''; plot.appendChild(h('p', { class: 'fb fb--no', text: e.message || String(e) })); });
    }
    Promise.all((s.pickers || []).map(function (p) {
      return pickerOptions(p, ctx).then(function (opts) {
        opts = [].concat(opts);
        var id = 'pk' + Math.random().toString(36).slice(2, 7);
        var sel = h('select', { id: id });
        opts.forEach(function (o) { var v = typeof o === 'object' ? o.v : o, t = typeof o === 'object' ? o.t : o; sel.appendChild(h('option', { value: v, text: t })); });
        vals[p.id] = p['default'] != null && opts.map(function (o) { return typeof o === 'object' ? o.v : o; }).indexOf(p['default']) >= 0 ? p['default'] : (typeof opts[0] === 'object' ? opts[0].v : opts[0]);
        sel.value = vals[p.id];
        sel.addEventListener('change', function () { vals[p.id] = sel.value; draw(); });
        row.appendChild(h('label', { class: 'picker', for: id }, [h('span', { text: p.label }), sel]));
        sels.push(sel);
      });
    })).then(draw, function (e) { plot.innerHTML = ''; plot.appendChild(h('p', { class: 'fb fb--no', text: e.message || String(e) })); });
    return el;
  };

  /* ---------- a table R works out (from data frame rows) ---------- */
  function tableFrom(rows, cols) {
    if (!rows || !rows.length) return h('p', { class: 'out-none', text: 'No rows.' });
    cols = cols || Object.keys(rows[0]);
    var t = h('table', { class: 'dt' });
    t.appendChild(h('thead', {}, [h('tr', {}, cols.map(function (c) { return h('th', { text: typeof c === 'object' ? c.t : c }); }))]));
    var tb = h('tbody');
    rows.forEach(function (r) { tb.appendChild(h('tr', {}, cols.map(function (c) { var k = typeof c === 'object' ? c.k : c; return h('td', { text: r[k] == null ? '–' : String(r[k]) }); }))); });
    t.appendChild(tb);
    return h('div', { class: 'tscroll' }, [t]);
  }
  LR.tableFrom = tableFrom;

  B.rtable = function (s, ctx) {
    var el = h('div', { class: 'blk blk--rtable' });
    if (s.title) el.appendChild(h('div', { class: 'blk__k', text: s.title }));
    if (s.md) el.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    var host = h('div', {}, [h('p', { class: 'out-wait', text: 'R is working it out…' })]);
    el.appendChild(host);
    ctx.dataReady().then(function () { return LR.R.json(s.code); }).then(function (rows) {
      host.innerHTML = ''; host.appendChild(tableFrom(rows, s.cols));
    }, function (e) { host.innerHTML = ''; host.appendChild(h('p', { class: 'fb fb--no', text: e.message || String(e) })); });
    return el;
  };

  /* ---------- fill in a table; R works out the key from the data ---------- */
  B.filltable = function (s, ctx) {
    var el = h('div', { class: 'blk blk--fill' + (s.gate ? ' is-gate' : '') });
    el.appendChild(h('div', { class: 'blk__k', text: s.title || 'Fill in the table' }));
    if (s.md) el.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    var host = h('div', {}, [h('p', { class: 'out-wait', text: 'Getting the table ready…' })]);
    var fb = h('div', { class: 'ex-fb', role: 'status' });
    el.appendChild(host);
    ctx.dataReady().then(function () { return LR.R.json(s.key); }).then(function (rows) {
      host.innerHTML = '';
      var t = h('table', { class: 'dt dt--fill' });
      t.appendChild(h('thead', {}, [h('tr', {}, [h('th', { text: s.rowLabel || '' })].concat(s.fields.map(function (f) { return h('th', { text: f.label }); })))]));
      var tb = h('tbody'), inputs = [];
      rows.forEach(function (r, i) {
        var tr = h('tr', {}, [h('th', { text: r.label })]);
        s.fields.forEach(function (f) {
          var inp;
          if (f.options) { inp = h('select', {}, [h('option', { value: '', text: '–' })].concat(f.options.map(function (o) { return h('option', { value: o, text: o }); }))); }
          else inp = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', 'aria-label': f.label + ' for ' + r.label });
          inputs.push({ el: inp, f: f, want: r[f.key], row: r.label });
          tr.appendChild(h('td', {}, [inp]));
        });
        tb.appendChild(tr);
      });
      t.appendChild(tb);
      host.appendChild(h('div', { class: 'tscroll' }, [t]));
      var btn = h('button', { type: 'button', class: 'btn btn--check', text: '✓ Check my table' });
      host.appendChild(h('div', { class: 'ex-bar' }, [btn]));
      btn.addEventListener('click', function () {
        var wrong = 0;
        inputs.forEach(function (x) {
          var v = x.el.value.trim(), ok;
          if (x.f.options) ok = v === String(x.want);
          else { var n = parseFloat(v.replace(/[^0-9eE.+\-]/g, '')); ok = isFinite(n) && Math.abs(n - x.want) <= (x.f.tol != null ? x.f.tol : 1e-9); }
          x.el.classList.toggle('is-ok', ok); x.el.classList.toggle('is-no', !ok);
          if (!ok) wrong++;
        });
        fb.innerHTML = '';
        if (!wrong) { fb.appendChild(h('p', { class: 'fb fb--ok', html: '✔ ' + md(s.pass || 'Every cell is right.', { inline: true }) })); if (s.gate) ctx.pass(s.id); }
        else fb.appendChild(h('p', { class: 'fb fb--no', html: '✘ ' + wrong + ' cell' + (wrong > 1 ? 's are' : ' is') + ' not right yet (in red). ' + md(s.tip || '', { inline: true }) }));
      });
    }, function (e) { host.innerHTML = ''; host.appendChild(h('p', { class: 'fb fb--no', text: e.message || String(e) })); });
    el.appendChild(fb);
    if (s.gate && ctx.passed(s.id)) fb.appendChild(h('p', { class: 'fb fb--ok', text: '✔ You completed this table.' }));
    return el;
  };

  /* ---------- dropdown answers; R works out the key from the data ---------- */
  B.rquiz = function (s, ctx) {
    var el = h('div', { class: 'blk blk--rquiz' + (s.gate ? ' is-gate' : '') });
    el.appendChild(h('div', { class: 'blk__k', text: s.title || 'Your answers' }));
    if (s.md) el.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    var host = h('div', {}, [h('p', { class: 'out-wait', text: 'Getting the questions ready…' })]);
    var fb = h('div', { class: 'ex-fb', role: 'status' });
    el.appendChild(host); el.appendChild(fb);
    ctx.dataReady().then(function () { return Promise.all([LR.R.json(s.key), LR.R.json(s.choices)]); }).then(function (kc) {
      var key = kc[0], choices = [].concat(kc[1]);
      host.innerHTML = '';
      var sels = {};
      s.fields.forEach(function (f) {
        var id = 'rq' + Math.random().toString(36).slice(2, 7);
        var sel = h('select', { id: id }, [h('option', { value: '', text: 'Choose…' })].concat(choices.concat(f.extra || []).map(function (c) { return h('option', { value: c, text: c }); })));
        sels[f.id] = sel;
        host.appendChild(h('label', { class: 'rq-row', for: id }, [h('span', { html: md(f.label, { inline: true }) }), sel]));
      });
      var btn = h('button', { type: 'button', class: 'btn btn--check', text: '✓ Check my answers' });
      host.appendChild(h('div', { class: 'ex-bar' }, [btn]));
      btn.addEventListener('click', function () {
        var wrong = [];
        s.fields.forEach(function (f) {
          var want = [].concat(key[f.id]).map(String), ok = want.indexOf(sels[f.id].value) >= 0;
          sels[f.id].classList.toggle('is-ok', ok); sels[f.id].classList.toggle('is-no', !ok);
          if (!ok) wrong.push(f);
        });
        fb.innerHTML = '';
        if (!wrong.length) { fb.appendChild(h('p', { class: 'fb fb--ok', html: '✔ ' + md(s.pass || 'All correct.', { inline: true }) })); if (s.gate) ctx.pass(s.id); }
        else fb.appendChild(h('p', { class: 'fb fb--no', html: '✘ ' + wrong.length + ' answer' + (wrong.length > 1 ? 's are' : ' is') + ' not right yet. ' + md(s.tip || 'Look at the graph again.', { inline: true }) }));
      });
    }, function (e) { host.innerHTML = ''; host.appendChild(h('p', { class: 'fb fb--no', text: e.message || String(e) })); });
    if (s.gate && ctx.passed(s.id)) fb.appendChild(h('p', { class: 'fb fb--ok', text: '✔ You answered these.' }));
    return el;
  };

  /* ---------- plot builder: choose, see the ggplot2 code, run it, change it ----------
     s.vars: an R expression returning [{v, t}] (the measurements); s.group: the grouping column name */
  B.builder = function (s, ctx) {
    var el = h('div', { class: 'blk blk--builder' });
    el.appendChild(h('div', { class: 'blk__k', text: s.title || 'Plot builder' }));
    if (s.md) el.appendChild(h('div', { class: 'prose', html: md(s.md) }));
    var form = h('div', { class: 'pickers' });
    var edHost = h('div', { class: 'ed' });
    var out = h('div', { class: 'ex-out', 'aria-live': 'polite' });
    el.appendChild(form);
    el.appendChild(h('p', { class: 'bld-note', html: 'The code below is written for you from your choices. Run it, then change it: every line is yours to edit.' }));
    el.appendChild(edHost);
    var run = h('button', { type: 'button', class: 'btn btn--run', text: '▶ Run' });
    el.appendChild(h('div', { class: 'ex-bar' }, [run, h('span', { class: 'ex-keys', text: 'Ctrl + Enter runs' })]));
    el.appendChild(out);
    var ed = LR.editor(edHost, ctx.getCode(s.id) || '# Choose a graph above', { label: 'Plot builder code' });
    ed.onChange(function (v) { ctx.setCode(s.id, v); });
    var TYPES = [
      { v: 'hist', t: 'Histogram (one measurement)' }, { v: 'density', t: 'Smoothed curve (one measurement)' },
      { v: 'box', t: 'Boxplot by group' }, { v: 'violin', t: 'Violin by group' },
      { v: 'means', t: 'Bar chart of means ± 1 SD' }, { v: 'scatter', t: 'Scatter graph (two measurements)' }
    ];
    var G = s.group || 'class', vars = [], state = { type: 'hist', x: null, y: null, colour: 'yes', bins: '8', title: '' };
    function sel(key, label, opts) {
      var id = 'bd' + Math.random().toString(36).slice(2, 7), x = h('select', { id: id });
      opts.forEach(function (o) { x.appendChild(h('option', { value: o.v, text: o.t })); });
      x.value = state[key];
      x.addEventListener('change', function () { state[key] = x.value; write(); });
      var lab = h('label', { class: 'picker', for: id }, [h('span', { text: label }), x]);
      form.appendChild(lab);
      return lab;
    }
    function lbl(v) { var f = vars.filter(function (o) { return o.v === v; })[0]; return f ? f.t : v; }
    function write() {
      var t = state.type, x = state.x, y = state.y, c = state.colour === 'yes';
      yLab.hidden = t !== 'scatter';
      binsLab.hidden = t !== 'hist';
      var L = ['df <- get_locked_df()', ''];
      if (t === 'hist') L.push('ggplot(df, aes(x = ' + x + (c ? ', fill = ' + G : '') + ')) +', '  geom_histogram(bins = ' + state.bins + ', colour = "white"' + (c ? ', alpha = 0.6, position = "identity"' : ', fill = "grey60"') + ') +', '  labs(x = "' + lbl(x) + '", y = "Number of students"' + (c ? ', fill = "Group"' : '') + ') +');
      if (t === 'density') L.push('ggplot(df, aes(x = ' + x + (c ? ', colour = ' + G + ', fill = ' + G : '') + ')) +', '  geom_density(alpha = 0.25, linewidth = 1) +', '  labs(x = "' + lbl(x) + '", y = "Density"' + (c ? ', colour = "Group", fill = "Group"' : '') + ') +');
      if (t === 'box') L.push('ggplot(df, aes(x = ' + G + ', y = ' + x + (c ? ', fill = ' + G : '') + ')) +', '  geom_boxplot(width = 0.5' + (c ? ', alpha = 0.6' : '') + ') +', '  labs(x = "Group", y = "' + lbl(x) + '") +');
      if (t === 'violin') L.push('ggplot(df, aes(x = ' + G + ', y = ' + x + (c ? ', fill = ' + G : '') + ')) +', '  geom_violin(alpha = 0.5) +', '  geom_jitter(width = 0.08, size = 1.5) +', '  labs(x = "Group", y = "' + lbl(x) + '") +');
      if (t === 'means') { L.splice(1, 0, 'means <- df %>%', '  group_by(' + G + ') %>%', '  summarise(mean = mean(' + x + ', na.rm = TRUE), sd = sd(' + x + ', na.rm = TRUE))'); L.push('ggplot(means, aes(x = ' + G + ', y = mean' + (c ? ', fill = ' + G : '') + ')) +', '  geom_col(width = 0.5' + (c ? '' : ', fill = "grey70"') + ') +', '  geom_errorbar(aes(ymin = mean - sd, ymax = mean + sd), width = 0.15) +', '  labs(x = "Group", y = "Mean ' + lbl(x).charAt(0).toLowerCase() + lbl(x).slice(1) + '") +'); }
      if (t === 'scatter') L.push('ggplot(df, aes(x = ' + x + ', y = ' + y + (c ? ', colour = ' + G : '') + ')) +', '  geom_point(size = 2.5) +', '  labs(x = "' + lbl(x) + '", y = "' + lbl(y) + '"' + (c ? ', colour = "Group"' : '') + ') +');
      L.push('  theme_minimal(base_size = 14)' + (c && t !== 'scatter' && t !== 'hist' && t !== 'density' ? ' +\n  theme(legend.position = "none")' : ''));
      ed.set(L.join('\n')); ctx.setCode(s.id, ed.get());
    }
    function doRun() {
      run.disabled = true; out.innerHTML = '<p class="out-wait">R is drawing your graph…</p>';
      ctx.dataReady().then(function () { return LR.R.run(ed.get(), plotSize(out, 620, 420)); }).then(function (res) { showOut(out, res); }, function (e) { out.innerHTML = ''; out.appendChild(h('p', { class: 'fb fb--no', text: e.message || String(e) })); })
        .then(function () { run.disabled = false; });
    }
    run.addEventListener('click', doRun); ed.onRun(doRun);
    whenR([run]);
    var yLab, binsLab;
    ctx.dataReady().then(function () { return LR.R.json(s.vars); }).then(function (v) {
      vars = [].concat(v); state.x = vars[0].v; state.y = (vars[1] || vars[0]).v;
      sel('type', 'Type of graph', TYPES);
      sel('x', 'Measurement', vars);
      yLab = sel('y', 'Second measurement (y-axis)', vars);
      sel('colour', 'Colour by group', [{ v: 'yes', t: 'Yes' }, { v: 'no', t: 'No' }]);
      binsLab = sel('bins', 'Bars (bins)', ['5', '6', '8', '10', '12'].map(function (n) { return { v: n, t: n }; }));
      if (!ctx.getCode(s.id)) write(); else { yLab.hidden = true; }
    });
    el._refresh = function () { ed.refresh(); };
    return el;
  };

  LR.shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
})(window.LR);
