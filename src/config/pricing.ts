/**
 * Knihobot pricing, commission, and demand configurations.
 * Note: These rates and thresholds are illustrative defaults (assumptions to confirm)
 * and should be verified against current Knihobot terms before production.
 */

export const COMMISSION = {
  sellerShare: 0.6, // Seller receives ~60% of the sale price
  fixedFeeCzk: 29, // Flat processing fee per sold book in CZK
  minEarningPriceCzk: 50, // Below this list price, seller payout is 0 (P4)
  currency: "CZK",
} as const;

export const CONDITION_MULTIPLIERS = {
  new: 1.2, // Only applicable to user-declared book condition; comparables are never "new"
  verygood: 1.1,
  good: 1.0, // Baseline condition
  worn: 0.7,
} as const;

export const DEMAND_THRESHOLDS = {
  lowSupplyLimit: 3, // <= 3 copies means high selling chance (approx. p25)
  moderateSupplyLimit: 20, // <= 20 copies is moderate; > 20 is oversupplied (approx. p75)
} as const;

export const RANGE_TUNING = {
  singleComparableRangeWidth: 0.2, // +/- 20% range around single comparable
  doubleComparableRangeWidth: 0.1, // +/- 10% range around two comparables
} as const;

/**
 * Catalog-wide list price statistics derived from the 2,400-record snapshot.
 * These are facts computed from the dataset (p25 / median / p75)
 * and should be recomputed if the snapshot is re-scraped.
 */
export const CATALOG_WIDE_STATS = {
  p25: 79,
  median: 129,
  p75: 199,
} as const;
