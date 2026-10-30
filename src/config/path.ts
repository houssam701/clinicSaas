/**
 * Single source of truth for every URL in the app.
 *
 * Never write a path literal ("/platform/users", "/api/clinics", ...) in a
 * component, page, action or config: add it here and import it.
 *   - PATHS:     pages the user navigates to (href, redirect, revalidatePath)
 *   - API_PATHS: internal API routes (sendApiJson, serverApiFetch)
 *
 * Paths with an id or filters are functions, so ids are always encoded and
 * empty filters are dropped.
 */

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

/** Appends the non-empty query params to a path: ("/x", { a: "1", b: "" }) → "/x?a=1". */
export function withQuery(path: string, query?: QueryParams): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

const segment = (id: string) => encodeURIComponent(id);

// ─── Pages ────────────────────────────────────────────────────────────────────

export const PATHS = {
  home: "/",
  login: "/login",

  // Clinic workspace (Admin / Staff)
  dashboard: "/dashboard",
  appointments: "/appointments",
  patients: "/patients",
  doctors: "/doctors",
  messages: "/messages",
  reviews: "/reviews",
  finances: "/finances",
  settings: "/settings",
  emergency: "/emergency",

  // Platform administration (SuperAdmin)
  platform: {
    dashboard: "/platform/dashboard",
    clinics: "/platform/clinics",
    settings: "/platform/settings",
    users: {
      list: (query?: QueryParams) => withQuery("/platform/users", query),
      new: "/platform/users/new",
      edit: (id: string) => `/platform/users/${segment(id)}/edit`,
    },
  },
} as const;

// ─── API routes ───────────────────────────────────────────────────────────────

export const API_PATHS = {
  auth: {
    login: "/api/auth/login",
    logout: "/api/auth/logout",
    me: "/api/auth/me",
  },
  users: {
    list: (query?: QueryParams) => withQuery("/api/users", query),
    detail: (id: string) => `/api/users/${segment(id)}`,
    permissions: (id: string) => `/api/users/${segment(id)}/permissions`,
    permission: (id: string, permissionId: string) =>
      `/api/users/${segment(id)}/permissions/${segment(permissionId)}`,
  },
  adminUsers: "/api/admin/users",
  clinics: {
    list: (query?: QueryParams) => withQuery("/api/clinics", query),
    detail: (id: string) => `/api/clinics/${segment(id)}`,
  },
  patients: {
    list: (query?: QueryParams) => withQuery("/api/patients", query),
    detail: (id: string) => `/api/patients/${segment(id)}`,
    medicalHistory: (id: string) => `/api/patients/${segment(id)}/medical-history`,
    documents: (id: string, query?: QueryParams) =>
      withQuery(`/api/patients/${segment(id)}/documents`, query),
    document: (id: string, documentId: string) =>
      `/api/patients/${segment(id)}/documents/${segment(documentId)}`,
  },
  appointments: {
    list: (query?: QueryParams) => withQuery("/api/appointments", query),
    detail: (id: string) => `/api/appointments/${segment(id)}`,
    status: (id: string) => `/api/appointments/${segment(id)}/status`,
  },
} as const;
