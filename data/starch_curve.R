# =============================================================================
#  STARCH CALIBRATION CURVE  -  one-click analysis
#  IB Biology B1.1
#  Dr Daniel Mompel Riera  -  free to use and adapt with credit (CC BY 4.0)
#
#  RUN IT:  press the  Source  button, top right.   (Cmd + Shift + Enter)
#  FIRST:   fill in the 'Your data' tab of the workbook and SAVE it,
#           and keep this file in the same folder as the workbook.
#
#  This file is the doing. The explanation - what every line means, how to
#  install R, and why you would use it at all - is in the guide:
#  "Starch calibration curve in R.html"  (open it in a browser).
# =============================================================================


# ---- 1. SETTINGS you may want to change -------------------------------------

WORKBOOK <- "Starch calibration curve.xlsx"
SHEET    <- "Your data"       # <- change to "Worked example" to test this
                              #    script before you have your own numbers


# ---- 2. Installs anything missing, once -------------------------------------

need <- c("readxl", "dplyr", "tidyr", "ggplot2")
new  <- need[!vapply(need, requireNamespace, logical(1), quietly = TRUE)]
if (length(new)) {
  message("Installing: ", paste(new, collapse = ", "), " - this happens once.")
  install.packages(new, repos = "https://cloud.r-project.org")
}
suppressPackageStartupMessages({
  library(readxl); library(dplyr); library(tidyr); library(ggplot2)
})

# Work in the folder this script is saved in.
if (requireNamespace("rstudioapi", quietly = TRUE) && rstudioapi::isAvailable()) {
  p <- tryCatch(rstudioapi::getActiveDocumentContext()$path, error = function(e) "")
  if (nzchar(p)) setwd(dirname(p))
}
if (!file.exists(WORKBOOK)) {
  message("Could not find '", WORKBOOK, "' next to this script.")
  message("Pick it in the window that opens.")
  WORKBOOK <- file.choose()
}
cat("Reading:", normalizePath(WORKBOOK), "\n")
cat("Sheet  :", SHEET, "\n\n")


# ---- 3. Read the workbook ---------------------------------------------------
# Only the cells you TYPE are read; everything else is recalculated here.

stock_pc <- as.numeric(suppressMessages(
  read_excel(WORKBOOK, SHEET, range = "B4:B4", col_names = FALSE))[[1]][1])

# cm3 of iodine going into every tube - read from the workbook, so this script
# and the spreadsheet can never disagree about the final volume.
iodine_cm3 <- as.numeric(suppressMessages(
  read_excel(WORKBOOK, SHEET, range = "B5:B5", col_names = FALSE))[[1]][1])
if (is.na(iodine_cm3)) iodine_cm3 <- 0

raw <- suppressMessages(
  read_excel(WORKBOOK, SHEET, range = "A7:K12", col_names = FALSE,
             col_types = c("text", rep("numeric", 9), "text")))
names(raw) <- c("tube","stock_cm3","water_cm3","total_cm3","conc_excel",
                "abs1","abs2","abs3","mean_excel","unc_excel","use")

std <- raw |>
  filter(rowSums(!is.na(cbind(abs1, abs2, abs3))) > 0) |>
  mutate(
    # Divide by the FULL tube volume, iodine included - exactly what the
    # workbook's Total volume column does.
    total         = stock_cm3 + water_cm3 + iodine_cm3,
    concentration = stock_pc * stock_cm3 / total,
    mean_abs      = rowMeans(cbind(abs1, abs2, abs3), na.rm = TRUE),
    unc           = (pmax(abs1, abs2, abs3, na.rm = TRUE) -
                     pmin(abs1, abs2, abs3, na.rm = TRUE)) / 2,
    in_line       = toupper(trimws(ifelse(is.na(use), "N", use))) == "Y"
  ) |>
  arrange(concentration)

if (nrow(std) == 0) stop("No absorbance readings found on the '", SHEET,
                         "' tab. Fill it in, save the workbook, and run again.")

cat("--- your standards -------------------------------------------------\n")
print(as.data.frame(std[, c("tube","concentration","mean_abs","unc","in_line")]),
      row.names = FALSE, digits = 4)


# ---- 4. Fit the line to the points marked Y ---------------------------------

straight <- filter(std, in_line)
if (nrow(straight) < 3)
  stop("Only ", nrow(straight), " point(s) marked Y. A line needs at least three.")

fit       <- lm(mean_abs ~ concentration, data = straight)
slope     <- coef(fit)[["concentration"]]
intercept <- coef(fit)[["(Intercept)"]]
r2        <- summary(fit)$r.squared

cat("\n--- the line of best fit -------------------------------------------\n")
cat(sprintf("points used   %d\n", nrow(straight)))
cat(sprintf("gradient      %.3f absorbance per 1%% starch\n", slope))
cat(sprintf("intercept     %.3f\n", intercept))
cat(sprintf("R-squared     %.4f\n", r2))
cat(sprintf("\n    absorbance = %.3f x concentration + %.3f\n", slope, intercept))
cat(sprintf("\nvalid between %.2f%% and %.2f%% starch (absorbance up to %.3f)\n",
            min(straight$concentration), max(straight$concentration),
            max(straight$mean_abs)))
if (abs(intercept) > 0.05 * max(straight$mean_abs))
  cat("NOTE: the intercept is well away from zero. Look for a systematic error.\n")


# ---- 4b. Is this data any good? ---------------------------------------------

worst <- straight[which.max(abs(resid(fit))), ]
cat(sprintf("\nfurthest from the line   %s, off by %.3f absorbance\n",
            worst$tube, resid(fit)[which.max(abs(resid(fit)))]))

no_blank <- filter(straight, concentration > 0)
if (nrow(no_blank) >= 3) {
  r2nb <- summary(lm(mean_abs ~ concentration, data = no_blank))$r.squared
  cat(sprintf("R-squared without the blank   %.4f   (with it: %.4f)\n", r2nb, r2))
  if (r2nb <= r2 + 1e-9)
    cat("  -> dropping the blank does not help. Keep it in.\n")
  else
    cat("  -> dropping the blank flatters R-squared. Read the warning below before you do it.\n")
}

dark <- filter(std, concentration > 0, mean_abs > 1.0 | mean_abs < 0.1)
if (nrow(dark)) {
  cat(sprintf("\n!! %d of your %d standards read outside 0.1 - 1.0 absorbance.\n",
              nrow(dark), sum(std$concentration > 0)))
  cat("   Above 1.0, under a tenth of the light reaches the detector; above 2.0,\n")
  cat("   under a hundredth. The reading is then mostly light leaking past the\n")
  cat("   sample, not absorption. Your standards are too concentrated - dilute\n")
  cat("   the starch (not the iodine) and run them again.\n")
}

# How much does absorbance actually move across the fitted range?
span_c <- max(straight$concentration) / max(min(straight$concentration[straight$concentration > 0]), 1e-9)
span_a <- max(straight$mean_abs) / max(min(straight$mean_abs[straight$mean_abs > 0]), 1e-9)
if (is.finite(span_c) && span_c > 2 && span_a < 1.5) {
  cat(sprintf("\n!! Across your fitted points concentration changes %.0f-fold but\n", span_c))
  cat(sprintf("   absorbance changes only %.1f-fold. That is a plateau, not a\n", span_a))
  cat("   calibration curve. A good R-squared here would be meaningless:\n")
  cat("   the method cannot tell those concentrations apart. Re-run with\n")
  cat("   much more dilute standards.\n")
}


# ---- 5. The graph -----------------------------------------------------------

p <- ggplot(std, aes(concentration, mean_abs)) +
  geom_errorbar(aes(ymin = mean_abs - unc, ymax = mean_abs + unc),
                width = max(std$concentration) * 0.02, colour = "grey55") +
  geom_point(size = 3, colour = "grey65") +
  geom_point(data = straight, size = 3, colour = "#2E7D8F") +
  geom_smooth(data = straight, method = "lm", formula = y ~ x,
              se = FALSE, colour = "#A93226", linewidth = 0.7) +
  labs(
    title    = "Starch calibration curve",
    subtitle = sprintf("absorbance = %.3f x concentration + %.3f      R-squared = %.4f",
                       slope, intercept, r2),
    caption  = "Teal points are in the line of best fit. Grey points were left out.",
    x = "Starch concentration / %",
    y = "Absorbance (mean of repeats)"
  ) +
  theme_minimal(base_size = 12) +
  theme(plot.title = element_text(face = "bold"))

print(p)
ggsave("calibration_curve.png", p, width = 16, height = 10, units = "cm", dpi = 300)
cat("\nGraph saved as  calibration_curve.png  in this folder.\n")


# ---- 6. Your unknowns -------------------------------------------------------

unk <- tryCatch(suppressMessages(
  read_excel(WORKBOOK, SHEET, range = "A27:E29", col_names = FALSE,
             col_types = c("text", rep("numeric", 4)))),
  error = function(e) NULL)

if (!is.null(unk)) {
  names(unk) <- c("sample", "dilution", "u1", "u2", "u3")
  unk <- unk |>
    filter(rowSums(!is.na(cbind(u1, u2, u3))) > 0) |>
    mutate(
      mean_abs      = rowMeans(cbind(u1, u2, u3), na.rm = TRUE),
      dilution      = ifelse(is.na(dilution), 1, dilution),
      concentration = (mean_abs - intercept) / slope * dilution,
      verdict = case_when(
        mean_abs > max(straight$mean_abs) ~ "NO - above the fitted range. Dilute and read again.",
        mean_abs < 0.05                   ~ "NO - too faint for the colorimeter.",
        TRUE                              ~ "Yes - inside the fitted range."
      ),
      concentration = ifelse(startsWith(verdict, "NO"), NA_real_, concentration)
    )

  if (nrow(unk)) {
    cat("\n--- your unknowns --------------------------------------------------\n")
    print(as.data.frame(unk[, c("sample","dilution","mean_abs","concentration","verdict")]),
          row.names = FALSE, digits = 3)
    cat("\nA blank concentration means the reading was outside the range the\n")
    cat("line covers, so no number can honestly be given for it.\n")
  }
}

cat("\nDone.\n")
