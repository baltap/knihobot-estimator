import { Comparable } from "./catalog-repository";
import {
  COMMISSION,
  CONDITION_MULTIPLIERS,
  DEMAND_THRESHOLDS,
  RANGE_TUNING,
} from "../config/pricing";

export interface PayoutCalculation {
  listPrice: number;
  sellerSharePercent: number; // e.g. 0.6
  sellerShareAmount: number; // e.g. Math.round(listPrice * sellerSharePercent)
  fixedFee: number; // e.g. 29
  rawPayout: number; // sellerShareAmount - fixedFee
  payout: number; // Math.max(0, rawPayout) (floored at 0, or 0 if below threshold)
  isBelowThreshold: boolean; // whether median list price is < 50 CZK
  offerAgency: boolean; // true if isBelowThreshold is true
}

export interface EstimationResult {
  hasEstimate: boolean; // false if comparableCount = 0
  comparableCount: number;
  condition: "new" | "verygood" | "good" | "worn";

  // Price estimates (list price)
  priceMin: number;
  priceMax: number;
  priceMedian: number;

  // Payout range and median calculations
  payoutMin: PayoutCalculation;
  payoutMax: PayoutCalculation;
  payoutMedian: PayoutCalculation;

  // Demand details
  activeCopies: number;
  demandStatus: "high" | "moderate" | "oversupplied";
  demandWarning: boolean; // true if oversupplied (activeCopies > 20)
}

/**
 * Computes a specific percentile from a sorted array of numbers using linear interpolation.
 */
export function getPercentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  } else {
    return sorted[base];
  }
}

/**
 * Calculates detailed payout metrics for a given list price and whether the estimate is below threshold.
 * Exposes each intermediate term in the payout calculation formula.
 */
export function calculatePayout(
  price: number,
  isBelowThreshold: boolean
): PayoutCalculation {
  const sellerSharePercent = COMMISSION.sellerShare;
  const fixedFee = COMMISSION.fixedFeeCzk;
  const sellerShareAmount = Math.round(price * sellerSharePercent);
  const rawPayout = sellerShareAmount - fixedFee;

  // Floored at 0. If overall estimate is below threshold, payout is 0.
  const payout = isBelowThreshold ? 0 : Math.max(0, rawPayout);
  const offerAgency = isBelowThreshold;

  return {
    listPrice: price,
    sellerSharePercent,
    sellerShareAmount,
    fixedFee,
    rawPayout,
    payout,
    isBelowThreshold,
    offerAgency,
  };
}

/**
 * Principal estimation engine logic.
 * Computes list price ranges and payout maths over normalized baseline values,
 * and derives demand signaling from supply metrics.
 */
export function estimateBook(
  comparables: Comparable[],
  activeCopies: number,
  condition: "new" | "verygood" | "good" | "worn" = "good"
): EstimationResult {
  // Graceful validation warning if invalid condition is passed at runtime
  let userCondition = condition;
  if (!["new", "verygood", "good", "worn"].includes(userCondition)) {
    console.warn(
      `[EstimationEngine] Invalid condition '${condition}' passed. Defaulting to 'good'.`
    );
    userCondition = "good";
  }

  const comparableCount = comparables.length;

  // Case 1: No comparables found
  if (comparableCount === 0) {
    // Generate dummy empty structures with isBelowThreshold = false, offerAgency = false
    const zeroPayout = calculatePayout(0, false);
    return {
      hasEstimate: false,
      comparableCount: 0,
      condition: userCondition,
      priceMin: 0,
      priceMax: 0,
      priceMedian: 0,
      payoutMin: zeroPayout,
      payoutMax: zeroPayout,
      payoutMedian: zeroPayout,
      activeCopies,
      demandStatus: getDemandStatus(activeCopies),
      demandWarning: activeCopies > DEMAND_THRESHOLDS.moderateSupplyLimit,
    };
  }

  // Normalize comparables' prices to baseline condition ("good" = 1.0)
  const baselinePrices = comparables.map((c) => {
    const mult = CONDITION_MULTIPLIERS[c.condition] || 1.0;
    return c.listPriceCzk / mult;
  });

  // Sort baseline prices ascending for range calculations
  baselinePrices.sort((a, b) => a - b);

  let baselineMin = 0;
  let baselineMax = 0;
  let baselineMedian = 0;

  if (comparableCount === 1) {
    // Widened range around single comparable baseline price
    const p = baselinePrices[0];
    baselineMedian = p;
    baselineMin = p * (1 - RANGE_TUNING.singleComparableRangeWidth);
    baselineMax = p * (1 + RANGE_TUNING.singleComparableRangeWidth);
  } else if (comparableCount === 2) {
    // Widened range around two comparable baseline prices
    const p1 = baselinePrices[0];
    const p2 = baselinePrices[1];
    baselineMedian = (p1 + p2) / 2;
    baselineMin = p1 * (1 - RANGE_TUNING.doubleComparableRangeWidth);
    baselineMax = p2 * (1 + RANGE_TUNING.doubleComparableRangeWidth);
  } else {
    // Standard interpolation of percentiles
    baselineMedian = getPercentile(baselinePrices, 0.5);
    baselineMin = getPercentile(baselinePrices, 0.25);
    baselineMax = getPercentile(baselinePrices, 0.75);
  }

  // Scale the baseline prices to the user's declared condition and round to whole crowns
  const userMultiplier = CONDITION_MULTIPLIERS[userCondition];
  const priceMedian = Math.round(baselineMedian * userMultiplier);
  const priceMin = Math.round(baselineMin * userMultiplier);
  const priceMax = Math.round(baselineMax * userMultiplier);

  // Determine if the book is below earning threshold.
  // We check whether the representative (median) list price is below minEarningPriceCzk.
  const isBelowThreshold = priceMedian < COMMISSION.minEarningPriceCzk;

  // Calculate payouts for min, max, and median
  const payoutMin = calculatePayout(priceMin, isBelowThreshold);
  const payoutMax = calculatePayout(priceMax, isBelowThreshold);
  const payoutMedian = calculatePayout(priceMedian, isBelowThreshold);

  // Demand calculations
  const demandStatus = getDemandStatus(activeCopies);
  const demandWarning = demandStatus === "oversupplied";

  return {
    hasEstimate: true,
    comparableCount,
    condition: userCondition,
    priceMin,
    priceMax,
    priceMedian,
    payoutMin,
    payoutMax,
    payoutMedian,
    activeCopies,
    demandStatus,
    demandWarning,
  };
}

/**
 * Derives the demand status based on active stock levels in comparison to config thresholds.
 */
function getDemandStatus(
  activeCopies: number
): "high" | "moderate" | "oversupplied" {
  if (activeCopies <= DEMAND_THRESHOLDS.lowSupplyLimit) {
    return "high";
  }
  if (activeCopies <= DEMAND_THRESHOLDS.moderateSupplyLimit) {
    return "moderate";
  }
  return "oversupplied";
}
