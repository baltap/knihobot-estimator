import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 p-6 font-sans dark:bg-zinc-950">
      <main className="flex w-full max-w-2xl flex-col items-center justify-center rounded-2xl border border-zinc-200/80 bg-white p-12 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        {/* Logo/Icon placeholder */}
        <div className="mb-8 flex h-16 w-16 items-center justify-center rounded-full bg-brand/10 text-brand dark:bg-brand/20">
          <svg
            className="h-8 w-8"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        <h1 className="mb-4 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          Find out what your books are worth — before you send them.
        </h1>

        <p className="mb-8 text-base text-zinc-600 dark:text-zinc-400 sm:text-lg">
          Knihobot Seller Estimator shows what your books could list for, what you&apos;ll actually receive, and flags oversupplied items upfront. Radical transparency from shelf to payout.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button size="lg" className="bg-brand text-brand-foreground hover:bg-brand/90 font-medium">
            Get Started
          </Button>
          <Button variant="outline" size="lg" className="border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 font-medium">
            How it Works
          </Button>
        </div>
      </main>
    </div>
  );
}
