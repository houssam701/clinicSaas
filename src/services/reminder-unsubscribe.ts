import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signed "stop reminder emails" links. The link names a patient and carries
 * a signature only the server can make, so nobody can opt someone else out
 * by guessing ids. The key is derived from the app's secret for this single
 * purpose (a leaked link signs nothing else). Links do not expire: an
 * unsubscribe link should keep working.
 */
function key(): Buffer {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!secret) throw new Error("NEXTAUTH_SECRET is required to sign unsubscribe links.");
  return createHmac("sha256", secret).update("appointment-reminder-unsubscribe:v1").digest();
}

/** The signature for a patient's unsubscribe link. */
export function unsubscribeSignature(patientId: string): string {
  return createHmac("sha256", key()).update(patientId).digest("base64url");
}

/** True when `signature` was made for `patientId` (constant-time comparison). */
export function isValidUnsubscribe(patientId: string, signature: string): boolean {
  if (!patientId || !signature || signature.length > 100) return false;
  const expected = Buffer.from(unsubscribeSignature(patientId));
  const given = Buffer.from(signature);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
