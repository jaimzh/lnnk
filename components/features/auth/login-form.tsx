"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(data)),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(
          typeof result?.error === "string"
            ? result.error
            : "Unable to log in. Please try again.",
        );
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Couldn't reach Lnnk. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit}
      onChange={() => setError(null)}
      aria-busy={pending}
    >
      <fieldset className="space-y-5" disabled={pending}>
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Enter your username"
            className="h-11"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </Button>
      </fieldset>
    </form>
  );
}
