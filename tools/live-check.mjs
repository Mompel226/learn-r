#!/usr/bin/env node
/* ============================================================
   tools/live-check.mjs — does R still start on the LIVE site?
   Run weekly by .github/workflows/r-starts.yml on GitHub's computers:
   opens each course page in Chrome and in WebKit (Safari's engine, as on
   an iPad), waits for R, and asks it one question. Any failure makes the
   run fail, and GitHub emails the repository owner. R comes from
   webr.r-wasm.org and its packages from repo.r-wasm.org (Posit): this
   is the alarm if either moves or disappears.
       node tools/live-check.mjs      (needs: npm i playwright; npx playwright install chromium webkit)
   ============================================================ */
import { chromium, webkit } from 'playwright';

const BASE = process.env.BASE || 'https://nlcsbiology.com/learn-r/';
const PAGES = [
  { page: 'ib.html', r: 't.test(resting_hr ~ trains, data = students, var.equal = TRUE)$p.value', want: '0.0159' },
  { page: 'ks3.html', r: 'packageVersion("ggplot2") >= "3.0.0"', want: 'TRUE' },
  { page: 'starch.html', r: 'exists("starch_example")', want: 'TRUE' }
];
let bad = 0;
for (const [name, engine] of [['Chrome', chromium], ['WebKit (Safari)', webkit]]) {
  const browser = await engine.launch();
  for (const p of PAGES) {
    const page = await browser.newPage();
    const t0 = Date.now();
    try {
      await page.goto(BASE + p.page + '?check=' + Date.now(), { waitUntil: 'load', timeout: 60000 });
      await page.waitForFunction(() => window.LR && LR.R && (LR.R.state === 'ready' || LR.R.state === 'error'), null, { timeout: 200000 });
      const st = await page.evaluate(() => ({ state: LR.R.state, problem: LR.R.problem }));
      if (st.state !== 'ready') throw new Error('R did not start: ' + JSON.stringify(st.problem));
      const out = await page.evaluate((code) => LR.R.run(code, { w: 300, h: 200 }).then((r) => r.out.map((o) => o.data).join(' ')), p.r);
      if (!out.includes(p.want)) throw new Error(`R answered "${out.trim()}", expected ${p.want}`);
      console.log(`✔ ${name} · ${p.page}: R ready in ${((Date.now() - t0) / 1000).toFixed(1)} s; ${p.r} → ${out.trim()}`);
    } catch (e) { bad++; console.log(`✘ ${name} · ${p.page}: ${e.message.split('\n')[0]}`); }
    await page.close();
  }
  await browser.close();
}
if (bad) { console.log(`\n${bad} check(s) failed. Students would see "R could not start". See SPEC.md, "Where it runs, and when it cannot".`); process.exit(1); }
console.log('\nR starts on every course page, in Chrome and in WebKit.');
