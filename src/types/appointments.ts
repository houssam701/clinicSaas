import { z } from "zod";
import type { FieldOutputTypes } from "../prisma/generated/contract";

// ─── DB Model — derived directly from Prisma 8 generated contract ──────────────
export type AppointmentModel = FieldOutputTypes["public"]["Appointment"];

// ─── Enum (mirrors contract.prisma) ───────────────────────────────────────────
export enum AppointmentStatus {
  Scheduled = "Scheduled",
  Completed  = "Completed",
  Canceled   = "Canceled",
  NoShow     = "NoShow",
}

// ─── Zod Schemas ───────────────────────────────────────────────────────────────

export const CreateAppointmentSchema = z.object({
  clinic_id:        z.string().uuid("Invalid clinic_id format"),
  patient_id:       z.string().uuid("Invalid patient_id format"),
  user_id:          z.string().uuid("Invalid user_id format").optional(),
  scheduled_time:   z.string().datetime({ message: "scheduled_time must be a valid ISO-8601 datetime" }),
  duration_minutes: z.number().int().min(1).default(30),
  reason_for_visit: z.string().optional(),
});

export const UpdateAppointmentSchema = z
  .object({
    patient_id:       z.string().uuid().optional(),
    user_id:          z.string().uuid().optional().nullable(),
    scheduled_time:   z.string().datetime({ message: "scheduled_time must be a valid ISO-8601 datetime" }).optional(),
    duration_minutes: z.number().int().min(1).optional(),
    reason_for_visit: z.string().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: "At least one field must be provided for update",
  });

export const AppointmentStatusUpdateSchema = z.object({
  status: z.nativeEnum(AppointmentStatus),
});

export const ListAppointmentsQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(200).default(20),
  clinic_id:  z.string().uuid().optional(),
  patient_id: z.string().uuid().optional(),
  user_id:    z.string().uuid().optional(),
  status:     z.nativeEnum(AppointmentStatus).optional(),
  from:       z.string().optional(), // ISO-8601 date-time
  to:         z.string().optional(), // ISO-8601 date-time
});

// ─── Inferred Types ────────────────────────────────────────────────────────────
export type CreateAppointmentInput        = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput        = z.infer<typeof UpdateAppointmentSchema>;
export type AppointmentStatusUpdateInput  = z.infer<typeof AppointmentStatusUpdateSchema>;
export type ListAppointmentsQueryInput    = z.infer<typeof ListAppointmentsQuerySchema>;

// ─── Repository Data Shapes ────────────────────────────────────────────────────
export type CreateAppointmentData = {
  clinic_id:        string;
  patient_id:       string;
  user_id?:         string;
  scheduled_time:   string;
  duration_minutes: number;
  reason_for_visit?: string;
};

export type UpdateAppointmentData = {
  patient_id?:       string;
  user_id?:          string | null;
  scheduled_time?:   string;
  duration_minutes?: number;
  reason_for_visit?: string;
};

export type UpdateAppointmentStatusData = {
  status: AppointmentStatus;
};
