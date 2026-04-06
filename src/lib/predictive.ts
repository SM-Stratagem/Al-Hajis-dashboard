/**
 * Parfumix Predictive Analytics Engine
 *
 * Pure utility functions for statistical forecasting and analysis.
 * Zero dependencies — all math is implemented from scratch.
 * All functions are pure (no side effects, no external state).
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Arithmetic mean of an array of numbers. Returns 0 for empty arrays. */
function mean(data: number[]): number {
  if (data.length === 0) return 0;
  return data.reduce((s, v) => s + v, 0) / data.length;
}

/** Population standard deviation. Returns 0 for empty or single-element arrays. */
function stdDev(data: number[]): number {
  if (data.length <= 1) return 0;
  const m = mean(data);
  const variance = data.reduce((s, v) => s + (v - m) ** 2, 0) / data.length;
  return Math.sqrt(variance);
}

/** Coefficient of variation (stdDev / mean). Returns 0 when mean is 0. */
function coefficientOfVariation(data: number[]): number {
  const m = mean(data);
  if (m === 0) return 0;
  return stdDev(data) / m;
}

/** Round a number to a given number of decimal places. */
function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// ---------------------------------------------------------------------------
// 1. Linear Regression (Least Squares)
// ---------------------------------------------------------------------------

/**
 * Fit an ordinary least-squares line y = slope * x + intercept to the data.
 *
 * @param data - Array of observed values (y), indexed from 0 (x = 0, 1, 2, …).
 * @returns slope, intercept, R² goodness-of-fit, and a forecast function.
 *
 * @example
 * ```ts
 * const { slope, intercept, r2, forecast } = linearRegression([100, 120, 130, 160]);
 * forecast(4); // predicted value for the 5th period (index 4)
 * ```
 */
export function linearRegression(data: number[]): {
  slope: number;
  intercept: number;
  r2: number;
  forecast: (x: number) => number;
} {
  const n = data.length;

  // Edge cases
  if (n === 0) {
    return { slope: 0, intercept: 0, r2: 0, forecast: (_x: number) => 0 };
  }
  if (n === 1) {
    return {
      slope: 0,
      intercept: data[0],
      r2: 1,
      forecast: (_x: number) => data[0],
    };
  }

  // x values are the indices: 0, 1, 2, ..., n-1
  const xSum = (n - 1) * n / 2; // Σx = n(n-1)/2
  const x2Sum = (n - 1) * n * (2 * n - 1) / 6; // Σx²
  const ySum = data.reduce((s, v) => s + v, 0);
  let xySum = 0;
  let y2Sum = 0;
  for (let i = 0; i < n; i++) {
    xySum += i * data[i];
    y2Sum += data[i] * data[i];
  }

  const denominator = n * x2Sum - xSum * xSum;

  let slope: number;
  let intercept: number;
  if (denominator === 0) {
    // All x values are identical (shouldn't happen with indices, but guard anyway)
    slope = 0;
    intercept = mean(data);
  } else {
    slope = (n * xySum - xSum * ySum) / denominator;
    intercept = (ySum - slope * xSum) / n;
  }

  // R² = 1 - SS_res / SS_tot
  const yMean = ySum / n;
  let ssTot = 0;
  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * i + intercept;
    ssRes += (data[i] - predicted) ** 2;
    ssTot += (data[i] - yMean) ** 2;
  }
  const r2 = ssTot === 0 ? 1 : 1 - ssRes / ssTot;

  return {
    slope: round(slope, 4),
    intercept: round(intercept, 2),
    r2: round(Math.max(0, r2), 4),
    forecast: (x: number) => round(slope * x + intercept, 2),
  };
}

// ---------------------------------------------------------------------------
// 2. Simple Exponential Smoothing
// ---------------------------------------------------------------------------

/**
 * Apply simple exponential smoothing: S_t = α·Y_t + (1 − α)·S_{t−1}.
 * The first smoothed value S₁ is initialized to Y₀.
 *
 * @param data - Array of observed values.
 * @param alpha - Smoothing factor between 0 and 1. Higher = more responsive to recent data. Default 0.3.
 * @returns The next-period forecast and the full smoothed series.
 */
export function exponentialSmoothing(
  data: number[],
  alpha: number = 0.3,
): { forecast: number; smoothed: number[] } {
  if (data.length === 0) {
    return { forecast: 0, smoothed: [] };
  }

  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  const smoothed: number[] = [data[0]]; // S₀ = Y₀

  for (let i = 1; i < data.length; i++) {
    const s = clampedAlpha * data[i] + (1 - clampedAlpha) * smoothed[i - 1];
    smoothed.push(round(s, 2));
  }

  // The forecast for the next period is the last smoothed value
  return {
    forecast: round(smoothed[smoothed.length - 1], 2),
    smoothed,
  };
}

// ---------------------------------------------------------------------------
// 3. Moving Average Forecast
// ---------------------------------------------------------------------------

/**
 * Compute a simple moving average over the last `window` values.
 *
 * @param data - Array of observed values (oldest first).
 * @param window - Number of periods to average. Default 3.
 * @returns Forecast (average of last window values), trend direction, overall average.
 */
export function movingAverageForecast(
  data: number[],
  window: number = 3,
): { forecast: number; trend: "up" | "down" | "stable"; avg: number } {
  if (data.length === 0) {
    return { forecast: 0, trend: "stable", avg: 0 };
  }

  const safeWindow = Math.max(1, Math.min(window, data.length));
  const slice = data.slice(-safeWindow);
  const forecast = round(mean(slice), 2);
  const avg = round(mean(data), 2);

  // Determine trend by comparing the average of the last half vs the first half of the window
  let trend: "up" | "down" | "stable" = "stable";
  if (slice.length >= 2) {
    const mid = Math.floor(slice.length / 2);
    const firstHalf = mean(slice.slice(0, mid));
    const secondHalf = mean(slice.slice(mid));
    const diff = secondHalf - firstHalf;
    const threshold = firstHalf !== 0 ? Math.abs(firstHalf) * 0.02 : 1; // 2% or 1 unit

    if (diff > threshold) trend = "up";
    else if (diff < -threshold) trend = "down";
  }

  return { forecast, trend, avg };
}

// ---------------------------------------------------------------------------
// 4. Seasonal Indices (Multiplicative)
// ---------------------------------------------------------------------------

/**
 * Compute multiplicative seasonal indices by averaging period-over-period ratios.
 *
 * The algorithm:
 * 1. Compute a centered moving average (CMA) with window = `period`.
 * 2. Calculate the detrended ratio: value / CMA for each point.
 * 3. Average the ratios for each seasonal position.
 * 4. Normalize so that indices average to exactly 1.
 *
 * @param data - Array of observed values (at least `period` × 2 values recommended).
 * @param period - The seasonal cycle length (e.g. 7 for day-of-week, 12 for month-of-year).
 * @returns Normalized seasonal indices and a forecast function that applies seasonal adjustment.
 */
export function seasonalIndices(
  data: number[],
  period: number,
): { indices: number[]; forecast: (futureIndex: number) => number } {
  if (data.length < 2 || period < 1) {
    return {
      indices: Array.from({ length: Math.max(1, period) }, () => 1),
      forecast: (_i: number) => 0,
    };
  }

  // Step 1: Compute centered moving average as trend estimate.
  // Use a window of `period`. For even periods, use a 2×period centered MA.
  const maWindow = period % 2 === 0 ? period + 1 : period;
  const halfWin = Math.floor(maWindow / 2);

  const cma: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < halfWin || i >= data.length - halfWin) {
      cma.push(null); // Not enough data for centered MA at edges
    } else {
      let sum = 0;
      let count = 0;
      for (let j = i - halfWin; j <= i + halfWin; j++) {
        if (j >= 0 && j < data.length) {
          sum += data[j];
          count++;
        }
      }
      cma.push(count > 0 ? sum / count : null);
    }
  }

  // Step 2: Compute seasonal ratios (value / CMA)
  const positionSums = new Array(period).fill(0);
  const positionCounts = new Array(period).fill(0);

  for (let i = 0; i < data.length; i++) {
    const trendVal = cma[i];
    if (trendVal !== null && trendVal !== 0) {
      const pos = i % period;
      positionSums[pos] += data[i] / trendVal;
      positionCounts[pos]++;
    }
  }

  // Step 3: Average per position
  const rawIndices = positionSums.map((sum, i) =>
    positionCounts[i] > 0 ? sum / positionCounts[i] : 1,
  );

  // Step 4: Normalize so mean of indices = 1
  const idxMean = mean(rawIndices);
  const indices = rawIndices.map((v) =>
    round(idxMean !== 0 ? v / idxMean : 1, 4),
  );

  // Build forecast function using linear regression for trend + seasonal adjustment
  const { slope, intercept } = linearRegression(data);
  const lastIdx = data.length - 1;

  const forecastFn = (futureIndex: number): number => {
    const trendValue = slope * futureIndex + intercept;
    const seasonalFactor = indices[futureIndex % period];
    return round(trendValue * seasonalFactor, 2);
  };

  return { indices, forecast: forecastFn };
}

// ---------------------------------------------------------------------------
// 5. Anomaly Detection (Z-Score Based)
// ---------------------------------------------------------------------------

/**
 * Detect anomalies in a numerical series using z-scores.
 *
 * A data point is flagged when |z-score| exceeds the threshold.
 * Spikes are points significantly above the mean; dips are significantly below.
 *
 * @param data - Array of observed values.
 * @param threshold - Z-score cutoff. Default 1.5 (loose), use 2.0 or 3.0 for stricter detection.
 * @returns An array of anomalies with index, value, z-score, and type (spike/dip), plus mean and stdDev.
 */
export function detectAnomalies(
  data: number[],
  threshold: number = 1.5,
): {
  anomalies: { index: number; value: number; zScore: number; type: "spike" | "dip" }[];
  mean: number;
  stdDev: number;
} {
  const m = round(mean(data), 2);
  const sd = round(stdDev(data), 2);

  if (data.length <= 1 || sd === 0) {
    return { anomalies: [], mean: m, stdDev: sd };
  }

  const anomalies = data
    .map((value, index) => {
      const zScore = (value - m) / sd;
      return { index, value, zScore: round(zScore, 2) };
    })
    .filter((point) => Math.abs(point.zScore) > threshold)
    .map((point) => ({
      index: point.index,
      value: point.value,
      zScore: point.zScore,
      type: (point.zScore > 0 ? "spike" : "dip") as "spike" | "dip",
    }));

  return { anomalies, mean: m, stdDev: sd };
}

// ---------------------------------------------------------------------------
// 6. Confidence Intervals
// ---------------------------------------------------------------------------

/**
 * Compute a confidence interval around a forecast value.
 *
 * Uses the standard error of the estimate from linear regression residuals,
 * widened by the square root of `periods` ahead (forecast uncertainty grows over time).
 *
 * @param data - Historical data used to calibrate the interval width.
 * @param forecast - The point forecast value.
 * @param periods - How many periods ahead the forecast is (increases uncertainty). Default 1.
 * @param confidence - Confidence level between 0 and 1. Default 0.95 (95%).
 * @returns Lower bound, upper bound, and margin of error.
 */
export function confidenceInterval(
  data: number[],
  forecast: number,
  periods: number = 1,
  confidence: number = 0.95,
): { lower: number; upper: number; margin: number } {
  if (data.length <= 1) {
    const margin = Math.abs(forecast) * 0.15; // fallback 15% when insufficient data
    return {
      lower: round(forecast - margin, 2),
      upper: round(forecast + margin, 2),
      margin: round(margin, 2),
    };
  }

  // Standard error from linear regression residuals
  const { slope, intercept } = linearRegression(data);
  const n = data.length;
  const residuals = data.map((y, i) => y - (slope * i + intercept));
  const rss = residuals.reduce((s, r) => s + r * r, 0);
  // Degrees of freedom: n - 2 for simple linear regression
  const df = Math.max(1, n - 2);
  const se = Math.sqrt(rss / df); // standard error of estimate

  // Approximate z-value for the confidence level using a simple lookup
  // For common confidence levels; for others we interpolate linearly.
  const zTable: [number, number][] = [
    [0.80, 1.282],
    [0.85, 1.44],
    [0.90, 1.645],
    [0.95, 1.96],
    [0.975, 2.241],
    [0.99, 2.576],
    [0.995, 2.807],
    [0.999, 3.291],
  ];

  let zValue = 1.96; // default for 95%
  for (let i = 0; i < zTable.length - 1; i++) {
    if (confidence <= zTable[i][0]) {
      zValue = zTable[i][1];
      break;
    }
    if (confidence <= zTable[i + 1][0]) {
      // Linear interpolation between the two nearest table entries
      const [c0, z0] = zTable[i];
      const [c1, z1] = zTable[i + 1];
      zValue = z0 + ((confidence - c0) / (c1 - c0)) * (z1 - z0);
      break;
    }
  }

  // Forecast error grows with sqrt(periods) and also with distance from mean x
  const meanX = (n - 1) / 2;
  const futureX = n - 1 + periods;
  // Standard error of prediction includes:
  //   SE * sqrt(1 + 1/n + (x_future - x_mean)² / Σ(x_i - x_mean)²)
  const ssx = n * (n * n - 1) / 12; // Σ(x_i - x_mean)² for 0..n-1
  const predictionSE =
    se *
    Math.sqrt(
      1 + 1 / n + ((futureX - meanX) ** 2) / Math.max(1, ssx),
    );

  const margin = round(zValue * predictionSE, 2);
  const lower = round(forecast - margin, 2);
  const upper = round(forecast + margin, 2);

  return { lower, upper, margin };
}

// ---------------------------------------------------------------------------
// 7. Revenue Trend Analysis
// ---------------------------------------------------------------------------

type RevenueTrend =
  | "strong_growth"
  | "growth"
  | "stable"
  | "decline"
  | "strong_decline";

/**
 * Comprehensive revenue trend analysis combining regression, smoothing, and volatility metrics.
 *
 * @param monthlyRevenue - Array of monthly revenue figures (oldest first).
 * @returns A detailed trend report including CAGR, volatility, momentum, and a next-month estimate with range.
 */
export function revenueTrendAnalysis(monthlyRevenue: number[]): {
  trend: RevenueTrend;
  cagr: number; // as a percentage, e.g. 12.5 means 12.5%
  volatility: number; // coefficient of variation as a percentage
  momentum: number; // percentage change: (avg of last 3 − avg of first 3) / avg of first 3
  nextMonthEstimate: number;
  nextMonthRange: { low: number; high: number };
} {
  const n = monthlyRevenue.length;

  // Edge case: no data
  if (n === 0) {
    return {
      trend: "stable",
      cagr: 0,
      volatility: 0,
      momentum: 0,
      nextMonthEstimate: 0,
      nextMonthRange: { low: 0, high: 0 },
    };
  }

  // Edge case: single data point
  if (n === 1) {
    return {
      trend: "stable",
      cagr: 0,
      volatility: 0,
      momentum: 0,
      nextMonthEstimate: monthlyRevenue[0],
      nextMonthRange: { low: monthlyRevenue[0], high: monthlyRevenue[0] },
    };
  }

  // --- CAGR (Compound Annual Growth Rate) ---
  // Assuming 12 periods per year. For partial years, annualize proportionally.
  const first = monthlyRevenue[0];
  const last = monthlyRevenue[n - 1];
  const years = n / 12;
  let cagr = 0;
  if (first > 0 && years > 0 && last > 0) {
    cagr = (Math.pow(last / first, 1 / years) - 1) * 100;
  } else if (first === 0 && last > 0) {
    cagr = 100; // grew from zero — cap at 100%
  } else if (first > 0 && last === 0) {
    cagr = -100;
  }

  // --- Volatility (Coefficient of Variation as percentage) ---
  const cv = coefficientOfVariation(monthlyRevenue) * 100;

  // --- Momentum: compare avg of last 3 vs first 3 ---
  const firstN = Math.min(3, Math.floor(n / 2));
  const lastN = firstN;
  const avgFirst = mean(monthlyRevenue.slice(0, firstN));
  const avgLast = mean(monthlyRevenue.slice(-lastN));
  let momentum = 0;
  if (avgFirst !== 0) {
    momentum = ((avgLast - avgFirst) / Math.abs(avgFirst)) * 100;
  } else if (avgLast > 0) {
    momentum = 100;
  }

  // --- Trend classification ---
  // Use a combination of slope (from regression) and momentum.
  const { slope } = linearRegression(monthlyRevenue);
  const normalizedSlope = avgFirst !== 0 ? (slope / Math.abs(avgFirst)) * 100 : 0;
  const compositeSignal = normalizedSlope * 0.4 + momentum * 0.6;

  let trend: RevenueTrend = "stable";
  if (compositeSignal >= 15) trend = "strong_growth";
  else if (compositeSignal >= 5) trend = "growth";
  else if (compositeSignal <= -15) trend = "strong_decline";
  else if (compositeSignal <= -5) trend = "decline";

  // --- Next month estimate (exponential smoothing) ---
  const { forecast: smoothedForecast } = exponentialSmoothing(monthlyRevenue, 0.3);
  // Blend with regression forecast for robustness
  const regForecast = slope * n + linearRegression(monthlyRevenue).intercept;
  const blend = n >= 6 ? 0.5 : 0.3; // more weight to regression with more data
  const nextMonthEstimate = round(
    blend * regForecast + (1 - blend) * smoothedForecast,
    0,
  );

  // --- Confidence interval for next month ---
  const { lower, upper } = confidenceInterval(monthlyRevenue, nextMonthEstimate, 1, 0.9);

  return {
    trend,
    cagr: round(cagr, 2),
    volatility: round(cv, 2),
    momentum: round(momentum, 2),
    nextMonthEstimate,
    nextMonthRange: { low: Math.max(0, round(lower, 0)), high: round(upper, 0) },
  };
}

// ---------------------------------------------------------------------------
// 8. Product Demand Score
// ---------------------------------------------------------------------------

type DemandVelocity = "fast" | "moderate" | "slow";
type DemandTrend = "accelerating" | "stable" | "declining";
type StockoutRisk = "high" | "medium" | "low";

/**
 * Analyze product sales patterns to produce a demand scorecard.
 *
 * @param monthlySales - Array of monthly unit sales (oldest first).
 * @returns Velocity classification, trend direction, stockout risk, and estimated reorder point.
 */
export function productDemandScore(monthlySales: number[]): {
  velocity: DemandVelocity;
  trend: DemandTrend;
  stockoutRisk: StockoutRisk;
  reorderPoint: number;
} {
  const n = monthlySales.length;

  // Edge cases
  if (n === 0) {
    return { velocity: "slow", trend: "stable", stockoutRisk: "low", reorderPoint: 0 };
  }
  if (n === 1) {
    const reorder = Math.ceil(monthlySales[0] * 1.5);
    return {
      velocity: monthlySales[0] > 50 ? "fast" : monthlySales[0] > 10 ? "moderate" : "slow",
      trend: "stable",
      stockoutRisk: "low",
      reorderPoint: reorder,
    };
  }

  // --- Velocity: based on average monthly sales rate ---
  const avgSales = mean(monthlySales);

  // Classify relative to the dataset's own scale (percentile-based would need more context,
  // so we use absolute thresholds appropriate for a perfume retail store)
  let velocity: DemandVelocity = "slow";
  if (avgSales >= 30) velocity = "fast";
  else if (avgSales >= 8) velocity = "moderate";

  // --- Trend: compare second half vs first half ---
  const mid = Math.floor(n / 2);
  const firstHalf = mean(monthlySales.slice(0, mid));
  const secondHalf = mean(monthlySales.slice(mid));
  const changeRatio = firstHalf !== 0 ? (secondHalf - firstHalf) / firstHalf : 0;

  // Also compute linear regression slope to confirm direction
  const { slope } = linearRegression(monthlySales);
  const slopeRatio = avgSales !== 0 ? slope / avgSales : 0;
  const combinedTrendSignal = changeRatio * 0.5 + slopeRatio * 2;

  let trend: DemandTrend = "stable";
  if (combinedTrendSignal > 0.1) trend = "accelerating";
  else if (combinedTrendSignal < -0.1) trend = "declining";

  // --- Stockout risk: accelerating + fast velocity = high risk ---
  // Also consider if recent months show a significant jump
  const recent3 = monthlySales.slice(-3);
  const avgRecent3 = mean(recent3);
  const isSpiking =
    recent3.length >= 2 &&
    avgSales > 0 &&
    (avgRecent3 - avgSales) / avgSales > 0.5;

  let stockoutRisk: StockoutRisk = "low";
  if (velocity === "fast" && (trend === "accelerating" || isSpiking)) {
    stockoutRisk = "high";
  } else if (velocity === "fast" || trend === "accelerating") {
    stockoutRisk = "medium";
  } else if (isSpiking) {
    stockoutRisk = "medium";
  }

  // --- Reorder point: forecasted demand × lead-time factor ---
  // Assume 1-month lead time with a safety stock multiplier.
  // Use exponential smoothing for the forecast.
  const { forecast: esForecast } = exponentialSmoothing(monthlySales, 0.4);

  // Safety stock based on volatility
  const sd = stdDev(monthlySales);
  const safetyStock = sd * 1.5; // ~87% service level with this safety factor

  // Reorder point = expected demand + safety stock, rounded up
  const reorderPoint = Math.ceil(esForecast + safetyStock);

  return {
    velocity,
    trend,
    stockoutRisk,
    reorderPoint: Math.max(0, reorderPoint),
  };
}
