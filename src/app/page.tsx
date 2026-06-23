"use client";

import React, { useState, useTransition } from "react";
import { getBookEstimate, EstimateResponse } from "@/app/actions";
import { Button } from "@/components/ui/button";

export default function Home() {
  // Form states
  const [searchQuery, setSearchQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [condition, setCondition] = useState<
    "new" | "verygood" | "good" | "worn"
  >("good");

  // Estimation and display states
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [isPeekOpen, setIsPeekOpen] = useState(false);
  const [agencySelection, setAgencySelection] = useState<
    "keep" | "donate" | "send"
  >("keep");

  const handleEstimate = (
    clearPrevious = true,
    overrideCondition?: "new" | "verygood" | "good" | "worn"
  ) => {
    const queryStr = searchQuery.trim();
    if (!queryStr) {
      setError("Please enter a title or ISBN to estimate.");
      return;
    }
    setError(null);
    if (clearPrevious) {
      setResult(null);
      setIsPeekOpen(false);
    }

    const activeCondition = overrideCondition || condition;

    startTransition(async () => {
      try {
        // Detect if search query looks like an ISBN (only digits, hyphens, spaces)
        const isIsbn = /^[0-9\s-]+$/.test(queryStr);
        const queryParams = isIsbn
          ? { isbn: queryStr }
          : { title: queryStr, author: authorQuery.trim() || undefined };

        const response = await getBookEstimate(queryParams, activeCondition);
        setResult(response);
        // Reset agency selection to default "keep" when new below-threshold book is estimated
        if (response.estimation.payoutMedian.offerAgency) {
          setAgencySelection("keep");
        }
      } catch (err) {
        setError("Failed to fetch estimate. Please try again.");
        console.error(err);
      }
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleEstimate(true);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans transition-colors duration-200">
      {/* Header bar */}
      <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-40 dark:border-zinc-800/80 dark:bg-zinc-950/70">
        <div className="mx-auto flex max-w-4xl h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2 font-bold text-brand dark:text-brand-foreground text-lg">
            <svg
              className="h-6 w-6 text-brand dark:text-emerald-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            <span>Knihobot Seller Estimator</span>
          </div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            MVP Demo · offline snapshot
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        {/* Value Prop Hero Section */}
        <section className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
            Find out what your books are worth — before you send them.
          </h1>
          <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Get transparent price ranges, itemized payout calculations, and
            stock warnings directly from Knihobot&apos;s catalog listings. Zero
            commitment required.
          </p>
        </section>

        {/* Form Container (Glassmorphic card) */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:backdrop-blur-md mb-8">
          <form onSubmit={handleFormSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="search-query"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2"
              >
                ISBN or Book Title
              </label>
              <input
                id="search-query"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="e.g. 9788024910086 or Tajemství"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm placeholder-zinc-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 transition-all font-medium"
                aria-required="true"
              />
            </div>

            {/* Author (Only visible if not searching purely by ISBN) */}
            {!/^[0-9\s-]+$/.test(searchQuery.trim()) && (
              <div className="transition-all duration-200 ease-in-out">
                <label
                  htmlFor="author-query"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2"
                >
                  Author Name (Optional)
                </label>
                <input
                  id="author-query"
                  type="text"
                  value={authorQuery}
                  onChange={(e) => setAuthorQuery(e.target.value)}
                  placeholder="e.g. Rhonda Byrne"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-4 py-3 text-sm placeholder-zinc-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 transition-all font-medium"
                />
              </div>
            )}

            {/* Condition and Action in a responsive row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="condition-select"
                  className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-2"
                >
                  Book Condition
                </label>
                <select
                  id="condition-select"
                  value={condition}
                  onChange={(e) => {
                    const newCondition = e.target.value as
                      | "new"
                      | "verygood"
                      | "good"
                      | "worn";
                    setCondition(newCondition);
                    if (result && searchQuery.trim().length > 0) {
                      handleEstimate(false, newCondition);
                    }
                  }}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 transition-all font-medium text-zinc-800 dark:text-zinc-200"
                >
                  <option value="new">Like New / Unread (1.2×</option>
                  <option value="verygood">Very Good (1.1×</option>
                  <option value="good">Good / Standard (1.0×</option>
                  <option value="worn">Worn / Damaged (0.7×</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="default"
                  size="lg"
                  className="w-full h-[46px] bg-brand text-brand-foreground hover:bg-brand/95 font-semibold text-sm transition-all focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600 cursor-pointer"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg
                        className="animate-spin h-4 w-4 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Searching snapshot...
                    </span>
                  ) : (
                    "Estimate Value"
                  )}
                </Button>
              </div>
            </div>

            {error && (
              <p
                className="text-red-500 text-xs font-semibold mt-2"
                role="alert"
              >
                {error}
              </p>
            )}
          </form>
        </section>

        {/* Results Presentation Panel */}
        <section aria-live="polite">
          {/* Result Card when matched */}
          {result && result.estimation.hasEstimate && (
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden dark:border-zinc-800 dark:bg-zinc-900/40">
              {/* Header section with book info */}
              <div className="border-b border-zinc-200 p-6 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-950/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-zinc-950 dark:text-white leading-tight">
                      {result.comparables[0]?.title || result.query.title}
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                      by{" "}
                      {result.comparables[0]?.author ||
                        result.query.author ||
                        "Unknown"}
                    </p>
                  </div>

                  {/* Stock Level/Demand Warning (Principle 3) */}
                  <div>
                    {result.estimation.demandStatus === "high" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        High Demand (low stock: {result.estimation.activeCopies}
                        )
                      </span>
                    )}
                    {result.estimation.demandStatus === "moderate" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                        Moderate Supply ({result.estimation.activeCopies}{" "}
                        copies)
                      </span>
                    )}
                    {result.estimation.demandStatus === "oversupplied" && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                        Oversupplied ({result.estimation.activeCopies} copies)
                      </span>
                    )}
                  </div>
                </div>

                {result.estimation.demandWarning && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                    <svg
                      className="h-4 w-4 shrink-0 mt-0.5 text-amber-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                    <span>
                      <strong>Oversupply warning:</strong> Knihobot already has
                      many active copies. This listing may take a long time to
                      sell, or might be declined/donated upon arrival.
                    </span>
                  </div>
                )}
              </div>

              {/* Estimate grid */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Estimated retail range (Principle 1) */}
                  <div className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/30 dark:border-zinc-800/50 dark:bg-zinc-900/20">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Estimated List Price
                    </h3>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white tracking-tight">
                      {result.estimation.priceMin}–{result.estimation.priceMax}{" "}
                      CZK
                    </p>
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Based on {result.estimation.comparableCount} comparable
                      copies in snapshot.
                    </p>
                  </div>

                  {/* Estimated payout range */}
                  <div className="p-4 rounded-xl border border-brand/10 bg-brand/5 dark:border-emerald-900/30 dark:bg-emerald-950/10">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-brand dark:text-emerald-400">
                      Expected Payout Range
                    </h3>
                    <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-brand dark:text-emerald-400 tracking-tight">
                      {result.estimation.payoutMin.payout}–
                      {result.estimation.payoutMax.payout} CZK
                    </p>
                    <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                      Payout is floored at 0 and itemized below.
                    </p>
                  </div>
                </div>

                {/* Always Show the Math (Principle 2) */}
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Commission Math Breakdown
                  </h3>
                  <div className="rounded-xl border border-zinc-100 bg-zinc-50/30 p-4 dark:border-zinc-800/50 dark:bg-zinc-900/20 text-xs sm:text-sm space-y-3 font-medium text-zinc-700 dark:text-zinc-300">
                    {/* Minimum calc */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-zinc-200/50 pb-2 dark:border-zinc-800/50">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Min Estimate Math:
                      </span>
                      <span>
                        {result.estimation.payoutMin.isBelowThreshold ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            List price below 50 CZK threshold → 0 CZK payout
                          </span>
                        ) : (
                          <span>
                            {result.estimation.payoutMin.listPrice} CZK price ×{" "}
                            {result.estimation.payoutMin.sellerSharePercent *
                              100}
                            % share (
                            {result.estimation.payoutMin.sellerShareAmount} CZK)
                            − {result.estimation.payoutMin.fixedFee} CZK fee ={" "}
                            <strong className="text-zinc-950 dark:text-white font-bold">
                              {result.estimation.payoutMin.payout} CZK payout
                            </strong>
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Maximum calc */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pt-1">
                      <span className="text-zinc-500 dark:text-zinc-400">
                        Max Estimate Math:
                      </span>
                      <span>
                        {result.estimation.payoutMax.isBelowThreshold ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">
                            List price below 50 CZK threshold → 0 CZK payout
                          </span>
                        ) : (
                          <span>
                            {result.estimation.payoutMax.listPrice} CZK price ×{" "}
                            {result.estimation.payoutMax.sellerSharePercent *
                              100}
                            % share (
                            {result.estimation.payoutMax.sellerShareAmount} CZK)
                            − {result.estimation.payoutMax.fixedFee} CZK fee ={" "}
                            <strong className="text-brand dark:text-emerald-400 font-bold">
                              {result.estimation.payoutMax.payout} CZK payout
                            </strong>
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Below threshold agency selectors (Principle 4) */}
                {result.estimation.payoutMedian.isBelowThreshold && (
                  <div className="p-4 rounded-xl border border-amber-200/60 bg-amber-50/20 dark:border-amber-900/30 dark:bg-amber-950/10">
                    <fieldset className="space-y-3">
                      <legend className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
                        Earn Less Choice — Give Agency on the Losers
                      </legend>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-normal mb-3">
                        This book estimates below our earning threshold. What
                        would you like to do if you send it?
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                          <input
                            type="radio"
                            name="agency-choice"
                            value="keep"
                            checked={agencySelection === "keep"}
                            onChange={() => setAgencySelection("keep")}
                            className="mt-1 h-4 w-4 border-zinc-300 text-brand focus:ring-brand dark:border-zinc-800 dark:focus:ring-emerald-500"
                          />
                          <span className="text-xs sm:text-sm">
                            <strong className="font-bold text-zinc-900 dark:text-white">
                              Keep this book
                            </strong>{" "}
                            — Better off kept on your shelf or gifted to a
                            friend.
                          </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                          <input
                            type="radio"
                            name="agency-choice"
                            value="donate"
                            checked={agencySelection === "donate"}
                            onChange={() => setAgencySelection("donate")}
                            className="mt-1 h-4 w-4 border-zinc-300 text-brand focus:ring-brand dark:border-zinc-800 dark:focus:ring-emerald-500"
                          />
                          <span className="text-xs sm:text-sm">
                            <strong className="font-bold text-zinc-900 dark:text-white">
                              Donate on purpose
                            </strong>{" "}
                            — Send anyway, let Knihobot sell and donate proceeds
                            to charity or recycle.
                          </span>
                        </label>
                        <label className="flex items-start gap-3 cursor-pointer p-2 rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-900/30">
                          <input
                            type="radio"
                            name="agency-choice"
                            value="send"
                            checked={agencySelection === "send"}
                            onChange={() => setAgencySelection("send")}
                            className="mt-1 h-4 w-4 border-zinc-300 text-brand focus:ring-brand dark:border-zinc-800 dark:focus:ring-emerald-500"
                          />
                          <span className="text-xs sm:text-sm">
                            <strong className="font-bold text-zinc-900 dark:text-white">
                              Send anyway
                            </strong>{" "}
                            — Send it to Knihobot. If list prices increase, you
                            may still earn; otherwise, it will be handled as a
                            donation.
                          </span>
                        </label>
                      </div>
                    </fieldset>
                  </div>
                )}

                {/* Expandable Comparables Peek (Principle 1) */}
                <div className="border-t border-zinc-150 pt-4 dark:border-zinc-800">
                  <button
                    type="button"
                    aria-expanded={isPeekOpen}
                    aria-controls="comparables-peek-panel"
                    onClick={() => setIsPeekOpen(!isPeekOpen)}
                    className="flex w-full items-center justify-between py-2 text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md px-1 transition-all cursor-pointer"
                  >
                    <span>
                      Peek at comparable listings (
                      {result.estimation.comparableCount})
                    </span>
                    <svg
                      className={`h-4 w-4 transform transition-transform duration-200 ${isPeekOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {isPeekOpen && (
                    <div
                      id="comparables-peek-panel"
                      className="mt-4 transition-all duration-200"
                    >
                      <div className="rounded-xl border border-zinc-200 overflow-hidden dark:border-zinc-800">
                        {/* Scrollable container capped at top 20 items (N5) */}
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead className="bg-zinc-50 text-zinc-500 font-semibold sticky top-0 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
                              <tr>
                                <th className="p-3">Title</th>
                                <th className="p-3">Author</th>
                                <th className="p-3">Condition</th>
                                <th className="p-3 text-right">Price</th>
                                <th className="p-3 text-right">Stock</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 dark:bg-zinc-900/10">
                              {result.comparables
                                .slice(0, 20)
                                .map((comp, idx) => (
                                  <tr
                                    key={idx}
                                    className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20"
                                  >
                                    <td
                                      className="p-3 font-medium text-zinc-900 dark:text-zinc-100 truncate max-w-[140px]"
                                      title={comp.title}
                                    >
                                      {comp.title}
                                    </td>
                                    <td
                                      className="p-3 text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]"
                                      title={comp.author}
                                    >
                                      {comp.author}
                                    </td>
                                    <td className="p-3">
                                      <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 font-mono text-[10px]">
                                        {comp.condition}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                                      {comp.listPriceCzk} CZK
                                    </td>
                                    <td className="p-3 text-right text-zinc-500 dark:text-zinc-400">
                                      {comp.activeCopies}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                        {result.comparables.length > 20 && (
                          <div className="bg-zinc-50 border-t border-zinc-200 p-2.5 text-center text-[10px] text-zinc-500 font-medium dark:bg-zinc-950 dark:border-zinc-800">
                            Showing top 20 of {result.comparables.length}{" "}
                            comparables.
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty State / No-Data Fallback Card (B1 resolved) */}
          {result && !result.estimation.hasEstimate && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40 space-y-6">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-full bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 shrink-0">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-bold text-zinc-950 dark:text-white leading-tight">
                    No Comparable Copies Found
                  </h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 leading-relaxed">
                    We couldn&apos;t find any comparable copies of this book in
                    our snapshot database, so we can&apos;t compute a specific
                    estimate.
                  </p>
                </div>
              </div>

              {/* General Reference Context (Principle 1 & B1 resolved) */}
              <div className="p-5 rounded-xl border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-950/30 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  General Used Book Reference
                </h3>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                  While we don&apos;t have data for this specific title, here
                  are the typical list price statistics across all books in our
                  catalog snapshot:
                </p>
                <div className="grid grid-cols-2 gap-4 pt-1 text-center sm:text-left">
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                      Typical List Price
                    </span>
                    <strong className="text-sm sm:text-base font-extrabold text-zinc-950 dark:text-white">
                      {result.referenceStats.p25Price}–
                      {result.referenceStats.p75Price} CZK
                    </strong>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                      Typical Payout
                    </span>
                    <strong className="text-sm sm:text-base font-extrabold text-brand dark:text-emerald-400">
                      {result.referenceStats.p25Payout}–
                      {result.referenceStats.p75Payout} CZK
                    </strong>
                  </div>
                </div>
                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal border-t border-zinc-200/50 pt-2 dark:border-zinc-800/50">
                  *Disclaimer: These are overall catalog statistics. Your
                  book&apos;s actual quality, demand, and valuation may differ.
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setSearchQuery("");
                    setAuthorQuery("");
                  }}
                  className="text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 font-medium"
                >
                  Search Another Book
                </Button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
