import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { signupRateLimit } from "@/lib/ratelimit";
import { User } from "@/models/UserSchema";
import { signupSchema } from "@/schemas/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send valid JSON." }, { status: 400 });
  }

  const validation = signupSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: validation.error.issues[0].message },
      { status: 400 },
    );
  }

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")?.trim()
      || "anonymous";
    const { success, reset } = await signupRateLimit.limit(`ip:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many signup attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) },
        },
      );
    }

    await dbConnect();
    const { username, password } = validation.data;
    if (await User.exists({ username })) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    await User.create({ username, passwordHash });

    // Return an explicit response, never the document containing the hash.
    return NextResponse.json({ message: "Account created. You can now log in." }, { status: 201 });
  } catch (error) {
    // The unique index also handles simultaneous signups for the same username.
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      return NextResponse.json({ error: "Username is already taken." }, { status: 409 });
    }
    console.error("Signup failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json(
      { error: "Account creation is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
