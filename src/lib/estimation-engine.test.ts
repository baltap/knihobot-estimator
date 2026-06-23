import { describe, it, expect, vi, beforeEach } from "vitest";
import { estimateBook } from "./estimation-engine";
import { Comparable } from "./catalog-repository";

describe("estimation-engine", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("calculates correct ranges and payouts for a normal multi-item comparable list", () => {
    // 5 comparables:
    // 100 CZK (good) -> baseline 100
    // 110 CZK (verygood) -> baseline 110 / 1.1 = 100
    // 70 CZK (worn) -> baseline 70 / 0.7 = 100
    // 120 CZK (good) -> baseline 120
    // 150 CZK (good) -> baseline 150
    // Sorted baseline prices: [100, 100, 100, 120, 150]
    // Median (q=0.5): 100
    // p25 (q=0.25): 100 + 0 * ... = 100
    // p75 (q=0.75): 120
    const comparables: Comparable[] = [
      {
        title: "Test",
        author: "A",
        listPriceCzk: 100,
        condition: "good",
        activeCopies: 5,
        listedAt: "",
      },
      {
        title: "Test",
        author: "A",
        listPriceCzk: 110,
        condition: "verygood",
        activeCopies: 5,
        listedAt: "",
      },
      {
        title: "Test",
        author: "A",
        listPriceCzk: 70,
        condition: "worn",
        activeCopies: 5,
        listedAt: "",
      },
      {
        title: "Test",
        author: "A",
        listPriceCzk: 120,
        condition: "good",
        activeCopies: 5,
        listedAt: "",
      },
      {
        title: "Test",
        author: "A",
        listPriceCzk: 150,
        condition: "good",
        activeCopies: 5,
        listedAt: "",
      },
    ];

    // Estimate for "verygood" condition (multiplier 1.1)
    // Base min: 100 -> user min: 110
    // Base median: 100 -> user median: 110
    // Base max: 120 -> user max: 132
    const result = estimateBook(comparables, 5, "verygood");

    expect(result.hasEstimate).toBe(true);
    expect(result.comparableCount).toBe(5);
    expect(result.condition).toBe("verygood");
    expect(result.priceMin).toBe(110);
    expect(result.priceMedian).toBe(110);
    expect(result.priceMax).toBe(132);

    // Verify payout calculations and exposed terms
    // Formula: round(price * 0.6) - 29
    // payoutMin (110): round(110 * 0.6) - 29 = 66 - 29 = 37 CZK
    expect(result.payoutMin.listPrice).toBe(110);
    expect(result.payoutMin.sellerSharePercent).toBe(0.6);
    expect(result.payoutMin.sellerShareAmount).toBe(66);
    expect(result.payoutMin.fixedFee).toBe(29);
    expect(result.payoutMin.rawPayout).toBe(37);
    expect(result.payoutMin.payout).toBe(37);
    expect(result.payoutMin.isBelowThreshold).toBe(false);
    expect(result.payoutMin.offerAgency).toBe(false);

    // payoutMax (132): round(132 * 0.6) - 29 = 79 - 29 = 50 CZK
    expect(result.payoutMax.listPrice).toBe(132);
    expect(result.payoutMax.sellerShareAmount).toBe(79);
    expect(result.payoutMax.payout).toBe(50);

    // Demand
    expect(result.activeCopies).toBe(5);
    expect(result.demandStatus).toBe("moderate");
    expect(result.demandWarning).toBe(false);
  });

  it("handles the below-threshold case correctly (P4)", () => {
    // Median list price is below minEarningPriceCzk (50 CZK)
    // Comparables: baseline 40 CZK (good)
    const comparables: Comparable[] = [
      {
        title: "Test",
        author: "A",
        listPriceCzk: 40,
        condition: "good",
        activeCopies: 2,
        listedAt: "",
      },
      {
        title: "Test",
        author: "A",
        listPriceCzk: 40,
        condition: "good",
        activeCopies: 2,
        listedAt: "",
      },
      {
        title: "Test",
        author: "A",
        listPriceCzk: 40,
        condition: "good",
        activeCopies: 2,
        listedAt: "",
      },
    ];

    const result = estimateBook(comparables, 2, "good");

    expect(result.hasEstimate).toBe(true);
    expect(result.priceMedian).toBe(40);
    expect(result.payoutMedian.isBelowThreshold).toBe(true);
    expect(result.payoutMedian.payout).toBe(0);
    expect(result.payoutMedian.offerAgency).toBe(true);

    // Min and max payouts must also be 0 because the entire estimate is below threshold
    expect(result.payoutMin.payout).toBe(0);
    expect(result.payoutMax.payout).toBe(0);
    expect(result.payoutMin.offerAgency).toBe(true);
    expect(result.payoutMax.offerAgency).toBe(true);

    // Demand status (<= 3 is high chance)
    expect(result.demandStatus).toBe("high");
    expect(result.demandWarning).toBe(false);
  });

  it("identifies oversupplied books correctly (P3)", () => {
    const comparables: Comparable[] = [
      {
        title: "Test",
        author: "A",
        listPriceCzk: 100,
        condition: "good",
        activeCopies: 25,
        listedAt: "",
      },
    ];

    // activeCopies is 25 (> 20) -> oversupplied
    const result = estimateBook(comparables, 25, "good");

    expect(result.activeCopies).toBe(25);
    expect(result.demandStatus).toBe("oversupplied");
    expect(result.demandWarning).toBe(true);
  });

  it("returns defaults/zeros gracefully when no comparables are found", () => {
    const result = estimateBook([], 10, "good");

    expect(result.hasEstimate).toBe(false);
    expect(result.comparableCount).toBe(0);
    expect(result.priceMin).toBe(0);
    expect(result.priceMax).toBe(0);
    expect(result.priceMedian).toBe(0);
    expect(result.payoutMedian.payout).toBe(0);
    expect(result.payoutMedian.offerAgency).toBe(false); // No data, do not offer agency
    expect(result.demandStatus).toBe("moderate"); // 10 is moderate (<= 20)
    expect(result.demandWarning).toBe(false);
  });

  it("defaults user condition to 'good' and logs warning on missing/invalid input", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const comparables: Comparable[] = [
      {
        title: "Test",
        author: "A",
        listPriceCzk: 100,
        condition: "good",
        activeCopies: 1,
        listedAt: "",
      },
    ];

    // Pass invalid condition
    const result = estimateBook(
      comparables,
      1,
      "invalid_condition" as unknown as "new" | "verygood" | "good" | "worn"
    );

    expect(warnSpy).toHaveBeenCalledOnce();
    expect(warnSpy.mock.calls[0][0]).toContain(
      "Invalid condition 'invalid_condition' passed"
    );
    expect(result.condition).toBe("good");
    expect(result.priceMedian).toBe(100);
  });

  it("applies range widening correctly on 1 comparable", () => {
    // 1 comparable at 100 CZK (good)
    // Base min: 100 * 0.8 = 80
    // Base max: 100 * 1.2 = 120
    const comparables: Comparable[] = [
      {
        title: "Test",
        author: "A",
        listPriceCzk: 100,
        condition: "good",
        activeCopies: 1,
        listedAt: "",
      },
    ];

    const result = estimateBook(comparables, 1, "good");

    expect(result.priceMin).toBe(80);
    expect(result.priceMedian).toBe(100);
    expect(result.priceMax).toBe(120);
  });

  it("applies range widening correctly on 2 comparables", () => {
    // 2 comparables at 100 and 150 CZK (good)
    // Base min: 100 * 0.9 = 90
    // Base max: 150 * 1.1 = 165
    // Base median: (100 + 150) / 2 = 125
    const comparables: Comparable[] = [
      {
        title: "Test",
        author: "A",
        listPriceCzk: 100,
        condition: "good",
        activeCopies: 1,
        listedAt: "",
      },
      {
        title: "Test",
        author: "A",
        listPriceCzk: 150,
        condition: "good",
        activeCopies: 1,
        listedAt: "",
      },
    ];

    const result = estimateBook(comparables, 1, "good");

    expect(result.priceMin).toBe(90);
    expect(result.priceMedian).toBe(125);
    expect(result.priceMax).toBe(165);
  });
});
