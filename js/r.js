/* ============================================================
   r.js — real R, running inside this browser tab (webR v0.6.0).

   Nothing is installed on the student's computer, and nothing the
   student types or uploads leaves the tab: R runs in a Web Worker and
   only downloads R itself and its packages (webr.r-wasm.org,
   repo.r-wasm.org). GitHub Pages cannot send the cross-origin headers
   webR prefers, so webR uses its PostMessage channel. That channel
   cannot interrupt running code, so a watchdog restarts R when a run
   takes longer than LIMIT_MS (an endless loop, say).

   LR.R.start({ packages:[…], setup:'R code' })   once per page
   LR.R.ready                        a promise: R is up and set up
   LR.R.run(code, {w, h})            a student's code, in a fresh
                                     environment → {out:[{type,data}], images:[], ok}
   LR.R.check(rCode)                 'PASS' or the message to show
   LR.R.plot(code, {w, h})           R code written by the page (pickers)
   LR.R.json(rExpr)                  evaluate, return parsed JSON
   LR.R.writeFile(path, bytes)       put an uploaded file on R's disk
   LR.on('r:status', fn)             {state:'loading'|'installing'|'ready'|'busy'|'restarting'|'error', msg}
   LR.on('r:restarted', fn)          R came back after a restart: re-load data
   LR.on('r:failed', fn)             R could not start: {kind, msg} (course.js shows
                                     the student why, and what to do)

   When R cannot start, the student is told WHY, quickly (Daniel, 25 Sep 2026:
   "if something fails, how are the students informed?"):
     browser   no WebAssembly / Web Workers / modules: at once
     blocked   webr.r-wasm.org cannot be reached: as soon as the download fails
     packages  repo.r-wasm.org cannot be reached: checked by name after install
     slow      still nothing after 150 s (a message at 25 s says it is still coming)
     crash     anything else, or R failed to come back after a restart
   ============================================================ */
(function (LR) {
  'use strict';
  var WEBR_URL = 'https://webr.r-wasm.org/v0.6.0/webr.mjs';
  var LIMIT_MS = 25000;
  var webR = null, cfg = null, busy = 0, readyResolve, readyReject;
  var R = LR.R = {};
  R.ready = new Promise(function (res, rej) { readyResolve = res; readyReject = rej; });
  R.state = 'loading';

  function status(state, msg) { R.state = state; LR.emit('r:status', { state: state, msg: msg }); }

  var WHY = {
    browser: 'This browser is too old to run R.',
    blocked: 'R could not be downloaded from webr.r-wasm.org.',
    packages: 'R started, but its extra tools could not be downloaded from repo.r-wasm.org.',
    slow: 'R is taking too long to download.',
    crash: 'R stopped unexpectedly.'
  };
  function problem(kind, detail) { var e = new Error(WHY[kind]); e.kind = kind; e.detail = detail || ''; return e; }
  R.WHY = WHY;
  function withLimit(p, ms, kind) {
    return Promise.race([p, new Promise(function (res, rej) { setTimeout(function () { rej(problem(kind)); }, ms); })]);
  }

  /* the helpers every page needs: run a student's code in a fresh environment, then check it */
  var BASE = [
    '.lr_code <- ""; .lr_env <- new.env(); .lr_value <- NULL; .lr_error <- FALSE',
    '.lr_run <- function(code) {',
    '  .lr_env <<- new.env(parent = globalenv()); .lr_value <<- NULL; .lr_error <<- FALSE',
    '  exprs <- tryCatch(parse(text = code, keep.source = FALSE), error = function(e) {',
    '    message("R could not read your code. Check the brackets, commas and quote marks.\\n", conditionMessage(e)); NULL })',
    '  if (is.null(exprs)) { .lr_error <<- TRUE; return(invisible(FALSE)) }',
    '  for (e in exprs) {',
    /* print inside the tryCatch too: a graph can fail while it is being drawn (a misspelt column) */
    '    r <- tryCatch({ v <- withVisible(eval(e, .lr_env)); if (v$visible) print(v$value); v }, error = function(err) { message("Error: ", conditionMessage(err)); NULL })',
    '    if (is.null(r)) { .lr_error <<- TRUE; return(invisible(FALSE)) }',
    '    .lr_value <<- r$value',
    '  }',
    '  invisible(TRUE)',
    '}',
    '.lr_check <- function(check) {',
    '  code <- .lr_code',
    '  code_nc <- gsub("#[^\\n]*", "", code)',
    '  code0 <- gsub("[[:space:]]+", "", code_nc)',
    '  has <- function(...) all(vapply(c(...), function(p) grepl(gsub("[[:space:]]+", "", p), code0, fixed = TRUE), logical(1)))',
    '  env <- .lr_env; value <- .lr_value; ran <- !isTRUE(.lr_error)',
    '  res <- tryCatch(eval(parse(text = check)), error = function(e) paste("The checker hit a problem:", conditionMessage(e)))',
    '  if (isTRUE(res)) "PASS" else paste(as.character(res), collapse = " ")',
    '}',
    '.lr_json <- function(x) as.character(jsonlite::toJSON(x, auto_unbox = TRUE, dataframe = "rows", digits = NA, na = "null"))',
    /* page graphs wrap their titles to the width they are drawn at (a phone is narrow) */
    '.lr_plot_w <- 560',
    '.lr_wrap <- function(x, n = max(24, floor(.lr_plot_w / 8.5))) vapply(x, function(t) paste(strwrap(t, n), collapse = "\\n"), "")'
  ].join('\n');

  R.BASE = BASE;   /* tools/check.mjs runs the same helpers in the Mac's own R */

  function moduleReady() {
    if (window.LRWebR) return Promise.resolve(window.LRWebR);
    if (window.LRWebRError) return Promise.reject(problem('blocked', window.LRWebRError));
    var modules = 'noModule' in document.createElement('script');
    if (typeof WebAssembly !== 'object' || typeof Worker !== 'function' || !modules) return Promise.reject(problem('browser'));
    return new Promise(function (res, rej) {
      window.addEventListener('webr-module-loaded', function () { res(window.LRWebR); });
      window.addEventListener('webr-module-failed', function () { rej(problem('blocked', window.LRWebRError)); });
      setTimeout(function () { if (!window.LRWebR && R.state === 'loading') status('loading', 'Still downloading R. On a slow network this can take a minute or two.'); }, 25000);
      setTimeout(function () { if (!window.LRWebR) rej(problem('slow')); }, 150000);
    });
  }

  function boot() {
    status('loading', R.firstVisit ? 'Starting R. The first time takes about 20 seconds.' : 'Starting R…');
    var pkgs = (cfg.packages || []).concat(['jsonlite']);
    return moduleReady().then(function (WebR) {
      webR = new WebR();
      return withLimit(webR.init(), 150000, 'slow');
    }).then(function () {
      status('installing', 'Getting R ready: ' + pkgs.join(', ') + '…');
      /* one call for all of them: many times faster than one at a time */
      return withLimit(webR.installPackages(pkgs, { quiet: true }), 150000, 'slow').catch(function (e) { if (e && e.kind) throw e; });
    }).then(function () {
      /* installPackages fails quietly when repo.r-wasm.org is blocked: check each package by name */
      return webR.evalRBoolean('all(vapply(c(' + pkgs.map(function (p) { return '"' + p + '"'; }).join(', ') + '), function(p) nzchar(system.file(package = p)), logical(1)))');
    }).then(function (ok) {
      if (!ok) throw problem('packages');
      return webR.evalRVoid(BASE + '\n' + (cfg.setup || '') + '\nsuppressPackageStartupMessages({' + (cfg.packages || []).map(function (p) { return 'library(' + p + ')'; }).join('; ') + '})');
    }).catch(function (e) { throw (e && e.kind) ? e : problem('crash', e && e.message); });
  }

  R.start = function (c) {
    cfg = c || {};
    R.firstVisit = !LR.store.get('r-visited', false);
    boot().then(function () {
      LR.store.set('r-visited', true);
      status('ready', 'R is ready');
      readyResolve(R);
    }, function (e) {
      R.problem = { kind: e.kind || 'crash', msg: e.message, detail: e.detail || '' };
      status('error', e.message);
      LR.emit('r:failed', R.problem);
      readyReject(e);
    });
    return R.ready;
  };

  R.restart = function () {
    status('restarting', 'Restarting R…');
    try { if (webR) webR.close(); } catch (e) { /* already gone */ }
    return boot().then(function () {
      status('ready', 'R is ready');
      LR.emit('r:restarted');
    }, function (e) {
      R.problem = { kind: e.kind || 'crash', msg: e.message || WHY.crash, detail: e.detail || '' };
      status('error', R.problem.msg); LR.emit('r:failed', R.problem); throw e;
    });
  };

  /* every evaluation goes through one queue, and each has a time limit */
  var queue = Promise.resolve();
  function enqueue(job) {
    var p = queue.then(function () {
      busy++; status('busy', 'R is working…');
      var timer, timeout = new Promise(function (res, rej) {
        timer = setTimeout(function () { rej({ timeout: true }); }, LIMIT_MS);
      });
      return Promise.race([job(), timeout]).then(function (v) {
        clearTimeout(timer); busy--; if (!busy) status('ready', 'R is ready'); return v;
      }, function (e) {
        clearTimeout(timer); busy--;
        if (e && e.timeout) {
          return R.restart().then(function () {
            return { out: [{ type: 'stderr', data: 'Your code ran for more than ' + (LIMIT_MS / 1000) + ' seconds, so R was restarted. Look for a loop that never ends.' }], images: [], ok: false, timedOut: true };
          });
        }
        if (!busy) status('ready', 'R is ready');
        throw e;
      });
    });
    queue = p.catch(function () {});
    return p;
  }

  function capture(code, o) {
    return new webR.Shelter().then(function (shelter) {
      return shelter.captureR(code, {
        withAutoprint: !!(o && o.autoprint), captureStreams: true, captureConditions: false,
        captureGraphics: { width: (o && o.w) || 560, height: (o && o.h) || 380 }
      }).then(function (res) {
        var out = res.output.filter(function (x) { return x.type === 'stdout' || x.type === 'stderr'; })
          .map(function (x) { return { type: x.type, data: x.data }; });
        shelter.purge();
        return { out: out, images: res.images || [] };
      }, function (err) { shelter.purge(); return { out: [{ type: 'stderr', data: String(err && err.message || err) }], images: [] }; });
    });
  }

  R.run = function (code, o) {
    return R.ready.then(function () {
      return enqueue(function () {
        return webR.objs.globalEnv.bind('.lr_code', String(code)).then(function () {
          return capture('.lr_run(.lr_code)', o);
        }).then(function (res) {
          return webR.evalRBoolean('isTRUE(.lr_error)').then(function (bad) { res.ok = !bad; return res; });
        });
      });
    });
  };

  R.check = function (checkCode) {
    return R.ready.then(function () {
      return enqueue(function () {
        return webR.objs.globalEnv.bind('.lr_check_code', String(checkCode)).then(function () {
          return webR.evalRString('.lr_check(.lr_check_code)');
        });
      });
    });
  };

  R.plot = function (code, o) {
    return R.ready.then(function () {
      return enqueue(function () { return capture('.lr_plot_w <- ' + ((o && o.w) || 560) + '\nlocal({\n' + code + '\n})', Object.assign({ autoprint: true }, o || {})); });
    });
  };

  R.json = function (expr) {
    return R.ready.then(function () {
      return enqueue(function () {
        return webR.evalRString('.lr_json(local({\n' + expr + '\n}))').then(function (s) { return JSON.parse(s); });
      });
    });
  };

  R.eval = function (code) {
    return R.ready.then(function () { return enqueue(function () { return webR.evalRVoid(code); }); });
  };

  R.bind = function (name, value) {
    return R.ready.then(function () { return enqueue(function () { return webR.objs.globalEnv.bind(name, value); }); });
  };

  R.writeFile = function (path, bytes) {
    return R.ready.then(function () { return enqueue(function () { return webR.FS.writeFile(path, bytes); }); });
  };

  R.install = function (pkgs) {
    return R.ready.then(function () {
      return enqueue(function () {
        status('installing', 'Getting ' + pkgs.join(', ') + '…');
        return webR.installPackages(pkgs, { quiet: true }).then(function () {
          cfg.packages = (cfg.packages || []).concat(pkgs.filter(function (p) { return cfg.packages.indexOf(p) < 0; }));
        });
      });
    });
  };

  /* draw the ImageBitmaps R returned into canvases (they come at twice the size, for sharp screens) */
  R.images = function (images, host) {
    images.forEach(function (img) {
      var c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      c.className = 'rplot';
      c.style.maxWidth = (img.width / 2) + 'px';
      c.getContext('2d').drawImage(img, 0, 0);
      c.setAttribute('role', 'img');
      c.setAttribute('aria-label', 'A graph drawn by R');
      host.appendChild(c);
    });
  };
})(window.LR);
