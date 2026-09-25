/* ============================================================
   courses/ib.js — IB · Statistics in R. Rebuilt from Daniel's
   NLCS/IB/Learning R/IB_Bio_D3_2.Rmd around what the IB guide asks
   (Tool 3; C4.1.15 and D3.2.21 chi-squared; C2.2.4 correlation and R²).

   PROTOTYPE (25 Sep 2026; step 1 no longer blank, dots → bars added the same day): one stage, the p-value, to agree the style of
   the click-by-click stories before the rest is built. The coin numbers
   are exact (binomial, n = 100, p = 0.5; checked in R):
     P(40 ≤ heads ≤ 60) = 0.9648 · binom.test(53, 100) p = 0.6173
     binom.test(61, 100) p = 0.0352 · binom.test(80, 100) p = 1.116e-09
   ============================================================ */
(function (LR) {
  'use strict';

  /* ---------- the coin story's picture ----------
     It moves on as the story does: your coin's tally (steps 1–2) → a fair coin's goes as dots (step 3)
     → thousands of goes as bars (step 4 on). Every step shows something: never an empty box. */
  function coinScene(S) {
    var x0 = 72, x1 = 616, yB = 300, yT = 92;
    var xs = S.scale(24.5, 85.5, x0, x1);
    /* exact binomial probabilities, n = 100, p = 0.5 */
    var lf = [0]; for (var i = 1; i <= 100; i++) lf[i] = lf[i - 1] + Math.log(i);
    function pmf(k) { return Math.exp(lf[100] - lf[k] - lf[100 - k] - 100 * Math.LN2); }
    var peak = pmf(50), ys = S.scale(0, peak * 1.08, yB, yT);
    var bw = xs(1) - xs(0);
    var bars = '';
    for (var k = 28; k <= 72; k++) bars += S.rect((xs(k) - bw / 2 + 0.6).toFixed(1), ys(pmf(k)).toFixed(1), (bw - 1.2).toFixed(1), (yB - ys(pmf(k))).toFixed(1), 'st-bar st-grow');
    /* your coin: 53 heads, 47 tails, against the 50 a fair coin expects. The tally and its label fit in
       one phone-wide window (x 70–400); the coin is decoration, to the right. */
    var ty = S.scale(0, 60, yB, 130);
    var tally = S.line(170, yB, 400, yB, 'st-ax') +
      S.rect(190, ty(53).toFixed(1), 80, (yB - ty(53)).toFixed(1), 'st-bar st-grow', 3) +
      S.rect(300, ty(47).toFixed(1), 80, (yB - ty(47)).toFixed(1), 'st-bar st-grow', 3) +
      S.text(230, ty(53) + 30, '53', { cls: 'st-big' }) + S.text(340, ty(47) + 30, '47', { cls: 'st-big' }) +
      S.text(230, yB + 22, 'Heads', { cls: 'st-lab' }) + S.text(340, yB + 22, 'Tails', { cls: 'st-lab' }) +
      S.line(180, ty(50), 392, ty(50), 'st-dash') +
      S.text(176, ty(50) - 4, 'A fair coin:', { anchor: 'end', cls: 'st-lab' }) + S.text(176, ty(50) + 13, 'about 50', { anchor: 'end', cls: 'st-lab' }) + S.text(176, ty(50) + 30, 'of each', { anchor: 'end', cls: 'st-lab' });
    var coin = '<circle cx="500" cy="220" r="30" fill="#F6C57A" stroke="#B7791F" stroke-width="2"/><circle cx="500" cy="220" r="23" fill="none" stroke="#B7791F" stroke-width="1"/>' +
      S.text(500, 228, 'H', { cls: 'st-big', fill: '#7C4A03' });
    var h0 = S.rect(200, 72, 170, 30, 'st-pill', 15) + S.text(285, 92, 'H₀: the coin is fair', { cls: 'st-t', weight: 700 });
    /* a fair coin, 100 tosses at a time: the first six goes as numbers, a hundred as dots
       (the other 94 are rbinom(94, 100, 0.5) with set.seed(268) in R: 10 of the 100 land on 50) */
    var runs = [53, 47, 51, 55, 49, 44];
    var chips = runs.map(function (r, j) { return S.rect(72 + j * 54, 40, 46, 26, 'st-pill', 13) + S.text(95 + j * 54, 58, r, { cls: 'st-t', weight: 600 }); }).join('') + S.text(72 + 6 * 54 + 4, 58, '…', { anchor: 'start', cls: 'st-t', weight: 600 });
    var goes = [53, 47, 51, 55, 49, 44, 44, 53, 51, 45, 47, 41, 53, 50, 46, 52, 50, 49, 59, 42, 48, 42, 59, 49, 57, 50, 48, 42, 58, 51, 48, 51, 61, 50, 52, 43, 43, 49, 50, 45, 52, 52, 49, 47, 44, 56, 53, 48, 49, 53, 50, 52, 55, 45, 48, 49, 55, 55, 50, 56, 55, 51, 53, 47, 52, 52, 52, 46, 52, 43, 48, 49, 58, 47, 54, 50, 46, 47, 60, 46, 44, 47, 45, 50, 49, 46, 38, 46, 54, 51, 51, 51, 50, 48, 52, 56, 47, 57, 59, 41], seen = {};
    var dots = goes.map(function (v) { var n = seen[v] = (seen[v] || 0) + 1; return '<circle cx="' + xs(v).toFixed(1) + '" cy="' + (yB - 6 - (n - 1) * 9) + '" r="4.2" class="st-dot"/>'; }).join('') +
      S.text(xs(62), yB - 40, 'each dot = one go', { anchor: 'start', cls: 'st-lab' }) + S.text(xs(62), yB - 24, 'of 100 tosses', { anchor: 'start', cls: 'st-lab' });
    var xaxis = S.axes({ x0: x0, x1: x1, y0: yB, y1: yB, xs: xs, ys: ys, xTicks: [30, 40, 50, 60, 70, 80], xLabel: 'Number of heads in 100 tosses of a fair coin' });
    var yaxis = S.line(x0, yB, x0, yT - 10, 'st-ax') + '<text transform="translate(30 ' + ((yB + yT) / 2) + ') rotate(-90)" text-anchor="middle" class="st-lab">How often</text>';
    function marker(v, lab, cls) {
      return S.line(xs(v), yB, xs(v), yT - 6, cls || 'st-ln') + '<circle cx="' + xs(v) + '" cy="' + (yT - 6) + '" r="4" class="st-dot' + (cls === 'st-hot' ? ' st-dot--b' : '') + '"/>' + S.text(xs(v), yT - 16, lab, { cls: 'st-t', weight: 700 });
    }
    return '' +
      S.g('q', S.rect(446, 22, 170, 34, 'st-pill', 17) + S.text(531, 44, 'Your coin: 53 heads', { cls: 'st-t', weight: 700, size: 15 })) +
      S.g('coin', coin) +
      S.g('tally', tally) +
      S.g('h0', h0) +
      S.g('runs', S.text(72, 30, 'A fair coin, 100 tosses at a time:', { anchor: 'start', cls: 'st-lab' }) + chips) +
      S.g('ok', S.rect(xs(39.5), yT - 4, xs(60.5) - xs(39.5), yB - yT + 4, 'st-zone-ok') + S.text(xs(39.5) + 6, yT + 10, '40–60 heads', { anchor: 'start', cls: 'st-lab', fill: '#166534' }) + S.text(xs(39.5) + 6, yT + 25, '96.5 %', { anchor: 'start', cls: 'st-lab', fill: '#166534' })) +
      S.g('tails', S.rect(xs(24.5), yT - 4, xs(39.5) - xs(24.5), yB - yT + 4, 'st-zone-bad') + S.rect(xs(60.5), yT - 4, xs(85.5) - xs(60.5), yB - yT + 4, 'st-zone-bad') + S.text(xs(32), yB - 150, 'rare', { cls: 'st-lab', fill: '#B42318' }) + S.text(xs(73), yB - 150, 'rare', { cls: 'st-lab', fill: '#B42318' }) + S.text(xs(73), yB - 134, 'together, < 5 %', { cls: 'st-tick', fill: '#B42318' })) +
      S.g('xaxis', xaxis) +
      S.g('yaxis', yaxis) +
      S.g('dots', dots) +
      S.g('bars', bars) +
      S.g('m53', marker(53, 'your 53')) +
      S.g('m80', marker(80, '80 heads', 'st-hot')) +
      S.g('p53', S.rect(xs(53) + 8, yT + 18, 92, 26, 'st-pill', 13) + S.text(xs(53) + 54, yT + 36, 'p = 0.62', { cls: 'st-t', weight: 700 })) +
      S.g('p80', S.rect(xs(80) - 142, yT + 18, 134, 26, 'st-pill', 13) + S.text(xs(80) - 75, yT + 36, 'p = 0.000000001', { cls: 'st-t', weight: 700, size: 12 }));
  }

  LR.course({
    id: 'ib-stats',
    kicker: 'IB Biology · Tool 3',
    title: 'Statistics in R',
    packages: [],
    setup: '',
    finish: 'This is the first stage of the IB course. The rest is being built: the normal distribution, SD and SE, then the χ² test, the t-test and correlation.',
    stages: [
      { id: 'p-value', title: 'Is it real, or is it chance?',
        lede: 'Every statistical test in biology ends with one number: the p-value. Here is what it means.',
        blocks: [
          { type: 'goal', md: 'Explain what a p-value is, and decide whether to reject the null hypothesis.' },
          { type: 'story', id: 'ib-coin', gate: true, title: 'The p-value, with a coin', w: 640, h: 350, alt: 'How often a fair coin gives each number of heads in 100 tosses',
            scene: coinScene,
            steps: [
              { title: 'Is this coin fair?', show: ['coin', 'tally'],
                md: 'You toss a coin 100 times. You get **53 heads** and 47 tails. A fair coin should give about 50 of each.\n\nIs 53 too many? Or is it just chance?' },
              { title: 'Start with the boring answer', show: ['h0'], focus: ['h0', 'tally'], pan: 'tally',
                md: 'The **null hypothesis (H₀)** is the boring answer: *the coin is fair*.\n\nYou keep H₀ unless the evidence against it is strong.',
                analogy: 'H₀ is like a court. The court assumes the person is innocent, and changes its mind only if the evidence is strong.' },
              { title: 'A fair coin is never exactly 50', hide: ['coin', 'tally', 'h0'], show: ['q', 'runs', 'xaxis', 'dots'],
                md: 'Now take a coin that you __know__ is fair. Toss it 100 times and count the heads: 53. Do it again: 47. Again: 51…\n\nEach dot is one go of 100 tosses. After 100 goes, the dots pile up __near__ 50, but only 10 land exactly __on__ 50. That spread is chance.' },
              { title: 'Thousands of goes make a shape', hide: ['dots'], show: ['yaxis', 'bars'],
                md: 'Do it thousands of times, and the dots pile up into this shape.\n\nEach bar shows how often a fair coin gives that number of heads. The middle bars are tall: results near 50 are common. The bars at the edges are short: results far from 50 are rare.' },
              { title: 'The usual results', show: ['ok'],
                md: 'Between 40 and 60 heads happens **96.5 %** of the time: more than 19 times in 20.\n\nA result in the green zone is ordinary for a fair coin.' },
              { title: 'The surprising results', show: ['tails'],
                md: 'Fewer than 40 heads, or more than 60, happens **less than 1 time in 20** (less than 5 %).\n\nIf the coin is fair, a result in the red zone is surprising.' },
              { title: 'Your 53 heads', show: ['m53'], focus: ['m53', 'ok', 'bars'],
                md: '53 sits in the green zone. A fair coin does this all the time.\n\nSo 53 heads is __no evidence__ against H₀. You keep H₀.' },
              { title: 'Now 80 heads', show: ['m80'], focus: ['m80', 'tails'],
                md: '80 heads is far out, beyond the red zone. A fair coin almost never does this.\n\nSo you **reject H₀**: the coin is probably not fair.' },
              { title: 'That is the p-value', show: ['p53', 'p80'],
                md: 'The **p-value** answers one question: *if H₀ were true, how often would chance give a result at least this far from what H₀ expects?*\n\n- 53 heads: p = 0.62. Chance does this 62 % of the time. Keep H₀.\n- 80 heads: p = 0.000000001. Chance almost never does this. Reject H₀.\n\nThe rule in biology: if **p < 0.05**, reject H₀. The result is *statistically significant*.' },
              { title: 'What p < 0.05 does not mean', show: [],
                md: 'It does not __prove__ anything. Even when H₀ is true, chance gives p < 0.05 one time in 20.\n\nAnd p > 0.05 does not prove H₀ is true. It means only that this evidence is not strong enough.',
                analogy: 'A court that says *not guilty* has not proved the person innocent. It has decided the evidence was not strong enough.' }
            ] },
          { type: 'concept', title: 'The same idea, in every test',
            md: 'The χ² test, the t-test and a correlation all work like the coin:\n\n- **H₀** is the boring answer: no difference, no association, no correlation.\n- The test works out how often chance alone would give your result.\n- That is the p-value. If **p < 0.05**, you reject H₀.' },
          { type: 'exercise', id: 'ib-binom', gate: true,
            task: 'R can do the whole coin story in one line: `binom.test(heads, tosses)`. Run it for 53 heads and find the **p-value** in the output. Then change 53 to **80**, run it again, and press **Check my answer**.',
            code: '# 53 heads in 100 tosses: is the coin fair?\nbinom.test(53, 100)',
            solution: 'binom.test(80, 100)',
            check: 'if (!inherits(value, "htest")) "Keep binom.test( ) as the last line, so R prints its result." else if (value$statistic != 80) "Change 53 to 80 heads." else if (value$parameter != 100) "Keep 100 tosses." else TRUE',
            hint: 'Only one number changes: `binom.test(80, 100)`.',
            pass: 'For 80 heads, p = 1.116e-09. That is 0.000000001116: far below 0.05, so you reject H₀.' },
          { type: 'interpret', title: 'Reading R’s answer',
            md: 'Look for the line `p-value = …`.\n\n- `p-value = 0.6173` for 53 heads: more than 0.05, so keep H₀.\n- `p-value = 1.116e-09` for 80 heads. The `e-09` means "move the decimal point 9 places left": 0.000000001116. Less than 0.05, so reject H₀.\n\nR also prints the null hypothesis the other way round: `true probability of success is not equal to 0.5`. That is H₁, the alternative hypothesis.' },
          { type: 'mcq', id: 'ib-p-mcq', gate: true, q: 'A test gives p = 0.30. What do you write?',
            opts: [
              { t: 'There is no significant difference: p > 0.05, so H₀ is not rejected.', ok: true, why: 'Chance alone gives a result like this 30 % of the time: not surprising enough.' },
              { t: 'H₀ is proved true.', why: 'A p-value never proves H₀. The evidence is simply not strong enough to reject it.' },
              { t: 'There is a significant difference, because p is small.', why: 'Significant means p < 0.05. 0.30 is bigger than 0.05.' },
              { t: 'There is a 30 % chance that H₀ is true.', why: 'The p-value is how often chance gives your result IF H₀ is true, not the chance that H₀ is true.' }
            ] },
          { type: 'frames', items: [
            'The null hypothesis (H₀) is that ___.',
            'The p-value is ___, which is less than 0.05, so H₀ is rejected: there is a significant ___.',
            'The p-value is ___, which is more than 0.05, so H₀ is not rejected: there is no significant ___.'
          ] },
          { type: 'note', title: 'Writing it up in your IA',
            md: 'Learn R shows you __how a test works__ and how to run it. The Write-Up Lab shows you __how to report it__: which test fits your data (**Find your test**), the one line that reports it, and the mistakes that lose marks. [Open Statistical tests in the Write-Up Lab](https://nlcsbiology.com/write-up-lab/#/part/stats).' }
        ] }
    ]
  });
})(window.LR);
