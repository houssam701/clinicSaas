"use server";

import { revalidatePath } from "next/cache";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";
import { toFormState } from "@/lib/patient-form";
import { readPaymentForm, type PaymentFormState } from "@/lib/finance-form";

/**
 * Server Action: recordVisitPaymentAction
 *
 * Bound to an appointment and its patient. Money received at the visit, via
 * POST /api/appointments/[id]/payment: applied to the chosen open treatment,
 * or, with none chosen, recorded as a paid visit charge.
 */
export async function recordVisitPaymentAction(
  appointmentId: string,
  patientId: string,
  _prevState: PaymentFormState,
  formData: FormData
): Promise<PaymentFormState> {
  const response = await sendApiJson(API_PATHS.appointments.payment(appointmentId), "POST", readPaymentForm(formData));

  if (response?.status === 201) {
    revalidatePath(PATHS.appointments.edit(appointmentId));
    revalidatePath(PATHS.finances.list());
    revalidatePath(PATHS.patients.detail(patientId));
    return { saved: Date.now() };
  }
  return toFormState(response, "This appointment no longer exists.");
}
