"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import type { AppointmentStatus } from "@/types/appointments";

/**
 * Server Action: updateAppointmentStatusAction
 *
 * PATCH /api/appointments/[id]/status (can_edit on "Appointments"). Finished
 * appointments (completed, canceled, no-show) cannot change again.
 */
export async function updateAppointmentStatusAction(
  appointmentId: string,
  status: AppointmentStatus
): Promise<{ error?: string }> {
  const response = await sendApiJson(API_PATHS.appointments.status(appointmentId), "PATCH", { status });
  if (!response) return { error: "Network error, please try again." };
  if (response.ok) {
    revalidatePath(PATHS.appointments.list());
    return {};
  }
  const data: { error?: string } = await response.json().catch(() => ({}));
  return { error: data.error?.replace(/^Forbidden:\s*/, "") ?? "Could not update the status. Please try again." };
}
