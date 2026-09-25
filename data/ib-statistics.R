# ============================================================
# Statistics in R · IB Biology · Learn R
# https://nlcsbiology.com/learn-r/ib.html
# Dr Daniel Mompel Riera · NLCS Jeju · CC BY-NC-SA 4.0
#
# The whole course as one script: the data, and the answer to every exercise,
# stage by stage, with the result you should get. The data are INVENTED, for learning.
#
# In RStudio: File > Open File..., choose this file, then
#   run one line:  put the cursor on it and press Ctrl + Enter (Mac: Cmd + Enter)
#   run it all:    Ctrl + Shift + Enter (Mac: Cmd + Shift + Enter), "Source with Echo"
# ============================================================

# The first time only, this installs the packages (a few minutes: wait for the > prompt).
if (!requireNamespace("dplyr", quietly = TRUE)) install.packages("dplyr")
if (!requireNamespace("ggplot2", quietly = TRUE)) install.packages("ggplot2")
library(dplyr)
library(ggplot2)

# ---- The data ----------------------------------------------------------------
# students: an invented class of 40. stomata_raw: an invented class spreadsheet, mistakes included.
students <- data.frame(
  id = 1:40,
  trains = factor(c("No", "No", "Yes", "Yes", "No", "Yes", "No", "Yes", "No", "No", "No", "No", "No", "Yes", "Yes", "No", "Yes", "No", "Yes", "Yes", "No", "No", "Yes", "No", "Yes", "Yes", "Yes", "No", "Yes", "No", "No", "Yes", "No", "Yes", "Yes", "No", "Yes", "No", "Yes", "Yes"), levels = c("No", "Yes")),
  exercise_h = c(2, 1, 9, 8, 1, 6, 1, 8, 0.5, 1, 1, 1.5, 1, 6, 6, 1, 9, 0.5, 7, 8, 1, 2, 5, 2, 7, 5, 9, 1, 7, 1.5, 1, 9, 1, 3, 7, 2, 7, 1.5, 8, 7),
  resting_hr = c(68, 87, 57, 66, 81, 79, 73, 77, 74, 74, 84, 71, 79, 75, 69, 79, 55, 62, 69, 77, 93, 70, 69, 78, 77, 91, 66, 70, 67, 75, 86, 65, 70, 78, 65, 79, 76, 87, 62, 71),
  abo = factor(c("A", "A", "B", "A", "A", "AB", "B", "B", "B", "AB", "O", "A", "O", "O", "A", "AB", "A", "B", "O", "O", "O", "O", "A", "O", "B", "A", "AB", "B", "O", "O", "A", "B", "O", "B", "A", "B", "A", "B", "A", "A"), levels = c("O", "A", "B", "AB"))
)
stomata_raw <- data.frame(
  leaf_id = 1:24,
  leaf = c("sun", "Shade", "sun", "shade", "SUN ", "shade", "Sun", "shade", "sun", " shade", "sun", "Shade", "sun", "shade", "Sun", "shade", "SUN ", "Shade", "sun", "shade", "Sun", " shade", "sun", "shade"),
  density_mm2 = c(198, 192, 204, 151, 1980, 173, 215, 184, 186, NA, 242, 159, 237, 202, 225, 169, 220, 201, 177, 188, 205, 175, 157, 214),
  note = c("", "", "", "", "", "", "", "", "", "leaf torn: not counted", "", "", "", "", "", "", "", "", "", "", "", "", "", ""),
  stringsAsFactors = FALSE
)

# ==== Stage 1 · R in ten minutes ==============================================================

# ---- Your turn · R as a calculator
(72 + 75 + 78) / 3
# You should get: 75 bpm. The brackets make R add first, then divide.

# ---- Your turn · a function
pulse <- c(72, 75, 78)
pulse
mean(pulse)
# You should get: mean() is a function: its name, then brackets round what it works on.

# ---- Your turn · a column
head(students)
nrow(students)
students$resting_hr
mean(students$resting_hr)
# You should get: 73.775 bpm: the mean resting heart rate of all 40 students.

# ==== Stage 2 · The middle of your data =======================================================

# ---- Your turn · one extreme value
six <- c(68, 87, 81, 73, 74, 74)
mean(six)
median(six)
seven <- c(68, 87, 81, 73, 74, 74, 112)
mean(seven)
median(seven)
# You should get: The mean rose from 76.2 to 81.3 bpm. The median stayed at 74 bpm.

# ---- Your turn · each group
students %>%
  group_by(trains) %>%
  summarise(mean = mean(resting_hr), median = median(resting_hr))
# You should get: No training: mean 77.0, median 76.5 bpm. Training: mean 70.55, median 69.0 bpm. In
# each group the mean and median are close: no extreme values pull them apart.

# ---- Your turn · the mode
table(students$abo)
names(which.max(table(students$abo)))
# You should get: The mode is A: 14 of the 40 students.

# ==== Stage 3 · Look before you test ==========================================================

# ---- Your turn · the fence
no_train <- students$resting_hr[students$trains == "No"]
readings <- c(no_train, 112)
quantile(readings)
IQR(readings)
quantile(readings, 0.75) + 1.5 * IQR(readings)
# You should get: 103.5 bpm. 112 is above it, so it is an outlier.

# ---- Your turn · box plots of both groups
ggplot(students, aes(x = trains, y = resting_hr)) +
  geom_boxplot() +
  labs(x = "Trains in a sports team?", y = "Resting heart rate / bpm")
# You should get: Every axis needs a label with its unit. Neither group has an outlier: the reading
# after PE is not in the table.

# ==== Stage 4 · Spread: the normal distribution and SD ========================================

# ---- Your turn · SD of each group
students %>%
  group_by(trains) %>%
  summarise(mean = mean(resting_hr), sd = sd(resting_hr), n = n())
# You should get: No training: 77.0 ± 7.75 bpm. Training: 70.55 ± 8.40 bpm. n = 20 in each. The
# spreads are similar.

# ---- Your turn · SD as error bars
summary_hr <- students %>%
  group_by(trains) %>%
  summarise(mean = mean(resting_hr), sd = sd(resting_hr))

ggplot(summary_hr, aes(x = trains, y = mean)) +
  geom_point(size = 3) +
  geom_errorbar(aes(ymin = mean - sd, ymax = mean + sd), width = 0.15) +
  labs(x = "Trains in a sports team?", y = "Mean resting heart rate / bpm")
# You should get: Each bar now runs from mean − 1 SD to mean + 1 SD. In your caption, say what the
# bars show: “error bars = ± 1 SD (n = 20)”.

# ==== Stage 5 · How sure is the mean? SE ======================================================

# ---- Your turn · the SE
no_train <- students$resting_hr[students$trains == "No"]
sd(no_train)
length(no_train)
sd(no_train) / sqrt(length(no_train))
# You should get: SE = 1.73 bpm. The SD was 7.75 bpm: √20 is about 4.5, so the SE is about a quarter
# of the SD.

# ==== Stage 6 · Is it real, or is it chance? ==================================================

# ---- Your turn
binom.test(80, 100)
# You should get: For 80 heads, p = 1.116e-09. That is 0.000000001116: far below 0.05, so you reject
# H₀.

# ==== Stage 7 · Which test? ===================================================================

# ---- Your turn · similar spread?
sds <- tapply(students$resting_hr, students$trains, sd)
sds
max(sds) / min(sds)
# You should get: 1.08: far below 2. The spreads are similar, so the standard t-test fits.

# ==== Stage 8 · The t-test ====================================================================

# ---- Your turn · the t-test in R
t.test(resting_hr ~ trains, data = students, var.equal = TRUE)
# You should get: “Two Sample t-test”: t = 2.52, df = 38, p = 0.016.

# ==== Stage 9 · The χ² test ===================================================================

# ---- Your turn · χ² in R
quadrats <- matrix(c(57, 9, 7, 27), nrow = 2,
  dimnames = list(moss = c("present", "absent"),
                  heather = c("present", "absent")))
quadrats
chisq.test(quadrats, correct = FALSE)
# You should get: χ² = 42.1, df = 1, p = 8.5e-11. The hand calculation, with E rounded to 1 d.p.,
# gave 42.4: the same decision.

# ---- Your turn · the expected counts
quadrats <- matrix(c(57, 9, 7, 27), nrow = 2,
  dimnames = list(moss = c("present", "absent"),
                  heather = c("present", "absent")))
test <- chisq.test(quadrats, correct = FALSE)
test$expected
# You should get: 42.24, 23.76, 21.76 and 12.24: every expected count is at least 5, so the test is
# valid.

# ---- Your turn · a new, imagined survey
survey <- matrix(c(12, 48, 30, 10), nrow = 2,
  dimnames = list(bracken = c("present", "absent"),
                  heather = c("present", "absent")))
survey
test <- chisq.test(survey, correct = FALSE)
test
test$expected

# ==== Stage 10 · Correlation and R² ===========================================================

# ---- Your turn · r and its p-value
cor.test(students$exercise_h, students$resting_hr)
# You should get: r = −0.50, p = 0.00091: a significant negative correlation.

# ---- Your turn · the line of best fit
ggplot(students, aes(x = exercise_h, y = resting_hr)) +
  geom_point(size = 2.5) +
  labs(x = "Exercise / hours per week", y = "Resting heart rate / bpm") +
  geom_smooth(method = "lm", formula = y ~ x, se = FALSE)
# You should get: A straight line of best fit, from a fitted equation. Only for a line like this may
# you report R².

# ---- Your turn · R²
model <- lm(resting_hr ~ exercise_h, data = students)
coef(model)
summary(model)$r.squared
# You should get: R² = 0.25. And r² = (−0.504)² = 0.254: for a straight line, R² is r squared.

# ==== Stage 11 · Put it together ==============================================================

# ---- Step 1 · Look before you fix
table(stomata_raw$leaf)
summary(stomata_raw$density_mm2)
stomata_raw[stomata_raw$note != "", ]

# ---- Step 2 · Fix the labels
stomata <- stomata_raw
stomata$leaf <- tolower(trimws(stomata$leaf))
table(stomata$leaf)
# You should get: Two labels now: shade 12, sun 12.

# ---- Step 3 · Remove what cannot be used
stomata <- stomata_raw
stomata$leaf <- tolower(trimws(stomata$leaf))
stomata <- stomata %>%
  filter(!is.na(density_mm2), density_mm2 < 500)
nrow(stomata)
# You should get: 22 leaves: 11 sun, 11 shade. In the method, say why two leaves were left out: one
# was torn and not counted; 1980 per mm² is about ten times any other count, most likely a typing
# error, and the true count was not recorded.

# ---- Step 4 · Describe each group
stomata <- stomata_raw
stomata$leaf <- tolower(trimws(stomata$leaf))
stomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)

stomata %>%
  group_by(leaf) %>%
  summarise(mean = mean(density_mm2), sd = sd(density_mm2), n = n())
# You should get: Sun: 206.0 ± 25.7 stomata per mm² (n = 11). Shade: 182.5 ± 19.3 (n = 11). The
# larger SD is less than twice the smaller: similar spreads.

# ---- Step 5 · The graph
stomata <- stomata_raw
stomata$leaf <- tolower(trimws(stomata$leaf))
stomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)
s <- stomata %>% group_by(leaf) %>%
  summarise(mean = mean(density_mm2), sd = sd(density_mm2))

ggplot(s, aes(x = leaf, y = mean)) +
  geom_point(size = 3) +
  geom_errorbar(aes(ymin = mean - sd, ymax = mean + sd), width = 0.15) +
  labs(x = "Leaf position", y = "Mean stomatal density / mm⁻²")
# You should get: Caption it: “Figure 1. Dot plot showing the effect of leaf position (sun or shade)
# on the mean stomatal density (n = 11; error bars = ± 1 SD).”

# ---- Step 6 · The test
stomata <- stomata_raw
stomata$leaf <- tolower(trimws(stomata$leaf))
stomata <- stomata %>% filter(!is.na(density_mm2), density_mm2 < 500)
t.test(density_mm2 ~ leaf, data = stomata, var.equal = TRUE)
# You should get: t = −2.42, df = 20, p = 0.025. (t is negative only because R takes shade − sun:
# shade comes first in the alphabet.)

# ==== Your own data ==========================================================
# One row for each measurement, one column for each variable, short column names with no spaces.
# Save the spreadsheet as a .csv file, then remove the # at the start of these lines:
# my_data <- read.csv(file.choose())   # a window opens: choose your .csv file
# head(my_data)                        # the first six rows
# str(my_data)                         # each column: numbers (num, int) or text (chr)?
