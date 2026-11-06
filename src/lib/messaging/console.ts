import type { EmailMessage, EmailProvider, SendResult, SmsMessage, SmsProvider } from "./types";

/** Development adapters: print to the server log instead of sending. */
export class ConsoleEmailProvider implements EmailProvider {
  readonly name = "console";
  readonly maxBatch = 100;
  async sendBatch(messages: EmailMessage[]): Promise<SendResult[]> {
    return messages.map((m, i) => {
      console.info(`\n[email:console] to=${m.to}\nSubject: ${m.subject}\n\n${m.text}\n`);
      return { ok: true, providerMessageId: `console-email-${Date.now()}-${i}` };
    });
  }
}

export class ConsoleSmsProvider implements SmsProvider {
  readonly name = "console";
  async send(m: SmsMessage): Promise<SendResult> {
    console.info(`\n[sms:console] to=${m.to}\n${m.body}\n`);
    return { ok: true, providerMessageId: `console-sms-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  }
}
