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
    <header className="border-b border-zinc-200/80 bg-white/70 backdrop-blur-md sticky top-0 z-40 dark:border-zinc-800/80 dark:bg-zinc-950/70 transition-all duration-200">
      <div className="mx-auto flex max-w-4xl h-16 items-center justify-between px-6">
        <Link 
          href="/" 
          className="flex items-center gap-2 font-bold text-brand dark:text-brand-foreground text-lg cursor-pointer hover:opacity-90 transition-opacity"
        >
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
          <span className="hidden sm:inline">{t("header_title")}</span>
          <span className="inline sm:hidden text-base">Knihobot</span>
        </Link>

        <div className="flex items-center gap-4">
          {/* Navigation Tabs (N6) */}
          <nav className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/50">
            <Link
              href="/"
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                pathname === "/"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {t("header_estimator")}
            </Link>
            <Link
              href="/dashboard"
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                pathname === "/dashboard"
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
              }`}
            >
              {t("header_dashboard")}
            </Link>
          </nav>

          {/* CZ/EN Language Toggle Switch (S4) */}
          <div className="flex items-center gap-1 border border-zinc-200 dark:border-zinc-800 rounded-lg p-0.5 text-[9px] font-bold bg-zinc-50 dark:bg-zinc-900 select-none">
            <button
              onClick={() => setLanguage("cs")}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                language === "cs"
                  ? "bg-brand text-white dark:bg-emerald-600"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              CZ
            </button>
            <button
              onClick={() => setLanguage("en")}
              className={`px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                language === "en"
                  ? "bg-brand text-white dark:bg-emerald-600"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
              }`}
            >
              EN
            </button>
          </div>

          {/* Theme Toggle Button (N3) */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
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
          
          <div className="hidden md:block text-[10px] text-zinc-500 dark:text-zinc-400 font-mono select-none">
            {t("header_demo_mode")}
          </div>
        </div>
      </div>
    </header>
  );
}
