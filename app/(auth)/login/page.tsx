import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/features/auth/login-form";
import { AuthCard } from "@/components/features/auth/auth-card";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to manage your Lnnk projects, API keys, and images.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthCard title="Welcome back" description="Log in to manage your projects, API keys, and images.">
      <LoginForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
