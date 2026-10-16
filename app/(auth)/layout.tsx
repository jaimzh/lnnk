import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate flex min-h-svh flex-col bg-bg-base/30 px-5 py-8 sm:px-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[36rem] w-[min(48rem,140vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--accent)_0%,transparent_70%)] opacity-50 blur-[100px]" />
      </div>
      <Link
        href="/"
        aria-label="Lnnk home"
        className="w-fit rounded-sm text-2xl font-bold tracking-tighter outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring"
      >
        lnnk<span className="text-primary">.</span>
      </Link>
      <div className="flex flex-1 flex-col items-center justify-center py-12">
        <div className="w-full max-w-sm space-y-6">
          {children}
          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-sm text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to Lnnk
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
