export interface BookQuery {
  title?: string;
  author?: string;
  isbn?: string;
}

export interface Comparable {
  title: string;
  author: string;
  isbn?: string;
  condition: "new" | "verygood" | "good" | "worn";
  listPriceCzk: number;
  activeCopies: number;
  listedAt: string;
}

export interface CatalogRepository {
  /** Comparable live/recent listings for a title+author or ISBN. */
  findComparables(query: BookQuery): Promise<Comparable[]>;
  /** How many copies of this title are currently active (supply signal). */
  countActiveCopies(query: BookQuery): Promise<number>;
}
