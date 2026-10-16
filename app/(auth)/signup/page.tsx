import type { Metadata } from "next";
import Link from "next/link";

import { SignupForm } from "@/components/features/auth/signup-form";
import { AuthCard } from "@/components/features/auth/auth-card";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Lnnk account to manage projects, API keys, and images.",
  alternates: { canonical: "/signup" },
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthCard title="Create your account" description="A home for your projects, API keys, and images.">
      <SignupForm />
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="rounded-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
