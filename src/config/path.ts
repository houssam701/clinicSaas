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
  // ?reset=done shows "password changed, sign in"
  loginWith: (query?: QueryParams) => withQuery("/login", query),
  // Ask for a reset link by email, then choose a new password from it (?token=)
  forgotPassword: "/forgot-password",
  resetPassword: (query?: QueryParams) => withQuery("/reset-password", query),

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
  // Treatments (invoices) and the payments on them
  finances: {
    // ?status=Unpaid|Partial|Paid, ?search=, ?page=
    list: (query?: QueryParams) => withQuery("/finances", query),
    // ?patient= and ?appointment= prefill the form, ?back= is where it returns
    new: (query?: QueryParams) => withQuery("/finances/new", query),
    detail: (id: string, query?: QueryParams) => withQuery(`/finances/${segment(id)}`, query),
  },
  // Clinic-wide figures (gated by the "Reports" permission); ?from=&to= (YYYY-MM-DD) or ?range=
  reports: (query?: QueryParams) => withQuery("/reports", query),
  // A printable receipt for one payment (a page of its own, no sidebar)
  receipt: (invoiceId: string, paymentId: string) => `/receipts/${segment(invoiceId)}/${segment(paymentId)}`,
  // The clinic's own settings (Admins with the "Settings" permission); ?saved=1 shows a notice
  settings: (query?: QueryParams) => withQuery("/settings", query),
  // ?password=changed shows the "password changed" notice
  account: (query?: QueryParams) => withQuery("/account", query),
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
    account: (query?: QueryParams) => withQuery("/platform/account", query),
    users: {
      list: (query?: QueryParams) => withQuery("/platform/users", query),
      // ?clinic_id= preselects the clinic (e.g. from "Clinics without an admin")
      new: (query?: QueryParams) => withQuery("/platform/users/new", query),
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
    // The signed-in user changes their own password (needs the current one)
    password: "/api/auth/password",
    // POST { email }: send a reset link; GET ?token=: is the link still valid
    passwordReset: (query?: QueryParams) => withQuery("/api/auth/password-reset", query),
    // POST { token, new_password }
    passwordResetConfirm: "/api/auth/password-reset/confirm",
  },
  users: {
    list: (query?: QueryParams) => withQuery("/api/users", query),
    detail: (id: string) => `/api/users/${segment(id)}`,
    permissions: (id: string) => `/api/users/${segment(id)}/permissions`,
    permission: (id: string, permissionId: string) =>
      `/api/users/${segment(id)}/permissions/${segment(permissionId)}`,
  },
  adminUsers: "/api/admin/users",
  // The caller's own clinic (GET / PATCH), gated by "Settings"
  myClinic: "/api/clinic",
  // The SuperAdmin's platform overview
  platform: {
    overview: "/api/platform/overview",
  },
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
  invoices: {
    list: (query?: QueryParams) => withQuery("/api/invoices", query),
    // ?from=<instant>: what is still owed, and what was collected since then
    summary: (query?: QueryParams) => withQuery("/api/invoices/summary", query),
    detail: (id: string) => `/api/invoices/${segment(id)}`,
    payments: (id: string) => `/api/invoices/${segment(id)}/payments`,
    payment: (id: string, paymentId: string) => `/api/invoices/${segment(id)}/payments/${segment(paymentId)}`,
  },
  // ?from=&to= (YYYY-MM-DD, clinic days, both included)
  reports: (query?: QueryParams) => withQuery("/api/reports", query),
  appointments: {
    list: (query?: QueryParams) => withQuery("/api/appointments", query),
    detail: (id: string) => `/api/appointments/${segment(id)}`,
    status: (id: string) => `/api/appointments/${segment(id)}/status`,
    staff: "/api/appointments/staff",
    // Money received during this appointment
    payment: (id: string) => `/api/appointments/${segment(id)}/payment`,
    // The payments taken at this appointment
    payments: (id: string) => `/api/appointments/${segment(id)}/payments`,
  },
} as const;
