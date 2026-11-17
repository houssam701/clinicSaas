import { createHash, randomBytes } from "node:crypto";

/** A new reset token: 32 random bytes, URL-safe. Only its hash is stored. */
export function newResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: hashResetToken(token) };
}

/** SHA-256 of a token (enough for 256 random bits; no salt or slow hash needed). */
export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
