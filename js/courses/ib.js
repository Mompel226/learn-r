/* ============================================================
   courses/ib.js — IB · Statistics in R. Rebuilt from Daniel's
   NLCS/IB/Learning R/IB_Bio_D3_2.Rmd around what the IB guide asks
   (Tool 3; C4.1.15 and D3.2.21 chi-squared; C2.2.4 correlation and R²).

   PROTOTYPE (25 Sep 2026): one stage, the p-value, to agree the style of
   the click-by-click stories before the rest is built. The coin numbers
   are exact (binomial, n = 100, p = 0.5; checked in R):
     P(40 ≤ heads ≤ 60) = 0.9648 · binom.test(53, 100) p = 0.6173
     binom.test(61, 100) p = 0.0352 · binom.test(80, 100) p = 1.116e-09
   ============================================================ */
(function (LR) {
  'use strict';

  /* ---------- the coin story's picture ---------- */
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
    var runs = [53, 47, 51, 55, 49, 44];
    var chips = runs.map(function (r, j) { return S.rect(72 + j * 54, 40, 46, 26, 'st-pill', 13) + S.text(95 + j * 54, 58, r, { cls: 'st-t', weight: 600 }); }).join('') + S.text(72 + 6 * 54 + 4, 58, '…', { anchor: 'start', cls: 'st-t', weight: 600 });
    function marker(v, lab, cls) {
      return S.line(xs(v), yB, xs(v), yT - 6, cls || 'st-ln') + '<circle cx="' + xs(v) + '" cy="' + (yT - 6) + '" r="4" class="st-dot' + (cls === 'st-hot' ? ' st-dot--b' : '') + '"/>' + S.text(xs(v), yT - 16, lab, { cls: 'st-t', weight: 700 });
    }
    return '' +
      S.g('q', S.rect(446, 22, 170, 34, 'st-pill', 17) + S.text(531, 44, 'Your coin: 53 heads', { cls: 'st-t', weight: 700, size: 15 })) +
      S.g('runs', S.text(72, 30, 'A fair coin, 100 tosses at a time:', { anchor: 'start', cls: 'st-lab' }) + chips) +
      S.g('ok', S.rect(xs(39.5), yT - 4, xs(60.5) - xs(39.5), yB - yT + 4, 'st-zone-ok') + S.text(xs(39.5) + 6, yT + 10, '40–60 heads', { anchor: 'start', cls: 'st-lab', fill: '#166534' }) + S.text(xs(39.5) + 6, yT + 25, '96.5 %', { anchor: 'start', cls: 'st-lab', fill: '#166534' })) +
      S.g('tails', S.rect(xs(24.5), yT - 4, xs(39.5) - xs(24.5), yB - yT + 4, 'st-zone-bad') + S.rect(xs(60.5), yT - 4, xs(85.5) - xs(60.5), yB - yT + 4, 'st-zone-bad') + S.text(xs(32), yB - 150, 'rare', { cls: 'st-lab', fill: '#B42318' }) + S.text(xs(73), yB - 150, 'rare', { cls: 'st-lab', fill: '#B42318' }) + S.text(xs(73), yB - 134, 'together, < 5 %', { cls: 'st-tick', fill: '#B42318' })) +
      S.g('axes', S.axes({ x0: x0, x1: x1, y0: yB, y1: yT - 10, xs: xs, ys: ys, xTicks: [30, 40, 50, 60, 70, 80], xLabel: 'Number of heads in 100 tosses of a fair coin' }) + '<text transform="translate(30 ' + ((yB + yT) / 2) + ') rotate(-90)" text-anchor="middle" class="st-lab">How often</text>') +
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
              { title: 'Is this coin fair?', show: ['q'],
                md: 'You toss a coin 100 times and get **53 heads**. A fair coin should give about 50.\n\nIs 53 too many? Or is it just chance?' },
              { title: 'Start with the boring answer', show: [], focus: ['q'],
                md: 'The **null hypothesis (H₀)** is the boring answer: *the coin is fair*.\n\nYou keep H₀ unless the evidence against it is strong.',
                analogy: 'H₀ is like a court. The court assumes the person is innocent, and changes its mind only if the evidence is strong.' },
              { title: 'A fair coin is never exactly 50', show: ['runs'],
                md: 'Toss a fair coin 100 times, again and again. You get 53, then 47, then 51…\n\nSome difference from 50 is normal. That difference is __chance__.' },
              { title: 'Thousands of repeats make a picture', show: ['axes', 'bars'],
                md: 'Each bar shows how often a fair coin gives that number of heads.\n\nThe middle bars are tall: results near 50 are common. The bars at the edges are short: results far from 50 are rare.' },
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
          ] }
        ] }
    ]
  });
})(window.LR);
