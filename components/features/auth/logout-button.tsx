"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function logout() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
      router.replace("/login");
      router.refresh();
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" onClick={logout} disabled={pending}>
        {pending ? "Logging out…" : "Log out"}
      </Button>
      {error && <p role="alert" className="text-sm text-red-400">Couldn&apos;t log out. Please try again.</p>}
    </div>
  );
}
