/* ============================================================
   courses/starch.js — IB Biology · B1.1 practical: "Starch curves in R",
   Daniel's companion guide to the starch calibration practical
   (NLCS/IB/MY LESSONS/Unit B/B1.1 Carbohydrates and lipids/Starch
   calibration practical/starch-curve-in-r.html, with starch_curve.R and
   calibration-curve-workbook.xlsx), rebuilt to run in the browser.
   Same order and the same numbers; every step the guide asked students
   to type in RStudio is an exercise here. The showcase is not ported
   (it moves to the Learn R front page).

   The data: the guide's six standards (the OLD 1 % starch version, kept
   because the top two points bend) = the workbook's "Worked example" tab.
   Checked in R, 25 Sep 2026:
     fit to 0–0.20 % (4 points): gradient 3.878286, intercept 0.005400,
       R² 0.9992205 (SS_res 0.000257, SS_tot 0.329281, largest residual 0.0138)
     all six points: R² 0.8679, gradient 1.615; up to 0.50 %: 0.9731, 2.745
     unknown B 0.513 → 0.1309 %; unknown A 1.554 is above 0.775 (dilute),
       diluted 0.3213 × 10 → 0.8146 %

   webR loads dplyr + ggplot2 only (the tidyverse is too heavy for a
   browser tab), so the three repeats are averaged with mutate(), as
   starch_curve.R itself does; the guide's pivot_longer() version is kept
   as code to read, for RStudio.
   ============================================================ */
(function (LR) {
  'use strict';

  /* ---------- downloads: a note block carries files:[{ href, name, label, size }] ----------
     The workbook is saved under the name starch_curve.R looks for. */
  var FILES = [
    { href: 'data/starch_curve.R', name: 'starch_curve.R', label: 'starch_curve.R', size: 'the R script, 9 KB' },
    { href: 'data/calibration-curve-workbook.xlsx', name: 'Starch calibration curve.xlsx', label: 'Starch calibration curve.xlsx', size: 'the Excel workbook, 31 KB' }
  ];

  /* ---------- R that runs once, after R starts (and again after a restart) ---------- */
  var SETUP = [
    /* Daniel's example standards (Table 1): the old 1 % starch version = the "Worked example" tab */
    'starch_example <- dplyr::tribble(',
    '  ~tube,        ~stock_cm3, ~water_cm3, ~abs1,  ~abs2,  ~abs3,',
    '  "Blank",             0.0,       10.0, 0.000,  0.002,  0.001,',
    '  "Standard 1",        0.5,        9.5, 0.190,  0.201,  0.197,',
    '  "Standard 2",        1.0,        9.0, 0.399,  0.414,  0.408,',
    '  "Standard 3",        2.0,        8.0, 0.766,  0.785,  0.774,',
    '  "Standard 4",        5.0,        5.0, 1.388,  1.421,  1.397,',
    '  "Standard 5",       10.0,        0.0, 1.611,  1.658,  1.645',
    ')',
    /* tibbles print 3 significant figures by default (1.388 shows as 1.39): show the readings as typed */
    'options(pillar.sigfig = 4)',
    /* for the checks: the right answers, worked out once */
    '.st_near <- function(a, b, tol = 1e-6) is.numeric(a) && length(a) == length(b) && isTRUE(all(abs(a - b) < tol))',
    '.st_std <- local({',
    '  d <- as.data.frame(starch_example)',
    '  d$concentration <- d$stock_cm3 / (d$stock_cm3 + d$water_cm3)',
    '  d$mean_abs <- (d$abs1 + d$abs2 + d$abs3) / 3',
    '  d$unc <- (pmax(d$abs1, d$abs2, d$abs3) - pmin(d$abs1, d$abs2, d$abs3)) / 2',
    '  d[order(d$concentration), c("tube", "concentration", "mean_abs", "unc")]',
    '})',
    '.st_fit <- lm(mean_abs ~ concentration, data = .st_std[.st_std$concentration <= 0.2, ])',
    /* read the graph a student made, so a check tests the RESULT (as in the KS3 course) */
    '.st_plot <- function(value, code, env) {',
    '  if (inherits(value, "ggplot")) return(value)',
    '  ex <- tryCatch(parse(text = code, keep.source = FALSE), error = function(e) NULL)',
    '  if (!length(ex)) return(NULL)',
    '  p <- tryCatch(eval(ex[[length(ex)]], env), error = function(e) NULL)',
    '  if (inherits(p, "ggplot")) p else NULL',
    '}',
    '.st_layers <- function(p, geom) Filter(function(l) inherits(l$geom, geom), p$layers)',
    '.st_param <- function(l, k) { for (s in list(l$aes_params, l$geom_params, l$stat_params)) if (!is.null(s[[k]])) return(s[[k]]); NULL }',
    '.st_draw_error <- function(p) tryCatch({ ggplot2::ggplot_build(p); NULL }, error = function(e) {',
    '  m <- gsub("[[:space:]]+", " ", conditionMessage(e)); m <- sub(".*Caused by error:", "", m); trimws(sub("^[[:space:]]*!", "", m)) })'
  ].join('\n');

  /* the table of means, as the start of later code boxes (each box starts afresh) */
  var STD = [
    '# The table of means from stage 4 (each code box starts afresh)',
    'std <- starch_example |>',
    '  mutate(concentration = 1 * stock_cm3 / (stock_cm3 + water_cm3),',
    '         mean_abs = (abs1 + abs2 + abs3) / 3,',
    '         unc      = (pmax(abs1, abs2, abs3) - pmin(abs1, abs2, abs3)) / 2) |>',
    '  select(tube, concentration, mean_abs, unc)'
  ];
  var FIT = STD.concat([
    'straight  <- filter(std, concentration <= 0.20)',
    'fit       <- lm(mean_abs ~ concentration, data = straight)',
    'intercept <- coef(fit)[["(Intercept)"]]',
    'slope     <- coef(fit)[["concentration"]]',
    'r2        <- summary(fit)$r.squared'
  ]);
  function lines() { return [].concat.apply([], arguments).join('\n'); }

  /* ---------- the two stories draw the same six standards ---------- */
  var CONC = [0, 0.05, 0.10, 0.20, 0.50, 1.00];
  var MEAN = [0.001, 0.196, 0.407, 0.775, 1.402, 1.638];
  var A = 0.0054, B = 3.878286;              /* intercept and gradient of the fit to 0–0.20 % */
  function fy(c) { return A + B * c; }
  function n1(v) { return (+v).toFixed(1); }
  function dot(x, y) { return '<circle cx="' + n1(x) + '" cy="' + n1(y) + '" r="5.5" class="st-dot"/>'; }
  function seg(x1, y1, x2, y2, cls, style) { return '<line x1="' + n1(x1) + '" y1="' + n1(y1) + '" x2="' + n1(x2) + '" y2="' + n1(y2) + '" class="' + cls + '"' + (style ? ' style="' + style + '"' : '') + '/>'; }
  /* a straight path that draws itself when it appears (pathLength = 1, like the curves) */
  function drawn(x1, y1, x2, y2, cls) { return '<path d="M' + n1(x1) + ' ' + n1(y1) + ' L' + n1(x2) + ' ' + n1(y2) + '" class="' + cls + '" pathLength="1"/>'; }

  /* stage 6: where the straight line stops */
  function bendScene(S) {
    var x0 = 78, x1 = 420, yB = 300, yT = 40;
    var xs = S.scale(0, 1.05, x0, x1), ys = S.scale(0, 2.1, yB, yT);
    var cTop = (2.05 - A) / B;
    var rows = [['Blank', 'Inf', 'ignore'], ['Standard 1', '3.92', 'about 4'], ['Standard 2', '4.07', 'about 4'],
      ['Standard 3', '3.88', 'about 4'], ['Standard 4', '2.80', 'falling'], ['Standard 5', '1.64', 'falling']];
    var table = S.rect(436, 36, 198, 202, 'st-pill', 10) + S.text(535, 60, 'absorbance ÷ concentration', { cls: 'st-lab' }) +
      rows.map(function (r, i) {
        var y = 88 + i * 26;
        return S.text(446, y, r[0], { anchor: 'start', cls: 'st-t' }) + S.text(552, y, r[1], { anchor: 'end', cls: 'st-t', weight: 700 }) + S.text(560, y, r[2], { anchor: 'start', cls: 'st-tick' });
      }).join('');
    return '' +
      S.g('panel', table) +
      S.g('zonebad', S.rect(n1(xs(0.45)), yT, n1(x1 - xs(0.45)), yB - yT, 'st-zone-bad') + S.rect(438, 178, 194, 52, 'st-zone-bad') +
        S.text(n1((xs(0.45) + x1) / 2), 58, 'bends: leave out', { cls: 'st-lab', fill: '#B42318' })) +
      S.g('zoneok', S.rect(x0, yT, n1(xs(0.2) - x0), yB - yT, 'st-zone-ok') + S.rect(438, 100, 194, 76, 'st-zone-ok') +
        S.text(n1((x0 + xs(0.2)) / 2), 58, 'straight', { cls: 'st-lab', fill: '#166534' }) + S.text(n1((x0 + xs(0.2)) / 2), 73, '0–0.20 %', { cls: 'st-tick', fill: '#166534' })) +
      S.g('axes', S.axes({ x0: x0, x1: x1, y0: yB, y1: yT, xs: xs, ys: ys,
        xTicks: [{ v: 0, t: '0' }, { v: 0.2, t: '0.20' }, { v: 0.4, t: '0.40' }, { v: 0.6, t: '0.60' }, { v: 0.8, t: '0.80' }, { v: 1, t: '1.00' }],
        yTicks: [{ v: 0, t: '0' }, { v: 0.5, t: '0.5' }, { v: 1, t: '1.0' }, { v: 1.5, t: '1.5' }, { v: 2, t: '2.0' }],
        xLabel: 'Starch concentration / %', yLabel: 'Absorbance at 610 nm' })) +
      S.g('limit', seg(x0, ys(1), x1, ys(1), 'st-ln') + S.text(x1 - 2, n1(ys(1) + 16), '1.0: a tenth of the light gets through', { anchor: 'end', cls: 'st-lab' })) +
      S.g('fitline', drawn(xs(0), ys(fy(0)), xs(0.2), ys(fy(0.2)), 'st-curve st-curve--red') + seg(xs(0.2), ys(fy(0.2)), xs(cTop), ys(2.05), 'st-dash')) +
      S.g('gap', seg(xs(0.5), ys(fy(0.5)), xs(0.5), ys(MEAN[4]), 'st-hot', 'stroke-width:2.4') +
        S.text(330, 246, 'Standards 4 and 5 fall', { cls: 'st-lab', fill: '#B42318' }) + S.text(330, 262, 'far below the line', { cls: 'st-lab', fill: '#B42318' })) +
      S.g('pts', CONC.map(function (c, i) { return dot(xs(c), ys(MEAN[i])); }).join(''));
  }

  /* stage 8: what R² measures, on the four fitted points */
  function r2Scene(S) {
    var x0 = 78, x1 = 400, yB = 300, yT = 40;
    var xs = S.scale(0, 0.22, x0, x1), ys = S.scale(0, 0.85, yB, yT);
    var c4 = CONC.slice(0, 4), m4 = MEAN.slice(0, 4), mu = (m4[0] + m4[1] + m4[2] + m4[3]) / 4;
    return '' +
      S.g('axes', S.axes({ x0: x0, x1: x1, y0: yB, y1: yT, xs: xs, ys: ys,
        xTicks: [{ v: 0, t: '0' }, { v: 0.05, t: '0.05' }, { v: 0.1, t: '0.10' }, { v: 0.15, t: '0.15' }, { v: 0.2, t: '0.20' }],
        yTicks: [{ v: 0, t: '0' }, { v: 0.2, t: '0.2' }, { v: 0.4, t: '0.4' }, { v: 0.6, t: '0.6' }, { v: 0.8, t: '0.8' }],
        xLabel: 'Starch concentration / %', yLabel: 'Absorbance at 610 nm' })) +
      S.g('mean', seg(x0, ys(mu), x1, ys(mu), 'st-dash') + S.text(84, n1(ys(mu) - 8), 'mean = 0.345', { anchor: 'start', cls: 'st-lab' })) +
      S.g('dev', c4.map(function (c, i) { return seg(xs(c), ys(m4[i]), xs(c), ys(mu), 'st-hot', 'stroke-width:2.4'); }).join('') +
        S.text(396, 222, 'red: distance to the mean', { anchor: 'end', cls: 'st-lab', fill: '#B42318' })) +
      S.g('fit', drawn(xs(0), ys(fy(0)), xs(0.2), ys(fy(0.2)), 'st-curve')) +
      S.g('res', S.text(396, 256, 'distance to the line:', { anchor: 'end', cls: 'st-lab' }) + S.text(396, 272, 'smaller than the dots', { anchor: 'end', cls: 'st-lab' })) +
      S.g('pts', c4.map(function (c, i) { return dot(xs(c), ys(m4[i])); }).join('')) +
      S.g('calc1', S.text(424, 78, 'Distances to the mean', { anchor: 'start', cls: 'st-lab', fill: '#B42318' }) + S.text(424, 98, 'squared, added up: 0.329', { anchor: 'start', cls: 'st-t' })) +
      S.g('calc2', S.text(424, 146, 'Distances to the line', { anchor: 'start', cls: 'st-lab' }) + S.text(424, 166, 'squared, added up: 0.00026', { anchor: 'start', cls: 'st-t' })) +
      S.g('calc3', S.text(424, 220, 'R² = 1 − 0.00026 ÷ 0.329', { anchor: 'start', cls: 'st-lab' }) + S.text(424, 256, '= 0.9992', { anchor: 'start', cls: 'st-big' }));
  }

  LR.course({
    id: 'ib-starch',
    kicker: 'IB Biology · B1.1 practical',
    title: 'Starch curves in R',
    packages: ['dplyr', 'ggplot2'],
    setup: SETUP,
    finish: '✔ You have finished **Starch curves in R**. Next: type your own readings into the workbook, and run starch_curve.R on them.',
    stages: [
      /* ---------- 1 ---------- */
      { id: 'why', title: 'Why R, when Excel works?',
        lede: 'For this practical, Excel is the better tool. So why learn R here?',
        blocks: [
          { type: 'goal', md: 'Decide when to use Excel and when to use R, and choose where you run R.' },
          { type: 'text', md: 'Six points, one line, one R². You already know Excel, it is already on your computer, and it takes five minutes. For this practical, Excel wins.\n\nThis course is here because of what comes __after__ six data points.' },
          { type: 'concept', title: 'Why meet R on this practical',
            md: 'R is a free program for data. Biology departments, research groups and hospitals that run drug trials use it. So do economics, psychology and political science. Whatever you study next, if it involves data, you will probably meet R, or its close relative Python, in your first year.\n\n' +
              'This practical is the easiest moment to meet it. Excel gives you the right answer in five minutes. So if R gives you something different, you know at once that __you__ made a mistake, not the software. A new tool is much easier to learn on a problem that you have already solved.' },
          { type: 'concept', title: 'What R does that a spreadsheet cannot',
            md: '- **The script is the method.** An R **script** is a text file of instructions, read from the top down. It records everything you did to your data, in order: which readings went in, which you left out, what you fitted, what you drew. Your teacher, a moderator, or you in six months, runs it and gets the same numbers.\n' +
              '- **The working is visible.** In a spreadsheet, the working hides inside the cells, one formula per cell. Nobody clicks on every cell, so a mistake can survive for years. In 2020 the committee that names human genes renamed 27 genes, because Excel kept changing names like SEPT2 into dates.\n' +
              '- **It scales.** Run this practical across a whole year group, and you have 40 files. In Excel you copy and paste 40 times, and each paste can put a number in the wrong place. In R, about 20 lines read every file, fit the line and draw the graph. The 20 lines do not get longer for 400 files.\n' +
              '- **A second run costs nothing.** Correct one reading, run the script again, and the fit, the R² and the graph are rebuilt in about a second.\n' +
              '- **There is no row limit.** One Excel worksheet holds at most 1,048,576 rows. The 2021 census of England and Wales counted 59,597,542 people: more than 56 times as many rows. R is limited only by the memory of the computer.\n' +
              '- **You own the picture.** A graph in R is written down: its colours, axis labels and text size. Change one word and run it again. A year later, the same file gives the same picture.' },
          { type: 'note', title: 'Being fair to Excel',
            md: 'Excel has a built-in function for everything the IB Biology guide asks you to calculate: SD, error bars, the t-test, χ², r and R². No mark is given anywhere for using R, and Excel is enough for this course.\n\n' +
              'So use both, as most scientists do. Use Excel to look at your numbers and make a quick chart. Use R when the analysis must be __repeatable__, when it is __large__, or when the statistics go beyond a straight line.' },
          { type: 'note', title: 'Two ways to do this course', files: FILES,
            md: '- **Here, in this page.** Real R runs inside this page: the page downloads it, but nothing is installed on your computer. Every stage has code for you to run and check.\n' +
              '- **On your own computer, in RStudio.** You need this for your own readings, and later for your IA. The last stage shows you how to install R and RStudio. The script and the workbook are here:' },
          { type: 'mcq', id: 'st-why', gate: true,
            q: 'Why is this practical a good moment to meet R?',
            opts: [
              { t: 'Excel gives the right answer too, so you can tell whether a mistake is yours.', ok: true, why: 'Yes. You already know what the answer looks like, so R cannot fool you, and you cannot fool yourself.' },
              { t: 'Excel cannot fit a line or give R².', why: 'It can: `=SLOPE()`, `=INTERCEPT()` and `=RSQ()` do exactly that. For six points, Excel is the faster tool.' },
              { t: 'The IB gives extra marks for using R.', why: 'No mark is given anywhere for using R. Use whichever tool gets the analysis right.' },
              { t: 'Six data points are too many for Excel.', why: 'One Excel worksheet holds over a million rows. Six points is a small job.' }
            ] }
        ] },

      /* ---------- 2 ---------- */
      { id: 'words', title: 'Four words, two rules',
        lede: 'Four pieces of vocabulary are enough to read every line of this course.',
        blocks: [
          { type: 'goal', md: 'Use a function, the arrow, a data frame and the pipe.' },
          { type: 'concept', title: 'Four pieces of vocabulary',
            md: '- A **function** is a verb with brackets. `mean(c(2, 4, 6))` gives 4. (`c(2, 4, 6)` puts the three numbers together.)\n' +
              '- The **arrow** `<-` means "put this in a box called". `x <- 5` makes a box named `x` that holds 5. Type `x` afterwards, and R shows you what is in it.\n' +
              '- A **data frame** is a table. The rows are tubes, and the columns are variables. `std$concentration` means "the concentration column of the table `std`".\n' +
              '- The **pipe** `|>` means "and then". `c(2, 4, 6) |> mean()` does the same as `mean(c(2, 4, 6))`.' },
          { type: 'note', title: 'Why the pipe helps',
            md: 'When you do four things in a row, the pipe lets you read from left to right, one step at a time. Without it, you must read the brackets from the inside out. Older tutorials write `%>%` instead of `|>`: both work.' },
          { type: 'exercise', id: 'st-pipe', gate: true, title: 'Your turn: a function and the pipe',
            task: 'Press **Run**: `mean(c(2, 4, 6))` gives 4. Then, on the last line, write the same thing with the pipe. Run it again, then press **Check my answer**.',
            code: lines([
              '# A function is a verb with brackets',
              'mean(c(2, 4, 6))',
              '',
              '# The same thing with the pipe |> ("and then").',
              '# Write it on the next line:',
              ''
            ]),
            check: 'if (!(has("|>") || has("%>%"))) "On the last line, write the same thing with the pipe: c(2, 4, 6) |> mean()." else if (!isTRUE(all.equal(value, 4))) "The last line should give 4: c(2, 4, 6) |> mean()." else TRUE',
            solution: 'mean(c(2, 4, 6))\nc(2, 4, 6) |> mean()',
            hint: 'Start with the numbers, then the pipe, then the function with empty brackets: `c(2, 4, 6) |> mean()`.',
            pass: 'Both lines give 4. Read the pipe from left to right: take 2, 4 and 6, __and then__ work out the mean.' },
          { type: 'exercise', id: 'st-box', gate: true, title: 'Your turn: the arrow and a data frame',
            task: 'Run the code, and read what each part prints. `starch_example` is Table 1, the six standards you work with in this course. It is already loaded.\n\n' +
              'Then replace `____`, so that `m1` holds the mean of the `abs1` column: the first absorbance reading of each tube. Run it, then press **Check my answer**.',
            code: lines([
              '# The arrow <- means "put this in a box called". This makes a box called x:',
              'x <- 5',
              'x',
              '',
              '# starch_example is a data frame (a table). It is already loaded.',
              'starch_example',
              '',
              '# table$column gives one column of the table:',
              'starch_example$abs1',
              '',
              '# Put the mean of the abs1 column in a box called m1, then show m1:',
              'm1 <- ____',
              'm1'
            ]),
            check: lines([
              '{',
              'm1 <- get0("m1", envir = env, inherits = FALSE)',
              'if (is.null(m1)) "Make a box called m1 with the arrow: m1 <- mean(starch_example$abs1)."',
              'else if (!is.numeric(m1) || length(m1) != 1) "Put one number in m1: the mean of the abs1 column, mean(starch_example$abs1)."',
              'else if (.st_near(m1, mean(starch_example$abs2)) || .st_near(m1, mean(starch_example$abs3))) "Use the abs1 column: starch_example$abs1."',
              'else if (!.st_near(m1, mean(starch_example$abs1))) "Use mean() on the abs1 column: m1 <- mean(starch_example$abs1)."',
              'else TRUE',
              '}'
            ]),
            solution: 'x <- 5\nx\nstarch_example\nstarch_example$abs1\nm1 <- mean(starch_example$abs1)\nm1',
            hint: '`m1 <- mean(starch_example$abs1)`: a function (`mean()`), given one column (`$abs1`) of a data frame, stored with the arrow.',
            pass: '`m1` holds 0.7257, the mean of the six first readings. You used a function, the arrow and one column of a data frame.' },
          { type: 'concept', title: 'Two rules that catch everyone',
            md: '- R is **case sensitive**: `Mean` is not `mean`.\n- Text always needs **quote marks**. `"Standard 1"` is text. `Standard 1` without quote marks is an error.' },
          { type: 'mcq', id: 'st-case', gate: true,
            q: 'Which line stops with an error?',
            opts: [
              { t: '`Mean(c(2, 4, 6))`', ok: true, why: 'Yes. R is case sensitive: the function is `mean`, with a small m. R says: could not find function "Mean".' },
              { t: '`mean(c(2, 4, 6))`', why: 'This line works: it gives 4.' },
              { t: '`c(2, 4, 6) |> mean()`', why: 'This line works: the pipe gives the three numbers to `mean()`, and it gives 4.' },
              { t: '`tube <- "Standard 1"`', why: 'This line works: "Standard 1" is text in quote marks, stored in a box called `tube`.' }
            ] }
        ] },

      /* ---------- 3 ---------- */
      { id: 'numbers', title: 'Get your numbers in',
        lede: 'Type the six standards into R, then look at what you typed.',
        blocks: [
          { type: 'goal', md: 'Make a data frame of the six standards with `tribble()`, and check it with `glimpse()`.' },
          { type: 'note', title: 'Read this first',
            md: 'These six standards come from the old version of this practical: a 1 % starch stock, with standards from 0.05 % up to 1.00 %. They are here __on purpose__, because they bend: the top two points level off instead of following the line. The main skill in this course is to see that, and to leave those points out of the line. Perfectly straight data would teach you nothing.\n\n' +
              'Your own worksheet uses 0.01 % starch and much weaker standards, so it should give a straight line all the way. Learn with these numbers first. Then run starch_curve.R on your own numbers (the last stage shows how).' },
          { type: 'text', md: '**Table 1.** Raw data showing the effect of starch concentration (0 to 1.00 %) on the absorbance of the starch–iodine solution at 610 nm (n = 3).' },
          { type: 'example', title: 'Table 1',
            code: lines([
              '                1 % stock   Water    Absorbance at 610 nm',
              'Tube            / cm³       / cm³    Trial 1   Trial 2   Trial 3',
              'Blank            0.0        10.0     0.000     0.002     0.001',
              'Standard 1       0.5         9.5     0.190     0.201     0.197',
              'Standard 2       1.0         9.0     0.399     0.414     0.408',
              'Standard 3       2.0         8.0     0.766     0.785     0.774',
              'Standard 4       5.0         5.0     1.388     1.421     1.397',
              'Standard 5      10.0         0.0     1.611     1.658     1.645'
            ]) },
          { type: 'concept', title: 'tribble(): a table you type row by row',
            md: '`tribble()` makes a data frame that you type row by row, so it looks like the table.\n\n' +
              '- `~tube` marks a column heading.\n' +
              '- Commas go between everything, and at the end of every row except the last.\n' +
              '- Text goes in quote marks (`"Blank"`). Numbers do not.' },
          { type: 'exercise', id: 'st-type', gate: true, title: 'Your turn: type the table',
            task: 'The code makes a data frame called `std_raw` from Table 1, but the last row is missing. Add the **Standard 5** row: `"Standard 5", 10.0, 0.0, 1.611, 1.658, 1.645`.\n\n' +
              '- First put a comma at the end of the Standard 4 row.\n' +
              '- Keep the layout: text in quote marks, numbers without.\n\n' +
              'Run it: `glimpse()` shows every column. Then press **Check my answer**.',
            code: lines([
              'std_raw <- tribble(',
              '  ~tube,        ~stock_cm3, ~water_cm3, ~abs1,  ~abs2,  ~abs3,',
              '  "Blank",             0.0,       10.0, 0.000,  0.002,  0.001,',
              '  "Standard 1",        0.5,        9.5, 0.190,  0.201,  0.197,',
              '  "Standard 2",        1.0,        9.0, 0.399,  0.414,  0.408,',
              '  "Standard 3",        2.0,        8.0, 0.766,  0.785,  0.774,',
              '  "Standard 4",        5.0,        5.0, 1.388,  1.421,  1.397',
              '  # add the Standard 5 row on this line',
              ')',
              '',
              'std_raw',
              'glimpse(std_raw)'
            ]),
            check: lines([
              '{',
              'd <- get0("std_raw", envir = env, inherits = FALSE)',
              'cols <- c("tube", "stock_cm3", "water_cm3", "abs1", "abs2", "abs3"); num <- cols[-1]',
              'isnum <- if (is.data.frame(d) && all(cols %in% names(d))) vapply(d[num], is.numeric, logical(1)) else NULL',
              'if (is.null(d) || !is.data.frame(d)) "Keep the first line: std_raw <- tribble(."',
              'else if (!all(cols %in% names(d))) "Keep the six column headings: ~tube, ~stock_cm3, ~water_cm3, ~abs1, ~abs2, ~abs3."',
              'else if (nrow(d) < 6) "Add the Standard 5 row at the end: \\"Standard 5\\", 10.0, 0.0, 1.611, 1.658, 1.645. Put a comma at the end of the Standard 4 row first."',
              'else if (nrow(d) > 6) "There should be six rows: the blank and Standards 1 to 5. Delete any extra row."',
              'else if (!all(isnum)) paste0("The column ", num[!isnum][1], " holds text, not numbers. Numbers need no quote marks.")',
              'else if (!identical(as.character(d$tube[6]), "Standard 5")) "Write the name of the last tube in quote marks, exactly: \\"Standard 5\\"."',
              'else if (!.st_near(as.numeric(unlist(d[6, num])), as.numeric(unlist(starch_example[6, num])), 1e-9)) "Check the numbers in the Standard 5 row: 10.0, 0.0, 1.611, 1.658, 1.645."',
              'else if (!.st_near(as.numeric(unlist(d[num])), as.numeric(unlist(starch_example[num])), 1e-9)) "A number in one of the first five rows has changed. Press Start again, then add only the Standard 5 row."',
              'else TRUE',
              '}'
            ]),
            solution: lines([
              'std_raw <- tribble(',
              '  ~tube,        ~stock_cm3, ~water_cm3, ~abs1,  ~abs2,  ~abs3,',
              '  "Blank",             0.0,       10.0, 0.000,  0.002,  0.001,',
              '  "Standard 1",        0.5,        9.5, 0.190,  0.201,  0.197,',
              '  "Standard 2",        1.0,        9.0, 0.399,  0.414,  0.408,',
              '  "Standard 3",        2.0,        8.0, 0.766,  0.785,  0.774,',
              '  "Standard 4",        5.0,        5.0, 1.388,  1.421,  1.397,',
              '  "Standard 5",       10.0,        0.0, 1.611,  1.658,  1.645',
              ')',
              'std_raw',
              'glimpse(std_raw)'
            ]),
            hint: 'The last two rows are:\n\n`"Standard 4",  5.0, 5.0, 1.388, 1.421, 1.397,`\n`"Standard 5", 10.0, 0.0, 1.611, 1.658, 1.645`',
            pass: 'Six rows and six columns, and every absorbance column is `<dbl>`: numbers. That is Table 1, in R.' },
          { type: 'concept', title: 'glimpse(): look before you touch',
            md: '`glimpse()` shows every column, its type and its first values. `<dbl>` means numbers. `<chr>` means text.\n\nA column that should hold numbers but says `<chr>` has a stray letter or space in it. Fix that now, not later.' },
          { type: 'mcq', id: 'st-chr', gate: true,
            q: '`glimpse()` shows this line: `$ abs2 <chr> "0.002", "0.201", "0.414 ", …` What does `<chr>` tell you?',
            opts: [
              { t: 'The column holds text, not numbers: there is a stray letter or space in it. Fix it now.', ok: true, why: 'Yes. Here "0.414 " has a space inside the quote marks. R cannot do sums with text, so fix it before you go on.' },
              { t: 'The readings are very precise.', why: '`<chr>` means character: text. It says nothing about precision.' },
              { t: 'R has rounded the readings.', why: 'R has not rounded anything. `<chr>` means the column is text, so R cannot use it as numbers at all.' },
              { t: 'Nothing: `<chr>` and `<dbl>` are the same.', why: '`<dbl>` means numbers and `<chr>` means text. The mean of a text column is an error.' }
            ] },
          { type: 'note', title: 'On your own computer: read a file instead',
            md: 'In RStudio you can read a file instead of typing: `read_csv("my_starch_data.csv")` for a .csv file, or `read_excel()` for a workbook. starch_curve.R reads the workbook in this way.\n\n' +
              'The most common R error of all says that the file `does not exist in current working directory`. R is looking in the wrong folder. Save your script in the same folder as the file, then choose **Session → Set Working Directory → To Source File Location**.' }
        ] },

      /* ---------- 4 ---------- */
      { id: 'means', title: 'Concentrations and means',
        lede: 'Two new pieces of information: the starch concentration of each tube, and the mean of its three readings.',
        blocks: [
          { type: 'goal', md: 'Add columns with `mutate()`: the concentration, the mean absorbance and its uncertainty.' },
          { type: 'concept', title: 'mutate() adds a column',
            md: '`mutate()` adds a column to a table. Read the line in the code below as: take `std_raw`, __and then__ add a column called `concentration`, equal to stock % × volume of stock ÷ total volume.' },
          { type: 'exercise', id: 'st-conc', gate: true, title: 'Your turn: the concentrations',
            task: '`starch_example` is Table 1 again, the same as your `std_raw`. Each code box starts afresh, so each one begins from the table.\n\n' +
              'Replace `____` with the concentration of the stock: **1** (%). Run it, and look at the new `concentration` column. Then press **Check my answer**.',
            code: lines([
              'std_raw <- starch_example      # Table 1, already loaded',
              '',
              'std_raw <- std_raw |>',
              '  mutate(concentration = ____ * stock_cm3 / (stock_cm3 + water_cm3))',
              '',
              'std_raw'
            ]),
            check: lines([
              '{',
              'd <- get0("std_raw", envir = env, inherits = FALSE)',
              'want <- starch_example$stock_cm3 / (starch_example$stock_cm3 + starch_example$water_cm3)',
              'if (!is.data.frame(d) || !("concentration" %in% names(d))) "Add the column: mutate(concentration = 1 * stock_cm3 / (stock_cm3 + water_cm3))."',
              'else if (.st_near(d$concentration, 100 * want)) "The stock is 1 % starch, not 100: put 1 in the blank."',
              'else if (!.st_near(d$concentration, want)) "Put the concentration of the stock in the blank (1), and keep stock_cm3 / (stock_cm3 + water_cm3)."',
              'else TRUE',
              '}'
            ]),
            solution: 'std_raw <- starch_example\nstd_raw <- std_raw |>\n  mutate(concentration = 1 * stock_cm3 / (stock_cm3 + water_cm3))\nstd_raw',
            hint: '`mutate(concentration = 1 * stock_cm3 / (stock_cm3 + water_cm3))`',
            pass: 'The concentrations are 0, 0.05, 0.10, 0.20, 0.50 and 1.00 %.' },
          { type: 'mcq', id: 'st-head', gate: true,
            q: 'Check one tube in your head. Standard 2 has 1.0 cm³ of the 1 % stock and 9.0 cm³ of water. What is its starch concentration?',
            opts: [
              { t: '0.10 %', ok: true, why: 'Yes: 1 % × 1.0 ÷ 10.0 = 0.10 %. If R ever disagrees with you, one of you is wrong, and you need to know which.' },
              { t: '0.11 %', why: 'That divides by the water only (1.0 ÷ 9.0). Divide by the total volume: 1.0 + 9.0 = 10.0 cm³.' },
              { t: '1.0 %', why: 'That is the stock. The water dilutes it ten times.' },
              { t: '0.90 %', why: '9.0 ÷ 10.0 is the fraction of the tube that is water, not starch.' }
            ] },
          { type: 'note', title: 'Your own worksheet is different',
            md: 'Your stock is 0.01 % starch, and each tube also gets 0.1 cm³ of iodine. So the total volume includes the iodine: concentration = 0.01 × stock ÷ (stock + water + iodine). starch_curve.R does this for you.' },
          { type: 'concept', title: 'The mean of three repeats',
            md: 'Each tube has three readings: `abs1`, `abs2` and `abs3`. Two more columns:\n\n' +
              '- `mean_abs`, the **mean** of the three readings: add them, then divide by 3.\n' +
              '- `unc`, the **uncertainty**: half the range, (largest − smallest) ÷ 2.\n\n' +
              '`pmax()` finds the largest of the three readings in each row, and `pmin()` the smallest. starch_curve.R works them out in the same way.' },
          { type: 'exercise', id: 'st-mean3', gate: true, title: 'Your turn: the mean and the uncertainty',
            task: 'Fill in the two blanks: divide by **3** for the mean, and by **2** for half the range. Run it, then press **Check my answer**.\n\n' +
              '`select()` keeps only the four columns you need, and `arrange()` sorts the tubes from the lowest concentration to the highest.',
            code: lines([
              'std <- starch_example |>',
              '  mutate(concentration = 1 * stock_cm3 / (stock_cm3 + water_cm3),',
              '         # the mean of the three readings',
              '         mean_abs = (abs1 + abs2 + abs3) / ____,',
              '         # the uncertainty: half the range, (largest - smallest) / 2',
              '         unc      = (pmax(abs1, abs2, abs3) - pmin(abs1, abs2, abs3)) / ____) |>',
              '  select(tube, concentration, mean_abs, unc) |>',
              '  arrange(concentration)',
              '',
              'std'
            ]),
            check: lines([
              '{',
              'd <- get0("std", envir = env, inherits = FALSE)',
              'if (!is.data.frame(d)) "Keep the first line: std <- starch_example |>."',
              'else if (!all(c("concentration", "mean_abs", "unc") %in% names(d))) "Keep the three columns concentration, mean_abs and unc."',
              'else if (nrow(d) != 6) "Keep all six tubes: do not leave any out yet."',
              'else {',
              '  d <- d[order(d$concentration), ]',
              '  if (!.st_near(d$mean_abs, .st_std$mean_abs)) "The mean of three readings: add them, then divide by 3."',
              '  else if (.st_near(d$unc, 2 * .st_std$unc)) "That is the whole range. The uncertainty is half the range: divide by 2."',
              '  else if (!.st_near(d$unc, .st_std$unc)) "The uncertainty is half the range: (pmax(abs1, abs2, abs3) - pmin(abs1, abs2, abs3)) / 2."',
              '  else TRUE',
              '}',
              '}'
            ]),
            solution: lines([
              'std <- starch_example |>',
              '  mutate(concentration = 1 * stock_cm3 / (stock_cm3 + water_cm3),',
              '         mean_abs = (abs1 + abs2 + abs3) / 3,',
              '         unc      = (pmax(abs1, abs2, abs3) - pmin(abs1, abs2, abs3)) / 2) |>',
              '  select(tube, concentration, mean_abs, unc) |>',
              '  arrange(concentration)',
              'std'
            ]),
            hint: 'The two finished lines are `mean_abs = (abs1 + abs2 + abs3) / 3,` and `unc = (pmax(abs1, abs2, abs3) - pmin(abs1, abs2, abs3)) / 2) |>`.',
            pass: 'One row for each tube: its concentration, its mean absorbance and its uncertainty (± half the range).' },
          { type: 'interpret', title: 'What your table should show',
            md: '**Table 2.** Processed data showing the effect of starch concentration (0 to 1.00 %) on the mean absorbance of the starch–iodine solution at 610 nm (n = 3; uncertainty = ± half the range).\n\n' +
              '- Blank, 0 %: 0.001 ± 0.001\n' +
              '- Standard 1, 0.05 %: 0.196 ± 0.0055\n' +
              '- Standard 2, 0.10 %: 0.407 ± 0.0075\n' +
              '- Standard 3, 0.20 %: 0.775 ± 0.0095\n' +
              '- Standard 4, 0.50 %: 1.402 ± 0.0165\n' +
              '- Standard 5, 1.00 %: 1.638 ± 0.0235' },
          { type: 'example', title: 'In RStudio: the tidyverse way (to read, not to run here)',
            code: lines([
              'std <- std_raw |>',
              '  pivot_longer(cols      = c(abs1, abs2, abs3),',
              '               names_to  = "trial",',
              '               values_to = "absorbance") |>',
              '  group_by(tube, concentration) |>',
              '  summarise(mean_abs = mean(absorbance),',
              '            unc      = (max(absorbance) - min(absorbance)) / 2,',
              '            .groups  = "drop") |>',
              '  arrange(concentration)'
            ]),
            md: 'This version gives the same table. Your three trials sit in three separate columns. `pivot_longer()` stacks them into one column, so that six rows become eighteen, one reading in each row. This is called going from __wide__ to __long__. `group_by()` then deals with each tube separately, and `summarise()` makes one row for each tube: the mean of its readings, and half the range.\n\n`pivot_longer()` is in the tidyr package, which this page does not load. On your own computer, `library(tidyverse)` loads tidyr, dplyr, ggplot2 and readr together.' }
        ] },

      /* ---------- 5 ---------- */
      { id: 'points', title: 'Draw the points first',
        lede: 'Before you fit any line, look at every standard on a graph.',
        blocks: [
          { type: 'goal', md: 'Draw a scatter graph of the mean absorbances, with error bars, using ggplot2.' },
          { type: 'concept', title: 'A ggplot is built in layers',
            md: '- `ggplot(data, aes(x = …, y = …))` says which table to use, and which column goes on each axis.\n' +
              '- Each `geom_…()` draws a layer on top: `geom_point()` draws the points, and `geom_errorbar()` the error bars.\n' +
              '- `labs()` sets the axis labels, always with units.\n' +
              '- `theme_minimal()` gives a clean, white background.\n\n' +
              'The layers join with `+`.' },
          { type: 'note', title: 'Where the plus sign goes',
            md: 'At the __end__ of a line, never at the start. At the start, R thinks that the line before was finished, and the next line stops with an error.' },
          { type: 'exercise', id: 'st-points', gate: true, title: 'Your turn: every standard',
            task: 'Run the code. R stops with an error, because the `+` is at the __start__ of the last line. Make two changes:\n\n' +
              '- Move the `+` to the end of the line above it.\n' +
              '- Write the x-axis label, with its unit: `"Starch concentration / %"`.\n\n' +
              'Run it, then press **Check my answer**.',
            code: lines(STD, [
              '',
              'ggplot(std, aes(x = concentration, y = mean_abs)) +',
              '  geom_point(size = 3) +',
              '  geom_errorbar(aes(ymin = mean_abs - unc, ymax = mean_abs + unc), width = 0.02) +',
              '  labs(x = "____",',
              '       y = "Absorbance at 610 nm (mean of 3)")',
              '  + theme_minimal()'
            ]),
            check: lines([
              '{',
              'p <- .st_plot(value, code, env)',
              'xl <- if (is.null(p)) NULL else p$labels$x',
              'if (is.null(p)) "End your code with the graph: ggplot(…) + … + theme_minimal()."',
              'else if (!length(.st_layers(p, "GeomPoint"))) "Keep geom_point(): it draws the points."',
              'else if (!length(.st_layers(p, "GeomErrorbar"))) "Keep geom_errorbar(): it draws the error bars."',
              'else if (is.null(xl) || grepl("__", xl, fixed = TRUE) || !grepl("concentration", xl, ignore.case = TRUE)) "Write the x-axis label: x = \\"Starch concentration / %\\"."',
              'else if (!grepl("%", xl, fixed = TRUE)) "Put the unit in the x-axis label: \\"Starch concentration / %\\"."',
              'else if (!has("theme_minimal()")) "Keep theme_minimal() on the last line, with a + at the end of the line above it."',
              'else if (!is.null(e <- .st_draw_error(p))) paste("R cannot draw the graph yet:", e)',
              'else TRUE',
              '}'
            ]),
            solution: lines(STD, [
              'ggplot(std, aes(x = concentration, y = mean_abs)) +',
              '  geom_point(size = 3) +',
              '  geom_errorbar(aes(ymin = mean_abs - unc, ymax = mean_abs + unc), width = 0.02) +',
              '  labs(x = "Starch concentration / %",',
              '       y = "Absorbance at 610 nm (mean of 3)") +',
              '  theme_minimal()'
            ]),
            hint: 'The last three lines of the graph are:\n\n`  labs(x = "Starch concentration / %",`\n`       y = "Absorbance at 610 nm (mean of 3)") +`\n`  theme_minimal()`',
            pass: 'Six points with error bars, and both axes have a label with a unit.' },
          { type: 'interpret', title: 'What the graph shows',
            md: '- The first four points, from 0 to 0.20 %, rise in a straight line.\n' +
              '- The last two, at 0.50 % and 1.00 %, rise much less: the curve bends over.\n' +
              '- The error bars are small, at most ± 0.024, so the bend is not caused by scatter in the readings.\n\n' +
              'The next stage decides which points the line uses.' }
        ] },

      /* ---------- 6 ---------- */
      { id: 'straight', title: 'Choose which points the line uses',
        lede: 'R fits a line to whatever you give it. So you must give it the right points.',
        blocks: [
          { type: 'goal', md: 'Find where the points stop following a straight line, and keep only the straight part.' },
          { type: 'story', id: 'st-bend', gate: true, title: 'Where the straight line stops', w: 640, h: 352,
            alt: 'The six standards on a graph: the first four follow a straight line, the top two fall below it',
            scene: bendScene,
            steps: [
              { title: 'Six standards', show: ['axes', 'pts'],
                md: 'Here are the mean absorbances of your six standards.\n\nR fits a line to whatever you give it. So first __you__ decide which points the line uses.' },
              { title: 'Follow the straight part', show: ['fitline'],
                md: 'The blank and the first three standards lie on a straight line.\n\nThe dashed part shows where that line would go next.' },
              { title: 'The top two fall below', show: ['gap'], focus: ['gap', 'pts', 'fitline'],
                md: 'Standard 4 (0.50 %) is far below the dashed line. Standard 5 (1.00 %) is even further below it.\n\nThe curve bends over at the top.' },
              { title: 'A number for “straight”', show: ['panel'], focus: ['panel'],
                md: 'On a straight line through the origin, absorbance ÷ concentration stays the same. R works it out in one line:\n\n`std |> mutate(ratio = mean_abs / concentration)`\n\n3.92, 4.07 and 3.88: roughly constant. Then 2.80 and 1.64: falling. (For the blank, R writes `Inf`, infinity, because you cannot divide by 0. Ignore it.)' },
              { title: 'Cut it at 0.20 %', show: ['zoneok', 'zonebad'],
                md: 'Keep only the points on the straight part: the blank and Standards 1 to 3, from 0 to 0.20 %. Leave out Standards 4 and 5.\n\nIn R: `filter(std, concentration <= 0.20)`. In the workbook, this is column K: Y for the points in the line, N for the rest.' },
              { title: 'Why the top bends', show: ['limit'], focus: ['limit', 'pts', 'zonebad'],
                md: 'A colorimeter measures how much light gets through the tube. Absorbance 1.0 means that only a tenth of the light gets through. Absorbance 2.0 means a hundredth.\n\nAbove about 1.0 the solution is too dark, and the reading stops being useful. Standards 4 and 5 read 1.40 and 1.64.',
                analogy: 'A sound meter that stops at 100 dB. Zero it on silence, then measure a shout, a drill and a jet engine: 0, 100, 100, 100. It looks as if loudness levels off. It does not: the meter ran out.' },
              { title: 'Two rules', show: [],
                md: '- If your points never bend, use all of them.\n- Never fit fewer than three points. A line through two points is exact, so two points always give R² = 1. That 1 means nothing.' }
            ] },
          { type: 'exercise', id: 'st-ratio', gate: true, title: 'Your turn: the ratio',
            task: 'Fill in the two blanks, so that the last line adds a column called `ratio`: the mean absorbance divided by the concentration. Run it, and read the ratio for each tube. Then press **Check my answer**.',
            code: lines(STD, [
              '',
              '# On a straight line through the origin, absorbance ÷ concentration stays the same',
              'std |> mutate(ratio = ____ / ____)'
            ]),
            check: lines([
              '{',
              'if (!is.data.frame(value) || !("ratio" %in% names(value))) "End with the line that adds the ratio: std |> mutate(ratio = mean_abs / concentration)."',
              'else {',
              '  d <- value[order(value$concentration), ]; k <- d$concentration > 0',
              '  w <- (.st_std$mean_abs / .st_std$concentration)[.st_std$concentration > 0]',
              '  if (sum(k) != 5) "Keep all six tubes in the table."',
              '  else if (.st_near(d$ratio[k], 1 / w)) "That is concentration ÷ absorbance. Put the absorbance on top: mean_abs / concentration."',
              '  else if (!.st_near(d$ratio[k], w)) "The ratio is the mean absorbance divided by the concentration: mean_abs / concentration."',
              '  else TRUE',
              '}',
              '}'
            ]),
            solution: lines(STD, ['std |> mutate(ratio = mean_abs / concentration)']),
            hint: '`std |> mutate(ratio = mean_abs / concentration)`',
            pass: '3.92, 4.07 and 3.88 are roughly constant. Then the ratio falls to 2.80 and 1.64. Ignore the blank’s `Inf`.' },
          { type: 'exercise', id: 'st-filter', gate: true, title: 'Your turn: keep the straight part',
            task: 'Change `1.00` to the last concentration where the ratio is still roughly constant. `<=` means "less than or equal to", so that concentration itself is kept. Run it, then press **Check my answer**.',
            code: lines(STD, [
              '',
              '# Keep the rows on the straight part. Change 1.00 to the last',
              '# concentration where the ratio is still roughly constant.',
              'straight <- filter(std, concentration <= 1.00)',
              'straight'
            ]),
            check: lines([
              '{',
              's <- get0("straight", envir = env, inherits = FALSE)',
              'n <- if (is.data.frame(s) && "concentration" %in% names(s)) nrow(s) else -1',
              'cc <- if (n > 0) sort(s$concentration) else NULL',
              'if (n < 0) "Keep the line straight <- filter(std, concentration <= …)."',
              'else if (n == 6) "That keeps all six standards, including the two that bend. The ratio falls after 0.20 %."',
              'else if (n == 5) "That still keeps Standard 4 (0.50 %), where the ratio has fallen to 2.80."',
              'else if (n < 3) "A line needs at least three points. Keep the blank and Standards 1 to 3."',
              'else if (n == 3 && isTRUE(all.equal(max(cc), 0.10))) "Standard 3 (0.20 %) is still on the straight part: its ratio, 3.88, is close to 3.92 and 4.07. Keep it with <= 0.20."',
              'else if (n == 4 && isTRUE(all.equal(cc, c(0, 0.05, 0.10, 0.20)))) TRUE',
              'else "Keep the blank and Standards 1 to 3: straight <- filter(std, concentration <= 0.20)."',
              '}'
            ]),
            solution: lines(STD, ['straight <- filter(std, concentration <= 0.20)', 'straight']),
            hint: 'The ratio is roughly constant up to Standard 3: `straight <- filter(std, concentration <= 0.20)`.',
            pass: '`straight` holds four points: the blank and Standards 1 to 3 (0 to 0.20 %).' },
          { type: 'note', title: 'If every point is bent',
            md: 'If the absorbance hardly changes however much starch you add, stop. That is not a curve that you can fit. The colorimeter has run out of light: your standards are too concentrated. The **Why the graph flattens** tab of the workbook explains this, and gives the dilution that fixes it.' },
          { type: 'frames', title: 'Write it in your report',
            items: [
              'The line of best fit uses the ___ points from 0 to ___ %, because absorbance ÷ concentration stays roughly constant there (from ___ to ___).',
              'Standards ___ and ___ were excluded from the line: their ratios fall to ___ and ___, so the curve bends above ___ %.'
            ] }
        ] },

      /* ---------- 7 ---------- */
      { id: 'fit', title: 'Fit the line',
        lede: 'One line of R fits the straight line. Three more lines store the numbers you need.',
        blocks: [
          { type: 'goal', md: 'Fit a straight line with `lm()`, and store the gradient, the intercept and R².' },
          { type: 'concept', title: 'lm(): a linear model',
            md: '`lm` means **linear model**: here, a straight line.\n\n' +
              '- Read `mean_abs ~ concentration` as "absorbance explained by concentration". y goes on the left of the `~` (the tilde), and x on the right.\n' +
              '- `data = straight` is the part that matters: the four points on the straight part, not all six.\n' +
              '- `summary(fit)` prints the result.' },
          { type: 'exercise', id: 'st-lm', gate: true, title: 'Your turn: fit the line',
            task: 'Fill in the two blanks: `mean_abs` on the left of the `~`, and `concentration` on the right. Run it, and find the gradient, the intercept and R² in the output. Then press **Check my answer**.',
            code: lines(STD, [
              'straight <- filter(std, concentration <= 0.20)',
              '',
              '# lm = linear model: y on the left of the ~, x on the right',
              'fit <- lm(____ ~ ____, data = straight)',
              'summary(fit)'
            ]),
            check: lines([
              '{',
              'f <- get0("fit", envir = env, inherits = FALSE)',
              'if (is.null(f) || !inherits(f, "lm")) "Make the fit: fit <- lm(mean_abs ~ concentration, data = straight)."',
              'else if ("mean_abs" %in% names(coef(f))) "y goes on the left of the ~, and x on the right: mean_abs ~ concentration."',
              'else if (!identical(all.vars(formula(f)), c("mean_abs", "concentration"))) "Fit absorbance explained by concentration: lm(mean_abs ~ concentration, data = straight)."',
              'else if (nobs(f) != 4) paste0("Your line used ", nobs(f), " points. Use data = straight: the four points on the straight part.")',
              'else TRUE',
              '}'
            ]),
            solution: lines(STD, ['straight <- filter(std, concentration <= 0.20)', 'fit <- lm(mean_abs ~ concentration, data = straight)', 'summary(fit)']),
            hint: '`fit <- lm(mean_abs ~ concentration, data = straight)`',
            pass: 'Gradient 3.878, intercept 0.0054, R² 0.9992: from the four points on the straight part.' },
          { type: 'example', title: 'Part of what summary(fit) prints',
            code: lines([
              'Coefficients:',
              '              Estimate Std. Error t value Pr(>|t|)',
              '(Intercept)   0.005400   0.008775   0.615  0.60101',
              'concentration 3.878286   0.076597  50.632  0.00039 ***',
              '',
              'Multiple R-squared:  0.9992,	Adjusted R-squared:  0.9988'
            ]),
            md: '- `concentration` Estimate = 3.878: the **gradient**.\n' +
              '- `(Intercept)` Estimate = 0.0054: the **intercept**, where the line crosses the y-axis, at concentration 0.\n' +
              '- `Multiple R-squared` = 0.9992: your **R²**.\n\n' +
              'You do not need the other columns for a calibration curve.' },
          { type: 'exercise', id: 'st-coef', gate: true, title: 'Your turn: store the three numbers',
            task: 'Store the three numbers in boxes, so that you can use them later. Fill in the two blanks: in `coef(fit)`, the gradient is called `concentration`, and `summary(fit)` stores R² as `r.squared`. Run it, then press **Check my answer**.',
            code: lines(STD, [
              'straight <- filter(std, concentration <= 0.20)',
              'fit <- lm(mean_abs ~ concentration, data = straight)',
              '',
              'intercept <- coef(fit)[["(Intercept)"]]',
              'slope     <- coef(fit)[["____"]]',
              'r2        <- summary(fit)$____',
              '',
              'cat(sprintf("absorbance = %.3f x concentration + %.3f,  R² = %.4f\\n", slope, intercept, r2))'
            ]),
            check: lines([
              '{',
              'i <- get0("intercept", envir = env, inherits = FALSE); s <- get0("slope", envir = env, inherits = FALSE); r <- get0("r2", envir = env, inherits = FALSE)',
              'w <- coef(.st_fit); sm <- summary(.st_fit)',
              'if (!.st_near(i, w[[1]])) "Keep the line intercept <- coef(fit)[[\\"(Intercept)\\"]], and keep the fit to the four straight points."',
              'else if (!.st_near(s, w[[2]])) "In coef(fit), the gradient is called concentration: slope <- coef(fit)[[\\"concentration\\"]]."',
              'else if (.st_near(r, sm$adj.r.squared)) "That is the adjusted R². Use summary(fit)$r.squared."',
              'else if (!.st_near(r, sm$r.squared)) "R² is stored in summary(fit)$r.squared."',
              'else TRUE',
              '}'
            ]),
            solution: lines(STD, [
              'straight <- filter(std, concentration <= 0.20)',
              'fit <- lm(mean_abs ~ concentration, data = straight)',
              'intercept <- coef(fit)[["(Intercept)"]]',
              'slope     <- coef(fit)[["concentration"]]',
              'r2        <- summary(fit)$r.squared',
              'cat(sprintf("absorbance = %.3f x concentration + %.3f,  R² = %.4f\\n", slope, intercept, r2))'
            ]),
            hint: '`slope <- coef(fit)[["concentration"]]` and `r2 <- summary(fit)$r.squared`',
            pass: 'absorbance = 3.878 × concentration + 0.005, R² = 0.9992.' },
          { type: 'note', title: 'Check them against Excel',
            md: 'These are the same three numbers as `=SLOPE()`, `=INTERCEPT()` and `=RSQ()` in the workbook. Check that they agree. Two independent calculations that agree are worth more than one.' }
        ] },

      /* ---------- 8 ---------- */
      { id: 'r-squared', title: 'What R² tells you',
        lede: 'R² is one number between 0 and 1. Here is what it measures, and what it cannot tell you.',
        blocks: [
          { type: 'goal', md: 'Explain what R² measures, and what it does not tell you.' },
          { type: 'concept', title: 'R²',
            md: '**R²**, the **coefficient of determination**, is the fraction of the variation in absorbance that your line accounts for. It goes from 0 (the line accounts for none of it) to 1 (all of it: every point exactly on the line).\n\nR² describes __only the points you fitted__.' },
          { type: 'analogy', title: 'Guess the absorbance',
            md: 'Someone hides the labels on the four tubes and asks you to guess each absorbance. Your best guess for every tube is the mean, 0.345, and for most tubes you are far off. Then they tell you each concentration, and you use your line: now your guesses are almost exact. R² is the fraction of your first mistake that the line removes: 99.92 %.' },
          { type: 'story', id: 'st-r2', gate: true, title: 'R², step by step', w: 640, h: 352,
            alt: 'The four fitted standards, the mean absorbance, and the line of best fit',
            scene: r2Scene,
            steps: [
              { title: 'The four points you fitted', show: ['axes', 'pts'],
                md: 'These are the four standards on the straight part. Their absorbance varies: from 0.001 to 0.775.\n\nR² asks one question: how much of that variation does your line account for?' },
              { title: 'A guess without the line', show: ['mean'],
                md: 'Suppose that you did not know the concentrations. Your best guess for the absorbance of every tube would be the mean: 0.345.' },
              { title: 'How far off that guess is', show: ['dev', 'calc1'], focus: ['dev', 'mean', 'pts', 'calc1'],
                md: 'The red lines are the distances from each point to the mean. Most of them are long.\n\nR squares each distance and adds them up: **0.329**. This is the **total variation** in absorbance.' },
              { title: 'Now use the line', show: ['fit'], focus: ['fit', 'pts'],
                md: 'Now you know each concentration, so you can use the line:\n\nabsorbance = 3.878 × concentration + 0.005' },
              { title: 'What is left over', show: ['res', 'calc2'], focus: ['res', 'fit', 'pts', 'calc2'],
                md: 'Measure again, from each point to the __line__. These distances are tiny: the biggest is 0.014, smaller than a dot.\n\nSquared and added up: **0.00026**. This is the variation that the line does __not__ account for.' },
              { title: 'R²', show: ['calc3'],
                md: 'R² = 1 − (left over ÷ total) = 1 − 0.00026 ÷ 0.329 = **0.9992**.\n\nThe line accounts for 99.92 % of the variation in absorbance of these four points. Excel’s `=RSQ()` gives the same number.' },
              { title: 'What R² does not tell you', show: [],
                md: 'R² describes only the four points you fitted. It says nothing about the two you left out, and nothing about whether leaving them out was right.\n\nThat judgement is yours, and you defend it in words.' }
            ] },
          { type: 'exercise', id: 'st-cuts', gate: true, title: 'Your turn: five minutes worth a paragraph',
            task: 'Fit the line to different numbers of points, and watch what happens. The loop fits a line up to each cut in `cuts`. Add **0.50** and **1.00** to `cuts`, run it, and compare the four lines. Then press **Check my answer**.',
            code: lines([
              'conc       <- c(0.00, 0.05, 0.10, 0.20, 0.50, 1.00)',
              'absorbance <- c(0.001, 0.196, 0.407, 0.775, 1.402, 1.638)',
              '',
              '# Add 0.50 and 1.00 to the cuts',
              'cuts <- c(0.10, 0.20)',
              '',
              'for (cut in cuts) {',
              '  keep <- conc <= cut',
              '  f    <- lm(absorbance[keep] ~ conc[keep])',
              '  cat(sprintf("up to %.2f %%: R² = %.4f, gradient = %.3f\\n",',
              '              cut, summary(f)$r.squared, coef(f)[[2]]))',
              '}'
            ]),
            check: lines([
              '{',
              'cu <- get0("cuts", envir = env, inherits = FALSE)',
              'if (!is.numeric(cu)) "Keep the line cuts <- c(0.10, 0.20, 0.50, 1.00)."',
              'else if (!any(abs(cu - 0.5) < 1e-9)) "Add 0.50 to the cuts: cuts <- c(0.10, 0.20, 0.50, 1.00)."',
              'else if (!any(abs(cu - 1) < 1e-9)) "Add 1.00 to the cuts, so that the last line uses all six standards."',
              'else if (!exists("f", envir = env, inherits = FALSE)) "Keep the loop: for (cut in cuts) { … }."',
              'else TRUE',
              '}'
            ]),
            solution: lines([
              'conc       <- c(0.00, 0.05, 0.10, 0.20, 0.50, 1.00)',
              'absorbance <- c(0.001, 0.196, 0.407, 0.775, 1.402, 1.638)',
              'cuts <- c(0.10, 0.20, 0.50, 1.00)',
              'for (cut in cuts) {',
              '  keep <- conc <= cut',
              '  f    <- lm(absorbance[keep] ~ conc[keep])',
              '  cat(sprintf("up to %.2f %%: R² = %.4f, gradient = %.3f\\n",',
              '              cut, summary(f)$r.squared, coef(f)[[2]]))',
              '}'
            ]),
            hint: 'Change one line: `cuts <- c(0.10, 0.20, 0.50, 1.00)`.',
            pass: 'Watch the gradient fall, from 4.060 to 1.615, as more of the bend goes into the fit.' },
          { type: 'interpret', title: 'What the four lines show',
            md: '- Up to 0.10 %: R² = 0.9995, gradient 4.060.\n' +
              '- Up to 0.20 %: R² = 0.9992, gradient 3.878.\n' +
              '- Up to 0.50 %: R² = 0.9731, gradient 2.745.\n' +
              '- Up to 1.00 %: R² = 0.8679, gradient 1.615.\n\n' +
              'Look at 0.50 %. R² is still 0.97, which looks high, but the gradient is 29 % lower than on the straight part. Every unknown read off that line would be wrong. A high R² does not show that you chose the right points. That output is worth a paragraph in your evaluation.' },
          { type: 'concept', title: 'The trap',
            md: 'A high R² across a flat part of the curve is worse than a low one. Near the top, points can lie on a neat line that is almost flat. R² is high, but the method cannot tell those concentrations apart: a tiny change in absorbance means a huge change in concentration. Remember the sound meter.' },
          { type: 'concept', title: 'Reading your own points',
            md: '- **Points scattered evenly on both sides of the line.** This is random error: pipetting that is not consistent, a cuvette that was not wiped, drops of different volumes. Write: repeat and average, and pipette the iodine instead of adding drops.\n' +
              '- **Points that curve away at the top.** This is the wrong model: you included the part where the curve levels off. Write: restrict the fit, and say where the straight part ends.' },
          { type: 'note', title: 'Check the intercept too',
            md: 'The intercept should be near zero, because you zeroed the colorimeter on the blank. If it is not, suspect a **systematic error**, most likely a blank with no iodine in it. Every reading is then shifted in the same way, and repeating the experiment will never show it.' },
          { type: 'mcq', id: 'st-r2-mcq', gate: true,
            q: 'Your line through four standards has R² = 0.9992. Which sentence is right?',
            opts: [
              { t: 'The line accounts for 99.9 % of the variation in absorbance of the four fitted standards.', ok: true, why: 'Yes. R² describes the points you fitted, and only those.' },
              { t: 'The line is right for all six standards.', why: 'R² says nothing about the two standards you left out. Through all six, R² is only 0.87, and the gradient is wrong.' },
              { t: 'It proves that absorbance depends on the starch concentration.', why: 'Statistics never prove anything. R² measures how well a straight line fits these four points.' },
              { t: '99.9 % of the points lie exactly on the line.', why: 'None of the points lies exactly on the line. R² compares the distances to the line with the total variation.' }
            ] },
          { type: 'frames', title: 'Write it in your report',
            items: [
              'R² = ___: the line accounts for ___ % of the variation in absorbance of the ___ fitted standards.',
              'The intercept is ___, close to zero, so there is no sign of a systematic error in the blank.',
              'Including Standards 4 and 5 would lower the gradient from ___ to ___, because ___.'
            ] },
          { type: 'extension', title: 'r and R² are not the same thing',
            md: '- **r**, the **correlation coefficient**, answers: do two things move together, and which way? It goes from −1 to +1, and its sign gives the direction. Use it when you measured two things and controlled neither. In R: `cor(x, y)`. In Excel: `=PEARSON(y, x)`.\n' +
              '- **R²**, the **coefficient of determination**, answers: how much of the variation does my line account for? It goes from 0 to 1, with no sign. Use it when you fitted a line and want to judge it. In R: `summary(fit)$r.squared`. In Excel: `=RSQ(y, x)`.\n\n' +
              'For a straight line of one y against one x, R² is exactly r squared. So r = −0.95 and r = +0.95 both give R² = 0.90.\n\n' +
              'A calibration curve is a fitted line, so R² is the one you want. Reporting r here is not wrong, but it answers a question that nobody asked.',
            blocks: [
              { type: 'exercise', id: 'st-r', title: 'Try it: r, then r squared',
                task: 'Run the code to see r for the four fitted points. Then, on the last line, square it (`r^2`), and compare it with R² = 0.9992.',
                code: lines(STD, [
                  'straight <- filter(std, concentration <= 0.20)',
                  '',
                  'r <- cor(straight$concentration, straight$mean_abs)',
                  'r',
                  '',
                  '# square r on the next line:',
                  ''
                ]),
                check: lines([
                  '{',
                  'r <- get0("r", envir = env, inherits = FALSE)',
                  'if (!is.numeric(r)) "Keep the line r <- cor(straight$concentration, straight$mean_abs)."',
                  'else if (!.st_near(value, summary(.st_fit)$r.squared)) "On the last line, square r: r^2."',
                  'else TRUE',
                  '}'
                ]),
                solution: lines(STD, ['straight <- filter(std, concentration <= 0.20)', 'r <- cor(straight$concentration, straight$mean_abs)', 'r', 'r^2']),
                hint: 'The last line is `r^2`.',
                pass: 'r = 0.9996, and r² = 0.9992: the same number as R².' }
            ] }
        ] },

      /* ---------- 9 ---------- */
      { id: 'graph', title: 'Put the line on the graph',
        lede: 'The finished calibration curve: every standard, the line, the equation and R².',
        blocks: [
          { type: 'goal', md: 'Draw the calibration curve: all six standards, with the line fitted to the straight part only.' },
          { type: 'concept', title: 'The layers, in order',
            md: '- The error bars.\n- All six points, in grey.\n- The fitted points again, in teal, on top.\n- The line (`geom_smooth()`), from the fitted points only.\n- The equation and R² (`annotate()`).\n\n' +
              'The grey points show the reader everything you measured. The teal points show what you chose to fit. That is what an honest graph does.' },
          { type: 'exercise', id: 'st-line', gate: true, title: 'Your turn: the calibration curve',
            task: 'This is the finished calibration curve, with two mistakes in `geom_smooth()`. Fix them:\n\n' +
              '- Turn off the grey band: `se = FALSE`.\n' +
              '- Stop the line at your last fitted point: delete `fullrange = TRUE`.\n\n' +
              'Run it after each change. Then press **Check my answer**.',
            h: 420,
            code: lines(FIT, [
              '',
              'ggplot(std, aes(x = concentration, y = mean_abs)) +',
              '  geom_errorbar(aes(ymin = mean_abs - unc, ymax = mean_abs + unc),',
              '                width = 0.02, colour = "grey50") +',
              '  geom_point(size = 3, colour = "grey60") +                     # every standard',
              '  geom_point(data = straight, size = 3, colour = "#2E7D8F") +   # the fitted points',
              '  # two mistakes on the next two lines',
              '  geom_smooth(data = straight, method = "lm", formula = y ~ x,',
              '              se = TRUE, fullrange = TRUE,',
              '              colour = "#A93226", linewidth = 0.7) +',
              '  annotate("text", x = 0.30, y = 0.25, hjust = 0,',
              '           label = sprintf("absorbance = %.3f x concentration + %.3f\\nR² = %.4f",',
              '                           slope, intercept, r2)) +',
              '  labs(x = "Starch concentration / %",',
              '       y = "Absorbance at 610 nm (mean of 3)") +',
              '  theme_minimal(base_size = 12)'
            ]),
            check: lines([
              '{',
              'p <- .st_plot(value, code, env)',
              'sm <- if (is.null(p)) list() else .st_layers(p, "GeomSmooth")',
              'l <- if (length(sm)) sm[[1]] else NULL',
              'if (is.null(p)) "End your code with the graph: ggplot(…) + … + theme_minimal(base_size = 12)."',
              'else if (is.null(l)) "Keep geom_smooth(): it draws the line of best fit."',
              'else if (!is.data.frame(l$data) || nrow(l$data) != 4) "Keep data = straight inside geom_smooth(), so that the line uses only the four fitted points."',
              'else if (!identical(.st_param(l, "method"), "lm")) "Keep method = \\"lm\\": a straight line."',
              'else if (!isFALSE(.st_param(l, "se"))) "Turn off the grey band: se = FALSE."',
              'else if (isTRUE(.st_param(l, "fullrange"))) "Stop the line at your last fitted point: delete fullrange = TRUE."',
              'else if (!is.null(e <- .st_draw_error(p))) paste("R cannot draw the graph yet:", e)',
              'else TRUE',
              '}'
            ]),
            solution: lines(FIT, [
              'ggplot(std, aes(x = concentration, y = mean_abs)) +',
              '  geom_errorbar(aes(ymin = mean_abs - unc, ymax = mean_abs + unc),',
              '                width = 0.02, colour = "grey50") +',
              '  geom_point(size = 3, colour = "grey60") +',
              '  geom_point(data = straight, size = 3, colour = "#2E7D8F") +',
              '  geom_smooth(data = straight, method = "lm", formula = y ~ x,',
              '              se = FALSE,',
              '              colour = "#A93226", linewidth = 0.7) +',
              '  annotate("text", x = 0.30, y = 0.25, hjust = 0,',
              '           label = sprintf("absorbance = %.3f x concentration + %.3f\\nR² = %.4f",',
              '                           slope, intercept, r2)) +',
              '  labs(x = "Starch concentration / %",',
              '       y = "Absorbance at 610 nm (mean of 3)") +',
              '  theme_minimal(base_size = 12)'
            ]),
            hint: 'The finished `geom_smooth()` is:\n\n`geom_smooth(data = straight, method = "lm", formula = y ~ x,`\n`            se = FALSE,`\n`            colour = "#A93226", linewidth = 0.7) +`',
            pass: 'Grey: every standard. Teal: the four points in the fit. Red: the line, from 0 to 0.20 % only, with its equation and R².' },
          { type: 'interpret', title: 'Why these two fixes',
            md: '- `se = FALSE` turns off the pale grey band around the line. That band means something specific in statistics (a 95 % confidence interval for the line) that you have not been taught yet. Do not put it on a graph that you have to defend.\n' +
              '- Without `fullrange = TRUE`, the line stops at your last fitted point. Leave it there. `fullrange = TRUE` stretches the line across the whole graph. That is **extrapolation**: a claim about concentrations that you never measured on the straight part, drawn in ink.' },
          { type: 'note', title: 'The title under your graph',
            md: 'In your report, write a title under the graph, like this:\n\n**Figure 1.** Scatter graph showing the relationship between starch concentration (%) and absorbance at 610 nm, with a straight line of best fit through the blank and Standards 1 to 3 (R² = 0.9992; n = 3; error bars = ± half the range).' },
          { type: 'frames', title: 'Your own title',
            items: [
              'Figure 1. Scatter graph showing the relationship between starch concentration (___) and absorbance at ___ nm, with a straight line of best fit through ___ (R² = ___; n = ___; error bars = ± half the range).'
            ] }
        ] },

      /* ---------- 10 ---------- */
      { id: 'unknowns', title: 'Read an unknown off the line',
        lede: 'This is what a calibration curve is for: it turns an absorbance into a concentration.',
        blocks: [
          { type: 'goal', md: 'Work out the starch concentration of an unknown, and check that its reading is inside the fitted range.' },
          { type: 'concept', title: 'Rearrange the line',
            md: 'The line is: absorbance = slope × concentration + intercept.\n\nRearranged: concentration = (absorbance − intercept) ÷ slope.\n\nIf you diluted the sample first, multiply by the dilution factor at the end.' },
          { type: 'exercise', id: 'st-readoff', gate: true, title: 'Your turn: a function that reads the line',
            task: 'Fill in the two blanks: subtract the `intercept`, then divide by the `slope`. Run it for unknown B, then press **Check my answer**.',
            code: lines(FIT, [
              '',
              '# concentration = (absorbance - intercept) / slope, times any dilution',
              'read_off <- function(absorbance, dilution = 1) {',
              '  (absorbance - ____) / ____ * dilution',
              '}',
              '',
              '# Unknown B: the mean of its three readings',
              'unknown_B <- mean(c(0.509, 0.518, 0.512))',
              'read_off(unknown_B)'
            ]),
            check: lines([
              '{',
              'fn <- get0("read_off", envir = env, inherits = FALSE)',
              'i <- coef(.st_fit)[[1]]; s <- coef(.st_fit)[[2]]; b <- mean(c(0.509, 0.518, 0.512))',
              'v1 <- if (is.function(fn)) tryCatch(fn(b), error = function(e) NULL) else NULL',
              'v10 <- if (is.function(fn)) tryCatch(fn(b, 10), error = function(e) NULL) else NULL',
              'if (!is.function(fn)) "Keep the function: read_off <- function(absorbance, dilution = 1) { … }."',
              'else if (!is.numeric(v1) || length(v1) != 1) "Fill in both blanks: (absorbance - intercept) / slope * dilution."',
              'else if (.st_near(v1, (b + i) / s)) "Subtract the intercept: absorbance - intercept."',
              'else if (.st_near(v1, (b - i) * s)) "Divide by the slope: (absorbance - intercept) / slope."',
              'else if (!.st_near(v1, (b - i) / s)) "The rearranged line is (absorbance - intercept) / slope * dilution."',
              'else if (!.st_near(v10, 10 * (b - i) / s)) "Keep * dilution at the end, so that a diluted sample is multiplied back."',
              'else TRUE',
              '}'
            ]),
            solution: lines(FIT, [
              'read_off <- function(absorbance, dilution = 1) {',
              '  (absorbance - intercept) / slope * dilution',
              '}',
              'unknown_B <- mean(c(0.509, 0.518, 0.512))',
              'read_off(unknown_B)'
            ]),
            hint: 'The middle line of the function is `(absorbance - intercept) / slope * dilution`.',
            pass: 'Unknown B: mean absorbance 0.513, so 0.131 % starch. You have just written a function.' },
          { type: 'concept', title: 'Interpolation, not extrapolation',
            md: '- **Interpolation** means reading a value __inside__ the range of your standards. Your fitted line runs from absorbance 0.001 to 0.775 (0 to 0.20 %). Unknown B (0.513) is inside, so you can use its value.\n' +
              '- **Extrapolation** means reading a value __outside__ that range. The line says nothing there, and above 0.20 % you already know that the real curve bends.' },
          { type: 'analogy', title: 'A ruler that stops',
            md: 'The calibration line is a ruler with marks only from 0 to 0.775 absorbance. A reading on the ruler is a measurement. A reading past the end of the ruler is a guess, even when R gives you a number.' },
          { type: 'exercise', id: 'st-check', gate: true, title: 'Your turn: an unknown that is too dark',
            task: 'Unknown A reads 1.554: far above the top of the fitted range (0.775). The function `check()` says so out loud. So unknown A was diluted (1 cm³ of unknown in 9 cm³ of distilled water: a dilution factor of 10) and read again.\n\n' +
              'Replace `____` with the dilution factor. Run it, then press **Check my answer**.',
            code: lines(FIT, [
              'read_off <- function(absorbance, dilution = 1) (absorbance - intercept) / slope * dilution',
              '',
              '# The top of the fitted range',
              'max_abs_on_line <- max(straight$mean_abs)',
              '',
              '# A number is not permission to use it: make R say so',
              'check <- function(absorbance) {',
              '  if (absorbance > max_abs_on_line) {',
              '    "NO - above the fitted range. Dilute it and read again."',
              '  } else if (absorbance < 0.05) {',
              '    "NO - too faint for the colorimeter to resolve."',
              '  } else {',
              '    "Yes - inside the fitted range."',
              '  }',
              '}',
              '',
              'unknown_A <- mean(c(1.548, 1.562, 1.551))',
              'check(unknown_A)',
              '',
              '# 1 cm³ of unknown A in 9 cm³ of water, read again',
              'unknown_A_dil <- mean(c(0.318, 0.325, 0.321))',
              'check(unknown_A_dil)',
              'read_off(unknown_A_dil, ____)'
            ]),
            check: lines([
              '{',
              'mx <- get0("max_abs_on_line", envir = env, inherits = FALSE)',
              'i <- coef(.st_fit)[[1]]; s <- coef(.st_fit)[[2]]; a_dil <- mean(c(0.318, 0.325, 0.321))',
              'if (!.st_near(mx, 0.775)) "Keep max_abs_on_line <- max(straight$mean_abs): the top of the fitted range, 0.775."',
              'else if (!is.numeric(value) || length(value) != 1) "End with read_off(unknown_A_dil, 10): the diluted reading, with the dilution factor."',
              'else if (.st_near(value, (a_dil - i) / s)) "That is the concentration of the diluted sample. Multiply back by the dilution factor: read_off(unknown_A_dil, 10)."',
              'else if (!.st_near(value, (a_dil - i) / s * 10)) "Read off the diluted reading, with the dilution factor: read_off(unknown_A_dil, 10)."',
              'else TRUE',
              '}'
            ]),
            solution: lines(FIT, [
              'read_off <- function(absorbance, dilution = 1) (absorbance - intercept) / slope * dilution',
              'max_abs_on_line <- max(straight$mean_abs)',
              'check <- function(absorbance) {',
              '  if (absorbance > max_abs_on_line) {',
              '    "NO - above the fitted range. Dilute it and read again."',
              '  } else if (absorbance < 0.05) {',
              '    "NO - too faint for the colorimeter to resolve."',
              '  } else {',
              '    "Yes - inside the fitted range."',
              '  }',
              '}',
              'unknown_A <- mean(c(1.548, 1.562, 1.551))',
              'check(unknown_A)',
              'unknown_A_dil <- mean(c(0.318, 0.325, 0.321))',
              'check(unknown_A_dil)',
              'read_off(unknown_A_dil, 10)'
            ]),
            hint: 'The last line is `read_off(unknown_A_dil, 10)`.',
            pass: '0.8146 %. Round it: 0.81 %.' },
          { type: 'mcq', id: 'st-extrap', gate: true,
            q: 'Unknown A reads 1.554. Your line was fitted from 0 to 0.775. What do you do?',
            opts: [
              { t: 'Dilute it, read it again, and multiply the answer by the dilution factor.', ok: true, why: 'Yes. Diluted ten times, it reads 0.321: inside the range, so this is interpolation. 0.0815 % × 10 = 0.81 %.' },
              { t: 'Read it off the line anyway: R gives 0.40 %.', why: 'That is extrapolation. The line says nothing above 0.775, and the real curve bends there. R gives you a number either way: a number is not permission to use it.' },
              { t: 'Make the line longer with fullrange = TRUE, and read it from the graph.', why: 'A longer line is still extrapolation, drawn in ink. No standard on the straight part was that dark.' },
              { t: 'Fit all six standards, so that the line reaches 1.554.', why: 'The top two standards bend. A straight line through all six has the wrong gradient (1.615, not 3.878), so every answer from it would be wrong.' }
            ] },
          { type: 'note', title: 'Round the answer',
            md: 'R gives 0.8146 %. Write 0.81 %. Multiplying by 10 multiplies the uncertainty by 10 too, so 0.8146 claims a precision that you do not have.' },
          { type: 'frames', title: 'Write it in your report',
            items: [
              'Unknown B had a mean absorbance of ___. This is inside the fitted range (up to ___), so its starch concentration is ___ %, read off the calibration curve by interpolation.',
              'Unknown A had a mean absorbance of ___, above the fitted range. It was diluted by a factor of ___ and read again (mean absorbance ___), so its concentration is ___ × ___ = ___ %.'
            ] }
        ] },

      /* ---------- 11 ---------- */
      { id: 'ai', title: 'Where AI fits',
        lede: 'An AI can write R for you. It changes how much you type, not how much you must understand.',
        blocks: [
          { type: 'goal', md: 'Decide which parts of your analysis an AI may write for you, and how to reference it.' },
          { type: 'text', md: 'Most people never try R for one reason: they can picture the graph they want, but they have no idea what to type. That used to cost a weekend of tutorials.\n\nNow you can describe the figure to an AI, and it writes the R for you. So the question is no longer "can I code this?" It is "what do I actually want to see?" That is the better question, and it is the one this course trains you to ask.' },
          { type: 'concept', title: 'Hand this over happily',
            md: 'Colours, fonts, themes, axis labels, the layout of panels, saving the file, and explaining an error message that you have never seen before.\n\nNone of it changes a number.' },
          { type: 'concept', title: 'This has to be yours',
            md: 'Which points go into the fit, and why you left any out. What the gradient means. What R² does and does not tell you. Whether an unknown is inside your range.\n\nEvery one of these changes a number, or a conclusion. Be able to say out loud why each of these lines is in your script. Nobody will ever ask you to defend a colour.' },
          { type: 'note', title: 'Do you have to reference it?',
            md: '**Asking how** is learning a technique: reading the documentation, watching a tutorial, or asking an AI what `facet_wrap()` does. You do not reference that, just as you do not reference learning `=AVERAGE()` from a video.\n\n' +
              '**Pasting what an AI wrote** into your work is receiving a product. The IB rule: credit it in the body of your text and in your bibliography, and include the prompt that you typed and the date.\n\n' +
              'Technique or product: that is the test. If you cannot tell, cite it. A citation never costs a mark. An AI product that is not credited is academic misconduct. The IB does not ban AI tools, but your school may have stricter rules: check those too.' },
          { type: 'mcq', id: 'st-ai', gate: true,
            q: 'You typed a prompt, and pasted the R code that the AI wrote into your IA. What must you do?',
            opts: [
              { t: 'Credit it in the text and in the bibliography, with the prompt you typed and the date.', ok: true, why: 'Yes. Pasting an AI’s output is receiving a product, so you reference it. And you must still be able to explain every line that changes a number.' },
              { t: 'Nothing: code is not writing, so it does not count.', why: 'Code that an AI wrote is still a product that you received. The IB rule covers it.' },
              { t: 'Nothing, as long as you changed the colours.', why: 'Changing the look does not make the code yours. Credit it.' },
              { t: 'Delete it: the IB bans AI tools.', why: 'The IB does not ban AI tools. It asks you to credit what an AI produced. Your school may have stricter rules, so check those too.' }
            ] },
          { type: 'note', title: 'R leaves the receipt',
            md: 'A picture that an AI draws for you cannot be repeated. A script that an AI writes for you can: anyone can run it and get your figure back. That includes you in six months, your teacher, and an examiner who asks how you got that number.\n\nExcel does its working out of sight, one hidden cell at a time. R leaves the receipt. And you can check a script that an AI wrote only if you can read it. After this course, you can.' }
        ] },

      /* ---------- 12 ---------- */
      { id: 'own-computer', title: 'Do it on your own computer',
        lede: 'For your own readings, and later for your IA, you want R on your own computer.',
        blocks: [
          { type: 'goal', md: 'Install R and RStudio, then run starch_curve.R on the workbook.' },
          { type: 'concept', title: 'Getting R',
            md: 'R is the language. **RStudio** is the window you write it in. You need both, in that order: install R first. If you install RStudio first, it opens and says that it cannot find R.\n\n' +
              '- **Nothing to install:** [Posit Cloud](https://posit.cloud). Make a free account, then choose **New Project → New RStudio Project**. About twenty seconds later, you have RStudio in a browser tab. This is best on a locked school computer or a Chromebook.\n' +
              '- **Mac:** [R for macOS](https://cran.r-project.org/bin/macosx/). Take the .pkg for your Mac: Apple silicon (arm64) for an M-series Mac, Intel (x86_64) for an older one. Not sure? Apple menu → About This Mac.\n' +
              '- **Windows:** [R for Windows](https://cran.r-project.org/bin/windows/base/). One .exe file: download it, run it, and keep the default settings.\n' +
              '- **Then RStudio:** [RStudio Desktop](https://posit.co/download/rstudio-desktop/), the free version. Mac: drag it into Applications. Windows: run the installer.\n\n' +
              'Open RStudio, not R. R on its own is a plain grey window.' },
          { type: 'note', title: 'The short route: the whole analysis in one click', files: FILES,
            md: '- Download both files into the __same folder__, and keep their names.\n' +
              '- Type your readings into the **Your data** tab of the workbook, and save it.\n' +
              '- Double-click starch_curve.R. It opens in RStudio.\n' +
              '- Press **Source**, at the top right of the editor (or Cmd + Shift + Enter).\n\n' +
              'The script reads your numbers from the workbook and fits the line to the points you marked Y. It prints the gradient, the intercept and R², saves the graph as a PNG, and works out your unknowns. It reads only the cells you typed, and works everything else out again. So if it agrees with Excel, two independent calculations agree.\n\n' +
              'No readings yet? The **Worked example** tab holds the numbers from this course. In starch_curve.R, change one line near the top: `SHEET <- "Your data"` becomes `SHEET <- "Worked example"`. Change it back when you have your own numbers.' },
          { type: 'concept', title: 'What you are looking at: RStudio',
            md: 'RStudio shows four panels. You need two of them.\n\n' +
              '- **Script editor** (top left): a file of instructions. This is where you work, and it is saved. No panel there? Choose **File → New File → R Script**.\n' +
              '- **Console** (bottom left): where R runs things. Type, press Enter, and it happens. Nothing here is saved.\n' +
              '- **Environment** (top right): everything R is holding in memory.\n' +
              '- **Files / Plots** (bottom right): your graphs appear here.\n\n' +
              'To run one line, put the cursor on it and press Cmd + Enter (Mac) or Ctrl + Enter (Windows). To run the whole script, add Shift. Work in the script, not the Console: if it is not in the script, it did not happen.' },
          { type: 'example', title: 'Install the tidyverse, once',
            code: lines([
              '# In the Console, once per computer:',
              'install.packages("tidyverse")',
              '',
              '# At the top of every script: installs it only if it is missing, then loads it',
              'if (!requireNamespace("tidyverse", quietly = TRUE)) install.packages("tidyverse")',
              'library(tidyverse)'
            ]),
            md: 'The **tidyverse** is a bundle of add-on packages for handling data and drawing graphs: dplyr, tidyr, ggplot2, readr and more. `install.packages()` scrolls several hundred lines for a few minutes. That is normal: wait for the `>` prompt to come back.\n\nThe `requireNamespace` line asks "is this package already here?", and installs it only if the answer is no. So your script still runs on a computer where you never typed the Console command.' },
          { type: 'analogy', title: 'install.packages() and library()',
            md: '`install.packages()` is buying the textbook: you do it once, and it stays on your shelf. `library()` is taking it off the shelf: you do it every time you open RStudio.' },
          { type: 'note', title: 'Not an error',
            md: 'A red block about "conflicts" with `filter` and `lag` is not an error. R is telling you that these two names now belong to the tidyverse. You can continue.' },
          { type: 'example', title: 'The whole analysis, in one block',
            code: lines([
              '# Starch calibration curve --------------------------------------------------',
              '# Installs the tidyverse if this machine does not have it yet, then loads it.',
              'if (!requireNamespace("tidyverse", quietly = TRUE)) install.packages("tidyverse")',
              'library(tidyverse)',
              '',
              '# 1. YOUR DATA - replace every number below with your own -------------------',
              'std_raw <- tribble(',
              '  ~tube,        ~stock_cm3, ~water_cm3, ~abs1,  ~abs2,  ~abs3,',
              '  "Blank",             0.0,       10.0, 0.000,  0.002,  0.001,',
              '  "Standard 1",        0.5,        9.5, 0.190,  0.201,  0.197,',
              '  "Standard 2",        1.0,        9.0, 0.399,  0.414,  0.408,',
              '  "Standard 3",        2.0,        8.0, 0.766,  0.785,  0.774,',
              '  "Standard 4",        5.0,        5.0, 1.388,  1.421,  1.397,',
              '  "Standard 5",       10.0,        0.0, 1.611,  1.658,  1.645',
              ')',
              '',
              '# 2. Concentrations, and the mean of the three repeats ----------------------',
              'std <- std_raw |>',
              '  mutate(concentration = 1 * stock_cm3 / (stock_cm3 + water_cm3)) |>',
              '  pivot_longer(c(abs1, abs2, abs3), names_to = "trial", values_to = "absorbance") |>',
              '  group_by(tube, concentration) |>',
              '  summarise(mean_abs = mean(absorbance),',
              '            unc      = (max(absorbance) - min(absorbance)) / 2,',
              '            .groups  = "drop") |>',
              '  arrange(concentration)',
              '',
              '# 3. Where do the points stop lying on a straight line? ---------------------',
              'std |> mutate(ratio = mean_abs / concentration)',
              '',
              '# 4. YOUR DECISION - change 0.20 to suit your own data ----------------------',
              'straight <- filter(std, concentration <= 0.20)',
              '',
              '# 5. Fit the line to those rows only ----------------------------------------',
              'fit       <- lm(mean_abs ~ concentration, data = straight)',
              'intercept <- coef(fit)[["(Intercept)"]]',
              'slope     <- coef(fit)[["concentration"]]',
              'r2        <- summary(fit)$r.squared',
              'cat(sprintf("absorbance = %.3f x conc + %.3f,  R2 = %.4f,  %d points\\n",',
              '            slope, intercept, r2, nrow(straight)))',
              '',
              '# 6. The graph --------------------------------------------------------------',
              'ggplot(std, aes(concentration, mean_abs)) +',
              '  geom_errorbar(aes(ymin = mean_abs - unc, ymax = mean_abs + unc),',
              '                width = 0.02, colour = "grey50") +',
              '  geom_point(size = 3, colour = "grey60") +',
              '  geom_point(data = straight, size = 3, colour = "#2E7D8F") +',
              '  geom_smooth(data = straight, method = "lm", se = FALSE,',
              '              colour = "#A93226", linewidth = 0.7) +',
              '  annotate("text", x = max(std$concentration) * 0.45, y = max(std$mean_abs) * 0.2,',
              '           hjust = 0,',
              '           label = sprintf("absorbance = %.3f x concentration + %.3f\\nR2 = %.4f",',
              '                           slope, intercept, r2)) +',
              '  labs(x = "Starch concentration / %",',
              '       y = "Absorbance (mean of 3)") +',
              '  theme_minimal(base_size = 12)',
              '',
              '# saves the last graph, into the working directory, at print resolution',
              'ggsave("calibration_curve.png", width = 16, height = 10, units = "cm", dpi = 300)',
              '',
              '# 7. Unknowns ---------------------------------------------------------------',
              'max_abs_on_line <- max(straight$mean_abs)',
              '',
              'read_off <- function(absorbance, dilution = 1) (absorbance - intercept) / slope * dilution',
              '',
              'check <- function(absorbance) {',
              '  if (absorbance > max_abs_on_line)      "NO - above the fitted range. Dilute and read again."',
              '  else if (absorbance < 0.05)            "NO - too faint for the colorimeter to resolve."',
              '  else                                   "Yes - inside the fitted range."',
              '}',
              '',
              'unknown_A     <- mean(c(1.548, 1.562, 1.551))',
              'unknown_A_dil <- mean(c(0.318, 0.325, 0.321))',
              'unknown_B     <- mean(c(0.509, 0.518, 0.512))',
              '',
              'check(unknown_A)                 # too high',
              'check(unknown_A_dil)             # fine',
              'read_off(unknown_A_dil, 10)      # 0.81 %',
              'check(unknown_B)                 # fine',
              'read_off(unknown_B)              # 0.13 %'
            ]),
            md: 'Everything in this course, as one script for RStudio. Copy it into a new script. Replace the numbers in `tribble()` and the 0.20 in `filter()` with your own. Then run it from the top.' },
          { type: 'concept', title: 'When it breaks',
            md: '- `could not find function "ggplot"`: the package is not switched on. Put `library(tidyverse)` at the top.\n' +
              '- `there is no package called ‘tidyverse’`: it was never installed. Type `install.packages("tidyverse")` in the Console.\n' +
              '- `object \'std\' not found`: you ran a later line before an earlier one. Run the script from the top.\n' +
              '- `does not exist in current working directory`: R is in the wrong folder. Choose **Session → Set Working Directory → To Source File Location**.\n' +
              '- The Console shows `+` and does not respond: a bracket or a quote mark is not closed. Press Esc, then find the missing `)` or `"`.\n' +
              '- `object \'Concentration\' not found`: a capital letter. R is case sensitive.\n' +
              '- `unexpected symbol`: a missing comma, or a `+` at the start of a line. Look at the line above the one R names.\n' +
              '- The graph is empty: a column is text, not numbers. Run `glimpse(std)`: is anything `<chr>` that should be `<dbl>`?\n\n' +
              'Two habits prevent most of these: run your script from the top every time, and read the error message. R almost always names the line and the object that caused the problem.' },
          { type: 'extension', title: 'The same thing without the tidyverse',
            md: 'Base R alone, with no packages, for a computer that will not install anything.',
            blocks: [
              { type: 'exercise', id: 'st-base', title: 'Try it: base R',
                task: 'Run it. Fewer lines, a plainer graph, the same numbers.',
                code: lines([
                  'conc       <- c(0.00, 0.05, 0.10, 0.20, 0.50, 1.00)',
                  'absorbance <- c(0.001, 0.196, 0.407, 0.775, 1.402, 1.638)',
                  '',
                  'keep <- conc <= 0.20                    # TRUE for the rows you want',
                  'fit  <- lm(absorbance[keep] ~ conc[keep])',
                  'summary(fit)',
                  '',
                  'plot(conc, absorbance, pch = 16, col = "grey60",',
                  '     xlab = "Starch concentration / %", ylab = "Absorbance at 610 nm")',
                  'points(conc[keep], absorbance[keep], pch = 16, col = "steelblue")',
                  'abline(fit, col = "firebrick", lwd = 2)'
                ]) }
            ] }
        ] }
    ]
  });
})(window.LR);
