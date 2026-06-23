# SPEC — Knihobot Seller Estimator

**Single source of truth.** Both the Developer (Gemini) and the Reviewer (Claude)
read this in full before working. If reality and this document disagree, fix the
document via Peter — don't silently diverge.

---

## 1. The bet (one sentence)

Knihobot's growth bottleneck is _acquiring_ books, and the loudest reason sellers
feel cheated is that they commit blind and get surprised by the payout — so a tool
that shows **what your books are worth and what you'll actually receive, before you
send anything** attacks the company's #1 constraint and its #1 complaint at once.

Everything in this spec serves that sentence.

## 2. User & job-to-be-done

- **Primary user:** someone with a shelf of read books wondering _"is it even worth
  the hassle to sell these?"_
- **The job:** remove uncertainty _before_ commitment. This is NOT "list my books"
  (Knihobot already has that flow). It sits one step earlier — at the moment of
  hesitation where sellers drop off.

## 3. Goals / Non-goals

**Goals**

1. A credible per-book **price range** and **expected payout**.
2. Radical **transparency** about the commission math and _why_ a price is what it is.
3. Proactively **warn** about books likely to be declined or donated, before sending.
4. Be a real, runnable thing — not a mock.

**Non-goals (resist these)**

- Real Knihobot account integration or auth.
- Actual book intake / shipping / payment.
- Perfect price accuracy.
- The full seller dashboard (that's a stretch screen, not the MVP).
- Any deployment/hosting setup right now (see §7).

## 4. The four Trust Principles (PRODUCT LAW)

These are non-negotiable. The Reviewer guards them; the Developer never trades them
away for a nicer screen.

1. **Ranges, never false precision.** Show a price _range_ with the number of
   comparable copies it's based on (e.g. "lists for ~90–140 CZK, based on 6
   comparable copies"), and let the user peek at those comparables. Never a single
   confident number we can't back up.
2. **Always show the math.** Display the payout calculation openly — seller share ×
   list price − fixed fee, and zero below the earning threshold — per book. Never
   hide it behind a final figure.
3. **Warn before they commit.** Flag oversupplied / likely-to-be-declined titles
   _up front_ ("Knihobot already has many copies of this — it may be declined or
   donated"). This single behaviour neutralises the worst complaints in the reviews.
4. **Give agency on the losers.** For books below the earning threshold, offer a
   real choice — keep / donate on purpose / send anyway — instead of a silent zero.

## 5. Core flow

1. **Land** → headline: _"Find out what your books are worth — before you send them."_
2. **Add books** via the inputs in §8 (priority order matters).
3. **Per book**, return: estimated **list-price range**, a **demand/supply signal**,
   and **expected payout** with the math shown.
4. **Aggregate** headline: _"Your 12 books → est. payout 340–520 CZK,"_ with a clean
   per-book breakdown.
5. **Honest CTA:** "Send these to Knihobot" (deep-link to their real selling flow) +
   "These 3 are better kept or donated — here's why."

## 6. Scope

**MVP (must work flawlessly in a live demo)**

- Landing + add-book input (search by ISBN/title).
- Per-book price range + transparent payout + demand/oversupply flag.
- Multi-book list + aggregate headline number.
- Agency choice on sub-threshold books.
- Runs locally, clean; instrumentation hook present but optional (see §10).

**Stretch (only if time; each is a separate task)**

- Barcode scan via camera (strong "wow," still reliable).
- Spine-photo → AI vision → titles (label "AI beta"; a live flake must be forgivable).
- Estimated time-to-sell.
- CZ/EN toggle (nods to their multi-market reality).
- A thin **seller dashboard** screen: status pipeline + payout countdown.

## 7. Architecture

- **App:** Next.js (App Router) + TypeScript + React + Tailwind + shadcn/ui.
- **Backend & deployment: DELIBERATELY UNDECIDED.** No Vercel, no Dockerfile, no
  hosting, no cloud DB yet. Everything runs via `next dev`. We will choose the
  backend later in the process.
- **Data access goes behind one interface** so the choice stays cheap:

  ```ts
  // The whole app depends on this, never on a concrete store.
  export interface CatalogRepository {
    /** Comparable live/recent listings for a title+author or ISBN. */
    findComparables(query: BookQuery): Promise<Comparable[]>;
    /** How many copies of this title are currently active (supply signal). */
    countActiveCopies(query: BookQuery): Promise<number>;
  }
  ```

  For now, implement `CatalogRepository` over a **local snapshot file** (JSON or
  SQLite). Swapping to a real backend later must not touch UI or pricing logic.

- **Pure logic** (pricing, commission, demand) lives in framework-free modules with
  unit tests, importable without React.
- **Scraper** is a standalone, one-shot script that fills the local snapshot. It is
  _not_ called at request time.

## 8. Data strategy (the crux — credibility lives here)

- **Snapshot, don't live-query.** A one-shot Puppeteer script collects a few
  thousand public listings into the local store, shaped roughly:

  ```ts
  type Comparable = {
    title: string;
    author: string;
    isbn?: string;
    condition: "new" | "verygood" | "good" | "worn"; // map to Knihobot's grades
    listPriceCzk: number;
    activeCopies: number; // supply signal for this title
    listedAt: string; // ISO date, for freshness/age heuristics
  };
  ```

- **Price estimate** = median of comparable copies for the matched title/author (or
  ISBN), adjusted by a condition multiplier; present as a range (e.g. p25–p75) with
  the comparable count. If too few comparables, say so honestly and widen/soften the
  estimate — never fake precision.
- **Demand/supply signal** = derived from `activeCopies`: few copies → "good chance";
  many copies → "oversupplied, may be declined or donated." Thresholds configurable.
  This is the defensible, high-value part — keep it.
- **Time-to-sell** = riskier; only as a clearly-labelled rough heuristic, or cut it.
- **Matching:** ISBN exact-match first; fall back to fuzzy title+author match for
  books without a clean ISBN hit. (This is the same scrape-then-match pattern as
  TenderMonitor, repointed from CPV codes to book metadata.)

## 9. Commission model (config-driven; VERIFY the numbers)

> These rates come from public Knihobot seller reviews and **may be outdated or
> imprecise.** Treat them as defaults in one config module, clearly labelled as
> assumptions to confirm — never as magic numbers scattered in components.

```ts
// config/commission.ts — illustrative shape; Developer owns the final form.
export const COMMISSION = {
  sellerShare: 0.6, // seller receives ~60% of the sale price
  fixedFeeCzk: 29, // flat processing fee per sold book
  minEarningPriceCzk: 50, // below this list price, seller share may be 0
  currency: "CZK",
} as const;
```

**Payout rule (illustrative):**

- If `listPrice < minEarningPriceCzk` → payout `0`, flagged "below earning
  threshold," and the agency choice (Principle 4) is offered.
- Else → `payout = round(listPrice * sellerShare) - fixedFeeCzk`, floored at `0`,
  with every term shown to the user (Principle 2).

The UI must make clear these are estimates, and surface the assumption that rates
should be confirmed against Knihobot's current terms.

## 10. Conventions & definition of done

- **Analytics:** if instrumentation is added (PostHog is a nice nod — Peter uses it),
  it must be behind a config flag and run with **no keys present**, so the app works
  out of the box. No analytics is better than a broken boot.
- **Accessibility:** every interactive element labelled; sensible contrast; keyboard
  operable; loading / empty / error states for every async surface.
- **Brand:** Knihobot green `#264D39` as the primary; clean, calm, trustworthy —
  this is a tool about _trust_, so the visual tone should feel honest, not salesy.
- **Definition of done (global):** acceptance criteria met; Trust Principles upheld;
  types clean; pure-logic tests pass; `next dev` boots with no console errors on the
  happy path; reviewed and approved.

## 11. Why this shape wins the role

It proves **end-to-end ownership** (problem found in their own reviews → designed →
shipped, no ticket), a **strong UX opinion** (the four Trust Principles), **agentic
AI-dev speed**, and it reuses Peter's proven scrape-then-match muscle from
TenderMonitor. The estimator isn't a toy — it points straight at Knihobot's hardest
business problem (acquiring books) and its loudest complaint (payout surprise).
