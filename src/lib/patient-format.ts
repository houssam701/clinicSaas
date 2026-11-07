/**
 * Display helpers for patient pages. Pure functions, no React, no IO.
 */

type Named = { first_name: string; last_name: string };

export const patientName = (p: Named) => `${p.first_name} ${p.last_name}`;

export const patientInitials = (p: Named) =>
  `${p.first_name[0] ?? ""}${p.last_name[0] ?? ""}`.toUpperCase();

/** "15 Jun 1985" from a YYYY-MM-DD date or an ISO timestamp. */
export function formatDate(value: string, month: "short" | "long" = "short"): string {
  // A bare date is read as UTC midnight, so format it in UTC to keep the same day
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : new Date(value);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month,
    year: "numeric",
    ...(value.length === 10 ? { timeZone: "UTC" } : {}),
  });
}

/** Age in whole years on `today` for a YYYY-MM-DD date of birth. */
export function ageFrom(dateOfBirth: string, today = new Date()): number {
  const [y, m, d] = dateOfBirth.slice(0, 10).split("-").map(Number);
  let age = today.getFullYear() - y;
  const beforeBirthday = today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}
