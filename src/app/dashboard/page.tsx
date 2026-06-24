"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/header";
import {
  getShipments,
  Shipment,
  ShipmentStatus,
} from "@/lib/seller-repository";
import { useLanguage } from "@/components/language-provider";

export default function Dashboard() {
  const { language, t } = useLanguage();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShipments, setExpandedShipments] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    // Safely load shipments on client-side to prevent SSR hydration mismatch (B2)
    const data = getShipments();
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setShipments(data);
    setLoading(false);

    // Default expand the first shipment
    if (data.length > 0) {
      setExpandedShipments({ [data[0].id]: true });
    }
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedShipments((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Helper to format relative dates dynamically (N3)
  const formatRelativeDate = (isoString: string): string => {
    const date = new Date(isoString);
    /* eslint-disable-next-line react-hooks/purity */
    const diffMs = Date.now() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) return t("dashboard_date_today");
    if (diffDays === 1) return t("dashboard_date_yesterday");
    return t("dashboard_date_days_ago", { count: diffDays });
  };

  const formatCalendarDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString(
      language === "cs" ? "cs-CZ" : "en-US",
      {
        month: "short",
        day: "numeric",
        year: "numeric",
      }
    );
  };

  // Helper to compute payout countdown dynamically (N3)
  const getPayoutCountdown = (
    soldAtIso: string
  ): { dateStr: string; daysRemaining: number } => {
    const soldDate = new Date(soldAtIso);
    let payoutYear = soldDate.getFullYear();
    let payoutMonth = soldDate.getMonth() + 1; // Month following sale
    if (payoutMonth > 11) {
      payoutMonth = 0;
      payoutYear += 1;
    }
    const payoutDate = new Date(payoutYear, payoutMonth, 10);
    /* eslint-disable-next-line react-hooks/purity */
    const diffMs = payoutDate.getTime() - Date.now();
    const daysRemaining = Math.max(
      0,
      Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    );

    const dateStr = payoutDate.toLocaleDateString(
      language === "cs" ? "cs-CZ" : "en-US",
      {
        month: "long",
        day: "numeric",
        year: "numeric",
      }
    );

    return { dateStr, daysRemaining };
  };

  // 1. Compute Earnings Widget Totals dynamically from shipment items list (N2)
  const totalPaidOut = shipments.reduce(
    (sum, s) =>
      sum +
      s.items.reduce(
        (itemSum, item) =>
          item.status === "paid" ? itemSum + (item.payoutCzk || 0) : itemSum,
        0
      ),
    0
  );

  const totalPendingPayout = shipments.reduce(
    (sum, s) =>
      sum +
      s.items.reduce(
        (itemSum, item) =>
          item.status === "sold" ? itemSum + (item.payoutCzk || 0) : itemSum,
        0
      ),
    0
  );

  const totalExpectedPayout = shipments.reduce(
    (sum, s) =>
      sum +
      s.items.reduce(
        (itemSum, item) =>
          item.status === "listed" || item.status === "priced"
            ? itemSum + (item.payoutCzk || 0)
            : itemSum,
        0
      ),
    0
  );

  // Status mapping to pipeline steps
  const statusSteps: { status: ShipmentStatus; label: string }[] = [
    { status: "received", label: "Received" },
    { status: "priced", label: "Priced" },
    { status: "listed", label: "Listed" },
    { status: "sold", label: "Sold" },
    { status: "paid", label: "Paid" },
  ];

  const getStatusStepIndex = (status: ShipmentStatus): number => {
    return statusSteps.findIndex((step) => step.status === status);
  };

  return (
    <div className="min-h-screen bg-bg text-ink font-sans transition-colors duration-200">
      {/* Demo Warning Banner (B1) */}
      <div className="border-b border-amber bg-amber-bg px-6 py-2 text-center text-xs font-bold tracking-wide text-amber">
        {t("dashboard_demo_banner")}
      </div>

      <Header />

      <main className="mx-auto max-w-4xl px-6 py-12 sm:py-16">
        {/* Title and Description */}
        <section className="mb-8">
          <h1 className="font-serif text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl">
            {t("dashboard_title")}
          </h1>
          <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-ink-soft sm:text-lg">
            {t("dashboard_description")}
          </p>
        </section>

        {/* Dynamic Earnings Summary Widgets (N5, N2) */}
        <section className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-card border border-line bg-surface p-4 text-center shadow-paper">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              {t("dashboard_paid_out")}
            </h4>
            <p className="num mt-1 font-serif text-lg font-bold text-ink sm:text-2xl">
              {loading ? "..." : `${totalPaidOut} ${t("currency")}`}
            </p>
            <span className="mt-0.5 block text-[8px] text-ink-faint">
              {t("dashboard_paid_out_sub")}
            </span>
          </div>

          <div className="rounded-card border border-line bg-surface p-4 text-center shadow-paper">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              {t("dashboard_pending")}
            </h4>
            <p className="num mt-1 font-serif text-lg font-bold text-green-700 sm:text-2xl">
              {loading ? "..." : `${totalPendingPayout} ${t("currency")}`}
            </p>
            <span className="mt-0.5 block text-[8px] text-ink-faint">
              {t("dashboard_pending_sub")}
            </span>
          </div>

          <div className="rounded-card border border-line bg-surface p-4 text-center shadow-paper">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">
              {t("dashboard_expected")}
            </h4>
            <p className="num mt-1 font-serif text-lg font-bold text-ink sm:text-2xl">
              {loading ? "..." : `${totalExpectedPayout} ${t("currency")}`}
            </p>
            <span className="mt-0.5 block text-[8px] text-ink-faint">
              {t("dashboard_expected_sub")}
            </span>
          </div>
        </section>

        {/* Shipments List */}
        <section className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center space-y-3 p-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
              <p className="text-xs text-ink-faint">{t("dashboard_loading")}</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="rounded-card border border-dashed border-line-strong p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-ink-faint"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-.621-.504-1.125-1.125-1.125H9.75M8.25 21h8.25a2.25 2.25 0 002.25-2.25V5.25A2.25 2.25 0 0016.5 3H7.25A2.25 2.25 0 005 5.25v13.5A2.25 2.25 0 007.25 21z"
                />
              </svg>
              <h3 className="mt-4 font-serif text-base font-semibold text-ink">
                {t("dashboard_no_shipments_title")}
              </h3>
              <p className="mt-1 text-xs text-ink-soft">
                {t("dashboard_no_shipments_desc")}
              </p>
            </div>
          ) : (
            shipments.map((shipment) => {
              const activeIndex = getStatusStepIndex(shipment.status);
              const isOpen = !!expandedShipments[shipment.id];

              return (
                <div
                  key={shipment.id}
                  className="overflow-hidden rounded-card border border-line bg-surface shadow-paper transition-all duration-200"
                >
                  {/* Shipment Header Card */}
                  <div
                    onClick={() => toggleExpand(shipment.id)}
                    className="flex cursor-pointer select-none items-center justify-between p-5 hover:bg-surface-2"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="num text-xs font-extrabold uppercase tracking-wide text-ink">
                          {shipment.id}
                        </span>
                        <span className="inline-flex items-center rounded-full border border-line bg-surface-2 px-2 py-0.5 text-[9px] font-bold text-ink-soft">
                          {shipment.carrier}
                        </span>
                      </div>
                      <p className="text-[10px] font-medium text-ink-faint">
                        {t("dashboard_sent_date", {
                          date: formatCalendarDate(shipment.dateSent),
                          relative: formatRelativeDate(shipment.dateSent),
                        })}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="hidden text-right sm:block">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-ink-faint">
                          {t("dashboard_expected_payout_title")}
                        </span>
                        <span className="num text-xs font-extrabold text-ink">
                          {shipment.expectedPayoutMin}–
                          {shipment.expectedPayoutMax} {t("currency")}
                        </span>
                      </div>
                      <svg
                        className={`h-5 w-5 text-ink-faint transition-transform duration-200 ${
                          isOpen ? "transform rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>

                  {/* 5-Step Progress Pipeline */}
                  <div className="border-b border-line px-5 pb-5">
                    <div className="relative mt-4 flex w-full items-center justify-between">
                      {/* Connector Line */}
                      <div className="absolute left-0 right-0 top-1/2 z-0 h-0.5 -translate-y-1/2 bg-line" />
                      <div
                        className="absolute left-0 top-1/2 z-0 h-0.5 -translate-y-1/2 bg-green-500 transition-all duration-500"
                        style={{
                          width: `${(activeIndex / (statusSteps.length - 1)) * 100}%`,
                        }}
                      />

                      {/* Step Dots */}
                      {statusSteps.map((step, idx) => {
                        const isCompleted = idx < activeIndex;
                        const isActive = idx === activeIndex;

                        return (
                          <div
                            key={step.status}
                            className="relative z-10 flex flex-col items-center"
                          >
                            <div
                              className={`flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-extrabold transition-all duration-300 ${
                                isCompleted
                                  ? "border-green-600 bg-green-600 text-on-green"
                                  : isActive
                                    ? "scale-110 border-amber bg-surface text-amber shadow-sm"
                                    : "border-line-strong bg-surface-2 text-ink-faint"
                              }`}
                              title={t("step_" + step.status)}
                            >
                              {isCompleted ? (
                                <svg
                                  className="h-3 w-3"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={3}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`mt-1.5 text-[8px] font-bold uppercase tracking-wider ${
                                isActive
                                  ? "font-extrabold text-amber"
                                  : isCompleted
                                    ? "text-ink"
                                    : "text-ink-faint"
                              }`}
                            >
                              {t("step_" + step.status)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable Details Container */}
                  {isOpen && (
                    <div className="divide-y divide-line bg-surface-2 px-5 py-4">
                      {/* Payout Countdown Alert (For sold items) */}
                      {shipment.items.some((i) => i.status === "sold") && (
                        <div className="mb-4 flex items-start gap-2.5 rounded-input border border-green-600/25 bg-green-bg p-3">
                          <svg
                            className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <div className="space-y-0.5">
                            <span className="block text-[10px] font-bold text-ink">
                              {t("dashboard_payout_countdown_title")}
                            </span>
                            {shipment.items
                              .filter(
                                (item) => item.status === "sold" && item.soldAt
                              )
                              .map((item, index) => {
                                const { dateStr, daysRemaining } =
                                  getPayoutCountdown(item.soldAt!);
                                return (
                                  <p
                                    key={index}
                                    className="text-[10px] leading-normal text-ink-soft"
                                  >
                                    {t("dashboard_payout_countdown_desc", {
                                      title: item.title,
                                      date: dateStr,
                                      count: daysRemaining,
                                    })}
                                  </p>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Shipment Items Table */}
                      <div className="overflow-x-auto pt-2">
                        <table className="w-full border-collapse text-left text-[10px]">
                          <thead>
                            <tr className="border-b border-line font-bold text-ink-faint">
                              <th className="w-7/12 pb-2">
                                {t("dashboard_col_info")}
                              </th>
                              <th className="w-2/12 pb-2 text-center">
                                {t("dashboard_col_status")}
                              </th>
                              <th className="w-3/12 pb-2 text-right">
                                {t("dashboard_col_value")}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {shipment.items.map((item, itemIdx) => (
                              <tr
                                key={itemIdx}
                                className="transition-colors hover:bg-surface"
                              >
                                <td className="py-2.5 pr-2">
                                  <span className="block font-bold leading-tight text-ink">
                                    {item.title}
                                  </span>
                                  <span className="mt-0.5 block text-[9px] text-ink-faint">
                                    {t("card_by_author")}
                                    {item.author} ·{" "}
                                    <span className="italic">
                                      {t("form_condition_" + item.condition)}
                                    </span>
                                  </span>
                                </td>
                                <td className="py-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[8px] font-extrabold uppercase ${
                                      item.status === "paid"
                                        ? "border-green-600/30 bg-green-bg text-green-700"
                                        : item.status === "sold"
                                          ? "border-amber/30 bg-amber-bg text-amber"
                                          : item.status === "listed"
                                            ? "border-line bg-surface text-ink-soft"
                                            : item.status === "priced"
                                              ? "border-line bg-surface text-ink-soft"
                                              : "border-line bg-surface text-ink-faint"
                                    }`}
                                  >
                                    {t("step_" + item.status)}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-medium">
                                  {item.payoutCzk ? (
                                    <div>
                                      <span className="num block font-bold text-ink">
                                        {item.payoutCzk} {t("currency")}
                                      </span>
                                      {item.listPriceCzk && (
                                        <span className="num mt-0.5 block text-[9px] text-ink-faint">
                                          {t("dashboard_listed_at", {
                                            price: item.listPriceCzk,
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-ink-faint">
                                      {t("dashboard_evaluating")}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </main>
    </div>
  );
}
