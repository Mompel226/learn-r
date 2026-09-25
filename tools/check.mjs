#!/usr/bin/env node
/* ============================================================
   tools/check.mjs — the gate. Loads every course the way the page does,
   then refuses to pass if anything would break or teach something wrong:

   · every stage and block is well formed; ids are unique; every gate
     block has an id; every exercise with a check has a solution
   · every exercise's SOLUTION passes its check, and its STARTER code
     does not (unless starterPasses:true), run in this Mac's own R
     (Rscript) with the same helpers the page runs in webR, on the
     course's sample data
   · every R expression the page evaluates (pickers, rtable, filltable
     and rquiz keys, rplot code) runs without an error

       node tools/check.mjs            check
       node tools/check.mjs --stamp    check, then stamp ?v= and version.txt
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const errs = [], warns = [];
const E = (m) => errs.push(m), W = (m) => warns.push(m);

/* a page just real enough for the course files */
const noop = () => {};
const sandbox = { console, window: {}, document: { getElementById: () => null, addEventListener: noop, querySelector: () => null }, location: { search: '', hash: '' }, localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, setTimeout, clearTimeout, Promise };
sandbox.window = sandbox;
vm.createContext(sandbox);
const run = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sandbox, { filename: rel });
run('js/core.js'); run('js/r.js');
const courses = [];
sandbox.LR.course = (c) => courses.push(c);            /* capture the definition instead of drawing it */
const BASE = sandbox.LR.R.BASE;

const pages = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html'));
const files = fs.readdirSync(path.join(ROOT, 'js/courses')).filter((f) => f.endsWith('.js'));
for (const f of files) {
  run('js/courses/' + f);
  if (!pages.some((p) => fs.readFileSync(path.join(ROOT, p), 'utf8').includes('js/courses/' + f))) E(`js/courses/${f} is not loaded by any page`);
}

const TYPES = new Set(['goal', 'text', 'concept', 'analogy', 'note', 'interpret', 'example', 'frames', 'exercise', 'mcq', 'rplot', 'rtable', 'filltable', 'rquiz', 'dataset', 'extension', 'story', 'builder']);
const rJobs = [];     /* [where, kind, payload] for the R run */

for (const C of courses) {
  const at = `course ${C.id}`;
  for (const k of ['id', 'title', 'stages']) if (!C[k]) E(`${at}: missing ${k}`);
  const ids = new Set();
  C.stages.forEach((st, si) => {
    const sw = `${at} › stage ${si + 1} "${st.title}"`;
    if (!st.id || !st.title) E(`${sw}: a stage needs id and title`);
    if (ids.has(st.id)) E(`${sw}: duplicate id ${st.id}`); ids.add(st.id);
    let gates = 0;
    (function walk(bs, where) {
      (bs || []).forEach((b, bi) => {
        const w = `${where} › block ${bi + 1} (${b.type})`;
        if (!TYPES.has(b.type)) E(`${w}: unknown block type`);
        if (b.id) { if (ids.has(b.id)) E(`${w}: duplicate id ${b.id}`); ids.add(b.id); }
        if (b.gate) { gates++; if (!b.id) E(`${w}: a gate block needs an id`); }
        if (b.type === 'exercise') {
          if (!b.id) E(`${w}: an exercise needs an id (its code is saved under it)`);
          if (b.check && !b.solution) E(`${w}: an exercise with a check needs a solution`);
          if (b.check) rJobs.push([w, 'exercise', b]);
        }
        if (b.type === 'mcq') {
          const ok = (b.opts || []).filter((o) => o.ok).length;
          if (ok !== 1) E(`${w}: an mcq needs exactly one right answer (has ${ok})`);
          (b.opts || []).forEach((o) => { if (!o.ok && !o.why) W(`${w}: wrong option "${o.t}" has no why`); });
        }
        if (b.type === 'rplot') { (b.pickers || []).forEach((p) => { if (p.from) rJobs.push([w, 'expr', p.from]); }); rJobs.push([w, 'plot', b]); }
        if (b.type === 'rtable') rJobs.push([w, 'expr', b.code]);
        if (b.type === 'filltable') rJobs.push([w, 'expr', b.key]);
        if (b.type === 'rquiz') { rJobs.push([w, 'expr', b.key]); rJobs.push([w, 'expr', b.choices]); }
        if (b.blocks) walk(b.blocks, w);
        if (b.visual) walk([b.visual], w);
      });
    })(st.blocks, sw);
    if (!gates && si < C.stages.length - 1) W(`${sw}: no gate block, so the next stage opens at once`);
  });

  /* ---- the R run: the same helpers as the page, on the sample data ---- */
  const q = (s) => JSON.stringify(String(s));          /* a JS string literal is a valid R string literal */
  const plotFill = (tpl, pickers) => tpl.replace(/\{\{(\w+)\}\}/g, (m, k) => { const p = (pickers || []).find((x) => x.id === k); return p && p['default'] != null ? p['default'] : `__PICK_${k}__`; });
  let R = `suppressPackageStartupMessages({${(C.packages || []).map((p) => `library(${p})`).join('; ')}; library(jsonlite)})\n` + BASE + '\n' + (C.setup || '') + '\n';
  R += `.lr_fails <- 0L\n.lr_report <- function(where, msg) { cat("FAIL|", where, "|", msg, "\\n", sep = ""); .lr_fails <<- .lr_fails + 1L }\n`;
  R += `pdf(NULL)\n`;
  if (C.sample) R += `.lr_lock_json(paste(readLines(${q(path.join(ROOT, C.sample))}, warn = FALSE), collapse = "\\n"))\n`;
  rJobs.filter(() => true).forEach(([w, kind, b], i) => {
    if (kind === 'exercise') {
      R += `local({ .lr_code <<- ${q(b.solution)}; invisible(capture.output(.lr_run(.lr_code), type = "output")); if (isTRUE(.lr_error)) .lr_report(${q(w)}, "the SOLUTION stops with an error") else { r <- .lr_check(${q(b.check)}); if (r != "PASS") .lr_report(${q(w)}, paste("the SOLUTION fails its check:", r)) } })\n`;
      if (!b.starterPasses) R += `local({ .lr_code <<- ${q(b.code || '')}; invisible(capture.output(suppressMessages(.lr_run(.lr_code)), type = "output")); r <- .lr_check(${q(b.check)}); if (r == "PASS" && !isTRUE(.lr_error)) .lr_report(${q(w)}, "the STARTER code already passes: nothing to do") })\n`;
    } else if (kind === 'expr') {
      R += `tryCatch(invisible(.lr_json(local({\n${b}\n}))), error = function(e) .lr_report(${q(w)}, paste("an R expression fails:", conditionMessage(e))))\n`;
    } else if (kind === 'plot') {
      const code = plotFill(b.code, b.pickers);
      if (!/__PICK_/.test(code)) R += `tryCatch(invisible(print(local({\n${code}\n}))), error = function(e) .lr_report(${q(w)}, paste("the graph code fails:", conditionMessage(e))))\n`;
      else W(`${w}: graph code not tested (a picker has no default)`);
    }
  });
  R += `cat("DONE|", .lr_fails, "\\n", sep = "")\n`;
  const tmp = path.join(ROOT, 'tools', `.check-${C.id}.R`);
  fs.writeFileSync(tmp, R);
  try {
    const out = execFileSync('Rscript', ['--vanilla', tmp], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 26 });
    out.split('\n').filter((l) => l.startsWith('FAIL|')).forEach((l) => { const [, w, m] = l.split('|'); E(`${w}: ${m}`); });
    if (!/DONE\|/.test(out)) E(`${at}: the R run did not finish`);
  } catch (e) {
    E(`${at}: Rscript failed — ${String(e.stderr || e.message).split('\n').slice(-6).join(' ')}`);
  } finally { fs.rmSync(tmp, { force: true }); }
  console.log(`${C.id}: ${C.stages.length} stages · ${rJobs.filter((j) => j[1] === 'exercise').length} checked exercises · ${rJobs.length} R jobs`);
  rJobs.length = 0;
}

if (warns.length) { console.log('\nwarnings:'); warns.forEach((w) => console.log('  · ' + w)); }
if (errs.length) { console.log('\nERRORS:'); errs.forEach((e) => console.log('  ✘ ' + e)); process.exit(1); }
console.log('\n✔ all checks passed');

if (process.argv.includes('--stamp')) {
  const v = String(Date.now());
  for (const p of pages) {
    const f = path.join(ROOT, p);
    fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/(\.(?:js|css))\?v=[0-9]+/g, `$1?v=${v}`));
  }
  fs.writeFileSync(path.join(ROOT, 'version.txt'), v + '\n');
  console.log('stamped ' + v);
}
