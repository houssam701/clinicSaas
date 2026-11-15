import { addDays, isIsoDate } from "./time-zone";
import { MAX_REPORT_DAYS } from "../types/reports";

export type ReportPreset = "this-month" | "last-month" | "last-3-months" | "this-year";

export const REPORT_PRESETS: { id: ReportPreset; label: string }[] = [
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "last-3-months", label: "Last 3 months" },
  { id: "this-year", label: "This year" },
];

/** First day of the month `offset` months from the month of `date` (YYYY-MM-DD). */
export function monthStart(date: string, offset = 0): string {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 10);
}

function presetRange(preset: ReportPreset, today: string): { from: string; to: string } {
  switch (preset) {
    case "last-month":
      return { from: monthStart(today, -1), to: addDays(monthStart(today), -1) };
    case "last-3-months":
      return { from: monthStart(today, -2), to: today };
    case "this-year":
      return { from: `${today.slice(0, 4)}-01-01`, to: today };
    default:
      return { from: monthStart(today), to: today };
  }
}

/**
 * The period a report shows, from the page's query: a valid custom
 * ?from=&to= wins, then ?range=, then this month. Bad or reversed dates,
 * or a period over the limit, fall back to the preset.
 */
export function resolveReportRange(
  params: { range?: string; from?: string; to?: string },
  today: string
): { from: string; to: string; preset: ReportPreset | null } {
  const { from, to } = params;
  if (isIsoDate(from) && isIsoDate(to) && from <= to && (Date.parse(to) - Date.parse(from)) / 86_400_000 < MAX_REPORT_DAYS) {
    return { from, to, preset: null };
  }
  const preset = REPORT_PRESETS.some((p) => p.id === params.range) ? (params.range as ReportPreset) : "this-month";
  return { ...presetRange(preset, today), preset };
}

/** "Nov 2026" for "2026-11". */
export function formatMonth(month: string, style: "short" | "long" = "short"): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    month: style === "short" ? "short" : "long",
    ...(style === "long" ? { year: "numeric" } : {}),
  });
}
