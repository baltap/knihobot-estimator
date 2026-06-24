# TASKS — Build Board

The backlog **and** the live status board. This file is the baton both agents pass.

**Status legend:** `TODO` → `IN PROGRESS` → `IN REVIEW` → (`CHANGES REQUESTED` ↩) →
`DONE`.
Only an **approved review** flips a task to `DONE`. The Developer never self-marks DONE.

Work top to bottom. Do **one** task at a time. Build the data foundation before the UI
that depends on it.

---

## MVP

### T0 — Repo scaffold · `DONE`

Stand up the project so everything after it has a home.

- **Why:** a clean, conventional base; no surprises later.
- **Acceptance:**
  - Next.js (App Router) + TypeScript + Tailwind + shadcn/ui initialised.
  - Lint + format + type-check + a test runner configured and runnable.
  - Brand token for Knihobot green `#264D39` wired into the theme.
  - A placeholder landing route renders; `next dev` boots with no console errors.
  - **No** Vercel / Docker / hosting / cloud-DB config of any kind.
  - `.env.example` committed; real secrets ignored.

### T1 — Catalog snapshot + `CatalogRepository` · `DONE`

The data foundation. Everything downstream depends on it, so de-risk it first.

- **Why:** credible estimates need real comparable prices and supply counts.
- **Acceptance:**
  - A standalone, one-shot Puppeteer script collects a few thousand public listings
    into a local snapshot (JSON or SQLite). **Polite:** rate-limited, cached,
    re-runnable, no live request-time scraping, no personal data.
  - `CatalogRepository` interface (per SPEC §7) implemented over the snapshot, with
    `findComparables` and `countActiveCopies`.
  - `Comparable` shape matches SPEC §8; condition mapped to Knihobot's grades.
  - Short README note on how to (re)build the snapshot.

### T2 — Pricing + commission + demand engine (pure, tested) · `DONE`

The brain. No React in here.

- **Why:** this is where credibility and the Trust Principles are enforced in logic.
- **Acceptance:**
  - Price estimate = median of comparables + condition multiplier, returned as a
    **range** with the comparable count (Principle 1).
  - Commission/payout from a single config module (SPEC §9); the math is returned in
    a structured, displayable form (Principle 2).
  - Demand/supply signal from `activeCopies` with configurable thresholds, including
    an "oversupplied → may be declined/donated" state (Principle 3).
  - Sub-threshold books return a payout of 0 plus an "offer agency" flag (Principle 4).
  - Unit tests cover: no comparables found, below threshold, oversupplied, missing
    condition, normal case.

### T3 — Single-book estimate UI · `DONE`

The core experience, for one book.

- **Why:** prove the whole value prop on a single card before scaling to many.
- **Acceptance:**
  - Add a book by ISBN or title search → a result card showing: price **range** +
    comparable count, the **payout math** laid out, and the **demand/supply flag**.
  - A way to peek at the comparables behind the estimate.
  - Loading / empty ("no comparables found, here's our honest guess") / error states.
  - All four Trust Principles visibly upheld on this card.

### T4 — Multi-book + aggregate + agency · `DONE`

From one card to a shelf.

- **Why:** the real user has a pile, and the headline number is the hook.
- **Acceptance:**
  - Add several books; see them listed; an aggregate headline payout **range**.
  - Per-book agency control on sub-threshold books: keep / donate on purpose / send
    (Principle 4) — and these choices affect the aggregate sensibly.
  - Honest split CTA: "send these" (deep-link to Knihobot's real flow) vs. "better
    kept/donated — here's why."

### T5 — Brand polish, states & a11y pass · `DONE`

Make it feel trustworthy and founder-demo ready.

- **Why:** this is a tool about trust; the finish has to read honest, not salesy.
- **Acceptance:**
  - Responsive; Knihobot green; calm, clean visual tone.
  - Every async surface has loading/empty/error; every control labelled; keyboard +
    contrast checked.
  - Optional analytics hook behind a config flag that runs fine with **no keys**.

---

## Stretch (only after MVP is DONE; each its own task)

### S1 — Barcode scan input · `DONE`

- Camera → ISBN → estimate, with manual fallback. Must fail gracefully on desktop /
  denied-permission. The reliable "wow."

### S2 — Spine-photo → AI vision → titles · `DONE`

- Photograph spines → vision model extracts titles → estimates. Label "AI beta"; a
  live flake must never break the MVP path. (Mirrors Knihobot's real selling flow.)

### S3 — Seller dashboard screen · `DONE`

- A thin second screen: status pipeline (received → priced → listed → sold → paid) +
  a payout countdown that names the exact date money lands. Directly answers the
  "slow, opaque payout / no notification" complaints.

### S4 — CZ / EN toggle · `IN REVIEW`

- Language toggle; nods to the 9-market reality. Keep copy in a simple dictionary.

---

## Decisions log (Peter fills this in as we go)

- Backend / storage choice: **UNDECIDED** — to be chosen mid-build.
- Hero input (barcode vs. AI photo): **RESOLVED** — both scanners sit side-by-side in the manual search row; the manual ISBN/title text box remains the primary input, with the Barcode camera and AI Spine Scanner as secondary affordances.
- Commission rates confirmed against current Knihobot terms? **YES** — confirmed (60% share minus 29 CZK fee)
