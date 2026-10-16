"use client";

import { Button } from "@/components/ui/button";

export default function DashboardError({ reset }: { reset: () => void }) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-xl font-semibold">Dashboard temporarily unavailable</h1>
      <p className="text-sm text-muted-foreground">We couldn&apos;t load your account. Please try again.</p>
      <Button onClick={reset}>Try again</Button>
    </main>
  );
}
