/**
 * Time-zone helpers. Appointments are stored in UTC and shown in the clinic's
 * IANA time zone (Clinic.timezone), so server rendering never depends on the
 * server's own zone. Pure functions on Intl, no dependency.
 */

export const DEFAULT_TIME_ZONE = "UTC";

/** True for a zone Intl knows, e.g. "Asia/Beirut" or "UTC". */
export function isValidTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}

/** Every IANA zone the runtime supports, for a picker. */
export function listTimeZones(): string[] {
  const all = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return all.includes("UTC") ? all : ["UTC", ...all];
}

/** The calendar date and wall-clock time of `instant` in `zone`. */
export function zonedParts(instant: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`, // YYYY-MM-DD
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    second: Number(get("second")),
    weekday: get("weekday"), // "Mon"
  };
}

/** Minutes the zone is ahead of UTC at `instant` (Beirut in winter: 120). */
function offsetMinutes(instant: Date, zone: string): number {
  const p = zonedParts(instant, zone);
  const [y, m, d] = p.date.split("-").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

/**
 * The UTC instant for a wall-clock date and time in `zone`:
 * ("2026-11-09", "09:30", "Asia/Beirut") → 2026-11-09T07:30:00.000Z.
 * Handles daylight-saving changes (a time skipped by DST moves forward).
 */
export function zonedTimeToUtc(date: string, time: string, zone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const first = naive - offsetMinutes(new Date(naive), zone) * 60000;
  const second = naive - offsetMinutes(new Date(first), zone) * 60000;
  // Normally both agree. Around a DST change keep the one that shows the
  // requested time; a time that does not exist (skipped hour) moves forward.
  const shows = (t: number) => {
    const p = zonedParts(new Date(t), zone);
    return p.date === date && p.hour === hh && p.minute === mm;
  };
  if (shows(second)) return new Date(second);
  if (shows(first)) return new Date(first);
  return new Date(Math.max(first, second));
}

/** Today's date (YYYY-MM-DD) in `zone`. */
export const todayIn = (zone: string, now = new Date()) => zonedParts(now, zone).date;

/** Adds days to a YYYY-MM-DD date (calendar arithmetic, no zone involved). */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Monday of the week containing `date` (YYYY-MM-DD). */
export function startOfWeek(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = Sunday
  return addDays(date, -((weekday + 6) % 7));
}

/** True for a well-formed YYYY-MM-DD calendar date. */
export function isIsoDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

/** "Mon 9 Nov" / "Monday, 9 November 2026" for a YYYY-MM-DD date. */
export function formatDay(date: string, style: "short" | "long" = "short"): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    ...(style === "short"
      ? { weekday: "short", day: "numeric", month: "short" }
      : { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
  });
}

/** "09:30" for an instant in `zone`. */
export function formatTime(instant: Date | string, zone: string): string {
  const p = zonedParts(typeof instant === "string" ? new Date(instant) : instant, zone);
  return `${String(p.hour).padStart(2, "0")}:${String(p.minute).padStart(2, "0")}`;
}
