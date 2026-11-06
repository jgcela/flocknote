import "server-only";
import { ConsoleEmailProvider, ConsoleSmsProvider } from "./console";
import { ResendEmailProvider } from "./resend";
import { TwilioSmsProvider } from "./twilio";
import type { EmailMessage, EmailProvider, SendResult, SmsProvider } from "./types";
import { appUrl } from "../request-meta";

export type { EmailMessage, SendResult, SmsMessage } from "./types";

/**
 * Provider selection (env):
 *   EMAIL_PROVIDER = resend | console   (default: resend when RESEND_API_KEY is set)
 *   SMS_PROVIDER   = twilio | console   (default: twilio when TWILIO_ACCOUNT_SID is set)
 * Adding another provider = one class implementing EmailProvider/SmsProvider.
 */
let emailProvider: EmailProvider | undefined;
let smsProvider: SmsProvider | undefined;

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set for the configured messaging provider`);
  return v;
}

export function getEmailProvider(): EmailProvider {
  if (emailProvider) return emailProvider;
  const choice = process.env.EMAIL_PROVIDER ?? (process.env.RESEND_API_KEY ? "resend" : "console");
  if (choice === "resend") {
    emailProvider = new ResendEmailProvider({
      apiKey: required("RESEND_API_KEY"),
      from: required("EMAIL_FROM"),
      replyTo: process.env.EMAIL_REPLY_TO || undefined,
    });
  } else if (choice === "console") {
    if (process.env.NODE_ENV === "production") console.warn("[messaging] EMAIL_PROVIDER is console: emails are only logged, not sent.");
    emailProvider = new ConsoleEmailProvider();
  } else {
    throw new Error(`Unknown EMAIL_PROVIDER "${choice}"`);
  }
  return emailProvider;
}

export function getSmsProvider(): SmsProvider {
  if (smsProvider) return smsProvider;
  const choice = process.env.SMS_PROVIDER ?? (process.env.TWILIO_ACCOUNT_SID ? "twilio" : "console");
  if (choice === "twilio") {
    smsProvider = new TwilioSmsProvider({
      accountSid: required("TWILIO_ACCOUNT_SID"),
      authToken: required("TWILIO_AUTH_TOKEN"),
      from: process.env.TWILIO_FROM_NUMBER || undefined,
      messagingServiceSid: process.env.TWILIO_MESSAGING_SERVICE_SID || undefined,
      statusCallbackUrl: appUrl("api/webhooks/twilio"),
    });
  } else if (choice === "console") {
    if (process.env.NODE_ENV === "production") console.warn("[messaging] SMS_PROVIDER is console: texts are only logged, not sent.");
    smsProvider = new ConsoleSmsProvider();
  } else {
    throw new Error(`Unknown SMS_PROVIDER "${choice}"`);
  }
  return smsProvider;
}

/** Whether real (non-console) providers are configured, for the UI. */
export function messagingStatus() {
  let email = "not configured";
  let sms = "not configured";
  try {
    email = getEmailProvider().name;
  } catch (e) {
    email = `error: ${e instanceof Error ? e.message : e}`;
  }
  try {
    sms = getSmsProvider().name;
  } catch (e) {
    sms = `error: ${e instanceof Error ? e.message : e}`;
  }
  return { email, sms };
}

/** Account emails (invitations, password resets). Never throws. */
export async function sendTransactionalEmail(message: EmailMessage): Promise<SendResult> {
  try {
    const [result] = await getEmailProvider().sendBatch([message]);
    return result ?? { ok: false, error: "No result from provider" };
  } catch (e) {
    console.error("[email] send failed", e);
    return { ok: false, error: e instanceof Error ? e.message : "Unknown error" };
  }
}
