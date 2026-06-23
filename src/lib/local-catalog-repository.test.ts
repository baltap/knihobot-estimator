import { describe, it, expect } from "vitest";
import {
  LocalCatalogRepository,
  normalizeString,
  normalizeIsbn,
} from "./local-catalog-repository";
import { Comparable } from "./catalog-repository";

// Mock fixture data for testing
const mockFixture: Comparable[] = [
  {
    title: "Babička",
    author: "Božena Němcová",
    isbn: "9788073351234",
    condition: "verygood",
    listPriceCzk: 120,
    activeCopies: 5,
    listedAt: "2026-06-23T12:00:00.000Z",
  },
  {
    title: "Babička drsňačka",
    author: "David Walliams",
    isbn: "9788025707135",
    condition: "good",
    listPriceCzk: 189,
    activeCopies: 16,
    listedAt: "2026-06-23T12:00:00.000Z",
  },
  {
    title: "Dívka ve vlaku",
    author: "Paula Hawkins",
    isbn: "9788024928609",
    condition: "worn",
    listPriceCzk: 89,
    activeCopies: 3,
    listedAt: "2026-06-23T12:00:00.000Z",
  },
  {
    title: "Tajemství",
    author: "Rhonda Byrne",
    isbn: "9788024910086",
    condition: "verygood",
    listPriceCzk: 109,
    activeCopies: 23,
    listedAt: "2026-06-23T12:00:00.000Z",
  },
  {
    title: "Manželovo tajemství",
    author: "Liane Moriarty",
    isbn: "9788024925899",
    condition: "good",
    listPriceCzk: 299,
    activeCopies: 6,
    listedAt: "2026-06-23T12:00:00.000Z",
  },
];

describe("normalizeString", () => {
  it("strips Czech diacritics and converts to lowercase", () => {
    expect(normalizeString("Božena Němcová")).toBe("bozena nemcova");
    expect(normalizeString("Babička")).toBe("babicka");
  });

  it("removes punctuation and trims whitespace", () => {
    expect(normalizeString("  Dívka ve vlaku: román!  ")).toBe(
      "divka ve vlaku roman"
    );
  });
});

describe("normalizeIsbn", () => {
  it("removes spaces and hyphens", () => {
    expect(normalizeIsbn("978-80-7335-123-4")).toBe("9788073351234");
    expect(normalizeIsbn("978 8025 70713 5")).toBe("9788025707135");
  });
});

describe("LocalCatalogRepository", () => {
  const repository = new LocalCatalogRepository(mockFixture);

  describe("findComparables", () => {
    it("matches exact ISBN", async () => {
      const results = await repository.findComparables({
        isbn: "978-80-7335-123-4",
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Babička");
    });

    it("falls back to fuzzy title and author matching when ISBN is missing", async () => {
      const results = await repository.findComparables({
        title: "Dívka ve vlaku",
        author: "Paula Hawkins",
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Dívka ve vlaku");
    });

    it("handles partial/fuzzy title match without diacritics when author is provided", async () => {
      const results = await repository.findComparables({
        title: "drsnacka",
        author: "Walliams",
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Babička drsňačka");
    });

    it("does not match 'Manželovo tajemství' when querying only for title 'Tajemství' (regression test for B1)", async () => {
      const results = await repository.findComparables({ title: "Tajemství" });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Tajemství");
      expect(results[0].author).toBe("Rhonda Byrne");
    });

    it("requires exact title match if author is missing to prevent over-matching", async () => {
      const results = await repository.findComparables({ title: "Babička" });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Babička");
      const hasDrsnacka = results.some((r) => r.title === "Babička drsňačka");
      expect(hasDrsnacka).toBe(false);
    });

    it("prioritizes ISBN matches even if title/author are in query", async () => {
      // Query has ISBN for "Babička drsňačka" but title for "Dívka ve vlaku"
      const results = await repository.findComparables({
        isbn: "9788025707135",
        title: "Dívka ve vlaku",
      });
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Babička drsňačka"); // ISBN match priority
    });

    it("returns empty array for no matches", async () => {
      const results = await repository.findComparables({
        title: "Nonexistent Book",
      });
      expect(results).toHaveLength(0);
    });

    it("returns empty array if query has no search terms", async () => {
      const results = await repository.findComparables({});
      expect(results).toHaveLength(0);
    });
  });

  describe("countActiveCopies", () => {
    it("returns true stock count (activeCopies) of matched book", async () => {
      const count = await repository.countActiveCopies({
        isbn: "9788025707135",
      });
      expect(count).toBe(16);
    });

    it("returns 0 if no matching book is found", async () => {
      const count = await repository.countActiveCopies({
        title: "Nonexistent Book",
      });
      expect(count).toBe(0);
    });
  });
});
