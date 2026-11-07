import { z } from "../lib/zod";
import { PaginationQuerySchema } from "./pagination";
import type { FieldOutputTypes } from "../prisma/generated/contract";

// ─── DB Model — derived directly from Prisma 8 generated contract ──────────────
export type AppointmentModel = FieldOutputTypes["public"]["Appointment"];

/** A person shown on an appointment (the patient or the assigned staff member). */
export type AppointmentPerson = { id: string; first_name: string; last_name: string };

/** An appointment with the names a calendar or list needs. */
export type AppointmentWithPeople = AppointmentModel & {
  patient: AppointmentPerson | null;
  staff: AppointmentPerson | null;
};

/** An Admin appointments can be held with (GET /api/appointments/staff). */
export type AppointmentStaffMember = AppointmentPerson & { role: string };

// ─── Enum (mirrors contract.prisma) ───────────────────────────────────────────
export enum AppointmentStatus {
  Scheduled = "Scheduled",
  Completed  = "Completed",
  Canceled   = "Canceled",
  NoShow     = "NoShow",
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  [AppointmentStatus.Scheduled]: "Scheduled",
  [AppointmentStatus.Completed]: "Completed",
  [AppointmentStatus.Canceled]: "Canceled",
  [AppointmentStatus.NoShow]: "No-show",
};

/** Only scheduled appointments hold a slot; canceled and no-show ones free it. */
export const SLOT_HOLDING_STATUSES = [AppointmentStatus.Scheduled] as const;

/** Durations offered by the form, in minutes. */
export const DURATION_OPTIONS = [15, 20, 30, 45, 60, 90, 120] as const;

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

/** An ISO-8601 instant with its offset ("2026-11-09T07:30:00Z" or "...+02:00"). */
const InstantSchema = z.iso.datetime({ offset: true, error: "Choose a valid date and time." });

const DurationSchema = z
  .number()
  .int()
  .min(5, "Duration must be at least 5 minutes.")
  .max(600, "Duration must be at most 10 hours.");

const ReasonSchema = z.string().trim().max(500, "Reason must be at most 500 characters.");

/**
 * clinic_id is only read for the SuperAdmin; Admin and Staff always book in
 * their own clinic. patient_id and user_id must belong to that clinic.
 */
export const CreateAppointmentSchema = z.object({
  clinic_id:        z.string().uuid("Please select a valid clinic.").optional(),
  patient_id:       z.string().uuid("Choose a patient."),
  user_id:          z.string().uuid("Choose a valid staff member.").nullable().optional(),
  scheduled_time:   InstantSchema,
  duration_minutes: DurationSchema.default(30),
  reason_for_visit: ReasonSchema.nullable().optional(),
});

export const UpdateAppointmentSchema = z
  .object({
    patient_id:       z.string().uuid("Choose a patient.").optional(),
    user_id:          z.string().uuid("Choose a valid staff member.").nullable().optional(),
    scheduled_time:   InstantSchema.optional(),
    duration_minutes: DurationSchema.optional(),
    reason_for_visit: ReasonSchema.nullable().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "Change at least one field before saving.",
  });

export const AppointmentStatusUpdateSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const ListAppointmentsQuerySchema = PaginationQuerySchema.extend({
  clinic_id:  z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  /** A staff member's id, or "unassigned" for appointments without one */
  user_id:    z.union([z.string().uuid(), z.literal("unassigned")]).optional(),
  status:     z.nativeEnum(AppointmentStatus).optional(),
  /** Words matched against the patient (name, phone, email), the admin's name and the reason */
  search:     z.string().trim().max(100).optional(),
  /** Starts at or after this instant */
  from:       InstantSchema.optional(),
  /** Starts before this instant */
  to:         InstantSchema.optional(),
  /** Earliest first (calendar, upcoming) or latest first (history) */
  sort:       z.enum(["asc", "desc"]).default("asc"),
}).refine((q) => !q.from || !q.to || new Date(q.from) < new Date(q.to), {
  message: "The end of the range must be after its start.",
  path: ["to"],
});

// ─── Inferred Types ────────────────────────────────────────────────────────────
export type CreateAppointmentInput        = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput        = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentStatusUpdateInput  = z.infer<typeof AppointmentStatusUpdateSchema>;
export type ListAppointmentsQueryInput    = z.infer<typeof ListAppointmentsQuerySchema>;

// ─── Repository Data Shapes ────────────────────────────────────────────────────
export type CreateAppointmentData = {
  clinic_id:         string;
  patient_id:        string;
  user_id?:          string | null;
  scheduled_time:    string;
  duration_minutes:  number;
  reason_for_visit?: string | null;
};

export type UpdateAppointmentData = {
  patient_id?:       string;
  user_id?:          string | null;
  scheduled_time?:   string;
  duration_minutes?: number;
  reason_for_visit?: string | null;
};

export type UpdateAppointmentStatusData = {
  status: AppointmentStatus;
};
