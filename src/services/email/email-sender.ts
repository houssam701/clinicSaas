/** One email to send. `text` is the plain version for clients without HTML. */
export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends email. The app depends only on this interface; the provider
 * (Resend today) is an implementation chosen by configuration, so switching
 * providers never touches feature code.
 */
export interface EmailSender {
  /** Sends the message; throws when the provider refuses it. */
  send(message: EmailMessage): Promise<void>;
}
