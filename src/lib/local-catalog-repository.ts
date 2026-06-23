import fs from "fs";
import path from "path";
import { CatalogRepository, BookQuery, Comparable } from "./catalog-repository";

// Helper to normalize strings (lowercase, strip Czech accents/diacritics, trim punctuation)
export function normalizeString(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Strip diacritics
    .toLowerCase()
    .replace(/[^\w\s]/g, "") // Remove punctuation/special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

// Normalize ISBN (remove hyphens, spaces, lowercase)
export function normalizeIsbn(isbn: string): string {
  return isbn.replace(/[\s-]/g, "").toLowerCase();
}

export class LocalCatalogRepository implements CatalogRepository {
  private comparables: Comparable[];

  constructor(source?: string | Comparable[]) {
    if (Array.isArray(source)) {
      this.comparables = source;
    } else {
      const filePath =
        source || path.resolve(process.cwd(), "data/catalog-snapshot.json");
      try {
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, "utf8");
          this.comparables = JSON.parse(fileContent);
        } else {
          console.warn(
            `[LocalCatalogRepository] Snapshot file not found at ${filePath}. Defaulting to empty catalog.`
          );
          this.comparables = [];
        }
      } catch (err) {
        console.error(
          `[LocalCatalogRepository] Failed to read snapshot file: ${err instanceof Error ? err.message : String(err)}`
        );
        this.comparables = [];
      }
    }
  }

  /**
   * Find comparable listings based on ISBN exact match or title+author fuzzy fallback.
   * Results are sorted by match score descending to place the best matches first.
   */
  async findComparables(query: BookQuery): Promise<Comparable[]> {
    // 1. ISBN exact match first (if ISBN is supplied in query)
    if (query.isbn && query.isbn.trim().length > 0) {
      const qIsbn = normalizeIsbn(query.isbn);
      const isbnMatches = this.comparables.filter((item) => {
        return item.isbn && normalizeIsbn(item.isbn) === qIsbn;
      });

      if (isbnMatches.length > 0) {
        return isbnMatches;
      }
    }

    // 2. Fuzzy title + author fallback match with scoring
    const qTitle = query.title ? normalizeString(query.title) : "";
    const qAuthor = query.author ? normalizeString(query.author) : "";

    // Must match at least one search criteria if no ISBN hit
    if (!qTitle && !qAuthor) {
      return [];
    }

    interface ScoredItem {
      item: Comparable;
      score: number;
    }

    const scoredItems: ScoredItem[] = [];

    for (const item of this.comparables) {
      let score = 0;
      const itemTitle = normalizeString(item.title);
      const itemAuthor = normalizeString(item.author);

      if (qTitle && qAuthor) {
        // Both title and author are provided
        const authorMatches =
          itemAuthor.includes(qAuthor) || qAuthor.includes(itemAuthor);
        if (authorMatches) {
          if (itemTitle === qTitle) {
            score = 150; // Perfect match: both title and author match
          } else if (itemTitle.includes(qTitle) || qTitle.includes(itemTitle)) {
            score = 80; // Substring title match with author agreement
          }
        }
      } else if (qTitle) {
        // Only title is provided: strictly require exact title match to prevent word-sharing mismatches
        if (itemTitle === qTitle) {
          score = 100;
        }
      } else if (qAuthor) {
        // Only author is provided: check if author matches
        if (itemAuthor.includes(qAuthor) || qAuthor.includes(itemAuthor)) {
          score = 50;
        }
      }

      if (score > 0) {
        scoredItems.push({ item, score });
      }
    }

    // Sort by score descending to rank the best matches first
    scoredItems.sort((a, b) => b.score - a.score);

    return scoredItems.map((si) => si.item);
  }

  /**
   * Return the true stock count (activeCopies) from the best matched comparable.
   */
  async countActiveCopies(query: BookQuery): Promise<number> {
    const matches = await this.findComparables(query);
    if (matches.length === 0) {
      return 0;
    }

    // Return the activeCopies from the best/first matched comparable
    return matches[0].activeCopies;
  }
}
