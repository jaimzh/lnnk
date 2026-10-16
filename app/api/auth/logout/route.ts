import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/lib/auth/session";
import { isSameOrigin } from "@/lib/auth/request";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }
  try {
    await deleteSession();
    return NextResponse.json({ message: "Logged out." }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Logout failed:", error instanceof Error ? error.name : "Unknown error");
    return NextResponse.json(
      { error: "Couldn't log out. Please try again." },
      { status: 503 },
    );
  }
}
