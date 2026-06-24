import type { Metadata } from "next";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { AnalyticsProvider } from "@/components/analytics-provider";

import { LanguageProvider } from "@/components/language-provider";

// Interface typeface — full Czech diacritic coverage via latin-ext.
const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

// Editorial / figures typeface — Source Serif 4 with latin-ext for Czech.
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Knihobot Book Value Estimator",
  description:
    "Find out what your books are worth and what you'll actually receive, before you send them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${hankenGrotesk.variable} ${sourceSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (saved === 'dark' || (!saved && systemDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <LanguageProvider>
          <AnalyticsProvider>{children}</AnalyticsProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
