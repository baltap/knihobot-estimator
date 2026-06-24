"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { analyzeSpinePhoto, SpineMatchResult } from "@/app/actions";
import { useLanguage } from "@/components/language-provider";

interface SpineScannerProps {
  onAddBooks: (books: { title: string; author: string }[]) => Promise<void>;
  onClose: () => void;
  condition: "new" | "verygood" | "good" | "worn";
}

type Step = "upload" | "preview" | "analyzing" | "review" | "error";

export default function SpineScanner({ onAddBooks, onClose, condition }: SpineScannerProps) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // base64 JPEG data URL
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [results, setResults] = useState<SpineMatchResult[]>([]);
  const [checkedBooks, setCheckedBooks] = useState<Record<number, boolean>>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const activeRef = useRef(true);

  // Keyboard Escape close listener (N1)
  useEffect(() => {
    activeRef.current = true;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      activeRef.current = false;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Autofocus the close button on mount (N1)
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, []);

  // Handle file selection and downscale using canvas (B2)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Calculate downscaled dimensions (max edge 1024px)
        const maxEdge = 1024;
        let width = img.width;
        let height = img.height;

        if (width > maxEdge || height > maxEdge) {
          if (width > height) {
            height = Math.round((height * maxEdge) / width);
            width = maxEdge;
          } else {
            width = Math.round((width * maxEdge) / height);
            height = maxEdge;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Export as JPEG with q=0.7 to yield a small payload (~150KB)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
          if (activeRef.current) {
            setSelectedImage(dataUrl);
            setStep("preview");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  // Invoke server action to analyze spine photo (B1, B4)
  const handleAnalyze = async () => {
    if (!selectedImage) return;

    setStep("analyzing");
    setErrorMessage("");

    try {
      // Strip base64 data URL prefix "data:image/jpeg;base64," (N1)
      const commaIndex = selectedImage.indexOf(",");
      const rawBase64 = selectedImage.substring(commaIndex + 1);

      const response = await analyzeSpinePhoto(rawBase64, "image/jpeg", condition);
      
      if (!activeRef.current) return;

      if (response.success && response.books) {
        setResults(response.books);
        // Default check all detected books
        const initialChecks: Record<number, boolean> = {};
        response.books.forEach((_, idx) => {
          initialChecks[idx] = true;
        });
        setCheckedBooks(initialChecks);
        setStep("review");
      } else {
        setStep("error");
        setErrorMessage(
          response.error ? t(response.error) : t("GENERIC_ERROR")
        );
      }
    } catch (err) {
      if (!activeRef.current) return;
      console.error("Spine scanner analysis error:", err);
      setStep("error");
      setErrorMessage(t("GENERIC_ERROR"));
    }
  };

  const handleToggleCheck = (idx: number) => {
    setCheckedBooks((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  // Add selected books to shelf (N6)
  const handleBatchAdd = async () => {
    const booksToAdd = results
      .filter((_, idx) => checkedBooks[idx])
      .map((item) => ({
        title: item.matched && item.matchDetails ? item.matchDetails.title : item.extractedTitle,
        author: item.matched && item.matchDetails ? item.matchDetails.author : item.extractedAuthor,
      }));

    if (booksToAdd.length === 0) return;

    setIsAdding(true);
    try {
      await onAddBooks(booksToAdd);
      onClose();
    } catch (err) {
      console.error("Batch add failed:", err);
      setIsAdding(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setResults([]);
    setCheckedBooks({});
    setErrorMessage("");
    setStep("upload");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spine-dialog-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4"
    >
      {/* CSS Styles for laser line scanning preview */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanMotion {
          0% { transform: translateY(0); opacity: 0.8; }
          50% { transform: translateY(220px); opacity: 0.9; }
          100% { transform: translateY(0); opacity: 0.8; }
        }
        .laser-scan-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 3px;
          background-color: #10b981;
          box-shadow: 0 0 10px #10b981, 0 0 4px #34d399;
          animation: scanMotion 2.5s ease-in-out infinite;
          pointer-events: none;
          z-index: 10;
        }
      `}} />

      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 sticky top-0 z-30">
          <div>
            <h3 id="spine-dialog-title" className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
              <span>{t("spine_dialog_title")}</span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-400 border border-emerald-500/20">
                AI Beta
              </span>
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              {t("spine_dialog_desc")}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close scanner"
            className="text-zinc-400 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
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

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Viewfinder / Panel Area */}
        <div className="flex-1 overflow-y-auto min-h-[300px]">
          {/* STEP 1: UPLOAD/SNAP */}
          {step === "upload" && (
            <div className="p-8 flex flex-col items-center justify-center text-center h-[320px]">
              <div
                onClick={triggerUpload}
                className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer bg-zinc-950/20 transition-all hover:bg-zinc-950/40 group"
              >
                <div className="h-12 w-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 group-hover:bg-emerald-950/30 transition-all mb-4">
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                    />
                  </svg>
                </div>
                <h4 className="font-bold text-xs text-zinc-200 uppercase tracking-wider">
                  {t("spine_step_upload_title")}
                </h4>
                <p className="text-[10px] text-zinc-500 max-w-[200px] mt-2 leading-normal">
                  {t("spine_step_upload_desc")}
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: PREVIEW */}
          {step === "preview" && selectedImage && (
            <div className="p-5 space-y-4">
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center max-h-[260px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Spine stack preview"
                  className="max-h-[260px] object-contain w-full"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold cursor-pointer h-9"
                >
                  {t("spine_btn_retake")}
                </Button>
                <Button
                  onClick={handleAnalyze}
                  className="flex-1 bg-brand hover:bg-brand/95 text-xs text-white font-bold cursor-pointer h-9"
                >
                  {t("spine_btn_analyze")}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: ANALYZING */}
          {step === "analyzing" && selectedImage && (
            <div className="p-6 flex flex-col items-center justify-center text-center h-[320px] space-y-5">
              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center h-[220px] w-full max-w-[220px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedImage}
                  alt="Analyzing spines"
                  className="h-full object-cover w-full opacity-60"
                />
                <div className="laser-scan-line" />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-zinc-200 font-bold animate-pulse">
                  {t("spine_analyzing_title")}
                </p>
                <p className="text-[10px] text-zinc-500 font-medium">
                  {t("spine_analyzing_desc")}
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW RESULTS BATCH */}
          {step === "review" && (
            <div className="p-4 space-y-4">
              <div className="p-3 bg-zinc-950/40 border border-zinc-800/80 rounded-lg text-[10px] text-zinc-400 leading-normal">
                <strong>{t("spine_review_title")}</strong> {t("spine_review_desc")}
              </div>

              <div className="border border-zinc-800 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead className="bg-zinc-950 text-zinc-400 font-bold border-b border-zinc-800 sticky top-0">
                    <tr>
                      <th className="p-2.5 w-8"></th>
                      <th className="p-2.5">{t("spine_col_extracted")}</th>
                      <th className="p-2.5">{t("spine_col_match")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 bg-zinc-900/10">
                    {results.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="p-6 text-center italic text-zinc-500">
                          {t("spine_no_text_recognized")}
                        </td>
                      </tr>
                    ) : (
                      results.map((item, idx) => (
                        <tr
                          key={idx}
                          onClick={() => handleToggleCheck(idx)}
                          className="hover:bg-zinc-950/20 cursor-pointer transition-colors"
                        >
                          <td className="p-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={!!checkedBooks[idx]}
                              onChange={() => handleToggleCheck(idx)}
                              className="h-3.5 w-3.5 border-zinc-800 text-brand focus:ring-brand rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-2.5">
                            <span className="block font-bold text-zinc-100 leading-tight">
                              {item.extractedTitle}
                            </span>
                            <span className="block text-[9px] text-zinc-500 mt-0.5">
                              {t("card_by_author")}{item.extractedAuthor || t("spine_unknown_author")}
                            </span>
                          </td>
                          <td className="p-2.5">
                            {item.matched && item.matchDetails ? (
                              <div>
                                <span className="block font-bold text-emerald-400 leading-tight">
                                  {item.matchDetails.estimation.payoutMin.payout}–
                                  {item.matchDetails.estimation.payoutMax.payout} {t("currency")}
                                </span>
                                <span className="block text-[9px] text-zinc-400 mt-0.5 truncate max-w-[140px]" title={item.matchDetails.title}>
                                  {item.matchDetails.title}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-amber-500/90 font-semibold" title={t("spine_unmatched_desc")}>
                                <svg
                                  className="h-3.5 w-3.5 text-amber-500"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                  />
                                </svg>
                                <span>{t("spine_unmatched_label")}</span>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {results.length > 0 && (
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold cursor-pointer h-9"
                  >
                    {t("spine_btn_discard")}
                  </Button>
                  <Button
                    onClick={handleBatchAdd}
                    disabled={isAdding || results.filter((_, idx) => checkedBooks[idx]).length === 0}
                    className="flex-1 bg-brand hover:bg-brand/95 text-xs text-white font-bold cursor-pointer h-9"
                  >
                    {isAdding ? t("spine_adding_books") : t("spine_btn_add_books", { count: results.filter((_, idx) => checkedBooks[idx]).length })}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: ERROR / RETRY OVERLAY (B1) */}
          {step === "error" && (
            <div className="p-6 flex flex-col items-center justify-center text-center h-[320px]">
              <svg
                className="h-10 w-10 text-red-500 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <h4 className="font-bold text-sm text-zinc-100 mb-2">
                {t("spine_error_title")}
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs leading-normal mb-6">
                {errorMessage}
              </p>
              <div className="flex gap-3 w-full max-w-[280px]">
                <Button
                  variant="outline"
                  onClick={handleReset}
                  className="flex-1 border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold cursor-pointer h-9"
                >
                  {t("spine_btn_try_another")}
                </Button>
                <Button
                  onClick={onClose}
                  className="flex-1 bg-brand hover:bg-brand/95 text-xs text-white font-bold cursor-pointer h-9"
                >
                  {t("scanner_btn_manual_input")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
