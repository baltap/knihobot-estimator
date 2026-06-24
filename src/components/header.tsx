"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { useLanguage } from "@/components/language-provider";

export default function Header() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { language, setLanguage, t } = useLanguage();

  // Initial Theme Sync & Listener (N1)
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setTheme(isDark ? "dark" : "light");

    // Listen for system preference changes
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

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface transition-colors duration-200">
      <div className="mx-auto flex h-[62px] max-w-4xl items-center justify-between gap-3 px-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-green-600 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <svg
            className="h-6 w-6"
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
          <span className="hidden sm:inline font-extrabold text-lg tracking-tight">
            {t("header_title")}
          </span>
          <span className="inline sm:hidden font-extrabold text-base tracking-tight">
            Knihobot
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {/* Navigation Tabs (N6) */}
          <nav className="flex items-center gap-0.5 rounded-full border border-line bg-surface-2 p-0.5">
            <Link
              href="/"
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                pathname === "/"
                  ? "bg-surface text-green-700 shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {t("header_estimator")}
            </Link>
            <Link
              href="/dashboard"
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                pathname === "/dashboard"
                  ? "bg-surface text-green-700 shadow-sm"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              {t("header_dashboard")}
            </Link>
          </nav>

          {/* CZ/EN Language Toggle Switch (S4) */}
          <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface-2 p-0.5 select-none">
            <button
              onClick={() => setLanguage("cs")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                language === "cs"
                  ? "bg-surface text-green-700 shadow-sm"
                  : "text-ink-faint hover:text-ink"
              }`}
            >
              CZ
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-full cursor-pointer transition-all ${
                language === "en"
                  ? "bg-surface text-green-700 shadow-sm"
                  : "text-ink-faint hover:text-ink"
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle Button (N3) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line bg-surface-2 text-ink-soft hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-green-600/40 cursor-pointer transition-colors"
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
        </div>
      </div>
    </header>
  );
}
