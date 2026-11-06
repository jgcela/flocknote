export type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type SendResult = { ok: true; providerMessageId?: string } | { ok: false; error: string };

export interface EmailProvider {
  readonly name: string;
  sendEmail(message: EmailMessage): Promise<SendResult>;
}
