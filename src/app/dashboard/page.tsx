"use client";

import React, { useState, useEffect } from "react";
import Header from "@/components/header";
import { getShipments, Shipment, ShipmentStatus } from "@/lib/seller-repository";

export default function Dashboard() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedShipments, setExpandedShipments] = useState<Record<string, boolean>>({});

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
    
    if (diffDays <= 0) return "today";
    if (diffDays === 1) return "yesterday";
    return `${diffDays} days ago`;
  };

  const formatCalendarDate = (isoString: string): string => {
    return new Date(isoString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Helper to compute payout countdown dynamically (N3)
  const getPayoutCountdown = (soldAtIso: string): { dateStr: string; daysRemaining: number } => {
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
    const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    
    const dateStr = payoutDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    
    return { dateStr, daysRemaining };
  };

  // 1. Compute Earnings Widget Totals dynamically from shipment items list (N2)
  const totalPaidOut = shipments.reduce((sum, s) => 
    sum + s.items.reduce((itemSum, item) => item.status === "paid" ? itemSum + (item.payoutCzk || 0) : itemSum, 0), 
    0
  );

  const totalPendingPayout = shipments.reduce((sum, s) => 
    sum + s.items.reduce((itemSum, item) => item.status === "sold" ? itemSum + (item.payoutCzk || 0) : itemSum, 0), 
    0
  );

  const totalExpectedPayout = shipments.reduce((sum, s) => 
    sum + s.items.reduce((itemSum, item) => (item.status === "listed" || item.status === "priced") ? itemSum + (item.payoutCzk || 0) : itemSum, 0), 
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
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 font-sans transition-colors duration-200">
      {/* Demo Warning Banner (B1) */}
      <div className="bg-amber-500 text-zinc-950 px-6 py-2 text-center text-xs font-bold shadow-sm tracking-wide">
        Demo Preview Mode — Tracking data on this screen is simulated for demonstration purposes. No real books have been shipped or sold.
      </div>

      <Header />

      <main className="mx-auto max-w-2xl px-6 py-12 sm:py-16">
        {/* Title and Description */}
        <section className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-zinc-950 dark:text-white">
            My Sales Tracker
          </h1>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Monitor your book shipments through Knihobot&apos;s receiving, pricing, and listing steps. Payouts for sold items are tracked here.
          </p>
        </section>

        {/* Dynamic Earnings Summary Widgets (N5, N2) */}
        <section className="grid grid-cols-3 gap-4 mb-8">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:backdrop-blur-md text-center">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Paid Out
            </h4>
            <p className="mt-1 text-lg sm:text-2xl font-extrabold text-zinc-900 dark:text-white">
              {loading ? "..." : `${totalPaidOut} CZK`}
            </p>
            <span className="text-[8px] text-zinc-400 block mt-0.5">Sent to bank account</span>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:backdrop-blur-md text-center">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Pending Payout
            </h4>
            <p className="mt-1 text-lg sm:text-2xl font-extrabold text-brand dark:text-emerald-400">
              {loading ? "..." : `${totalPendingPayout} CZK`}
            </p>
            <span className="text-[8px] text-zinc-400 block mt-0.5">Sold, waiting for payout</span>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:backdrop-blur-md text-center">
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Expected Payout
            </h4>
            <p className="mt-1 text-lg sm:text-2xl font-extrabold text-zinc-900 dark:text-white">
              {loading ? "..." : `${totalExpectedPayout} CZK`}
            </p>
            <span className="text-[8px] text-zinc-400 block mt-0.5">Priced & listed items</span>
          </div>
        </section>

        {/* Shipments List */}
        <section className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3">
              <div className="h-6 w-6 rounded-full border-2 border-brand border-t-transparent animate-spin dark:border-emerald-500" />
              <p className="text-xs text-zinc-500">Loading tracker dashboard...</p>
            </div>
          ) : shipments.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center dark:border-zinc-800">
              <svg
                className="mx-auto h-12 w-12 text-zinc-400"
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
              <h3 className="mt-4 text-sm font-bold text-zinc-900 dark:text-white">No shipments tracked yet</h3>
              <p className="mt-1 text-xs text-zinc-500">
                Go back to the Estimator, add books to your shelf, and click &apos;Send to Knihobot&apos; to simulate a shipment.
              </p>
            </div>
          ) : (
            shipments.map((shipment) => {
              const activeIndex = getStatusStepIndex(shipment.status);
              const isOpen = !!expandedShipments[shipment.id];

              return (
                <div
                  key={shipment.id}
                  className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60 dark:backdrop-blur-md overflow-hidden transition-all duration-200"
                >
                  {/* Shipment Header Card */}
                  <div
                    onClick={() => toggleExpand(shipment.id)}
                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 select-none"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-zinc-900 dark:text-white uppercase tracking-wide">
                          {shipment.id}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-bold text-zinc-600 border border-zinc-200/50 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/50">
                          {shipment.carrier}
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        Sent {formatCalendarDate(shipment.dateSent)} ({formatRelativeDate(shipment.dateSent)})
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <span className="block text-[9px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400">
                          Expected Payout
                        </span>
                        <span className="text-xs font-extrabold text-zinc-900 dark:text-white">
                          {shipment.expectedPayoutMin}–{shipment.expectedPayoutMax} CZK
                        </span>
                      </div>
                      <svg
                        className={`h-5 w-5 text-zinc-400 transition-transform duration-200 ${
                          isOpen ? "transform rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* 5-Step Progress Pipeline */}
                  <div className="px-5 pb-5 border-b border-zinc-100 dark:border-zinc-800/80">
                    <div className="relative flex items-center justify-between w-full mt-4">
                      {/* Connector Line */}
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-zinc-100 dark:bg-zinc-800 -translate-y-1/2 z-0" />
                      <div
                        className="absolute left-0 top-1/2 h-0.5 bg-brand dark:bg-emerald-600 -translate-y-1/2 z-0 transition-all duration-500"
                        style={{
                          width: `${(activeIndex / (statusSteps.length - 1)) * 100}%`,
                        }}
                      />

                      {/* Step Dots */}
                      {statusSteps.map((step, idx) => {
                        const isCompleted = idx < activeIndex;
                        const isActive = idx === activeIndex;

                        return (
                          <div key={step.status} className="relative z-10 flex flex-col items-center">
                            <div
                              className={`h-6 w-6 rounded-full flex items-center justify-center border-2 text-[10px] font-extrabold transition-all duration-300 ${
                                isCompleted
                                  ? "bg-brand border-brand text-white dark:bg-emerald-600 dark:border-emerald-600"
                                  : isActive
                                  ? "bg-white border-amber-500 text-amber-500 dark:bg-zinc-900 dark:border-amber-400 dark:text-amber-400 scale-110 shadow-sm"
                                  : "bg-zinc-50 border-zinc-200 text-zinc-400 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-600"
                              }`}
                              title={step.label}
                            >
                              {isCompleted ? (
                                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                idx + 1
                              )}
                            </div>
                            <span
                              className={`text-[8px] font-bold mt-1.5 uppercase tracking-wider ${
                                isActive
                                  ? "text-amber-500 dark:text-amber-400 font-extrabold"
                                  : isCompleted
                                  ? "text-zinc-700 dark:text-zinc-300"
                                  : "text-zinc-400 dark:text-zinc-500"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expandable Details Container */}
                  {isOpen && (
                    <div className="bg-zinc-50/40 dark:bg-zinc-900/20 px-5 py-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                      {/* Payout Countdown Alert (For sold items) */}
                      {shipment.items.some((i) => i.status === "sold") && (
                        <div className="mb-4 p-3 bg-brand/5 dark:bg-emerald-500/5 rounded-lg border border-brand/20 dark:border-emerald-600/25 flex items-start gap-2.5">
                          <svg className="h-4 w-4 text-brand dark:text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div className="space-y-0.5">
                            <span className="block text-[10px] font-bold text-zinc-900 dark:text-zinc-200">
                              Payout Countdown (Simulation)
                            </span>
                            {shipment.items
                              .filter((item) => item.status === "sold" && item.soldAt)
                              .map((item, index) => {
                                const { dateStr, daysRemaining } = getPayoutCountdown(item.soldAt!);
                                return (
                                  <p key={index} className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-normal">
                                    &quot;{item.title}&quot; was sold. Expected Payout on <strong>{dateStr}</strong> ({daysRemaining} days remaining).
                                  </p>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Shipment Items Table */}
                      <div className="overflow-x-auto pt-2">
                        <table className="w-full text-left border-collapse text-[10px]">
                          <thead>
                            <tr className="text-zinc-500 font-bold border-b border-zinc-100 dark:border-zinc-800">
                              <th className="pb-2 w-7/12">Book Info</th>
                              <th className="pb-2 w-2/12 text-center">Status</th>
                              <th className="pb-2 w-3/12 text-right">Value Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                            {shipment.items.map((item, itemIdx) => (
                              <tr key={itemIdx} className="hover:bg-zinc-100/10 transition-colors">
                                <td className="py-2.5 pr-2">
                                  <span className="block font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                                    {item.title}
                                  </span>
                                  <span className="block text-[9px] text-zinc-400 mt-0.5">
                                    by {item.author} · <span className="italic">{item.condition}</span>
                                  </span>
                                </td>
                                <td className="py-2.5 text-center">
                                  <span
                                    className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase border ${
                                      item.status === "paid"
                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/30"
                                        : item.status === "sold"
                                        ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-800/30"
                                        : item.status === "listed"
                                        ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-800/30"
                                        : item.status === "priced"
                                        ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-800/30"
                                        : "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700/50"
                                    }`}
                                  >
                                    {item.status}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-medium">
                                  {item.payoutCzk ? (
                                    <div>
                                      <span className="block font-bold text-zinc-900 dark:text-zinc-100">
                                        {item.payoutCzk} CZK
                                      </span>
                                      {item.listPriceCzk && (
                                        <span className="block text-[9px] text-zinc-400 mt-0.5">
                                          Listed at {item.listPriceCzk} CZK
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-zinc-400 dark:text-zinc-500">Evaluating...</span>
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
