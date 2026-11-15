import { z } from "../lib/zod";
import { isIsoDate } from "../lib/time-zone";
import type { PaymentMethod } from "./invoices";
import type { AppointmentStatus } from "./appointments";

/** The longest period one report may cover (two years plus a leap day). */
export const MAX_REPORT_DAYS = 731;

const DaySchema = z.string().refine((v) => isIsoDate(v), { error: "Use a date like 2026-01-31." });

/** GET /api/reports: a period in the clinic's calendar, both days included. */
export const ReportQuerySchema = z
  .object({
    from: DaySchema,
    to: DaySchema,
    clinic_id: z.string().uuid().optional(),
  })
  .refine((q) => q.from <= q.to, { error: "The start date must be on or before the end date.", path: ["to"] })
  .refine((q) => (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000 < MAX_REPORT_DAYS, {
    error: "Choose a period of two years or less.",
    path: ["to"],
  });

export type ReportQuery = z.infer<typeof ReportQuerySchema>;

/** Money and work done by one admin (user null: money taken outside a visit or at an unassigned one). */
export interface ReportProviderRow {
  user: { id: string; first_name: string; last_name: string } | null;
  /** "unassigned" = at a visit nobody held; "no_visit" = recorded on a treatment directly */
  kind: "admin" | "unassigned" | "no_visit";
  collected: string;
  appointments: number;
  completed: number;
  no_show: number;
}

export interface ClinicReport {
  from: string;
  to: string;
  /** Money received in the period */
  collected: { total: string; count: number; by_method: { method: PaymentMethod; amount: string; count: number }[] };
  /** Cost of the treatments added in the period */
  billed: string;
  /** Still owed on open treatments today (not tied to the period) */
  outstanding: string;
  new_patients: number;
  appointments: { total: number; by_status: Record<AppointmentStatus, number> };
  /** The 12 months ending with the period's last month, oldest first ("2026-11") */
  months: { month: string; collected: string }[];
  providers: ReportProviderRow[];
}
