"use client";

import React, { useState, useTransition, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { getBookEstimate, EstimateResponse } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import Header from "@/components/header";
import { addShipment } from "@/lib/seller-repository";
import { useLanguage } from "@/components/language-provider";

const BarcodeScanner = dynamic(() => import("@/components/barcode-scanner"), {
  ssr: false,
});

const SpineScanner = dynamic(() => import("@/components/spine-scanner"), {
  ssr: false,
});

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
  const { t, language } = useLanguage();

  // Barcode scanner states
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Spine AI scanner states
  const [isSpineScannerOpen, setIsSpineScannerOpen] = useState(false);

  // Checkout modal states
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const router = useRouter();

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
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const [expandedPeeks, setExpandedPeeks] = useState<Record<string, boolean>>(
    {}
  );

  // Core function to fetch estimation, track analytics, and add item to shelf
  const addBookToShelf = async (
    queryStr: string,
    authorVal: string | undefined,
    conditionVal: "new" | "verygood" | "good" | "worn",
    source: "manual" | "scan" | "spine"
  ): Promise<{
    success: boolean;
    title?: string;
    payoutMin?: number;
    payoutMax?: number;
    isNoComparables?: boolean;
    error?: string;
  }> => {
    // Detect ISBN by length (10 or 13 normalized digits) to allow numeric titles like "1984" - N5
    const normalizedDigits = queryStr.replace(/[\s-]/g, "");
    const isIsbn =
      /^[0-9]{9}[0-9Xx]$/.test(normalizedDigits) ||
      /^[0-9]{13}$/.test(normalizedDigits);
    const queryParams = isIsbn
      ? { isbn: queryStr }
      : { title: queryStr, author: authorVal ? authorVal.trim() : undefined };

    const response = await getBookEstimate(queryParams, conditionVal);

    // Track analytics event with source attribution
    trackEvent("book_added", {
      query: queryStr,
      is_isbn: isIsbn,
      isbn: queryParams.isbn || undefined,
      title: queryParams.title || undefined,
      author: queryParams.author || undefined,
      condition: conditionVal,
      has_estimate: response.estimation.hasEstimate,
      payout_min: response.estimation.payoutMin.payout,
      payout_max: response.estimation.payoutMax.payout,
      demand_status: response.estimation.demandStatus,
      source,
    });

    // Determine default agency options: sub-threshold books default to "keep", normal/oversupplied default to "send"
    const isBelowThreshold = response.estimation.payoutMedian.isBelowThreshold;
    const defaultAgency = isBelowThreshold ? "keep" : "send";

    const newShelfItem: ShelfItem = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      query: queryParams,
      estimation: response.estimation,
      comparables: response.comparables,
      referenceStats: response.referenceStats,
      condition: conditionVal,
      agencySelection: defaultAgency,
      isOversuppliedKept: false,
      isUpdating: false,
      updateError: null,
    };

    setShelf((prev) => [newShelfItem, ...prev]);

    return {
      success: true,
      title: response.comparables[0]?.title,
      payoutMin: response.estimation.payoutMin.payout,
      payoutMax: response.estimation.payoutMax.payout,
      isNoComparables: !response.estimation.hasEstimate,
    };
  };

  // Add book to shelf manually
  const handleAddBook = (e: React.FormEvent) => {
    e.preventDefault();
    const queryStr = searchQuery.trim();
    if (!queryStr) {
      setFormError(t("form_error_empty"));
      return;
    }
    setFormError(null);

    startTransition(async () => {
      try {
        await addBookToShelf(queryStr, authorQuery, formCondition, "manual");
        setSearchQuery("");
        setAuthorQuery("");
      } catch (err) {
        setFormError(t("form_error_fetch_failed"));
        console.error(err);
      }
    });
  };

  // Demo autofill helper
  const handleQuickFill = (isbn: string, author: string) => {
    setSearchQuery(isbn);
    setAuthorQuery(author);
    setFormCondition("good");
  };

  // Open barcode scanner modal (initializing audio context on click gesture)
  const handleOpenScanner = () => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        audioContextRef.current = new AudioContextClass();
      }
    }
    if (
      audioContextRef.current &&
      audioContextRef.current.state === "suspended"
    ) {
      audioContextRef.current.resume();
    }
    setIsScannerOpen(true);
    trackEvent("scanner_opened", { condition: formCondition });
  };

  // Barcode scanner scan callback
  const handleBarcodeScan = async (isbn: string) => {
    try {
      const result = await addBookToShelf(
        isbn,
        undefined,
        formCondition,
        "scan"
      );
      return result;
    } catch (err) {
      console.error("Barcode scan lookup error:", err);
      return {
        success: false,
        error: t("form_error_fetch_failed"),
      };
    }
  };

  // Batch add books scanned via spine AI vision (N6)
  const handleSpineScanBatchAdd = async (
    books: { title: string; author: string }[]
  ) => {
    // Loop and add books one by one reusing the shared logic
    for (const book of books) {
      try {
        await addBookToShelf(book.title, book.author, formCondition, "spine");
      } catch (err) {
        console.error(
          "Error adding batch item from spine scan:",
          book.title,
          err
        );
      }
    }
  };

  const handleSimulateCheckout = () => {
    // 1. Prepare items to submit
    const itemsToSubmit = sendBucket.map((item) => ({
      title:
        item.comparables[0]?.title ||
        item.query.title ||
        item.query.isbn ||
        "Unknown Title",
      author:
        item.comparables[0]?.author || item.query.author || "Unknown Author",
      isbn: item.query.isbn,
      condition: item.condition,
      payoutCzk: item.estimation.payoutMedian.payout,
    }));

    // 2. Add shipment to local storage database
    addShipment(itemsToSubmit, totalPayoutMin, totalPayoutMax);

    // 3. Track event
    trackEvent("shipment_submitted_demo", {
      book_count: sendBucket.length,
      payout_min: totalPayoutMin,
      payout_max: totalPayoutMax,
    });

    // 4. Clear Estimator shelf and close modal
    setShelf([]);
    setIsCheckoutModalOpen(false);

    // 5. Navigate to dashboard page
    router.push("/dashboard");
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
      <div className="mt-4 rounded-input border border-amber/40 bg-amber-bg p-3 text-xs">
        <fieldset className="space-y-2">
          <legend className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-amber">
            {t("agency_threshold_legend")}
          </legend>
          <div className="space-y-1">
            <label className="flex cursor-pointer items-start gap-2.5 rounded py-1 hover:bg-surface-2">
              <input
                type="radio"
                name={`agency-${item.id}`}
                value="keep"
                checked={item.agencySelection === "keep"}
                onChange={() => handleItemAgencyChange(item.id, "keep")}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-green-600"
              />
              <span>
                <strong className="font-bold text-ink">
                  {t("agency_choice_keep_label")}
                </strong>
                {t("agency_choice_keep_desc")}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded py-1 hover:bg-surface-2">
              <input
                type="radio"
                name={`agency-${item.id}`}
                value="donate"
                checked={item.agencySelection === "donate"}
                onChange={() => handleItemAgencyChange(item.id, "donate")}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-green-600"
              />
              <span>
                <strong className="font-bold text-ink">
                  {t("agency_choice_donate_label")}
                </strong>
                {t("agency_choice_donate_desc")}
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2.5 rounded py-1 hover:bg-surface-2">
              <input
                type="radio"
                name={`agency-${item.id}`}
                value="send"
                checked={item.agencySelection === "send"}
                onChange={() => handleItemAgencyChange(item.id, "send")}
                className="mt-0.5 h-3.5 w-3.5 cursor-pointer accent-green-600"
              />
              <span>
                <strong className="font-bold text-ink">
                  {t("agency_choice_send_label")}
                </strong>
                {t("agency_choice_send_desc")}
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
        className={`mt-3 flex items-center justify-between rounded-input p-2 text-xs ${
          isOversupplied
            ? "border border-amber/30 bg-amber-bg text-amber"
            : "bg-surface-2 text-ink-soft"
        }`}
      >
        <span>
          {isOversupplied
            ? t("agency_oversupply_keep_prompt")
            : t("agency_normal_keep_prompt")}
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
            className="h-3.5 w-3.5 cursor-pointer rounded accent-green-600"
          />
          <span className="font-bold uppercase tracking-wider text-[10px]">
            {t("agency_keep_checkbox_label")}
          </span>
        </label>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans transition-colors duration-200">
      {/* Header bar */}
      <Header />

      {/* Main container */}
      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {/* Value Prop Hero Section */}
        <section className="mb-10">
          <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-balance text-ink sm:text-5xl">
            {t("main_title")}
          </h1>
          <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-ink-soft sm:text-lg">
            {t("main_description")}
          </p>
        </section>

        {/* Add Book Input Form — "library slip" */}
        <section className="mb-10">
          <h2 className="mb-3.5 font-serif text-xl font-semibold text-ink">
            {t("form_add_title")}
          </h2>
          <div className="overflow-hidden rounded-card border border-line-strong bg-surface shadow-paper">
            {/* Decorative library-tape strip */}
            <div
              className="h-1.5"
              style={{
                background:
                  "repeating-linear-gradient(90deg,var(--green-600) 0 22px,transparent 22px 30px)",
              }}
            />
            <form onSubmit={handleAddBook} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-[2fr_1.3fr_1.5fr_auto_auto] sm:items-end">
                {/* Title or ISBN */}
                <div className="relative">
                  <label
                    htmlFor="search-query"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
                  >
                    {t("form_label_isbn")}
                  </label>
                  <input
                    id="search-query"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsSearchFocused(true)}
                    onBlur={() =>
                      setTimeout(() => setIsSearchFocused(false), 200)
                    }
                    placeholder={t("form_placeholder_isbn")}
                    className="w-full min-w-0 border-0 border-b-[1.5px] border-line-strong bg-transparent px-0.5 py-2 text-sm font-medium text-ink placeholder-ink-faint outline-none transition-colors focus:border-green-600"
                    aria-required="true"
                  />
                  {isSearchFocused && !searchQuery.trim() && (
                    <div className="absolute left-0 right-0 z-50 mt-1 rounded-md border border-line bg-surface p-2 shadow-paper">
                      <p className="mb-1.5 px-1.5 text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                        {t("form_demo_help_title")}
                      </p>
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickFill("9788076111226", "Patrik Hartl")
                          }
                          className="flex cursor-pointer items-center justify-between rounded p-1.5 text-left text-xs text-ink-soft hover:bg-surface-2 transition-all"
                        >
                          <span>{t("form_demo_book_high")}</span>
                          <span className="rounded-full bg-green-bg px-1.5 py-0.5 text-[9px] font-bold text-green-700">
                            {t("form_demo_book_high_badge")}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickFill("9788024928609", "Paula Hawkins")
                          }
                          className="flex cursor-pointer items-center justify-between rounded p-1.5 text-left text-xs text-ink-soft hover:bg-surface-2 transition-all"
                        >
                          <span>{t("form_demo_book_over")}</span>
                          <span className="rounded-full bg-amber-bg px-1.5 py-0.5 text-[9px] font-bold text-amber">
                            {t("form_demo_book_over_badge")}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickFill("9788072273201", "Evžen Boček")
                          }
                          className="flex cursor-pointer items-center justify-between rounded p-1.5 text-left text-xs text-ink-soft hover:bg-surface-2 transition-all"
                        >
                          <span>{t("form_demo_book_low")}</span>
                          <span className="rounded-full bg-red-bg px-1.5 py-0.5 text-[9px] font-bold text-red">
                            {t("form_demo_book_low_badge")}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Author (Only visible if not searching purely by ISBN) */}
                {!/^[0-9\s-]+$/.test(searchQuery.trim()) ? (
                  <div>
                    <label
                      htmlFor="author-query"
                      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
                    >
                      {t("form_label_author")}
                    </label>
                    <input
                      id="author-query"
                      type="text"
                      value={authorQuery}
                      onChange={(e) => setAuthorQuery(e.target.value)}
                      placeholder={t("form_placeholder_author")}
                      className="w-full border-0 border-b-[1.5px] border-line-strong bg-transparent px-0.5 py-2 text-sm font-medium text-ink placeholder-ink-faint outline-none transition-colors focus:border-green-600"
                    />
                  </div>
                ) : (
                  <div className="flex items-end pb-2 text-xs font-medium text-ink-soft">
                    {t("form_isbn_detected")}
                  </div>
                )}

                {/* Condition */}
                <div>
                  <label
                    htmlFor="form-condition"
                    className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-ink-faint"
                  >
                    {t("form_label_condition")}
                  </label>
                  <select
                    id="form-condition"
                    value={formCondition}
                    onChange={(e) =>
                      setFormCondition(
                        e.target.value as "new" | "verygood" | "good" | "worn"
                      )
                    }
                    className="h-[38px] w-full cursor-pointer border-0 border-b-[1.5px] border-line-strong bg-transparent px-0.5 py-1 text-sm font-medium text-ink outline-none transition-colors focus:border-green-600"
                  >
                    <option value="new">
                      {t("form_condition_new_option")}
                    </option>
                    <option value="verygood">
                      {t("form_condition_verygood_option")}
                    </option>
                    <option value="good">
                      {t("form_condition_good_option")}
                    </option>
                    <option value="worn">
                      {t("form_condition_worn_option")}
                    </option>
                  </select>
                </div>

                {/* Scan barcode */}
                <Button
                  type="button"
                  onClick={handleOpenScanner}
                  variant="outline"
                  title={t("form_btn_scan_barcode")}
                  className="flex h-auto w-full cursor-pointer flex-col items-center gap-1.5 rounded-input border-line bg-surface-2 px-3.5 py-2.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink dark:bg-surface-2 dark:hover:bg-surface-2 sm:w-auto"
                >
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinecap="round"
                  >
                    <path d="M3 5v14M7 5v14M11 5v14M14 5v14M18 5v14M21 5v14" />
                  </svg>
                  {t("form_btn_scan_barcode_short")}
                </Button>

                {/* Scan spines (AI) */}
                <Button
                  type="button"
                  onClick={() => {
                    setIsSpineScannerOpen(true);
                    trackEvent("spine_scanner_opened", {
                      condition: formCondition,
                    });
                  }}
                  variant="outline"
                  title={t("form_btn_scan_spine")}
                  className="relative flex h-auto w-full cursor-pointer flex-col items-center gap-1.5 rounded-input border-line bg-surface-2 px-3.5 py-2.5 text-[11px] font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink dark:bg-surface-2 dark:hover:bg-surface-2 sm:w-auto"
                >
                  <span className="absolute -right-1.5 -top-2 rounded-full bg-green-600 px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-on-green">
                    {t("form_btn_beta")}
                  </span>
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="14" height="16" rx="1.5" />
                    <path d="M7 4v16M21 7v13a1 1 0 0 1-1 1h-3" />
                  </svg>
                  {t("form_btn_scan_spine_short")}
                </Button>
              </div>

              {/* Submit Action Row */}
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={isPending}
                  variant="default"
                  size="default"
                  className="h-[42px] w-full cursor-pointer rounded-full bg-green-600 px-7 text-on-green text-sm font-bold transition-all hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-600/40 disabled:opacity-50 sm:w-auto"
                >
                  {isPending ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg
                        className="animate-spin h-3.5 w-3.5 text-on-green"
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
                      {t("form_btn_adding")}
                    </span>
                  ) : (
                    t("form_btn_add")
                  )}
                </Button>
              </div>

              {formError && (
                <p className="mt-2 text-xs font-semibold text-red" role="alert">
                  {formError}
                </p>
              )}
            </form>
          </div>
        </section>

        {/* Shelf display */}
        <section aria-live="polite">
          {shelf.length === 0 ? (
            /* Empty Shelf State [N3] */
            <div className="rounded-card border border-dashed border-line-strong p-12 text-center text-ink-soft">
              <svg
                className="mx-auto mb-3 h-10 w-10 text-ink-faint"
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
              <h3 className="font-serif text-base font-semibold text-ink">
                {t("shelf_empty")}
              </h3>
              <p className="mx-auto mt-1 max-w-xs text-xs text-ink-soft">
                {t("shelf_empty_desc")}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ---------------------------------------------------- */}
              {/* Aggregate Headline Card (Shipment Value Summary)     */}
              {/* ---------------------------------------------------- */}
              <div className="rounded-card border-[1.5px] border-green-600 bg-green-bg p-6 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-green-700">
                      {t("shelf_summary_title")}
                    </h2>
                    {/* Headline Scope (N2) */}
                    <p className="mt-1.5 text-sm font-medium text-ink">
                      {language === "cs" ? (
                        <>
                          Odesíláte{" "}
                          <strong className="font-bold text-green-700">
                            {sendBucket.length}
                          </strong>{" "}
                          z{" "}
                          <strong className="font-semibold text-ink">
                            {shelf.length}
                          </strong>{" "}
                          {shelf.length === 1 ? "knihy" : "knih"} na vaší polici
                        </>
                      ) : (
                        <>
                          Sending{" "}
                          <strong className="font-bold text-green-700">
                            {sendBucket.length}
                          </strong>{" "}
                          of{" "}
                          <strong className="font-semibold text-ink">
                            {shelf.length}
                          </strong>{" "}
                          {shelf.length === 1 ? "book" : "books"} on your shelf
                        </>
                      )}
                    </p>
                    <p className="num mt-3 font-serif text-4xl font-bold tracking-tight text-green-700">
                      {totalPayoutMin}–{totalPayoutMax} {t("currency")}
                    </p>
                    <p className="mt-1 text-[11px] text-ink-soft">
                      {t("shelf_total_range_desc")}
                    </p>
                  </div>

                  {/* Split CTA buttons (B1) */}
                  <div className="flex shrink-0 flex-col gap-2">
                    <Button
                      onClick={() => setIsCheckoutModalOpen(true)}
                      className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-green-600 px-6 text-center text-sm font-bold text-on-green transition-all hover:bg-green-700 focus-visible:ring-2 focus-visible:ring-green-600/40"
                    >
                      {t("shelf_btn_send", { count: sendBucket.length })}
                    </Button>
                    {keepDonateBucket.length > 0 && (
                      <div className="text-center text-[11px] font-medium text-ink-soft">
                        {t("shelf_kept_locally", {
                          count: keepDonateBucket.length,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ---------------------------------------------------- */}
              {/* Split Buckets: 1. Shipment List (Send Bucket)        */}
              {/* ---------------------------------------------------- */}
              <div>
                <h3 className="mb-3 flex items-center justify-between px-1">
                  <span className="font-serif text-base font-semibold text-green-700">
                    {t("shelf_shipment_list_title", {
                      count: sendBucket.length,
                    })}
                  </span>
                  <span className="text-[11px] font-normal lowercase text-ink-faint">
                    {t("shelf_shipment_list_desc")}
                  </span>
                </h3>

                {sendBucket.length === 0 ? (
                  <div className="rounded-card border border-dashed border-line-strong p-6 text-center text-xs text-ink-soft">
                    {t("shelf_shipment_empty")}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sendBucket.map((item) => (
                      <div
                        key={item.id}
                        className="relative overflow-hidden rounded-card border border-line bg-surface p-5 shadow-paper"
                      >
                        {item.isUpdating && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-surface/70 backdrop-blur-xs">
                            <svg
                              className="animate-spin h-6 w-6 text-green-600"
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
                            <h4 className="font-serif text-lg font-semibold leading-snug text-ink">
                              {item.comparables[0]?.title || item.query.title}
                            </h4>
                            <p className="mt-0.5 text-sm text-ink-soft">
                              {t("card_by_author")}
                              {item.comparables[0]?.author ||
                                item.query.author ||
                                "Unknown"}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Stock warning badge remains visible on shelf item (N1) */}
                            {item.estimation.demandStatus === "high" && (
                              <span className="inline-flex items-center rounded-full bg-green-bg px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                {t("demand_badge_low_stock", {
                                  count: item.estimation.activeCopies,
                                })}
                              </span>
                            )}
                            {item.estimation.demandStatus === "moderate" && (
                              <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                                {t("demand_badge_supply", {
                                  count: item.estimation.activeCopies,
                                })}
                              </span>
                            )}
                            {item.estimation.demandStatus ===
                              "oversupplied" && (
                              <span
                                className="inline-flex items-center rounded-full bg-amber-bg px-2 py-0.5 text-[10px] font-semibold text-amber"
                                title={t("demand_badge_oversupplied_title")}
                              >
                                {t("demand_badge_oversupplied", {
                                  count: item.estimation.activeCopies,
                                })}
                              </span>
                            )}

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveBook(item.id)}
                              aria-label="Remove book"
                              className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors hover:text-red"
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
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-line pt-3 text-xs sm:grid-cols-2">
                          {/* Inline condition selector (re-triggers action) */}
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`condition-${item.id}`}
                              className="font-semibold text-ink-soft"
                            >
                              {t("form_label_condition")}:
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
                              className="rounded-input border border-line bg-surface-2 px-1.5 py-0.5 text-xs font-medium text-ink outline-none"
                            >
                              <option value="new">
                                {t("card_condition_new_option")}
                              </option>
                              <option value="verygood">
                                {t("card_condition_verygood_option")}
                              </option>
                              <option value="good">
                                {t("card_condition_good_option")}
                              </option>
                              <option value="worn">
                                {t("card_condition_worn_option")}
                              </option>
                            </select>
                          </div>

                          <div className="flex flex-col justify-end text-right sm:items-end">
                            <div className="flex justify-between gap-1.5 sm:justify-end">
                              <span className="text-ink-soft">
                                {t("card_retail_label")}{" "}
                              </span>
                              <strong className="num font-semibold text-ink">
                                {item.estimation.priceMin}–
                                {item.estimation.priceMax} {t("currency")}
                              </strong>
                            </div>
                            {/* Pluralize correctly (N4) */}
                            <span className="block text-[10px] text-ink-faint">
                              {t("card_based_on_comparables", {
                                count: item.estimation.comparableCount,
                              })}
                            </span>
                            <div className="mt-1 flex justify-between gap-1.5 sm:mt-0 sm:justify-end">
                              <span className="text-ink-soft">
                                {t("card_payout_label")}{" "}
                              </span>
                              <strong className="num font-bold text-green-700">
                                {item.estimation.payoutMin.payout}–
                                {item.estimation.payoutMax.payout}{" "}
                                {t("currency")}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {item.updateError && (
                          <div
                            className="mt-2 rounded-input border border-red/30 bg-red-bg p-2 text-xs font-semibold text-red"
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
                <div className="border-t border-line pt-4">
                  <h3 className="mb-3 flex items-center justify-between px-1">
                    <span className="font-serif text-base font-semibold text-ink-soft">
                      {t("shelf_keep_donate_title_detailed", {
                        count: keepDonateBucket.length,
                      })}
                    </span>
                    <span className="text-[11px] font-normal lowercase text-ink-faint">
                      {t("shelf_keep_donate_desc_detailed")}
                    </span>
                  </h3>

                  <div className="mb-4 rounded-card border border-line bg-surface-2 p-4 text-xs leading-normal text-ink-soft">
                    <span
                      dangerouslySetInnerHTML={{
                        __html: t("shelf_keep_donate_why_excluded_html"),
                      }}
                    />
                  </div>

                  <div className="space-y-4">
                    {keepDonateBucket.map((item) => (
                      <div
                        key={item.id}
                        className="relative overflow-hidden rounded-card border border-line bg-surface-2 p-5"
                      >
                        {item.isUpdating && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-card bg-surface/70 backdrop-blur-xs">
                            <svg
                              className="animate-spin h-6 w-6 text-green-600"
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
                            <h4 className="font-serif text-lg font-semibold leading-snug text-ink-soft">
                              {item.comparables[0]?.title || item.query.title}
                            </h4>
                            <p className="mt-0.5 text-sm text-ink-soft">
                              {t("card_by_author")}
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
                                  <span className="inline-flex items-center rounded-full bg-green-bg px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                    {t("demand_badge_low_stock", {
                                      count: item.estimation.activeCopies,
                                    })}
                                  </span>
                                )}
                                {item.estimation.demandStatus ===
                                  "moderate" && (
                                  <span className="inline-flex items-center rounded-full bg-surface px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                                    {t("demand_badge_supply", {
                                      count: item.estimation.activeCopies,
                                    })}
                                  </span>
                                )}
                                {item.estimation.demandStatus ===
                                  "oversupplied" && (
                                  <span className="inline-flex items-center rounded-full bg-amber-bg px-2 py-0.5 text-[10px] font-semibold text-amber">
                                    {t("demand_badge_oversupplied", {
                                      count: item.estimation.activeCopies,
                                    })}
                                  </span>
                                )}
                              </>
                            )}

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemoveBook(item.id)}
                              aria-label="Remove book"
                              className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors hover:text-red"
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
                        <div className="mt-4 grid grid-cols-1 gap-4 border-t border-line pt-3 text-xs sm:grid-cols-2">
                          {/* Inline condition selector (re-triggers action) */}
                          <div className="flex items-center gap-2">
                            <label
                              htmlFor={`condition-${item.id}`}
                              className="font-semibold text-ink-soft"
                            >
                              {t("form_label_condition")}:
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
                              className="rounded-input border border-line bg-surface px-1.5 py-0.5 text-xs font-medium text-ink outline-none"
                            >
                              <option value="new">
                                {t("card_condition_new_option")}
                              </option>
                              <option value="verygood">
                                {t("card_condition_verygood_option")}
                              </option>
                              <option value="good">
                                {t("card_condition_good_option")}
                              </option>
                              <option value="worn">
                                {t("card_condition_worn_option")}
                              </option>
                            </select>
                          </div>

                          <div className="flex flex-col justify-end text-right sm:items-end">
                            {item.estimation.hasEstimate ? (
                              <>
                                <div className="flex justify-between gap-1.5 sm:justify-end">
                                  <span className="text-ink-soft">
                                    {t("card_retail_label")}{" "}
                                  </span>
                                  <strong className="num font-semibold text-ink">
                                    {item.estimation.priceMin}–
                                    {item.estimation.priceMax} {t("currency")}
                                  </strong>
                                </div>
                                <span className="block text-[10px] text-ink-faint">
                                  {t("card_based_on_comparables", {
                                    count: item.estimation.comparableCount,
                                  })}
                                </span>
                                <div className="mt-1 flex justify-between gap-1.5 sm:mt-0 sm:justify-end">
                                  <span className="font-bold text-amber">
                                    {t("card_below_limit_label")}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <div>
                                <span className="font-semibold italic text-ink-soft">
                                  {t("card_no_comparables_label")}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {item.updateError && (
                          <div
                            className="mt-2 rounded-input border border-red/30 bg-red-bg p-2 text-xs font-semibold text-red"
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
                          <div className="mt-4 space-y-2 rounded-input border border-line bg-surface p-4">
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
                              {t("card_no_comparables_title")}
                            </h5>
                            <p className="text-[10px] leading-normal text-ink-soft">
                              {t("card_no_comparables_text", {
                                p25Price: item.referenceStats.p25Price,
                                p75Price: item.referenceStats.p75Price,
                                p25Payout: item.referenceStats.p25Payout,
                                p75Payout: item.referenceStats.p75Payout,
                              })}
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

      {isScannerOpen && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
          audioContextRef={audioContextRef}
          condition={formCondition}
        />
      )}

      {isSpineScannerOpen && (
        <SpineScanner
          onAddBooks={handleSpineScanBatchAdd}
          onClose={() => setIsSpineScannerOpen(false)}
          condition={formCondition}
        />
      )}

      {isCheckoutModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-dialog-title"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <div className="relative flex w-full max-w-md flex-col space-y-4 overflow-hidden rounded-card border border-line bg-surface p-6 shadow-paper">
            <div className="flex justify-between items-start">
              <h3
                id="checkout-dialog-title"
                className="flex items-center gap-1.5 font-serif text-lg font-semibold text-ink"
              >
                <svg
                  className="h-5 w-5 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{t("checkout_dialog_title")}</span>
              </h3>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                aria-label="Close dialog"
                className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors hover:text-ink"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-xs leading-normal text-ink-soft">
              <p>
                <strong className="text-ink">{t("checkout_body_p1")}</strong>
              </p>
              <p>{t("checkout_body_p2")}</p>
              <p
                dangerouslySetInnerHTML={{
                  __html: t("checkout_body_p3", { count: sendBucket.length }),
                }}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <a
                href="https://knihobot.cz/prodej-knih"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsCheckoutModalOpen(false)}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full bg-green-600 px-4 text-center text-sm font-bold text-on-green transition-all hover:bg-green-700"
              >
                {t("checkout_cta_primary")}
              </a>
              <button
                onClick={handleSimulateCheckout}
                className="inline-flex h-11 cursor-pointer items-center justify-center rounded-full border border-line-strong px-4 text-sm font-bold text-ink transition-colors hover:bg-surface-2"
              >
                {t("checkout_cta_secondary")}
              </button>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="cursor-pointer text-center text-[11px] text-ink-faint hover:underline"
              >
                {t("checkout_cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Helper to render math and comparables expandables on each card
  function renderExpandables(item: ShelfItem) {
    if (!item.estimation.hasEstimate) return null;
    const isPeekOpen = !!expandedPeeks[item.id];

    return (
      <div className="mt-3 flex flex-col gap-2 border-t border-line pt-2">
        {/* Math explanation (Principle 2) */}
        <details className="group/details text-[11px] font-medium text-ink-soft">
          <summary className="flex cursor-pointer list-none select-none items-center gap-1 py-1 outline-none hover:text-ink">
            <svg
              className="h-3 w-3 text-ink-faint transition-transform group-open/details:rotate-90"
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
            <span>{t("math_toggle_label")}</span>
          </summary>
          <div className="mt-2 space-y-2 rounded-input border border-line bg-surface-2 p-3">
            <div className="flex justify-between">
              <span>{t("math_min_estimate_label")}</span>
              <span>
                {item.estimation.payoutMin.isBelowThreshold ? (
                  <span className="font-semibold text-amber">
                    {t("math_below_threshold", { limit: 50 })}
                  </span>
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: t("math_formula_result", {
                        listPrice: item.estimation.payoutMin.listPrice,
                        percent:
                          item.estimation.payoutMin.sellerSharePercent * 100,
                        shareAmount:
                          item.estimation.payoutMin.sellerShareAmount,
                        fee: item.estimation.payoutMin.fixedFee,
                        payout: item.estimation.payoutMin.payout,
                      }),
                    }}
                  />
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span>{t("math_max_estimate_label")}</span>
              <span>
                {item.estimation.payoutMax.isBelowThreshold ? (
                  <span className="font-semibold text-amber">
                    {t("math_below_threshold", { limit: 50 })}
                  </span>
                ) : (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: t("math_formula_result", {
                        listPrice: item.estimation.payoutMax.listPrice,
                        percent:
                          item.estimation.payoutMax.sellerSharePercent * 100,
                        shareAmount:
                          item.estimation.payoutMax.sellerShareAmount,
                        fee: item.estimation.payoutMax.fixedFee,
                        payout: item.estimation.payoutMax.payout,
                      }),
                    }}
                  />
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
            className="flex cursor-pointer items-center gap-1 py-1 text-[11px] font-semibold text-ink-soft outline-none transition-colors hover:text-ink"
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
            <span>
              {t("peek_comparables_button", {
                count: item.estimation.comparableCount,
              })}
            </span>
          </button>

          {isPeekOpen && (
            <div
              id={`peek-${item.id}`}
              className="mt-2 overflow-hidden rounded-input border border-line"
            >
              <div className="max-h-48 overflow-y-auto">
                <table className="w-full border-collapse text-left text-[10px]">
                  <thead className="sticky top-0 border-b border-line bg-surface-2 font-semibold text-ink-soft">
                    <tr>
                      <th className="p-2">{t("peek_col_condition")}</th>
                      <th className="p-2 text-right">{t("peek_col_price")}</th>
                      <th className="p-2 text-right">{t("peek_col_stock")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {item.comparables.slice(0, 20).map((comp, idx) => (
                      <tr key={idx} className="hover:bg-surface-2">
                        <td className="p-2 text-[9px] capitalize text-ink-soft">
                          {comp.condition}
                        </td>
                        <td className="num p-2 text-right font-semibold text-ink">
                          {comp.listPriceCzk} {t("currency")}
                        </td>
                        <td className="num p-2 text-right text-ink-soft">
                          {comp.activeCopies}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {item.comparables.length > 20 && (
                <div className="num border-t border-line bg-surface-2 p-2 text-center text-[9px] font-medium text-ink-faint">
                  {t("peek_showing_top", { total: item.comparables.length })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}
