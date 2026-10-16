import bcrypt from "bcrypt";

// Higher values make hashing slower and more expensive to guess.
const SALT_ROUNDS = 12;
const MAX_PASSWORD_BYTES = 72;

function isSupportedPassword(password: string): boolean {
  const bytes = Buffer.byteLength(password, "utf8");
  return bytes > 0 && bytes <= MAX_PASSWORD_BYTES;
}

export async function hashPassword(password: string): Promise<string> {
  if (!isSupportedPassword(password)) {
    throw new Error("Password must be between 1 and 72 UTF-8 bytes.");
  }

  // Bcrypt generates a fresh random salt and includes it in the returned hash.
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  if (!isSupportedPassword(password)) return false;

  return bcrypt.compare(password, passwordHash);
}
