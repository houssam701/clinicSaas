import type { EmailMessage } from "@/services/email";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * "Reset your password" email: a button to the reset page, the expiry, and
 * what to do if the person did not ask. Inline styles and a table layout,
 * because email clients ignore stylesheets.
 */
export function passwordResetEmail({
  to,
  firstName,
  link,
  minutes,
}: {
  to: string;
  firstName: string;
  link: string;
  minutes: number;
}): EmailMessage {
  const name = escapeHtml(firstName);
  const href = escapeHtml(link);
  const subject = "Reset your BienSync password";

  const text = [
    `Hi ${firstName},`,
    "",
    "Someone asked to reset the password of your BienSync account. To choose a new one, open this link:",
    link,
    "",
    `The link works once and expires in ${minutes} minutes.`,
    "If you did not ask for this, ignore this email: your password stays the same.",
    "",
    "BienSync",
  ].join("\n");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f1f5f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1e293b;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;">
            <tr>
              <td style="padding:28px 32px 0 32px;font-size:20px;font-weight:800;letter-spacing:-0.02em;">
                Bien<span style="color:#2662f0;">Sync</span>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 0 32px;font-size:15px;line-height:1.6;">
                <p style="margin:0 0 12px 0;">Hi ${name},</p>
                <p style="margin:0 0 20px 0;">Someone asked to reset the password of your BienSync account. To choose a new one, use the button below.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <a href="${href}" style="display:inline-block;background:#2662f0;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:6px;">Choose a new password</a>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 28px 32px;font-size:13px;line-height:1.6;color:#64748b;">
                <p style="margin:0 0 8px 0;">The link works once and expires in ${minutes} minutes.</p>
                <p style="margin:0 0 8px 0;">If you did not ask for this, ignore this email: your password stays the same.</p>
                <p style="margin:0;word-break:break-all;">Button not working? Copy this link: <a href="${href}" style="color:#2662f0;">${href}</a></p>
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
