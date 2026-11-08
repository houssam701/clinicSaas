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
  appointments: {
    // ?view=calendar|list, ?mode=day|week, ?date=YYYY-MM-DD, ?staff=, ?status=, ?page=
    list: (query?: QueryParams) => withQuery("/appointments", query),
    // ?date=, ?time=HH:MM, ?staff=, ?patient= prefill the form
    new: (query?: QueryParams) => withQuery("/appointments/new", query),
    edit: (id: string, query?: QueryParams) => withQuery(`/appointments/${segment(id)}/edit`, query),
  },
  patients: {
    list: (query?: QueryParams) => withQuery("/patients", query),
    new: "/patients/new",
    detail: (id: string, query?: QueryParams) => withQuery(`/patients/${segment(id)}`, query),
    edit: (id: string) => `/patients/${segment(id)}/edit`,
  },
  doctors: "/doctors",
  finances: "/finances",
  account: "/account",
  // An Admin's own Staff and Admins (gated by the "Staff" / "Admins" permissions)
  team: {
    list: (query?: QueryParams) => withQuery("/team", query),
    new: "/team/new",
    edit: (id: string) => `/team/${segment(id)}/edit`,
    access: (id: string) => `/team/${segment(id)}/access`,
  },

  // Platform administration (SuperAdmin)
  platform: {
    dashboard: "/platform/dashboard",
    clinics: {
      list: (query?: QueryParams) => withQuery("/platform/clinics", query),
      new: "/platform/clinics/new",
      edit: (id: string) => `/platform/clinics/${segment(id)}/edit`,
    },
    account: "/platform/account",
    users: {
      list: (query?: QueryParams) => withQuery("/platform/users", query),
      new: "/platform/users/new",
      edit: (id: string) => `/platform/users/${segment(id)}/edit`,
      access: (id: string) => `/platform/users/${segment(id)}/access`,
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
    // Step 1 of an upload: returns a short-lived link to PUT the file to
    documentUploadUrl: (id: string) => `/api/patients/${segment(id)}/documents/upload-url`,
    // Opens (or with { download: 1 } saves) a document; redirects to a short-lived link
    documentFile: (id: string, documentId: string, query?: QueryParams) =>
      withQuery(`/api/patients/${segment(id)}/documents/${segment(documentId)}/file`, query),
  },
  appointments: {
    list: (query?: QueryParams) => withQuery("/api/appointments", query),
    detail: (id: string) => `/api/appointments/${segment(id)}`,
    status: (id: string) => `/api/appointments/${segment(id)}/status`,
    staff: "/api/appointments/staff",
  },
} as const;
