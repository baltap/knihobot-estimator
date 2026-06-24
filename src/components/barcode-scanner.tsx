"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  CameraDevice,
} from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { isValidIsbn13 } from "@/lib/isbn-validator";
import { useLanguage } from "@/components/language-provider";

interface BarcodeScannerProps {
  onScan: (isbn: string) => Promise<{
    success: boolean;
    title?: string;
    payoutMin?: number;
    payoutMax?: number;
    isNoComparables?: boolean;
    error?: string;
  }>;
  onClose: () => void;
  audioContextRef: React.MutableRefObject<AudioContext | null>;
  condition: "new" | "verygood" | "good" | "worn";
}

type ScannerState =
  | "loading"
  | "scanning"
  | "processing"
  | "success"
  | "warning"
  | "error";

export default function BarcodeScanner({
  onScan,
  onClose,
  audioContextRef,
  condition,
}: BarcodeScannerProps) {
  const { t } = useLanguage();
  const [scannerState, setScannerState] = useState<ScannerState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string>("");

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "barcode-scanner-viewfinder";
  const cooldownsRef = useRef<Map<string, number>>(new Map());
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Active mount tracker to prevent async race conditions under StrictMode dev double-mounting (B1)
  const activeMountIdRef = useRef(0);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // Clean condition name helper
  const getConditionLabel = (c: string) => {
    return t("form_condition_" + c);
  };

  // Synthesize positive success chime (using AudioContext created on click gesture) (N2, N3)
  const playSuccessChime = () => {
    const audioCtx = audioContextRef.current;
    if (!audioCtx) return;

    try {
      if (audioCtx.state === "suspended") {
        audioCtx.resume();
      }

      const now = audioCtx.currentTime;

      // Tone 1: C5 (523.25 Hz)
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(523.25, now);
      gain1.gain.setValueAtTime(0.12, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);

      // Tone 2: E5 (659.25 Hz)
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(659.25, now + 0.08);
      gain2.gain.setValueAtTime(0.16, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.25);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.45);
    } catch (err) {
      console.warn("Failed to play success chime:", err);
    }
  };

  // Handle barcode scanned successfully
  const handleScanSuccess = async (decodedText: string, myMountId: number) => {
    const scanner = scannerRef.current;
    if (!scanner || activeMountIdRef.current !== myMountId) return;

    const now = Date.now();
    const normalized = decodedText.replace(/[\s-]/g, "");

    // 1. Check cooldown (5s per-code limit to prevent duplication) (B1, N2, N5)
    const lastScanTime = cooldownsRef.current.get(normalized) || 0;
    if (now - lastScanTime < 5000) {
      return;
    }

    // Add to cooldowns Ref immediately
    cooldownsRef.current.set(normalized, now);

    // Evict entries older than 5 seconds to keep map size bounded (N3)
    for (const [key, timestamp] of cooldownsRef.current.entries()) {
      if (now - timestamp > 5000) {
        cooldownsRef.current.delete(key);
      }
    }

    // 2. Validate checksum & book prefixes
    if (!isValidIsbn13(normalized)) {
      try {
        scanner.pause(true);
      } catch (e) {
        console.warn("Pause error:", e);
      }
      setScannerState("warning");
      setErrorMessage(t("scanner_err_not_book"));

      // Auto-resume after 2.5s
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = setTimeout(() => {
        if (scanner.isScanning && activeMountIdRef.current === myMountId) {
          scanner.resume();
          setScannerState("scanning");
        }
      }, 2500);
      return;
    }

    // 3. Pause scanning during async operation
    try {
      scanner.pause(true);
    } catch (e) {
      console.warn("Pause error:", e);
    }
    setScannerState("processing");

    // 4. Invoke integration lookup contract (B2)
    try {
      const result = await onScan(normalized);
      if (activeMountIdRef.current !== myMountId) return;

      if (result.success) {
        playSuccessChime();
        setScannerState("success");
        if (result.isNoComparables) {
          setSuccessMessage(
            t("scanner_added_no_comparables", { isbn: normalized })
          );
        } else if (result.payoutMax === 0) {
          setSuccessMessage(
            t("scanner_added_below_threshold", {
              title: result.title || t("scanner_default_book_title"),
            })
          );
        } else {
          setSuccessMessage(
            t("scanner_added_success", {
              title: result.title || t("scanner_default_book_title"),
              payoutMin: result.payoutMin ?? 0,
              payoutMax: result.payoutMax ?? 0,
              currency: t("currency"),
            })
          );
        }
      } else {
        setScannerState("warning");
        setErrorMessage(
          result.error ? t(result.error) : t("scanner_err_lookup_failed")
        );
      }
    } catch (err) {
      if (activeMountIdRef.current !== myMountId) return;
      setScannerState("warning");
      setErrorMessage(t("scanner_err_system_error"));
      console.error(err);
    }

    // 5. Schedule scan resume after showing toast status
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
    resumeTimeoutRef.current = setTimeout(() => {
      if (scanner.isScanning && activeMountIdRef.current === myMountId) {
        scanner.resume();
        setScannerState("scanning");
      }
    }, 2500);
  };

  // Start scanning on active camera
  const startCamera = async (
    cameraIdOrFacing: string | { facingMode: string },
    myMountId: number
  ) => {
    if (!scannerRef.current || activeMountIdRef.current !== myMountId) return;

    try {
      setScannerState("loading");
      await scannerRef.current.start(
        cameraIdOrFacing,
        {
          fps: 10,
          qrbox: { width: 280, height: 160 }, // horizontal rectangular scan target for ISBNs
        },
        (text) => {
          if (activeMountIdRef.current === myMountId) {
            handleScanSuccess(text, myMountId);
          }
        },
        () => {
          // Silent callback for frame scanning failures (normal when code not aligned yet)
        }
      );

      if (activeMountIdRef.current !== myMountId) {
        // If mount ID switched while starting, stop scanner cleanly (B2, N2)
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        return;
      }

      // Successfully scanning
      setScannerState("scanning");
    } catch (err) {
      if (activeMountIdRef.current !== myMountId) return;
      console.error("Failed to start camera scan:", err);
      const isPermissionErr =
        err instanceof Error &&
        (err.name === "NotAllowedError" || err.message?.includes("Permission"));

      setScannerState("error");
      if (isPermissionErr) {
        setErrorMessage(t("scanner_camera_permission_denied_desc"));
      } else {
        setErrorMessage(t("scanner_generic_error_desc"));
      }
    }
  };

  // Keyboard Escape key close support (N1)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Autofocus the close button on mount for a11y focus management (N1)
  useEffect(() => {
    if (closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, []);

  // Lifecycle initialization & teardown (StrictMode double-mount safe) (B1)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Increment mount counter and capture this effect run's ID
    activeMountIdRef.current += 1;
    const myMountId = activeMountIdRef.current;

    const html5QrCode = new Html5Qrcode(containerId, {
      formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13],
      verbose: false,
    });
    scannerRef.current = html5QrCode;

    const setupScanner = async () => {
      // Check for browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (activeMountIdRef.current !== myMountId) return;
        setScannerState("error");
        setErrorMessage(t("scanner_unsupported"));
        return;
      }

      try {
        // Enumerate video devices
        const devices = await Html5Qrcode.getCameras();
        if (activeMountIdRef.current !== myMountId) return;
        setCameras(devices);

        if (devices.length === 0) {
          setScannerState("error");
          setErrorMessage(t("scanner_no_camera"));
          return;
        }

        // Try environment camera if available, otherwise default to first camera (N1)
        const backCamera = devices.find(
          (device) =>
            device.label.toLowerCase().includes("back") ||
            device.label.toLowerCase().includes("environment") ||
            device.label.toLowerCase().includes("rear")
        );

        const targetDevice = backCamera ? backCamera.id : devices[0].id;
        setActiveCameraId(targetDevice);

        await startCamera(targetDevice, myMountId);
      } catch (err) {
        if (activeMountIdRef.current !== myMountId) return;
        console.error("Setup cameras error:", err);
        // Fall back to environment mode directly if enumerate fails
        await startCamera({ facingMode: "environment" }, myMountId);
      }
    };

    setupScanner();

    // Teardown
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }

      if (html5QrCode) {
        const stopScanner = async () => {
          try {
            if (html5QrCode.isScanning) {
              await html5QrCode.stop();
            }
            html5QrCode.clear();
          } catch (e) {
            console.warn("Clean scanner on unmount error:", e);
          }
        };
        stopScanner();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle switching cameras manually
  const handleSwitchCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner || cameras.length <= 1) return;

    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCameraId = cameras[nextIndex].id;

    try {
      if (scanner.isScanning) {
        await scanner.stop();
      }
      setActiveCameraId(nextCameraId);
      await startCamera(nextCameraId, activeMountIdRef.current);
    } catch (err) {
      console.error("Error switching cameras:", err);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="scanner-dialog-title"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4"
    >
      {/* CSS Styles injection for viewport and animations */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
        @keyframes laserScan {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
        .laser-line {
          position: absolute;
          left: 1rem;
          right: 1rem;
          height: 2px;
          background-color: #10b981;
          box-shadow: 0 0 8px #10b981, 0 0 2px #34d399;
          animation: laserScan 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 20;
        }
      `,
        }}
      />

      <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/90 sticky top-0 z-30">
          <div>
            <h3
              id="scanner-dialog-title"
              className="font-bold text-sm text-zinc-100"
            >
              {t("scanner_dialog_title")}
            </h3>
            <p className="text-[10px] text-zinc-400 font-medium mt-0.5">
              {t("form_label_condition")}: {getConditionLabel(condition)}
            </p>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label={t("scanner_aria_close")}
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

        {/* Viewfinder Area */}
        <div className="relative aspect-square w-full bg-black flex flex-col items-center justify-center">
          {/* html5-qrcode target div */}
          <div
            id={containerId}
            className="w-full h-full [&_video]:object-cover"
          />

          {/* HUD scan box visual borders */}
          {scannerState === "scanning" && (
            <>
              {/* Corner brackets */}
              <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                <div className="w-[280px] h-[160px] relative">
                  {/* Top-left */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl" />
                  {/* Top-right */}
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr" />
                  {/* Bottom-left */}
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl" />
                  {/* Bottom-right */}
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br" />
                </div>
              </div>
              {/* Pulsing red/green laser line */}
              <div className="w-[280px] h-[160px] absolute pointer-events-none overflow-hidden z-10">
                <div className="laser-line" />
              </div>
            </>
          )}

          {/* Loader Overlay */}
          {scannerState === "loading" && (
            <div className="absolute inset-0 bg-zinc-950/90 z-20 flex flex-col items-center justify-center p-6 text-center">
              <svg
                className="animate-spin h-8 w-8 text-brand dark:text-emerald-500 mb-3"
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
              <p className="text-xs text-zinc-300 font-semibold">
                {t("scanner_loading")}
              </p>
            </div>
          )}

          {/* Processing / Lookup Overlay */}
          {scannerState === "processing" && (
            <div className="absolute inset-0 bg-zinc-950/80 z-20 flex flex-col items-center justify-center p-6 text-center">
              <svg
                className="animate-spin h-8 w-8 text-brand dark:text-emerald-400 mb-3"
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
              <p className="text-xs text-zinc-300 font-semibold">
                {t("scanner_fetching")}
              </p>
            </div>
          )}

          {/* Success Notification Banner */}
          {scannerState === "success" && (
            <div className="absolute inset-x-4 bottom-4 bg-emerald-950/90 border border-emerald-500/30 p-3 rounded-xl z-20 shadow-lg text-center backdrop-blur-xs flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 text-emerald-400 shrink-0"
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
              <p className="text-xs font-bold text-emerald-200">
                {successMessage}
              </p>
            </div>
          )}

          {/* Warning/Error Notification Banner */}
          {scannerState === "warning" && (
            <div className="absolute inset-x-4 bottom-4 bg-amber-950/90 border border-amber-500/30 p-3 rounded-xl z-20 shadow-lg text-center backdrop-blur-xs flex items-center justify-center gap-2">
              <svg
                className="h-5 w-5 text-amber-400 shrink-0"
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
              <p className="text-xs font-bold text-amber-200">{errorMessage}</p>
            </div>
          )}

          {/* Fatal Permissions/Hardware Error State */}
          {scannerState === "error" && (
            <div className="absolute inset-0 bg-zinc-950 z-20 flex flex-col items-center justify-center p-6 text-center">
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
                {t("scanner_unavailable")}
              </h4>
              <p className="text-xs text-zinc-400 max-w-xs leading-normal mb-5">
                {errorMessage}
              </p>
              <Button
                variant="default"
                size="sm"
                onClick={onClose}
                className="bg-brand hover:bg-brand/95 text-xs text-white px-4 py-2 font-bold cursor-pointer"
              >
                {t("scanner_btn_manual_input")}
              </Button>
            </div>
          )}
        </div>

        {/* Footer controls (visible only if camera started fine) */}
        {scannerState !== "error" && (
          <div className="px-5 py-4 bg-zinc-900 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="text-[10px] text-zinc-400 font-medium">
              {cameras.length > 1 ? (
                <span>
                  {t("scanner_found_cameras", { count: cameras.length })}
                </span>
              ) : (
                <span>{t("scanner_active_camera")}</span>
              )}
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              {cameras.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSwitchCamera}
                  className="w-full sm:w-auto border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs py-1.5 h-8 font-semibold cursor-pointer"
                >
                  {t("scanner_btn_switch_camera")}
                </Button>
              )}
              <Button
                variant="default"
                size="sm"
                onClick={onClose}
                className="w-full sm:w-auto bg-brand hover:bg-brand/95 text-xs py-1.5 h-8 font-bold cursor-pointer"
              >
                {t("scanner_btn_done")}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
