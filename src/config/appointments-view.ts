/** The two ways to look at appointments; both show the same period and filters. */
export type AppointmentsView = "calendar" | "list";

/** Period shown: one day, one week, or (list only) everything from now on / before now. */
export type AppointmentsMode = "day" | "week" | "upcoming" | "past";

/** Cookie that remembers each user's last view, so the menu link reopens it. */
export const VIEW_COOKIE = "appointments_view";

export const isView = (v: string | undefined): v is AppointmentsView => v === "calendar" || v === "list";

/** Calendar loads one period at once; above this it asks to filter. */
export const CALENDAR_LIMIT = 200;

/** Rows per page in the list view. */
export const LIST_PAGE_SIZE = 25;

/**
 * The page a form returns to, from its ?back= param: only paths inside
 * /appointments are accepted (no open redirect), otherwise the default.
 */
export function safeAppointmentsBack(back: string | undefined, fallback: string): string {
  if (!back || !back.startsWith("/appointments") || back.startsWith("//") || back.includes("\\")) return fallback;
  return back;
}

/** Adds ?saved=1 to a back path, so the page shows "Appointment saved." */
export function withSavedNotice(path: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}saved=1`;
}
