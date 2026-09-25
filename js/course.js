/* ============================================================
   course.js — one course page: the stage list on the left, one stage
   open at a time, and a stage unlocks only when every gate block in
   the stage before it has been passed (Daniel: "unless you complete
   things, it doesn't allow you to move on").

   LR.course({ id, title, kicker, packages, setup, sample, stages:[
     { id, title, blocks:[…] } ] })

   Progress (this browser only): LR.store 'course.<id>'
     { open: highest unlocked index, done:{stageId}, passed:{blockId}, code:{exerciseId}, data:'sample'|'upload' }
   ?all=1   every stage open, for a teacher reading through (not saved)
   ?reset=1 forget this course's progress
   ============================================================ */
(function (LR) {
  'use strict';
  var h = LR.h, md = LR.md, esc = LR.esc;

  LR.course = function (C) {
    LR.current = C;     /* for testing in the console: the course definition */
    var KEY = 'course.' + C.id;
    if (LR.qs('reset') === '1') LR.store.del(KEY);
    var P = LR.store.get(KEY, null) || { open: 0, done: {}, passed: {}, code: {}, data: null };
    var ALL = LR.qs('all') === '1';
    function save() { if (!ALL) LR.store.set(KEY, P); }

    /* ---------- the data the course works on ---------- */
    var dataResolve, dataPromise = new Promise(function (r) { dataResolve = r; });
    var dataLocked = false, uploadBytes = null, uploadSheets = null;
    function markLocked() { dataLocked = true; dataResolve(); LR.emit('data:locked'); }
    function lockSample() {
      return fetch(C.sample).then(function (r) { return r.text(); }).then(function (json) {
        return LR.R.bind('.lr_sample_json', json).then(function () { return LR.R.eval('.lr_lock_json(.lr_sample_json)'); });
      }).then(function () { P.data = 'sample'; save(); markLocked(); });
    }
    function lockUpload(a, b) {
      return LR.R.writeFile('/home/web_user/upload.xlsx', uploadBytes).then(function () {
        return LR.R.eval('.lr_lock_xlsx("upload.xlsx", ' + JSON.stringify(a) + ', ' + JSON.stringify(b) + ')');
      }).then(function () { uploadSheets = [a, b]; P.data = 'upload'; save(); markLocked(); });
    }
    /* after a restart R has forgotten the data: put it back */
    LR.on('r:restarted', function () {
      if (!dataLocked) return;
      if (P.data === 'upload' && uploadBytes && uploadSheets) lockUpload(uploadSheets[0], uploadSheets[1]);
      else lockSample();
    });

    /* ---------- the page ---------- */
    var root = document.getElementById('app');
    root.innerHTML = '';
    var status = h('div', { class: 'rstat', role: 'status', 'aria-live': 'polite' }, [h('i', { class: 'rstat__dot' }), h('span', { class: 'rstat__t', text: 'Starting R…' })]);
    var top = h('header', { class: 'top' }, [
      h('a', { class: 'top__brand', href: './', html: '<span class="top__mark" aria-hidden="true">R</span><span><b>Learn R</b><small>Made by Dr Daniel Mompel Riera · NLCS Jeju</small></span>' }),
      h('div', { class: 'top__course', html: '<small>' + esc(C.kicker || '') + '</small><b>' + esc(C.title) + '</b>' }),
      status
    ]);
    var side = h('nav', { class: 'side', 'aria-label': 'Stages' });
    var main = h('main', { class: 'main', id: 'main', tabindex: '-1' });
    root.appendChild(top);
    root.appendChild(h('div', { class: 'shell' }, [side, main]));

    LR.on('r:status', function (s) {
      status.className = 'rstat is-' + s.state;
      status.querySelector('.rstat__t').textContent = s.msg;
    });

    function unlockedTo() { return ALL ? C.stages.length - 1 : P.open; }
    function gatesOf(st) {
      var g = [];
      (function walk(bs) { bs.forEach(function (b) { if (b.gate) g.push(b.id); if (b.blocks) walk(b.blocks); }); })(st.blocks);
      return g;
    }
    function stageComplete(st) { return gatesOf(st).every(function (id) { return P.passed[id]; }); }

    function drawSide(cur) {
      side.innerHTML = '';
      side.appendChild(h('p', { class: 'side__k', text: C.stages.length + ' stages' }));
      var ol = h('ol', { class: 'side__list' });
      C.stages.forEach(function (st, i) {
        var locked = i > unlockedTo(), done = !!P.done[st.id];
        var li = h('li', { class: 'side__it' + (i === cur ? ' is-cur' : '') + (locked ? ' is-locked' : '') + (done ? ' is-done' : '') });
        var inner = '<span class="side__n">' + (done ? '✓' : locked ? '🔒' : (i + 1)) + '</span><span class="side__t">' + esc(st.title) + '</span>';
        li.appendChild(locked ? h('span', { class: 'side__a', 'aria-disabled': 'true', html: inner + '<span class="sr">(locked)</span>' })
          : h('a', { class: 'side__a', href: '#' + st.id, html: inner, 'aria-current': i === cur ? 'step' : null }));
        ol.appendChild(li);
      });
      side.appendChild(ol);
      var pct = Math.round(Object.keys(P.done).length / C.stages.length * 100);
      side.appendChild(h('div', { class: 'side__bar', 'aria-label': pct + ' % done' }, [h('i', { style: 'width:' + pct + '%' })]));
      var rs = h('button', { type: 'button', class: 'side__reset', text: 'Start the course again' });
      rs.addEventListener('click', function () {
        if (!window.confirm('Forget your progress and your code in this course, and start again from stage 1?')) return;
        LR.store.del(KEY); location.hash = ''; location.reload();
      });
      side.appendChild(rs);
      if (ALL) side.appendChild(h('p', { class: 'side__note', text: 'Teacher view: every stage is open, and nothing is saved.' }));
    }

    var ctx = {
      pass: function (id) {
        if (P.passed[id]) return;
        P.passed[id] = true; save();
        LR.emit('gate:passed', id);
      },
      passed: function (id) { return !!P.passed[id]; },
      getCode: function (id) { return P.code[id]; },
      setCode: function (id, v) { if (v == null) delete P.code[id]; else P.code[id] = v; save(); },
      dataReady: function () { return dataPromise; },
      render: function (b) { return render(b); }
    };

    function render(b) {
      if (b.type === 'dataset') return datasetBlock(b);
      var fn = LR.blocks[b.type];
      if (!fn) return h('p', { class: 'fb fb--no', text: 'Unknown block type: ' + b.type });
      return fn(b, ctx);
    }

    /* ---------- the dataset chooser (KS3 stage 1) ---------- */
    function datasetBlock(b) {
      var el = h('div', { class: 'blk blk--data is-gate' });
      el.appendChild(h('div', { class: 'blk__k', text: 'Choose your data' }));
      var stateBox = h('div', { class: 'data-state', role: 'status' });
      var sampleBtn = h('button', { type: 'button', class: 'btn btn--run', text: 'Use the sample class' });
      var file = h('input', { type: 'file', accept: '.xlsx', id: 'upfile', class: 'sr' });
      var fileLbl = h('label', { class: 'btn btn--ghost', for: 'upfile', text: 'Upload our class spreadsheet (.xlsx)' });
      var pick = h('div', { class: 'data-pick', hidden: true });
      el.appendChild(h('div', { class: 'data-choices' }, [
        h('div', { class: 'data-card' }, [h('b', { text: 'The sample class' }), h('p', { html: md(b.sampleText || 'Two invented classes of Year 8 students. Use it if your class has no spreadsheet yet.', { inline: true }) }), sampleBtn]),
        h('div', { class: 'data-card' }, [h('b', { text: 'Your own class' }), h('p', { html: md(b.uploadText || 'An Excel file with two sheets, one for each group. The file stays on this computer: it is never uploaded anywhere.', { inline: true }) }), fileLbl, file,
          h('a', { class: 'data-tpl', href: b.template || 'data/ks3-sample.xlsx', download: '', text: 'Download a template spreadsheet' })])
      ]));
      el.appendChild(pick);
      el.appendChild(stateBox);

      function showLocked() {
        return LR.R.json('.lr_data_summary()').then(function (s) {
          stateBox.innerHTML = '';
          var groups = Object.keys(s.n).map(function (k) { return '**' + k + '** (' + s.n[k] + ' students)'; }).join(' and ');
          stateBox.appendChild(h('p', { class: 'fb fb--ok', html: '✔ Your data is ready: ' + md(groups, { inline: true }) + '. Measurements: ' + s.vars.map(function (v) { return '<code>' + esc(v) + '</code>'; }).join(', ') + '.' }));
          ctx.pass(b.id);
        });
      }
      function busy(t) { stateBox.innerHTML = ''; stateBox.appendChild(h('p', { class: 'out-wait', text: t })); }
      function fail(e) { stateBox.innerHTML = ''; stateBox.appendChild(h('p', { class: 'fb fb--no', text: (e && e.message) || String(e) })); }

      sampleBtn.addEventListener('click', function () { busy('Loading the sample class…'); lockSample().then(showLocked, fail); });
      file.addEventListener('change', function () {
        var f = file.files && file.files[0]; if (!f) return;
        busy('Reading ' + f.name + '…');
        var rd = new FileReader();
        rd.onload = function () {
          uploadBytes = new Uint8Array(rd.result);
          LR.R.install(['readxl']).then(function () { return LR.R.writeFile('/home/web_user/upload.xlsx', uploadBytes); })
            .then(function () { return LR.R.json('as.list(.lr_sheets("upload.xlsx"))'); })
            .then(function (sheets) {
              sheets = [].concat(sheets);
              stateBox.innerHTML = '';
              if (sheets.length < 2) { fail(new Error('This file has only one sheet. It needs two: one for each group.')); return; }
              pick.hidden = false; pick.innerHTML = '';
              var sa = h('select', { id: 'sheetA' }), sb = h('select', { id: 'sheetB' });
              sheets.forEach(function (n, i) { sa.appendChild(h('option', { value: n, text: n })); sb.appendChild(h('option', { value: n, text: n, selected: i === 1 ? true : null })); });
              sb.value = sheets[1];
              var go = h('button', { type: 'button', class: 'btn btn--run', text: 'Lock these two groups' });
              pick.appendChild(h('label', { class: 'picker', for: 'sheetA' }, [h('span', { text: 'Group A (a sheet)' }), sa]));
              pick.appendChild(h('label', { class: 'picker', for: 'sheetB' }, [h('span', { text: 'Group B (another sheet)' }), sb]));
              pick.appendChild(go);
              go.addEventListener('click', function () {
                if (sa.value === sb.value) { fail(new Error('Choose two different sheets.')); return; }
                busy('Joining the two sheets…');
                lockUpload(sa.value, sb.value).then(function () { pick.hidden = true; return showLocked(); }, fail);
              });
            }, fail);
        };
        rd.readAsArrayBuffer(f);
      });
      if (dataLocked) showLocked();
      else if (P.data === 'upload') { stateBox.appendChild(h('p', { class: 'fb fb--no', text: 'Your spreadsheet is not loaded any more (the page was reloaded). Upload it again, or use the sample class.' })); }
      return el;
    }

    /* ---------- one stage ---------- */
    function openStage(i) {
      i = Math.max(0, Math.min(i, unlockedTo()));
      var st = C.stages[i];
      drawSide(i);
      main.innerHTML = '';
      main.appendChild(h('p', { class: 'st__k', text: 'Stage ' + (i + 1) + ' of ' + C.stages.length }));
      main.appendChild(h('h1', { class: 'st__h', text: st.title }));
      if (st.lede) main.appendChild(h('p', { class: 'st__lede', html: md(st.lede, { inline: true }) }));
      var body = h('div', { class: 'st__body' });
      st.blocks.forEach(function (b) { body.appendChild(render(b)); });
      main.appendChild(body);
      var foot = h('div', { class: 'st__foot' });
      main.appendChild(foot);
      function drawFoot() {
        foot.innerHTML = '';
        var gates = gatesOf(st), left = gates.filter(function (id) { return !P.passed[id]; }).length;
        var next = C.stages[i + 1];
        if (!left) {
          if (!P.done[st.id]) { P.done[st.id] = true; save(); drawSide(i); }
          if (next) {
            var go = h('button', { type: 'button', class: 'btn btn--go', html: 'Next stage: ' + esc(next.title) + ' →' });
            go.addEventListener('click', function () {
              if (P.open < i + 1) { P.open = i + 1; save(); }
              location.hash = next.id;
            });
            foot.appendChild(go);
          } else foot.appendChild(h('p', { class: 'fb fb--ok', html: md(C.finish || '✔ You have finished the course.', { inline: true }) }));
        } else {
          foot.appendChild(h('p', { class: 'st__lock', text: '🔒 The next stage opens when ' + (left === 1 ? 'the task marked ▶ above is' : 'the ' + left + ' tasks marked ▶ above are') + ' done.' }));
        }
      }
      drawFoot();
      LR.on('gate:passed', function () { if (main.contains(foot)) drawFoot(); });
      main.focus({ preventScroll: true });
      window.scrollTo(0, 0);
      setTimeout(function () { body.querySelectorAll('.blk--exercise').forEach(function (e) { if (e._refresh) e._refresh(); }); }, 30);
    }

    function route() {
      var id = location.hash.replace('#', '');
      var i = C.stages.map(function (s) { return s.id; }).indexOf(id);
      if (i < 0 || i > unlockedTo()) i = Math.min(P.open, C.stages.length - 1);
      openStage(i);
    }
    window.addEventListener('hashchange', route);
    route();

    /* R starts while the student reads */
    /* a course with no dataset to choose: anything that waits for data can go at once */
    if (!C.sample) markLocked();
    LR.R.start({ packages: C.packages, setup: C.setup }).then(function () {
      if (P.data === 'sample') return lockSample();
      return null;
    });
  };
})(window.LR);
