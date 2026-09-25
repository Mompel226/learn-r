# Invented Year 8 data (no real pupils). Two classes; realistic 12-13-year-old ranges.
set.seed(2026)
mk <- function(n, h_m, h_s, arm_d, hand_m, hand_s, foot_m, foot_s) {
  h <- round(rnorm(n, h_m, h_s))
  data.frame(
    student      = seq_len(n),
    height_cm    = h,
    armspan_cm   = round(h + rnorm(n, arm_d, 3)),
    handspan_cm  = round(rnorm(n, hand_m, hand_s) * 2) / 2,
    shoe_size_cm = round(rnorm(n, foot_m, foot_s) * 2) / 2)
}
g <- mk(15, 155, 6, -1, 18.2, 0.8, 23.3, 0.8)
b <- mk(14, 155, 8,  1, 19.2, 1.0, 25.2, 1.0)
g$handspan_cm[7] <- 21.5          # one unusually large hand span: an outlier for the boxplot stage
for (d in list(g, b)) print(summary(d[-1]))
for (v in names(g)[-1]) { t <- t.test(g[[v]], b[[v]]); cat(sprintf("%-13s girls %.1f (%.2f)  boys %.1f (%.2f)  p = %.4g\n", v, mean(g[[v]]), sd(g[[v]]), mean(b[[v]]), sd(b[[v]]), t$p.value)) }
for (v in names(g)[-1]) for (nm in c("g","b")) { x <- get(nm)[[v]]; q <- quantile(x, c(.25,.75), type = 7); i <- diff(q); o <- sum(x < q[1]-1.5*i | x > q[2]+1.5*i); cat(nm, v, "IQR", i, "outliers", o, "\n") }
cat(jsonlite::toJSON(list(Girls = g, Boys = b), dataframe = "columns"), file = "ks3data.json")
