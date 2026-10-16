"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "./password-input";

export function SignupForm() {
  const [passwordMismatch, setPasswordMismatch] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (data.get("password") !== data.get("confirmPassword")) {
      setPasswordMismatch(true);
      return;
    }
    setPasswordMismatch(false);
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit} onChange={() => setPasswordMismatch(false)}>
      <div className="space-y-2">
        <label htmlFor="username" className="text-sm font-medium">Username</label>
        <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="Choose a username" className="h-11" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <PasswordInput id="password" name="password" autoComplete="new-password" placeholder="Create a password" required />
      </div>
      <div className="space-y-2">
        <label htmlFor="confirm-password" className="text-sm font-medium">Confirm password</label>
        <PasswordInput
          id="confirm-password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="Enter your password again"
          required
          aria-invalid={passwordMismatch}
          aria-describedby={passwordMismatch ? "password-error" : undefined}
        />
        {passwordMismatch && <p id="password-error" role="alert" className="text-sm text-red-400">Passwords must match.</p>}
      </div>
      <Button type="submit" className="h-11 w-full">Create account</Button>
    </form>
  );
}
