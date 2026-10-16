"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";
import { signupSchema } from "@/schemas/auth";

export function SignupForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const validation = signupSchema.safeParse(Object.fromEntries(data));
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }
    setError(null);
    setPending(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validation.data),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(
          typeof result?.error === "string"
            ? result.error
            : "Unable to create your account. Please try again.",
        );
        return;
      }
      router.push("/login?signup=success");
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
      <fieldset disabled={pending} className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="username" className="text-sm font-medium">Username</label>
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Choose a username"
            className="h-11"
            minLength={3}
            maxLength={32}
            aria-describedby="username-hint"
            required
          />
          <p id="username-hint" className="text-xs text-muted-foreground">
            3–32 letters, numbers, underscores, or hyphens.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            placeholder="Create a password"
            minLength={8}
            aria-describedby="password-hint"
            required
          />
          <p id="password-hint" className="text-xs text-muted-foreground">
            At least 8 characters; up to 72 bytes.
          </p>
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</label>
          <PasswordInput
            id="confirm-password"
            name="confirmPassword"
            autoComplete="new-password"
            placeholder="Enter your password again"
            required
          />
        </div>
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={pending}>
          {pending ? "Creating account…" : "Create account"}
        </Button>
      </fieldset>
    </form>
  );
}
