"use server";

import { LocalCatalogRepository } from "@/lib/local-catalog-repository";
import {
  estimateBook,
  EstimationResult,
  calculatePayout,
} from "@/lib/estimation-engine";
import { BookQuery, Comparable } from "@/lib/catalog-repository";
import { CATALOG_WIDE_STATS } from "@/config/pricing";

// Instantiated server-side only
const repository = new LocalCatalogRepository();

export interface EstimateResponse {
  query: BookQuery;
  estimation: EstimationResult;
  comparables: Comparable[];
  referenceStats: {
    p25Price: number;
    p75Price: number;
    p25Payout: number;
    p75Payout: number;
  };
}

export async function getBookEstimate(
  query: BookQuery,
  condition: "new" | "verygood" | "good" | "worn"
): Promise<EstimateResponse> {
  // 1. Fetch matching comparables
  const comparables = await repository.findComparables(query);

  // 2. Fetch activeCopies (supply count)
  const activeCopies = await repository.countActiveCopies(query);

  // 3. Compute estimates
  const estimation = estimateBook(comparables, activeCopies, condition);

  // 4. Calculate catalog-wide reference payouts dynamically to satisfy B1/N1
  const refPayoutMin = calculatePayout(CATALOG_WIDE_STATS.p25, false).payout;
  const refPayoutMax = calculatePayout(CATALOG_WIDE_STATS.p75, false).payout;

  return {
    query,
    estimation,
    comparables,
    referenceStats: {
      p25Price: CATALOG_WIDE_STATS.p25,
      p75Price: CATALOG_WIDE_STATS.p75,
      p25Payout: refPayoutMin,
      p75Payout: refPayoutMax,
    },
  };
}
