/**
 * The one stored form of an account email: trimmed and lowercase. People do
 * not remember how they capitalised their address, so "Ana@Clinic.com" and
 * "ana@clinic.com" must be the same account for sign-in and password reset.
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
