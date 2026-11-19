import { EmailSendError, type EmailMessage, type EmailSender } from "./email-sender";

const RESEND_API_URL = "https://api.resend.com/emails";

/** Sends through Resend's HTTP API (no SDK: one POST). */
export class ResendEmailSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string
  ) {}

  async send({ to, subject, html, text }: EmailMessage): Promise<void> {
    let res: Response;
    try {
      res = await fetch(RESEND_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from: this.from, to: [to], subject, html, text }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch (error) {
      throw new EmailSendError(`Email provider unreachable (${error instanceof Error ? error.message : "network error"})`, false);
    }
    if (!res.ok) {
      // Resend answers { name, message, statusCode }; never include the key or the body sent.
      // 4xx is about this message (bad address, unverified sender): permanent, except 429 (rate limit)
      const detail: { name?: string; message?: string } = await res.json().catch(() => ({}));
      const permanent = res.status >= 400 && res.status < 500 && res.status !== 429;
      throw new EmailSendError(`Email provider refused the message (${res.status} ${detail.name ?? ""}: ${detail.message ?? "no details"})`, permanent);
    }
  }
}
