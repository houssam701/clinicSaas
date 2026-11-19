import type { EmailMessage } from "@/services/email";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * "Your appointment is coming up" email to a patient. Deliberately leaves
 * out the reason for the visit: email can be read by others, and that is
 * health information. Inline styles and a table layout for email clients.
 */
export function appointmentReminderEmail({
  to,
  firstName,
  clinicName,
  day,
  time,
  withName,
}: {
  to: string;
  firstName: string;
  clinicName: string;
  /** "Tuesday, 1 December 2026" in the clinic's time zone */
  day: string;
  /** "09:30" in the clinic's time zone */
  time: string;
  /** Who the visit is with, if assigned */
  withName?: string;
}): EmailMessage {
  const subject = `Reminder: your appointment at ${clinicName} on ${day}`;
  const withText = withName ? ` with ${withName}` : "";

  const text = [
    `Hi ${firstName},`,
    "",
    `This is a reminder of your appointment at ${clinicName}${withText}:`,
    `${day} at ${time}`,
    "",
    "If you cannot come, please contact the clinic to change or cancel it.",
    "",
    clinicName,
  ].join("\n");

  const e = escapeHtml;
  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f1f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
            <tr>
              <td style="padding:28px 32px 0 32px;font-size:18px;font-weight:800;letter-spacing:-0.01em;">${e(clinicName)}</td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 12px 0;">Hi ${e(firstName)},</p>
                <p style="margin:0 0 16px 0;">This is a reminder of your appointment${e(withText)}.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0;font-size:13px;color:#64748b;">When</p>
                      <p style="margin:4px 0 0 0;font-size:17px;font-weight:700;">${e(day)}</p>
                      <p style="margin:2px 0 0 0;font-size:17px;font-weight:700;color:#2662f0;">${e(time)}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;font-size:13px;line-height:1.6;color:#64748b;">
                If you cannot come, please contact the clinic to change or cancel it.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { to, subject, html, text };
}
