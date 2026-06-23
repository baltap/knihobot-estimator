"use client";

import React, { useState, useEffect, useTransition } from "react";
import { getBookEstimate, EstimateResponse } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

interface ShelfItem {
  id: string; // unique ID for duplicate-support
  query: {
    title?: string;
    author?: string;
    isbn?: string;
  };
  estimation: EstimateResponse["estimation"];
  comparables: EstimateResponse["comparables"];
  referenceStats: EstimateResponse["referenceStats"];
  condition: "new" | "verygood" | "good" | "worn";
  agencySelection: "keep" | "donate" | "send"; // defaults: "keep" if below-threshold, "send" if normal
  isOversuppliedKept?: boolean; // toggle to keep oversupplied book
  isUpdating?: boolean; // inline loader state
  updateError?: string | null; // optional error state for inline re-estimation
}

export default function Home() {
  // Theme state (Dark Mode) - N3
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Form states
  const [searchQuery, setSearchQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [formCondition, setFormCondition] = useState<
    "new" | "verygood" | "good" | "worn"
  >("good");

  // Shelf & Action states
  const [shelf, setShelf] = useState<ShelfItem[]>([]);
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);

  // Expanded peek panels by shelf item ID
  const [expandedPeeks, setExpandedPeeks] = useState<Record<string, boolean>>(
    {}
  );

  // Theme Sync Effect
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setTheme(isDark ? "dark" : "light");

    // Listen for system changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem("theme")) {
        const nextTheme = e.matches ? "dark" : "light";
        setTheme(nextTheme);
        if (nextTheme === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
        trackEvent("theme_toggled", { theme: nextTheme, trigger: "system" });
      }
    };
    mediaQuery.addEventListener("change", handleSystemThemeChange);
    return () =>
      mediaQuery.removeEventListener("change", handleSystemThemeChange);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    if (nextTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    trackEvent("theme_toggled", { theme: nextTheme, trigger: "user" });
  };

  // Add book to shelf
  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = searchQuery.trim();
    if (!queryStr) {
      setFormError("Please enter a title or ISBN to estimate.");
      return;
    }
    setFormError(null);

    startTransition(async () => {
      try {
        // Detect ISBN by length (10 or 13 normalized digits) to allow numeric titles like "1984" - N5
        const normalizedDigits = queryStr.replace(/[\s-]/g, "");
        const isIsbn =
          /^[0-9]{9}[0-9Xx]$/.test(normalizedDigits) ||
          /^[0-9]{13}$/.test(normalizedDigits);
        const queryParams = isIsbn
          ? { isbn: queryStr }
          : { title: queryStr, author: authorQuery.trim() || undefined };

        const response = await getBookEstimate(queryParams, formCondition);

        // Track analytics event
        trackEvent("book_added", {
          query: queryStr,
          is_isbn: isIsbn,
          isbn: queryParams.isbn || undefined,
          title: queryParams.title || undefined,
          author: queryParams.author || undefined,
          condition: formCondition,
          has_estimate: response.estimation.hasEstimate,
          payout_min: response.estimation.payoutMin.payout,
          payout_max: response.estimation.payoutMax.payout,
          demand_status: response.estimation.demandStatus,
        });

        // Determine default agency options: sub-threshold books default to "keep", normal/oversupplied default to "send"
        const isBelowThreshold =
          response.estimation.payoutMedian.isBelowThreshold;
        const defaultAgency = isBelowThreshold ? "keep" : "send";

        const newShelfItem: ShelfItem = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          query: queryParams,
          estimation: response.estimation,
          comparables: response.comparables,
          referenceStats: response.referenceStats,
          condition: formCondition,
          agencySelection: defaultAgency,
          isOversuppliedKept: false,
          isUpdating: false,
          updateError: null,
        };

        setShelf((prev) => [newShelfItem, ...prev]);
        setSearchQuery("");
        setAuthorQuery("");
      } catch (err) {
        setFormError("Failed to fetch estimate. Please try again.");
        console.error(err);
      }
    });
  };

  // Recalculate estimate inline when condition changes for an item on the shelf
  const handleItemConditionChange = async (
    itemId: string,
    newCondition: "new" | "verygood" | "good" | "worn"
  ) => {
    // 1. Mark item as updating (loader spinner) and clear previous error
    setShelf((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              isUpdating: true,
              condition: newCondition,
              updateError: null,
            }
          : item
      )
    );

    try {
      const item = shelf.find((i) => i.id === itemId);
      if (!item) return;

      const response = await getBookEstimate(item.query, newCondition);

      setShelf((prev) =>
        prev.map((i) => {
          if (i.id === itemId) {
            // Update estimation data. Also adjust default agency if below-threshold status flipped
            const isBelowThreshold =
              response.estimation.payoutMedian.isBelowThreshold;
            let currentAgency = i.agencySelection;
            if (isBelowThreshold && currentAgency === "send") {
              currentAgency = "keep"; // flip default to keep
            } else if (!isBelowThreshold && currentAgency === "keep") {
              currentAgency = "send"; // flip default to send
            }
            return {
              ...i,
              estimation: response.estimation,
              comparables: response.comparables,
              referenceStats: response.referenceStats,
              agencySelection: currentAgency,
              isUpdating: false,
              updateError: null,
            };
          }
          return i;
        })
      );

      trackEvent("condition_updated", {
        item_id: itemId,
        condition: newCondition,
        success: true,
      });
    } catch (err) {
      console.error("Failed to update item condition:", err);
      setShelf((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                isUpdating: false,
                updateError: "Failed to update estimate. Please try again.",
              }
            : item
        )
      );

      trackEvent("condition_updated", {
        item_id: itemId,
        condition: newCondition,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  };

  // Update agency selection on a shelf item
  const handleItemAgencyChange = (
    itemId: string,
    selection: "keep" | "donate" | "send"
  ) => {
    setShelf((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          trackEvent("agency_updated", {
            item_id: itemId,
            previous_selection: item.agencySelection,
            selection,
          });
          return { ...item, agencySelection: selection };
        }
        return item;
      })
    );
  };

  // Update oversupplied keep toggle
  const handleOversuppliedKeepToggle = (itemId: string, isKept: boolean) => {
    setShelf((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          trackEvent("oversupplied_keep_toggled", {
            item_id: itemId,
            is_kept: isKept,
          });
          return {
            ...item,
            isOversuppliedKept: isKept,
            agencySelection: isKept ? "keep" : "send",
          };
        }
        return item;
      })
    );
  };

  // Remove book from shelf
  const handleRemoveBook = (itemId: string) => {
    const removedItem = shelf.find((item) => item.id === itemId);
    if (removedItem) {
      trackEvent("book_removed", {
        item_id: itemId,
        title: removedItem.comparables[0]?.title || removedItem.query.title,
      });
    }
    setShelf((prev) => prev.filter((item) => item.id !== itemId));
    setExpandedPeeks((prev) => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  // Toggle peek panel for a shelf item
  const togglePeek = (itemId: string) => {
    setExpandedPeeks((prev) => {
      const nextState = !prev[itemId];
      trackEvent("peek_toggled", {
        item_id: itemId,
        is_open: nextState,
      });
      return {
        ...prev,
        [itemId]: nextState,
      };
    });
  };

  // ----------------------------------------------------
  // Aggregate Calculations (Send vs Keep/Donate Buckets)
  // ----------------------------------------------------

  // Send bucket includes:
  // - Books where hasEstimate is true AND (isBelowThreshold is false OR agencySelection is "send")
  //   AND it is NOT an oversupplied book that the user chose to keep.
  // Note: if hasEstimate is false, it goes to Keep/Donate (context card) because we have no reliable data.
  const sendBucket = shelf.filter((item) => {
    if (!item.estimation.hasEstimate) return false;
    const isBelowThreshold = item.estimation.payoutMedian.isBelowThreshold;
    const isOversupplied = item.estimation.demandStatus === "oversupplied";

    if (isBelowThreshold && item.agencySelection !== "send") return false;
    if (!isBelowThreshold && item.isOversuppliedKept && isOversupplied)
      return false;
    if (!isBelowThreshold && item.agencySelection === "keep") return false; // normal kept book

    return true;
  });

  // Keep / Donate bucket includes everything else
  const keepDonateBucket = shelf.filter((item) => !sendBucket.includes(item));

  // Sum up expected payout ranges for the Send bucket
  const totalPayoutMin = sendBucket.reduce(
    (sum, item) => sum + item.estimation.payoutMin.payout,
    0
  );
  const totalPayoutMax = sendBucket.reduce(
    (sum, item) => sum + item.estimation.payoutMax.payout,
    0
  );

  // Render agency radio group selector for below-threshold books (Principle 4 / B3 Copy Leak Resolved)
  const renderAgencySelector = (item: ShelfItem) => {
    if (
      !item.estimation.hasEstimate ||
      !item.estimation.payoutMedian.isBelowThreshold
    ) {
      return null;
    }
    return (
      <div className="mt-4 p-3 rounded-lg border border-amber-200/50 bg-amber-50/10 dark:border-amber-900/30 dark:bg-amber-950/10 text-xs">
        <fieldset className="space-y-2">
          <legend className="block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 mb-1">
            Below earning threshold — how would you like to handle this book?
          </legend>
          <div className="space-y-1">
            <label className="flex items-start gap-2.5 cursor-pointer py-1 rounded hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30">
              <input
                type="radio"
                name={`agency-${item.id}`}
                value="keep"
                checked={item.agencySelection === "keep"}
                onChange={() => handleItemAgencyChange(item.id, "keep")}
                className="mt-0.5 h-3.5 w-3.5 border-zinc-300 text-brand focus:ring-brand dark:border-zinc-800 dark:focus:ring-emerald-500 cursor-pointer"
              />
              <span>
                <strong className="font-bold text-zinc-800 dark:text-zinc-200">
                  Keep this book
                </strong>{" "}
                — Better off kept on your shelf or gifted to a friend.
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer py-1 rounded hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30">
              <input
                type="radio"
                name={`agency-${item.id}`}
                value="donate"
                checked={item.agencySelection === "donate"}
                onChange={() => handleItemAgencyChange(item.id, "donate")}
                className="mt-0.5 h-3.5 w-3.5 border-zinc-300 text-brand focus:ring-brand dark:border-zinc-800 dark:focus:ring-emerald-500 cursor-pointer"
              />
              <span>
                <strong className="font-bold text-zinc-800 dark:text-zinc-200">
                  Donate or rehome locally
                </strong>{" "}
                — Do not send; donate or recycle it yourself.
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer py-1 rounded hover:bg-zinc-100/50 dark:hover:bg-zinc-800/30">
              <input
                type="radio"
                name={`agency-${item.id}`}
                value="send"
                checked={item.agencySelection === "send"}
                onChange={() => handleItemAgencyChange(item.id, "send")}
                className="mt-0.5 h-3.5 w-3.5 border-zinc-300 text-brand focus:ring-brand dark:border-zinc-800 dark:focus:ring-emerald-500 cursor-pointer"
              />
              <span>
                <strong className="font-bold text-zinc-800 dark:text-zinc-200">
                  Send anyway
                </strong>{" "}
                — Send to Knihobot. If list prices increase, you may still earn;
                otherwise, it will be handled as a donation.
              </span>
            </label>
          </div>
        </fieldset>
      </div>
    );
  };

  // Render inline keep selector for normal/oversupplied books (Symmetric Agency Control)
  const renderNormalKeepSelector = (item: ShelfItem) => {
    if (
      !item.estimation.hasEstimate ||
      item.estimation.payoutMedian.isBelowThreshold
    ) {
      return null;
    }
    const isOversupplied = item.estimation.demandStatus === "oversupplied";
    const isChecked =
      item.agencySelection === "keep" || item.isOversuppliedKept;

    return (
      <div
        className={`mt-3 p-2 rounded-lg text-xs flex items-center justify-between ${
          isOversupplied
            ? "bg-amber-50/20 border border-amber-100/30 text-amber-800 dark:text-amber-400"
            : "bg-zinc-100/40 dark:bg-zinc-800/40 text-zinc-700 dark:text-zinc-300"
        }`}
      >
        <span>
          {isOversupplied
            ? "High supply. Do you want to keep this copy locally instead?"
            : "Do you want to keep this copy locally?"}
        </span>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              if (isOversupplied) {
                handleOversuppliedKeepToggle(item.id, e.target.checked);
              } else {
                handleItemAgencyChange(
                  item.id,
                  e.target.checked ? "keep" : "send"
                );
              }
            }}
            className="h-3.5 w-3.5 border-zinc-300 text-brand focus:ring-brand rounded cursor-pointer"
          />
          <span className="font-bold uppercase tracking-wider text-[10px]">
            Keep Book
          </span>
        </label>
      </div>
    );
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

          <div className="flex items-center gap-4">
            {/* Theme Toggle Button (N3) */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer"
            >
              {theme === "light" ? (
                // Moon Icon
                <svg
                  className="h-4.5 w-4.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                  />
                </svg>
              ) : (
                // Sun Icon
                <svg
                  className="h-4.5 w-4.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.364l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z"
                  />
                </svg>
              )}
            </button>
            <div className="hidden sm:block text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              MVP Demo · snapshot
            </div>
          </div>
        </div>
      </header>

      {/* Main container */}
      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        {/* Value Prop Hero Section */}
        <section className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
            Find out what your books are worth — before you send them.
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Build your shelf list below. Get transparent price ranges, itemized
            payout calculations, and stock warnings.
          </p>
        </section>

        {/* Add Book Input Form */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:backdrop-blur-md mb-8">
          <form onSubmit={handleAddBook} className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300">
              Add Book to Estimate Shelf
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="search-query"
                  className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  ISBN or Book Title
                </label>
                <input
                  id="search-query"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g. 9788024910086 or Tajemství"
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm placeholder-zinc-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 transition-all font-medium"
                  aria-required="true"
                />
              </div>

              {/* Author (Only visible if not searching purely by ISBN) */}
              {!/^[0-9\s-]+$/.test(searchQuery.trim()) ? (
                <div>
                  <label
                    htmlFor="author-query"
                    className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1"
                  >
                    Author (Optional)
                  </label>
                  <input
                    id="author-query"
                    type="text"
                    value={authorQuery}
                    onChange={(e) => setAuthorQuery(e.target.value)}
                    placeholder="e.g. Rhonda Byrne"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2 text-sm placeholder-zinc-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 transition-all font-medium"
                  />
                </div>
              ) : (
                <div className="flex items-end text-xs text-zinc-600 dark:text-zinc-400 pb-3 font-medium">
                  ISBN detected. Title lookup bypassed.
                </div>
              )}
            </div>

            {/* Condition and Submit Action Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-condition"
                  className="block text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Condition
                </label>
                <select
                  id="form-condition"
                  value={formCondition}
                  onChange={(e) =>
                    setFormCondition(
                      e.target.value as "new" | "verygood" | "good" | "worn"
                    )
                  }
                  className="w-full h-[38px] rounded-lg border border-zinc-200 bg-zinc-50/50 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20 transition-all font-medium text-zinc-800 dark:text-zinc-200"
                >
                  <option value="new">Like New / Unread (1.2×)</option>
                  <option value="verygood">Very Good (1.1×)</option>
                  <option value="good">Good / Standard (1.0×)</option>
                  <option value="worn">Worn / Damaged (0.7×)</option>
                </select>
              </div>

              <div className="flex items-end">
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="default"
                  size="default"
                  className="w-full h-[38px] bg-brand text-brand-foreground hover:bg-brand/95 font-semibold text-sm transition-all focus-visible:ring-2 focus-visible:ring-brand/50 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-600 cursor-pointer"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg
                        className="animate-spin h-3.5 w-3.5 text-white"
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
                      Adding to Shelf...
                    </span>
                  ) : (
                    "Add to Estimate Shelf"
                  )}
                </Button>
              </div>
            </div>

            {formError && (
              <p
                className="text-red-500 text-xs font-semibold mt-2"
                role="alert"
              >
                {formError}
              </p>
            )}
          </form>
        </section>

        {/* Shelf display */}
        <section aria-live="polite">
          {shelf.length === 0 ? (
            /* Empty Shelf State [N3] */
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center text-zinc-600 dark:text-zinc-400">
              <svg
                className="h-10 w-10 mx-auto text-zinc-500 dark:text-zinc-600 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
              <h3 className="font-bold text-sm text-zinc-700 dark:text-zinc-300">
                Your shelf is empty
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                Search and add books above to estimate your shipment value.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ---------------------------------------------------- */}
              {/* Aggregate Headline Card (Shipment Value Summary)     */}
              {/* ---------------------------------------------------- */}
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 border-l-4 border-l-brand dark:border-l-emerald-600">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                      Shipment Estimate Summary
                    </h2>
                    {/* Headline Scope (N2) */}
                    <p className="text-sm font-semibold mt-1 text-zinc-700 dark:text-zinc-300">
                      Sending{" "}
                      <strong className="text-brand dark:text-emerald-400 font-bold">
                        {sendBucket.length}
                      </strong>{" "}
                      of{" "}
                      <strong className="font-semibold text-zinc-950 dark:text-white">
                        {shelf.length}
                      </strong>{" "}
                      {shelf.length === 1 ? "book" : "books"} on your shelf
                    </p>
                    <p className="mt-3 text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
                      {totalPayoutMin}–{totalPayoutMax} CZK
                    </p>
                    <p className="text-[10px] text-zinc-600 dark:text-zinc-400 mt-1">
                      Estimated payout sum of the shipment bucket.
                    </p>
                  </div>

                  {/* Split CTA buttons (B1) */}
                  <div className="flex flex-col gap-2 shrink-0">
                    <a
                      href="https://knihobot.cz/prodej-knih"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center justify-center rounded-lg bg-brand px-4 text-xs font-bold text-brand-foreground hover:bg-brand/95 transition-all text-center focus-visible:ring-2 focus-visible:ring-brand/50 dark:bg-emerald-700 dark:hover:bg-emerald-600 cursor-pointer"
                    >
                      Send {sendBucket.length}{" "}
                      {sendBucket.length === 1 ? "book" : "books"} to Knihobot
                    </a>
                    {keepDonateBucket.length > 0 && (
                      <div className="text-center text-[10px] text-zinc-600 dark:text-zinc-400 font-medium">
                        {keepDonateBucket.length} kept/donated locally
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* Split Buckets: 1. Shipment List (Send Bucket)        */}
              {/* ---------------------------------------------------- */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-3 px-1 flex items-center justify-between">
                  <span>
                    Shipment List ({sendBucket.length}{" "}
                    {sendBucket.length === 1 ? "book" : "books"})
                  </span>
                  <span className="text-[10px] lowercase font-normal">
                    Included in payout
                  </span>
                </h3>

                {sendBucket.length === 0 ? (
                  <div className="rounded-xl border border-zinc-200 border-dashed p-6 text-center text-xs text-zinc-600 dark:border-zinc-400 dark:border-zinc-800">
                    No books in shipment list. Adjust agency choices below to
                    include them.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sendBucket.map((item) => (
                      <div
                        key={item.id}
                        className="relative rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/40"
                      >
                        {item.isUpdating && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
                            <svg
                              className="animate-spin h-6 w-6 text-brand dark:text-emerald-500"
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
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-sm text-zinc-950 dark:text-white leading-tight">
                              {item.comparables[0]?.title || item.query.title}
                            </h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                              by{" "}
                              {item.comparables[0]?.author ||
                                item.query.author ||
                                "Unknown"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Stock warning badge remains visible on shelf item (N1) */}
                            {item.estimation.demandStatus === "high" && (
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                low stock ({item.estimation.activeCopies})
                              </span>
                            )}
                            {item.estimation.demandStatus === "moderate" && (
                              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                supply: {item.estimation.activeCopies}
                              </span>
                            )}
                            {item.estimation.demandStatus ===
                              "oversupplied" && (
                              <span
                                className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-400"
                                title="Knihobot already has many active copies. May be declined or donated."
                              >
                                oversupplied ({item.estimation.activeCopies}) ⚠️
                              </span>
                            )}

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveBook(item.id)}
                              aria-label="Remove book"
                              className="text-zinc-500 hover:text-red-500 dark:text-zinc-400 p-1 rounded-md transition-colors cursor-pointer"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Interactive fields row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/50 text-xs">
                          {/* Inline condition selector (re-triggers action) */}
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`condition-${item.id}`}
                              className="text-zinc-600 dark:text-zinc-400 font-semibold"
                            >
                              Condition:
                            </label>
                            <select
                              id={`condition-${item.id}`}
                              value={item.condition}
                              onChange={(e) =>
                                handleItemConditionChange(
                                  item.id,
                                  e.target.value as
                                    | "new"
                                    | "verygood"
                                    | "good"
                                    | "worn"
                                )
                              }
                              className="rounded border border-zinc-200 bg-zinc-50/50 px-1.5 py-0.5 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-900 font-medium text-zinc-800 dark:text-zinc-200"
                            >
                              <option value="new">Like New (1.2x)</option>
                              <option value="verygood">Very Good (1.1x)</option>
                              <option value="good">Good (1.0x)</option>
                              <option value="worn">Worn (0.7x)</option>
                            </select>
                          </div>

                          <div className="flex flex-col text-right justify-end sm:items-end">
                            <div className="flex justify-between sm:justify-end gap-1.5">
                              <span className="text-zinc-600 dark:text-zinc-400">
                                Retail:{" "}
                              </span>
                              <strong className="font-semibold text-zinc-950 dark:text-white">
                                {item.estimation.priceMin}–
                                {item.estimation.priceMax} CZK
                              </strong>
                            </div>
                            {/* Pluralize correctly (N4) */}
                            <span className="block text-[10px] text-zinc-600 dark:text-zinc-400">
                              based on {item.estimation.comparableCount}{" "}
                              comparable{" "}
                              {item.estimation.comparableCount === 1
                                ? "copy"
                                : "copies"}
                            </span>
                            <div className="flex justify-between sm:justify-end gap-1.5 mt-1 sm:mt-0">
                              <span className="text-zinc-600 dark:text-zinc-400">
                                Payout:{" "}
                              </span>
                              <strong className="font-bold text-brand dark:text-emerald-400">
                                {item.estimation.payoutMin.payout}–
                                {item.estimation.payoutMax.payout} CZK
                              </strong>
                            </div>
                          </div>
                        </div>

                        {item.updateError && (
                          <div
                            className="mt-2 text-xs font-semibold text-red-500 bg-red-50/50 border border-red-200/50 p-2 rounded-lg dark:bg-red-950/10 dark:border-red-900/30"
                            role="alert"
                          >
                            {item.updateError}
                          </div>
                        )}

                        {/* Inline handlers for sub-threshold and normal/oversupplied books */}
                        {renderAgencySelector(item)}
                        {renderNormalKeepSelector(item)}

                        {/* Math & Peek Panel expandables */}
                        {renderExpandables(item)}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ---------------------------------------------------- */}
              {/* Split Buckets: 2. Kept or Donated (Local Handling)   */}
              {/* ---------------------------------------------------- */}
              {keepDonateBucket.length > 0 && (
                <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 mb-3 px-1 flex items-center justify-between">
                    <span>
                      Better Kept or Donated ({keepDonateBucket.length}{" "}
                      {keepDonateBucket.length === 1 ? "book" : "books"})
                    </span>
                    <span className="text-[10px] lowercase font-normal">
                      Excluded from shipment
                    </span>
                  </h3>

                  <div className="p-4 rounded-xl bg-zinc-100/40 border border-zinc-200/50 dark:bg-zinc-900/10 dark:border-zinc-800/80 mb-4 text-xs text-zinc-600 dark:text-zinc-400 leading-normal">
                    <strong>Why these are excluded:</strong> These books are
                    estimated below the earning threshold (resulting in a 0 CZK
                    payout), or have a high oversupply warning and you decided
                    to keep them locally to avoid potential decline or donation
                    fees.
                  </div>

                  <div className="space-y-4">
                    {keepDonateBucket.map((item) => (
                      <div
                        key={item.id}
                        className="relative rounded-xl border border-zinc-200 bg-zinc-100/50 p-5 dark:border-zinc-800/50 dark:bg-zinc-900/10"
                      >
                        {item.isUpdating && (
                          <div className="absolute inset-0 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xs flex items-center justify-center z-10 rounded-xl">
                            <svg
                              className="animate-spin h-6 w-6 text-brand dark:text-emerald-500"
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
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-sm text-zinc-600 dark:text-zinc-300 leading-tight">
                              {item.comparables[0]?.title || item.query.title}
                            </h4>
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                              by{" "}
                              {item.comparables[0]?.author ||
                                item.query.author ||
                                "Unknown"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Demand badge (Suppressed entirely if hasEstimate is false - P3/N3) */}
                            {item.estimation.hasEstimate && (
                              <>
                                {item.estimation.demandStatus === "high" && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    low stock ({item.estimation.activeCopies})
                                  </span>
                                )}
                                {item.estimation.demandStatus ===
                                  "moderate" && (
                                  <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    supply: {item.estimation.activeCopies}
                                  </span>
                                )}
                                {item.estimation.demandStatus ===
                                  "oversupplied" && (
                                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/50 dark:text-amber-400">
                                    oversupplied ({item.estimation.activeCopies}
                                    ) ⚠️
                                  </span>
                                )}
                              </>
                            )}

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveBook(item.id)}
                              aria-label="Remove book"
                              className="text-zinc-500 hover:text-red-500 dark:text-zinc-400 p-1 rounded-md transition-colors cursor-pointer"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Interactive fields row */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-zinc-200/40 dark:border-zinc-800/40 text-xs">
                          {/* Inline condition selector (re-triggers action) */}
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`condition-${item.id}`}
                              className="text-zinc-600 dark:text-zinc-400 font-semibold"
                            >
                              Condition:
                            </label>
                            <select
                              id={`condition-${item.id}`}
                              value={item.condition}
                              onChange={(e) =>
                                handleItemConditionChange(
                                  item.id,
                                  e.target.value as
                                    | "new"
                                    | "verygood"
                                    | "good"
                                    | "worn"
                                )
                              }
                              className="rounded border border-zinc-200 bg-zinc-50/50 px-1.5 py-0.5 text-xs outline-none dark:border-zinc-800 dark:bg-zinc-950 font-medium text-zinc-800 dark:text-zinc-200"
                            >
                              <option value="new">Like New (1.2×)</option>
                              <option value="verygood">Very Good (1.1×)</option>
                              <option value="good">Good (1.0×)</option>
                              <option value="worn">Worn (0.7×)</option>
                            </select>
                          </div>

                          <div className="flex flex-col text-right justify-end sm:items-end">
                            {item.estimation.hasEstimate ? (
                              <>
                                <div className="flex justify-between sm:justify-end gap-1.5">
                                  <span className="text-zinc-600 dark:text-zinc-400">
                                    Retail:{" "}
                                  </span>
                                  <strong className="font-semibold text-zinc-950 dark:text-white">
                                    {item.estimation.priceMin}–
                                    {item.estimation.priceMax} CZK
                                  </strong>
                                </div>
                                <span className="block text-[10px] text-zinc-600 dark:text-zinc-400">
                                  based on {item.estimation.comparableCount}{" "}
                                  comparable{" "}
                                  {item.estimation.comparableCount === 1
                                    ? "copy"
                                    : "copies"}
                                </span>
                                <div className="flex justify-between sm:justify-end gap-1.5 mt-1 sm:mt-0">
                                  <span className="text-amber-800 dark:text-amber-400 font-bold">
                                    Below limit
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div>
                                <span className="text-zinc-600 dark:text-zinc-400 font-semibold italic">
                                  No comparables available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.updateError && (
                          <div
                            className="mt-2 text-xs font-semibold text-red-500 bg-red-50/50 border border-red-200/50 p-2 rounded-lg dark:bg-red-950/10 dark:border-red-900/30"
                            role="alert"
                          >
                            {item.updateError}
                          </div>
                        )}

                        {/* Inline handlers for sub-threshold and normal/oversupplied books */}
                        {renderAgencySelector(item)}
                        {renderNormalKeepSelector(item)}

                        {/* No-data honest context card (B1 resolved) */}
                        {!item.estimation.hasEstimate && (
                          <div className="mt-4 p-4 rounded-lg border border-zinc-200 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-950/20 space-y-2">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                              General Used Book Reference Context
                            </h5>
                            <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-normal">
                              We have no comparables for this title in our
                              snapshot. For context, typical used books on
                              Knihobot list for **{item.referenceStats.p25Price}
                              –{item.referenceStats.p75Price} CZK** (typical
                              payout **{item.referenceStats.p25Payout}–
                              {item.referenceStats.p75Payout} CZK**). Your
                              book&apos;s actual value may differ.
                            </p>
                          </div>
                        )}

                        {/* Math & Peek Panel expandables */}
                        {renderExpandables(item)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );

  // Helper to render math and comparables expandables on each card
  function renderExpandables(item: ShelfItem) {
    if (!item.estimation.hasEstimate) return null;
    const isPeekOpen = !!expandedPeeks[item.id];

    return (
      <div className="mt-3 border-t border-zinc-100 dark:border-zinc-800/50 pt-2 flex flex-col gap-2">
        {/* Math explanation (Principle 2) */}
        <details className="group/details text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
          <summary className="cursor-pointer select-none py-1 hover:text-zinc-800 dark:hover:text-zinc-200 list-none flex items-center gap-1 outline-none">
            <svg
              className="h-3 w-3 transition-transform group-open/details:rotate-90 text-zinc-500 dark:text-zinc-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Show payout math breakdown</span>
          </summary>
          <div className="mt-2 p-3 rounded-lg border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800/50 dark:bg-zinc-900/20 space-y-2">
            <div className="flex justify-between">
              <span>Min Estimate Math:</span>
              <span>
                {item.estimation.payoutMin.isBelowThreshold ? (
                  <span className="text-amber-800 dark:text-amber-400 font-semibold">
                    Below threshold (50 CZK) → 0 CZK payout
                  </span>
                ) : (
                  <span>
                    {item.estimation.payoutMin.listPrice} CZK ×{" "}
                    {item.estimation.payoutMin.sellerSharePercent * 100}% (
                    {item.estimation.payoutMin.sellerShareAmount} CZK) −{" "}
                    {item.estimation.payoutMin.fixedFee} CZK fee ={" "}
                    <strong>
                      {item.estimation.payoutMin.payout} CZK payout
                    </strong>
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Max Estimate Math:</span>
              <span>
                {item.estimation.payoutMax.isBelowThreshold ? (
                  <span className="text-amber-800 dark:text-amber-400 font-semibold">
                    Below threshold (50 CZK) → 0 CZK payout
                  </span>
                ) : (
                  <span>
                    {item.estimation.payoutMax.listPrice} CZK ×{" "}
                    {item.estimation.payoutMax.sellerSharePercent * 100}% (
                    {item.estimation.payoutMax.sellerShareAmount} CZK) −{" "}
                    {item.estimation.payoutMax.fixedFee} CZK fee ={" "}
                    <strong>
                      {item.estimation.payoutMax.payout} CZK payout
                    </strong>
                  </span>
                )}
              </span>
            </div>
          </div>
        </details>

        {/* Comparables Peek panel (Principle 1) */}
        <div>
          <button
            type="button"
            aria-expanded={isPeekOpen}
            aria-controls={`peek-${item.id}`}
            onClick={() => togglePeek(item.id)}
            className="flex items-center gap-1 py-1 hover:text-zinc-800 dark:hover:text-zinc-200 text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 outline-none transition-colors cursor-pointer"
          >
            <svg
              className={`h-3 w-3 transform transition-transform duration-200 ${isPeekOpen ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Peek at comparables ({item.estimation.comparableCount})</span>
          </button>

          {isPeekOpen && (
            <div
              id={`peek-${item.id}`}
              className="mt-2 rounded-lg border border-zinc-200 overflow-hidden dark:border-zinc-800"
            >
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead className="bg-zinc-50 text-zinc-600 dark:text-zinc-400 font-semibold sticky top-0 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <tr>
                      <th className="p-2">Condition</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-right">Stock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50 dark:bg-zinc-900/10">
                    {item.comparables.slice(0, 20).map((comp, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20"
                      >
                        <td className="p-2 capitalize font-mono text-[9px]">
                          {comp.condition}
                        </td>
                        <td className="p-2 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {comp.listPriceCzk} CZK
                        </td>
                        <td className="p-2 text-right text-zinc-600 dark:text-zinc-400">
                          {comp.activeCopies}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {item.comparables.length > 20 && (
                <div className="bg-zinc-50 border-t border-zinc-200 p-2 text-center text-[9px] text-zinc-600 dark:text-zinc-400 font-medium dark:bg-zinc-900 dark:border-zinc-800">
                  Showing top 20 of {item.comparables.length} comparables.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
