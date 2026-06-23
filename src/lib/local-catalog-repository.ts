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

    // 2. Fuzzy title + author fallback match
    const qTitle = query.title ? normalizeString(query.title) : "";
    const qAuthor = query.author ? normalizeString(query.author) : "";

    // Must match at least one search criteria if no ISBN hit
    if (!qTitle && !qAuthor) {
      return [];
    }

    return this.comparables.filter((item) => {
      let isTitleMatch = true;
      let isAuthorMatch = true;

      if (qTitle) {
        const itemTitle = normalizeString(item.title);
        isTitleMatch = itemTitle.includes(qTitle) || qTitle.includes(itemTitle);
      }

      if (qAuthor) {
        const itemAuthor = normalizeString(item.author);
        isAuthorMatch =
          itemAuthor.includes(qAuthor) || qAuthor.includes(itemAuthor);
      }

      return isTitleMatch && isAuthorMatch;
    });
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
