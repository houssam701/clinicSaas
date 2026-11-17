import type { EmailMessage, EmailSender } from "./email-sender";

const RESEND_API_URL = "https://api.resend.com/emails";

/** Sends through Resend's HTTP API (no SDK: one POST). */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send({ to, subject, html, text }: EmailMessage): Promise<void> {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: this.from, to: [to], subject, html, text }),
    });
    if (!res.ok) {
      // Resend answers { name, message, statusCode }; never include the key or the body sent
      const detail: { name?: string; message?: string } = await res.json().catch(() => ({}));
      throw new Error(`Email provider refused the message (${res.status} ${detail.name ?? ""}: ${detail.message ?? "no details"})`);
    }
  }
}
