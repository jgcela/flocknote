import type { EmailMessage, EmailProvider, SendResult } from "./types";

/** Development adapter: prints messages to the server log instead of sending. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  async sendEmail(message: EmailMessage): Promise<SendResult> {
    console.info(`\n[email:console] to=${message.to}\nSubject: ${message.subject}\n\n${message.text}\n`);
    return { ok: true, providerMessageId: `console-${Date.now()}` };
  }
}
