/* ============================================================
   scenes/ib.js — the data and the story pictures of IB · Statistics in R.

   ONE running example (Daniel: "one running example, extend it rather than
   switch"): an INVENTED class of 40 students. Half train in a sports team,
   half do not. For each: resting heart rate (B3.2.4: the pulse at the wrist,
   60 s), hours of exercise a week, and ABO blood group (D3.2.14's discrete
   example). Made in R (25 Sep 2026) so that the numbers teach:
     do not train  mean 77.00  SD 7.75  SE 1.73  95 % CI 73.37–80.63  (n = 20)
     train         mean 70.55  SD 8.40  SE 1.88  95 % CI 66.62–74.48  (n = 20)
     t = 2.52, df = 38, p = 0.016 (SE of the difference 2.56; critical t 2.02)
       · the SD bars overlap and the 95 % CIs overlap by 1.1 bpm, yet p < 0.05
     whole class  mean 73.8, SD 8.6: 28 of 40 within ± 1 SD (70 %), 38 of 40 within ± 2 SD
     exercise_h v resting_hr: r = −0.50, p = 0.0009, R² = 0.25, line 79.46 − 1.373 x
     no 1.5 × IQR outliers in either group; the extra reading of 112 bpm (after PE) is one
     blood groups O 11, A 14, B 11, AB 4 (mode A), spread evenly across the two groups
   The χ² story uses the heather and moss survey of Daniel's C4.1 slides 49–62
   (Course Companion Fig. 35, p. 521): 57 · 7 · 9 · 27, χ² = 42.4 with E rounded
   to 1 d.p. (R: 42.1). Every scene below draws these numbers; the words that
   quote them are checked against R by tools/check.mjs (the "facts" list).
   ============================================================ */
(function (LR) {
  'use strict';
  var IB = LR.IB = {};

  /* ---------- the class, in the order of the table ---------- */
  var D = IB.data = {
    trains: ['No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'No', 'No', 'No', 'No', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'Yes', 'No', 'Yes', 'No', 'No', 'Yes', 'No', 'Yes', 'Yes', 'No', 'Yes', 'No', 'Yes', 'Yes'],
    exercise_h: [2, 1, 9, 8, 1, 6, 1, 8, 0.5, 1, 1, 1.5, 1, 6, 6, 1, 9, 0.5, 7, 8, 1, 2, 5, 2, 7, 5, 9, 1, 7, 1.5, 1, 9, 1, 3, 7, 2, 7, 1.5, 8, 7],
    resting_hr: [68, 87, 57, 66, 81, 79, 73, 77, 74, 74, 84, 71, 79, 75, 69, 79, 55, 62, 69, 77, 93, 70, 69, 78, 77, 91, 66, 70, 67, 75, 86, 65, 70, 78, 65, 79, 76, 87, 62, 71],
    abo: ['A', 'A', 'B', 'A', 'A', 'AB', 'B', 'B', 'B', 'AB', 'O', 'A', 'O', 'O', 'A', 'AB', 'A', 'B', 'O', 'O', 'O', 'O', 'A', 'O', 'B', 'A', 'AB', 'B', 'O', 'O', 'A', 'B', 'O', 'B', 'A', 'B', 'A', 'B', 'A', 'A']
  };
  IB.no = D.resting_hr.filter(function (v, i) { return D.trains[i] === 'No'; });
  IB.yes = D.resting_hr.filter(function (v, i) { return D.trains[i] === 'Yes'; });
  IB.AFTER_PE = 112;

  /* the students table for R, built from the same numbers */
  function rvec(a, q) { return 'c(' + a.map(function (v) { return q ? '"' + v + '"' : String(v); }).join(', ') + ')'; }
  IB.rStudents = [
    'students <- data.frame(',
    '  id = 1:40,',
    '  trains = factor(' + rvec(D.trains, true) + ', levels = c("No", "Yes")),',
    '  exercise_h = ' + rvec(D.exercise_h) + ',',
    '  resting_hr = ' + rvec(D.resting_hr) + ',',
    '  abo = factor(' + rvec(D.abo, true) + ', levels = c("O", "A", "B", "AB"))',
    ')'
  ].join('\n');

  /* ---------- small helpers ---------- */
  function mean(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
  function sd(a) { var m = mean(a); return Math.sqrt(a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1)); }
  IB.mean = mean; IB.sd = sd;
  function f1(v) { return (Math.round(v * 10) / 10).toFixed(1); }
  /* several lines of text, one under the other */
  function lines(S, x, y, arr, o, lh) { return arr.map(function (t, i) { return S.text(x, y + i * (lh || 17), t, o); }).join(''); }
  function card(S, x, y, w, h, cls) { return S.rect(x, y, w, h, 'st-card' + (cls ? ' ' + cls : ''), 10); }
  /* dots stacked upwards where values repeat; key() says which values share a column */
  function dots(vals, xs, yBase, r, gap, cls, key) {
    var seen = {};
    return vals.map(function (v) {
      var k = key ? key(v) : String(v), n = seen[k] = (seen[k] || 0) + 1, x = key ? xs(+k) : xs(v);
      return '<circle cx="' + x.toFixed(1) + '" cy="' + (yBase - r - (n - 1) * gap).toFixed(1) + '" r="' + r + '" class="' + (cls || 'st-dot') + '"/>';
    }).join('');
  }
  function arrow(S, x1, y1, x2, y2) {
    var a = Math.atan2(y2 - y1, x2 - x1), L = 9, W = 5;
    var p1 = [x2 - L * Math.cos(a) + W * Math.sin(a), y2 - L * Math.sin(a) - W * Math.cos(a)], p2 = [x2 - L * Math.cos(a) - W * Math.sin(a), y2 - L * Math.sin(a) + W * Math.cos(a)];
    return S.line(x1, y1, x2 - 6 * Math.cos(a), y2 - 6 * Math.sin(a), 'st-arrow') + '<polygon points="' + x2 + ',' + y2 + ' ' + p1.join(',') + ' ' + p2.join(',') + '" class="st-arrowhead"/>';
  }
  /* a horizontal error bar from lo to hi at height y, with caps */
  function hbar(S, xs, lo, hi, y, cls) {
    return S.line(xs(lo), y, xs(hi), y, cls) + S.line(xs(lo), y - 7, xs(lo), y + 7, cls) + S.line(xs(hi), y - 7, xs(hi), y + 7, cls);
  }
  function chip(S, x, y, t, cls) { return S.rect(x, y, 44, 26, cls || 'st-card', 13) + S.text(x + 22, y + 18, t, { cls: 'st-t', weight: 600 }); }
  var sc = {};
  IB.scenes = sc;

  /* ============ stage 2 · mean, median, mode: the seesaw ============ */
  sc.seesaw = function (S) {
    var xs = S.scale(60, 115, 60, 610), yP = 200;
    var six = [68, 87, 81, 73, 74, 74], sorted6 = six.slice().sort(function (a, b) { return a - b; });
    var seven = sorted6.concat([112]);
    var m6 = mean(six), m7 = mean(seven);
    function fulcrum(v, lab) {
      var x = xs(v);
      return '<polygon points="' + x.toFixed(1) + ',' + (yP + 2) + ' ' + (x - 11).toFixed(1) + ',' + (yP + 22) + ' ' + (x + 11).toFixed(1) + ',' + (yP + 22) + '" class="st-fulcrum"/>' + S.text(x, yP + 38, lab, { cls: 'st-lab' });
    }
    function median(v, lab) { return S.line(xs(v), 96, xs(v), yP, 'st-dash') + S.text(xs(v), 88, lab, { cls: 'st-lab' }); }
    function row(vals, hi, lab) {
      return S.text(60, 30, lab, { anchor: 'start', cls: 'st-lab' }) + vals.map(function (v, i) { return chip(S, 60 + i * 52, 40, v, hi.indexOf(i) >= 0 ? 'st-pill' : 'st-card'); }).join('');
    }
    var abo = [['O', 11], ['A', 14], ['B', 11], ['AB', 4]], by = S.scale(0, 16, 270, 70);
    var aboBars = S.line(150, 270, 500, 270, 'st-ax') + abo.map(function (g, i) {
      var x = 175 + i * 82;
      return S.rect(x, by(g[1]).toFixed(1), 56, (270 - by(g[1])).toFixed(1), g[0] === 'A' ? 'st-bar st-bar--ok st-grow' : 'st-bar st-grow', 3) + S.text(x + 28, by(g[1]) - 8, g[1], { cls: 'st-lab' }) + S.text(x + 28, 290, g[0], { cls: 'st-lab' });
    }).join('') + S.text(325, 318, 'Blood group (40 students)', { cls: 'st-lab' }) + S.text(263, by(14) - 30, 'mode = A', { cls: 'st-h', fill: '#166534' });
    var rules = [
      ['Symmetrical data,', 'no extreme values', 'the mean', 'st-card--blue'],
      ['Extreme values,', 'or skewed data', 'the median', 'st-card--amber'],
      ['Categories, such as', 'blood group', 'the mode', 'st-card--green']
    ].map(function (r, i) { var x = 24 + i * 202; return card(S, x, 90, 186, 130, r[3]) + lines(S, x + 93, 124, [r[0], r[1]], { cls: 'st-t' }) + S.text(x + 93, 172, '→ ' + r[2], { cls: 'st-h' }); }).join('');
    return '' +
      S.g('axis', S.line(60, yP, 610, yP, 'st-ax') + S.axes({ x0: 60, x1: 610, y0: 270, y1: 270, xs: xs, xTicks: [60, 70, 80, 90, 100, 110], xLabel: 'Resting heart rate / bpm' })) +
      S.g('six', dots(six, xs, yP, 9, 19)) +
      S.g('order', row(sorted6, [2, 3], 'In order, the middle two:')) +
      S.g('median6', median(74, 'median 74')) +
      S.g('mean6', fulcrum(m6, 'mean ' + f1(m6))) +
      S.g('extra', '<circle cx="' + xs(112) + '" cy="' + (yP - 9) + '" r="9" class="st-dot st-dot--hot"/>' + lines(S, xs(112), 150, ['112 bpm:', 'after PE'], { cls: 'st-lab', fill: '#B42318' }, 16)) +
      S.g('order7', row(seven, [3], 'In order, the middle one:')) +
      S.g('median7', median(74, 'median still 74')) +
      S.g('mean7', fulcrum(m7, 'mean ' + f1(m7)) + arrow(S, xs(m6) + 4, yP + 12, xs(m7) - 14, yP + 12)) +
      S.g('abo', aboBars) +
      S.g('rules', rules);
  };

  /* ============ stage 3 · a box plot, piece by piece ============ */
  sc.box = function (S) {
    var xs = S.scale(55, 115, 50, 610), yA = 280, yD = 250, yC = 145;
    var v = IB.no.concat([IB.AFTER_PE]).sort(function (a, b) { return a - b; });   /* 21 values */
    var q1 = 71, med = 78, q3 = 84, iqr = 13, fence = 103.5;
    return '' +
      S.g('axis', S.axes({ x0: 50, x1: 610, y0: yA, y1: yA, xs: xs, xTicks: [60, 70, 80, 90, 100, 110], xLabel: 'Resting heart rate / bpm' })) +
      S.g('dots', dots(v, xs, yD, 6, 13)) +
      S.g('median', S.line(xs(med), yC - 30, xs(med), yD, 'st-dash') + S.line(xs(med), yC - 25, xs(med), yC + 25, 'st-mean') + S.text(xs(med), yC - 50, 'median 78', { cls: 'st-lab' })) +
      S.g('q', S.line(xs(q1), yC - 25, xs(q1), yD, 'st-dash') + S.line(xs(q3), yC - 25, xs(q3), yD, 'st-dash') + S.text(xs(q1) - 4, yC - 34, 'Q1 71', { cls: 'st-lab', anchor: 'end' }) + S.text(xs(q3) + 4, yC - 34, 'Q3 84', { cls: 'st-lab', anchor: 'start' })) +
      S.g('box', S.rect(xs(q1), yC - 25, xs(q3) - xs(q1), 50, 'st-box', 3) + S.line(xs(med), yC - 25, xs(med), yC + 25, 'st-mean') + S.text((xs(q1) + xs(q3)) / 2, yC + 44, 'IQR = 84 − 71 = 13', { cls: 'st-lab' })) +
      S.g('fence', S.line(xs(fence), 60, xs(fence), yA, 'st-fence') + lines(S, xs(fence), 36, ['fence: Q3 + 1.5 × IQR', '= 84 + 19.5 = 103.5'], { cls: 'st-lab', fill: '#B42318' }, 16)) +
      S.g('whiskers', S.line(xs(62), yC, xs(q1), yC, 'st-wh') + S.line(xs(62), yC - 12, xs(62), yC + 12, 'st-wh') + S.line(xs(q3), yC, xs(93), yC, 'st-wh') + S.line(xs(93), yC - 12, xs(93), yC + 12, 'st-wh') +
        S.text(xs(62), yC + 30, 'min 62', { cls: 'st-small' }) + S.text(xs(93), yC + 30, 'max 93', { cls: 'st-small' })) +
      S.g('out', '<circle cx="' + xs(112) + '" cy="' + yC + '" r="7" class="st-dot st-dot--hot"/>' + S.text(xs(112), yC - 16, 'outlier', { cls: 'st-lab', fill: '#B42318' }) + '<circle cx="' + xs(112) + '" cy="' + (yD - 6) + '" r="6" class="st-dot st-dot--hot"/>') +
      S.g('note', card(S, 50, 14, 250, 60, 'st-card--amber') + S.text(62, 36, 'The notebook, reading 21:', { anchor: 'start', cls: 'st-lab' }) + S.text(62, 58, '“measured straight after PE”', { anchor: 'start', cls: 'st-t' }));
  };

  /* ============ stage 4 · the normal distribution and SD ============ */
  sc.normal = function (S) {
    var x0 = 70, x1 = 620, yB = 285, yT = 60;
    var xs = S.scale(50, 100, x0, x1), ys = S.scale(0, 13, yB, yT);
    var counts = [2, 4, 12, 9, 7, 4, 2], lo = 54, w = 6;          /* classes 54–60 … 90–96 bpm */
    var m = mean(D.resting_hr), s = sd(D.resting_hr), n = 40;
    function pk(sd0, nn) { return ys(nn * w / (sd0 * Math.sqrt(2 * Math.PI))); }
    var bars = counts.map(function (c, i) { return S.rect(xs(lo + i * w) + 1, ys(c), xs(lo + (i + 1) * w) - xs(lo + i * w) - 2, yB - ys(c), 'st-bar st-grow', 2); }).join('');
    function band(a, b, cls) { return S.normalArea(m, s, xs, yB, pk(s, n), a, b, cls); }
    return '' +
      S.g('axes', S.axes({ x0: x0, x1: x1, y0: yB, y1: yT, xs: xs, ys: ys, xTicks: [54, 60, 66, 72, 78, 84, 90, 96], yTicks: [0, 4, 8, 12], xLabel: 'Resting heart rate / bpm (classes 6 bpm wide)', yLabel: 'Number of students' })) +
      S.g('sd2', band(m - 2 * s, m + 2 * s, 'st-area') + S.line(xs(m - 2 * s), yT + 20, xs(m - 2 * s), yB, 'st-dash') + S.line(xs(m + 2 * s), yT + 20, xs(m + 2 * s), yB, 'st-dash') +
        S.text(xs(m - 2 * s), yT + 12, f1(m - 2 * s), { cls: 'st-lab' }) + S.text(xs(m + 2 * s), yT + 12, f1(m + 2 * s), { cls: 'st-lab' }) +
        S.text(410, 34, '± 2 SD (dashed): 38 of 40', { cls: 'st-lab' })) +
      S.g('sd1', band(m - s, m + s, 'st-area--green') + S.line(xs(m - s), yT + 20, xs(m - s), yB, 'st-ln') + S.line(xs(m + s), yT + 20, xs(m + s), yB, 'st-ln') + S.text(xs(m - s), yT + 12, f1(m - s), { cls: 'st-lab' }) + S.text(xs(m + s), yT + 12, f1(m + s), { cls: 'st-lab' }) +
        S.text(410, 16, '± 1 SD (green): 28 of 40', { cls: 'st-lab', fill: '#166534' })) +
      S.g('hist', bars) +
      S.g('bell', S.normal(m, s, xs, yB, pk(s, n), 50, 100)) +
      S.g('mean', S.line(xs(m), yT - 6, xs(m), yB, 'st-mean') + S.text(xs(m), yT - 12, 'mean ' + f1(m), { cls: 'st-lab' })) +
      S.g('spread', S.normal(75, 4, xs, yB, ys(12), 50, 100, 'st-curve') + S.normal(75, 12, xs, yB, ys(4), 50, 100, 'st-curve--grey') +
        S.text(xs(75) + 30, ys(10.5), 'small SD (4 bpm)', { cls: 'st-lab', anchor: 'start', fill: '#1F5FAD' }) + S.text(xs(90), ys(3.2), 'large SD (12 bpm)', { cls: 'st-lab', anchor: 'start', fill: '#374151' }) +
        S.text(x1, 24, 'two imagined groups, both mean 75 bpm', { cls: 'st-small', anchor: 'end' })) +
      S.g('groups', S.normal(mean(IB.no), sd(IB.no), xs, yB, pk(sd(IB.no), 20), 50, 100, 'st-curve') + S.normal(mean(IB.yes), sd(IB.yes), xs, yB, pk(sd(IB.yes), 20), 50, 100, 'st-curve--t') +
        S.text(xs(84), pk(sd(IB.no), 20) + 10, 'do not train', { cls: 'st-lab', anchor: 'start', fill: '#1F5FAD' }) + S.text(xs(62), pk(sd(IB.yes), 20) + 10, 'train', { cls: 'st-lab', anchor: 'end', fill: '#0E7A66' }));
  };

  /* ============ stage 5 · SE: the spread of the means ============ */
  /* 100 imagined classes of 20 (R: set.seed(12); round(replicate(100, mean(rnorm(20, 77, 7.75))), 1): SD of the means 1.74)
     and of 80 (set.seed(17); … rnorm(80 …): SD 0.86) */
  IB.means20 = [74.4, 77.8, 76.5, 78.2, 76.9, 78.2, 77.9, 75.8, 76.2, 77.4, 76.2, 75.7, 78, 78.4, 75.5, 76.6, 76.5, 75.5, 77.8, 77.6, 77.8, 73.9, 77.9, 78.1, 75.9, 74.2, 75.1, 76.5, 76.8, 75.9, 74.7, 77, 77.9, 75.8, 75.6, 81, 75.6, 74.8, 74.7, 78.7, 77.1, 78.3, 74.9, 79, 79.5, 77.5, 76.1, 75.3, 78, 79.3, 78.7, 79, 76.3, 75.1, 76.5, 77.1, 78.5, 74.9, 79.9, 74.7, 75.6, 74.1, 76.2, 79, 77.4, 75.4, 82.6, 76.1, 80, 75.2, 81.4, 78.3, 74, 79.2, 76.4, 76.1, 76.1, 76.6, 75.7, 76.3, 78.8, 77.5, 77.6, 77.5, 76.5, 78.9, 76.2, 74.1, 78.6, 78.4, 78, 76.2, 80.8, 77.5, 77, 78.2, 76.9, 75.5, 79.4, 77.5];
  IB.means80 = [77.2, 77.1, 76.1, 78.2, 76.2, 75.8, 78.3, 76.5, 76.2, 78.6, 78.2, 76.8, 77, 76.3, 76.5, 77.9, 76.6, 75.8, 77.6, 77.8, 76.7, 77.9, 76.1, 76.7, 77.8, 78, 77.4, 77.1, 76.8, 78.1, 77, 76.4, 77.4, 77.2, 77, 76.3, 76.9, 77.4, 73.7, 76.8, 75.9, 77.1, 75.4, 77.3, 75.4, 76.6, 78.3, 75.9, 77.3, 75.7, 76.8, 76.1, 76.5, 77, 76.9, 76.2, 77.9, 76.2, 76.5, 77, 77.9, 78.1, 76.7, 77.2, 76.7, 77.8, 78.2, 77.8, 78.1, 77, 76.9, 75.8, 77.2, 78.4, 77.7, 77.7, 77.2, 76.9, 77.3, 76.3, 77.7, 77.3, 78.7, 77.6, 78, 77.3, 78.4, 78.7, 76.4, 76.7, 77.1, 76.4, 76.8, 75.8, 76.7, 77.4, 78.2, 77.8, 77, 76.4];
  sc.se = function (S) {
    var xs = S.scale(55, 100, 60, 620), yA = 290, yD = 280;
    var m = mean(IB.no), s = sd(IB.no), se = s / Math.sqrt(20), se80 = s / Math.sqrt(80);
    var half = function (v) { return String(Math.round(v * 2) / 2); };
    return '' +
      S.g('axis', S.axes({ x0: 60, x1: 620, y0: yA, y1: yA, xs: xs, xTicks: [55, 60, 65, 70, 75, 80, 85, 90, 95, 100], xLabel: 'Resting heart rate / bpm' })) +
      S.g('ind', dots(IB.no, xs, yD, 6, 13) + S.text(60, 222, 'each dot = one student who does not train', { anchor: 'start', cls: 'st-small' })) +
      S.g('sdbar', hbar(S, xs, m - s, m + s, 200, 'st-err') + '<circle cx="' + xs(m) + '" cy="200" r="4" class="st-dot"/>' + S.text(xs(m + s) + 10, 204, '± 1 SD = 7.75 bpm', { cls: 'st-lab', anchor: 'start' })) +
      S.g('mean1', S.line(xs(m), 64, xs(m), yA, 'st-dash') + S.text(xs(m), 56, 'mean 77.0', { cls: 'st-lab' })) +
      S.g('pile20', dots(IB.means20, xs, yD, 3.2, 6.6, 'st-dot st-dot--t', half) + S.text(xs(84), 250, 'each dot = the mean', { anchor: 'start', cls: 'st-small' }) + S.text(xs(84), 265, 'of one class of 20', { anchor: 'start', cls: 'st-small' })) +
      S.g('sebar', hbar(S, xs, m - se, m + se, 120, 'st-err--se') + S.text(xs(m + se) + 10, 124, '± 1 SE = 1.7 bpm', { cls: 'st-lab', anchor: 'start', fill: '#9A5B0B' })) +
      S.g('pile80', dots(IB.means80, xs, yD, 2.6, 5.4, 'st-dot st-dot--t', half) + S.text(xs(84), 250, 'each dot = the mean', { anchor: 'start', cls: 'st-small' }) + S.text(xs(84), 265, 'of one class of 80', { anchor: 'start', cls: 'st-small' }) +
        hbar(S, xs, m - se80, m + se80, 96, 'st-err--se') + S.text(xs(m + se80) + 10, 100, 'n = 80: ± 1 SE = 0.9 bpm', { cls: 'st-lab', anchor: 'start', fill: '#9A5B0B' }));
  };

  /* ============ stage 6 · the p-value, with a coin ============
     It moves on as the story does: your coin's tally (steps 1–2) → a fair coin's goes as dots (step 3)
     → thousands of goes as bars (step 4 on). Every step shows something: never an empty box. */
  sc.coin = function (S) {
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
    var goes = [53, 47, 51, 55, 49, 44, 44, 53, 51, 45, 47, 41, 53, 50, 46, 52, 50, 49, 59, 42, 48, 42, 59, 49, 57, 50, 48, 42, 58, 51, 48, 51, 61, 50, 52, 43, 43, 49, 50, 45, 52, 52, 49, 47, 44, 56, 53, 48, 49, 53, 50, 52, 55, 45, 48, 49, 55, 55, 50, 56, 55, 51, 53, 47, 52, 52, 52, 46, 52, 43, 48, 49, 58, 47, 54, 50, 46, 47, 60, 46, 44, 47, 45, 50, 49, 46, 38, 46, 54, 51, 51, 51, 50, 48, 52, 56, 47, 57, 59, 41];
    var pile = dots(goes, xs, yB, 4.2, 9) +
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
      S.g('dots', pile) +
      S.g('bars', bars) +
      S.g('m53', marker(53, 'your 53')) +
      S.g('m80', marker(80, '80 heads', 'st-hot')) +
      S.g('p53', S.rect(xs(53) + 8, yT + 18, 92, 26, 'st-pill', 13) + S.text(xs(53) + 54, yT + 36, 'p = 0.62', { cls: 'st-t', weight: 700 })) +
      S.g('p80', S.rect(xs(80) - 142, yT + 18, 134, 26, 'st-pill', 13) + S.text(xs(80) - 75, yT + 36, 'p = 0.000000001', { cls: 'st-t', weight: 700, size: 12 }));
  };

  /* ============ stage 7 · which test? ============ */
  sc.which = function (S) {
    function col(x, head, sub, test, eg, cls) {
      return card(S, x, 96, 196, 74, cls) + lines(S, x + 98, 122, head, { cls: 'st-lab' }, 16) + S.text(x + 98, 160, sub, { cls: 'st-small' }) +
        arrow(S, x + 98, 172, x + 98, 196) + S.rect(x + 18, 198, 160, 34, 'st-pill', 17) + S.text(x + 98, 221, test, { cls: 'st-h' }) +
        lines(S, x + 98, 252, eg, { cls: 'st-small' }, 15);
    }
    function cond(x, head, body, cls) { return card(S, x, 284, 196, 70, cls) + S.text(x + 10, 302, head, { cls: 'st-lab', anchor: 'start' }) + lines(S, x + 10, 320, body, { cls: 'st-small', anchor: 'start' }, 15); }
    return '' +
      S.g('q', card(S, 200, 10, 240, 44, 'st-card--violet') + S.text(320, 38, 'What kind of data do you have?', { cls: 'st-lab' })) +
      S.g('arrows', arrow(S, 280, 56, 116, 94) + arrow(S, 320, 56, 320, 94) + arrow(S, 360, 56, 526, 94)) +
      S.g('b1', col(18, ['Counts in', 'categories'], 'present or absent', 'χ² test', ['heather and moss', 'in 100 quadrats'], 'st-card--green')) +
      S.g('b2', col(222, ['One measurement,', 'two groups'], 'a number for each', 't-test', ['resting heart rate:', 'train v do not train'], 'st-card--blue')) +
      S.g('b3', col(426, ['Two measurements', 'on each individual'], 'pairs of numbers', 'correlation', ['hours of exercise and', 'resting heart rate'], 'st-card--amber')) +
      S.g('ccond', cond(18, 'Check first', ['Every expected count', 'is at least 5.'], 'st-card--green')) +
      S.g('tcond', cond(222, 'Check first', ['Each group roughly normal?', 'Similar SDs? If not: Welch’s', 't-test (R’s default).'], 'st-card--blue')) +
      S.g('shelf', cond(426, 'Beyond the IB', ['Not normal: Mann–Whitney.', 'Three or more groups:', 'ANOVA.'], 'st-card'));
  };

  /* ============ stage 8 · the t-test: signal and noise ============ */
  sc.t = function (S) {
    var xs = S.scale(50, 100, 170, 620), yA = 292, yN = 126, yY = 226;
    var mN = mean(IB.no), mY = mean(IB.yes), sN = sd(IB.no), sY = sd(IB.yes);
    var tx = S.scale(-4, 4, 90, 590), tB = 280, tT = 110;
    function dens(t) { return Math.exp(-t * t / 2); }
    var tcurve = '', tl = '', tr = '';
    for (var i = 0; i <= 120; i++) { var t = -4 + 8 * i / 120; tcurve += (i ? ' L' : 'M') + tx(t).toFixed(1) + ' ' + (tB - (tB - tT) * dens(t)).toFixed(1); }
    function tail(a, b) { var d = 'M' + tx(a).toFixed(1) + ' ' + tB; for (var j = 0; j <= 30; j++) { var t = a + (b - a) * j / 30; d += ' L' + tx(t).toFixed(1) + ' ' + (tB - (tB - tT) * dens(t)).toFixed(1); } return '<path d="' + d + ' L' + tx(b).toFixed(1) + ' ' + tB + ' Z" class="st-area--red"/>'; }
    return '' +
      S.g('axis', S.axes({ x0: 170, x1: 620, y0: yA, y1: yA, xs: xs, xTicks: [50, 60, 70, 80, 90, 100], xLabel: 'Resting heart rate / bpm' })) +
      S.g('labels', S.text(158, yN - 14, 'Do not train', { cls: 'st-lab', anchor: 'end', fill: '#1F5FAD' }) + S.text(158, yN + 2, 'n = 20', { cls: 'st-small', anchor: 'end' }) +
        S.text(158, yY - 14, 'Train', { cls: 'st-lab', anchor: 'end', fill: '#0E7A66' }) + S.text(158, yY + 2, 'n = 20', { cls: 'st-small', anchor: 'end' })) +
      S.g('dotsNo', S.line(170, yN, 620, yN, 'st-ln') + dots(IB.no, xs, yN, 5.5, 12)) +
      S.g('dotsYes', S.line(170, yY, 620, yY, 'st-ln') + dots(IB.yes, xs, yY, 5.5, 12, 'st-dot st-dot--t')) +
      S.g('means', S.line(xs(mN), yN - 52, xs(mN), yN + 8, 'st-mean') + S.text(xs(mN) + 6, yN - 46, 'mean 77.00', { cls: 'st-lab', anchor: 'start' }) +
        S.line(xs(mY), yY - 52, xs(mY), yY + 8, 'st-mean') + S.text(xs(mY) - 6, yY - 46, 'mean 70.55', { cls: 'st-lab', anchor: 'end' })) +
      S.g('diff', S.line(xs(mY), 168, xs(mN), 168, 'st-err') + S.line(xs(mY), 160, xs(mY), 176, 'st-err') + S.line(xs(mN), 160, xs(mN), 176, 'st-err') + S.text((xs(mY) + xs(mN)) / 2, 160, '6.45 bpm', { cls: 'st-h' })) +
      S.g('h0', S.rect(170, 16, 300, 30, 'st-pill', 15) + S.text(320, 36, 'H₀: no difference between the means', { cls: 'st-t', weight: 700 })) +
      S.g('sd', hbar(S, xs, mN - sN, mN + sN, yN + 16, 'st-err') + S.text(xs(mN + sN) + 8, yN + 20, 'SD 7.75', { cls: 'st-small', anchor: 'start' }) +
        hbar(S, xs, mY - sY, mY + sY, yY + 16, 'st-err--t') + S.text(xs(mY + sY) + 8, yY + 20, 'SD 8.40', { cls: 'st-small', anchor: 'start' })) +
      S.g('tcalc', card(S, 400, 8, 230, 58, 'st-card--amber') + S.text(515, 32, 't = difference ÷ SE of difference', { cls: 'st-small' }) + S.text(515, 56, 't = 6.45 ÷ 2.56 = 2.52', { cls: 'st-h' })) +
      S.g('tdist', S.line(90, tB, 590, tB, 'st-ax') + [-3, -2, -1, 0, 1, 2, 3].map(function (v) { return S.line(tx(v), tB, tx(v), tB + 5, 'st-ax') + S.text(tx(v), tB + 20, v, { cls: 'st-tick' }); }).join('') +
        S.text(340, tB + 42, 'Values of t if H₀ is true (df = 38)', { cls: 'st-lab' }) + '<path d="' + tcurve + '" class="st-curve"/>') +
      S.g('tcrit', tail(-4, -2.024) + tail(2.024, 4) + S.line(tx(-2.024), tB, tx(-2.024), tT + 60, 'st-fence') + S.line(tx(2.024), tB, tx(2.024), tT + 60, 'st-fence') +
        S.text(tx(-2.024), tT + 52, '−2.02', { cls: 'st-lab', fill: '#B42318' }) + S.text(tx(2.024), tT + 52, '2.02', { cls: 'st-lab', fill: '#B42318' }) + S.text(340, tT - 14, 'beyond ± 2.02: less than 5 % of the time', { cls: 'st-lab', fill: '#B42318' })) +
      S.g('tmark', S.line(tx(2.523), tB, tx(2.523), tT + 10, 'st-hot') + '<circle cx="' + tx(2.523) + '" cy="' + (tT + 10) + '" r="5" class="st-dot st-dot--hot"/>' +
        S.rect(tx(2.523) - 8, tT - 2 - 50, 136, 30, 'st-pill', 15) + S.text(tx(2.523) + 60, tT - 32, 't = 2.52, p = 0.016', { cls: 'st-t', weight: 700 })) +
      S.g('concl', card(S, 16, 4, 460, 58, 'st-card--violet') + lines(S, 246, 27, ['Students who train had a lower mean resting heart rate.', 'The test cannot say why: the students chose their groups.'], { cls: 'st-t' }, 20));
  };

  /* ============ stage 9 · χ²: heather and moss ============ */
  sc.chi = function (S) {
    var O = { both: 57, moss: 7, heather: 9, neither: 27 }, E = { both: 42.2, moss: 21.8, heather: 23.8, neither: 12.2 };
    var order = ['both', 'moss', 'heather', 'neither'], cls = { both: 'st-sq-both', moss: 'st-sq-moss', heather: 'st-sq-heather', neither: 'st-sq-neither' };
    var names = { both: 'both', moss: 'moss only', heather: 'heather only', neither: 'neither' };
    var sq = '', k = 0;
    order.forEach(function (c) { for (var i = 0; i < O[c]; i++, k++) sq += S.rect(28 + (k % 10) * 22, 34 + Math.floor(k / 10) * 22, 19, 19, cls[c], 2); });
    var legend = order.map(function (c, i) { var x = 28 + (i % 2) * 118, y = 268 + Math.floor(i / 2) * 22; return S.rect(x, y - 12, 14, 14, cls[c], 2) + S.text(x + 20, y, names[c] + ': ' + O[c], { cls: 'st-small', anchor: 'start' }); }).join('');
    var cx = [352, 452, 532, 604], ry = [60, 100, 140, 180];
    var tab = S.text(cx[1], ry[0], 'Heather +', { cls: 'st-lab' }) + S.text(cx[2], ry[0], 'Heather −', { cls: 'st-lab' }) + S.text(cx[3], ry[0], 'Total', { cls: 'st-lab' }) +
      S.text(cx[0], ry[1], 'Moss +', { cls: 'st-lab', anchor: 'start' }) + S.text(cx[0], ry[2], 'Moss −', { cls: 'st-lab', anchor: 'start' }) + S.text(cx[0], ry[3], 'Total', { cls: 'st-lab', anchor: 'start' }) +
      S.text(cx[1], ry[1], '57', { cls: 'st-h' }) + S.text(cx[2], ry[1], '7', { cls: 'st-h' }) + S.text(cx[3], ry[1], '64', { cls: 'st-t' }) +
      S.text(cx[1], ry[2], '9', { cls: 'st-h' }) + S.text(cx[2], ry[2], '27', { cls: 'st-h' }) + S.text(cx[3], ry[2], '36', { cls: 'st-t' }) +
      S.text(cx[1], ry[3], '66', { cls: 'st-t' }) + S.text(cx[2], ry[3], '34', { cls: 'st-t' }) + S.text(cx[3], ry[3], '100', { cls: 'st-t' }) +
      S.line(340, ry[0] + 10, 630, ry[0] + 10, 'st-ln') + S.line(340, ry[2] + 25, 630, ry[2] + 25, 'st-ln') + S.line(575, 40, 575, 190, 'st-ln');
    var exp = S.text(cx[1], ry[1] + 17, 'E 42.2', { cls: 'st-small', fill: '#9A5B0B' }) + S.text(cx[2], ry[1] + 17, 'E 21.8', { cls: 'st-small', fill: '#9A5B0B' }) +
      S.text(cx[1], ry[2] + 17, 'E 23.8', { cls: 'st-small', fill: '#9A5B0B' }) + S.text(cx[2], ry[2] + 17, 'E 12.2', { cls: 'st-small', fill: '#9A5B0B' }) +
      card(S, 340, 206, 290, 50, 'st-card--amber') + S.text(485, 226, 'E = row total × column total ÷ grand total', { cls: 'st-small' }) + S.text(485, 246, 'both: 64 × 66 ÷ 100 = 42.2', { cls: 'st-lab' });
    var by = S.scale(0, 60, 250, 50), bars = S.line(24, 250, 316, 250, 'st-ax');
    order.forEach(function (c, i) {
      var x = 34 + i * 72;
      bars += S.rect(x, by(O[c]), 26, 250 - by(O[c]), 'st-bar st-grow', 2) + S.rect(x + 28, by(E[c]), 26, 250 - by(E[c]), 'st-bar st-bar--grey st-grow', 2) +
        S.text(x + 13, by(O[c]) - 6, O[c], { cls: 'st-small' }) + S.text(x + 41, by(E[c]) - 6, E[c], { cls: 'st-small' }) + lines(S, x + 27, 268, names[c].split(' '), { cls: 'st-small' }, 14);
    });
    bars += S.rect(34, 30, 12, 12, 'st-bar', 2) + S.text(52, 41, 'observed (O)', { cls: 'st-small', anchor: 'start' }) + S.rect(150, 30, 12, 12, 'st-bar st-bar--grey', 2) + S.text(168, 41, 'expected (E), if H₀ is true', { cls: 'st-small', anchor: 'start' });
    /* the decision, the direction and the cause fit a phone-wide window (x 140–500) */
    var lx = S.scale(0, 45, 150, 490), lY = 200;
    return '' +
      S.g('grid', sq + S.text(28, 22, '100 random quadrats: 1 square = 1 quadrat', { cls: 'st-small', anchor: 'start' })) +
      S.g('legend', legend) +
      S.g('bars', bars) +
      S.g('table', tab) +
      S.g('exp', exp) +
      S.g('calc', card(S, 340, 266, 290, 80, 'st-card--blue') + S.text(485, 288, 'χ² = Σ (O − E)² ÷ E', { cls: 'st-lab' }) + S.text(485, 310, '= 5.19 + 10.05 + 9.20 + 17.95', { cls: 'st-t' }) + S.text(485, 336, '= 42.4', { cls: 'st-big' })) +
      S.g('line', S.line(150, lY, 490, lY, 'st-ax') + [0, 5, 10, 15, 20, 25, 30, 35, 40, 45].map(function (v) { return S.line(lx(v), lY, lx(v), lY + 5, 'st-ax') + S.text(lx(v), lY + 20, v, { cls: 'st-tick' }); }).join('') +
        S.rect(lx(0), lY - 60, lx(3.84) - lx(0), 60, 'st-zone-ok') + S.rect(lx(3.84), lY - 60, lx(45) - lx(3.84), 60, 'st-zone-bad') + S.line(lx(3.84), lY - 70, lx(3.84), lY, 'st-fence') +
        lines(S, lx(3.84) + 6, lY - 88, ['critical value 3.84', '(df = 1, p = 0.05)'], { cls: 'st-lab', anchor: 'start', fill: '#B42318' }, 15) + S.text(lx(0) + 4, lY + 44, 'Value of χ²', { cls: 'st-lab', anchor: 'start' }) +
        S.line(lx(42.4), lY, lx(42.4), lY - 78, 'st-hot') + '<circle cx="' + lx(42.4) + '" cy="' + (lY - 78) + '" r="5" class="st-dot st-dot--hot"/>' + S.text(lx(42.4) - 8, lY - 96, 'our χ² = 42.4', { cls: 'st-h', anchor: 'end' })) +
      S.g('dir', card(S, 145, 252, 350, 94, 'st-card--green') + lines(S, 320, 274, ['Both species: 57 observed, 42.2 expected.', 'O > E: a positive association. They grow', 'together more often than chance predicts.'], { cls: 'st-t' }, 22)) +
      S.g('cause', card(S, 145, 14, 350, 76, 'st-card--violet') + lines(S, 320, 38, ['An association, not a cause. Heather may', 'shelter the moss, or both may avoid', 'the trampled paths.'], { cls: 'st-t' }, 19));
  };

  /* ============ stage 10 · correlation and R² ============ */
  sc.cor = function (S) {
    var xs = S.scale(0, 10, 80, 600), ys = S.scale(50, 100, 300, 60);
    var pts = D.exercise_h.map(function (x, i) { return '<circle cx="' + xs(x).toFixed(1) + '" cy="' + ys(D.resting_hr[i]).toFixed(1) + '" r="5.5" class="st-dot st-dot--open"/>'; }).join('');
    var rx = S.scale(-1, 1, 400, 600);
    var fit = function (x) { return 79.457 - 1.3733 * x; };
    return '' +
      S.g('axes', S.axes({ x0: 80, x1: 600, y0: 300, y1: 60, xs: xs, ys: ys, xTicks: [0, 2, 4, 6, 8, 10], yTicks: [50, 60, 70, 80, 90, 100], xLabel: 'Exercise / hours per week', yLabel: 'Resting heart rate / bpm' })) +
      S.g('pts', pts) +
      S.g('trend', arrow(S, xs(0.6), ys(90), xs(8.8), ys(58)) + S.text(xs(0.2), ys(53), 'more exercise, lower heart rate', { cls: 'st-lab st-halo', anchor: 'start' })) +
      S.g('rscale', card(S, 380, 10, 240, 60, 'st-card--amber') + S.line(rx(-1), 48, rx(1), 48, 'st-ax') + [-1, 0, 1].map(function (v) { return S.line(rx(v), 44, rx(v), 52, 'st-ax') + S.text(rx(v), 64, (v > 0 ? '+' : '') + v, { cls: 'st-tick' }); }).join('') +
        '<circle cx="' + rx(-0.504) + '" cy="48" r="5" class="st-dot st-dot--hot"/>' + S.text(rx(-0.504), 36, 'r = −0.50', { cls: 'st-lab', fill: '#B42318' })) +
      S.g('line', S.line(xs(0), ys(fit(0)), xs(10), ys(fit(10)), 'st-fit') + S.text(xs(10), ys(fit(10)) - 12, 'line of best fit', { cls: 'st-lab st-halo', anchor: 'end', fill: '#C2410C' })) +
      S.g('r2', card(S, 380, 78, 240, 62, 'st-card--blue') + S.rect(392, 106, 54, 18, 'st-bar st-bar--t', 3) + S.rect(446, 106, 162, 18, 'st-bar st-bar--grey', 3) +
        S.text(500, 97, 'R² = 0.25', { cls: 'st-lab' }) + S.text(419, 136, '25 %', { cls: 'st-small' }) + S.text(527, 136, '75 %: other things', { cls: 'st-small' })) +
      S.g('sig', S.rect(96, 18, 190, 30, 'st-pill', 15) + S.text(191, 38, 'p = 0.0009 < 0.05', { cls: 'st-t', weight: 700 })) +
      S.g('cause', card(S, 100, 150, 440, 64, 'st-card--violet') + lines(S, 320, 176, ['A correlation, not a cause: students who exercise', 'more may also sleep, eat or rest differently.'], { cls: 'st-t' }, 20));
  };
})(window.LR);
