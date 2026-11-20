"use server";

import { redirect } from "next/navigation";
import { sendApiJson } from "@/lib/server-api";
import { API_PATHS, PATHS } from "@/config/path";

/**
 * Server Action: unsubscribeRemindersAction
 *
 * The patient confirms on the unsubscribe page; POST /api/reminders/unsubscribe
 * stops their reminder emails. Back to the page, which then says it is done.
 */
export async function unsubscribeRemindersAction(patientId: string, signature: string): Promise<void> {
  const response = await sendApiJson(API_PATHS.reminders.unsubscribe(), "POST", { p: patientId, s: signature });
  redirect(PATHS.reminderUnsubscribe({ p: patientId, s: signature, ...(response?.ok ? { done: 1 } : { failed: 1 }) }));
}
