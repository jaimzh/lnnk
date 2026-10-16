import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderKey } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/features/auth/logout-button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
  alternates: { canonical: "/dashboard" },
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="relative mx-auto min-h-svh w-full max-w-5xl px-5 py-8 sm:px-8">
      <header className="flex items-center justify-between gap-4">
        <Link href="/" aria-label="Lnnk home" className="rounded-sm text-2xl font-bold tracking-tighter focus-visible:outline-2 focus-visible:outline-ring">
          lnnk<span className="text-accent">.</span>
        </Link>
        <LogoutButton />
      </header>
      <div className="py-12 sm:py-16">
        <p className="mb-2 text-sm text-muted-foreground">Signed in as {user.username}</p>
        <h1 className="text-3xl font-semibold tracking-tight">Your projects</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Manage the apps using Lnnk for URL shortening and image sharing.
        </p>
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <FolderKey className="mb-1 size-8 text-accent" aria-hidden="true" />
            <h2 className="font-medium">No projects yet</h2>
            <p className="text-sm text-muted-foreground">Your projects will appear here.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
