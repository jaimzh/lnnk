import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/request";
import { loginRateLimit } from "@/lib/ratelimit";
import { User } from "@/models/UserSchema";
import { loginSchema } from "@/schemas/auth";

export const runtime = "nodejs";

// Do a bcrypt comparison even for unknown usernames to reduce timing differences.
const DUMMY_PASSWORD_HASH = "$2b$12$ORDKUPiWPCL/upZsUWYiXu5/68OshvAsqD3bOPW1XL/z/TJUBCOVW";
const INVALID_CREDENTIALS = "Invalid username or password.";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Please send valid JSON." }, { status: 400 });
  }
  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 400 });
  }

  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")?.trim()
      || "anonymous";
    const { success, reset } = await loginRateLimit.limit(`ip:${ip}`);
    if (!success) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.max(1, Math.ceil((reset - Date.now()) / 1000))) },
        },
      );
    }

    await dbConnect();
    const { username, password } = validation.data;
    const user = await User.findOne({ username }).select("+passwordHash");
    const matches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!user || !matches) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    await createSession(user._id);
    return NextResponse.json({ message: "Logged in." }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Login failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json(
      { error: "Login is temporarily unavailable. Please try again later." },
      { status: 503 },
    );
  }
}
