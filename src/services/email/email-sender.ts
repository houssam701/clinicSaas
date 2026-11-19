/** One email to send. `text` is the plain version for clients without HTML. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * A refused or failed send. `permanent` (e.g. an invalid recipient, an
 * unverified sender) will fail again the same way, so it is not retried;
 * otherwise (network, rate limit, provider outage) a later retry may work.
 */
export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly permanent: boolean
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

/**
 * Sends email. The app depends only on this interface; the provider
 * (Resend today) is an implementation chosen by configuration, so switching
 * providers never touches feature code.
 */
export interface EmailSender {
  /** Sends the message; throws EmailSendError when it does not go out. */
  send(message: EmailMessage): Promise<void>;
}
