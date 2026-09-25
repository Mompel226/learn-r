# Learn R — the spec

One site, three courses: **Year 8 · Variation** (`ks3.html`, `js/courses/ks3.js`), **IB · Statistics
in R** (`ib.html`, `js/courses/ib.js`) and **IB B1.1 · Starch curves in R** (`starch.html`,
`js/courses/starch.js`, moved from the practical's own page on 25 Sep 2026; the practical links here).
The front page (`index.html`) has three doors by level ("Never used R? Start here") and Daniel's showcase,
"Two things R does that a spreadsheet cannot" (`js/showcase.js`: the 3D cloud to drag, the map + four
charts, the 53 lines behind "Show me"), moved from his starch guide. Real R runs in the browser (webR v0.6.0):
nothing to install, nothing leaves the student's tab. Read this before editing.

## Decisions (Daniel, 25 Sep 2026)
- R in the browser (webR), one site with its courses side by side, an **invented** sample class plus an optional
  upload of the class spreadsheet (it never leaves the browser), and the tests beyond the IB kept as an
  **optional shelf** that never gates the core.
- The KS3 look and rule: **stages unlock one at a time**; a stage opens only when every `gate` block of
  the stage before is passed. One stage is on screen at a time; the stage list on the left.
- KS3: the t-test **stays, as an Extension** (his call): wrap it in an `extension` block; nothing inside
  an extension is a gate.
- Statistics are taught as **click-by-click stories** (the `story` block: every step waits for "Next step"),
  each with an amber **analogy**, on the lesson's own example — the way his C4.1 chi-squared slides do it.

## The reader
- IB students fresh from IGCSE, KS3 students aged 12–13; many are Korean EAL learners, many weak at maths.
- Write to the student: "you", present tense, short sentences, one idea per sentence, British spelling,
  no exclamation marks, no filler, no showy introductions. Define every statistics word the first time.
- An analogy for every hard idea (`analogy` block). Sentence frames where students write (`frames`).
- Emphasis is __underline__ (the house style); **bold** only for a term being defined or a button name.
- Numbers: whole numbers or 1 d.p. unless the point is precision. Never "proves".

## Statistics that must be right (and were wrong before)
- Overlapping 95 % CIs or error bars do **not** show "no significant difference"; only a test decides.
  Non-overlapping 95 % CIs → p < 0.05. (Seed-10 data: CIs overlap by 0.4 bpm, t-test p = 0.010.)
- A normality test with p > 0.05 means "no evidence against normality", not "normal". Small groups
  (≈ 15) give noisy Q–Q plots: a rough check. Check normality **in each group**, not in the merged data.
- Welch's t-test is for **unequal spreads**, not for non-normal data (that is Mann–Whitney).
- Outliers are **checked, not deleted automatically** (IB guide: identify and justify removal or inclusion).
- SD is the typical distance from the mean (a rough description); SE = SD ÷ √n describes the mean.
- A bigger sample does not change α (5 %); it reduces false negatives.
- Units: the sample data are in cm with .5 values → means and SDs to **1 d.p.**

## Files
    index.html            the three doors, the showcase, and how R runs here
    ks3.html · ib.html · starch.html   one course each (the same shell)
    css/app.css           the one stylesheet (Daniel's KS3 colours)
    js/core.js            LR.h · LR.md · LR.store · LR.on/emit
    js/r.js               webR: start, run a student's code, check it, draw
    js/editor.js          the code box (CodeMirror 5, textarea fallback)
    js/blocks.js          every block type
    js/course.js          the shell: stage list, unlock rule, progress, the dataset chooser
    js/story.js           the click-by-click story block (LR.S: tiny SVG helpers)
    js/showcase.js        the front page's figures and copy buttons
    js/courses/*.js       the content: one LR.course({...}) per file
    data/ks3-sample.*     the invented Year 8 class (tools/make-ks3-sample.R)
    tools/check.mjs       the gate (below)

## A course
    LR.course({ id, kicker, title, packages:['dplyr','tidyr','ggplot2'], setup:'R code', sample:'data/….json',
      finish:'…', stages:[ { id, title, lede, blocks:[ … ] } ] })
`setup` runs after R starts and again after a restart. The KS3 setup defines `get_locked_df()`,
`pick_numeric_vars()`, `pretty_var()`, `normal_curve_df()`, `p_stars()` and `.lr_vars()`.

## Blocks
| type | fields | notes |
|---|---|---|
| goal | md | the green "Goal" line at the top of a stage |
| text · concept · analogy · note | md, title?, files? (note only) | blue = idea; amber = analogy; a note's files:[{href, name, label, size}] are download links |
| interpret | title, md | violet, closed: "Open after you have tried" |
| example | code, md?, title? | code to read, not run |
| frames | items (use `___` for gaps), title? | |
| exercise | id, task, code (starter), check, solution, hint?, pass, gate?, needsData?, w?, h? | Run / Check / Start again. Code is saved per id. |
| mcq | id, q, opts:[{t, ok, why}], gate?, visual? | exactly one ok; every wrong option has a why |
| rplot | pickers:[{id, label, from (R → [{v,t}]) or values, default}], code (R with {{id}}), w, h, caption?, md? | R draws it; redraws on change |
| rtable | code (R → data frame), cols?, md? | |
| filltable | id, key (R → [{label, …}]), fields:[{key, label, tol?, options?}], gate?, pass?, tip? | numbers accept e-notation |
| rquiz | id, key (R → {fieldId: answer or [answers]}), choices (R → [..]), fields:[{id, label, extra?}], gate? | |
| dataset | id, gate | the KS3 chooser: sample class or upload |
| extension | title, md?, blocks | dashed box; never gate inside it |
| builder | id, vars (R → [{v,t}]), group?, md? | the plot builder |
| story | id, title, steps | click-by-click animation (see js/story.js) |

## Checks (R, run after the student's code)
The check is R code that returns `TRUE` or the message to show. It can use:
`has("…")` (the code contains this, ignoring spaces and comments; several arguments = all of them),
`code` (the student's code), `code0` (no spaces, no comments), `env` (the environment the code ran in:
`get("x", envir = env)`), `value` (the last value), `ran` (no error). Write messages as the next thing to
do ("Change 6 to 10 inside head()."), never "Wrong".
Every exercise with a check needs a `solution`; `node tools/check.mjs` runs every solution in the Mac's R
with the same helpers and the sample data, and fails if a solution does not pass, or if the starter
code already passes (set `starterPasses: true` only for "run this" exercises).

## The gate
    node tools/check.mjs            check (needs Rscript and the packages)
    node tools/check.mjs --stamp    check, then stamp ?v= and version.txt
Browser testing: the in-app browser (headless Chrome's package downloads fail here). `?all=1` opens every
stage without saving (teacher read-through); `?reset=1` forgets progress.

## Phones (audited 25 Sep 2026, 320–1280 px)
- R draws every graph at the width it is shown (`LR.plotSize`), so labels stay readable; page graphs wrap
  their titles with `.lr_wrap()` (it reads `.lr_plot_w`).
- A story's picture keeps at least 560 px on a phone, scrolls sideways, and each step brings its newly
  shown part into view. The showcase's map-and-charts figure does the same (640 px).
- Scroll boxes are `position: relative` (a hidden `.sr` label inside one once widened the page to 1560 px),
  and every block has `min-width: 0` (a long line of code once widened a stage).
- The top bar is not sticky below 900 px.

## Looks (Daniel, 25 Sep 2026: "improve aesthetic… the Start button is not at the same level")
- The three doors line up row by row (CSS subgrid; flex fallback): art, kicker, title, blurb, meta, Start. The
  "Never used R?" pill sits in the corner, out of the flow, so it never pushes one door's parts down.
- A story is **never an empty box**: step 1 must already show something (the coin story opens on the tally,
  53 heads v 47 tails). He saw only the "Your coin" pill in a big white box and could not follow it.
- A story's picture is capped at `100vh − 360px`, so the words and **Next step** stay on screen with it; a click
  keeps the whole block in view. `hide:[…]` lets a picture move on (tally → dots → bars); `pan:'part'` picks what a
  phone scrolls to. Lay out each step's key part inside a ~340-unit-wide window, so a phone shows it whole.
- Learn R teaches how a test works and runs it; the Write-Up Lab (Statistical tests) teaches how to choose and
  report it. Each links to the other.
