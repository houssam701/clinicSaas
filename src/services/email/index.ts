import type { EmailSender } from "./email-sender";
import { ResendEmailSender } from "./resend-sender";

export { EmailSendError } from "./email-sender";
export type { EmailMessage, EmailSender } from "./email-sender";

/** Used until EMAIL_FROM is set: Resend's shared test sender (delivers only to your own Resend address). */
const DEFAULT_FROM = "BienSync <onboarding@resend.dev>";

/**
 * Development without EMAIL_API_KEY: prints the email to the server log
 * instead of sending it, so flows like password reset can be tried locally.
 * Never used in production (links in logs would be a leak).
 */
class LogEmailSender implements EmailSender {
  async send({ to, subject, text }: { to: string; subject: string; text: string }) {
    console.info(`[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n${text}`);
  }
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email is not configured: set EMAIL_API_KEY (and EMAIL_FROM).");
    this.name = "EmailNotConfiguredError";
  }
}

let sender: EmailSender | undefined;

/**
 * The configured sender, from neutral env vars:
 *   EMAIL_API_KEY  provider API key (Resend)
 *   EMAIL_FROM     "Name <address@your-domain>" on a verified domain
 * Throws EmailNotConfiguredError in production when the key is missing.
 */
export function getEmailSender(): EmailSender {
  if (sender) return sender;
  const apiKey = process.env.EMAIL_API_KEY?.trim();
  if (apiKey) {
    sender = new ResendEmailSender(apiKey, process.env.EMAIL_FROM?.trim() || DEFAULT_FROM);
  } else if (process.env.NODE_ENV !== "production") {
    sender = new LogEmailSender();
  } else {
    throw new EmailNotConfiguredError();
  }
  return sender;
}
