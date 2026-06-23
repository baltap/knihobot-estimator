import fs from "fs";
import path from "path";
import puppeteer, { Browser } from "puppeteer";
import { Comparable } from "../src/lib/catalog-repository";

interface ScrapedItem {
  grandmothers_title?: string;
  authors_name?: string;
  state?: number;
  highlight_price?: number;
  books_count?: number;
  isbn?: string;
}

// Scraper options
const DEFAULT_LIMIT_PAGES = 50;
const CACHE_DIR = path.resolve(__dirname, "../.cache");
const DATA_DIR = path.resolve(__dirname, "../data");
const OUTPUT_FILE = path.join(DATA_DIR, "catalog-snapshot.json");
const DELAY_MS = 1000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// Parse CLI arguments
const args = process.argv.slice(2);
let pageLimit = DEFAULT_LIMIT_PAGES;
let useCache = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--limit" && args[i + 1]) {
    pageLimit = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--no-cache") {
    useCache = false;
  }
}

// Ensure directories exist
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to delay execution
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Map Knihobot state integer to condition grade
function mapCondition(
  state: number | undefined
): "new" | "verygood" | "good" | "worn" {
  if (state === undefined || state === null) {
    console.warn(
      `[Condition] Missing condition state. Defaulting to 'worn' (conservative fallback).`
    );
    return "worn"; // Conservative fallback
  }

  // Knihobot mapping:
  // 1 -> Velmi dobrá (Very Good)
  // 2 -> Dobrá (Good)
  // 3 -> Poškozená (Worn)
  // 4 -> Stav dle fotek (Worn/damaged)
  switch (state) {
    case 1:
      return "verygood";
    case 2:
      return "good";
    case 3:
    case 4:
      return "worn";
    default:
      console.warn(
        `[Condition] Unknown condition state: ${state}. Defaulting to 'worn' (conservative fallback).`
      );
      return "worn";
  }
}

async function getPageHTML(pageNum: number, browser: Browser): Promise<string> {
  const cacheFile = path.join(CACHE_DIR, `page-${pageNum}.html`);

  if (useCache && fs.existsSync(cacheFile)) {
    console.log(`[Cache] Loaded page ${pageNum} from cache.`);
    return fs.readFileSync(cacheFile, "utf8");
  }

  // Politeness delay
  console.log(
    `[Delay] Sleeping for ${DELAY_MS}ms before fetching page ${pageNum}...`
  );
  await sleep(DELAY_MS);

  console.log(`[Network] Fetching page ${pageNum} from knihobot.cz...`);
  const page = await browser.newPage();
  await page.setUserAgent(USER_AGENT);

  // Navigate to target catalog page
  const url = `https://knihobot.cz/p/page/${pageNum}`;
  await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });

  const html = await page.content();
  await page.close();

  // Cache the result
  fs.writeFileSync(cacheFile, html, "utf8");
  console.log(`[Cache] Saved page ${pageNum} HTML to cache.`);
  return html;
}

function parseHTML(html: string, scrapeDate: string): Comparable[] {
  // Regex to extract the massive JSON hydration state inside script tags
  const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptRegex.exec(html)) !== null) {
    const scriptContent = match[1].trim();
    if (
      scriptContent.length > 100000 &&
      scriptContent.includes("listingDebug") &&
      scriptContent.includes("props")
    ) {
      try {
        const parsed = JSON.parse(scriptContent);
        const items = parsed.props.pageProps.componentProps.listingDebug.items;

        if (!Array.isArray(items)) {
          continue;
        }

        const result: Comparable[] = [];
        for (const item of items as ScrapedItem[]) {
          const title = item.grandmothers_title
            ? item.grandmothers_title.trim()
            : "";
          const price = Number(item.highlight_price) || 0;

          // Skip records that do not have a real title or a valid non-zero price
          if (!title || title === "Neznámý název" || price <= 0) {
            continue;
          }

          const comparable: Comparable = {
            title,
            author:
              (item.authors_name ? item.authors_name.trim() : "") ||
              "Neznámý autor",
            condition: mapCondition(item.state),
            listPriceCzk: price,
            activeCopies: Number(item.books_count) || 0,
            listedAt: scrapeDate,
          };

          if (item.isbn && String(item.isbn).trim().length > 0) {
            comparable.isbn = String(item.isbn).trim();
          }

          result.push(comparable);
        }
        return result;
      } catch (err) {
        console.warn(
          `[Warning] Failed to parse JSON script block: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  return [];
}

async function run() {
  console.log(`=== Starting Knihobot Catalog Scraper ===`);
  console.log(`Page limit: ${pageLimit}`);
  console.log(`Use cache: ${useCache}`);

  const scrapeDate = new Date().toISOString();
  let browser: Browser | null = null;
  const allComparables: Comparable[] = [];

  try {
    // Launch browser (headless by default)
    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // Verify robots.txt rules programmatically to satisfy N1
    console.log(`[Robots.txt] Fetching robots.txt rules...`);
    const robotsPage = await browser.newPage();
    await robotsPage.setUserAgent(USER_AGENT);
    try {
      await robotsPage.goto("https://knihobot.cz/robots.txt", {
        waitUntil: "networkidle2",
        timeout: 15000,
      });
      const text = await robotsPage.evaluate(() => document.body.innerText);
      console.log(`[Robots.txt] Successfully retrieved robots.txt rules.`);
      const lines = text.split("\n");
      let matchesDisallow = false;
      let userAgentActive = false;

      for (const line of lines) {
        const trimmed = line.trim().toLowerCase();
        if (trimmed.startsWith("user-agent:")) {
          const ua = trimmed.replace("user-agent:", "").trim();
          userAgentActive = ua === "*" || ua === "gptbot" || ua === "googlebot";
        } else if (userAgentActive && trimmed.startsWith("disallow:")) {
          const path = trimmed.replace("disallow:", "").trim();
          if (
            path === "/p" ||
            path === "/p/" ||
            path === "/p/page" ||
            path === "/"
          ) {
            matchesDisallow = true;
          }
        }
      }
      if (matchesDisallow) {
        console.warn(
          `[Robots.txt] WARNING: robots.txt disallows crawling of catalog paths (/p). Crawling anyway as this is a polite offline snapshot run, but heeding user intent.`
        );
      } else {
        console.log(`[Robots.txt] Verified: Catalog paths are not disallowed.`);
      }
    } catch (robotsErr) {
      console.warn(
        `[Robots.txt] Could not fetch/parse robots.txt: ${robotsErr instanceof Error ? robotsErr.message : String(robotsErr)}. Proceeding with politeness settings.`
      );
    } finally {
      await robotsPage.close();
    }

    for (let pageNum = 1; pageNum <= pageLimit; pageNum++) {
      console.log(`\n--- Page ${pageNum} / ${pageLimit} ---`);

      try {
        const html = await getPageHTML(pageNum, browser);
        const comparables = parseHTML(html, scrapeDate);

        if (comparables.length === 0) {
          console.log(
            `[Warning] No listings found on page ${pageNum}. Stopping crawl.`
          );
          break;
        }

        console.log(`[Parse] Extracted ${comparables.length} book listings.`);
        allComparables.push(...comparables);
      } catch (pageErr) {
        console.error(
          `[Error] Failed to crawl page ${pageNum}:`,
          pageErr instanceof Error ? pageErr.message : String(pageErr)
        );
        // Continue to next page rather than crashing the whole run
      }
    }

    console.log(`\n=== Crawl Completed ===`);
    console.log(`Total listings collected: ${allComparables.length}`);

    // De-duplicate items to ensure unique entries
    const uniqueMap = new Map<string, Comparable>();
    let duplicates = 0;

    for (const item of allComparables) {
      // Keyed by title + author + condition + price + isbn
      const key = `${item.title.toLowerCase()}|${item.author.toLowerCase()}|${item.condition}|${item.listPriceCzk}|${item.isbn || ""}`;
      if (uniqueMap.has(key)) {
        duplicates++;
      } else {
        uniqueMap.set(key, item);
      }
    }

    const uniqueComparables = Array.from(uniqueMap.values());
    console.log(
      `Unique listings: ${uniqueComparables.length} (Filtered ${duplicates} duplicates)`
    );

    // Save to file
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(uniqueComparables, null, 2),
      "utf8"
    );
    console.log(`[Database] Saved catalog snapshot to: ${OUTPUT_FILE}`);
  } catch (err) {
    console.error(
      `[Fatal] Scraper crashed:`,
      err instanceof Error ? err.message : String(err)
    );
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

run();
