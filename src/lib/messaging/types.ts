export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Display name for the sender, e.g. the church's name. */
  fromName?: string;
  /** Extra headers, e.g. List-Unsubscribe. */
  headers?: Record<string, string>;
};

export type SmsMessage = {
  /** E.164, e.g. +15551234567. */
  to: string;
  body: string;
};

export type SendResult =
  | { ok: true; providerMessageId?: string }
  /** `optedOut` means the carrier/provider refuses because the person unsubscribed. */
  | { ok: false; error: string; optedOut?: boolean };

export interface EmailProvider {
  readonly name: string;
  /** Largest number of messages `sendBatch` accepts at once. */
  readonly maxBatch: number;
  /** Results are in the same order as `messages`. */
  sendBatch(messages: EmailMessage[]): Promise<SendResult[]>;
}

export interface SmsProvider {
  readonly name: string;
  send(message: SmsMessage): Promise<SendResult>;
}
