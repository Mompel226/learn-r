/* ============================================================
   courses/ib.js — IB · Statistics in R. Rebuilt from Daniel's
   NLCS/IB/Learning R/IB_Bio_D3_2.Rmd (Parts A–G) around what the IB
   Biology guide (2025) asks: Tool 3 (mean, median, mode; range, SD,
   SE, IQR; continuous, discrete, categorical; χ² and t-tests; r and R²; error bars),
   Inquiry 2 (justify removing or keeping outliers), D3.2.14–15 (central
   tendency, box-and-whisker plots, 1.5 × IQR), D2.3.4 (SD and SE, no
   formulae to memorise), C4.1.15 (χ² for association), C2.2.4 (r and R²),
   B3.2.4 (pulse rates), B3.1.10 (stomatal density). 95 % confidence
   intervals and the tests beyond the IB are extensions: never gates.

   Stages (Daniel agreed the order, 25 Sep 2026):
     1 R in ten minutes            ← Part A
     2 The middle of your data     ← Part B
     3 Look before you test        ← Part C
     4 Spread: the normal distribution and SD   ← D.1
     5 How sure is the mean? SE    ← D.2, D.3
     6 Is it real, or is it chance? (the p-value, the coin)
     7 Which test?                 ← E, F
     8 The t-test
     9 The χ² test (his C4.1 heather and moss)
    10 Correlation and R²
    11 Put it together             ← G (a messy data set, cleaned, tested, reported)
    12 Carry on in RStudio         (added 25 Sep 2026 at Daniel's choice: R and RStudio on
                                   your own computer, and the course as one script,
                                   data/ib-statistics.R, built by tools/make-ib-script.mjs)

   The data and the story pictures live in js/scenes/ib.js (LR.IB). Every
   number a story quotes is in FACTS below and checked in R by tools/check.mjs.
   ============================================================ */
(function (LR) {
  'use strict';
  var IB = LR.IB, SC = IB.scenes;

  /* ---------- stage 11's messy data: stomatal density from leaf casts (B3.1.10), INVENTED ----------
     sun leaves 206.0 ± 25.7 (n = 11), shade 182.5 ± 19.3 (n = 11) once cleaned; t = 2.42, df = 20, p = 0.025.
     Three problems to find: six spellings of two labels, one missing count (leaf torn), one typing error (1980). */
  var LEAF = ['sun', 'Shade', 'sun', 'shade', 'SUN ', 'shade', 'Sun', 'shade', 'sun', ' shade', 'sun', 'Shade', 'sun', 'shade', 'Sun', 'shade', 'SUN ', 'Shade', 'sun', 'shade', 'Sun', ' shade', 'sun', 'shade'];
  var DENS = [198, 192, 204, 151, 1980, 173, 215, 184, 186, 'NA', 242, 159, 237, 202, 225, 169, 220, 201, 177, 188, 205, 175, 157, 214];
  var NOTE = LEAF.map(function (l, i) { return DENS[i] === 'NA' ? 'leaf torn: not counted' : ''; });
  function rvec(a, q) { return 'c(' + a.map(function (v) { return q ? '"' + v + '"' : String(v); }).join(', ') + ')'; }

  var SETUP = [
    IB.rStudents,
    'stomata_raw <- data.frame(',
    '  leaf_id = 1:24,',
    '  leaf = ' + rvec(LEAF, true) + ',',
    '  density_mm2 = ' + rvec(DENS) + ',',
    '  note = ' + rvec(NOTE, true) + ',',
    '  stringsAsFactors = FALSE',
    ')'
  ].join('\n');

  /* the numbers the stories and questions quote, checked in R (tools/check.mjs) */
  var FACTS = [
    ['mean(students$resting_hr)', 73.775, 0.001],
    ['sd(students$resting_hr)', 8.62, 0.01],
    ['sum(abs(students$resting_hr - mean(students$resting_hr)) <= sd(students$resting_hr))', 28, 0],
    ['sum(abs(students$resting_hr - mean(students$resting_hr)) <= 2 * sd(students$resting_hr))', 38, 0],
    ['as.numeric(table(cut(students$resting_hr, seq(54, 96, 6), right = FALSE)))', [2, 4, 12, 9, 7, 4, 2], 0],
    ['mean(students$resting_hr[students$trains == "No"])', 77.0, 0.001],
    ['mean(students$resting_hr[students$trains == "Yes"])', 70.55, 0.001],
    ['sd(students$resting_hr[students$trains == "No"])', 7.75, 0.005],
    ['sd(students$resting_hr[students$trains == "Yes"])', 8.40, 0.005],
    ['sd(students$resting_hr[students$trains == "No"]) / sqrt(20)', 1.73, 0.005],
    ['sd(students$resting_hr[students$trains == "No"]) / sqrt(80)', 0.87, 0.005],
    ['t.test(resting_hr ~ trains, data = students, var.equal = TRUE)$statistic', 2.52, 0.005],
    ['t.test(resting_hr ~ trains, data = students, var.equal = TRUE)$p.value', 0.016, 0.0005],
    ['6.45 / t.test(resting_hr ~ trains, data = students, var.equal = TRUE)$statistic', 2.56, 0.005],
    ['qt(0.975, 38)', 2.02, 0.005],
    ['t.test(students$resting_hr[students$trains == "No"])$conf.int[1]', 73.37, 0.005],
    ['t.test(students$resting_hr[students$trains == "Yes"])$conf.int[2]', 74.48, 0.005],
    ['cor(students$exercise_h, students$resting_hr)', -0.504, 0.001],
    ['cor.test(students$exercise_h, students$resting_hr)$p.value', 0.0009, 0.00005],
    ['summary(lm(resting_hr ~ exercise_h, data = students))$r.squared', 0.254, 0.001],
    ['coef(lm(resting_hr ~ exercise_h, data = students))[[2]]', -1.373, 0.001],
    ['as.numeric(table(students$abo))', [11, 14, 11, 4], 0],
    ['x <- c(students$resting_hr[students$trains == "No"], 112); quantile(x, 0.25)[[1]]', 71, 0],
    ['x <- c(students$resting_hr[students$trains == "No"], 112); median(x)', 78, 0],
    ['x <- c(students$resting_hr[students$trains == "No"], 112); quantile(x, 0.75)[[1]] + 1.5 * IQR(x)', 103.5, 0],
    ['x <- c(students$resting_hr[students$trains == "No"], 112); max(x[x <= 103.5])', 93, 0],
    ['mean(c(68, 87, 81, 73, 74, 74, 112))', 81.29, 0.005],
    ['as.numeric(students$resting_hr[students$trains == "No"][1:6])', [68, 87, 81, 73, 74, 74], 0],
    ['as.numeric(tapply(students$resting_hr, students$trains, median))', [76.5, 69], 0],
    ['chisq.test(matrix(c(57, 9, 7, 27), 2), correct = FALSE)$statistic', 42.14, 0.01],
    ['chisq.test(matrix(c(12, 48, 30, 10), 2), correct = FALSE)$statistic', 29.80, 0.01],
    ['chisq.test(matrix(c(12, 48, 30, 10), 2), correct = FALSE)$expected[1, 1]', 25.2, 0.001],
    ['chisq.test(c(315, 108, 101, 32), p = c(9, 3, 3, 1) / 16)$statistic', 0.47, 0.005],
    ['max(tapply(students$resting_hr, students$trains, sd)) / min(tapply(students$resting_hr, students$trains, sd))', 1.08, 0.005],
    ['wilcox.test(resting_hr ~ trains, data = students, exact = FALSE)$p.value', 0.014, 0.0005],
    ['summary(aov(resting_hr ~ abo, data = students))[[1]][["Pr(>F)"]][1]', 0.75, 0.005],
    ['sum(!is.na(pairwise.t.test(students$resting_hr, students$abo, p.adjust.method = "bonferroni")$p.value))', 6, 0],
    ['min(pairwise.t.test(students$resting_hr, students$abo, p.adjust.method = "bonferroni")$p.value, na.rm = TRUE)', 1, 0],
    ['s <- stomata_raw[!is.na(stomata_raw$density_mm2) & stomata_raw$density_mm2 < 500, ]; t.test(density_mm2 ~ tolower(trimws(leaf)), data = s, var.equal = TRUE)$p.value', 0.025, 0.0005],
    ['s <- stomata_raw[!is.na(stomata_raw$density_mm2) & stomata_raw$density_mm2 < 500, ]; as.numeric(tapply(s$density_mm2, tolower(trimws(s$leaf)), sd))', [19.3, 25.7], 0.05]
  ];

  /* a ggplot theme line every page graph shares */
  var THEME = '  theme_minimal(base_size = 14)';

  LR.course({
    id: 'ib-stats',
    kicker: 'IB Biology · Tool 3',
    title: 'Statistics in R',
    packages: ['dplyr', 'ggplot2'],
    setup: SETUP,
    facts: FACTS,
    finish: 'You have finished Statistics in R. You can describe data, draw it with the right error bars, choose a test, run it in R or RStudio and report it. For your IA, the Write-Up Lab shows how to present all of this: [Statistical tests in the Write-Up Lab](https://nlcsbiology.com/write-up-lab/#/part/stats).',
    stages: [

      /* ================= 1 · R in ten minutes (Part A) ================= */
      { id: 'r-basics', title: 'R in ten minutes',
        lede: 'R is a calculator that remembers. You need four things from it for the rest of the course.',
        blocks: [
          { type: 'goal', md: 'Calculate in R, store values under a name, use a function, and look at a data table.' },
          { type: 'concept', title: 'What R is',
            md: 'Scientists use R to calculate, draw graphs and run statistical tests. You type a line of code, press **Run**, and R answers underneath.\n\nIn this course, R runs inside the page, so you need nothing installed. Only the last stage shows you how to install R on your own computer, for your IA or EE.' },
          { type: 'exercise', id: 'ib-calc', gate: true, title: 'Your turn · R as a calculator',
            task: 'Three pulse readings: 72, 75 and 78 beats per minute (bpm). Work out their mean: add them, then divide by 3. Type it on the empty line, then press **Run**.',
            code: '# Mean of 72, 75 and 78: add them, then divide by 3\n\n',
            solution: '(72 + 75 + 78) / 3',
            check: 'if (is.null(value)) "Type the calculation on the empty line, then press Run." else if (!is.numeric(value)) "Use numbers, + and / only." else if (isTRUE(all.equal(as.numeric(value), 72 + 75 + 78 / 3))) "R divided only 78 by 3. Put brackets round the three numbers first: (72 + 75 + 78) / 3." else if (!isTRUE(all.equal(as.numeric(value), 75))) "The answer should be 75. Check the numbers and the brackets." else TRUE',
            hint: 'Brackets first: `(72 + 75 + 78) / 3`',
            pass: '75 bpm. The brackets make R add first, then divide.' },
          { type: 'concept', title: 'Objects: a name for a value',
            md: '`pulse <- c(72, 75, 78)` stores the three readings under the name **pulse**. The arrow `<-` means *store in*. `c( )` combines values into a list, called a **vector**.\n\nAfter that, you write `pulse` instead of the numbers.' },
          { type: 'analogy', md: 'An object is a labelled test tube. You put the sample in once, write the name on the label, and use the name from then on.' },
          { type: 'exercise', id: 'ib-object', gate: true, title: 'Your turn · a function',
            task: 'A **function** is a name followed by brackets: it does a job with what is inside. `sum(pulse)` adds the readings. Change `sum` to `mean`, then press **Run**.',
            code: '# Store the three readings under one name\npulse <- c(72, 75, 78)\npulse\n# sum() adds them up. Change sum to mean:\nsum(pulse)',
            solution: 'pulse <- c(72, 75, 78)\npulse\nmean(pulse)',
            check: 'if (!exists("pulse", envir = env, inherits = FALSE)) "Keep the line pulse <- c(72, 75, 78)." else if (!has("mean(pulse)")) "Change sum(pulse) to mean(pulse)." else if (!isTRUE(all.equal(as.numeric(value), 75))) "Keep mean(pulse) as the last line." else TRUE',
            pass: '`mean()` is a function: its name, then brackets round what it works on.' },
          { type: 'concept', title: 'A data table',
            md: 'R has a table ready for you, called **students**. It is __invented__: a class of 40 students. Each **row** is one student. Each **column** is one variable:\n\n- `trains`: is the student in a sports team? Yes or No\n- `exercise_h`: hours of exercise a week\n- `resting_hr`: resting heart rate, in bpm, from the pulse at the wrist over 60 seconds (B3.2.4)\n- `abo`: ABO blood group\n\nThe question for the whole course: __is resting heart rate different in students who train?__' },
          { type: 'rtable', title: 'The first six rows of students', code: 'head(students, 6)' },
          { type: 'exercise', id: 'ib-table', gate: true, title: 'Your turn · a column',
            task: '`head()` shows the first rows. `nrow()` counts the rows. `students$resting_hr` takes one column: the `$` means *the column called*. Run the code. Then add a last line that works out the **mean** of the resting heart rates.',
            code: '# The first six rows\nhead(students)\n# How many students?\nnrow(students)\n# One column: the resting heart rates\nstudents$resting_hr\n',
            solution: 'head(students)\nnrow(students)\nstudents$resting_hr\nmean(students$resting_hr)',
            check: 'if (!has("mean(students$resting_hr)")) "Add a last line: mean(students$resting_hr)" else if (!isTRUE(all.equal(as.numeric(value), mean(students$resting_hr)))) "Put the mean on the last line." else TRUE',
            pass: '73.775 bpm: the mean resting heart rate of all 40 students.' },
          { type: 'mcq', id: 'ib-dollar', gate: true, q: 'What does `students$abo` give you?',
            opts: [
              { t: 'The blood groups of all 40 students', ok: true, why: '`$` takes one column: every value in it.' },
              { t: 'The first row of the table', why: 'That is `head(students, 1)`. `$` takes a column, not a row.' },
              { t: 'The mean blood group', why: 'Blood groups are categories. They have no mean.' },
              { t: 'The number of students', why: 'That is `nrow(students)`.' }
            ] }
        ] },

      /* ================= 2 · The middle of your data (Part B) ================= */
      { id: 'averages', title: 'The middle of your data',
        lede: 'An average is one number that stands for a whole group. There are three, and each has its own job.',
        blocks: [
          { type: 'goal', md: 'Calculate the mean, median and mode in R, and choose the right one for your data.' },
          { type: 'story', id: 'ib-seesaw', gate: true, title: 'Mean, median and mode', w: 640, h: 330, alt: 'Six resting heart rates on a number line, with the mean as a balance point and the median as the middle value',
            scene: SC.seesaw,
            steps: [
              { title: 'Six students, six readings', show: ['axis', 'six'],
                md: 'The first six students in the table who do not train. Their resting heart rates, in bpm: 68, 87, 81, 73, 74 and 74.\n\nOne number that stands for the whole group is an **average**. There are three.' },
              { title: 'The median: the middle value', show: ['order', 'median6'],
                md: 'Put the values in order. The **median** is the one in the middle.\n\nWith six values, two share the middle: 74 and 74. The median is halfway between them: __74 bpm__.' },
              { title: 'The mean: the balance point', show: ['mean6'],
                md: 'The **mean** is the total divided by the number of values: 457 ÷ 6 = __76.2 bpm__.',
                analogy: 'Put the dots on a seesaw. The mean is the point where the seesaw balances.' },
              { title: 'One more reading', show: ['extra'],
                md: 'The notebook has one more reading for this group: __112 bpm__. It was taken just after a PE lesson.' },
              { title: 'The median hardly moves', hide: ['order', 'median6'], show: ['order7', 'median7'], pan: 'order7',
                md: 'Seven values now. The middle one is the 4th: the median is __still 74 bpm__.' },
              { title: 'The mean is pulled', hide: ['mean6'], show: ['mean7'], focus: ['mean7', 'extra', 'six'],
                md: 'The mean jumps to __81.3 bpm__. One extreme value pulls the mean towards it. Now five of the seven students are below the mean.',
                analogy: 'A heavy child sitting at the very end of the seesaw moves the balance point a long way.' },
              { title: 'The mode: for categories', hide: ['axis', 'six', 'extra', 'order7', 'median7', 'mean7'], show: ['abo'],
                md: 'The **mode** is the most common value. It is the only average for categories, such as blood group.\n\nIn the class, blood group A is the mode: 14 of the 40 students.',
                analogy: 'The mode is the winner of a class vote: the answer given most often.' },
              { title: 'Which one?', hide: ['abo'], show: ['rules'],
                md: 'Use the __mean__ for symmetrical data with no extreme values. Use the __median__ when there are extreme values, or the data are skewed (a long tail on one side). Use the __mode__ for categories.' }
            ] },
          { type: 'exercise', id: 'ib-outlier-mean', gate: true, title: 'Your turn · one extreme value',
            task: 'Run the code: R works out the mean and median of the six readings. Then add **112** to the list called `seven`, and run it again. Watch which average moves.',
            code: 'six <- c(68, 87, 81, 73, 74, 74)\nmean(six)\nmedian(six)\n\n# Add the reading taken after PE (112) inside c( ):\nseven <- c(68, 87, 81, 73, 74, 74)\nmean(seven)\nmedian(seven)',
            solution: 'six <- c(68, 87, 81, 73, 74, 74)\nmean(six)\nmedian(six)\nseven <- c(68, 87, 81, 73, 74, 74, 112)\nmean(seven)\nmedian(seven)',
            check: 's7 <- tryCatch(get("seven", envir = env, inherits = FALSE), error = function(e) NULL); if (is.null(s7)) "Keep the line that makes seven." else if (!(112 %in% s7)) "Add 112 inside the brackets of seven: c(68, 87, 81, 73, 74, 74, 112)." else if (length(s7) != 7) "seven should hold 7 readings: the six, and 112." else TRUE',
            hint: 'Put a comma after the last 74, then 112: `c(68, 87, 81, 73, 74, 74, 112)`',
            pass: 'The mean rose from 76.2 to 81.3 bpm. The median stayed at 74 bpm.' },
          { type: 'concept', title: 'The same, for both groups at once',
            md: '`%>%` means *and then*. Read the code below as: take `students`, __and then__ group them by `trains`, __and then__ summarise each group.\n\nThe `dplyr` package gives R these words. It is ready for you.' },
          { type: 'exercise', id: 'ib-group-avg', gate: true, title: 'Your turn · each group',
            task: 'Run it: R gives the mean of each group. Then add the median too: inside `summarise( )`, after `mean = mean(resting_hr)`, type a comma and `median = median(resting_hr)`.',
            code: 'students %>%\n  group_by(trains) %>%\n  summarise(mean = mean(resting_hr))',
            solution: 'students %>%\n  group_by(trains) %>%\n  summarise(mean = mean(resting_hr), median = median(resting_hr))',
            check: 'v <- tryCatch(as.data.frame(value), error = function(e) NULL); if (is.null(v) || !("mean" %in% names(v))) "Keep students %>% group_by(trains) %>% summarise(mean = mean(resting_hr))." else if (!("median" %in% names(v))) "Add median = median(resting_hr) inside summarise( ), after a comma." else if (!isTRUE(all.equal(v$median, c(76.5, 69)))) "Use median(resting_hr) for the median column." else TRUE',
            hint: '`summarise(mean = mean(resting_hr), median = median(resting_hr))`',
            pass: 'No training: mean 77.0, median 76.5 bpm. Training: mean 70.55, median 69.0 bpm. In each group the mean and median are close: no extreme values pull them apart.' },
          { type: 'exercise', id: 'ib-mode', gate: true, title: 'Your turn · the mode',
            task: 'Careful: R’s own `mode()` does something else (it says what kind of object you have). Run the code to count each blood group. Then add a line that finds the biggest count: `names(which.max(table(students$abo)))`.',
            code: '# How many students have each blood group?\ntable(students$abo)\n',
            solution: 'table(students$abo)\nnames(which.max(table(students$abo)))',
            check: 'if (!identical(as.character(value), "A")) "Add the line names(which.max(table(students$abo))) at the end." else TRUE',
            pass: 'The mode is A: 14 of the 40 students.' },
          { type: 'mcq', id: 'ib-which-avg', gate: true, q: 'Resting heart rates of 30 students. One reading is 150 bpm, taken just after a race. Which average describes the group best?',
            opts: [
              { t: 'The median', ok: true, why: 'One extreme value pulls the mean, but hardly moves the median.' },
              { t: 'The mean', why: 'The 150 bpm reading would pull the mean upwards.' },
              { t: 'The mode', why: 'The mode is for categories. With measurements, the most common value tells you little.' },
              { t: 'The highest value', why: 'That is the maximum, not an average.' }
            ] },
          { type: 'extension', title: 'The geometric mean (beyond the IB guide)',
            md: 'For growth that __multiplies__, such as a population of bacteria that doubles, then halves, then doubles again, the ordinary mean misleads. The **geometric mean** is the right average: `exp(mean(log(x)))`.',
            blocks: [
              { type: 'example', title: 'Try it in any exercise box', code: 'x <- c(2, 0.5, 2)      # doubles, halves, doubles\nmean(x)                # 1.5: looks like growth of 50 % a step\nexp(mean(log(x)))      # 1.26: the real growth a step',
                md: 'Overall the population grew 2 × 0.5 × 2 = 2 times in three steps, and 1.26 × 1.26 × 1.26 = 2. But 1.5 × 1.5 × 1.5 = 3.4: wrong.' }
            ] },
          { type: 'frames', items: [
            'The mean resting heart rate of students who train was ___ bpm, and the median was ___ bpm.',
            'The median was used because the data contain an extreme value of ___.',
            'The mode is the only average for ___ data, such as blood group.'
          ] }
        ] },

      /* ================= 3 · Look before you test (Part C) ================= */
      { id: 'look', title: 'Look before you test',
        lede: 'Before any calculation, look at your data: what kind it is, how it is spread, and whether any value is odd.',
        blocks: [
          { type: 'goal', md: 'Sort data into continuous, discrete and categorical, choose the graph that fits, and check an outlier with a box plot.' },
          { type: 'concept', title: 'Three kinds of data',
            md: 'How you get a value decides its kind.\n\n' +
              '- **Continuous**: __measured__ on a scale, and it can take any value in a range. Height, mass, time, hours of exercise.\n' +
              '- **Discrete**: __counted__, so whole numbers only. Stomata in a field of view, seeds in a pod.\n' +
              '- **Categorical**: __named groups__, not numbers. Blood group (A, B, AB or O); in a team or not. Some categories have an order: low, medium, high.\n\n' +
              'Continuous and discrete data are numbers (quantitative). Categorical data are words (qualitative).' },
          { type: 'analogy', md: 'A ruler gives continuous data: any length is possible. A tally counter gives discrete data: 4 or 5, never 4.5. A register gives categorical data: each student is ticked in exactly one box.' },
          { type: 'note', title: 'Two meanings of “discrete”',
            md: '**In statistics** (this course, your IA and your EE), *discrete* means counted numbers, and blood group is *categorical*. These are the words that choose your graph and your test.\n\n' +
              '**In genetics**, the IB guide (D3.2.14) compares *continuous* variables, such as skin colour, with *discrete* variables, such as ABO blood group. There, *discrete* means discontinuous variation: separate classes, with nothing in between. Cambridge IGCSE calls it *discontinuous variation*.\n\n' +
              'Both meanings say *separate*: separate numbers, or separate groups. So when you describe variation in genetics, write that blood group is discrete (discontinuous). When you choose a graph or a test, call it categorical.' },
          { type: 'note', title: 'And resting heart rate?',
            md: 'Strictly, it is a count: beats in 60 seconds. But a rate can take any value (72.5 bpm from a 30-second count), and a count with many possible values behaves like a measurement. So this course, like most biologists, treats it as continuous.' },
          { type: 'filltable', id: 'ib-kinds', gate: true, title: 'Continuous, discrete or categorical?', rowLabel: 'Variable',
            md: 'Choose the kind of each variable: four from the `students` table, and two new ones.',
            key: 'data.frame(label = c("resting_hr (bpm)", "exercise_h (hours a week)", "abo (blood group)", "trains (Yes or No)", "Stomata counted in a field of view", "Abundance: rare, occasional, frequent or abundant"), kind = c("continuous", "continuous", "categorical", "categorical", "discrete", "categorical"))',
            fields: [{ key: 'kind', label: 'Kind', options: ['continuous', 'discrete', 'categorical'] }],
            pass: 'Measured: continuous. Counted: discrete. Named groups, even groups in an order: categorical.',
            tip: 'Ask: is it measured, counted, or a named group?' },
          { type: 'rplot', title: 'The kind of data chooses the graph',
            md: 'Choose a column. R draws a **histogram** for continuous data (the bars touch, because the scale has no gaps) and a **bar chart** for categorical data (the bars stand apart).',
            pickers: [{ id: 'v', label: 'Column', values: [{ v: 'resting_hr', t: 'resting_hr (continuous)' }, { v: 'exercise_h', t: 'exercise_h (continuous)' }, { v: 'abo', t: 'abo (categorical)' }, { v: 'trains', t: 'trains (categorical)' }], 'default': 'resting_hr' }],
            code: [
              'v <- "{{v}}"',
              'lab <- c(resting_hr = "Resting heart rate / bpm", exercise_h = "Exercise / hours per week", abo = "Blood group", trains = "Trains in a sports team?")[[v]]',
              'd <- data.frame(x = students[[v]])',
              'if (is.numeric(d$x)) {',
              '  ggplot(d, aes(x = x)) +',
              '    geom_histogram(binwidth = if (v == "resting_hr") 6 else 1, boundary = if (v == "resting_hr") 54 else 0, closed = "left", fill = "#9DB9DC", colour = "white") +',
              '    labs(x = lab, y = "Number of students", title = .lr_wrap("Continuous: a histogram. The bars touch.")) +',
              THEME,
              '} else {',
              '  ggplot(d, aes(x = x)) +',
              '    geom_bar(fill = "#9FD8B5", width = 0.6) +',
              '    labs(x = lab, y = "Number of students", title = .lr_wrap("Categorical: a bar chart. The bars stand apart.")) +',
              THEME,
              '}'
            ].join('\n'), w: 600, h: 380 },
          { type: 'story', id: 'ib-box', gate: true, title: 'A box plot, piece by piece', w: 640, h: 330, alt: 'A box-and-whisker plot built step by step over 21 resting heart rates, with one outlier',
            scene: SC.box,
            steps: [
              { title: '21 readings', show: ['axis', 'dots'],
                md: 'The 20 students who do not train, plus the reading of 112 bpm from the notebook. Each dot is one reading.\n\nA **box-and-whisker plot** shows six things about data like these. Here they are, one at a time.' },
              { title: '1 · The median', show: ['median'],
                md: 'The middle value: the 11th of the 21 readings. The **median** is __78 bpm__.' },
              { title: '2 and 3 · The quartiles', show: ['q'],
                md: 'The **first quartile (Q1)** has a quarter of the values below it: __71 bpm__. The **third quartile (Q3)** has three quarters below it: __84 bpm__.' },
              { title: 'The box: the middle half', show: ['box'],
                md: 'The box goes from Q1 to Q3: half of the readings are inside it. Its length is the **interquartile range (IQR)**: 84 − 71 = __13 bpm__.',
                analogy: 'Line 21 students up by heart rate. Send away the first quarter and the last quarter of the queue. The box is the middle half that stays.' },
              { title: 'The fence', show: ['fence'],
                md: 'The IB rule (D3.2.15): a value is an **outlier** if it is more than 1.5 × IQR above Q3, or below Q1.\n\n84 + 1.5 × 13 = __103.5 bpm__. (Below: 71 − 19.5 = 51.5 bpm.)' },
              { title: '4, 5 and 6 · Minimum, maximum, outlier', show: ['whiskers', 'out'],
                md: 'The whiskers reach the lowest and highest values inside the fences: the **minimum** (62) and the **maximum** (93). 112 is beyond the fence, so it is drawn on its own: an **outlier**.' },
              { title: 'Check it before you remove it', show: ['note'], focus: ['note', 'out'],
                md: 'An outlier is not always a mistake. Look for a reason.\n\nHere, the notebook says __measured straight after PE__: it is not a resting heart rate. Leave it out, and say why in your method. With no reason, keep it, and report it.' }
            ] },
          { type: 'exercise', id: 'ib-fence', gate: true, title: 'Your turn · the fence',
            task: '`quantile()` gives the minimum, Q1, median, Q3 and maximum. `IQR()` gives Q3 − Q1. Run the code. Then add a last line that works out the upper fence: **Q3 + 1.5 × IQR**.',
            code: '# The 20 students who do not train, and the reading after PE\nno_train <- students$resting_hr[students$trains == "No"]\nreadings <- c(no_train, 112)\nquantile(readings)\nIQR(readings)\n# The upper fence = Q3 + 1.5 × IQR. Work it out here:\n',
            solution: 'no_train <- students$resting_hr[students$trains == "No"]\nreadings <- c(no_train, 112)\nquantile(readings)\nIQR(readings)\nquantile(readings, 0.75) + 1.5 * IQR(readings)',
            check: 'if (is.null(value) || !is.numeric(value)) "Add a last line that works out Q3 + 1.5 × IQR." else if (abs(as.numeric(value)[1] - 103.5) > 0.01) "Q3 is 84 and the IQR is 13. In R: 84 + 1.5 * 13" else TRUE',
            hint: 'Either type the numbers, `84 + 1.5 * 13`, or let R find them: `quantile(readings, 0.75) + 1.5 * IQR(readings)`',
            pass: '103.5 bpm. 112 is above it, so it is an outlier.' },
          { type: 'exercise', id: 'ib-boxplot', gate: true, title: 'Your turn · box plots of both groups',
            task: 'Run the code: R draws a box plot for each group. Then label the axes. Add ` +` at the end of the last line, and a new line: `labs(x = "Trains in a sports team?", y = "Resting heart rate / bpm")`',
            code: 'ggplot(students, aes(x = trains, y = resting_hr)) +\n  geom_boxplot()',
            solution: 'ggplot(students, aes(x = trains, y = resting_hr)) +\n  geom_boxplot() +\n  labs(x = "Trains in a sports team?", y = "Resting heart rate / bpm")',
            check: 'if (!has("labs(")) "Add + at the end of geom_boxplot(), then a new line with labs( )." else if (!grepl("bpm", code, fixed = TRUE)) "Give the y-axis its unit: y = \\"Resting heart rate / bpm\\"." else TRUE',
            pass: 'Every axis needs a label with its unit. Neither group has an outlier: the reading after PE is not in the table.' },
          { type: 'mcq', id: 'ib-outlier-mcq', gate: true, q: 'Your box plot shows one value beyond the fence. What do you do?',
            opts: [
              { t: 'Look for a reason in your notes. Remove it only if there is one, and say why in the method.', ok: true, why: 'The IB asks you to justify removing or keeping an outlier (Inquiry 2).' },
              { t: 'Delete it: outliers are mistakes.', why: 'Some outliers are real. Deleting them without a reason hides real variation.' },
              { t: 'Keep it, and say nothing.', why: 'Keeping it can be right, but say that you checked it, and why you kept it.' },
              { t: 'Delete the whole group.', why: 'One odd value is no reason to lose all the other data.' }
            ] },
          { type: 'frames', items: [
            'The reading of ___ bpm is an outlier: it is more than 1.5 × IQR above the third quartile (upper fence ___ bpm).',
            'It was removed because ___.',
            'It was kept because no error was found in the method.'
          ] }
        ] },

      /* ================= 4 · Spread: the normal distribution and SD (Part D.1) ================= */
      { id: 'sd', title: 'Spread: the normal distribution and SD',
        lede: 'Two groups can have the same mean and a very different spread. The standard deviation measures the spread.',
        blocks: [
          { type: 'goal', md: 'Recognise a normal distribution, explain what one standard deviation means, and show SD as error bars.' },
          { type: 'story', id: 'ib-normal', gate: true, title: 'The bell and the standard deviation', w: 640, h: 340, alt: 'A histogram of 40 resting heart rates with a bell-shaped curve, the mean, and bands one and two standard deviations wide',
            scene: SC.normal,
            steps: [
              { title: '40 resting heart rates', show: ['axes', 'hist'],
                md: 'A **histogram** of the whole class: the number of students (the frequency) in each class of heart rate. Each bar is 6 bpm wide. The bars touch, because heart rate is continuous.' },
              { title: 'The bell shape', show: ['bell'],
                md: 'Most students are near the middle. There are fewer and fewer towards both ends, and the two sides are roughly the same. This shape is a **normal distribution**.',
                analogy: 'Jeju farms grade mandarins by size. Most are medium. A few are very small or very large. The counts form a bell.' },
              { title: 'The mean', show: ['mean'],
                md: 'The mean is __73.8 bpm__. In a normal distribution, the mean is in the middle, under the peak.' },
              { title: 'One standard deviation', show: ['sd1'], pan: 'mean',
                md: 'The **standard deviation (SD)** measures the spread: how far values typically are from the mean. Here it is __8.6 bpm__.\n\nMean ± 1 SD is 65.2 to 82.4 bpm. In a normal distribution, about __68 %__ of values lie in this range: about 2 in 3. In this class: 28 of 40 (70 %).' },
              { title: 'Two standard deviations', show: ['sd2'], pan: 'mean',
                md: 'Mean ± 2 SD is 56.5 to 91.0 bpm: about __95 %__ of values, 19 in 20. In this class: 38 of 40.\n\nThese percentages hold only for a normal distribution.' },
              { title: 'Small SD, large SD', hide: ['hist', 'bell', 'mean', 'sd1', 'sd2'], show: ['spread'],
                md: 'Two imagined groups with the same mean, 75 bpm. A small SD: the values are close to the mean. A large SD: the values are widely spread.',
                analogy: 'Two boxes of mandarins, both with a mean mass of 80 g. In box A, every fruit is 75–85 g. In box B, they range from 50 to 110 g. Same mean, different spread.' },
              { title: 'Check each group on its own', hide: ['spread'], show: ['groups'],
                md: 'Later you will compare the two groups with a t-test. It needs a roughly normal distribution __in each group__, so check each group on its own, never the two mixed together.' }
            ] },
          { type: 'exercise', id: 'ib-sd', gate: true, title: 'Your turn · SD of each group',
            task: 'Add two more columns inside `summarise( )`: the SD, `sd = sd(resting_hr)`, and the number of students, `n = n()`. Separate them with commas.',
            code: 'students %>%\n  group_by(trains) %>%\n  summarise(mean = mean(resting_hr))',
            solution: 'students %>%\n  group_by(trains) %>%\n  summarise(mean = mean(resting_hr), sd = sd(resting_hr), n = n())',
            check: 'v <- tryCatch(as.data.frame(value), error = function(e) NULL); if (is.null(v) || !("mean" %in% names(v))) "Keep the summarise( ) line with mean = mean(resting_hr)." else if (!("sd" %in% names(v))) "Add sd = sd(resting_hr) inside summarise( )." else if (!("n" %in% names(v))) "Add n = n() inside summarise( )." else if (!isTRUE(all.equal(v$sd, as.numeric(tapply(students$resting_hr, students$trains, sd))))) "Use sd(resting_hr) for the sd column." else TRUE',
            hint: '`summarise(mean = mean(resting_hr), sd = sd(resting_hr), n = n())`',
            pass: 'No training: 77.0 ± 7.75 bpm. Training: 70.55 ± 8.40 bpm. n = 20 in each. The spreads are similar.' },
          { type: 'rplot', title: 'Each group on its own',
            md: 'Choose a group. R draws its histogram and the normal curve with the same mean and SD (in red). Each group is roughly bell-shaped.',
            pickers: [{ id: 'g', label: 'Group', values: [{ v: 'No', t: 'Students who do not train' }, { v: 'Yes', t: 'Students who train' }], 'default': 'No' }],
            code: [
              'g <- "{{g}}"',
              'd <- students[students$trains == g, ]',
              'm <- mean(d$resting_hr); s <- sd(d$resting_hr)',
              'bell <- data.frame(x = seq(45, 105, 0.5))',
              'bell$y <- dnorm(bell$x, m, s) * nrow(d) * 6',
              'ggplot(d, aes(x = resting_hr)) +',
              '  geom_histogram(binwidth = 6, boundary = 54, closed = "left", fill = if (g == "No") "#9DB9DC" else "#9FD8C8", colour = "white") +',
              '  geom_line(data = bell, aes(x = x, y = y), colour = "#B42318", linewidth = 1) +',
              '  labs(x = "Resting heart rate / bpm", y = "Number of students",',
              '       title = .lr_wrap(paste0(if (g == "No") "Do not train" else "Train", ": mean ", sprintf("%.2f", m), ", SD ", sprintf("%.2f", s), " bpm (n = ", nrow(d), ")"))) +',
              THEME
            ].join('\n'), w: 600, h: 380 },
          { type: 'exercise', id: 'ib-sdbars', gate: true, title: 'Your turn · SD as error bars',
            task: 'The IB asks you to show SD as **error bars** (Tool 3). Run the code: the bars only go down. Change `ymax = mean` to `ymax = mean + sd`, so that each bar shows mean ± 1 SD.',
            code: 'summary_hr <- students %>%\n  group_by(trains) %>%\n  summarise(mean = mean(resting_hr), sd = sd(resting_hr))\n\nggplot(summary_hr, aes(x = trains, y = mean)) +\n  geom_point(size = 3) +\n  geom_errorbar(aes(ymin = mean - sd, ymax = mean), width = 0.15) +\n  labs(x = "Trains in a sports team?", y = "Mean resting heart rate / bpm")',
            solution: 'summary_hr <- students %>%\n  group_by(trains) %>%\n  summarise(mean = mean(resting_hr), sd = sd(resting_hr))\n\nggplot(summary_hr, aes(x = trains, y = mean)) +\n  geom_point(size = 3) +\n  geom_errorbar(aes(ymin = mean - sd, ymax = mean + sd), width = 0.15) +\n  labs(x = "Trains in a sports team?", y = "Mean resting heart rate / bpm")',
            check: 'if (!has("ymax=mean+sd")) "Change ymax = mean to ymax = mean + sd." else if (!has("ymin=mean-sd")) "Keep ymin = mean - sd." else TRUE',
            pass: 'Each bar now runs from mean − 1 SD to mean + 1 SD. In your caption, say what the bars show: “error bars = ± 1 SD (n = 20)”.' },
          { type: 'mcq', id: 'ib-sd-mcq', gate: true, q: 'A group’s resting heart rates are normally distributed, with mean 77 bpm and SD 8 bpm. About 2 in 3 students lie between…',
            opts: [
              { t: '69 and 85 bpm', ok: true, why: 'Mean ± 1 SD: 77 − 8 and 77 + 8. About 68 % of values lie here.' },
              { t: '61 and 93 bpm', why: 'That is mean ± 2 SD: about 95 %, 19 in 20.' },
              { t: '77 and 85 bpm', why: 'That is only one side of the mean: about 34 %.' },
              { t: '73 and 81 bpm', why: 'That is ± half an SD.' }
            ] },
          { type: 'extension', title: 'A normality test (beyond the IB guide)',
            md: 'The Shapiro–Wilk test checks whether one group is roughly normal. Its H₀ is *the data are normal*. So p > 0.05 means __no evidence against normality__: it does not prove that the data are normal. With about 15 values or fewer, the test can miss a lot. Look at the histogram too, and test each group on its own.',
            blocks: [
              { type: 'example', title: 'Try it in any exercise box', code: 'shapiro.test(students$resting_hr[students$trains == "No"])\nshapiro.test(students$resting_hr[students$trains == "Yes"])',
                md: 'p = 0.87 and p = 0.54: no evidence against normality in either group.' }
            ] },
          { type: 'frames', items: [
            'The mean resting heart rate of students who train was ___ bpm (SD ___ bpm, n = ___).',
            'The data are roughly normally distributed: the histogram of each group is ___.',
            'The error bars show ± 1 standard deviation (n = ___).'
          ] }
        ] },

      /* ================= 5 · How sure is the mean? SE (Parts D.2, D.3) ================= */
      { id: 'se', title: 'How sure is the mean? SE',
        lede: 'SD describes the students. The standard error describes the mean: how precisely you know it.',
        blocks: [
          { type: 'goal', md: 'Explain the difference between SD and SE, calculate SE in R, and say what an error bar can and cannot show.' },
          { type: 'story', id: 'ib-se', gate: true, title: 'The spread of the means', w: 640, h: 345, alt: 'Twenty students’ heart rates spread widely; the means of a hundred imagined classes pile up close together',
            scene: SC.se,
            steps: [
              { title: '20 students, 20 readings', show: ['axis', 'ind'],
                md: 'The 20 students who do not train. Each dot is one student’s resting heart rate.' },
              { title: 'Their spread: SD', show: ['sdbar'],
                md: 'The SD is __7.75 bpm__: a typical distance between one student and the mean. The SD describes the __students__.' },
              { title: 'Their mean', show: ['mean1'],
                md: 'Their mean is __77.0 bpm__. But 20 other students who do not train would give a slightly different mean. So how sure can you be of 77.0?' },
              { title: 'Imagine 100 classes', hide: ['ind', 'sdbar'], show: ['pile20'],
                md: 'Imagine 100 classes, and in each one, 20 students who do not train. (R imagined them for you.) Each dot is now one class’s __mean__.\n\nThe means pile up close together: much closer than the students did.' },
              { title: 'Their spread: SE', show: ['sebar'],
                md: 'The spread of the means is the **standard error (SE)**: SE = SD ÷ √n = 7.75 ÷ √20 = __1.7 bpm__. The SE describes how precisely you know the __mean__.',
                analogy: 'One arrow can land far from the centre of the target. The average position of 20 arrows lands much closer to it.' },
              { title: 'More students, smaller SE', hide: ['pile20'], show: ['pile80'], focus: ['pile80', 'sebar', 'axis', 'mean1'],
                md: 'With 80 students in each class, the means pile up even closer: SE = 7.75 ÷ √80 = __0.9 bpm__. Four times as many students halve the SE.\n\nThe SD does not shrink: the students vary just as much.' },
              { title: 'Which bar do you draw?', hide: ['pile80'], show: ['ind', 'sdbar'], focus: ['ind', 'sdbar', 'sebar', 'axis'],
                md: 'An SD bar shows how much the students vary. An SE bar shows how precisely the mean is known. They answer different questions, so your caption must say which bar you drew. Never choose SE because it looks smaller.' }
            ] },
          { type: 'exercise', id: 'ib-se-calc', gate: true, title: 'Your turn · the SE',
            task: '`sqrt()` is the square root. Work out the SE of the students who do not train: their SD divided by √n.',
            code: 'no_train <- students$resting_hr[students$trains == "No"]\nsd(no_train)\nlength(no_train)\n# SE = SD ÷ √n. Work it out here:\n',
            solution: 'no_train <- students$resting_hr[students$trains == "No"]\nsd(no_train)\nlength(no_train)\nsd(no_train) / sqrt(length(no_train))',
            check: 'se <- sd(students$resting_hr[students$trains == "No"]) / sqrt(20); if (is.null(value) || !is.numeric(value)) "Add a last line: the SD divided by the square root of n." else if (abs(as.numeric(value)[1] - sd(students$resting_hr[students$trains == "No"]) / 20) < 0.001) "Divide by the square root of n, sqrt(20), not by 20." else if (abs(as.numeric(value)[1] - se) > 0.001) "Use sd(no_train) / sqrt(length(no_train))." else TRUE',
            hint: '`sd(no_train) / sqrt(length(no_train))`, or `sd(no_train) / sqrt(20)`',
            pass: 'SE = 1.73 bpm. The SD was 7.75 bpm: √20 is about 4.5, so the SE is about a quarter of the SD.' },
          { type: 'rplot', title: 'Three kinds of error bar, same data',
            md: 'Choose the bars. The means do not change: only the question the bars answer.',
            pickers: [{ id: 'b', label: 'Error bars', values: [{ v: 'sd', t: '± 1 SD' }, { v: 'se', t: '± 1 SE' }, { v: 'ci', t: '95 % confidence interval' }], 'default': 'sd' }],
            code: [
              'b <- "{{b}}"',
              's <- students %>% group_by(trains) %>%',
              '  summarise(mean = mean(resting_hr), sd = sd(resting_hr), n = n()) %>%',
              '  mutate(se = sd / sqrt(n), ci = qt(0.975, n - 1) * se)',
              's$half <- s[[b]]',
              'lab <- c(sd = "± 1 SD", se = "± 1 SE", ci = "95 % confidence interval")[[b]]',
              'ggplot(s, aes(x = trains, y = mean)) +',
              '  geom_point(size = 3) +',
              '  geom_errorbar(aes(ymin = mean - half, ymax = mean + half), width = 0.12) +',
              '  coord_cartesian(ylim = c(60, 90)) +',
              '  labs(x = "Trains in a sports team?", y = "Mean resting heart rate / bpm",',
              '       title = .lr_wrap(paste0("Error bars: ", lab, ", n = 20 a group"))) +',
              THEME
            ].join('\n'), w: 560, h: 380,
            caption: 'The SD bars overlap a lot. The SE bars do not overlap. The 95 % confidence intervals overlap by about 1 bpm. Yet a t-test (stage 8) gives p = 0.016 (stage 6 explains p): a significant difference. __Overlap never decides: a test does.__' },
          { type: 'mcq', id: 'ib-se-mcq', gate: true, q: 'You measure 80 students in each group instead of 20. What happens?',
            opts: [
              { t: 'The SE gets smaller; the SD stays about the same', ok: true, why: 'SE = SD ÷ √n. More students make the mean more precise, but they vary as much as before.' },
              { t: 'The SD gets smaller; the SE stays the same', why: 'The other way round. Students do not vary less because you measured more of them.' },
              { t: 'Both get smaller', why: 'Only the SE. The SD describes the students, and they vary as much as before.' },
              { t: 'Both get bigger', why: 'More data never makes the mean less precise.' }
            ] },
          { type: 'mcq', id: 'ib-overlap-mcq', gate: true, q: 'The error bars of two groups overlap. What can you write?',
            opts: [
              { t: 'The graph alone cannot show whether the groups differ: a statistical test is needed.', ok: true, why: 'Overlap does not show a difference, and it does not rule one out. The test decides.' },
              { t: 'There is no significant difference.', why: 'Only a test can say that. Here the 95 % CIs overlap, yet p = 0.016.' },
              { t: 'There is a significant difference.', why: '“Significant” needs a test, never a graph.' },
              { t: 'The means are equal.', why: 'Overlap never shows that means are equal.' }
            ] },
          { type: 'extension', title: 'The 95 % confidence interval (beyond the IB guide)',
            md: 'A **95 % confidence interval (CI)** is about mean ± 2 SE. If the study were repeated many times, about 95 in 100 of these intervals would contain the true mean. The IB guide asks for SD and SE, not CIs, but many papers use them.\n\nNon-overlapping 95 % CIs mean p < 0.05. Overlapping CIs do __not__ mean “no difference”: here they overlap by about 1 bpm, and p = 0.016.',
            blocks: [
              { type: 'example', title: 'Try it in any exercise box', code: 't.test(students$resting_hr[students$trains == "No"])$conf.int\nt.test(students$resting_hr[students$trains == "Yes"])$conf.int',
                md: 'No training: 73.4 to 80.6 bpm. Training: 66.6 to 74.5 bpm.' }
            ] },
          { type: 'frames', items: [
            'The error bars show ± 1 ___ (n = ___).',
            'The SE (___ bpm) is smaller than the SD (___ bpm) because it describes the mean, not the individual students.',
            'The error bars overlap, so the graph alone cannot show a difference; a ___ gave p = ___.'
          ] }
        ] },

      /* ================= 6 · Is it real, or is it chance? (the p-value) ================= */
      { id: 'p-value', title: 'Is it real, or is it chance?',
        lede: 'Students who train had a lower mean heart rate. Is that real, or chance? Every statistical test answers with one number: the p-value.',
        blocks: [
          { type: 'goal', md: 'Explain what a p-value is, and decide whether to reject the null hypothesis.' },
          { type: 'story', id: 'ib-coin', gate: true, title: 'The p-value, with a coin', w: 640, h: 350, alt: 'How often a fair coin gives each number of heads in 100 tosses',
            scene: SC.coin,
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
                md: 'The **p-value** answers one question: __if the coin were fair, how often would chance alone give a result as far from 50 as yours?__\n\n- 53 heads: p = 0.62, so __62 times in 100__. Chance does this all the time. Keep H₀.\n- 80 heads: p = 0.000000001, about __1 time in a billion__. Reject H₀.\n\nThe rule in biology: p __below 0.05__ (5 times in 100, or 1 in 20) means reject H₀. The result is **statistically significant**.' },
              { title: 'What p < 0.05 does not mean', show: [],
                md: 'It does not __prove__ anything. Even when H₀ is true, chance gives p < 0.05 one time in 20.\n\nAnd p > 0.05 does not prove H₀ is true. It means only that this evidence is not strong enough.',
                analogy: 'A court that says *not guilty* has not proved the person innocent. It has decided the evidence was not strong enough.' }
            ] },
          { type: 'concept', title: 'Every test, in three steps',
            md: 'The χ² test, the t-test and a correlation all work like the coin, in three steps. Take the class: in stage 2 you found a mean resting heart rate of 77.00 bpm for students who do not train, and 70.55 bpm for students who train. That is 6.45 bpm lower.\n\n- **Pretend:** training does nothing, so the 6.45 bpm difference is just chance. That is **H₀**.\n- **Check:** in that pretend world, how often would chance alone give a difference as big as 6.45 bpm? That is the **p-value**. The t-test in stage 8 works it out: p = 0.016, or 16 times in 1,000.\n- **Decide:** that is rare, below 0.05, so stop pretending: reject H₀. The difference is significant.\n\nTo remember it: **too rare for chance? Stop pretending.**' },
          { type: 'exercise', id: 'ib-binom', gate: true,
            task: 'R can do the whole coin story in one line: `binom.test(heads, tosses)`. Run it for 53 heads and find the **p-value** in the output. Then change 53 to **80**, run it again, and press **Check my answer**.',
            code: '# 53 heads in 100 tosses: is the coin fair?\nbinom.test(53, 100)',
            solution: 'binom.test(80, 100)',
            check: 'if (!inherits(value, "htest")) "Keep binom.test( ) as the last line, so R prints its result." else if (value$statistic != 80) "Change 53 to 80 heads." else if (value$parameter != 100) "Keep 100 tosses." else TRUE',
            hint: 'Only one number changes: `binom.test(80, 100)`.',
            pass: 'For 80 heads, p = 1.116e-09. That is 0.000000001116: far below 0.05, so you reject H₀.' },
          { type: 'interpret', title: 'Reading R’s answer',
            md: 'Look for the line `p-value = …`.\n\n- `p-value = 0.6173` for 53 heads: more than 0.05, so keep H₀.\n- `p-value = 1.116e-09` for 80 heads. The `e-09` means "move the decimal point 9 places left": 0.000000001116. Less than 0.05, so reject H₀.\n\nR also prints the other hypothesis: `true probability of success is not equal to 0.5`. That is H₁, the alternative hypothesis.' },
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
        ] },

      /* ================= 7 · Which test? (Parts E, F) ================= */
      { id: 'which', title: 'Which test?',
        lede: 'The kind of data chooses the test. Three questions cover almost every IB practical.',
        blocks: [
          { type: 'goal', md: 'Choose between the χ² test, the t-test and a correlation, and check each test’s conditions.' },
          { type: 'story', id: 'ib-which', gate: true, title: 'Choosing a test', w: 640, h: 362, alt: 'A decision chart: counts in categories lead to the chi-squared test, a measurement in two groups to the t-test, two measurements on each individual to correlation',
            scene: SC.which,
            steps: [
              { title: 'Start with your data', show: ['q', 'arrows'],
                md: 'Before you choose a test, look at what you measured.',
                analogy: 'Choosing a test is like choosing a tool: a ruler for length, scales for mass. The job chooses the tool.' },
              { title: 'Counts in categories', show: ['b1'],
                md: 'Each quadrat, plant or person goes into a **category**: present or absent, purple or white. You count how many are in each. Use the **χ² test** (stage 9).' },
              { title: 'One measurement, two groups', show: ['b2'],
                md: 'You measure a number for each individual, in two groups: resting heart rate in students who train and who do not. Use the **t-test** (stage 8).' },
              { title: 'Two measurements on each individual', show: ['b3'],
                md: 'You measure two numbers for each individual: hours of exercise __and__ resting heart rate. Is one related to the other? Use a **correlation** (stage 10).' },
              { title: 'The t-test’s conditions', show: ['tcond'], focus: ['b2', 'tcond'],
                md: 'The standard t-test needs each group to be roughly **normal** (stage 4), and the two groups to have a **similar spread** (similar SDs). If the SDs are very different, use **Welch’s t-test**. R’s `t.test()` does Welch’s unless you add `var.equal = TRUE`.' },
              { title: 'The χ² test’s condition', show: ['ccond'], focus: ['b1', 'ccond'],
                md: 'Every **expected** count must be at least 5. And use counts, never percentages.' },
              { title: 'Beyond the IB', show: ['shelf'],
                md: 'Data far from normal? Three or more groups? There are tests for these too. They are not in the IB guide, so they are on the shelf below, for when you need them.' }
            ] },
          { type: 'filltable', id: 'ib-choose', gate: true, title: 'Choose the test', rowLabel: 'The question',
            key: 'data.frame(label = c("Is the mass of snails different on the two sides of a wall?", "Are two plant species found in the same quadrats more often than chance predicts?", "Does leaf length increase with the light intensity where each leaf grew?", "Is stomatal density different in sun leaves and shade leaves?", "Does the number of daisies per quadrat fall as the distance from a path rises?", "Is the ratio of purple to white flowers different from 3 : 1?"), test = c("t-test", "χ² test", "correlation", "t-test", "correlation", "χ² test"))',
            fields: [{ key: 'test', label: 'Test', options: ['χ² test', 't-test', 'correlation'] }],
            pass: 'Counts in categories: χ². A measurement in two groups: t-test. Two measurements on each individual: correlation.',
            tip: 'Ask: categories, two groups, or two measurements on each individual?' },
          { type: 'exercise', id: 'ib-sd-ratio', gate: true, title: 'Your turn · similar spread?',
            task: 'A rule of thumb: if the larger SD is less than __twice__ the smaller, the spreads are similar enough for the standard t-test. Add a last line that divides the larger SD by the smaller: `max(sds) / min(sds)`.',
            code: '# The SD of each group\nsds <- tapply(students$resting_hr, students$trains, sd)\nsds\n',
            solution: 'sds <- tapply(students$resting_hr, students$trains, sd)\nsds\nmax(sds) / min(sds)',
            check: 'r <- max(tapply(students$resting_hr, students$trains, sd)) / min(tapply(students$resting_hr, students$trains, sd)); if (is.null(value) || length(value) != 1) "Add a last line: max(sds) / min(sds)" else if (abs(as.numeric(value) - r) > 0.001) "Divide the larger SD by the smaller: max(sds) / min(sds)" else TRUE',
            pass: '1.08: far below 2. The spreads are similar, so the standard t-test fits.' },
          { type: 'mcq', id: 'ib-welch-mcq', gate: true, q: 'Two groups of heart rates are roughly normal. Their SDs are 3 bpm and 10 bpm. Which test?',
            opts: [
              { t: 'Welch’s t-test', ok: true, why: '10 is more than twice 3: the spreads differ. Welch’s t-test does not need equal spread.' },
              { t: 'The standard t-test', why: 'It needs similar spreads, and 10 bpm is more than three times 3 bpm.' },
              { t: 'The χ² test', why: 'χ² is for counts in categories. Heart rate is a measurement.' },
              { t: 'A correlation', why: 'A correlation needs two measurements on each individual, not one measurement in two groups.' }
            ] },
          { type: 'extension', title: 'The shelf: tests beyond the IB',
            md: 'You will not need these for the IB exams. You may need them for an IA or an Extended Essay:\n\n- **Mann–Whitney U test**: like the t-test, but for data far from normal. `wilcox.test(resting_hr ~ trains, data = students)`\n- **ANOVA**: three or more groups. `summary(aov(resting_hr ~ abo, data = students))`\n- **A correction for multiple comparisons**: for t-tests between several pairs. Every extra test is another chance of a false “significant” result. `pairwise.t.test(students$resting_hr, students$abo, p.adjust.method = "bonferroni")` R multiplies each p by the number of tests (at most 1), so you still compare it with 0.05.\n- **Spearman’s rank correlation**: for a relationship that is not a straight line. `cor.test(students$exercise_h, students$resting_hr, method = "spearman")`',
            blocks: [
              { type: 'example', title: 'Try them in any exercise box', code: 'wilcox.test(resting_hr ~ trains, data = students, exact = FALSE)\nsummary(aov(resting_hr ~ abo, data = students))\npairwise.t.test(students$resting_hr, students$abo, p.adjust.method = "bonferroni")',
                md: 'Mann–Whitney: p = 0.014, the same decision as the t-test. ANOVA by blood group: p = 0.75. The 6 pairs of blood groups, corrected: every p = 1, so no pair differs. There is no evidence that blood group is linked to resting heart rate, which is what biology expects.' }
            ] },
          { type: 'note', title: 'The Write-Up Lab chooses with you',
            md: 'The Write-Up Lab’s **Find your test** asks you a few questions about your own investigation, then names the test. [Open Statistical tests in the Write-Up Lab](https://nlcsbiology.com/write-up-lab/#/part/stats).' },
          { type: 'frames', items: [
            'The data are ___ in ___ groups, so a ___ was used.',
            'The larger SD (___) is less than twice the smaller (___), so the spreads are similar and the standard t-test was used.'
          ] }
        ] },

      /* ================= 8 · The t-test ================= */
      { id: 't-test', title: 'The t-test',
        lede: 'Students who train had a mean resting heart rate 6.45 bpm lower. The t-test asks: is that difference too big to be chance?',
        blocks: [
          { type: 'goal', md: 'Explain what t measures, run a t-test in R, and report the result.' },
          { type: 'story', id: 'ib-t', gate: true, title: 'Signal and noise', w: 640, h: 350, alt: 'Two rows of dots, one per group, with their means; then the t distribution with its critical values',
            scene: SC.t,
            steps: [
              { title: 'Two groups', show: ['axis', 'labels', 'dotsNo', 'dotsYes'],
                md: 'The resting heart rates of the 20 students who do not train (blue) and the 20 who train (green). Each dot is one student.' },
              { title: 'Two means', show: ['means', 'diff'],
                md: 'Mean 77.00 bpm without training, 70.55 bpm with training: a difference of __6.45 bpm__.' },
              { title: 'Start with the boring answer', show: ['h0'],
                md: '**H₀**: there is no difference between the mean resting heart rates of all students who train and all who do not. The 6.45 bpm is only chance: these 40 students happened to be like this.',
                analogy: 'Like the coin: assume it is fair until the evidence is strong.' },
              { title: 'The noise', show: ['sd'], focus: ['sd', 'dotsNo', 'dotsYes', 'means'],
                md: 'The dots spread widely: SD 7.75 and 8.40 bpm. With so much spread, two samples could differ by chance.\n\nThe **SE of the difference** measures that noise. It combines both SDs and both group sizes: here __2.56 bpm__.' },
              { title: 'Signal ÷ noise = t', show: ['tcalc'],
                md: '**t** is one number: the difference divided by the size of difference that chance alone typically makes (the SE of the difference). t = 6.45 ÷ 2.56 = __2.52__: the difference is 2.5 times bigger than chance typically makes. The bigger t is, the more rarely chance alone would give it.\n\nThe name comes from “Student”, the pen name of William Gosset, a scientist at the Guinness brewery in Dublin, who published the test in 1908.',
                analogy: 'Hearing a friend in the canteen. A loud voice (a big difference) in a quiet room (little spread, many students) is easy to hear. A whisper in a noisy room is not.' },
              { title: 'How big is big enough?', hide: ['axis', 'labels', 'dotsNo', 'dotsYes', 'means', 'diff', 'sd', 'h0', 'tcalc'], show: ['tdist', 'tcrit'],
                md: 'If H₀ were true, t would usually be close to 0. With 38 **degrees of freedom** (df = 40 students − 2 groups), t lands beyond ± 2.02 less than 5 % of the time. 2.02 is the **critical value**.\n\nBoth red ends count, because a difference could go either way: training could have lowered heart rate, or raised it. That makes the test **two-tailed**. It is the normal t-test.' },
              { title: 'The decision', show: ['tmark'],
                md: 't = 2.52 is beyond 2.02, so p < 0.05. R gives __p = 0.016__: 16 times in 1,000. Reject H₀. The difference is **statistically significant**. ([What p means](https://nlcsbiology.com/learn-r/ib.html#p-value).)' },
              { title: 'What it does not show', show: ['concl'], focus: ['concl', 'tmark'],
                md: 'The students chose their own groups, so the test does not show that training __caused__ the lower heart rate. Students with a naturally low heart rate might be more likely to join a team. An experiment that assigns students to groups could test the cause.',
                analogy: 'Umbrellas and wet streets go together. Umbrellas do not make streets wet: rain causes both.' }
            ] },
          { type: 'exercise', id: 'ib-ttest', gate: true, title: 'Your turn · the t-test in R',
            task: '`resting_hr ~ trains` means *resting heart rate, by group*. Run the code. R does Welch’s t-test unless you tell it the spreads are similar. They are (stage 7), so add `, var.equal = TRUE` before the last bracket, and run it again.',
            code: 't.test(resting_hr ~ trains, data = students)',
            solution: 't.test(resting_hr ~ trains, data = students, var.equal = TRUE)',
            check: 'if (!inherits(value, "htest")) "Keep t.test( ) as the last line." else if (grepl("Welch", value$method)) "Add var.equal = TRUE inside the brackets: the spreads are similar." else if (abs(abs(value$statistic) - 2.5233) > 0.001) "Use resting_hr ~ trains and data = students." else TRUE',
            hint: '`t.test(resting_hr ~ trains, data = students, var.equal = TRUE)`',
            pass: '“Two Sample t-test”: t = 2.52, df = 38, p = 0.016.' },
          { type: 'interpret', title: 'Reading R’s answer',
            md: '- `alternative hypothesis: true difference in means … is not equal to 0`: “not equal” means a difference in either direction counts. The test is **two-tailed**, as in the story: the normal t-test.\n- `t = 2.5233, df = 38, p-value = 0.01593`: the test result. Report t to 2 d.p. and p to 2 significant figures: t = 2.52, df = 38, p = 0.016.\n- `mean in group No 77.00, mean in group Yes 70.55`: the two means.\n- `95 percent confidence interval: 1.28 11.62`: the true difference is probably between 1.3 and 11.6 bpm. It does not include 0, which agrees with p < 0.05.' },
          { type: 'rquiz', id: 'ib-t-report', gate: true, title: 'Complete the report',
            md: 'Choose each number from R’s output.',
            key: 'tt <- t.test(resting_hr ~ trains, data = students, var.equal = TRUE); list(t = sprintf("%.2f", tt$statistic), df = as.character(tt$parameter), p = sprintf("%.3f", tt$p.value), dec = "rejected")',
            choices: 'c("2.52", "6.45", "38", "40", "0.016", "0.05", "rejected", "not rejected")',
            fields: [{ id: 't', label: 't =' }, { id: 'df', label: 'df =' }, { id: 'p', label: 'p =' }, { id: 'dec', label: 'H₀ is' }],
            pass: 'Students who train had a significantly lower mean resting heart rate (70.55 bpm) than students who do not (77.00 bpm): t = 2.52, df = 38, p = 0.016.',
            tip: 'Look at the line that starts with t =.' },
          { type: 'mcq', id: 'ib-t-mcq', gate: true, q: 'Another class: t = 0.80, df = 38, p = 0.43. What do you write?',
            opts: [
              { t: 'There is no significant difference between the means: p > 0.05, so H₀ is not rejected.', ok: true, why: 'Chance alone gives a difference this big 43 % of the time.' },
              { t: 'The means are the same.', why: 'The test cannot show that. It only finds no evidence of a difference.' },
              { t: 'There is a significant difference: t is positive.', why: 'The sign of t only shows which mean is bigger. p decides.' },
              { t: 'Training has no effect on heart rate.', why: 'Too strong: one sample, no significant difference found. That is not proof of no effect.' }
            ] },
          { type: 'frames', items: [
            'The mean resting heart rate of students who train (___ bpm) was significantly lower than that of students who do not (___ bpm): t = ___, df = ___, p = ___.',
            'p is less than 0.05, so the null hypothesis is rejected.',
            'The groups were not assigned at random, so the test does not show that ___ causes ___.'
          ] }
        ] },

      /* ================= 9 · The χ² test (C4.1.15) ================= */
      { id: 'chi', title: 'The χ² test',
        lede: 'For counts in categories. The example is the one from your C4.1 lesson: do heather and moss grow together?',
        blocks: [
          { type: 'goal', md: 'Work out expected counts, run a χ² test for association in R, and say which way the association goes.' },
          { type: 'story', id: 'ib-chi', gate: true, title: 'Heather and moss', w: 640, h: 350, alt: 'One hundred quadrats sorted into four groups, the contingency table with expected counts, observed and expected bars, and chi-squared on a number line',
            scene: SC.chi,
            steps: [
              { title: 'Do heather and moss grow together?', show: ['grid', 'legend'],
                md: '100 random quadrats on a hillside (Course Companion, p. 521). Two questions for each quadrat: heather present or absent? Moss present or absent? That gives four groups.' },
              { title: 'The contingency table', show: ['table'],
                md: 'Count the quadrats in each group, then add the totals: 64 quadrats had moss, 66 had heather.' },
              { title: 'H₀ and the expected counts', show: ['exp'], focus: ['table', 'exp'],
                md: '**H₀**: heather and moss are distributed independently. If so, 66 % of the 64 moss quadrats would also have heather: 64 × 66 ÷ 100 = __42.2__. That is the **expected count (E)**.\n\nAll four expected counts are at least 5, so the test can be used.' },
              { title: 'Observed against expected', hide: ['grid', 'legend'], show: ['bars'],
                md: 'Both species: 57 observed, 42.2 expected. Neither: 27 against 12.2. Heather and moss are found together more often than H₀ predicts.' },
              { title: 'One number: χ²', show: ['calc'],
                md: 'χ² = Σ (O − E)² ÷ E, added up over the four groups: __42.4__.\n\nSquaring stops the + and − differences cancelling. Dividing by E makes each difference fair.',
                analogy: '15 more people than expected is a lot at a bus stop where you expect 12, and nothing at a concert where you expect 1,200.' },
              { title: 'Is 42.4 too big for chance?', hide: ['bars', 'calc', 'table', 'exp'], show: ['line'],
                md: 'Degrees of freedom: (rows − 1) × (columns − 1) = 1. The critical value at p = 0.05 is __3.84__. If H₀ were true, χ² would be above 3.84 less than 1 time in 20.\n\n42.4 is far above it: p < 0.001, fewer than 1 time in 1,000. Reject H₀. ([What p means](https://nlcsbiology.com/learn-r/ib.html#p-value).)' },
              { title: 'Which way?', show: ['dir'],
                md: 'Compare O with E. Both species: 57 observed, 42.2 expected. O is bigger: a **positive association**. If they were found together __less__ often than expected, it would be a **negative association**.' },
              { title: 'What it does not show', show: ['cause'], focus: ['cause', 'line'],
                md: 'The test shows a pattern, not its cause. Heather may give the moss shade and shelter from drying winds; neither species tolerates the trampled paths (Course Companion, p. 522).',
                analogy: 'Umbrellas and wet streets are associated. Umbrellas do not make streets wet: rain causes both.' }
            ] },
          { type: 'exercise', id: 'ib-chisq', gate: true, title: 'Your turn · χ² in R',
            task: '`matrix()` makes the table: R fills it one column at a time, so the counts go 57, 9 (heather present), then 7, 27 (heather absent). Run it. R changes 2 × 2 tables with a “continuity correction” unless you tell it not to. The IB test has no correction, so add `, correct = FALSE` inside `chisq.test( )`.',
            code: 'quadrats <- matrix(c(57, 9, 7, 27), nrow = 2,\n  dimnames = list(moss = c("present", "absent"),\n                  heather = c("present", "absent")))\nquadrats\nchisq.test(quadrats)',
            solution: 'quadrats <- matrix(c(57, 9, 7, 27), nrow = 2,\n  dimnames = list(moss = c("present", "absent"),\n                  heather = c("present", "absent")))\nquadrats\nchisq.test(quadrats, correct = FALSE)',
            check: 'if (!inherits(value, "htest")) "Keep chisq.test( ) as the last line." else if (grepl("Yates", value$method)) "Add correct = FALSE inside chisq.test( )." else if (abs(value$statistic - 42.137) > 0.01) "Keep the four counts in this order: 57, 9, 7, 27." else TRUE',
            hint: '`chisq.test(quadrats, correct = FALSE)`',
            pass: 'χ² = 42.1, df = 1, p = 8.5e-11. The hand calculation, with E rounded to 1 d.p., gave 42.4: the same decision.' },
          { type: 'exercise', id: 'ib-expected', gate: true, title: 'Your turn · the expected counts',
            task: 'R keeps the parts of a test. `test$observed` gives the counts you entered. Change `observed` to `expected`, and run it.',
            code: 'quadrats <- matrix(c(57, 9, 7, 27), nrow = 2,\n  dimnames = list(moss = c("present", "absent"),\n                  heather = c("present", "absent")))\ntest <- chisq.test(quadrats, correct = FALSE)\ntest$observed',
            solution: 'quadrats <- matrix(c(57, 9, 7, 27), nrow = 2,\n  dimnames = list(moss = c("present", "absent"),\n                  heather = c("present", "absent")))\ntest <- chisq.test(quadrats, correct = FALSE)\ntest$expected',
            check: 'if (!is.matrix(value)) "Keep test$ on the last line, then expected." else if (abs(value[1, 1] - 42.24) > 0.01) "Change observed to expected: test$expected" else TRUE',
            pass: '42.24, 23.76, 21.76 and 12.24: every expected count is at least 5, so the test is valid.' },
          { type: 'exercise', id: 'ib-bracken', title: 'Your turn · a new, imagined survey',
            task: 'An invented survey of 100 quadrats on a moorland: heather and bracken. Both 12, bracken only 30, heather only 48, neither 10. Run the test, then look at the expected count for “both”.',
            code: 'survey <- matrix(c(12, 48, 30, 10), nrow = 2,\n  dimnames = list(bracken = c("present", "absent"),\n                  heather = c("present", "absent")))\nsurvey\ntest <- chisq.test(survey, correct = FALSE)\ntest\ntest$expected' },
          { type: 'rquiz', id: 'ib-bracken-q', gate: true, title: 'Your answers · heather and bracken',
            md: 'Use the output above.',
            key: 't2 <- chisq.test(matrix(c(12, 48, 30, 10), nrow = 2), correct = FALSE); list(chi = sprintf("%.1f", t2$statistic), dec = "rejected", dir = "negative")',
            choices: 'c("29.8", "3.84", "25.2", "rejected", "not rejected", "positive", "negative")',
            fields: [{ id: 'chi', label: 'χ² =' }, { id: 'dec', label: 'H₀ is' }, { id: 'dir', label: 'The association is' }],
            pass: 'Both species: 12 observed, 25.2 expected. They are found together less often than chance predicts: a negative association. This may indicate competition, for example bracken shading heather, but it does not prove it (C4.1.15).',
            tip: 'For the direction, compare O and E for “both”: 12 observed, 25.2 expected.' },
          { type: 'mcq', id: 'ib-chi-mcq', gate: true, q: 'A 2 × 2 table gives χ² = 2.6. Do you reject H₀?',
            opts: [
              { t: 'No: 2.6 is below the critical value of 3.84 (df = 1), so p > 0.05.', ok: true, why: 'The difference between O and E could be chance, so no association is shown.' },
              { t: 'Yes: χ² is bigger than 0.', why: 'χ² is almost never exactly 0. It must pass the critical value, 3.84.' },
              { t: 'Yes: 2.6 is bigger than 0.05.', why: 'Compare χ² with the critical value, and p with 0.05. Never χ² with 0.05.' },
              { t: 'You cannot tell without the p-value.', why: 'The critical value tells you: below 3.84 means p > 0.05.' }
            ] },
          { type: 'extension', title: 'Higher level only: χ² for a dihybrid cross (D3.2.21)',
            md: 'At HL, the same test checks a cross against a ratio. Mendel’s peas: 315 round yellow, 108 round green, 101 wrinkled yellow, 32 wrinkled green. Do they fit 9 : 3 : 3 : 1? df = 4 categories − 1 = 3.',
            blocks: [
              { type: 'example', title: 'Try it in any exercise box', code: 'chisq.test(c(315, 108, 101, 32), p = c(9, 3, 3, 1) / 16)',
                md: 'χ² = 0.47, df = 3, p = 0.93: far above 0.05. The counts fit 9 : 3 : 3 : 1.' }
            ] },
          { type: 'frames', items: [
            'χ² = ___ is greater than the critical value of 3.84 (df = 1, p = 0.05), so the null hypothesis is rejected.',
            '___ and ___ are significantly associated. The association is ___: they were found together in ___ quadrats, more / fewer than the ___ expected.',
            'The test shows an association, not a cause.'
          ] }
        ] },

      /* ================= 10 · Correlation and R² (C2.2.4) ================= */
      { id: 'cor', title: 'Correlation and R²',
        lede: 'Two measurements on each student: hours of exercise and resting heart rate. Do they go together?',
        blocks: [
          { type: 'goal', md: 'Describe a correlation, find r and R² in R, and explain what R² means.' },
          { type: 'story', id: 'ib-cor', gate: true, title: 'Exercise and heart rate', w: 640, h: 352, alt: 'A scatter graph of hours of exercise against resting heart rate, with a line of best fit, r and R²',
            scene: SC.cor,
            steps: [
              { title: 'Two measurements, one student', show: ['axes', 'pts'],
                md: 'Each dot is one student: hours of exercise a week (x) and resting heart rate (y). A **scatter graph** shows how two measurements go together.' },
              { title: 'The pattern', show: ['trend'],
                md: 'As exercise increases, resting heart rate tends to fall. That is a **negative correlation**. If both rose together, it would be a positive correlation.' },
              { title: 'How strong? r', show: ['rscale'], pan: 'rscale',
                md: 'The **correlation coefficient (r)** goes from −1 to +1. At −1 or +1, every point sits on a straight line. At 0, there is no straight-line pattern. Here __r = −0.50__: a moderate negative correlation.' },
              { title: 'The line of best fit', show: ['line'],
                md: 'R finds the straight line closest to all the points: heart rate = 79.5 − 1.37 × hours. Each extra hour of exercise goes with a heart rate about 1.4 bpm lower.' },
              { title: 'R²: how much does it explain?', show: ['r2'], pan: 'r2',
                md: '**R²** (the coefficient of determination) is __0.25__: 25 % of the variation in resting heart rate is explained by hours of exercise. The other 75 % comes from other things: genes, sleep, stress, how the pulse was taken.',
                analogy: 'Put all the reasons why heart rates differ into one pie. Exercise is a quarter of the pie.' },
              { title: 'Could it be chance?', show: ['sig'], pan: 'sig',
                md: '**H₀**: there is no correlation. `cor.test()` gives __p = 0.0009__: 9 times in 10,000. Less than 0.05, so reject H₀. The correlation is statistically significant. ([What p means](https://nlcsbiology.com/learn-r/ib.html#p-value).)' },
              { title: 'Correlation is not cause', show: ['cause'], focus: ['cause', 'line'],
                md: 'Students who exercise more may also sleep, eat or rest differently. A correlation cannot show which causes which.',
                analogy: 'Ice-cream sales and sunburn rise together. Ice cream does not cause sunburn: summer sun causes both.' }
            ] },
          { type: 'exercise', id: 'ib-cor-test', gate: true, title: 'Your turn · r and its p-value',
            task: '`cor()` gives r. Run it. Then change `cor` to `cor.test` to get the p-value too.',
            code: 'cor(students$exercise_h, students$resting_hr)',
            solution: 'cor.test(students$exercise_h, students$resting_hr)',
            check: 'if (!inherits(value, "htest")) "Change cor( ) to cor.test( )." else if (abs(value$estimate + 0.504) > 0.001) "Keep the two columns: students$exercise_h and students$resting_hr." else TRUE',
            pass: 'r = −0.50, p = 0.00091: a significant negative correlation.' },
          { type: 'exercise', id: 'ib-scatter', gate: true, title: 'Your turn · the line of best fit',
            task: 'Run the code: R draws the scatter graph. Add a line of best fit: ` +` at the end of the last line, then `geom_smooth(method = "lm", formula = y ~ x, se = FALSE)`. (`lm` means linear model: a straight line of y against x.)',
            code: 'ggplot(students, aes(x = exercise_h, y = resting_hr)) +\n  geom_point(size = 2.5) +\n  labs(x = "Exercise / hours per week", y = "Resting heart rate / bpm")',
            solution: 'ggplot(students, aes(x = exercise_h, y = resting_hr)) +\n  geom_point(size = 2.5) +\n  labs(x = "Exercise / hours per week", y = "Resting heart rate / bpm") +\n  geom_smooth(method = "lm", formula = y ~ x, se = FALSE)',
            check: 'if (!has("geom_smooth(")) "Add + and then geom_smooth(method = \\"lm\\", formula = y ~ x, se = FALSE)." else if (!grepl("lm", code_nc, fixed = TRUE)) "Use method = \\"lm\\" for a straight line." else TRUE',
            pass: 'A straight line of best fit, from a fitted equation. Only for a line like this may you report R².' },
          { type: 'exercise', id: 'ib-r2', gate: true, title: 'Your turn · R²',
            task: '`lm()` fits the line; `coef()` gives its intercept and gradient. Add a last line for R²: `summary(model)$r.squared`.',
            code: 'model <- lm(resting_hr ~ exercise_h, data = students)\ncoef(model)\n',
            solution: 'model <- lm(resting_hr ~ exercise_h, data = students)\ncoef(model)\nsummary(model)$r.squared',
            check: 'if (is.null(value) || length(value) != 1) "Add a last line: summary(model)$r.squared" else if (abs(as.numeric(value) - 0.254) > 0.001) "Use summary(model)$r.squared." else TRUE',
            pass: 'R² = 0.25. And r² = (−0.504)² = 0.254: for a straight line, R² is r squared.' },
          { type: 'mcq', id: 'ib-r2-mcq', gate: true, q: 'Axon diameter and nerve conduction speed: R² = 0.81. What does it mean?',
            opts: [
              { t: '81 % of the variation in speed is explained by the variation in axon diameter.', ok: true, why: 'R² is the share of the variation in y that the line through x explains.' },
              { t: '81 % of the axons are fast.', why: 'R² is about variation, not about how many individuals.' },
              { t: 'A thicker axon causes 81 % more speed.', why: 'R² says nothing about cause, or about the size of the change.' },
              { t: 'The correlation is not significant.', why: 'R² is not a p-value. Use cor.test() for significance.' }
            ] },
          { type: 'note', title: 'In the IB guide',
            md: 'C2.2.4 uses nerve impulses: conduction speed is positively correlated with axon diameter, and negatively correlated with animal size. You should describe positive and negative correlations, use r for their strength, and use R² for how much of the variation the line explains.' },
          { type: 'frames', items: [
            'There is a ___ correlation between ___ and ___ (r = ___, p = ___).',
            'R² = ___, so ___ % of the variation in ___ is explained by ___.',
            'A correlation does not show that ___ causes ___.'
          ] }
        ] },

      /* ================= 11 · Put it together (Part G) ================= */
      { id: 'together', title: 'Put it together',
        lede: 'A new data set, straight from a class spreadsheet, with mistakes in it. Clean it, describe it, test it and report it: every step of the course, in order.',
        blocks: [
          { type: 'goal', md: 'Take raw data from a practical all the way to a reported test.' },
          { type: 'concept', title: 'The practical: stomatal density (B3.1.10)',
            md: 'A class painted clear nail varnish on the underside of leaves, peeled off the casts, and counted the stomata under the microscope. They worked out the **stomatal density**: stomata per mm². Half the leaves came from the sunny side of a hedge, half from the shady side.\n\n__Question: is stomatal density different in sun leaves and shade leaves?__\n\nThe data are invented, and so are the mistakes. They are the kind classes really make.' },
          { type: 'rtable', title: 'The raw data: stomata_raw (the first 12 rows)', code: 'head(stomata_raw, 12)' },
          { type: 'exercise', id: 'ib-look', title: 'Step 1 · Look before you fix',
            task: 'Run the code. Find three problems: how many spellings does `leaf` have? How many counts are missing (`NA`)? What is the largest count?',
            code: 'table(stomata_raw$leaf)\nsummary(stomata_raw$density_mm2)\nstomata_raw[stomata_raw$note != "", ]' },
          { type: 'rquiz', id: 'ib-problems', gate: true, title: 'What did you find?',
            key: 'list(spell = as.character(length(unique(stomata_raw$leaf))), na = as.character(sum(is.na(stomata_raw$density_mm2))), max = as.character(max(stomata_raw$density_mm2, na.rm = TRUE)))',
            choices: 'c("1", "2", "6", "12", "24", "242", "1980")',
            fields: [{ id: 'spell', label: 'Different spellings of leaf:' }, { id: 'na', label: 'Missing counts (NA):' }, { id: 'max', label: 'The largest count:' }],
            pass: 'Six spellings of two words; one leaf torn, so not counted; and 1980 per mm², ten times more than any other leaf.',
            tip: 'Read the output of table( ) and summary( ) again.' },
          { type: 'exercise', id: 'ib-clean-labels', gate: true, title: 'Step 2 · Fix the labels',
            task: '`trimws()` removes spaces at the ends of a label. `tolower()` makes it lower case. Put them round `stomata$leaf` on the right of the arrow: `tolower(trimws(stomata$leaf))`.',
            code: 'stomata <- stomata_raw\nstomata$leaf <- stomata$leaf\ntable(stomata$leaf)',
            solution: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\ntable(stomata$leaf)',
            check: 's <- tryCatch(get("stomata", envir = env, inherits = FALSE), error = function(e) NULL); if (is.null(s)) "Keep the line stomata <- stomata_raw." else if (!identical(sort(unique(s$leaf)), c("shade", "sun"))) "Use tolower(trimws(stomata$leaf)) on the right of the arrow." else TRUE',
            pass: 'Two labels now: shade 12, sun 12.' },
          { type: 'exercise', id: 'ib-clean-rows', gate: true, title: 'Step 3 · Remove what cannot be used',
            task: 'The `filter()` line keeps the rows that have a count. Add a second condition, so that 1980 goes: inside `filter( )`, after `!is.na(density_mm2)`, type `, density_mm2 < 500`.',
            code: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>%\n  filter(!is.na(density_mm2))\nnrow(stomata)',
            solution: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>%\n  filter(!is.na(density_mm2), density_mm2 < 500)\nnrow(stomata)',
            check: 's <- tryCatch(get("stomata", envir = env, inherits = FALSE), error = function(e) NULL); if (is.null(s)) "Keep the lines that make stomata." else if (any(is.na(s$density_mm2))) "Keep !is.na(density_mm2) inside filter( )." else if (max(s$density_mm2) > 500) "Add , density_mm2 < 500 inside filter( )." else if (nrow(s) != 22) "You should have 22 leaves left: 11 sun, 11 shade." else if (!identical(sort(unique(s$leaf)), c("shade", "sun"))) "Keep the line that fixes the labels." else TRUE',
            pass: '22 leaves: 11 sun, 11 shade. In the method, say why two leaves were left out: one was torn and not counted; 1980 per mm² is about ten times any other count, most likely a typing error, and the true count was not recorded.' },
          { type: 'exercise', id: 'ib-describe', gate: true, title: 'Step 4 · Describe each group',
            task: 'Work out the mean, SD and n of each group, as in stage 4: inside `summarise( )`, add `sd = sd(density_mm2)` and `n = n()`.',
            code: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)\n\nstomata %>%\n  group_by(leaf) %>%\n  summarise(mean = mean(density_mm2))',
            solution: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)\n\nstomata %>%\n  group_by(leaf) %>%\n  summarise(mean = mean(density_mm2), sd = sd(density_mm2), n = n())',
            check: 'v <- tryCatch(as.data.frame(value), error = function(e) NULL); if (is.null(v) || !("mean" %in% names(v))) "Keep the summarise( ) with mean." else if (!all(c("sd", "n") %in% names(v))) "Add sd = sd(density_mm2) and n = n() inside summarise( )." else if (!isTRUE(all.equal(as.numeric(v$n), c(11, 11))) || abs(v$mean[v$leaf == "sun"] - 206) > 0.01) "Clean the data first (steps 2 and 3), then summarise." else TRUE',
            pass: 'Sun: 206.0 ± 25.7 stomata per mm² (n = 11). Shade: 182.5 ± 19.3 (n = 11). The larger SD is less than twice the smaller: similar spreads.' },
          { type: 'exercise', id: 'ib-graph', gate: true, title: 'Step 5 · The graph',
            task: 'A dot plot of the two means with ± 1 SD error bars. Fill in the two empty labels: the x-axis is the leaf position; the y-axis is the mean stomatal density, with its unit: `/ mm⁻²`.',
            code: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)\ns <- stomata %>% group_by(leaf) %>%\n  summarise(mean = mean(density_mm2), sd = sd(density_mm2))\n\nggplot(s, aes(x = leaf, y = mean)) +\n  geom_point(size = 3) +\n  geom_errorbar(aes(ymin = mean - sd, ymax = mean + sd), width = 0.15) +\n  labs(x = "", y = "")',
            solution: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)\ns <- stomata %>% group_by(leaf) %>%\n  summarise(mean = mean(density_mm2), sd = sd(density_mm2))\n\nggplot(s, aes(x = leaf, y = mean)) +\n  geom_point(size = 3) +\n  geom_errorbar(aes(ymin = mean - sd, ymax = mean + sd), width = 0.15) +\n  labs(x = "Leaf position", y = "Mean stomatal density / mm⁻²")',
            check: 'if (has("x=\\"\\"") || has("y=\\"\\"")) "Fill in both labels, between the quote marks." else if (!grepl("mm", code, fixed = TRUE)) "Give the y-axis its unit: / mm⁻² (or / stomata per mm²)." else TRUE',
            pass: 'Caption it: “Figure 1. Dot plot showing the effect of leaf position (sun or shade) on the mean stomatal density (n = 11; error bars = ± 1 SD).”' },
          { type: 'exercise', id: 'ib-final-test', gate: true, title: 'Step 6 · The test',
            task: 'One measurement, two groups, similar spreads, each group roughly normal: the standard t-test. Write it on the empty line: `t.test(density_mm2 ~ leaf, data = stomata, var.equal = TRUE)`.',
            code: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)\n\n# the t-test:\n',
            solution: 'stomata <- stomata_raw\nstomata$leaf <- tolower(trimws(stomata$leaf))\nstomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)\nt.test(density_mm2 ~ leaf, data = stomata, var.equal = TRUE)',
            check: 'if (!inherits(value, "htest")) "Add the t.test( ) line at the end." else if (grepl("Welch", value$method)) "Add var.equal = TRUE: the spreads are similar." else if (abs(abs(value$statistic) - 2.4219) > 0.001) "Use density_mm2 ~ leaf and the cleaned data, data = stomata." else TRUE',
            pass: 't = −2.42, df = 20, p = 0.025. (t is negative only because R takes shade − sun: shade comes first in the alphabet.)' },
          { type: 'rquiz', id: 'ib-final-report', gate: true, title: 'Step 7 · The report',
            key: 's <- stomata_raw; s$leaf <- tolower(trimws(s$leaf)); s <- s[!is.na(s$density_mm2) & s$density_mm2 < 500, ]; tt <- t.test(density_mm2 ~ leaf, data = s, var.equal = TRUE); list(t = sprintf("%.2f", abs(tt$statistic)), df = as.character(tt$parameter), p = sprintf("%.3f", tt$p.value), dec = "rejected", hi = "sun")',
            choices: 'c("2.42", "23.5", "20", "22", "0.025", "0.05", "rejected", "not rejected", "sun", "shade")',
            fields: [{ id: 'hi', label: 'Higher mean density:' }, { id: 't', label: 't =' }, { id: 'df', label: 'df =' }, { id: 'p', label: 'p =' }, { id: 'dec', label: 'H₀ is' }],
            pass: 'Every step, from raw data to a reported test.',
            tip: 'Use the output of steps 4 and 6.' },
          { type: 'interpret', title: 'A model report',
            md: 'Two leaves were excluded: one was torn and not counted, and one count of 1980 mm⁻², about ten times any other, was most likely a typing error. Sun leaves had a higher mean stomatal density (206.0 ± 25.7 mm⁻², n = 11) than shade leaves (182.5 ± 19.3 mm⁻², n = 11). The standard deviations were similar, so a standard t-test was used: the difference was significant (t = 2.42, df = 20, p = 0.025), and the null hypothesis was rejected. More light on the sunny side may favour more stomata for gas exchange, but the leaves also differed in temperature and humidity, so the cause is not shown.' },
          { type: 'frames', items: [
            '___ leaves were excluded because ___.',
            '___ leaves had a higher mean stomatal density (___ ± ___ mm⁻², n = ___) than ___ leaves (___ ± ___ mm⁻², n = ___).',
            'The difference was significant (t = ___, df = ___, p = ___), so the null hypothesis was rejected.'
          ] }
        ] },

      /* ================= 12 · Carry on in RStudio ================= */
      { id: 'rstudio', title: 'Carry on in RStudio',
        lede: 'Everything you did here runs the same way on your own computer. For your IA or Extended Essay, that is where your data will be.',
        blocks: [
          { type: 'goal', md: 'Install R and RStudio, run this course as one script, and open your own data file.' },
          { type: 'concept', title: 'Why your own computer?',
            md: 'On this page, R forgets everything when you close the tab. On your own computer, you keep your scripts, open your own spreadsheets and add any package you need. The code is exactly the same.' },
          { type: 'concept', title: 'Getting R, then RStudio',
            md: '**R** is the language. **RStudio** is the window you write it in. Install R first: if you install RStudio first, it opens and says that it cannot find R.\n\n' +
              '- **Mac:** [R for macOS](https://cran.r-project.org/bin/macosx/). Take the .pkg for your Mac: Apple silicon (arm64) for an M-series Mac, Intel (x86_64) for an older one. Not sure? Apple menu → About This Mac.\n' +
              '- **Windows:** [R for Windows](https://cran.r-project.org/bin/windows/base/). One .exe file: download it, run it, and keep the default settings.\n' +
              '- **Then RStudio:** [RStudio Desktop](https://posit.co/download/rstudio-desktop/), the free version.\n' +
              '- **A school laptop or a Chromebook:** you may not be allowed to install programs. Ask IT, or use Posit Cloud (posit.cloud): RStudio in a web browser, with a free account.' },
          { type: 'analogy', md: 'R is the engine. RStudio is the car around it: the seats, the windows and the dashboard. A car with no engine goes nowhere, so the engine comes first.' },
          { type: 'note', title: 'This course, as one R script',
            md: 'The class data, the stomata data, and the answer to every exercise, stage by stage, with the result you should get written under each one.',
            files: [{ href: 'data/ib-statistics.R', name: 'ib-statistics.R', label: 'Statistics in R: the whole course as one script', size: 'about 12 KB' }] },
          { type: 'concept', title: 'Run it in RStudio',
            md: '1. Open RStudio. Choose **File → Open File…** and pick `ib-statistics.R`.\n' +
              '2. Put the cursor on the first line and press **Ctrl + Enter** (Mac: **Cmd + Enter**). The first time, R installs **dplyr** and **ggplot2**: a few minutes of text. Wait until the `>` comes back in the Console.\n' +
              '3. Keep pressing **Ctrl + Enter**: R runs one line at a time. Answers appear in the Console, graphs in the Plots panel.\n' +
              '4. To run it all at once: **Ctrl + Shift + Enter** (Mac: **Cmd + Shift + Enter**).' },
          { type: 'concept', title: 'Your own data',
            md: 'Keep your data in a spreadsheet: one row for each measurement, one column for each variable, and one header row with short names and no spaces, such as `leaf` and `density_mm2`. Save it as a **.csv** file. Then read it into R:' },
          { type: 'example', title: 'Read your own file', code: 'my_data <- read.csv(file.choose())   # a window opens: choose your .csv file\nhead(my_data)                        # the first six rows\nstr(my_data)                         # each column: numbers or text?',
            md: 'From here, every stage of this course works on your data: change `students` to `my_data`, and the column names to yours. Then clean it as in stage 11 before you trust any number.' },
          { type: 'mcq', id: 'ib-rstudio-mcq', gate: true, q: 'You open RStudio for the first time, and it says that it cannot find R. What is wrong?',
            opts: [
              { t: 'R is not installed yet: install R, then open RStudio again.', ok: true, why: 'RStudio is only the window. R, the language, must be installed first.' },
              { t: 'The script has a mistake in it.', why: 'RStudio says this before any script is opened. The language itself is missing.' },
              { t: 'RStudio needs the internet to work.', why: 'R and RStudio run without the internet. Only installing packages needs it.' },
              { t: 'You need Posit Cloud.', why: 'Posit Cloud is an option without installing anything, but here R is simply not installed yet.' }
            ] }
        ] }
    ]
  });
})(window.LR);
