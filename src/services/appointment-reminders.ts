import { ReminderRepository } from "../repository/reminder-repository";
import { getEmailSender, EmailSendError, type EmailSender } from "./email";
import { appointmentReminderEmail } from "../emails/appointment-reminder";
import { formatDay, formatTime, zonedParts } from "../lib/time-zone";
import { getBaseUrl } from "../lib/api";
import { API_PATHS, PATHS } from "../config/path";
import { unsubscribeSignature } from "./reminder-unsubscribe";
import { REMINDER_BATCH_SIZE, REMINDER_MIN_LEAD_HOURS, REMINDER_SEND_INTERVAL_MS } from "../config/reminders";

export interface ReminderRunResult {
  /** Reminders that were due in this run (at most the batch size) */
  due: number;
  sent: number;
  /** Will not be retried (e.g. invalid address) */
  failedPermanently: number;
  /** Given back; the next run retries */
  retryLater: number;
  /** Another run took them first */
  skipped: number;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * One run of the reminder job. Light by design: a few indexed queries, at
 * most REMINDER_BATCH_SIZE emails (the rest wait for the next run), paced
 * under the provider's rate limit. Each reminder is claimed before sending
 * (a conditional update), so overlapping runs never send twice. A temporary
 * failure gives the claim back; a permanent one (bad address) does not, so
 * nobody is emailed over and over. Patient addresses are never logged.
 */
export async function sendDueReminders(now = new Date(), sender?: EmailSender): Promise<ReminderRunResult> {
  const earliest = new Date(now.getTime() + REMINDER_MIN_LEAD_HOURS * 3_600_000);
  const due = await ReminderRepository.due(now, earliest, REMINDER_BATCH_SIZE);
  const result: ReminderRunResult = { due: due.length, sent: 0, failedPermanently: 0, retryLater: 0, skipped: 0 };
  if (due.length === 0) return result;

  const mailer = sender ?? getEmailSender();
  for (const [i, appt] of due.entries()) {
    if (!appt.patient?.email || !appt.clinic) continue;
    if (!(await ReminderRepository.claim(appt.id, new Date().toISOString()))) {
      result.skipped++;
      continue;
    }
    if (i > 0) await sleep(REMINDER_SEND_INTERVAL_MS);

    const zone = appt.clinic.timezone;
    // The patient's own signed "stop reminders" link (the page asks; mail apps one-click)
    const link = { p: appt.patient.id, s: unsubscribeSignature(appt.patient.id) };
    try {
      await mailer.send(
        appointmentReminderEmail({
          to: appt.patient.email,
          firstName: appt.patient.first_name,
          clinicName: appt.clinic.name,
          day: formatDay(zonedParts(new Date(appt.scheduled_time), zone).date, "long"),
          time: formatTime(appt.scheduled_time, zone),
          withName: appt.staff ? `${appt.staff.first_name} ${appt.staff.last_name}` : undefined,
          unsubscribeUrl: `${getBaseUrl()}${PATHS.reminderUnsubscribe(link)}`,
          oneClickUrl: `${getBaseUrl()}${API_PATHS.reminders.unsubscribe(link)}`,
        })
      );
      result.sent++;
    } catch (error) {
      const permanent = error instanceof EmailSendError && error.permanent;
      if (permanent) result.failedPermanently++;
      else {
        result.retryLater++;
        await ReminderRepository.release(appt.id);
      }
      console.error(`[reminders] appointment ${appt.id}: ${permanent ? "not sent" : "will retry"} (${error instanceof Error ? error.message : "unknown error"})`);
    }
  }
  return result;
}
