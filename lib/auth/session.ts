import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Types } from "mongoose";
import dbConnect from "@/lib/db";
import { Session } from "@/models/SessionSchema";
import { User } from "@/models/UserSchema";

const SESSION_COOKIE_NAME = "lnnk_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type CurrentUser = { id: string; username: string };

function hashToken(token: string): string {
  // Random tokens have high entropy; unlike passwords, they don't need bcrypt.
  return createHash("sha256").update(token).digest("hex");
}

function isSessionToken(token: string | undefined): token is string {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
}

// Cookie writes must run inside a Route Handler or Server Action.
export async function createSession(userId: Types.ObjectId): Promise<void> {
  const cookieStore = await cookies();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await dbConnect();
  const session = await Session.create({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  try {
    cookieStore.set(SESSION_COOKIE_NAME, token, { ...cookieOptions(), expires: expiresAt });
  } catch (error) {
    // Don't leave a new session behind if its cookie couldn't be delivered.
    await Session.deleteOne({ _id: session._id });
    throw error;
  }
}

// Read-only, so protected Server Components can use this too.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!isSessionToken(token)) return null;

  await dbConnect();
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    // TTL cleanup is asynchronous. Expired records must never grant access.
    expiresAt: { $gt: new Date() },
  }).select("userId").lean();
  if (!session) return null;

  const user = await User.findById(session.userId).select("_id username").lean();
  if (!user) return null;

  return { id: user._id.toString(), username: user.username };
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (isSessionToken(token)) {
    await dbConnect();
    await Session.deleteOne({ tokenHash: hashToken(token) });
  }

  cookieStore.set(SESSION_COOKIE_NAME, "", {
    ...cookieOptions(),
    expires: new Date(0),
    maxAge: 0,
  });
}
