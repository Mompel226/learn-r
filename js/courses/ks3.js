/* ============================================================
   courses/ks3.js — Year 8: "Variation", Daniel's KS3 R tutorial
   (NLCS/KS3/KS3 R Tutorials/Intro to R. Variation/Evolution_Variation.Rmd),
   rebuilt to run in the browser. Same stages, same order, same unlock
   rule; the fixes from the 25 Sep 2026 audit are noted where they are
   ("audit N" in the comments):
     1 "standard deviation", never "standard variation"      stages 3, 7
     2 mean and SD to 1 d.p. (cm data with .5 values)          stages 3, 7
     3 the red bell curve = dnorm × n × binwidth, one group    stages 4, 5; normal_curve_df()
       at a time; the histogram check reads aes(x) and bins
     4 Q–Q examples A–D drawn by R; each group on its own      stage 6
     5 error bars: task, check and hint all say black          stage 8
     6 boxplots: two groups on one axis, key from the data     stage 9
     7 the t-test as an Extension (no gates), Welch, e-notation stage 10
     8 continuous/discontinuous, genetic/environmental         stage 3
     9 the plot builder, then 6–8 sentences                    stage 11

   The sample data (data/ks3-sample.json) is INVENTED (tools/make-ks3-sample.R):
   the class spreadsheet has real pupils' names and never ships.
   ============================================================ */
(function (LR) {
  'use strict';

  /* R that runs once, after R starts (and again after a restart) */
  var SETUP = [
    'locked_df_global <- NULL',
    'get_locked_df <- function() {',
    '  if (is.null(locked_df_global)) stop("There is no data yet. Go back to stage 1 and choose your data.", call. = FALSE)',
    '  locked_df_global',
    '}',
    /* one table from two sheets; class = the sheet name; rows with no measurements are dropped (the old tutorial counted blank rows) */
    '.lr_prepare <- function(sheets) {',
    '  parts <- lapply(names(sheets), function(nm) {',
    '    d <- as.data.frame(sheets[[nm]])',
    '    names(d) <- gsub("^_+|_+$", "", gsub("[^a-z0-9]+", "_", tolower(trimws(names(d)))))',
    '    if (!length(names(d)) || names(d)[1] %in% c("", "x1", "1")) names(d)[1] <- "student"',
    '    num <- vapply(d, is.numeric, logical(1)) & !(names(d) %in% c("id", "student", "student_id"))',
    '    d <- d[rowSums(!is.na(d[, num, drop = FALSE])) > 0, , drop = FALSE]',
    '    d$class <- nm',
    '    d',
    '  })',
    '  df <- dplyr::bind_rows(parts)',
    '  df$class <- factor(df$class, levels = names(sheets))',
    '  tibble::as_tibble(df)',
    '}',
    '.lr_lock_json <- function(json) { x <- jsonlite::fromJSON(json); locked_df_global <<- .lr_prepare(lapply(x, as.data.frame)); invisible(TRUE) }',
    '.lr_lock_xlsx <- function(path, a, b) { s <- list(); s[[a]] <- readxl::read_excel(path, sheet = a); s[[b]] <- readxl::read_excel(path, sheet = b); locked_df_global <<- .lr_prepare(s); invisible(TRUE) }',
    '.lr_sheets <- function(path) readxl::excel_sheets(path)',
    '.lr_data_summary <- function() { d <- get_locked_df(); list(n = as.list(table(d$class)), vars = pick_numeric_vars(d)) }',
    /* Daniel's helpers, kept */
    'pick_numeric_vars <- function(df) {',
    '  vars <- names(df)[vapply(df, is.numeric, logical(1))]',
    '  vars[!tolower(vars) %in% c("id", "student", "student_id", "name")]',
    '}',
    'pretty_var <- function(x) {',
    '  vapply(x, function(v) {',
    '    parts <- strsplit(v, "_")[[1]]',
    '    if (length(parts) >= 2) {',
    '      unit <- tolower(parts[length(parts)]); nm <- tolower(parts[-length(parts)])',
    '      nm[1] <- paste0(toupper(substring(nm[1], 1, 1)), substring(nm[1], 2))',
    '      paste0(paste(nm, collapse = " "), " / ", unit)',
    '    } else paste0(toupper(substring(v, 1, 1)), substring(v, 2))',
    '  }, character(1), USE.NAMES = FALSE)',
    '}',
    /* the red "model bell curve": the true normal curve for the data's own mean and SD, over mean ± 3.5 SD.
       With a binwidth it is scaled to a histogram of COUNTS (dnorm × n × binwidth), so it sits on the bars
       (audit, 25 Sep 2026: the old curve was a density drawn over counts, then rescaled to the peak) */
    'normal_curve_df <- function(x, binwidth = NULL) {',
    '  x <- x[is.finite(x)]; if (length(x) < 2) return(NULL)',
    '  m <- mean(x); s <- sd(x); if (!is.finite(s) || s == 0) return(NULL)',
    '  xs <- seq(m - 3.5 * s, m + 3.5 * s, length.out = 300)',
    '  y <- dnorm(xs, mean = m, sd = s)',
    '  if (!is.null(binwidth)) y <- y * length(x) * binwidth',
    '  data.frame(x = xs, y = y)',
    '}',
    'p_stars <- function(p) { if (!is.finite(p)) return(""); if (p < 0.001) return("***"); if (p < 0.01) return("**"); if (p < 0.05) return("*"); "ns" }',
    /* for the pickers: every measurement, with a readable name */
    '.lr_vars <- function() { v <- pick_numeric_vars(get_locked_df()); lapply(seq_along(v), function(i) list(v = v[i], t = pretty_var(v[i]))) }',
    /* tibbles print 3 significant figures by default (151.3 shows as "151."): show the 1 d.p. the students round to */
    'options(pillar.sigfig = 6)',
    /* a measurement by name, for questions about "height" or "hand span" (an uploaded class may name them differently) */
    '.lr_find_var <- function(pattern, i = 1) { v <- pick_numeric_vars(get_locked_df()); hit <- v[grepl(pattern, v, ignore.case = TRUE)]; if (length(hit)) hit[1] else v[min(i, length(v))] }',
    /* R's boxplot rule, as ggplot2 draws it: more than 1.5 × IQR beyond the box (quantile type 7) */
    '.lr_outlier <- function(x) { q <- stats::quantile(x, c(0.25, 0.75), na.rm = TRUE, names = FALSE); i <- q[2] - q[1]; x < q[1] - 1.5 * i | x > q[2] + 1.5 * i }',
    /* for the checks: read the graph a student made, so a check tests the RESULT, not the spelling.
       .lr_run prints a visible value outside its tryCatch, so a graph that fails while drawing leaves
       `value` at the line before it: .lr_plot evaluates the last line again to find the graph. */
    '.lr_plot <- function(value, code, env) {',
    '  if (inherits(value, "ggplot")) return(value)',
    '  ex <- tryCatch(parse(text = code, keep.source = FALSE), error = function(e) NULL)',
    '  if (!length(ex)) return(NULL)',
    '  p <- tryCatch(eval(ex[[length(ex)]], env), error = function(e) NULL)',
    '  if (inherits(p, "ggplot")) p else NULL',
    '}',
    '.lr_draw_error <- function(p) tryCatch({ ggplot2::ggplot_build(p); NULL }, error = function(e) {',
    '  m <- gsub("[[:space:]]+", " ", conditionMessage(e)); m <- sub(".*Caused by error:", "", m); trimws(sub("^[[:space:]]*!", "", m)) })',
    '.lr_layers <- function(p, geom = NULL, stat = NULL) Filter(function(l) (is.null(geom) || inherits(l$geom, geom)) && (is.null(stat) || inherits(l$stat, stat)), p$layers)',
    '.lr_param <- function(l, k) { for (s in list(l$aes_params, l$geom_params, l$stat_params)) if (!is.null(s[[k]])) return(s[[k]]); NULL }',
    '.lr_aes <- function(p, a) {',
    '  m <- p$mapping[[a]]',
    '  if (is.null(m)) for (l in p$layers) if (!is.null(l$mapping[[a]])) { m <- l$mapping[[a]]; break }',
    '  if (is.null(m)) NULL else rlang::as_label(m)',
    '}',
    '.lr_by_class <- function(p) { f <- p$facet$params; "class" %in% c(names(f$facets), names(f$rows), names(f$cols)) }',
    '.lr_colour_ok <- function(col) isTRUE(tryCatch({ grDevices::col2rgb(col); TRUE }, error = function(e) FALSE))',
    '.lr_is_black <- function(col) isTRUE(tryCatch(all(grDevices::col2rgb(col) == 0), error = function(e) FALSE))',
    '.lr_name_msg <- function(x, vars) {',
    '  bare <- gsub("\\"", "", x, fixed = TRUE)',
    '  if (bare %in% vars) paste0("Remove the quote marks: write ", bare, " with no quote marks.")',
    '  else paste0("R cannot find a measurement called ", x, ". Use a name from this list: ", paste(vars, collapse = ", "), ".")',
    '}'
  ].join('\n');

  LR.course({
    id: 'ks3-variation',
    kicker: 'Year 8 · Variation',
    title: 'Variation in our class',
    packages: ['dplyr', 'tidyr', 'ggplot2'],
    setup: SETUP,
    sample: 'data/ks3-sample.json',
    finish: '✔ You have finished **Variation in our class**. You measured, summarised, graphed and compared real variation, in R.',
    stages: [
      /* ---------- 1 ---------- */
      { id: 'data', title: 'Your data',
        lede: 'You explore how people in two groups differ: their height, arm span, hand span and shoe size.',
        blocks: [
          { type: 'goal', md: 'Choose the data you will explore in every stage.' },
          { type: 'concept', title: 'What the data looks like',
            md: 'One spreadsheet, with **two sheets**: one sheet for each group (class).\n\n- Each row is one student.\n- Each column is one measurement, in numbers only.\n- Both sheets have the same column names.\n- Everyone uses the same units: all cm, for example.\n\nR joins the two sheets into one table, and adds a column called `class` that holds the sheet name.' },
          { type: 'dataset', id: 'ks3-data', gate: true }
        ] },

      /* ---------- 2 ---------- */
      { id: 'check', title: 'A quick check',
        lede: 'Before you use data, look at it.',
        blocks: [
          { type: 'goal', md: 'Check that the right columns are there, and look at the first rows.' },
          { type: 'concept', title: 'Three things you use',
            md: '- `get_locked_df()` gets your data. `df <-` stores it under the name `df`.\n- `names(df)` prints the column names.\n- `head(df, 6)` prints the first 6 rows.' },
          { type: 'exercise', id: 'ks3-quick', gate: true, needsData: true,
            task: 'Run the code. Then change `6` to `10`, and run it again. When you see 10 rows, press **Check my answer**.',
            code: 'df <- get_locked_df()\n\n# 1) Print the column names\nnames(df)\n\n# 2) Show the first 6 rows (change 6 to 10)\nhead(df, 6)',
            check: 'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()." else if (!has("names(df)")) "Keep names(df): it prints the column names." else if (!(has("head(df,10)") || has("head(df,n=10)"))) "Change 6 to 10 inside head(), so it shows 10 rows." else TRUE',
            solution: 'df <- get_locked_df()\nnames(df)\nhead(df, 10)',
            pass: 'You loaded your data, printed its column names, and looked at the first 10 rows.' }
        ] },

      /* ---------- 3 ---------- */
      { id: 'summary', title: 'Mean and SD',
        lede: 'Two numbers describe a set of measurements: where the middle is, and how spread out the values are.',
        blocks: [
          { type: 'goal', md: 'Make a table of the mean and the standard deviation (SD) of every measurement, for each group.' },
          /* audit 8: the KS3 biology the old tutorial left out (continuous/discontinuous; genetic/environmental) */
          { type: 'concept', title: 'Variation in biology',
            md: '**Variation** means the differences between individuals of the same species. Everyone in your class is human, but your heights, hand spans and shoe sizes are different.\n\n' +
              '- **Continuous variation**: the feature can have any value in a range. You measure it. Height, arm span, hand span and shoe size in cm are continuous.\n' +
              '- **Discontinuous variation**: the feature fits into a few separate groups, with nothing in between. You sort it. Blood group (A, B, AB or O) is discontinuous.\n\n' +
              'Variation has two kinds of cause.\n\n' +
              '- **Genetic**: the genes you get from your parents.\n' +
              '- **Environmental**: your surroundings and the way you live, for example food, exercise, sleep and illness.\n\n' +
              'Height has __both__ causes. Your genes set a possible range. Your food and health decide where you are inside that range. Blood group is genetic only.\n\n' +
              'Variation matters for evolution. If everyone were the same, natural selection would have nothing to choose from. When the environment changes, variation helps some individuals, and so the species, survive.' },
          { type: 'note', title: 'Two ways to sort',
            md: 'In Year 7 you sorted __data__: numbers you measure (continuous) or count (discrete), and named groups (categorical). Here you sort __variation__, the biology way: continuous or discontinuous. So blood group is __categorical__ data, and it shows __discontinuous__ variation. Two names for two jobs: one for the data, one for the biology.' },
          { type: 'mcq', id: 'ks3-discontinuous', gate: true,
            q: 'Which of these shows __discontinuous__ variation?',
            opts: [
              { t: 'Blood group', ok: true, why: 'Yes. Everyone is A, B, AB or O, with nothing in between.' },
              { t: 'Height', why: 'Height can have any value in a range, for example 151.5 cm. That is continuous variation.' },
              { t: 'Hand span', why: 'Hand span can have any value in a range, for example 18.5 cm. That is continuous variation.' },
              { t: 'Arm span', why: 'Arm span can have any value in a range. That is continuous variation.' }
            ] },
          /* audit 1: "standard deviation" (the old heading said "standard variation") */
          { type: 'concept', title: 'Two numbers: the mean and the SD',
            md: 'When you measure a group, you want to know two things.\n\n' +
              '- __Where is the middle?__ This is the **mean** (the average). Add up all the values, then divide by the number of values.\n' +
              '- __How spread out are the values?__ This is the **standard deviation (SD)**.\n\n' +
              'The SD is roughly the typical distance between one student and the mean.\n\n' +
              '- Small SD: most students are close to the mean.\n' +
              '- Large SD: the students are more different from each other.\n\n' +
              'For example, the mean height is 160 cm and the SD is 5 cm. Then a typical student is about 5 cm above or below 160 cm.' },
          { type: 'analogy', title: 'The mean',
            md: 'Four friends have 2, 4, 6 and 8 sweets. They put all 20 sweets on the table and share them out equally. Each friend gets 5. The mean is that fair share: 20 ÷ 4 = 5.' },
          { type: 'analogy', title: 'The SD',
            md: 'Your group stands along a long tape measure on the floor. Each student stands at the mark for their own height. Your teacher stands at the mean. If most students stand near the teacher, the SD is small. If students stand far away along the tape, on both sides, the SD is large. The SD is about how far a typical student stands from the teacher.' },
          /* audit 2: the data are in cm with .5 values, so the mean and SD go to 1 d.p. (the old task said 0 d.p. "because we measure in mm") */
          { type: 'exercise', id: 'ks3-summary', gate: true, needsData: true,
            task: 'Fill in the four blanks (`____`), then press **Run**.\n\n' +
              '- Blanks 1 and 2: group the data by `class` and by `variable`. Then you get one row for each group and each measurement.\n' +
              '- Blank 3: the function that works out the mean.\n' +
              '- Blank 4: the number of decimal places for the SD.\n\n' +
              'Round the mean and the SD to **1 decimal place (1 d.p.)**, for example 151.3. Your measurements are in cm, to the nearest 0.5 cm, so 1 d.p. is enough. More decimal places would pretend that you measured more exactly than you did.\n\n' +
              'When your table looks right, press **Check my answer**.',
            code: [
              'df <- get_locked_df()',
              '',
              '# All the measurement columns',
              'num_vars <- pick_numeric_vars(df)',
              '',
              'df %>%',
              '  select(class, all_of(num_vars)) %>%',
              '  # one row for each student and each measurement',
              '  pivot_longer(cols = all_of(num_vars), names_to = "variable", values_to = "value") %>%',
              '  # remove empty cells',
              '  filter(is.finite(value)) %>%',
              '  group_by(____, ____) %>%            # blanks 1 and 2',
              '  summarise(',
              '    n    = n(),                       # the number of students',
              '    mean = round(____(value), 1),     # blank 3: the mean, to 1 d.p.',
              '    sd   = round(sd(value), ____),    # blank 4: decimal places for the SD',
              '    .groups = "drop"',
              '  ) %>%',
              '  arrange(variable, class)'
            ].join('\n'),
            /* the check compares the student's TABLE with R's own, so any order in group_by() passes */
            check: [
              '{',
              'd <- get_locked_df(); v <- pick_numeric_vars(d)',
              'want <- d %>% select(class, all_of(v)) %>%',
              '  pivot_longer(cols = all_of(v), names_to = "variable", values_to = "value") %>%',
              '  filter(is.finite(value)) %>% group_by(class, variable) %>%',
              '  summarise(mu = mean(value), s = sd(value), .groups = "drop") %>% as.data.frame()',
              'got <- if (is.data.frame(value)) as.data.frame(value) else NULL',
              'm <- if (!is.null(got) && all(c("class", "variable") %in% names(got))) merge(want, got, by = c("class", "variable")) else NULL',
              'near <- function(a, b) isTRUE(all(abs(a - b) < 1e-6))',
              'any_dp <- function(a, b) near(a, b) || any(vapply(0:6, function(k) near(a, round(b, k)), logical(1)))',
              'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
              'else if (is.null(got)) "Keep the %>% pipes between the steps, so the last thing your code makes is the table."',
              'else if (!all(c("class", "variable") %in% names(got))) "Group by both class and variable: group_by(class, variable)."',
              'else if (nrow(got) != nrow(want) || nrow(m) != nrow(want)) "Group by both class and variable, so there is one row for each group and each measurement."',
              'else if (!all(c("mean", "sd") %in% names(got))) "Keep the two columns called mean and sd inside summarise()."',
              'else if (!near(m$mean, round(m$mu, 1))) { if (any_dp(m$mean, m$mu)) "Round the mean to 1 decimal place: round(mean(value), 1)." else "Use mean(value) to work out the mean (blank 3)." }',
              'else if (!near(m$sd, round(m$s, 1))) { if (any_dp(m$sd, m$s)) "Round the SD to 1 decimal place: put 1 in blank 4." else "Keep sd(value): it works out the SD." }',
              'else TRUE',
              '}'
            ].join('\n'),
            solution: [
              'df <- get_locked_df()',
              'num_vars <- pick_numeric_vars(df)',
              'df %>%',
              '  select(class, all_of(num_vars)) %>%',
              '  pivot_longer(cols = all_of(num_vars), names_to = "variable", values_to = "value") %>%',
              '  filter(is.finite(value)) %>%',
              '  group_by(class, variable) %>%',
              '  summarise(n = n(), mean = round(mean(value), 1), sd = round(sd(value), 1), .groups = "drop") %>%',
              '  arrange(variable, class)'
            ].join('\n'),
            hint: 'The four blanks are `class`, `variable`, `mean` and `1`.',
            pass: 'Your table shows the number of students (`n`), the mean and the SD of every measurement, for each group, to 1 d.p.' },
          { type: 'interpret', title: 'What your table shows',
            md: '- The `mean` column: which group has the bigger mean for each measurement?\n' +
              '- The `sd` column: compare the SD of the __same__ measurement in the two groups. The bigger SD shows more variation.\n' +
              '- Do not compare the SD of height with the SD of hand span. Heights are about 150 cm and hand spans are about 18 cm, so the SD of height is bigger anyway.' }
        ] },

      /* ---------- 4 ---------- */
      { id: 'shape', title: 'Histograms and the bell curve',
        lede: 'A histogram shows the shape of your data: where most values are, and how far they spread.',
        blocks: [
          { type: 'goal', md: 'Draw a histogram, and compare its shape with a bell curve.' },
          { type: 'concept', title: 'What a histogram is',
            md: 'A **histogram** is a bar chart with __no gaps__ between the bars.\n\n' +
              '- Each bar covers a range of values. This range is called a **bin**, for example 150 to 155 cm.\n' +
              '- The height of a bar is the number of students whose value is inside that bin.\n\n' +
              'There are no gaps because the measurement is continuous: one bin runs straight into the next.' },
          { type: 'analogy', title: 'A histogram',
            md: 'Imagine a row of boxes on the floor. Each box has a label: 140–145 cm, 145–150 cm, 150–155 cm, and so on. Each student stands in the box for their height. Then you count the students in each box. The number in a box is the height of its bar.' },
          { type: 'concept', title: 'The bell curve',
            md: 'Many measurements in biology have a **normal distribution**. Most values are near the middle. Further away, on both sides, there are fewer and fewer values. The graph looks like a bell, so it is also called a **bell curve**.\n\n' +
              'Height often looks like this because __many__ genes and the environment each add or take away a little.' },
          { type: 'analogy', title: 'The bell curve',
            md: 'Drop 100 small balls into a board full of pins. At every pin, a ball bounces a little to the left or to the right. Most balls get some lefts and some rights, so they land near the middle. Very few get only lefts or only rights, so few land at the edges. The pile of balls makes a bell shape.\n\n' +
              'Your height is like one ball. Many genes, and your food, sleep and health, each push it a little up or down.' },
          /* audit 3: the red curve is the TRUE normal curve for this group's mean and SD, scaled to the counts
             (dnorm × n × binwidth); one group at a time, so it never models two groups mixed together */
          { type: 'rplot', title: 'One group: histogram and bell curve', w: 620, h: 400,
            pickers: [
              { id: 'var', label: 'Measurement', from: '.lr_vars()', 'default': 'height_cm' },
              { id: 'grp', label: 'Group', from: 'lapply(levels(get_locked_df()$class), function(g) list(v = g, t = g))', 'default': 'Girls' },
              { id: 'bins', label: 'Bins', values: [{ v: '5', t: '5' }, { v: '8', t: '8' }, { v: '12', t: '12' }], 'default': '8' }
            ],
            code: [
              'd <- get_locked_df(); v <- "{{var}}"; g <- "{{grp}}"; bins <- as.numeric("{{bins}}")',
              'x <- d[[v]][d$class == g]; x <- x[is.finite(x)]',
              'if (length(x) < 2) stop("This group has fewer than 2 values for this measurement.", call. = FALSE)',
              '# exactly `bins` bars from the smallest value to the largest; the curve uses the same bar width',
              'bw <- diff(range(x)) / bins; if (!is.finite(bw) || bw <= 0) bw <- 1',
              'curve <- normal_curve_df(x, binwidth = bw)',
              'p <- ggplot(data.frame(x = x), aes(x = x)) +',
              '  geom_histogram(breaks = min(x) + bw * (0:bins), fill = "grey75", colour = "white") +',
              '  geom_vline(xintercept = mean(x), linetype = "dashed") +',
              '  scale_y_continuous(breaks = function(l) unique(floor(pretty(l)))) +',
              '  labs(title = .lr_wrap(paste0(pretty_var(v), ": ", g, " (", length(x), " students)")),',
              '       subtitle = sprintf("Mean = %.1f    SD = %.1f", mean(x), sd(x)),',
              '       x = pretty_var(v), y = "Number of students") +',
              '  theme_classic(base_size = 14)',
              'if (!is.null(curve)) p <- p + geom_line(data = curve, aes(x = x, y = y), colour = "#d62728", linewidth = 1.2)',
              'p'
            ].join('\n'),
            caption: 'Grey bars: the real data for one group. Red curve: a perfect bell curve with the same mean, the same SD and the same number of students. Dashed line: the mean.' },
          /* audit 3: the check reads the graph itself: the measurement in aes(x = …) and bins must both differ from the starter's */
          { type: 'exercise', id: 'ks3-histogram', gate: true, needsData: true,
            task: 'Make your own histogram of everyone in your data.\n\n' +
              '- Change `height_cm` to a __different__ measurement. Copy its name from the list that `pick_numeric_vars(df)` prints.\n' +
              '- Change `bins = 12` to a different number of bins, for example 6 or 8.\n\n' +
              'Run the code after each change, and watch how the shape changes. Then press **Check my answer**.',
            code: [
              'df <- get_locked_df()',
              '',
              '# The names of your measurements',
              'pick_numeric_vars(df)',
              '',
              '# 1) Change height_cm to another name from the list above',
              '# 2) Change 12 to another number of bins, for example 6 or 8',
              'ggplot(df, aes(x = height_cm)) +',
              '  geom_histogram(bins = 12, fill = "grey70", colour = "white") +',
              '  labs(title = "Histogram", x = "Measurement / cm", y = "Number of students") +',
              '  theme_classic()'
            ].join('\n'),
            check: [
              '{',
              'v <- pick_numeric_vars(get_locked_df())',
              'p <- .lr_plot(value, code, env)',
              'hl <- if (is.null(p)) list() else .lr_layers(p, stat = "StatBin")',
              'xv <- if (is.null(p)) NULL else .lr_aes(p, "x")',
              'b <- if (length(hl)) .lr_param(hl[[1]], "bins") else NULL',
              'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
              'else if (is.null(p)) "End your code with the ggplot() command, so R draws the graph."',
              'else if (!length(hl)) "Keep geom_histogram(): it draws the bars."',
              'else if (is.null(xv)) "Keep aes(x = …) inside ggplot()."',
              'else if (!(xv %in% v)) .lr_name_msg(xv, v)',
              'else if (xv == "height_cm") "Change height_cm to a different measurement from the list."',
              'else if (is.null(b)) "Keep bins = … inside geom_histogram(), with a number."',
              'else if (isTRUE(as.numeric(b) == 12)) "Now change the number of bins: 12 to 6 or 8, for example."',
              'else if (!is.null(e <- .lr_draw_error(p))) paste("R cannot draw the graph yet:", e)',
              'else TRUE',
              '}'
            ].join('\n'),
            solution: [
              'df <- get_locked_df()',
              'pick_numeric_vars(df)',
              'ggplot(df, aes(x = handspan_cm)) +',
              '  geom_histogram(bins = 8, fill = "grey70", colour = "white") +',
              '  labs(title = "Histogram", x = "Hand span / cm", y = "Number of students") +',
              '  theme_classic()'
            ].join('\n'),
            hint: 'Only two things change. The name after `x =`, for example `aes(x = handspan_cm)`, with no quote marks. And the number after `bins =`, for example `bins = 8`.',
            pass: 'You drew a histogram of a new measurement with a new number of bins.' },
          { type: 'interpret', title: 'Bins change the picture',
            md: '- With __few__ bins, each bar is wide. The picture is smooth, but it hides detail.\n' +
              '- With __many__ bins, each bar is narrow. With only about 15 students, many bars hold 0 or 1 student, and the shape looks spiky.\n' +
              '- Your class is small, so a histogram is always a little bumpy, even when a measurement is normal. So ask: is it __roughly__ like the red bell curve, with one peak in the middle and fewer values at both ends?' }
        ] },

      /* ---------- 5 ---------- */
      { id: 'compare', title: 'Two groups side by side',
        lede: 'To compare the two groups, draw one histogram for each group, one above the other.',
        blocks: [
          { type: 'goal', md: 'Split one histogram into two panels, one for each group, with `facet_wrap()`.' },
          { type: 'concept', title: 'Panels with facet_wrap()',
            md: 'A **panel** (or **facet**) is one small graph inside a bigger graph.\n\n' +
              '- `facet_wrap(~ class)` makes one panel for each group. Read `~ class` as "split by class".\n' +
              '- `ncol = 1` puts the panels in one column, one above the other. Both panels then share the same x-axis. So you can see which group sits further to the right (bigger values), and which group is more spread out.\n\n' +
              'In a ggplot, each new layer joins the graph with a `+` at the end of the line before it.' },
          /* audit 3 (per group): each panel has its own red curve, from that group's mean, SD and number of students */
          { type: 'rplot', title: 'Both groups: one panel each', w: 620, h: 480,
            pickers: [{ id: 'var', label: 'Measurement', from: '.lr_vars()', 'default': 'shoe_size_cm' }],
            code: [
              'd <- get_locked_df(); v <- "{{var}}"',
              'pd <- data.frame(class = d$class, x = d[[v]]); pd <- pd[is.finite(pd$x), ]',
              'if (nrow(pd) < 2) stop("There are fewer than 2 values for this measurement.", call. = FALSE)',
              '# the same 12 bars for both groups, so the panels line up',
              'bw <- diff(range(pd$x)) / 12; if (!is.finite(bw) || bw <= 0) bw <- 1',
              'parts <- lapply(split(pd$x, pd$class), normal_curve_df, binwidth = bw)',
              'curves <- do.call(rbind, lapply(names(parts), function(k) if (is.null(parts[[k]])) NULL else data.frame(class = k, parts[[k]])))',
              'means <- pd %>% group_by(class) %>% summarise(m = mean(x), .groups = "drop")',
              'p <- ggplot(pd, aes(x = x)) +',
              '  geom_histogram(breaks = min(pd$x) + bw * (0:12), fill = "grey75", colour = "white") +',
              '  geom_vline(data = means, aes(xintercept = m), linetype = "dashed") +',
              '  facet_wrap(~ class, ncol = 1) +',
              '  scale_y_continuous(breaks = function(l) unique(floor(pretty(l)))) +',
              '  labs(title = .lr_wrap(paste0(pretty_var(v), ": one panel for each group")), x = pretty_var(v), y = "Number of students") +',
              '  theme_classic(base_size = 14)',
              'if (!is.null(curves)) { curves$class <- factor(curves$class, levels = levels(pd$class)); p <- p + geom_line(data = curves, aes(x = x, y = y), colour = "#d62728", linewidth = 1.2) }',
              'p'
            ].join('\n'),
            caption: 'Grey bars: each group’s real data. Red curve: a bell curve with that group’s own mean, SD and number of students. Dashed line: that group’s mean.' },
          { type: 'exercise', id: 'ks3-facet', gate: true, needsData: true, h: 480,
            task: 'The code draws __one__ histogram of everyone together. Turn it into __two__ histograms, one for each group.\n\n' +
              '- Put a `+` at the end of the `theme_classic()` line.\n' +
              '- On the next line, add `facet_wrap(~ class, ncol = 1)`.\n\n' +
              'Run it, then press **Check my answer**.',
            code: [
              'df <- get_locked_df()',
              '',
              'ggplot(df, aes(x = height_cm)) +',
              '  geom_histogram(bins = 12, fill = "grey70", colour = "white") +',
              '  labs(title = "Everyone together", x = "Height / cm", y = "Number of students") +',
              '  theme_classic()',
              '',
              '# Add facet_wrap(~ class, ncol = 1) to make one panel for each group'
            ].join('\n'),
            check: [
              '{',
              'p <- .lr_plot(value, code, env)',
              'f <- if (is.null(p)) NULL else p$facet',
              'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
              'else if (inherits(value, "Facet")) "Put a + at the end of the theme_classic() line, so that facet_wrap() joins the graph."',
              'else if (is.null(p)) "End your code with the graph: ggplot(…) + … + facet_wrap(~ class, ncol = 1)."',
              'else if (inherits(f, "FacetNull")) "Add facet_wrap(~ class, ncol = 1) at the end of the graph, with a + at the end of the line before it."',
              'else if (!.lr_by_class(p)) "Split the graph by class: facet_wrap(~ class, ncol = 1)."',
              'else if (inherits(f, "FacetWrap") && !isTRUE(as.numeric(f$params$ncol) == 1)) "Add ncol = 1, so that the panels sit one above the other: facet_wrap(~ class, ncol = 1)."',
              'else if (inherits(f, "FacetGrid") && !("class" %in% names(f$params$rows))) "Put the panels one above the other: facet_wrap(~ class, ncol = 1)."',
              'else if (!is.null(e <- .lr_draw_error(p))) paste("R cannot draw the graph yet:", e)',
              'else TRUE',
              '}'
            ].join('\n'),
            solution: [
              'df <- get_locked_df()',
              'ggplot(df, aes(x = height_cm)) +',
              '  geom_histogram(bins = 12, fill = "grey70", colour = "white") +',
              '  labs(title = "Everyone together", x = "Height / cm", y = "Number of students") +',
              '  theme_classic() +',
              '  facet_wrap(~ class, ncol = 1)'
            ].join('\n'),
            hint: 'Each layer joins with `+`. The last two lines of the graph are:\n\n`  theme_classic() +`\n`  facet_wrap(~ class, ncol = 1)`',
            pass: 'You split the graph into one panel for each group.' },
          { type: 'interpret', title: 'Compare the two panels',
            md: '- __Centre__: which group’s bars sit further to the right? That group has bigger values on average.\n' +
              '- __Spread__: which group’s bars cover a wider range? That group varies more.\n' +
              '- In the sample class, look at shoe size in the graph above: the two centres are clearly different. Then look at height: the two groups overlap a lot.' }
        ] },

      /* ---------- 6 ---------- */
      { id: 'qq', title: 'Q–Q plots: is it normal?',
        lede: 'A Q–Q plot is a quick way to see whether data are roughly normal (bell-shaped).',
        blocks: [
          { type: 'goal', md: 'Use a Q–Q plot to check whether each group’s data are roughly normal.' },
          /* audit 4: check EACH group, not the merged data; with about 15 students a Q–Q plot is a rough check */
          { type: 'concept', title: 'How a Q–Q plot works',
            md: 'A **Q–Q plot** compares your data with a perfect bell curve.\n\n' +
              '- R sorts your values from the smallest to the largest.\n' +
              '- Next to each value, R puts the value that a perfect bell curve would have in the same place.\n' +
              '- Each dot is one student. The straight line shows where the dots would be if the data were perfectly normal.\n\n' +
              'The rule:\n\n' +
              '- The dots stay close to the line: the data are __roughly normal__.\n' +
              '- The dots bend away from the line in a clear curve or S-shape: the data are __not normal__. The data are still useful, but some statistical tests do not suit them.\n\n' +
              'Check each group __on its own__. Two groups mixed together can make a shape with two peaks, even when each group is normal.\n\n' +
              'With about 15 students in a group, the dots always wobble a little, even for normal data. So a Q–Q plot is only a __rough__ check.' },
          { type: 'analogy', title: 'A Q–Q plot',
            md: 'Your group lines up from the shortest to the tallest. Next to them, a model group lines up. The model group has the same number of people, the same mean and the same SD, but their heights follow a perfect bell curve. Each student stands next to the model person in the same place: shortest with shortest, second with second, and so on.\n\n' +
              'If every student is about as tall as their model partner, the dots fall on the line. If your tallest students are much taller than the model’s tallest, the dots bend up at the end.' },
          /* audit 4: the old quiz asked about four plots that were never shown; here they are, drawn by R from invented data */
          { type: 'mcq', id: 'ks3-qq-examples', gate: true, keepOrder: true,
            q: 'Look at the four Q–Q plots, A to D. Which one shows data that are __roughly normal__?',
            visual: { type: 'rplot', title: 'Four examples, A to D', w: 620, h: 480,
              md: 'These four data sets are invented. Each one has 150 values. Look at the Q–Q plots first. Then choose **Histograms** to see the shape of each data set.',
              pickers: [{ id: 'show', label: 'Show', values: [{ v: 'qq', t: 'Q–Q plots' }, { v: 'hist', t: 'Histograms' }], 'default': 'qq' }],
              code: [
                'set.seed(1); xa <- rnorm(150, mean = 150, sd = 7)                  # A: normal',
                'set.seed(2); xb <- 138 + rexp(150, rate = 1 / 9)                    # B: long tail on the right',
                'set.seed(3); xc <- c(rnorm(75, 140, 4), rnorm(75, 165, 4))          # C: two peaks',
                'set.seed(4); xd <- runif(150, 130, 170)                             # D: flat',
                'ex <- data.frame(plot = rep(c("Plot A", "Plot B", "Plot C", "Plot D"), each = 150), value = c(xa, xb, xc, xd))',
                'if ("{{show}}" == "hist") {',
                '  ggplot(ex, aes(x = value)) + geom_histogram(bins = 20, fill = "grey75", colour = "white") +',
                '    facet_wrap(~ plot, ncol = 2) + labs(x = "Value (invented data)", y = "Number of values") + theme_classic(base_size = 14)',
                '} else {',
                '  ggplot(ex, aes(sample = value)) + stat_qq(size = 1.2, colour = "grey25") + stat_qq_line(colour = "#d62728", linewidth = 1) +',
                '    facet_wrap(~ plot, ncol = 2) + labs(x = "Perfect bell curve (theoretical)", y = "The data, sorted") + theme_classic(base_size = 14) +',
                '    theme(panel.spacing = unit(1.5, "lines"))',
                '}'
              ].join('\n') },
            opts: [
              { t: 'Plot A', ok: true, why: 'Yes. In A the dots stay close to the straight line from one end to the other.' },
              { t: 'Plot B', why: 'In B the dots bend up at the right end. A few values are much bigger than a bell curve would give: the data have a long tail on the right.' },
              { t: 'Plot C', why: 'In C the dots make a step in the middle. The data have two peaks, with a gap between them.' },
              { t: 'Plot D', why: 'In D the dots make an S-shape and go flat at both ends. The data are flat: there is no peak in the middle.' }
            ] },
          { type: 'rplot', title: 'Your data: one Q–Q plot for each group', w: 620, h: 360,
            pickers: [{ id: 'var', label: 'Measurement', from: '.lr_vars()', 'default': 'height_cm' }],
            code: [
              'd <- get_locked_df(); v <- "{{var}}"',
              'pd <- data.frame(class = d$class, x = d[[v]]); pd <- pd[is.finite(pd$x), ]',
              'ggplot(pd, aes(sample = x)) +',
              '  stat_qq(size = 2.5, colour = "grey25") +',
              '  stat_qq_line(colour = "#d62728", linewidth = 1) +',
              '  facet_wrap(~ class) +',
              '  labs(title = .lr_wrap(paste0("Q–Q plots: ", pretty_var(v))), x = "Perfect bell curve (theoretical)", y = "Your data, sorted") +',
              '  theme_classic(base_size = 14) + theme(panel.spacing = unit(1.5, "lines"))'
            ].join('\n'),
            caption: 'Each dot is one student. Red line: where the dots would be if the data were perfectly normal. One panel for each group.' },
          { type: 'exercise', id: 'ks3-qq', gate: true, needsData: true, h: 360,
            task: 'Draw Q–Q plots for a different measurement, one for each group.\n\n' +
              '- Replace `____` with the name of a measurement, for example `armspan_cm` (no quote marks).\n' +
              '- Change `"black"` to another colour, for example `"red"`.\n\n' +
              'Run it. Do the dots follow the line in __each__ group? Then press **Check my answer**.',
            code: [
              'df <- get_locked_df()',
              '',
              '# 1) Replace ____ with a measurement, for example armspan_cm',
              'ggplot(df, aes(sample = ____)) +',
              '  stat_qq() +',
              '  # 2) Change "black" to another colour',
              '  stat_qq_line(colour = "black") +',
              '  # one panel for each group: check each group on its own',
              '  facet_wrap(~ class) +',
              '  labs(title = "Q–Q plot for each group", x = "Perfect bell curve", y = "Your data, sorted") +',
              '  theme_classic()'
            ].join('\n'),
            check: [
              '{',
              'v <- pick_numeric_vars(get_locked_df())',
              'p <- .lr_plot(value, code, env)',
              'sv <- if (is.null(p)) NULL else .lr_aes(p, "sample")',
              'ql <- if (is.null(p)) list() else .lr_layers(p, stat = "StatQqLine")',
              'col <- if (length(ql)) .lr_param(ql[[1]], "colour") else NULL',
              'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
              'else if (is.null(p)) "End your code with the graph: ggplot(…) + … + theme_classic()."',
              'else if (is.null(sv)) "Keep aes(sample = …) inside ggplot()."',
              'else if (!(sv %in% v)) .lr_name_msg(sv, v)',
              'else if (!length(ql)) "Keep stat_qq_line(): it draws the straight line."',
              'else if (is.null(col) || .lr_is_black(col)) "Change \\"black\\" to another colour, for example \\"red\\"."',
              'else if (!.lr_colour_ok(col)) paste0("R does not know the colour \\"", col, "\\". Try \\"red\\", \\"blue\\" or \\"darkgreen\\".")',
              'else if (!.lr_by_class(p)) "Keep facet_wrap(~ class), so that you check each group on its own."',
              'else if (!is.null(e <- .lr_draw_error(p))) paste("R cannot draw the graph yet:", e)',
              'else TRUE',
              '}'
            ].join('\n'),
            solution: [
              'df <- get_locked_df()',
              'ggplot(df, aes(sample = armspan_cm)) +',
              '  stat_qq() +',
              '  stat_qq_line(colour = "red") +',
              '  facet_wrap(~ class) +',
              '  labs(title = "Q–Q plot for each group", x = "Perfect bell curve", y = "Your data, sorted") +',
              '  theme_classic()'
            ].join('\n'),
            hint: 'Write the measurement with no quote marks: `aes(sample = armspan_cm)`. Keep the quote marks around the colour: `colour = "red"`.',
            pass: 'You drew a Q–Q plot for each group, with your own line colour.' },
          { type: 'interpret', title: 'Reading your Q–Q plots',
            md: '- Look at each panel on its own. If most dots are close to the line, that group is roughly normal.\n' +
              '- One or two dots away from the line at the ends are common with about 15 students. They do not make the data "not normal".\n' +
              '- A clear curve or S-shape through many dots means the data are not normal.\n' +
              '- With a small group, this is a rough check, not a final answer.' }
        ] },

      /* ---------- 7 ---------- */
      /* audit 1: the old heading said "Compare Standard Variation (SD)"; audit 2: 1 d.p. here too */
      { id: 'sd', title: 'Which group varies more?',
        lede: 'The SD tells you how much a group varies. Now you compare the SD of the two groups.',
        blocks: [
          { type: 'goal', md: 'Work out the standard deviation (SD) of one measurement for each group, and say which group varies more.' },
          { type: 'example', title: 'How group_by() and summarise() work',
            code: [
              '# A tiny example: four students',
              'class   height_cm',
              'Girls   150',
              'Girls   160',
              'Boys    170',
              'Boys    180',
              '',
              '# group_by(class) splits the rows into two piles:',
              '#   Girls: 150, 160        Boys: 170, 180',
              '# summarise(sd_value = sd(height_cm)) works out one SD for each pile:',
              'class   sd_value',
              'Girls   7.1',
              'Boys    7.1'
            ].join('\n'),
            md: '`group_by()` sorts the rows into piles, one pile for each group. `summarise()` then works out one number for each pile.\n\n' +
              'Here the girls and the boys have the same SD (7.1 cm). The boys are taller, but they are __not__ more spread out. The mean and the SD tell you different things.' },
          { type: 'rtable', title: 'The SD of every measurement, for each group',
            md: 'R worked this out from your data, to 1 d.p.',
            code: [
              'd <- get_locked_df(); v <- pick_numeric_vars(d)',
              'out <- data.frame(Measurement = pretty_var(v), stringsAsFactors = FALSE)',
              'for (k in levels(droplevels(d$class))) out[[paste0("SD of ", k, " / cm")]] <- vapply(v, function(x) {',
              '  y <- d[[x]][d$class == k]; formatC(sd(y[is.finite(y)]), format = "f", digits = 1) }, character(1), USE.NAMES = FALSE)',
              'out'
            ].join('\n') },
          { type: 'exercise', id: 'ks3-sd', gate: true, needsData: true,
            task: 'Complete the code, so that R works out one SD for each group.\n\n' +
              '- Blank 1: group the data by `class`.\n' +
              '- Blank 2: call the new column `sd_value`.\n' +
              '- Blank 3: the function that works out the standard deviation.\n\n' +
              '`round(…, 1)` gives the SD to 1 d.p., like the table in stage 3. Run it, then press **Check my answer**. You can also change `"height_cm"` to another measurement.',
            code: [
              'df <- get_locked_df()',
              '',
              'trait <- "height_cm"',
              '',
              'df %>%',
              '  select(class, value = all_of(trait)) %>%',
              '  filter(is.finite(value)) %>%',
              '  group_by(____) %>%                # blank 1',
              '  summarise(',
              '    ____ = round(____(value), 1)    # blanks 2 and 3',
              '  )'
            ].join('\n'),
            check: [
              '{',
              'd <- get_locked_df(); v <- pick_numeric_vars(d)',
              'tr <- if (exists("trait", envir = env, inherits = FALSE)) get("trait", envir = env) else "height_cm"',
              'got <- if (is.data.frame(value)) as.data.frame(value) else NULL',
              'near <- function(a, b) isTRUE(all(abs(a - b) < 1e-6))',
              'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
              'else if (!is.character(tr) || !(tr %in% v)) paste0("Make trait the name of a measurement, in quote marks, for example \\"", v[1], "\\".")',
              'else if (is.null(got)) "Keep the %>% pipes between the steps, so the last thing your code makes is the table."',
              'else if (!("class" %in% names(got))) "Group the data by class: group_by(class)."',
              'else if (!("sd_value" %in% names(got))) "Call the new column sd_value: sd_value = round(sd(value), 1)."',
              'else {',
              '  x <- d[[tr]]; ok <- is.finite(x); g <- droplevels(d$class[ok])',
              '  want <- data.frame(class = levels(g), s = as.numeric(tapply(x[ok], g, sd)), mu = as.numeric(tapply(x[ok], g, mean)))',
              '  got$class <- as.character(got$class)',
              '  m <- merge(want, got, by = "class")',
              '  if (nrow(got) != nrow(want) || nrow(m) != nrow(want)) "Group by class only: group_by(class) gives one row for each group."',
              '  else if (near(m$sd_value, round(m$s, 1))) TRUE',
              '  else if (near(m$sd_value, round(m$mu, 1))) "That is the mean. Use sd() to work out the standard deviation (blank 3)."',
              '  else if (near(m$sd_value, m$s)) "Keep round(…, 1), so that the SD has 1 decimal place."',
              '  else "Use sd(value) inside summarise() (blank 3), and keep round(…, 1)."',
              '}',
              '}'
            ].join('\n'),
            solution: [
              'df <- get_locked_df()',
              'trait <- "height_cm"',
              'df %>%',
              '  select(class, value = all_of(trait)) %>%',
              '  filter(is.finite(value)) %>%',
              '  group_by(class) %>%',
              '  summarise(sd_value = round(sd(value), 1))'
            ].join('\n'),
            hint: 'The three blanks are `class`, `sd_value` and `sd`.',
            pass: 'You worked out one SD for each group. The group with the bigger SD varies more.' },
          { type: 'interpret', title: 'Which group varies more?',
            md: '- The group with the __bigger SD__ has more variation in that measurement: its students are more different from each other.\n' +
              '- Compare the two groups for the __same__ measurement only.\n' +
              '- Each group is small (about 15 students). So a small difference between two SDs, for example 5.2 and 5.6, may just be chance.' }
        ] },

      /* ---------- 8 ---------- */
      { id: 'errorbars', title: 'Error bars: mean ± SD',
        lede: 'A bar chart shows the means. Error bars add the spread.',
        blocks: [
          { type: 'goal', md: 'Draw a bar chart of the means, and add error bars that show ± 1 SD.' },
          { type: 'concept', title: 'Error bars',
            md: 'An **error bar** is a thin line through the top of a bar. Here it goes from __mean − 1 SD__ up to __mean + 1 SD__.\n\n' +
              '- A long error bar: the students in that group vary a lot.\n' +
              '- A short error bar: the students in that group are similar.\n\n' +
              'These error bars show how much the __students__ vary. They cannot tell you whether the difference between two means is real. Only a statistical test can decide that (the Extension in stage 10). So two error bars that overlap do __not__ show that the groups are the same.' },
          { type: 'analogy', title: 'An error bar',
            md: 'Stand at the top of a bar, at the mean. Reach one hand up by 1 SD and the other hand down by 1 SD. For bell-shaped data, about 2 out of every 3 students have a value between your two hands.' },
          { type: 'rplot', title: 'What an error bar covers', w: 620, h: 400,
            pickers: [{ id: 'var', label: 'Measurement', from: '.lr_vars()', 'default': 'height_cm' }],
            code: [
              'd <- get_locked_df(); v <- "{{var}}"',
              'pd <- data.frame(class = d$class, x = d[[v]]); pd <- pd[is.finite(pd$x), ]',
              'st <- pd %>% group_by(class) %>% summarise(m = mean(x), sdv = sd(x), .groups = "drop")',
              'ggplot(pd, aes(x = class, y = x)) +',
              '  geom_point(position = position_jitter(width = 0.12, height = 0, seed = 1), colour = "grey60", size = 2.2) +',
              '  geom_errorbar(data = st, aes(x = class, ymin = m - sdv, ymax = m + sdv), inherit.aes = FALSE, width = 0.25, linewidth = 1) +',
              '  geom_point(data = st, aes(x = class, y = m), inherit.aes = FALSE, size = 4) +',
              '  labs(title = .lr_wrap(paste0(pretty_var(v), ": the mean ± 1 SD of each group")), x = "Group", y = pretty_var(v)) +',
              '  theme_classic(base_size = 14)'
            ].join('\n'),
            caption: 'Each grey dot is one student. The black dot is the mean. The error bar goes from mean − 1 SD to mean + 1 SD: it covers the middle part of the dots.' },
          /* audit 5: the old message said 'Make error bars red: colour = "black"'. The task, the check and the
             hint now all ask for black; the check reads the colour from the graph itself */
          { type: 'exercise', id: 'ks3-errorbars', gate: true, needsData: true, h: 520,
            task: 'The code works out the mean and the SD of every measurement, for each group. Then it draws the means as bars. Add the error bars.\n\n' +
              '- Fill in `ymin` and `ymax`: the bottom of the error bar is `mean_value - sd_value`, and the top is `mean_value + sd_value`.\n' +
              '- Set the width: `width = 0.2`.\n' +
              '- Make the error bars black: `colour = "black"`.\n' +
              '- Change the y-axis label to `"Mean ± SD"`.\n\n' +
              'Each panel is one measurement, with its own y-axis. Compare the two bars __inside__ one panel. Then press **Check my answer**.',
            code: [
              'df <- get_locked_df()',
              'num_vars <- pick_numeric_vars(df)',
              '',
              '# one row for each student and each measurement',
              'long <- df %>%',
              '  select(class, all_of(num_vars)) %>%',
              '  pivot_longer(cols = all_of(num_vars), names_to = "variable", values_to = "value") %>%',
              '  filter(is.finite(value))',
              '',
              '# the mean and the SD of each measurement, for each group',
              'sum_df <- long %>%',
              '  group_by(class, variable) %>%',
              '  summarise(mean_value = mean(value), sd_value = sd(value), .groups = "drop") %>%',
              '  mutate(variable_pretty = pretty_var(variable))',
              '',
              'ggplot(sum_df, aes(x = class, y = mean_value, fill = class)) +',
              '  geom_col(width = 0.7) +',
              '  # Fill in the blanks',
              '  geom_errorbar(',
              '    aes(ymin = mean_value - ____, ymax = mean_value + ____),',
              '    width = ____,',
              '    colour = "____"',
              '  ) +',
              '  facet_wrap(~ variable_pretty, scales = "free_y", ncol = 2) +',
              '  labs(title = "Mean ± SD of each measurement", x = "Group", y = "____ ± ____") +',
              '  theme_classic()'
            ].join('\n'),
            check: [
              '{',
              'p <- .lr_plot(value, code, env)',
              'eb <- if (is.null(p)) list() else .lr_layers(p, geom = "GeomErrorbar")',
              'dat <- if (is.null(p)) NULL else as.data.frame(p$data)',
              'ev <- function(a) { if (!length(eb)) return(NULL); m <- eb[[1]]$mapping[[a]]; if (is.null(m)) m <- p$mapping[[a]]; if (is.null(m)) return(NULL); tryCatch(as.numeric(rlang::eval_tidy(m, dat)), error = function(e) NULL) }',
              'same <- function(a, b) !is.null(a) && length(a) == length(b) && isTRUE(all(abs(a - b) < 1e-9))',
              'w <- if (length(eb)) .lr_param(eb[[1]], "width") else NULL',
              'col <- if (length(eb)) .lr_param(eb[[1]], "colour") else NULL',
              'yl <- if (is.null(p)) NULL else p$labels$y',
              'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
              'else if (is.null(p)) "End your code with the graph: ggplot(…) + … + theme_classic()."',
              'else if (!length(eb)) "Keep geom_errorbar(), joined to the graph with a +."',
              'else if (!all(c("mean_value", "sd_value") %in% names(dat))) "Keep the code that makes sum_df, with the columns mean_value and sd_value."',
              'else if (!same(ev("ymin"), dat$mean_value - dat$sd_value)) "Make the bottom of each error bar the mean minus 1 SD: ymin = mean_value - sd_value."',
              'else if (!same(ev("ymax"), dat$mean_value + dat$sd_value)) "Make the top of each error bar the mean plus 1 SD: ymax = mean_value + sd_value."',
              'else if (is.null(w) || !isTRUE(abs(as.numeric(w) - 0.2) < 1e-9)) "Set the width of the error bars: width = 0.2."',
              'else if (is.null(col) || !.lr_is_black(col)) "Make the error bars black: colour = \\"black\\"."',
              'else if (is.null(yl) || !grepl("mean", yl, ignore.case = TRUE) || !grepl("sd", yl, ignore.case = TRUE)) "Change the y-axis label to \\"Mean ± SD\\"."',
              'else if (!is.null(e <- .lr_draw_error(p))) paste("R cannot draw the graph yet:", e)',
              'else TRUE',
              '}'
            ].join('\n'),
            solution: [
              'df <- get_locked_df()',
              'num_vars <- pick_numeric_vars(df)',
              'long <- df %>%',
              '  select(class, all_of(num_vars)) %>%',
              '  pivot_longer(cols = all_of(num_vars), names_to = "variable", values_to = "value") %>%',
              '  filter(is.finite(value))',
              'sum_df <- long %>%',
              '  group_by(class, variable) %>%',
              '  summarise(mean_value = mean(value), sd_value = sd(value), .groups = "drop") %>%',
              '  mutate(variable_pretty = pretty_var(variable))',
              'ggplot(sum_df, aes(x = class, y = mean_value, fill = class)) +',
              '  geom_col(width = 0.7) +',
              '  geom_errorbar(aes(ymin = mean_value - sd_value, ymax = mean_value + sd_value), width = 0.2, colour = "black") +',
              '  facet_wrap(~ variable_pretty, scales = "free_y", ncol = 2) +',
              '  labs(title = "Mean ± SD of each measurement", x = "Group", y = "Mean ± SD") +',
              '  theme_classic()'
            ].join('\n'),
            hint: 'The finished lines are:\n\n`aes(ymin = mean_value - sd_value, ymax = mean_value + sd_value),`\n`width = 0.2,`\n`colour = "black"`\n\nand, in `labs()`, `y = "Mean ± SD"`.',
            pass: 'Your bar chart shows the mean ± 1 SD of every measurement for each group, with black error bars.' },
          { type: 'mcq', id: 'ks3-overlap', gate: true,
            q: 'In one panel, the error bars of the two groups overlap. What can you say?',
            opts: [
              { t: 'Nothing yet about whether the difference is real. Only a statistical test can decide that.', ok: true,
                why: 'Yes. Overlapping SD error bars show that many students in the two groups have similar values. They do not decide whether the two means are really different.' },
              { t: 'The two groups are the same.', why: 'Overlap does not show that the groups are the same. Only a statistical test can decide whether a difference is real.' },
              { t: 'The difference between the means is significant.', why: '"Significant" is a word for the result of a statistical test. Error bars alone cannot tell you this.' },
              { t: 'The group with the longer error bar has the bigger mean.', why: 'The length of an error bar shows the spread (the SD), not the mean. The mean is the top of the bar.' }
            ] },
          { type: 'interpret', title: 'Reading your bar chart',
            md: '- The top of each bar is the mean. Compare the two bars in one panel: which group has the bigger mean?\n' +
              '- The length of each error bar shows the SD. A longer error bar means more variation in that group.\n' +
              '- Each panel has its own y-axis. Compare the bars inside one panel, not across panels.' }
        ] },

      /* ---------- 9 ---------- */
      /* audit 6: the two GROUPS are compared within ONE measurement, on one y-axis (no scales = "free_y",
         no comparing IQRs across measurements of very different sizes); outliers are checked, not deleted */
      { id: 'boxplots', title: 'Boxplots and outliers',
        lede: 'A boxplot shows the middle, the spread and any unusual values of a group, in one picture.',
        blocks: [
          { type: 'goal', md: 'Read a boxplot: the median, the box (the IQR) and the outliers. Compare the two groups for one measurement.' },
          { type: 'concept', title: 'How to read a boxplot',
            md: 'A bar chart shows only the mean. A **boxplot** shows more of the data.\n\n' +
              '- The **median** is the middle value: half the students are below it, and half are above it. It is the thick line inside the box.\n' +
              '- **Q1**, the bottom of the box: a quarter (25 %) of the values are below it.\n' +
              '- **Q3**, the top of the box: three quarters (75 %) of the values are below it.\n' +
              '- The box holds the middle half of the students. Its height is the **interquartile range (IQR)**: IQR = Q3 − Q1. A taller box means more variation.\n' +
              '- The **whiskers**, the lines above and below the box, reach the highest and the lowest values that are not outliers.\n' +
              '- An **outlier** is a value far from the others. R’s rule: a value is an outlier when it is more than 1.5 × IQR beyond the box, above the top or below the bottom.\n\n' +
              'Look for outliers before you trust a mean: one extreme value can pull the mean up or down.' },
          { type: 'analogy', title: 'The box and the IQR',
            md: 'A group lines up from the smallest hand span to the largest. You split the line into four equal parts, with the same number of students in each part. The box is the two middle parts: the middle half of the group. The median is the student in the very middle. The IQR is the distance from one end of the box to the other. The whiskers are the rest of the line.' },
          { type: 'analogy', title: 'An outlier',
            md: 'One student stands far away from the rest of the line. Before you send them away, you ask why. Are they really that different? Or did someone write their number down wrongly? Outliers are __checked, not deleted__.' },
          { type: 'rplot', title: 'Compare the two groups', w: 620, h: 440,
            pickers: [{ id: 'var', label: 'Measurement', from: '.lr_vars()', 'default': 'height_cm' }],
            code: [
              'd <- get_locked_df(); v <- "{{var}}"',
              'pd <- data.frame(class = d$class, y = d[[v]]); pd <- pd[is.finite(pd$y), ]',
              'lv <- levels(pd$class); pd$xn <- as.numeric(pd$class)',
              'set.seed(1); pd$xj <- pd$xn + runif(nrow(pd), -0.07, 0.07)',
              '# outliers by the rule ggplot2 draws: more than 1.5 × IQR beyond the box',
              'pd$out <- unsplit(lapply(split(pd$y, pd$class), .lr_outlier), pd$class)',
              'st <- pd %>% group_by(class, xn) %>% summarise(q1 = quantile(y, 0.25, names = FALSE), med = median(y), q3 = quantile(y, 0.75, names = FALSE), m = mean(y), .groups = "drop")',
              'tx <- rbind(data.frame(xn = st$xn, y = st$q1, t = "Q1"), data.frame(xn = st$xn, y = st$med, t = "median"), data.frame(xn = st$xn, y = st$q3, t = "Q3"))',
              'tx <- tx %>% group_by(xn, y) %>% summarise(t = paste(t, collapse = " = "), .groups = "drop")',
              'ggplot(pd) +',
              '  geom_boxplot(aes(x = xn, y = y, group = class, fill = class), width = 0.4, alpha = 0.3, outlier.shape = NA) +',
              '  geom_point(aes(x = xj, y = y), size = 2, colour = "grey25") +',
              '  geom_point(data = pd[pd$out, ], aes(x = xj, y = y), shape = 21, size = 5, stroke = 1.3, colour = "#d62728", fill = NA) +',
              '  geom_point(data = st, aes(x = xn, y = m), shape = 23, size = 3.5, fill = "white", colour = "black") +',
              '  geom_text(data = tx, aes(x = xn + 0.23, y = y, label = t), hjust = 0, size = 4) +',
              '  scale_x_continuous(breaks = seq_along(lv), labels = lv, expand = expansion(add = c(0.4, 0.75))) +',
              '  labs(title = .lr_wrap(paste0(pretty_var(v), ": the two groups on one axis")), x = "Group", y = pretty_var(v)) +',
              '  theme_classic(base_size = 14) + theme(legend.position = "none")'
            ].join('\n'),
            caption: 'Each dot is one student. Thick line: the median. Box: Q1 to Q3 (its height is the IQR). White diamond: the mean. Red circle: an outlier (more than 1.5 × IQR beyond the box).' },
          { type: 'rquiz', id: 'ks3-boxquiz', gate: true,
            md: 'Use the graph above. Change the measurement to answer the second question.',
            key: [
              'd <- get_locked_df(); g <- levels(droplevels(d$class))',
              'hv <- .lr_find_var("height", 1); sv <- .lr_find_var("hand", 3)',
              'iq <- vapply(g, function(k) { x <- d[[hv]][d$class == k]; stats::IQR(x[is.finite(x)]) }, numeric(1))',
              'ho <- vapply(g, function(k) { x <- d[[sv]][d$class == k]; any(.lr_outlier(x[is.finite(x)])) }, logical(1))',
              'list(iqr = if (abs(iq[1] - iq[2]) < 1e-9) "They are the same" else unname(g[which.max(iq)]),',
              '     out = if (all(ho)) "Both groups" else if (!any(ho)) "Neither" else unname(g[ho]))'
            ].join('\n'),
            choices: 'levels(droplevels(get_locked_df()$class))',
            fields: [
              { id: 'iqr', label: 'Height: which group has the __larger IQR__ (the taller box)?', extra: ['They are the same'] },
              { id: 'out', label: 'Hand span: which group has an __outlier__?', extra: ['Both groups', 'Neither'] }
            ],
            tip: 'The IQR is the height of the box. An outlier has a red circle.',
            pass: 'You read the IQR and the outliers from the boxplots.' },
          { type: 'exercise', id: 'ks3-boxplot', gate: true, needsData: true,
            task: 'Draw your own boxplot of one measurement, with one box for each group.\n\n' +
              '- Replace the first `____` with a measurement, for example `handspan_cm` (no quote marks).\n' +
              '- Replace the second `____` with a label for the y-axis, for example `Hand span / cm`.\n\n' +
              'Run it, then press **Check my answer**.',
            code: [
              'df <- get_locked_df()',
              '',
              '# one box for each group, on one y-axis',
              'ggplot(df, aes(x = class, y = ____, fill = class)) +',
              '  geom_boxplot(width = 0.5) +',
              '  labs(x = "Group", y = "____") +',
              '  theme_classic()'
            ].join('\n'),
            check: [
              '{',
              'v <- pick_numeric_vars(get_locked_df())',
              'p <- .lr_plot(value, code, env)',
              'xv <- if (is.null(p)) NULL else .lr_aes(p, "x")',
              'yv <- if (is.null(p)) NULL else .lr_aes(p, "y")',
              'yl <- if (is.null(p)) NULL else p$labels$y',
              'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
              'else if (is.null(p)) "End your code with the graph: ggplot(…) + … + theme_classic()."',
              'else if (!length(.lr_layers(p, geom = "GeomBoxplot"))) "Keep geom_boxplot(): it draws the boxes."',
              'else if (is.null(xv) || xv != "class") "Keep x = class, so that R draws one box for each group."',
              'else if (is.null(yv)) "Put a measurement after y = inside aes()."',
              'else if (!(yv %in% v)) .lr_name_msg(yv, v)',
              'else if (is.null(yl) || !nzchar(trimws(yl)) || grepl("__", yl, fixed = TRUE)) "Write a label for the y-axis in labs(), for example y = \\"Hand span / cm\\"."',
              'else if (!is.null(e <- .lr_draw_error(p))) paste("R cannot draw the graph yet:", e)',
              'else TRUE',
              '}'
            ].join('\n'),
            solution: [
              'df <- get_locked_df()',
              'ggplot(df, aes(x = class, y = handspan_cm, fill = class)) +',
              '  geom_boxplot(width = 0.5) +',
              '  labs(x = "Group", y = "Hand span / cm") +',
              '  theme_classic()'
            ].join('\n'),
            hint: 'The finished lines are `aes(x = class, y = handspan_cm, fill = class)` and `labs(x = "Group", y = "Hand span / cm")`.',
            pass: 'You drew a boxplot with one box for each group, on one y-axis.' },
          { type: 'interpret', title: 'What to do with an outlier',
            md: '- An outlier can be __real__: some people really do have very large hands. It can also be a __mistake__: someone measured in a different way, or typed a wrong number.\n' +
              '- So a scientist __checks__ an outlier: how was it measured, and how was it written down? The scientist keeps it if it is real. They correct it or leave it out only for a clear reason, and they say so in the report.\n' +
              '- In the sample class, one girl’s hand span is 21.5 cm. It is an outlier among the girls, but several boys have a hand span close to it. So it could be real.' }
        ] },

      /* ---------- 10 ---------- */
      /* audit 7 (Daniel's call): the t-test stays, as an EXTENSION. Nothing inside is a gate, so stage 11 opens
         without it. Welch's t.test (R's default) per measurement; stars from p_stars(); tiny p in e-notation */
      { id: 'ttest', title: 'Extension: is the difference real?',
        lede: 'This stage is an optional extension. You can go on to stage 11 at any time.',
        blocks: [
          { type: 'goal', md: 'Optional: use a t-test to decide whether the means of the two groups are really different.' },
          { type: 'extension', title: 'The t-test and the p-value',
            md: 'Nothing in this box is needed to open stage 11.',
            blocks: [
              { type: 'concept', title: 'The question',
                md: 'The means of two groups are never exactly the same. Even two groups that are really the same differ a little, just by chance. This is called **random variation**.\n\n' +
                  'So the question is: __is the difference between the two means real, or could it be random variation?__\n\n' +
                  'A **t-test** answers this question for the means of two groups. It uses three things:\n\n' +
                  '- the difference between the two means\n' +
                  '- the SD of each group (how much the students vary)\n' +
                  '- the number of students in each group\n\n' +
                  'A small difference can matter when the SDs are small. A big difference may not matter when the SDs are very big.\n\n' +
                  'A t-test works best when:\n\n' +
                  '- each group is roughly normal (your histograms and Q–Q plots)\n' +
                  '- there are no extreme outliers (your boxplots)\n' +
                  '- the two groups are different students.\n\n' +
                  'R’s `t.test()` does **Welch’s t-test**: it works even when the two groups have different SDs.' },
              { type: 'concept', title: 'The p-value',
                md: 'A t-test gives a **p-value**, a number between 0 and 1. Think of it in three steps.\n\n' +
                  '- **Pretend** the two groups are really the same.\n' +
                  '- **Check:** how often would chance alone give a difference as big as yours? That number is p. 0.05 means 5 times in 100.\n' +
                  '- **Decide:** below 0.05, chance would rarely do this, so stop pretending: the difference is **statistically significant**. At 0.05 or above, it is not significant.\n\n' +
                  'To remember it: **too rare for chance? Stop pretending.**\n\n' +
                  'Significant does __not__ mean that the difference is big, important or certain.' },
              { type: 'analogy', title: 'The p-value',
                md: 'Your friend says that a coin is fair. You flip it 10 times. You get 6 heads: you are not surprised, because a fair coin often does that. You get 10 heads: you are very surprised, because a fair coin almost never does that. So you start to doubt that the coin is fair.\n\n' +
                  'The p-value measures this surprise. It asks: if the two groups were really the same, how surprising is the difference you found? A tiny p-value means very surprising.' },
              { type: 'exercise', id: 'ks3-ttest', needsData: true,
                task: 'Run the t-test for height, and find `p-value` in what R prints. Then change `"height_cm"` to another measurement, and run it again. Press **Check my answer** when you have tested a different measurement.',
                code: [
                  'df <- get_locked_df()',
                  '',
                  '# Change height_cm to another measurement',
                  'trait <- "height_cm"',
                  '',
                  'sub <- df %>%',
                  '  select(class, value = all_of(trait)) %>%',
                  '  filter(is.finite(value))',
                  '',
                  '# Welch’s t-test: compare the means of the two groups',
                  't.test(value ~ class, data = sub)'
                ].join('\n'),
                check: [
                  '{',
                  'tr <- if (exists("trait", envir = env, inherits = FALSE)) get("trait", envir = env) else NULL',
                  'if (!has("get_locked_df()")) "Keep the first line: df <- get_locked_df()."',
                  'else if (!inherits(value, "htest")) "End your code with the t-test: t.test(value ~ class, data = sub)."',
                  'else if (identical(tr, "height_cm")) "Now change \\"height_cm\\" to another measurement, and run the test again."',
                  'else TRUE',
                  '}'
                ].join('\n'),
                solution: [
                  'df <- get_locked_df()',
                  'trait <- "shoe_size_cm"',
                  'sub <- df %>%',
                  '  select(class, value = all_of(trait)) %>%',
                  '  filter(is.finite(value))',
                  't.test(value ~ class, data = sub)'
                ].join('\n'),
                hint: 'Change only the name in quote marks, for example `trait <- "shoe_size_cm"`. The names are in the table below, in brackets.',
                pass: 'Now run the test for each measurement, and fill in the table below.' },
              { type: 'note', title: 'Tiny p-values',
                md: 'R sometimes prints a tiny p-value in **e-notation**, for example `1.2e-07`. The `e-07` means "move the decimal point 7 places to the left": 1.2e-07 = 0.00000012. That is much smaller than 0.05.\n\n' +
                  'In the table, type the p-value to 4 decimal places, for example `0.0000`. Or copy it as R prints it, for example `1.2e-07`. Both count.' },
              { type: 'note', title: 'Stars for significance',
                md: '- p < 0.001: `***` (very strong evidence of a difference)\n' +
                  '- p < 0.01: `**`\n' +
                  '- p < 0.05: `*`\n' +
                  '- p ≥ 0.05: `ns` (not significant)\n\n' +
                  'Use the smallest cut-off that your p-value is below. For example, p = 0.012 is below 0.05 but not below 0.01, so it gets `*`.' },
              /* the key: Welch's t.test (R's default) for every measurement; p within 0.0005, so 4 d.p. or e-notation both pass */
              { type: 'filltable', id: 'ks3-ttest-table', title: 'Your t-test table', rowLabel: 'Measurement',
                md: 'R works out the right answers from your data. Fill in the p-value and the stars for each measurement.',
                key: [
                  'd <- get_locked_df()',
                  'do.call(rbind, lapply(pick_numeric_vars(d), function(v) {',
                  '  s <- data.frame(class = d$class, value = d[[v]]); s <- s[is.finite(s$value), ]; s$class <- droplevels(s$class)',
                  '  p <- tryCatch(stats::t.test(value ~ class, data = s)$p.value, error = function(e) NA_real_)',
                  '  data.frame(label = paste0(pretty_var(v), " (", v, ")"), p = p, stars = p_stars(p))',
                  '}))'
                ].join('\n'),
                fields: [
                  { key: 'p', label: 'p-value', tol: 0.0005 },
                  { key: 'stars', label: 'Stars', options: ['***', '**', '*', 'ns'] }
                ],
                tip: 'Run the t-test above once for each measurement. Type p to 4 decimal places (0.0000 for a tiny p), or copy it as R prints it.',
                pass: 'Your table is right: every p-value and every star.' },
              { type: 'interpret', title: 'What your table means',
                md: '- A measurement with `*`, `**` or `***`: chance alone would rarely give a difference this big between the two means.\n' +
                  '- A measurement with `ns`: this test found no clear evidence of a difference. That does __not__ show that the two groups are the same. With about 15 students in each group, a small real difference is easy to miss.\n' +
                  '- In the sample class, only shoe size is significant: the boys’ mean is bigger. Height, arm span and hand span are `ns`.' }
            ] }
        ] },

      /* ---------- 11 ---------- */
      { id: 'final', title: 'Your own graph',
        lede: 'The final challenge: build a graph of your choice, make it your own, and write about what it shows.',
        blocks: [
          { type: 'goal', md: 'Build your own graph with ggplot2, change it, and write 6–8 sentences about what it shows.' },
          { type: 'concept', title: 'The plan',
            md: '- Choose a type of graph and a measurement. R writes the ggplot2 code for you.\n' +
              '- Press **Run**.\n' +
              '- Change the code: a colour, the title, the labels or the number of bins. Run it again after each change.\n' +
              '- If your code stops with an error, undo your last change, or choose the graph again in the menu.' },
          { type: 'builder', id: 'ks3-builder', vars: '.lr_vars()',
            md: 'Choose, run, then change.' },
          { type: 'frames', title: 'Write 6–8 sentences about your graph',
            items: [
              'The graph shows ___ for the two groups.',
              'The distribution of ___ is roughly bell-shaped / not bell-shaped, because ___.',
              'The mean for ___ is ___ cm, and the mean for ___ is ___ cm.',
              '___ has the bigger SD (___ cm, compared with ___ cm), so ___ varies more.',
              'The boxplot shows an outlier / no outliers in ___. An outlier should be checked because ___.',
              'If you did the extension: the t-test gives p = ___, so the difference between the means is / is not significant.',
              'Variation matters for evolution because ___.',
              'One limitation is ___, because ___.'
            ] },
          { type: 'note', title: 'Ideas for a limitation',
            md: '- Each group has only about 15 students.\n' +
              '- Measuring errors: different people may measure hand span in different ways.\n' +
              '- Students are still growing, and they grow at different ages.' },
          { type: 'note', title: 'R at home',
            md: 'R is free, and it runs on any Mac or Windows computer. Ask an adult first, then install **R** from [cran.r-project.org](https://cran.r-project.org/) and **RStudio** from [posit.co](https://posit.co/download/rstudio-desktop/). The code you wrote here works there too. At IB, the last stage of [Statistics in R](https://nlcsbiology.com/learn-r/ib.html) shows you, step by step.' }
        ] }
    ]
  });
})(window.LR);
