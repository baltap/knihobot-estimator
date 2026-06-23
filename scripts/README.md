# Catalog Snapshot Scraper

This folder contains a standalone, polite web scraper script that collects book listings from Knihobot and compiles them into a local JSON database snapshot.

## How it Works

1. **Browsing Catalog Pages:** The script browses Knihobot's public books list at `https://knihobot.cz/p/page/{pageNum}`.
2. **Next.js Hydration Parsing:** Instead of parsing brittle DOM elements, the scraper extracts the full data payload from the embedded Next.js JSON state (`props.pageProps.componentProps.listingDebug.items`).
3. **Data Extraction:** Parses titles, authors, ISBNs, list prices, conditions (mapped to SPEC states), and true stock counts (`activeCopies`).
4. **Local Caching:** Raw HTML responses are saved in the `.cache/` folder (gitignored). Subsequent runs will load pages instantly from the cache, preventing duplicate network hits.
5. **Politeness:** Runs sequentially (concurrency 1) with a 1-second delay between fetches when query cache is bypassed. Checks and logs robots.txt rules and uses a standard browser User-Agent.

## Usage

Ensure you have installed devDependencies (`npm install`).

### Run Scraper (Default 50 pages / ~2,400 books)
```bash
npm run scrape
```

### Run with Page Limit (e.g. 5 pages / ~240 books)
```bash
npm run scrape -- --limit 5
```

### Bypass Local Cache (Force Fresh Network Requests)
```bash
npm run scrape -- --no-cache
```

## Snapshot Output

The compiled and de-duplicated listings are stored in:
- `data/catalog-snapshot.json`

This file is checked into the repository so that the Knihobot Book Value Estimator application can run fully offline in development.
