#!/usr/bin/env node
/* ============================================================
   tools/make-ib-script.mjs — IB · Statistics in R as ONE R script, for
   RStudio (the "Carry on in RStudio" stage offers it as a download).
   Built from the course itself: the same data, and every exercise's
   answer in stage order, with the result it should give. So the script
   can never drift from the course.

       node tools/make-ib-script.mjs          write data/ib-statistics.R
   tools/check.mjs imports build(), fails if the file on disk is stale,
   and runs it in the Mac's own R.
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const OUT = path.join(ROOT, 'data', 'ib-statistics.R');

function loadCourse() {
  const noop = () => {};
  const sb = { console, window: {}, document: { getElementById: () => null, addEventListener: noop, querySelector: () => null }, location: { search: '', hash: '' }, localStorage: { getItem: () => null, setItem: noop, removeItem: noop }, setTimeout, clearTimeout, Promise };
  sb.window = sb; vm.createContext(sb);
  const run = (rel) => vm.runInContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), sb, { filename: rel });
  run('js/core.js'); run('js/r.js'); sb.LR.blocks = {}; run('js/story.js'); run('js/scenes/ib.js');
  let C; sb.LR.course = (c) => { C = c; }; run('js/courses/ib.js');
  return C;
}

/* markdown → a plain comment */
const plain = (s) => String(s || '').replace(/`([^`]*)`/g, '$1').replace(/\*\*|__/g, '').replace(/\s+/g, ' ').trim();
function wrap(text, width = 100, lead = '# ') {
  const words = plain(text).split(' '); const lines = []; let cur = '';
  for (const w of words) { if ((cur + ' ' + w).trim().length > width - lead.length) { lines.push(cur.trim()); cur = w; } else cur += ' ' + w; }
  if (cur.trim()) lines.push(cur.trim());
  return lines.map((l) => lead + l).join('\n');
}

export function build() {
  const C = loadCourse();
  const pk = C.packages || [];
  const L = [];
  L.push(
    '# ============================================================',
    '# Statistics in R · IB Biology · Learn R',
    '# https://nlcsbiology.com/learn-r/ib.html',
    '# Dr Daniel Mompel Riera · NLCS Jeju · CC BY-NC-SA 4.0',
    '#',
    '# The whole course as one script: the data, and the answer to every exercise,',
    '# stage by stage, with the result you should get. The data are INVENTED, for learning.',
    '#',
    '# In RStudio: File > Open File..., choose this file, then',
    '#   run one line:  put the cursor on it and press Ctrl + Enter (Mac: Cmd + Enter)',
    '#   run it all:    Ctrl + Shift + Enter (Mac: Cmd + Shift + Enter), "Source with Echo"',
    '# ============================================================',
    '',
    '# The first time only, this installs the packages (a few minutes: wait for the > prompt).',
    ...pk.map((p) => `if (!requireNamespace("${p}", quietly = TRUE)) install.packages("${p}")`),
    ...pk.map((p) => `library(${p})`),
    '',
    '# ---- The data ----------------------------------------------------------------',
    '# students: an invented class of 40. stomata_raw: an invented class spreadsheet, mistakes included.',
    C.setup,
    ''
  );
  C.stages.forEach((st, i) => {
    const exs = [];
    (function walk(bs) { (bs || []).forEach((b) => { if (b.type === 'exercise') exs.push(b); if (b.blocks) walk(b.blocks); }); })(st.blocks);
    if (!exs.length) return;
    L.push(`# ==== Stage ${i + 1} · ${st.title} ${'='.repeat(Math.max(4, 78 - st.title.length))}`.slice(0, 96), '');
    exs.forEach((b) => {
      L.push('# ---- ' + plain(b.title || 'Your turn'));
      L.push((b.solution || b.code).replace(/\n+$/, ''));
      if (b.pass) L.push(wrap('You should get: ' + b.pass));
      L.push('');
    });
  });
  L.push(
    '# ==== Your own data ==========================================================',
    '# One row for each measurement, one column for each variable, short column names with no spaces.',
    '# Save the spreadsheet as a .csv file, then remove the # at the start of these lines:',
    '# my_data <- read.csv(file.choose())   # a window opens: choose your .csv file',
    '# head(my_data)                        # the first six rows',
    '# str(my_data)                         # each column: numbers (num, int) or text (chr)?',
    ''
  );
  return L.join('\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.writeFileSync(OUT, build());
  console.log('wrote ' + path.relative(ROOT, OUT) + ' (' + fs.statSync(OUT).size + ' bytes)');
}
