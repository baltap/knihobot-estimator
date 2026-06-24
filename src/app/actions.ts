"use server";

import { LocalCatalogRepository } from "@/lib/local-catalog-repository";
import {
  estimateBook,
  EstimationResult,
  calculatePayout,
} from "@/lib/estimation-engine";
import { BookQuery, Comparable } from "@/lib/catalog-repository";
import { CATALOG_WIDE_STATS } from "@/config/pricing";
import { extractBookTitlesFromSpine } from "@/lib/spine-analyzer";

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

export interface SpineMatchResult {
  extractedTitle: string;
  extractedAuthor: string;
  matched: boolean;
  matchDetails?: {
    title: string;
    author: string;
    estimation: EstimationResult;
    comparables: Comparable[];
    referenceStats: {
      p25Price: number;
      p75Price: number;
      p25Payout: number;
      p75Payout: number;
    };
  };
}

export interface AnalyzeSpineResponse {
  success: boolean;
  books?: SpineMatchResult[];
  error?: string;
}

/**
 * Server Action to analyze a spine photo, extracting titles/authors,
 * matching them against catalog snap, and returning results.
 */
export async function analyzeSpinePhoto(
  base64Data: string,
  mimeType: string,
  condition: "new" | "verygood" | "good" | "worn" = "good"
): Promise<AnalyzeSpineResponse> {
  try {
    // 1. Extract titles and authors from photo
    const extractedBooks = await extractBookTitlesFromSpine(
      base64Data,
      mimeType
    );

    // 2. Query repository to match catalog items
    const books: SpineMatchResult[] = [];

    for (const book of extractedBooks) {
      try {
        // Query findComparables using both title and author to enable fuzzy matching (B1)
        const query: BookQuery = {
          title: book.title,
          author: book.author || undefined,
        };

        const comparables = await repository.findComparables(query);
        const activeCopies = await repository.countActiveCopies(query);

        // Compute estimates using the user's selected condition
        const estimation = estimateBook(comparables, activeCopies, condition);

        const refPayoutMin = calculatePayout(
          CATALOG_WIDE_STATS.p25,
          false
        ).payout;
        const refPayoutMax = calculatePayout(
          CATALOG_WIDE_STATS.p75,
          false
        ).payout;

        books.push({
          extractedTitle: book.title,
          extractedAuthor: book.author,
          matched: estimation.hasEstimate,
          matchDetails: {
            title: comparables[0]?.title || book.title,
            author: comparables[0]?.author || book.author || "Unknown",
            estimation,
            comparables,
            referenceStats: {
              p25Price: CATALOG_WIDE_STATS.p25,
              p75Price: CATALOG_WIDE_STATS.p75,
              p25Payout: refPayoutMin,
              p75Payout: refPayoutMax,
            },
          },
        });
      } catch (err) {
        console.error(
          `Error matching catalog for spine extraction: ${book.title}`,
          err
        );
        // Include as unmatched
        books.push({
          extractedTitle: book.title,
          extractedAuthor: book.author,
          matched: false,
        });
      }
    }

    return {
      success: true,
      books,
    };
  } catch (err) {
    console.error("Spine photo analysis server-side error:", err);
    const msg = err instanceof Error ? err.message : "";
    let errorCode = "GENERIC_ERROR";

    if (msg.includes("timed out")) {
      errorCode = "API_TIMEOUT";
    } else if (msg.includes("Empty response")) {
      errorCode = "EMPTY_RESPONSE";
    } else if (
      msg.includes("did not return a JSON array") ||
      msg.includes("JSON")
    ) {
      errorCode = "MALFORMED_RESPONSE";
    }

    return {
      success: false,
      error: errorCode,
    };
  }
}
